import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { authService } from "./services/auth";
import { aiService } from "./services/ai";
import { tenantMiddleware, authMiddleware, requireRole, gdprComplianceMiddleware, type TenantRequest } from "./middleware/tenant";

export async function registerRoutes(app: Express): Promise<Server> {
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

  app.post("/api/users", requireRole(["admin"]), async (req: TenantRequest, res) => {
    try {
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

  const httpServer = createServer(app);
  return httpServer;
}
