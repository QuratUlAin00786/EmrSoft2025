import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { z } from "zod";
import Stripe from "stripe";
import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { storage } from "./storage";
import { authService } from "./services/auth";
import { aiService } from "./services/ai";
import { registerSaaSRoutes } from "./saas-routes";
import { tenantMiddleware, authMiddleware, requireRole, requireNonPatientRole, gdprComplianceMiddleware, type TenantRequest } from "./middleware/tenant";
import { multiTenantEnforcer, validateOrganizationFilter, withTenantIsolation } from "./middleware/multi-tenant-enforcer";
import { initializeMultiTenantPackage, getMultiTenantPackage } from "./packages/multi-tenant-core";
import { messagingService } from "./messaging-service";
import { isDoctorLike } from './utils/role-utils.js';
// PayPal imports moved to dynamic imports to avoid initialization errors when credentials are missing
import { gdprComplianceService } from "./services/gdpr-compliance";
import { insertGdprConsentSchema, insertGdprDataRequestSchema, updateMedicalImageReportFieldSchema, insertAiInsightSchema, medicationsDatabase, patientDrugInteractions, insuranceVerifications, type Appointment, organizations, subscriptions, users, patients, symptomChecks, quickbooksConnections, insertClinicHeaderSchema, insertClinicFooterSchema, doctorsFee, invoices, labResults } from "../shared/schema";
import * as schema from "../shared/schema";
import { db, pool } from "./db";
import { and, eq, sql, desc } from "drizzle-orm";
import { processAppointmentBookingChat, generateAppointmentSummary } from "./anthropic";
import { inventoryService } from "./services/inventory";
import { emailService } from "./services/email";
import multer from "multer";
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as fse from 'fs-extra';
import { readFile } from 'fs/promises';

// Initialize Stripe with secret key only if provided (conditional to avoid crashes)
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-07-30.basil',
    })
  : null;

/**
 * Helper to validate organizationId after multiTenantEnforcer middleware
 * Throws if organizationId is missing after tenant validation
 */
function requireOrgId(req: TenantRequest): number {
  if (!req.organizationId) {
    throw new Error('Organization ID is required but missing after tenant validation');
  }
  return req.organizationId;
}

/**
 * Security helper: Enforces created_by field with logged-in user ID
 * Prevents client from spoofing creator identity
 * @param req - Request with authenticated user
 * @param payload - Data object to modify
 * @param fieldName - Name of the created_by field (varies by module)
 * @returns Modified payload with enforced created_by field
 */
function enforceCreatedBy<T extends Record<string, any>>(
  req: TenantRequest,
  payload: T,
  fieldName: string = 'createdBy'
): T {
  if (!req.user?.id) {
    throw new Error('User authentication required to set creator');
  }
  // Always overwrite client-provided value with server-side user ID
  return {
    ...payload,
    [fieldName]: req.user.id
  };
}

// In-memory storage for voice notes - persistent across server restarts
let voiceNotes: any[] = [];

// Global storage for appointment SSE connections
declare global {
  var appointmentClients: Map<string, { res: express.Response, organizationId: number, userId: number }> | undefined;
}

// Health Score calculation function
function calculateHealthScore(medicalRecords: any[], patientData: any) {
  // Default scores - starting point
  let totalWeightedScore = 0;
  let maxPossibleScore = 0;
  const weights = {
    spo2: 0.20,      // 20%
    bp: 0.20,        // 20%
    hr: 0.15,        // 15%
    labs: 0.20,      // 20%
    bmi: 0.10,       // 10%
    lifestyle: 0.15  // 15%
  };

  // Initialize scores for each category
  const scores = {
    spo2: { points: 10, maxPoints: 20 },      // Default moderate score
    bp: { points: 10, maxPoints: 20 },
    hr: { points: 10, maxPoints: 20 },
    labs: { points: 10, maxPoints: 20 },
    bmi: { points: 10, maxPoints: 20 },
    lifestyle: { points: 10, maxPoints: 20 }
  };

  // Extract health data from medical records notes
  medicalRecords.forEach(record => {
    if (record.notes) {
      const notes = record.notes.toLowerCase();
      
      // Parse Blood Pressure (BP)
      const bpMatch = notes.match(/bp[:\s]*(\d+)\/(\d+)|blood pressure[:\s]*(\d+)\/(\d+)|systolic[:\s]*(\d+)/);
      if (bpMatch) {
        const systolic = parseInt(bpMatch[1] || bpMatch[3] || bpMatch[5]);
        if (systolic >= 110 && systolic <= 130) {
          scores.bp.points = 20;
        } else if ((systolic >= 90 && systolic < 110) || (systolic > 130 && systolic <= 150)) {
          scores.bp.points = 15;
        } else if (systolic < 90 || systolic > 150) {
          scores.bp.points = 5;
        }
      }

      // Parse Heart Rate (HR)
      const hrMatch = notes.match(/hr[:\s]*(\d+)|heart rate[:\s]*(\d+)|pulse[:\s]*(\d+)/);
      if (hrMatch) {
        const heartRate = parseInt(hrMatch[1] || hrMatch[2] || hrMatch[3]);
        if (heartRate >= 60 && heartRate <= 100) {
          scores.hr.points = 20;
        } else if ((heartRate >= 50 && heartRate < 60) || (heartRate > 100 && heartRate <= 120)) {
          scores.hr.points = 15;
        } else if (heartRate < 50 || heartRate > 120) {
          scores.hr.points = 5;
        }
      }

      // Parse SpO2 (Oxygen Saturation)
      const spo2Match = notes.match(/spo2[:\s]*(\d+)|o2 sat[:\s]*(\d+)|oxygen[:\s]*(\d+)/);
      if (spo2Match) {
        const spo2 = parseInt(spo2Match[1] || spo2Match[2] || spo2Match[3]);
        if (spo2 >= 95) {
          scores.spo2.points = 20;
        } else if (spo2 >= 90 && spo2 < 95) {
          scores.spo2.points = 10;
        } else if (spo2 < 90) {
          scores.spo2.points = 0;
        }
      }

      // Parse Temperature
      const tempMatch = notes.match(/temp[:\s]*(\d+\.?\d*)|temperature[:\s]*(\d+\.?\d*)/);
      if (tempMatch) {
        const temp = parseFloat(tempMatch[1] || tempMatch[2]);
        // Assuming Celsius - normal range 36.1-37.2°C
        if (temp >= 36.1 && temp <= 37.2) {
          scores.hr.points = Math.max(scores.hr.points, 20); // Use HR category for temp
        } else if ((temp >= 35.5 && temp < 36.1) || (temp > 37.2 && temp <= 38.0)) {
          scores.hr.points = Math.max(scores.hr.points, 15);
        }
      }

      // Parse BMI or Weight/Height
      const bmiMatch = notes.match(/bmi[:\s]*(\d+\.?\d*)/);
      const weightMatch = notes.match(/weight[:\s]*(\d+\.?\d*)/);
      const heightMatch = notes.match(/height[:\s]*(\d+\.?\d*)/);
      
      if (bmiMatch) {
        const bmi = parseFloat(bmiMatch[1]);
        if (bmi >= 18.5 && bmi <= 24.9) {
          scores.bmi.points = 20;
        } else if ((bmi >= 17 && bmi < 18.5) || (bmi >= 25 && bmi <= 29.9)) {
          scores.bmi.points = 10;
        } else if (bmi < 17 || bmi >= 30) {
          scores.bmi.points = 5;
        }
      } else if (weightMatch && heightMatch) {
        const weight = parseFloat(weightMatch[1]);
        const height = parseFloat(heightMatch[1]);
        const bmi = weight / (height * height); // Assuming height in meters
        if (bmi >= 18.5 && bmi <= 24.9) {
          scores.bmi.points = 20;
        } else if ((bmi >= 17 && bmi < 18.5) || (bmi >= 25 && bmi <= 29.9)) {
          scores.bmi.points = 10;
        } else if (bmi < 17 || bmi >= 30) {
          scores.bmi.points = 5;
        }
      }

      // Parse Labs (Glucose, Cholesterol, HbA1c, etc.)
      const glucoseMatch = notes.match(/glucose[:\s]*(\d+\.?\d*)|blood sugar[:\s]*(\d+\.?\d*)/);
      const cholesterolMatch = notes.match(/cholesterol[:\s]*(\d+\.?\d*)/);
      const hba1cMatch = notes.match(/hba1c[:\s]*(\d+\.?\d*)/);
      
      let labScore = 10; // Default
      let labCount = 0;
      
      if (glucoseMatch) {
        const glucose = parseFloat(glucoseMatch[1] || glucoseMatch[2]);
        if (glucose >= 70 && glucose <= 140) {
          labScore += 20;
        } else if ((glucose >= 60 && glucose < 70) || (glucose > 140 && glucose <= 180)) {
          labScore += 15;
        } else {
          labScore += 5;
        }
        labCount++;
      }
      
      if (cholesterolMatch) {
        const cholesterol = parseFloat(cholesterolMatch[1]);
        if (cholesterol < 200) {
          labScore += 20;
        } else if (cholesterol >= 200 && cholesterol <= 239) {
          labScore += 15;
        } else {
          labScore += 5;
        }
        labCount++;
      }
      
      if (hba1cMatch) {
        const hba1c = parseFloat(hba1cMatch[1]);
        if (hba1c < 5.7) {
          labScore += 20;
        } else if (hba1c >= 5.7 && hba1c <= 6.4) {
          labScore += 15;
        } else {
          labScore += 5;
        }
        labCount++;
      }
      
      if (labCount > 0) {
        scores.labs.points = Math.min(20, labScore / labCount);
      }
    }
  });

  // Parse lifestyle factors from patient data
  if (patientData.medicalHistory?.socialHistory) {
    const social = patientData.medicalHistory.socialHistory;
    let lifestyleScore = 0;
    let factorCount = 0;

    // Smoking
    if (social.smoking?.status) {
      if (social.smoking.status === 'never') {
        lifestyleScore += 20;
      } else if (social.smoking.status === 'former') {
        lifestyleScore += 15;
      } else {
        lifestyleScore += 5;
      }
      factorCount++;
    }

    // Alcohol
    if (social.alcohol?.status) {
      if (social.alcohol.status === 'never' || social.alcohol.status === 'social') {
        lifestyleScore += 20;
      } else if (social.alcohol.status === 'moderate') {
        lifestyleScore += 15;
      } else {
        lifestyleScore += 5;
      }
      factorCount++;
    }

    // Exercise
    if (social.exercise?.frequency) {
      if (social.exercise.frequency === 'daily' || social.exercise.frequency === 'weekly') {
        lifestyleScore += 20;
      } else if (social.exercise.frequency === 'monthly') {
        lifestyleScore += 15;
      } else {
        lifestyleScore += 5;
      }
      factorCount++;
    }

    if (factorCount > 0) {
      scores.lifestyle.points = lifestyleScore / factorCount;
    }
  }

  // Calculate weighted total
  Object.entries(scores).forEach(([category, score]) => {
    const weight = weights[category as keyof typeof weights];
    totalWeightedScore += score.points * weight;
    maxPossibleScore += score.maxPoints * weight;
  });

  // Calculate final percentage
  const healthScorePercentage = Math.round((totalWeightedScore / maxPossibleScore) * 100);

  // Categorize score
  let category = '';
  let color = '';
  if (healthScorePercentage >= 85) {
    category = 'Excellent';
    color = '#6CFFEB'; // Mint
  } else if (healthScorePercentage >= 70) {
    category = 'Good';
    color = '#4A7DFF'; // Blue
  } else if (healthScorePercentage >= 50) {
    category = 'Fair';
    color = '#FFA500'; // Orange
  } else {
    category = 'Poor';
    color = '#FF6B6B'; // Red
  }

  return {
    score: healthScorePercentage,
    category,
    color,
    breakdown: {
      spo2: { points: Math.round(scores.spo2.points), maxPoints: scores.spo2.maxPoints, weight: weights.spo2 },
      bp: { points: Math.round(scores.bp.points), maxPoints: scores.bp.maxPoints, weight: weights.bp },
      hr: { points: Math.round(scores.hr.points), maxPoints: scores.hr.maxPoints, weight: weights.hr },
      labs: { points: Math.round(scores.labs.points), maxPoints: scores.labs.maxPoints, weight: weights.labs },
      bmi: { points: Math.round(scores.bmi.points), maxPoints: scores.bmi.maxPoints, weight: weights.bmi },
      lifestyle: { points: Math.round(scores.lifestyle.points), maxPoints: scores.lifestyle.maxPoints, weight: weights.lifestyle }
    },
    totalRecords: medicalRecords.length,
    lastUpdated: new Date().toISOString()
  };
}

// Server-Sent Events broadcaster for real-time AI insight updates
interface AiInsightSSEEvent {
  type: 'ai_insight.status_updated';
  id: string;
  patientId: string;
  status: string;
  previousStatus?: string;
  updatedAt: string;
  organizationId: number;
}

class AiInsightSSEBroadcaster {
  private connections: Map<number, Set<express.Response>> = new Map();

  addConnection(organizationId: number, res: express.Response) {
    if (!this.connections.has(organizationId)) {
      this.connections.set(organizationId, new Set());
    }
    this.connections.get(organizationId)!.add(res);
    
    console.log(`[SSE] Added connection for organization ${organizationId}. Total connections: ${this.connections.get(organizationId)!.size}`);
    
    // Remove connection on close
    res.on('close', () => {
      this.removeConnection(organizationId, res);
    });
  }

  removeConnection(organizationId: number, res: express.Response) {
    const orgConnections = this.connections.get(organizationId);
    if (orgConnections) {
      orgConnections.delete(res);
      if (orgConnections.size === 0) {
        this.connections.delete(organizationId);
      }
      console.log(`[SSE] Removed connection for organization ${organizationId}. Remaining connections: ${orgConnections.size}`);
    }
  }

  broadcast(organizationId: number, event: AiInsightSSEEvent) {
    const orgConnections = this.connections.get(organizationId);
    if (!orgConnections || orgConnections.size === 0) {
      console.log(`[SSE] No connections for organization ${organizationId}, skipping broadcast`);
      return;
    }

    const eventId = uuidv4();
    const eventData = JSON.stringify(event);
    const sseData = `id: ${eventId}\nevent: ai_insight.status_updated\ndata: ${eventData}\n\n`;

    const deadConnections: express.Response[] = [];
    
    orgConnections.forEach((res) => {
      try {
        if (!res.headersSent && !res.destroyed) {
          res.write(sseData);
          console.log(`[SSE] Broadcasted event to organization ${organizationId}:`, event.type);
        } else {
          deadConnections.push(res);
        }
      } catch (error) {
        console.error(`[SSE] Error broadcasting to connection:`, error);
        deadConnections.push(res);
      }
    });

    // Clean up dead connections
    deadConnections.forEach(res => this.removeConnection(organizationId, res));
  }

  getConnectionCount(organizationId: number): number {
    return this.connections.get(organizationId)?.size || 0;
  }
}

// Global SSE broadcaster instance
const aiInsightBroadcaster = new AiInsightSSEBroadcaster();

// Enhanced error handling helper to distinguish different error types
function handleRouteError(error: any, operation: string, res: express.Response) {
  // Handle Zod validation errors (return 400)
  if (error?.name === 'ZodError') {
    console.error(`[VALIDATION_ERROR] ${operation}:`, error.errors);
    return res.status(400).json({ 
      error: "Validation failed", 
      details: error.errors 
    });
  }
  
  // Handle database transient errors (return 503)
  if (error?.code === 'SERVICE_UNAVAILABLE' && error?.statusCode === 503) {
    console.error(`[DB_TRANSIENT_ERROR] ${operation}:`, error.message);
    return res.status(503).json({ 
      error: error.message || "Service temporarily unavailable. Please try again in a moment.",
      retryAfter: 5 // Suggest retry after 5 seconds
    });
  }
  
  // Handle other database connection errors that might not be caught by retry logic
  if (error?.code === '57P01' || error?.code === 'ECONNRESET' || error?.code === 'ETIMEDOUT' || 
      error?.message?.includes('terminating connection')) {
    console.error(`[DB_CONNECTION_ERROR] ${operation}:`, error.message);
    return res.status(503).json({ 
      error: "Database connection issue. Please try again in a moment.",
      retryAfter: 3
    });
  }
  
  // Handle generic errors (return 500)
  console.error(`[ERROR] ${operation}:`, error);
  return res.status(500).json({ 
    error: `Failed to ${operation.toLowerCase()}` 
  });
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files
  },
  fileFilter: (req, file, cb) => {
    // Accept PDF, DOC, DOCX, JPG, PNG files
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/jpg',
      'image/png'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }
});

// Configure disk storage specifically for photos
const uploadPhoto = multer({
  dest: 'uploads/temp/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files for photos
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }
});

// Configure disk storage specifically for voice notes
const uploadVoiceNote = multer({
  dest: 'uploads/temp/',
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for audio files
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files
    const allowedTypes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/webm',
      'audio/ogg',
      'application/octet-stream' // For blob uploads
    ];
    
    if (allowedTypes.includes(file.mimetype) || file.originalname.endsWith('.webm') || file.originalname.endsWith('.wav') || file.originalname.endsWith('.mp3')) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }
});

// Configure disk storage specifically for medical images  
const uploadMedicalImages = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), 'uploads', 'Imaging_Images');
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
        console.log('📁 Created directory:', uploadDir);
      }
      
      cb(null, uploadDir);
    },
    filename: async (req, file, cb) => {
      try {
        // Get numeric patient ID from request body
        const numericPatientId = req.body.patientId;
        if (!numericPatientId) {
          return cb(new Error('Patient ID is required for file naming'), '');
        }
        
        // Get the tenant from middleware
        const tenantReq = req as any; // TenantRequest
        if (!tenantReq.tenant) {
          return cb(new Error('Tenant information required for patient lookup'), '');
        }
        
        // Get patient to find their string patientId (like "P001")
        const patient = await storage.getPatient(parseInt(numericPatientId), tenantReq.tenant.id);
        if (!patient) {
          return cb(new Error('Patient not found for unique filename generation'), '');
        }
        
        // Extract file extension
        const ext = file.originalname.split('.').pop();
        
        // Create unique filename: patientId_Images.extension (using string patientId like "P001")
        const uniqueFilename = `${patient.patientId}_Images.${ext}`;
        
        console.log('📷 SERVER: Creating unique filename for patient:', {
          numericId: numericPatientId,
          stringPatientId: patient.patientId,
          originalName: file.originalname,
          uniqueFilename: uniqueFilename
        });
        
        cb(null, uniqueFilename);
      } catch (error) {
        console.error('📷 SERVER: Error generating unique filename:', error);
        cb(new Error('Failed to generate unique filename'), '');
      }
    }
  }),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for medical images
  },
  fileFilter: (req, file, cb) => {
    // Accept medical image files
    const allowedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/bmp',
      'image/tiff',
      'image/tif',
      'image/webp',
      'image/svg+xml',
      'image/x-icon',
      'application/dicom', // DICOM files
      'application/octet-stream' // For .dcm files
    ];
    
    if (allowedTypes.includes(file.mimetype) || 
        file.originalname.toLowerCase().endsWith('.dcm') ||
        file.originalname.toLowerCase().endsWith('.dicom')) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }
});

// Configure disk storage for replace operations - uses temp filename initially
const uploadReplaceImages = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), 'uploads', 'Imaging_Images');
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
        console.log('📁 Created directory:', uploadDir);
      }
      
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      // Use temporary filename for replace operations
      // We'll rename it to the correct filename after upload
      const ext = file.originalname.split('.').pop();
      const tempFilename = `temp_replace_${Date.now()}.${ext}`;
      
      console.log('🔄 SERVER: Creating temporary filename for replace:', {
        originalName: file.originalname,
        tempFilename: tempFilename
      });
      
      cb(null, tempFilename);
    }
  }),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for medical images
  },
  fileFilter: (req, file, cb) => {
    // Accept medical image files
    const allowedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/bmp',
      'image/tiff',
      'image/tif',
      'image/webp',
      'image/svg+xml',
      'image/x-icon',
      'application/dicom', // DICOM files
      'application/octet-stream' // For .dcm files
    ];
    
    if (allowedTypes.includes(file.mimetype) || 
        file.originalname.toLowerCase().endsWith('.dcm') ||
        file.originalname.toLowerCase().endsWith('.dicom')) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // DEPLOYMENT HEALTH CHECK - Absolute priority for deployment success
  app.get('/api/health', (req, res) => {
    res.status(200).json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      service: 'cura-emr',
      environment: process.env.NODE_ENV || 'development'
    });
  });

  // Stripe payment route for imaging invoices
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ message: "Stripe is not configured" });
      }

      const { amount } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to pence
        currency: "gbp",
        automatic_payment_methods: {
          enabled: true,
        },
      });

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      console.error("Stripe payment intent error:", error);
      res.status(500).json({ 
        message: "Error creating payment intent: " + error.message 
      });
    }
  });

  // Alternative health endpoints for different deployment systems
  app.get('/health', (req, res) => {
    res.status(200).json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      service: 'cura-emr'
    });
  });

  app.get('/healthz', (req, res) => {
    res.status(200).json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString()
    });
  });

  // Serve uploaded files (clinical photos, imaging reports, etc.)
  // Configure headers to allow PDF viewing in iframes with no restrictions
  app.use('/uploads', (req, res, next) => {
    // Remove all frame restrictions to allow PDF viewing
    res.removeHeader('X-Frame-Options');
    // Set proper MIME type for PDFs
    if (req.path.endsWith('.pdf')) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline'); // Force inline viewing, not download
    }
    next();
  });
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
  
  // EMERGENCY PRODUCTION FIX - Absolute priority route BEFORE everything else
  // SECURITY: Only available in development environment
  app.post('/api/emergency-saas-setup', async (req, res) => {
    // CRITICAL SECURITY CHECK: Block in production
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Emergency setup not available in production' });
    }
    try {
      console.log('[EMERGENCY] Emergency SaaS setup triggered');
      const bcrypt = await import('bcrypt');
      const hashedPassword = await bcrypt.default.hash('admin123', 10);
      
      // Use existing storage to create SaaS admin - more reliable than direct DB access
      const existingUser = await storage.getUserByUsername('saas_admin', 0);
      
      if (!existingUser) {
        const saasUser = await storage.createUser({
          username: 'saas_admin',
          email: 'saas_admin@curaemr.ai',
          passwordHash: hashedPassword,
          firstName: 'SaaS',
          lastName: 'Administrator',
          organizationId: 0,
          role: 'admin',
          isActive: true,
          isSaaSOwner: true
        });
        
        console.log(`[EMERGENCY] Created SaaS admin user with ID: ${saasUser.id}`);
        res.json({ 
          success: true, 
          message: 'Emergency SaaS setup complete - user created',
          userId: saasUser.id,
          timestamp: new Date().toISOString()
        });
      } else {
        // Update existing user to ensure proper flags
        await storage.updateUser(existingUser.id, 0, {
          passwordHash: hashedPassword,
          isActive: true,
          isSaaSOwner: true
        });
        
        console.log(`[EMERGENCY] Updated existing SaaS admin user with ID: ${existingUser.id}`);
        res.json({ 
          success: true, 
          message: 'Emergency SaaS setup complete - user updated',
          userId: existingUser.id,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('[EMERGENCY] Setup error:', error);
      res.status(500).json({ error: 'Emergency setup failed', details: (error as Error).message });
    }
  });

  // PRODUCTION DEMO USERS SETUP - Creates demo users for production login screen
  // SECURITY: Only available in development environment
  app.post('/api/production-demo-setup', async (req, res) => {
    // CRITICAL SECURITY CHECK: Block in production
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Demo setup not available in production' });
    }
    try {
      console.log('[PRODUCTION DEMO] Creating production demo users...');
      
      // Production-ready password hashes for demo credentials
      const productionHashes = {
        admin123: '$2b$12$wBdwP8DhNP3XuviUaPHgB.y.G/Px2AAOYi7w.W8vJaiywet.cJ7Ae',
        doctor123: '$2b$12$jY/ugs1.lFZPYN./Yhjxue7inIwU7JtFiHyPN.wLvSC5Ep43XvFOi',
        patient123: '$2b$12$aDR..3VlJ9/ON8RHbLY3kuYTBrjxv26qVwQuh4nWn/tRbQH.X3Aje',
        nurse123: '$2b$12$VANG.x51jkairEWTXbY9xOzyUpbb3vNSdylcqZxa4/TOyvO2rOgoG'
      };

      // Ensure Demo Healthcare Clinic organization exists (organization ID: 2)
      let demoOrg;
      try {
        demoOrg = await storage.getOrganization(2);
        if (!demoOrg) {
          demoOrg = await storage.createOrganization({
            name: 'Demo Healthcare Clinic',
            subdomain: 'demo',
            brandName: 'Demo Healthcare Clinic',
            contactEmail: 'admin@demo.com',
            contactPhone: '+44 123 456 7890',
            address: '123 Demo Street',
            city: 'London',
            country: 'UK',
            settings: {
              theme: { primaryColor: '#4A7DFF' },
              compliance: { gdprEnabled: true, dataResidency: 'UK' },
              features: { aiEnabled: true, billingEnabled: true }
            }
          });
          console.log(`[PRODUCTION DEMO] Created demo organization with ID: ${demoOrg.id}`);
        }
      } catch (error) {
        console.log('[PRODUCTION DEMO] Using existing organization ID 2');
        demoOrg = { id: 2, name: 'Demo Healthcare Clinic' };
      }

      const organizationId = 2; // Fixed organization ID for demo
      const createdUsers = [];
      const updatedUsers = [];

      // Demo users configuration
      const demoUsers = [
        {
          email: 'admin@cura.com',
          username: 'admin',
          password: 'admin123',
          firstName: 'Admin',
          lastName: 'User',
          role: 'admin' as const
        },
        {
          email: 'doctor@cura.com',
          username: 'doctor',
          password: 'doctor123',
          firstName: 'Dr. John',
          lastName: 'Smith',
          role: 'doctor' as const
        },
        {
          email: 'patient@cura.com',
          username: 'patient',
          password: 'patient123',
          firstName: 'Mary',
          lastName: 'Johnson',
          role: 'patient' as const
        },
        {
          email: 'nurse@cura.com',
          username: 'nurse',
          password: 'nurse123',
          firstName: 'Sarah',
          lastName: 'Williams',
          role: 'nurse' as const
        }
      ];

      // Create or update each demo user
      for (const userData of demoUsers) {
        try {
          // Check if user already exists
          let existingUser = await storage.getUserByEmail(userData.email, organizationId);
          
          if (!existingUser) {
            // User doesn't exist, create new
            const newUser = await storage.createUser({
              email: userData.email,
              username: userData.username,
              passwordHash: productionHashes[userData.password as keyof typeof productionHashes],
              firstName: userData.firstName,
              lastName: userData.lastName,
              role: userData.role,
              organizationId: organizationId,
              isActive: true,
              isSaaSOwner: false
            });
            
            createdUsers.push(`${userData.role}: ${userData.email}`);
            console.log(`[PRODUCTION DEMO] Created user: ${userData.email} (${userData.role})`);
          } else {
            // User exists, update password hash to ensure consistency
            await storage.updateUser(existingUser.id, organizationId, {
              passwordHash: productionHashes[userData.password as keyof typeof productionHashes],
              isActive: true
            });
            
            updatedUsers.push(`${userData.role}: ${userData.email}`);
            console.log(`[PRODUCTION DEMO] Updated user: ${userData.email} (${userData.role})`);
          }
        } catch (userError) {
          console.error(`[PRODUCTION DEMO] Error processing user ${userData.email}:`, userError);
          throw new Error(`Failed to create/update user ${userData.email}: ${userError instanceof Error ? userError.message : 'Unknown error'}`);
        }
      }

      const response = {
        success: true,
        message: 'Production demo users setup completed successfully',
        organization: {
          id: organizationId,
          name: demoOrg.name
        },
        users: {
          created: createdUsers,
          updated: updatedUsers,
          total: createdUsers.length + updatedUsers.length
        },
        credentials: {
          admin: 'admin@cura.com / admin123',
          doctor: 'doctor@cura.com / doctor123', 
          patient: 'patient@cura.com / patient123',
          nurse: 'nurse@cura.com / nurse123'
        },
        timestamp: new Date().toISOString()
      };

      console.log('[PRODUCTION DEMO] ✅ Demo users setup completed successfully');
      res.json(response);
      
    } catch (error) {
      console.error('[PRODUCTION DEMO] ❌ Setup failed:', error);
      res.status(500).json({ 
        success: false,
        error: 'Production demo setup failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Initialize Multi-Tenant Core Package
  const multiTenantPackage = initializeMultiTenantPackage(storage as any, {
    enforceStrictTenantIsolation: true,
    auditAllDataAccess: true,
    validateCrossTenantOperations: true,
    logUnauthorizedAccess: true,
    enablePerformanceMonitoring: true
  });

  // Debug endpoint BEFORE middleware - to diagnose tenant issues v6 FORCE CACHE CLEAR
  app.get("/api/status", async (req, res) => {
    const host = req.get("host");
    const extractedSubdomain = host ? host.split('.')[0] : "none";
    
    // SECURITY: Block emergency SaaS setup in production
    if (req.query.setup === 'saas' && req.query.emergency === 'true') {
      // CRITICAL SECURITY CHECK: Block in production
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ error: 'Emergency setup not available in production' });
      }
      try {
        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        // Create SaaS admin using existing storage that works
        const existingUser = await storage.getUserByUsername('saas_admin', 0);
        if (!existingUser) {
          await storage.createUser({
            username: 'saas_admin',
            email: 'saas_admin@curaemr.ai',
            passwordHash: hashedPassword,
            firstName: 'SaaS',
            lastName: 'Administrator',
            organizationId: 0,
            role: 'admin' as const,
            isActive: true,
            isSaaSOwner: true
          });
        }
        
        return res.json({
          status: "SAAS_SETUP_COMPLETE",
          message: "SaaS admin user ready",
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return res.json({
          status: "SAAS_SETUP_FAILED", 
          error: (error as Error).message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    res.json({ 
      status: "MULTI-TENANT-ENFORCED", 
      host, 
      extractedSubdomain,
      env: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      version: "v8-with-saas-emergency-fix",
      multiTenantConfig: {
        strictIsolation: true,
        auditEnabled: true,
        validationEnabled: true
      }
    });
  });

  // Production Data Sync endpoint - triggers database seeding for production
  // SECURITY: Only available in development environment
  app.post('/api/production-sync', async (req, res) => {
    // CRITICAL SECURITY CHECK: Block in production
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Production sync not available in production' });
    }
    try {
      console.log('[PRODUCTION SYNC] Starting database seeding...');
      
      // Import and run the seeding function
      const { seedDatabase } = await import('./seed-data');
      await seedDatabase();
      
      res.json({
        success: true,
        message: 'Production database seeded successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('[PRODUCTION SYNC] Seeding failed:', error);
      res.status(500).json({ 
        error: 'Production sync failed', 
        message: (error as Error).message 
      });
    }
  });

  // Register critical SaaS routes DIRECTLY before ANY middleware
  // These MUST work in production - direct implementation without external dependencies
  
  // SaaS Debug endpoint - direct implementation
  app.get('/api/saas/debug', async (req, res) => {
    try {
      const hasSaaSUser = await storage.getUserByUsername('saas_admin', 0);
      res.json({
        debug: true,
        environment: process.env.NODE_ENV || 'unknown',
        hostname: req.hostname,
        hasSaaSAdmin: !!hasSaaSUser,
        saasAdminActive: hasSaaSUser?.isActive || false,
        timestamp: new Date().toISOString(),
        status: 'DIRECT_ROUTE_BYPASSING_MIDDLEWARE'
      });
    } catch (error) {
      res.status(500).json({ error: 'Debug failed', message: (error as Error).message });
    }
  });

  // SaaS Login endpoint - direct implementation
  app.post('/api/saas/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      console.log(`[DIRECT SAAS] Login attempt: ${username}`);
      
      const user = await storage.getUserByUsername(username, 0);
      if (!user || !user.isSaaSOwner) {
        return res.status(401).json({ error: "Authentication failed. Please check your credentials." });
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Authentication failed. Please check your credentials." });
      }
      // SECURITY: Require SAAS_JWT_SECRET in production
      const SAAS_JWT_SECRET = process.env.SAAS_JWT_SECRET;
      if (!SAAS_JWT_SECRET) {
        if (process.env.NODE_ENV === 'production') {
          throw new Error('SAAS_JWT_SECRET environment variable is required in production');
        }
        // Only allow default in development
        return res.status(500).json({ error: 'JWT secret configuration required' });
      }
      const token = jwt.sign(
        { id: user.id, username: user.username, isSaaSOwner: true },
        SAAS_JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        success: true,
        token,
        owner: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        }
      });
    } catch (error) {
      console.error('[DIRECT SAAS] Login error:', error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Initialize multi-tenant middleware stack BEFORE any routes
  multiTenantPackage.initializeMiddleware(app);
  
  // Get tenant-aware storage
  const tenantStorage = multiTenantPackage.getTenantStorage();

  // Secure admin endpoint for demo medical records bootstrapping  
  app.post('/api/admin/demo-medical-records-bootstrap', authMiddleware, requireRole(["admin"]), multiTenantEnforcer(), async (req: TenantRequest, res) => {
    try {
      // SECURITY: Strict production requirements
      if (process.env.NODE_ENV === 'production') {
        if (!process.env.SETUP_TOKEN) {
          return res.status(403).json({ error: 'Setup token required in production' });
        }
        if (process.env.ALLOW_DEMO_BOOTSTRAP !== 'true') {
          return res.status(403).json({ error: 'Demo bootstrap not enabled in production' });
        }
      }
      
      const { seedProductionMedicalRecords } = await import("./production-medical-records");
      
      // SECURITY: Strict setup token verification  
      const setupToken = req.headers['x-setup-token'] as string;
      if (process.env.SETUP_TOKEN) {
        if (!setupToken || setupToken !== process.env.SETUP_TOKEN) {
          console.log(`[BOOTSTRAP] Invalid or missing setup token`);
          return res.status(403).json({ error: 'Invalid setup token' });
        }
      }
      
      // SECURITY: Strict demo-only enforcement
      const orgSubdomain = req.tenant?.subdomain;
      if (!orgSubdomain) {
        return res.status(400).json({ error: 'Organization context required' });
      }
      
      // In production, ONLY allow demo organization (no exceptions)
      if (process.env.NODE_ENV === 'production' && orgSubdomain !== 'demo') {
        console.log(`[BOOTSTRAP] Production bootstrap denied for organization: ${orgSubdomain} (only demo allowed in production)`);
        return res.status(403).json({ error: 'Production bootstrap only allowed for demo organization' });
      }
      
      // In development, allow demo or if explicitly enabled
      if (process.env.NODE_ENV !== 'production' && orgSubdomain !== 'demo' && process.env.ALLOW_DEMO_BOOTSTRAP !== 'true') {
        console.log(`[BOOTSTRAP] Bootstrap denied for organization: ${orgSubdomain} (not demo and ALLOW_DEMO_BOOTSTRAP not set)`);
        return res.status(403).json({ error: 'Bootstrap only allowed for demo organization or if explicitly enabled' });
      }
      
      console.log(`[BOOTSTRAP] Starting medical records bootstrap for organization: ${orgSubdomain}`);
      console.log(`[BOOTSTRAP] Initiated by admin user: ${req.user?.email} (ID: ${req.user?.id})`);
      
      // Call the refactored function with proper scoping
      const result = await seedProductionMedicalRecords({
        orgSubdomain: orgSubdomain,
        maxPatients: 1,
        minRecordsPerPatient: 2
      });
      
      if (!result.success) {
        console.log(`[BOOTSTRAP] Failed: ${result.error}`);
        return res.status(400).json({ 
          error: result.error,
          createdCount: result.createdCount
        });
      }
      
      // SECURITY: PHI-safe audit logging (no medical content)
      console.log(`[BOOTSTRAP] ✅ Successfully bootstrapped ${result.createdCount} medical records`);
      console.log(`[BOOTSTRAP] Organization: ${orgSubdomain} (ID: ${result.organizationId})`);
      console.log(`[BOOTSTRAP] Processed ${result.results?.length || 0} patients`);
      
      // SECURITY: PHI-safe response (no medical record content)
      const patientsProcessed = result.results?.map(r => ({
        patientId: r.patientId,
        createdCount: r.createdCount,
        skipped: r.skipped
      })) || [];
      
      res.json({
        success: true,
        message: 'Demo medical records bootstrap completed successfully',
        createdCount: result.createdCount,
        organizationId: result.organizationId,
        orgSubdomain: result.orgSubdomain,
        patientsProcessed: patientsProcessed,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('[BOOTSTRAP] Medical records bootstrap error:', error);
      res.status(500).json({ 
        error: 'Medical records bootstrap failed',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  });

  // Register remaining SaaS administration routes
  registerSaaSRoutes(app);

  // Universal login endpoint (no tenant required - determines subdomain from user's organization)
  app.post("/api/auth/universal-login", async (req: express.Request, res: express.Response) => {
    try {
      const { email, password } = z.object({
        email: z.string(),
        password: z.string().min(3)
      }).parse(req.body);

      console.log(`[UNIVERSAL LOGIN] Attempt for: ${email}`);

      // Lookup user globally (no organization filter)
      let user = await storage.getUserByEmailGlobal(email);
      
      if (!user || !user.isActive) {
        console.log(`[UNIVERSAL LOGIN] User not found or inactive: ${email}`);
        return res.status(401).json({ error: "Invalid credentials" });
      }

      console.log(`[UNIVERSAL LOGIN] Found user: ${user.email} - Org ID: ${user.organizationId}`);

      const isValidPassword = await authService.comparePassword(password, user.passwordHash);
      if (!isValidPassword) {
        console.log(`[UNIVERSAL LOGIN] Invalid password for user: ${email}`);
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = authService.generateToken(user);
      
      // Get organization subdomain to include in response
      const organization = await storage.getOrganization(user.organizationId);

      if (!organization) {
        console.error(`[UNIVERSAL LOGIN] Organization not found for user ${email}, org ID: ${user.organizationId}`);
        return res.status(500).json({ error: "Organization not found" });
      }

      console.log(`[UNIVERSAL LOGIN] Success! User: ${user.email}, Subdomain: ${organization.subdomain}`);

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          department: user.department,
          organizationId: user.organizationId
        },
        organization: {
          id: organization.id,
          name: organization.name,
          subdomain: organization.subdomain
        }
      });
    } catch (error) {
      console.error("[UNIVERSAL LOGIN] Error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Authentication routes (no auth required)
  app.post("/api/auth/login", async (req: TenantRequest, res) => {
    try {
      const { email, password } = z.object({
        email: z.string(),
        password: z.string().min(3) // Allow shorter passwords for demo
      }).parse(req.body);

      console.log(`Login attempt for: ${email} with organization: ${req.tenant!.id}`);

      // Try to find user by email first, then by username
      let user = await storage.getUserByEmail(email, req.tenant!.id);
      if (!user) {
        user = await storage.getUserByUsername(email, req.tenant!.id);
      }
      
      if (!user || !user.isActive) {
        console.log(`User not found or inactive: ${email}`);
        return res.status(401).json({ error: "Invalid credentials" });
      }

      console.log(`Found user: ${user.email} (${user.username}) - Role: ${user.role}`);

      const isValidPassword = await authService.comparePassword(password, user.passwordHash);
      if (!isValidPassword) {
        console.log(`Invalid password for user: ${email}`);
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = authService.generateToken(user);
      
      // Update last login - remove this for now due to schema issues
      // await storage.updateUser(user.id, user.organizationId, { lastLoginAt: new Date() });

      // Get organization subdomain to include in response
      const organization = await storage.getOrganization(user.organizationId);

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          department: user.department,
          organizationId: user.organizationId
        },
        organization: organization ? {
          id: organization.id,
          name: organization.name,
          subdomain: organization.subdomain
        } : null
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Token validation endpoint (separate auth check)
  app.get("/api/auth/validate", async (req: TenantRequest, res) => {
    try {
      const token = authService.extractTokenFromHeader(req.get("Authorization"));
      
      if (!token) {
        return res.status(401).json({ error: "No token provided" });
      }

      const payload = authService.verifyToken(token);
      if (!payload) {
        return res.status(401).json({ error: "Invalid token" });
      }

      // Get user details
      const user = await storage.getUser(payload.userId, payload.organizationId);
      if (!user || !user.isActive) {
        return res.status(401).json({ error: "User not found or inactive" });
      }

      // Get organization subdomain to include in response
      const organization = await storage.getOrganization(user.organizationId);

      res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          department: user.department,
          organizationId: user.organizationId
        },
        organization: organization ? {
          id: organization.id,
          name: organization.name,
          subdomain: organization.subdomain
        } : null
      });
    } catch (error) {
      console.error("Token validation error:", error);
      res.status(401).json({ error: "Token validation failed" });
    }
  });

  // Tenant info endpoint (unprotected for initial load)
  app.get("/api/tenant/info", tenantMiddleware, async (req: TenantRequest, res) => {
    try {
      if (!req.tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }
      
      res.json(req.tenant);
    } catch (error) {
      console.error("Tenant info error:", error);
      res.status(500).json({ error: "Failed to fetch tenant information" });
    }
  });

  // Organization settings endpoint (requires authentication)
  app.patch("/api/organization/settings", authMiddleware, requireRole(["admin"]), async (req: TenantRequest, res) => {
    try {
      const updateData = z.object({
        name: z.string().optional(),
        brandName: z.string().optional(),
        region: z.string().optional(),
        settings: z.object({
          theme: z.object({
            primaryColor: z.string().optional()
          }).optional(),
          compliance: z.object({
            gdprEnabled: z.boolean().optional()
          }).optional(),
          features: z.object({
            aiEnabled: z.boolean().optional(),
            billingEnabled: z.boolean().optional()
          }).optional()
        }).optional()
      }).parse(req.body);

      const updatedOrganization = await storage.updateOrganization(req.tenant!.id, updateData);
      
      if (!updatedOrganization) {
        return res.status(404).json({ error: "Organization not found" });
      }

      res.json(updatedOrganization);
    } catch (error) {
      console.error("Organization settings update error:", error);
      res.status(500).json({ error: "Failed to update organization settings" });
    }
  });

  // QuickBooks OAuth callback - MUST be before authMiddleware since OAuth popup has no session
  app.get("/api/quickbooks/auth/callback", tenantMiddleware, async (req: TenantRequest, res) => {
    try {
      console.log("[QUICKBOOKS] OAuth callback received!");
      const { code, realmId, state } = req.query;
      
      if (!code || !realmId) {
        console.log("[QUICKBOOKS] Missing code or realmId");
        return res.status(400).send(`
          <html>
            <body>
              <h1>Error: Invalid OAuth callback</h1>
              <p>Missing required parameters</p>
            </body>
          </html>
        `);
      }

      console.log("[QUICKBOOKS] Code:", code);
      console.log("[QUICKBOOKS] Realm ID:", realmId);
      
      // Exchange authorization code for access and refresh tokens manually
      const redirectUri = process.env.QB_REDIRECT_URI || `${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'http://localhost:5000'}/api/quickbooks/auth/callback`;
      
      console.log("[QUICKBOOKS] Exchanging authorization code for tokens...");
      console.log("[QUICKBOOKS] Redirect URI:", redirectUri);
      
      // Manually exchange token using axios
      const axios = (await import('axios')).default;
      const authHeader = Buffer.from(`${process.env.QUICKBOOKS_CLIENT_ID}:${process.env.QUICKBOOKS_CLIENT_SECRET}`).toString('base64');
      
      const requestBody = `grant_type=authorization_code&code=${encodeURIComponent(code as string)}&redirect_uri=${encodeURIComponent(redirectUri)}`;
      console.log("[QUICKBOOKS] Request body length:", requestBody.length);
      
      const tokenResponse = await axios.post(
        'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
        requestBody,
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${authHeader}`,
          },
        }
      );
      
      const token = tokenResponse.data;
      
      console.log("[QUICKBOOKS] Token exchange successful!");
      console.log("[QUICKBOOKS] Access token received:", !!token.access_token);
      console.log("[QUICKBOOKS] Refresh token received:", !!token.refresh_token);
      console.log("[QUICKBOOKS] Expires in:", token.expires_in, "seconds");

      // Save connection to database
      const organizationId = req.tenant?.id;
      if (!organizationId) {
        throw new Error("Organization ID not found in tenant context");
      }

      console.log("[QUICKBOOKS] Saving connection to database for organization:", organizationId);
      
      // Check if connection already exists
      const existingConnection = await db.select()
        .from(quickbooksConnections)
        .where(and(
          eq(quickbooksConnections.organizationId, organizationId),
          eq(quickbooksConnections.realmId, realmId as string)
        ))
        .limit(1);

      // Determine baseUrl based on environment
      const baseUrl = process.env.QB_ENVIRONMENT === 'production' 
        ? 'https://quickbooks.api.intuit.com' 
        : 'https://sandbox-quickbooks.api.intuit.com';

      if (existingConnection.length > 0) {
        // Update existing connection
        console.log("[QUICKBOOKS] Updating existing connection");
        await db.update(quickbooksConnections)
          .set({
            accessToken: token.access_token,
            refreshToken: token.refresh_token,
            tokenExpiry: new Date(Date.now() + (token.expires_in * 1000)),
            isActive: true,
          })
          .where(eq(quickbooksConnections.id, existingConnection[0].id));
      } else {
        // Create new connection
        console.log("[QUICKBOOKS] Creating new connection");
        await db.insert(quickbooksConnections).values({
          organizationId,
          companyId: realmId as string, // Use realmId as companyId
          companyName: "QuickBooks Company", // Placeholder - will be updated after fetching company info
          realmId: realmId as string,
          accessToken: token.access_token,
          refreshToken: token.refresh_token,
          tokenExpiry: new Date(Date.now() + (token.expires_in * 1000)),
          baseUrl,
          isActive: true,
          syncSettings: {},
        });
      }

      console.log("[QUICKBOOKS] Connection saved successfully!");
      console.log("[QUICKBOOKS] About to send HTML response...");

      // Set proper headers to prevent caching and ensure HTML rendering
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
      console.log("[QUICKBOOKS] Headers set, building HTML...");
      
      const successHtml = `<!DOCTYPE html>
        <html>
          <head>
            <title>QuickBooks Connected</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              }
              .success-container {
                background: white;
                padding: 3rem;
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                text-align: center;
                max-width: 400px;
              }
              .checkmark {
                width: 80px;
                height: 80px;
                border-radius: 50%;
                background: #10b981;
                margin: 0 auto 1.5rem;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: scaleIn 0.5s ease-out;
              }
              @keyframes scaleIn {
                from { transform: scale(0); }
                to { transform: scale(1); }
              }
              .checkmark svg {
                width: 50px;
                height: 50px;
                stroke: white;
                stroke-width: 3;
                fill: none;
                stroke-linecap: round;
                stroke-dasharray: 60;
                stroke-dashoffset: 60;
                animation: drawCheck 0.5s ease-out 0.3s forwards;
              }
              @keyframes drawCheck {
                to { stroke-dashoffset: 0; }
              }
              h1 {
                color: #10b981;
                font-size: 1.75rem;
                margin: 0 0 0.5rem;
              }
              p {
                color: #6b7280;
                margin: 0.5rem 0;
                line-height: 1.5;
              }
              .realm-id {
                font-family: monospace;
                background: #f3f4f6;
                padding: 0.5rem 1rem;
                border-radius: 8px;
                margin-top: 1rem;
                font-size: 0.875rem;
                color: #4b5563;
              }
            </style>
          </head>
          <body>
            <div class="success-container">
              <div class="checkmark">
                <svg viewBox="0 0 52 52">
                  <path d="M14 27l9 9 19-19" />
                </svg>
              </div>
              <h1>Successfully Connected!</h1>
              <p>Your QuickBooks account has been linked to Cura.</p>
              <div class="realm-id">Realm ID: ${realmId}</div>
            </div>
            <script>
              // Send message to parent window immediately (no console.log to avoid wrapping)
              if (window.parent && window.parent !== window) {
                window.parent.postMessage({ type: 'quickbooks-connected', realmId: '${realmId}' }, '*');
                // Log after sending to confirm
                setTimeout(() => console.log('[QB CALLBACK] Message sent to parent, realmId: ${realmId}'), 100);
              }
              // Fallback for popup window
              else if (window.opener) {
                window.opener.postMessage({ type: 'quickbooks-connected', realmId: '${realmId}' }, '*');
                window.close();
              }
            </script>
          </body>
        </html>`;
      
      console.log("[QUICKBOOKS] HTML length:", successHtml.length);
      console.log("[QUICKBOOKS] Sending response now...");
      res.send(successHtml);
      console.log("[QUICKBOOKS] Response sent successfully!");
    } catch (error) {
      console.error("[QUICKBOOKS] Error handling OAuth callback:", error);
      res.status(500).json({ error: "Failed to handle OAuth callback" });
    }
  });

  // Serve static files from uploads folder (public read-only access)
  // Headers already set by earlier middleware at line 724
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  // Protected routes (auth required)
  app.use("/api", authMiddleware);

  // GDPR Compliance Routes
  app.post("/api/gdpr/consent", requireRole(["admin", "patient"]), async (req: TenantRequest, res) => {
    try {
      const consentData = insertGdprConsentSchema.parse({
        ...req.body,
        organizationId: req.tenant!.id
      });
      
      const consent = await gdprComplianceService.recordConsent(consentData);
      res.json(consent);
    } catch (error) {
      console.error("GDPR consent creation error:", error);
      res.status(500).json({ error: "Failed to record consent" });
    }
  });

  app.patch("/api/gdpr/consent/:id/withdraw", requireRole(["admin", "patient"]), async (req: TenantRequest, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      
      await gdprComplianceService.withdrawConsent(parseInt(id), req.tenant!.id, reason);
      res.json({ success: true });
    } catch (error) {
      console.error("GDPR consent withdrawal error:", error);
      res.status(500).json({ error: "Failed to withdraw consent" });
    }
  });

  app.post("/api/gdpr/data-request", requireRole(["admin", "patient"]), async (req: TenantRequest, res) => {
    try {
      // Calculate due date (30 days as per GDPR) before validation
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      
      const requestData = insertGdprDataRequestSchema.parse({
        ...req.body,
        organizationId: req.tenant!.id,
        dueDate
      });
      
      const dataRequest = await gdprComplianceService.submitDataRequest(requestData);
      res.json(dataRequest);
    } catch (error) {
      console.error("GDPR data request error:", error);
      res.status(500).json({ error: "Failed to submit data request" });
    }
  });

  app.get("/api/gdpr/patient/:patientId/data-export", requireRole(["admin", "doctor"]), async (req: TenantRequest, res) => {
    try {
      const { patientId } = req.params;
      const { requestId } = req.query;
      
      const exportData = await gdprComplianceService.exportPatientData(
        parseInt(patientId), 
        req.tenant!.id, 
        parseInt(requestId as string)
      );
      
      res.json(exportData);
    } catch (error) {
      console.error("GDPR data export error:", error);
      res.status(500).json({ error: "Failed to export patient data" });
    }
  });

  app.post("/api/gdpr/patient/:patientId/erasure", requireRole(["admin"]), async (req: TenantRequest, res) => {
    try {
      const { patientId } = req.params;
      const { requestId, reason } = req.body;
      
      await gdprComplianceService.processDataErasure(
        parseInt(patientId), 
        req.tenant!.id, 
        requestId, 
        reason
      );
      
      res.json({ success: true });
    } catch (error) {
      console.error("GDPR data erasure error:", error);
      res.status(500).json({ error: "Failed to process data erasure" });
    }
  });

  app.get("/api/gdpr/patient/:patientId/consent-status", requireRole(["admin", "doctor", "patient"]), async (req: TenantRequest, res) => {
    try {
      const { patientId } = req.params;
      const { consentType } = req.query;
      
      const consentStatus = await gdprComplianceService.checkConsentStatus(
        parseInt(patientId), 
        req.tenant!.id, 
        consentType as string
      );
      
      res.json(consentStatus);
    } catch (error) {
      console.error("GDPR consent status error:", error);
      res.status(500).json({ error: "Failed to check consent status" });
    }
  });

  app.get("/api/gdpr/compliance-report", requireRole(["admin"]), async (req: TenantRequest, res) => {
    try {
      const { period = "monthly" } = req.query;
      
      const report = await gdprComplianceService.generateComplianceReport(
        req.tenant!.id, 
        period as "monthly" | "quarterly" | "annual"
      );
      
      res.json(report);
    } catch (error) {
      console.error("GDPR compliance report error:", error);
      res.status(500).json({ error: "Failed to generate compliance report" });
    }
  });

  // Dashboard routes
  app.get("/api/dashboard/stats", async (req: TenantRequest, res) => {
    try {
      const stats = await storage.getDashboardStats(req.tenant!.id);
      res.json(stats);
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  app.get("/api/dashboard/ai-insights", async (req: TenantRequest, res) => {
    try {
      const insights = await storage.getAiInsightsByOrganization(req.tenant!.id, 10);
      res.json(insights);
    } catch (error) {
      console.error("AI insights error:", error);
      res.status(500).json({ error: "Failed to fetch AI insights" });
    }
  });

  // Get current organization's subscription
  app.get("/api/subscriptions/current", authMiddleware, requireRole(["admin"]), async (req: TenantRequest, res) => {
    try {
      const organizationId = req.tenant!.id;
      
      // Query the database for the subscription
      const result = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.organizationId, organizationId))
        .limit(1);
      
      if (result.length === 0) {
        return res.status(404).json({ error: "No subscription found for this organization" });
      }
      
      // Count actual users in the organization (excluding SaaS owners)
      const userCountResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(and(
          eq(users.organizationId, organizationId),
          eq(users.isSaaSOwner, false)
        ));
      
      const actualUserCount = userCountResult[0]?.count || 0;
      
      // Return subscription with actual user count
      res.json({
        ...result[0],
        currentUsers: actualUserCount
      });
    } catch (error) {
      console.error("Subscription fetch error:", error);
      res.status(500).json({ error: "Failed to fetch subscription" });
    }
  });

  // Get billing history (payment history) for current organization
  app.get("/api/billing-history", authMiddleware, requireRole(["admin"]), async (req: TenantRequest, res) => {
    try {
      const organizationId = req.tenant!.id;
      const { saasPayments } = await import("../shared/schema");
      
      const payments = await db
        .select()
        .from(saasPayments)
        .where(eq(saasPayments.organizationId, organizationId))
        .orderBy(desc(saasPayments.paymentDate));
      
      res.json(payments);
    } catch (error) {
      console.error("Billing history fetch error:", error);
      res.status(500).json({ error: "Failed to fetch billing history" });
    }
  });

  // Generate anatomical treatment plan using OpenAI
  app.post("/api/ai/generate-treatment-plan", authMiddleware, requireRole(["admin", "doctor"]), async (req: TenantRequest, res) => {
    try {
      const { 
        patientId,
        muscleGroup, 
        analysisType, 
        treatment, 
        treatmentIntensity, 
        sessionFrequency,
        primarySymptoms,
        severityScale,
        followUpPlan
      } = req.body;
      
      if (!patientId || !muscleGroup || !analysisType || !treatment) {
        return res.status(400).json({ error: "Required fields missing" });
      }

      console.log(`[GENERATE-TREATMENT-PLAN] Starting AI treatment plan generation for patient ${patientId}`);
      
      let treatmentPlan = "";
      try {
        // Generate treatment plan using OpenAI
        treatmentPlan = await aiService.generateAnatomicalTreatmentPlan({
          muscleGroup,
          analysisType,
          treatment,
          treatmentIntensity,
          sessionFrequency,
          primarySymptoms,
          severityScale,
          followUpPlan
        });
        console.log(`[GENERATE-TREATMENT-PLAN] OpenAI succeeded`);
      } catch (aiError) {
        console.log(`[GENERATE-TREATMENT-PLAN] OpenAI failed, using fallback template`);
        console.error(`[GENERATE-TREATMENT-PLAN] OpenAI Error:`, (aiError as Error)?.message || aiError);
        
        // Fallback treatment plan template
        treatmentPlan = `PROFESSIONAL ANATOMICAL TREATMENT PLAN

Target Area: ${muscleGroup.replace(/_/g, ' ').toUpperCase()}
Analysis Type: ${analysisType.replace(/_/g, ' ')}
Primary Treatment: ${treatment.replace(/_/g, ' ')}

CLINICAL ASSESSMENT:
The patient presents with symptoms affecting the ${muscleGroup.replace(/_/g, ' ')} region. Based on the ${analysisType.replace(/_/g, ' ')} analysis, the following treatment protocol is recommended.

Primary Symptoms: ${primarySymptoms || 'Not specified'}
Severity Rating: ${severityScale || 'Not specified'}

TREATMENT PROTOCOL:
1. Initial Assessment
   - Comprehensive evaluation of ${muscleGroup.replace(/_/g, ' ')} function and condition
   - Baseline documentation with clinical photography
   - Patient history and contraindication screening

2. Primary Treatment: ${treatment.replace(/_/g, ' ')}
   - Treatment Intensity: ${treatmentIntensity || 'Standard'}
   - Session Frequency: ${sessionFrequency || 'As recommended'}
   - Progressive monitoring of muscle response and patient tolerance
   - Adjustment of treatment parameters based on individual response

3. Monitoring and Follow-up
   - Regular assessment of treatment efficacy
   - Documentation of progressive improvements
   - ${followUpPlan || 'Follow-up assessment in 2-3 weeks'}

PATIENT EDUCATION:
- Expected timeline for visible results: 7-14 days
- Potential side effects and their management
- Post-treatment care instructions
- Activity restrictions and recommendations

SAFETY CONSIDERATIONS:
- Patient should be advised of all potential risks and contraindications
- Informed consent must be obtained prior to treatment
- Emergency protocols should be reviewed with patient
- Contact information for post-treatment concerns provided

This treatment plan should be reviewed and adjusted based on individual patient response and clinical judgment.`;
      }

      res.json({ 
        success: true, 
        treatmentPlan
      });
    } catch (error) {
      console.error("Treatment plan generation error:", error);
      res.status(500).json({ error: "Failed to generate treatment plan" });
    }
  });

  // Generate new AI insights using OpenAI
  app.post("/api/ai/generate-insights", authMiddleware, requireRole(["admin", "doctor"]), async (req: TenantRequest, res) => {
    try {
      const { patientId } = req.body;
      
      if (!patientId) {
        return res.status(400).json({ error: "Patient ID is required" });
      }

      // Get patient data
      const patient = await storage.getPatient(parseInt(patientId), req.tenant!.id);
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }

      // Get medical records
      const medicalRecords = await storage.getMedicalRecordsByPatient(parseInt(patientId), req.tenant!.id);

      console.log(`[GENERATE-INSIGHTS] Starting AI insight generation for patient ${patientId}`);
      
      let aiInsightsData = [];
      try {
        // Generate AI insights using OpenAI
        aiInsightsData = await aiService.analyzePatientRisk(patient, medicalRecords);
        console.log(`[GENERATE-INSIGHTS] OpenAI succeeded with ${aiInsightsData.length} insights`);
      } catch (aiError) {
        console.log(`[GENERATE-INSIGHTS] OpenAI failed, using fallback mock insights for patient ${patient.firstName} ${patient.lastName}`);
        console.error(`[GENERATE-INSIGHTS] OpenAI Error:`, (aiError as Error)?.message || aiError);
        
        // Fallback to mock insights when OpenAI fails
        aiInsightsData = [
          {
            type: "risk_assessment",
            title: "Clinical Risk Assessment",
            description: `Comprehensive risk analysis for ${patient.firstName} ${patient.lastName} shows moderate cardiovascular risk based on current medical history and demographics.`,
            severity: "medium",
            actionRequired: true,
            confidence: 85
          },
          {
            type: "preventive",
            title: "Preventive Care Recommendations",
            description: "Patient is due for routine preventive screenings including blood pressure monitoring, cholesterol check, and diabetes screening based on age and risk factors.",
            severity: "low",
            actionRequired: false,
            confidence: 78
          },
          {
            type: "diagnostic",
            title: "Diagnostic Considerations",
            description: "Based on medical history patterns, consider additional monitoring for chronic conditions and regular follow-up assessments.",
            severity: "low",
            actionRequired: false,
            confidence: 72
          }
        ];
        console.log(`[GENERATE-INSIGHTS] Created ${aiInsightsData.length} fallback insights`);
      }

      // Store new insights in database
      const savedInsights = [];
      for (const insightData of aiInsightsData) {
        try {
          console.log('Creating AI insight with data:', {
            organizationId: req.tenant!.id,
            patientId: parseInt(patientId),
            type: insightData.type,
            title: insightData.title,
            severity: insightData.severity
          });
          
          const insight = await storage.createAiInsight({
            organizationId: req.tenant!.id,
            patientId: parseInt(patientId),
            type: insightData.type,
            title: insightData.title,
            description: insightData.description,
            severity: insightData.severity,
            actionRequired: insightData.actionRequired,
            confidence: insightData.confidence.toString(),
            status: "active"
          });
          
          console.log('Successfully created AI insight:', insight.id);
          savedInsights.push(insight);
        } catch (insertError) {
          console.error('Failed to create AI insight:', insertError, 'Data:', insightData);
          // Continue with other insights even if one fails
        }
      }

      res.json({ 
        success: true, 
        insights: savedInsights,
        generated: savedInsights.length,
        patientName: `${patient.firstName} ${patient.lastName}`,
        usingFallbackData: aiInsightsData.length > 0 && !aiInsightsData[0].title?.includes("AI-generated")
      });
    } catch (error) {
      console.error("AI insight generation error:", error);
      res.status(500).json({ error: "Failed to generate AI insights" });
    }
  });

  // Patient routes
  app.get("/api/patients", async (req: TenantRequest, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const isActiveParam = req.query.isActive as string;
      
      // Parse isActive parameter: if provided, convert to boolean, otherwise undefined (return all)
      let isActive: boolean | undefined = undefined;
      if (isActiveParam !== undefined) {
        isActive = isActiveParam === 'true';
      }
      
      const patients = await storage.getPatientsByOrganization(req.tenant!.id, limit, isActive);
      res.json(patients);
    } catch (error) {
      console.error("Patients fetch error:", error);
      res.status(500).json({ error: "Failed to fetch patients" });
    }
  });

  // Check patient email availability - checks if email exists in patients, users, or organizations
  app.get("/api/patients/check-email", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const { email } = req.query;
      const currentOrgId = req.tenant!.id;

      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      // Check if email exists in patients table (same organization)
      const patientsInSameOrg = await storage.getPatientsByOrganization(currentOrgId, 1000);
      const patientInSameOrg = patientsInSameOrg.find(p => p.email === email);

      // Check if email exists in patients table (other organizations)
      const allPatients = await storage.getPatientsByOrganization(0, 1000); // Get all patients globally
      const patientInDifferentOrg = allPatients.find(p => p.email === email && p.organizationId !== currentOrgId);

      // Check if email exists in users table (same organization)
      const existingUser = await storage.getUserByEmailGlobal(email as string);
      const userInSameOrg = existingUser && existingUser.organizationId === currentOrgId;
      const userInDifferentOrg = existingUser && existingUser.organizationId !== currentOrgId;

      // Check if email exists in organizations table
      const [existingOrg] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.email, email as string));
      const orgIsDifferent = existingOrg && existingOrg.id !== currentOrgId;

      // Determine if email is available
      const emailAvailable = !patientInSameOrg && !userInSameOrg && !patientInDifferentOrg && !userInDifferentOrg && !orgIsDifferent;
      const associatedWithAnotherOrg = patientInDifferentOrg || userInDifferentOrg || orgIsDifferent;

      // Prevent caching
      res.setHeader(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, proxy-revalidate",
      );
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");

      res.json({ 
        emailAvailable,
        associatedWithAnotherOrg: !emailAvailable && associatedWithAnotherOrg
      });
    } catch (error) {
      console.error("Error checking patient email availability:", error);
      res.status(500).json({ error: "Failed to check email availability" });
    }
  });

  // IMPORTANT: Specific routes must come before parameterized routes
  app.get("/api/patients/my-prescriptions", authMiddleware, requireRole(["patient"]), async (req: TenantRequest, res) => {
    try {
      console.log("🏥 MY-PRESCRIPTIONS DEBUG: Starting request for user:", req.user?.email);
      
      // Find the patient record by the authenticated user's email
      const patients = await storage.getPatientsByOrganization(req.tenant!.id, 100);
      console.log("🏥 MY-PRESCRIPTIONS DEBUG: Found patients count:", patients.length);
      
      const patient = patients.find(p => p.email === req.user!.email);
      console.log("🏥 MY-PRESCRIPTIONS DEBUG: Found matching patient:", patient ? { id: patient.id, email: patient.email } : null);
      
      if (!patient) {
        console.log("🏥 MY-PRESCRIPTIONS DEBUG: No patient found for email:", req.user!.email);
        return res.status(404).json({ error: "Patient record not found for authenticated user" });
      }
      
      console.log("🏥 MY-PRESCRIPTIONS DEBUG: Getting prescriptions for patient ID:", patient.id);
      const prescriptions = await storage.getPrescriptionsByPatient(patient.id, req.tenant!.id);
      console.log("🏥 MY-PRESCRIPTIONS DEBUG: Found prescriptions count:", prescriptions.length);
      
      res.json({
        prescriptions,
        totalCount: prescriptions.length,
        patientId: patient.id
      });
    } catch (error) {
      console.error("Error fetching patient prescriptions:", error);
      res.status(500).json({ error: "Failed to load prescriptions" });
    }
  });

  // Calculate patient health score - MUST come before /api/patients/:id
  app.get("/api/patients/health-score", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "User authentication required" });
      }

      // Find patient by user email
      const patients = await storage.getPatientsByOrganization(req.tenant!.id);
      const matchingPatient = patients.find(p => p.email === req.user?.email);
      
      if (!matchingPatient) {
        return res.status(404).json({ error: "Patient record not found" });
      }

      // Get medical records for this patient
      const records = await storage.getMedicalRecordsByPatient(matchingPatient.id, req.tenant!.id);
      
      // Calculate health score
      const healthScore = calculateHealthScore(records, matchingPatient);
      
      res.json(healthScore);
    } catch (error) {
      console.error("Health score calculation error:", error);
      res.status(500).json({ error: "Failed to calculate health score" });
    }
  });

  app.get("/api/patients/:id", async (req: TenantRequest, res) => {
    try {
      console.log("🔍 PATIENTS/:ID DEBUG - Raw ID param:", req.params.id);
      const patientId = parseInt(req.params.id);
      console.log("🔍 PATIENTS/:ID DEBUG - Parsed ID:", patientId);
      
      if (isNaN(patientId)) {
        console.error("🔍 PATIENTS/:ID DEBUG - Invalid ID provided:", req.params.id);
        return res.status(400).json({ error: "Invalid patient ID provided" });
      }
      
      const patient = await storage.getPatient(patientId, req.tenant!.id);
      
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }

      // Get AI insights for this patient
      const aiInsights = await storage.getAiInsightsByPatient(patientId, req.tenant!.id);

      res.json({
        ...patient,
        aiInsights
      });
    } catch (error) {
      console.error("Patient fetch error:", error);
      res.status(500).json({ error: "Failed to fetch patient" });
    }
  });

  // Delete patient
  app.delete("/api/patients/:id", authMiddleware, requireRole(["admin"]), async (req: TenantRequest, res) => {
    try {
      const patientId = parseInt(req.params.id);
      
      // Verify patient exists and belongs to organization
      const patient = await storage.getPatient(patientId, req.tenant!.id);
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }

      // Delete patient (this will cascade delete related records)
      const deleted = await storage.deletePatient(patientId, req.tenant!.id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Failed to delete patient" });
      }

      res.json({ success: true, message: "Patient deleted successfully" });
    } catch (error) {
      console.error("Patient deletion error:", error);
      res.status(500).json({ error: "Failed to delete patient" });
    }
  });

  // Get patient medical records only
  app.get("/api/patients/:id/records", async (req: TenantRequest, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const records = await storage.getMedicalRecordsByPatient(patientId, req.tenant!.id);
      res.json(records);
    } catch (error) {
      console.error("Medical records fetch error:", error);
      res.status(500).json({ error: "Failed to fetch medical records" });
    }
  });


  // Get patient history by ID
  app.get("/api/patients/:id/history", async (req: TenantRequest, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const patient = await storage.getPatient(patientId, req.tenant!.id);
      
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }

      // Return patient's medical history and family history
      const history = {
        familyHistory: patient.medicalHistory?.familyHistory || {},
        socialHistory: patient.medicalHistory?.socialHistory || {},
        allergies: patient.medicalHistory?.allergies || [],
        chronicConditions: patient.medicalHistory?.chronicConditions || [],
        medications: patient.medicalHistory?.medications || [],
        immunizations: patient.medicalHistory?.immunizations || []
      };

      res.json(history);
    } catch (error) {
      console.error("Patient history fetch error:", error);
      res.status(500).json({ error: "Failed to fetch patient history" });
    }
  });

  // Get patient prescriptions by ID
  app.get("/api/patients/:id/prescriptions", async (req: TenantRequest, res) => {
    try {
      const patientId = parseInt(req.params.id);
      
      // Get prescriptions directly from prescriptions table
      const prescriptions = await storage.getPrescriptionsByPatient(patientId, req.tenant!.id);
      
      // Format prescriptions for frontend
      const formattedPrescriptions = prescriptions.map(prescription => ({
        id: prescription.id,
        medicationName: prescription.medicationName || 'Unknown medication',
        dosage: prescription.dosage || 'Not specified',
        frequency: prescription.frequency || 'Not specified',
        duration: prescription.duration || 'Not specified',
        instructions: prescription.instructions || 'No instructions',
        prescribedBy: 'Dr. Unknown', // TODO: Link to doctor via doctorId
        prescribedDate: prescription.prescribedAt || prescription.createdAt,
        status: prescription.status || 'active',
        diagnosis: prescription.diagnosis || 'No diagnosis specified',
        medications: prescription.medications || [],
        providerId: prescription.doctorId,
        createdAt: prescription.createdAt
      }));

      res.json(formattedPrescriptions);
    } catch (error) {
      console.error("Patient prescriptions fetch error:", error);
      res.status(500).json({ error: "Failed to fetch patient prescriptions" });
    }
  });

  // Get patient lab results by ID
  app.get("/api/patients/:id/pending-results", async (req: TenantRequest, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const organizationId = requireOrgId(req);

      if (isNaN(patientId)) {
        return res.status(400).json({ error: "Invalid patient ID" });
      }

      // Fetch pending records from all relevant tables
      const pendingPrescriptions = await storage.getPrescriptionsByStatus(patientId, organizationId, "pending");
      const pendingLabResults = await storage.getLabResultsByStatus(patientId, organizationId, "pending"); 
      const pendingAiInsights = await storage.getAiInsightsByStatus(patientId, organizationId, "pending");
      const pendingClaims = await storage.getClaimsByStatus(patientId, organizationId, "pending");
      const pendingVoiceNotes = await storage.getVoiceNotesByStatus(patientId, organizationId, "pending");
      
      // Get all medical records (since they don't have status field)
      const allMedicalRecords = await storage.getMedicalRecordsByPatient(patientId, organizationId);

      // Calculate totals
      const totalCount = 
        (pendingPrescriptions?.length || 0) +
        (pendingLabResults?.length || 0) +
        (pendingAiInsights?.length || 0) +
        (pendingClaims?.length || 0) +
        (pendingVoiceNotes?.length || 0) +
        (allMedicalRecords?.length || 0);

      res.json({
        totalCount,
        prescriptions: pendingPrescriptions || [],
        labResults: pendingLabResults || [],
        medicalRecords: allMedicalRecords || [],
        aiInsights: pendingAiInsights || [],
        voiceNotes: pendingVoiceNotes || [],
        claims: pendingClaims || []
      });
    } catch (error) {
      return handleRouteError(error, "fetch patient pending results", res);
    }
  });

  app.get("/api/patients/:id/lab-results", async (req: TenantRequest, res) => {
    try {
      const patientId = parseInt(req.params.id);
      
      // Get lab results for this patient
      const labResults = await storage.getLabResultsByPatient(patientId, req.tenant!.id);
      
      // Format lab results for frontend display
      const formattedLabResults = labResults.map(labResult => {
        // If results array has data, use the first result for main display
        const primaryResult = labResult.results && labResult.results.length > 0 ? labResult.results[0] : null;
        
        return {
          id: labResult.id,
          testId: labResult.testId || 'Not specified',
          testName: labResult.testType || 'Lab Test',
          name: labResult.testType || 'Lab Test',
          testType: labResult.testType,
          status: labResult.status || 'completed',
          testDate: labResult.completedAt || labResult.collectedAt || labResult.orderedAt || labResult.createdAt,
          orderedAt: labResult.orderedAt,
          collectedAt: labResult.collectedAt,
          completedAt: labResult.completedAt,
          priority: labResult.priority || 'routine',
          // Use primary result values or fallback
          result: primaryResult?.value || 'N/A',
          value: primaryResult?.value || 'N/A',
          referenceRange: primaryResult?.referenceRange || 'Not specified',
          units: primaryResult?.unit || 'Not specified',
          unit: primaryResult?.unit || 'Not specified',
          // Additional fields
          results: labResult.results || [],
          criticalValues: labResult.criticalValues || false,
          notes: labResult.notes || '',
          doctorName: labResult.doctorName || 'Unknown',
          orderedBy: labResult.orderedBy,
          createdAt: labResult.createdAt
        };
      });
      
      res.json(formattedLabResults);
    } catch (error) {
      console.error("Patient lab results fetch error:", error);
      res.status(500).json({ error: "Failed to fetch patient lab results" });
    }
  });

  // Get patient medical imaging by ID
  app.get("/api/patients/:id/medical-imaging", async (req: TenantRequest, res) => {
    try {
      const patientId = parseInt(req.params.id);
      
      // Get medical imaging for this patient
      const imaging = await storage.getMedicalImagesByPatient(patientId, req.tenant!.id);
      
      res.json(imaging || []);
    } catch (error) {
      console.error("Patient medical imaging fetch error:", error);
      res.status(500).json({ error: "Failed to fetch patient medical imaging" });
    }
  });

  // Get patient insurance information by ID
  app.get("/api/patients/:id/insurance", async (req: TenantRequest, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const patient = await storage.getPatient(patientId, req.tenant!.id);
      
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }

      // Return patient's insurance information
      res.json(patient.insuranceInfo || {});
    } catch (error) {
      console.error("Patient insurance fetch error:", error);
      res.status(500).json({ error: "Failed to fetch patient insurance information" });
    }
  });

  // Get patient address information by ID
  app.get("/api/patients/:id/address", async (req: TenantRequest, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const patient = await storage.getPatient(patientId, req.tenant!.id);
      
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }

      // Return patient's address information
      res.json(patient.address || {});
    } catch (error) {
      console.error("Patient address fetch error:", error);
      res.status(500).json({ error: "Failed to fetch patient address information" });
    }
  });

  // Get patient emergency contact by ID
  app.get("/api/patients/:id/emergency-contact", async (req: TenantRequest, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const patient = await storage.getPatient(patientId, req.tenant!.id);
      
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }

      // Return patient's emergency contact information
      res.json(patient.emergencyContact || {});
    } catch (error) {
      console.error("Patient emergency contact fetch error:", error);
      res.status(500).json({ error: "Failed to fetch patient emergency contact information" });
    }
  });

  // Create medical record for patient
  app.post("/api/patients/:id/records", authMiddleware, requireNonPatientRole(), async (req: TenantRequest, res) => {
    try {
      const patientId = parseInt(req.params.id);
      
      const recordData = z.object({
        type: z.enum(["consultation", "prescription", "lab_result", "imaging", "history", "examination", "assessment", "summary", "vitals"]),
        title: z.string().min(1),
        notes: z.string().optional(),
        diagnosis: z.string().optional(),
        treatment: z.string().optional(),
        prescription: z.object({
          medications: z.array(z.object({
            name: z.string(),
            dosage: z.string(),
            frequency: z.string(),
            duration: z.string(),
            instructions: z.string().optional()
          })).optional()
        }).optional(),
        followUpRequired: z.boolean().optional(),
        followUpDate: z.string().optional(),
        referrals: z.array(z.object({
          specialist: z.string(),
          reason: z.string(),
          urgency: z.string()
        })).optional()
      }).parse(req.body);

      const record = await storage.createMedicalRecord({
        ...recordData,
        organizationId: req.tenant!.id,
        patientId,
        providerId: req.user!.id,
        recordType: recordData.type, // Add required recordType
        content: recordData.notes || recordData.title, // Add required content
        prescription: recordData.prescription || {},
        attachments: [],
        aiSuggestions: {}
      });

      res.status(201).json(record);
    } catch (error) {
      console.error("Medical record creation error:", error);
      res.status(500).json({ error: "Failed to create medical record" });
    }
  });

  app.post("/api/patients", requireRole(["doctor", "nurse", "admin"]), async (req: TenantRequest, res) => {
    try {
      console.log("🔍 [PATIENT_CREATION] Received request body:", JSON.stringify(req.body, null, 2));
      console.log("🔍 [PATIENT_CREATION] Insurance info from body:", JSON.stringify(req.body.insuranceInfo, null, 2));
      console.log("🔍 [PATIENT_CREATION] Insurance info type:", typeof req.body.insuranceInfo);
      console.log("🔍 [PATIENT_CREATION] Insurance info keys:", req.body.insuranceInfo ? Object.keys(req.body.insuranceInfo) : 'null/undefined');
      
      const patientData = z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        dateOfBirth: z.string().transform(str => new Date(str)),
        genderAtBirth: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        nhsNumber: z.string().optional(),
        address: z.object({
          street: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          postcode: z.string().optional(),
          country: z.string().optional()
        }).optional(),
        emergencyContact: z.object({
          name: z.string().optional(),
          relationship: z.string().optional(),
          phone: z.string().optional()
        }).optional(),
        insuranceInfo: z.object({
          provider: z.string().optional(),
          policyNumber: z.string().optional(),
          groupNumber: z.string().optional(),
          memberNumber: z.string().optional(),
          planType: z.string().optional(),
          effectiveDate: z.string().optional(),
          expirationDate: z.string().optional(),
          copay: z.number().optional(),
          deductible: z.number().optional(),
          isActive: z.boolean().optional()
        }).optional(),
        medicalHistory: z.object({
          allergies: z.array(z.string()).optional(),
          chronicConditions: z.array(z.string()).optional(),
          medications: z.array(z.string()).optional(),
          familyHistory: z.object({
            father: z.array(z.string()).optional(),
            mother: z.array(z.string()).optional(),
            siblings: z.array(z.string()).optional(),
            grandparents: z.array(z.string()).optional()
          }).optional(),
          socialHistory: z.object({
            smoking: z.object({
              status: z.enum(["never", "former", "current"]).optional(),
              packsPerDay: z.number().optional(),
              yearsSmoked: z.number().optional(),
              quitDate: z.string().optional()
            }).optional(),
            alcohol: z.object({
              status: z.enum(["never", "occasional", "moderate", "heavy"]).optional(),
              drinksPerWeek: z.number().optional()
            }).optional(),
            drugs: z.object({
              status: z.enum(["never", "former", "current"]).optional(),
              substances: z.array(z.string()).optional(),
              notes: z.string().optional()
            }).optional(),
            occupation: z.string().optional(),
            maritalStatus: z.enum(["single", "married", "divorced", "widowed", "partner"]).optional(),
            education: z.string().optional(),
            exercise: z.object({
              frequency: z.enum(["none", "occasional", "regular", "daily"]).optional(),
              type: z.string().optional(),
              duration: z.string().optional()
            }).optional()
          }).optional(),
          immunizations: z.array(z.object({
            id: z.string(),
            vaccine: z.string(),
            date: z.string(),
            provider: z.string(),
            lot: z.string().optional(),
            site: z.string().optional(),
            notes: z.string().optional()
          })).optional()
        }).optional()
      }).parse(req.body);

      console.log("🔍 [PATIENT_CREATION] After Zod validation - insuranceInfo:", JSON.stringify(patientData.insuranceInfo, null, 2));
      console.log("🔍 [PATIENT_CREATION] After Zod validation - insuranceInfo type:", typeof patientData.insuranceInfo);

      // Generate patient ID
      const patientCount = await storage.getPatientsByOrganization(req.tenant!.id, 999999);
      const patientId = `P${(patientCount.length + 1).toString().padStart(6, '0')}`;

      // Use database transaction to ensure atomicity
      const patient = await db.transaction(async (tx) => {
        // Step 1: Create user record in users table with hashed password
        console.log("🔵 [PATIENT_CREATION] Starting transaction...");
        const hashedPassword = await bcrypt.hash("cura123", 10);
        console.log("🔵 [PATIENT_CREATION] Password hashed successfully");
        
        const [newUser] = await tx.insert(users).values({
          organizationId: req.tenant!.id,
          email: patientData.email || `patient_${Date.now()}@placeholder.com`,
          username: patientData.email || `patient_${Date.now()}`,
          passwordHash: hashedPassword,
          firstName: patientData.firstName,
          lastName: patientData.lastName,
          role: 'patient',
          department: null,
          medicalSpecialtyCategory: null,
          subSpecialty: null,
          workingDays: [],
          workingHours: {},
          permissions: {},
          isActive: true,
          isSaaSOwner: false
        }).returning();
        
        console.log("✅ [PATIENT_CREATION] User created successfully:", { id: newUser.id, email: newUser.email, role: newUser.role });

        // Step 2: Create patient record with user_id foreign key
        const medicalHistoryData = {
          allergies: patientData.medicalHistory?.allergies || [],
          chronicConditions: patientData.medicalHistory?.chronicConditions || [],
          medications: patientData.medicalHistory?.medications || [],
          familyHistory: {
            father: [],
            mother: [],
            siblings: [],
            grandparents: [],
            ...patientData.medicalHistory?.familyHistory
          },
          socialHistory: {
            smoking: { status: "never" },
            alcohol: { status: "never" },
            drugs: { status: "never" },
            occupation: "",
            maritalStatus: "single",
            education: "",
            exercise: { frequency: "none" },
            ...patientData.medicalHistory?.socialHistory
          },
          immunizations: patientData.medicalHistory?.immunizations || [],
          ...patientData.medicalHistory
        };

        const patientInsertData = {
          ...patientData,
          organizationId: req.tenant!.id,
          userId: newUser.id, // Foreign key to users table
          patientId,
          address: patientData.address || {},
          emergencyContact: patientData.emergencyContact || {},
          insuranceInfo: patientData.insuranceInfo || {},
          medicalHistory: medicalHistoryData
        };

        console.log("🔍 [PATIENT_CREATION] Data being inserted into database - insuranceInfo:", JSON.stringify(patientInsertData.insuranceInfo, null, 2));

        const [patientRecord] = await tx.insert(patients).values(enforceCreatedBy(req, patientInsertData as any)).returning();
        
        console.log("✅ [PATIENT_CREATION] Patient record created successfully:", { id: patientRecord.id, patientId: patientRecord.patientId, userId: newUser.id });

        // Step 3: Create insurance verification record if insurance info is provided
        console.log("🔍 [INSURANCE_CHECK] Checking insurance info:", {
          hasInsuranceInfo: !!patientData.insuranceInfo,
          provider: patientData.insuranceInfo?.provider,
          policyNumber: patientData.insuranceInfo?.policyNumber,
          providerLength: (patientData.insuranceInfo?.provider?.trim() ?? "").length,
          policyNumberLength: (patientData.insuranceInfo?.policyNumber?.trim() ?? "").length,
          conditionResult: !!(patientData.insuranceInfo && (patientData.insuranceInfo.provider?.trim() || patientData.insuranceInfo.policyNumber?.trim()))
        });
        
        // Check if either provider or policyNumber has a non-empty value (trim to handle whitespace-only strings)
        if (patientData.insuranceInfo && (patientData.insuranceInfo.provider?.trim() || patientData.insuranceInfo.policyNumber?.trim())) {
          console.log("✅ [INSURANCE_CHECK] Condition passed - Creating insurance verification record");
          const insuranceData: any = {
            organizationId: req.tenant!.id,
            patientId: patientRecord.id,
            patientName: `${patientData.firstName} ${patientData.lastName}`,
            provider: patientData.insuranceInfo.provider || '',
            policyNumber: patientData.insuranceInfo.policyNumber || '',
            groupNumber: patientData.insuranceInfo.groupNumber || null,
            memberNumber: patientData.insuranceInfo.memberNumber || null,
            nhsNumber: patientData.nhsNumber || null,
            planType: patientData.insuranceInfo.planType || null,
            coverageType: 'primary' as const,
            status: patientData.insuranceInfo.isActive ? ('active' as const) : ('inactive' as const),
            eligibilityStatus: 'pending' as const,
            effectiveDate: patientData.insuranceInfo.effectiveDate ? new Date(patientData.insuranceInfo.effectiveDate) : null,
            expirationDate: patientData.insuranceInfo.expirationDate ? new Date(patientData.insuranceInfo.expirationDate) : null,
            lastVerified: null,
            benefits: {
              deductible: patientData.insuranceInfo.deductible || 0,
              copay: patientData.insuranceInfo.copay || 0
            }
          };

          const [insuranceRecord] = await tx.insert(insuranceVerifications).values(insuranceData as any).returning();
          console.log("✅ [PATIENT_CREATION] Insurance verification record created:", { id: insuranceRecord.id, provider: insuranceRecord.provider });
        }

        console.log("🎉 [PATIENT_CREATION] Transaction completed successfully!");

        return patientRecord;
      });

      // Generate AI insights for new patient
      if (req.tenant!.settings?.features?.aiEnabled) {
        try {
          const insights = await aiService.generatePreventiveCareReminders(patient);
          
          for (const insight of insights) {
            await storage.createAiInsight({
              organizationId: req.tenant!.id,
              patientId: patient.id,
              type: insight.type,
              title: insight.title,
              description: insight.description,
              severity: insight.severity,
              actionRequired: insight.actionRequired,
              confidence: insight.confidence.toString()
            });
          }
        } catch (aiError) {
          console.error("AI insights generation failed:", aiError);
        }
      }

      res.status(201).json(patient);
    } catch (error) {
      console.error("❌ [PATIENT_CREATION] Patient creation error:", error);
      if (error instanceof Error) {
        console.error("❌ [PATIENT_CREATION] Error message:", error.message);
        console.error("❌ [PATIENT_CREATION] Error stack:", error.stack);
      }
      res.status(500).json({ error: "Failed to create patient" });
    }
  });

  // Update patient medical history
  app.patch("/api/patients/:id/medical-history", authMiddleware, requireRole(["admin", "doctor", "nurse"]), async (req: TenantRequest, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const medicalHistoryUpdate = req.body;

      console.log("=== MEDICAL HISTORY UPDATE DEBUG ===");
      console.log("Patient ID:", patientId);
      console.log("Received familyHistory:", JSON.stringify(medicalHistoryUpdate.familyHistory, null, 2));

      const patient = await storage.getPatient(patientId, req.tenant!.id);
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }

      console.log("Current medical history:", JSON.stringify(patient.medicalHistory, null, 2));

      // Preserve all existing medical history and merge with updates
      const updatedMedicalHistory = {
        ...patient.medicalHistory,
        ...medicalHistoryUpdate,
        // Ensure arrays are properly handled
        allergies: medicalHistoryUpdate.allergies || patient.medicalHistory?.allergies || [],
        chronicConditions: medicalHistoryUpdate.chronicConditions || patient.medicalHistory?.chronicConditions || [],
        medications: medicalHistoryUpdate.medications || patient.medicalHistory?.medications || [],
        familyHistory: {
          ...patient.medicalHistory?.familyHistory,
          ...medicalHistoryUpdate.familyHistory
        },
        socialHistory: {
          ...patient.medicalHistory?.socialHistory,
          ...medicalHistoryUpdate.socialHistory
        },
        immunizations: medicalHistoryUpdate.immunizations || patient.medicalHistory?.immunizations || []
      };

      console.log("Final merged medical history:", JSON.stringify(updatedMedicalHistory, null, 2));

      const updatedPatient = await storage.updatePatient(patientId, req.tenant!.id, {
        medicalHistory: updatedMedicalHistory
      });

      console.log("Updated patient medical history:", JSON.stringify(updatedPatient?.medicalHistory, null, 2));
      console.log("=== END DEBUG ===");

      res.json(updatedPatient);
    } catch (error) {
      console.error("Error updating patient medical history:", error);
      res.status(500).json({ error: "Failed to update medical history" });
    }
  });

  // Update patient data (comprehensive schema)
  app.patch("/api/patients/:id", authMiddleware, requireRole(["doctor", "nurse", "admin"]), async (req: TenantRequest, res) => {
    try {
      const patientId = parseInt(req.params.id);
      
      const updateData = z.object({
        firstName: z.string().trim().min(1, "First name is required").optional(),
        lastName: z.string().trim().min(1, "Last name is required").optional(),
        dateOfBirth: z.string().trim().min(1, "Date of birth is required").refine(
          (val) => !isNaN(Date.parse(val)),
          { message: "Please enter a valid date" }
        ).optional(),
        genderAtBirth: z.string().trim().optional(),
        email: z.string().trim().email("Please enter a valid email address").optional().or(z.literal("")),
        phone: z.string().trim().min(1, "Phone number is required").regex(
          /^[\+]?[0-9\s\-\(\)]{10,}$/,
          "Please enter a valid phone number"
        ).optional(),
        nhsNumber: z.string().trim().optional(),
        address: z.object({
          street: z.string().trim().optional(),
          city: z.string().trim().optional(),
          state: z.string().trim().optional(),
          postcode: z.string().trim().optional(),
          country: z.string().trim().optional()
        }).optional(),
        insuranceInfo: z.object({
          provider: z.string().trim().optional(),
          policyNumber: z.string().trim().optional(),
          groupNumber: z.string().trim().optional(),
          memberNumber: z.string().trim().optional(),
          planType: z.string().trim().optional(),
          effectiveDate: z.string().trim().optional(),
          expirationDate: z.string().trim().optional(),
          copay: z.coerce.number({ invalid_type_error: "Must be a number" }).min(0, "Cannot be negative").optional(),
          deductible: z.coerce.number({ invalid_type_error: "Must be a number" }).min(0, "Cannot be negative").optional(),
          isActive: z.boolean().optional()
        }).optional(),
        emergencyContact: z.object({
          name: z.string().trim().optional(),
          relationship: z.string().trim().optional(),
          phone: z.string().trim().regex(
            /^[\+]?[0-9\s\-\(\)]{10,}$/,
            "Please enter a valid phone number"
          ).optional(),
          email: z.string().trim().email("Please enter a valid email address").optional().or(z.literal(""))
        }).optional(),
        medicalHistory: z.object({
          allergies: z.array(z.string()).optional(),
          chronicConditions: z.array(z.string()).optional(),
          medications: z.array(z.string()).optional(),
          familyHistory: z.object({
            father: z.array(z.string()).optional(),
            mother: z.array(z.string()).optional(),
            siblings: z.array(z.string()).optional(),
            grandparents: z.array(z.string()).optional()
          }).optional(),
          socialHistory: z.object({
            smoking: z.object({ status: z.string() }).optional(),
            alcohol: z.object({ status: z.string() }).optional(),
            drugs: z.object({ status: z.string() }).optional(),
            exercise: z.object({ frequency: z.string() }).optional(),
            education: z.string().optional(),
            occupation: z.string().optional(),
            maritalStatus: z.string().optional()
          }).optional(),
          immunizations: z.array(z.string()).optional()
        }).optional(),
        communicationPreferences: z.object({
          preferredMethod: z.enum(["email", "sms", "phone"]).optional(),
          language: z.string().optional(),
          marketingConsent: z.boolean().optional()
        }).optional(),
        flags: z.array(z.string()).optional(),
        riskLevel: z.enum(["low", "medium", "high", "critical"]).optional(),
        isActive: z.boolean().optional()
      }).parse(req.body);

      const patient = await storage.getPatient(patientId, req.tenant!.id);
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }

      // Convert dateOfBirth string to proper format for storage
      const storageUpdateData: any = { ...updateData };
      if (updateData.dateOfBirth) {
        // Since the database uses { mode: 'string' }, we keep it as string but ensure it's in YYYY-MM-DD format
        const parsedDate = new Date(updateData.dateOfBirth);
        storageUpdateData.dateOfBirth = parsedDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      }

      const updatedPatient = await storage.updatePatient(patientId, req.tenant!.id, storageUpdateData);

      if (!updatedPatient) {
        return res.status(404).json({ error: "Failed to update patient" });
      }

      res.json(updatedPatient);
    } catch (error) {
      handleRouteError(error, "Update patient", res);
    }
  });


  // Update medical record endpoint
  app.patch("/api/patients/:patientId/records/:recordId", authMiddleware, requireNonPatientRole(), async (req: TenantRequest, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const recordId = parseInt(req.params.recordId);
      
      const updateData = z.object({
        type: z.enum(["consultation", "prescription", "lab_result", "imaging", "history", "examination", "assessment", "summary", "vitals"]).optional(),
        title: z.string().optional(),
        notes: z.string().optional(),
        diagnosis: z.string().optional(),
        treatment: z.string().optional(),
        prescription: z.object({
          medications: z.array(z.object({
            name: z.string(),
            dosage: z.string(),
            frequency: z.string(),
            duration: z.string()
          })).optional()
        }).optional()
      }).parse(req.body);

      const existingRecord = await storage.getMedicalRecord(recordId, req.tenant!.id);
      if (!existingRecord || existingRecord.patientId !== patientId) {
        return res.status(404).json({ error: "Medical record not found" });
      }

      const updatedRecord = await storage.updateMedicalRecord(recordId, req.tenant!.id, {
        ...updateData,
        prescription: updateData.prescription || existingRecord.prescription || {}
      });

      if (!updatedRecord) {
        return res.status(404).json({ error: "Failed to update medical record" });
      }

      res.json(updatedRecord);
    } catch (error) {
      console.error("Medical record update error:", error);
      res.status(500).json({ error: "Failed to update medical record" });
    }
  });

  // Delete medical record endpoint
  app.delete("/api/patients/:patientId/records/:recordId", authMiddleware, requireNonPatientRole(), async (req: TenantRequest, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const recordId = parseInt(req.params.recordId);

      const existingRecord = await storage.getMedicalRecord(recordId, req.tenant!.id);
      if (!existingRecord || existingRecord.patientId !== patientId) {
        return res.status(404).json({ error: "Medical record not found" });
      }

      const deleted = await storage.deleteMedicalRecord(recordId, req.tenant!.id);

      if (!deleted) {
        return res.status(404).json({ error: "Failed to delete medical record" });
      }

      res.json({ success: true, message: "Medical record deleted successfully" });
    } catch (error) {
      console.error("Medical record delete error:", error);
      res.status(500).json({ error: "Failed to delete medical record" });
    }
  });

  // Enhanced patient reminder endpoint with communication tracking
  // Prescription safety check endpoint
  app.post("/api/prescription/safety-check", authMiddleware, requireRole(["doctor", "nurse"]), async (req: TenantRequest, res) => {
    try {
      const safetyData = z.object({
        patientId: z.number(),
        medications: z.array(z.object({
          name: z.string(),
          dosage: z.string(),
          frequency: z.string().optional(),
          duration: z.string().optional()
        }))
      }).parse(req.body);

      const patient = await storage.getPatient(safetyData.patientId, req.tenant!.id);
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }

      const safetyAnalysis = await aiService.analyzePrescription(
        safetyData.medications,
        {
          age: new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear(),
          allergies: patient.medicalHistory?.allergies || [],
          conditions: patient.medicalHistory?.chronicConditions || []
        }
      );

      res.json({
        success: true,
        patientId: safetyData.patientId,
        analysis: safetyAnalysis,
        riskLevel: safetyAnalysis.interactions.length > 0 || safetyAnalysis.allergyWarnings.length > 0 || safetyAnalysis.contraindications.length > 0 ? "high" : "low",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Prescription safety check error:", error);
      res.status(500).json({ error: "Failed to perform safety check" });
    }
  });

  app.post("/api/patients/:id/send-reminder", requireRole(["doctor", "nurse", "receptionist", "admin"]), async (req: TenantRequest, res) => {
    try {
      const patientId = parseInt(req.params.id);
      
      const reminderData = z.object({
        type: z.enum(["appointment_reminder", "medication_reminder", "follow_up_reminder", "emergency_alert", "preventive_care", "billing_notice", "health_check"]).default("appointment_reminder"),
        message: z.string().optional(),
        method: z.enum(["email", "sms", "whatsapp", "system"]).default("system")
      }).parse(req.body);

      const patient = await storage.getPatient(patientId, req.tenant!.id);
      
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }

      // Skip spam prevention check since communications table doesn't exist

      console.log(`Sending ${reminderData.type} to patient ${patient.firstName} ${patient.lastName} via ${reminderData.method}`);
      console.log(`Message: ${reminderData.message || 'Default reminder message'}`);

      // Actually send the message if SMS or WhatsApp is selected and patient has phone number
      let messageSent = false;
      let messageResult = null;
      
      if ((reminderData.method === 'sms' || reminderData.method === 'whatsapp') && patient.phone) {
        try {
          const messageText = reminderData.message || `Hi ${patient.firstName}, this is a reminder from your healthcare provider.`;
          
          messageResult = await messagingService.sendMessage({
            to: patient.phone,
            message: messageText,
            type: reminderData.method as 'sms' | 'whatsapp'
          });
          
          if (messageResult.success) {
            messageSent = true;
            console.log(`✅ ${reminderData.method.toUpperCase()} successfully sent to ${patient.phone}`);
          } else {
            console.error(`❌ Failed to send ${reminderData.method.toUpperCase()}: ${messageResult.error}`);
          }
        } catch (error) {
          console.error(`❌ Error sending ${reminderData.method.toUpperCase()} to ${patient.phone}:`, error);
        }
      } else if (reminderData.method === 'email' && patient.email) {
        try {
          const messageText = reminderData.message || `Hi ${patient.firstName}, this is a reminder from your healthcare provider.`;
          
          const emailResult = await emailService.sendGeneralReminder(
            patient.email,
            `${patient.firstName} ${patient.lastName}`,
            reminderData.type,
            messageText
          );
          
          if (emailResult) {
            messageSent = true;
            console.log(`✅ EMAIL successfully sent to ${patient.email}`);
          } else {
            console.error(`❌ Failed to send EMAIL to ${patient.email}`);
          }
        } catch (error) {
          console.error(`❌ Error sending EMAIL to ${patient.email}:`, error);
        }
      }

      // Save communication to database
      const communicationData = {
        organizationId: req.tenant!.id,
        patientId,
        sentBy: req.user!.id,
        type: reminderData.type,
        method: reminderData.method,
        status: messageSent ? 'sent' : 'pending',
        message: reminderData.message || `Hi ${patient.firstName}, this is a reminder from your healthcare provider.`,
        sentAt: messageSent ? new Date() : null,
        errorMessage: messageSent ? null : (messageResult?.error || null),
        metadata: {
          reminderType: reminderData.type,
          messageSent,
          provider: reminderData.method === 'sms' || reminderData.method === 'whatsapp' ? 'Twilio' : reminderData.method === 'email' ? 'SendGrid' : 'System'
        }
      };

      const savedCommunication = await storage.createPatientCommunication(communicationData);

      res.json({ 
        success: true, 
        message: messageSent ? 
          `${reminderData.method.toUpperCase()} reminder successfully sent to ${patient.firstName} ${patient.lastName}` :
          `Reminder logged for ${patient.firstName} ${patient.lastName} (${reminderData.method === 'email' && !patient.email ? 'No email address available' : !patient.phone ? 'No phone number available' : 'System notification only'})`,
        patientId,
        reminderType: reminderData.type,
        messageSent,
        messageDetails: messageResult,
        communicationId: savedCommunication.id
      });
    } catch (error) {
      console.error("Send reminder error:", error);
      res.status(500).json({ error: "Failed to send reminder" });
    }
  });

  // Patient flag endpoint
  app.post("/api/patients/:id/flags", requireRole(["doctor", "nurse", "receptionist", "admin"]), async (req: TenantRequest, res) => {
    try {
      const patientId = parseInt(req.params.id);
      
      const flagData = z.object({
        type: z.enum([
          "medical_alert", "allergy_warning", "medication_interaction", 
          "high_risk", "special_needs", "insurance_issue", 
          "payment_overdue", "follow_up_required"
        ]).optional(),
        flagType: z.enum(["urgent", "follow-up", "billing", "general"]).optional(),
        reason: z.string().min(1),
        severity: z.enum(["low", "medium", "high", "critical"]).optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).optional()
      }).parse(req.body);

      // Use the new type field if provided, otherwise fall back to flagType
      const finalFlagType = flagData.type || flagData.flagType || "general";
      const finalPriority = flagData.severity || flagData.priority || "medium";

      const patient = await storage.getPatient(patientId, req.tenant!.id);
      
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }

      // Create the flag string with type and priority
      const flagString = `${finalFlagType}:${finalPriority}:${flagData.reason}`;
      
      // Get current flags array and add the new flag
      const currentFlags = patient.flags || [];
      if (!currentFlags.includes(flagString)) {
        currentFlags.push(flagString);
        
        // Update patient with new flag and risk level based on flag severity
        await storage.updatePatient(patientId, req.tenant!.id, {
          flags: currentFlags,
          riskLevel: finalPriority // Update risk level to match flag severity
        });
      }

      // Fetch updated patient to return current state
      const updatedPatient = await storage.getPatient(patientId, req.tenant!.id);

      res.json({ 
        success: true, 
        message: `${finalFlagType} flag (${finalPriority} priority) added to ${patient.firstName} ${patient.lastName}`,
        patientId,
        flagType: finalFlagType,
        priority: finalPriority,
        reason: flagData.reason,
        totalFlags: updatedPatient?.flags?.length || 0,
        flags: updatedPatient?.flags || []
      });
    } catch (error) {
      console.error("Patient flag error:", error);
      res.status(500).json({ error: "Failed to create patient flag" });
    }
  });

  // Delete patient flag endpoint
  app.delete("/api/patients/:id/flags/:flagIndex", requireRole(["doctor", "nurse", "receptionist", "admin"]), async (req: TenantRequest, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const flagIndex = parseInt(req.params.flagIndex);
      
      const patient = await storage.getPatient(patientId, req.tenant!.id);
      
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }

      const currentFlags = patient.flags || [];
      if (flagIndex < 0 || flagIndex >= currentFlags.length) {
        return res.status(400).json({ error: "Invalid flag index" });
      }

      // Remove the flag at the specified index
      const updatedFlags = currentFlags.filter((_, index) => index !== flagIndex);
      
      // Update patient with new flags array
      await storage.updatePatient(patientId, req.tenant!.id, {
        flags: updatedFlags
      });

      // Fetch updated patient to return current state
      const updatedPatient = await storage.getPatient(patientId, req.tenant!.id);

      res.json({ 
        success: true, 
        message: `Flag removed from ${patient.firstName} ${patient.lastName}`,
        patientId,
        totalFlags: updatedPatient?.flags?.length || 0,
        flags: updatedPatient?.flags || []
      });
    } catch (error) {
      console.error("Delete flag error:", error);
      res.status(500).json({ error: "Failed to delete flag" });
    }
  });

  // Get patient communications
  app.get("/api/patients/:id/communications", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const communications = await storage.getPatientCommunications(patientId, req.tenant!.id);
      res.json(communications);
    } catch (error) {
      console.error('Error fetching patient communications:', error);
      res.status(500).json({ error: 'Failed to fetch communications' });
    }
  });

  // Appointments routes - Enhanced with role-based access control
  app.get("/api/appointments", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const { start, end, doctorId, patientId, providerId, date } = req.query;
      const userRole = req.user!.role;
      const userId = req.user!.id;
      
      let appointments: Appointment[] = [];
      
      // Special case: Slot availability checking (providerId + date)
      // Allow ALL users to check slot availability for booking purposes
      if (providerId && date) {
        appointments = await storage.getAppointmentsByProvider(
          parseInt(providerId as string), 
          req.tenant!.id
        );
        
        // Filter by date
        const dateStr = date as string;
        appointments = appointments.filter(apt => {
          const aptDate = apt.scheduledAt instanceof Date 
            ? apt.scheduledAt.toISOString().substring(0, 10)
            : apt.scheduledAt.substring(0, 10);
          return aptDate === dateStr;
        });
        
        // Return minimal data for availability checking (no sensitive patient info)
        const availabilityData = appointments.map(apt => ({
          id: apt.id,
          providerId: apt.providerId,
          scheduledAt: apt.scheduledAt,
          duration: apt.duration,
          status: apt.status
        }));
        
        return res.json(availabilityData);
      }
      
      // Role-based access control as per architect specifications
      if (userRole === 'admin' || userRole === 'receptionist') {
        // Admin/receptionist can see all appointments with optional filters
        if (doctorId) {
          appointments = await storage.getAppointmentsByProvider(
            parseInt(doctorId as string), 
            req.tenant!.id
          );
        } else if (patientId) {
          appointments = await storage.getAppointmentsByPatient(
            parseInt(patientId as string), 
            req.tenant!.id
          );
        } else {
          // Get all appointments for organization
          appointments = await storage.getAppointmentsByOrganization(req.tenant!.id);
        }
      } else if (userRole === 'doctor') {
        // Doctors can only see their own appointments unless they have read_all permission
        const user = req.user! as any;
        const hasReadAllPermission = user.permissions?.modules?.appointments?.view === true;
        
        if (hasReadAllPermission && doctorId) {
          // Doctor with read_all permission can see other doctors' appointments
          appointments = await storage.getAppointmentsByProvider(
            parseInt(doctorId as string), 
            req.tenant!.id
          );
        } else {
          // Restrict to doctor's own appointments
          appointments = await storage.getAppointmentsByProvider(userId, req.tenant!.id);
        }
      } else if (userRole === 'patient') {
        // Patients can only see their own appointments
        // Find the patient record by userId field
        const patients = await storage.getPatientsByOrganization(req.tenant!.id, 100);
        const user = req.user! as any; // Cast to access firstName/lastName properties
        
        // Match by userId field first (primary method)
        const patient = patients.find(p => p.userId === userId);
        
        if (patient) {
          appointments = await storage.getAppointmentsByPatient(patient.id, req.tenant!.id);
        } else {
          appointments = [];
        }
      } else if (userRole === 'nurse') {
        // Nurses can see all appointments for now - can be restricted further if needed
        appointments = await storage.getAppointmentsByOrganization(req.tenant!.id);
      } else {
        // Default: no access for other roles
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Apply date range filters if provided
      if (start || end) {
        const startDate = start ? new Date(start as string) : new Date(0);
        const endDate = end ? new Date(end as string) : new Date('2099-12-31');
        
        appointments = appointments.filter(apt => {
          const aptDate = new Date(apt.scheduledAt);
          return aptDate >= startDate && aptDate <= endDate;
        });
      }
      
      res.json(appointments);
    } catch (error) {
      console.error("Appointments fetch error:", error);
      res.status(500).json({ error: "Failed to fetch appointments" });
    }
  });

  // Update appointment
  app.put("/api/appointments/:id", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const appointmentId = parseInt(req.params.id);
      const userRole = req.user!.role;
      const userId = req.user!.id;

      // Verify the appointment exists and user has permission to edit it
      const existingAppointment = await storage.getAppointment(appointmentId, req.tenant!.id);
      if (!existingAppointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }

      // Role-based access control for updating appointments
      let canUpdate = false;
      
      if (userRole === 'admin' || userRole === 'receptionist') {
        // Admin/receptionist can update any appointment
        canUpdate = true;
      } else if (userRole === 'doctor') {
        // Doctors can only update their own appointments or with proper permissions
        const hasEditPermission = (req.user as any)?.permissions?.modules?.appointments?.edit === true;
        canUpdate = existingAppointment.providerId === userId || hasEditPermission;
      } else if (userRole === 'patient') {
        // Patients can update their own appointments
        // Find the patient record by email since user_id column doesn't exist
        const patients = await storage.getPatientsByOrganization(req.tenant!.id, 100);
        const patient = patients.find(p => p.email === req.user!.email);
        canUpdate = Boolean(patient && existingAppointment.patientId === patient.id);
      } else if (userRole === 'nurse') {
        // Nurses can update appointments with proper permissions
        const hasEditPermission = (req.user as any)?.permissions?.modules?.appointments?.edit === true;
        canUpdate = hasEditPermission;
      }

      if (!canUpdate) {
        return res.status(403).json({ error: "Access denied - cannot update this appointment" });
      }

      // Prepare update data (only allow updating certain fields)
      const allowedUpdates: any = {};
      const { title, description, scheduledAt, duration, status, type, location, isVirtual } = req.body;
      
      if (title !== undefined) allowedUpdates.title = title;
      if (description !== undefined) allowedUpdates.description = description;
      if (scheduledAt !== undefined) {
        // Store scheduledAt string directly without timezone conversion
        allowedUpdates.scheduledAt = scheduledAt;
      }
      if (duration !== undefined) allowedUpdates.duration = duration;
      if (status !== undefined) allowedUpdates.status = status;
      if (type !== undefined) allowedUpdates.type = type;
      if (location !== undefined) allowedUpdates.location = location;
      if (isVirtual !== undefined) allowedUpdates.isVirtual = isVirtual;

      // Update the appointment
      const updatedAppointment = await storage.updateAppointment(
        appointmentId,
        req.tenant!.id,
        allowedUpdates
      );

      if (updatedAppointment) {
        console.log(`✅ Appointment ${appointmentId} updated successfully by user ${userId} (${userRole})`);
        
        // Broadcast update to all connected clients
        if (global.appointmentClients) {
          const updateMessage = JSON.stringify({
            type: 'appointment_updated',
            appointment: updatedAppointment,
            timestamp: Date.now()
          });
          
          global.appointmentClients.forEach((client) => {
            if (client.organizationId === req.tenant!.id) {
              try {
                client.res.write(`data: ${updateMessage}\n\n`);
              } catch (error: any) {
                console.log(`[SSE] Failed to send update to client:`, error.message);
              }
            }
          });
        }
        
        res.json(updatedAppointment);
      } else {
        res.status(400).json({ error: "Failed to update appointment" });
      }
    } catch (error) {
      console.error("Appointment update error:", error);
      res.status(500).json({ error: "Failed to update appointment. Please try again." });
    }
  });

  // Real-time appointment updates via Server-Sent Events
  app.get("/api/appointments/stream", authMiddleware, async (req: TenantRequest, res) => {
    console.log(`[SSE] New appointment stream connection for org ${req.tenant!.id}, user ${req.user!.id}`);
    
    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    });

    const organizationId = req.tenant!.id;
    const userId = req.user!.id;
    const clientId = `${organizationId}-${userId}-${Date.now()}`;
    
    // Store client connection for broadcasting
    if (!global.appointmentClients) {
      global.appointmentClients = new Map();
    }
    global.appointmentClients.set(clientId, { res, organizationId, userId });

    // Send initial connection confirmation
    res.write(`data: ${JSON.stringify({ type: 'connected', clientId })}\n\n`);

    // Ping to keep connection alive
    const pingInterval = setInterval(() => {
      res.write(`data: ${JSON.stringify({ type: 'ping', timestamp: Date.now() })}\n\n`);
    }, 30000);

    // Handle client disconnect
    req.on('close', () => {
      console.log(`[SSE] Client ${clientId} disconnected`);
      clearInterval(pingInterval);
      global.appointmentClients?.delete(clientId);
    });

    req.on('error', () => {
      console.log(`[SSE] Client ${clientId} error`);
      clearInterval(pingInterval);
      global.appointmentClients?.delete(clientId);
    });
  });

  // Broadcast appointment events to all connected clients in the same organization
  const broadcastAppointmentEvent = (organizationId: number, eventType: string, data: any) => {
    if (!global.appointmentClients) return;
    
    const eventData = {
      type: eventType,
      data,
      timestamp: Date.now(),
      organizationId
    };

    console.log(`[SSE] Broadcasting ${eventType} to org ${organizationId}`);
    
    for (const [clientId, client] of global.appointmentClients.entries()) {
      if (client.organizationId === organizationId) {
        try {
          client.res.write(`data: ${JSON.stringify(eventData)}\n\n`);
        } catch (error) {
          console.error(`[SSE] Error broadcasting to client ${clientId}:`, error);
          global.appointmentClients.delete(clientId);
        }
      }
    }
  };

  app.post("/api/appointments", requireRole(["doctor", "nurse", "receptionist", "admin", "patient"]), async (req: TenantRequest, res) => {
    try {
      console.log("Appointment creation request received:", req.body);
      console.log("Tenant ID:", req.tenant?.id);
      
      const appointmentData = z.object({
        patientId: z.any().transform((val) => {
          // Handle null, undefined, empty string, or NaN
          if (val === null || val === undefined || val === "" || (typeof val === "number" && isNaN(val))) {
            return null;
          }
          return val;
        }),
        providerId: z.number(),
        assignedRole: z.string().optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        appointmentDate: z.string().optional(),
        scheduledAt: z.string().optional(),
        duration: z.number().default(30),
        type: z.enum(["consultation", "follow_up", "procedure"]).default("consultation"),
        location: z.string().optional(),
        department: z.string().optional(),
        notes: z.string().optional(),
        status: z.string().optional(),
        isVirtual: z.boolean().default(false),
        createdBy: z.number().optional()
      }).parse(req.body);

      console.log("Parsed appointment data:", appointmentData);

      // Handle patientId conversion
      let numericPatientId: number;
      if (appointmentData.patientId === null) {
        console.log("Patient ID is null, returning error");
        return res.status(400).json({ error: "Patient ID is required" });
      } else if (typeof appointmentData.patientId === "string") {
        // If it's a string (like "P000007"), find the patient by patientId
        console.log("Looking up patient by patientId:", appointmentData.patientId);
        let patient = await storage.getPatientByPatientId(appointmentData.patientId, req.tenant!.id);
        
        // If not found, try different formatting patterns
        if (!patient && appointmentData.patientId.startsWith("P")) {
          // Extract the numeric part and try different formats
          const numericPart = appointmentData.patientId.substring(1);
          const numericValue = parseInt(numericPart, 10);
          
          if (!isNaN(numericValue)) {
            // Try with 6-digit padding: P000007
            const paddedId = `P${numericValue.toString().padStart(6, '0')}`;
            console.log("Trying padded patientId:", paddedId);
            patient = await storage.getPatientByPatientId(paddedId, req.tenant!.id);
            
            // If still not found, try with 3-digit padding: P007
            if (!patient) {
              const shortPaddedId = `P${numericValue.toString().padStart(3, '0')}`;
              console.log("Trying short padded patientId:", shortPaddedId);
              patient = await storage.getPatientByPatientId(shortPaddedId, req.tenant!.id);
            }
            
            // If still not found, try without padding: P7
            if (!patient) {
              const noPaddingId = `P${numericValue}`;
              console.log("Trying no padding patientId:", noPaddingId);
              patient = await storage.getPatientByPatientId(noPaddingId, req.tenant!.id);
            }
          }
        }
        
        if (!patient) {
          console.log("Patient not found for patientId:", appointmentData.patientId);
          return res.status(400).json({ 
            error: `Patient not found. Please use a valid patient ID like P000001, P000002, P000004, P000005, P000007, P000008, P000009, P000010, or P000158.` 
          });
        }
        numericPatientId = patient.id;
        console.log("Found patient with numeric ID:", numericPatientId);
      } else {
        numericPatientId = appointmentData.patientId;
        console.log("Using provided numeric patient ID:", numericPatientId);
      }

      const appointmentToCreate = {
        patientId: numericPatientId,
        providerId: appointmentData.providerId,
        assignedRole: appointmentData.assignedRole || null,
        organizationId: req.tenant!.id,
        title: appointmentData.title || `${appointmentData.type} appointment`,
        description: appointmentData.description || appointmentData.notes || "",
        scheduledAt: appointmentData.scheduledAt || appointmentData.appointmentDate,
        duration: appointmentData.duration,
        type: appointmentData.type,
        status: appointmentData.status || "scheduled", // Add missing status field
        location: appointmentData.location || "",
        isVirtual: appointmentData.isVirtual,
        createdBy: appointmentData.createdBy || null
      };

      // Note: Removed past time validation since we're using naive timestamps
      
      console.log("Creating appointment with final data:", appointmentToCreate);
      
      const appointment = await storage.createAppointment(appointmentToCreate);
      
      // Broadcast appointment creation to all connected clients in the same organization
      broadcastAppointmentEvent(req.tenant!.id, 'appointment.created', appointment);
      
      console.log("Appointment creation completed, returning:", appointment);
      res.status(201).json(appointment);
    } catch (error) {
      console.error("Appointment creation error:", error);
      
      // Handle scheduling conflicts specifically
      if (error instanceof Error && error.message.includes("already scheduled at this time")) {
        return res.status(400).json({ 
          error: error.message
        });
      }
      
      // Provide specific error message for validation failures
      const errorMessage = error instanceof Error ? error.message : "Failed to create appointment";
      
      // Always provide detailed error message for appointment failures
      res.status(400).json({ 
        error: errorMessage,
        type: "appointment_validation_error",
        timestamp: new Date().toISOString()
      });
    }
  });

  app.patch("/api/appointments/:id", requireRole(["doctor", "nurse", "receptionist", "admin"]), async (req: TenantRequest, res) => {
    try {
      const appointmentId = parseInt(req.params.id);
      
      if (isNaN(appointmentId)) {
        return res.status(400).json({ error: "Invalid appointment ID" });
      }

      const updateData = z.object({
        title: z.string().optional(),
        type: z.enum(["consultation", "follow_up", "procedure"]).optional(),
        status: z.enum(["scheduled", "completed", "cancelled", "no_show"]).optional(),
        scheduledAt: z.string().optional(),
        description: z.string().optional(),
        duration: z.number().optional(),
        location: z.string().optional(),
        isVirtual: z.boolean().optional()
      }).parse(req.body);

      console.log(`Updating appointment ${appointmentId} with data:`, updateData);

      // Convert scheduledAt string to Date object for database
      const updatePayload: any = { ...updateData };
      if (updateData.scheduledAt) {
        updatePayload.scheduledAt = new Date(updateData.scheduledAt);
      }

      const updated = await storage.updateAppointment(appointmentId, req.tenant!.id, updatePayload);
      
      if (!updated) {
        return res.status(404).json({ error: "Appointment not found" });
      }

      // Broadcast appointment update to all connected clients in the same organization
      broadcastAppointmentEvent(req.tenant!.id, 'appointment.updated', updated);

      console.log(`Appointment ${appointmentId} updated successfully`);
      res.json(updated);
    } catch (error) {
      console.error("Appointment update error:", error);
      handleRouteError(error, "Update appointment", res);
    }
  });

  app.delete("/api/appointments/:id", requireRole(["doctor", "nurse", "receptionist", "admin"]), async (req: TenantRequest, res) => {
    try {
      console.log(`📞 DELETE REQUEST - Appointment ID: ${req.params.id}, User: ${req.user?.email}, Tenant: ${req.tenant?.id}`);
      
      const appointmentId = parseInt(req.params.id);
      
      if (isNaN(appointmentId)) {
        console.log(`❌ Invalid appointment ID: ${req.params.id}`);
        return res.status(400).json({ error: "Invalid appointment ID" });
      }

      console.log(`🚀 Calling deleteAppointment with ID: ${appointmentId}, OrgID: ${req.tenant!.id}`);
      const deleted = await storage.deleteAppointment(appointmentId, req.tenant!.id);
      console.log(`✅ Deletion response: ${deleted}`);
      
      if (!deleted) {
        console.log(`❌ Appointment not found or not deleted`);
        return res.status(404).json({ error: "Appointment not found" });
      }

      // Broadcast appointment deletion to all connected clients in the same organization
      broadcastAppointmentEvent(req.tenant!.id, 'appointment.deleted', { id: appointmentId });

      console.log(`🎉 Appointment ${appointmentId} deleted successfully`);
      res.json({ success: true, message: "Appointment deleted successfully" });
    } catch (error) {
      console.error("❌ Appointment deletion error:", error);
      res.status(500).json({ error: "Failed to delete appointment" });
    }
  });

  // ============================================
  // DOCTORS FEE AND INVOICES ROUTES
  // ============================================

  // Get doctor's fee information
  app.get("/api/doctors-fee/:doctorId", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const doctorId = parseInt(req.params.doctorId);
      
      if (isNaN(doctorId)) {
        return res.status(400).json({ error: "Invalid doctor ID" });
      }

      // Query the doctors_fee table for this doctor
      const doctorFees = await db
        .select()
        .from(schema.doctorsFee)
        .where(
          and(
            eq(schema.doctorsFee.organizationId, req.tenant!.id),
            eq(schema.doctorsFee.doctorId, doctorId)
          )
        )
        .limit(1);

      if (doctorFees.length === 0) {
        // Return default fee if no specific fee is configured
        return res.json({
          id: 0,
          doctorId: doctorId,
          serviceName: "General Consultation",
          basePrice: "50.00",
          currency: "GBP"
        });
      }

      res.json(doctorFees[0]);
    } catch (error) {
      console.error("Error fetching doctor's fee:", error);
      res.status(500).json({ error: "Failed to fetch doctor's fee" });
    }
  });

  // Check for duplicate doctor fee
  app.get("/api/pricing/doctors-fees/check-duplicate", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const doctorRole = req.query.doctorRole as string;
      const doctorId = parseInt(req.query.doctorId as string);
      
      if (!doctorRole || isNaN(doctorId)) {
        return res.status(400).json({ error: "Invalid parameters" });
      }

      // Query the doctors_fee table for this combination
      const existingFees = await db
        .select()
        .from(schema.doctorsFee)
        .where(
          and(
            eq(schema.doctorsFee.organizationId, req.tenant!.id),
            eq(schema.doctorsFee.doctorRole, doctorRole),
            eq(schema.doctorsFee.doctorId, doctorId)
          )
        )
        .limit(1);

      res.json({ exists: existingFees.length > 0 });
    } catch (error) {
      console.error("Error checking for duplicate doctor fee:", error);
      res.status(500).json({ error: "Failed to check for duplicate" });
    }
  });

  // Create invoice
  app.post("/api/invoices", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const invoiceData = z.object({
        patientId: z.string(),
        patientName: z.string(),
        nhsNumber: z.string().optional(),
        dateOfService: z.string(),
        invoiceDate: z.string(),
        dueDate: z.string(),
        status: z.string().default("draft"),
        invoiceType: z.string().default("payment"),
        subtotal: z.string(),
        tax: z.string().default("0"),
        discount: z.string().default("0"),
        totalAmount: z.string(),
        paidAmount: z.string().default("0"),
        items: z.array(z.object({
          code: z.string(),
          description: z.string(),
          quantity: z.number(),
          amount: z.number()
        })),
        insuranceProvider: z.string().optional(),
        notes: z.string().optional()
      }).parse(req.body);

      // Generate unique invoice number
      const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

      const newInvoice = await db
        .insert(schema.invoices)
        .values({
          organizationId: req.tenant!.id,
          invoiceNumber: invoiceNumber,
          patientId: invoiceData.patientId,
          patientName: invoiceData.patientName,
          nhsNumber: invoiceData.nhsNumber || null,
          dateOfService: new Date(invoiceData.dateOfService),
          invoiceDate: new Date(invoiceData.invoiceDate),
          dueDate: new Date(invoiceData.dueDate),
          status: invoiceData.status,
          invoiceType: invoiceData.invoiceType,
          subtotal: invoiceData.subtotal,
          tax: invoiceData.tax,
          discount: invoiceData.discount,
          totalAmount: invoiceData.totalAmount,
          paidAmount: invoiceData.paidAmount,
          items: invoiceData.items as any,
          insuranceProvider: invoiceData.insuranceProvider || null,
          notes: invoiceData.notes || null
        })
        .returning();

      console.log("Invoice created successfully:", newInvoice[0]);
      res.status(201).json(newInvoice[0]);
    } catch (error) {
      console.error("Invoice creation error:", error);
      res.status(500).json({ error: "Failed to create invoice" });
    }
  });

  // ============================================
  // FINANCIAL INTELLIGENCE ROUTES
  // ============================================

  // Get revenue data
  app.get("/api/financial/revenue", authMiddleware, requireRole(["admin", "finance", "doctor"]), async (req: TenantRequest, res) => {
    try {
      const { dateRange } = req.query;
      
      // Mock revenue data - in production this would come from actual billing data
      const mockRevenueData = [
        { month: "Jan", revenue: 125000, expenses: 85000, profit: 40000, collections: 118000, target: 130000 },
        { month: "Feb", revenue: 135000, expenses: 88000, profit: 47000, collections: 128000, target: 130000 },
        { month: "Mar", revenue: 142000, expenses: 92000, profit: 50000, collections: 135000, target: 135000 },
        { month: "Apr", revenue: 138000, expenses: 90000, profit: 48000, collections: 132000, target: 135000 },
        { month: "May", revenue: 155000, expenses: 95000, profit: 60000, collections: 148000, target: 140000 },
        { month: "Jun", revenue: 162000, expenses: 98000, profit: 64000, collections: 156000, target: 145000 }
      ];
      
      res.json(mockRevenueData);
    } catch (error) {
      handleRouteError(error, "fetch revenue data", res);
    }
  });

  // Get claims data
  app.get("/api/financial/claims", authMiddleware, requireRole(["admin", "finance", "doctor", "nurse"]), async (req: TenantRequest, res) => {
    try {
      const organizationId = requireOrgId(req);
      const claims = await storage.getClaimsByOrganization(organizationId);
      
      // Get all unique patient IDs to fetch patient names in one query
      const patientIds = [...new Set(claims.map(claim => claim.patientId))];
      const patients = await Promise.all(
        patientIds.map(id => storage.getPatient(id, organizationId))
      );
      
      // Create a map of patient ID to patient name
      const patientMap = new Map();
      patients.forEach(patient => {
        if (patient) {
          patientMap.set(patient.id, `${patient.firstName} ${patient.lastName}`);
        }
      });
      
      // Transform the claims data to match the expected frontend format
      const transformedClaims = claims.map(claim => ({
        id: claim.id.toString(),
        patientId: claim.patientId.toString(),
        patientName: patientMap.get(claim.patientId) || `Patient ${claim.patientId}`,
        claimNumber: claim.claimNumber,
        serviceDate: claim.serviceDate.toISOString().split('T')[0],
        submissionDate: claim.submissionDate.toISOString().split('T')[0],
        amount: parseFloat(claim.amount),
        status: claim.status,
        paymentAmount: claim.paymentAmount ? parseFloat(claim.paymentAmount) : undefined,
        paymentDate: claim.paymentDate?.toISOString().split('T')[0],
        denialReason: claim.denialReason,
        insuranceProvider: claim.insuranceProvider,
        procedures: claim.procedures || []
      }));
      
      res.json(transformedClaims);
    } catch (error) {
      handleRouteError(error, "fetch claims data", res);
    }
  });

  // Submit new claim
  app.post("/api/financial/claims", authMiddleware, requireRole(["admin", "finance", "doctor", "nurse"]), async (req: TenantRequest, res) => {
    try {
      const claimData = z.object({
        patientName: z.string(),
        amount: z.number(),
        status: z.string().optional(),
        submittedAt: z.string().optional(),
        providerName: z.string().optional(),
        serviceDate: z.string(),
        procedures: z.array(z.object({
          code: z.string(),
          description: z.string(),
          amount: z.number()
        })).optional(),
        patientId: z.number().optional(),
        claimNumber: z.string().optional(),
        insuranceProvider: z.string().optional(),
        submissionDate: z.string().optional()
      }).parse(req.body);

      const organizationId = requireOrgId(req);
      
      // Create claim record for database
      const newClaimData = {
        organizationId: organizationId,
        patientId: claimData.patientId || 1, // Default to patient 1 if not provided
        claimNumber: claimData.claimNumber || `CLM-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
        serviceDate: new Date(claimData.serviceDate),
        submissionDate: new Date(),
        amount: claimData.amount.toString(),
        status: claimData.status || "pending",
        insuranceProvider: claimData.insuranceProvider || "Unknown Provider",
        procedures: claimData.procedures || []
      };

      // Save to database
      const savedClaim = await storage.createClaim(newClaimData);

      // Transform response to match frontend expectations
      const responseData = {
        id: savedClaim.id.toString(),
        patientId: savedClaim.patientId.toString(),
        patientName: claimData.patientName,
        claimNumber: savedClaim.claimNumber,
        serviceDate: savedClaim.serviceDate.toISOString().split('T')[0],
        submissionDate: savedClaim.submissionDate.toISOString().split('T')[0],
        amount: parseFloat(savedClaim.amount),
        status: savedClaim.status,
        insuranceProvider: savedClaim.insuranceProvider,
        procedures: savedClaim.procedures || []
      };

      res.status(201).json(responseData);
    } catch (error) {
      handleRouteError(error, "submit claim", res);
    }
  });

  // Update claim status
  app.patch("/api/financial/claims/:id", authMiddleware, requireRole(["admin", "finance", "doctor", "nurse"]), async (req: TenantRequest, res) => {
    try {
      const claimId = parseInt(req.params.id);
      const organizationId = requireOrgId(req);
      
      if (isNaN(claimId)) {
        return res.status(400).json({ error: "Invalid claim ID" });
      }

      // Validate status field
      const { status } = req.body;
      const validStatuses = ["pending", "submitted", "approved", "denied", "paid"];
      
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ 
          error: "Invalid status. Must be one of: " + validStatuses.join(", ") 
        });
      }

      // Check if claim exists and belongs to this organization
      const existingClaim = await storage.getClaimById(claimId);
      if (!existingClaim || existingClaim.organizationId !== organizationId) {
        return res.status(404).json({ error: "Claim not found" });
      }

      // Update the claim status
      const updatedClaim = await storage.updateClaim(claimId, organizationId, { status });
      
      res.json({ 
        success: true,
        message: "Claim status updated successfully",
        claim: updatedClaim
      });
    } catch (error) {
      handleRouteError(error, "update claim status", res);
    }
  });

  // Delete claim
  app.delete("/api/financial/claims/:id", authMiddleware, requireRole(["admin", "finance", "doctor", "nurse"]), async (req: TenantRequest, res) => {
    try {
      const claimId = parseInt(req.params.id);
      const organizationId = requireOrgId(req);
      
      if (isNaN(claimId)) {
        return res.status(400).json({ error: "Invalid claim ID" });
      }

      // Check if claim exists and belongs to this organization
      const existingClaim = await storage.getClaimById(claimId);
      if (!existingClaim || existingClaim.organizationId !== organizationId) {
        return res.status(404).json({ error: "Claim not found" });
      }

      // Delete the claim
      await storage.deleteClaim(claimId);
      
      res.json({ message: "Claim deleted successfully" });
    } catch (error) {
      handleRouteError(error, "delete claim", res);
    }
  });

  // Persistent insurance data for demo purposes (in production this would be in database)
  let mockInsurances: any[] = [
    // Records removed as requested - Sarah Johnson (ins_1) and Michael Chen (ins_2) deleted
  ];

  // Get insurance data
  app.get("/api/financial/insurance", authMiddleware, requireRole(["admin", "finance", "doctor", "nurse"]), async (req: TenantRequest, res) => {
    try {
      const organizationId = requireOrgId(req);
      console.log(`[FINANCIAL] Fetching insurance data for organization: ${organizationId}`);

      // First, get insurance verifications from the dedicated table
      const dbInsuranceVerifications = await storage.getInsuranceVerificationsByOrganization(organizationId);
      console.log(`[FINANCIAL] Found ${dbInsuranceVerifications.length} insurance verifications from database`);

      // Transform database insurance verifications to match frontend format
      const dbInsuranceData = dbInsuranceVerifications.map(insurance => ({
        id: insurance.id,
        patientName: insurance.patientName,
        provider: insurance.provider,
        policyNumber: insurance.policyNumber,
        groupNumber: insurance.groupNumber || 'N/A',
        memberNumber: insurance.memberNumber || 'N/A',
        planType: insurance.planType || 'Standard',
        effectiveDate: insurance.effectiveDate,
        expirationDate: insurance.expirationDate,
        copay: insurance.benefits?.copay || 0,
        deductible: insurance.benefits?.deductible || 0,
        isActive: insurance.status === 'active',
        eligibilityStatus: insurance.eligibilityStatus,
        lastVerified: insurance.lastVerified,
        coverageType: insurance.coverageType,
        status: insurance.status,
        coinsurance: `${insurance.benefits?.coinsurance || 20}%`,
        outOfPocketMax: `$${insurance.benefits?.outOfPocketMax || 5000}`,
        outOfPocketMet: `$${insurance.benefits?.outOfPocketMet || 0}`,
        deductibleMet: `$${insurance.benefits?.deductibleMet || 0}`,
        createdAt: insurance.createdAt,
      }));

      // Get all patients for this organization to check their insurance info (legacy support)
      const allPatients = await storage.getPatientsByOrganization(organizationId);
      console.log(`[FINANCIAL] Found ${allPatients.length} patients in organization ${organizationId}`);

      // Transform patients with insurance information
      const patientInsuranceVerifications = allPatients
        .filter(patient => {
          const insurance = patient.insuranceInfo as any;
          const hasInsurance = insurance && (insurance.provider || insurance.policyNumber);
          if (hasInsurance) {
            console.log(`[FINANCIAL] Patient ${patient.firstName} ${patient.lastName} has insurance: ${insurance.provider || 'Unknown'}`);
          }
          return hasInsurance;
        })
        .map(patient => {
          const insurance = patient.insuranceInfo as any;
          return {
            id: `ins_${patient.id}`,
            patientName: `${patient.firstName} ${patient.lastName}`,
            provider: insurance.provider || 'Unknown Provider',
            policyNumber: insurance.policyNumber || 'N/A',
            groupNumber: insurance.groupNumber || 'N/A',
            memberNumber: insurance.memberNumber || 'N/A',
            planType: insurance.planType || 'Standard',
            effectiveDate: insurance.effectiveDate || new Date().toISOString().split('T')[0],
            expirationDate: insurance.expirationDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            copay: insurance.copay || 0,
            deductible: insurance.deductible || 0,
            isActive: insurance.isActive !== false,
            eligibilityStatus: 'verified',
            lastVerified: new Date().toISOString(),
            coverageType: 'primary',
            status: 'active',
            coinsurance: '20%',
            outOfPocketMax: '$5000',
            outOfPocketMet: '$0',
            deductibleMet: '$0',
            createdAt: patient.createdAt,
          };
        });

      // Combine all insurance data sources: DB verifications + patient insurance + mock data
      const allInsuranceData = [...dbInsuranceData, ...patientInsuranceVerifications, ...mockInsurances];

      console.log(`[FINANCIAL] Total insurance verifications: ${allInsuranceData.length} (${dbInsuranceData.length} from DB, ${patientInsuranceVerifications.length} from patients, ${mockInsurances.length} manual)`);
      res.json(allInsuranceData);
    } catch (error) {
      console.error(`[FINANCIAL] Error fetching insurance data:`, error);
      handleRouteError(error, "fetch insurance data", res);
    }
  });

  // Get insurance verifications by patient ID
  app.get("/api/insurance-verifications", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const organizationId = requireOrgId(req);
      const patientId = req.query.patientId;

      if (!patientId) {
        return res.status(400).json({ error: "Patient ID is required" });
      }

      console.log(`[FINANCIAL] Fetching insurance verifications for patient: ${patientId}`);

      const insuranceVerifications = await storage.getInsuranceVerificationsByPatient(parseInt(patientId as string), organizationId);

      console.log(`[FINANCIAL] Found ${insuranceVerifications.length} insurance verifications for patient ${patientId}`);
      res.json(insuranceVerifications);
    } catch (error) {
      console.error(`[FINANCIAL] Error fetching insurance verifications:`, error);
      handleRouteError(error, "fetch insurance verifications by patient", res);
    }
  });

  // Create new insurance record
  app.post("/api/financial/insurance", authMiddleware, requireRole(["admin", "finance", "doctor", "nurse"]), async (req: TenantRequest, res) => {
    try {
      const organizationId = requireOrgId(req);
      const insuranceData = req.body;
      
      console.log(`[FINANCIAL] New insurance record creation requested:`, insuranceData);
      
      // Use provided patientId or find patient by name as fallback
      let patientId;
      if (insuranceData.patientId) {
        patientId = parseInt(insuranceData.patientId);
      } else {
        // Fallback: Find patient by name
        const patients = await storage.getPatientsByOrganization(organizationId);
        const patient = patients.find(p => `${p.firstName} ${p.lastName}` === insuranceData.patientName);
        
        if (!patient) {
          return res.status(400).json({
            success: false,
            message: "Patient not found"
          });
        }
        patientId = patient.id;
      }
      
      // Create insurance record for database
      const insuranceRecord = {
        organizationId,
        patientId: patientId,
        patientName: insuranceData.patientName,
        provider: insuranceData.provider,
        policyNumber: insuranceData.policyNumber,
        groupNumber: insuranceData.groupNumber,
        memberNumber: insuranceData.memberNumber,
        nhsNumber: insuranceData.nhsNumber,
        planType: insuranceData.planType,
        effectiveDate: insuranceData.effectiveDate,
        status: insuranceData.status || "active",
        coverageType: insuranceData.coverageType || "primary",
        eligibilityStatus: insuranceData.eligibilityStatus || "pending",
        lastVerified: insuranceData.lastVerified ? insuranceData.lastVerified : null,
        benefits: insuranceData.benefits || {
          deductible: 0,
          deductibleMet: 0,
          copay: 0,
          coinsurance: 0,
          outOfPocketMax: 0,
          outOfPocketMet: 0
        }
      };
      
      // Save to database
      const newInsurance = await storage.createInsuranceVerification(insuranceRecord);
      
      // Update patient's is_insured status to true
      await storage.updatePatientInsuranceStatus(patientId, organizationId, true);
      
      console.log(`[FINANCIAL] New insurance record created and patient insurance status updated:`, newInsurance);
      
      res.json({
        success: true,
        message: "Insurance record created successfully",
        insurance: newInsurance
      });
    } catch (error) {
      console.error(`[FINANCIAL] Insurance creation error:`, error);
      handleRouteError(error, "create insurance record", res);
    }
  });

  // Verify insurance eligibility - THE MISSING ENDPOINT
  app.post("/api/financial/insurance/:id/verify", authMiddleware, requireRole(["admin", "finance", "doctor", "nurse"]), async (req: TenantRequest, res) => {
    try {
      const insuranceId = req.params.id;
      
      console.log(`[FINANCIAL] Insurance verification requested for: ${insuranceId}`);
      
      // Simulate insurance verification process
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call delay
      
      // Mock verification response - in production this would call insurance provider APIs
      const verificationResult = {
        insuranceId,
        verified: true,
        eligibilityStatus: "verified",
        lastVerified: new Date().toISOString(),
        verificationDetails: {
          active: true,
          benefitsAvailable: true,
          copay: Math.floor(Math.random() * 50) + 10, // Random copay 10-59
          deductibleRemaining: Math.floor(Math.random() * 1000) + 100, // Random remaining 100-1099
          outOfNetworkCoverage: Math.random() > 0.5 // Random boolean
        },
        message: "Insurance eligibility verification completed successfully"
      };
      
      console.log(`[FINANCIAL] Verification completed for ${insuranceId}:`, verificationResult);
      
      res.json(verificationResult);
    } catch (error) {
      console.error(`[FINANCIAL] Insurance verification error:`, error);
      handleRouteError(error, "verify insurance eligibility", res);
    }
  });

  // Update insurance verification data
  app.put("/api/financial/insurance/:id", authMiddleware, requireRole(["admin", "finance", "doctor", "nurse"]), async (req: TenantRequest, res) => {
    try {
      const insuranceId = parseInt(req.params.id);
      const organizationId = requireOrgId(req);
      const updateData = req.body;
      
      console.log(`[FINANCIAL] Insurance update requested for: ${insuranceId}`, updateData);
      
      // Update the insurance record in the database
      const updatedInsurance = await storage.updateInsuranceVerification(insuranceId, organizationId, updateData);
      
      if (!updatedInsurance) {
        return res.status(404).json({
          success: false,
          message: "Insurance record not found"
        });
      }
      
      console.log(`[FINANCIAL] Insurance updated successfully:`, updatedInsurance);
      
      res.json({
        success: true,
        data: updatedInsurance,
        message: "Insurance verification data updated successfully"
      });
    } catch (error) {
      console.error(`[FINANCIAL] Insurance update error:`, error);
      handleRouteError(error, "update insurance verification data", res);
    }
  });

  // Delete insurance record
  app.delete("/api/financial/insurance/:id", authMiddleware, requireRole(["admin", "finance", "doctor", "nurse"]), async (req: TenantRequest, res) => {
    try {
      const insuranceId = parseInt(req.params.id);
      const organizationId = requireOrgId(req);
      
      console.log(`[FINANCIAL] Insurance deletion requested for: ${insuranceId}`);
      
      // Delete the insurance record from the database
      const deleted = await storage.deleteInsuranceVerification(insuranceId, organizationId);
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: "Insurance record not found"
        });
      }
      
      console.log(`[FINANCIAL] Insurance deleted successfully:`, insuranceId);
      
      res.json({
        success: true,
        message: "Insurance record deleted successfully",
        deletedId: insuranceId
      });
    } catch (error) {
      console.error(`[FINANCIAL] Insurance deletion error:`, error);
      handleRouteError(error, "delete insurance record", res);
    }
  });

  // PATCH insurance record - Update database records (inline field editing)
  app.patch("/api/financial/insurance/:id", authMiddleware, requireRole(["admin", "finance", "doctor", "nurse"]), async (req: TenantRequest, res) => {
    try {
      const insuranceId = parseInt(req.params.id);
      const organizationId = requireOrgId(req);
      const updateData = req.body;
      
      console.log(`[FINANCIAL] Insurance PATCH update requested for: ${insuranceId}`, updateData);
      
      // Update the insurance record in the database
      const updatedInsurance = await storage.updateInsuranceVerification(insuranceId, organizationId, updateData);
      
      if (!updatedInsurance) {
        return res.status(404).json({
          success: false,
          message: "Insurance record not found"
        });
      }
      
      console.log(`[FINANCIAL] Insurance PATCH updated successfully:`, updatedInsurance);
      
      res.json({
        success: true,
        data: updatedInsurance,
        message: "Insurance verification data updated successfully"
      });
    } catch (error) {
      console.error(`[FINANCIAL] Insurance PATCH update error:`, error);
      handleRouteError(error, "update insurance verification data", res);
    }
  });

  // Get financial forecasts
  app.get("/api/financial/forecasts", authMiddleware, requireRole(["admin", "finance"]), async (req: TenantRequest, res) => {
    try {
      // Mock forecast data - in production this would be calculated from historical data
      const mockForecasts = [
        {
          category: "Monthly Revenue",
          currentMonth: 162000,
          projectedNext: 168000,
          variance: 6000,
          trend: "up",
          confidence: 85,
          factors: ["Increased patient volume", "New insurance contracts", "Seasonal trend"]
        },
        {
          category: "Collection Rate",
          currentMonth: 94,
          projectedNext: 95,
          variance: 1,
          trend: "up",
          confidence: 78,
          factors: ["Improved prior authorization process", "Better claim submission timing"]
        },
        {
          category: "Operating Expenses",
          currentMonth: 98000,
          projectedNext: 102000,
          variance: 4000,
          trend: "up",
          confidence: 92,
          factors: ["Staff salary increases", "Equipment maintenance", "Inflation"]
        }
      ];
      
      res.json(mockForecasts);
    } catch (error) {
      handleRouteError(error, "fetch financial forecasts", res);
    }
  });

  // User management routes (admin only)
  // Medical staff endpoint for appointment booking - accessible to authenticated users
  app.get("/api/medical-staff", authMiddleware, async (req: TenantRequest, res) => {
    try {
      console.log('🏥 MEDICAL STAFF API: Fetching doctors from users table');
      console.log('🏢 MEDICAL STAFF API: Organization ID from subdomain/tenant:', req.tenant!.id);
      console.log('📋 MEDICAL STAFF API: Tenant info:', { id: req.tenant!.id, name: req.tenant!.name, subdomain: req.tenant!.subdomain });
      
      // Get query parameters for specialty filtering
      const { specialty, subSpecialty } = req.query as { specialty?: string; subSpecialty?: string };
      
      console.log('🔍 MEDICAL STAFF API: Querying users table where organizationId =', req.tenant!.id);
      const users = await storage.getUsersByOrganization(req.tenant!.id);
      console.log('📊 MEDICAL STAFF API: Found', users.length, 'total users in organization from users table');
      
      // Get today's date for shift checking
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      
      // Get all staff shifts for today
      let todayShifts: any[] = [];
      try {
        todayShifts = await storage.getStaffShiftsByOrganization(req.tenant!.id, today.toISOString().split('T')[0]);
      } catch (error) {
        console.log("No staff shifts data available, using fallback logic");
        todayShifts = [];
      }
      
      // Get total doctor count
      const totalDoctors = users.filter(user => isDoctorLike(user.role) && user.isActive).length;
      
      console.log(`=== MEDICAL STAFF DEBUG ===`);
      console.log(`Total users: ${users.length}`);
      console.log(`Total doctors (where role='doctor' and isActive=true): ${totalDoctors}`);
      console.log(`👨‍⚕️ MEDICAL STAFF API: Filtering users table where role = 'doctor'`);
      console.log(`Today shifts count: ${todayShifts.length}`);
      console.log(`Day of week: ${dayOfWeek}`);
      
      // Filter for all staff roles needed for shift management and appointments
      let medicalStaff = users
        .filter(user => ['doctor', 'nurse', 'sample_taker', 'lab_technician', 'admin', 'receptionist'].includes(user.role) && user.isActive);
      
      // Apply specialty filtering if provided
      if (specialty || subSpecialty) {
        console.log(`Filtering doctors - Specialty: "${specialty}", Sub-specialty: "${subSpecialty}"`);
        medicalStaff = medicalStaff.filter(user => {
          // Only filter doctors by specialty
          if (user.role !== 'doctor') return true;
          
          let matchesSpecialty = true;
          let matchesSubSpecialty = true;
          
          if (specialty) {
            matchesSpecialty = Boolean(user.medicalSpecialtyCategory && 
              user.medicalSpecialtyCategory.toLowerCase().trim() === specialty.toLowerCase().trim());
          }
          
          if (subSpecialty) {
            matchesSubSpecialty = Boolean(user.subSpecialty && 
              user.subSpecialty.toLowerCase().trim() === subSpecialty.toLowerCase().trim());
          }
          
          const matches = matchesSpecialty && matchesSubSpecialty;
          if (isDoctorLike(user.role)) {
            console.log(`  Doctor: ${user.firstName} ${user.lastName}`);
            console.log(`    Category: "${user.medicalSpecialtyCategory}" matches "${specialty}": ${matchesSpecialty}`);
            console.log(`    Sub-specialty: "${user.subSpecialty}" matches "${subSpecialty}": ${matchesSubSpecialty}`);
            console.log(`    Overall match: ${matches}`);
          }
          
          return matches;
        });
      }
      
      medicalStaff = medicalStaff.filter(user => {
          // For doctors specifically, apply minimal restrictions for patient access
          if (isDoctorLike(user.role)) {
            console.log(`Checking doctor: ${user.firstName} ${user.lastName} (ID: ${user.id})`);
            
            // If this is a specialty filtering request (for doctor selection/browsing),
            // show ALL active doctors regardless of working days or shifts
            // This allows patients to freely browse and select doctors by specialty
            if (specialty || subSpecialty) {
              console.log(`  - Specialty filtering mode: showing all active doctors for patient access`);
              console.log(`  - Doctor is active: ${user.isActive}`);
              // Return all active doctors for specialty browsing - no working day restrictions
              return user.isActive;
            }
            
            // For non-specialty filtering requests (like dashboard/shift management), 
            // use the original availability logic
            // Check if doctor has a shift today and is marked as available
            const todayShift = todayShifts.find(shift => shift.staffId === user.id);
            
            if (todayShift) {
              console.log(`  - Has shift today: available=${todayShift.isAvailable}, status=${todayShift.status}`);
              // Doctor has a shift today - check if they're available and not absent
              const isAvailable = todayShift.isAvailable && 
                     todayShift.status !== 'absent' && 
                     todayShift.status !== 'cancelled';
              console.log(`  - Final availability: ${isAvailable}`);
              return isAvailable;
            } else {
              // No shift found - check working days to see if they normally work today
              const hasWorkingDays = user.workingDays && user.workingDays.length > 0;
              const worksToday = hasWorkingDays && user.workingDays!.some(day => day.toLowerCase() === dayOfWeek);
              
              console.log(`  - No shift found. Working days: ${user.workingDays || 'none'}`);
              console.log(`  - Works today (${dayOfWeek}): ${worksToday}`);
              
              // If no working days are set, assume doctor is available (fallback)
              const isAvailable = hasWorkingDays ? worksToday : true;
              console.log(`  - Final availability: ${isAvailable}`);
              return isAvailable;
            }
          }
          // For non-doctors, show all active staff
          return true;
        })
        .map(user => {
          const { passwordHash, ...safeUser } = user;
          return safeUser;
        });
      
      // Count available doctors
      const availableDoctors = medicalStaff.filter(user => isDoctorLike(user.role)).length;
      
      console.log(`Available doctors after filtering: ${availableDoctors}`);
      console.log(`=== END DEBUG ===`);
      
      res.json({
        staff: medicalStaff,
        totalDoctors,
        availableDoctors
      });
    } catch (error) {
      console.error("Medical staff fetch error:", error);
      res.status(500).json({ error: "Failed to fetch medical staff" });
    }
  });

  // Simple doctors endpoint - direct database query for appointment booking
  app.get("/api/doctors", authMiddleware, async (req: TenantRequest, res) => {
    try {
      console.log('🔄 DIRECT DOCTORS: Fetching doctors directly from database for organization:', req.tenant!.id);
      
      const users = await storage.getUsersByOrganization(req.tenant!.id);
      
      // Filter for active doctors only
      const doctors = users
        .filter(user => isDoctorLike(user.role) && user.isActive)
        .map(user => {
          const { passwordHash, ...safeUser } = user;
          return safeUser;
        });
      
      console.log('🔄 DIRECT DOCTORS: Found doctors:', doctors.length);
      console.log('🔄 DIRECT DOCTORS: Doctor names:', doctors.map(d => `${d.firstName} ${d.lastName}`).join(', '));
      
      res.json({ 
        doctors,
        count: doctors.length
      });
    } catch (error) {
      console.error("Direct doctors fetch error:", error);
      res.status(500).json({ error: "Failed to fetch doctors" });
    }
  });

  // Filter doctors by specialization
  app.get("/api/doctors/by-specialization", authMiddleware, async (req: TenantRequest, res) => {
    try {
      if (!req.user || !req.tenant) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Validate and normalize query parameters
      const querySchema = z.object({
        mainSpecialty: z.string().trim().min(1).optional(),
        subSpecialty: z.string().trim().min(1).optional()
      });

      const parseResult = querySchema.safeParse(req.query);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid query parameters" });
      }

      const { mainSpecialty, subSpecialty } = parseResult.data;
      
      // Get users filtered by organization (tenant isolation)
      const users = await storage.getUsersByOrganization(req.tenant.id);
      
      // Filter for active doctors only
      let filteredDoctors = users.filter(user => 
        isDoctorLike(user.role) && 
        user.isActive && 
        user.organizationId === req.tenant!.id
      );
      
      // Apply specialization filtering with case-insensitive exact matching
      if (mainSpecialty || subSpecialty) {
        filteredDoctors = filteredDoctors.filter(doctor => {
          const matchesMainSpecialty = !mainSpecialty || 
            (doctor.medicalSpecialtyCategory && 
             doctor.medicalSpecialtyCategory.toLowerCase().trim() === mainSpecialty.toLowerCase().trim());
          
          const matchesSubSpecialty = !subSpecialty || 
            (doctor.subSpecialty && 
             doctor.subSpecialty.toLowerCase().trim() === subSpecialty.toLowerCase().trim());
          
          return matchesMainSpecialty && matchesSubSpecialty;
        });
      }
      
      // Sanitize response - only include necessary fields for UI
      const safeDoctors = filteredDoctors.map(doctor => ({
        id: doctor.id,
        firstName: doctor.firstName,
        lastName: doctor.lastName,
        email: doctor.email,
        role: doctor.role,
        department: doctor.department,
        medicalSpecialtyCategory: doctor.medicalSpecialtyCategory,
        subSpecialty: doctor.subSpecialty,
        isActive: doctor.isActive
      }));
      
      res.json({
        doctors: safeDoctors,
        count: safeDoctors.length
      });
    } catch (error) {
      console.error("Error filtering doctors by specialization:", error);
      res.status(500).json({ error: "Failed to filter doctors" });
    }
  });

  // User Document Preferences endpoints
  app.get("/api/me/preferences", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const userId = req.user!.id;
      const organizationId = req.tenant!.id;
      
      const preferences = await storage.getUserDocumentPreferences(userId, organizationId);
      
      // If no preferences exist, return default values
      if (!preferences) {
        return res.json({
          clinicName: "",
          clinicAddress: "",
          clinicPhone: "",
          clinicEmail: "",
          doctorName: "",
          doctorTitle: "",
          doctorSpecialty: "",
          logoPosition: "left",
          headerPosition: "left"
        });
      }
      
      res.json(preferences);
    } catch (error) {
      console.error("Error fetching user document preferences:", error);
      res.status(500).json({ error: "Failed to fetch document preferences" });
    }
  });

  app.patch("/api/me/preferences", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const userId = req.user!.id;
      const organizationId = req.tenant!.id;
      
      // Import the update schema from shared/schema.ts
      const { updateUserDocumentPreferencesSchema } = await import("@shared/schema");
      const validationResult = updateUserDocumentPreferencesSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Invalid request data",
          details: validationResult.error.issues
        });
      }
      
      const updateData = validationResult.data;
      
      // Check if preferences already exist
      const existingPreferences = await storage.getUserDocumentPreferences(userId, organizationId);
      
      let preferences;
      if (existingPreferences) {
        // Update existing preferences
        preferences = await storage.updateUserDocumentPreferences(userId, organizationId, updateData);
      } else {
        // Create new preferences
        const newPreferences = {
          userId,
          organizationId,
          ...updateData
        };
        preferences = await storage.createUserDocumentPreferences(newPreferences);
      }
      
      if (!preferences) {
        return res.status(500).json({ error: "Failed to save document preferences" });
      }
      
      res.json(preferences);
    } catch (error) {
      console.error("Error updating user document preferences:", error);
      res.status(500).json({ error: "Failed to update document preferences" });
    }
  });

  app.get("/api/users", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const users = await storage.getUsersByOrganization(req.tenant!.id);
      
      // Remove passwordHash from response and add patient-specific data if role is patient
      const safeUsersPromises = users.map(async user => {
        const { passwordHash, ...safeUser } = user;
        
        // If user is a patient, fetch and merge patient-specific data
        if (user.role === 'patient') {
          const patient = await storage.getPatientByUserId(user.id, req.tenant!.id);
          if (patient) {
            // Fetch insurance verifications from insurance_verifications table
            const insuranceVerifications = await storage.getInsuranceVerificationsByPatient(patient.id, req.tenant!.id);
            const latestInsurance = insuranceVerifications[0]; // Get most recent verification
            
            return {
              ...safeUser,
              dateOfBirth: patient.dateOfBirth || "",
              phone: patient.phone || "",
              nhsNumber: patient.nhsNumber || "",
              address: patient.address || {},
              emergencyContact: patient.emergencyContact || {},
              insuranceInfo: patient.insuranceInfo || {},
              // Add insurance verification data from insurance_verifications table
              insuranceVerification: latestInsurance ? {
                id: latestInsurance.id,
                provider: latestInsurance.provider,
                policyNumber: latestInsurance.policyNumber,
                groupNumber: latestInsurance.groupNumber,
                memberNumber: latestInsurance.memberNumber,
                planType: latestInsurance.planType,
                coverageType: latestInsurance.coverageType,
                status: latestInsurance.status,
                eligibilityStatus: latestInsurance.eligibilityStatus,
                effectiveDate: latestInsurance.effectiveDate,
                expirationDate: latestInsurance.expirationDate,
                lastVerified: latestInsurance.lastVerified,
                benefits: latestInsurance.benefits,
              } : null,
            };
          }
        }
        
        return safeUser;
      });

      const safeUsers = await Promise.all(safeUsersPromises);
      res.json(safeUsers);
    } catch (error) {
      console.error("Users fetch error:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/roles", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const roles = await storage.getRolesByOrganization(req.tenant!.id);
      res.json(roles);
    } catch (error) {
      console.error("Roles fetch error:", error);
      res.status(500).json({ error: "Failed to fetch roles" });
    }
  });

  // Function to get default permissions based on role
  function getDefaultPermissionsByRole(role: string) {
    const basePermissions = {
      modules: {},
      fields: {}
    };

    switch (role) {
      case "admin":
        return {
          modules: {
            patients: { view: true, create: true, edit: true, delete: true },
            appointments: { view: true, create: true, edit: true, delete: true },
            medicalRecords: { view: true, create: true, edit: true, delete: true },
            prescriptions: { view: true, create: true, edit: true, delete: true },
            billing: { view: true, create: true, edit: true, delete: true },
            analytics: { view: true, create: true, edit: true, delete: true },
            userManagement: { view: true, create: true, edit: true, delete: true },
            settings: { view: true, create: true, edit: true, delete: true },
            aiInsights: { view: true, create: true, edit: true, delete: true },
            messaging: { view: true, create: true, edit: true, delete: true },
            telemedicine: { view: true, create: true, edit: true, delete: true },
            populationHealth: { view: true, create: true, edit: true, delete: true },
            clinicalDecision: { view: true, create: true, edit: true, delete: true },
            labResults: { view: true, create: true, edit: true, delete: true },
            medicalImaging: { view: true, create: true, edit: true, delete: true },
            voiceDocumentation: { view: true, create: true, edit: true, delete: true },
            forms: { view: true, create: true, edit: true, delete: true },
            integrations: { view: true, create: true, edit: true, delete: true },
            automation: { view: true, create: true, edit: true, delete: true },
            mobileHealth: { view: true, create: true, edit: true, delete: true }
          },
          fields: {
            patientSensitiveInfo: true,
            financialData: true,
            medicalHistory: true,
            prescriptionDetails: true,
            labResults: true,
            imagingResults: true,
            billingInformation: true,
            insuranceDetails: true
          }
        };

      case "doctor":
        return {
          modules: {
            patients: { view: true, create: true, edit: true, delete: false },
            appointments: { view: true, create: true, edit: true, delete: true },
            medicalRecords: { view: true, create: true, edit: true, delete: false },
            prescriptions: { view: true, create: true, edit: true, delete: true },
            billing: { view: true, create: false, edit: false, delete: false },
            analytics: { view: true, create: false, edit: false, delete: false },
            userManagement: { view: false, create: false, edit: false, delete: false },
            settings: { view: false, create: false, edit: false, delete: false },
            aiInsights: { view: true, create: true, edit: true, delete: false },
            messaging: { view: true, create: true, edit: true, delete: false },
            telemedicine: { view: true, create: true, edit: true, delete: false },
            populationHealth: { view: true, create: false, edit: false, delete: false },
            clinicalDecision: { view: true, create: true, edit: true, delete: false },
            labResults: { view: true, create: true, edit: true, delete: false },
            medicalImaging: { view: true, create: true, edit: true, delete: false },
            voiceDocumentation: { view: true, create: true, edit: true, delete: true },
            forms: { view: true, create: true, edit: true, delete: false },
            integrations: { view: false, create: false, edit: false, delete: false },
            automation: { view: true, create: false, edit: false, delete: false },
            mobileHealth: { view: true, create: false, edit: false, delete: false }
          },
          fields: {
            patientSensitiveInfo: true,
            financialData: false,
            medicalHistory: true,
            prescriptionDetails: true,
            labResults: true,
            imagingResults: true,
            billingInformation: false,
            insuranceDetails: false
          }
        };

      case "nurse":
        return {
          modules: {
            patients: { view: true, create: true, edit: true, delete: false },
            appointments: { view: true, create: true, edit: true, delete: false },
            medicalRecords: { view: true, create: true, edit: true, delete: false },
            prescriptions: { view: true, create: false, edit: false, delete: false },
            billing: { view: false, create: false, edit: false, delete: false },
            analytics: { view: false, create: false, edit: false, delete: false },
            userManagement: { view: false, create: false, edit: false, delete: false },
            settings: { view: false, create: false, edit: false, delete: false },
            aiInsights: { view: true, create: false, edit: false, delete: false },
            messaging: { view: true, create: true, edit: true, delete: false },
            telemedicine: { view: true, create: true, edit: true, delete: false },
            populationHealth: { view: false, create: false, edit: false, delete: false },
            clinicalDecision: { view: true, create: false, edit: false, delete: false },
            labResults: { view: true, create: true, edit: true, delete: false },
            medicalImaging: { view: true, create: false, edit: false, delete: false },
            voiceDocumentation: { view: true, create: true, edit: true, delete: true },
            forms: { view: true, create: true, edit: true, delete: false },
            integrations: { view: false, create: false, edit: false, delete: false },
            automation: { view: false, create: false, edit: false, delete: false },
            mobileHealth: { view: true, create: false, edit: false, delete: false }
          },
          fields: {
            patientSensitiveInfo: true,
            financialData: false,
            medicalHistory: true,
            prescriptionDetails: true,
            labResults: true,
            imagingResults: true,
            billingInformation: false,
            insuranceDetails: false
          }
        };

      case "receptionist":
        return {
          modules: {
            patients: { view: true, create: true, edit: true, delete: false },
            appointments: { view: true, create: true, edit: true, delete: false },
            medicalRecords: { view: false, create: false, edit: false, delete: false },
            prescriptions: { view: false, create: false, edit: false, delete: false },
            billing: { view: true, create: true, edit: true, delete: false },
            analytics: { view: false, create: false, edit: false, delete: false },
            userManagement: { view: false, create: false, edit: false, delete: false },
            settings: { view: false, create: false, edit: false, delete: false },
            aiInsights: { view: false, create: false, edit: false, delete: false },
            messaging: { view: true, create: true, edit: false, delete: false },
            telemedicine: { view: false, create: false, edit: false, delete: false },
            populationHealth: { view: false, create: false, edit: false, delete: false },
            clinicalDecision: { view: false, create: false, edit: false, delete: false },
            labResults: { view: false, create: false, edit: false, delete: false },
            medicalImaging: { view: false, create: false, edit: false, delete: false },
            voiceDocumentation: { view: false, create: false, edit: false, delete: false },
            forms: { view: true, create: true, edit: true, delete: false },
            integrations: { view: false, create: false, edit: false, delete: false },
            automation: { view: false, create: false, edit: false, delete: false },
            mobileHealth: { view: false, create: false, edit: false, delete: false }
          },
          fields: {
            patientSensitiveInfo: false,
            financialData: true,
            medicalHistory: false,
            prescriptionDetails: false,
            labResults: false,
            imagingResults: false,
            billingInformation: true,
            insuranceDetails: true
          }
        };

      case "patient":
        return {
          modules: {
            patients: { view: true, create: false, edit: true, delete: false },
            appointments: { view: true, create: true, edit: true, delete: false },
            medicalRecords: { view: true, create: false, edit: false, delete: false },
            prescriptions: { view: true, create: false, edit: false, delete: false },
            billing: { view: true, create: false, edit: false, delete: false },
            analytics: { view: false, create: false, edit: false, delete: false },
            userManagement: { view: false, create: false, edit: false, delete: false },
            settings: { view: false, create: false, edit: false, delete: false },
            aiInsights: { view: false, create: false, edit: false, delete: false },
            messaging: { view: true, create: true, edit: false, delete: false },
            telemedicine: { view: true, create: false, edit: false, delete: false },
            populationHealth: { view: false, create: false, edit: false, delete: false },
            clinicalDecision: { view: false, create: false, edit: false, delete: false },
            labResults: { view: true, create: false, edit: false, delete: false },
            medicalImaging: { view: true, create: false, edit: false, delete: false },
            voiceDocumentation: { view: true, create: true, edit: true, delete: true },
            forms: { view: true, create: true, edit: true, delete: false },
            integrations: { view: false, create: false, edit: false, delete: false },
            automation: { view: false, create: false, edit: false, delete: false },
            mobileHealth: { view: true, create: false, edit: false, delete: false }
          },
          fields: {
            patientSensitiveInfo: true,
            financialData: false,
            medicalHistory: true,
            prescriptionDetails: true,
            labResults: true,
            imagingResults: true,
            billingInformation: true,
            insuranceDetails: true
          }
        };

      case "sample_taker":
        return {
          modules: {
            patients: { view: true, create: false, edit: false, delete: false },
            appointments: { view: true, create: false, edit: false, delete: false },
            medicalRecords: { view: false, create: false, edit: false, delete: false },
            prescriptions: { view: false, create: false, edit: false, delete: false },
            billing: { view: false, create: false, edit: false, delete: false },
            analytics: { view: false, create: false, edit: false, delete: false },
            userManagement: { view: false, create: false, edit: false, delete: false },
            settings: { view: false, create: false, edit: false, delete: false },
            aiInsights: { view: false, create: false, edit: false, delete: false },
            messaging: { view: false, create: false, edit: false, delete: false },
            telemedicine: { view: false, create: false, edit: false, delete: false },
            populationHealth: { view: false, create: false, edit: false, delete: false },
            clinicalDecision: { view: false, create: false, edit: false, delete: false },
            labResults: { view: true, create: true, edit: true, delete: false },
            medicalImaging: { view: false, create: false, edit: false, delete: false },
            voiceDocumentation: { view: false, create: false, edit: false, delete: false },
            forms: { view: false, create: false, edit: false, delete: false },
            integrations: { view: false, create: false, edit: false, delete: false },
            automation: { view: false, create: false, edit: false, delete: false },
            mobileHealth: { view: false, create: false, edit: false, delete: false }
          },
          fields: {
            patientSensitiveInfo: false,
            financialData: false,
            medicalHistory: false,
            prescriptionDetails: false,
            labResults: true,
            imagingResults: false,
            billingInformation: false,
            insuranceDetails: false
          }
        };

      default:
        return basePermissions;
    }
  }

  app.post("/api/users", authMiddleware, async (req: TenantRequest, res) => {
    try {
      console.log("Creating user with role-based permissions");
      console.log("Request body:", req.body);
      
      const userData = z.object({
        email: z.string().email(),
        username: z.string().min(3),
        password: z.string().min(6),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        role: z.string().min(1), // Accept any role from database
        department: z.string().optional(),
        medicalSpecialtyCategory: z.string().optional(),
        subSpecialty: z.string().optional(),
        // Patient-specific fields
        dateOfBirth: z.string().optional(),
        phone: z.string().optional(),
        nhsNumber: z.string().optional(),
        address: z.object({
          street: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          postcode: z.string().optional(),
          country: z.string().optional(),
        }).optional(),
        emergencyContact: z.object({
          name: z.string().optional(),
          relationship: z.string().optional(),
          phone: z.string().optional(),
          email: z.string().optional(),
        }).optional(),
        insuranceInfo: z.object({
          provider: z.string().optional(),
          policyNumber: z.string().optional(),
          memberNumber: z.string().optional(),
          planType: z.string().optional(),
          effectiveDate: z.string().optional(),
        }).optional(),
      }).parse(req.body);

      // Hash password
      const hashedPassword = await authService.hashPassword(userData.password);

      // Generate default permissions based on role
      const defaultPermissions = getDefaultPermissionsByRole(userData.role);

      const { password, ...userDataWithoutPassword } = userData;
      const user = await storage.createUser({
        ...userDataWithoutPassword,
        organizationId: req.tenant!.id,
        passwordHash: hashedPassword,
        permissions: defaultPermissions
      });

      console.log(`Created user with role: ${userData.role} and permissions:`, defaultPermissions);

      // If user role is patient, automatically create patient record
      if (userData.role === 'patient') {
        try {
          console.log("Creating patient record for user with role 'patient'");
          
          // Generate patient ID
          const patientCount = await storage.getPatientsByOrganization(req.tenant!.id, 999999);
          const patientId = `P${(patientCount.length + 1).toString().padStart(6, '0')}`;

          const patientData = {
            userId: user.id,
            firstName: userData.firstName,
            lastName: userData.lastName,
            dateOfBirth: userData.dateOfBirth ? new Date(userData.dateOfBirth) : new Date('1990-01-01'),
            email: userData.email, // Use same email as user
            phone: userData.phone || '',
            nhsNumber: userData.nhsNumber || '',
            organizationId: req.tenant!.id,
            patientId,
            address: userData.address || {},
            emergencyContact: userData.emergencyContact || {},
            medicalHistory: {
              allergies: [],
              chronicConditions: [],
              medications: [],
              familyHistory: {
                father: [],
                mother: [],
                siblings: [],
                grandparents: []
              },
              socialHistory: {
                smoking: { status: "never" as const },
                alcohol: { status: "never" as const },
                drugs: { status: "never" as const },
                occupation: "",
                maritalStatus: "single" as const,
                education: "",
                exercise: { frequency: "none" as const }
              },
              immunizations: []
            },
            insuranceInfo: userData.insuranceInfo || null
          };

          console.log("🔍 DEBUG patientData BEFORE storage.createPatient:", { userId: patientData.userId, patientId: patientData.patientId });
          const patient = await storage.createPatient(patientData);
          console.log(`Created patient record with ID: ${patient.id}, patientId: ${patient.patientId}, userId: ${patient.userId}`);
          
        } catch (patientError) {
          console.error("Error creating patient record:", patientError);
          // Don't fail user creation if patient creation fails
          // Log the error but continue with user creation response
        }
      }

      // Remove password from response
      const { passwordHash, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error: any) {
      console.error("User creation error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        });
      }
      
      // Handle duplicate username error
      if (error.code === '23505' && error.constraint === 'users_username_key') {
        return res.status(400).json({ 
          error: "Username already exists. Please choose a different username." 
        });
      }
      
      // Handle duplicate email error
      if (error.code === '23505' && error.constraint === 'users_email_key') {
        return res.status(400).json({ 
          error: "Email address already exists. Please use a different email." 
        });
      }
      
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  // Send welcome email to newly created user
  app.post("/api/users/send-welcome-email", authMiddleware, async (req: TenantRequest, res) => {
    try {
      console.log("📧 [EMAIL ENDPOINT] Received welcome email request");
      console.log("📧 [EMAIL ENDPOINT] Request body:", req.body);
      console.log("📧 [EMAIL ENDPOINT] Organization ID:", req.tenant!.id);
      
      const emailData = z.object({
        userEmail: z.string().email(),
        userName: z.string().min(1),
        password: z.string().min(1),
        role: z.string().min(1)
      }).parse(req.body);

      console.log("📧 [EMAIL ENDPOINT] Validated email data:", emailData);

      // Get organization details
      const organization = await storage.getOrganization(req.tenant!.id);
      console.log("📧 [EMAIL ENDPOINT] Organization retrieved:", organization);
      
      if (!organization) {
        console.error("❌ [EMAIL ENDPOINT] Organization not found for ID:", req.tenant!.id);
        return res.status(404).json({ error: "Organization not found" });
      }

      // Send the welcome email
      console.log("📧 [EMAIL ENDPOINT] Attempting to send email via emailService...");
      const emailSent = await emailService.sendNewUserAccountEmail(
        emailData.userEmail,
        emailData.userName,
        emailData.password,
        organization.name,
        emailData.role
      );

      console.log("📧 [EMAIL ENDPOINT] Email service result:", emailSent);

      if (emailSent) {
        console.log("✅ [EMAIL ENDPOINT] Welcome email sent successfully to", emailData.userEmail);
        res.status(200).json({ success: true, message: "Welcome email sent successfully" });
      } else {
        console.error("❌ [EMAIL ENDPOINT] Email service returned false");
        res.status(500).json({ success: false, error: "Failed to send welcome email" });
      }
    } catch (error: any) {
      console.error("❌ [EMAIL ENDPOINT] Error sending welcome email:", error);
      console.error("❌ [EMAIL ENDPOINT] Error stack:", error.stack);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        });
      }
      res.status(500).json({ error: "Failed to send welcome email" });
    }
  });

  // Update user
  app.patch("/api/users/:id", async (req: TenantRequest, res) => {
    try {
      const userId = parseInt(req.params.id);
      const updates = req.body;
      
      // Check if user has permission to update this user
      const isAdmin = req.user?.role === "admin";
      const isSelfUpdate = req.user?.id === userId;
      
      if (!isAdmin && !isSelfUpdate) {
        return res.status(403).json({ error: "Permission denied" });
      }

      // Only allow schedule updates for non-admin users updating themselves
      if (!isAdmin && isSelfUpdate) {
        const allowedFields = ['workingDays', 'workingHours'];
        const hasInvalidField = Object.keys(updates).some(key => !allowedFields.includes(key));
        if (hasInvalidField) {
          return res.status(403).json({ error: "Can only update schedule information" });
        }
      }
      
      // Hash password if provided (admin only)
      if (updates.password && isAdmin) {
        updates.passwordHash = await authService.hashPassword(updates.password);
        delete updates.password; // Remove the plain password field
      } else if (updates.password) {
        // If password provided but not admin, remove it for security
        delete updates.password;
      }

      // Fetch the current user BEFORE updating (to get old email for patient lookup)
      const currentUser = await storage.getUser(userId, req.tenant!.id);
      if (!currentUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Separate patient-specific fields from user fields
      const patientFields = [
        'dateOfBirth', 'genderAtBirth', 'phone', 'nhsNumber', 
        'address', 'emergencyContact', 'insuranceInfo', 
        'medicalHistory', 'riskLevel', 'flags', 
        'communicationPreferences', 'isActive', 'isInsured'
      ];
      const patientUpdates: any = {};
      const userUpdates: any = {};

      for (const [key, value] of Object.entries(updates)) {
        if (patientFields.includes(key)) {
          patientUpdates[key] = value;
        } else {
          userUpdates[key] = value;
        }
      }

      // If user is a patient and we're changing the email, also update patient email
      const isEmailChanging = userUpdates.email && userUpdates.email !== currentUser.email;
      if (currentUser.role === 'patient' && isEmailChanging) {
        patientUpdates.email = userUpdates.email;
      }

      // Update user record
      const user = await storage.updateUser(userId, req.tenant!.id, userUpdates);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // If user is a patient and there are patient-specific updates, update/create the patient record
      if (user.role === 'patient' && Object.keys(patientUpdates).length > 0) {
        // Use OLD email to find patient (before email change)
        let patient = await storage.getPatientByEmail(currentUser.email, req.tenant!.id);
        
        // AUTO-CREATE MISSING PATIENT RECORD (Option 2 implementation)
        if (!patient) {
          console.log(`⚠️ Patient record missing for user ${user.id} (${user.email}). Auto-creating...`);
          
          // Generate patient ID
          const patientCount = await storage.getPatientsByOrganization(req.tenant!.id, 999999);
          const generatedPatientId = `P${(patientCount.length + 1).toString().padStart(6, '0')}`;
          
          // Create patient record with basic info from user
          patient = await storage.createPatient({
            organizationId: req.tenant!.id,
            patientId: generatedPatientId,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            dateOfBirth: null as any,
            genderAtBirth: null as any,
            phone: "",
            nhsNumber: "",
            address: {},
            emergencyContact: {},
            insuranceInfo: {},
            medicalHistory: {
              allergies: [],
              medications: [],
              chronicConditions: [],
              familyHistory: {
                father: [],
                mother: [],
                siblings: [],
                grandparents: []
              },
              immunizations: [],
              socialHistory: {
                smoking: { status: "never" },
                alcohol: { status: "never" },
                drugs: { status: "never" },
                exercise: { frequency: "none" },
                occupation: "",
                education: "",
                maritalStatus: "single"
              }
            },
            riskLevel: "low",
            flags: [],
            communicationPreferences: {},
            isActive: true,
            isInsured: false
          });
          
          console.log(`✅ Auto-created patient record with ID: ${patient.id}, patientId: ${generatedPatientId}`);
        }
        
        // Now update the patient record (whether it was just created or already existed)
        if (patient) {
          console.log("Updating patient record with data:", patientUpdates);
          await storage.updatePatient(patient.id, req.tenant!.id, patientUpdates);
          
          // Update insurance verification if insurance info is provided
          if (updates.insuranceInfo) {
            const insuranceVerifications = await storage.getInsuranceVerificationsByPatient(patient.id, req.tenant!.id);
            const insuranceData = {
              organizationId: req.tenant!.id,
              patientId: patient.id,
              patientName: `${user.firstName} ${user.lastName}`,
              provider: updates.insuranceInfo.provider || "",
              policyNumber: updates.insuranceInfo.policyNumber || "",
              groupNumber: updates.insuranceInfo.groupNumber || "",
              memberNumber: updates.insuranceInfo.memberNumber || "",
              nhsNumber: patient.nhsNumber || "",
              planType: updates.insuranceInfo.planType || "",
              coverageType: updates.insuranceInfo.coverageType || "primary",
              status: updates.insuranceInfo.status || "active",
              eligibilityStatus: updates.insuranceInfo.eligibilityStatus || "pending",
              effectiveDate: updates.insuranceInfo.effectiveDate || null,
              expirationDate: updates.insuranceInfo.expirationDate || null,
              lastVerified: new Date().toISOString().split('T')[0],
              benefits: updates.insuranceInfo.benefits || {},
            };
            
            if (insuranceVerifications.length > 0) {
              // Update existing insurance verification
              await storage.updateInsuranceVerification(insuranceVerifications[0].id, req.tenant!.id, insuranceData);
            } else {
              // Create new insurance verification
              await storage.createInsuranceVerification(insuranceData as any);
            }
          }
        }
      }

      // Fetch updated user with patient data merged (use NEW email after update)
      let responseData: any = { ...user };
      if (user.role === 'patient') {
        const patient = await storage.getPatientByUserId(userId, req.tenant!.id);
        if (patient) {
          // Fetch insurance verifications from insurance_verifications table
          const insuranceVerifications = await storage.getInsuranceVerificationsByPatient(patient.id, req.tenant!.id);
          const latestInsurance = insuranceVerifications[0];
          
          responseData = {
            ...responseData,
            dateOfBirth: patient.dateOfBirth || "",
            genderAtBirth: patient.genderAtBirth || "",
            phone: patient.phone || "",
            nhsNumber: patient.nhsNumber || "",
            address: patient.address || {},
            emergencyContact: patient.emergencyContact || {},
            insuranceInfo: patient.insuranceInfo || {},
            medicalHistory: patient.medicalHistory || {},
            riskLevel: patient.riskLevel || "low",
            flags: patient.flags || [],
            communicationPreferences: patient.communicationPreferences || {},
            isActive: patient.isActive !== undefined ? patient.isActive : true,
            isInsured: patient.isInsured !== undefined ? patient.isInsured : false,
            // Add insurance verification data from insurance_verifications table
            insuranceVerification: latestInsurance ? {
              id: latestInsurance.id,
              provider: latestInsurance.provider,
              policyNumber: latestInsurance.policyNumber,
              groupNumber: latestInsurance.groupNumber,
              memberNumber: latestInsurance.memberNumber,
              planType: latestInsurance.planType,
              coverageType: latestInsurance.coverageType,
              status: latestInsurance.status,
              eligibilityStatus: latestInsurance.eligibilityStatus,
              effectiveDate: latestInsurance.effectiveDate,
              expirationDate: latestInsurance.expirationDate,
              lastVerified: latestInsurance.lastVerified,
              benefits: latestInsurance.benefits,
            } : null,
          };
        }
      }

      // Remove password from response
      const { passwordHash, ...safeUser } = responseData;
      res.json(safeUser);
    } catch (error) {
      console.error("User update error:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // Delete user
  app.delete("/api/users/:id", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const userId = parseInt(req.params.id);
      console.log(`Deleting user ${userId} for organization ${req.tenant!.id}`);
      
      const success = await storage.deleteUser(userId, req.tenant!.id);
      
      if (!success) {
        console.log(`User ${userId} not found or already deleted`);
        return res.status(404).json({ error: "User not found" });
      }

      console.log(`User ${userId} deleted successfully`);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("User deletion error:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // Role management routes
  app.get("/api/roles", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const roles = await storage.getRolesByOrganization(req.tenant!.id);
      res.json(roles);
    } catch (error) {
      console.error("Roles fetch error:", error);
      res.status(500).json({ error: "Failed to fetch roles" });
    }
  });

  // Get role permissions by role name
  app.get("/api/roles/by-name/:roleName", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const { roleName } = req.params;
      const role = await storage.getRoleByName(roleName, req.tenant!.id);
      
      if (!role) {
        return res.status(404).json({ error: "Role not found" });
      }
      
      res.json(role);
    } catch (error) {
      console.error("Role fetch by name error:", error);
      res.status(500).json({ error: "Failed to fetch role" });
    }
  });

  app.post("/api/roles", requireRole(["admin"]), async (req: TenantRequest, res) => {
    try {
      const roleData = z.object({
        name: z.string().min(1).max(50),
        displayName: z.string().min(1),
        description: z.string().min(1),
        permissions: z.object({
          modules: z.record(z.object({
            view: z.boolean(),
            create: z.boolean(),
            edit: z.boolean(),
            delete: z.boolean(),
          })),
          fields: z.record(z.object({
            view: z.boolean(),
            edit: z.boolean(),
          }))
        }),
        isSystem: z.boolean().optional().default(false)
      }).parse(req.body);

      const role = await storage.createRole({
        ...roleData,
        organizationId: req.tenant!.id
      });

      res.status(201).json(role);
    } catch (error) {
      console.error("Role creation error:", error);
      res.status(500).json({ error: "Failed to create role" });
    }
  });

  app.patch("/api/roles/:id", requireRole(["admin"]), async (req: TenantRequest, res) => {
    try {
      const roleId = parseInt(req.params.id);
      const updateData = z.object({
        name: z.string().optional(),
        displayName: z.string().optional(),
        description: z.string().optional(),
        permissions: z.object({
          modules: z.record(z.object({
            view: z.boolean(),
            create: z.boolean(),
            edit: z.boolean(),
            delete: z.boolean(),
          })),
          fields: z.record(z.object({
            view: z.boolean(),
            edit: z.boolean(),
          }))
        }).optional()
      }).parse(req.body);

      const role = await storage.updateRole(roleId, req.tenant!.id, updateData);
      
      if (!role) {
        return res.status(404).json({ error: "Role not found" });
      }

      res.json(role);
    } catch (error) {
      console.error("Role update error:", error);
      res.status(500).json({ error: "Failed to update role" });
    }
  });

  app.delete("/api/roles/:id", requireRole(["admin"]), async (req: TenantRequest, res) => {
    try {
      const roleId = parseInt(req.params.id);
      
      // Check if this is a system role
      const role = await storage.getRole(roleId, req.tenant!.id);
      if (!role) {
        return res.status(404).json({ error: "Role not found" });
      }
      
      if (role.isSystem) {
        return res.status(400).json({ error: "Cannot delete system roles" });
      }

      const success = await storage.deleteRole(roleId, req.tenant!.id);
      
      if (!success) {
        return res.status(404).json({ error: "Role not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Role deletion error:", error);
      res.status(500).json({ error: "Failed to delete role" });
    }
  });

  // Subscription management routes
  app.get("/api/subscription", requireRole(["admin"]), async (req: TenantRequest, res) => {
    try {
      const subscription = await storage.getSubscription(req.tenant!.id);
      if (!subscription) {
        return res.status(404).json({ error: "Subscription not found" });
      }
      res.json(subscription);
    } catch (error) {
      console.error("Subscription fetch error:", error);
      res.status(500).json({ error: "Failed to fetch subscription" });
    }
  });

  // AI insights routes
  app.post("/api/ai/analyze-patient/:id", requireRole(["doctor", "nurse"]), async (req: TenantRequest, res) => {
    try {
      const patientId = parseInt(req.params.id);
      
      const patient = await storage.getPatient(patientId, req.tenant!.id);
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }

      const medicalRecords = await storage.getMedicalRecordsByPatient(patientId, req.tenant!.id);
      
      const insights = await aiService.analyzePatientRisk(patient, medicalRecords);
      
      // Save insights to database
      for (const insight of insights) {
        await storage.createAiInsight({
          organizationId: req.tenant!.id,
          patientId,
          type: insight.type,
          title: insight.title,
          description: insight.description,
          severity: insight.severity,
          actionRequired: insight.actionRequired,
          confidence: insight.confidence.toString()
        });
      }

      res.json(insights);
    } catch (error) {
      console.error("AI analysis error:", error);
      res.status(500).json({ error: "Failed to analyze patient" });
    }
  });

  app.patch("/api/ai/insights/:id", requireRole(["doctor", "nurse", "admin"]), async (req: TenantRequest, res) => {
    try {
      const insightId = parseInt(req.params.id);
      
      const updateData = z.object({
        status: z.enum(["active", "dismissed", "resolved"]).optional(),
        aiStatus: z.enum(["pending", "reviewed", "implemented", "dismissed"]).optional()
      }).parse(req.body);

      // Get the current insight to track status changes
      const currentInsight = await storage.getAiInsight(insightId, req.tenant!.id);
      if (!currentInsight) {
        return res.status(404).json({ error: "AI insight not found" });
      }

      const insight = await storage.updateAiInsight(insightId, req.tenant!.id, updateData);
      
      if (!insight) {
        return res.status(404).json({ error: "AI insight not found" });
      }

      // Emit SSE event if aiStatus was updated
      if (updateData.aiStatus && updateData.aiStatus !== currentInsight.aiStatus) {
        const sseEvent: AiInsightSSEEvent = {
          type: 'ai_insight.status_updated',
          id: insight.id.toString(),
          patientId: insight.patientId?.toString() || '',
          status: updateData.aiStatus,
          previousStatus: currentInsight.aiStatus || 'pending',
          updatedAt: new Date().toISOString(),
          organizationId: req.tenant!.id
        };

        aiInsightBroadcaster.broadcast(req.tenant!.id, sseEvent);
        console.log(`[SSE] Emitted status update event for insight ${insight.id}: ${currentInsight.aiStatus} -> ${updateData.aiStatus}`);
      }

      res.json(insight);
    } catch (error) {
      console.error("AI insight update error:", error);
      res.status(500).json({ error: "Failed to update AI insight" });
    }
  });

  // Server-Sent Events endpoint for real-time AI insight updates
  app.get("/api/ai-insights/events", requireRole(["doctor", "nurse", "admin"]), async (req: TenantRequest, res) => {
    try {
      const organizationId = req.tenant!.id;
      
      // Set SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
        'X-Accel-Buffering': 'no' // Disable nginx buffering for SSE
      });

      // Add connection to broadcaster
      aiInsightBroadcaster.addConnection(organizationId, res);

      // Send initial connection event
      const connectEventId = uuidv4();
      res.write(`id: ${connectEventId}\nevent: connected\ndata: {"message":"Connected to AI insights updates"}\n\n`);

      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeatInterval = setInterval(() => {
        if (!res.destroyed && !res.headersSent) {
          try {
            res.write(`: heartbeat ${Date.now()}\n\n`);
          } catch (error) {
            console.error('[SSE] Heartbeat error:', error);
            clearInterval(heartbeatInterval);
          }
        } else {
          clearInterval(heartbeatInterval);
        }
      }, 30000);

      // Clean up on client disconnect
      req.on('close', () => {
        clearInterval(heartbeatInterval);
        aiInsightBroadcaster.removeConnection(organizationId, res);
        console.log(`[SSE] Client disconnected from organization ${organizationId}`);
      });

      req.on('aborted', () => {
        clearInterval(heartbeatInterval);
        aiInsightBroadcaster.removeConnection(organizationId, res);
        console.log(`[SSE] Client aborted connection from organization ${organizationId}`);
      });

      console.log(`[SSE] Client connected to AI insights events for organization ${organizationId}`);
      
    } catch (error) {
      console.error('[SSE] Error setting up SSE connection:', error);
      res.status(500).json({ error: 'Failed to establish SSE connection' });
    }
  });

  // AI Insights CRUD Routes
  
  // GET /api/ai-insights - List insights with optional patient filter
  app.get("/api/ai-insights", requireRole(["doctor", "nurse", "admin"]), async (req: TenantRequest, res) => {
    try {
      const patientId = req.query.patientId ? parseInt(req.query.patientId as string) : undefined;
      
      let insights;
      if (patientId) {
        // Validate that patient belongs to the same organization
        const patient = await storage.getPatient(patientId, req.tenant!.id);
        if (!patient) {
          return res.status(404).json({ error: "Patient not found" });
        }
        insights = await storage.getAiInsightsByPatient(patientId, req.tenant!.id);
      } else {
        insights = await storage.getAiInsightsByOrganization(req.tenant!.id, 50);
      }

      // Transform confidence from string to number for frontend
      const transformedInsights = insights.map(insight => ({
        ...insight,
        confidence: insight.confidence ? parseFloat(insight.confidence) : 0
      }));

      res.json(transformedInsights);
    } catch (error) {
      handleRouteError(error, "list AI insights", res);
    }
  });

  // POST /api/ai-insights - Create new insight
  app.post("/api/ai-insights", requireRole(["doctor", "nurse", "admin"]), async (req: TenantRequest, res) => {
    try {
      // Create schema that excludes server-managed fields (organizationId)
      const createInsightSchema = insertAiInsightSchema.omit({
        organizationId: true
      }).extend({
        symptoms: z.string().optional(),
        history: z.string().optional()
      });

      const validatedData = createInsightSchema.parse(req.body);
      
      // Validate that patient belongs to the same organization if patientId is provided
      if (validatedData.patientId) {
        const patient = await storage.getPatient(validatedData.patientId, req.tenant!.id);
        if (!patient) {
          return res.status(404).json({ error: "Patient not found" });
        }
      }

      // Prepare metadata with symptoms and history
      const { symptoms, history, ...insightData } = validatedData;
      
      // Generate suggested actions based on insight type and severity
      const generateSuggestedActions = (type: string, severity: string, actionRequired: boolean) => {
        const actions = [];
        
        if (actionRequired) {
          switch (type) {
            case 'risk_alert':
              if (severity === 'critical') {
                actions.push('Immediate patient evaluation required', 'Contact primary physician within 2 hours', 'Document findings in medical record');
              } else if (severity === 'high') {
                actions.push('Schedule follow-up appointment within 1 week', 'Monitor patient closely', 'Review medication interactions');
              } else {
                actions.push('Schedule routine follow-up', 'Patient education on risk factors', 'Consider preventive measures');
              }
              break;
            case 'drug_interaction':
              actions.push('Review medication list with pharmacist', 'Monitor for adverse effects', 'Consider alternative medications', 'Educate patient on interaction signs');
              break;
            case 'treatment_suggestion':
              actions.push('Discuss treatment options with patient', 'Obtain informed consent', 'Monitor treatment response', 'Schedule follow-up assessment');
              break;
            case 'diagnostic':
              actions.push('Order appropriate diagnostic tests', 'Review results with specialist', 'Monitor symptoms progression', 'Document clinical findings');
              break;
            case 'preventive':
              actions.push('Implement preventive care plan', 'Patient lifestyle counseling', 'Schedule regular monitoring', 'Educate on risk reduction');
              break;
            default:
              actions.push('Review clinical findings', 'Follow standard care protocols', 'Document assessment', 'Monitor patient status');
          }
        } else {
          actions.push('Review and acknowledge findings', 'Consider for future reference', 'Update patient care plan if needed');
        }
        
        return actions;
      };

      const suggestedActions = generateSuggestedActions(insightData.type || '', insightData.severity || '', insightData.actionRequired || false);
      
      // Generate related conditions based on insight type and content
      const generateRelatedConditions = (type: string, title: string, description: string) => {
        const conditions = [];
        const lowerTitle = title.toLowerCase();
        const lowerDesc = description.toLowerCase();
        
        switch (type) {
          case 'risk_alert':
            if (lowerTitle.includes('cardiac') || lowerDesc.includes('heart')) {
              conditions.push('Cardiovascular Disease', 'Hypertension', 'Coronary Artery Disease');
            } else if (lowerTitle.includes('diabetic') || lowerDesc.includes('diabetes')) {
              conditions.push('Type 2 Diabetes', 'Insulin Resistance', 'Metabolic Syndrome');
            } else if (lowerTitle.includes('respiratory') || lowerDesc.includes('lung')) {
              conditions.push('COPD', 'Asthma', 'Pulmonary Disease');
            } else {
              conditions.push('Chronic Disease Risk', 'Lifestyle Factors', 'Preventive Care Needed');
            }
            break;
          case 'drug_interaction':
            conditions.push('Polypharmacy', 'Drug-Drug Interactions', 'Medication Side Effects', 'Pharmacokinetic Changes');
            break;
          case 'treatment_suggestion':
            if (lowerDesc.includes('pain')) {
              conditions.push('Chronic Pain', 'Pain Management', 'Inflammation');
            } else if (lowerDesc.includes('infection')) {
              conditions.push('Bacterial Infection', 'Antibiotic Therapy', 'Immune Response');
            } else {
              conditions.push('Treatment Response', 'Therapeutic Options', 'Clinical Guidelines');
            }
            break;
          case 'diagnostic':
            conditions.push('Differential Diagnosis', 'Clinical Assessment', 'Diagnostic Testing');
            break;
          case 'preventive':
            conditions.push('Preventive Medicine', 'Health Maintenance', 'Risk Reduction', 'Screening Guidelines');
            break;
          default:
            conditions.push('Clinical Assessment', 'Patient Care', 'Medical Evaluation');
        }
        
        return conditions.slice(0, 4); // Limit to 4 conditions max
      };

      const relatedConditions = generateRelatedConditions(insightData.type || '', insightData.title || '', insightData.description || '');
      
      const metadata = {
        ...insightData.metadata,
        ...(symptoms && { symptoms }),
        ...(history && { history }),
        suggestedActions,
        relatedConditions
      };

      // Convert confidence from number to string for DB storage
      const insightToCreate = {
        ...insightData,
        organizationId: req.tenant!.id,
        confidence: insightData.confidence ? insightData.confidence.toString() : "0",
        metadata
      };

      const newInsight = await storage.createAiInsight(insightToCreate);
      
      // Transform confidence back to number for frontend response
      const transformedInsight = {
        ...newInsight,
        confidence: newInsight.confidence ? parseFloat(newInsight.confidence) : 0
      };

      res.status(201).json(transformedInsight);
    } catch (error) {
      handleRouteError(error, "create AI insight", res);
    }
  });

  // DELETE /api/ai-insights/:id - Delete insight with org-scoped security
  app.delete("/api/ai-insights/:id", requireRole(["doctor", "nurse", "admin"]), async (req: TenantRequest, res) => {
    try {
      const insightId = parseInt(req.params.id);
      
      if (isNaN(insightId)) {
        return res.status(400).json({ error: "Invalid insight ID" });
      }

      // Check if insight exists and belongs to organization
      const existingInsight = await storage.getAiInsight(insightId, req.tenant!.id);
      if (!existingInsight) {
        return res.status(404).json({ error: "AI insight not found" });
      }

      const deleted = await storage.deleteAiInsight(insightId, req.tenant!.id);
      
      if (!deleted) {
        return res.status(404).json({ error: "AI insight not found" });
      }

      res.json({ success: true, message: "AI insight deleted successfully" });
    } catch (error) {
      handleRouteError(error, "delete AI insight", res);
    }
  });

  // PATCH /api/ai-insights/:id - Update insight fields (severity, status, etc.)
  app.patch("/api/ai-insights/:id", requireRole(["doctor", "nurse", "admin"]), async (req: TenantRequest, res) => {
    try {
      const insightId = parseInt(req.params.id);
      
      if (isNaN(insightId)) {
        return res.status(400).json({ error: "Invalid insight ID" });
      }

      // Validate update data - allow severity, status, and other fields
      const updateData = z.object({
        severity: z.enum(["critical", "high", "medium", "low"]).optional(),
        status: z.enum(["active", "reviewed", "dismissed", "implemented"]).optional(),
        aiStatus: z.enum(["pending", "reviewed", "implemented", "dismissed"]).optional(),
        notes: z.string().optional()
      }).parse(req.body);

      console.log(`[AI-INSIGHTS] Updating insight ${insightId} with data:`, updateData);

      // Check if insight exists and belongs to organization
      const existingInsight = await storage.getAiInsight(insightId, req.tenant!.id);
      if (!existingInsight) {
        return res.status(404).json({ error: "AI insight not found" });
      }

      // Update the insight in the database
      const updatedInsight = await storage.updateAiInsight(insightId, req.tenant!.id, updateData);
      
      if (!updatedInsight) {
        return res.status(404).json({ error: "AI insight not found or update failed" });
      }

      console.log(`[AI-INSIGHTS] Successfully updated insight ${insightId}:`, updatedInsight);

      // Transform confidence from string to number for frontend response
      const transformedInsight = {
        ...updatedInsight,
        confidence: updatedInsight.confidence ? parseFloat(updatedInsight.confidence) : 0
      };

      res.json({ success: true, insight: transformedInsight, message: "AI insight updated successfully" });
    } catch (error) {
      console.error(`[AI-INSIGHTS] Update error for insight ${req.params.id}:`, error);
      handleRouteError(error, "update AI insight", res);
    }
  });

  // Keep the existing clinical insights route for backward compatibility but use real data
  app.get("/api/clinical/insights", requireRole(["doctor", "nurse", "admin"]), async (req: TenantRequest, res) => {
    try {
      const insights = await storage.getAiInsightsByOrganization(req.tenant!.id, 50);
      
      // Transform to match the expected clinical insights format
      const transformedInsights = insights.map(insight => ({
        ...insight,
        confidence: insight.confidence ? parseFloat(insight.confidence) : 0,
        priority: insight.severity, // Map severity to priority for backward compatibility
        patientName: `Patient ${insight.patientId}` // Will be enriched with real patient data in frontend
      }));

      res.json(transformedInsights);
    } catch (error) {
      handleRouteError(error, "fetch clinical insights", res);
    }
  });

  app.patch("/api/clinical/insights/:id", requireRole(["doctor", "nurse", "admin"]), async (req: TenantRequest, res) => {
    try {
      const insightId = req.params.id;
      
      const updateData = z.object({
        status: z.enum(["active", "reviewed", "dismissed", "implemented"]).optional(),
        notes: z.string().optional()
      }).parse(req.body);

      console.log(`Updating clinical insight ${insightId} with status: ${updateData.status}`);
      
      // For now, return success response
      // In a real implementation, this would update the database
      res.json({ 
        id: insightId, 
        status: updateData.status,
        message: "Clinical insight updated successfully" 
      });
    } catch (error) {
      console.error("Clinical insight update error:", error);
      res.status(500).json({ error: "Failed to update clinical insight" });
    }
  });

  // Drug Interactions API endpoint
  app.get("/api/clinical/drug-interactions", authMiddleware, async (req: TenantRequest, res) => {
    try {
      // Check role authorization - only non-patient roles can access
      if (req.user?.role === "patient") {
        return res.status(403).json({ error: "Insufficient permissions" });
      }

      const patientId = req.query.patientId ? parseInt(req.query.patientId as string) : null;
      
      // Get all patients if no specific patient ID provided
      let patients = [];
      if (patientId) {
        const patient = await storage.getPatient(patientId, req.tenant!.id);
        if (patient) patients = [patient];
      } else {
        patients = await storage.getPatientsByOrganization(req.tenant!.id);
      }

      const interactions = [];
      
      // First, get manually added patient drug interactions from the new table
      let manualInteractions = [];
      if (patientId) {
        manualInteractions = await db
          .select()
          .from(patientDrugInteractions)
          .where(and(
            eq(patientDrugInteractions.organizationId, req.tenant!.id),
            eq(patientDrugInteractions.patientId, patientId),
            eq(patientDrugInteractions.status, 'active'),
            eq(patientDrugInteractions.isActive, true)
          ));
      } else {
        manualInteractions = await db
          .select()
          .from(patientDrugInteractions)
          .where(and(
            eq(patientDrugInteractions.organizationId, req.tenant!.id),
            eq(patientDrugInteractions.status, 'active'),
            eq(patientDrugInteractions.isActive, true)
          ));
      }

      // Add manual interactions to results
      for (const manualInteraction of manualInteractions) {
        const patient = patients.find(p => p.id === manualInteraction.patientId);
        if (patient) {
          interactions.push({
            id: `manual-${manualInteraction.id}`,
            patientId: patient.id,
            patientName: `${patient.firstName} ${patient.lastName}`,
            medication1: {
              name: manualInteraction.medication1Name,
              dosage: manualInteraction.medication1Dosage || 'Not specified'
            },
            medication2: {
              name: manualInteraction.medication2Name,
              dosage: manualInteraction.medication2Dosage || 'Not specified'
            },
            severity: manualInteraction.severity,
            description: manualInteraction.description || `Interaction between ${manualInteraction.medication1Name} and ${manualInteraction.medication2Name}`,
            warnings: manualInteraction.warnings || [],
            recommendations: manualInteraction.recommendations || [],
            detectedAt: manualInteraction.reportedAt?.toISOString() || manualInteraction.createdAt?.toISOString(),
            source: 'manual'
          });
        }
      }
      
      // Then check for automatic interactions from patient medications
      for (const patient of patients) {
        if (patient.medicalHistory?.medications && patient.medicalHistory.medications.length > 0) {
          const patientMeds = patient.medicalHistory.medications;
          
          // Check for interactions between patient's medications
          for (let i = 0; i < patientMeds.length; i++) {
            for (let j = i + 1; j < patientMeds.length; j++) {
              const med1 = patientMeds[i];
              const med2 = patientMeds[j];
              
              // Skip if medication doesn't have a name
              if (!med1?.name || !med2?.name) {
                continue;
              }
              
              // Query medications database for interaction data
              const [medication1] = await db
                .select()
                .from(medicationsDatabase)
                .where(and(
                  eq(medicationsDatabase.organizationId, req.tenant!.id),
                  sql`lower(${medicationsDatabase.name}) = lower(${sql.raw(`'${med1.name.replace(/'/g, "''")}'`)})`
                ));
              
              if (medication1 && medication1.interactions) {
                const interacts = medication1.interactions.some((interaction: string) => 
                  interaction.toLowerCase().includes(med2.name.toLowerCase())
                );
                
                if (interacts) {
                  interactions.push({
                    id: `${patient.id}-${i}-${j}`,
                    patientId: patient.id,
                    patientName: `${patient.firstName} ${patient.lastName}`,
                    medication1: {
                      name: med1.name,
                      dosage: med1.dosage || 'Not specified'
                    },
                    medication2: {
                      name: med2.name,
                      dosage: med2.dosage || 'Not specified'
                    },
                    severity: medication1.severity,
                    description: `Potential interaction between ${med1.name} and ${med2.name}`,
                    warnings: medication1.warnings || [],
                    recommendations: [
                      'Monitor patient closely for adverse effects',
                      'Consider alternative medications if possible',
                      'Adjust dosage if necessary',
                      'Consult with pharmacist for guidance'
                    ],
                    detectedAt: new Date().toISOString()
                  });
                }
              }
            }
          }
        }
      }

      res.json({
        success: true,
        interactions,
        totalInteractions: interactions.length,
        patientsScanned: patients.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Drug interactions check error:", error);
      res.status(500).json({ error: "Failed to check drug interactions" });
    }
  });

  // Patient Drug Interactions API endpoints
  app.post("/api/clinical/patient-drug-interactions", authMiddleware, async (req: TenantRequest, res) => {
    try {
      // Check role authorization - only non-patient roles can access
      if (req.user?.role === "patient") {
        return res.status(403).json({ error: "Insufficient permissions" });
      }

      const interactionData = z.object({
        patientId: z.number(),
        medication1Name: z.string(),
        medication1Dosage: z.string().optional(),
        medication1Frequency: z.string().optional(),
        medication2Name: z.string(),
        medication2Dosage: z.string().optional(),
        medication2Frequency: z.string().optional(),
        severity: z.enum(["low", "medium", "high"]).default("medium"),
        description: z.string().optional(),
        warnings: z.array(z.string()).default([]),
        recommendations: z.array(z.string()).default([]),
        notes: z.string().optional()
      }).parse(req.body);

      // Verify patient exists and belongs to organization
      const patient = await storage.getPatient(interactionData.patientId, req.tenant!.id);
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }

      // Insert into patient_drug_interactions table
      const [newInteraction] = await db
        .insert(patientDrugInteractions)
        .values({
          organizationId: req.tenant!.id,
          patientId: interactionData.patientId,
          medication1Name: interactionData.medication1Name,
          medication1Dosage: interactionData.medication1Dosage || "",
          medication1Frequency: interactionData.medication1Frequency,
          medication2Name: interactionData.medication2Name,
          medication2Dosage: interactionData.medication2Dosage || "",
          medication2Frequency: interactionData.medication2Frequency,
          severity: interactionData.severity,
          description: interactionData.description,
          warnings: interactionData.warnings,
          recommendations: interactionData.recommendations,
          reportedBy: req.user?.id,
          notes: interactionData.notes
        })
        .returning();

      res.json({
        success: true,
        interaction: newInteraction,
        message: "Drug interaction added successfully"
      });
    } catch (error) {
      console.error("Add patient drug interaction error:", error);
      res.status(500).json({ error: "Failed to add drug interaction" });
    }
  });

  // GET endpoint to fetch drug interactions count and list
  app.get("/api/clinical/patient-drug-interactions", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const organizationId = req.tenant!.id;
      
      // Fetch all drug interactions for the organization
      const interactions = await db
        .select()
        .from(patientDrugInteractions)
        .where(eq(patientDrugInteractions.organizationId, organizationId));
      
      res.json({
        success: true,
        count: interactions.length,
        interactions
      });
    } catch (error) {
      console.error("Fetch patient drug interactions error:", error);
      res.status(500).json({ error: "Failed to fetch drug interactions" });
    }
  });

  // Risk Assessment endpoint - analyzes lab results and generates patient risk assessments
  app.get("/api/clinical/risk-assessments", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const organizationId = req.tenant!.id;
      
      // Fetch all lab results with patient data
      const labResults = await storage.getLabResultsByOrganization(organizationId);
      const patients = await storage.getPatientsByOrganization(organizationId);
      
      // Group lab results by patient
      const patientResultsMap = new Map<number, any[]>();
      labResults.forEach(result => {
        if (!patientResultsMap.has(result.patientId)) {
          patientResultsMap.set(result.patientId, []);
        }
        patientResultsMap.get(result.patientId)!.push(result);
      });
      
      const allAssessments = [];
      
      // Analyze each patient's lab results
      for (const [patientId, results] of patientResultsMap.entries()) {
        const patient = patients.find(p => p.id === patientId);
        if (!patient) continue;
        
        // Aggregate all test results from all lab orders
        const allTests: any[] = [];
        let hasCritical = false;
        
        results.forEach(labResult => {
          if (labResult.criticalValues) {
            hasCritical = true;
          }
          if (labResult.results && Array.isArray(labResult.results)) {
            labResult.results.forEach((test: any) => {
              allTests.push({
                testId: labResult.testId,
                testName: test.name,
                value: test.value,
                unit: test.unit,
                status: test.status,
                flag: test.flag,
                referenceRange: test.referenceRange
              });
            });
          }
        });
        
        // Cardiovascular Disease Risk Assessment
        const cvdFactors = [];
        const cvdRecommendations = [];
        let cvdScore = 0;
        
        const cholesterolTest = allTests.find(t => t.testName?.toLowerCase().includes('cholesterol'));
        const glucoseTest = allTests.find(t => t.testName?.toLowerCase().includes('glucose'));
        const hemoglobinA1cTest = allTests.find(t => t.testName?.toLowerCase().includes('hemoglobin a1c') || t.testName?.toLowerCase().includes('a1c'));
        
        if (cholesterolTest && (cholesterolTest.status === 'abnormal_high' || cholesterolTest.flag === 'HIGH')) {
          cvdFactors.push('High cholesterol');
          cvdScore += 5;
          cvdRecommendations.push('Statin therapy');
        }
        
        if (glucoseTest && parseFloat(glucoseTest.value) > 100) {
          cvdFactors.push('Elevated glucose');
          cvdScore += 3;
        }
        
        if (hasCritical) {
          cvdFactors.push('Critical lab values detected');
          cvdScore += 7;
        }
        
        // Age factor (if patient > 65)
        const age = patient.dateOfBirth ? Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 0;
        if (age > 65) {
          cvdFactors.push('Age >65');
          cvdScore += 5;
        }
        
        if (cvdScore > 0) {
          cvdRecommendations.push('Blood pressure control');
          cvdRecommendations.push('Regular cardiovascular screening');
        }
        
        // Diabetes Risk Assessment
        const diabetesFactors = [];
        const diabetesRecommendations = [];
        let diabetesScore = 0;
        
        if (glucoseTest) {
          const glucoseValue = parseFloat(glucoseTest.value);
          if (glucoseValue >= 126 || glucoseTest.status === 'abnormal_high') {
            diabetesFactors.push('High fasting glucose');
            diabetesScore += 8;
            diabetesRecommendations.push('Immediate diabetes workup');
          } else if (glucoseValue >= 100) {
            diabetesFactors.push('Prediabetes');
            diabetesScore += 4;
            diabetesRecommendations.push('Lifestyle modification');
          }
        }
        
        if (hemoglobinA1cTest) {
          const a1cValue = parseFloat(hemoglobinA1cTest.value);
          if (a1cValue >= 6.5 || hemoglobinA1cTest.status === 'abnormal_high') {
            diabetesFactors.push('Elevated HbA1c');
            diabetesScore += 8;
            diabetesRecommendations.push('Diabetes management');
          } else if (a1cValue >= 5.7) {
            diabetesFactors.push('Borderline HbA1c');
            diabetesScore += 4;
          }
        }
        
        if (diabetesScore > 0) {
          diabetesRecommendations.push('Annual glucose screening');
          diabetesRecommendations.push('Weight management');
          diabetesRecommendations.push('Diet counseling');
        }
        
        // Determine risk levels
        const getCvdRiskLevel = (score: number): 'low' | 'moderate' | 'high' | 'critical' => {
          if (score >= 15) return 'critical';
          if (score >= 10) return 'high';
          if (score >= 5) return 'moderate';
          return 'low';
        };
        
        const getDiabetesRiskLevel = (score: number): 'low' | 'moderate' | 'high' | 'critical' => {
          if (score >= 12) return 'critical';
          if (score >= 8) return 'high';
          if (score >= 4) return 'moderate';
          return 'low';
        };
        
        // Save and return assessments if there are risk factors
        if (cvdFactors.length > 0) {
          const cvdAssessment = await storage.createRiskAssessment({
            organizationId,
            patientId,
            category: 'Cardiovascular Disease',
            riskScore: cvdScore.toString(),
            riskLevel: getCvdRiskLevel(cvdScore),
            riskFactors: cvdFactors,
            recommendations: cvdRecommendations,
            basedOnLabResults: allTests.slice(0, 5),
            hasCriticalValues: hasCritical,
            assessmentDate: new Date()
          });
          allAssessments.push({
            ...cvdAssessment,
            patientName: `${patient.firstName} ${patient.lastName}`
          });
        }
        
        if (diabetesFactors.length > 0) {
          const diabetesAssessment = await storage.createRiskAssessment({
            organizationId,
            patientId,
            category: 'Diabetes',
            riskScore: diabetesScore.toString(),
            riskLevel: getDiabetesRiskLevel(diabetesScore),
            riskFactors: diabetesFactors,
            recommendations: diabetesRecommendations,
            basedOnLabResults: allTests.slice(0, 5),
            hasCriticalValues: hasCritical,
            assessmentDate: new Date()
          });
          allAssessments.push({
            ...diabetesAssessment,
            patientName: `${patient.firstName} ${patient.lastName}`
          });
        }
      }
      
      // Fetch all existing assessments from database (including the ones just created)
      const allSavedAssessments = await storage.getRiskAssessmentsByOrganization(organizationId);
      
      // Add patient details to saved assessments
      const assessmentsWithDetails = allSavedAssessments.map(assessment => {
        const patient = patients.find(p => p.id === assessment.patientId);
        
        // Calculate age if patient has date of birth
        let age = null;
        if (patient?.dateOfBirth) {
          const birthDate = new Date(patient.dateOfBirth);
          const today = new Date();
          age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
        }
        
        return {
          ...assessment,
          patientName: patient ? `${patient.firstName} ${patient.lastName}` : `Patient ${assessment.patientId}`,
          patientAge: age,
          patientGender: patient?.genderAtBirth || null,
          patientDateOfBirth: patient?.dateOfBirth || null,
          assessmentDate: assessment.assessmentDate || assessment.createdAt
        };
      });
      
      // Transform for frontend
      const transformedAssessments = assessmentsWithDetails.map((assessment: any) => ({
        category: assessment.category,
        score: parseFloat(assessment.riskScore),
        risk: assessment.riskLevel,
        factors: assessment.riskFactors || [],
        recommendations: assessment.recommendations || [],
        patientId: assessment.patientId,
        patientName: assessment.patientName,
        patientAge: assessment.patientAge,
        patientGender: assessment.patientGender,
        patientDateOfBirth: assessment.patientDateOfBirth,
        assessmentDate: assessment.assessmentDate
      }));
      
      res.json(transformedAssessments);
    } catch (error) {
      console.error("Risk assessments error:", error);
      res.status(500).json({ error: "Failed to generate risk assessments" });
    }
  });

  // AI-powered Lab Result Assessment
  app.post("/api/lab-results/:labResultId/assess", authMiddleware, requireRole(["doctor", "nurse", "admin"]), async (req: TenantRequest, res) => {
    try {
      const organizationId = req.tenant!.id;
      const labResultId = parseInt(req.params.labResultId);
      
      // Fetch the lab result
      const labResult = await storage.getLabResultById(labResultId);
      
      if (!labResult) {
        return res.status(404).json({ error: "Lab result not found" });
      }
      
      if (labResult.organizationId !== organizationId) {
        return res.status(403).json({ error: "Unauthorized access to lab result" });
      }
      
      // Get patient details
      const patient = await storage.getPatient(labResult.patientId);
      
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }
      
      // Prepare lab results for OpenAI analysis
      const labResultsText = labResult.results.map((result: any) => 
        `${result.name}: ${result.value} ${result.unit} (Reference: ${result.referenceRange}, Status: ${result.status})`
      ).join('\n');
      
      // Call OpenAI API for analysis
      const openaiApiKey = process.env.OPENAI_API_KEY;
      if (!openaiApiKey) {
        return res.status(500).json({ error: "OpenAI API key not configured" });
      }
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'You are a medical AI assistant specializing in analyzing lab results and identifying health risks. Provide concise, evidence-based risk factors and recommendations.'
            },
            {
              role: 'user',
              content: `Analyze the following lab results for a ${patient.genderAtBirth || 'patient'} patient and identify potential health risks and recommendations:\n\nLab Results:\n${labResultsText}\n\nProvide your analysis in the following JSON format:\n{\n  "riskFactors": ["factor1", "factor2", ...],\n  "recommendations": ["recommendation1", "recommendation2", ...],\n  "riskCategory": "Cardiovascular Disease|Diabetes|Kidney Disease|Liver Disease|Thyroid Disorder|Other",\n  "riskLevel": "low|moderate|high|critical",\n  "riskScore": number (0-100)\n}`
            }
          ],
          temperature: 0.3,
          max_tokens: 1000
        })
      });
      
      if (!response.ok) {
        console.error("OpenAI API error:", await response.text());
        return res.status(500).json({ error: "Failed to analyze lab results with AI" });
      }
      
      const aiResponse = await response.json();
      const aiContent = aiResponse.choices[0].message.content;
      
      // Parse AI response
      let analysis;
      try {
        analysis = JSON.parse(aiContent);
      } catch (parseError) {
        console.error("Failed to parse AI response:", aiContent);
        return res.status(500).json({ error: "Failed to parse AI analysis" });
      }
      
      // Save risk assessment to database
      const riskAssessment = await storage.createRiskAssessment({
        organizationId,
        patientId: labResult.patientId,
        category: analysis.riskCategory || 'Other',
        riskScore: analysis.riskScore.toString(),
        riskLevel: analysis.riskLevel,
        riskFactors: analysis.riskFactors || [],
        recommendations: analysis.recommendations || [],
        basedOnLabResults: labResult.results.map((r: any) => ({
          testId: labResult.testId,
          testName: r.name,
          value: r.value,
          status: r.status,
          flag: r.flag
        })),
        hasCriticalValues: labResult.criticalValues,
        assessmentDate: new Date()
      });
      
      res.json({
        success: true,
        assessment: {
          id: riskAssessment.id,
          category: riskAssessment.category,
          riskLevel: riskAssessment.riskLevel,
          riskScore: parseFloat(riskAssessment.riskScore),
          riskFactors: riskAssessment.riskFactors,
          recommendations: riskAssessment.recommendations,
          assessmentDate: riskAssessment.assessmentDate
        }
      });
    } catch (error) {
      console.error("Lab result assessment error:", error);
      res.status(500).json({ error: "Failed to assess lab results" });
    }
  });

  // Get all lab results for an organization
  app.get("/api/lab-results", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const organizationId = req.tenant!.id;
      
      // Get all patients for this organization
      const patients = await storage.getPatientsByOrganization(organizationId);
      const patientIds = patients.map(p => p.id);
      
      // Get lab results for all patients
      const allLabResults = [];
      for (const patientId of patientIds) {
        const labResults = await storage.getLabResultsByPatient(patientId);
        allLabResults.push(...labResults.filter(lr => lr.organizationId === organizationId));
      }
      
      // Get users (doctors) to map testOrderedBy
      const users = await storage.getUsersByOrganization(organizationId);
      
      // Enrich with patient and doctor names
      const enrichedResults = allLabResults.map(lr => {
        const patient = patients.find(p => p.id === lr.patientId);
        const doctor = users.find(u => u.id === lr.orderedBy);
        
        return {
          id: lr.id,
          testId: lr.testId,
          testType: lr.testType,
          patientId: lr.patientId,
          patientName: patient ? `${patient.firstName} ${patient.lastName}` : `Patient ${lr.patientId}`,
          doctorName: doctor ? (doctor.firstName && doctor.lastName ? `${doctor.firstName} ${doctor.lastName}` : doctor.email) : (lr.doctorName || `Doctor ${lr.orderedBy}`),
          testDate: lr.orderedAt,
          results: lr.results,
          criticalValues: lr.criticalValues
        };
      });
      
      res.json(enrichedResults);
    } catch (error) {
      console.error("Get all lab results error:", error);
      res.status(500).json({ error: "Failed to fetch lab results" });
    }
  });

  // Get lab results for a specific patient
  app.get("/api/patients/:patientId/lab-results", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const organizationId = req.tenant!.id;
      const patientId = parseInt(req.params.patientId);
      
      const labResults = await storage.getLabResultsByPatient(patientId);
      
      // Filter by organization
      const filteredResults = labResults.filter(lr => lr.organizationId === organizationId);
      
      res.json(filteredResults);
    } catch (error) {
      console.error("Get lab results error:", error);
      res.status(500).json({ error: "Failed to fetch lab results" });
    }
  });

  // Organization settings routes
  app.get("/api/organization/settings", requireRole(["admin"]), async (req: TenantRequest, res) => {
    try {
      const organization = await storage.getOrganization(req.tenant!.id);
      if (!organization) {
        return res.status(404).json({ error: "Organization not found" });
      }
      
      res.json({
        name: organization.name,
        region: organization.region,
        brandName: organization.brandName,
        settings: organization.settings
      });
    } catch (error) {
      console.error("Settings fetch error:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  // Prescription Management Routes
  app.get("/api/prescriptions", authMiddleware, async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Check for role-based filtering via query parameters
      const { patientId, providerId } = req.query;

      let prescriptions;

      if (patientId) {
        // Filter by patient ID (for Patient role)
        const patientIdNum = parseInt(patientId as string);
        if (isNaN(patientIdNum)) {
          return res.status(400).json({ error: "Invalid patient ID" });
        }
        console.log(`[PRESCRIPTIONS API] Filtering by patientId: ${patientIdNum}`);
        prescriptions = await storage.getPrescriptionsByPatient(patientIdNum, req.tenant!.id);
      } else if (providerId) {
        // Filter by provider ID (for Doctor role)
        const providerIdNum = parseInt(providerId as string);
        if (isNaN(providerIdNum)) {
          return res.status(400).json({ error: "Invalid provider ID" });
        }
        console.log(`[PRESCRIPTIONS API] Filtering by providerId: ${providerIdNum}`);
        prescriptions = await storage.getPrescriptionsByProvider(providerIdNum, req.tenant!.id);
      } else {
        // Return all prescriptions (for Admin, Nurse, etc.)
        console.log(`[PRESCRIPTIONS API] Returning all prescriptions for organization`);
        prescriptions = await storage.getPrescriptionsByOrganization(req.tenant!.id);
      }

      res.json(prescriptions);
    } catch (error) {
      console.error("Error fetching prescriptions:", error);
      res.status(500).json({ error: "Failed to fetch prescriptions" });
    }
  });

  // Get prescriptions by patient ID
  app.get("/api/prescriptions/patient/:patientId", authMiddleware, async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const patientId = parseInt(req.params.patientId);
      if (isNaN(patientId)) {
        return res.status(400).json({ error: "Invalid patient ID" });
      }

      const prescriptions = await storage.getPrescriptionsByPatient(patientId, req.tenant!.id);
      res.json(prescriptions);
    } catch (error) {
      console.error("Error fetching prescriptions for patient:", error);
      res.status(500).json({ error: "Failed to fetch prescriptions for patient" });
    }
  });

  app.post("/api/prescriptions", authMiddleware, async (req: TenantRequest, res) => {
    console.log("POST /api/prescriptions endpoint reached!");
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const prescriptionData = req.body;
      console.log("=== PRESCRIPTION CREATION DEBUG ===");
      console.log("Full request body:", JSON.stringify(prescriptionData, null, 2));
      console.log("Authenticated user:", {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role
      });
      console.log("Original providerId from form:", prescriptionData.providerId);
      
      // Validate required fields
      if (!prescriptionData.patientId || isNaN(parseInt(prescriptionData.patientId))) {
        return res.status(400).json({ error: "Valid patient ID is required" });
      }
      
      if (!prescriptionData.providerId || isNaN(parseInt(prescriptionData.providerId))) {
        return res.status(400).json({ error: "Valid provider ID is required" });
      }
      
      // Use the selected provider ID from the form
      const providerId = parseInt(prescriptionData.providerId);
      console.log("Using selected provider ID:", providerId);
      
      // Check for duplicate prescriptions only if created_at timestamp is exactly the same
      // This prevents accidental double-clicks but allows duplicates at different times
      const existingPrescriptions = await storage.getPrescriptionsByOrganization(req.tenant!.id);
      
      const isDuplicate = existingPrescriptions.some(existing => {
        const existingCreatedAt = existing.createdAt ? new Date(existing.createdAt).getTime() : 0;
        const newCreatedAt = new Date().getTime();
        
        // Only reject if created_at timestamps are exactly the same (same millisecond)
        // This handles double-click scenarios while allowing legitimate duplicates at different times
        return existing.patientId === parseInt(prescriptionData.patientId) &&
          existing.status === 'active' &&
          existingCreatedAt === newCreatedAt &&
          existing.medications?.some(med => 
            prescriptionData.medications?.some((newMed: any) => 
              newMed.name === med.name && 
              newMed.dosage === med.dosage
            )
          );
      });
      
      if (isDuplicate) {
        return res.status(400).json({ error: "A duplicate prescription was just created at the exact same time. Please try again." });
      }
      
      // Extract first medication for legacy columns (required for backward compatibility)
      const firstMedication = prescriptionData.medications?.[0] || {};
      
      // Create prescription data for database (with enforced created_by)
      const prescriptionToInsert = enforceCreatedBy(req, {
        organizationId: req.tenant!.id,
        patientId: parseInt(prescriptionData.patientId),
        doctorId: providerId,
        prescriptionNumber: `RX-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        status: prescriptionData.status || "active",
        diagnosis: prescriptionData.diagnosis,
        // Legacy columns (for backward compatibility with database constraints)
        medicationName: firstMedication.name || 'Not specified',
        dosage: firstMedication.dosage || '',
        frequency: firstMedication.frequency || '',
        duration: firstMedication.duration || '',
        instructions: firstMedication.instructions || '',
        // Modern JSONB columns
        medications: prescriptionData.medications || [],
        pharmacy: prescriptionData.pharmacy || {},
        notes: prescriptionData.notes,
        validUntil: prescriptionData.validUntil ? new Date(prescriptionData.validUntil) : null,
        interactions: prescriptionData.interactions || []
      }, 'prescriptionCreatedBy');

      console.log("About to create prescription with data:", prescriptionToInsert);
      const newPrescription = await storage.createPrescription(prescriptionToInsert);
      console.log("Prescription created successfully:", newPrescription.id);
      res.status(201).json(newPrescription);
    } catch (error: any) {
      console.error("DETAILED ERROR creating prescription:", error);
      console.error("Error message:", error?.message);
      console.error("Error stack:", error?.stack);
      if (error?.code) {
        console.error("Error code:", error.code);
      }
      res.status(500).json({ error: "Failed to create prescription", details: error?.message });
    }
  });

  app.patch("/api/prescriptions/:id", authMiddleware, requireRole(["admin", "doctor", "nurse"]), async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const prescriptionId = parseInt(req.params.id);
      const prescriptionData = req.body;
      
      // Update prescription data
      const prescriptionUpdates = {
        status: prescriptionData.status,
        diagnosis: prescriptionData.diagnosis,
        medications: prescriptionData.medications || [],
        pharmacy: prescriptionData.pharmacy || {},
        notes: prescriptionData.notes,
        validUntil: prescriptionData.validUntil ? new Date(prescriptionData.validUntil) : null,
        interactions: prescriptionData.interactions || []
      };

      const updatedPrescription = await storage.updatePrescription(prescriptionId, req.tenant!.id, prescriptionUpdates);
      
      if (!updatedPrescription) {
        return res.status(404).json({ error: "Prescription not found" });
      }

      res.json(updatedPrescription);
    } catch (error) {
      console.error("Error updating prescription:", error);
      res.status(500).json({ error: "Failed to update prescription" });
    }
  });

  // Send prescription to pharmacy as PDF
  app.post("/api/prescriptions/:id/send-to-pharmacy", authMiddleware, requireRole(["doctor", "nurse"]), async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const prescriptionId = parseInt(req.params.id);
      const { pharmacyData } = req.body;
      
      // Get prescription details
      const prescription = await storage.getPrescription(prescriptionId, req.tenant!.id);
      if (!prescription) {
        return res.status(404).json({ error: "Prescription not found" });
      }

      // Get patient details
      const patient = await storage.getPatient(prescription.patientId, req.tenant!.id);
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }

      // Get prescribing doctor details
      const doctor = await storage.getUser(prescription.doctorId, req.tenant!.id);
      if (!doctor) {
        return res.status(404).json({ error: "Doctor not found" });
      }

      // Update prescription with pharmacy information
      await storage.updatePrescription(prescriptionId, req.tenant!.id, {
        pharmacy: pharmacyData
      });

      // TODO: In a real implementation, generate PDF here and send via email
      // For now, simulate the process
      console.log("Sending prescription to Halo Health pharmacy:", {
        prescriptionId,
        patient: `${patient.firstName} ${patient.lastName}`,
        doctor: `${doctor.firstName} ${doctor.lastName}`,
        pharmacy: pharmacyData,
        medications: prescription.medications
      });

      res.json({ 
        success: true,
        message: "Prescription successfully sent to Halo Health pharmacy",
        pharmacy: pharmacyData,
        sentAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error sending prescription to pharmacy:", error);
      res.status(500).json({ error: "Failed to send prescription to pharmacy" });
    }
  });

  app.delete("/api/prescriptions/:id", authMiddleware, requireRole(["admin", "doctor", "nurse", "paramedic", "optician", "lab_technician", "pharmacist", "dentist", "dental_nurse", "phlebotomist", "aesthetician", "podiatrist", "physiotherapist", "physician"]), async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const prescriptionId = parseInt(req.params.id);
      
      const deletedPrescription = await storage.deletePrescription(prescriptionId, req.tenant!.id);
      
      if (!deletedPrescription) {
        return res.status(404).json({ error: "Prescription not found" });
      }

      res.json({ message: "Prescription deleted successfully", id: prescriptionId });
    } catch (error) {
      console.error("Error deleting prescription:", error);
      res.status(500).json({ error: "Failed to delete prescription" });
    }
  });

  // E-signature endpoint for prescriptions - allow all doctor-like roles, nurses, and admins to sign
  app.post("/api/prescriptions/:id/e-sign", authMiddleware, requireRole(["admin", "doctor", "nurse", "paramedic", "optician", "lab_technician", "pharmacist", "dentist", "dental_nurse", "phlebotomist", "aesthetician", "podiatrist", "physiotherapist", "physician"]), async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const prescriptionId = parseInt(req.params.id);
      const { signature } = req.body;
      
      if (!signature) {
        return res.status(400).json({ error: "Signature data is required" });
      }

      // Get prescription to verify it exists
      const prescription = await storage.getPrescription(prescriptionId, req.tenant!.id);
      if (!prescription) {
        return res.status(404).json({ error: "Prescription not found" });
      }

      // Create signature data
      const signatureData = {
        doctorSignature: signature,
        signedBy: `${(req.user as any).firstName || ''} ${(req.user as any).lastName || ''}`,
        signedAt: new Date().toISOString(),
        signerId: req.user.id
      };

      // Update prescription with signature
      const updatedPrescription = await storage.updatePrescription(prescriptionId, req.tenant!.id, {
        signature: signatureData,
        status: 'signed'
      });
      
      if (!updatedPrescription) {
        return res.status(404).json({ error: "Failed to update prescription with signature" });
      }

      res.json({ 
        success: true,
        message: "Prescription e-signed successfully",
        signature: signatureData,
        prescription: updatedPrescription
      });
    } catch (error) {
      console.error("Error e-signing prescription:", error);
      res.status(500).json({ error: "Failed to e-sign prescription" });
    }
  });

  // Lab Results Routes
  app.get("/api/lab-results", authMiddleware, async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Check for role-based filtering via query parameters
      const { patientId } = req.query;

      let labResults;

      if (patientId) {
        // Filter by patient ID (for Patient role)
        const patientIdNum = parseInt(patientId as string);
        if (isNaN(patientIdNum)) {
          return res.status(400).json({ error: "Invalid patient ID" });
        }
        console.log(`[LAB RESULTS API] Filtering by patientId: ${patientIdNum}`);
        labResults = await storage.getLabResultsByPatient(patientIdNum, req.tenant!.id);
      } else {
        // Return all lab results (for Admin, Doctor, Nurse, etc.)
        console.log(`[LAB RESULTS API] Returning all lab results for organization`);
        labResults = await storage.getLabResultsByOrganization(req.tenant!.id);
      }

      res.json(labResults);
    } catch (error) {
      console.error("Error fetching lab results:", error);
      res.status(500).json({ error: "Failed to fetch lab results" });
    }
  });

  app.post("/api/lab-results", authMiddleware, requireRole(["admin", "doctor", "nurse", "paramedic", "optician", "lab_technician", "pharmacist", "dentist", "dental_nurse", "phlebotomist", "aesthetician", "podiatrist", "physiotherapist", "physician"]), async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const labData = req.body;
      
      // Generate unique test ID
      const testId = `LAB${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      
      // Convert patientId from string to number if needed
      const patientId = typeof labData.patientId === 'string' ? 
        parseInt(labData.patientId) || null : 
        labData.patientId;
      
      if (!patientId) {
        return res.status(400).json({ error: "Valid patient ID is required" });
      }
      
      const newLabResult = await storage.createLabResult(enforceCreatedBy(req, {
        organizationId: req.tenant!.id,
        patientId: patientId,
        testId: testId,
        testType: labData.testType,
        doctorName: labData.selectedUserName || null,
        mainSpecialty: null,
        subSpecialty: null,
        priority: labData.priority || "routine",
        orderedAt: new Date(),
        status: "pending",
        reportStatus: "Lab Request Generated",
        Lab_Request_Generated: true,
        notes: labData.notes || null
      }, 'orderedBy'));

      res.status(201).json(newLabResult);
    } catch (error) {
      console.error("Error creating lab order:", error);
      res.status(500).json({ error: "Failed to create lab order" });
    }
  });

  // Update lab result
  app.put("/api/lab-results/:id", authMiddleware, requireNonPatientRole(), async (req: TenantRequest, res) => {
    try {
      console.log('[LAB-RESULTS-UPDATE] Request user:', {
        userId: req.user?.id,
        userEmail: req.user?.email,
        userRole: req.user?.role,
        hasUser: !!req.user
      });

      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const { id } = req.params;
      const updateData = req.body;
      
      // Convert patientId from string to number if needed
      if (updateData.patientId) {
        updateData.patientId = typeof updateData.patientId === 'string' ? 
          parseInt(updateData.patientId) || null : 
          updateData.patientId;
      }

      const updatedLabResult = await storage.updateLabResult(parseInt(id), req.tenant!.id, updateData);

      if (!updatedLabResult) {
        return res.status(404).json({ error: "Lab result not found" });
      }

      res.json(updatedLabResult);
    } catch (error) {
      console.error("Error updating lab result:", error);
      res.status(500).json({ error: "Failed to update lab result" });
    }
  });

  app.delete("/api/lab-results/:id", authMiddleware, requireRole(["doctor", "nurse", "admin"]), async (req: TenantRequest, res) => {
    try {
      const labResultId = parseInt(req.params.id);
      
      if (isNaN(labResultId)) {
        return res.status(400).json({ error: "Invalid lab result ID" });
      }
      
      // Verify lab result exists and belongs to organization
      const labResults = await storage.getLabResults(req.tenant!.id);
      const labResult = labResults.find(result => result.id === labResultId);
      
      if (!labResult) {
        return res.status(404).json({ error: "Lab result not found" });
      }

      const deleted = await storage.deleteLabResult(labResultId, req.tenant!.id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Failed to delete lab result" });
      }

      res.json({ success: true, message: "Lab result deleted successfully" });
    } catch (error) {
      console.error("Lab result deletion error:", error);
      res.status(500).json({ error: "Failed to delete lab result" });
    }
  });

  // Lab Technician Dashboard - Get tests ready for result generation
  app.get("/api/lab-technician/tests", authMiddleware, requireRole(["lab_technician", "admin"]), async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const organizationId = req.tenant!.id;

      // Query lab_results joined with patients and invoices (LEFT JOIN to get all results)
      const query = `
        SELECT DISTINCT ON (lr.id)
          lr.id,
          lr.test_id as "testId",
          lr.test_type as "testType",
          lr.ordered_by as "orderedBy",
          lr.doctor_name as "doctorName",
          lr.priority,
          lr.ordered_at as "orderedAt",
          lr.status,
          lr.patient_id as "patientId",
          lr."Sample_Collected" as "sampleCollected",
          lr."Lab_Report_Generated" as "labReportGenerated",
          CONCAT(p.first_name, ' ', p.last_name) as "patientName",
          p.nhs_number as "nhsNumber",
          p.email as "patientEmail",
          i.status as "invoiceStatus",
          i.invoice_number as "invoiceNumber"
        FROM lab_results lr
        INNER JOIN patients p ON lr.patient_id = p.id AND p.organization_id = $1
        LEFT JOIN invoices i ON i.service_id = lr.test_id 
          AND i.service_type = 'lab_result'
          AND i.organization_id = $1
        WHERE lr.organization_id = $1
        ORDER BY lr.id, lr.ordered_at DESC
      `;

      const result = await pool.query(query, [organizationId]);

      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching lab technician tests:", error);
      res.status(500).json({ error: "Failed to fetch lab technician tests" });
    }
  });

  // Collect sample - Mark sample as collected
  app.post("/api/lab-results/:id/collect-sample", authMiddleware, requireRole(["admin", "sample_taker", "nurse", "lab_technician"]), async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const labResultId = parseInt(req.params.id);
      if (isNaN(labResultId)) {
        return res.status(400).json({ error: "Invalid lab result ID" });
      }

      const { notes } = req.body;

      // Fetch the lab result
      const labResults = await storage.getLabResults(req.tenant!.id);
      const labResult = labResults.find(result => result.id === labResultId);
      
      if (!labResult) {
        return res.status(404).json({ error: "Lab result not found" });
      }

      // Check if sample is already collected
      if (labResult.Sample_Collected === true) {
        return res.status(400).json({ error: "Sample already collected" });
      }

      // Update the lab result to mark sample as collected
      const updateData: any = {
        Sample_Collected: true,
        status: "Sample Collected",
        reportStatus: "Sample Ready for Testing"
      };

      // Add collection notes if provided
      if (notes) {
        updateData.notes = labResult.notes 
          ? `${labResult.notes}\n\nCollection Notes (${new Date().toLocaleString()}): ${notes}`
          : `Collection Notes (${new Date().toLocaleString()}): ${notes}`;
      }

      const updatedLabResult = await storage.updateLabResult(labResultId, req.tenant!.id, updateData);

      if (!updatedLabResult) {
        return res.status(404).json({ error: "Failed to update lab result" });
      }

      res.json({ 
        success: true, 
        message: "Sample collected successfully",
        labResult: updatedLabResult 
      });
    } catch (error) {
      console.error("Error collecting sample:", error);
      res.status(500).json({ error: "Failed to collect sample" });
    }
  });

  // Toggle Sample_Collected status
  app.patch("/api/lab-results/:id/toggle-sample-collected", authMiddleware, requireRole(["admin", "sample_taker", "nurse", "lab_technician"]), async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const labResultId = parseInt(req.params.id);
      if (isNaN(labResultId)) {
        return res.status(400).json({ error: "Invalid lab result ID" });
      }

      const { sampleCollected } = req.body;

      if (typeof sampleCollected !== 'boolean') {
        return res.status(400).json({ error: "sampleCollected must be a boolean" });
      }

      // Fetch the lab result
      const labResults = await storage.getLabResults(req.tenant!.id);
      const labResult = labResults.find(result => result.id === labResultId);
      
      if (!labResult) {
        return res.status(404).json({ error: "Lab result not found" });
      }

      // Update the lab result using direct pool query
      const result = await pool.query(
        'UPDATE lab_results SET "Sample_Collected" = $1 WHERE id = $2 AND organization_id = $3 RETURNING *',
        [sampleCollected, labResultId, req.tenant!.id]
      );

      const updatedLabResult = result.rows[0];

      if (!updatedLabResult) {
        return res.status(404).json({ error: "Failed to update lab result" });
      }

      res.json({ 
        success: true, 
        message: `Sample marked as ${sampleCollected ? 'collected' : 'not collected'}`,
        labResult: updatedLabResult 
      });
    } catch (error) {
      console.error("Error toggling sample collected status:", error);
      res.status(500).json({ error: "Failed to update sample collection status" });
    }
  });

  // Get lab results joined with invoices for sample taker dashboard
  app.get("/api/lab-results/with-invoices", authMiddleware, async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const organizationId = req.tenant!.id;

      // Fetch lab results and invoices
      const labResults = await storage.getLabResults(organizationId);
      const allInvoices = await storage.getInvoicesByOrganization(organizationId);

      // Filter invoices to only include paid invoices with serviceType = "lab_result"
      const paidLabInvoices = allInvoices.filter(invoice => 
        invoice.status === 'paid' && invoice.serviceType === 'lab_result'
      );

      // Join lab results with paid invoices using polymorphic association
      const joinedData = labResults.map(labResult => {
        // Find matching paid invoice using polymorphic association (service_type + service_id matching testId)
        const matchingInvoice = paidLabInvoices.find(invoice => 
          invoice.serviceId === labResult.testId
        );

        return {
          ...labResult,
          invoice: matchingInvoice || null,
          invoiceNumber: matchingInvoice?.invoiceNumber || null,
          invoiceStatus: matchingInvoice?.status || null,
          totalAmount: matchingInvoice?.totalAmount || null,
          invoiceDate: matchingInvoice?.invoiceDate || null,
          serviceType: matchingInvoice?.serviceType || null
        };
      });

      res.json(joinedData);
    } catch (error) {
      console.error("Error fetching lab results with invoices:", error);
      res.status(500).json({ error: "Failed to fetch lab results with invoices" });
    }
  });

  // Update Sample_Collected field (toggle)
  app.patch("/api/lab-results/:id/toggle-sample-collected", authMiddleware, requireRole(["admin", "sample_taker", "nurse", "lab_technician"]), async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const labResultId = parseInt(req.params.id);
      if (isNaN(labResultId)) {
        return res.status(400).json({ error: "Invalid lab result ID" });
      }

      const { sampleCollected } = req.body;

      if (typeof sampleCollected !== 'boolean') {
        return res.status(400).json({ error: "Sample_Collected must be a boolean value" });
      }

      // Update the lab result Sample_Collected field
      const updateData: any = {
        Sample_Collected: sampleCollected,
        status: sampleCollected ? "Sample Collected" : "pending",
        reportStatus: sampleCollected ? "Sample Ready for Testing" : "Awaiting Collection"
      };

      const updatedLabResult = await storage.updateLabResult(labResultId, req.tenant!.id, updateData);

      if (!updatedLabResult) {
        return res.status(404).json({ error: "Failed to update lab result" });
      }

      res.json({ 
        success: true, 
        message: sampleCollected ? "Sample marked as collected" : "Sample marked as not collected",
        labResult: updatedLabResult 
      });
    } catch (error) {
      console.error("Error toggling sample collected status:", error);
      res.status(500).json({ error: "Failed to toggle sample collected status" });
    }
  });

  // General PATCH endpoint for lab results (by testId)
  app.patch("/api/lab-results/:testId", authMiddleware, async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const testId = req.params.testId;
      const updateData = req.body;

      // Fetch all lab results for the organization
      const labResults = await storage.getLabResults(req.tenant!.id);
      
      // Find the lab result by testId
      const labResult = labResults.find(lr => lr.testId === testId);
      
      if (!labResult) {
        return res.status(404).json({ error: "Lab result not found" });
      }

      // Update the lab result
      const updatedLabResult = await storage.updateLabResult(labResult.id, req.tenant!.id, updateData);

      if (!updatedLabResult) {
        return res.status(404).json({ error: "Failed to update lab result" });
      }

      res.json({ 
        success: true, 
        labResult: updatedLabResult 
      });
    } catch (error) {
      console.error("Error updating lab result:", error);
      res.status(500).json({ error: "Failed to update lab result" });
    }
  });

  // Apply e-signature to lab result
  app.post("/api/lab-results/:id/e-sign", authMiddleware, requireNonPatientRole(), async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const labResultId = parseInt(req.params.id);
      if (isNaN(labResultId)) {
        return res.status(400).json({ error: "Invalid lab result ID" });
      }

      const { signature } = req.body;
      if (!signature) {
        return res.status(400).json({ error: "Signature data is required" });
      }

      // Update the lab result with signature
      const updatedLabResult = await storage.updateLabResult(labResultId, req.tenant!.id, {
        signatureData: signature
      });

      if (!updatedLabResult) {
        return res.status(404).json({ error: "Lab result not found or failed to update" });
      }

      res.json({
        success: true,
        message: "E-signature applied successfully",
        labResult: updatedLabResult
      });
    } catch (error) {
      console.error("Error applying e-signature:", error);
      res.status(500).json({ error: "Failed to apply e-signature" });
    }
  });

  // Get invoices with polymorphic joins (lab_results OR medical_images)
  app.get("/api/invoices/with-services", authMiddleware, async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const organizationId = req.tenant!.id;

      // Fetch all invoices, lab results, and medical images
      const invoices = await storage.getInvoicesByOrganization(organizationId);
      const labResults = await storage.getLabResults(organizationId);
      const medicalImages = await storage.getMedicalImagesByOrganization(organizationId);

      // Join invoices with either lab_results or medical_images based on service_type
      const joinedData = invoices.map(invoice => {
        let labResult = null;
        let medicalImage = null;

        // Check service_type and join accordingly
        if (invoice.serviceType === 'lab_result' && invoice.serviceId) {
          labResult = labResults.find(lr => lr.id === invoice.serviceId);
        } else if (invoice.serviceType === 'medical_image' && invoice.serviceId) {
          medicalImage = medicalImages.find(img => img.id === invoice.serviceId);
        }

        return {
          invoiceId: invoice.id,
          patientId: invoice.patientId,
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.totalAmount,
          status: invoice.status,
          serviceType: invoice.serviceType,
          // Lab result data (if applicable)
          labResultId: labResult?.id || null,
          testType: labResult?.testType || null,
          testName: labResult?.testId || null,
          labReportStatus: labResult?.reportStatus || null,
          // Medical image data (if applicable)
          imageId: medicalImage?.id || null,
          imageType: medicalImage?.studyType || null,
          modality: medicalImage?.modality || null,
          imageStatus: medicalImage?.status || null,
          // Common fields
          invoiceDate: invoice.invoiceDate,
          createdAt: invoice.createdAt
        };
      });

      res.json(joinedData);
    } catch (error) {
      console.error("Error fetching invoices with services:", error);
      res.status(500).json({ error: "Failed to fetch invoices with services" });
    }
  });

  // Get paid lab result invoices with joined lab_results details
  app.get("/api/invoices/paid-lab-results", authMiddleware, async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const organizationId = req.tenant!.id;
      const sampleCollected = req.query.sampleCollected === 'true';
      console.log(`[PAID LAB INVOICES] Fetching for organization ${organizationId}, sampleCollected filter: ${sampleCollected}`);

      // Fetch all invoices, lab results, and patients
      const invoices = await storage.getInvoicesByOrganization(organizationId);
      const labResults = await storage.getLabResults(organizationId);
      const patients = await storage.getPatientsByOrganization(organizationId);

      console.log(`[PAID LAB INVOICES] Total invoices: ${invoices.length}`);
      console.log(`[PAID LAB INVOICES] Total lab results: ${labResults.length}`);
      console.log(`[PAID LAB INVOICES] Total patients: ${patients.length}`);

      // Filter paid invoices with serviceType = "lab_result"
      const paidInvoices = invoices.filter(invoice => invoice.status === 'paid' && invoice.serviceType === 'lab_result');
      console.log(`[PAID LAB INVOICES] Paid lab invoices found: ${paidInvoices.length}`);

      // Join with lab_results and patients
      let paidLabInvoices = paidInvoices
        .map(invoice => {
          // Match invoice.serviceId with lab_results.testId
          const labResult = labResults.find(lr => lr.testId === invoice.serviceId);
          console.log(`[PAID LAB INVOICES] Invoice ${invoice.invoiceNumber} serviceId: ${invoice.serviceId}, matched lab result: ${labResult?.testId || 'NOT FOUND'}`);

          // Match patient by patientId from invoice
          const patient = patients.find(p => p.patientId === invoice.patientId);

          return {
            // Invoice fields
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            totalAmount: invoice.totalAmount,
            invoiceStatus: invoice.status,
            invoiceDate: invoice.invoiceDate,
            serviceDate: invoice.serviceDate,
            patientId: invoice.patientId,
            serviceType: invoice.serviceType,
            serviceId: invoice.serviceId,
            // Patient fields (if matched)
            patientFirstName: patient?.firstName || null,
            patientLastName: patient?.lastName || null,
            // Lab result fields (if matched)
            testId: labResult?.testId || null,
            testType: labResult?.testType || null,
            priority: labResult?.priority || null,
            status: labResult?.status || null,
            reportStatus: labResult?.reportStatus || null,
            orderedAt: labResult?.orderedAt || null,
            Sample_Collected: labResult?.sampleCollected || false,
            Lab_Request_Generated: labResult?.labRequestGenerated || false,
            doctorName: labResult?.doctorName || null,
            notes: labResult?.notes || null,
          };
        })
        // Only include invoices that have matching lab results
        .filter(item => item.testId !== null);

      // Apply sampleCollected filter if requested
      if (sampleCollected) {
        paidLabInvoices = paidLabInvoices.filter(item => item.Sample_Collected === true);
        console.log(`[PAID LAB INVOICES] After Sample_Collected filter: ${paidLabInvoices.length}`);
      }

      console.log(`[PAID LAB INVOICES] Final results with matched lab data: ${paidLabInvoices.length}`);
      res.json(paidLabInvoices);
    } catch (error) {
      console.error("[PAID LAB INVOICES] Error:", error);
      res.status(500).json({ error: "Failed to fetch paid lab invoices" });
    }
  });

  // Generate PDF for lab result
  app.post("/api/lab-results/:id/generate-pdf", authMiddleware, requireNonPatientRole(), async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const labResultId = parseInt(req.params.id);
      if (isNaN(labResultId)) {
        return res.status(400).json({ error: "Invalid lab result ID" });
      }

      const organizationId = req.tenant!.id;

      // Fetch lab result
      const labResults = await storage.getLabResults(organizationId);
      const labResult = labResults.find(result => result.id === labResultId);
      
      if (!labResult) {
        return res.status(404).json({ error: "Lab result not found" });
      }

      // Fetch patient details
      const patient = await storage.getPatient(labResult.patientId, organizationId);
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }

      // Fetch clinic header and footer
      const clinicHeader = await storage.getActiveClinicHeader(organizationId);
      const clinicFooter = await storage.getActiveClinicFooter(organizationId);

      // Construct directory path: uploads/Lab_TestResults/{organization_id}/{patient_id}/
      const dirPath = path.join(process.cwd(), 'uploads', 'Lab_TestResults', organizationId.toString(), labResult.patientId.toString());
      
      // Ensure directory exists
      await fse.ensureDir(dirPath);

      // Construct file path with Test ID as filename
      const fileName = `${labResult.testId}.pdf`;
      const filePath = path.join(dirPath, fileName);

      // Generate PDF using jsPDF
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();

      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 20;

      // Add logo if available - logo always beside header
      const headerStartY = yPos;
      let textStartX = 105; // Default center position
      let textAlign: 'left' | 'center' | 'right' = 'center';
      
      if (clinicHeader?.logoBase64) {
        try {
          // Logo always beside header for all positions
          if (clinicHeader.logoPosition === 'left') {
            // Logo on left, text starts after logo
            doc.addImage(clinicHeader.logoBase64, 'PNG', 20, yPos, 30, 30);
            textStartX = 55;
            textAlign = 'left';
          } else if (clinicHeader.logoPosition === 'center') {
            // Logo on left, text beside it (left-aligned)
            doc.addImage(clinicHeader.logoBase64, 'PNG', 20, yPos, 30, 30);
            textStartX = 55;
            textAlign = 'left';
          } else if (clinicHeader.logoPosition === 'right') {
            // Logo on right, text ends before logo
            doc.addImage(clinicHeader.logoBase64, 'PNG', 160, yPos, 30, 30);
            textStartX = 155;
            textAlign = 'right';
          }
        } catch (error) {
          console.error('Error adding logo to PDF:', error);
        }
      } else if (clinicHeader?.logoPosition) {
        // No logo but position is set - align text accordingly
        if (clinicHeader.logoPosition === 'left') {
          textStartX = 20;
          textAlign = 'left';
        } else if (clinicHeader.logoPosition === 'right') {
          textStartX = pageWidth - 20;
          textAlign = 'right';
        }
      }

      // Header - Clinic Name
      if (clinicHeader?.clinicName) {
        doc.setFontSize(parseInt(clinicHeader.clinicNameFontSize || '24'));
        doc.setFont(clinicHeader.fontFamily || 'helvetica', clinicHeader.fontWeight || 'bold');
        doc.text(clinicHeader.clinicName, textStartX, yPos, { align: textAlign });
        yPos += 10;
      }

      // Clinic Details
      if (clinicHeader) {
        doc.setFontSize(parseInt(clinicHeader.fontSize || '12'));
        doc.setFont(clinicHeader.fontFamily || 'helvetica', 'normal');
        if (clinicHeader.address) {
          doc.text(clinicHeader.address, textStartX, yPos, { align: textAlign });
          yPos += 6;
        }
        if (clinicHeader.phone) {
          doc.text(clinicHeader.phone, textStartX, yPos, { align: textAlign });
          yPos += 6;
        }
        if (clinicHeader.email) {
          doc.text(clinicHeader.email, textStartX, yPos, { align: textAlign });
          yPos += 6;
        }
      }
      
      // Ensure proper spacing after header section if logo was beside it
      if (clinicHeader?.logoBase64 && (clinicHeader.logoPosition === 'left' || clinicHeader.logoPosition === 'center')) {
        const headerEndY = yPos;
        const logoEndY = headerStartY + 30;
        if (logoEndY > headerEndY) {
          yPos = logoEndY + 5;
        }
      }

      yPos += 10;

      // Lab Order Information Section
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('Lab Order Information', 20, yPos);
      yPos += 10;

      // Create two-column layout for lab order info
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      
      const leftX = 20;
      const rightX = 120;
      let leftY = yPos;
      let rightY = yPos;

      // Left column
      doc.setFont('helvetica', 'bold');
      doc.text('Patient Name:', leftX, leftY);
      doc.setFont('helvetica', 'normal');
      doc.text(`${patient.firstName} ${patient.lastName}`, leftX + 35, leftY);
      leftY += 7;

      doc.setFont('helvetica', 'bold');
      doc.text('Test ID:', leftX, leftY);
      doc.setFont('helvetica', 'normal');
      doc.text(labResult.testId, leftX + 35, leftY);
      leftY += 7;

      doc.setFont('helvetica', 'bold');
      doc.text('Ordered Date:', leftX, leftY);
      doc.setFont('helvetica', 'normal');
      doc.text(labResult.orderedAt ? new Date(labResult.orderedAt).toLocaleDateString() : 'N/A', leftX + 35, leftY);
      leftY += 7;

      // Right column
      doc.setFont('helvetica', 'bold');
      doc.text('Ordered By:', rightX, rightY);
      doc.setFont('helvetica', 'normal');
      doc.text(req.user?.firstName ? `${req.user.firstName} ${req.user.lastName}` : 'N/A', rightX + 30, rightY);
      rightY += 7;

      doc.setFont('helvetica', 'bold');
      doc.text('Priority:', rightX, rightY);
      doc.setFont('helvetica', 'normal');
      doc.text(labResult.priority || 'normal', rightX + 30, rightY);

      yPos = Math.max(leftY, rightY) + 10;

      // Results Table - Group by test type
      if (labResult.results) {
        try {
          const results = typeof labResult.results === 'string' 
            ? JSON.parse(labResult.results) 
            : labResult.results;

          if (Array.isArray(results) && results.length > 0) {
            // Group results by test type
            const resultsByTestType: Record<string, any[]> = {};
            results.forEach((result: any) => {
              // Use the testType field from the result, or fallback to 'General Tests'
              const testType = result.testType || 'General Tests';
              
              if (!resultsByTestType[testType]) {
                resultsByTestType[testType] = [];
              }
              resultsByTestType[testType].push(result);
            });

            // Render each test type group
            Object.entries(resultsByTestType).forEach(([testType, groupResults], groupIndex) => {
              // Add extra spacing between test groups (but not before first group)
              if (groupIndex > 0) {
                yPos += 8;
              }
              
              if (yPos > 240) {
                doc.addPage();
                yPos = 20;
              }

              // Test Type Header with blue background box
              doc.setFillColor(66, 133, 244);
              doc.rect(20, yPos - 2, 170, 10, 'F');
              
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(12);
              doc.setTextColor(255, 255, 255);
              doc.text(testType, 22, yPos + 5);
              doc.setTextColor(0, 0, 0);
              yPos += 12;

              // Table Header
              const tableStartY = yPos;
              const rowHeight = 8;
              const colWidths = [60, 30, 30, 50]; // Parameter, Value, Unit, Reference Range
              const tableX = 20;
              
              // Draw header background (light gray)
              doc.setFillColor(240, 240, 240);
              doc.rect(tableX, tableStartY, colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], rowHeight, 'F');
              
              // Draw header borders
              doc.setDrawColor(200, 200, 200);
              doc.rect(tableX, tableStartY, colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], rowHeight);
              
              // Header text
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(10);
              doc.text('Parameter', tableX + 2, tableStartY + 5);
              doc.text('Value', tableX + colWidths[0] + 2, tableStartY + 5);
              doc.text('Unit', tableX + colWidths[0] + colWidths[1] + 2, tableStartY + 5);
              doc.text('Reference Range', tableX + colWidths[0] + colWidths[1] + colWidths[2] + 2, tableStartY + 5);
              
              yPos = tableStartY + rowHeight;

              // Table rows
              doc.setFont('helvetica', 'normal');
              groupResults.forEach((result: any, index: number) => {
                if (yPos > 270) {
                  doc.addPage();
                  yPos = 20;
                }

                // Alternate row background (very light gray)
                if (index % 2 === 0) {
                  doc.setFillColor(250, 250, 250);
                  doc.rect(tableX, yPos, colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], rowHeight, 'F');
                }
                
                // Draw row borders
                doc.setDrawColor(200, 200, 200);
                doc.rect(tableX, yPos, colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], rowHeight);
                
                // Draw vertical lines between columns
                doc.line(tableX + colWidths[0], yPos, tableX + colWidths[0], yPos + rowHeight);
                doc.line(tableX + colWidths[0] + colWidths[1], yPos, tableX + colWidths[0] + colWidths[1], yPos + rowHeight);
                doc.line(tableX + colWidths[0] + colWidths[1] + colWidths[2], yPos, tableX + colWidths[0] + colWidths[1] + colWidths[2], yPos + rowHeight);
                
                // Row data - use the parameter name directly
                const paramName = result.testName || result.name || '';
                
                doc.text(paramName, tableX + 2, yPos + 5);
                doc.text(String(result.value || ''), tableX + colWidths[0] + 2, yPos + 5);
                doc.text(result.unit || '', tableX + colWidths[0] + colWidths[1] + 2, yPos + 5);
                doc.text(result.referenceRange || '', tableX + colWidths[0] + colWidths[1] + colWidths[2] + 2, yPos + 5);
                
                yPos += rowHeight;
              });

              yPos += 5;
            });
          }
        } catch (e) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.text(labResult.results.toString(), 25, yPos);
          yPos += 6;
        }
      }

      // Notes
      if (labResult.notes) {
        yPos += 8;
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('Notes:', 20, yPos);
        yPos += 8;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        const splitNotes = doc.splitTextToSize(labResult.notes, 170);
        doc.text(splitNotes, 20, yPos);
      }

      // Add footer at bottom of all pages
      if (clinicFooter) {
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          // Footer text centered at bottom
          doc.text(clinicFooter.footerText, 105, 285, { align: 'center' });
        }
      }

      // Save PDF to file
      const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
      await fse.outputFile(filePath, pdfBuffer);

      console.log(`PDF generated successfully at: ${filePath}`);

      // Update labReportGenerated to true
      await storage.updateLabResult(labResultId, organizationId, {
        labReportGenerated: true
      });
      console.log(`Updated labReportGenerated to true for lab result ID: ${labResultId}`);

      // Return relative path for download
      const relativePath = `uploads/Lab_TestResults/${organizationId}/${labResult.patientId}/${fileName}`;

      res.json({
        success: true,
        message: "PDF generated successfully",
        filePath: relativePath,
        fileName: fileName,
        testId: labResult.testId
      });

    } catch (error) {
      console.error("Error generating PDF:", error);
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  });

  // Migrate lab results to add testType field to each result object
  app.post("/api/lab-results/migrate-test-types", authMiddleware, requireNonPatientRole(), async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const organizationId = req.tenant!.id;
      const labResultsList = await storage.getLabResults(organizationId);

      let updatedCount = 0;
      let alreadyMigratedCount = 0;

      for (const labResult of labResultsList) {
        if (!labResult.results || !labResult.testType) continue;

        const results = typeof labResult.results === 'string' 
          ? JSON.parse(labResult.results) 
          : labResult.results;

        if (!Array.isArray(results) || results.length === 0) continue;

        // Check if already migrated (first result has testType field)
        if (results[0]?.testType) {
          alreadyMigratedCount++;
          continue;
        }

        // Parse test types from testType field
        const testTypesStr = labResult.testType;
        let testTypes: string[] = [];
        try {
          const parsed = JSON.parse(testTypesStr);
          testTypes = Array.isArray(parsed) ? parsed : [testTypesStr];
        } catch {
          testTypes = testTypesStr.split('|').map(t => t.trim()).filter(t => t.length > 0);
        }

        // Build a map of parameter names to test types
        const TEST_FIELD_DEFINITIONS: Record<string, Array<{name: string}>> = {
          "Complete Blood Count (CBC)": [
            { name: "White Blood Cell Count (WBC)" },
            { name: "Red Blood Cell Count (RBC)" },
            { name: "Hemoglobin (Hb)" },
            { name: "Hematocrit (Hct)" },
            { name: "Mean Corpuscular Volume (MCV)" },
            { name: "Mean Corpuscular Hemoglobin (MCH)" },
            { name: "Mean Corpuscular Hemoglobin Concentration (MCHC)" },
            { name: "Platelet Count" },
            { name: "Red Cell Distribution Width (RDW)" },
          ],
          "Hormonal tests (Cortisol, ACTH)": [
            { name: "Cortisol (AM)" },
            { name: "Cortisol (PM)" },
            { name: "ACTH (Adrenocorticotropic Hormone)" },
            { name: "24-hour Urinary Free Cortisol" },
          ],
          "Viral Panels / PCR Tests (e.g. COVID-19, Influenza)": [
            { name: "COVID-19 PCR" },
            { name: "Influenza A PCR" },
            { name: "Influenza B PCR" },
            { name: "RSV PCR" },
          ],
          "Bacterial Culture/Sensitivity Testing": [
            { name: "Culture Result" },
            { name: "Gram Stain" },
            { name: "AFB (Acid-Fast Bacilli)" },
            { name: "Fungal Culture" },
          ],
        };

        // Create parameter name to testType mapping
        const paramToTestType: Record<string, string> = {};
        testTypes.forEach(testType => {
          const fields = TEST_FIELD_DEFINITIONS[testType];
          if (fields) {
            fields.forEach(field => {
              paramToTestType[field.name] = testType;
            });
          }
        });

        // Update results array with testType field
        const updatedResults = results.map((result: any) => {
          const paramName = result.testName || result.name || '';
          const testType = paramToTestType[paramName] || testTypes[0] || 'General Tests';
          return {
            ...result,
            testType
          };
        });

        // Update lab result in database
        await storage.updateLabResult(labResult.id!, organizationId, {
          results: JSON.stringify(updatedResults)
        });

        updatedCount++;
      }

      res.json({
        success: true,
        message: `Migration completed: ${updatedCount} lab results updated, ${alreadyMigratedCount} already migrated`,
        updatedCount,
        alreadyMigratedCount
      });

    } catch (error) {
      console.error("Error migrating lab results:", error);
      res.status(500).json({ error: "Failed to migrate lab results" });
    }
  });

  // Get Lab Result PDF Path
  app.get("/api/lab-results/:id/pdf-path", authMiddleware, async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const labResultId = parseInt(req.params.id);
      if (isNaN(labResultId)) {
        return res.status(400).json({ error: "Invalid lab result ID" });
      }

      const organizationId = req.tenant!.id;

      // Fetch lab result
      const labResults = await storage.getLabResults(organizationId);
      const labResult = labResults.find(result => result.id === labResultId);
      
      if (!labResult) {
        return res.status(404).json({ error: "Lab result not found" });
      }

      // Construct file path: uploads/Lab_TestResults/{organization_id}/{patient_id}/{TestID}.pdf
      const fileName = `${labResult.testId}.pdf`;
      const relativePath = `uploads/Lab_TestResults/${organizationId}/${labResult.patientId}/${fileName}`;
      const fullPath = path.join(process.cwd(), relativePath);

      // Check if file exists
      const fileExists = await fse.pathExists(fullPath);
      console.log(`[PDF-PATH] Checking file: ${fullPath}, exists: ${fileExists}`);
      if (!fileExists) {
        console.log(`[PDF-PATH] File not found, returning null`);
        return res.json({ pdfPath: null, error: "PDF file not found" });
      }

      console.log(`[PDF-PATH] File found, returning path: ${relativePath}`);
      res.json({ pdfPath: relativePath });

    } catch (error) {
      console.error("Error getting PDF path:", error);
      res.status(500).json({ error: "Failed to get PDF path" });
    }
  });

  // Generate and save lab test results as PDF
  app.post("/api/lab-results/generate", authMiddleware, async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      console.log("📥 RAW REQUEST BODY:", JSON.stringify(req.body, null, 2));
      
      const { labResultId, testId, patientId, testData, testTypes, testFieldDefinitions } = req.body;
      const organizationId = req.tenant!.id;

      console.log("📥 PDF generation request parsed:", JSON.stringify({
        labResultId,
        testId,
        patientId,
        testDataKeys: Object.keys(testData || {}),
        testTypes,
        hasTestFieldDefinitions: !!testFieldDefinitions
      }, null, 2));

      // Validate required fields (testData can be empty object - all fields are optional)
      if (!labResultId || !testId || !patientId || testData === undefined || testData === null) {
        console.error("❌ Missing required fields:", { labResultId, testId, patientId, hasTestData: testData !== undefined && testData !== null });
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Fetch lab result details
      const labResults = await storage.getLabResults(organizationId);
      const labResult = labResults.find(result => result.id === labResultId);
      
      if (!labResult) {
        return res.status(404).json({ error: "Lab result not found" });
      }

      // Fetch patient details
      const patients = await storage.getPatientsByOrganization(organizationId);
      const patient = patients.find((p: any) => p.id === patientId);

      // Fetch doctor details
      const users = await storage.getUsersByOrganization(organizationId);
      const doctor = users.find((u: any) => u.id === labResult.orderedBy);

      // Fetch clinic header and footer
      const clinicHeaders = await db
        .select()
        .from(schema.clinicHeaders)
        .where(eq(schema.clinicHeaders.organizationId, organizationId))
        .limit(1);
      
      const clinicFooters = await db
        .select()
        .from(schema.clinicFooters)
        .where(eq(schema.clinicFooters.organizationId, organizationId))
        .limit(1);

      const clinicHeader = clinicHeaders[0];
      const clinicFooter = clinicFooters[0];

      // Create directory structure
      const dirPath = path.join(process.cwd(), `uploads/Lab_TestResults/${organizationId}/${patientId}`);
      await fse.ensureDir(dirPath);

      // Generate filename
      const fileName = `${testId}.pdf`;
      const filePath = path.join(dirPath, fileName);

      // Import PDF library
      const { default: PDFDocument } = await import('pdfkit');
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      
      // Create write stream
      const stream = fse.createWriteStream(filePath);
      doc.pipe(stream);

      let yPosition = 50;

      // Add Header
      if (clinicHeader) {
        // Add logo if present
        if (clinicHeader.logoBase64) {
          try {
            const base64Data = clinicHeader.logoBase64.replace(/^data:image\/\w+;base64,/, '');
            const logoBuffer = Buffer.from(base64Data, 'base64');
            doc.image(logoBuffer, 50, yPosition, { width: 80, height: 80 });
          } catch (err) {
            console.error('Error adding logo:', err);
          }
        }

        // Add clinic info next to logo
        doc.fontSize(16).font('Helvetica-Bold').text(clinicHeader.clinicName, 150, yPosition);
        yPosition += 20;
        
        if (clinicHeader.address) {
          doc.fontSize(10).font('Helvetica').text(clinicHeader.address, 150, yPosition);
          yPosition += 15;
        }
        if (clinicHeader.phone) {
          doc.text(clinicHeader.phone, 150, yPosition);
          yPosition += 15;
        }
        if (clinicHeader.email) {
          doc.text(clinicHeader.email, 150, yPosition);
          yPosition += 15;
        }
      }

      yPosition += 30;

      // Lab Order Information Section
      doc.fontSize(14).font('Helvetica-Bold').text('Lab Order Information', 50, yPosition);
      yPosition += 25;

      // Two column layout for lab order info
      const leftCol = 50;
      const rightCol = 320;

      doc.fontSize(10).font('Helvetica-Bold').text('Patient Name:', leftCol, yPosition);
      doc.font('Helvetica').text(patient ? `${patient.firstName} ${patient.lastName}` : 'N/A', leftCol + 100, yPosition);
      
      doc.font('Helvetica-Bold').text('Ordered By:', rightCol, yPosition);
      doc.font('Helvetica').text(doctor ? `${doctor.firstName} ${doctor.lastName}` : 'N/A', rightCol + 80, yPosition);
      yPosition += 20;

      doc.font('Helvetica-Bold').text('Test ID:', leftCol, yPosition);
      doc.font('Helvetica').text(testId, leftCol + 100, yPosition);
      
      doc.font('Helvetica-Bold').text('Priority:', rightCol, yPosition);
      doc.font('Helvetica').text(labResult.priority || 'routine', rightCol + 80, yPosition);
      yPosition += 20;

      doc.font('Helvetica-Bold').text('Ordered Date:', leftCol, yPosition);
      doc.font('Helvetica').text(labResult.orderedAt ? new Date(labResult.orderedAt).toLocaleDateString('en-GB') : 'N/A', leftCol + 100, yPosition);
      yPosition += 35;

      // Test Results
      if (testTypes && Array.isArray(testTypes)) {
        for (let idx = 0; idx < testTypes.length; idx++) {
          const testType = testTypes[idx];
          
          // Check if we need a new page
          if (yPosition > 700) {
            doc.addPage();
            yPosition = 50;
          }

          // Test type header with blue background
          doc.rect(50, yPosition, 495, 25).fill('#4A7DFF');
          doc.fontSize(12).font('Helvetica-Bold').fillColor('#FFFFFF').text(`${idx + 1}. ${testType}`, 55, yPosition + 7);
          yPosition += 30;

          // Table headers
          doc.fillColor('#000000').fontSize(9).font('Helvetica-Bold');
          doc.text('Parameter', 55, yPosition);
          doc.text('Value', 230, yPosition);
          doc.text('Unit', 330, yPosition);
          doc.text('Reference Range', 410, yPosition);
          yPosition += 20;

          // Find all fields for this test type that have values (not empty strings)
          const fields = Object.keys(testData).filter(key => 
            key.startsWith(`${testType}_`) && 
            testData[key] && 
            testData[key].toString().trim() !== ''
          );
          
          if (fields.length > 0) {
            doc.fontSize(9).font('Helvetica');
            
            fields.forEach(fieldKey => {
              const fieldName = fieldKey.replace(`${testType}_`, '');
              const fieldValue = testData[fieldKey];
              
              // Find matching field definition for unit and reference range
              const fieldDef = testFieldDefinitions && testFieldDefinitions[testType] 
                ? testFieldDefinitions[testType].find((f: any) => f.name === fieldName)
                : null;
              
              const unit = fieldDef?.unit || '';
              const referenceRange = fieldDef?.referenceRange || '';
              
              // Check if we need a new page
              if (yPosition > 720) {
                doc.addPage();
                yPosition = 50;
              }

              // Draw table row with actual values only
              doc.text(fieldName, 55, yPosition, { width: 170 });
              doc.text(fieldValue.toString(), 230, yPosition, { width: 95 });
              doc.text(unit, 330, yPosition, { width: 75 });
              doc.text(referenceRange, 410, yPosition, { width: 135 });
              yPosition += 18;
            });
          } else {
            // Only show "no data" message if this test type was supposed to have data but doesn't
            doc.fontSize(9).font('Helvetica-Oblique').text('No data entered for this test type.', 55, yPosition);
            yPosition += 20;
          }

          yPosition += 15;
        }
      }

      // Clinical Notes
      if (testData.clinicalNotes) {
        if (yPosition > 650) {
          doc.addPage();
          yPosition = 50;
        }

        doc.fontSize(12).font('Helvetica-Bold').text('Clinical Notes (Optional)', 50, yPosition);
        yPosition += 20;
        doc.fontSize(10).font('Helvetica').text(testData.clinicalNotes, 50, yPosition, { width: 495 });
      }

      // Add Footer
      if (clinicFooter) {
        doc.rect(0, 750, 595, 92).fill(clinicFooter.backgroundColor || '#4A7DFF');
        doc.fontSize(10).font('Helvetica')
          .fillColor(clinicFooter.textColor || '#FFFFFF')
          .text(clinicFooter.footerText, 50, 770, { align: 'center', width: 495 });
      }

      // Finalize PDF
      doc.end();

      // Wait for file to be written
      await new Promise((resolve, reject) => {
        stream.on('finish', resolve);
        stream.on('error', reject);
      });

      console.log(`Lab result PDF generated successfully at: ${filePath}`);

      // Return relative path
      const relativePath = `uploads/Lab_TestResults/${organizationId}/${patientId}/${fileName}`;

      res.json({
        success: true,
        message: "Lab result generated successfully",
        filePath: relativePath,
        fileName: fileName,
        testId: testId
      });

    } catch (error) {
      console.error("Error generating lab result:", error);
      res.status(500).json({ error: "Failed to generate lab result" });
    }
  });

  // Check if lab result PDF file exists
  app.get("/api/files/:id/exists", authMiddleware, async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const labResultId = parseInt(req.params.id);
      if (isNaN(labResultId)) {
        return res.status(400).json({ error: "Invalid file ID" });
      }

      const organizationId = req.tenant!.id;

      // Fetch lab result
      const labResults = await storage.getLabResults(organizationId);
      const labResult = labResults.find(result => result.id === labResultId);
      
      if (!labResult) {
        return res.status(404).json({ error: "Lab result not found" });
      }

      // Construct file path
      const fileName = `${labResult.testId}.pdf`;
      const fullPath = path.join(process.cwd(), `uploads/Lab_TestResults/${organizationId}/${labResult.patientId}/${fileName}`);

      // Check if file exists
      const fileExists = await fse.pathExists(fullPath);

      res.json({ exists: fileExists });

    } catch (error) {
      console.error("Error checking file existence:", error);
      res.status(500).json({ error: "Failed to check file existence" });
    }
  });

  // Generate temporary signed URL for lab result PDF (HIPAA/GDPR compliant)
  app.get("/api/files/:id/signed-url", authMiddleware, async (req: TenantRequest, res) => {
    try {
      console.log(`[SIGNED-URL-REQUEST] Headers:`, {
        protocol: req.protocol,
        xForwardedProto: req.get('x-forwarded-proto'),
        host: req.get('host'),
        xForwardedHost: req.get('x-forwarded-host'),
        referer: req.get('referer'),
        origin: req.get('origin')
      });

      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const labResultId = parseInt(req.params.id);
      if (isNaN(labResultId)) {
        return res.status(400).json({ error: "Invalid file ID" });
      }

      const organizationId = req.tenant!.id;

      // Fetch lab result to verify access
      const labResults = await storage.getLabResults(organizationId);
      const labResult = labResults.find(result => result.id === labResultId);
      
      if (!labResult) {
        return res.status(404).json({ error: "Lab result not found" });
      }

      // Verify user has access to this patient's data
      if (req.user.role === 'patient') {
        const patients = await storage.getPatients(organizationId);
        const userPatient = patients.find(p => p.userId === req.user!.id);
        if (!userPatient || userPatient.id !== labResult.patientId) {
          return res.status(403).json({ error: "Access denied to this lab result" });
        }
      }

      // Generate temporary signed token (valid for 5 minutes)
      const fileSecret = process.env.FILE_SECRET;
      if (!fileSecret) {
        console.error("FILE_SECRET not configured");
        return res.status(500).json({ error: "Server configuration error" });
      }

      const token = jwt.sign(
        { 
          fileId: labResultId,
          organizationId: organizationId,
          patientId: labResult.patientId,
          testId: labResult.testId,
          userId: req.user.id
        }, 
        fileSecret, 
        { expiresIn: "5m" }
      );

      // Get the correct protocol and host for production environments
      // Try to extract baseURL from origin or referer header to avoid port issues
      let baseUrl;
      const origin = req.get('origin');
      const referer = req.get('referer');
      
      if (origin) {
        // Use origin if available (most reliable)
        baseUrl = origin;
      } else if (referer) {
        // Extract base URL from referer
        const url = new URL(referer);
        baseUrl = `${url.protocol}//${url.host}`;
      } else {
        // Fallback to constructing from headers
        const protocol = req.get('x-forwarded-proto') || req.protocol || 'https';
        let host = req.get('x-forwarded-host') || req.get('host') || req.headers.host;
        
        // Remove port if it's 5000 (development port shouldn't be in production URLs)
        if (typeof host === 'string' && host.includes(':5000')) {
          host = host.replace(':5000', '');
        }
        
        baseUrl = `${protocol}://${host}`;
      }
      
      const signedUrl = `${baseUrl}/api/files/view/${labResultId}?token=${token}`;
      
      console.log(`[SIGNED-URL] Generated for lab result ${labResultId}, valid for 5 minutes`);
      console.log(`[SIGNED-URL] Base URL: ${baseUrl}`);
      console.log(`[SIGNED-URL] Full signed URL: ${signedUrl}`);
      res.json({ signedUrl });

    } catch (error) {
      console.error("Error generating signed URL:", error);
      res.status(500).json({ error: "Failed to generate signed URL" });
    }
  });

  // View lab result PDF using temporary signed URL (no authentication required - token validated)
  app.get("/api/files/view/:id", async (req, res) => {
    try {
      const { token } = req.query;
      if (!token || typeof token !== 'string') {
        return res.status(403).json({ error: "Missing or invalid token" });
      }

      const fileSecret = process.env.FILE_SECRET;
      if (!fileSecret) {
        console.error("FILE_SECRET not configured");
        return res.status(500).json({ error: "Server configuration error" });
      }

      // Verify and decode token
      let payload: any;
      try {
        payload = jwt.verify(token, fileSecret);
      } catch (err) {
        console.log("[FILE-VIEW] Token verification failed:", err);
        return res.status(403).json({ error: "Invalid or expired link" });
      }

      const { fileId, organizationId, patientId, testId } = payload;
      
      // Construct file path
      const fileName = `${testId}.pdf`;
      const relativePath = `uploads/Lab_TestResults/${organizationId}/${patientId}/${fileName}`;
      const fullPath = path.join(process.cwd(), relativePath);

      // Check if file exists
      const fileExists = await fse.pathExists(fullPath);
      if (!fileExists) {
        console.log(`[FILE-VIEW] File not found: ${fullPath}`);
        return res.status(404).json({ error: "File not found" });
      }

      console.log(`[FILE-VIEW] Serving file: ${fullPath}`);
      
      // Set headers for PDF viewing
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="' + fileName + '"');
      
      // Stream the file
      res.sendFile(fullPath);

    } catch (error) {
      console.error("Error viewing file:", error);
      res.status(500).json({ error: "Failed to view file" });
    }
  });

  // Generate temporary signed URL for imaging report PDF (HIPAA/GDPR compliant)
  app.get("/api/imaging-files/:id/signed-url", authMiddleware, async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const imageId = req.params.id;
      if (!imageId) {
        return res.status(400).json({ error: "Invalid image ID" });
      }

      const organizationId = req.tenant!.id;

      // Fetch medical image to verify access
      const medicalImages = await storage.getMedicalImagesByOrganization(organizationId);
      const medicalImage = medicalImages.find(img => img.imageId === imageId);

      if (!medicalImage) {
        return res.status(404).json({ error: "Medical image not found" });
      }

      const fileSecret = process.env.FILE_SECRET;
      if (!fileSecret) {
        console.error("FILE_SECRET not configured");
        return res.status(500).json({ error: "Server configuration error" });
      }

      const token = jwt.sign(
        { 
          fileId: medicalImage.id,
          imageId: imageId,
          organizationId: organizationId,
          patientId: medicalImage.patientId,
          userId: req.user.id
        }, 
        fileSecret, 
        { expiresIn: "5m" }
      );

      // Get the correct protocol and host for production environments
      // Try to extract baseURL from origin or referer header to avoid port issues
      let baseUrl;
      const origin = req.get('origin');
      const referer = req.get('referer');
      
      if (origin) {
        // Use origin if available (most reliable)
        baseUrl = origin;
      } else if (referer) {
        // Extract base URL from referer
        const url = new URL(referer);
        baseUrl = `${url.protocol}//${url.host}`;
      } else {
        // Fallback to constructing from headers
        const protocol = req.get('x-forwarded-proto') || req.protocol || 'https';
        let host = req.get('x-forwarded-host') || req.get('host') || req.headers.host;
        
        // Remove port if it's 5000 (development port shouldn't be in production URLs)
        if (typeof host === 'string' && host.includes(':5000')) {
          host = host.replace(':5000', '');
        }
        
        baseUrl = `${protocol}://${host}`;
      }
      
      const signedUrl = `${baseUrl}/api/imaging-files/view/${imageId}?token=${token}`;
      
      console.log(`[SIGNED-URL] Generated for imaging report ${imageId}, valid for 5 minutes`);
      console.log(`[SIGNED-URL] Base URL: ${baseUrl}`);
      console.log(`[SIGNED-URL] Full signed URL: ${signedUrl}`);
      res.json({ signedUrl });

    } catch (error) {
      console.error("Error generating signed URL for imaging:", error);
      res.status(500).json({ error: "Failed to generate signed URL" });
    }
  });

  // View imaging report PDF using temporary signed URL (no authentication required - token validated)
  app.get("/api/imaging-files/view/:id", async (req, res) => {
    try {
      const { token } = req.query;
      if (!token || typeof token !== 'string') {
        return res.status(403).json({ error: "Missing or invalid token" });
      }

      const fileSecret = process.env.FILE_SECRET;
      if (!fileSecret) {
        console.error("FILE_SECRET not configured");
        return res.status(500).json({ error: "Server configuration error" });
      }

      // Verify and decode token
      let payload: any;
      try {
        payload = jwt.verify(token, fileSecret);
      } catch (err) {
        console.log("[IMAGING-VIEW] Token verification failed:", err);
        return res.status(403).json({ error: "Invalid or expired link" });
      }

      const { imageId, organizationId, patientId } = payload;
      
      // Construct file path
      const fileName = `${imageId}.pdf`;
      const relativePath = `uploads/Imaging_Reports/${organizationId}/patients/${patientId}/${fileName}`;
      const fullPath = path.join(process.cwd(), relativePath);

      // Check if file exists
      const fileExists = await fse.pathExists(fullPath);
      if (!fileExists) {
        console.log(`[IMAGING-VIEW] File not found: ${fullPath}`);
        return res.status(404).json({ error: "File not found" });
      }

      console.log(`[IMAGING-VIEW] Serving file: ${fullPath}`);
      
      // Set headers for PDF viewing
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="' + fileName + '"');
      
      // Stream the file
      res.sendFile(fullPath);

    } catch (error) {
      console.error("Error viewing imaging file:", error);
      res.status(500).json({ error: "Failed to view file" });
    }
  });

  // Imaging Routes
  app.get("/api/imaging", authMiddleware, async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const imagingStudies = [
        {
          id: "img_001",
          patientId: "p_001",
          patientName: "Sarah Johnson",
          studyType: "Chest X-Ray",
          modality: "XR",
          orderedBy: "Dr. Sarah Smith",
          orderedAt: "2024-01-15T09:00:00Z",
          scheduledAt: "2024-01-16T14:00:00Z",
          completedAt: "2024-01-16T14:30:00Z",
          status: "completed",
          findings: "No acute cardiopulmonary abnormalities identified.",
          impression: "Normal chest radiograph",
          radiologist: "Dr. Michael Johnson",
          priority: "routine"
        }
      ];

      res.json(imagingStudies);
    } catch (error) {
      console.error("Error fetching imaging studies:", error);
      res.status(500).json({ error: "Failed to fetch imaging studies" });
    }
  });

  // Billing Routes
  app.get("/api/billing", authMiddleware, async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      console.log("📋 Fetching invoices from database for organization:", req.tenant!.id, "User role:", req.user.role);
      
      // Fetch all invoices from the database
      let invoices = await storage.getInvoicesByOrganization(req.tenant!.id);
      
      // Filter invoices for patient users - only show their own invoices
      if (req.user.role === "patient") {
        console.log("👤 User is a patient - filtering invoices by patient email:", req.user.email);
        
        // Find the patient record for this user to get their patientId
        const patients = await storage.getPatientsByOrganization(req.tenant!.id);
        const userPatient = patients.find(p => p.email?.toLowerCase() === req.user!.email.toLowerCase());
        
        if (userPatient) {
          console.log("✅ Found patient record:", userPatient.id, "Filtering invoices...");
          // Filter to only show invoices for this patient
          invoices = invoices.filter(inv => inv.patientId === userPatient.id);
          console.log(`📋 Filtered to ${invoices.length} invoices for patient ID ${userPatient.id}`);
        } else {
          console.log("⚠️ No patient record found for user email:", req.user.email);
          // If no patient record found, return empty array
          invoices = [];
        }
      }
      
      console.log(`✅ Returning ${invoices.length} invoices`);
      
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching billing data:", error);
      res.status(500).json({ error: "Failed to fetch billing data" });
    }
  });

  // Forms Routes
  app.get("/api/forms", authMiddleware, async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const forms = [
        {
          id: "form_001",
          title: "Patient Intake Form",
          description: "Comprehensive new patient registration",
          category: "intake",
          status: "published",
          fields: [
            {
              id: "1",
              type: "text",
              label: "Full Name",
              required: true
            },
            {
              id: "2",
              type: "email",
              label: "Email Address",
              required: true
            }
          ],
          createdAt: new Date().toISOString(),
          responses: 45
        }
      ];

      res.json(forms);
    } catch (error) {
      console.error("Error fetching forms:", error);
      res.status(500).json({ error: "Failed to fetch forms" });
    }
  });

  app.post("/api/forms", authMiddleware, requireRole(["admin", "doctor"]), async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const formData = req.body;
      
      const newForm = {
        id: `form_${Date.now()}`,
        ...formData,
        createdBy: req.user.id,
        createdAt: new Date().toISOString(),
        status: "draft",
        responses: 0
      };

      res.status(201).json(newForm);
    } catch (error) {
      console.error("Error creating form:", error);
      res.status(500).json({ error: "Failed to create form" });
    }
  });

  // Analytics endpoints
  app.get("/api/analytics", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const analytics = await storage.getAnalytics(req.tenant!.id);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // Automation endpoints
  app.get("/api/automation/rules", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const rules = await storage.getAutomationRules(req.tenant!.id);
      res.json(rules);
    } catch (error) {
      console.error("Error fetching automation rules:", error);
      res.status(500).json({ error: "Failed to fetch automation rules" });
    }
  });

  app.get("/api/automation/stats", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const stats = await storage.getAutomationStats(req.tenant!.id);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching automation stats:", error);
      res.status(500).json({ error: "Failed to fetch automation stats" });
    }
  });

  app.post("/api/automation/rules/:id/toggle", authMiddleware, requireRole(["admin", "doctor"]), async (req: TenantRequest, res) => {
    try {
      const rule = await storage.toggleAutomationRule(req.params.id, req.tenant!.id);
      res.json(rule);
    } catch (error) {
      console.error("Error toggling automation rule:", error);
      res.status(500).json({ error: "Failed to toggle automation rule" });
    }
  });

  // Reset Twilio client endpoint
  app.post("/api/messaging/reset-twilio", authMiddleware, requireRole(["admin"]), async (req: TenantRequest, res) => {
    try {
      const { resetTwilioClient } = await import('./messaging-service');
      const success = resetTwilioClient();
      res.json({ 
        success, 
        message: success ? 'Twilio client reset successfully' : 'Failed to reset Twilio client - check credentials' 
      });
    } catch (error) {
      console.error("Error resetting Twilio client:", error);
      res.status(500).json({ error: "Failed to reset Twilio client" });
    }
  });

  // Messaging endpoints
  app.get("/api/messaging/conversations", authMiddleware, async (req: TenantRequest, res) => {
    try {
      console.log('🔍 CONVERSATIONS REQUEST - Headers:', JSON.stringify({
        'x-tenant-subdomain': req.headers['x-tenant-subdomain'],
        'authorization': req.headers['authorization'] ? 'present' : 'missing'
      }));
      console.log('🔍 TENANT INFO:', JSON.stringify(req.tenant));
      console.log('🔍 USER INFO:', JSON.stringify(req.user));
      
      const orgId = req.user?.organizationId || req.tenant?.id || 1; // Fallback to org 1
      console.log(`🔍 USING ORG ID: ${orgId}`);
      
      const conversations = await storage.getConversations(orgId, req.user?.id);
      console.log(`🔍 RETURNED CONVERSATIONS: ${conversations.length}`);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.get("/api/messaging/messages/:conversationId", authMiddleware, async (req: TenantRequest, res) => {
    try {
      // Add cache-busting headers to prevent stale reads
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      const messages = await storage.getMessages(req.params.conversationId, req.tenant!.id);
      console.log(`🔍 API GET MESSAGES - Returning ${messages.length} messages for conversation ${req.params.conversationId}`);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Endpoint to debug conversations
  app.get("/api/messaging/debug", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const conversations = await storage.getConversations(req.tenant!.id, req.user?.id);
      console.log("🔍 DEBUG - Raw conversations:", JSON.stringify(conversations, null, 2));
      res.json({ conversations, count: conversations.length });
    } catch (error) {
      console.error("Error debugging conversations:", error);
      res.status(500).json({ error: "Failed to debug conversations" });
    }
  });

  // Endpoint to fix existing duplicate conversations
  app.post("/api/messaging/consolidate", authMiddleware, async (req: TenantRequest, res) => {
    try {
      console.log("🔄 Manual consolidation triggered");
      await storage.consolidateAllDuplicateConversations(req.tenant!.id);
      res.json({ success: true, message: "Duplicate conversations consolidated" });
    } catch (error) {
      console.error("Error consolidating conversations:", error);
      res.status(500).json({ error: "Failed to consolidate conversations" });
    }
  });

  // Twilio configuration diagnostic endpoint
  app.get("/api/messaging/twilio-config", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const config = {
        phoneNumber: process.env.TWILIO_PHONE_NUMBER || null,
        accountSid: process.env.TWILIO_ACCOUNT_SID ? process.env.TWILIO_ACCOUNT_SID.substring(0, 10) + '...' : null,
        authToken: process.env.TWILIO_AUTH_TOKEN ? 'Configured' : null,
        isConfigured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER)
      };
      res.json(config);
    } catch (error) {
      console.error("Error checking Twilio config:", error);
      res.status(500).json({ error: "Failed to check configuration" });
    }
  });

  // Twilio account information endpoint
  app.get("/api/messaging/account-info", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const accountInfo = await messagingService.getAccountInfo();
      res.json(accountInfo);
    } catch (error) {
      console.error("Error getting account info:", error);
      res.status(500).json({ error: "Failed to get account information" });
    }
  });

  app.post("/api/messaging/send", authMiddleware, async (req: TenantRequest, res) => {
    try {
      console.log("Received message data:", JSON.stringify(req.body, null, 2));
      const { conversationId, recipientId, content, message: messageText, type, priority, phoneNumber, messageType } = req.body;
      
      // Add authenticated user information to message data
      const messageDataWithUser = {
        conversationId, // Include conversationId from request
        recipientId,
        content: content || messageText, // Handle both content and message fields
        type,
        priority,
        phoneNumber,
        messageType,
        senderId: req.user!.id,
        senderName: req.user!.email, // Using email as fallback since firstName/lastName might not be available
        senderRole: req.user!.role
      };
      
      // Consolidate any duplicate conversations before sending the message
      await storage.consolidateDuplicateConversations(messageDataWithUser.senderId, messageDataWithUser.recipientId, req.tenant!.id);
      
      // Store the message in the database
      const message = await storage.sendMessage(messageDataWithUser, req.tenant!.id);
      
      // If phone number is provided AND messageType is sms/whatsapp, attempt external delivery
      const recipientPhone = phoneNumber || req.body.recipient;
      if (recipientPhone && (messageType === 'sms' || messageType === 'whatsapp') && type !== 'internal') {
        try {
          const result = await messagingService.sendMessage({
            to: recipientPhone,
            message: messageDataWithUser.content,
            type: messageType,
            priority: priority || 'normal'
          });
          
          console.log(`${messageType.toUpperCase()} delivery result:`, result);
          
          if (result.success) {
            console.log(`${messageType.toUpperCase()} sent successfully:`, result.messageId);
            // Update message with delivery status and external ID
            message.deliveryStatus = 'sent';
            message.externalMessageId = result.messageId;
            
            // Start polling for delivery status after a short delay
            setTimeout(async () => {
              try {
                const status = await messagingService.getMessageStatus(result.messageId!);
                if (status) {
                  await storage.updateMessageDeliveryStatus(result.messageId!, status.status, status.errorCode, status.errorMessage);
                  console.log(`📱 Updated message ${result.messageId} status to: ${status.status}`);
                }
              } catch (error) {
                console.error('📱 Error polling message status:', error);
              }
            }, 5000); // Poll after 5 seconds
            
            return res.json(message);
          } else {
            console.error(`${messageType.toUpperCase()} sending failed:`, result.error);
            
            // Only treat as internal if credentials are completely missing (not authentication failures)
            if (result.error?.includes('not properly configured') && !process.env.TWILIO_ACCOUNT_SID) {
              console.log(`📱 Twilio not configured (missing credentials), treating SMS as internal message`);
              await storage.updateMessageDeliveryStatus(message.id, 'delivered', undefined, undefined);
              return res.json(message);
            }
            
            message.deliveryStatus = 'failed';
            message.error = result.error;
            // Return error response for failed delivery
            return res.status(400).json({ 
              error: `Failed to send ${messageType.toUpperCase()}: ${result.error}`,
              message: message
            });
          }
        } catch (twilioError: any) {
          console.error('Twilio API error:', twilioError);
          // Only treat as internal if credentials are completely missing (not authentication failures)
          if (twilioError.message?.includes('not properly configured') && !process.env.TWILIO_ACCOUNT_SID) {
            console.log(`📱 Twilio not configured (missing credentials), treating SMS as internal message`);
            await storage.updateMessageDeliveryStatus(message.id, 'delivered', undefined, undefined);
            return res.json(message);
          }
          
          message.deliveryStatus = 'failed';
          message.error = 'Failed to send via Twilio';
          // Return error response for Twilio failures
          return res.status(400).json({ 
            error: `SMS/WhatsApp delivery failed: ${twilioError.message || 'Twilio authentication error'}`,
            message: message
          });
        }
      } else if (messageType === 'email' && type !== 'internal') {
        // Handle email sending
        try {
          // Get recipient's email address
          let recipientEmail = null;
          let recipientName = 'Recipient';
          
          // Check if recipientId is a number (ID) or string (name)
          if (typeof recipientId === 'number') {
            // Try to get recipient from users table first
            const recipientUser = await storage.getUser(recipientId, req.tenant!.id);
            if (recipientUser && recipientUser.email) {
              recipientEmail = recipientUser.email;
              recipientName = recipientUser.firstName && recipientUser.lastName 
                ? `${recipientUser.firstName} ${recipientUser.lastName}`
                : recipientUser.firstName || recipientUser.email;
            } else {
              // Try to get from patients table
              const recipientPatient = await storage.getPatient(recipientId, req.tenant!.id);
              if (recipientPatient && recipientPatient.email) {
                recipientEmail = recipientPatient.email;
                recipientName = `${recipientPatient.firstName} ${recipientPatient.lastName}`;
              }
            }
          } else if (typeof recipientId === 'string') {
            // RecipientId is a name, need to look up by name
            // Try users first
            const allUsers = await storage.getUsersByOrganization(req.tenant!.id);
            const matchedUser = allUsers.find(user => {
              const fullName = `${user.firstName} ${user.lastName}`.trim();
              return fullName === recipientId || 
                     user.firstName === recipientId ||
                     user.email === recipientId;
            });
            
            if (matchedUser && matchedUser.email) {
              recipientEmail = matchedUser.email;
              recipientName = `${matchedUser.firstName} ${matchedUser.lastName}`;
            } else {
              // Try patients table
              const allPatients = await storage.getPatientsByOrganization(req.tenant!.id);
              const matchedPatient = allPatients.find(patient => {
                const fullName = `${patient.firstName} ${patient.lastName}`.trim();
                return fullName === recipientId || 
                       patient.firstName === recipientId ||
                       patient.email === recipientId;
              });
              
              if (matchedPatient && matchedPatient.email) {
                recipientEmail = matchedPatient.email;
                recipientName = `${matchedPatient.firstName} ${matchedPatient.lastName}`;
              }
            }
          }
          
          if (!recipientEmail) {
            console.error('No email address found for recipient:', recipientId);
            await storage.updateMessageDeliveryStatus(message.id, 'failed', undefined, 'No email address found for recipient');
            return res.status(400).json({ 
              error: 'Email sending failed: No email address found for recipient',
              message: message
            });
          }
          
          // Get sender's name for email
          const senderUser = await storage.getUser(req.user!.id, req.tenant!.id);
          const senderName = senderUser && senderUser.firstName && senderUser.lastName
            ? `${senderUser.firstName} ${senderUser.lastName}`
            : req.user!.email;
          
          // Send email using the email service
          const subject = req.body.subject || 'Message from your healthcare provider';
          const emailSuccess = await emailService.sendEmail({
            to: recipientEmail,
            subject: subject,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
                  ${subject}
                </h2>
                <div style="margin: 20px 0; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
                  <p style="white-space: pre-wrap;">${messageDataWithUser.content}</p>
                </div>
                <p style="color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 15px;">
                  This message was sent from your healthcare provider.<br>
                  Sent by: ${senderName}
                </p>
              </div>
            `,
            text: messageDataWithUser.content
          });
          
          if (emailSuccess) {
            console.log(`📧 Email sent successfully to ${recipientEmail}`);
            await storage.updateMessageDeliveryStatus(message.id, 'delivered', undefined, undefined);
            message.deliveryStatus = 'delivered';
            return res.json(message);
          } else {
            console.error(`📧 Email sending failed to ${recipientEmail}`);
            await storage.updateMessageDeliveryStatus(message.id, 'failed', undefined, 'Email service failed');
            message.deliveryStatus = 'failed';
            message.error = 'Email service failed';
            return res.status(400).json({ 
              error: 'Failed to send email',
              message: message
            });
          }
        } catch (emailError: any) {
          console.error('Email sending error:', emailError);
          await storage.updateMessageDeliveryStatus(message.id, 'failed', undefined, emailError.message);
          message.deliveryStatus = 'failed';
          message.error = 'Email sending error';
          return res.status(400).json({ 
            error: `Email delivery failed: ${emailError.message || 'Unknown error'}`,
            message: message
          });
        }
      } else {
        // For internal messages, mark as delivered immediately since they don't go through SMS/WhatsApp/Email
        await storage.updateMessageDeliveryStatus(message.id, 'delivered', undefined, undefined);
        console.log(`✅ Internal message ${message.id} marked as delivered`);
        
        // For internal messages, broadcast to other users via WebSocket
        // Add delay to ensure database transaction is fully committed across all connections
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Use the message's conversationId from the storage response, not messageDataWithUser
        const actualConversationId = message.conversationId;
        console.log(`🔍 DEBUG - Using actual conversationId from message: ${actualConversationId}`);
        
        // Verify the message exists in database before broadcasting
        const verifyMessage = await storage.getMessages(actualConversationId, req.tenant!.id);
        console.log(`🔍 VERIFICATION - Database contains ${verifyMessage.length} messages before broadcast`);
        
        const broadcastMessage = req.app.get('broadcastMessage');
        console.log(`🔍 DEBUG - broadcastMessage function exists:`, !!broadcastMessage);
        console.log(`🔍 DEBUG - messageDataWithUser.recipientId:`, messageDataWithUser.recipientId);
        console.log(`🔍 DEBUG - actual conversationId:`, actualConversationId);
        if (broadcastMessage && messageDataWithUser.recipientId) {
          // Try to find recipient user ID if recipientId is a name
          if (typeof messageDataWithUser.recipientId === 'string') {
            try {
              // Look up user by name for WebSocket broadcasting
              const allUsers = await storage.getUsersByOrganization(req.tenant!.id);
              const recipientUser = allUsers.find(user => 
                user.firstName + ' ' + user.lastName === messageDataWithUser.recipientId ||
                user.email === messageDataWithUser.recipientId
              );
              if (recipientUser) {
                broadcastMessage(recipientUser.id, {
                  type: 'new_message',
                  message: message,
                  conversationId: actualConversationId
                });
                console.log(`📨 Broadcasted message to recipient user ID: ${recipientUser.id}`);
              }
            } catch (error) {
              console.error('Error finding recipient for WebSocket broadcast:', error);
            }
          } else if (typeof messageDataWithUser.recipientId === 'number') {
            // Direct user ID broadcast
            broadcastMessage(messageDataWithUser.recipientId, {
              type: 'new_message', 
              message: message,
              conversationId: actualConversationId
            });
            console.log(`📨 Broadcasted message to recipient user ID: ${messageDataWithUser.recipientId}`);
          }
        }
        
        // Also broadcast to any other users who might be viewing the same conversation
        console.log(`🔍 DEBUG CONVERSATION - broadcastMessage exists:`, !!broadcastMessage);
        console.log(`🔍 DEBUG CONVERSATION - conversationId:`, actualConversationId);
        if (broadcastMessage && actualConversationId) {
          try {
            // Get conversation data to find all participants
            console.log(`🔍 DEBUG - Getting conversations for org: ${req.organizationId}`);
            const conversations = await storage.getConversations(req.tenant!.id);
            console.log(`🔍 DEBUG - Found ${conversations.length} conversations`);
            const currentConversation = conversations.find(c => c.id === actualConversationId);
            console.log(`🔍 DEBUG - Current conversation found:`, currentConversation ? 'YES' : 'NO');
            console.log(`🔍 DEBUG - Current conversation participants:`, currentConversation?.participants);
            
            if (currentConversation && currentConversation.participants) {
              // Get unique participant IDs from conversation participants
              const participantIds = new Set();
              console.log(`🔍 DEBUG - Processing ${currentConversation.participants.length} participants`);
              console.log(`🔍 DEBUG - Current sender user ID:`, req.user!.id);
              for (const participant of currentConversation.participants) {
                console.log(`🔍 DEBUG - Processing participant:`, participant);
                console.log(`🔍 DEBUG - Participant ID type:`, typeof participant.id, 'Value:', participant.id);
                let participantId: number | null = null;
                
                if (typeof participant.id === 'number') {
                  participantId = participant.id;
                } else if (typeof participant.id === 'string') {
                  // Try to map string participant names to actual user IDs
                  const allUsers = await storage.getUsersByOrganization(req.tenant!.id);
                  console.log(`🔍 DEBUG - Looking for participant "${participant.id}" among ${allUsers.length} users`);
                  console.log(`🔍 DEBUG - Available users:`, allUsers.map(u => ({ id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email })));
                  
                  const matchedUser = allUsers.find(user => {
                    const fullName = `${user.firstName} ${user.lastName}`.trim();
                    console.log(`🔍 DEBUG - Comparing "${participant.id}" with "${fullName}", "${user.firstName}", "${user.email}"`);
                    return fullName === participant.id || 
                           user.firstName === participant.id ||
                           user.email === participant.id;
                  });
                  
                  if (matchedUser) {
                    participantId = matchedUser.id;
                    console.log(`🔧 Mapped participant "${participant.id}" to user ID ${matchedUser.id}`);
                  } else {
                    console.log(`❌ No user found for participant "${participant.id}"`);
                    // Try to parse as number
                    const parsed = parseInt(participant.id);
                    if (!isNaN(parsed)) {
                      participantId = parsed;
                    }
                  }
                }
                
                // Add all valid numeric IDs including the current sender for real-time UI updates
                console.log(`🔍 DEBUG - Participant processing result: participantId=${participantId}, sender=${req.user!.id}, shouldAdd=${!!participantId}`);
                if (participantId) {
                  participantIds.add(participantId);
                  console.log(`🔍 DEBUG - Added participant ${participantId} to broadcast list`);
                }
              }
              
              console.log(`📨 Broadcasting to ${participantIds.size} conversation participants:`, Array.from(participantIds));
              
              // Broadcast to all conversation participants
              participantIds.forEach(userId => {
                broadcastMessage(userId, {
                  type: 'new_message',
                  message: message,
                  conversationId: actualConversationId
                });
                console.log(`📨 Broadcasted to conversation participant: ${userId}`);
              });
            }
          } catch (error) {
            console.error('Error broadcasting to conversation participants:', error);
          }
        }
        
        res.json(message);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // Fix conversation participants endpoint
  app.post("/api/messaging/fix-participants", authMiddleware, requireRole(["admin"]), async (req: TenantRequest, res) => {
    try {
      await storage.fixAllConversationParticipants(req.tenant!.id);
      res.json({ success: true, message: "All conversation participants have been fixed" });
    } catch (error) {
      console.error("Error fixing conversation participants:", error);
      res.status(500).json({ error: "Failed to fix conversation participants" });
    }
  });

  // Delete conversation endpoint
  app.delete("/api/messaging/conversations/:conversationId", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const conversationId = req.params.conversationId;
      console.log(`🗑️ DELETE CONVERSATION REQUEST: ${conversationId}`);
      
      const result = await storage.deleteConversation(conversationId, req.tenant!.id);
      
      if (result) {
        console.log(`🗑️ CONVERSATION DELETED SUCCESSFULLY: ${conversationId}`);
        res.json({ success: true, message: "Conversation deleted successfully" });
      } else {
        console.log(`🗑️ CONVERSATION NOT FOUND: ${conversationId}`);
        res.status(404).json({ error: "Conversation not found" });
      }
    } catch (error) {
      console.error("🗑️ ERROR DELETING CONVERSATION:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  app.get("/api/messaging/campaigns", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const campaigns = await storage.getMessageCampaigns(req.tenant!.id);
      res.json(campaigns);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      res.status(500).json({ error: "Failed to fetch campaigns" });
    }
  });

  app.post("/api/messaging/campaigns", authMiddleware, requireRole(["admin", "doctor"]), async (req: TenantRequest, res) => {
    try {
      const campaign = await storage.createMessageCampaign(req.body, req.tenant!.id);
      res.json(campaign);
    } catch (error) {
      console.error("Error creating campaign:", error);
      res.status(500).json({ error: "Failed to create campaign" });
    }
  });

  // Healthcare-specific messaging endpoints
  app.post("/api/messaging/appointment-reminder", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const { patientPhone, patientName, appointmentDate, doctorName, clinicName, messageType = 'sms' } = req.body;
      
      const result = await messagingService.sendAppointmentReminder(
        patientPhone,
        patientName,
        appointmentDate,
        doctorName,
        clinicName,
        messageType
      );
      
      if (result.success) {
        res.json({ success: true, messageId: result.messageId, cost: result.cost });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error) {
      console.error("Error sending appointment reminder:", error);
      res.status(500).json({ error: "Failed to send appointment reminder" });
    }
  });

  app.post("/api/messaging/lab-results", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const { patientPhone, patientName, clinicName, clinicPhone, messageType = 'sms' } = req.body;
      
      const result = await messagingService.sendLabResultsNotification(
        patientPhone,
        patientName,
        clinicName,
        clinicPhone,
        messageType
      );
      
      if (result.success) {
        res.json({ success: true, messageId: result.messageId, cost: result.cost });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error) {
      console.error("Error sending lab results notification:", error);
      res.status(500).json({ error: "Failed to send lab results notification" });
    }
  });

  app.post("/api/messaging/prescription-ready", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const { patientPhone, patientName, pharmacyName, pharmacyAddress, messageType = 'sms' } = req.body;
      
      const result = await messagingService.sendPrescriptionReady(
        patientPhone,
        patientName,
        pharmacyName,
        pharmacyAddress,
        messageType
      );
      
      if (result.success) {
        res.json({ success: true, messageId: result.messageId, cost: result.cost });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error) {
      console.error("Error sending prescription ready notification:", error);
      res.status(500).json({ error: "Failed to send prescription ready notification" });
    }
  });

  app.post("/api/messaging/emergency", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const { patientPhone, patientName, urgentMessage, clinicPhone, messageType = 'sms' } = req.body;
      
      const result = await messagingService.sendEmergencyNotification(
        patientPhone,
        patientName,
        urgentMessage,
        clinicPhone,
        messageType
      );
      
      if (result.success) {
        res.json({ success: true, messageId: result.messageId, cost: result.cost });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error) {
      console.error("Error sending emergency notification:", error);
      res.status(500).json({ error: "Failed to send emergency notification" });
    }
  });

  app.post("/api/messaging/bulk", authMiddleware, requireRole(["admin", "doctor"]), async (req: TenantRequest, res) => {
    try {
      const { recipients, message, messageType = 'sms' } = req.body;
      
      const results = await messagingService.sendBulkMessages(recipients, message, messageType);
      
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;
      
      res.json({
        success: true,
        totalSent: successCount,
        totalFailed: failureCount,
        results: results
      });
    } catch (error) {
      console.error("Error sending bulk messages:", error);
      res.status(500).json({ error: "Failed to send bulk messages" });
    }
  });

  app.get("/api/messaging/status/:messageId", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const status = await messagingService.getMessageStatus(req.params.messageId);
      if (status) {
        res.json(status);
      } else {
        res.status(404).json({ error: "Message not found" });
      }
    } catch (error) {
      console.error("Error fetching message status:", error);
      res.status(500).json({ error: "Failed to fetch message status" });
    }
  });

  app.delete("/api/messaging/messages/:messageId", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const messageId = req.params.messageId;
      console.log(`🗑️ DELETE MESSAGE REQUEST - ID: ${messageId}, Org: ${req.tenant!.id}`);
      
      const deleted = await storage.deleteMessage(messageId, req.tenant!.id);
      
      if (deleted) {
        console.log(`✅ MESSAGE DELETED - ID: ${messageId}`);
        res.json({ success: true, message: "Message deleted successfully" });
      } else {
        console.log(`❌ MESSAGE NOT FOUND - ID: ${messageId}`);
        res.status(404).json({ error: "Message not found" });
      }
    } catch (error) {
      console.error("Error deleting message:", error);
      res.status(500).json({ error: "Failed to delete message" });
    }
  });

  // Comprehensive Twilio delivery diagnostic endpoint  
  app.get("/api/messaging/delivery-diagnostic", authMiddleware, requireRole(["admin"]), async (req: TenantRequest, res) => {
    try {
      console.log('🔍 DELIVERY DIAGNOSTIC - Checking Twilio configuration and recent messages');
      
      // 1. Check Twilio credentials configuration
      const twilioConfig = {
        hasAccountSID: !!process.env.TWILIO_ACCOUNT_SID,
        hasSIDFormat: process.env.TWILIO_ACCOUNT_SID?.startsWith('AC') && process.env.TWILIO_ACCOUNT_SID?.length >= 34,
        hasAuthToken: !!process.env.TWILIO_AUTH_TOKEN,
        hasPhoneNumber: !!process.env.TWILIO_PHONE_NUMBER,
        phoneNumberFormat: process.env.TWILIO_PHONE_NUMBER || 'missing',
        authenticationFailed: false // Will be checked below
      };
      
      // 2. Get recent SMS/WhatsApp messages from database
      const allMessages = await storage.getRecentMessagesWithExternalIds(req.tenant!.id, 20);
      const recentMessages = allMessages
        .filter(msg => msg.messageType === 'sms' || msg.messageType === 'whatsapp')
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);
      console.log(`🔍 Found ${recentMessages.length} recent external messages to check`);
      
      const messageStatusChecks = [];
      
      // 3. Check delivery status for recent messages with Twilio Message SIDs
      for (const message of recentMessages.slice(0, 5)) { // Check last 5 messages
        if (message.externalMessageId) {
          try {
            console.log(`🔍 Checking status for Twilio SID: ${message.externalMessageId}`);
            const status = await messagingService.getMessageStatus(message.externalMessageId);
            
            messageStatusChecks.push({
              messageId: message.id,
              twilioSid: message.externalMessageId,
              phoneNumber: message.phoneNumber,
              messageType: message.messageType,
              content: message.content.substring(0, 50) + (message.content.length > 50 ? '...' : ''),
              sentAt: message.timestamp,
              twilioStatus: status?.status || 'unknown',
              errorCode: status?.errorCode || null,
              errorMessage: status?.errorMessage || null,
              price: status?.price || null,
              dateDelivered: status?.dateDelivered || null,
              isDelivered: status?.status === 'delivered',
              isPending: ['queued', 'sending', 'sent'].includes(status?.status),
              isFailed: ['failed', 'undelivered'].includes(status?.status)
            });
          } catch (error: any) {
            console.error(`❌ Error checking message ${message.externalMessageId}:`, error);
            messageStatusChecks.push({
              messageId: message.id,
              twilioSid: message.externalMessageId,
              phoneNumber: message.phoneNumber,
              messageType: message.messageType,
              content: message.content.substring(0, 50) + (message.content.length > 50 ? '...' : ''),
              sentAt: message.timestamp,
              twilioStatus: 'error',
              errorCode: error.code || null,
              errorMessage: error.message || 'Failed to fetch status',
              checkError: true
            });
          }
        } else {
          messageStatusChecks.push({
            messageId: message.id,
            phoneNumber: message.phoneNumber,
            messageType: message.messageType,
            content: message.content.substring(0, 50) + (message.content.length > 50 ? '...' : ''),
            sentAt: message.timestamp,
            twilioStatus: 'no_sid',
            errorMessage: 'No Twilio Message SID recorded'
          });
        }
      }
      
      // 4. Analyze common issues from the user's list
      const diagnosticSummary = {
        credentialsValid: twilioConfig.hasAccountSID && twilioConfig.hasSIDFormat && twilioConfig.hasAuthToken && twilioConfig.hasPhoneNumber,
        totalMessagesChecked: messageStatusChecks.length,
        deliveredCount: messageStatusChecks.filter(m => m.isDelivered).length,
        pendingCount: messageStatusChecks.filter(m => m.isPending).length,
        failedCount: messageStatusChecks.filter(m => m.isFailed).length,
        unknownCount: messageStatusChecks.filter(m => m.twilioStatus === 'unknown' || m.twilioStatus === 'error').length,
        commonIssues: [] as string[]
      };
      
      // Check for common issues
      const errorCodes = messageStatusChecks.map(m => m.errorCode).filter(Boolean);
      if (errorCodes.includes(21211)) {
        diagnosticSummary.commonIssues.push('Issue #4: Invalid phone number format detected (Error 21211)');
      }
      if (errorCodes.includes(21610)) {
        diagnosticSummary.commonIssues.push('Issue #4: Messages to unverified numbers in trial account (Error 21610)');
      }
      if (errorCodes.includes(30003)) {
        diagnosticSummary.commonIssues.push('Issue #1: Unreachable destination handset (Error 30003)');
      }
      if (errorCodes.includes(20003)) {
        diagnosticSummary.commonIssues.push('Issue #4: Twilio authentication failed (Error 20003)');
      }
      
      // Check for phone number format issues
      const phoneNumbers = messageStatusChecks.map(m => m.phoneNumber).filter(Boolean);
      const invalidFormats = phoneNumbers.filter(phone => !phone.startsWith('+') || phone.replace(/\D/g, '').length < 10);
      if (invalidFormats.length > 0) {
        diagnosticSummary.commonIssues.push(`Issue #1: ${invalidFormats.length} messages with incorrect phone number format`);
      }
      
      // Check for stuck messages (sent but not delivered for >1 hour)
      const stuckMessages = messageStatusChecks.filter(m => 
        m.twilioStatus === 'sent' && 
        new Date().getTime() - new Date(m.sentAt).getTime() > 3600000 // 1 hour
      );
      if (stuckMessages.length > 0) {
        diagnosticSummary.commonIssues.push(`Issue #3: ${stuckMessages.length} messages stuck in 'sent' status (carrier/network issues)`);
      }

      res.json({
        twilioConfig,
        diagnosticSummary,
        messageStatusChecks,
        recommendations: [
          "1. Verify phone numbers are in E.164 format (+country_code_phone_number)",
          "2. Check Twilio Console for detailed error messages and delivery receipts",
          "3. For WhatsApp: Ensure recipient has WhatsApp and template messages are approved",
          "4. Consider carrier restrictions and regional regulations",
          "5. Monitor delivery status changes over time (some carriers have delays)"
        ]
      });
      
    } catch (error) {
      console.error("Error running delivery diagnostic:", error);
      res.status(500).json({ error: "Failed to run delivery diagnostic" });
    }
  });

  app.get("/api/messaging/account-info", authMiddleware, requireRole(["admin"]), async (req: TenantRequest, res) => {
    try {
      const accountInfo = await messagingService.getAccountInfo();
      if (accountInfo) {
        res.json(accountInfo);
      } else {
        res.status(500).json({ error: "Failed to fetch account info" });
      }
    } catch (error) {
      console.error("Error fetching account info:", error);
      res.status(500).json({ error: "Failed to fetch account info" });
    }
  });

  // Test endpoint for SMS/WhatsApp integration
  app.post("/api/messaging/test", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const { phoneNumber, message, type = 'sms' } = req.body;
      
      if (!phoneNumber || !message) {
        return res.status(400).json({ error: "Phone number and message are required" });
      }
      
      const result = await messagingService.sendMessage({
        to: phoneNumber,
        message: message,
        type: type,
        priority: 'normal'
      });
      
      res.json({
        success: result.success,
        messageId: result.messageId,
        error: result.error,
        cost: result.cost
      });
    } catch (error) {
      console.error("Error in test messaging:", error);
      res.status(500).json({ error: "Failed to send test message" });
    }
  });

  app.get("/api/messaging/templates", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const templates = await storage.getMessageTemplates(req.tenant!.id);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  app.get("/api/messaging/analytics", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const analytics = await storage.getMessagingAnalytics(req.tenant!.id);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // Integration endpoints
  app.get("/api/integrations", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const integrations = await storage.getIntegrations(req.tenant!.id);
      res.json(integrations);
    } catch (error) {
      console.error("Error fetching integrations:", error);
      res.status(500).json({ error: "Failed to fetch integrations" });
    }
  });

  app.post("/api/integrations/connect", authMiddleware, requireRole(["admin"]), async (req: TenantRequest, res) => {
    try {
      const integration = await storage.connectIntegration(req.body, req.tenant!.id);
      res.json(integration);
    } catch (error) {
      console.error("Error connecting integration:", error);
      res.status(500).json({ error: "Failed to connect integration" });
    }
  });

  app.get("/api/integrations/webhooks", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const webhooks = await storage.getWebhooks(req.tenant!.id);
      res.json(webhooks);
    } catch (error) {
      console.error("Error fetching webhooks:", error);
      res.status(500).json({ error: "Failed to fetch webhooks" });
    }
  });

  app.post("/api/integrations/webhooks", authMiddleware, requireRole(["admin"]), async (req: TenantRequest, res) => {
    try {
      const webhook = await storage.createWebhook(req.body, req.tenant!.id);
      res.json(webhook);
    } catch (error) {
      console.error("Error creating webhook:", error);
      res.status(500).json({ error: "Failed to create webhook" });
    }
  });

  app.get("/api/integrations/api-keys", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const apiKeys = await storage.getApiKeys(req.tenant!.id);
      res.json(apiKeys);
    } catch (error) {
      console.error("Error fetching API keys:", error);
      res.status(500).json({ error: "Failed to fetch API keys" });
    }
  });

  app.post("/api/integrations/api-keys", authMiddleware, requireRole(["admin"]), async (req: TenantRequest, res) => {
    try {
      const apiKey = await storage.createApiKey(req.body, req.tenant!.id);
      res.json(apiKey);
    } catch (error) {
      console.error("Error creating API key:", error);
      res.status(500).json({ error: "Failed to create API key" });
    }
  });

  // Notification endpoints
  app.get("/api/notifications", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const userId = req.user!.id;
      const organizationId = req.tenant!.id;
      const limit = parseInt(req.query.limit as string) || 20;

      const notifications = await storage.getNotifications(userId, organizationId, limit);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.get("/api/notifications/unread-count", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const userId = req.user!.id;
      const organizationId = req.tenant!.id;

      const count = await storage.getUnreadNotificationCount(userId, organizationId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ error: "Failed to fetch unread count" });
    }
  });

  app.post("/api/notifications", authMiddleware, requireRole(["admin", "doctor", "nurse"]), async (req: TenantRequest, res) => {
    try {
      const notificationData = z.object({
        userId: z.number(),
        title: z.string().min(1),
        message: z.string().min(1),
        type: z.string(),
        priority: z.enum(["low", "normal", "high", "critical"]).default("normal"),
        relatedEntityType: z.string().optional(),
        relatedEntityId: z.number().optional(),
        actionUrl: z.string().optional(),
        isActionable: z.boolean().default(false),
        scheduledFor: z.string().optional(),
        expiresAt: z.string().optional(),
        metadata: z.object({
          patientId: z.number().optional(),
          patientName: z.string().optional(),
          appointmentId: z.number().optional(),
          prescriptionId: z.number().optional(),
          urgency: z.enum(["low", "medium", "high", "critical"]).optional(),
          department: z.string().optional(),
          requiresResponse: z.boolean().optional(),
          autoMarkAsRead: z.boolean().optional(),
          icon: z.string().optional(),
          color: z.string().optional(),
        }).optional()
      }).parse(req.body);

      const notification = await storage.createNotification({
        ...notificationData,
        organizationId: req.tenant!.id,
        scheduledFor: notificationData.scheduledFor ? new Date(notificationData.scheduledFor) : undefined,
        expiresAt: notificationData.expiresAt ? new Date(notificationData.expiresAt) : undefined,
      });

      res.status(201).json(notification);
    } catch (error) {
      console.error("Error creating notification:", error);
      res.status(500).json({ error: "Failed to create notification" });
    }
  });

  app.patch("/api/notifications/:id/read", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      const userId = req.user!.id;
      const organizationId = req.tenant!.id;

      const notification = await storage.markNotificationAsRead(notificationId, userId, organizationId);
      if (!notification) {
        return res.status(404).json({ error: "Notification not found" });
      }

      res.json(notification);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  app.patch("/api/notifications/:id/dismiss", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      const userId = req.user!.id;
      const organizationId = req.tenant!.id;

      const notification = await storage.markNotificationAsDismissed(notificationId, userId, organizationId);
      if (!notification) {
        return res.status(404).json({ error: "Notification not found" });
      }

      res.json(notification);
    } catch (error) {
      console.error("Error dismissing notification:", error);
      res.status(500).json({ error: "Failed to dismiss notification" });
    }
  });

  app.patch("/api/notifications/mark-all-read", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const userId = req.user!.id;
      const organizationId = req.tenant!.id;

      await storage.markAllNotificationsAsRead(userId, organizationId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ error: "Failed to mark all notifications as read" });
    }
  });

  app.delete("/api/notifications/:id", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      const userId = req.user!.id;
      const organizationId = req.tenant!.id;

      const success = await storage.deleteNotification(notificationId, userId, organizationId);
      if (!success) {
        return res.status(404).json({ error: "Notification not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ error: "Failed to delete notification" });
    }
  });

  // Population Health Interventions
  app.get("/api/population-health/interventions", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const organizationId = req.tenant!.id;

      // Return sample interventions data
      const sampleInterventions = [
        {
          id: 1,
          name: "Diabetes Prevention Program",
          description: "Comprehensive lifestyle intervention program designed to prevent type 2 diabetes in high-risk patients through diet modification, exercise, and behavioral changes.",
          type: "educational",
          status: "active",
          targetPopulation: "Pre-diabetic adults aged 35-65",
          duration: 16,
          budget: 25000,
          startDate: "2024-06-01",
          organizationId,
          metrics: {
            enrolled: 47,
            completed: 23,
            successRate: 78
          }
        },
        {
          id: 2,
          name: "Hypertension Monitoring Initiative",
          description: "Remote blood pressure monitoring program with automated alerts and medication adherence tracking for patients with hypertension.",
          type: "screening",
          status: "active",
          targetPopulation: "Hypertensive patients",
          duration: 24,
          budget: 18000,
          startDate: "2024-05-15",
          organizationId,
          metrics: {
            enrolled: 156,
            completed: 89,
            successRate: 85
          }
        },
        {
          id: 3,
          name: "Mental Health Screening Program",
          description: "Annual mental health screening and early intervention program for all adult patients, with focus on depression and anxiety detection.",
          type: "screening",
          status: "pending",
          targetPopulation: "All adult patients",
          duration: 52,
          budget: 32000,
          startDate: "2024-07-01",
          organizationId,
          metrics: {
            enrolled: 0,
            completed: 0,
            successRate: 0
          }
        },
        {
          id: 4,
          name: "Smoking Cessation Support Group",
          description: "Weekly group therapy sessions combined with nicotine replacement therapy and counseling for patients wanting to quit smoking.",
          type: "behavioral",
          status: "active",
          targetPopulation: "Current smokers",
          duration: 12,
          budget: 8500,
          startDate: "2024-04-20",
          organizationId,
          metrics: {
            enrolled: 28,
            completed: 19,
            successRate: 67
          }
        },
        {
          id: 5,
          name: "Childhood Obesity Prevention",
          description: "Family-based intervention program focusing on nutrition education, physical activity, and behavioral modification for overweight children.",
          type: "lifestyle",
          status: "completed",
          targetPopulation: "Children aged 6-14 with BMI >85th percentile",
          duration: 20,
          budget: 15000,
          startDate: "2024-01-15",
          organizationId,
          metrics: {
            enrolled: 35,
            completed: 32,
            successRate: 91
          }
        }
      ];

      res.json(sampleInterventions);
    } catch (error) {
      console.error("Error fetching interventions:", error);
      res.status(500).json({ error: "Failed to fetch interventions" });
    }
  });

  // AI Agent endpoints
  app.post("/api/ai-agent/chat", authMiddleware, async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const { message, conversationHistory = [] } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      // Use enhanced OpenAI-powered comprehensive chatbot for appointments, prescriptions, and general queries
      const conversationContext = {
        conversationId: `conv_${req.user.id}_${Date.now()}`,
        userId: req.user.id,
        organizationId: req.tenant!.id,
        sessionStartTime: new Date(),
        conversationHistory: conversationHistory.map((msg: any) => ({
          role: msg.role || 'user',
          content: msg.content || msg.message,
          timestamp: new Date(msg.timestamp || Date.now()),
          intent: msg.intent,
          entities: msg.entities
        })),
        userProfile: {
          medicalHistory: [],
          preferences: {},
          language: 'en',
          complexityLevel: 'intermediate' as const
        },
        contextualKnowledge: {
          recentTopics: [],
          extractedEntities: {},
          sentimentAnalysis: {
            overall: 'neutral' as const,
            confidence: 0.8
          }
        }
      };
      
      // Use OpenAI-powered comprehensive chatbot if available, fallback to local NLP
      let nlpResult;
      try {
        nlpResult = await (aiService as any).processComprehensiveChatWithOpenAI(message, conversationContext, req.tenant!.id);
      } catch (error) {
        console.log('OpenAI chatbot failed, falling back to local NLP:', error);
        nlpResult = await (aiService as any).processWithLocalNLP(message, conversationContext);
      }
      
      // Convert result to agent response format
      const aiResponse = {
        intent: nlpResult.intent,
        response: nlpResult.response,
        confidence: nlpResult.confidence,
        parameters: null,
        appointmentData: nlpResult.appointmentData,
        prescriptionData: nlpResult.prescriptionData
      };

      // Perform actions based on AI analysis
      let actionResult = null;
      let responseData = null;

      if (aiResponse.intent === 'appointment_booking' && aiResponse.appointmentData?.should_book) {
        // Appointment creation is handled internally by the AI service
        // The createAutomaticAppointment method in AI service already handles the appointment creation
        actionResult = {
          action: 'appointment_booked',
          actionDescription: `Appointment booking processed`,
          data: { processed: true }
        };
        responseData = { 
          appointmentBooked: true,
          processed: true
        };
      } else if (aiResponse.intent === 'prescription_inquiry' && aiResponse.prescriptionData?.search_query) {
        // Handle prescription search with OpenAI data
        try {
          let prescriptions: any[] = [];
          const prescriptionData = aiResponse.prescriptionData;
          
          if (prescriptionData.patient_name) {
            // Search by patient name
            const patients = await storage.getPatientsByOrganization(req.tenant!.id, 100);
            const matchingPatients = patients.filter(p => 
              `${p.firstName} ${p.lastName}`.toLowerCase().includes(prescriptionData.patient_name.toLowerCase()) ||
              p.firstName.toLowerCase().includes(prescriptionData.patient_name.toLowerCase()) ||
              p.lastName.toLowerCase().includes(prescriptionData.patient_name.toLowerCase())
            );
            
            if (matchingPatients.length > 0) {
              const allPrescriptions = await storage.getPrescriptionsByOrganization(req.tenant!.id);
              prescriptions = allPrescriptions.filter(p => 
                matchingPatients.some(patient => patient.id === p.patientId)
              );
            }
          } else if (prescriptionData.medication_name) {
            // Search by medication name
            const allPrescriptions = await storage.getPrescriptionsByOrganization(req.tenant!.id);
            prescriptions = allPrescriptions.filter(p => 
              p.medications?.some((med: any) => med.name?.toLowerCase().includes(prescriptionData.medication_name.toLowerCase())) ||
              p.interactions?.some((int: any) => int.toLowerCase().includes(prescriptionData.medication_name.toLowerCase()))
            );
          } else {
            // General prescription search based on search query
            const allPrescriptions = await storage.getPrescriptionsByOrganization(req.tenant!.id);
            prescriptions = allPrescriptions.filter(p => 
              p.medications?.some((med: any) => med.name?.toLowerCase().includes(prescriptionData.search_query.toLowerCase())) ||
              p.interactions?.some((int: any) => int.toLowerCase().includes(prescriptionData.search_query.toLowerCase()))
            );
          }

          // Get patient names for prescriptions
          const patients = await storage.getPatientsByOrganization(req.tenant!.id, 100);
          const prescriptionsWithNames = prescriptions.map(prescription => {
            const patient = patients.find(p => p.id === prescription.patientId);
            return {
              ...prescription,
              patientName: patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown Patient'
            };
          });

          responseData = { 
            prescriptions: prescriptionsWithNames,
            searchQuery: prescriptionData.search_query,
            patientName: prescriptionData.patient_name,
            medicationName: prescriptionData.medication_name
          };
          actionResult = {
            action: 'prescriptions_found',
            actionDescription: `Found ${prescriptions.length} prescription(s) matching your query`
          };
        } catch (error) {
          console.error("Error finding prescriptions:", error);
        }
      }

      res.json({
        message: aiResponse.response,
        intent: aiResponse.intent,
        confidence: aiResponse.confidence,
        data: responseData,
        ...actionResult
      });

    } catch (error) {
      console.error("AI Agent error:", error);
      res.status(500).json({ 
        error: "Failed to process AI request",
        message: "I apologize, but I'm having trouble processing your request right now. Please try again."
      });
    }
  });

  // Mobile Health endpoints
  app.get("/api/mobile-health/devices", authMiddleware, async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const sampleDevices = [
        {
          id: "device_1",
          patientId: "patient_1",
          patientName: "Sarah Johnson",
          deviceType: "smartwatch",
          brand: "Apple",
          model: "Watch Series 9",
          status: "connected",
          batteryLevel: 78,
          lastSync: "2024-06-30T15:30:00Z",
          dataTypes: ["Heart Rate", "Steps", "Sleep", "ECG"],
          readings: [
            {
              timestamp: "2024-06-30T15:30:00Z",
              type: "heart_rate",
              value: 72,
              unit: "bpm",
              status: "normal"
            },
            {
              timestamp: "2024-06-30T15:30:00Z",
              type: "steps",
              value: 8456,
              unit: "steps",
              status: "normal"
            }
          ]
        },
        {
          id: "device_2",
          patientId: "patient_2",
          patientName: "Michael Chen",
          deviceType: "glucose_monitor",
          brand: "Dexcom",
          model: "G7",
          status: "connected",
          batteryLevel: 92,
          lastSync: "2024-06-30T15:45:00Z",
          dataTypes: ["Blood Glucose", "Trends"],
          readings: [
            {
              timestamp: "2024-06-30T15:45:00Z",
              type: "glucose",
              value: 142,
              unit: "mg/dL",
              status: "abnormal"
            }
          ]
        },
        {
          id: "device_3",
          patientId: "patient_3",
          patientName: "Emma Davis",
          deviceType: "blood_pressure",
          brand: "Omron",
          model: "HeartGuide",
          status: "disconnected",
          batteryLevel: 15,
          lastSync: "2024-06-29T08:20:00Z",
          dataTypes: ["Blood Pressure", "Heart Rate"],
          readings: []
        }
      ];

      res.json(sampleDevices);
    } catch (error) {
      console.error("Error fetching mobile health devices:", error);
      res.status(500).json({ error: "Failed to fetch devices" });
    }
  });

  app.post("/api/mobile-health/devices/:id/sync", authMiddleware, async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const deviceId = req.params.id;
      
      // Simulate device sync process
      const syncResult = {
        deviceId,
        status: "success",
        syncedAt: new Date().toISOString(),
        newReadings: Math.floor(Math.random() * 10) + 1,
        batteryLevel: Math.floor(Math.random() * 30) + 70,
        message: "Device synchronized successfully"
      };

      // Simulate a delay for sync process
      await new Promise(resolve => setTimeout(resolve, 2000));

      res.json(syncResult);
    } catch (error) {
      console.error("Error syncing device:", error);
      res.status(500).json({ error: "Failed to sync device" });
    }
  });

  app.get("/api/mobile-health/apps", authMiddleware, async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const sampleApps = [
        {
          id: "app_1",
          name: "Averox Patient Portal",
          description: "Complete patient portal with appointment booking, messaging, and health records",
          category: "patient_portal",
          platform: "pwa",
          version: "2.1.0",
          downloads: 15420,
          rating: 4.8,
          features: [
            "Appointment Booking",
            "Secure Messaging",
            "Lab Results",
            "Prescription Management",
            "Health Records",
            "Telehealth Integration"
          ],
          screenshots: []
        },
        {
          id: "app_2",
          name: "Averox Medication Tracker",
          description: "Smart medication reminders with dose tracking and refill alerts",
          category: "medication_tracker",
          platform: "ios",
          version: "1.5.2",
          downloads: 8930,
          rating: 4.6,
          features: [
            "Medication Reminders",
            "Dose Tracking",
            "Refill Alerts",
            "Drug Interaction Warnings",
            "Pill Recognition"
          ],
          screenshots: []
        }
      ];

      res.json(sampleApps);
    } catch (error) {
      console.error("Error fetching mobile health apps:", error);
      res.status(500).json({ error: "Failed to fetch apps" });
    }
  });

  app.get("/api/mobile-health/notifications", authMiddleware, async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const sampleNotifications = [
        {
          id: "notif_1",
          patientId: "patient_1",
          patientName: "Sarah Johnson",
          type: "appointment_reminder",
          title: "Appointment Reminder",
          message: "You have an appointment tomorrow at 10:00 AM with Dr. Emily Watson",
          priority: "normal",
          scheduledTime: "2024-07-01T09:00:00Z",
          status: "scheduled"
        },
        {
          id: "notif_2",
          patientId: "patient_2",
          patientName: "Michael Chen",
          type: "health_alert",
          title: "Blood Glucose Alert",
          message: "Your blood glucose reading of 180 mg/dL is elevated. Please check your levels.",
          priority: "high",
          scheduledTime: "2024-06-30T16:00:00Z",
          status: "delivered",
          deliveryTime: "2024-06-30T16:00:12Z"
        }
      ];

      res.json(sampleNotifications);
    } catch (error) {
      console.error("Error fetching mobile health notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  // In-memory storage for patient consents (in production this would be in database)
  let patientConsents = [
    {
      id: "consent_1",
      patientId: "patient_1",
      patientName: "Sarah Johnson",
      email: "sarah.johnson@email.com",
      consentStatus: "consented",
      consentDate: "2024-01-15T10:30:00.000Z",
      monitoringTypes: {
        heartRate: true,
        bloodPressure: true,
        glucose: false,
        activity: true,
        sleep: true
      },
      deviceAccess: true,
      dataSharing: true,
      emergencyContact: true,
      lastUpdated: "2024-01-15T10:30:00.000Z"
    },
    {
      id: "consent_2",
      patientId: "patient_2",
      patientName: "Michael Chen",
      email: "michael.chen@email.com",
      consentStatus: "pending",
      monitoringTypes: {
        heartRate: false,
        bloodPressure: false,
        glucose: false,
        activity: false,
        sleep: false
      },
      deviceAccess: false,
      dataSharing: false,
      emergencyContact: false,
      lastUpdated: "2024-01-20T14:15:00.000Z"
    },
    {
      id: "consent_3",
      patientId: "patient_3",
      patientName: "Emma Davis",
      email: "emma.davis@email.com",
      consentStatus: "declined",
      monitoringTypes: {
        heartRate: false,
        bloodPressure: false,
        glucose: false,
        activity: false,
        sleep: false
      },
      deviceAccess: false,
      dataSharing: false,
      emergencyContact: false,
      lastUpdated: "2024-01-18T09:45:00.000Z"
    },
    {
      id: "consent_4",
      patientId: "patient_4",
      patientName: "Robert Wilson",
      email: "robert.wilson@email.com",
      consentStatus: "consented",
      consentDate: "2024-01-22T16:20:00.000Z",
      monitoringTypes: {
        heartRate: true,
        bloodPressure: true,
        glucose: true,
        activity: false,
        sleep: false
      },
      deviceAccess: true,
      dataSharing: false,
      emergencyContact: true,
      lastUpdated: "2024-01-22T16:20:00.000Z"
    },
    {
      id: "consent_5",
      patientId: "patient_5",
      patientName: "Lisa Anderson",
      email: "lisa.anderson@email.com",
      consentStatus: "revoked",
      consentDate: "2024-01-10T11:00:00.000Z",
      revokedDate: "2024-01-25T13:30:00.000Z",
      monitoringTypes: {
        heartRate: false,
        bloodPressure: false,
        glucose: false,
        activity: false,
        sleep: false
      },
      deviceAccess: false,
      dataSharing: false,
      emergencyContact: false,
      lastUpdated: "2024-01-25T13:30:00.000Z"
    }
  ];

  // Patient consent management endpoints
  app.get("/api/mobile-health/patient-consent", authMiddleware, async (req: TenantRequest, res) => {
    try {
      // Get real patients from database and create consent records for them
      const realPatients = await storage.getPatientsByOrganization(req.tenant!.id);
      
      const realPatientConsents = realPatients.map(patient => {
        // Check if we have existing consent data for this patient
        const existingConsent = patientConsents.find(consent => consent.patientId === patient.patientId);
        
        if (existingConsent) {
          // Update with real patient data
          return {
            ...existingConsent,
            patientName: `${patient.firstName} ${patient.lastName}`,
            email: patient.email || existingConsent.email
          };
        } else {
          // Create new consent record for real patient
          return {
            id: `consent_${patient.patientId}`,
            patientId: patient.patientId,
            patientName: `${patient.firstName} ${patient.lastName}`,
            email: patient.email || '',
            consentStatus: "pending",
            monitoringTypes: {
              heartRate: false,
              bloodPressure: false,
              glucose: false,
              activity: false,
              sleep: false
            },
            deviceAccess: false,
            dataSharing: false,
            emergencyContact: false,
            lastUpdated: new Date().toISOString()
          };
        }
      });
      
      res.json(realPatientConsents);
    } catch (error) {
      console.error("Error fetching patient consent data:", error);
      res.status(500).json({ error: "Failed to fetch patient consent data" });
    }
  });

  app.put("/api/mobile-health/patient-consent/:patientId", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const { patientId } = req.params;
      const consentData = req.body;
      
      console.log(`Updating consent for patient ${patientId}:`, consentData);
      console.log(`Organization ID: ${req.organizationId}`);
      
      // Find and update the consent record
      const consentIndex = patientConsents.findIndex(consent => consent.patientId === patientId);
      
      if (consentIndex === -1) {
        // Patient consent record doesn't exist - create it
        // First get the patient data from storage
        console.log(`Looking up patient ${patientId} for organization ${req.organizationId}`);
        
        try {
          const patient = await storage.getPatientByPatientId(patientId, req.tenant!.id);
          console.log(`Patient lookup result:`, patient ? 'Found' : 'Not found');
          if (patient) {
            console.log(`Patient details: ${patient.firstName} ${patient.lastName}`);
          }
          
          if (!patient) {
            console.log(`Patient ${patientId} not found in organization ${req.organizationId}`);
            return res.status(404).json({ error: "Patient not found" });
          }
          
          const newConsentRecord = {
            id: `consent_${patientId}`,
            patientId: patientId,
            patientName: `${patient.firstName} ${patient.lastName}`,
            email: patient.email || '',
            consentStatus: consentData.consentStatus || 'pending',
            monitoringTypes: {
              heartRate: false,
              bloodPressure: false,
              glucose: false,
              activity: false,
              sleep: false
            },
            deviceAccess: false,
            dataSharing: false,
            emergencyContact: false,
            lastUpdated: new Date().toISOString(),
            ...consentData
          };
          
          // Handle consent status specific updates for new record
          if (consentData.consentStatus === 'consented') {
            newConsentRecord.deviceAccess = true;
            newConsentRecord.dataSharing = true;
            newConsentRecord.monitoringTypes = {
              heartRate: true,
              bloodPressure: true,
              glucose: true,
              activity: true,
              sleep: true
            };
          }
          
          patientConsents.push(newConsentRecord);
          console.log(`Created new consent record for patient ${patientId}`);
          
          res.json({ success: true, consent: newConsentRecord });
          return;
          
        } catch (storageError) {
          console.error(`Storage error when looking up patient ${patientId}:`, storageError);
          return res.status(500).json({ error: "Failed to lookup patient" });
        }
      }
      
      // Update the consent record with new data
      patientConsents[consentIndex] = {
        ...patientConsents[consentIndex],
        ...consentData,
        lastUpdated: new Date().toISOString()
      };
      
      // Handle consent status specific updates
      if (consentData.consentStatus === 'consented') {
        patientConsents[consentIndex].deviceAccess = true;
        patientConsents[consentIndex].dataSharing = true;
        patientConsents[consentIndex].monitoringTypes = {
          heartRate: true,
          bloodPressure: true,
          glucose: true,
          activity: true,
          sleep: true
        };
      } else if (consentData.consentStatus === 'declined' || consentData.consentStatus === 'revoked') {
        patientConsents[consentIndex].deviceAccess = false;
        patientConsents[consentIndex].dataSharing = false;
        patientConsents[consentIndex].monitoringTypes = {
          heartRate: false,
          bloodPressure: false,
          glucose: false,
          activity: false,
          sleep: false
        };
      }
      
      res.json({
        success: true,
        message: "Patient consent updated successfully",
        data: patientConsents[consentIndex]
      });
    } catch (error) {
      console.error("Error updating patient consent:", error);
      res.status(500).json({ error: "Failed to update patient consent" });
    }
  });

  // Voice Documentation Routes
  app.get("/api/voice-documentation/notes", authMiddleware, async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Get voice notes from database storage
      const notes = await storage.getVoiceNotesByOrganization(req.tenant!.id);
      
      // If no notes exist, create a sample note for backwards compatibility
      if (notes.length === 0) {
        const sampleNote = {
          id: "note_sample_" + Date.now(),
          organizationId: req.tenant!.id,
          patientId: "158",
          patientName: "Imran Mubashir",
          providerId: "1",
          providerName: "Dr. Provider",
          type: "consultation",
          status: "completed",
          recordingDuration: 120,
          transcript: "Patient presents with chest pain. Vital signs stable. Recommended further cardiac evaluation.",
          confidence: 0.94,
          medicalTerms: [
            { term: "chest pain", confidence: 0.95, category: "symptom" },
            { term: "cardiac evaluation", confidence: 0.93, category: "procedure" }
          ],
          structuredData: {
            chiefComplaint: ["Chest pain"] as [string, ...string[]],
            assessment: ["Possible cardiac involvement"] as [string, ...string[]],
            plan: ["EKG, troponin levels, cardiology consult"] as [string, ...string[]]
          }
        };
        
        await storage.createVoiceNote(sampleNote);
        const updatedNotes = await storage.getVoiceNotesByOrganization(req.tenant!.id);
        return res.json(updatedNotes);
      }

      res.json(notes);
    } catch (error) {
      console.error("Error fetching voice notes:", error);
      res.status(500).json({ error: "Failed to fetch voice notes" });
    }
  });

  app.post("/api/voice-documentation/notes", authMiddleware, async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Handle voice note creation with patient data
      const { patientId, type, transcript, duration, confidence } = req.body;
      

      
      // Get patient info to associate with the note
      const patientIdNum = parseInt(patientId);
      if (isNaN(patientIdNum)) {
        return res.status(400).json({ error: "Invalid patient ID" });
      }
      
      const patient = await storage.getPatient(patientIdNum, req.tenant!.id);
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }

      const newNote = {
        id: `note_${Date.now()}`,
        organizationId: req.tenant!.id,
        patientId: patientId,
        patientName: `${patient.firstName} ${patient.lastName}`,
        providerId: req.user.id.toString(),
        providerName: "Dr. Provider",
        type: type || "consultation",
        status: transcript && transcript !== "Processing audio..." ? "completed" : "processing",
        recordingDuration: duration || 0,
        transcript: transcript || "Processing audio...",
        confidence: confidence || 0.0,
        medicalTerms: [],
        structuredData: {}
      };

      // Save the new note to database
      const createdNote = await storage.createVoiceNote(newNote);

      res.status(201).json(createdNote);
    } catch (error) {
      console.error("Error creating voice note:", error);
      res.status(500).json({ error: "Failed to create voice note" });
    }
  });

  app.put("/api/voice-documentation/notes/:id", authMiddleware, async (req: TenantRequest, res) => {
    try {
      console.log(`🔄 PUT request received for voice note: ${req.params.id}`);
      console.log(`🔄 Request body:`, req.body);
      
      if (!req.user) {
        console.log("❌ User not authenticated");
        return res.status(401).json({ error: "User not authenticated" });
      }

      const { id } = req.params;
      const { transcript } = req.body;

      console.log(`🔄 Extracted - ID: ${id}, Transcript: ${transcript}`);

      if (!id) {
        console.log("❌ Voice note ID is required");
        return res.status(400).json({ error: "Voice note ID is required" });
      }

      if (!transcript) {
        console.log("❌ Transcript is required");
        return res.status(400).json({ error: "Transcript is required" });
      }

      console.log(`🔄 Updating voice note in database...`);
      // Update the voice note transcript in the database
      const updatedNote = await storage.updateVoiceNote(id, req.tenant!.id, {
        transcript: transcript
      });

      if (!updatedNote) {
        console.log("❌ Voice note not found");
        return res.status(404).json({ error: "Voice note not found" });
      }

      console.log(`✅ Voice note updated successfully: ${id}`);
      console.log(`✅ Updated data:`, updatedNote);
      
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).json(updatedNote);
    } catch (error) {
      console.error("❌ Error updating voice note:", error);
      res.setHeader('Content-Type', 'application/json');
      return res.status(500).json({ error: "Failed to update voice note" });
    }
  });

  app.delete("/api/voice-documentation/notes/:id", authMiddleware, async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const noteId = req.params.id;
      console.log("DELETE request for noteId:", noteId);
      
      // Check if note exists before deletion
      const existingNote = await storage.getVoiceNote(noteId, req.tenant!.id);
      if (!existingNote) {
        console.log("Voice note not found in database:", noteId);
        return res.status(404).json({ error: "Voice note not found" });
      }

      // Delete the note from database
      const deleted = await storage.deleteVoiceNote(noteId, req.tenant!.id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Voice note not found" });
      }
      
      console.log("Successfully deleted note:", noteId);
      
      res.status(200).json({ 
        message: "Voice note deleted successfully", 
        deletedNoteId: noteId 
      });
    } catch (error) {
      console.error("Error deleting voice note:", error);
      res.status(500).json({ error: "Failed to delete voice note" });
    }
  });

  app.get("/api/voice-documentation/templates", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const templates = [
        {
          id: "template_1",
          name: "SOAP Note",
          category: "soap_note",
          template: "SUBJECTIVE:\n{chief_complaint}\n\nOBJECTIVE:\n{physical_exam}\n\nASSESSMENT:\n{assessment}\n\nPLAN:\n{plan}",
          fields: [
            { name: "chief_complaint", type: "textarea", required: true },
            { name: "physical_exam", type: "textarea", required: true },
            { name: "assessment", type: "textarea", required: true },
            { name: "plan", type: "textarea", required: true }
          ],
          autoComplete: true,
          usageCount: 45
        }
      ];

      res.json(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  // Clinical photos now use database storage instead of in-memory storage

  app.get("/api/voice-documentation/photos", authMiddleware, async (req: TenantRequest, res) => {
    try {
      // Get photos from database with proper tenant filtering
      const photos = await storage.getClinicalPhotosByOrganization(req.tenant!.id);
      
      // Transform database format to frontend format with patient names
      const transformedPhotos = await Promise.all(photos.map(async photo => {
        // Look up patient name using patientId
        const patient = await storage.getPatient(photo.patientId, req.tenant!.id);
        const patientName = patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown Patient';
        
        return {
          id: photo.id.toString(),
          patientId: photo.patientId.toString(),
          patientName: patientName,
          type: photo.type,
          filename: photo.fileName,
          description: photo.description || 'Clinical photo',
          url: `/uploads/wound_assessment/${photo.fileName}`,
          dateTaken: photo.createdAt.toISOString(),
          metadata: photo.metadata || {},
          annotations: [],
          createdAt: photo.createdAt.toISOString()
        };
      }));

      res.json(transformedPhotos);
    } catch (error) {
      console.error("Error fetching photos:", error);
      res.status(500).json({ error: "Failed to fetch photos" });
    }
  });

  app.post("/api/voice-documentation/photos", uploadPhoto.single('photo'), authMiddleware, async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const { patientId, type, description } = req.body;
      const uploadedFile = req.file;
      
      if (!uploadedFile) {
        return res.status(400).json({ error: "No photo file provided" });
      }

      const patient = await storage.getPatient(parseInt(patientId), req.tenant!.id);
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }

      // Create the filename using patient ID and wound.png naming convention
      const filename = `${patientId}wound.png`;
      const filePath = path.join('uploads', 'wound_assessment', filename);
      
      // Ensure the wound_assessment directory exists
      const dir = path.join('uploads', 'wound_assessment');
      await fse.ensureDir(dir);
      
      // Move the uploaded file to the correct location with the proper name
      await fse.move(uploadedFile.path, filePath, { overwrite: true });

      // Save photo metadata to database
      const clinicalPhotoData = {
        organizationId: req.tenant!.id,
        patientId: parseInt(patientId),
        capturedBy: req.user.id,
        type: type || "wound",
        description: description || "Clinical photo",
        fileName: filename,
        filePath: filePath,
        fileSize: uploadedFile.size,
        mimeType: uploadedFile.mimetype,
        metadata: {
          camera: "Clinical Camera",
          resolution: uploadedFile.mimetype === 'image/png' ? "Captured" : "1920x1080",
          lighting: "Clinical"
        }
      };

      const savedPhoto = await storage.createClinicalPhoto(clinicalPhotoData);
      console.log(`📸 Clinical photo saved to filesystem: ${filePath}`);
      console.log(`💾 Clinical photo saved to database with ID: ${savedPhoto.id}`);

      // Return photo in expected format for frontend
      const responsePhoto = {
        id: savedPhoto.id.toString(),
        patientId: patientId,
        patientName: `${patient.firstName} ${patient.lastName}`,
        type: savedPhoto.type,
        filename: savedPhoto.fileName,
        description: savedPhoto.description,
        url: `/uploads/wound_assessment/${filename}`,
        dateTaken: savedPhoto.createdAt.toISOString(),
        metadata: savedPhoto.metadata || {},
        annotations: [],
        createdAt: savedPhoto.createdAt.toISOString()
      };

      res.status(201).json(responsePhoto);
    } catch (error) {
      console.error("Error uploading photo:", error);
      res.status(500).json({ error: "Failed to upload photo" });
    }
  });

  app.post("/api/voice-documentation/check-directory", authMiddleware, async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Check and ensure the VoiceNotes directory exists
      const dir = path.join('uploads', 'VoiceNotes');
      await fse.ensureDir(dir);
      
      console.log(`📁 VoiceNotes directory checked/created: ${dir}`);

      res.status(200).json({
        success: true,
        message: "Directory checked and created if needed",
        directoryPath: dir
      });
    } catch (error) {
      console.error("Error checking/creating VoiceNotes directory:", error);
      res.status(500).json({ error: "Failed to check/create directory" });
    }
  });

  app.post("/api/voice-documentation/audio", uploadVoiceNote.single('audio'), authMiddleware, async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const { patientId, noteId } = req.body;
      const uploadedFile = req.file;
      
      if (!uploadedFile) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      if (!patientId) {
        return res.status(400).json({ error: "Patient ID is required" });
      }

      const patient = await storage.getPatient(parseInt(patientId), req.tenant!.id);
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }

      // Create the filename using patient ID and voicenote.mp4 naming convention as requested
      const filename = `${patientId}_voicenote.mp4`;
      const filePath = path.join('uploads', 'VoiceNotes', filename);
      
      // Ensure the VoiceNotes directory exists
      const dir = path.join('uploads', 'VoiceNotes');
      await fse.ensureDir(dir);
      
      // Move the uploaded file to the correct location with the proper name
      await fse.move(uploadedFile.path, filePath, { overwrite: true });

      console.log(`🎵 Voice note saved to filesystem: ${filePath}`);

      // Return success response with the file path
      res.status(201).json({
        success: true,
        message: "Voice note audio saved successfully",
        audioUrl: `/uploads/VoiceNotes/${filename}`,
        filename: filename,
        patientId: patientId,
        patientName: `${patient.firstName} ${patient.lastName}`
      });
    } catch (error) {
      console.error("Error uploading voice note audio:", error);
      res.status(500).json({ error: "Failed to upload voice note audio" });
    }
  });

  app.delete("/api/voice-documentation/photos/:id", authMiddleware, async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const photoId = parseInt(req.params.id);
      
      if (isNaN(photoId)) {
        return res.status(400).json({ error: "Invalid photo ID" });
      }

      // Get the photo first to check if it exists and belongs to the organization
      const photos = await storage.getClinicalPhotosByOrganization(req.tenant!.id);
      const photo = photos.find(p => p.id === photoId);
      
      if (!photo) {
        return res.status(404).json({ error: "Photo not found" });
      }

      // Delete the photo from database
      const deleted = await storage.deleteClinicalPhoto(photoId, req.tenant!.id);
      
      if (!deleted) {
        return res.status(500).json({ error: "Failed to delete photo from database" });
      }

      // Try to delete the file from filesystem (optional - don't fail if file doesn't exist)
      try {
        const filePath = path.join('uploads', 'wound_assessment', photo.fileName);
        await fse.remove(filePath);
        console.log(`🗑️ Photo file deleted from filesystem: ${filePath}`);
      } catch (fileError) {
        console.warn(`⚠️ Could not delete photo file from filesystem: ${fileError}`);
        // Don't fail the request if file deletion fails
      }

      console.log(`🗑️ Clinical photo deleted with ID: ${photoId}`);
      res.json({ success: true, message: "Photo deleted successfully" });
    } catch (error) {
      console.error("Error deleting photo:", error);
      res.status(500).json({ error: "Failed to delete photo" });
    }
  });

  // ======================
  // TWILIO WEBHOOK HANDLERS & MESSAGE STATUS TRACKING
  // ======================

  // Twilio webhook to receive delivery status updates
  app.post("/api/webhooks/twilio/status", express.raw({ type: 'application/x-www-form-urlencoded' }), async (req, res) => {
    try {
      console.log('📱 Twilio webhook received:', req.body.toString());
      
      // Parse form data from Twilio
      const params = new URLSearchParams(req.body.toString());
      const messageId = params.get('MessageSid');
      const messageStatus = params.get('MessageStatus');
      const errorCode = params.get('ErrorCode');
      const errorMessage = params.get('ErrorMessage');
      
      console.log('📱 Twilio status update:', {
        messageId,
        messageStatus,
        errorCode,
        errorMessage
      });

      if (messageId && messageStatus) {
        // Update message status in database
        await storage.updateMessageDeliveryStatus(messageId, messageStatus, errorCode || undefined, errorMessage || undefined);
        console.log(`📱 Updated message ${messageId} status to: ${messageStatus}`);
      }

      res.status(200).send('OK');
    } catch (error) {
      console.error('❌ Twilio webhook error:', error);
      res.status(500).send('Webhook processing failed');
    }
  });

  // API endpoint to check message delivery status
  app.get("/api/messaging/status/:messageId", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const messageId = req.params.messageId;
      
      // First check database for cached status
      const dbMessage = await storage.getMessageByExternalId(messageId, req.tenant!.id);
      if (dbMessage) {
        return res.json({
          messageId,
          status: dbMessage.deliveryStatus,
          lastUpdated: dbMessage.updatedAt,
          cached: true
        });
      }

      // If not in database, query Twilio directly
      const twilioStatus = await messagingService.getMessageStatus(messageId);
      
      if (twilioStatus) {
        res.json({
          messageId,
          status: twilioStatus.status,
          dateCreated: twilioStatus.dateCreated,
          dateSent: twilioStatus.dateSent,
          price: twilioStatus.price,
          errorCode: twilioStatus.errorCode,
          errorMessage: twilioStatus.errorMessage,
          cached: false
        });
      } else {
        res.status(404).json({ error: "Message status not found" });
      }
    } catch (error) {
      console.error("Error checking message status:", error);
      res.status(500).json({ error: "Failed to check message status" });
    }
  });

  // Force delivery status update for pending messages
  app.post("/api/messaging/update-delivery-status", authMiddleware, async (req: TenantRequest, res) => {
    try {
      console.log('🔄 Manual delivery status update requested');
      
      // Get all pending messages for this organization
      const pendingMessages = await storage.getPendingMessages(req.tenant!.id);
      console.log(`📱 Found ${pendingMessages.length} pending messages to update`);
      
      const updateResults = [];
      
      for (const message of pendingMessages) {
        try {
          // For messages without external ID, mark as failed to send
          if (!message.externalMessageId && message.messageType && (message.messageType === 'sms' || message.messageType === 'whatsapp')) {
            console.log(`❌ Message ${message.id} has no external ID - marking as failed`);
            await storage.updateMessageDeliveryStatus(message.id, 'failed', undefined, 'No external message ID - SMS/WhatsApp send failed');
            updateResults.push({
              messageId: message.id,
              oldStatus: 'pending',
              newStatus: 'failed',
              reason: 'No external message ID'
            });
          } else if (message.externalMessageId) {
            // Check Twilio status for messages with external ID
            const status = await messagingService.getMessageStatus(message.externalMessageId);
            if (status) {
              await storage.updateMessageDeliveryStatus(message.externalMessageId, status.status, status.errorCode, status.errorMessage);
              console.log(`📱 Updated message ${message.externalMessageId} status to: ${status.status}`);
              updateResults.push({
                messageId: message.id,
                externalId: message.externalMessageId,
                oldStatus: 'pending',
                newStatus: status.status
              });
            }
          } else {
            // Internal messages should be marked as delivered
            console.log(`✅ Internal message ${message.id} - marking as delivered`);
            await storage.updateMessageDeliveryStatus(message.id, 'delivered', undefined, undefined);
            updateResults.push({
              messageId: message.id,
              oldStatus: 'pending',
              newStatus: 'delivered',
              reason: 'Internal message'
            });
          }
        } catch (error) {
          console.error(`❌ Error updating message ${message.id}:`, error);
          updateResults.push({
            messageId: message.id,
            error: (error as Error).message
          });
        }
      }
      
      res.json({
        success: true,
        updatedCount: updateResults.length,
        results: updateResults
      });
      
    } catch (error) {
      console.error("Error updating delivery status:", error);
      res.status(500).json({ error: "Failed to update delivery status" });
    }
  });

  // API endpoint to retry failed messages
  app.post("/api/messaging/retry/:messageId", authMiddleware, async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const messageId = req.params.messageId;
      
      // Get original message from database
      const originalMessage = await storage.getMessage(messageId, req.tenant!.id);
      if (!originalMessage || !originalMessage.phoneNumber) {
        return res.status(404).json({ error: "Original message not found or missing phone number" });
      }

      // Only retry failed messages
      if (originalMessage.deliveryStatus !== 'failed' && originalMessage.deliveryStatus !== 'undelivered') {
        return res.status(400).json({ error: "Message is not in a failed state" });
      }

      const result = await messagingService.sendMessage({
        to: originalMessage.phoneNumber,
        message: originalMessage.content,
        type: originalMessage.messageType as 'sms' | 'whatsapp' || 'sms',
        priority: originalMessage.priority as 'low' | 'normal' | 'high' || 'normal'
      });

      if (result.success) {
        // Update original message with new delivery attempt
        await storage.updateMessage(messageId, req.tenant!.id, {
          deliveryStatus: 'queued',
          externalMessageId: result.messageId,
          updatedAt: new Date()
        });
        
        res.json({
          success: true,
          message: "Message retry initiated",
          newMessageId: result.messageId
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error("Error retrying message:", error);
      res.status(500).json({ error: "Failed to retry message" });
    }
  });

  // API endpoint to manually check and update delivery status for recent messages
  app.post("/api/messaging/check-delivery-status", authMiddleware, requireRole(["admin"]), async (req: TenantRequest, res) => {
    try {
      // Get recent messages with external IDs that need status updates
      const recentMessages = await storage.getRecentMessagesWithExternalIds(req.tenant!.id, 10);
      const updates = [];
      
      for (const message of recentMessages) {
        if (message.externalMessageId && (message.deliveryStatus === 'sent' || message.deliveryStatus === 'queued')) {
          try {
            const status = await messagingService.getMessageStatus(message.externalMessageId);
            if (status && status.status !== message.deliveryStatus) {
              await storage.updateMessageDeliveryStatus(message.externalMessageId, status.status, status.errorCode, status.errorMessage);
              updates.push({
                messageId: message.id,
                externalId: message.externalMessageId,
                oldStatus: message.deliveryStatus,
                newStatus: status.status,
                errorCode: status.errorCode,
                errorMessage: status.errorMessage
              });
              console.log(`📱 Updated message ${message.externalMessageId} status: ${message.deliveryStatus} -> ${status.status}`);
            }
          } catch (error) {
            console.error(`📱 Error checking status for message ${message.externalMessageId}:`, error);
          }
        }
      }
      
      res.json({
        success: true,
        messagesChecked: recentMessages.length,
        statusUpdates: updates.length,
        updates
      });
    } catch (error) {
      console.error("Error checking delivery status:", error);
      res.status(500).json({ error: "Failed to check delivery status" });
    }
  });

  // API endpoint to get Twilio account info and verify credentials
  app.get("/api/messaging/twilio/status", authMiddleware, requireRole(["admin"]), async (req: TenantRequest, res) => {
    try {
      const accountInfo = await messagingService.getAccountInfo();
      
      if (accountInfo) {
        res.json({
          configured: true,
          balance: accountInfo.balance,
          accountSid: process.env.TWILIO_ACCOUNT_SID?.substring(0, 8) + '...',
          phoneNumber: process.env.TWILIO_PHONE_NUMBER,
          status: 'active'
        });
      } else {
        res.json({
          configured: false,
          error: "Twilio credentials not configured or invalid"
        });
      }
    } catch (error) {
      console.error("Error checking Twilio status:", error);
      res.status(500).json({ 
        configured: false,
        error: "Failed to verify Twilio configuration" 
      });
    }
  });

  // Consultations API endpoint
  app.post("/api/consultations", authMiddleware, async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const consultationData = z.object({
        patientId: z.number().optional(),
        chiefComplaint: z.string(),
        historyPresentingComplaint: z.string(),
        reviewOfSystems: z.object({
          cardiovascular: z.string(),
          respiratory: z.string(),
          gastrointestinal: z.string(),
          genitourinary: z.string(),
          neurological: z.string(),
          musculoskeletal: z.string(),
          skin: z.string(),
          psychiatric: z.string()
        }),
        examination: z.object({
          general: z.string(),
          cardiovascular: z.string(),
          respiratory: z.string(),
          abdomen: z.string(),
          neurological: z.string(),
          musculoskeletal: z.string(),
          skin: z.string(),
          head_neck: z.string(),
          ears_nose_throat: z.string()
        }),
        vitals: z.object({
          bloodPressure: z.string(),
          heartRate: z.string(),
          temperature: z.string(),
          respiratoryRate: z.string(),
          oxygenSaturation: z.string(),
          weight: z.string(),
          height: z.string(),
          bmi: z.string()
        }),
        assessment: z.string(),
        plan: z.string(),
        prescriptions: z.array(z.object({
          medication: z.string(),
          dosage: z.string(),
          frequency: z.string(),
          duration: z.string(),
          instructions: z.string()
        })),
        referrals: z.array(z.object({
          specialty: z.string(),
          urgency: z.enum(["routine", "urgent", "2ww"]),
          reason: z.string()
        })),
        investigations: z.array(z.object({
          type: z.string(),
          urgency: z.enum(["routine", "urgent"]),
          reason: z.string()
        })),
        followUp: z.object({
          required: z.boolean(),
          timeframe: z.string(),
          reason: z.string()
        }),
        consultationDate: z.string()
      }).parse(req.body);

      // Create a mock consultation record
      const consultation = {
        id: Math.floor(Math.random() * 10000),
        ...consultationData,
        organizationId: req.tenant!.id,
        providerId: req.user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      console.log("Full consultation saved:", consultation);

      res.status(201).json({
        message: "Full consultation saved successfully",
        consultation: consultation
      });
    } catch (error) {
      console.error("Error saving consultation:", error);
      res.status(500).json({ error: "Failed to save consultation" });
    }
  });

  // Muscle Positions API endpoints - For facial muscle analysis
  app.post("/api/muscle-positions", authMiddleware, async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const musclePositionData = z.object({
        patientId: z.number(),
        consultationId: z.number().optional(),
        detectedDots: z.array(z.object({
          id: z.number(),
          xPct: z.number(),
          yPct: z.number()
        }))
      }).parse(req.body);

      // Define the 32 facial muscle mappings
      const muscleMapping = [
        "Frontalis (Forehead)",           // Position 1
        "Temporalis",                     // Position 2
        "Procerus",                       // Position 3
        "Corrugator Supercilii",          // Position 4
        "Orbicularis Oculi",              // Position 5
        "Orbicularis Milor",              // Position 6
        "Orbicularis Oculi",              // Position 7
        "Zygomaticus Minor",              // Position 8
        "Zygomaticus Major",              // Position 9
        "Buccinator",                     // Position 10
        "Depressor Sept Nasi",            // Position 11
        "Orbicularis Oris",               // Position 12
        "Depressor Labii Inferioris",     // Position 13
        "Mentalis",                       // Position 14
        "Platysma",                       // Position 15
        "Frontalis (Forehead)",           // Position 16
        "Temporalis",                     // Position 17
        "Procerus",                       // Position 18
        "Corrugator Supercilii",          // Position 19
        "Orbicularis Oculi",              // Position 20
        "Orbicularis Milor",              // Position 21
        "Orbicularis Oculi",              // Position 22
        "Zygomaticus Minor",              // Position 23
        "Zygomaticus Major",              // Position 24
        "Buccinator",                     // Position 25
        "Depressor Sept Nasi",            // Position 26
        "Orbicularis Oris",               // Position 27
        "Depressor Labii Inferioris",     // Position 28
        "Mentalis",                       // Position 29
        "Platysma",                       // Position 30
        "Mentalis",                       // Position 31
        "Platysma"                        // Position 32
      ];

      const savedPositions = [];

      // Save each detected dot as a muscle position (up to 32)
      for (let i = 0; i < Math.min(musclePositionData.detectedDots.length, 32); i++) {
        const dot = musclePositionData.detectedDots[i];
        const position = i + 1; // Positions 1-32
        const muscleName = muscleMapping[i];

        const musclePosition = await storage.saveMusclePosition({
          organizationId: req.tenant!.id,
          patientId: musclePositionData.patientId,
          consultationId: musclePositionData.consultationId,
          position,
          value: muscleName,
          coordinates: {
            xPct: dot.xPct,
            yPct: dot.yPct
          },
          isDetected: true,
          detectedAt: new Date()
        });

        savedPositions.push(musclePosition);
      }

      console.log(`💾 MUSCLE POSITIONS SAVED: ${savedPositions.length} positions for patient ${musclePositionData.patientId}`);

      res.status(201).json({
        message: "Muscle positions saved successfully",
        positions: savedPositions,
        count: savedPositions.length
      });
    } catch (error) {
      console.error("Error saving muscle positions:", error);
      handleRouteError(error, "save muscle positions", res);
    }
  });

  // Get saved muscle positions for a patient
  app.get("/api/muscle-positions/:patientId", authMiddleware, async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const patientId = parseInt(req.params.patientId);
      if (isNaN(patientId)) {
        return res.status(400).json({ error: "Invalid patient ID" });
      }

      const positions = await storage.getMusclePositions(req.tenant!.id, patientId);

      console.log(`📊 MUSCLE POSITIONS RETRIEVED: ${positions.length} positions for patient ${patientId}`);

      res.json({
        positions,
        count: positions.length
      });
    } catch (error) {
      console.error("Error retrieving muscle positions:", error);
      handleRouteError(error, "retrieve muscle positions", res);
    }
  });

  // Save Anatomical Analysis Image
  app.post("/api/anatomical-analysis/save-image", authMiddleware, async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const imageUploadData = z.object({
        patientId: z.number(),
        imageData: z.string(),
        muscleGroup: z.string().optional()
      }).parse(req.body);

      const organizationId = req.tenant!.id;
      const patientId = imageUploadData.patientId;

      // Create directory structure: uploads/anatomical_analysis_img/{organization_id}/{patient_id}/
      const baseDir = path.join('./uploads', 'anatomical_analysis_img', organizationId.toString(), patientId.toString());
      
      // Check if directory exists, if not create it recursively
      if (!await fs.promises.access(baseDir).then(() => true).catch(() => false)) {
        await fs.promises.mkdir(baseDir, { recursive: true });
        console.log(`📁 Created directory: ${baseDir}`);
      }

      // Define image file path: {patient_id}.png
      const imagePath = path.join(baseDir, `${patientId}.png`);
      
      // Convert base64 image data to buffer
      const base64Data = imageUploadData.imageData.replace(/^data:image\/\w+;base64,/, '');
      const imageBuffer = Buffer.from(base64Data, 'base64');

      // Check if image already exists
      const imageExists = await fs.promises.access(imagePath).then(() => true).catch(() => false);
      
      if (imageExists) {
        // Update existing image
        await fs.promises.writeFile(imagePath, imageBuffer);
        console.log(`✏️ Updated anatomical analysis image for patient ${patientId} at: ${imagePath}`);
        
        res.json({
          message: "Anatomical analysis image updated successfully",
          path: imagePath,
          action: "updated"
        });
      } else {
        // Create new image
        await fs.promises.writeFile(imagePath, imageBuffer);
        console.log(`💾 Created new anatomical analysis image for patient ${patientId} at: ${imagePath}`);
        
        res.json({
          message: "Anatomical analysis image created successfully",
          path: imagePath,
          action: "created"
        });
      }
    } catch (error) {
      console.error("Error saving anatomical analysis image:", error);
      handleRouteError(error, "save anatomical analysis image", res);
    }
  });

  // Stripe Payment Intent for Subscription
  app.post("/api/create-subscription-payment-intent", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const { planId, amount } = req.body;
      
      // Create a properly formatted demo client secret that Stripe will accept
      const timestamp = Date.now().toString();
      const demoClientSecret = `pi_${timestamp.slice(-10)}_secret_demo${planId}${amount}`;
      
      res.json({
        clientSecret: demoClientSecret,
        paymentIntentId: `pi_${timestamp.slice(-10)}`,
        mode: "demo"
      });
    } catch (error: any) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ error: "Failed to create payment intent" });
    }
  });

  // Subscription Upgrade Endpoint
  app.post("/api/subscription/upgrade", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const { planId, paymentMethod } = req.body;
      const organizationId = req.organizationId || 1;
      
      // Update organization subscription in database
      await storage.updateSubscription(organizationId, {
        plan: planId,
        status: 'active'
      });

      res.json({ 
        success: true, 
        message: `Successfully upgraded to ${planId} plan`,
        planId,
        paymentMethod
      });
    } catch (error: any) {
      console.error("Error upgrading subscription:", error);
      res.status(500).json({ error: "Failed to upgrade subscription" });
    }
  });

  // PayPal Routes - Real PayPal Integration (conditional on credentials)
  app.get("/api/paypal/setup", async (req, res) => {
    try {
      if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
        return res.status(503).json({ error: "PayPal is not configured. Please set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET environment variables." });
      }
      const { loadPaypalDefault } = await import("./paypal");
      await loadPaypalDefault(req, res);
    } catch (error: any) {
      console.error("PayPal setup error:", error);
      res.status(500).json({ error: "Failed to setup PayPal" });
    }
  });

  app.post("/api/paypal/order", async (req, res) => {
    try {
      if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
        return res.status(503).json({ error: "PayPal is not configured. Please set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET environment variables." });
      }
      const { createPaypalOrder } = await import("./paypal");
      await createPaypalOrder(req, res);
    } catch (error: any) {
      console.error("PayPal order creation error:", error);
      res.status(500).json({ error: "Failed to create PayPal order" });
    }
  });

  app.post("/api/paypal/order/:orderID/capture", async (req, res) => {
    try {
      if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
        return res.status(503).json({ error: "PayPal is not configured. Please set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET environment variables." });
      }
      const { capturePaypalOrder } = await import("./paypal");
      await capturePaypalOrder(req, res);
    } catch (error: any) {
      console.error("PayPal order capture error:", error);
      res.status(500).json({ error: "Failed to capture PayPal order" });
    }
  });

  // Website Chatbot API Endpoints - for appointment booking and prescription requests
  app.post("/api/website/book-appointment", async (req, res) => {
    try {
      const { patientName, patientEmail, patientPhone, appointmentType, preferredDate, preferredTime, notes } = req.body;
      
      console.log("Website appointment booking request:", req.body);
      
      // For demo purposes, we'll use the default tenant 'cura'
      const tenant = await storage.getOrganizationBySubdomain('cura');
      if (!tenant) {
        return res.status(400).json({ error: "Organization not found" });
      }

      // Check if patient exists by email, if not create a new one
      let patient = await storage.getPatientByEmail(patientEmail, tenant.id);
      
      if (!patient) {
        // Extract first and last name from full name
        const nameParts = patientName.trim().split(' ');
        const firstName = nameParts[0] || patientName;
        const lastName = nameParts.slice(1).join(' ') || '';
        
        // Create new patient
        const patientData = {
          firstName,
          lastName,
          email: patientEmail,
          phone: patientPhone,
          organizationId: tenant.id,
          patientId: `P${String(Date.now()).slice(-6)}`, // Generate patient ID
          dateOfBirth: new Date(), // Default date
          address: {},
          emergencyContact: {
            phone: patientPhone
          },
          medicalHistory: {
            allergies: [],
            chronicConditions: [],
            medications: []
          }
        };
        
        patient = await storage.createPatient(patientData);
        console.log("Created new patient:", patient);
      }

      // Get available providers (doctors)
      const providers = await storage.getUsersByRole('doctor', tenant.id);
      if (providers.length === 0) {
        return res.status(400).json({ error: "No doctors available" });
      }
      
      // Use first available doctor
      const provider = providers[0];
      
      // Create appointment
      const scheduledDateTime = new Date(`${preferredDate}T${preferredTime || '09:00'}`);
      
      const appointmentData = {
        patientId: patient.id,
        providerId: provider.id,
        organizationId: tenant.id,
        title: `${appointmentType || 'General consultation'} - ${patientName}`,
        description: notes || `Website booking: ${appointmentType}`,
        scheduledAt: scheduledDateTime,
        duration: 30,
        type: appointmentType === 'emergency' ? 'emergency' : 'consultation',
        status: 'pending',
        location: 'Main Clinic',
        isVirtual: appointmentType === 'virtual' || appointmentType === 'telemedicine'
      };
      
      const appointment = await storage.createAppointment(appointmentData);
      
      // Send confirmation email
      try {
        // TODO: Implement sendAppointmentConfirmation method in EmailService
        console.log("Appointment confirmation would be sent to:", patientEmail);
      } catch (emailError) {
        console.error("Failed to send confirmation email:", emailError);
      }
      
      res.status(201).json({
        success: true,
        message: "Appointment booked successfully",
        appointment: {
          id: appointment.id,
          date: scheduledDateTime.toLocaleDateString(),
          time: scheduledDateTime.toLocaleTimeString(),
          doctor: `Dr. ${provider.firstName} ${provider.lastName}`,
          type: appointmentType,
          status: 'pending'
        }
      });
      
    } catch (error) {
      console.error("Website appointment booking error:", error);
      res.status(500).json({ error: "Failed to book appointment" });
    }
  });

  app.post("/api/website/request-prescription", async (req, res) => {
    try {
      const { patientName, patientEmail, patientPhone, medication, dosage, reason, currentMedications, allergies } = req.body;
      
      console.log("Website prescription request:", req.body);
      
      // For demo purposes, we'll use the default tenant 'cura'
      const tenant = await storage.getOrganizationBySubdomain('cura');
      if (!tenant) {
        return res.status(400).json({ error: "Organization not found" });
      }

      // Check if patient exists by email, if not create a new one
      let patient = await storage.getPatientByEmail(patientEmail, tenant.id);
      
      if (!patient) {
        // Extract first and last name from full name
        const nameParts = patientName.trim().split(' ');
        const firstName = nameParts[0] || patientName;
        const lastName = nameParts.slice(1).join(' ') || '';
        
        // Create new patient
        const patientData = {
          firstName,
          lastName,
          email: patientEmail,
          phone: patientPhone,
          organizationId: tenant.id,
          patientId: `P${String(Date.now()).slice(-6)}`, // Generate patient ID
          dateOfBirth: new Date(), // Default date
          address: {
            street: '',
            city: '',
            state: '',
            postcode: '',
            country: 'UK'
          },
          emergencyContact: {
            name: '',
            relationship: '',
            phone: patientPhone
          },
          medicalHistory: {
            allergies: allergies ? [allergies] : [],
            chronicConditions: [],
            medications: currentMedications ? [currentMedications] : [],
            familyHistory: { father: [], mother: [], siblings: [], grandparents: [] },
            socialHistory: { smoking: { status: 'never' }, alcohol: { status: 'never' }, drugs: { status: 'never' }, occupation: '', maritalStatus: 'single', education: '', exercise: { frequency: 'none' } },
            immunizations: []
          },
          riskLevel: 'low',
          flags: null,
          communicationPreferences: null,
          isActive: true
        };
        
        patient = await storage.createPatient(patientData);
        console.log("Created new patient for prescription:", patient);
      }

      // Get available providers (doctors)
      const providers = await storage.getUsersByRole('doctor', tenant.id);
      if (providers.length === 0) {
        return res.status(400).json({ error: "No doctors available" });
      }
      
      // Use first available doctor
      const provider = providers[0];
      
      // Create prescription request (pending status)
      const prescriptionData = {
        patientId: patient.id,
        doctorId: provider.id,
        organizationId: tenant.id,
        medicationName: medication || 'Medication to be determined',
        dosage: dosage || 'To be determined',
        frequency: 'As prescribed',
        duration: 'As prescribed',
        instructions: `Website prescription request: ${reason}\n\nCurrent medications: ${currentMedications || 'None'}\nAllergies: ${allergies || 'None'}`,
        status: 'pending'
      };
      
      const prescription = await storage.createPrescription(prescriptionData);
      
      // Send confirmation email
      try {
        // TODO: Implement sendPrescriptionRequestConfirmation method in EmailService
        console.log("Prescription confirmation would be sent to:", patientEmail);
      } catch (emailError) {
        console.error("Failed to send prescription confirmation email:", emailError);
      }
      
      res.status(201).json({
        success: true,
        message: "Prescription request submitted successfully",
        prescription: {
          id: prescription.id,
          medication: medication || 'To be determined',
          doctor: `Dr. ${provider.firstName} ${provider.lastName}`,
          status: 'pending',
          requestDate: new Date().toLocaleDateString()
        }
      });
      
    } catch (error) {
      console.error("Website prescription request error:", error);
      res.status(500).json({ error: "Failed to submit prescription request" });
    }
  });

  app.get("/api/website/available-slots", async (req, res) => {
    try {
      const { date } = req.query;
      
      // For demo purposes, return available time slots
      const selectedDate = new Date(date as string);
      const today = new Date();
      
      if (selectedDate < today) {
        return res.status(400).json({ error: "Cannot book appointments in the past" });
      }
      
      // Generate available slots (9 AM to 5 PM, excluding lunch 12-1 PM)
      const slots = [];
      for (let hour = 9; hour < 17; hour++) {
        if (hour !== 12) { // Skip lunch hour
          slots.push(`${hour.toString().padStart(2, '0')}:00`);
          if (hour < 16) { // Don't add 30min slot for 4:30 PM
            slots.push(`${hour.toString().padStart(2, '0')}:30`);
          }
        }
      }
      
      res.json({ availableSlots: slots });
      
    } catch (error) {
      console.error("Error fetching available slots:", error);
      res.status(500).json({ error: "Failed to fetch available slots" });
    }
  });

  // Helper function to load template content from file system
  async function loadTemplateContent(document: any, organizationId: number): Promise<any> {
    if (document.isTemplate && document.content) {
      // Check if content is a filename (new templates) or actual content (legacy templates)
      const isFilename = document.content.endsWith('.json');
      
      if (isFilename) {
        const userId = document.userId;
        const filename = document.content;
        const filePath = path.join(process.cwd(), 'uploads', 'Forms', String(organizationId), String(userId), filename);
        
        if (fs.existsSync(filePath)) {
          try {
            const fileContent = await fs.promises.readFile(filePath, 'utf8');
            const templateData = JSON.parse(fileContent);
            return {
              ...document,
              content: templateData.content,
              metadata: templateData.metadata || document.metadata,
            };
          } catch (error) {
            console.error('Error reading template file:', filePath, error);
          }
        } else {
          console.log('Template file not found, returning DB content:', filePath);
        }
      }
      // For legacy templates with content in DB, return as-is
    }
    return document;
  }

  // Document API routes
  app.get("/api/documents", authMiddleware, multiTenantEnforcer(), async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const isTemplatesOnly = req.query.templates === 'true';
      const isDoctor = req.user.role && ['doctor', 'nurse', 'dentist', 'dental_nurse', 'phlebotomist', 'aesthetician', 'optician', 'paramedic', 'physiotherapist', 'sample_taker'].includes(req.user.role.toLowerCase());
      
      if (isTemplatesOnly) {
        // Fetch only templates - doctors see only their own, others see all
        let templates;
        if (isDoctor) {
          templates = await storage.getDocumentsByUser(req.user.id, req.tenant!.id);
          // Filter to only templates
          templates = templates.filter((t: any) => t.isTemplate);
        } else {
          templates = await storage.getTemplatesByOrganization(req.tenant!.id, 50);
        }
        // Load template content from file system for each template
        const templatesWithContent = await Promise.all(
          templates.map((template: any) => loadTemplateContent(template, req.tenant!.id))
        );
        res.json(templatesWithContent);
      } else {
        // Fetch all documents - doctors see only their own, others see all
        let documents;
        if (isDoctor) {
          documents = await storage.getDocumentsByUser(req.user.id, req.tenant!.id);
        } else {
          documents = await storage.getDocumentsByOrganization(req.tenant!.id, 50);
        }
        // Load template content from file system for templates
        const documentsWithContent = await Promise.all(
          documents.map((doc: any) => loadTemplateContent(doc, req.tenant!.id))
        );
        res.json(documentsWithContent);
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  app.get("/api/documents/user", authMiddleware, async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const documents = await storage.getDocumentsByUser(req.user.id, req.tenant!.id);
      // Load template content from file system for templates
      const documentsWithContent = await Promise.all(
        documents.map((doc: any) => loadTemplateContent(doc, req.tenant!.id))
      );
      res.json(documentsWithContent);
    } catch (error) {
      console.error("Error fetching user documents:", error);
      res.status(500).json({ error: "Failed to fetch user documents" });
    }
  });

  app.post("/api/documents", authMiddleware, multiTenantEnforcer(), async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const documentData = z.object({
        name: z.string().min(1),
        type: z.string().optional().default("medical_form"),
        content: z.string().min(1),
        metadata: z.object({
          subject: z.string().optional(),
          recipient: z.string().optional(),
          location: z.string().optional(),
          practitioner: z.string().optional(),
          header: z.string().optional(),
          templateUsed: z.string().optional(),
        }).optional().default({}),
        isTemplate: z.boolean().optional().default(false),
      }).parse(req.body);

      // For templates, save to file system with organization_id/user_id directory structure
      if (documentData.isTemplate) {
        const organizationId = req.tenant!.id;
        const userId = req.user.id;
        
        // Create directory structure: uploads/Forms/{organization_id}/{user_id}/
        const formsDir = path.join(process.cwd(), 'uploads', 'Forms', String(organizationId), String(userId));
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(formsDir)) {
          fs.mkdirSync(formsDir, { recursive: true });
          console.log('📁 Created Forms directory:', formsDir);
        }
        
        // Generate unique filename
        const timestamp = Date.now();
        const sanitizedName = documentData.name.replace(/[^a-z0-9_-]/gi, '_');
        const filename = `${sanitizedName}_${timestamp}.json`;
        const filePath = path.join(formsDir, filename);
        
        // Prepare template data for file system
        const templateFileData = {
          name: documentData.name,
          type: documentData.type,
          content: documentData.content,
          metadata: documentData.metadata,
          createdAt: new Date().toISOString(),
          organizationId,
          userId,
        };
        
        // Save template to file system
        await fs.promises.writeFile(filePath, JSON.stringify(templateFileData, null, 2), 'utf8');
        console.log('✅ Template saved to file system:', filePath);
        
        // Also save metadata to database for querying/listing
        const document = await storage.createDocument({
          ...documentData,
          organizationId: req.tenant!.id,
          userId: req.user.id,
          content: filename, // Store filename instead of content
        });
        
        res.status(201).json({
          ...document,
          filePath: `uploads/Forms/${organizationId}/${userId}/${filename}`,
        });
      } else {
        // For non-templates, save to database as before
        const document = await storage.createDocument({
          ...documentData,
          organizationId: req.tenant!.id,
          userId: req.user.id,
        });
        
        res.status(201).json(document);
      }
    } catch (error) {
      console.error("Error creating document:", error);
      res.status(500).json({ error: "Failed to create document" });
    }
  });

  app.get("/api/documents/:id", authMiddleware, async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const documentId = parseInt(req.params.id);
      if (isNaN(documentId)) {
        return res.status(400).json({ error: "Invalid document ID" });
      }

      const document = await storage.getDocument(documentId, req.tenant!.id);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      // Load template content from file system if it's a template
      const documentWithContent = await loadTemplateContent(document, req.tenant!.id);
      res.json(documentWithContent);
    } catch (error) {
      console.error("Error fetching document:", error);
      res.status(500).json({ error: "Failed to fetch document" });
    }
  });

  app.put("/api/documents/:id", authMiddleware, async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const documentId = parseInt(req.params.id);
      if (isNaN(documentId)) {
        return res.status(400).json({ error: "Invalid document ID" });
      }

      const updateData = z.object({
        name: z.string().min(1).optional(),
        content: z.string().min(1).optional(),
        metadata: z.object({
          subject: z.string().optional(),
          recipient: z.string().optional(),
          location: z.string().optional(),
          practitioner: z.string().optional(),
          header: z.string().optional(),
          templateUsed: z.string().optional(),
        }).optional(),
      }).parse(req.body);

      const document = await storage.updateDocument(documentId, req.tenant!.id, updateData);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      res.json(document);
    } catch (error) {
      console.error("Error updating document:", error);
      res.status(500).json({ error: "Failed to update document" });
    }
  });

  app.delete("/api/documents/:id", authMiddleware, async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const documentId = parseInt(req.params.id);
      if (isNaN(documentId)) {
        return res.status(400).json({ error: "Invalid document ID" });
      }

      const deleted = await storage.deleteDocument(documentId, req.tenant!.id);
      if (!deleted) {
        return res.status(404).json({ error: "Document not found" });
      }

      res.json({ message: "Document deleted successfully" });
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ error: "Failed to delete document" });
    }
  });

  // Medical Images API endpoints

  app.get("/api/medical-images/patient/:patientId", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      if (isNaN(patientId)) {
        return res.status(400).json({ error: "Invalid patient ID" });
      }
      
      const images = await storage.getMedicalImagesByPatient(patientId, req.tenant!.id);
      res.json(images);
    } catch (error) {
      console.error("Error fetching patient medical images:", error);
      res.status(500).json({ error: "Failed to fetch patient medical images" });
    }
  });

  // Get all medical images for the organization
  app.get("/api/medical-images", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const medicalImages = await storage.getMedicalImagesByOrganization(req.tenant!.id);
      
      // Transform the data to include patient information
      const imagesWithPatients = await Promise.all(
        medicalImages.map(async (image) => {
          const patient = await storage.getPatient(image.patientId, req.tenant!.id);
          const uploader = await storage.getUser(Number(image.uploadedBy), req.tenant!.id);
          
          const result = {
            ...image,
            patientName: patient ? `${patient.firstName} ${patient.lastName}` : "Unknown Patient",
            patientIdentifier: patient?.patientId || "Unknown",
            uploadedByName: uploader ? `${uploader.firstName} ${uploader.lastName}` : "Unknown User"
          };
          
          console.log('📷 API: Returning image with fileName:', result.fileName);
          return result;
        })
      );
      
      res.json(imagesWithPatients);
    } catch (error) {
      console.error("Error fetching medical images:", error);
      res.status(500).json({ error: "Failed to fetch medical images" });
    }
  });

  app.post("/api/medical-images", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const imageData = z.object({
        patientId: z.number(),
        imageId: z.string().optional(), // Add imageId field
        imageType: z.string().optional(),
        studyType: z.string().optional(),
        modality: z.string().optional(),
        bodyPart: z.string(),
        indication: z.string().optional(),
        priority: z.string().optional(),
        notes: z.string().optional(),
        filename: z.string(),
        fileUrl: z.string().optional(),
        fileSize: z.number(),
        uploadedBy: z.number(),
        imageData: z.string().optional(), // Add base64 image data field
        mimeType: z.string().optional(), // Add MIME type field
        status: z.string().optional() // Add status field for orders vs uploads
      }).parse(req.body);

      // Generate imageId if not provided
      const finalImageId = imageData.imageId || `IMG${Date.now()}I${imageData.patientId}AUTO`;

      // Create proper object for database insertion (with enforced created_by)
      const dbImageData = enforceCreatedBy(req, {
        patientId: imageData.patientId,
        imageId: finalImageId, // Include imageId in database object
        studyType: imageData.studyType || imageData.imageType || "Unknown Study", // Use studyType first, then imageType as fallback
        modality: imageData.modality || "X-Ray", // Use provided modality or default
        bodyPart: imageData.bodyPart,
        indication: imageData.indication || imageData.notes || "",
        priority: imageData.priority || "routine",
        fileName: imageData.filename,
        fileSize: imageData.fileSize,
        mimeType: imageData.mimeType || "image/jpeg", // Use provided MIME type or default
        organizationId: req.tenant!.id,
        imageData: imageData.imageData || null, // Store the base64 image data
        status: imageData.status || "uploaded" // Use provided status or default to uploaded
      }, 'uploadedBy');


      const image = await storage.createMedicalImage(dbImageData);

      res.status(201).json(image);
    } catch (error) {
      console.error("Error creating medical image:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        });
      }
      res.status(500).json({ error: "Failed to create medical image" });
    }
  });

  // Upload medical images with unique filenames to /uploads/Imaging_Images directory
  app.post("/api/medical-images/upload", authMiddleware, uploadMedicalImages.array('images', 10), async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      const uploadedImages = [];

      // Process each uploaded file
      for (const file of files) {
        // Validate form data
        const imageData = z.object({
          patientId: z.coerce.number(),
          imageType: z.string().optional(),
          bodyPart: z.string().optional(),
          notes: z.string().optional(),
          modality: z.string().optional(),
          priority: z.string().optional(),
          studyType: z.string().optional(),
          indication: z.string().optional()
        }).parse(req.body);

        // Create database record with unique filename (not original)
        const timestamp = Date.now();
        const tempImageId = `IMG${timestamp}ITEMPONC`; // Temporary placeholder
        
        const dbImageData = {
          patientId: imageData.patientId,
          organizationId: req.tenant!.id,
          uploadedBy: req.user.id,
          imageId: tempImageId, // Use temporary imageId for insert
          studyType: imageData.studyType || 'Medical Image',
          modality: imageData.modality || 'X-Ray',
          bodyPart: imageData.bodyPart || 'Not specified',
          indication: imageData.indication || imageData.notes || '',
          priority: imageData.priority || 'routine',
          fileName: file.filename, // Use the unique filename generated by multer
          fileSize: file.size,
          mimeType: file.mimetype,
          imageData: null, // Don't store imageData for file-based storage
          status: 'uploaded'
        };

        console.log('📷 Saving medical image to database with unique filename:', file.filename);
        console.log('📷 dbImageData being inserted:', JSON.stringify(dbImageData, null, 2));

        const savedImage = await storage.createMedicalImage(dbImageData);
        
        // Now generate the final image_id and filename using the database ID
        const finalImageId = `IMG${timestamp}I${savedImage.id}ONC`;
        const ext = file.filename.split('.').pop();
        const finalFileName = `${finalImageId}.${ext}`;
        
        // Rename the physical file
        const oldPath = path.join('./uploads/Imaging_Images', file.filename);
        const newPath = path.join('./uploads/Imaging_Images', finalFileName);
        
        try {
          await fs.promises.rename(oldPath, newPath);
          console.log(`📷 Renamed file from ${file.filename} to ${finalFileName}`);
        } catch (renameError) {
          console.error('Error renaming file:', renameError);
          // If rename fails, keep the old filename
        }
        
        // Update database with final image_id and filename
        await storage.updateMedicalImage(savedImage.id, req.tenant!.id, {
          imageId: finalImageId,
          fileName: finalFileName
        });
        
        // Fetch the updated record to return
        const updatedImage = await storage.getMedicalImage(savedImage.id, req.tenant!.id);
        
        uploadedImages.push({
          ...updatedImage,
          originalName: file.originalname,
          uniqueFilename: finalFileName
        });
      }

      res.status(201).json({
        message: 'Images uploaded successfully',
        images: uploadedImages
      });
    } catch (error) {
      console.error("Error uploading medical images:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        });
      }
      res.status(500).json({ error: "Failed to upload medical images" });
    }
  });

  app.delete("/api/medical-images/:id", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const imageId = parseInt(req.params.id);
      if (isNaN(imageId)) {
        return res.status(400).json({ error: "Invalid image ID" });
      }

      // First, get the medical image record to retrieve file names
      const medicalImage = await storage.getMedicalImage(imageId, req.tenant!.id);
      if (!medicalImage) {
        return res.status(404).json({ error: "Medical image not found" });
      }

      // Delete image file from server filesystem if it exists
      if (medicalImage.fileName) {
        const imagePath = path.join('./uploads/Imaging_Images', medicalImage.fileName);
        try {
          await fs.promises.unlink(imagePath);
          console.log(`Deleted image file: ${imagePath}`);
        } catch (fileError: any) {
          if (fileError.code !== 'ENOENT') {
            console.error(`Error deleting image file ${imagePath}:`, fileError);
          }
        }
      }

      // Delete PDF report file from server filesystem if it exists
      if (medicalImage.reportFileName) {
        const pdfPath = path.join('./uploads/Imaging_Images', medicalImage.reportFileName);
        try {
          await fs.promises.unlink(pdfPath);
          console.log(`Deleted PDF file: ${pdfPath}`);
        } catch (fileError: any) {
          if (fileError.code !== 'ENOENT') {
            console.error(`Error deleting PDF file ${pdfPath}:`, fileError);
          }
        }
      }

      // Delete the record from the medical_images table
      const success = await storage.deleteMedicalImage(imageId, req.tenant!.id);
      if (!success) {
        return res.status(404).json({ error: "Failed to delete medical image record" });
      }

      res.json({ 
        success: true,
        message: "Medical image and associated files deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting medical image:", error);
      res.status(500).json({ error: "Failed to delete medical image" });
    }
  });

  app.patch("/api/medical-images/:id", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const imageId = parseInt(req.params.id);
      if (isNaN(imageId)) {
        return res.status(400).json({ error: "Invalid image ID" });
      }

      // Validate update data - allow updating scheduledAt, performedAt, status, priority, and imageId
      const validatedData = z.object({
        scheduledAt: z.string().optional(),
        performedAt: z.string().optional(),
        status: z.string().optional(),
        priority: z.string().optional(),
        imageId: z.string().optional(),
      }).parse(req.body);

      // Convert ISO string dates to Date objects for database storage and handle other fields
      const updateData: any = {};
      if (validatedData.scheduledAt) {
        updateData.scheduledAt = new Date(validatedData.scheduledAt);
      }
      if (validatedData.performedAt) {
        updateData.performedAt = new Date(validatedData.performedAt);
      }
      if (validatedData.status) {
        updateData.status = validatedData.status;
      }
      if (validatedData.priority) {
        updateData.priority = validatedData.priority;
      }
      if (validatedData.imageId) {
        updateData.imageId = validatedData.imageId;
      }

      const success = await storage.updateMedicalImage(imageId, req.tenant!.id, updateData);
      
      if (!success) {
        return res.status(404).json({ error: "Medical image not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating medical image:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        });
      }
      res.status(500).json({ error: "Failed to update medical image" });
    }
  });

  // Replace medical image file  
  app.put("/api/medical-images/:id/replace", authMiddleware, uploadReplaceImages.single('file'), async (req: TenantRequest, res) => {
    try {
      const imageId = parseInt(req.params.id);
      if (isNaN(imageId)) {
        return res.status(400).json({ error: "Invalid image ID" });
      }

      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Get the existing medical image from database first to get patient ID
      const existingImage = await storage.getMedicalImage(imageId, req.tenant!.id);
      if (!existingImage) {
        return res.status(404).json({ error: "Medical image not found" });
      }

      // Get patient info for file naming
      const patient = await storage.getPatient(existingImage.patientId, req.tenant!.id);
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }

      console.log('🔄 SERVER: Replace request for existing image:', {
        imageId,
        existingFileName: existingImage.fileName,
        tempFileName: req.file.filename,
        patientId: patient.id,
        patientStringId: patient.patientId
      });

      // Keep the same filename as the existing image
      const keepFilename = existingImage.fileName;
      
      const imagingImagesDir = path.resolve(process.cwd(), 'uploads', 'Imaging_Images');
      const tempFilePath = path.join(imagingImagesDir, req.file.filename);
      const finalFilePath = path.join(imagingImagesDir, keepFilename);

      // Delete old file from filesystem if it exists
      if (existingImage.fileName) {
        try {
          const oldFilePath = path.join(imagingImagesDir, existingImage.fileName);
          if (await fse.pathExists(oldFilePath)) {
            await fse.remove(oldFilePath);
            console.log('📷 SERVER: Deleted old image file:', existingImage.fileName);
          }
        } catch (deleteError) {
          console.error('📷 SERVER: Error deleting old image file:', deleteError);
          // Continue with replacement even if old file deletion fails
        }
      }

      // Rename temp file to keep the same filename
      try {
        await fse.move(tempFilePath, finalFilePath);
        console.log('🔄 SERVER: Replaced image file keeping same filename:', {
          tempFile: req.file.filename,
          keptFilename: keepFilename
        });
      } catch (renameError) {
        console.error('🔄 SERVER: Error renaming temp file:', renameError);
        return res.status(500).json({ error: "Failed to rename uploaded file" });
      }

      // Update database record with new file information (keeping the same fileName)
      const updateData = {
        fileName: keepFilename, // Keep the same filename
        fileUrl: `/uploads/Imaging_Images/${keepFilename}`,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        uploadedBy: req.user.id,
        // Keep other existing fields unchanged
        imageData: null // Clear any base64 data since we're using filesystem storage
      };

      const success = await storage.updateMedicalImage(imageId, req.tenant!.id, updateData);
      
      if (!success) {
        return res.status(500).json({ error: "Failed to update medical image record" });
      }

      console.log('📷 SERVER: Successfully replaced image file:', keepFilename);

      // Return the updated image information
      const updatedImage = await storage.getMedicalImage(imageId, req.tenant!.id);
      res.json({ 
        success: true, 
        image: updatedImage,
        originalName: req.file.originalname,
        keptFilename: keepFilename
      });

    } catch (error) {
      console.error("Error replacing medical image:", error);
      res.status(500).json({ error: "Failed to replace medical image" });
    }
  });

  // Get medical image file
  app.get("/api/medical-images/:id/image", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const imageId = parseInt(req.params.id);
      if (isNaN(imageId)) {
        return res.status(400).json({ error: "Invalid image ID" });
      }

      // Get the medical image from the database
      const medicalImage = await storage.getMedicalImage(imageId, req.tenant!.id);
      if (!medicalImage) {
        return res.status(404).json({ error: "Medical image not found" });
      }

      // Get fileName from database
      const fileName = medicalImage.fileName;
      if (!fileName || fileName.trim() === '') {
        return res.status(404).json({ error: "Image file name not available" });
      }

      try {
        // Ensure the Imaging_Images directory exists
        const imagingImagesDir = path.resolve(process.cwd(), 'uploads', 'Imaging_Images');
        await fse.ensureDir(imagingImagesDir);
        console.log("📷 SERVER: Ensured directory exists:", imagingImagesDir);
        
        // Construct the full path to the image file
        const imageFilePath = path.join(imagingImagesDir, fileName);
        console.log("📷 SERVER: Checking for image file at:", imageFilePath);
        
        // Check if the image file exists on the server filesystem
        if (await fse.pathExists(imageFilePath)) {
          console.log("📷 SERVER: Image file exists, serving from filesystem:", fileName);
          
          // Determine MIME type from file extension
          const fileExtension = path.extname(fileName).toLowerCase();
          let mimeType = medicalImage.mimeType || 'image/jpeg';
          if (fileExtension === '.png') {
            mimeType = 'image/png';
          } else if (fileExtension === '.jpg' || fileExtension === '.jpeg') {
            mimeType = 'image/jpeg';
          }
          
          // Set appropriate headers
          res.setHeader('Content-Type', mimeType);
          res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
          res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
          
          // Stream the file from filesystem
          const fileStream = fs.createReadStream(imageFilePath);
          fileStream.pipe(res);
          return;
        } else {
          console.log("📷 SERVER: Image file not found at path, falling back to database:", imageFilePath);
        }
      } catch (filesystemError) {
        console.error("📷 SERVER: Error accessing filesystem image:", filesystemError);
      }

      // Fallback: Check if the image has base64 data in database
      if (medicalImage.imageData) {
        console.log("📷 SERVER: Fallback - serving image from database base64 data");
        
        // Set appropriate headers
        const mimeType = medicalImage.mimeType || 'image/jpeg';
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
        
        // Convert base64 to buffer and send
        const imageBuffer = Buffer.from(medicalImage.imageData, 'base64');
        res.send(imageBuffer);
        return;
      }

      // No image data available
      return res.status(404).json({ error: "Image data not available" });
    } catch (error) {
      console.error("Error serving medical image:", error);
      res.status(500).json({ error: "Failed to serve medical image" });
    }
  });

  // Lab Results API endpoints (Database-driven) - LEGACY ROUTES COMMENTED OUT
  // These duplicate routes were causing permission issues - the correct routes are defined earlier (around line 6177-6248)
  /*
  app.get("/api/lab-results", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const results = await storage.getLabResultsByOrganization(req.tenant!.id);
      res.json(results);
    } catch (error) {
      console.error("Error fetching lab results:", error);
      res.status(500).json({ error: "Failed to fetch lab results" });
    }
  });

  app.post("/api/lab-results", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const labResultData = z.object({
        patientId: z.number(),
        testName: z.string(),
        category: z.string(),
        value: z.string(),
        unit: z.string().optional(),
        referenceRange: z.string().optional(),
        status: z.enum(["pending", "completed", "reviewed"]).default("completed"),
        orderedBy: z.number(),
        notes: z.string().optional()
      }).parse(req.body);

      const result = await storage.createLabResult({
        ...labResultData,
        organizationId: req.tenant!.id,
        testId: `LAB-${Date.now()}`, // Add required testId
        testType: labResultData.category, // Add required testType
        orderedAt: new Date() // Add required orderedAt
      });

      res.status(201).json(result);
    } catch (error) {
      console.error("Error creating lab result:", error);
      res.status(500).json({ error: "Failed to create lab result" });
    }
  });
  */

  // Claims API endpoints (Database-driven)
  app.get("/api/claims", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const claims = await storage.getClaimsByOrganization(req.tenant!.id);
      res.json(claims);
    } catch (error) {
      console.error("Error fetching claims:", error);
      res.status(500).json({ error: "Failed to fetch claims" });
    }
  });

  app.post("/api/claims", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const claimData = z.object({
        patientId: z.number(),
        claimNumber: z.string(),
        insuranceProvider: z.string(),
        amount: z.number(),
        status: z.enum(["submitted", "pending", "approved", "denied", "paid"]).default("submitted"),
        submissionDate: z.string().optional(),
        description: z.string().optional()
      }).parse(req.body);

      const claim = await storage.createClaim({
        ...claimData,
        amount: claimData.amount.toString(), // Convert to string
        organizationId: req.tenant!.id,
        serviceDate: new Date(), // Add required serviceDate
        submissionDate: claimData.submissionDate ? new Date(claimData.submissionDate) : new Date() // Convert to Date
      });

      res.status(201).json(claim);
    } catch (error) {
      console.error("Error creating claim:", error);
      res.status(500).json({ error: "Failed to create claim" });
    }
  });

  // Revenue Records API endpoints (Database-driven)
  app.get("/api/revenue-records", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const records = await storage.getRevenueRecordsByOrganization(req.tenant!.id);
      res.json(records);
    } catch (error) {
      console.error("Error fetching revenue records:", error);
      res.status(500).json({ error: "Failed to fetch revenue records" });
    }
  });

  app.post("/api/revenue-records", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const revenueData = z.object({
        source: z.string(),
        amount: z.number(),
        category: z.string(),
        description: z.string().optional(),
        date: z.string().optional()
      }).parse(req.body);

      const record = await storage.createRevenueRecord({
        organizationId: req.tenant!.id,
        month: revenueData.date ? new Date(revenueData.date).toISOString().slice(0, 7) : new Date().toISOString().slice(0, 7), // YYYY-MM format
        revenue: revenueData.amount.toString(),
        expenses: "0",
        profit: revenueData.amount.toString(),
        collections: revenueData.amount.toString(),
        target: "0"
      });

      res.status(201).json(record);
    } catch (error) {
      console.error("Error creating revenue record:", error);
      res.status(500).json({ error: "Failed to create revenue record" });
    }
  });

  // Clinical Procedures API endpoints (Database-driven)
  app.get("/api/clinical-procedures", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const procedures = await storage.getClinicalProceduresByOrganization(req.tenant!.id);
      res.json(procedures);
    } catch (error) {
      console.error("Error fetching clinical procedures:", error);
      res.status(500).json({ error: "Failed to fetch clinical procedures" });
    }
  });

  app.post("/api/clinical-procedures", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const procedureData = z.object({
        name: z.string(),
        category: z.string(),
        description: z.string(),
        duration: z.number().optional(),
        requirements: z.string().optional(),
        riskLevel: z.enum(["low", "medium", "high"]).default("medium"),
        cost: z.number().optional()
      }).parse(req.body);

      const procedure = await storage.createClinicalProcedure({
        ...procedureData,
        organizationId: req.tenant!.id,
        complexity: procedureData.riskLevel, // Add required complexity field
        duration: procedureData.duration?.toString() || "30" // Convert to string
      });

      res.status(201).json(procedure);
    } catch (error) {
      console.error("Error creating clinical procedure:", error);
      res.status(500).json({ error: "Failed to create clinical procedure" });
    }
  });

  // Emergency Protocols API endpoints (Database-driven)
  app.get("/api/emergency-protocols", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const protocols = await storage.getEmergencyProtocolsByOrganization(req.tenant!.id);
      res.json(protocols);
    } catch (error) {
      console.error("Error fetching emergency protocols:", error);
      res.status(500).json({ error: "Failed to fetch emergency protocols" });
    }
  });

  app.post("/api/emergency-protocols", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const protocolData = z.object({
        title: z.string(),
        category: z.string(),
        description: z.string(),
        steps: z.string(),
        priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
        requiredPersonnel: z.string().optional(),
        equipment: z.string().optional()
      }).parse(req.body);

      const protocol = await storage.createEmergencyProtocol({
        ...protocolData,
        organizationId: req.tenant!.id,
        priority: protocolData.priority,
        steps: protocolData.steps.split('\n').filter(step => step.trim()) // Convert string to array
      });

      res.status(201).json(protocol);
    } catch (error) {
      console.error("Error creating emergency protocol:", error);
      res.status(500).json({ error: "Failed to create emergency protocol" });
    }
  });

  // Medications Database API endpoints (Database-driven)
  app.get("/api/medications-database", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const medications = await storage.getMedicationsByOrganization(req.tenant!.id);
      res.json(medications);
    } catch (error) {
      console.error("Error fetching medications:", error);
      res.status(500).json({ error: "Failed to fetch medications" });
    }
  });

  app.post("/api/medications-database", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const medicationData = z.object({
        name: z.string(),
        genericName: z.string().optional(),
        category: z.string(),
        dosageForm: z.string(),
        strength: z.string(),
        manufacturer: z.string().optional(),
        description: z.string().optional(),
        sideEffects: z.string().optional(),
        contraindications: z.string().optional(),
        interactions: z.string().optional()
      }).parse(req.body);

      const medication = await storage.createMedication({
        ...medicationData,
        organizationId: req.tenant!.id,
        severity: "medium", // Add required severity field
        dosage: medicationData.strength, // Use strength as dosage
        interactions: medicationData.interactions ? [medicationData.interactions] : null // Convert string to array
      });

      res.status(201).json(medication);
    } catch (error) {
      console.error("Error creating medication:", error);
      res.status(500).json({ error: "Failed to create medication" });
    }
  });

  // BigBlueButton Video Conference Integration
  app.post("/api/video-conference/create", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const meetingData = z.object({
        meetingName: z.string(),
        participantName: z.string(),
        moderatorPassword: z.string().optional(),
        attendeePassword: z.string().optional(),
        duration: z.number().optional().default(60), // duration in minutes
        maxParticipants: z.number().optional().default(10)
      }).parse(req.body);
      const BBB_URL = "https://vid2.averox.com/bigbluebutton/";
      const BBB_SECRET = "W8tt2cQCSIy43cGwrGDfeKMEdQn1Bfm9l3aygXn8XA";

      // Generate meeting ID and passwords
      const meetingID = `cura-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const moderatorPW = meetingData.moderatorPassword || `mod-${Math.random().toString(36).substr(2, 8)}`;
      const attendeePW = meetingData.attendeePassword || `att-${Math.random().toString(36).substr(2, 8)}`;

      // Create meeting parameters
      const createParams = new URLSearchParams({
        name: meetingData.meetingName,
        meetingID: meetingID,
        moderatorPW: moderatorPW,
        attendeePW: attendeePW,
        duration: meetingData.duration.toString(),
        maxParticipants: meetingData.maxParticipants.toString(),
        record: 'false',
        autoStartRecording: 'false',
        allowStartStopRecording: 'false',
        webcamsOnlyForModerator: 'false',
        logo: '',
        bannerText: `Cura Video Consultation - ${meetingData.meetingName}`,
        bannerColor: '#4F46E5',
        copyright: 'Powered by Cura EMR',
        muteOnStart: 'false',
        guestPolicy: 'ALWAYS_ACCEPT'
      });

      // Generate checksum for create API call
      const createQuery = `create${createParams.toString()}${BBB_SECRET}`;
      const createChecksum = crypto.createHash('sha1').update(createQuery).digest('hex');
      
      // Create the meeting
      const createUrl = `${BBB_URL}api/create?${createParams.toString()}&checksum=${createChecksum}`;
      
      const createResponse = await fetch(createUrl, { method: 'GET' });
      const createXML = await createResponse.text();

      // Parse XML response to check if meeting was created successfully
      const isSuccess = createXML.includes('<returncode>SUCCESS</returncode>');
      
      if (!isSuccess) {
        throw new Error('Failed to create BigBlueButton meeting');
      }

      // Generate join URLs for moderator and attendee
      const moderatorJoinParams = new URLSearchParams({
        fullName: `${meetingData.participantName} (Moderator)`,
        meetingID: meetingID,
        password: moderatorPW,
        redirect: 'true',
        clientURL: `${BBB_URL}html5client/join`
      });

      const attendeeJoinParams = new URLSearchParams({
        fullName: meetingData.participantName,
        meetingID: meetingID,
        password: attendeePW,
        redirect: 'true',
        clientURL: `${BBB_URL}html5client/join`
      });

      const moderatorJoinQuery = `join${moderatorJoinParams.toString()}${BBB_SECRET}`;
      const moderatorJoinChecksum = crypto.createHash('sha1').update(moderatorJoinQuery).digest('hex');
      const moderatorJoinUrl = `${BBB_URL}api/join?${moderatorJoinParams.toString()}&checksum=${moderatorJoinChecksum}`;

      const attendeeJoinQuery = `join${attendeeJoinParams.toString()}${BBB_SECRET}`;
      const attendeeJoinChecksum = crypto.createHash('sha1').update(attendeeJoinQuery).digest('hex');
      const attendeeJoinUrl = `${BBB_URL}api/join?${attendeeJoinParams.toString()}&checksum=${attendeeJoinChecksum}`;

      res.json({
        success: true,
        meetingID: meetingID,
        meetingName: meetingData.meetingName,
        moderatorJoinUrl: moderatorJoinUrl,
        attendeeJoinUrl: attendeeJoinUrl,
        moderatorPassword: moderatorPW,
        attendeePassword: attendeePW,
        duration: meetingData.duration,
        maxParticipants: meetingData.maxParticipants
      });

    } catch (error) {
      console.error("Error creating BigBlueButton meeting:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        });
      }
      res.status(500).json({ error: "Failed to create video conference" });
    }
  });

  // End meeting endpoint
  app.post("/api/video-conference/end/:meetingID", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const { meetingID } = req.params;
      const { moderatorPassword } = req.body;
      const BBB_URL = "https://vid2.averox.com/bigbluebutton/";
      const BBB_SECRET = "W8tt2cQCSIy43cGwrGDfeKMEdQn1Bfm9l3aygXn8XA";

      const endParams = new URLSearchParams({
        meetingID: meetingID,
        password: moderatorPassword
      });

      const endQuery = `end${endParams.toString()}${BBB_SECRET}`;
      const endChecksum = crypto.createHash('sha1').update(endQuery).digest('hex');
      const endUrl = `${BBB_URL}api/end?${endParams.toString()}&checksum=${endChecksum}`;

      const endResponse = await fetch(endUrl, { method: 'GET' });
      const endXML = await endResponse.text();

      const isSuccess = endXML.includes('<returncode>SUCCESS</returncode>');

      res.json({
        success: isSuccess,
        message: isSuccess ? 'Meeting ended successfully' : 'Failed to end meeting'
      });

    } catch (error) {
      console.error("Error ending BigBlueButton meeting:", error);
      res.status(500).json({ error: "Failed to end video conference" });
    }
  });

  // Telemedicine API endpoints
  app.get("/api/telemedicine/consultations", authMiddleware, async (req: TenantRequest, res) => {
    try {
      // Mock consultation data for now - in production this would come from database
      const consultations = [
        {
          id: "1",
          patientId: "1",
          patientName: "Sarah Johnson",
          providerId: "1", 
          providerName: "Dr. Smith",
          type: "video",
          status: "completed",
          scheduledTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
          duration: 30,
          notes: "Follow-up consultation for hypertension management. Patient reports improved blood pressure readings.",
          vitalSigns: {
            heartRate: 72,
            bloodPressure: "128/82",
            temperature: 98.6,
            oxygenSaturation: 98
          },
          prescriptions: [
            {
              medication: "Lisinopril",
              dosage: "10mg",
              instructions: "Take once daily in the morning"
            }
          ]
        },
        {
          id: "2", 
          patientId: "2",
          patientName: "Michael Chen",
          providerId: "1",
          providerName: "Dr. Smith", 
          type: "video",
          status: "scheduled",
          scheduledTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes from now
          duration: 15,
          notes: "Diabetes follow-up and medication review",
          vitalSigns: {
            heartRate: 78,
            bloodPressure: "135/85", 
            temperature: 98.6,
            oxygenSaturation: 97
          }
        }
      ];
      
      res.json(consultations);
    } catch (error) {
      console.error("Error fetching consultations:", error);
      res.status(500).json({ error: "Failed to fetch consultations" });
    }
  });

  app.get("/api/telemedicine/waiting-room", authMiddleware, async (req: TenantRequest, res) => {
    try {
      // Mock waiting room data
      const waitingRoom = [
        {
          patientId: "1",
          patientName: "Sarah Johnson", 
          appointmentTime: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
          waitTime: 5,
          priority: "normal"
        },
        {
          patientId: "3",
          patientName: "Emma Davis",
          appointmentTime: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago  
          waitTime: 15,
          priority: "urgent"
        }
      ];
      
      res.json(waitingRoom);
    } catch (error) {
      console.error("Error fetching waiting room:", error);
      res.status(500).json({ error: "Failed to fetch waiting room data" });
    }
  });

  app.post("/api/telemedicine/consultations/:id/start", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const { id } = req.params;
      
      // In production, this would update the consultation status in database
      res.json({
        success: true,
        message: "Consultation started successfully",
        consultationId: id,
        meetingUrl: `https://vid2.averox.com/join/${id}`
      });
    } catch (error) {
      console.error("Error starting consultation:", error);
      res.status(500).json({ error: "Failed to start consultation" });
    }
  });

  app.post("/api/telemedicine/consultations/:id/end", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const { id } = req.params;
      const { notes, duration } = req.body;
      
      // In production, this would update the consultation in database
      res.json({
        success: true,
        message: "Consultation ended successfully",
        consultationId: id,
        duration: duration || 30,
        notes: notes || "Consultation completed"
      });
    } catch (error) {
      console.error("Error ending consultation:", error);
      res.status(500).json({ error: "Failed to end consultation" });
    }
  });

  app.post("/api/telemedicine/consultations", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const { patientId, scheduledTime, notes } = req.body;
      
      // In production, this would create a new consultation in database
      const newConsultation = {
        id: Date.now().toString(),
        patientId,
        patientName: "Patient", // Would be fetched from database
        providerId: req.user!.id,
        providerName: `${(req.user as any).firstName || ''} ${(req.user as any).lastName || ''}`,
        type: "video",
        status: "scheduled", 
        scheduledTime,
        notes: notes || "",
        organizationId: req.tenant!.id
      };
      
      res.status(201).json(newConsultation);
    } catch (error) {
      console.error("Error creating consultation:", error);
      res.status(500).json({ error: "Failed to create consultation" });
    }
  });

  // Get telemedicine users with role-based filtering
  app.get("/api/telemedicine/users", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const userRole = req.user!.role;
      const organizationId = req.tenant!.id;
      
      // Fetch all users from the organization
      const allUsers = await storage.getUsersByOrganization(organizationId);
      
      // If admin, return all users
      if (userRole === 'admin') {
        res.json(allUsers);
      } else {
        // For non-admin users, filter out patients
        const nonPatientUsers = allUsers.filter(u => u.role !== 'patient');
        res.json(nonPatientUsers);
      }
    } catch (error) {
      console.error("Error fetching telemedicine users:", error);
      res.status(500).json({ error: "Failed to fetch telemedicine users" });
    }
  });

  // Email Service API endpoints
  app.post("/api/email/appointment-reminder", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const emailData = z.object({
        patientEmail: z.string().email(),
        patientName: z.string(),
        doctorName: z.string(),
        appointmentDate: z.string(),
        appointmentTime: z.string()
      }).parse(req.body);

      const success = await emailService.sendAppointmentReminder(
        emailData.patientEmail,
        emailData.patientName,
        emailData.doctorName,
        emailData.appointmentDate,
        emailData.appointmentTime
      );

      if (success) {
        res.json({ success: true, message: "Appointment reminder sent successfully" });
      } else {
        res.status(500).json({ error: "Failed to send appointment reminder" });
      }
    } catch (error) {
      console.error("Error sending appointment reminder:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        });
      }
      res.status(500).json({ error: "Failed to send appointment reminder" });
    }
  });

  app.post("/api/email/prescription-notification", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const emailData = z.object({
        patientEmail: z.string().email(),
        patientName: z.string(),
        medicationName: z.string(),
        dosage: z.string(),
        instructions: z.string()
      }).parse(req.body);

      const success = await emailService.sendPrescriptionNotification(
        emailData.patientEmail,
        emailData.patientName,
        emailData.medicationName,
        emailData.dosage,
        emailData.instructions
      );

      if (success) {
        res.json({ success: true, message: "Prescription notification sent successfully" });
      } else {
        res.status(500).json({ error: "Failed to send prescription notification" });
      }
    } catch (error) {
      console.error("Error sending prescription notification:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        });
      }
      res.status(500).json({ error: "Failed to send prescription notification" });
    }
  });

  app.post("/api/email/test-results", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const emailData = z.object({
        patientEmail: z.string().email(),
        patientName: z.string(),
        testName: z.string(),
        status: z.string()
      }).parse(req.body);

      const success = await emailService.sendTestResultsNotification(
        emailData.patientEmail,
        emailData.patientName,
        emailData.testName,
        emailData.status
      );

      if (success) {
        res.json({ success: true, message: "Test results notification sent successfully" });
      } else {
        res.status(500).json({ error: "Failed to send test results notification" });
      }
    } catch (error) {
      console.error("Error sending test results notification:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        });
      }
      res.status(500).json({ error: "Failed to send test results notification" });
    }
  });

  app.post("/api/email/custom", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const emailData = z.object({
        to: z.string().email(),
        subject: z.string(),
        text: z.string().optional(),
        html: z.string().optional()
      }).parse(req.body);

      const success = await emailService.sendEmail(emailData);

      if (success) {
        res.json({ success: true, message: "Email sent successfully" });
      } else {
        res.status(500).json({ error: "Failed to send email" });
      }
    } catch (error) {
      console.error("Error sending custom email:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        });
      }
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  // Send Letter with PDF attachment
  app.post("/api/email/send-letter", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const emailData = z.object({
        to: z.string().email(),
        subject: z.string(),
        documentContent: z.string(),
        doctorEmail: z.union([z.string().email(), z.literal("")]).optional(),
        location: z.string().optional(),
        copiedRecipients: z.string().optional(),
        header: z.string().optional(),
      }).parse(req.body);

      // Send email with HTML content directly
      const success = await emailService.sendEmail({
        to: emailData.to,
        subject: emailData.subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
              Medical Document
            </h2>
            <div style="margin: 20px 0; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
              ${emailData.documentContent}
            </div>
            <p style="color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 15px;">
              This document was generated from your healthcare provider's system.<br>
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        `
      });

      if (success) {
        res.json({ success: true, message: "Letter sent successfully" });
      } else {
        // Email sending failed, save as draft
        console.log("Email sending failed, saving as draft...");
        try {
          const draft = await storage.createLetterDraft({
            subject: emailData.subject,
            recipient: emailData.to,
            doctorEmail: emailData.doctorEmail,
            location: emailData.location,
            copiedRecipients: emailData.copiedRecipients,
            header: emailData.header,
            documentContent: emailData.documentContent,
            organizationId: req.tenant!.id,
            userId: req.user!.id,
          });
          
          res.json({ 
            success: false, 
            savedAsDraft: true, 
            draftId: draft.id,
            message: "Email delivery failed but letter saved as draft. You can retry sending from your drafts." 
          });
        } catch (draftError) {
          console.error("Error saving draft:", draftError);
          res.status(500).json({ error: "Failed to send letter and unable to save draft" });
        }
      }
    } catch (error) {
      console.error("Error sending letter:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        });
      }

      // Try to save as draft even if there's an error
      try {
        const emailData = req.body;
        if (emailData.to && emailData.subject && emailData.documentContent) {
          const draft = await storage.createLetterDraft({
            subject: emailData.subject,
            recipient: emailData.to,
            doctorEmail: emailData.doctorEmail,
            location: emailData.location,
            copiedRecipients: emailData.copiedRecipients,
            header: emailData.header,
            documentContent: emailData.documentContent,
            organizationId: req.tenant!.id,
            userId: req.user!.id,
          });
          
          res.status(500).json({ 
            error: "Failed to send letter", 
            savedAsDraft: true, 
            draftId: draft.id,
            message: "Error occurred but letter saved as draft. You can retry sending from your drafts."
          });
        } else {
          res.status(500).json({ error: "Failed to send letter" });
        }
      } catch (draftError) {
        console.error("Error saving draft after failure:", draftError);
        res.status(500).json({ error: "Failed to send letter" });
      }
    }
  });

  // Letter Drafts endpoints
  app.get("/api/letter-drafts", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const drafts = await storage.getLetterDraftsByUser(req.user!.id, req.tenant!.id);
      res.json(drafts);
    } catch (error) {
      console.error("Error getting letter drafts:", error);
      res.status(500).json({ error: "Failed to get letter drafts" });
    }
  });

  app.post("/api/letter-drafts", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const draftData = z.object({
        subject: z.string(),
        recipient: z.string(),
        doctorEmail: z.string().optional(),
        location: z.string().optional(),
        copiedRecipients: z.string().optional(),
        header: z.string().optional(),
        documentContent: z.string(),
      }).parse(req.body);

      const draft = await storage.createLetterDraft({
        ...draftData,
        organizationId: req.tenant!.id,
        userId: req.user!.id,
      });

      res.json(draft);
    } catch (error) {
      console.error("Error creating letter draft:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        });
      }
      res.status(500).json({ error: "Failed to create letter draft" });
    }
  });

  app.get("/api/letter-drafts/:id", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const draft = await storage.getLetterDraft(id, req.tenant!.id);
      
      if (!draft) {
        return res.status(404).json({ error: "Draft not found" });
      }

      // Check if the user owns the draft
      if (draft.userId !== req.user!.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json(draft);
    } catch (error) {
      console.error("Error getting letter draft:", error);
      res.status(500).json({ error: "Failed to get letter draft" });
    }
  });

  app.put("/api/letter-drafts/:id", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = z.object({
        subject: z.string().optional(),
        recipient: z.string().optional(),
        doctorEmail: z.string().optional(),
        location: z.string().optional(),
        copiedRecipients: z.string().optional(),
        header: z.string().optional(),
        documentContent: z.string().optional(),
      }).parse(req.body);

      // Check if the draft exists and user owns it
      const existingDraft = await storage.getLetterDraft(id, req.tenant!.id);
      if (!existingDraft) {
        return res.status(404).json({ error: "Draft not found" });
      }
      if (existingDraft.userId !== req.user!.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      const updatedDraft = await storage.updateLetterDraft(id, req.tenant!.id, updateData);
      res.json(updatedDraft);
    } catch (error) {
      console.error("Error updating letter draft:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        });
      }
      res.status(500).json({ error: "Failed to update letter draft" });
    }
  });

  app.delete("/api/letter-drafts/:id", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if the draft exists and user owns it
      const existingDraft = await storage.getLetterDraft(id, req.tenant!.id);
      if (!existingDraft) {
        return res.status(404).json({ error: "Draft not found" });
      }
      if (existingDraft.userId !== req.user!.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      const deleted = await storage.deleteLetterDraft(id, req.tenant!.id);
      if (deleted) {
        res.json({ success: true, message: "Draft deleted successfully" });
      } else {
        res.status(500).json({ error: "Failed to delete draft" });
      }
    } catch (error) {
      console.error("Error deleting letter draft:", error);
      res.status(500).json({ error: "Failed to delete letter draft" });
    }
  });

  // Financial Forecasting endpoints
  app.get("/api/financial-forecasting", authMiddleware, requireRole(["admin", "doctor"]), async (req: TenantRequest, res) => {
    try {
      const forecasts = await storage.getFinancialForecasts(req.tenant!.id);
      res.json(forecasts);
    } catch (error) {
      console.error("Error getting financial forecasts:", error);
      res.status(500).json({ error: "Failed to get financial forecasts" });
    }
  });

  app.get("/api/financial-forecasting/:id", authMiddleware, requireRole(["admin", "doctor"]), async (req: TenantRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid forecast ID" });
      }

      const forecast = await storage.getFinancialForecast(id, req.tenant!.id);
      if (!forecast) {
        return res.status(404).json({ error: "Forecast not found" });
      }

      res.json(forecast);
    } catch (error) {
      console.error("Error getting financial forecast:", error);
      res.status(500).json({ error: "Failed to get financial forecast" });
    }
  });

  app.post("/api/financial-forecasting/generate", authMiddleware, requireRole(["admin", "doctor"]), async (req: TenantRequest, res) => {
    try {
      const forecasts = await storage.generateFinancialForecasts(req.tenant!.id);
      res.json(forecasts);
    } catch (error) {
      console.error("Error generating financial forecasts:", error);
      res.status(500).json({ error: "Failed to generate financial forecasts" });
    }
  });

  app.put("/api/financial-forecasting/:id", authMiddleware, requireRole(["admin", "doctor"]), async (req: TenantRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid forecast ID" });
      }

      const updateData = z.object({
        category: z.string().optional(),
        forecastPeriod: z.string().optional(),
        currentValue: z.number().optional(),
        projectedValue: z.number().optional(),
        variance: z.number().optional(),
        trend: z.enum(['up', 'down', 'stable']).optional(),
        confidence: z.number().min(0).max(100).optional(),
        methodology: z.string().optional(),
        keyFactors: z.array(z.object({
          factor: z.string(),
          impact: z.enum(['positive', 'negative', 'neutral']),
          weight: z.number(),
          description: z.string()
        })).optional(),
        metadata: z.record(z.any()).optional(),
        isActive: z.boolean().optional()
      }).parse(req.body);

      const updatedForecast = await storage.updateFinancialForecast(id, req.tenant!.id, updateData);
      if (!updatedForecast) {
        return res.status(404).json({ error: "Forecast not found" });
      }

      res.json(updatedForecast);
    } catch (error) {
      console.error("Error updating financial forecast:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        });
      }
      res.status(500).json({ error: "Failed to update financial forecast" });
    }
  });

  app.delete("/api/financial-forecasting/:id", authMiddleware, requireRole(["admin", "doctor"]), async (req: TenantRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid forecast ID" });
      }

      const deleted = await storage.deleteFinancialForecast(id, req.tenant!.id);
      if (deleted) {
        res.json({ success: true, message: "Forecast deleted successfully" });
      } else {
        res.status(404).json({ error: "Forecast not found" });
      }
    } catch (error) {
      console.error("Error deleting financial forecast:", error);
      res.status(500).json({ error: "Failed to delete financial forecast" });
    }
  });

  // Forecast Models endpoints
  app.get("/api/forecast-models", authMiddleware, requireRole(["admin", "doctor"]), async (req: TenantRequest, res) => {
    try {
      const models = await storage.getForecastModels(req.tenant!.id);
      res.json(models);
    } catch (error) {
      console.error("Error getting forecast models:", error);
      res.status(500).json({ error: "Failed to get forecast models" });
    }
  });

  app.get("/api/forecast-models/:id", authMiddleware, requireRole(["admin", "doctor"]), async (req: TenantRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid model ID" });
      }

      const model = await storage.getForecastModel(id, req.tenant!.id);
      if (!model) {
        return res.status(404).json({ error: "Model not found" });
      }

      res.json(model);
    } catch (error) {
      console.error("Error getting forecast model:", error);
      res.status(500).json({ error: "Failed to get forecast model" });
    }
  });

  app.post("/api/forecast-models", authMiddleware, requireRole(["admin", "doctor"]), async (req: TenantRequest, res) => {
    try {
      const modelData = z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        modelType: z.enum(['regression', 'arima', 'exponential_smoothing', 'neural_network', 'ensemble']),
        parameters: z.record(z.any()),
        dataRequirements: z.array(z.string()),
        accuracy: z.number().min(0).max(100).optional(),
        isActive: z.boolean().default(true)
      }).parse(req.body);

      const model = await storage.createForecastModel({
        ...modelData,
        organizationId: req.tenant!.id
      });

      res.status(201).json(model);
    } catch (error) {
      console.error("Error creating forecast model:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        });
      }
      res.status(500).json({ error: "Failed to create forecast model" });
    }
  });

  app.put("/api/forecast-models/:id", authMiddleware, requireRole(["admin", "doctor"]), async (req: TenantRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid model ID" });
      }

      const updateData = z.object({
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        modelType: z.enum(['regression', 'arima', 'exponential_smoothing', 'neural_network', 'ensemble']).optional(),
        parameters: z.record(z.any()).optional(),
        dataRequirements: z.array(z.string()).optional(),
        accuracy: z.number().min(0).max(100).optional(),
        isActive: z.boolean().optional()
      }).parse(req.body);

      const updatedModel = await storage.updateForecastModel(id, req.tenant!.id, updateData);
      if (!updatedModel) {
        return res.status(404).json({ error: "Model not found" });
      }

      res.json(updatedModel);
    } catch (error) {
      console.error("Error updating forecast model:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        });
      }
      res.status(500).json({ error: "Failed to update forecast model" });
    }
  });

  app.delete("/api/forecast-models/:id", authMiddleware, requireRole(["admin", "doctor"]), async (req: TenantRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid model ID" });
      }

      const deleted = await storage.deleteForecastModel(id, req.tenant!.id);
      if (deleted) {
        res.json({ success: true, message: "Model deleted successfully" });
      } else {
        res.status(404).json({ error: "Model not found" });
      }
    } catch (error) {
      console.error("Error deleting forecast model:", error);
      res.status(500).json({ error: "Failed to delete forecast model" });
    }
  });

  // PDF Email endpoint for prescriptions with file attachments
  app.post("/api/prescriptions/:id/send-pdf", authMiddleware, upload.array('attachments', 5), async (req: TenantRequest, res) => {
    try {
      console.log('[PRESCRIPTION-EMAIL] ===== STARTING EMAIL SEND PROCESS =====');
      const prescriptionId = parseInt(req.params.id);
      
      // Parse form data fields
      const pharmacyEmail = req.body.pharmacyEmail;
      const pharmacyName = req.body.pharmacyName || 'Pharmacy Team';
      let patientName = req.body.patientName;

      // Validate required fields
      if (!pharmacyEmail || !pharmacyEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        console.log('[PRESCRIPTION-EMAIL] ❌ Invalid email address:', pharmacyEmail);
        return res.status(400).json({ error: "Valid pharmacy email is required" });
      }

      console.log('[PRESCRIPTION-EMAIL] Email request data:', {
        prescriptionId,
        pharmacyEmail,
        pharmacyName,
        patientName,
        attachmentsCount: req.files?.length || 0
      });

      // If no patient name provided, try to get it from the prescription record
      if (!patientName) {
        try {
          const prescription = await storage.getPrescription(prescriptionId, req.tenant!.id);
          if (prescription && prescription.patientId) {
            const patient = await storage.getPatient(prescription.patientId, req.tenant!.id);
            if (patient) {
              patientName = `${patient.firstName} ${patient.lastName}`.trim();
            }
          }
        } catch (error) {
          console.log('Could not fetch patient name from prescription:', error);
          patientName = 'Patient';
        }
      }

      console.log('Final patient name used in email:', patientName);

      // Get organization info for logo and branding
      const organization = await storage.getOrganization(req.tenant!.id);
      const clinicLogoUrl = organization?.settings?.theme?.logoUrl;
      const organizationName = organization?.brandName || organization?.name;

      // Prepare attachments array including user uploaded files
      const attachments: any[] = [];

      // Add user-uploaded file attachments
      if (req.files && Array.isArray(req.files)) {
        req.files.forEach((file: Express.Multer.File, index: number) => {
          attachments.push({
            filename: file.originalname,
            content: file.buffer,
            contentType: file.mimetype
          });
          console.log(`Added attachment ${index + 1}: ${file.originalname} (${file.size} bytes)`);
        });
      }

      // Generate professional HTML email template with clinic logo and branding
      // Always hide "PDF Attachment Included" section as per user requirement
      const emailTemplate = emailService.generatePrescriptionEmail(
        patientName || 'Patient',
        pharmacyName,
        undefined, // prescriptionData - not needed for this basic email
        clinicLogoUrl,
        organizationName,
        false // hasAttachments - always false to hide the attachment notice section
      );

      // TODO: In a real implementation, generate and add prescription PDF here
      // For now, we'll send the professional HTML email with user attachments
      console.log('[PRESCRIPTION-EMAIL] Calling emailService.sendEmail()...');
      const success = await emailService.sendEmail({
        to: pharmacyEmail,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
        text: emailTemplate.text,
        attachments: attachments.length > 0 ? attachments : undefined
      });

      console.log('[PRESCRIPTION-EMAIL] emailService.sendEmail() returned:', success);

      if (success) {
        const attachmentInfo = attachments.length > 0 
          ? ` with ${attachments.length} attachment(s)`
          : '';
        console.log('[PRESCRIPTION-EMAIL] ✅ Email sent successfully to:', pharmacyEmail);
        res.json({ 
          success: true, 
          message: `Prescription email sent successfully to ${pharmacyEmail}${attachmentInfo}`,
          attachmentsCount: attachments.length
        });
      } else {
        console.log('[PRESCRIPTION-EMAIL] ❌ Email service returned false - email not sent');
        res.status(500).json({ error: "Failed to send prescription email" });
      }
    } catch (error) {
      console.error("[PRESCRIPTION-EMAIL] ❌ Exception occurred:", error);
      if (error instanceof Error && error.message?.includes('Invalid file type')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to send prescription PDF" });
    }
  });

  // Shift Management API endpoints
  app.get("/api/shifts", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const { date } = req.query as { date?: string };
      
      // Server-side enforcement: Doctors can only see their own shifts
      let createdByFilter: number | undefined = undefined;
      if (req.user && isDoctorLike(req.user.role)) {
        createdByFilter = req.user.id;
        console.log("GET /api/shifts - Doctor role detected, enforcing created_by filter:", createdByFilter);
      }
      
      console.log("GET /api/shifts - Fetching shifts for organization:", req.tenant!.id, "date filter:", date, "createdBy filter:", createdByFilter);
      const shifts = await storage.getStaffShiftsByOrganization(req.tenant!.id, date, createdByFilter);
      console.log("GET /api/shifts - Found shifts count:", shifts.length);
      console.log("GET /api/shifts - Shifts data:", shifts.map(s => ({ id: s.id, staffId: s.staffId, date: s.date, startTime: s.startTime, endTime: s.endTime })));
      res.json(shifts);
    } catch (error) {
      console.error("Error fetching shifts:", error);
      res.status(500).json({ error: "Failed to fetch shifts" });
    }
  });

  app.get("/api/shifts/:id", authMiddleware, requireRole(["admin"]), async (req: TenantRequest, res) => {
    try {
      const shiftId = parseInt(req.params.id);
      const shift = await storage.getStaffShift(shiftId, req.tenant!.id);
      
      if (!shift) {
        return res.status(404).json({ error: "Shift not found" });
      }
      
      res.json(shift);
    } catch (error) {
      console.error("Error fetching shift:", error);
      res.status(500).json({ error: "Failed to fetch shift" });
    }
  });

  app.post("/api/shifts", authMiddleware, requireRole(["admin", "doctor", "nurse"]), async (req: TenantRequest, res) => {
    try {
      const shiftData = z.object({
        staffId: z.number(),
        date: z.string(),
        shiftType: z.enum(["regular", "overtime", "on_call", "absent"]),
        startTime: z.string(),
        endTime: z.string(),
        status: z.enum(["scheduled", "completed", "cancelled", "absent"]).default("scheduled"),
        notes: z.string().optional(),
        isAvailable: z.boolean().default(true)
      }).parse(req.body);

      const shift = await storage.createStaffShift(enforceCreatedBy(req, {
        ...shiftData,
        organizationId: req.tenant!.id,
        date: new Date(shiftData.date)
      }));

      res.status(201).json(shift);
    } catch (error) {
      console.error("Error creating shift:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        });
      }
      res.status(500).json({ error: "Failed to create shift" });
    }
  });

  app.put("/api/shifts/:id", authMiddleware, requireRole(["admin"]), async (req: TenantRequest, res) => {
    try {
      const shiftId = parseInt(req.params.id);
      const updateData = z.object({
        staffId: z.number().optional(),
        date: z.string().optional(),
        shiftType: z.enum(["regular", "overtime", "on_call", "absent"]).optional(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        status: z.enum(["scheduled", "completed", "cancelled", "absent"]).optional(),
        notes: z.string().optional(),
        isAvailable: z.boolean().optional()
      }).parse(req.body);

      const processedData: any = { ...updateData };
      if (updateData.date) {
        processedData.date = new Date(updateData.date);
      }

      const shift = await storage.updateStaffShift(shiftId, req.tenant!.id, processedData);
      
      if (!shift) {
        return res.status(404).json({ error: "Shift not found" });
      }
      
      res.json(shift);
    } catch (error) {
      console.error("Error updating shift:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        });
      }
      res.status(500).json({ error: "Failed to update shift" });
    }
  });

  app.delete("/api/shifts/:id", authMiddleware, requireRole(["admin"]), async (req: TenantRequest, res) => {
    try {
      const shiftId = parseInt(req.params.id);
      const deleted = await storage.deleteStaffShift(shiftId, req.tenant!.id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Shift not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting shift:", error);
      res.status(500).json({ error: "Failed to delete shift" });
    }
  });

  app.get("/api/shifts/staff/:staffId", authMiddleware, requireRole(["admin"]), async (req: TenantRequest, res) => {
    try {
      const staffId = parseInt(req.params.staffId);
      const { date } = req.query as { date?: string };
      const shifts = await storage.getStaffShiftsByStaff(staffId, req.tenant!.id, date);
      res.json(shifts);
    } catch (error) {
      console.error("Error fetching staff shifts:", error);
      res.status(500).json({ error: "Failed to fetch staff shifts" });
    }
  });

  // Default Shifts API endpoints
  app.get("/api/default-shifts", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const organizationId = req.tenant!.id;
      const userId = req.user?.id;
      const isAdmin = req.user?.role === 'admin' || req.user?.role === 'administrator';
      const forBooking = req.query.forBooking === 'true';

      let defaultShifts;
      
      // Allow all users to fetch all default shifts when booking appointments
      if (isAdmin || forBooking) {
        defaultShifts = await storage.getDefaultShiftsByOrganization(organizationId);
      } else {
        defaultShifts = await storage.getDefaultShiftByUser(userId!, organizationId);
        defaultShifts = defaultShifts ? [defaultShifts] : [];
      }

      res.json(defaultShifts);
    } catch (error) {
      console.error("Error fetching default shifts:", error);
      res.status(500).json({ error: "Failed to fetch default shifts" });
    }
  });

  app.get("/api/default-shifts/:userId", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const organizationId = req.tenant!.id;
      const requestingUserId = req.user?.id;
      const isAdmin = req.user?.role === 'admin' || req.user?.role === 'administrator';

      if (!isAdmin && userId !== requestingUserId) {
        return res.status(403).json({ error: "Forbidden: Can only view your own default shift" });
      }

      const defaultShift = await storage.getDefaultShiftByUser(userId, organizationId);
      
      if (!defaultShift) {
        return res.status(404).json({ error: "Default shift not found" });
      }

      res.json(defaultShift);
    } catch (error) {
      console.error("Error fetching default shift:", error);
      res.status(500).json({ error: "Failed to fetch default shift" });
    }
  });

  app.patch("/api/default-shifts/:userId", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const organizationId = req.tenant!.id;
      const requestingUserId = req.user?.id;
      const isAdmin = req.user?.role === 'admin' || req.user?.role === 'administrator';

      if (!isAdmin && userId !== requestingUserId) {
        return res.status(403).json({ error: "Forbidden: Can only edit your own default shift" });
      }

      const updateData = z.object({
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        workingDays: z.array(z.string()).optional(),
      }).parse(req.body);

      const updatedShift = await storage.updateDefaultShift(userId, organizationId, updateData);

      if (!updatedShift) {
        return res.status(404).json({ error: "Default shift not found" });
      }

      res.json(updatedShift);
    } catch (error) {
      console.error("Error updating default shift:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        });
      }
      res.status(500).json({ error: "Failed to update default shift" });
    }
  });

  app.post("/api/default-shifts/initialize", authMiddleware, requireRole(["admin"]), async (req: TenantRequest, res) => {
    try {
      const organizationId = req.tenant!.id;
      
      const result = await storage.initializeDefaultShifts(organizationId);

      res.json({
        message: "Default shifts initialized successfully",
        created: result.created,
        skipped: result.skipped,
        total: result.created + result.skipped
      });
    } catch (error) {
      console.error("Error initializing default shifts:", error);
      res.status(500).json({ error: "Failed to initialize default shifts" });
    }
  });

  app.delete("/api/default-shifts/:userId", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const organizationId = req.tenant!.id;
      const requestingUserId = req.user?.id;
      const isAdmin = req.user?.role === "admin";

      if (!isAdmin && userId !== requestingUserId) {
        return res.status(403).json({ error: "Forbidden: Can only delete your own default shift" });
      }

      const deleted = await storage.deleteDefaultShift(userId, organizationId);

      if (!deleted) {
        return res.status(404).json({ error: "Default shift not found" });
      }

      res.json({ message: "Default shift deleted successfully" });
    } catch (error) {
      console.error("Error deleting default shift:", error);
      res.status(500).json({ error: "Failed to delete default shift" });
    }
  });

  app.delete("/api/default-shifts/all", authMiddleware, requireRole(["admin"]), async (req: TenantRequest, res) => {
    try {
      const organizationId = req.tenant!.id;
      
      const result = await storage.deleteAllDefaultShifts(organizationId);

      res.json({
        message: "All default shifts deleted successfully",
        deleted: result.deleted
      });
    } catch (error) {
      console.error("Error deleting all default shifts:", error);
      res.status(500).json({ error: "Failed to delete all default shifts" });
    }
  });

  // Mobile API endpoints for Doctor and Patient apps
  
  // Doctor Mobile API endpoints
  app.get("/api/mobile/doctor/dashboard", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      // Get doctor's dashboard data
      const todayAppointments = await storage.getAppointmentsByProvider(userId, req.tenant!.id);
      const totalPatients = await storage.getPatientsByOrganization(req.tenant!.id);
      const pendingPrescriptions = await storage.getPrescriptionsByProvider(userId, req.tenant!.id);
      
      res.json({
        todayAppointments: todayAppointments.filter(apt => {
          const aptDate = new Date(apt.scheduledAt);
          const today = new Date();
          return aptDate.toDateString() === today.toDateString();
        }).length,
        totalPatients: totalPatients.length,
        pendingPrescriptions: pendingPrescriptions.filter(p => p.status === 'pending').length,
        upcomingAppointments: todayAppointments.slice(0, 5).map(apt => ({
          id: apt.id,
          patientName: `Patient ${apt.patientId}`,
          time: apt.scheduledAt,
          type: apt.type,
          status: apt.status
        }))
      });
    } catch (error) {
      console.error("Error fetching doctor dashboard:", error);
      res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
  });

  app.get("/api/mobile/doctor/patients", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const patients = await storage.getPatientsByOrganization(req.tenant!.id);
      
      const mobilePatients = patients.map(patient => ({
        id: patient.id,
        patientId: patient.patientId,
        name: `${patient.firstName} ${patient.lastName}`,
        email: patient.email,
        phone: patient.phone,
        dateOfBirth: patient.dateOfBirth,
        // gender: not available in schema,
        emergencyContact: patient.emergencyContact,
        lastVisit: patient.updatedAt,
        riskLevel: patient.riskLevel || 'low'
      }));
      
      res.json(mobilePatients);
    } catch (error) {
      console.error("Error fetching patients for mobile:", error);
      res.status(500).json({ error: "Failed to fetch patients" });
    }
  });

  app.get("/api/mobile/doctor/appointments", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "User authentication required" });
      }
      const { date } = req.query as { date?: string };
      
      let appointments = await storage.getAppointmentsByProvider(userId, req.tenant!.id);
      
      if (date) {
        appointments = appointments.filter(apt => {
          const aptDate = new Date(apt.scheduledAt);
          return aptDate.toDateString() === new Date(date).toDateString();
        });
      }
      
      const patients = await storage.getPatientsByOrganization(req.tenant!.id);
      
      const mobileAppointments = appointments.map(apt => {
        const patient = patients.find(p => p.id === apt.patientId);
        return {
          id: apt.id,
          patientId: apt.patientId,
          patientName: patient ? `${patient.firstName} ${patient.lastName}` : `Patient ${apt.patientId}`,
          patientPhone: patient?.phone || '',
          title: apt.title,
          description: apt.description,
          scheduledAt: apt.scheduledAt,
          duration: apt.duration,
          status: apt.status,
          type: apt.type,
          location: apt.location,
          isVirtual: apt.isVirtual
        };
      });
      
      res.json(mobileAppointments);
    } catch (error) {
      console.error("Error fetching appointments for mobile:", error);
      res.status(500).json({ error: "Failed to fetch appointments" });
    }
  });

  app.post("/api/mobile/doctor/appointments/:id/accept", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const appointmentId = parseInt(req.params.id);
      const appointment = await storage.updateAppointment(appointmentId, req.tenant!.id, {
        status: 'confirmed'
      });
      
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      
      res.json({ message: "Appointment accepted successfully", appointment });
    } catch (error) {
      console.error("Error accepting appointment:", error);
      res.status(500).json({ error: "Failed to accept appointment" });
    }
  });

  app.post("/api/mobile/doctor/appointments/:id/reject", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const appointmentId = parseInt(req.params.id);
      const { reason } = req.body;
      
      const appointment = await storage.updateAppointment(appointmentId, req.tenant!.id, {
        status: 'cancelled',
        description: reason ? `Cancelled: ${reason}` : 'Cancelled by doctor'
      });
      
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      
      res.json({ message: "Appointment rejected successfully", appointment });
    } catch (error) {
      console.error("Error rejecting appointment:", error);
      res.status(500).json({ error: "Failed to reject appointment" });
    }
  });

  app.get("/api/mobile/doctor/prescriptions", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "User authentication required" });
      }
      const prescriptions = await storage.getPrescriptionsByProvider(userId, req.tenant!.id);
      const patients = await storage.getPatientsByOrganization(req.tenant!.id);
      
      const mobilePrescriptions = prescriptions.map(prescription => {
        const patient = patients.find(p => p.id === prescription.patientId);
        return {
          id: prescription.id,
          patientId: prescription.patientId,
          patientName: patient ? `${patient.firstName} ${patient.lastName}` : `Patient ${prescription.patientId}`,
          medication: prescription.medicationName,
          dosage: prescription.dosage,
          frequency: prescription.frequency,
          duration: prescription.duration,
          instructions: prescription.instructions,
          status: prescription.status,
          createdAt: prescription.createdAt
        };
      });
      
      res.json(mobilePrescriptions);
    } catch (error) {
      console.error("Error fetching prescriptions for mobile:", error);
      res.status(500).json({ error: "Failed to fetch prescriptions" });
    }
  });

  app.post("/api/mobile/doctor/prescriptions", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "User authentication required" });
      }
      const prescriptionData = {
        ...req.body,
        doctorId: userId,
        organizationId: req.tenant!.id,
        status: 'active'
      };
      
      const prescription = await storage.createPrescription(prescriptionData);
      res.status(201).json(prescription);
    } catch (error) {
      console.error("Error creating prescription:", error);
      res.status(500).json({ error: "Failed to create prescription" });
    }
  });

  // Patient Mobile API endpoints
  app.get("/api/mobile/patient/dashboard", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const patient = await storage.getPatientByUserId(userId, req.tenant!.id);
      if (!patient) return res.status(404).json({ error: "Patient not found" });

      const appointments = await storage.getAppointmentsByPatient(patient.id, req.tenant!.id);
      const prescriptions = await storage.getPrescriptionsByPatient(patient.id, req.tenant!.id);
      const medicalRecords = await storage.getMedicalRecordsByPatient(patient.id, req.tenant!.id);
      
      const todayAppointments = appointments.filter(apt => {
        const aptDate = new Date(apt.scheduledAt);
        const today = new Date();
        return aptDate.toDateString() === today.toDateString() && apt.status === 'scheduled';
      });

      res.json({
        patientInfo: {
          name: `${patient.firstName} ${patient.lastName}`,
          email: patient.email,
          phone: patient.phone,
          patientId: patient.patientId
        },
        upcomingAppointments: todayAppointments.length,
        activePrescriptions: prescriptions.filter(p => p.status === 'active').length,
        totalRecords: medicalRecords.length,
        recentAppointments: appointments.slice(0, 3).map(apt => ({
          id: apt.id,
          title: apt.title,
          scheduledAt: apt.scheduledAt,
          status: apt.status,
          type: apt.type
        }))
      });
    } catch (error) {
      console.error("Error fetching patient dashboard:", error);
      res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
  });

  app.get("/api/mobile/patient/appointments", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "User authentication required" });
      }
      const patient = await storage.getPatientByUserId(userId, req.tenant!.id);
      if (!patient) return res.status(404).json({ error: "Patient not found" });

      const appointments = await storage.getAppointmentsByPatient(patient.id, req.tenant!.id);
      const users = await storage.getUsersByOrganization(req.tenant!.id);
      
      const mobileAppointments = appointments.map(apt => {
        const provider = users.find(u => u.id === apt.providerId);
        return {
          id: apt.id,
          title: apt.title,
          description: apt.description,
          scheduledAt: apt.scheduledAt,
          duration: apt.duration,
          status: apt.status,
          type: apt.type,
          location: apt.location,
          isVirtual: apt.isVirtual,
          providerName: provider ? `Dr. ${provider.firstName} ${provider.lastName}` : 'Unknown Provider'
        };
      });
      
      res.json(mobileAppointments);
    } catch (error) {
      console.error("Error fetching patient appointments:", error);
      res.status(500).json({ error: "Failed to fetch appointments" });
    }
  });

  app.post("/api/mobile/patient/appointments", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "User authentication required" });
      }
      const patient = await storage.getPatientByUserId(userId, req.tenant!.id);
      if (!patient) return res.status(404).json({ error: "Patient not found" });

      const appointmentData = {
        ...req.body,
        patientId: patient.id,
        organizationId: req.tenant!.id,
        status: 'scheduled'
      };
      
      const appointment = await storage.createAppointment(appointmentData);
      res.status(201).json(appointment);
    } catch (error) {
      console.error("Error creating appointment:", error);
      res.status(500).json({ error: "Failed to create appointment" });
    }
  });

  app.get("/api/mobile/patient/prescriptions", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "User authentication required" });
      }
      const patient = await storage.getPatientByUserId(userId, req.tenant!.id);
      if (!patient) return res.status(404).json({ error: "Patient not found" });

      const prescriptions = await storage.getPrescriptionsByPatient(patient.id, req.tenant!.id);
      const users = await storage.getUsersByOrganization(req.tenant!.id);
      
      const mobilePrescriptions = prescriptions.map(prescription => {
        const provider = users.find(u => u.id === prescription.doctorId);
        return {
          id: prescription.id,
          medication: prescription.medicationName,
          dosage: prescription.dosage,
          frequency: prescription.frequency,
          duration: prescription.duration,
          instructions: prescription.instructions,
          status: prescription.status,
          createdAt: prescription.createdAt,
          providerName: provider ? `Dr. ${provider.firstName} ${provider.lastName}` : 'Unknown Provider'
        };
      });
      
      res.json(mobilePrescriptions);
    } catch (error) {
      console.error("Error fetching patient prescriptions:", error);
      res.status(500).json({ error: "Failed to fetch prescriptions" });
    }
  });

  app.get("/api/mobile/patient/medical-records", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "User authentication required" });
      }
      const patient = await storage.getPatientByUserId(userId, req.tenant!.id);
      if (!patient) return res.status(404).json({ error: "Patient not found" });

      const records = await storage.getMedicalRecordsByPatient(patient.id, req.tenant!.id);
      const users = await storage.getUsersByOrganization(req.tenant!.id);
      
      const mobileRecords = records.map(record => {
        const provider = users.find(u => u.id === record.providerId);
        return {
          id: record.id,
          type: record.type,
          title: record.title,
          notes: record.notes,
          diagnosis: record.diagnosis,
          treatment: record.treatment,
          createdAt: record.createdAt,
          providerName: provider ? `Dr. ${provider.firstName} ${provider.lastName}` : 'Unknown Provider'
        };
      });
      
      res.json(mobileRecords);
    } catch (error) {
      console.error("Error fetching patient medical records:", error);
      res.status(500).json({ error: "Failed to fetch medical records" });
    }
  });

  app.get("/api/mobile/patient/profile", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const patient = await storage.getPatientByUserId(userId, req.tenant!.id);
      if (!patient) return res.status(404).json({ error: "Patient profile not found" });

      const profileData = {
        id: patient.id,
        patientId: patient.patientId,
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email,
        phone: patient.phone,
        dateOfBirth: patient.dateOfBirth,
        // gender: not available in schema,
        address: patient.address,
        emergencyContact: patient.emergencyContact,
        insuranceProvider: patient.insuranceInfo?.provider || '',
        insuranceNumber: patient.insuranceInfo?.policyNumber || '',
        medicalHistory: patient.medicalHistory,
        allergies: patient.medicalHistory?.allergies || [],
        currentMedications: patient.medicalHistory?.medications || [],
        // bloodType: not available in schema,
        riskLevel: patient.riskLevel,
        createdAt: patient.createdAt,
        updatedAt: patient.updatedAt
      };
      
      res.json(profileData);
    } catch (error) {
      console.error("Error fetching patient profile:", error);
      res.status(500).json({ error: "Failed to fetch patient profile" });
    }
  });

  app.get("/api/mobile/doctors", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const users = await storage.getUsersByOrganization(req.tenant!.id);
      
      const doctors = users
        .filter(user => isDoctorLike(user.role) && user.isActive)
        .map(doctor => ({
          id: doctor.id,
          name: `Dr. ${doctor.firstName} ${doctor.lastName}`,
          email: doctor.email,
          department: doctor.department || 'General Medicine',
          specialization: doctor.department || 'General Practice',
          workingHours: doctor.workingHours || { start: '09:00', end: '17:00' },
          workingDays: doctor.workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
        }));
      
      res.json(doctors);
    } catch (error) {
      console.error("Error fetching doctors:", error);
      res.status(500).json({ error: "Failed to fetch doctors" });
    }
  });

  // Video consultation endpoints
  app.post("/api/mobile/video/start-consultation", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const { appointmentId } = req.body;
      
      // Generate a unique room ID for the consultation
      const roomId = `consultation_${appointmentId}_${Date.now()}`;
      
      res.json({
        roomId,
        message: "Video consultation started",
        joinUrl: `https://meet.jit.si/${roomId}`
      });
    } catch (error) {
      console.error("Error starting video consultation:", error);
      res.status(500).json({ error: "Failed to start consultation" });
    }
  });

  // Mobile API Endpoints for Flutter Apps
  
  // Doctor Mobile App Endpoints
  app.get("/api/mobile/doctor/dashboard", authMiddleware, requireRole(["doctor"]), async (req: TenantRequest, res) => {
    try {
      const todayAppointments = await storage.getAppointmentsByOrganization(req.tenant!.id, new Date());
      const totalPatients = await storage.getPatientsByOrganization(req.tenant!.id);
      const pendingPrescriptions = await storage.getPrescriptionsByOrganization(req.tenant!.id);
      
      const dashboardData = {
        todayAppointments: todayAppointments.length,
        totalPatients: totalPatients.length,
        pendingPrescriptions: pendingPrescriptions.filter(p => p.status === 'pending').length,
        upcomingAppointments: todayAppointments
          .filter(apt => new Date(apt.scheduledAt) > new Date())
          .slice(0, 5)
          .map(apt => ({
            id: apt.id,
            patientName: 'Patient Name', // TODO: Join with patient table
            time: apt.scheduledAt,
            type: apt.type,
            status: apt.status
          }))
      };
      
      res.json(dashboardData);
    } catch (error) {
      console.error("Error fetching doctor dashboard:", error);
      res.status(500).json({ error: "Failed to load dashboard data" });
    }
  });

  app.get("/api/mobile/doctor/patients", authMiddleware, requireRole(["doctor", "nurse"]), async (req: TenantRequest, res) => {
    try {
      const patients = await storage.getPatientsByOrganization(req.tenant!.id);
      const formattedPatients = patients.map(patient => ({
        id: patient.id,
        name: `${patient.firstName} ${patient.lastName}`,
        patientId: patient.patientId,
        email: patient.email,
        phone: patient.phone,
        dateOfBirth: patient.dateOfBirth,
        // gender: not available in schema,
        // lastVisit: not available in current schema
        riskLevel: patient.riskLevel || 'low'
      }));
      
      res.json(formattedPatients);
    } catch (error) {
      console.error("Error fetching patients for doctor mobile:", error);
      res.status(500).json({ error: "Failed to load patients" });
    }
  });

  app.get("/api/mobile/doctor/appointments", authMiddleware, requireRole(["doctor", "nurse"]), async (req: TenantRequest, res) => {
    try {
      const date = req.query.date ? new Date(req.query.date as string) : new Date();
      const appointments = await storage.getAppointmentsByOrganization(req.tenant!.id, date);
      
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching doctor appointments:", error);
      res.status(500).json({ error: "Failed to load appointments" });
    }
  });

  app.post("/api/mobile/doctor/appointments/:id/accept", authMiddleware, requireRole(["doctor"]), async (req: TenantRequest, res) => {
    try {
      const appointmentId = parseInt(req.params.id);
      const updatedAppointment = await storage.updateAppointment(appointmentId, req.tenant!.id, { status: 'confirmed' });
      
      if (!updatedAppointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      
      res.json(updatedAppointment);
    } catch (error) {
      console.error("Error accepting appointment:", error);
      res.status(500).json({ error: "Failed to accept appointment" });
    }
  });

  app.post("/api/mobile/doctor/appointments/:id/reject", authMiddleware, requireRole(["doctor"]), async (req: TenantRequest, res) => {
    try {
      const appointmentId = parseInt(req.params.id);
      const { reason } = req.body;
      
      const updatedAppointment = await storage.updateAppointment(appointmentId, req.tenant!.id, { 
        status: 'cancelled',
        description: `Cancelled: ${reason}`
      });
      
      if (!updatedAppointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      
      res.json(updatedAppointment);
    } catch (error) {
      console.error("Error rejecting appointment:", error);
      res.status(500).json({ error: "Failed to reject appointment" });
    }
  });

  app.get("/api/mobile/doctor/prescriptions", authMiddleware, requireRole(["doctor", "nurse"]), async (req: TenantRequest, res) => {
    try {
      const prescriptions = await storage.getPrescriptionsByOrganization(req.tenant!.id);
      res.json(prescriptions);
    } catch (error) {
      console.error("Error fetching doctor prescriptions:", error);
      res.status(500).json({ error: "Failed to load prescriptions" });
    }
  });

  app.post("/api/mobile/doctor/prescriptions", authMiddleware, requireRole(["doctor"]), async (req: TenantRequest, res) => {
    try {
      const prescriptionData = {
        ...req.body,
        organizationId: req.tenant!.id,
        providerId: req.user!.id,
        prescriptionNumber: `RX-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        status: 'active'
      };
      
      const newPrescription = await storage.createPrescription(prescriptionData);
      res.status(201).json(newPrescription);
    } catch (error) {
      console.error("Error creating prescription:", error);
      res.status(500).json({ error: "Failed to create prescription" });
    }
  });

  // Patient Mobile App Endpoints
  app.get("/api/mobile/patient/dashboard", authMiddleware, requireRole(["patient"]), async (req: TenantRequest, res) => {
    try {
      const patientId = req.user!.id;
      const appointments = await storage.getAppointmentsByPatient(patientId, req.tenant!.id);
      const prescriptions = await storage.getPrescriptionsByPatient(patientId, req.tenant!.id);
      const medicalRecords = await storage.getMedicalRecordsByPatient(patientId, req.tenant!.id);
      
      const dashboardData = {
        upcomingAppointments: appointments.filter(apt => 
          new Date(apt.scheduledAt) > new Date() && apt.status !== 'cancelled'
        ).length,
        activePrescriptions: prescriptions.filter(p => p.status === 'active').length,
        medicalRecords: medicalRecords.length,
        nextAppointment: appointments
          .filter(apt => new Date(apt.scheduledAt) > new Date() && apt.status !== 'cancelled')
          .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0] || null
      };
      
      res.json(dashboardData);
    } catch (error) {
      console.error("Error fetching patient dashboard:", error);
      res.status(500).json({ error: "Failed to load dashboard data" });
    }
  });

  app.get("/api/mobile/patient/appointments", authMiddleware, requireRole(["patient"]), async (req: TenantRequest, res) => {
    try {
      // Find the patient record by the authenticated user's email
      const patients = await storage.getPatientsByOrganization(req.tenant!.id, 100);
      const patient = patients.find(p => p.email === req.user!.email);
      
      if (!patient) {
        return res.status(404).json({ error: "Patient record not found for authenticated user" });
      }
      
      const appointments = await storage.getAppointmentsByPatient(patient.id, req.tenant!.id);
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching patient appointments:", error);
      res.status(500).json({ error: "Failed to load appointments" });
    }
  });

  app.post("/api/mobile/patient/appointments", authMiddleware, requireRole(["patient"]), async (req: TenantRequest, res) => {
    try {
      // Find the patient record by the authenticated user's email
      const patients = await storage.getPatientsByOrganization(req.tenant!.id, 100);
      const patient = patients.find(p => p.email === req.user!.email);
      
      if (!patient) {
        return res.status(404).json({ error: "Patient record not found for authenticated user" });
      }
      
      const appointmentData = {
        ...req.body,
        patientId: patient.id, // Use the patient's database ID, not the user ID
        organizationId: req.tenant!.id,
        status: 'scheduled'
      };
      
      const newAppointment = await storage.createAppointment(appointmentData);
      res.status(201).json(newAppointment);
    } catch (error) {
      console.error("Error booking appointment:", error);
      res.status(500).json({ error: "Failed to book appointment" });
    }
  });

  app.delete("/api/mobile/patient/appointments/:id", authMiddleware, requireRole(["patient"]), async (req: TenantRequest, res) => {
    try {
      const appointmentId = parseInt(req.params.id);
      
      // Find the patient record by the authenticated user's email
      const patients = await storage.getPatientsByOrganization(req.tenant!.id, 100);
      const patient = patients.find(p => p.email === req.user!.email);
      
      if (!patient) {
        return res.status(404).json({ error: "Patient record not found for authenticated user" });
      }
      
      // Verify the appointment belongs to the patient
      const appointment = await storage.getAppointment(appointmentId, req.tenant!.id);
      if (!appointment || appointment.patientId !== patient.id) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      
      const updatedAppointment = await storage.updateAppointment(appointmentId, req.tenant!.id, { 
        status: 'cancelled'
      });
      
      res.json(updatedAppointment);
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      res.status(500).json({ error: "Failed to cancel appointment" });
    }
  });

  app.get("/api/mobile/patient/prescriptions", authMiddleware, requireRole(["patient"]), async (req: TenantRequest, res) => {
    try {
      const patientId = req.user!.id;
      const prescriptions = await storage.getPrescriptionsByPatient(patientId, req.tenant!.id);
      res.json(prescriptions);
    } catch (error) {
      console.error("Error fetching patient prescriptions:", error);
      res.status(500).json({ error: "Failed to load prescriptions" });
    }
  });

  // Patient Dashboard endpoints
  app.get("/api/patients/my-appointments", authMiddleware, requireRole(["patient"]), async (req: TenantRequest, res) => {
    try {
      // Find the patient record by the authenticated user's email
      const patients = await storage.getPatientsByOrganization(req.tenant!.id, 100);
      const patient = patients.find(p => p.email === req.user!.email);
      
      if (!patient) {
        return res.status(404).json({ error: "Patient record not found for authenticated user" });
      }
      
      const appointments = await storage.getAppointmentsByPatient(patient.id, req.tenant!.id);
      
      // Filter to future appointments and sort by date
      const now = new Date();
      const futureAppointments = appointments
        .filter(apt => new Date(apt.scheduledAt) > now)
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
      
      // Get provider information for appointments
      const users = await storage.getUsersByOrganization(req.tenant!.id);
      const appointmentsWithProviders = futureAppointments.map(apt => {
        const provider = users.find(u => u.id === apt.providerId);
        return {
          ...apt,
          provider: provider ? `Dr. ${provider.firstName} ${provider.lastName}` : 'Unknown Provider'
        };
      });
      
      res.json({
        appointments: appointmentsWithProviders,
        nextAppointment: appointmentsWithProviders[0] || null,
        patientId: patient.id
      });
    } catch (error) {
      console.error("Error fetching patient appointments:", error);
      res.status(500).json({ error: "Failed to load appointments" });
    }
  });

  app.get("/api/patients/my-prescriptions", authMiddleware, requireRole(["patient"]), async (req: TenantRequest, res) => {
    try {
      console.log("🏥 MY-PRESCRIPTIONS DEBUG: Starting request for user:", req.user?.email);
      
      // Find the patient record by the authenticated user's email
      const patients = await storage.getPatientsByOrganization(req.tenant!.id, 100);
      console.log("🏥 MY-PRESCRIPTIONS DEBUG: Found patients count:", patients.length);
      
      const patient = patients.find(p => p.email === req.user!.email);
      console.log("🏥 MY-PRESCRIPTIONS DEBUG: Found matching patient:", patient ? { id: patient.id, email: patient.email } : null);
      
      if (!patient) {
        console.log("🏥 MY-PRESCRIPTIONS DEBUG: No patient found for email:", req.user!.email);
        return res.status(404).json({ error: "Patient record not found for authenticated user" });
      }
      
      console.log("🏥 MY-PRESCRIPTIONS DEBUG: Getting prescriptions for patient ID:", patient.id);
      const prescriptions = await storage.getPrescriptionsByPatient(patient.id, req.tenant!.id);
      console.log("🏥 MY-PRESCRIPTIONS DEBUG: Found prescriptions count:", prescriptions.length);
      
      res.json({
        prescriptions,
        totalCount: prescriptions.length,
        patientId: patient.id
      });
    } catch (error) {
      console.error("Error fetching patient prescriptions:", error);
      res.status(500).json({ error: "Failed to load prescriptions" });
    }
  });

  app.get("/api/mobile/patient/medical-records", authMiddleware, requireRole(["patient"]), async (req: TenantRequest, res) => {
    try {
      const patientId = req.user!.id;
      const medicalRecords = await storage.getMedicalRecordsByPatient(patientId, req.tenant!.id);
      res.json(medicalRecords);
    } catch (error) {
      console.error("Error fetching patient medical records:", error);
      res.status(500).json({ error: "Failed to load medical records" });
    }
  });

  app.get("/api/mobile/patient/doctors", authMiddleware, requireRole(["patient"]), async (req: TenantRequest, res) => {
    try {
      const doctors = await storage.getUsersByRole('doctor', req.tenant!.id);
      const formattedDoctors = doctors.map(doctor => ({
        id: doctor.id,
        name: `Dr. ${doctor.firstName} ${doctor.lastName}`,
        department: doctor.department || 'General Medicine',
        specialization: doctor.medicalSpecialtyCategory || doctor.subSpecialty || 'General Practice',
        email: doctor.email,
        workingHours: doctor.workingHours || 'Monday-Friday, 09:00-17:00'
      }));
      
      res.json(formattedDoctors);
    } catch (error) {
      console.error("Error fetching doctors:", error);
      res.status(500).json({ error: "Failed to load doctors" });
    }
  });

  app.get("/api/mobile/patient/available-slots", authMiddleware, requireRole(["patient"]), async (req: TenantRequest, res) => {
    try {
      const { doctorId, date } = req.query;
      
      // Generate sample available slots (in a real app, this would check actual availability)
      const slots = [
        { time: '09:00', available: true },
        { time: '09:30', available: true },
        { time: '10:00', available: false },
        { time: '10:30', available: true },
        { time: '11:00', available: true },
        { time: '11:30', available: false },
        { time: '14:00', available: true },
        { time: '14:30', available: true },
        { time: '15:00', available: true },
        { time: '15:30', available: false },
        { time: '16:00', available: true },
        { time: '16:30', available: true }
      ].filter(slot => slot.available);
      
      res.json(slots);
    } catch (error) {
      console.error("Error fetching available slots:", error);
      res.status(500).json({ error: "Failed to load available slots" });
    }
  });

  app.get("/api/mobile/patient/profile", authMiddleware, requireRole(["patient"]), async (req: TenantRequest, res) => {
    try {
      const patientId = req.user!.id;
      const patient = await storage.getPatient(patientId, req.tenant!.id);
      
      if (!patient) {
        return res.status(404).json({ error: "Patient profile not found" });
      }
      
      res.json(patient);
    } catch (error) {
      console.error("Error fetching patient profile:", error);
      res.status(500).json({ error: "Failed to load profile" });
    }
  });

  app.put("/api/mobile/patient/profile", authMiddleware, requireRole(["patient"]), async (req: TenantRequest, res) => {
    try {
      const patientId = req.user!.id;
      const updatedPatient = await storage.updatePatient(patientId, req.tenant!.id, req.body);
      
      if (!updatedPatient) {
        return res.status(404).json({ error: "Patient not found" });
      }
      
      res.json(updatedPatient);
    } catch (error) {
      console.error("Error updating patient profile:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  app.get("/api/mobile/patient/lab-results", authMiddleware, requireRole(["patient"]), async (req: TenantRequest, res) => {
    try {
      console.log("🏥 MOBILE LAB RESULTS DEBUG: Starting request for user:", req.user?.email);
      
      // Find the patient record by the authenticated user's email
      const patients = await storage.getPatientsByOrganization(req.tenant!.id, 100);
      console.log("🏥 MOBILE LAB RESULTS DEBUG: Found patients count:", patients.length);
      
      const patient = patients.find(p => p.email === req.user!.email);
      console.log("🏥 MOBILE LAB RESULTS DEBUG: Found matching patient:", patient ? { id: patient.id, email: patient.email } : null);
      
      if (!patient) {
        console.log("🏥 MOBILE LAB RESULTS DEBUG: No patient found for email:", req.user!.email);
        return res.status(404).json({ error: "Patient record not found for authenticated user" });
      }
      
      console.log("🏥 MOBILE LAB RESULTS DEBUG: Getting lab results for patient ID:", patient.id);
      const labResults = await storage.getLabResultsByPatient(patient.id, req.tenant!.id);
      console.log("🏥 MOBILE LAB RESULTS DEBUG: Found lab results count:", labResults.length);
      
      res.json(labResults);
    } catch (error) {
      console.error("Error fetching patient lab results:", error);
      res.status(500).json({ error: "Failed to load lab results" });
    }
  });

  // Video consultation endpoints
  app.post("/api/mobile/video/start-consultation", authMiddleware, requireRole(["doctor"]), async (req: TenantRequest, res) => {
    try {
      const { appointmentId } = req.body;
      
      // Generate BigBlueButton meeting URL (simplified)
      const meetingData = {
        meetingId: `consultation-${appointmentId}-${Date.now()}`,
        meetingUrl: `https://vid2.averox.com/join?meeting=consultation-${appointmentId}`,
        moderatorPassword: `mod-${appointmentId}`,
        attendeePassword: `att-${appointmentId}`
      };
      
      res.json(meetingData);
    } catch (error) {
      console.error("Error starting video consultation:", error);
      res.status(500).json({ error: "Failed to start video consultation" });
    }
  });

  app.post("/api/mobile/video/join-consultation", authMiddleware, requireRole(["patient"]), async (req: TenantRequest, res) => {
    try {
      const { appointmentId } = req.body;
      
      // Generate BigBlueButton join URL for patient
      const joinData = {
        meetingUrl: `https://vid2.averox.com/join?meeting=consultation-${appointmentId}&role=attendee`,
        patientPassword: `att-${appointmentId}`
      };
      
      res.json(joinData);
    } catch (error) {
      console.error("Error joining video consultation:", error);
      res.status(500).json({ error: "Failed to join video consultation" });
    }
  });

  // AI Chatbot for Appointment Booking Routes
  app.post("/api/chatbot/chat", authMiddleware, async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const { messages } = req.body;
      
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Messages array is required" });
      }

      // Get available doctors and time slots for context
      const doctors = await storage.getUsersByOrganization(req.tenant!.id);
      const availableDoctors = doctors
        .filter(doctor => isDoctorLike(doctor.role) && doctor.isActive)
        .map(doctor => ({
          id: doctor.id,
          name: `${doctor.firstName} ${doctor.lastName}`,
          specialty: doctor.department || 'General Medicine'
        }));

      // Get available appointments (future slots)
      const allAppointments = await storage.getAppointmentsByOrganization(req.tenant!.id);
      const now = new Date();
      const availableTimeSlots = [
        // Generate some sample available slots for the next 7 days
        ...Array.from({ length: 7 }, (_, dayOffset) => {
          const date = new Date(now);
          date.setDate(date.getDate() + dayOffset + 1);
          const dateStr = date.toISOString().split('T')[0];
          
          return availableDoctors.flatMap(doctor => [
            { date: dateStr, time: '09:00', doctorId: doctor.id },
            { date: dateStr, time: '10:00', doctorId: doctor.id },
            { date: dateStr, time: '11:00', doctorId: doctor.id },
            { date: dateStr, time: '14:00', doctorId: doctor.id },
            { date: dateStr, time: '15:00', doctorId: doctor.id },
            { date: dateStr, time: '16:00', doctorId: doctor.id }
          ]);
        }).flat()
      ];

      // Create enhanced conversation context for NLP processing
      const conversationContext = {
        conversationId: `conv_${req.user.id}_${Date.now()}`,
        userId: req.user.id,
        organizationId: req.tenant!.id,
        sessionStartTime: new Date(),
        conversationHistory: messages.map(msg => ({
          role: msg.type === 'user' ? 'user' as const : 'assistant' as const,
          content: msg.content,
          timestamp: new Date(msg.timestamp || Date.now()),
          intent: msg.intent,
          entities: msg.entities
        })),
        userProfile: {
          medicalHistory: [], // Could be fetched from patient records if available
          preferences: {},
          language: 'en',
          complexityLevel: 'intermediate' as const
        },
        contextualKnowledge: {
          recentTopics: [],
          extractedEntities: {},
          sentimentAnalysis: {
            overall: 'neutral' as const,
            confidence: 0.8
          }
        }
      };

      // Use local NLP processing directly
      const lastMessage = messages[messages.length - 1];
      
      // Process with local NLP fallback (call private method through a workaround)
      const nlpResult = await (aiService as any).processWithLocalNLP(lastMessage.content, conversationContext);
      
      // Use the response from local NLP directly
      let finalResponse = nlpResult.response;

      // Simple response structure compatible with the frontend
      const enhancedResponse = {
        response: finalResponse,
        intent: nlpResult.intent,
        entities: nlpResult.entities,
        confidence: nlpResult.confidence,
        medicalAdviceLevel: 'informational',
        disclaimers: ['This is an AI assistant and should not replace professional medical advice.'],
        followUpQuestions: ['How else can I help you today?'],
        educationalContent: [],
        urgencyLevel: 'low',
        recommendedSpecialty: null,
        nextActions: nlpResult.nextActions
      };

      res.json(enhancedResponse);
    } catch (error) {
      console.error("Chatbot error:", error);
      res.status(500).json({ error: "Failed to process chat message" });
    }
  });

  // Get chatbot context data
  app.get("/api/chatbot/context", authMiddleware, async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const doctors = await storage.getUsersByOrganization(req.tenant!.id);
      const availableDoctors = doctors
        .filter(doctor => isDoctorLike(doctor.role) && doctor.isActive)
        .map(doctor => ({
          id: doctor.id,
          name: `${doctor.firstName} ${doctor.lastName}`,
          specialty: doctor.department || 'General Medicine'
        }));

      // Get full user data for patient info
      const fullUser = await storage.getUser(req.user.id, req.tenant!.id);
      
      res.json({
        availableDoctors,
        patientInfo: {
          id: req.user.id,
          name: fullUser ? `${fullUser.firstName} ${fullUser.lastName}` : req.user.email,
          email: req.user.email
        }
      });
    } catch (error) {
      console.error("Error fetching chatbot context:", error);
      res.status(500).json({ error: "Failed to fetch chatbot context" });
    }
  });

  // Chatbot appointment booking endpoint
  app.post("/api/chatbot/book-appointment", async (req: TenantRequest, res) => {
    try {
      const { email, name, phone, appointmentType, preferredDate, preferredTime, reason } = req.body;

      // Get organization by subdomain
      const organization = await storage.getOrganizationBySubdomain('cura');
      if (!organization) {
        return res.status(404).json({ error: "Organization not found" });
      }

      // Find or create patient by email
      let patient = await storage.getPatientByEmail(email, organization.id);
      
      if (!patient) {
        // Create new patient
        const patientData = {
          organizationId: organization.id,
          firstName: name.split(' ')[0] || '',
          lastName: name.split(' ').slice(1).join(' ') || '',
          email: email,
          phone: phone,
          patientId: `P${Date.now()}`,
          isActive: true
        };
        patient = await storage.createPatient(patientData);
      }

      // Get available doctors
      const doctors = await storage.getUsersByRole('doctor', organization.id);
      const assignedDoctor = doctors.find(d => d.isActive) || doctors[0];

      if (!assignedDoctor) {
        return res.status(400).json({ error: "No doctors available" });
      }

      // Create appointment
      const appointmentData = {
        organizationId: organization.id,
        patientId: patient.id,
        providerId: assignedDoctor.id,
        appointmentType: appointmentType || 'consultation',
        status: 'pending',
        notes: reason || '',
        scheduledFor: new Date(`${preferredDate} ${preferredTime}`),
        duration: 30
      };

      const appointment = await storage.createAppointment(appointmentData);

      // Send confirmation email
      await emailService.sendAppointmentConfirmation({
        patientEmail: email,
        patientName: name,
        appointmentDate: preferredDate,
        appointmentTime: preferredTime,
        doctorName: `${assignedDoctor.firstName} ${assignedDoctor.lastName}`,
        appointmentType: appointmentType || 'consultation'
      });

      res.json({
        success: true,
        message: "Appointment booked successfully! You'll receive a confirmation email shortly.",
        appointmentId: appointment.id,
        doctorName: `${assignedDoctor.firstName} ${assignedDoctor.lastName}`,
        scheduledFor: appointmentData.scheduledFor
      });

    } catch (error) {
      console.error("Error booking appointment through chatbot:", error);
      res.status(500).json({ error: "Failed to book appointment" });
    }
  });

  // Chatbot prescription request endpoint
  app.post("/api/chatbot/request-prescription", async (req: TenantRequest, res) => {
    try {
      const { email, name, phone, medication, reason, medicalHistory } = req.body;

      // Get organization by subdomain
      const organization = await storage.getOrganizationBySubdomain('cura');
      if (!organization) {
        return res.status(404).json({ error: "Organization not found" });
      }

      // Find or create patient by email
      let patient = await storage.getPatientByEmail(email, organization.id);
      
      if (!patient) {
        // Create new patient
        const patientData = {
          organizationId: organization.id,
          firstName: name.split(' ')[0] || '',
          lastName: name.split(' ').slice(1).join(' ') || '',
          email: email,
          phone: phone,
          patientId: `P${Date.now()}`,
          isActive: true
        };
        patient = await storage.createPatient(patientData);
      }

      // Get available doctors
      const doctors = await storage.getUsersByRole('doctor', organization.id);
      const reviewingDoctor = doctors.find(d => d.isActive) || doctors[0];

      if (!reviewingDoctor) {
        return res.status(400).json({ error: "No doctors available" });
      }

      // Create prescription request (pending status)
      const prescriptionData = {
        organizationId: organization.id,
        patientId: patient.id,
        providerId: reviewingDoctor.id,
        prescriptionNumber: `RX${Date.now()}`,
        status: 'pending',
        medications: [{
          name: medication,
          dosage: '',
          frequency: '',
          duration: '',
          quantity: 0,
          refills: 0,
          instructions: reason,
          genericAllowed: true
        }]
      };

      const prescription = await storage.createPrescription(prescriptionData);

      // Send confirmation email
      await emailService.sendPrescriptionRequestConfirmation({
        patientEmail: email,
        patientName: name,
        medication: medication,
        doctorName: `${reviewingDoctor.firstName} ${reviewingDoctor.lastName}`,
        requestReason: reason
      });

      res.json({
        success: true,
        message: "Prescription request submitted successfully! Our medical team will review it within 24 hours.",
        requestId: prescription.id,
        reviewingDoctor: `${reviewingDoctor.firstName} ${reviewingDoctor.lastName}`,
        status: 'pending_review'
      });

    } catch (error) {
      console.error("Error requesting prescription through chatbot:", error);
      res.status(500).json({ error: "Failed to request prescription" });
    }
  });

  // ====== INVENTORY MANAGEMENT ROUTES ======
  
  // Categories
  app.get("/api/inventory/categories", authMiddleware, requireRole(["admin", "doctor", "nurse", "receptionist"]), async (req: TenantRequest, res) => {
    try {
      const categories = await inventoryService.getCategories(req.tenant!.id);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching inventory categories:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.post("/api/inventory/categories", authMiddleware, requireRole(["admin"]), async (req: TenantRequest, res) => {
    try {
      const categoryData = z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        parentCategoryId: z.number().optional()
      }).parse(req.body);

      const category = await inventoryService.createCategory({
        ...categoryData,
        organizationId: req.tenant!.id
      });

      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating inventory category:", error);
      res.status(500).json({ error: "Failed to create category" });
    }
  });

  // Items
  app.get("/api/inventory/items", authMiddleware, requireRole(["admin", "doctor", "nurse", "receptionist"]), async (req: TenantRequest, res) => {
    try {
      const filters = {
        categoryId: req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined,
        lowStock: req.query.lowStock === 'true',
        search: req.query.search as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined
      };

      const items = await inventoryService.getItems(req.tenant!.id, filters);
      res.json(items);
    } catch (error) {
      console.error("Error fetching inventory items:", error);
      res.status(500).json({ error: "Failed to fetch items" });
    }
  });

  app.get("/api/inventory/items/:id", authMiddleware, requireRole(["admin", "doctor", "nurse", "receptionist"]), async (req: TenantRequest, res) => {
    try {
      const itemId = parseInt(req.params.id);
      const item = await inventoryService.getItem(itemId, req.tenant!.id);
      
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }

      res.json(item);
    } catch (error) {
      console.error("Error fetching inventory item:", error);
      res.status(500).json({ error: "Failed to fetch item" });
    }
  });

  app.post("/api/inventory/items", authMiddleware, requireRole(["admin"]), async (req: TenantRequest, res) => {
    try {
      const itemData = z.object({
        categoryId: z.number(),
        name: z.string().min(1),
        description: z.string().optional(),
        sku: z.string().optional(),
        barcode: z.string().optional(),
        genericName: z.string().optional(),
        brandName: z.string().optional(),
        manufacturer: z.string().optional(),
        unitOfMeasurement: z.string().default("pieces"),
        packSize: z.number().default(1),
        purchasePrice: z.string().transform(val => val),
        salePrice: z.string().transform(val => val),
        mrp: z.string().optional().transform(val => val || null),
        taxRate: z.string().default("0.00"),
        currentStock: z.number().default(0),
        minimumStock: z.number().default(10),
        maximumStock: z.number().default(1000),
        reorderPoint: z.number().default(20),
        expiryTracking: z.boolean().default(false),
        batchTracking: z.boolean().default(false),
        prescriptionRequired: z.boolean().default(false),
        storageConditions: z.string().optional(),
        sideEffects: z.string().optional(),
        contraindications: z.string().optional(),
        dosageInstructions: z.string().optional()
      }).parse(req.body);

      // Generate SKU and barcode if not provided
      if (!itemData.sku) {
        itemData.sku = inventoryService.generateSKU("ITEM", itemData.name);
      }
      if (!itemData.barcode) {
        itemData.barcode = inventoryService.generateBarcode();
      }

      const item = await inventoryService.createItem({
        ...itemData,
        organizationId: req.tenant!.id
      });

      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating inventory item:", error);
      res.status(500).json({ error: "Failed to create item" });
    }
  });

  app.patch("/api/inventory/items/:id", authMiddleware, requireRole(["admin"]), async (req: TenantRequest, res) => {
    try {
      const itemId = parseInt(req.params.id);
      const updates = req.body;

      const item = await inventoryService.updateItem(itemId, req.tenant!.id, updates);
      
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }

      res.json(item);
    } catch (error) {
      console.error("Error updating inventory item:", error);
      res.status(500).json({ error: "Failed to update item" });
    }
  });

  // Delete Inventory Item
  app.delete("/api/inventory/items/:id", authMiddleware, requireRole(["admin"]), async (req: TenantRequest, res) => {
    try {
      const itemId = parseInt(req.params.id);
      console.log(`Deleting inventory item ${itemId} for organization ${req.tenant!.id}`);

      if (isNaN(itemId)) {
        return res.status(400).json({ error: "Invalid item ID" });
      }

      const deleted = await inventoryService.deleteItem(itemId, req.tenant!.id);
      
      if (!deleted) {
        console.log(`Item ${itemId} not found or already deleted`);
        return res.status(404).json({ error: "Item not found" });
      }

      console.log(`Item ${itemId} deleted successfully`);
      res.json({ 
        success: true, 
        message: "Item deleted successfully",
        id: itemId 
      });
    } catch (error) {
      console.error("Error deleting inventory item:", error);
      res.status(500).json({ error: "Failed to delete item" });
    }
  });

  // Stock Management
  app.post("/api/inventory/items/:id/stock", authMiddleware, requireRole(["admin", "doctor", "nurse"]), async (req: TenantRequest, res) => {
    try {
      const itemId = parseInt(req.params.id);
      const { quantity, movementType, notes } = z.object({
        quantity: z.number(),
        movementType: z.enum(["purchase", "sale", "adjustment", "transfer", "expired"]),
        notes: z.string().optional()
      }).parse(req.body);

      const result = await inventoryService.updateStock(
        itemId, 
        req.tenant!.id, 
        quantity, 
        movementType, 
        notes, 
        req.user!.id
      );

      res.json(result);
    } catch (error) {
      console.error("Error updating stock:", error);
      res.status(500).json({ error: "Failed to update stock" });
    }
  });

  // Suppliers
  app.get("/api/inventory/suppliers", authMiddleware, requireRole(["admin", "doctor", "nurse"]), async (req: TenantRequest, res) => {
    try {
      const suppliers = await inventoryService.getSuppliers(req.tenant!.id);
      res.json(suppliers);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      res.status(500).json({ error: "Failed to fetch suppliers" });
    }
  });

  app.post("/api/inventory/suppliers", authMiddleware, requireRole(["admin"]), async (req: TenantRequest, res) => {
    try {
      const supplierData = z.object({
        name: z.string().min(1),
        contactPerson: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        country: z.string().default("UK"),
        taxId: z.string().optional(),
        paymentTerms: z.string().default("Net 30")
      }).parse(req.body);

      const supplier = await inventoryService.createSupplier({
        ...supplierData,
        organizationId: req.tenant!.id
      });

      res.status(201).json(supplier);
    } catch (error) {
      console.error("Error creating supplier:", error);
      res.status(500).json({ error: "Failed to create supplier" });
    }
  });

  // Purchase Orders
  app.get("/api/inventory/purchase-orders", authMiddleware, requireRole(["admin", "doctor", "nurse"]), async (req: TenantRequest, res) => {
    try {
      const status = req.query.status as string;
      const purchaseOrders = await inventoryService.getPurchaseOrders(req.tenant!.id, status);
      res.json(purchaseOrders);
    } catch (error) {
      console.error("Error fetching purchase orders:", error);
      res.status(500).json({ error: "Failed to fetch purchase orders" });
    }
  });

  app.post("/api/inventory/purchase-orders", authMiddleware, requireRole(["admin", "doctor"]), async (req: TenantRequest, res) => {
    try {
      const orderData = z.object({
        supplierId: z.number(),
        expectedDeliveryDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
        totalAmount: z.string().transform(val => val),
        taxAmount: z.string().default("0.00"),
        discountAmount: z.string().default("0.00"),
        notes: z.string().optional(),
        items: z.array(z.object({
          itemId: z.number(),
          quantity: z.number(),
          unitPrice: z.string().transform(val => val),
          totalPrice: z.string().transform(val => val)
        }))
      }).parse(req.body);

      // Generate PO number
      const poCount = (await inventoryService.getPurchaseOrders(req.tenant!.id)).length;
      const poNumber = `PO-${Date.now()}-${(poCount + 1).toString().padStart(4, '0')}`;

      const result = await inventoryService.createPurchaseOrder({
        ...orderData,
        organizationId: req.tenant!.id,
        poNumber,
        createdBy: req.user!.id
      }, orderData.items);

      res.status(201).json(result);
    } catch (error) {
      console.error("Error creating purchase order:", error);
      res.status(500).json({ error: "Failed to create purchase order" });
    }
  });

  // Send Purchase Order Email to Halo Pharmacy
  app.post("/api/inventory/purchase-orders/:id/send-email", authMiddleware, requireRole(["admin", "doctor"]), async (req: TenantRequest, res) => {
    try {
      const purchaseOrderId = parseInt(req.params.id);
      
      await inventoryService.sendPurchaseOrderEmail(purchaseOrderId, req.tenant!.id);
      
      res.json({ 
        success: true, 
        message: "Purchase order sent to Halo Pharmacy successfully" 
      });
    } catch (error) {
      console.error("Error sending purchase order email:", error);
      res.status(500).json({ error: "Failed to send purchase order email" });
    }
  });

  // Delete Purchase Order
  app.delete("/api/inventory/purchase-orders/:id", authMiddleware, requireRole(["admin", "doctor"]), async (req: TenantRequest, res) => {
    try {
      const purchaseOrderId = parseInt(req.params.id);
      
      if (isNaN(purchaseOrderId)) {
        return res.status(400).json({ error: "Invalid purchase order ID" });
      }

      await inventoryService.deletePurchaseOrder(purchaseOrderId, req.tenant!.id);
      
      res.json({ 
        success: true, 
        message: "Purchase order deleted successfully" 
      });
    } catch (error) {
      console.error("Error deleting purchase order:", error);
      res.status(500).json({ error: "Failed to delete purchase order" });
    }
  });

  // Stock Alerts
  app.get("/api/inventory/alerts", authMiddleware, requireRole(["admin", "doctor", "nurse"]), async (req: TenantRequest, res) => {
    try {
      const unreadOnly = req.query.unreadOnly === 'true';
      const alerts = await inventoryService.getStockAlerts(req.tenant!.id, unreadOnly);
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching stock alerts:", error);
      res.status(500).json({ error: "Failed to fetch alerts" });
    }
  });

  // Inventory Reports
  app.get("/api/inventory/reports/value", authMiddleware, requireRole(["admin", "doctor"]), async (req: TenantRequest, res) => {
    try {
      const inventoryValue = await inventoryService.getInventoryValue(req.tenant!.id);
      res.json(inventoryValue);
    } catch (error) {
      console.error("Error fetching inventory value:", error);
      res.status(500).json({ error: "Failed to fetch inventory value" });
    }
  });

  app.get("/api/inventory/reports/low-stock", authMiddleware, requireRole(["admin", "doctor", "nurse"]), async (req: TenantRequest, res) => {
    try {
      const lowStockItems = await inventoryService.getLowStockItems(req.tenant!.id);
      res.json(lowStockItems);
    } catch (error) {
      console.error("Error fetching low stock items:", error);
      res.status(500).json({ error: "Failed to fetch low stock items" });
    }
  });

  app.get("/api/inventory/reports/stock-movements", authMiddleware, requireRole(["admin", "doctor", "nurse"]), async (req: TenantRequest, res) => {
    try {
      const itemId = req.query.itemId ? parseInt(req.query.itemId as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      
      const movements = await inventoryService.getStockMovements(req.tenant!.id, itemId, limit);
      res.json(movements);
    } catch (error) {
      console.error("Error fetching stock movements:", error);
      res.status(500).json({ error: "Failed to fetch stock movements" });
    }
  });

  // Goods Receipts
  app.get("/api/inventory/goods-receipts", authMiddleware, requireRole(["admin", "doctor", "nurse"]), async (req: TenantRequest, res) => {
    try {
      const goodsReceipts = await inventoryService.getGoodsReceipts(req.tenant!.id);
      res.json(goodsReceipts);
    } catch (error) {
      console.error("Error fetching goods receipts:", error);
      res.status(500).json({ error: "Failed to fetch goods receipts" });
    }
  });

  app.post("/api/inventory/goods-receipts", authMiddleware, requireRole(["admin", "doctor", "nurse"]), async (req: TenantRequest, res) => {
    try {
      const receiptData = z.object({
        purchaseOrderId: z.number(),
        receivedDate: z.string(),
        items: z.array(z.object({
          itemId: z.number(),
          quantityReceived: z.number(),
          batchNumber: z.string().optional(),
          expiryDate: z.string().optional()
        })),
        notes: z.string().optional()
      }).parse(req.body);

      const receipt = await inventoryService.createGoodsReceipt({
        ...receiptData,
        organizationId: req.tenant!.id
      });
      res.status(201).json(receipt);
    } catch (error) {
      console.error("Error creating goods receipt:", error);
      res.status(500).json({ error: "Failed to create goods receipt" });
    }
  });

  // Batches  
  app.get("/api/inventory/batches", authMiddleware, requireRole(["admin", "doctor", "nurse"]), async (req: TenantRequest, res) => {
    try {
      const batches = await inventoryService.getBatches(req.tenant!.id);
      res.json(batches);
    } catch (error) {
      console.error("Error fetching batches:", error);
      res.status(500).json({ error: "Failed to fetch batches" });
    }
  });

  // Chatbot API Routes
  // Get chatbot configuration for organization
  app.get("/api/chatbot/config", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const config = await storage.getChatbotConfig(req.tenant!.id);
      res.json(config || null);
    } catch (error) {
      console.error("Error fetching chatbot config:", error);
      res.status(500).json({ error: "Failed to fetch chatbot configuration" });
    }
  });

  // Create or update chatbot configuration
  app.post("/api/chatbot/config", authMiddleware, requireRole(["admin", "doctor"]), async (req: TenantRequest, res) => {
    try {
      const existingConfig = await storage.getChatbotConfig(req.tenant!.id);
      
      if (existingConfig) {
        // Update existing config
        const updated = await storage.updateChatbotConfig(req.tenant!.id, req.body);
        res.json(updated);
      } else {
        // Create new config
        const configData = {
          organizationId: req.tenant!.id,
          apiKey: crypto.randomUUID(),
          ...req.body
        };
        const created = await storage.createChatbotConfig(configData);
        res.json(created);
      }
    } catch (error) {
      console.error("Error saving chatbot config:", error);
      res.status(500).json({ error: "Failed to save chatbot configuration" });
    }
  });

  // Public chatbot endpoint (no auth required - for embedded widgets)
  app.post("/api/chatbot/message", async (req, res) => {
    try {
      const { sessionId, message, organizationId, apiKey } = req.body;

      // Validate API key
      const config = await storage.getChatbotConfig(organizationId);
      if (!config || config.apiKey !== apiKey || !config.isActive) {
        return res.status(401).json({ error: "Invalid API key or chatbot not active" });
      }

      // Get or create session
      let session = await storage.getChatbotSession(sessionId, organizationId);
      if (!session) {
        const sessionData = {
          organizationId,
          configId: config.id,
          sessionId,
          visitorId: crypto.randomUUID(),
          status: "active" as const
        };
        session = await storage.createChatbotSession(sessionData);
      }

      // Get conversation history for AI context
      const history = await storage.getChatbotMessagesBySession(session.id, organizationId);
      const sessionHistory = history.map(msg => ({
        sender: msg.sender,
        content: msg.content
      }));

      // Save user message
      const userMessage = {
        organizationId,
        sessionId: session.id,
        messageId: crypto.randomUUID(),
        sender: "user" as const,
        content: message,
        messageType: "text" as const
      };
      await storage.createChatbotMessage(userMessage);

      // Process message with AI
      const { chatbotAIService } = await import('./services/chatbot-ai.js');
      const aiResponse = await chatbotAIService.processMessage(message, sessionHistory);
      
      // Update session with extracted data
      if (aiResponse.intent.extractedData) {
        const updateData: any = {};
        if (aiResponse.intent.extractedData.patientName) {
          updateData.extractedPatientName = aiResponse.intent.extractedData.patientName;
        }
        if (aiResponse.intent.extractedData.phone) {
          updateData.extractedPhone = aiResponse.intent.extractedData.phone;
        }
        if (aiResponse.intent.extractedData.email) {
          updateData.extractedEmail = aiResponse.intent.extractedData.email;
        }
        updateData.currentIntent = aiResponse.intent.intent;
        
        if (Object.keys(updateData).length > 0) {
          await storage.updateChatbotSession(session.id, organizationId, updateData);
        }
      }
      
      // Save bot message with AI processing data
      const botMessage = {
        organizationId,
        sessionId: session.id,
        messageId: crypto.randomUUID(),
        sender: "bot" as const,
        content: aiResponse.response,
        messageType: "text" as const,
        intent: aiResponse.intent.intent,
        confidence: aiResponse.intent.confidence,
        aiProcessed: true
      };
      const savedBotMessage = await storage.createChatbotMessage(botMessage);

      res.json({
        sessionId: session.sessionId,
        response: aiResponse.response,
        messageId: savedBotMessage.messageId,
        intent: aiResponse.intent.intent,
        confidence: aiResponse.intent.confidence,
        requiresFollowUp: aiResponse.requiresFollowUp,
        nextAction: aiResponse.nextAction
      });
    } catch (error) {
      console.error("Error processing chatbot message:", error);
      res.status(500).json({ error: "Failed to process message" });
    }
  });

  // Get chat history for a session
  app.get("/api/chatbot/session/:sessionId/messages", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { organizationId, apiKey } = req.query;

      // Validate API key
      const config = await storage.getChatbotConfig(Number(organizationId));
      if (!config || config.apiKey !== apiKey) {
        return res.status(401).json({ error: "Invalid API key" });
      }

      const session = await storage.getChatbotSession(sessionId, Number(organizationId));
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      const messages = await storage.getChatbotMessagesBySession(session.id, Number(organizationId));
      res.json(messages);
    } catch (error) {
      console.error("Error fetching chat history:", error);
      res.status(500).json({ error: "Failed to fetch chat history" });
    }
  });

  // Admin: Get chatbot analytics
  app.get("/api/chatbot/analytics", authMiddleware, requireRole(["admin", "doctor"]), async (req: TenantRequest, res) => {
    try {
      const date = req.query.date ? new Date(req.query.date as string) : undefined;
      const analytics = await storage.getChatbotAnalytics(req.tenant!.id, date);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching chatbot analytics:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // Admin: Get chatbot sessions
  app.get("/api/chatbot/sessions", authMiddleware, requireRole(["admin", "doctor"]), async (req: TenantRequest, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const sessions = await storage.getChatbotSessionsByOrganization(req.tenant!.id, limit);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching chatbot sessions:", error);
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  });

  // Billing & Invoice routes
  app.get("/api/billing/invoices", requireRole(["admin", "doctor", "nurse", "receptionist", "patient"]), async (req: TenantRequest, res) => {
    try {
      const { status } = req.query;
      
      console.log("📋 Fetching invoices for organization:", req.tenant!.id, "Status filter:", status);
      
      let invoices = await storage.getInvoicesByOrganization(
        req.tenant!.id,
        status as string | undefined
      );
      
      // Filter invoices for patient users - only show their own invoices
      if (req.user?.role === "patient") {
        // Find the patient record for this user to get their patientId string
        const patients = await storage.getPatientsByOrganization(req.tenant!.id);
        const userPatient = patients.find(p => p.email?.toLowerCase() === req.user!.email.toLowerCase());
        
        if (userPatient) {
          // Filter by patient's text patientId field (e.g., "P000007")
          invoices = invoices.filter(invoice => invoice.patientId === userPatient.patientId);
          console.log(`🔒 Patient user ${req.user!.email} - filtered to ${invoices.length} invoices for patientId: ${userPatient.patientId}`);
        } else {
          invoices = [];
          console.log(`⚠️ No patient record found for user ${req.user!.email}`);
        }
      }
      
      console.log(`✅ Found ${invoices.length} invoices`);
      res.json(invoices);
    } catch (error) {
      console.error("Invoices fetch error:", error);
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });

  app.post("/api/billing/invoices", requireRole(["admin", "doctor", "nurse", "receptionist"]), async (req: TenantRequest, res) => {
    try {
      const invoiceData = z.object({
        patientId: z.string().min(1, "Patient is required"),
        serviceDate: z.string().min(1, "Service date is required"),
        invoiceDate: z.string().min(1, "Invoice date is required"), 
        dueDate: z.string().min(1, "Due date is required"),
        totalAmount: z.string().min(1, "Total amount is required").refine(val => {
          const num = parseFloat(val);
          return !isNaN(num) && num > 0;
        }, "Total amount must be a valid number greater than 0"),
        firstServiceCode: z.string().min(1, "Service code is required"),
        firstServiceDesc: z.string().min(1, "Service description is required"),
        firstServiceQty: z.string().min(1, "Service quantity is required").refine(val => {
          const num = parseInt(val);
          return !isNaN(num) && num > 0;
        }, "Service quantity must be a valid number greater than 0"),
        firstServiceAmount: z.string().min(1, "Service amount is required").refine(val => {
          const num = parseFloat(val);
          return !isNaN(num) && num > 0;
        }, "Service amount must be a valid number greater than 0"),
        insuranceProvider: z.string().optional(),
        nhsNumber: z.string().optional(),
        notes: z.string().optional(),
        serviceId: z.union([z.number(), z.string()]).optional(),
        serviceType: z.string().optional()
      }).parse(req.body);

      // Get patient name for the invoice
      const patient = await storage.getPatientByPatientId(invoiceData.patientId, req.tenant!.id);
      if (!patient) {
        return res.status(400).json({ error: "Patient not found" });
      }

      // Generate unique invoice number
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;

      // Detect invoice type based on insurance provider
      const invoiceType = invoiceData.insuranceProvider && invoiceData.insuranceProvider !== '' && invoiceData.insuranceProvider !== 'none' 
        ? 'insurance_claim' 
        : 'payment';

      // Generate insurance claim data if invoice type is insurance_claim
      const insuranceData = invoiceType === 'insurance_claim' ? {
        provider: invoiceData.insuranceProvider || 'NHS',
        claimNumber: `CLM${Date.now().toString().slice(-6)}`,
        status: 'approved',
        paidAmount: 0
      } : null;

      // Prepare invoice for database (with enforced created_by)
      const totalAmt = parseFloat(invoiceData.totalAmount);
      const invoiceToCreate = enforceCreatedBy(req, {
        organizationId: req.tenant!.id,
        patientId: invoiceData.patientId,
        patientName: `${patient.firstName} ${patient.lastName}`,
        nhsNumber: invoiceData.nhsNumber ? invoiceData.nhsNumber.replace(/\s+/g, '') : (patient.nhsNumber ? patient.nhsNumber.replace(/\s+/g, '') : null),
        invoiceNumber: invoiceNumber,
        invoiceDate: new Date(invoiceData.invoiceDate),
        dueDate: new Date(invoiceData.dueDate),
        dateOfService: new Date(invoiceData.serviceDate),
        status: "draft" as const,
        invoiceType: invoiceType,
        subtotal: totalAmt,
        tax: 0,
        discount: 0,
        totalAmount: totalAmt,
        paidAmount: 0,
        items: [
          {
            code: invoiceData.firstServiceCode,
            description: invoiceData.firstServiceDesc,
            quantity: parseInt(invoiceData.firstServiceQty) || 1,
            unitPrice: parseFloat(invoiceData.firstServiceAmount),
            total: parseFloat(invoiceData.firstServiceAmount)
          }
        ],
        notes: invoiceData.notes || null,
        insurance: insuranceData,
        payments: [],
        serviceId: invoiceData.serviceId || null,
        serviceType: invoiceData.serviceType || null
      });

      console.log("📝 Creating patient invoice in database:", invoiceNumber);
      const createdInvoice = await storage.createPatientInvoice(invoiceToCreate);
      console.log("✅ Patient invoice created successfully:", createdInvoice.id);
      
      res.status(201).json(createdInvoice);
    } catch (error) {
      console.error("Invoice creation error:", error);
      res.status(500).json({ error: "Failed to create invoice" });
    }
  });

  // Update invoice status
  app.patch("/api/billing/invoices/:id", requireRole(["admin", "doctor", "nurse", "receptionist"]), async (req: TenantRequest, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }

      await storage.updateInvoice(parseInt(id), req.tenant!.id, { status });
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to update invoice status:", error);
      res.status(500).json({ error: "Failed to update invoice status" });
    }
  });

  // Delete invoice
  app.delete("/api/billing/invoices/:id", requireRole(["admin", "doctor", "nurse", "receptionist"]), async (req: TenantRequest, res) => {
    try {
      const { id } = req.params;
      const invoiceId = parseInt(id);

      if (isNaN(invoiceId)) {
        return res.status(400).json({ error: "Invalid invoice ID" });
      }

      const deleted = await storage.deleteInvoice(invoiceId, req.tenant!.id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete invoice:", error);
      res.status(500).json({ error: "Failed to delete invoice" });
    }
  });

  // Get all payments for the organization
  app.get("/api/billing/payments", requireRole(["admin", "doctor", "nurse", "receptionist"]), async (req: TenantRequest, res) => {
    try {
      const payments = await storage.getPaymentsByOrganization(req.tenant!.id);
      console.log(`💳 Fetched ${payments.length} payments for organization ${req.tenant!.id}`);
      console.log("💳 Payment data:", JSON.stringify(payments, null, 2));
      res.json(payments);
    } catch (error) {
      console.error("Failed to fetch payments:", error);
      res.status(500).json({ error: "Failed to fetch payments" });
    }
  });

  // Create payment record
  app.post("/api/billing/payments", (req, res, next) => {
    console.log("🔵🔵🔵 PAYMENT ROUTE HIT - Body:", req.body);
    next();
  }, requireRole(["admin", "doctor", "nurse", "receptionist"]), async (req: TenantRequest, res) => {
    console.log("🔵 Payment endpoint handler executing - req.body:", req.body);
    try {
      const validatedData = z.object({
        organizationId: z.number(),
        invoiceId: z.number(),
        patientId: z.string(),
        transactionId: z.string(),
        amount: z.number(),
        currency: z.string().default('GBP'),
        paymentMethod: z.string(),
        paymentProvider: z.string().optional(),
        paymentStatus: z.string().default('completed'),
        paymentDate: z.string(),
        reference: z.string().optional(),
        notes: z.string().optional(),
      }).parse(req.body);

      // Convert paymentDate string to Date object for Drizzle
      const paymentData = {
        ...validatedData,
        paymentDate: new Date(validatedData.paymentDate),
      };

      console.log("💰 Creating payment record:", paymentData);
      const createdPayment = await storage.createPayment(paymentData);
      console.log("✅ Payment record created successfully:", createdPayment.id);
      
      res.status(201).json(createdPayment);
    } catch (error) {
      console.error("❌ Payment creation error:", error);
      res.status(500).json({ error: "Failed to create payment" });
    }
  });

  // Lab Test Cash Payment - Create invoice and payment record immediately
  app.post("/api/payments/cash", authMiddleware, multiTenantEnforcer(), async (req: TenantRequest, res) => {
    try {
      console.log('[CASH PAYMENT] Request received, body:', JSON.stringify(req.body, null, 2));
      const organizationId = requireOrgId(req);
      const { patient_id, patientName, items, totalAmount, insuranceProvider, serviceDate, invoiceDate, dueDate, serviceType, serviceId } = req.body;

      // Fetch patient record to get formatted patientId (e.g., P000001)
      const patientRecord = await storage.getPatient(patient_id, organizationId);
      if (!patientRecord) {
        return res.status(404).json({ error: "Patient not found" });
      }
      const formattedPatientId = patientRecord.patientId;

      // Generate unique invoice number
      const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
      console.log('[CASH PAYMENT] Generated invoice number:', invoiceNumber);
      
      // Create invoice
      const invoiceData: any = {
        organizationId,
        invoiceNumber,
        patientId: formattedPatientId,
        patientName,
        dateOfService: new Date(serviceDate),
        invoiceDate: new Date(invoiceDate),
        dueDate: new Date(dueDate),
        status: 'paid',
        invoiceType: 'payment',
        subtotal: totalAmount,
        tax: 0,
        discount: 0,
        totalAmount: totalAmount,
        paidAmount: totalAmount,
        items: items.map((item: any) => ({
          code: item.code,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total
        })),
        payments: [{
          id: `PAY-${Date.now()}`,
          amount: totalAmount,
          method: 'cash',
          date: new Date().toISOString(),
          reference: invoiceNumber
        }],
        notes: insuranceProvider ? `Insurance Provider: ${insuranceProvider}` : undefined,
        createdBy: req.user?.id
      };
      
      // Add polymorphic association fields if provided
      if (serviceType && serviceId) {
        invoiceData.serviceType = serviceType;
        invoiceData.serviceId = serviceId;
      }

      console.log('[CASH PAYMENT] Creating invoice...');
      const invoice = await storage.createPatientInvoice(invoiceData);
      console.log('[CASH PAYMENT] Invoice created:', invoice.id, invoice.invoiceNumber);

      // Create payment record
      const paymentData = {
        organizationId,
        invoiceId: invoice.id,
        patientId: formattedPatientId,
        transactionId: `CASH-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`,
        amount: totalAmount,
        currency: 'GBP',
        paymentMethod: 'cash',
        paymentProvider: 'manual',
        paymentStatus: 'completed',
        paymentDate: new Date(),
        reference: invoiceNumber,
        metadata: {
          patientName: patientName
        },
        notes: `Cash payment for lab test invoice ${invoiceNumber}`
      };

      console.log('[CASH PAYMENT] Creating payment record...');
      const payment = await storage.createPayment(paymentData);
      console.log('[CASH PAYMENT] Payment created:', payment.id);

      const responseData = { 
        success: true, 
        invoice: {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber
        },
        payment: {
          id: payment.id,
          transactionId: payment.transactionId
        }
      };
      
      console.log('[CASH PAYMENT] Sending response:', JSON.stringify(responseData, null, 2));
      res.setHeader('Content-Type', 'application/json');
      res.json(responseData);
    } catch (error) {
      console.error("[CASH PAYMENT] Error:", error);
      res.status(500).json({ error: "Failed to process cash payment" });
    }
  });

  // Lab Test Stripe Payment - Create payment intent
  app.post("/api/payments/stripe", authMiddleware, multiTenantEnforcer(), async (req: TenantRequest, res) => {
    try {
      const organizationId = requireOrgId(req);
      const { patient_id, patientName, amount, items, insuranceProvider, serviceDate, invoiceDate, dueDate, serviceType, serviceId } = req.body;

      // Fetch patient record to get formatted patientId (e.g., P000001)
      const patientRecord = await storage.getPatient(patient_id, organizationId);
      if (!patientRecord) {
        return res.status(404).json({ error: "Patient not found" });
      }
      const formattedPatientId = patientRecord.patientId;

      if (!stripe) {
        return res.status(503).json({ error: "Stripe is not configured" });
      }

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'gbp',
        metadata: {
          organizationId: organizationId.toString(),
          patientId: formattedPatientId,
          patientName,
          serviceDate,
          invoiceDate,
          dueDate,
          items: JSON.stringify(items),
          insuranceProvider: insuranceProvider || '',
          serviceType: serviceType || '',
          serviceId: serviceId || ''
        }
      });

      res.json({ 
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      });
    } catch (error) {
      console.error("Stripe payment intent error:", error);
      res.status(500).json({ error: "Failed to create payment intent" });
    }
  });

  // Lab Test Stripe Payment Confirmation - Create invoice and payment after successful charge
  app.post("/api/payments/stripe/confirm", authMiddleware, multiTenantEnforcer(), async (req: TenantRequest, res) => {
    try {
      const organizationId = requireOrgId(req);
      const { paymentIntentId } = req.body;

      if (!stripe) {
        return res.status(503).json({ error: "Stripe is not configured" });
      }

      // Retrieve payment intent to get metadata
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({ error: "Payment not successful" });
      }

      const metadata = paymentIntent.metadata;
      const items = JSON.parse(metadata.items || '[]');
      const amount = paymentIntent.amount / 100; // Convert from cents

      // Generate unique invoice number
      const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
      
      // Create invoice
      const invoiceData: any = {
        organizationId,
        invoiceNumber,
        patientId: metadata.patientId,
        patientName: metadata.patientName,
        dateOfService: new Date(metadata.serviceDate),
        invoiceDate: new Date(metadata.invoiceDate),
        dueDate: new Date(metadata.dueDate),
        status: 'paid',
        invoiceType: 'payment',
        subtotal: amount,
        tax: 0,
        discount: 0,
        totalAmount: amount,
        paidAmount: amount,
        balanceDue: 0,
        lineItems: items.map((item: any) => ({
          serviceCode: item.code,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.total,
          billingType: 'lab_test'
        })),
        payments: [{
          id: paymentIntentId,
          amount: amount,
          method: 'card',
          date: new Date().toISOString(),
          reference: invoiceNumber
        }],
        notes: metadata.insuranceProvider ? `Insurance Provider: ${metadata.insuranceProvider}` : undefined,
        createdBy: req.user?.id
      };
      
      // Add polymorphic association fields if provided in metadata
      if (metadata.serviceType && metadata.serviceId) {
        invoiceData.serviceType = metadata.serviceType;
        invoiceData.serviceId = metadata.serviceId;
      }

      const invoice = await storage.createInvoice(invoiceData);

      // Create payment record
      const paymentData = {
        organizationId,
        invoiceId: invoice.id,
        patientId: metadata.patientId,
        transactionId: paymentIntentId,
        amount: amount,
        currency: 'gbp',
        paymentMethod: 'debit_card',
        paymentProvider: 'stripe',
        paymentStatus: 'completed',
        paymentDate: new Date(),
        reference: invoiceNumber,
        metadata: {
          patientName: metadata.patientName,
          stripePaymentIntentId: paymentIntentId,
          cardLast4: paymentIntent.charges.data[0]?.payment_method_details?.card?.last4
        },
        notes: `Stripe payment for lab test invoice ${invoiceNumber}`
      };

      const payment = await storage.createPayment(paymentData);

      res.json({ 
        success: true, 
        invoice: {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber
        },
        payment: {
          id: payment.id,
          transactionId: payment.transactionId
        }
      });
    } catch (error) {
      console.error("Stripe payment confirmation error:", error);
      res.status(500).json({ error: "Failed to confirm payment" });
    }
  });

  // Create Stripe Payment Intent for invoice payment
  app.post("/api/billing/create-payment-intent", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const { invoiceId } = req.body;

      if (!invoiceId) {
        return res.status(400).json({ error: "Invoice ID is required" });
      }

      // Get invoice details
      const invoices = await storage.getInvoicesByOrganization(req.tenant!.id);
      const invoice = invoices.find(inv => inv.id === Number(invoiceId));

      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      // Check if invoice is already paid
      if (invoice.status === 'paid') {
        return res.status(400).json({ error: "Invoice is already paid" });
      }

      // Calculate amount to pay (total - already paid)
      const totalAmount = typeof invoice.totalAmount === 'string' ? parseFloat(invoice.totalAmount) : invoice.totalAmount;
      const paidAmount = typeof invoice.paidAmount === 'string' ? parseFloat(invoice.paidAmount) : invoice.paidAmount;
      const amountToPay = totalAmount - paidAmount;

      if (amountToPay <= 0) {
        return res.status(400).json({ error: "Invoice is already fully paid" });
      }

      // Check if Stripe is configured
      if (!stripe) {
        return res.status(503).json({ error: "Payment processing is not configured. Please contact support." });
      }

      // Create Stripe payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amountToPay * 100), // Convert to pence/cents
        currency: "gbp",
        metadata: {
          invoiceId: invoice.id.toString(),
          patientId: invoice.patientId,
          organizationId: req.tenant!.id.toString(),
        },
        description: `Payment for Invoice ${invoice.invoiceNumber} - ${invoice.patientName}`,
      });

      res.json({ 
        clientSecret: paymentIntent.client_secret,
        amount: amountToPay,
        invoiceNumber: invoice.invoiceNumber,
        patientName: invoice.patientName
      });
    } catch (error: any) {
      console.error("Payment intent creation error:", error);
      
      // Handle Stripe-specific errors with user-friendly messages
      if (error.type === 'StripeAuthenticationError') {
        return res.status(500).json({ 
          error: "Payment system configuration error. Please contact support." 
        });
      }
      
      if (error.type === 'StripeInvalidRequestError') {
        return res.status(400).json({ 
          error: "Invalid payment request. Please try again." 
        });
      }
      
      // Generic error for other cases
      res.status(500).json({ 
        error: "Unable to process payment. Please try again or contact support." 
      });
    }
  });

  // Process successful payment and update invoice
  app.post("/api/billing/process-payment", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const { paymentIntentId, invoiceId } = req.body;

      if (!paymentIntentId || !invoiceId) {
        return res.status(400).json({ error: "Payment intent ID and invoice ID are required" });
      }

      // Check if Stripe is configured
      if (!stripe) {
        return res.status(503).json({ error: "Payment processing is not configured. Please contact support." });
      }

      // Retrieve payment intent from Stripe to verify payment
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({ error: "Payment not successful" });
      }

      // Get invoice details
      const invoices = await storage.getInvoicesByOrganization(req.tenant!.id);
      const invoice = invoices.find(inv => inv.id === Number(invoiceId));

      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      const paidAmount = paymentIntent.amount / 100; // Convert from pence/cents to pounds

      // Record payment in payments table
      const paymentData = {
        organizationId: req.tenant!.id,
        invoiceId: Number(invoiceId),
        patientId: invoice.patientId,
        transactionId: paymentIntentId,
        amount: paidAmount.toString(),
        currency: (paymentIntent.currency || 'gbp').toUpperCase(),
        paymentMethod: 'online',
        paymentProvider: 'stripe',
        paymentStatus: 'completed',
        paymentDate: new Date(),
        metadata: {
          stripePaymentIntentId: paymentIntentId,
          cardLast4: paymentIntent.charges?.data[0]?.payment_method_details?.card?.last4,
          cardBrand: paymentIntent.charges?.data[0]?.payment_method_details?.card?.brand,
          receiptUrl: paymentIntent.charges?.data[0]?.receipt_url,
        }
      };

      await storage.createPayment(paymentData);

      // Update invoice status to paid
      const currentPaidAmount = typeof invoice.paidAmount === 'string' ? parseFloat(invoice.paidAmount) : invoice.paidAmount;
      const totalAmount = typeof invoice.totalAmount === 'string' ? parseFloat(invoice.totalAmount) : invoice.totalAmount;
      const newPaidAmount = currentPaidAmount + paidAmount;

      await storage.updateInvoice(Number(invoiceId), req.tenant!.id, {
        status: 'paid',
        paidAmount: newPaidAmount.toString(),
        updatedAt: new Date(),
      });

      res.json({ 
        success: true, 
        message: "Payment processed successfully",
        receiptUrl: paymentIntent.charges?.data[0]?.receipt_url
      });
    } catch (error: any) {
      console.error("Payment processing error:", error);
      res.status(500).json({ error: error.message || "Failed to process payment" });
    }
  });

  // Send invoice via email
  app.post("/api/billing/send-invoice", requireRole(["admin", "doctor", "nurse", "receptionist"]), async (req: TenantRequest, res) => {
    try {
      const { invoiceId, sendMethod, recipientEmail, customMessage } = req.body;

      if (!invoiceId) {
        return res.status(400).json({ error: "Invoice ID is required" });
      }

      if (sendMethod === 'email' && !recipientEmail) {
        return res.status(400).json({ error: "Recipient email is required" });
      }

      // Get invoice details - convert invoiceId to number for comparison
      const id = Number(invoiceId);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid invoice ID" });
      }

      const invoices = await storage.getInvoicesByOrganization(req.tenant!.id);
      const invoice = invoices.find(inv => inv.id === id);

      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      if (sendMethod === 'email') {
        // Format dates
        const formatDate = (date: Date | string) => {
          const d = new Date(date);
          return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        };

        // Parse total amount
        const totalAmount = typeof invoice.totalAmount === 'string' 
          ? parseFloat(invoice.totalAmount) 
          : invoice.totalAmount;

        // Generate invoice email template
        const subject = `Invoice ${invoice.invoiceNumber} - ${invoice.patientName}`;
        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #4A7DFF; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background-color: #f9f9f9; }
              .invoice-details { background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Cura EMR</h1>
                <h2>Invoice</h2>
              </div>
              <div class="content">
                <p>Dear ${invoice.patientName},</p>
                ${customMessage ? `<p>${customMessage}</p>` : '<p>Please find attached your invoice for services rendered.</p>'}
                
                <div class="invoice-details">
                  <h3>Invoice Details</h3>
                  <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
                  <p><strong>Date:</strong> ${formatDate(invoice.invoiceDate)}</p>
                  <p><strong>Due Date:</strong> ${formatDate(invoice.dueDate)}</p>
                  <p><strong>Total Amount:</strong> £${totalAmount.toFixed(2)}</p>
                </div>
                
                <p>Thank you for choosing our healthcare services.</p>
                
                <p>Best regards,<br>Cura EMR Team</p>
              </div>
              <div class="footer">
                <p>© 2025 Cura EMR by Cura Software Limited. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `;

        const text = `
Dear ${invoice.patientName},

${customMessage || 'Please find attached your invoice for services rendered.'}

Invoice Details:
Invoice Number: ${invoice.invoiceNumber}
Date: ${formatDate(invoice.invoiceDate)}
Due Date: ${formatDate(invoice.dueDate)}
Total Amount: £${totalAmount.toFixed(2)}

Thank you for choosing our healthcare services.

Best regards,
Cura EMR Team
        `;

        // Send email using the email service
        const emailSent = await emailService.sendEmail({
          to: recipientEmail,
          subject,
          html,
          text
        });

        if (emailSent) {
          res.json({ success: true, message: "Invoice sent successfully" });
        } else {
          res.status(500).json({ error: "Failed to send invoice email" });
        }
      } else {
        // For SMS and print methods, just return success for now
        res.json({ success: true, message: "Invoice sent successfully" });
      }
    } catch (error) {
      console.error("Failed to send invoice:", error);
      res.status(500).json({ error: "Failed to send invoice" });
    }
  });

  // SaaS routes already registered above before tenant middleware

  const httpServer = createServer(app);
  // HTML Generator for PDF Reports
  function generateReportHTML(study: any, reportFormData: any = {}) {
    const currentDate = new Date().toLocaleDateString('en-GB');
    const currentDateTime = new Date().toLocaleString('en-GB');
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Radiology Report</title>
    <style>
        @page { 
            margin: 0.5in; 
            size: A4;
        }
        body { 
            font-family: 'Helvetica', 'Arial', sans-serif; 
            font-size: 8pt; 
            line-height: 1.3; 
            margin: 0; 
            color: #000;
        }
        .header { 
            padding: 8px; 
            text-align: center; 
            margin-bottom: 15px;
        }
        .header h1 { 
            font-size: 16pt; 
            font-weight: bold; 
            color: #1e3a8a; 
            margin: 5px 0;
        }
        .header h2 { 
            font-size: 10pt; 
            color: #666; 
            margin: 3px 0;
        }
        .info-section { 
            padding: 8px; 
            margin-bottom: 12px;
        }
        .info-header { 
            font-size: 9pt; 
            font-weight: bold; 
            margin-bottom: 5px;
        }
        .info-row { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 3px;
        }
        .info-label { 
            font-weight: bold; 
            margin-right: 10px;
        }
        .section-title { 
            font-size: 9pt; 
            font-weight: bold; 
            margin: 15px 0 5px 0; 
            color: #1e3a8a;
        }
        .content { 
            margin-left: 5px; 
            margin-bottom: 8px;
        }
        .image-placeholder {
            width: 100px;
            height: 70px;
            margin: 10px auto;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
        }
        .image-text {
            font-size: 8pt;
            color: #1e3a8a;
            font-weight: bold;
        }
        .footer { 
            color: #1e3a8a; 
            padding: 6px 10px; 
            font-size: 7pt; 
            margin-top: 20px;
            display: flex;
            justify-content: space-between;
        }
        .signature-section {
            margin-top: 15px;
            padding-top: 8px;
        }
        .signature-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>CURA MEDICAL CENTER</h1>
        <h2>RADIOLOGY DIAGNOSTIC REPORT</h2>
    </div>
    <div style="border-bottom: 1px solid #9ca3af; margin-bottom: 15px;"></div>

    <div class="info-section">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
            <div style="flex: 1; margin-right: 30px;">
                <div class="info-header">PATIENT INFORMATION</div>
                <div style="margin-top: 5px;">
                    <div><span class="info-label">Name:</span> ${study.patientName || 'N/A'}</div>
                    <div><span class="info-label">ID:</span> ${study.patientId || 'N/A'}</div>
                    <div><span class="info-label">Date:</span> ${currentDate}</div>
                </div>
            </div>
            <div style="flex: 1;">
                <div class="info-header">STUDY INFORMATION</div>
                <div style="margin-top: 5px;">
                    <div><span class="info-label">Study:</span> ${study.studyType || 'N/A'}</div>
                    <div><span class="info-label">Modality:</span> ${study.modality || 'N/A'}</div>
                    <div><span class="info-label">Body Part:</span> ${study.bodyPart || 'N/A'}</div>
                </div>
            </div>
        </div>
    </div>

    <div class="section-title">CLINICAL INDICATION:</div>
    <div class="content">${study.indication || 'Clinical evaluation requested'}</div>

    <div class="section-title">TECHNIQUE:</div>
    <div class="content">${study.modality || 'Imaging'} imaging of the ${study.bodyPart || 'target area'} performed per standard protocol.</div>

    <div class="section-title">FINDINGS:</div>
    <div class="content">${reportFormData.findings || study.findings || 'Normal anatomical structures within imaging field. No acute abnormalities identified. Bone structures intact with no fracture or dislocation. Soft tissues show normal characteristics.'}</div>

    <div class="section-title">IMPRESSION:</div>
    <div class="content">${reportFormData.impression || study.impression || 'Normal study. No acute findings.'}</div>

    <div class="signature-section">
        <div class="signature-row">
            <span><span class="info-label">REPORTED BY:</span> ${reportFormData.radiologist || study.radiologist || "Dr. Sarah Johnson"}</span>
            <span><span class="info-label">Date:</span> ${currentDateTime}</span>
        </div>
        <div class="signature-row">
            <span style="margin-left: 80px;">MD, Diagnostic Radiology</span>
            <span>License #: MD-RAD-2024</span>
        </div>
    </div>

    <div style="margin-top: 25px; padding-top: 15px; border-top: 1px solid #e5e5e5;">
        <div class="section-title">REPRESENTATIVE IMAGES:</div>
        <div class="image-placeholder">
            <div>
                <div class="image-text">MEDICAL IMAGE</div>
                <div style="font-size: 7pt; color: #666; margin-top: 5px;">
                    ${study.images && study.images[0] ? study.images[0].fileName || study.images[0].seriesDescription || 'Imaging Study' : 'Medical Study'}<br>
                    Image Available
                </div>
            </div>
        </div>
    </div>

    <div class="footer">
        <span>Cura Medical Center | Radiology Department</span>
        <span>Tel: +44-123-456-7890 | Email: radiology@curamedical.com</span>
    </div>
    
    <div style="text-align: center; font-size: 6pt; color: #1e3a8a; padding: 3px; margin-top: -10px;">
        CONFIDENTIAL MEDICAL REPORT - For authorized personnel only
    </div>
</body>
</html>`;
  }

  // PDF Report Generation Endpoint
  app.post("/api/imaging/generate-report", authMiddleware, requireRole(["doctor", "nurse", "admin"]), async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const { study, reportFormData, imageData, uploadedImageFileNames } = req.body;
      
      if (!study || !study.patientName) {
        return res.status(400).json({ error: "Study data is required" });
      }

      // Get the actual medical image from database to ensure we use the correct image_id and patient_id
      const imageId = parseInt(study.id);
      const medicalImage = await storage.getMedicalImage(imageId, req.tenant!.id);
      if (!medicalImage) {
        return res.status(404).json({ error: "Medical image not found" });
      }
      
      // Use image_id from database as PDF filename (e.g., IMG1760647135I10NC.pdf)
      const reportId = medicalImage.imageId;
      const patientId = medicalImage.patientId; // Use numeric database patient ID
      const organizationId = req.organizationId || req.tenant!.id;
      
      // Save PDF in organizational structure: uploads/Imaging_Reports/organization_id/patients/patient_id/
      const reportsDir = path.resolve(process.cwd(), 'uploads', 'Imaging_Reports', String(organizationId), 'patients', String(patientId));
      await fse.ensureDir(reportsDir);
      
      // Import pdf-lib dynamically
      const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
      
      // Create a new PDF document
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]); // A4 size in points
      const { width, height } = page.getSize();
      
      // Load fonts
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      // Colors
      const primaryBlue = rgb(0.12, 0.23, 0.54); // #1e3a8a
      const lightGray = rgb(0.95, 0.95, 0.95); // Light background
      const darkGray = rgb(0.3, 0.3, 0.3);
      const blackColor = rgb(0, 0, 0);
      
      // Helper function to draw a section box (borders and background removed)
      const drawSectionBox = (x: number, y: number, width: number, height: number) => {
        // No borders or background - content only
      };
      
      // Position tracker
      let yPosition = height - 40;
      
      // Professional Formal Header
      const headerHeight = 100;
      
      // Medical cross symbol (using standard plus symbol) - no background
      page.drawText('+', {
        x: 67,
        y: yPosition - 55,
        size: 32,
        font: boldFont,
        color: primaryBlue
      });
      
      // Institution name and department
      page.drawText('CURA MEDICAL CENTER', {
        x: 120,
        y: yPosition - 20,
        size: 16,
        font: boldFont,
        color: primaryBlue
      });
      
      page.drawText('DEPARTMENT OF DIAGNOSTIC RADIOLOGY', {
        x: 120,
        y: yPosition - 38,
        size: 11,
        font,
        color: darkGray
      });
      
      page.drawText('Ground Floor Unit 2, Drayton Court, Drayton Road, Solihull, England B90 4NG', {
        x: 120,
        y: yPosition - 52,
        size: 8,
        font,
        color: darkGray
      });
      
      page.drawText('Tel: +44-123-456-7890 | Fax: +44-123-456-7891', {
        x: 120,
        y: yPosition - 65,
        size: 8,
        font,
        color: darkGray
      });
      
      // Report title (right side) - no background
      page.drawText('DIAGNOSTIC', {
        x: width - 170,
        y: yPosition - 30,
        size: 12,
        font: boldFont,
        color: primaryBlue
      });
      
      page.drawText('RADIOLOGY REPORT', {
        x: width - 175,
        y: yPosition - 43,
        size: 11,
        font: boldFont,
        color: primaryBlue
      });
      
      yPosition -= headerHeight + 20;
      
      // Save starting position for both sections (equal alignment)
      const sectionsStartY = yPosition;
      
      // Patient Information Section (Left side)
      drawSectionBox(30, sectionsStartY + 5, (width - 80) / 2, 120);
      page.drawText('PATIENT INFORMATION', {
        x: 40,
        y: sectionsStartY - 10,
        size: 12,
        font: boldFont,
        color: primaryBlue
      });
      
      let leftColumnY = sectionsStartY - 30;
      page.drawText(`Name: ${study.patientName}`, { x: 50, y: leftColumnY, size: 10, font });
      leftColumnY -= 15;
      page.drawText(`ID: ${study.patientId || 'N/A'}`, { x: 50, y: leftColumnY, size: 10, font });
      leftColumnY -= 15;
      page.drawText(`DOB: ${study.patientDOB || 'N/A'}`, { x: 50, y: leftColumnY, size: 10, font });
      leftColumnY -= 15;
      page.drawText(`Study Date: ${new Date().toLocaleDateString()}`, { x: 50, y: leftColumnY, size: 10, font });
      
      // Study Information Section (Right side) - SAME Y POSITION for equal alignment
      const rightColumnX = width / 2 + 10;
      drawSectionBox(rightColumnX, sectionsStartY + 5, (width - 80) / 2, 120);
      page.drawText('STUDY INFORMATION', {
        x: rightColumnX + 10,
        y: sectionsStartY - 10,
        size: 12,
        font: boldFont,
        color: primaryBlue
      });
      
      let rightColumnY = sectionsStartY - 30;
      page.drawText(`Study Type: ${study.studyType}`, { x: rightColumnX + 20, y: rightColumnY, size: 10, font });
      rightColumnY -= 15;
      page.drawText(`Body Part: ${study.bodyPart}`, { x: rightColumnX + 20, y: rightColumnY, size: 10, font });
      rightColumnY -= 15;
      page.drawText(`Modality: ${study.modality}`, { x: rightColumnX + 20, y: rightColumnY, size: 10, font });
      rightColumnY -= 15;
      page.drawText(`Status: ${study.status || 'Complete'}`, { x: rightColumnX + 20, y: rightColumnY, size: 10, font });
      
      yPosition = sectionsStartY - 130;
      
      if (reportFormData) {
        yPosition -= 20;
        
        // Clinical sections with professional formatting
        const clinicalSections = [
          { title: 'CLINICAL INDICATION', content: reportFormData.clinicalIndication },
          { title: 'TECHNIQUE', content: reportFormData.technique },
          { title: 'FINDINGS', content: reportFormData.findings },
          { title: 'IMPRESSION', content: reportFormData.impression }
        ];
        
        clinicalSections.forEach(section => {
          if (section.content) {
            // Calculate section height for text wrapping
            const maxLineLength = 70;
            const lines = section.content.match(new RegExp(`.{1,${maxLineLength}}(\\s|$)`, 'g')) || [section.content];
            const sectionHeight = Math.max(60, lines.length * 15 + 40);
            
            // Draw section background
            drawSectionBox(30, yPosition + 10, width - 60, sectionHeight);
            
            page.drawText(section.title, {
              x: 40,
              y: yPosition - 5,
              size: 12,
              font: boldFont,
              color: primaryBlue
            });
            
            // Draw content with text wrapping
            let textY = yPosition - 25;
            lines.forEach((line: string) => {
              page.drawText(line.trim(), { 
                x: 50, 
                y: textY, 
                size: 10, 
                font,
                maxWidth: width - 100
              });
              textY -= 15;
            });
            
            yPosition -= sectionHeight + 10;
          }
        });
      } else {
        // Add indication and findings from study data if no form data
        yPosition -= 20;
        
        if (study.indication) {
          drawSectionBox(30, yPosition + 10, width - 60, 50);
          page.drawText('CLINICAL INDICATION', {
            x: 40,
            y: yPosition - 5,
            size: 12,
            font: boldFont,
            color: primaryBlue
          });
          page.drawText(study.indication, { x: 50, y: yPosition - 25, size: 10, font });
          yPosition -= 70;
        }
        
        if (study.findings) {
          drawSectionBox(30, yPosition + 10, width - 60, 50);
          page.drawText('FINDINGS', {
            x: 40,
            y: yPosition - 5,
            size: 12,
            font: boldFont,
            color: primaryBlue
          });
          page.drawText(study.findings, { x: 50, y: yPosition - 25, size: 10, font });
          yPosition -= 70;
        }
      }
      
      // Professional Signature Section
      yPosition -= 20;
      const signatureHeight = 120;
      drawSectionBox(30, yPosition + 10, width - 60, signatureHeight);
      
      page.drawText('RADIOLOGIST REPORT', {
        x: 40,
        y: yPosition - 5,
        size: 12,
        font: boldFont,
        color: primaryBlue
      });
      
      // Radiologist information
      const radiologistName = reportFormData?.radiologist || study.radiologist || "Dr. Sarah Johnson, MD";
      page.drawText(`Reported by: ${radiologistName}`, { 
        x: 50, 
        y: yPosition - 30, 
        size: 11, 
        font: boldFont,
        color: blackColor
      });
      
      page.drawText('Board Certified Diagnostic Radiologist', { 
        x: 50, 
        y: yPosition - 45, 
        size: 10, 
        font,
        color: darkGray
      });
      
      page.drawText('Medical License: MD-RAD-2024', { 
        x: 50, 
        y: yPosition - 60, 
        size: 10, 
        font,
        color: darkGray
      });
      
      // Report completion info
      const reportDate = new Date().toLocaleDateString('en-GB', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      page.drawText(`Report Date: ${reportDate}`, { 
        x: width - 250, 
        y: yPosition - 30, 
        size: 10, 
        font,
        color: darkGray
      });
      
      page.drawText(`Report ID: ${reportId}`, { 
        x: width - 250, 
        y: yPosition - 45, 
        size: 9, 
        font,
        color: rgb(0.6, 0.6, 0.6)
      });
      
      // Digital signature placeholder removed
      
      // Ensure proper spacing between radiologist report and medical image sections
      yPosition -= 80; // Increased spacing to prevent overlap
      
      // Medical Image Section (moved after radiologist report)
      let imageHeight = 0;
      
      // Check for image data from uploaded image filenames or database fileName and filesystem
      let imageBuffers: Array<{ buffer: Buffer; mimeType: string }> = [];
      
      // Priority 1: Use uploaded image filenames if provided
      if (uploadedImageFileNames && Array.isArray(uploadedImageFileNames) && uploadedImageFileNames.length > 0) {
        console.log("📷 SERVER: Processing uploaded images:", uploadedImageFileNames);
        
        const imagingImagesDir = path.resolve(process.cwd(), 'uploads', 'Imaging_Images');
        await fse.ensureDir(imagingImagesDir);
        
        for (const fileName of uploadedImageFileNames) {
          try {
            const imageFilePath = path.join(imagingImagesDir, fileName);
            
            if (await fse.pathExists(imageFilePath)) {
              console.log("📷 SERVER: Loading uploaded image:", fileName);
              
              const imageBuffer = await readFile(imageFilePath);
              
              // Determine MIME type from file extension
              const fileExtension = path.extname(fileName).toLowerCase();
              let mimeType = 'image/jpeg';
              if (fileExtension === '.png') {
                mimeType = 'image/png';
              } else if (fileExtension === '.jpg' || fileExtension === '.jpeg') {
                mimeType = 'image/jpeg';
              }
              
              imageBuffers.push({ buffer: imageBuffer, mimeType });
              console.log("📷 SERVER: Successfully loaded uploaded image:", fileName, "mimeType:", mimeType);
            } else {
              console.log("📷 SERVER: Uploaded image file not found:", fileName);
            }
          } catch (error) {
            console.error("📷 SERVER: Error loading uploaded image:", fileName, error);
          }
        }
      }
      
      // Priority 2: Fallback to study.fileName if no uploaded images
      if (imageBuffers.length === 0) {
        let imageBuffer: Buffer | null = null;
        let actualMimeType = 'image/jpeg';
        
        // Get fileName from the database study
        const fileName = study.fileName;
        
        if (fileName && fileName.trim() !== '') {
          try {
            // Ensure the Imaging_Images directory exists
            const imagingImagesDir = path.resolve(process.cwd(), 'uploads', 'Imaging_Images');
            await fse.ensureDir(imagingImagesDir);
            console.log("📷 SERVER: Ensured directory exists:", imagingImagesDir);
            
            // Construct the full path to the image file
            const imageFilePath = path.join(imagingImagesDir, fileName);
            console.log("📷 SERVER: Checking for image file at:", imageFilePath);
            
            // Check if the image file exists on the server filesystem
            if (await fse.pathExists(imageFilePath)) {
              console.log("📷 SERVER: Image file exists, reading from filesystem:", fileName);
              
              // Read the image file directly as Buffer (no base64 conversion needed)
              imageBuffer = await readFile(imageFilePath);
              
              // Determine MIME type from file extension
              const fileExtension = path.extname(fileName).toLowerCase();
              if (fileExtension === '.png') {
                actualMimeType = 'image/png';
              } else if (fileExtension === '.jpg' || fileExtension === '.jpeg') {
                actualMimeType = 'image/jpeg';
              } else {
                // Default to jpeg for unknown extensions
                actualMimeType = 'image/jpeg';
              }
              
              console.log("📷 SERVER: Successfully loaded image from filesystem, mimeType:", actualMimeType);
            } else {
              console.log("📷 SERVER: Image file not found at path:", imageFilePath);
            }
          } catch (error) {
            console.error("📷 SERVER: Error accessing image file from filesystem:", error);
          }
        }
        
        // Fallback to existing methods if filesystem image not found
        if (!imageBuffer) {
          if (imageData) {
            // Use imageData from request body (includes data:image prefix)
            console.log("📷 SERVER: Fallback - Using imageData from request body");
            const base64Data = imageData.split(',')[1]; // Remove data:image/jpeg;base64, prefix
            imageBuffer = Buffer.from(base64Data, 'base64');
            if (imageData.includes('image/png')) {
              actualMimeType = 'image/png';
            } else if (imageData.includes('image/jpeg') || imageData.includes('image/jpg')) {
              actualMimeType = 'image/jpeg';
            }
          } else if (study.images && study.images[0] && study.images[0].imageData) {
            // Use imageData from study
            console.log("📷 SERVER: Fallback - Using imageData from study");
            imageBuffer = Buffer.from(study.images[0].imageData, 'base64');
            actualMimeType = study.images[0].mimeType || 'image/jpeg';
          }
        }
        
        if (imageBuffer) {
          imageBuffers.push({ buffer: imageBuffer, mimeType: actualMimeType });
        }
      }
      
      // Embed all images in the PDF
      if (imageBuffers.length > 0) {
        console.log(`📷 SERVER: Embedding ${imageBuffers.length} image(s) in PDF`);
        
        for (let imgIndex = 0; imgIndex < imageBuffers.length; imgIndex++) {
          const { buffer: currentBuffer, mimeType: currentMimeType } = imageBuffers[imgIndex];
          
          try {
            console.log(`📷 SERVER: Processing image ${imgIndex + 1}/${imageBuffers.length} for PDF, mimeType:`, currentMimeType);
            
            // Embed image based on MIME type with robust error handling
            let image;
            let embedSuccess = false;
            let primaryError: any = null;
            
            // Try primary format first
            try {
              if (currentMimeType.includes('jpeg') || currentMimeType.includes('jpg')) {
                image = await pdfDoc.embedJpg(currentBuffer);
                embedSuccess = true;
                console.log("📷 SERVER: Successfully embedded as JPEG");
              } else if (currentMimeType.includes('png')) {
                image = await pdfDoc.embedPng(currentBuffer);
                embedSuccess = true;
                console.log("📷 SERVER: Successfully embedded as PNG");
              }
            } catch (error) {
              primaryError = error;
              console.log("📷 SERVER: Primary embedding failed, trying fallback:", error.message);
            }
            
            // If primary failed, try fallback format
            if (!embedSuccess) {
              try {
                if (currentMimeType.includes('png')) {
                  // Try JPEG if PNG failed
                  image = await pdfDoc.embedJpg(currentBuffer);
                  embedSuccess = true;
                  console.log("📷 SERVER: ✅ Successfully embedded PNG file as JPEG (fallback)");
                } else {
                  // Try PNG if JPEG failed  
                  image = await pdfDoc.embedPng(currentBuffer);
                  embedSuccess = true;
                  console.log("📷 SERVER: ✅ Successfully embedded JPEG file as PNG (fallback)");
                }
              } catch (fallbackError) {
                console.error("📷 SERVER: ❌ Both embedding methods failed - PNG and JPEG");
                console.error("📷 SERVER: Primary error:", primaryError?.message);
                console.error("📷 SERVER: Fallback error:", fallbackError.message);
              }
            }
            
            if (image) {
              // Calculate image dimensions to fit nicely in the PDF
              const maxImageWidth = 200;
              const maxImageHeight = 150;
              const imageAspectRatio = image.width / image.height;
              
              let drawWidth = maxImageWidth;
              let drawHeight = maxImageWidth / imageAspectRatio;
              
              if (drawHeight > maxImageHeight) {
                drawHeight = maxImageHeight;
                drawWidth = maxImageHeight * imageAspectRatio;
              }
              
              imageHeight = drawHeight + 60;
              
              // Image Section with border
              drawSectionBox(30, yPosition + 10, width - 60, imageHeight);
              const imageTitle = imageBuffers.length > 1 ? `MEDICAL IMAGE ${imgIndex + 1}/${imageBuffers.length}` : 'MEDICAL IMAGE';
              page.drawText(imageTitle, {
                x: 40,
                y: yPosition - 5,
                size: 12,
                font: boldFont,
                color: primaryBlue
              });
              
              // Draw the medical image on the right side
              page.drawImage(image, {
                x: width - drawWidth - 40, // Right-aligned with 40pt margin
                y: yPosition - drawHeight - 40,
                width: drawWidth,
                height: drawHeight
              });
              
              // Image Series information
              const fileSize = study.images && study.images[0] && study.images[0].fileSize ? (study.images[0].fileSize / (1024 * 1024)).toFixed(2) : '0.00';
              const imageSeries = `${study.modality || 'X-Ray'} • ${fileSize} MB • ${currentMimeType.includes('jpeg') ? 'JPEG' : 'PNG'}`;
              
              page.drawText(`Image Info: ${imageSeries}`, {
                x: 50,
                y: yPosition - imageHeight + 25,
                size: 9,
                font,
                color: darkGray
              });
              
              page.drawText(`Series: ${study.images && study.images[0] ? (study.images[0].seriesDescription || study.studyType || 'N/A') : study.studyType || 'N/A'}`, {
                x: 50,
                y: yPosition - imageHeight + 10,
                size: 9,
                font,
                color: darkGray
              });
              
              yPosition -= imageHeight + 10; // Add spacing between images
            }
          } catch (imageError) {
            console.error(`📷 SERVER: ❌ Failed to add image ${imgIndex + 1} to PDF after all attempts:`, imageError.message);
            // Continue with next image if there's an error
          }
        }
      }
      
      // Professional Footer
      const footerY = 60;
      drawSectionBox(30, footerY + 5, width - 60, 40);
      
      page.drawText('CURA MEDICAL CENTER - DEPARTMENT OF RADIOLOGY', {
        x: width / 2 - 120,
        y: footerY - 8,
        size: 10,
        font: boldFont,
        color: primaryBlue
      });
      
      page.drawText('Tel: +44-123-456-7890  |  Email: radiology@curamedical.com  |  Web: www.curamedical.com', {
        x: width / 2 - 140,
        y: footerY - 22,
        size: 8,
        font,
        color: darkGray
      });
      
      // Confidentiality notice
      page.drawText('WARNING: CONFIDENTIAL MEDICAL REPORT - Authorized Personnel Only', {
        x: width / 2 - 130,
        y: 15,
        size: 8,
        font: boldFont,
        color: rgb(0.8, 0, 0)
      });
      
      // Generate PDF bytes
      const pdfBytes = await pdfDoc.save();
      
      // Save PDF to disk
      const outputPath = path.join(reportsDir, `${reportId}.pdf`);
      await fse.outputFile(outputPath, pdfBytes);
      
      console.log(`PDF report generated and saved: ${outputPath}`);
      
      // Save report file information to database
      const reportFileName = `${reportId}.pdf`;
      const reportFilePath = outputPath;
      
      if (req.organizationId && study.id) {
        try {
          await storage.updateMedicalImageReport(study.id, req.tenant!.id, {
            reportFileName,
            reportFilePath,
            findings: reportFormData?.findings || null,
            impression: reportFormData?.impression || null,
            radiologist: reportFormData?.radiologist || null
          });
          console.log(`Report file information saved to database for study ID: ${study.id}`);
        } catch (dbError) {
          console.error("Failed to save report info to database:", dbError);
          // Continue without failing the response since PDF was generated successfully
        }
      }
      
      res.json({
        success: true,
        reportId: reportId,
        fileName: reportFileName,
        filePath: reportFilePath,
        message: "PDF report generated successfully"
      });

    } catch (error) {
      console.error("PDF generation error:", error);
      res.status(500).json({ error: "Failed to generate PDF report" });
    }
  });

  // Share Imaging Study via Email
  app.post("/api/imaging/share-study", authMiddleware, async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const { studyId, recipientEmail, customMessage } = req.body;

      if (!studyId || !recipientEmail) {
        return res.status(400).json({ error: "Study ID and recipient email are required" });
      }

      // Get the study details from the database
      const study = await storage.getMedicalImage(studyId, req.tenant!.id);
      if (!study) {
        return res.status(404).json({ error: "Study not found" });
      }

      // Get patient details for the study
      const patient = await storage.getPatient(study.patientId, req.tenant!.id);
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }

      // Get the user details who is sharing the study
      const sharedBy = req.user.email;
      
      // Create signed report URL if report exists
      let reportUrl = '';
      if (study.reportFileName && study.imageId) {
        const fileSecret = process.env.FILE_SECRET;
        if (!fileSecret) {
          console.error("FILE_SECRET not configured");
          return res.status(500).json({ error: "Server configuration error" });
        }

        // Generate signed token valid for 7 days (for email access)
        const token = jwt.sign(
          {
            fileId: study.id,
            imageId: study.imageId,
            organizationId: study.organizationId,
            patientId: study.patientId,
            userId: req.user.id
          },
          fileSecret,
          { expiresIn: '7d' }
        );

        const baseUrl = process.env.NODE_ENV === 'production' 
          ? `https://${req.get('host')}` 
          : `http://${req.get('host')}`;
        
        // Use signed URL endpoint for email access (no auth required)
        reportUrl = `${baseUrl}/api/imaging-files/view/${study.imageId}?token=${token}`;
        
        console.log('[EMAIL-SHARE] Generated signed URL for imaging report:', study.imageId);
      }

      // Send the email using the email service
      const patientName = `${patient.firstName} ${patient.lastName}`;
      const studyType = study.studyDescription || 'Medical Imaging Study';

      const emailSent = await emailService.sendImagingStudyShare(
        recipientEmail,
        patientName,
        studyType,
        sharedBy,
        customMessage || '',
        reportUrl
      );

      if (emailSent) {
        console.log(`📧 EMAIL: Successfully shared imaging study ${studyId} with ${recipientEmail}`);
        res.json({
          success: true,
          message: `Imaging study shared successfully with ${recipientEmail}`,
          studyId,
          recipientEmail,
          patientName
        });
      } else {
        console.error(`📧 EMAIL: Failed to share imaging study ${studyId} with ${recipientEmail}`);
        res.status(500).json({
          error: "Failed to send email. Please try again or contact support.",
          studyId,
          recipientEmail
        });
      }

    } catch (error) {
      console.error("Share imaging study error:", error);
      res.status(500).json({ error: "Failed to share imaging study" });
    }
  });

  // Check if PDF Report exists
  app.head("/api/imaging/reports/:reportId", authMiddleware, async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const { reportId } = req.params;
      
      // Find the study by imageId to get organizationId and patientId
      const studies = await storage.getMedicalImagesByOrganization(req.tenant!.id);
      const study = studies.find(s => s.imageId === reportId);
      
      if (!study) {
        return res.status(404).send();
      }
      
      const organizationId = study.organizationId;
      const patientId = study.patientId;
      
      // PDF files are stored in uploads/Imaging_Reports/{organizationId}/patients/{patientId}/{imageId}.pdf
      const filePath = path.resolve(
        process.cwd(), 
        'uploads', 
        'Imaging_Reports', 
        String(organizationId), 
        'patients', 
        String(patientId), 
        `${reportId}.pdf`
      );
      
      // Check if file exists
      if (!(await fse.pathExists(filePath))) {
        return res.status(404).send();
      }
      
      res.status(200).send();

    } catch (error) {
      console.error("PDF check error:", error);
      res.status(500).send();
    }
  });

  // Serve PDF Reports (supports both header and query param authentication for iframe compatibility)
  app.get("/api/imaging/reports/:reportId", async (req: TenantRequest, res) => {
    try {
      // Support both Authorization header and query parameter token for iframe compatibility
      let token = req.headers.authorization?.replace('Bearer ', '');
      if (!token && req.query.token) {
        token = req.query.token as string;
      }

      console.log('📄 PDF ROUTE: Token check:', { 
        hasAuthHeader: !!req.headers.authorization, 
        hasQueryToken: !!req.query.token,
        tokenLength: token?.length 
      });

      if (!token) {
        console.log('📄 PDF ROUTE: No token found');
        return res.status(401).json({ error: "Authentication required" });
      }

      // Verify the token using authService
      const payload = authService.verifyToken(token);
      
      if (!payload) {
        console.log('📄 PDF ROUTE: Token verification failed - invalid token');
        return res.status(401).json({ error: "Invalid or expired token" });
      }
      
      req.user = { 
        id: payload.userId, 
        email: payload.email, 
        role: payload.role,
        organizationId: payload.organizationId 
      };
      console.log('📄 PDF ROUTE: Token verified successfully for user:', req.user.email);

      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const { reportId } = req.params;
      
      // Use organizationId from the decoded token if tenant is not set
      const orgId = req.tenant?.id || req.user.organizationId;
      console.log('📄 PDF ROUTE: Using organizationId:', orgId);
      
      // Find the study by imageId to get organizationId and patientId
      const studies = await storage.getMedicalImagesByOrganization(orgId);
      const study = studies.find(s => s.imageId === reportId);
      
      if (!study) {
        return res.status(404).json({ error: "Study not found" });
      }
      
      const organizationId = study.organizationId;
      const patientId = study.patientId;
      
      // PDF files are stored in uploads/Imaging_Reports/{organizationId}/patients/{patientId}/{imageId}.pdf
      const filePath = path.resolve(
        process.cwd(), 
        'uploads', 
        'Imaging_Reports', 
        String(organizationId), 
        'patients', 
        String(patientId), 
        `${reportId}.pdf`
      );
      
      console.log('📄 PDF ROUTE: Serving file from:', filePath);
      
      // Check if file exists
      if (!(await fse.pathExists(filePath))) {
        return res.status(404).json({ error: "Report not found" });
      }
      
      // Generate a meaningful filename for download (reportId is the image/study ID)
      const downloadFilename = `radiology-report-${reportId}.pdf`;
      
      // Check if this is a download request vs view request
      const isDownload = req.query.download === 'true';
      
      // Serve the PDF file
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `${isDownload ? 'attachment' : 'inline'}; filename="${downloadFilename}"`);
      res.sendFile(filePath);

    } catch (error) {
      console.error("PDF serving error:", error);
      res.status(500).json({ error: "Failed to serve PDF report" });
    }
  });

  // Delete PDF Report
  app.delete("/api/imaging/reports/:reportId", authMiddleware, requireRole(["doctor", "nurse", "admin"]), async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const { reportId } = req.params;
      
      // Find the study by imageId to get organizationId and patientId
      console.log(`📝 DELETE: Finding study by imageId: ${reportId}`);
      const studies = await storage.getMedicalImagesByOrganization(req.tenant!.id);
      const study = studies.find(s => s.imageId === reportId);
      
      if (!study) {
        return res.status(404).json({ error: "Study not found" });
      }
      
      const organizationId = study.organizationId;
      const patientId = study.patientId;
      
      // PDF files are stored in uploads/Imaging_Reports/{organizationId}/patients/{patientId}/{imageId}.pdf
      const filename = `${reportId}.pdf`;
      const filePath = path.resolve(
        process.cwd(), 
        'uploads', 
        'Imaging_Reports', 
        String(organizationId), 
        'patients', 
        String(patientId), 
        filename
      );

      // Check if file exists
      if (!(await fse.pathExists(filePath))) {
        return res.status(404).json({ error: "Report file not found" });
      }

      // Delete the file from the filesystem
      await fse.remove(filePath);

      // Clear the reportFileName and reportFilePath from the database
      try {
        if (study && study.id) {
          // Update the database to clear both report fields (use null, not undefined, to actually set DB to NULL)
          console.log(`📝 DELETE: Updating database for studyId: ${study.id}, imageId: ${reportId}, organizationId: ${req.tenant!.id}`);
          await storage.updateMedicalImageReport(
            study.id,
            req.tenant!.id,
            { 
              reportFileName: null as any, 
              reportFilePath: null as any 
            }
          );
          console.log(`📝 DELETE: Database updated - set reportFileName and reportFilePath to NULL for studyId: ${study.id}`);
        }
      } catch (dbError) {
        console.error(`⚠️ DELETE: Database update error:`, dbError);
      }

      console.log(`✅ PDF report deleted successfully: ${filename}`);
      res.json({ 
        success: true, 
        message: "Report deleted successfully",
        reportId: reportId
      });

    } catch (error) {
      console.error("Error deleting PDF report:", error);
      res.status(500).json({ error: "Failed to delete report" });
    }
  });

  // Update Individual Report Field
  app.patch("/api/imaging/studies/:studyId/report-field", authMiddleware, requireRole(["doctor", "nurse"]), async (req: TenantRequest, res) => {
    try {
      if (!req.user || !req.organizationId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const { studyId } = req.params;
      const { fieldName, value } = req.body;

      // Validate request body
      const validation = updateMedicalImageReportFieldSchema.safeParse({ fieldName, value });
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid field data", details: validation.error.issues });
      }

      // Update the specific field
      const updatedStudy = await storage.updateMedicalImageReportField(
        parseInt(studyId),
        req.organizationId,
        fieldName,
        value
      );

      if (!updatedStudy) {
        return res.status(404).json({ error: "Study not found" });
      }

      res.json({
        success: true,
        studyId: updatedStudy.id,
        updated: {
          [fieldName]: value
        }
      });

    } catch (error) {
      console.error("Error updating report field:", error);
      res.status(500).json({ error: "Failed to update report field" });
    }
  });

  // ========================================
  // QuickBooks Integration API Routes
  // ========================================

  // Get all QuickBooks connections for organization
  app.get("/api/quickbooks/connections", authMiddleware, requireNonPatientRole(), multiTenantEnforcer(), async (req: TenantRequest, res) => {
    try {
      const organizationId = requireOrgId(req);
      const connections = await storage.getQuickBooksConnections(organizationId);
      res.json(connections);
    } catch (error) {
      console.error("Error fetching QuickBooks connections:", error);
      res.status(500).json({ error: "Failed to fetch connections" });
    }
  });

  // Get active QuickBooks connection
  app.get("/api/quickbooks/connection/active", authMiddleware, requireNonPatientRole(), multiTenantEnforcer(), async (req: TenantRequest, res) => {
    try {
      const organizationId = requireOrgId(req);
      const connection = await storage.getActiveQuickBooksConnection(organizationId);
      if (!connection) {
        return res.status(404).json({ error: "No active QuickBooks connection found" });
      }
      res.json(connection);
    } catch (error) {
      console.error("Error fetching active QuickBooks connection:", error);
      res.status(500).json({ error: "Failed to fetch active connection" });
    }
  });

  // Create QuickBooks connection (OAuth callback handler)
  app.post("/api/quickbooks/connections", authMiddleware, requireNonPatientRole(), multiTenantEnforcer(), async (req: TenantRequest, res) => {
    try {
      const organizationId = requireOrgId(req);
      
      const connectionSchema = z.object({
        companyId: z.string(),
        companyName: z.string(),
        accessToken: z.string(),
        refreshToken: z.string(),
        tokenExpiry: z.string().transform((val) => new Date(val)),
        realmId: z.string(),
        baseUrl: z.string(),
        syncSettings: z.object({
          autoSync: z.boolean().optional(),
          syncIntervalHours: z.number().optional(),
          syncCustomers: z.boolean().optional(),
          syncInvoices: z.boolean().optional(),
          syncPayments: z.boolean().optional(),
          syncItems: z.boolean().optional(),
          syncAccounts: z.boolean().optional(),
        }).optional(),
      });

      const validatedData = connectionSchema.parse(req.body);
      
      // Deactivate existing connections
      const existingConnections = await storage.getQuickBooksConnections(organizationId);
      for (const existing of existingConnections) {
        if (existing.isActive) {
          await storage.updateQuickBooksConnection(existing.id, organizationId, { isActive: false });
        }
      }

      const connection = await storage.createQuickBooksConnection({
        ...validatedData,
        organizationId,
        isActive: true,
      });

      res.status(201).json(connection);
    } catch (error) {
      console.error("Error creating QuickBooks connection:", error);
      res.status(500).json({ error: "Failed to create connection" });
    }
  });

  // Update QuickBooks connection
  app.patch("/api/quickbooks/connections/:id", authMiddleware, requireNonPatientRole(), multiTenantEnforcer(), async (req: TenantRequest, res) => {
    try {
      const organizationId = requireOrgId(req);
      const connectionId = parseInt(req.params.id);

      const updateSchema = z.object({
        accessToken: z.string().optional(),
        refreshToken: z.string().optional(),
        tokenExpiry: z.string().transform((val) => new Date(val)).optional(),
        isActive: z.boolean().optional(),
        syncSettings: z.object({
          autoSync: z.boolean().optional(),
          syncIntervalHours: z.number().optional(),
          syncCustomers: z.boolean().optional(),
          syncInvoices: z.boolean().optional(),
          syncPayments: z.boolean().optional(),
          syncItems: z.boolean().optional(),
          syncAccounts: z.boolean().optional(),
        }).optional(),
      });

      const validatedData = updateSchema.parse(req.body);
      const updatedConnection = await storage.updateQuickBooksConnection(connectionId, organizationId, validatedData);

      if (!updatedConnection) {
        return res.status(404).json({ error: "Connection not found" });
      }

      res.json(updatedConnection);
    } catch (error) {
      console.error("Error updating QuickBooks connection:", error);
      res.status(500).json({ error: "Failed to update connection" });
    }
  });

  // Delete QuickBooks connection
  app.delete("/api/quickbooks/connections/:id", authMiddleware, requireNonPatientRole(), multiTenantEnforcer(), async (req: TenantRequest, res) => {
    try {
      const organizationId = requireOrgId(req);
      const connectionId = parseInt(req.params.id);

      const success = await storage.deleteQuickBooksConnection(connectionId, organizationId);
      if (!success) {
        return res.status(404).json({ error: "Connection not found" });
      }

      res.json({ message: "Connection deleted successfully" });
    } catch (error) {
      console.error("Error deleting QuickBooks connection:", error);
      res.status(500).json({ error: "Failed to delete connection" });
    }
  });

  // Get QuickBooks sync logs
  app.get("/api/quickbooks/sync-logs", authMiddleware, requireNonPatientRole(), multiTenantEnforcer(), async (req: TenantRequest, res) => {
    try {
      const organizationId = requireOrgId(req);
      const connectionId = req.query.connectionId ? parseInt(req.query.connectionId as string) : undefined;
      const syncType = req.query.syncType as string | undefined;

      const logs = await storage.getQuickBooksSyncLogs(organizationId, connectionId, syncType);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching QuickBooks sync logs:", error);
      res.status(500).json({ error: "Failed to fetch sync logs" });
    }
  });

  // Create QuickBooks sync log
  app.post("/api/quickbooks/sync-logs", authMiddleware, requireNonPatientRole(), multiTenantEnforcer(), async (req: TenantRequest, res) => {
    try {
      const organizationId = requireOrgId(req);

      const logSchema = z.object({
        connectionId: z.number(),
        syncType: z.string(),
        operation: z.string(),
        status: z.string().default("pending"),
        recordsProcessed: z.number().default(0),
        recordsSuccessful: z.number().default(0),
        recordsFailed: z.number().default(0),
        startTime: z.string().transform((val) => new Date(val)),
        endTime: z.string().transform((val) => new Date(val)).optional(),
        errorMessage: z.string().optional(),
        errorDetails: z.any().optional(),
        metadata: z.any().optional(),
      });

      const validatedData = logSchema.parse(req.body);
      const log = await storage.createQuickBooksSyncLog({
        ...validatedData,
        organizationId,
      });

      res.status(201).json(log);
    } catch (error) {
      console.error("Error creating QuickBooks sync log:", error);
      res.status(500).json({ error: "Failed to create sync log" });
    }
  });

  // Update QuickBooks sync log
  app.patch("/api/quickbooks/sync-logs/:id", authMiddleware, requireNonPatientRole(), multiTenantEnforcer(), async (req: TenantRequest, res) => {
    try {
      const logId = parseInt(req.params.id);

      const updateSchema = z.object({
        status: z.string().optional(),
        recordsProcessed: z.number().optional(),
        recordsSuccessful: z.number().optional(),
        recordsFailed: z.number().optional(),
        endTime: z.string().transform((val) => new Date(val)).optional(),
        errorMessage: z.string().optional(),
        errorDetails: z.any().optional(),
        metadata: z.any().optional(),
      });

      const validatedData = updateSchema.parse(req.body);
      const updatedLog = await storage.updateQuickBooksSyncLog(logId, validatedData);

      if (!updatedLog) {
        return res.status(404).json({ error: "Sync log not found" });
      }

      res.json(updatedLog);
    } catch (error) {
      console.error("Error updating QuickBooks sync log:", error);
      res.status(500).json({ error: "Failed to update sync log" });
    }
  });

  // Get QuickBooks customer mappings
  app.get("/api/quickbooks/customer-mappings", authMiddleware, requireNonPatientRole(), multiTenantEnforcer(), async (req: TenantRequest, res) => {
    try {
      const organizationId = requireOrgId(req);
      const connectionId = req.query.connectionId ? parseInt(req.query.connectionId as string) : undefined;

      const mappings = await storage.getQuickBooksCustomerMappings(organizationId, connectionId);
      res.json(mappings);
    } catch (error) {
      console.error("Error fetching QuickBooks customer mappings:", error);
      res.status(500).json({ error: "Failed to fetch customer mappings" });
    }
  });

  // Create QuickBooks customer mapping
  app.post("/api/quickbooks/customer-mappings", authMiddleware, requireNonPatientRole(), multiTenantEnforcer(), async (req: TenantRequest, res) => {
    try {
      const organizationId = requireOrgId(req);

      const mappingSchema = z.object({
        connectionId: z.number(),
        patientId: z.number(),
        quickbooksCustomerId: z.string(),
        quickbooksDisplayName: z.string().optional(),
        syncStatus: z.string().default("synced"),
        lastSyncAt: z.string().transform((val) => new Date(val)).optional(),
        errorMessage: z.string().optional(),
        metadata: z.any().optional(),
      });

      const validatedData = mappingSchema.parse(req.body);
      const mapping = await storage.createQuickBooksCustomerMapping({
        ...validatedData,
        organizationId,
      });

      res.status(201).json(mapping);
    } catch (error) {
      console.error("Error creating QuickBooks customer mapping:", error);
      res.status(500).json({ error: "Failed to create customer mapping" });
    }
  });

  // Get QuickBooks invoice mappings
  app.get("/api/quickbooks/invoice-mappings", authMiddleware, requireNonPatientRole(), multiTenantEnforcer(), async (req: TenantRequest, res) => {
    try {
      const organizationId = requireOrgId(req);
      const connectionId = req.query.connectionId ? parseInt(req.query.connectionId as string) : undefined;

      const mappings = await storage.getQuickBooksInvoiceMappings(organizationId, connectionId);
      res.json(mappings);
    } catch (error) {
      console.error("Error fetching QuickBooks invoice mappings:", error);
      res.status(500).json({ error: "Failed to fetch invoice mappings" });
    }
  });

  // Create QuickBooks invoice mapping
  app.post("/api/quickbooks/invoice-mappings", authMiddleware, requireNonPatientRole(), multiTenantEnforcer(), async (req: TenantRequest, res) => {
    try {
      const organizationId = requireOrgId(req);

      const mappingSchema = z.object({
        connectionId: z.number(),
        emrInvoiceId: z.string(),
        quickbooksInvoiceId: z.string(),
        quickbooksInvoiceNumber: z.string().optional(),
        patientId: z.number(),
        customerId: z.number().optional(),
        amount: z.string(),
        status: z.string(),
        syncStatus: z.string().default("synced"),
        lastSyncAt: z.string().transform((val) => new Date(val)).optional(),
        errorMessage: z.string().optional(),
        metadata: z.any().optional(),
      });

      const validatedData = mappingSchema.parse(req.body);
      const mapping = await storage.createQuickBooksInvoiceMapping({
        ...validatedData,
        organizationId,
      });

      res.status(201).json(mapping);
    } catch (error) {
      console.error("Error creating QuickBooks invoice mapping:", error);
      res.status(500).json({ error: "Failed to create invoice mapping" });
    }
  });

  // Get QuickBooks payment mappings
  app.get("/api/quickbooks/payment-mappings", authMiddleware, requireNonPatientRole(), multiTenantEnforcer(), async (req: TenantRequest, res) => {
    try {
      const organizationId = requireOrgId(req);
      const connectionId = req.query.connectionId ? parseInt(req.query.connectionId as string) : undefined;

      const mappings = await storage.getQuickBooksPaymentMappings(organizationId, connectionId);
      res.json(mappings);
    } catch (error) {
      console.error("Error fetching QuickBooks payment mappings:", error);
      res.status(500).json({ error: "Failed to fetch payment mappings" });
    }
  });

  // Create QuickBooks payment mapping
  app.post("/api/quickbooks/payment-mappings", authMiddleware, requireNonPatientRole(), multiTenantEnforcer(), async (req: TenantRequest, res) => {
    try {
      const organizationId = requireOrgId(req);

      const mappingSchema = z.object({
        connectionId: z.number(),
        emrPaymentId: z.string(),
        quickbooksPaymentId: z.string(),
        invoiceMappingId: z.number().optional(),
        amount: z.string(),
        paymentMethod: z.string(),
        paymentDate: z.string().transform((val) => new Date(val)),
        syncStatus: z.string().default("synced"),
        lastSyncAt: z.string().transform((val) => new Date(val)).optional(),
        errorMessage: z.string().optional(),
        metadata: z.any().optional(),
      });

      const validatedData = mappingSchema.parse(req.body);
      const mapping = await storage.createQuickBooksPaymentMapping({
        ...validatedData,
        organizationId,
      });

      res.status(201).json(mapping);
    } catch (error) {
      console.error("Error creating QuickBooks payment mapping:", error);
      res.status(500).json({ error: "Failed to create payment mapping" });
    }
  });

  // Get QuickBooks account mappings
  app.get("/api/quickbooks/account-mappings", authMiddleware, requireNonPatientRole(), multiTenantEnforcer(), async (req: TenantRequest, res) => {
    try {
      const organizationId = requireOrgId(req);
      const connectionId = req.query.connectionId ? parseInt(req.query.connectionId as string) : undefined;

      const mappings = await storage.getQuickBooksAccountMappings(organizationId, connectionId);
      res.json(mappings);
    } catch (error) {
      console.error("Error fetching QuickBooks account mappings:", error);
      res.status(500).json({ error: "Failed to fetch account mappings" });
    }
  });

  // Create QuickBooks account mapping
  app.post("/api/quickbooks/account-mappings", authMiddleware, requireNonPatientRole(), multiTenantEnforcer(), async (req: TenantRequest, res) => {
    try {
      const organizationId = requireOrgId(req);

      const mappingSchema = z.object({
        connectionId: z.number(),
        emrAccountType: z.string(),
        emrAccountName: z.string(),
        quickbooksAccountId: z.string(),
        quickbooksAccountName: z.string(),
        accountType: z.string(),
        accountSubType: z.string().optional(),
        isActive: z.boolean().default(true),
        syncStatus: z.string().default("synced"),
        lastSyncAt: z.string().transform((val) => new Date(val)).optional(),
        errorMessage: z.string().optional(),
        metadata: z.any().optional(),
      });

      const validatedData = mappingSchema.parse(req.body);
      const mapping = await storage.createQuickBooksAccountMapping({
        ...validatedData,
        organizationId,
      });

      res.status(201).json(mapping);
    } catch (error) {
      console.error("Error creating QuickBooks account mapping:", error);
      res.status(500).json({ error: "Failed to create account mapping" });
    }
  });

  // Get QuickBooks item mappings
  app.get("/api/quickbooks/item-mappings", authMiddleware, requireNonPatientRole(), multiTenantEnforcer(), async (req: TenantRequest, res) => {
    try {
      const organizationId = requireOrgId(req);
      const connectionId = req.query.connectionId ? parseInt(req.query.connectionId as string) : undefined;

      const mappings = await storage.getQuickBooksItemMappings(organizationId, connectionId);
      res.json(mappings);
    } catch (error) {
      console.error("Error fetching QuickBooks item mappings:", error);
      res.status(500).json({ error: "Failed to fetch item mappings" });
    }
  });

  // Create QuickBooks item mapping
  app.post("/api/quickbooks/item-mappings", authMiddleware, requireNonPatientRole(), multiTenantEnforcer(), async (req: TenantRequest, res) => {
    try {
      const organizationId = requireOrgId(req);

      const mappingSchema = z.object({
        connectionId: z.number(),
        emrItemType: z.string(),
        emrItemId: z.string(),
        emrItemName: z.string(),
        quickbooksItemId: z.string(),
        quickbooksItemName: z.string(),
        itemType: z.string(),
        unitPrice: z.string().optional(),
        description: z.string().optional(),
        incomeAccountId: z.string().optional(),
        expenseAccountId: z.string().optional(),
        isActive: z.boolean().default(true),
        syncStatus: z.string().default("synced"),
        lastSyncAt: z.string().transform((val) => new Date(val)).optional(),
        errorMessage: z.string().optional(),
        metadata: z.any().optional(),
      });

      const validatedData = mappingSchema.parse(req.body);
      const mapping = await storage.createQuickBooksItemMapping({
        ...validatedData,
        organizationId,
      });

      res.status(201).json(mapping);
    } catch (error) {
      console.error("Error creating QuickBooks item mapping:", error);
      res.status(500).json({ error: "Failed to create item mapping" });
    }
  });

  // Get QuickBooks sync configurations
  app.get("/api/quickbooks/sync-configs", authMiddleware, requireNonPatientRole(), multiTenantEnforcer(), async (req: TenantRequest, res) => {
    try {
      const organizationId = requireOrgId(req);
      const connectionId = req.query.connectionId ? parseInt(req.query.connectionId as string) : undefined;

      const configs = await storage.getQuickBooksSyncConfigs(organizationId, connectionId);
      res.json(configs);
    } catch (error) {
      console.error("Error fetching QuickBooks sync configurations:", error);
      res.status(500).json({ error: "Failed to fetch sync configurations" });
    }
  });

  // Create QuickBooks sync configuration
  app.post("/api/quickbooks/sync-configs", authMiddleware, requireNonPatientRole(), multiTenantEnforcer(), async (req: TenantRequest, res) => {
    try {
      const organizationId = requireOrgId(req);
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const configSchema = z.object({
        connectionId: z.number(),
        configType: z.string(),
        configName: z.string(),
        configValue: z.any(),
        isActive: z.boolean().default(true),
        description: z.string().optional(),
      });

      const validatedData = configSchema.parse(req.body);
      const config = await storage.createQuickBooksSyncConfig({
        ...validatedData,
        organizationId,
        createdBy: userId,
      });

      res.status(201).json(config);
    } catch (error) {
      console.error("Error creating QuickBooks sync configuration:", error);
      res.status(500).json({ error: "Failed to create sync configuration" });
    }
  });

  // Manual sync trigger endpoints
  app.post("/api/quickbooks/sync/customers", authMiddleware, requireNonPatientRole(), multiTenantEnforcer(), async (req: TenantRequest, res) => {
    try {
      const organizationId = requireOrgId(req);
      const connection = await storage.getActiveQuickBooksConnection(organizationId);
      
      if (!connection) {
        return res.status(400).json({ error: "No active QuickBooks connection found" });
      }

      // Create sync log entry
      const syncLog = await storage.createQuickBooksSyncLog({
        organizationId,
        connectionId: connection.id,
        syncType: "customers",
        operation: "sync",
        status: "pending",
        startTime: new Date(),
        recordsProcessed: 0,
        recordsSuccessful: 0,
        recordsFailed: 0,
      });

      // In a real implementation, this would trigger actual QuickBooks API calls
      // For now, we'll just update the log as successful
      await storage.updateQuickBooksSyncLog(syncLog.id, {
        status: "success",
        endTime: new Date(),
        recordsProcessed: 0,
        recordsSuccessful: 0,
        recordsFailed: 0,
      });

      res.json({ message: "Customer sync initiated", syncLogId: syncLog.id });
    } catch (error) {
      console.error("Error initiating customer sync:", error);
      res.status(500).json({ error: "Failed to initiate customer sync" });
    }
  });

  app.post("/api/quickbooks/sync/invoices", authMiddleware, requireNonPatientRole(), multiTenantEnforcer(), async (req: TenantRequest, res) => {
    try {
      const organizationId = requireOrgId(req);
      const connection = await storage.getActiveQuickBooksConnection(organizationId);
      
      if (!connection) {
        return res.status(400).json({ error: "No active QuickBooks connection found" });
      }

      // Create sync log entry
      const syncLog = await storage.createQuickBooksSyncLog({
        organizationId,
        connectionId: connection.id,
        syncType: "invoices",
        operation: "sync",
        status: "pending",
        startTime: new Date(),
        recordsProcessed: 0,
        recordsSuccessful: 0,
        recordsFailed: 0,
      });

      // In a real implementation, this would trigger actual QuickBooks API calls
      await storage.updateQuickBooksSyncLog(syncLog.id, {
        status: "success",
        endTime: new Date(),
        recordsProcessed: 0,
        recordsSuccessful: 0,
        recordsFailed: 0,
      });

      res.json({ message: "Invoice sync initiated", syncLogId: syncLog.id });
    } catch (error) {
      console.error("Error initiating invoice sync:", error);
      res.status(500).json({ error: "Failed to initiate invoice sync" });
    }
  });

  app.post("/api/quickbooks/sync/payments", authMiddleware, requireNonPatientRole(), multiTenantEnforcer(), async (req: TenantRequest, res) => {
    try {
      const organizationId = requireOrgId(req);
      const connection = await storage.getActiveQuickBooksConnection(organizationId);
      
      if (!connection) {
        return res.status(400).json({ error: "No active QuickBooks connection found" });
      }

      // Create sync log entry
      const syncLog = await storage.createQuickBooksSyncLog({
        organizationId,
        connectionId: connection.id,
        syncType: "payments",
        operation: "sync",
        status: "pending",
        startTime: new Date(),
        recordsProcessed: 0,
        recordsSuccessful: 0,
        recordsFailed: 0,
      });

      // In a real implementation, this would trigger actual QuickBooks API calls
      await storage.updateQuickBooksSyncLog(syncLog.id, {
        status: "success",
        endTime: new Date(),
        recordsProcessed: 0,
        recordsSuccessful: 0,
        recordsFailed: 0,
      });

      res.json({ message: "Payment sync initiated", syncLogId: syncLog.id });
    } catch (error) {
      console.error("Error initiating payment sync:", error);
      res.status(500).json({ error: "Failed to initiate payment sync" });
    }
  });

  // QuickBooks OAuth authentication endpoints
  app.get("/api/quickbooks/auth/url", authMiddleware, requireNonPatientRole(), multiTenantEnforcer(), async (req: TenantRequest, res) => {
    try {
      console.log("[QUICKBOOKS] OAuth URL endpoint reached!");
      const clientId = process.env.QUICKBOOKS_CLIENT_ID;
      console.log("[QUICKBOOKS] Client ID exists:", !!clientId);
      const redirectUri = process.env.QB_REDIRECT_URI || `${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'http://localhost:5000'}/api/quickbooks/auth/callback`;
      console.log("[QUICKBOOKS] Redirect URI:", redirectUri);
      
      if (!clientId) {
        console.log("[QUICKBOOKS] ERROR: Client ID is missing!");
        return res.status(500).json({ error: "QuickBooks Client ID not configured" });
      }
      
      const oauthUrl = `https://appcenter.intuit.com/connect/oauth2?client_id=${clientId}&scope=com.intuit.quickbooks.accounting&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=security_token&access_type=offline`;
      console.log("[QUICKBOOKS] Generated OAuth URL, sending response...");
      res.json({ url: oauthUrl });
      console.log("[QUICKBOOKS] Response sent successfully");
    } catch (error) {
      console.error("[QUICKBOOKS] Error generating OAuth URL:", error);
      res.status(500).json({ error: "Failed to generate OAuth URL" });
    }
  });

  // QuickBooks Data Fetching Endpoints
  // Helper function to get QuickBooks client instance
  const getQuickBooksClient = async (organizationId: number) => {
    // @ts-ignore - node-quickbooks doesn't have type definitions
    const QuickBooks = (await import('node-quickbooks')).default;
    
    // Get active connection for organization
    const [connection] = await db.select()
      .from(quickbooksConnections)
      .where(and(
        eq(quickbooksConnections.organizationId, organizationId),
        eq(quickbooksConnections.isActive, true)
      ))
      .limit(1);

    if (!connection) {
      throw new Error('No active QuickBooks connection found');
    }

    // Initialize QuickBooks client with connection credentials
    const qbo = new QuickBooks(
      process.env.QUICKBOOKS_CLIENT_ID!,
      process.env.QUICKBOOKS_CLIENT_SECRET!,
      connection.accessToken, // Access token from database
      false, // Not using OAuth1.0a
      connection.realmId, // Company ID
      true, // Enable sandbox mode (change to false for production)
      null, // minorversion
      '2.0', // oauthversion
      connection.refreshToken // Refresh token from database
    );

    return qbo;
  };

  // Fetch QuickBooks Company Info
  app.get("/api/quickbooks/data/company-info", authMiddleware, requireNonPatientRole(), multiTenantEnforcer(), async (req: TenantRequest, res) => {
    try {
      const organizationId = req.tenant!.id;
      const qbo = await getQuickBooksClient(organizationId);

      qbo.findCompanyInfos((err: any, data: any) => {
        if (err) {
          console.error("Error fetching QuickBooks company info:", err);
          return res.status(500).json({ error: "Failed to fetch company info" });
        }
        const companyInfo = data.QueryResponse.CompanyInfo[0];
        res.json(companyInfo);
      });
    } catch (error: any) {
      console.error("Error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch company info" });
    }
  });

  // Fetch QuickBooks Invoices
  app.get("/api/quickbooks/data/invoices", authMiddleware, requireNonPatientRole(), multiTenantEnforcer(), async (req: TenantRequest, res) => {
    try {
      const organizationId = req.tenant!.id;
      const qbo = await getQuickBooksClient(organizationId);

      qbo.findInvoices((err: any, data: any) => {
        if (err) {
          console.error("Error fetching QuickBooks invoices:", err);
          return res.status(500).json({ error: "Failed to fetch invoices" });
        }
        const invoices = data.QueryResponse.Invoice || [];
        res.json(invoices);
      });
    } catch (error: any) {
      console.error("Error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch invoices" });
    }
  });

  // Fetch QuickBooks Profit & Loss Report
  app.get("/api/quickbooks/data/profit-loss", authMiddleware, requireNonPatientRole(), multiTenantEnforcer(), async (req: TenantRequest, res) => {
    try {
      const organizationId = req.tenant!.id;
      const qbo = await getQuickBooksClient(organizationId);

      const { startDate, endDate } = req.query;
      const options = {
        start_date: startDate as string || '2024-01-01',
        end_date: endDate as string || '2024-12-31',
        accounting_method: 'Accrual'
      };

      qbo.reportProfitAndLoss(options, (err: any, data: any) => {
        if (err) {
          console.error("Error fetching P&L report:", err);
          return res.status(500).json({ error: "Failed to fetch P&L report" });
        }
        res.json(data);
      });
    } catch (error: any) {
      console.error("Error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch P&L report" });
    }
  });

  // Fetch QuickBooks Expenses/Purchases
  app.get("/api/quickbooks/data/expenses", authMiddleware, requireNonPatientRole(), multiTenantEnforcer(), async (req: TenantRequest, res) => {
    try {
      const organizationId = req.tenant!.id;
      const qbo = await getQuickBooksClient(organizationId);

      qbo.findPurchases((err: any, data: any) => {
        if (err) {
          console.error("Error fetching QuickBooks expenses:", err);
          return res.status(500).json({ error: "Failed to fetch expenses" });
        }
        const expenses = data.QueryResponse.Purchase || [];
        res.json(expenses);
      });
    } catch (error: any) {
      console.error("Error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch expenses" });
    }
  });

  // Fetch QuickBooks Accounts
  app.get("/api/quickbooks/data/accounts", authMiddleware, requireNonPatientRole(), multiTenantEnforcer(), async (req: TenantRequest, res) => {
    try {
      const organizationId = req.tenant!.id;
      const qbo = await getQuickBooksClient(organizationId);

      qbo.findAccounts((err: any, data: any) => {
        if (err) {
          console.error("Error fetching QuickBooks accounts:", err);
          return res.status(500).json({ error: "Failed to fetch accounts" });
        }
        const accounts = data.QueryResponse.Account || [];
        res.json(accounts);
      });
    } catch (error: any) {
      console.error("Error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch accounts" });
    }
  });

  // Fetch QuickBooks Customers
  app.get("/api/quickbooks/data/customers", authMiddleware, requireNonPatientRole(), multiTenantEnforcer(), async (req: TenantRequest, res) => {
    try {
      const organizationId = req.tenant!.id;
      const qbo = await getQuickBooksClient(organizationId);

      qbo.findCustomers((err: any, data: any) => {
        if (err) {
          console.error("Error fetching QuickBooks customers:", err);
          return res.status(500).json({ error: "Failed to fetch customers" });
        }
        const customers = data.QueryResponse.Customer || [];
        res.json(customers);
      });
    } catch (error: any) {
      console.error("Error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch customers" });
    }
  });


  // Symptom Checker Endpoints
  app.post('/api/symptom-checker/analyze', authMiddleware, multiTenantEnforcer(), async (req: TenantRequest, res) => {
    try {
      const { symptoms, symptomDescription, duration, severity, patientId } = req.body;
      
      if (!symptoms || symptoms.length === 0 || !symptomDescription) {
        return res.status(400).json({ error: "Symptoms and description are required" });
      }

      const organizationId = req.tenant!.id;
      const userId = req.user!.id;

      // Look up patient record for this user (if they have one)
      let finalPatientId = patientId || null;
      if (!finalPatientId) {
        const [patientRecord] = await db.select()
          .from(patients)
          .where(and(
            eq(patients.userId, userId),
            eq(patients.organizationId, organizationId)
          ))
          .limit(1);
        
        if (patientRecord) {
          finalPatientId = patientRecord.id;
        }
      }

      // Use AI service to analyze symptoms and provide diagnosis
      const aiAnalysis = await aiService.analyzeSymptoms({
        symptoms,
        symptomDescription,
        duration,
        severity
      });

      // Save symptom check to database
      const [symptomCheck] = await db.insert(symptomChecks).values({
        organizationId,
        patientId: finalPatientId,
        userId,
        symptoms,
        symptomDescription,
        duration: duration || null,
        severity: severity || null,
        aiAnalysis,
        status: 'completed'
      }).returning();

      res.json({
        success: true,
        symptomCheck,
        analysis: aiAnalysis
      });
    } catch (error) {
      console.error("Error analyzing symptoms:", error);
      res.status(500).json({ error: "Failed to analyze symptoms" });
    }
  });

  app.get('/api/symptom-checker/history', authMiddleware, multiTenantEnforcer(), async (req: TenantRequest, res) => {
    try {
      const organizationId = req.tenant!.id;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      // Patients see only their own history, others see all
      let history;
      if (userRole === 'patient') {
        history = await db.select({
          id: symptomChecks.id,
          organizationId: symptomChecks.organizationId,
          patientId: symptomChecks.patientId,
          userId: symptomChecks.userId,
          symptoms: symptomChecks.symptoms,
          symptomDescription: symptomChecks.symptomDescription,
          duration: symptomChecks.duration,
          severity: symptomChecks.severity,
          aiAnalysis: symptomChecks.aiAnalysis,
          status: symptomChecks.status,
          createdAt: symptomChecks.createdAt,
          updatedAt: symptomChecks.updatedAt,
          patient: {
            id: patients.id,
            patientId: patients.patientId,
            firstName: patients.firstName,
            lastName: patients.lastName,
            dateOfBirth: patients.dateOfBirth,
            phone: patients.phone,
            email: patients.email
          }
        })
          .from(symptomChecks)
          .leftJoin(patients, eq(symptomChecks.patientId, patients.id))
          .where(and(
            eq(symptomChecks.organizationId, organizationId),
            eq(symptomChecks.patientId, userId)
          ))
          .orderBy(desc(symptomChecks.createdAt));
      } else {
        history = await db.select({
          id: symptomChecks.id,
          organizationId: symptomChecks.organizationId,
          patientId: symptomChecks.patientId,
          userId: symptomChecks.userId,
          symptoms: symptomChecks.symptoms,
          symptomDescription: symptomChecks.symptomDescription,
          duration: symptomChecks.duration,
          severity: symptomChecks.severity,
          aiAnalysis: symptomChecks.aiAnalysis,
          status: symptomChecks.status,
          createdAt: symptomChecks.createdAt,
          updatedAt: symptomChecks.updatedAt,
          patient: {
            id: patients.id,
            patientId: patients.patientId,
            firstName: patients.firstName,
            lastName: patients.lastName,
            dateOfBirth: patients.dateOfBirth,
            phone: patients.phone,
            email: patients.email
          }
        })
          .from(symptomChecks)
          .leftJoin(patients, eq(symptomChecks.patientId, patients.id))
          .where(eq(symptomChecks.organizationId, organizationId))
          .orderBy(desc(symptomChecks.createdAt));
      }

      res.json(history);
    } catch (error) {
      console.error("Error fetching symptom check history:", error);
      res.status(500).json({ error: "Failed to fetch history" });
    }
  });

  // ========================================
  // Pricing Management API Routes
  // ========================================

  // Doctors Fee Routes
  app.get("/api/pricing/doctors-fees", authMiddleware, requireRole('admin'), multiTenantEnforcer(), async (req: TenantRequest, res) => {
    try {
      const organizationId = requireOrgId(req);
      const fees = await storage.getDoctorsFees(organizationId);
      res.json(fees);
    } catch (error) {
      handleRouteError(error, "fetch doctors fees", res);
    }
  });

  app.get("/api/pricing/doctors-fees/:id", authMiddleware, requireRole('admin'), multiTenantEnforcer(), async (req: TenantRequest, res) => {
    try {
      const organizationId = requireOrgId(req);
      const fee = await storage.getDoctorsFee(parseInt(req.params.id), organizationId);
      if (!fee) {
        return res.status(404).json({ error: "Doctors fee not found" });
      }
      res.json(fee);
    } catch (error) {
      handleRouteError(error, "fetch doctors fee", res);
    }
  });

  app.post("/api/pricing/doctors-fees", authMiddleware, requireRole('admin'), multiTenantEnforcer(), async (req: TenantRequest, res) => {
    try {
      const organizationId = requireOrgId(req);
      const payload = enforceCreatedBy(req, {
        ...req.body,
        organizationId
      }, 'createdBy');
      
      const fee = await storage.createDoctorsFee(payload);
      res.status(201).json(fee);
    } catch (error) {
      handleRouteError(error, "create doctors fee", res);
    }
  });

  app.patch("/api/pricing/doctors-fees/:id", authMiddleware, requireRole('admin'), multiTenantEnforcer(), async (req: TenantRequest, res) => {
    try {
      const organizationId = requireOrgId(req);
      const updated = await storage.updateDoctorsFee(parseInt(req.params.id), organizationId, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Doctors fee not found" });
      }
      res.json(updated);
    } catch (error) {
      handleRouteError(error, "update doctors fee", res);
    }
  });

  app.delete("/api/pricing/doctors-fees/:id", authMiddleware, requireRole('admin'), multiTenantEnforcer(), async (req: TenantRequest, res) => {
    try {
      const organizationId = requireOrgId(req);
      const success = await storage.deleteDoctorsFee(parseInt(req.params.id), organizationId);
      if (!success) {
        return res.status(404).json({ error: "Doctors fee not found" });
      }
      res.json({ message: "Doctors fee deleted successfully" });
    } catch (error) {
      handleRouteError(error, "delete doctors fee", res);
    }
  });

  // Lab Test Pricing Routes
  app.get("/api/pricing/lab-tests", authMiddleware, requireRole('admin'), multiTenantEnforcer(), async (req: TenantRequest, res) => {
    try {
      const organizationId = requireOrgId(req);
      const pricing = await storage.getLabTestPricing(organizationId);
      res.json(pricing);
    } catch (error) {
      handleRouteError(error, "fetch lab test pricing", res);
    }
  });

  app.get("/api/pricing/lab-tests/:id", authMiddleware, requireRole('admin'), multiTenantEnforcer(), async (req: TenantRequest, res) => {
    try {
      const organizationId = requireOrgId(req);
      const pricing = await storage.getLabTestPricingById(parseInt(req.params.id), organizationId);
      if (!pricing) {
        return res.status(404).json({ error: "Lab test pricing not found" });
      }
      res.json(pricing);
    } catch (error) {
      handleRouteError(error, "fetch lab test pricing", res);
    }
  });

  app.post("/api/pricing/lab-tests", authMiddleware, requireRole('admin'), multiTenantEnforcer(), async (req: TenantRequest, res) => {
    try {
      const organizationId = requireOrgId(req);
      const payload = enforceCreatedBy(req, {
        ...req.body,
        organizationId
      }, 'createdBy');
      
      const pricing = await storage.createLabTestPricing(payload);
      res.status(201).json(pricing);
    } catch (error) {
      handleRouteError(error, "create lab test pricing", res);
    }
  });

  app.patch("/api/pricing/lab-tests/:id", authMiddleware, requireRole('admin'), multiTenantEnforcer(), async (req: TenantRequest, res) => {
    try {
      const organizationId = requireOrgId(req);
      const updated = await storage.updateLabTestPricing(parseInt(req.params.id), organizationId, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Lab test pricing not found" });
      }
      res.json(updated);
    } catch (error) {
      handleRouteError(error, "update lab test pricing", res);
    }
  });

  app.delete("/api/pricing/lab-tests/:id", authMiddleware, requireRole('admin'), multiTenantEnforcer(), async (req: TenantRequest, res) => {
    try {
      const organizationId = requireOrgId(req);
      const success = await storage.deleteLabTestPricing(parseInt(req.params.id), organizationId);
      if (!success) {
        return res.status(404).json({ error: "Lab test pricing not found" });
      }
      res.json({ message: "Lab test pricing deleted successfully" });
    } catch (error) {
      handleRouteError(error, "delete lab test pricing", res);
    }
  });

  // Imaging Pricing Routes
  app.get("/api/pricing/imaging", authMiddleware, requireRole('admin'), multiTenantEnforcer(), async (req: TenantRequest, res) => {
    try {
      const organizationId = requireOrgId(req);
      const pricing = await storage.getImagingPricing(organizationId);
      res.json(pricing);
    } catch (error) {
      handleRouteError(error, "fetch imaging pricing", res);
    }
  });

  app.get("/api/pricing/imaging/:id", authMiddleware, requireRole('admin'), multiTenantEnforcer(), async (req: TenantRequest, res) => {
    try {
      const organizationId = requireOrgId(req);
      const pricing = await storage.getImagingPricingById(parseInt(req.params.id), organizationId);
      if (!pricing) {
        return res.status(404).json({ error: "Imaging pricing not found" });
      }
      res.json(pricing);
    } catch (error) {
      handleRouteError(error, "fetch imaging pricing", res);
    }
  });

  app.post("/api/pricing/imaging", authMiddleware, requireRole('admin'), multiTenantEnforcer(), async (req: TenantRequest, res) => {
    try {
      const organizationId = requireOrgId(req);
      const payload = enforceCreatedBy(req, {
        ...req.body,
        organizationId
      }, 'createdBy');
      
      const pricing = await storage.createImagingPricing(payload);
      res.status(201).json(pricing);
    } catch (error) {
      handleRouteError(error, "create imaging pricing", res);
    }
  });

  app.patch("/api/pricing/imaging/:id", authMiddleware, requireRole('admin'), multiTenantEnforcer(), async (req: TenantRequest, res) => {
    try {
      const organizationId = requireOrgId(req);
      const updated = await storage.updateImagingPricing(parseInt(req.params.id), organizationId, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Imaging pricing not found" });
      }
      res.json(updated);
    } catch (error) {
      handleRouteError(error, "update imaging pricing", res);
    }
  });

  app.delete("/api/pricing/imaging/:id", authMiddleware, requireRole('admin'), multiTenantEnforcer(), async (req: TenantRequest, res) => {
    try {
      const organizationId = requireOrgId(req);
      const success = await storage.deleteImagingPricing(parseInt(req.params.id), organizationId);
      if (!success) {
        return res.status(404).json({ error: "Imaging pricing not found" });
      }
      res.json({ message: "Imaging pricing deleted successfully" });
    } catch (error) {
      handleRouteError(error, "delete imaging pricing", res);
    }
  });

  // ===== Clinic Headers & Footers Routes =====
  
  // Create or update clinic header
  app.post("/api/clinic-headers", authMiddleware, multiTenantEnforcer(), async (req: TenantRequest, res) => {
    try {
      const organizationId = requireOrgId(req);
      const validated = insertClinicHeaderSchema.parse({
        ...req.body,
        organizationId
      });
      
      // Check if header already exists for this organization
      const existingHeader = await storage.getActiveClinicHeader(organizationId);
      
      let header;
      if (existingHeader) {
        // Update existing header
        header = await storage.updateClinicHeader(existingHeader.id, organizationId, validated);
        res.json(header);
      } else {
        // Create new header
        header = await storage.createClinicHeader(validated);
        res.status(201).json(header);
      }
    } catch (error) {
      handleRouteError(error, "create or update clinic header", res);
    }
  });

  // Get active clinic header for organization
  app.get("/api/clinic-headers", authMiddleware, multiTenantEnforcer(), async (req: TenantRequest, res) => {
    try {
      const organizationId = requireOrgId(req);
      const header = await storage.getActiveClinicHeader(organizationId);
      res.json(header);
    } catch (error) {
      handleRouteError(error, "get clinic header", res);
    }
  });

  // Create or update clinic footer
  app.post("/api/clinic-footers", authMiddleware, multiTenantEnforcer(), async (req: TenantRequest, res) => {
    try {
      const organizationId = requireOrgId(req);
      const validated = insertClinicFooterSchema.parse({
        ...req.body,
        organizationId
      });
      
      // Check if footer already exists for this organization
      const existingFooter = await storage.getActiveClinicFooter(organizationId);
      
      let footer;
      if (existingFooter) {
        // Update existing footer
        footer = await storage.updateClinicFooter(existingFooter.id, organizationId, validated);
        res.json(footer);
      } else {
        // Create new footer
        footer = await storage.createClinicFooter(validated);
        res.status(201).json(footer);
      }
    } catch (error) {
      handleRouteError(error, "create or update clinic footer", res);
    }
  });

  // Get active clinic footer for organization
  app.get("/api/clinic-footers", authMiddleware, multiTenantEnforcer(), async (req: TenantRequest, res) => {
    try {
      const organizationId = requireOrgId(req);
      const footer = await storage.getActiveClinicFooter(organizationId);
      res.json(footer);
    } catch (error) {
      handleRouteError(error, "get clinic footer", res);
    }
  });
  
  // Add WebSocket support for real-time messaging
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store connected clients by user ID for message broadcasting
  const connectedClients = new Map();
  
  wss.on('connection', (ws: any, req: any) => {
    console.log('🔗 WebSocket client connected');
    console.log('🔍 Current connected clients count:', connectedClients.size);
    
    // Send immediate ping to keep connection alive
    ws.ping();
    
    // Setup ping/pong to maintain connection
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      } else {
        clearInterval(pingInterval);
      }
    }, 30000); // Ping every 30 seconds
    
    ws.on('message', (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('📥 WebSocket message received from client:', data);
        
        // Handle client authentication and registration
        if (data.type === 'auth' && data.userId) {
          connectedClients.set(data.userId, ws);
          ws.userId = data.userId;
          console.log(`👤 User ${data.userId} authenticated via WebSocket`);
          console.log('🔍 Total authenticated clients:', connectedClients.size);
          console.log('🔍 Authenticated client IDs:', Array.from(connectedClients.keys()));
        }
      } catch (error) {
        console.error('WebSocket message parsing error:', error);
      }
    });
    
    ws.on('close', () => {
      clearInterval(pingInterval);
      if (ws.userId) {
        connectedClients.delete(ws.userId);
        console.log(`👤 User ${ws.userId} disconnected from WebSocket`);
        console.log('🔍 Remaining connected clients:', connectedClients.size);
      } else {
        console.log('🔗 WebSocket client disconnected (unauthenticated)');
      }
    });
  });
  
  // Export function to broadcast messages to specific users
  app.set('broadcastMessage', (targetUserId: number, messageData: any) => {
    const targetClient = connectedClients.get(targetUserId);
    if (targetClient && targetClient.readyState === WebSocket.OPEN) {
      targetClient.send(JSON.stringify({
        type: 'new_message',
        message: messageData.message || messageData,
        conversationId: messageData.conversationId,
        data: messageData
      }));
      console.log(`📨 Message broadcasted to user ${targetUserId}`);
      return true;
    }
    return false;
  });
  
  return httpServer;
}
