import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import Stripe from "stripe";
import { storage } from "./storage";
import { authService } from "./services/auth";
import { aiService } from "./services/ai";
import { tenantMiddleware, authMiddleware, requireRole, gdprComplianceMiddleware, type TenantRequest } from "./middleware/tenant";

// In-memory storage for voice notes
const voiceNotes: any[] = [
  {
    id: "note_1",
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
      chiefComplaint: "Chest pain",
      assessment: "Possible cardiac involvement",
      plan: "EKG, troponin levels, cardiology consult"
    },
    createdAt: "2024-06-26T15:00:00Z"
  }
];

export async function registerRoutes(app: Express): Promise<Server> {
  // Debug endpoint BEFORE middleware - to diagnose tenant issues v6 FORCE CACHE CLEAR
  app.get("/api/status", (req, res) => {
    const host = req.get("host");
    const extractedSubdomain = host ? host.split('.')[0] : "none";
    res.json({ 
      status: "LIVE-UPDATED", 
      host, 
      extractedSubdomain,
      env: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      version: "v6-force-deployment-refresh-status"
    });
  });

  // Apply tenant and GDPR middleware to all API routes
  app.use("/api", tenantMiddleware as any);
  app.use("/api", gdprComplianceMiddleware as any);

  // Authentication routes (no auth required)
  app.post("/api/auth/login", async (req: TenantRequest, res) => {
    try {
      const { email, password } = z.object({
        email: z.string().email(),
        password: z.string().min(6)
      }).parse(req.body);

      const user = await storage.getUserByEmail(email, req.tenant!.id);
      if (!user || !user.isActive) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const isValidPassword = await authService.comparePassword(password, user.password);
      if (!isValidPassword) {
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

  // Protected routes (auth required)
  app.use("/api", authMiddleware);

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

      // Get medical records
      const medicalRecords = await storage.getMedicalRecordsByPatient(patientId, req.tenant!.id);
      
      // Get AI insights for this patient
      const aiInsights = await storage.getAiInsightsByPatient(patientId, req.tenant!.id);

      res.json({
        ...patient,
        medicalRecords,
        aiInsights
      });
    } catch (error) {
      console.error("Patient fetch error:", error);
      res.status(500).json({ error: "Failed to fetch patient" });
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
          medications: z.array(z.string()).optional()
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
  app.patch("/api/patients/:id/medical-history", authMiddleware, requireRole(["doctor", "nurse"]), async (req: TenantRequest, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const medicalHistoryUpdate = req.body;

      const patient = await storage.getPatient(patientId, req.tenant!.id);
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }

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

      const updatedPatient = await storage.updatePatient(patientId, req.tenant!.id, {
        medicalHistory: updatedMedicalHistory
      });

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

      const patient = await storage.getPatient(patientId, req.organizationId!);
      
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }

      // Check if a reminder was sent recently to prevent spam
      const lastReminder = await storage.getLastReminderSent(patientId, req.organizationId!, reminderData.type);
      if (lastReminder) {
        const timeSinceLastReminder = new Date().getTime() - new Date(lastReminder.createdAt).getTime();
        const hoursSinceLastReminder = timeSinceLastReminder / (1000 * 60 * 60);
        
        if (hoursSinceLastReminder < 24) {
          return res.status(429).json({ 
            error: 'Reminder already sent within the last 24 hours',
            lastSent: lastReminder.createdAt
          });
        }
      }

      // Create patient communication record
      const communication = await storage.createPatientCommunication({
        organizationId: req.organizationId!,
        patientId,
        type: 'reminder',
        method: reminderData.method,
        message: reminderData.message || `${reminderData.type} sent to patient`,
        sentBy: req.user!.id,
        metadata: {
          reminderType: reminderData.type,
          method: reminderData.method
        }
      });

      // In a real implementation, this would send SMS/email
      console.log(`Sending ${reminderData.type} to patient ${patient.firstName} ${patient.lastName} via ${reminderData.method}`);
      console.log(`Message: ${reminderData.message || 'Default reminder message'}`);

      res.json({ 
        success: true, 
        message: `Reminder sent to ${patient.firstName} ${patient.lastName}`,
        communication,
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

      // Create patient communication record for flag
      const communication = await storage.createPatientCommunication({
        organizationId: req.tenant!.id,
        patientId,
        type: 'flag',
        method: 'system',
        message: `Patient flagged: ${flagData.flagType} - ${flagData.reason}`,
        sentBy: req.user!.id,
        metadata: {
          flagType: flagData.flagType,
          priority: flagData.priority
        }
      });

      res.json({ 
        success: true, 
        message: `Flag created for ${patient.firstName} ${patient.lastName}`,
        communication,
        patientId,
        flagType: flagData.flagType
      });
    } catch (error) {
      console.error("Patient flag error:", error);
      res.status(500).json({ error: "Failed to create patient flag" });
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

  // Appointments routes
  app.get("/api/appointments", async (req: TenantRequest, res) => {
    try {
      const date = req.query.date ? new Date(req.query.date as string) : new Date();
      const appointments = await storage.getAppointmentsByOrganization(req.tenant!.id, date);
      res.json(appointments);
    } catch (error) {
      console.error("Appointments fetch error:", error);
      res.status(500).json({ error: "Failed to fetch appointments" });
    }
  });

  app.post("/api/appointments", requireRole(["doctor", "nurse", "receptionist", "admin"]), async (req: TenantRequest, res) => {
    try {
      const appointmentData = z.object({
        patientId: z.number(),
        providerId: z.number(),
        title: z.string().min(1),
        description: z.string().optional(),
        scheduledAt: z.string().transform(str => new Date(str)),
        duration: z.number().default(30),
        type: z.enum(["consultation", "follow_up", "procedure"]).default("consultation"),
        location: z.string().optional(),
        isVirtual: z.boolean().default(false)
      }).parse(req.body);

      const appointment = await storage.createAppointment({
        ...appointmentData,
        organizationId: req.tenant!.id,
        description: appointmentData.description || ""
      });

      res.status(201).json(appointment);
    } catch (error) {
      console.error("Appointment creation error:", error);
      res.status(500).json({ error: "Failed to create appointment" });
    }
  });

  app.delete("/api/appointments/:id", requireRole(["doctor", "nurse", "receptionist", "admin"]), async (req: TenantRequest, res) => {
    try {
      const appointmentId = parseInt(req.params.id);
      
      if (isNaN(appointmentId)) {
        return res.status(400).json({ error: "Invalid appointment ID" });
      }

      const deleted = await storage.deleteAppointment(appointmentId, req.tenant!.id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Appointment not found" });
      }

      res.json({ success: true, message: "Appointment deleted successfully" });
    } catch (error) {
      console.error("Appointment deletion error:", error);
      res.status(500).json({ error: "Failed to delete appointment" });
    }
  });

  // User management routes (admin only)
  // Medical staff endpoint for appointment booking - accessible to all users
  app.get("/api/medical-staff", tenantMiddleware, async (req: TenantRequest, res) => {
    try {
      const users = await storage.getUsersByOrganization(req.tenant!.id);
      
      // Filter for medical staff only and remove password from response
      const medicalStaff = users
        .filter(user => ['doctor', 'nurse'].includes(user.role) && user.isActive)
        .map(user => {
          const { password, ...safeUser } = user;
          return safeUser;
        });

      res.json(medicalStaff);
    } catch (error) {
      console.error("Medical staff fetch error:", error);
      res.status(500).json({ error: "Failed to fetch medical staff" });
    }
  });

  app.get("/api/users", requireRole(["admin"]), async (req: TenantRequest, res) => {
    try {
      const users = await storage.getUsersByOrganization(req.tenant!.id);
      
      // Remove password from response
      const safeUsers = users.map(user => {
        const { password, ...safeUser } = user;
        return safeUser;
      });

      res.json(safeUsers);
    } catch (error) {
      console.error("Users fetch error:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.post("/api/users", authMiddleware, async (req: TenantRequest, res) => {
    try {
      console.log("User creation request received");
      console.log("Request user:", req.user);
      console.log("Request body:", req.body);
      const userData = z.object({
        email: z.string().email(),
        username: z.string().min(3),
        password: z.string().min(6),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        role: z.enum(["admin", "doctor", "nurse", "receptionist"]),
        department: z.string().optional()
      }).parse(req.body);

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email, req.tenant!.id);
      if (existingUser) {
        return res.status(400).json({ error: "User with this email already exists" });
      }

      // Hash password
      const hashedPassword = await authService.hashPassword(userData.password);

      const user = await storage.createUser({
        ...userData,
        organizationId: req.tenant!.id,
        password: hashedPassword
      });

      // Remove password from response
      const { password, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error) {
      console.error("User creation error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        });
      }
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  // Update user
  app.patch("/api/users/:id", requireRole(["admin"]), async (req: TenantRequest, res) => {
    try {
      const userId = parseInt(req.params.id);
      const updates = req.body;
      
      // Hash password if provided
      if (updates.password) {
        updates.password = await authService.hashPassword(updates.password);
      }

      const user = await storage.updateUser(userId, req.tenant!.id, updates);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Remove password from response
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("User update error:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // Delete user
  app.delete("/api/users/:id", requireRole(["admin"]), async (req: TenantRequest, res) => {
    try {
      const userId = parseInt(req.params.id);
      const success = await storage.deleteUser(userId, req.tenant!.id);
      
      if (!success) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("User deletion error:", error);
      res.status(500).json({ error: "Failed to delete user" });
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

  app.post("/api/prescriptions", authMiddleware, requireRole(["doctor", "nurse"]), async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const prescriptionData = req.body;
      
      // Validate required fields
      if (!prescriptionData.patientId || isNaN(parseInt(prescriptionData.patientId))) {
        return res.status(400).json({ error: "Valid patient ID is required" });
      }
      
      // Create prescription data for database
      const prescriptionToInsert = {
        organizationId: req.tenant!.id,
        patientId: parseInt(prescriptionData.patientId),
        providerId: req.user.id,
        prescriptionNumber: `RX-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        status: prescriptionData.status || "active",
        diagnosis: prescriptionData.diagnosis,
        medications: prescriptionData.medications || [],
        pharmacy: prescriptionData.pharmacy || {},
        notes: prescriptionData.notes,
        validUntil: prescriptionData.validUntil ? new Date(prescriptionData.validUntil) : null,
        interactions: prescriptionData.interactions || []
      };

      const newPrescription = await storage.createPrescription(prescriptionToInsert);
      res.status(201).json(newPrescription);
    } catch (error) {
      console.error("Error creating prescription:", error);
      res.status(500).json({ error: "Failed to create prescription" });
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

  // Lab Results Routes
  app.get("/api/lab-results", authMiddleware, async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const labResults = await storage.getLabResults(req.organizationId!);
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
      
      const newLabResult = await storage.createLabResult({
        patientId: labData.patientId,
        patientName: labData.patientName,
        testType: labData.testType,
        orderedBy: req.user.email,
        organizationId: req.organizationId!,
        providerId: req.user.id,
        status: "pending",
        priority: labData.priority || "routine",
        notes: labData.notes
      });

      res.status(201).json(newLabResult);
    } catch (error) {
      console.error("Error creating lab order:", error);
      res.status(500).json({ error: "Failed to create lab order" });
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

  // Messaging endpoints
  app.get("/api/messaging/conversations", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const conversations = await storage.getConversations(req.tenant!.id);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.get("/api/messaging/messages/:conversationId", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const messages = await storage.getMessages(req.params.conversationId, req.tenant!.id);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/messaging/send", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const message = await storage.sendMessage(req.body, req.tenant!.id);
      res.json(message);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ error: "Failed to send message" });
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

  // Voice Documentation Routes
  app.get("/api/voice-documentation/notes", authMiddleware, async (req: TenantRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Return voice notes from in-memory storage
      res.json(voiceNotes);
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
      
      const patient = await storage.getPatient(patientIdNum, req.organizationId!);
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }

      const newNote = {
        id: `note_${Date.now()}`,
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
        structuredData: {},
        createdAt: new Date().toISOString()
      };

      // Add the new note to the voiceNotes array
      voiceNotes.push(newNote);

      res.status(201).json(newNote);
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
      const noteIndex = voiceNotes.findIndex(note => note.id === noteId);
      
      if (noteIndex === -1) {
        return res.status(404).json({ error: "Voice note not found" });
      }

      // Remove the note from the array
      const deletedNote = voiceNotes.splice(noteIndex, 1)[0];
      
      res.status(200).json({ 
        message: "Voice note deleted successfully", 
        deletedNoteId: deletedNote.id 
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

  app.get("/api/voice-documentation/photos", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const photos = [
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

      res.json(photos);
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
      
      const patient = await storage.getPatient(parseInt(patientId), req.organizationId!);
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

      res.status(201).json(newPhoto);
    } catch (error) {
      console.error("Error uploading photo:", error);
      res.status(500).json({ error: "Failed to upload photo" });
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

  // PayPal Setup
  app.get("/api/paypal/setup", authMiddleware, async (req: TenantRequest, res) => {
    try {
      // Mock response since we don't have PayPal secrets yet
      res.json({
        clientToken: "mock_paypal_client_token",
        message: "PayPal setup (demo mode - requires PayPal API keys for live processing)"
      });
    } catch (error: any) {
      console.error("Error setting up PayPal:", error);
      res.status(500).json({ error: "Failed to setup PayPal" });
    }
  });

  // PayPal Create Order
  app.post("/api/paypal/order", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const { amount, currency, intent, planId, planName } = req.body;
      
      // Mock response since we don't have PayPal secrets yet
      res.json({
        id: `mock_paypal_order_${planId}_${Date.now()}`,
        status: "CREATED",
        message: "PayPal order created (demo mode - requires PayPal API keys for live processing)"
      });
    } catch (error: any) {
      console.error("Error creating PayPal order:", error);
      res.status(500).json({ error: "Failed to create PayPal order" });
    }
  });

  // PayPal Capture Order
  app.post("/api/paypal/order/:orderID/capture", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const { orderID } = req.params;
      
      // Mock response since we don't have PayPal secrets yet
      res.json({
        id: orderID,
        status: "COMPLETED",
        captureId: `capture_${Date.now()}`,
        message: "PayPal order captured (demo mode - requires PayPal API keys for live processing)"
      });
    } catch (error: any) {
      console.error("Error capturing PayPal order:", error);
      res.status(500).json({ error: "Failed to capture PayPal order" });
    }
  });

  // Subscription Upgrade
  app.post("/api/subscription/upgrade", authMiddleware, async (req: TenantRequest, res) => {
    try {
      const { planId, paymentMethod, paymentData } = req.body;
      const userId = req.user?.id;
      const organizationId = req.organizationId;

      console.log(`Upgrading subscription for user ${userId} to plan ${planId} using ${paymentMethod}`);

      // Update subscription in storage
      await storage.updateSubscription(organizationId, {
        plan: planId,
        status: "active",
        paymentMethod,
        updatedAt: new Date()
      });

      res.json({
        success: true,
        message: `Subscription upgraded to ${planId} plan`,
        paymentMethod,
        planId
      });
    } catch (error: any) {
      console.error("Error upgrading subscription:", error);
      res.status(500).json({ error: "Failed to upgrade subscription" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
