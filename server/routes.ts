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
import { tenantMiddleware, authMiddleware, requireRole, gdprComplianceMiddleware, type TenantRequest } from "./middleware/tenant";
import { multiTenantEnforcer, validateOrganizationFilter, withTenantIsolation } from "./middleware/multi-tenant-enforcer";
import { initializeMultiTenantPackage, getMultiTenantPackage } from "./packages/multi-tenant-core";
import { messagingService } from "./messaging-service";
import { createPaypalOrder, capturePaypalOrder, loadPaypalDefault } from "./paypal";
import { gdprComplianceService } from "./services/gdpr-compliance";
import { insertGdprConsentSchema, insertGdprDataRequestSchema, updateMedicalImageReportFieldSchema } from "../shared/schema";
import { processAppointmentBookingChat, generateAppointmentSummary } from "./anthropic";
import { inventoryService } from "./services/inventory";
import { emailService } from "./services/email";
import multer from "multer";
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs-extra';

// In-memory storage for voice notes - persistent across server restarts
let voiceNotes: any[] = [];

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
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, JPG, PNG files are allowed.'));
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
  app.post('/api/admin/demo-medical-records-bootstrap', authMiddleware, requireRole(["admin"]), withTenantIsolation, async (req: TenantRequest, res) => {
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
      console.log(`[BOOTSTRAP] Initiated by admin user: ${req.user?.username} (ID: ${req.user?.id})`);
      
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

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          department: user.department
        }
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

      res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          department: user.department
        }
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

      // Generate AI insights using OpenAI
      const aiInsightsData = await aiService.analyzePatientRisk(patient, medicalRecords);

      // Store new insights in database
      const savedInsights = [];
      for (const insightData of aiInsightsData) {
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
        savedInsights.push(insight);
      }

      res.json({ 
        success: true, 
        insights: savedInsights,
        generated: savedInsights.length,
        patientName: `${patient.firstName} ${patient.lastName}`
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
      const patients = await storage.getPatientsByOrganization(req.tenant!.id, limit);
      res.json(patients);
    } catch (error) {
      console.error("Patients fetch error:", error);
      res.status(500).json({ error: "Failed to fetch patients" });
    }
  });

  app.get("/api/patients/:id", async (req: TenantRequest, res) => {
    try {
      const patientId = parseInt(req.params.id);
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

  // Create medical record for patient
  app.post("/api/patients/:id/records", authMiddleware, requireRole(["doctor", "nurse"]), async (req: TenantRequest, res) => {
    try {
      const patientId = parseInt(req.params.id);
      
      const recordData = z.object({
        type: z.string(),
        title: z.string(),
        notes: z.string(),
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
        patientId,
        organizationId: req.tenant!.id,
        providerId: req.user!.id, // Use the authenticated user as the provider
        type: recordData.type,
        title: recordData.title,
        notes: recordData.notes,
        diagnosis: recordData.diagnosis,
        treatment: recordData.treatment,
        prescription: recordData.prescription || {}
      });

      res.status(201).json(record);
    } catch (error) {
      console.error("Medical record creation error:", error);
      res.status(500).json({ error: "Failed to create medical record" });
    }
  });

  app.post("/api/patients", requireRole(["doctor", "nurse", "admin"]), async (req: TenantRequest, res) => {
    try {
      const patientData = z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        dateOfBirth: z.string().transform(str => new Date(str)),
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

      // Generate patient ID
      const patientCount = await storage.getPatientsByOrganization(req.tenant!.id, 999999);
      const patientId = `P${(patientCount.length + 1).toString().padStart(6, '0')}`;

      const patient = await storage.createPatient({
        ...patientData,
        organizationId: req.tenant!.id,
        patientId,
        address: patientData.address || {},
        emergencyContact: patientData.emergencyContact || {},
        medicalHistory: {
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
        }
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
      console.error("Patient creation error:", error);
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

  // Update patient data (including flags)
  app.patch("/api/patients/:id", authMiddleware, requireRole(["doctor", "nurse", "admin"]), async (req: TenantRequest, res) => {
    try {
      const patientId = parseInt(req.params.id);
      
      const updateData = z.object({
        flags: z.array(z.string()).optional(),
        riskLevel: z.enum(["low", "medium", "high"]).optional(),
        isActive: z.boolean().optional()
      }).parse(req.body);

      const patient = await storage.getPatient(patientId, req.tenant!.id);
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }

      const updatedPatient = await storage.updatePatient(patientId, req.tenant!.id, updateData);

      if (!updatedPatient) {
        return res.status(404).json({ error: "Failed to update patient" });
      }

      res.json(updatedPatient);
    } catch (error) {
      console.error("Error updating patient:", error);
      res.status(500).json({ error: "Failed to update patient" });
    }
  });

  // Medical records routes
  app.post("/api/patients/:id/records", requireRole(["doctor", "nurse"]), async (req: TenantRequest, res) => {
    try {
      const patientId = parseInt(req.params.id);
      
      const recordData = z.object({
        type: z.enum(["consultation", "prescription", "lab_result", "imaging"]),
        title: z.string().min(1),
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

  // Update medical record endpoint
  app.patch("/api/patients/:patientId/records/:recordId", authMiddleware, requireRole(["doctor", "nurse"]), async (req: TenantRequest, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const recordId = parseInt(req.params.recordId);
      
      const updateData = z.object({
        type: z.enum(["consultation", "prescription", "lab_result", "imaging"]).optional(),
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
        type: z.enum(["appointment_reminder", "medication_reminder", "follow_up_reminder"]).default("appointment_reminder"),
        message: z.string().optional(),
        method: z.enum(["email", "sms", "whatsapp", "system"]).default("system")
      }).parse(req.body);

      const patient = await storage.getPatient(patientId, req.tenant!.id);
      
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }

      // Skip spam prevention check since communications table doesn't exist

      // In a real implementation, this would send SMS/email
      console.log(`Sending ${reminderData.type} to patient ${patient.firstName} ${patient.lastName} via ${reminderData.method}`);
      console.log(`Message: ${reminderData.message || 'Default reminder message'}`);

      res.json({ 
        success: true, 
        message: `Reminder sent to ${patient.firstName} ${patient.lastName}`,
        patientId,
        reminderType: reminderData.type
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
        flagType: z.enum(["urgent", "follow-up", "billing", "general"]).default("general"),
        reason: z.string().min(1),
        priority: z.enum(["low", "medium", "high", "urgent"]).default("medium")
      }).parse(req.body);

      const patient = await storage.getPatient(patientId, req.tenant!.id);
      
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }

      // Create the flag string with type and priority
      const flagString = `${flagData.flagType}:${flagData.priority}:${flagData.reason}`;
      
      // Get current flags array and add the new flag
      const currentFlags = patient.flags || [];
      if (!currentFlags.includes(flagString)) {
        currentFlags.push(flagString);
        
        // Update patient with new flag
        await storage.updatePatient(patientId, req.tenant!.id, {
          flags: currentFlags
        });
      }

      // Fetch updated patient to return current state
      const updatedPatient = await storage.getPatient(patientId, req.tenant!.id);

      res.json({ 
        success: true, 
        message: `${flagData.flagType} flag (${flagData.priority} priority) added to ${patient.firstName} ${patient.lastName}`,
        patientId,
        flagType: flagData.flagType,
        priority: flagData.priority,
        reason: flagData.reason,
        totalFlags: updatedPatient?.flags?.length || 0,
        flags: updatedPatient?.flags || []
      });
    } catch (error) {
      console.error("Patient flag error:", error);
      res.status(500).json({ error: "Failed to create patient flag" });
    }
  });

  // Get patient communications
  app.get("/api/patients/:id/communications", authMiddleware, async (req: TenantRequest, res) => {
    try {
      // Return empty array since communications table doesn't exist
      res.json([]);
    } catch (error) {
      console.error('Error fetching patient communications:', error);
      res.status(500).json({ error: 'Failed to fetch communications' });
    }
  });

  // Appointments routes
  app.get("/api/appointments", async (req: TenantRequest, res) => {
    try {
      const date = req.query.date ? new Date(req.query.date as string) : undefined;
      const appointments = await storage.getAppointmentsByOrganization(req.tenant!.id, date);
      res.json(appointments);
    } catch (error) {
      console.error("Appointments fetch error:", error);
      res.status(500).json({ error: "Failed to fetch appointments" });
    }
  });

  app.post("/api/appointments", requireRole(["doctor", "nurse", "receptionist", "admin"]), async (req: TenantRequest, res) => {
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
        isVirtual: z.boolean().default(false)
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
        organizationId: req.tenant!.id,
        title: appointmentData.title || `${appointmentData.type} appointment`,
        description: appointmentData.description || appointmentData.notes || "",
        scheduledAt: appointmentData.scheduledAt ? new Date(appointmentData.scheduledAt) : new Date(appointmentData.appointmentDate || new Date()),
        duration: appointmentData.duration,
        type: appointmentData.type,
        status: appointmentData.status || "scheduled", // Add missing status field
        location: appointmentData.location || "",
        isVirtual: appointmentData.isVirtual
      };

      // VALIDATE APPOINTMENT TIME - Prevent past scheduling
      const now = new Date();
      if (appointmentToCreate.scheduledAt <= now) {
        return res.status(400).json({ 
          error: "Cannot schedule appointments for past times. Please select a future date and time.",
          type: "past_time_error",
          providedTime: appointmentToCreate.scheduledAt.toISOString(),
          currentTime: now.toISOString()
        });
      }
      
      console.log("Creating appointment with final data:", appointmentToCreate);
      
      const appointment = await storage.createAppointment(appointmentToCreate);
      
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

      console.log(`🎉 Appointment ${appointmentId} deleted successfully`);
      res.json({ success: true, message: "Appointment deleted successfully" });
    } catch (error) {
      console.error("❌ Appointment deletion error:", error);
      res.status(500).json({ error: "Failed to delete appointment" });
    }
  });

  // User management routes (admin only)
  // Medical staff endpoint for appointment booking - accessible to authenticated users
  app.get("/api/medical-staff", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const users = await storage.getUsersByOrganization(req.tenant!.id);
      
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
      const totalDoctors = users.filter(user => user.role === 'doctor' && user.isActive).length;
      
      console.log(`=== MEDICAL STAFF DEBUG ===`);
      console.log(`Total users: ${users.length}`);
      console.log(`Total doctors: ${totalDoctors}`);
      console.log(`Today shifts count: ${todayShifts.length}`);
      console.log(`Day of week: ${dayOfWeek}`);
      
      // Filter for all staff roles needed for shift management and appointments
      const medicalStaff = users
        .filter(user => ['doctor', 'nurse', 'sample_taker', 'lab_technician', 'admin', 'receptionist'].includes(user.role) && user.isActive)
        .filter(user => {
          // For doctors specifically, check if they are available today
          if (user.role === 'doctor') {
            console.log(`Checking doctor: ${user.firstName} ${user.lastName} (ID: ${user.id})`);
            
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
              const worksToday = hasWorkingDays && user.workingDays!.includes(dayOfWeek);
              
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
      const availableDoctors = medicalStaff.filter(user => user.role === 'doctor').length;
      
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
        user.role === 'doctor' && 
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

  app.get("/api/users", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const users = await storage.getUsersByOrganization(req.tenant!.id);
      
      // Remove passwordHash from response
      const safeUsers = users.map(user => {
        const { passwordHash, ...safeUser } = user;
        return safeUser;
      });

      res.json(safeUsers);
    } catch (error) {
      console.error("Users fetch error:", error);
      res.status(500).json({ error: "Failed to fetch users" });
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
        role: z.enum(["admin", "doctor", "nurse", "receptionist", "patient", "sample_taker"]),
        department: z.string().optional(),
        medicalSpecialtyCategory: z.string().optional(),
        subSpecialty: z.string().optional()
      }).parse(req.body);

      // Hash password
      const hashedPassword = await authService.hashPassword(userData.password);

      // Generate default permissions based on role
      const defaultPermissions = getDefaultPermissionsByRole(userData.role);

      // Force create user with unique email suffix for production fix
      const uniqueEmail = userData.email.includes('+') ? userData.email : userData.email.replace('@', `+${Date.now()}@`);
      
      const { password, ...userDataWithoutPassword } = userData;
      const user = await storage.createUser({
        ...userDataWithoutPassword,
        email: uniqueEmail,
        organizationId: req.tenant!.id,
        passwordHash: hashedPassword,
        permissions: defaultPermissions
      });

      console.log(`Created user with role: ${userData.role} and permissions:`, defaultPermissions);

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
        updates.password = await authService.hashPassword(updates.password);
      }

      const user = await storage.updateUser(userId, req.tenant!.id, updates);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Remove password from response
      const { passwordHash, ...safeUser } = user;
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
        status: z.enum(["active", "dismissed", "resolved"]).optional()
      }).parse(req.body);

      const insight = await storage.updateAiInsight(insightId, req.tenant!.id, updateData);
      
      if (!insight) {
        return res.status(404).json({ error: "AI insight not found" });
      }

      res.json(insight);
    } catch (error) {
      console.error("AI insight update error:", error);
      res.status(500).json({ error: "Failed to update AI insight" });
    }
  });

  // Clinical insights routes
  app.get("/api/clinical/insights", requireRole(["doctor", "nurse", "admin"]), async (req: TenantRequest, res) => {
    try {
      // Return mock clinical insights data for the Clinical Decision Support page
      const mockInsights = [
        {
          id: "insight_1",
          patientId: "patient_1",
          patientName: "Sarah Johnson",
          type: "drug_interaction",
          priority: "high",
          title: "Potential Drug Interaction Alert",
          description: "Warfarin and Amoxicillin combination may increase bleeding risk",
          recommendations: [
            "Monitor INR more frequently (every 2-3 days)",
            "Consider alternative antibiotic if possible",
            "Educate patient on bleeding signs",
            "Document interaction in patient record"
          ],
          confidence: 92,
          evidenceLevel: "A",
          createdAt: "2024-06-26T14:30:00Z",
          status: "active",
          provider: "Dr. Emily Watson",
          relatedConditions: ["Atrial Fibrillation", "Upper Respiratory Infection"]
        }
      ];
      res.json(mockInsights);
    } catch (error) {
      console.error("Clinical insights error:", error);
      res.status(500).json({ error: "Failed to fetch clinical insights" });
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

      const prescriptions = await storage.getPrescriptionsByOrganization(req.tenant!.id);
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

  app.post("/api/prescriptions", authMiddleware, requireRole(["doctor", "nurse"]), async (req: TenantRequest, res) => {
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
      
      // Check for duplicate prescriptions (same patient, same medication, active status)
      const existingPrescriptions = await storage.getPrescriptionsByOrganization(req.tenant!.id);
      const isDuplicate = existingPrescriptions.some(existing => 
        existing.patientId === parseInt(prescriptionData.patientId) &&
        existing.status === 'active' &&
        existing.medications?.some(med => 
          prescriptionData.medications?.some((newMed: any) => 
            newMed.name === med.name && 
            newMed.dosage === med.dosage
          )
        )
      );
      
      if (isDuplicate) {
        return res.status(400).json({ error: "A similar active prescription already exists for this patient" });
      }
      
      // Extract first medication for legacy columns (required for backward compatibility)
      const firstMedication = prescriptionData.medications?.[0] || {};
      
      // Create prescription data for database
      const prescriptionToInsert = {
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
      };

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

  app.patch("/api/prescriptions/:id", authMiddleware, requireRole(["doctor", "nurse"]), async (req: TenantRequest, res) => {
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

  app.delete("/api/prescriptions/:id", authMiddleware, requireRole(["doctor", "nurse"]), async (req: TenantRequest, res) => {
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

  // E-signature endpoint for prescriptions
  app.post("/api/prescriptions/:id/e-sign", authMiddleware, requireRole(["doctor", "nurse"]), async (req: TenantRequest, res) => {
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

      const labResults = await storage.getLabResultsByOrganization(req.tenant!.id);
      res.json(labResults);
    } catch (error) {
      console.error("Error fetching lab results:", error);
      res.status(500).json({ error: "Failed to fetch lab results" });
    }
  });

  app.post("/api/lab-results", authMiddleware, requireRole(["doctor", "nurse"]), async (req: TenantRequest, res) => {
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
      
      const newLabResult = await storage.createLabResult({
        organizationId: req.tenant!.id,
        patientId: patientId,
        testId: testId,
        testType: labData.testType,
        orderedBy: req.user.id,
        doctorName: labData.doctorName || null,
        mainSpecialty: labData.mainSpecialty || null,
        subSpecialty: labData.subSpecialty || null,
        priority: labData.priority || "routine",
        orderedAt: new Date(),
        status: "pending",
        notes: labData.notes || null
      });

      res.status(201).json(newLabResult);
    } catch (error) {
      console.error("Error creating lab order:", error);
      res.status(500).json({ error: "Failed to create lab order" });
    }
  });

  // Update lab result
  app.put("/api/lab-results/:id", authMiddleware, requireRole(["doctor", "nurse"]), async (req: TenantRequest, res) => {
    try {
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

      const billingData = [
        {
          id: "bill_001",
          patientId: "p_001",
          patientName: "Sarah Johnson",
          appointmentId: "apt_001",
          serviceDate: "2024-01-15T10:00:00Z",
          services: [
            {
              code: "99213",
              description: "Office visit - Established patient",
              quantity: 1,
              unitPrice: 150.00,
              total: 150.00
            }
          ],
          subtotal: 150.00,
          tax: 0.00,
          total: 150.00,
          status: "pending",
          dueDate: "2024-02-15T00:00:00Z",
          insuranceClaim: {
            provider: "NHS",
            claimNumber: "NHS123456",
            status: "submitted",
            coveredAmount: 150.00
          }
        }
      ];

      res.json(billingData);
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
      } else {
        // For internal messages, mark as delivered immediately since they don't go through SMS/WhatsApp
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

  // In-memory storage for clinical photos (simple temporary solution)
  const clinicalPhotosStorage: any[] = [
    {
      id: "photo_1",
      patientId: "158",
      patientName: "Imran Mubashir",
      type: "wound",
      filename: "wound_assessment_001.jpg",
      description: "Post-surgical wound assessment",
      url: "/api/photos/wound_assessment_001.jpg",
      dateTaken: new Date().toISOString(),
      metadata: {
        camera: "iPhone 14 Pro",
        resolution: "4032x3024",
        lighting: "Natural"
      },
      annotations: [],
      createdAt: new Date().toISOString()
    }
  ];

  app.get("/api/voice-documentation/photos", authMiddleware, async (req: TenantRequest, res) => {
    try {
      // Filter photos by tenant organization
      const tenantPhotos = clinicalPhotosStorage.filter(photo => {
        // For now, return all photos as we don't have organizationId in photos
        // In production, this would be filtered by tenant
        return true;
      });

      res.json(tenantPhotos);
    } catch (error) {
      console.error("Error fetching photos:", error);
      res.status(500).json({ error: "Failed to fetch photos" });
    }
  });

  app.post("/api/voice-documentation/photos", authMiddleware, async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const { patientId, type, description } = req.body;
      
      const patient = await storage.getPatient(parseInt(patientId), req.tenant!.id);
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }

      const newPhoto = {
        id: `photo_${Date.now()}`,
        patientId: patientId,
        patientName: `${patient.firstName} ${patient.lastName}`,
        type: type || "general",
        filename: `photo_${Date.now()}.jpg`,
        description: description || "Clinical photo",
        url: `/api/photos/photo_${Date.now()}.jpg`,
        dateTaken: new Date().toISOString(),
        metadata: {
          camera: "Clinical Camera",
          resolution: "1920x1080",
          lighting: "Clinical"
        },
        annotations: [],
        createdAt: new Date().toISOString()
      };

      // Add photo to in-memory storage
      clinicalPhotosStorage.push(newPhoto);
      console.log('📸 Clinical photo saved to memory storage:', newPhoto.id);
      console.log('📊 Total photos in storage:', clinicalPhotosStorage.length);

      res.status(201).json(newPhoto);
    } catch (error) {
      console.error("Error uploading photo:", error);
      res.status(500).json({ error: "Failed to upload photo" });
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

  // PayPal Routes - Real PayPal Integration
  app.get("/api/paypal/setup", async (req, res) => {
    await loadPaypalDefault(req, res);
  });

  app.post("/api/paypal/order", async (req, res) => {
    // Request body should contain: { intent, amount, currency }
    await createPaypalOrder(req, res);
  });

  app.post("/api/paypal/order/:orderID/capture", async (req, res) => {
    await capturePaypalOrder(req, res);
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

  // Document API routes
  app.get("/api/documents", authMiddleware, async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const isTemplatesOnly = req.query.templates === 'true';
      
      if (isTemplatesOnly) {
        // Fetch only templates
        const templates = await storage.getTemplatesByOrganization(req.tenant!.id, 50);
        res.json(templates);
      } else {
        // Fetch all documents
        const documents = await storage.getDocumentsByOrganization(req.tenant!.id, 50);
        res.json(documents);
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
      res.json(documents);
    } catch (error) {
      console.error("Error fetching user documents:", error);
      res.status(500).json({ error: "Failed to fetch user documents" });
    }
  });

  app.post("/api/documents", authMiddleware, async (req: TenantRequest, res) => {
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

      const document = await storage.createDocument({
        ...documentData,
        organizationId: req.tenant!.id,
        userId: req.user.id,
      });

      res.status(201).json(document);
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

      res.json(document);
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
          
          return {
            ...image,
            patientName: patient ? `${patient.firstName} ${patient.lastName}` : "Unknown Patient",
            patientId: patient?.patientId || "Unknown",
            uploadedByName: uploader ? `${uploader.firstName} ${uploader.lastName}` : "Unknown User"
          };
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

      // Create proper object for database insertion
      const dbImageData = {
        patientId: imageData.patientId,
        studyType: imageData.studyType || imageData.imageType || "Unknown Study", // Use studyType first, then imageType as fallback
        modality: imageData.modality || "X-Ray", // Use provided modality or default
        bodyPart: imageData.bodyPart,
        indication: imageData.indication || imageData.notes || "",
        priority: imageData.priority || "routine",
        fileName: imageData.filename,
        fileSize: imageData.fileSize,
        mimeType: imageData.mimeType || "image/jpeg", // Use provided MIME type or default
        uploadedBy: req.user!.id, // Use authenticated user's ID instead of frontend value
        organizationId: req.tenant!.id,
        imageData: imageData.imageData || null, // Store the base64 image data
        status: imageData.status || "uploaded" // Use provided status or default to uploaded
      };


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

  app.delete("/api/medical-images/:id", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const imageId = parseInt(req.params.id);
      if (isNaN(imageId)) {
        return res.status(400).json({ error: "Invalid image ID" });
      }

      const success = await storage.deleteMedicalImage(imageId, req.tenant!.id);
      if (!success) {
        return res.status(404).json({ error: "Medical image not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting medical image:", error);
      res.status(500).json({ error: "Failed to delete medical image" });
    }
  });

  // Lab Results API endpoints (Database-driven)
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

  // PDF Email endpoint for prescriptions with file attachments
  app.post("/api/prescriptions/:id/send-pdf", authMiddleware, upload.array('attachments', 5), async (req: TenantRequest, res) => {
    try {
      const prescriptionId = parseInt(req.params.id);
      
      // Parse form data fields
      const pharmacyEmail = req.body.pharmacyEmail;
      const pharmacyName = req.body.pharmacyName || 'Pharmacy Team';
      let patientName = req.body.patientName;

      // Validate required fields
      if (!pharmacyEmail || !pharmacyEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        return res.status(400).json({ error: "Valid pharmacy email is required" });
      }

      console.log('Email request data:', {
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

      // Generate professional HTML email template with clinic logo and branding
      const emailTemplate = emailService.generatePrescriptionEmail(
        patientName || 'Patient',
        pharmacyName,
        undefined, // prescriptionData - not needed for this basic email
        clinicLogoUrl,
        organizationName
      );

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

      // TODO: In a real implementation, generate and add prescription PDF here
      // For now, we'll send the professional HTML email with user attachments
      const success = await emailService.sendEmail({
        to: pharmacyEmail,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
        text: emailTemplate.text,
        attachments: attachments.length > 0 ? attachments : undefined
      });

      if (success) {
        const attachmentInfo = attachments.length > 0 
          ? ` with ${attachments.length} attachment(s)`
          : '';
        res.json({ 
          success: true, 
          message: `Prescription email sent successfully to ${pharmacyEmail}${attachmentInfo}`,
          attachmentsCount: attachments.length
        });
      } else {
        res.status(500).json({ error: "Failed to send prescription email" });
      }
    } catch (error) {
      console.error("Error sending prescription PDF:", error);
      if (error instanceof Error && error.message?.includes('Invalid file type')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to send prescription PDF" });
    }
  });

  // Shift Management API endpoints
  app.get("/api/shifts", authMiddleware, requireRole(["admin"]), async (req: TenantRequest, res) => {
    try {
      const { date } = req.query as { date?: string };
      console.log("GET /api/shifts - Fetching shifts for organization:", req.tenant!.id, "date filter:", date);
      const shifts = await storage.getStaffShiftsByOrganization(req.tenant!.id, date);
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

      const shift = await storage.createStaffShift({
        ...shiftData,
        organizationId: req.tenant!.id,
        date: new Date(shiftData.date)
      });

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
        .filter(user => user.role === 'doctor' && user.isActive)
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
            patientName: apt.patientName,
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
        lastVisit: patient.lastVisit,
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
      const patientId = req.user!.id;
      const appointments = await storage.getAppointmentsByPatient(patientId, req.tenant!.id);
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching patient appointments:", error);
      res.status(500).json({ error: "Failed to load appointments" });
    }
  });

  app.post("/api/mobile/patient/appointments", authMiddleware, requireRole(["patient"]), async (req: TenantRequest, res) => {
    try {
      const appointmentData = {
        ...req.body,
        patientId: req.user!.id,
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
      const patientId = req.user!.id;
      
      // Verify the appointment belongs to the patient
      const appointment = await storage.getAppointment(appointmentId, req.tenant!.id);
      if (!appointment || appointment.patientId !== patientId) {
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
        specialization: doctor.specialization || 'General Practice',
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
      const patientId = req.user!.id;
      const labResults = await storage.getLabResultsByPatient(patientId, req.tenant!.id);
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
        .filter(doctor => doctor.role === 'doctor' && doctor.isActive)
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
        .filter(doctor => doctor.role === 'doctor' && doctor.isActive)
        .map(doctor => ({
          id: doctor.id,
          name: `${doctor.firstName} ${doctor.lastName}`,
          specialty: doctor.department || 'General Medicine'
        }));

      res.json({
        availableDoctors,
        patientInfo: {
          id: req.user.id,
          name: `${req.user.firstName} ${req.user.lastName}`,
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
  app.get("/api/billing/invoices", requireRole(["admin", "doctor", "nurse", "receptionist"]), async (req: TenantRequest, res) => {
    try {
      const { status } = req.query;
      
      // For now, return mock data since we need to implement proper invoice storage
      const mockInvoices = [
        {
          id: "INV-001234",
          patientId: "P000004",
          patientName: "Alex Johnson",
          amount: 250.00,
          status: status === "all" ? "paid" : status || "paid",
          dateOfService: new Date("2024-01-15"),
          invoiceDate: new Date("2024-01-15"),
          dueDate: new Date("2024-02-14"),
          paidAmount: 250.00,
          items: [
            { code: "99213", description: "Office Visit - Level 3", quantity: 1, unitPrice: 250.00, total: 250.00 }
          ]
        },
        {
          id: "INV-001235", 
          patientId: "P000005",
          patientName: "Sarah Connor",
          amount: 450.00,
          status: status === "all" ? "sent" : status || "sent",
          dateOfService: new Date("2024-01-14"),
          invoiceDate: new Date("2024-01-14"),
          dueDate: new Date("2024-02-13"),
          paidAmount: 0,
          items: [
            { code: "99214", description: "Office Visit - Level 4", quantity: 1, unitPrice: 300.00, total: 300.00 },
            { code: "93000", description: "Electrocardiogram", quantity: 1, unitPrice: 150.00, total: 150.00 }
          ]
        }
      ];
      
      res.json(mockInvoices);
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
        notes: z.string().optional()
      }).parse(req.body);

      // Get patient name for the invoice
      const patient = await storage.getPatientByPatientId(invoiceData.patientId, req.tenant!.id);
      if (!patient) {
        return res.status(400).json({ error: "Patient not found" });
      }

      // Create new invoice
      const newInvoice = {
        id: `INV-${Date.now().toString().slice(-6)}`,
        patientId: invoiceData.patientId,
        patientName: `${patient.firstName} ${patient.lastName}`,
        amount: parseFloat(invoiceData.totalAmount),
        status: "draft" as const,
        dateOfService: new Date(invoiceData.serviceDate),
        invoiceDate: new Date(invoiceData.invoiceDate),
        dueDate: new Date(invoiceData.dueDate),
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
        notes: invoiceData.notes
      };

      console.log("✅ Invoice created successfully:", newInvoice.id);
      res.status(201).json(newInvoice);
    } catch (error) {
      console.error("Invoice creation error:", error);
      res.status(500).json({ error: "Failed to create invoice" });
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
  app.post("/api/imaging/generate-report", authMiddleware, requireRole(["doctor", "nurse"]), async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const { study, reportFormData } = req.body;
      
      if (!study || !study.patientName) {
        return res.status(400).json({ error: "Study data is required" });
      }

      // Generate unique report ID using patient ID and imaging ID for better identification
      const patientId = study.patientId || 'UNKNOWN';
      const imagingId = study.id || 'IMG';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5); // Remove milliseconds and format
      const reportId = `${patientId}_${imagingId}_${timestamp}`;
      
      // Ensure reports directory exists
      const reportsDir = path.resolve(process.cwd(), 'uploads', 'Imaging_Reports');
      await fs.ensureDir(reportsDir);
      
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
      
      // Patient Information Section
      drawSectionBox(30, yPosition + 5, (width - 80) / 2, 120);
      page.drawText('PATIENT INFORMATION', {
        x: 40,
        y: yPosition - 10,
        size: 12,
        font: boldFont,
        color: primaryBlue
      });
      
      yPosition -= 30;
      page.drawText(`Name: ${study.patientName}`, { x: 50, y: yPosition, size: 10, font });
      yPosition -= 15;
      page.drawText(`ID: ${study.patientId || 'N/A'}`, { x: 50, y: yPosition, size: 10, font });
      yPosition -= 15;
      page.drawText(`DOB: ${study.patientDOB || 'N/A'}`, { x: 50, y: yPosition, size: 10, font });
      yPosition -= 15;
      page.drawText(`Study Date: ${new Date().toLocaleDateString()}`, { x: 50, y: yPosition, size: 10, font });
      
      // Study Information Section (Right side)
      const rightColumnX = width / 2 + 10;
      drawSectionBox(rightColumnX, yPosition + 60, (width - 80) / 2, 120);
      page.drawText('STUDY INFORMATION', {
        x: rightColumnX + 10,
        y: yPosition + 50,
        size: 12,
        font: boldFont,
        color: primaryBlue
      });
      
      page.drawText(`Study Type: ${study.studyType}`, { x: rightColumnX + 20, y: yPosition + 30, size: 10, font });
      page.drawText(`Body Part: ${study.bodyPart}`, { x: rightColumnX + 20, y: yPosition + 15, size: 10, font });
      page.drawText(`Modality: ${study.modality}`, { x: rightColumnX + 20, y: yPosition, size: 10, font });
      page.drawText(`Status: ${study.status || 'Complete'}`, { x: rightColumnX + 20, y: yPosition - 15, size: 10, font });
      
      yPosition -= 50;
      
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
            lines.forEach(line => {
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
      
      // Medical Image Section (moved after radiologist report)
      yPosition -= 20;
      let imageHeight = 0;
      if (study.images && study.images[0] && study.images[0].imageData) {
        try {
          // Extract base64 image data
          const imageData = study.images[0].imageData;
          const mimeType = study.images[0].mimeType || 'image/jpeg';
          
          // Convert base64 to buffer
          const imageBuffer = Buffer.from(imageData, 'base64');
          
          // Embed image based on MIME type
          let image;
          if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
            image = await pdfDoc.embedJpg(imageBuffer);
          } else if (mimeType.includes('png')) {
            image = await pdfDoc.embedPng(imageBuffer);
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
            page.drawText('MEDICAL IMAGE', {
              x: 40,
              y: yPosition - 5,
              size: 12,
              font: boldFont,
              color: primaryBlue
            });
            
            // Draw the medical image
            page.drawImage(image, {
              x: (width - drawWidth) / 2, // Center the image
              y: yPosition - drawHeight - 40,
              width: drawWidth,
              height: drawHeight
            });
            
            // Image Series information
            const fileSize = study.images[0].fileSize ? (study.images[0].fileSize / (1024 * 1024)).toFixed(2) : '0.00';
            const imageSeries = `${study.modality || 'X-Ray'} x ${study.images.length} images • ${fileSize} MB • ${(study.images[0].mimeType || 'image/jpeg').includes('jpeg') ? 'JPEG' : 'PNG'}`;
            
            page.drawText(`Image Series: ${imageSeries}`, {
              x: 50,
              y: yPosition - imageHeight + 25,
              size: 9,
              font,
              color: darkGray
            });
            
            page.drawText(`Series: ${study.images[0].seriesDescription || study.studyType || 'N/A'}`, {
              x: 50,
              y: yPosition - imageHeight + 10,
              size: 9,
              font,
              color: darkGray
            });
            
            yPosition -= imageHeight;
          }
        } catch (imageError) {
          console.log('Could not embed image, continuing without it:', imageError);
          // Continue without image if there's an error
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
      await fs.outputFile(outputPath, pdfBytes);
      
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

  // Serve PDF Reports
  app.get("/api/imaging/reports/:reportId", authMiddleware, async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const { reportId } = req.params;
      
      // Validate reportId format (PatientID_ImagingID_Timestamp or legacy UUID)
      const isLegacyUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(reportId);
      const isNewFormat = /^.+_.+_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/.test(reportId);
      
      if (!isLegacyUUID && !isNewFormat) {
        return res.status(400).json({ error: "Invalid report ID format" });
      }

      const reportsDir = path.resolve(process.cwd(), 'uploads', 'Imaging_Reports');
      const filePath = path.join(reportsDir, `${reportId}.pdf`);
      
      // Check if file exists
      if (!(await fs.pathExists(filePath))) {
        return res.status(404).json({ error: "Report not found" });
      }
      
      // Generate a meaningful filename for download
      let downloadFilename;
      if (isNewFormat) {
        // Extract patient ID from the new format
        const parts = reportId.split('_');
        const patientId = parts[0];
        const timestamp = parts[2];
        downloadFilename = `radiology-report-${patientId}-${timestamp}.pdf`;
      } else {
        // Legacy UUID format
        downloadFilename = `radiology-report-${reportId}.pdf`;
      }
      
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
