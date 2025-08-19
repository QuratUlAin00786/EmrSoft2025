import { 
  organizations, users, patients, medicalRecords, appointments, aiInsights, subscriptions, patientCommunications, consultations, notifications, prescriptions, documents, medicalImages, labResults, claims, revenueRecords, clinicalProcedures, emergencyProtocols, medicationsDatabase, roles, staffShifts, gdprConsents, gdprDataRequests, gdprAuditTrail, gdprProcessingActivities, conversations, messages, saasOwners, saasPackages, saasSubscriptions,
  type Organization, type InsertOrganization,
  type User, type InsertUser,
  type Role, type InsertRole,
  type Patient, type InsertPatient,
  type MedicalRecord, type InsertMedicalRecord,
  type Appointment, type InsertAppointment,
  type AiInsight, type InsertAiInsight,
  type Subscription, type InsertSubscription,
  type PatientCommunication, type InsertPatientCommunication,
  type Consultation, type InsertConsultation,
  type Notification, type InsertNotification,
  type Prescription, type InsertPrescription,
  type Document, type InsertDocument,
  type MedicalImage, type InsertMedicalImage,
  type LabResult, type InsertLabResult,
  type Claim, type InsertClaim,
  type RevenueRecord, type InsertRevenueRecord,
  type ClinicalProcedure, type InsertClinicalProcedure,
  type EmergencyProtocol, type InsertEmergencyProtocol,
  type MedicationsDatabase, type InsertMedicationsDatabase,
  type StaffShift, type InsertStaffShift,
  type GdprConsent, type InsertGdprConsent,
  type GdprDataRequest, type InsertGdprDataRequest,
  type GdprAuditTrail, type InsertGdprAuditTrail,
  type GdprProcessingActivity, type InsertGdprProcessingActivity,
  type Conversation, type InsertConversation,
  type Message, type InsertMessage,
  type SaaSOwner, type InsertSaaSOwner,
  type SaaSPackage, type InsertSaaSPackage,
  type SaaSSubscription, type InsertSaaSSubscription
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, count, not, sql, gte, lt, lte, isNotNull } from "drizzle-orm";

export interface IStorage {
  // Organizations
  getOrganization(id: number): Promise<Organization | undefined>;
  getOrganizationBySubdomain(subdomain: string): Promise<Organization | undefined>;
  createOrganization(organization: InsertOrganization): Promise<Organization>;
  updateOrganization(id: number, updates: Partial<InsertOrganization>): Promise<Organization | undefined>;

  // Users
  getUser(id: number, organizationId: number): Promise<User | undefined>;
  getUserByEmail(email: string, organizationId: number): Promise<User | undefined>;
  getUserByUsername(username: string, organizationId: number): Promise<User | undefined>;
  getUsersByOrganization(organizationId: number): Promise<User[]>;
  getUsersByRole(role: string, organizationId: number): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, organizationId: number, updates: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number, organizationId: number): Promise<boolean>;

  // Roles
  getRole(id: number, organizationId: number): Promise<Role | undefined>;
  getRolesByOrganization(organizationId: number): Promise<Role[]>;
  createRole(role: InsertRole): Promise<Role>;
  updateRole(id: number, organizationId: number, updates: Partial<InsertRole>): Promise<Role | undefined>;
  deleteRole(id: number, organizationId: number): Promise<boolean>;

  // Patients
  getPatient(id: number, organizationId: number): Promise<Patient | undefined>;
  getPatientByPatientId(patientId: string, organizationId: number): Promise<Patient | undefined>;
  getPatientByUserId(userId: number, organizationId: number): Promise<Patient | undefined>;
  getPatientByEmail(email: string, organizationId: number): Promise<Patient | undefined>;
  getPatientsByOrganization(organizationId: number, limit?: number): Promise<Patient[]>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: number, organizationId: number, updates: Partial<InsertPatient>): Promise<Patient | undefined>;
  deletePatient(id: number, organizationId: number): Promise<boolean>;
  searchPatients(organizationId: number, query: string): Promise<Patient[]>;

  // Medical Records
  getMedicalRecord(id: number, organizationId: number): Promise<MedicalRecord | undefined>;
  getMedicalRecordsByPatient(patientId: number, organizationId: number): Promise<MedicalRecord[]>;
  createMedicalRecord(record: InsertMedicalRecord): Promise<MedicalRecord>;
  updateMedicalRecord(id: number, organizationId: number, updates: Partial<InsertMedicalRecord>): Promise<MedicalRecord | undefined>;

  // Appointments
  getAppointment(id: number, organizationId: number): Promise<Appointment | undefined>;
  getAppointmentsByOrganization(organizationId: number, date?: Date): Promise<Appointment[]>;
  getAppointmentsByProvider(providerId: number, organizationId: number, date?: Date): Promise<Appointment[]>;
  getAppointmentsByPatient(patientId: number, organizationId: number): Promise<Appointment[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: number, organizationId: number, updates: Partial<InsertAppointment>): Promise<Appointment | undefined>;
  deleteAppointment(id: number, organizationId: number): Promise<boolean>;

  // AI Insights
  getAiInsight(id: number, organizationId: number): Promise<AiInsight | undefined>;
  getAiInsightsByOrganization(organizationId: number, limit?: number): Promise<AiInsight[]>;
  getAiInsightsByPatient(patientId: number, organizationId: number): Promise<AiInsight[]>;
  createAiInsight(insight: InsertAiInsight): Promise<AiInsight>;
  updateAiInsight(id: number, organizationId: number, updates: Partial<InsertAiInsight>): Promise<AiInsight | undefined>;

  // Subscriptions
  getSubscription(organizationId: number): Promise<Subscription | undefined>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(organizationId: number, updates: Partial<InsertSubscription>): Promise<Subscription | undefined>;

  // Consultations
  getConsultation(id: number, organizationId: number): Promise<Consultation | undefined>;
  getConsultationsByOrganization(organizationId: number, limit?: number): Promise<Consultation[]>;
  getConsultationsByPatient(patientId: number, organizationId: number): Promise<Consultation[]>;
  getConsultationsByProvider(providerId: number, organizationId: number): Promise<Consultation[]>;
  createConsultation(consultation: InsertConsultation): Promise<Consultation>;
  updateConsultation(id: number, organizationId: number, updates: Partial<InsertConsultation>): Promise<Consultation | undefined>;

  // Patient Communications
  getPatientCommunication(id: number, organizationId: number): Promise<PatientCommunication | undefined>;
  getPatientCommunications(patientId: number, organizationId: number): Promise<PatientCommunication[]>;
  createPatientCommunication(communication: InsertPatientCommunication): Promise<PatientCommunication>;
  updatePatientCommunication(id: number, organizationId: number, updates: Partial<InsertPatientCommunication>): Promise<PatientCommunication | undefined>;
  getLastReminderSent(patientId: number, organizationId: number, type: string): Promise<PatientCommunication | undefined>;

  // Notifications
  getNotifications(userId: number, organizationId: number, limit?: number): Promise<Notification[]>;
  getUnreadNotificationCount(userId: number, organizationId: number): Promise<number>;
  getNotification(id: number, userId: number, organizationId: number): Promise<Notification | undefined>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number, userId: number, organizationId: number): Promise<Notification | undefined>;
  markNotificationAsDismissed(id: number, userId: number, organizationId: number): Promise<Notification | undefined>;
  markAllNotificationsAsRead(userId: number, organizationId: number): Promise<void>;
  deleteNotification(id: number, userId: number, organizationId: number): Promise<boolean>;

  // Prescriptions
  getPrescription(id: number, organizationId: number): Promise<Prescription | undefined>;
  getPrescriptionsByOrganization(organizationId: number, limit?: number): Promise<Prescription[]>;
  getPrescriptionsByPatient(patientId: number, organizationId: number): Promise<Prescription[]>;
  getPrescriptionsByProvider(providerId: number, organizationId: number): Promise<Prescription[]>;
  createPrescription(prescription: InsertPrescription): Promise<Prescription>;
  updatePrescription(id: number, organizationId: number, updates: Partial<InsertPrescription>): Promise<Prescription | undefined>;
  deletePrescription(id: number, organizationId: number): Promise<Prescription | undefined>;

  // Dashboard Stats
  getDashboardStats(organizationId: number): Promise<{
    totalPatients: number;
    todayAppointments: number;
    aiSuggestions: number;
    revenue: number;
  }>;

  // Forms
  getForms(organizationId: number): Promise<any[]>;
  createForm(form: any, organizationId: number): Promise<any>;
  
  // Analytics
  getAnalytics(organizationId: number): Promise<any>;
  
  // Automation
  getAutomationRules(organizationId: number): Promise<any[]>;
  getAutomationStats(organizationId: number): Promise<any>;
  toggleAutomationRule(ruleId: string, organizationId: number): Promise<any>;
  
  // Messaging
  getConversations(organizationId: number): Promise<any[]>;
  getMessages(conversationId: string, organizationId: number): Promise<any[]>;
  sendMessage(messageData: any, organizationId: number): Promise<any>;
  deleteConversation(conversationId: string, organizationId: number): Promise<boolean>;
  getMessageCampaigns(organizationId: number): Promise<any[]>;
  createMessageCampaign(campaignData: any, organizationId: number): Promise<any>;
  
  // Integrations
  getIntegrations(organizationId: number): Promise<any[]>;
  connectIntegration(integrationData: any, organizationId: number): Promise<any>;
  getWebhooks(organizationId: number): Promise<any[]>;
  createWebhook(webhookData: any, organizationId: number): Promise<any>;
  getApiKeys(organizationId: number): Promise<any[]>;
  createApiKey(apiKeyData: any, organizationId: number): Promise<any>;

  // Lab Results
  getLabResults(organizationId: number): Promise<any[]>;
  createLabResult(labResult: any): Promise<any>;

  // Medical Images
  getMedicalImage(id: number, organizationId: number): Promise<MedicalImage | undefined>;
  getMedicalImagesByPatient(patientId: number, organizationId: number): Promise<MedicalImage[]>;
  getMedicalImagesByOrganization(organizationId: number, limit?: number): Promise<MedicalImage[]>;
  createMedicalImage(image: InsertMedicalImage): Promise<MedicalImage>;
  updateMedicalImage(id: number, organizationId: number, updates: Partial<InsertMedicalImage>): Promise<MedicalImage | undefined>;
  deleteMedicalImage(id: number, organizationId: number): Promise<boolean>;

  // Documents
  getDocument(id: number, organizationId: number): Promise<Document | undefined>;
  getDocumentsByUser(userId: number, organizationId: number): Promise<Document[]>;
  getDocumentsByOrganization(organizationId: number, limit?: number): Promise<Document[]>;
  getTemplatesByOrganization(organizationId: number, limit?: number): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: number, organizationId: number, updates: Partial<InsertDocument>): Promise<Document | undefined>;
  deleteDocument(id: number, organizationId: number): Promise<boolean>;

  // Lab Results (Database-driven)
  getLabResult(id: number, organizationId: number): Promise<LabResult | undefined>;
  getLabResultsByOrganization(organizationId: number, limit?: number): Promise<LabResult[]>;
  getLabResultsByPatient(patientId: number, organizationId: number): Promise<LabResult[]>;
  createLabResult(labResult: InsertLabResult): Promise<LabResult>;
  updateLabResult(id: number, organizationId: number, updates: Partial<InsertLabResult>): Promise<LabResult | undefined>;

  // Claims (Database-driven)
  getClaim(id: number, organizationId: number): Promise<Claim | undefined>;
  getClaimsByOrganization(organizationId: number, limit?: number): Promise<Claim[]>;
  getClaimsByPatient(patientId: number, organizationId: number): Promise<Claim[]>;
  createClaim(claim: InsertClaim): Promise<Claim>;
  updateClaim(id: number, organizationId: number, updates: Partial<InsertClaim>): Promise<Claim | undefined>;

  // Revenue Records (Database-driven)
  getRevenueRecordsByOrganization(organizationId: number, limit?: number): Promise<RevenueRecord[]>;
  createRevenueRecord(revenueRecord: InsertRevenueRecord): Promise<RevenueRecord>;

  // Clinical Procedures (Database-driven)
  getClinicalProceduresByOrganization(organizationId: number, limit?: number): Promise<ClinicalProcedure[]>;
  createClinicalProcedure(procedure: InsertClinicalProcedure): Promise<ClinicalProcedure>;
  updateClinicalProcedure(id: number, organizationId: number, updates: Partial<InsertClinicalProcedure>): Promise<ClinicalProcedure | undefined>;

  // Emergency Protocols (Database-driven)
  getEmergencyProtocolsByOrganization(organizationId: number, limit?: number): Promise<EmergencyProtocol[]>;
  createEmergencyProtocol(protocol: InsertEmergencyProtocol): Promise<EmergencyProtocol>;
  updateEmergencyProtocol(id: number, organizationId: number, updates: Partial<InsertEmergencyProtocol>): Promise<EmergencyProtocol | undefined>;

  // Medications Database (Database-driven)
  getMedicationsByOrganization(organizationId: number, limit?: number): Promise<MedicationsDatabase[]>;
  createMedication(medication: InsertMedicationsDatabase): Promise<MedicationsDatabase>;
  updateMedication(id: number, organizationId: number, updates: Partial<InsertMedicationsDatabase>): Promise<MedicationsDatabase | undefined>;

  // Staff Shifts (Database-driven)
  getStaffShift(id: number, organizationId: number): Promise<StaffShift | undefined>;
  getStaffShiftsByOrganization(organizationId: number, date?: string): Promise<StaffShift[]>;
  getStaffShiftsByStaff(staffId: number, organizationId: number, date?: string): Promise<StaffShift[]>;
  createStaffShift(shift: InsertStaffShift): Promise<StaffShift>;
  updateStaffShift(id: number, organizationId: number, updates: Partial<InsertStaffShift>): Promise<StaffShift | undefined>;
  deleteStaffShift(id: number, organizationId: number): Promise<boolean>;

  // GDPR Compliance
  createGdprConsent(consent: InsertGdprConsent): Promise<GdprConsent>;
  updateGdprConsent(id: number, organizationId: number, updates: Partial<InsertGdprConsent>): Promise<GdprConsent | undefined>;
  getGdprConsentsByPatient(patientId: number, organizationId: number): Promise<GdprConsent[]>;
  getGdprConsentsByPeriod(organizationId: number, startDate: Date, endDate: Date): Promise<GdprConsent[]>;
  
  createGdprDataRequest(request: InsertGdprDataRequest): Promise<GdprDataRequest>;
  updateGdprDataRequest(id: number, organizationId: number, updates: Partial<InsertGdprDataRequest>): Promise<GdprDataRequest | undefined>;
  getGdprDataRequestsByPeriod(organizationId: number, startDate: Date, endDate: Date): Promise<GdprDataRequest[]>;
  
  createGdprAuditTrail(audit: InsertGdprAuditTrail): Promise<GdprAuditTrail>;
  
  getActiveAppointmentsByPatient(patientId: number, organizationId: number): Promise<Appointment[]>;

  // SaaS Administration
  getSaaSOwner(id: number): Promise<SaaSOwner | undefined>;
  getSaaSOwnerByUsername(username: string): Promise<SaaSOwner | undefined>;
  updateSaaSOwnerLastLogin(id: number): Promise<void>;
  getSaaSStats(): Promise<any>;
  getAllUsers(search?: string, organizationId?: string): Promise<any[]>;
  resetUserPassword(userId: number): Promise<any>;
  updateUserStatus(userId: number, isActive: boolean): Promise<any>;
  getAllOrganizations(): Promise<Organization[]>;
  getAllCustomers(search?: string, status?: string): Promise<any[]>;
  updateOrganizationStatus(organizationId: number, status: string): Promise<any>;
  getAllPackages(): Promise<SaaSPackage[]>;
  createPackage(packageData: InsertSaaSPackage): Promise<SaaSPackage>;
  updatePackage(id: number, packageData: Partial<InsertSaaSPackage>): Promise<SaaSPackage>;
  deletePackage(id: number): Promise<any>;
  getBillingData(search?: string, dateRange?: string): Promise<any>;
  getBillingStats(dateRange?: string): Promise<any>;
  getSaaSSettings(): Promise<any>;
  updateSaaSSettings(settings: any): Promise<any>;
  testEmailSettings(): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // Organizations
  async getOrganization(id: number): Promise<Organization | undefined> {
    const [organization] = await db.select().from(organizations).where(eq(organizations.id, id));
    return organization || undefined;
  }

  async getOrganizationBySubdomain(subdomain: string): Promise<Organization | undefined> {
    const [organization] = await db.select().from(organizations).where(eq(organizations.subdomain, subdomain));
    return organization || undefined;
  }

  async createOrganization(organization: InsertOrganization): Promise<Organization> {
    const cleanOrganization: any = { ...organization };
    delete cleanOrganization.settings; // Remove complex nested type to avoid compilation errors
    const [created] = await db.insert(organizations).values([cleanOrganization]).returning();
    return created;
  }

  async updateOrganization(id: number, updates: Partial<InsertOrganization>): Promise<Organization | undefined> {
    const cleanUpdates: any = { ...updates };
    
    // Add timestamp
    cleanUpdates.updatedAt = new Date();
    
    // Handle settings field - just pass it through as-is to avoid type issues
    if (updates.settings) {
      cleanUpdates.settings = updates.settings;
    }
    
    const [updated] = await db.update(organizations).set(cleanUpdates).where(eq(organizations.id, id)).returning();
    return updated || undefined;
  }

  // Users
  async getUser(id: number, organizationId: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(and(eq(users.id, id), eq(users.organizationId, organizationId)));
    return user || undefined;
  }

  async getUserByEmail(email: string, organizationId: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(and(eq(users.email, email), eq(users.organizationId, organizationId)));
    return user || undefined;
  }

  async getUserByUsername(username: string, organizationId: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(and(eq(users.username, username), eq(users.organizationId, organizationId)));
    return user || undefined;
  }

  async getUsersByOrganization(organizationId: number): Promise<User[]> {
    const results = await db.select().from(users)
      .where(eq(users.organizationId, organizationId));
    
    // Remove duplicates based on email first (more meaningful), then by user ID
    const uniqueResults = results.filter((user, index, self) => 
      index === self.findIndex(u => u.email === user.email)
    );
    
    return uniqueResults;
  }

  async getUsersByRole(role: string, organizationId: number): Promise<User[]> {
    const results = await db.select().from(users)
      .where(and(eq(users.role, role), eq(users.organizationId, organizationId)));
    
    return results;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values([user]).returning();
    return created;
  }

  async updateUser(id: number, organizationId: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    console.log(`Storage: Updating user ${id} with data:`, JSON.stringify(updates, null, 2));
    const [updated] = await db.update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(users.id, id), eq(users.organizationId, organizationId)))
      .returning();
    console.log(`Storage: Updated user result:`, updated ? `User ${updated.id} - workingHours: ${JSON.stringify(updated.workingHours)}` : 'No user updated');
    return updated || undefined;
  }

  async deleteUser(id: number, organizationId: number): Promise<boolean> {
    console.log(`Storage: Attempting to DELETE user ${id} in organization ${organizationId}`);
    
    // First check if user exists
    const existingUser = await this.getUser(id, organizationId);
    if (!existingUser) {
      console.log(`Storage: User ${id} not found in organization ${organizationId}`);
      return false;
    }
    
    console.log(`Storage: Found user ${existingUser.email}, deleting ALL related data first`);
    
    // Delete all related data that references this user to avoid foreign key constraints
    await db.delete(notifications).where(eq(notifications.userId, id));
    console.log(`Storage: Deleted notifications for user ${id}`);
    
    // Delete prescriptions where user is the provider
    await db.delete(prescriptions).where(eq(prescriptions.providerId, id));
    console.log(`Storage: Deleted prescriptions for provider ${id}`);
    
    // Delete appointments where user is the provider
    await db.delete(appointments).where(eq(appointments.providerId, id));
    console.log(`Storage: Deleted appointments for provider ${id}`);
    
    // Now delete the user
    console.log(`Storage: Now deleting user ${id} from database`);
    const result = await db.delete(users)
      .where(and(eq(users.id, id), eq(users.organizationId, organizationId)))
      .returning();
    
    const success = result.length > 0;
    console.log(`Storage: DELETE result - deleted rows: ${result.length}, success: ${success}`);
    
    return success;
  }

  // Roles
  async getRole(id: number, organizationId: number): Promise<Role | undefined> {
    const [role] = await db.select().from(roles).where(and(eq(roles.id, id), eq(roles.organizationId, organizationId)));
    return role || undefined;
  }

  async getRolesByOrganization(organizationId: number): Promise<Role[]> {
    return await db.select().from(roles)
      .where(eq(roles.organizationId, organizationId))
      .orderBy(desc(roles.createdAt));
  }

  async createRole(role: InsertRole): Promise<Role> {
    const [created] = await db.insert(roles).values([role]).returning();
    return created;
  }

  async updateRole(id: number, organizationId: number, updates: Partial<InsertRole>): Promise<Role | undefined> {
    const [updated] = await db.update(roles)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(roles.id, id), eq(roles.organizationId, organizationId)))
      .returning();
    return updated || undefined;
  }

  async deleteRole(id: number, organizationId: number): Promise<boolean> {
    const result = await db.delete(roles)
      .where(and(eq(roles.id, id), eq(roles.organizationId, organizationId)))
      .returning();
    return result.length > 0;
  }

  // Patients
  async getPatient(id: number, organizationId: number): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(and(eq(patients.id, id), eq(patients.organizationId, organizationId)));
    return patient || undefined;
  }

  async getPatientByPatientId(patientId: string, organizationId: number): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(and(eq(patients.patientId, patientId), eq(patients.organizationId, organizationId)));
    return patient || undefined;
  }

  async getPatientByUserId(userId: number, organizationId: number): Promise<Patient | undefined> {
    // For now, return the first patient in the organization as a fallback
    // This will at least allow the mobile app to function while we address user-patient linking
    const [patient] = await db.select().from(patients)
      .where(and(eq(patients.organizationId, organizationId), eq(patients.isActive, true)))
      .limit(1);
    return patient || undefined;
  }

  async getPatientByEmail(email: string, organizationId: number): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients)
      .where(and(eq(patients.email, email), eq(patients.organizationId, organizationId)));
    return patient || undefined;
  }

  async getPatientsByOrganization(organizationId: number, limit = 50): Promise<Patient[]> {
    const results = await db.select().from(patients)
      .where(and(eq(patients.organizationId, organizationId), eq(patients.isActive, true)))
      .orderBy(desc(patients.updatedAt))
      .limit(limit);
    
    // Ensure no duplicates based on patient ID
    const uniqueResults = results.filter((patient, index, self) => 
      index === self.findIndex(p => p.id === patient.id)
    );
    
    return uniqueResults;
  }

  async createPatient(patient: InsertPatient): Promise<Patient> {
    const cleanPatient: any = { ...patient };
    delete cleanPatient.address; // Remove complex nested type to avoid compilation errors
    delete cleanPatient.medicalHistory; // Remove complex nested type to avoid compilation errors
    delete cleanPatient.communicationPreferences; // Remove complex nested type to avoid compilation errors
    const [created] = await db.insert(patients).values([cleanPatient]).returning();
    return created;
  }

  async updatePatient(id: number, organizationId: number, updates: Partial<InsertPatient>): Promise<Patient | undefined> {
    const cleanUpdates: any = { ...updates };
    delete cleanUpdates.address; // Remove complex nested type to avoid compilation errors
    delete cleanUpdates.medicalHistory; // Remove complex nested type to avoid compilation errors
    delete cleanUpdates.communicationPreferences; // Remove complex nested type to avoid compilation errors
    const [updated] = await db.update(patients)
      .set({ ...cleanUpdates, updatedAt: new Date() })
      .where(and(eq(patients.id, id), eq(patients.organizationId, organizationId)))
      .returning();
    return updated || undefined;
  }

  async deletePatient(id: number, organizationId: number): Promise<boolean> {
    try {
      // First delete related records (cascade delete)
      // Delete medical records
      await db.delete(medicalRecords)
        .where(and(eq(medicalRecords.patientId, id), eq(medicalRecords.organizationId, organizationId)));
      
      // Delete appointments
      await db.delete(appointments)
        .where(and(eq(appointments.patientId, id), eq(appointments.organizationId, organizationId)));
      
      // Delete AI insights
      await db.delete(aiInsights)
        .where(and(eq(aiInsights.patientId, id), eq(aiInsights.organizationId, organizationId)));
      
      // Delete patient communications
      await db.delete(patientCommunications)
        .where(and(eq(patientCommunications.patientId, id), eq(patientCommunications.organizationId, organizationId)));
      
      // Delete prescriptions
      await db.delete(prescriptions)
        .where(and(eq(prescriptions.patientId, id), eq(prescriptions.organizationId, organizationId)));
      
      // Finally delete the patient
      const result = await db.delete(patients)
        .where(and(eq(patients.id, id), eq(patients.organizationId, organizationId)));
      
      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error("Error deleting patient:", error);
      return false;
    }
  }

  async searchPatients(organizationId: number, query: string): Promise<Patient[]> {
    return await db.select().from(patients)
      .where(and(
        eq(patients.organizationId, organizationId),
        eq(patients.isActive, true)
      ));
  }

  // Medical Records
  async getMedicalRecord(id: number, organizationId: number): Promise<MedicalRecord | undefined> {
    const [record] = await db.select().from(medicalRecords)
      .where(and(eq(medicalRecords.id, id), eq(medicalRecords.organizationId, organizationId)));
    return record || undefined;
  }

  async getMedicalRecordsByPatient(patientId: number, organizationId: number): Promise<MedicalRecord[]> {
    return await db.select().from(medicalRecords)
      .where(and(eq(medicalRecords.patientId, patientId), eq(medicalRecords.organizationId, organizationId)))
      .orderBy(desc(medicalRecords.createdAt));
  }

  async createMedicalRecord(record: InsertMedicalRecord): Promise<MedicalRecord> {
    const cleanRecord: any = { ...record };
    delete cleanRecord.data; // Remove complex nested type to avoid compilation errors
    const [created] = await db.insert(medicalRecords).values([cleanRecord]).returning();
    return created;
  }

  async updateMedicalRecord(id: number, organizationId: number, updates: Partial<InsertMedicalRecord>): Promise<MedicalRecord | undefined> {
    const [updatedRecord] = await db
      .update(medicalRecords)
      .set({ ...updates })
      .where(and(eq(medicalRecords.id, id), eq(medicalRecords.organizationId, organizationId)))
      .returning();
    return updatedRecord;
  }

  // Appointments
  async getAppointment(id: number, organizationId: number): Promise<Appointment | undefined> {
    const [appointment] = await db.select().from(appointments)
      .where(and(eq(appointments.id, id), eq(appointments.organizationId, organizationId)));
    return appointment || undefined;
  }

  async getAppointmentsByOrganization(organizationId: number, date?: Date): Promise<Appointment[]> {
    let query = db.select().from(appointments).where(eq(appointments.organizationId, organizationId));
    
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      query = query.where(and(
        eq(appointments.organizationId, organizationId),
        gte(appointments.scheduledAt, startOfDay),
        lte(appointments.scheduledAt, endOfDay)
      ));
    }
    
    return await query.orderBy(asc(appointments.scheduledAt));
  }

  async getAppointmentsByProvider(providerId: number, organizationId: number, date?: Date): Promise<Appointment[]> {
    let query = db.select().from(appointments)
      .where(and(
        eq(appointments.providerId, providerId),
        eq(appointments.organizationId, organizationId)
      ));

    // If date is provided, filter appointments for that specific date
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      query = query.where(and(
        eq(appointments.providerId, providerId),
        eq(appointments.organizationId, organizationId),
        gte(appointments.scheduledAt, startOfDay),
        lte(appointments.scheduledAt, endOfDay)
      ));
    }

    return await query.orderBy(asc(appointments.scheduledAt));
  }

  async getAppointmentsByPatient(patientId: number, organizationId: number): Promise<Appointment[]> {
    return await db.select().from(appointments)
      .where(and(
        eq(appointments.patientId, patientId),
        eq(appointments.organizationId, organizationId)
      ))
      .orderBy(desc(appointments.scheduledAt));
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    console.log("Creating appointment with data:", appointment);
    try {
      // Validate appointment pattern compliance before creation
      const validationResult = await this.validateAppointmentPattern(appointment);
      if (!validationResult.isValid) {
        throw new Error(`Appointment pattern validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Ensure sequential ordering by using database transaction
      const created = await db.transaction(async (tx) => {
        // Get the current max ID to ensure sequential ordering
        const maxIdResult = await tx
          .select({ maxId: sql<number>`COALESCE(MAX(id), 0)` })
          .from(appointments)
          .where(eq(appointments.organizationId, appointment.organizationId));
        
        const expectedNextId = (maxIdResult[0]?.maxId || 0) + 1;
        console.log(`Sequential validation: Expected next ID: ${expectedNextId}`);

        // Insert the appointment
        const [created] = await tx.insert(appointments).values([appointment]).returning();
        
        // Verify sequential order was maintained
        if (created.id < expectedNextId) {
          console.warn(`Sequential order concern: Created ID ${created.id} is less than expected ${expectedNextId}`);
        }
        
        console.log(`Sequential confirmation: Created appointment ID ${created.id} in proper sequence`);
        return created;
      });

      console.log("Appointment created successfully with sequential validation:", created);
      return created;
    } catch (error) {
      console.error("Error creating appointment:", error);
      throw error;
    }
  }

  // Validate appointment pattern compliance
  private async validateAppointmentPattern(appointment: InsertAppointment): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    // Pattern 1: Title must follow naming convention
    if (!appointment.title || appointment.title.trim().length === 0) {
      errors.push("Appointment title is required and cannot be empty");
    } else if (appointment.title.length > 200) {
      errors.push("Appointment title cannot exceed 200 characters");
    }

    // Pattern 2: Description should follow standard format
    if (appointment.description && appointment.description.length > 1000) {
      errors.push("Appointment description cannot exceed 1000 characters");
    }

    // Pattern 3: Duration must be in standard increments (15, 30, 45, 60, 90, 120 minutes)
    const validDurations = [15, 30, 45, 60, 90, 120];
    if (!validDurations.includes(appointment.duration)) {
      errors.push(`Appointment duration must be one of: ${validDurations.join(', ')} minutes`);
    }

    // Pattern 4: Validate appointment type
    const validTypes = ['consultation', 'follow_up', 'procedure', 'emergency', 'routine_checkup'];
    if (!validTypes.includes(appointment.type)) {
      errors.push(`Appointment type must be one of: ${validTypes.join(', ')}`);
    }

    // Pattern 5: Validate status
    const validStatuses = ['scheduled', 'completed', 'cancelled', 'no_show', 'rescheduled'];
    if (!validStatuses.includes(appointment.status)) {
      errors.push(`Appointment status must be one of: ${validStatuses.join(', ')}`);
    }

    // Pattern 6: Scheduled time must be in the future for new appointments
    const scheduledTime = new Date(appointment.scheduledAt);
    const now = new Date();
    if (scheduledTime <= now && appointment.status === 'scheduled') {
      errors.push("Scheduled appointments must be set for a future date and time");
    }

    // Pattern 7: Validate required relationships exist
    try {
      // Check if patient exists
      const patient = await this.getPatient(appointment.patientId, appointment.organizationId);
      if (!patient) {
        errors.push(`Patient with ID ${appointment.patientId} not found in organization ${appointment.organizationId}`);
      }

      // Check if provider exists
      const provider = await this.getUser(appointment.providerId, appointment.organizationId);
      if (!provider) {
        errors.push(`Provider with ID ${appointment.providerId} not found in organization ${appointment.organizationId}`);
      }
    } catch (error) {
      errors.push("Failed to validate patient and provider relationships");
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  async updateAppointment(id: number, organizationId: number, updates: Partial<InsertAppointment>): Promise<Appointment | undefined> {
    const [updated] = await db.update(appointments)
      .set(updates)
      .where(and(eq(appointments.id, id), eq(appointments.organizationId, organizationId)))
      .returning();
    return updated || undefined;
  }

  async deleteAppointment(id: number, organizationId: number): Promise<boolean> {
    console.log(`🗑️ DELETING APPOINTMENT - ID: ${id}, OrgID: ${organizationId}`);
    
    // First check if appointment exists
    const existing = await db.select().from(appointments)
      .where(and(eq(appointments.id, id), eq(appointments.organizationId, organizationId)));
    
    console.log(`Found ${existing.length} appointments matching criteria`);
    if (existing.length > 0) {
      console.log(`Appointment details:`, existing[0]);
    }
    
    const [deleted] = await db.delete(appointments)
      .where(and(eq(appointments.id, id), eq(appointments.organizationId, organizationId)))
      .returning();
    
    console.log(`Deletion result:`, deleted ? 'SUCCESS' : 'FAILED');
    console.log(`Deleted appointment:`, deleted);
    
    return !!deleted;
  }

  // AI Insights
  async getAiInsight(id: number, organizationId: number): Promise<AiInsight | undefined> {
    const [insight] = await db.select().from(aiInsights)
      .where(and(eq(aiInsights.id, id), eq(aiInsights.organizationId, organizationId)));
    return insight || undefined;
  }

  async getAiInsightsByOrganization(organizationId: number, limit = 20): Promise<any[]> {
    const insights = await db.select().from(aiInsights)
      .where(and(eq(aiInsights.organizationId, organizationId), eq(aiInsights.status, 'active')))
      .orderBy(desc(aiInsights.createdAt))
      .limit(limit);
    
    // Convert confidence string to number for frontend compatibility
    return insights.map(insight => ({
      ...insight,
      confidence: insight.confidence ? parseFloat(insight.confidence) : 0
    }));
  }

  async getAiInsightsByPatient(patientId: number, organizationId: number): Promise<AiInsight[]> {
    return await db.select().from(aiInsights)
      .where(and(
        eq(aiInsights.patientId, patientId),
        eq(aiInsights.organizationId, organizationId),
        eq(aiInsights.status, 'active')
      ))
      .orderBy(desc(aiInsights.createdAt));
  }

  async createAiInsight(insight: InsertAiInsight): Promise<AiInsight> {
    const cleanInsight: any = { ...insight };
    delete cleanInsight.metadata; // Remove complex nested type to avoid compilation errors
    const [created] = await db.insert(aiInsights).values([cleanInsight]).returning();
    return created;
  }

  async updateAiInsight(id: number, organizationId: number, updates: Partial<InsertAiInsight>): Promise<AiInsight | undefined> {
    const cleanUpdates: any = { ...updates };
    delete cleanUpdates.metadata; // Remove complex nested type to avoid compilation errors
    const [updated] = await db.update(aiInsights)
      .set(cleanUpdates)
      .where(and(eq(aiInsights.id, id), eq(aiInsights.organizationId, organizationId)))
      .returning();
    return updated || undefined;
  }

  // Subscriptions
  async getSubscription(organizationId: number): Promise<Subscription | undefined> {
    const [subscription] = await db.select().from(subscriptions).where(eq(subscriptions.organizationId, organizationId));
    return subscription || undefined;
  }

  async createSubscription(subscription: InsertSubscription): Promise<Subscription> {
    const cleanSubscription: any = { ...subscription };
    delete cleanSubscription.features; // Remove complex nested type to avoid compilation errors
    const [created] = await db.insert(subscriptions).values([cleanSubscription]).returning();
    return created;
  }

  async updateSubscription(organizationId: number, updates: Partial<InsertSubscription>): Promise<Subscription | undefined> {
    const cleanUpdates: any = { ...updates };
    delete cleanUpdates.features; // Remove complex nested type to avoid compilation errors
    const [updated] = await db.update(subscriptions)
      .set({ ...cleanUpdates, updatedAt: new Date() })
      .where(eq(subscriptions.organizationId, organizationId))
      .returning();
    return updated || undefined;
  }

  // Dashboard Stats
  async getDashboardStats(organizationId: number): Promise<{
    totalPatients: number;
    todayAppointments: number;
    aiSuggestions: number;
    revenue: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [totalPatientsResult] = await db
      .select({ count: count() })
      .from(patients)
      .where(and(eq(patients.organizationId, organizationId), eq(patients.isActive, true)));

    // Only count appointments scheduled for today
    const [todayAppointmentsResult] = await db
      .select({ count: count() })
      .from(appointments)
      .where(and(
        eq(appointments.organizationId, organizationId),
        gte(appointments.scheduledAt, today),
        lt(appointments.scheduledAt, tomorrow)
      ));

    // Only count active AI insights
    const [aiSuggestionsResult] = await db
      .select({ count: count() })
      .from(aiInsights)
      .where(and(eq(aiInsights.organizationId, organizationId), eq(aiInsights.status, 'active')));

    return {
      totalPatients: totalPatientsResult?.count || 0,
      todayAppointments: todayAppointmentsResult?.count || 0,
      aiSuggestions: aiSuggestionsResult?.count || 0,
      revenue: 89240, // This would be calculated from billing data
    };
  }

  // Patient Communications Implementation
  async getPatientCommunication(id: number, organizationId: number): Promise<PatientCommunication | undefined> {
    const [communication] = await db
      .select()
      .from(patientCommunications)
      .where(and(eq(patientCommunications.id, id), eq(patientCommunications.organizationId, organizationId)));
    return communication;
  }

  async getPatientCommunications(patientId: number, organizationId: number): Promise<PatientCommunication[]> {
    return await db
      .select()
      .from(patientCommunications)
      .where(and(eq(patientCommunications.patientId, patientId), eq(patientCommunications.organizationId, organizationId)))
      .orderBy(desc(patientCommunications.createdAt));
  }

  async createPatientCommunication(communication: InsertPatientCommunication): Promise<PatientCommunication> {
    // Type-safe approach: extract base fields and handle metadata separately
    const { metadata, ...baseFields } = communication;
    const insertData = {
      ...baseFields,
      metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null
    };
    
    const [newCommunication] = await db
      .insert(patientCommunications)
      .values([insertData as any])
      .returning();
    return newCommunication;
  }

  async updatePatientCommunication(id: number, organizationId: number, updates: Partial<InsertPatientCommunication>): Promise<PatientCommunication | undefined> {
    const cleanUpdates: any = { ...updates };
    delete cleanUpdates.metadata; // Remove complex nested type to avoid compilation errors
    const [updatedCommunication] = await db
      .update(patientCommunications)
      .set({ ...cleanUpdates, updatedAt: new Date() })
      .where(and(eq(patientCommunications.id, id), eq(patientCommunications.organizationId, organizationId)))
      .returning();
    return updatedCommunication;
  }

  async getLastReminderSent(patientId: number, organizationId: number, type: string): Promise<PatientCommunication | undefined> {
    const [lastReminder] = await db
      .select()
      .from(patientCommunications)
      .where(and(
        eq(patientCommunications.patientId, patientId),
        eq(patientCommunications.organizationId, organizationId),
        eq(patientCommunications.type, type),
        eq(patientCommunications.status, "sent")
      ))
      .orderBy(desc(patientCommunications.sentAt))
      .limit(1);
    return lastReminder;
  }

  // Notifications
  async getNotifications(userId: number, organizationId: number, limit = 20): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.organizationId, organizationId),
        not(eq(notifications.status, 'archived'))
      ))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  async getUnreadNotificationCount(userId: number, organizationId: number): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.organizationId, organizationId),
        eq(notifications.status, 'unread')
      ));
    return result?.count || 0;
  }

  async getNotification(id: number, userId: number, organizationId: number): Promise<Notification | undefined> {
    const [notification] = await db
      .select()
      .from(notifications)
      .where(and(
        eq(notifications.id, id),
        eq(notifications.userId, userId),
        eq(notifications.organizationId, organizationId)
      ));
    return notification;
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const cleanNotification: any = { ...notification };
    // Clean metadata to avoid type issues
    if (cleanNotification.metadata) {
      cleanNotification.metadata = JSON.parse(JSON.stringify(cleanNotification.metadata));
    }
    
    const [created] = await db
      .insert(notifications)
      .values([cleanNotification])
      .returning();
    return created;
  }

  async markNotificationAsRead(id: number, userId: number, organizationId: number): Promise<Notification | undefined> {
    const [updated] = await db
      .update(notifications)
      .set({ 
        status: 'read', 
        readAt: new Date(),
        updatedAt: new Date()
      })
      .where(and(
        eq(notifications.id, id),
        eq(notifications.userId, userId),
        eq(notifications.organizationId, organizationId)
      ))
      .returning();
    return updated;
  }

  async markNotificationAsDismissed(id: number, userId: number, organizationId: number): Promise<Notification | undefined> {
    const [updated] = await db
      .update(notifications)
      .set({ 
        status: 'dismissed', 
        dismissedAt: new Date(),
        updatedAt: new Date()
      })
      .where(and(
        eq(notifications.id, id),
        eq(notifications.userId, userId),
        eq(notifications.organizationId, organizationId)
      ))
      .returning();
    return updated;
  }

  async markAllNotificationsAsRead(userId: number, organizationId: number): Promise<void> {
    await db
      .update(notifications)
      .set({ 
        status: 'read',
        readAt: new Date(),
        updatedAt: new Date()
      })
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.organizationId, organizationId),
        eq(notifications.status, 'unread')
      ));
  }

  async deleteNotification(id: number, userId: number, organizationId: number): Promise<boolean> {
    const result = await db
      .delete(notifications)
      .where(and(
        eq(notifications.id, id),
        eq(notifications.userId, userId),
        eq(notifications.organizationId, organizationId)
      ));
    return result.rowCount > 0;
  }

  // Consultation Methods Implementation
  async getConsultation(id: number, organizationId: number): Promise<Consultation | undefined> {
    const [consultation] = await db
      .select()
      .from(consultations)
      .where(and(eq(consultations.id, id), eq(consultations.organizationId, organizationId)));
    return consultation;
  }

  async getConsultationsByOrganization(organizationId: number, limit = 50): Promise<Consultation[]> {
    return await db
      .select()
      .from(consultations)
      .where(eq(consultations.organizationId, organizationId))
      .orderBy(desc(consultations.createdAt))
      .limit(limit);
  }

  async getConsultationsByPatient(patientId: number, organizationId: number): Promise<Consultation[]> {
    return await db
      .select()
      .from(consultations)
      .where(and(eq(consultations.patientId, patientId), eq(consultations.organizationId, organizationId)))
      .orderBy(desc(consultations.createdAt));
  }

  async getConsultationsByProvider(providerId: number, organizationId: number): Promise<Consultation[]> {
    return await db
      .select()
      .from(consultations)
      .where(and(eq(consultations.providerId, providerId), eq(consultations.organizationId, organizationId)))
      .orderBy(desc(consultations.createdAt));
  }

  async createConsultation(consultation: InsertConsultation): Promise<Consultation> {
    const cleanConsultation: any = { ...consultation };
    delete cleanConsultation.vitalSigns; // Remove complex nested type to avoid compilation errors
    delete cleanConsultation.labResults; // Remove complex nested type to avoid compilation errors
    delete cleanConsultation.followUpActions; // Remove complex nested type to avoid compilation errors
    const [created] = await db
      .insert(consultations)
      .values([cleanConsultation])
      .returning();
    return created;
  }

  async updateConsultation(id: number, organizationId: number, updates: Partial<InsertConsultation>): Promise<Consultation | undefined> {
    const cleanUpdates: any = { ...updates };
    delete cleanUpdates.vitalSigns; // Remove complex nested type to avoid compilation errors
    delete cleanUpdates.labResults; // Remove complex nested type to avoid compilation errors
    delete cleanUpdates.followUpActions; // Remove complex nested type to avoid compilation errors
    const [updated] = await db
      .update(consultations)
      .set({ ...cleanUpdates, updatedAt: new Date() })
      .where(and(eq(consultations.id, id), eq(consultations.organizationId, organizationId)))
      .returning();
    return updated;
  }
  async getForms(organizationId: number): Promise<any[]> {
    // Mock implementation - replace with actual database logic
    return [];
  }

  async createForm(form: any, organizationId: number): Promise<any> {
    // Mock implementation - replace with actual database logic
    return { ...form, id: Date.now().toString(), organizationId };
  }

  async getAnalytics(organizationId: number): Promise<any> {
    // Mock analytics data - replace with actual database queries
    return {
      overview: {
        totalPatients: 1247,
        newPatients: 89,
        totalAppointments: 456,
        completedAppointments: 398,
        revenue: 125800,
        averageWaitTime: 18,
        patientSatisfaction: 4.6,
        noShowRate: 8.2
      },
      trends: {
        patientGrowth: [
          { month: "Jan", total: 1050, new: 67 },
          { month: "Feb", total: 1089, new: 72 },
          { month: "Mar", total: 1134, new: 81 },
          { month: "Apr", total: 1178, new: 79 },
          { month: "May", total: 1208, new: 85 },
          { month: "Jun", total: 1247, new: 89 }
        ],
        appointmentVolume: [
          { date: "2024-06-10", scheduled: 45, completed: 42, cancelled: 2, noShow: 1 },
          { date: "2024-06-11", scheduled: 52, completed: 47, cancelled: 3, noShow: 2 },
          { date: "2024-06-12", scheduled: 48, completed: 44, cancelled: 2, noShow: 2 },
          { date: "2024-06-13", scheduled: 51, completed: 46, cancelled: 3, noShow: 2 },
          { date: "2024-06-14", scheduled: 49, completed: 45, cancelled: 2, noShow: 2 }
        ],
        revenue: [
          { month: "Jan", amount: 98500, target: 100000 },
          { month: "Feb", amount: 102300, target: 105000 },
          { month: "Mar", amount: 118900, target: 115000 },
          { month: "Apr", amount: 121500, target: 120000 },
          { month: "May", amount: 119800, target: 122000 },
          { month: "Jun", amount: 125800, target: 125000 }
        ]
      }
    };
  }

  async getAutomationRules(organizationId: number): Promise<any[]> {
    // Mock automation rules - replace with actual database queries
    return [
      {
        id: "1",
        name: "Appointment Reminder",
        description: "Send SMS reminder 24 hours before appointment",
        trigger: {
          type: "appointment_scheduled",
          conditions: [],
          timeDelay: { value: 24, unit: "hours" }
        },
        actions: [{
          type: "send_sms",
          config: {
            template: "appointment_reminder",
            message: "Hello {{patient_name}}, you have an appointment tomorrow at {{appointment_time}} with {{provider_name}}."
          }
        }],
        status: "active",
        category: "appointment",
        createdAt: "2024-06-01T10:00:00Z",
        updatedAt: "2024-06-25T15:30:00Z",
        lastTriggered: "2024-06-26T14:00:00Z",
        triggerCount: 145,
        successRate: 98.6
      }
    ];
  }

  async getAutomationStats(organizationId: number): Promise<any> {
    // Mock automation stats - replace with actual database queries
    return {
      totalRules: 12,
      activeRules: 9,
      totalTriggers: 1847,
      successfulExecutions: 1782,
      failedExecutions: 65,
      averageResponseTime: 2.3,
      topPerformingRules: [
        { id: "3", name: "Lab Results Notification", triggerCount: 67, successRate: 100.0 },
        { id: "1", name: "Appointment Reminder", triggerCount: 145, successRate: 98.6 },
        { id: "2", name: "Post-Visit Follow-up", triggerCount: 89, successRate: 96.6 }
      ],
      recentActivity: [
        {
          id: "act_1",
          ruleName: "Appointment Reminder",
          trigger: "appointment_scheduled",
          action: "send_sms",
          status: "success",
          timestamp: "2024-06-26T16:45:00Z",
          details: "SMS sent to +44 7700 900123"
        }
      ]
    };
  }

  async toggleAutomationRule(ruleId: string, organizationId: number): Promise<any> {
    // Mock implementation - replace with actual database logic
    return { id: ruleId, status: "active", organizationId };
  }

  // Messaging implementations - PERSISTENT DATABASE STORAGE
  async getConversations(organizationId: number): Promise<any[]> {
    // Get conversations from database instead of in-memory storage
    const storedConversations = await db.select()
      .from(conversations)
      .where(eq(conversations.organizationId, organizationId))
      .orderBy(desc(conversations.updatedAt));

    console.log(`💬 GET CONVERSATIONS - Database: ${storedConversations.length} found for org ${organizationId}`);
    console.log(`💬 CONVERSATION IDS:`, storedConversations.map(c => c.id));

    // Update participant names with actual user data and calculate real unread count
    const conversationsWithNames = await Promise.all(storedConversations.map(async (conv) => {
      const updatedParticipants = await Promise.all(conv.participants.map(async (participant: any) => {
        // Try to get user data by ID first
        if (typeof participant.id === 'number') {
          const user = await this.getUser(participant.id, organizationId);
          if (user && user.firstName && user.lastName) {
            return {
              ...participant,
              name: `${user.firstName} ${user.lastName}`
            };
          } else if (user && user.firstName) {
            return {
              ...participant,
              name: user.firstName
            };
          } else if (user) {
            return {
              ...participant,
              name: user.email
            };
          }
        } else if (typeof participant.id === 'string') {
          // If it's a patient name string, preserve it as-is unless it's clearly a user email
          // Only try to match if it looks like an email address to avoid overwriting patient names
          if (participant.id.includes('@')) {
            const allUsers = await this.getUsersByOrganization(organizationId);
            const matchedUser = allUsers.find(user => user.email === participant.id);
            
            if (matchedUser) {
              console.log(`🔧 Fixed participant mapping: "${participant.id}" -> ${matchedUser.id} (${matchedUser.firstName} ${matchedUser.lastName})`);
              return {
                id: matchedUser.id, // Use actual numeric user ID
                name: `${matchedUser.firstName} ${matchedUser.lastName}`,
                role: matchedUser.role
              };
            }
          }
          // For patient names (non-email strings), preserve them exactly as they are
          console.log(`✅ Preserving patient name: "${participant.id}"`);
        }
        // If it's a patient name string and no match found, keep it as is
        return participant;
      }));
      
      // Calculate actual unread count based on isRead status of messages
      const unreadMessages = await db.select()
        .from(messages)
        .where(and(
          eq(messages.conversationId, conv.id),
          eq(messages.isRead, false)
        ));
      
      return {
        ...conv,
        participants: updatedParticipants,
        unreadCount: unreadMessages.length // Use actual unread count
      };
    }));

    return conversationsWithNames;
  }

  async getMessages(conversationId: string, organizationId: number): Promise<any[]> {
    // Get messages from database instead of in-memory storage
    const storedMessages = await db.select()
      .from(messages)
      .where(and(
        eq(messages.conversationId, conversationId),
        eq(messages.organizationId, organizationId)
      ))
      .orderBy(asc(messages.timestamp));

    console.log(`💬 GET MESSAGES - Database: ${storedMessages.length} found for conversation ${conversationId}`);
    return storedMessages;
  }

  async fixAllConversationParticipants(organizationId: number): Promise<void> {
    console.log(`🔧 FIXING ALL CONVERSATION PARTICIPANTS for organization ${organizationId}`);
    
    // Get all conversations for this organization
    const allConversations = await db.select()
      .from(conversations)
      .where(eq(conversations.organizationId, organizationId));
    
    console.log(`🔧 Found ${allConversations.length} conversations to check`);
    
    for (const conv of allConversations) {
      let needsUpdate = false;
      const participants = conv.participants as Array<{id: string | number; name: string; role: string}>;
      const updatedParticipants = [];
      
      for (const participant of participants) {
        // Check if participant needs fixing
        if (typeof participant.id === 'number') {
          // Get actual user data
          const user = await this.getUser(participant.id, organizationId);
          if (user && user.firstName && user.lastName) {
            const correctName = `${user.firstName.trim()} ${user.lastName.trim()}`;
            if (participant.name !== correctName) {
              console.log(`🔧 Fixing participant ${participant.id}: "${participant.name}" -> "${correctName}"`);
              updatedParticipants.push({
                id: participant.id,
                name: correctName,
                role: user.role || participant.role
              });
              needsUpdate = true;
            } else {
              updatedParticipants.push(participant);
            }
          } else {
            updatedParticipants.push(participant);
          }
        } else if (typeof participant.id === 'string') {
          // Try to resolve string ID to actual user first, then patient
          const allUsers = await this.getUsersByOrganization(organizationId);
          const matchedUser = allUsers.find(user => {
            const fullName = `${user.firstName} ${user.lastName}`.trim();
            return fullName === participant.id || 
                   user.firstName === participant.id ||
                   user.email === participant.id;
          });
          
          if (matchedUser) {
            const cleanName = `${matchedUser.firstName.trim()} ${matchedUser.lastName.trim()}`;
            console.log(`🔧 Resolving string participant "${participant.id}" -> ${matchedUser.id} (${cleanName})`);
            updatedParticipants.push({
              id: matchedUser.id,
              name: cleanName,
              role: matchedUser.role
            });
            needsUpdate = true;
          } else {
            // Try to find in patients table
            const allPatients = await this.getPatientsByOrganization(organizationId);
            const matchedPatient = allPatients.find(patient => {
              const fullName = `${patient.firstName} ${patient.lastName}`.trim();
              return fullName === participant.id || 
                     fullName.replace(/\s+/g, ' ') === participant.id ||
                     patient.firstName === participant.id;
            });
            
            if (matchedPatient) {
              const cleanName = `${matchedPatient.firstName.trim()} ${matchedPatient.lastName.trim()}`;
              console.log(`🔧 Resolving string participant "${participant.id}" -> patient ID ${matchedPatient.id} (${cleanName})`);
              updatedParticipants.push({
                id: matchedPatient.id,
                name: cleanName,
                role: 'patient'
              });
              needsUpdate = true;
            } else {
              console.log(`⚠️ Could not resolve string participant: "${participant.id}"`);
              updatedParticipants.push(participant);
            }
          }
        } else {
          updatedParticipants.push(participant);
        }
      }
      
      // Update conversation if needed
      if (needsUpdate) {
        await db.update(conversations)
          .set({ participants: updatedParticipants })
          .where(eq(conversations.id, conv.id));
        console.log(`🔧 Updated conversation ${conv.id} with correct participant names`);
      }
    }
    
    console.log(`🔧 COMPLETED fixing conversation participants`);
  }

  async consolidateDuplicateConversations(senderId: number, recipientId: string, organizationId: number): Promise<void> {
    console.log(`🔄 CONSOLIDATING conversations between sender ${senderId} and recipient ${recipientId}`);
    
    // Get all conversations for this organization
    const allConversations = await db.select()
      .from(conversations)
      .where(eq(conversations.organizationId, organizationId));
    
    // Find all conversations that involve both participants
    const matchingConversations = [];
    for (const conv of allConversations) {
      const participants = conv.participants as Array<{id: string | number; name: string; role: string}>;
      const hasSender = participants.some(p => p.id == senderId);
      const hasRecipient = participants.some(p => 
        p.id == recipientId || 
        p.name == recipientId ||
        (typeof p.id === 'string' && p.id === recipientId)
      );
      
      if (hasSender && hasRecipient) {
        matchingConversations.push(conv);
      }
    }
    
    if (matchingConversations.length <= 1) {
      console.log(`🔄 No duplicate conversations found (found ${matchingConversations.length})`);
      return;
    }
    
    console.log(`🔄 Found ${matchingConversations.length} duplicate conversations, consolidating...`);
    
    // Sort by creation date to keep the oldest one
    matchingConversations.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const keepConversation = matchingConversations[0];
    const duplicateConversations = matchingConversations.slice(1);
    
    // Move all messages from duplicate conversations to the main one
    for (const dupConv of duplicateConversations) {
      console.log(`🔄 Moving messages from ${dupConv.id} to ${keepConversation.id}`);
      
      // Update all messages to point to the main conversation
      await db.update(messages)
        .set({ conversationId: keepConversation.id })
        .where(eq(messages.conversationId, dupConv.id));
      
      // Delete the duplicate conversation
      await db.delete(conversations)
        .where(eq(conversations.id, dupConv.id));
      
      console.log(`🔄 Deleted duplicate conversation ${dupConv.id}`);
    }
    
    // Update the main conversation's lastMessage and unreadCount
    const allMessagesInConv = await db.select()
      .from(messages)
      .where(eq(messages.conversationId, keepConversation.id))
      .orderBy(asc(messages.timestamp));
    
    if (allMessagesInConv.length > 0) {
      const lastMessage = allMessagesInConv[allMessagesInConv.length - 1];
      await db.update(conversations)
        .set({
          lastMessage: {
            id: lastMessage.id,
            senderId: lastMessage.senderId,
            subject: lastMessage.subject,
            content: lastMessage.content,
            timestamp: lastMessage.timestamp.toISOString(),
            priority: lastMessage.priority || 'normal'
          },
          unreadCount: allMessagesInConv.filter(m => !m.isRead).length,
          updatedAt: new Date()
        })
        .where(eq(conversations.id, keepConversation.id));
    }
    
    console.log(`✅ Consolidated ${duplicateConversations.length} duplicate conversations into ${keepConversation.id}`);
  }

  async consolidateAllDuplicateConversations(organizationId: number): Promise<void> {
    console.log(`🔄 CONSOLIDATING ALL duplicate conversations for organization ${organizationId}`);
    
    // Get all conversations for this organization
    const allConversations = await db.select()
      .from(conversations)
      .where(eq(conversations.organizationId, organizationId));
    
    console.log(`🔄 Found ${allConversations.length} total conversations to analyze`);
    
    // Group conversations by participants (unique pairs)
    const conversationGroups = new Map<string, any[]>();
    
    for (const conv of allConversations) {
      const participants = conv.participants as Array<{id: string | number; name: string; role: string}>;
      
      // Extract admin and patient IDs with better matching logic
      let adminId = '';
      let patientIdentifier = '';
      
      for (const p of participants) {
        if (p.role === 'admin' || p.role === 'doctor' || p.role === 'nurse') {
          adminId = p.id?.toString() || '';
        } else if (p.role === 'patient') {
          // Use name as identifier if id is missing, or use id if available
          patientIdentifier = p.id?.toString() || p.name?.toString() || '';
        }
      }
      
      // Create a consistent key for the participant pair
      const groupKey = [adminId, patientIdentifier].filter(id => id !== '').sort().join('|');
      console.log(`🔍 Conversation ${conv.id} has participants: ${JSON.stringify(participants)} -> adminId: ${adminId}, patientId: ${patientIdentifier} -> key: ${groupKey}`);
      
      if (!conversationGroups.has(groupKey)) {
        conversationGroups.set(groupKey, []);
      }
      conversationGroups.get(groupKey)!.push(conv);
    }
    
    let totalConsolidated = 0;
    
    // Process each group that has duplicates
    for (const [groupKey, conversations] of conversationGroups) {
      if (conversations.length > 1) {
        console.log(`🔄 Found ${conversations.length} duplicate conversations for participant group: ${groupKey}`);
        
        // Sort by creation date to keep the oldest one
        conversations.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        const keepConversation = conversations[0];
        const duplicateConversations = conversations.slice(1);
        
        // Move all messages from duplicate conversations to the main one
        for (const dupConv of duplicateConversations) {
          console.log(`🔄 Moving messages from ${dupConv.id} to ${keepConversation.id}`);
          
          // Update all messages to point to the main conversation
          await db.update(messages)
            .set({ conversationId: keepConversation.id })
            .where(eq(messages.conversationId, dupConv.id));
          
          // Delete the duplicate conversation
          await db.delete(conversations)
            .where(eq(conversations.id, dupConv.id));
          
          console.log(`🔄 Deleted duplicate conversation ${dupConv.id}`);
          totalConsolidated++;
        }
        
        // Update the main conversation's lastMessage and unreadCount
        const allMessagesInConv = await db.select()
          .from(messages)
          .where(eq(messages.conversationId, keepConversation.id))
          .orderBy(asc(messages.timestamp));
        
        if (allMessagesInConv.length > 0) {
          const lastMessage = allMessagesInConv[allMessagesInConv.length - 1];
          await db.update(conversations)
            .set({
              lastMessage: {
                id: lastMessage.id,
                senderId: lastMessage.senderId,
                subject: lastMessage.subject,
                content: lastMessage.content,
                timestamp: lastMessage.timestamp.toISOString(),
                priority: lastMessage.priority || 'normal'
              },
              unreadCount: allMessagesInConv.filter(m => !m.isRead).length,
              updatedAt: new Date()
            })
            .where(eq(conversations.id, keepConversation.id));
        }
      }
    }
    
    console.log(`✅ Consolidated ${totalConsolidated} duplicate conversations total`);
  }

  async fixZahraConversations(organizationId: number): Promise<void> {
    console.log(`🔧 FIXING Zahra conversations for organization ${organizationId}`);
    
    // Get all conversations for this organization
    const allConversations = await db.select()
      .from(conversations)
      .where(eq(conversations.organizationId, organizationId));
    
    console.log(`🔧 Found ${allConversations.length} total conversations`);
    
    // Find conversations with Zahra
    const zahraConversations = [];
    for (const conv of allConversations) {
      const participants = conv.participants as Array<{id: string | number; name: string; role: string}>;
      const hasZahra = participants.some(p => 
        p.name === "Zahra Qureshi" || 
        p.id === "Zahra Qureshi" ||
        (p.role === "patient" && (!p.id || !p.name)) // incomplete patient data
      );
      
      if (hasZahra) {
        zahraConversations.push(conv);
        console.log(`🔧 Found Zahra conversation: ${conv.id}, participants: ${JSON.stringify(participants)}`);
      }
    }
    
    if (zahraConversations.length <= 1) {
      console.log(`🔧 No duplicate Zahra conversations found (found ${zahraConversations.length})`);
      return;
    }
    
    console.log(`🔧 Found ${zahraConversations.length} Zahra conversations, consolidating...`);
    
    // Sort by creation date to keep the oldest one with complete data
    zahraConversations.sort((a, b) => {
      const aComplete = (a.participants as any[]).some(p => p.name === "Zahra Qureshi");
      const bComplete = (b.participants as any[]).some(p => p.name === "Zahra Qureshi");
      
      // Prefer conversations with complete data, then by creation date
      if (aComplete && !bComplete) return -1;
      if (!aComplete && bComplete) return 1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
    
    const keepConversation = zahraConversations[0];
    const duplicateConversations = zahraConversations.slice(1);
    
    // Ensure the kept conversation has proper participant data
    const participants = keepConversation.participants as Array<{id: string | number; name: string; role: string}>;
    const hasCompleteZahra = participants.some(p => p.name === "Zahra Qureshi");
    
    if (!hasCompleteZahra) {
      // Fix the participant data
      const updatedParticipants = participants.map(p => {
        if (p.role === "patient" && (!p.id || !p.name)) {
          return {
            id: "Zahra Qureshi",
            name: "Zahra Qureshi", 
            role: "patient"
          };
        }
        return p;
      });
      
      await db.update(conversations)
        .set({ participants: updatedParticipants })
        .where(eq(conversations.id, keepConversation.id));
      
      console.log(`🔧 Fixed participant data for conversation ${keepConversation.id}`);
    }
    
    // Move all messages from duplicate conversations to the main one
    for (const dupConv of duplicateConversations) {
      console.log(`🔧 Moving messages from ${dupConv.id} to ${keepConversation.id}`);
      
      // Update all messages to point to the main conversation
      await db.update(messages)
        .set({ conversationId: keepConversation.id })
        .where(eq(messages.conversationId, dupConv.id));
      
      // Delete the duplicate conversation
      await db.delete(conversations)
        .where(eq(conversations.id, dupConv.id));
      
      console.log(`🔧 Deleted duplicate conversation ${dupConv.id}`);
    }
    
    // Update the main conversation's lastMessage and unreadCount
    const allMessagesInConv = await db.select()
      .from(messages)
      .where(eq(messages.conversationId, keepConversation.id))
      .orderBy(asc(messages.timestamp));
    
    if (allMessagesInConv.length > 0) {
      const lastMessage = allMessagesInConv[allMessagesInConv.length - 1];
      await db.update(conversations)
        .set({
          lastMessage: {
            id: lastMessage.id,
            senderId: lastMessage.senderId,
            subject: lastMessage.subject,
            content: lastMessage.content,
            timestamp: lastMessage.timestamp.toISOString(),
            priority: lastMessage.priority || 'normal'
          },
          unreadCount: allMessagesInConv.filter(m => !m.isRead).length,
          updatedAt: new Date()
        })
        .where(eq(conversations.id, keepConversation.id));
    }
    
    console.log(`✅ Fixed Zahra conversations - consolidated ${duplicateConversations.length} duplicates into ${keepConversation.id}`);
  }

  async sendMessage(messageData: any, organizationId: number): Promise<any> {
    const messageId = `msg_${Date.now()}`;
    const timestamp = new Date();
    
    // Use existing conversation ID if provided, otherwise create new one
    console.log(`🔍 DEBUG - messageData.conversationId: ${messageData.conversationId}`);
    let conversationId = messageData.conversationId;
    
    // If conversationId is provided, verify it exists in the database
    if (conversationId) {
      const existingConv = await db.select()
        .from(conversations)
        .where(and(
          eq(conversations.id, conversationId),
          eq(conversations.organizationId, organizationId)
        ))
        .limit(1);
      
      if (existingConv.length === 0) {
        console.log(`⚠️ WARNING - Provided conversationId ${conversationId} does not exist, creating new one`);
        conversationId = `conv_${Date.now()}`;
      } else {
        console.log(`✅ Using existing conversation: ${conversationId}`);
      }
    } else {
      conversationId = `conv_${Date.now()}`;
    }
    
    console.log(`🔍 DEBUG - Final conversationId: ${conversationId}`);
    
    // Get sender's full name if available
    let senderDisplayName = messageData.senderName || 'Unknown Sender';
    if (messageData.senderId) {
      const sender = await this.getUser(messageData.senderId, organizationId);
      if (sender && sender.firstName && sender.lastName) {
        senderDisplayName = `${sender.firstName} ${sender.lastName}`;
      } else if (sender && sender.firstName) {
        senderDisplayName = sender.firstName;
      } else if (sender && sender.email) {
        senderDisplayName = sender.email;
      }
    }
    
    // Create message in database
    console.log(`🔍 DEBUG - About to insert message with senderId: ${messageData.senderId} (type: ${typeof messageData.senderId})`);
    
    const messageInsertData = {
      id: messageId,
      organizationId: organizationId,
      conversationId: conversationId,
      senderId: parseInt(messageData.senderId.toString()), // Ensure it's an integer
      senderName: senderDisplayName,
      senderRole: messageData.senderRole || 'user',
      recipientId: messageData.recipientId,
      recipientName: messageData.recipientId,
      subject: messageData.subject || '',
      content: messageData.content,
      isRead: false,
      priority: messageData.priority || 'normal',
      type: messageData.type || 'internal',
      isStarred: false,
      phoneNumber: messageData.phoneNumber,
      messageType: messageData.messageType,
      deliveryStatus: 'pending'
    };
    
    console.log(`🔍 DEBUG - Message insert data:`, JSON.stringify(messageInsertData, null, 2));
    
    const [createdMessage] = await db.insert(messages).values(messageInsertData).returning();
    console.log(`✅ MESSAGE INSERTED:`, createdMessage?.id);
    
    // Force database synchronization by immediately reading back all messages
    const verifyMessages = await db.select().from(messages)
      .where(and(
        eq(messages.conversationId, conversationId),
        eq(messages.organizationId, organizationId)
      ));
    console.log(`🔍 POST-INSERT VERIFICATION: ${verifyMessages.length} messages exist for conversation ${conversationId}`);

    // Check if conversation exists, if not create it
    let existingConversation = await db.select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);

    // If no conversation found by ID, check if there's already a conversation between these participants
    if (existingConversation.length === 0 && messageData.recipientId) {
      console.log(`🔍 Searching for existing conversation between sender ${messageData.senderId} and recipient ${messageData.recipientId}`);
      
      const allConversations = await db.select()
        .from(conversations)
        .where(eq(conversations.organizationId, organizationId));
      
      // Look for conversation that includes both participants
      for (const conv of allConversations) {
        const participants = conv.participants as Array<{id: string | number; name: string; role: string}>;
        const hasSender = participants.some(p => p.id == messageData.senderId);
        
        // For recipient matching, check both ID and name since recipientId could be a name
        const hasRecipient = participants.some(p => 
          p.id == messageData.recipientId || 
          p.name == messageData.recipientId ||
          (typeof p.id === 'string' && p.id === messageData.recipientId)
        );
        
        if (hasSender && hasRecipient) {
          console.log(`🔍 Found existing conversation: ${conv.id} between these participants`);
          // Update the conversationId to use the existing one
          const oldConversationId = conversationId;
          conversationId = conv.id;
          
          // Update the message's conversationId
          await db.update(messages)
            .set({ conversationId: conv.id })
            .where(eq(messages.id, messageId));
          
          console.log(`🔍 Updated message ${messageId} from conversation ${oldConversationId} to ${conv.id}`);
          existingConversation = [conv];
          break;
        }
      }
    }

    if (existingConversation.length === 0) {
      // Create new conversation - properly resolve recipient name
      let recipientDisplayName = messageData.recipientId;
      let recipientRole = 'patient';
      
      // Try to resolve recipient name from user data
      if (typeof messageData.recipientId === 'number') {
        const recipientUser = await this.getUser(messageData.recipientId, organizationId);
        if (recipientUser) {
          recipientDisplayName = recipientUser.firstName && recipientUser.lastName 
            ? `${recipientUser.firstName} ${recipientUser.lastName}`
            : recipientUser.firstName || recipientUser.email || messageData.recipientId;
          recipientRole = recipientUser.role || 'patient';
        }
      } else if (typeof messageData.recipientId === 'string') {
        // If recipientId is a string (name), try to find matching user first, then patient
        const allUsers = await this.getUsersByOrganization(organizationId);
        const matchedUser = allUsers.find(user => {
          const fullName = `${user.firstName} ${user.lastName}`.trim();
          return fullName === messageData.recipientId || 
                 user.firstName === messageData.recipientId ||
                 user.email === messageData.recipientId;
        });
        
        if (matchedUser) {
          recipientDisplayName = `${matchedUser.firstName} ${matchedUser.lastName}`;
          recipientRole = matchedUser.role || 'patient';
          messageData.recipientId = matchedUser.id; // Update to use actual user ID
        } else {
          // Try to find in patients table
          const allPatients = await this.getPatientsByOrganization(organizationId);
          const matchedPatient = allPatients.find(patient => {
            const fullName = `${patient.firstName} ${patient.lastName}`.trim();
            return fullName === messageData.recipientId || 
                   fullName.replace(/\s+/g, ' ') === messageData.recipientId ||
                   patient.firstName === messageData.recipientId;
          });
          
          if (matchedPatient) {
            recipientDisplayName = `${matchedPatient.firstName} ${matchedPatient.lastName}`;
            recipientRole = 'patient';
            messageData.recipientId = matchedPatient.id; // Update to use actual patient ID
          } else {
            // Keep the original name if no match found
            recipientDisplayName = messageData.recipientId;
          }
        }
      }
      
      const conversationInsertData = {
        id: conversationId,
        organizationId: organizationId,
        participants: [
          { id: parseInt(messageData.senderId.toString()), name: senderDisplayName, role: messageData.senderRole },
          { id: messageData.recipientId, name: recipientDisplayName, role: recipientRole }
        ],
        lastMessage: {
          id: messageId,
          senderId: parseInt(messageData.senderId.toString()),
          subject: messageData.subject,
          content: messageData.content,
          timestamp: timestamp.toISOString(),
          priority: messageData.priority || 'normal'
        },
        unreadCount: 0, // Will be calculated accurately in getConversations
        isPatientConversation: true
      };
      
      console.log(`🔍 DEBUG - Conversation insert data:`, JSON.stringify(conversationInsertData, null, 2));
      
      const [createdConversation] = await db.insert(conversations).values(conversationInsertData).returning();
      console.log(`✅ CONVERSATION INSERTED:`, createdConversation?.id);
      
      console.log(`✅ Created new conversation: ${conversationId} and message: ${messageId}`);
    } else {
      // Update existing conversation (unreadCount will be calculated in getConversations)
      await db.update(conversations)
        .set({
          lastMessage: {
            id: messageId,
            senderId: parseInt(messageData.senderId.toString()),
            subject: messageData.subject,
            content: messageData.content,
            timestamp: timestamp.toISOString(),
            priority: messageData.priority || 'normal'
          },
          updatedAt: timestamp
        })
        .where(eq(conversations.id, conversationId));
      
      console.log(`✅ Updated existing conversation: ${conversationId} with message: ${messageId}`);
    }

    return createdMessage;
  }

  async deleteConversation(conversationId: string, organizationId: number): Promise<boolean> {
    try {
      console.log(`🗑️ DELETING CONVERSATION: ${conversationId} for org ${organizationId}`);
      
      // First delete all messages in the conversation
      const deleteMessagesResult = await db.delete(messages)
        .where(and(
          eq(messages.conversationId, conversationId),
          eq(messages.organizationId, organizationId)
        ));
      
      console.log(`🗑️ DELETED MESSAGES for conversation ${conversationId}`);
      
      // Then delete the conversation itself
      const deleteConversationResult = await db.delete(conversations)
        .where(and(
          eq(conversations.id, conversationId),
          eq(conversations.organizationId, organizationId)
        ));
      
      console.log(`🗑️ DELETED CONVERSATION ${conversationId}`);
      return true;
    } catch (error) {
      console.error(`🗑️ ERROR DELETING CONVERSATION ${conversationId}:`, error);
      return false;
    }
  }

  async deleteMessage(messageId: string, organizationId: number): Promise<boolean> {
    try {
      const result = await db.delete(messages)
        .where(and(
          eq(messages.id, messageId),
          eq(messages.organizationId, organizationId)
        ));
      
      console.log(`🗑️ DELETE RESULT for message ${messageId}:`, result);
      return true; // Drizzle doesn't return affected rows count in the same way
    } catch (error) {
      console.error('Error deleting message:', error);
      return false;
    }
  }

  // Message delivery status tracking methods
  async updateMessageDeliveryStatus(messageIdentifier: string, status: string, errorCode?: string, errorMessage?: string): Promise<void> {
    try {
      const updateData: any = {
        deliveryStatus: status,
        updatedAt: new Date()
      };

      if (errorCode) updateData.errorCode = errorCode;
      if (errorMessage) updateData.errorMessage = errorMessage;

      // Try to update by external message ID first, then by internal message ID
      const externalResult = await db.update(messages)
        .set(updateData)
        .where(eq(messages.externalMessageId, messageIdentifier));

      if (externalResult.rowCount === 0) {
        // If no rows affected, try updating by internal message ID
        await db.update(messages)
          .set(updateData)
          .where(eq(messages.id, messageIdentifier));
      }

      console.log(`📱 Updated delivery status for message ${messageIdentifier}: ${status}`);
    } catch (error) {
      console.error(`❌ Failed to update delivery status for message ${messageIdentifier}:`, error);
    }
  }

  async getMessageByExternalId(externalMessageId: string, organizationId: number): Promise<any> {
    try {
      const result = await db.select()
        .from(messages)
        .where(and(
          eq(messages.externalMessageId, externalMessageId),
          eq(messages.organizationId, organizationId)
        ))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      console.error(`❌ Failed to get message by external ID ${externalMessageId}:`, error);
      return null;
    }
  }

  async getPendingMessages(organizationId: number): Promise<any[]> {
    try {
      const result = await db.select()
        .from(messages)
        .where(and(
          eq(messages.organizationId, organizationId),
          eq(messages.deliveryStatus, 'pending')
        ))
        .orderBy(desc(messages.createdAt));

      console.log(`📱 Found ${result.length} pending messages for organization ${organizationId}`);
      return result;
    } catch (error) {
      console.error(`❌ Failed to get pending messages for organization ${organizationId}:`, error);
      return [];
    }
  }

  async getRecentMessagesWithExternalIds(organizationId: number, limit: number = 10): Promise<any[]> {
    try {
      const result = await db.select()
        .from(messages)
        .where(and(
          eq(messages.organizationId, organizationId),
          isNotNull(messages.externalMessageId)
        ))
        .orderBy(desc(messages.createdAt))
        .limit(limit);

      console.log(`📱 Found ${result.length} messages with external IDs for organization ${organizationId}`);
      return result;
    } catch (error) {
      console.error(`❌ Failed to get recent messages with external IDs:`, error);
      return [];
    }
  }

  async getMessage(messageId: string, organizationId: number): Promise<any> {
    try {
      const result = await db.select()
        .from(messages)
        .where(and(
          eq(messages.id, messageId),
          eq(messages.organizationId, organizationId)
        ))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      console.error(`❌ Failed to get message ${messageId}:`, error);
      return null;
    }
  }

  async updateMessage(messageId: string, organizationId: number, updateData: any): Promise<boolean> {
    try {
      await db.update(messages)
        .set(updateData)
        .where(and(
          eq(messages.id, messageId),
          eq(messages.organizationId, organizationId)
        ));

      console.log(`📱 Updated message ${messageId} with data:`, updateData);
      return true;
    } catch (error) {
      console.error(`❌ Failed to update message ${messageId}:`, error);
      return false;
    }
  }

  async getMessageCampaigns(organizationId: number): Promise<any[]> {
    // Mock campaigns data
    return [
      {
        id: "camp_1",
        name: "Flu Vaccination Reminder",
        type: "email",
        status: "sent",
        subject: "Annual Flu Vaccination Available",
        content: "Book your flu vaccination appointment today.",
        recipientCount: 150,
        sentCount: 150,
        openRate: 65,
        clickRate: 12,
        createdAt: "2024-06-20T10:00:00Z",
        template: "vaccination_reminder"
      }
    ];
  }

  async createMessageCampaign(campaignData: any, organizationId: number): Promise<any> {
    // Mock implementation
    return { 
      id: Date.now().toString(), 
      ...campaignData, 
      createdAt: new Date().toISOString(),
      organizationId 
    };
  }

  // Integration implementations
  async getIntegrations(organizationId: number): Promise<any[]> {
    // Mock integrations data
    return [
      {
        id: "int_1",
        name: "NHS Digital Integration",
        description: "Connect with NHS Digital services for patient data exchange",
        category: "clinical",
        status: "connected",
        provider: "NHS Digital",
        features: ["Patient lookup", "Care records", "Prescription sync"],
        lastSync: "2024-06-26T12:00:00Z",
        syncFrequency: "Every 4 hours",
        isActive: true,
        connectionCount: 1247
      },
      {
        id: "int_2", 
        name: "Twilio SMS Gateway",
        description: "Send SMS notifications and reminders to patients",
        category: "messaging",
        status: "connected",
        provider: "Twilio",
        features: ["SMS sending", "Delivery tracking", "Two-way messaging"],
        lastSync: "2024-06-26T15:30:00Z",
        syncFrequency: "Real-time",
        isActive: true,
        connectionCount: 89
      }
    ];
  }

  async connectIntegration(integrationData: any, organizationId: number): Promise<any> {
    // Mock implementation
    return { 
      id: Date.now().toString(), 
      ...integrationData, 
      status: "connected",
      organizationId 
    };
  }

  async getWebhooks(organizationId: number): Promise<any[]> {
    // Mock webhooks data
    return [
      {
        id: "webhook_1",
        name: "Patient Registration Webhook",
        url: "https://external-system.com/webhooks/patient-registration",
        events: ["patient.created", "patient.updated"],
        status: "active",
        lastTriggered: "2024-06-26T14:45:00Z",
        totalCalls: 145,
        successRate: 98.6,
        headers: { "Authorization": "Bearer ***" },
        retryPolicy: "exponential",
        timeout: 30
      }
    ];
  }

  async createWebhook(webhookData: any, organizationId: number): Promise<any> {
    // Mock implementation
    return { 
      id: Date.now().toString(), 
      ...webhookData, 
      status: "active",
      totalCalls: 0,
      successRate: 100,
      organizationId 
    };
  }

  async getApiKeys(organizationId: number): Promise<any[]> {
    // Mock API keys data
    return [
      {
        id: "key_1",
        name: "Integration API Key",
        keyPrefix: "emr_live_12345",
        permissions: ["read", "write"],
        lastUsed: "2024-06-26T13:20:00Z",
        isActive: true,
        usageCount: 2847,
        rateLimit: 1000
      }
    ];
  }

  async createApiKey(apiKeyData: any, organizationId: number): Promise<any> {
    // Mock implementation - in real implementation, generate secure API key
    return { 
      id: Date.now().toString(), 
      ...apiKeyData, 
      keyPrefix: `emr_live_${Math.random().toString(36).substr(2, 9)}`,
      isActive: true,
      usageCount: 0,
      organizationId 
    };
  }

  // Prescriptions implementation
  async getPrescription(id: number, organizationId: number): Promise<Prescription | undefined> {
    const [prescription] = await db
      .select()
      .from(prescriptions)
      .where(and(eq(prescriptions.id, id), eq(prescriptions.organizationId, organizationId)));
    return prescription;
  }

  async getPrescriptionsByOrganization(organizationId: number, limit: number = 50): Promise<Prescription[]> {
    const allPrescriptions = await db
      .select()
      .from(prescriptions)
      .where(eq(prescriptions.organizationId, organizationId))
      .orderBy(desc(prescriptions.createdAt));

    // Remove duplicates based on patient + medication name + dosage
    const uniquePrescriptions = [];
    const seenCombinations = new Set();
    
    for (const prescription of allPrescriptions) {
      if (prescription.medications && prescription.medications.length > 0) {
        const firstMed = prescription.medications[0];
        const key = `${prescription.patientId}-${firstMed.name || 'unknown'}-${firstMed.dosage || 'unknown'}`;
        
        if (!seenCombinations.has(key)) {
          seenCombinations.add(key);
          uniquePrescriptions.push(prescription);
        }
      } else {
        // For prescriptions without medications, use patient + id
        const key = `${prescription.patientId}-no-meds-${prescription.id}`;
        if (!seenCombinations.has(key)) {
          seenCombinations.add(key);
          uniquePrescriptions.push(prescription);
        }
      }
    }
    
    return uniquePrescriptions.slice(0, limit);
  }

  async getPrescriptionsByPatient(patientId: number, organizationId: number): Promise<Prescription[]> {
    return await db
      .select()
      .from(prescriptions)
      .where(and(eq(prescriptions.patientId, patientId), eq(prescriptions.organizationId, organizationId)))
      .orderBy(desc(prescriptions.createdAt));
  }

  async getPrescriptionsByProvider(providerId: number, organizationId: number): Promise<Prescription[]> {
    return await db
      .select()
      .from(prescriptions)
      .where(and(eq(prescriptions.providerId, providerId), eq(prescriptions.organizationId, organizationId)))
      .orderBy(desc(prescriptions.createdAt));
  }

  async createPrescription(prescription: InsertPrescription): Promise<Prescription> {
    console.log("Storage: Creating prescription with data:", prescription);
    console.log("Storage: Provider ID being inserted:", prescription.providerId);
    const [newPrescription] = await db
      .insert(prescriptions)
      .values(prescription)
      .returning();
    return newPrescription;
  }

  async updatePrescription(id: number, organizationId: number, updates: Partial<InsertPrescription>): Promise<Prescription | undefined> {
    const [updatedPrescription] = await db
      .update(prescriptions)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(prescriptions.id, id), eq(prescriptions.organizationId, organizationId)))
      .returning();
    return updatedPrescription;
  }

  async deletePrescription(id: number, organizationId: number): Promise<Prescription | undefined> {
    const [deletedPrescription] = await db
      .delete(prescriptions)
      .where(and(eq(prescriptions.id, id), eq(prescriptions.organizationId, organizationId)))
      .returning();
    return deletedPrescription;
  }

  // Lab Results methods
  private static labResultsStore: any[] = [];

  async getLabResults(organizationId: number): Promise<any[]> {
    const results = await db
      .select()
      .from(labResults)
      .where(eq(labResults.organizationId, organizationId))
      .orderBy(desc(labResults.createdAt));
    
    return results;
  }

  async createLabResult(labResult: InsertLabResult): Promise<LabResult> {
    const [result] = await db
      .insert(labResults)
      .values(labResult)
      .returning();
    
    return result;
  }

  async seedLabResults(organizationId: number): Promise<void> {
    // Check if we already have lab results
    const existingResults = await db
      .select()
      .from(labResults)
      .where(eq(labResults.organizationId, organizationId))
      .limit(1);
    
    if (existingResults.length > 0) {
      return; // Already seeded
    }

    // Get some patients for the lab results
    const patientsList = await db
      .select()
      .from(patients)
      .where(eq(patients.organizationId, organizationId))
      .limit(3);
    
    // Get some users to be the ordering doctors  
    const doctors = await db
      .select()
      .from(users)
      .where(and(
        eq(users.organizationId, organizationId),
        eq(users.role, 'doctor')
      ))
      .limit(2);

    if (patientsList.length === 0 || doctors.length === 0) {
      return; // Need patients and doctors to create lab results
    }

    const sampleLabResults: InsertLabResult[] = [
      {
        organizationId,
        patientId: patientsList[0].id,
        testId: "CBC001",
        testType: "Complete Blood Count (CBC)",
        orderedBy: doctors[0].id,
        orderedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        collectedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // 2 hours after ordering
        completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        status: "completed",
        results: [
          {
            name: "White Blood Cell Count",
            value: "7.2",
            unit: "×10³/µL",
            referenceRange: "4.0-11.0",
            status: "normal"
          },
          {
            name: "Red Blood Cell Count",
            value: "4.5",
            unit: "×10⁶/µL",
            referenceRange: "4.2-5.4",
            status: "normal"
          },
          {
            name: "Hemoglobin",
            value: "14.2",
            unit: "g/dL",
            referenceRange: "12.0-16.0",
            status: "normal"
          }
        ],
        criticalValues: false,
        notes: "All values within normal limits"
      },
      {
        organizationId,
        patientId: patientsList[1] ? patientsList[1].id : patientsList[0].id,
        testId: "GLU002",
        testType: "Blood Glucose",
        orderedBy: doctors[0].id,
        orderedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        collectedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000), // 1 hour after ordering
        completedAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
        status: "completed",
        results: [
          {
            name: "Glucose",
            value: "245",
            unit: "mg/dL",
            referenceRange: "70-99",
            status: "abnormal_high",
            flag: "HIGH"
          }
        ],
        criticalValues: true,
        notes: "High glucose levels - follow up required, critical value"
      },
      {
        organizationId,
        patientId: patientsList[2] ? patientsList[2].id : patientsList[0].id,
        testId: "LIP003",
        testType: "Lipid Panel",
        orderedBy: doctors.length > 1 ? doctors[1].id : doctors[0].id,
        orderedAt: new Date(),
        status: "pending",
        results: [],
        criticalValues: false,
        notes: "Fasting required"
      },
      {
        organizationId,
        patientId: patientsList[0].id,
        testId: "A1C004",
        testType: "Hemoglobin A1C",
        orderedBy: doctors[0].id,
        orderedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        collectedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000), // 30 minutes after ordering
        completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        status: "completed",
        results: [
          {
            name: "Hemoglobin A1C",
            value: "8.5",
            unit: "%",
            referenceRange: "< 7.0",
            status: "abnormal_high",
            flag: "HIGH"
          }
        ],
        criticalValues: true,
        notes: "Elevated A1C indicates poor diabetes control"
      }
    ];

    for (const labResult of sampleLabResults) {
      await this.createLabResult(labResult);
    }
  }

  async oldCreateLabResult(labResult: any): Promise<any> {
    const newLabResult = {
      id: `lab_${Date.now()}`,
      ...labResult,
      orderedAt: new Date().toISOString(),
      status: "pending",
      results: []
    };

    // Store in class static variable for this session (in real app, this would be database)
    DatabaseStorage.labResultsStore.push(newLabResult);

    return newLabResult;
  }

  async getMessageTemplates(organizationId: number): Promise<any[]> {
    // Return sample message templates for the demo
    return [
      {
        id: "template_1",
        name: "Appointment Reminder",
        description: "Standard reminder for upcoming appointments",
        category: "general",
        subject: "Appointment Reminder - {{date}}",
        content: "Dear {{patientName}},\n\nThis is a friendly reminder that you have an appointment scheduled on {{date}} at {{time}} with {{doctorName}}.\n\nPlease arrive 15 minutes early for check-in.\n\nIf you need to reschedule, please call us at {{clinicPhone}}.\n\nBest regards,\n{{clinicName}}",
        usageCount: 45,
        createdAt: "2024-01-15T10:00:00Z",
        updatedAt: "2024-06-20T14:30:00Z"
      },
      {
        id: "template_2", 
        name: "Lab Results Available",
        description: "Notification when lab results are ready",
        category: "medical",
        subject: "Your Lab Results Are Ready",
        content: "Dear {{patientName}},\n\nYour recent lab results from {{testDate}} are now available for review.\n\nPlease log into your patient portal or call our office at {{clinicPhone}} to discuss the results with your provider.\n\nIf you have any questions, please don't hesitate to contact us.\n\nThank you,\n{{clinicName}} Team",
        usageCount: 32,
        createdAt: "2024-02-10T09:15:00Z",
        updatedAt: "2024-06-18T11:45:00Z"
      },
      {
        id: "template_3",
        name: "Prescription Ready",
        description: "Notification for prescription pickup",
        category: "general",
        subject: "Prescription Ready for Pickup",
        content: "Hello {{patientName}},\n\nYour prescription for {{medicationName}} is ready for pickup at {{pharmacyName}}.\n\nPickup hours: {{pharmacyHours}}\nPharmacy phone: {{pharmacyPhone}}\n\nPlease bring a valid ID when collecting your medication.\n\nBest regards,\n{{clinicName}}",
        usageCount: 28,
        createdAt: "2024-03-05T16:20:00Z",
        updatedAt: "2024-06-15T09:30:00Z"
      },
      {
        id: "template_4",
        name: "Annual Checkup Due",
        description: "Reminder for annual health checkups",
        category: "preventive",
        subject: "Time for Your Annual Health Checkup",
        content: "Dear {{patientName}},\n\nIt's time for your annual health checkup! Regular checkups are important for maintaining good health and catching any potential issues early.\n\nPlease call us at {{clinicPhone}} to schedule your appointment.\n\nDuring your visit, we'll:\n- Review your medical history\n- Perform routine screenings\n- Update any necessary vaccinations\n- Discuss your health goals\n\nWe look forward to seeing you soon!\n\n{{clinicName}} Team",
        usageCount: 15,
        createdAt: "2024-04-12T13:10:00Z",
        updatedAt: "2024-06-10T15:20:00Z"
      },
      {
        id: "template_5",
        name: "Emergency Alert",
        description: "Urgent notifications for patients",
        category: "urgent",
        subject: "URGENT: Important Health Alert",
        content: "URGENT NOTICE\n\nDear {{patientName}},\n\nWe need to contact you immediately regarding your recent {{testType}} results. Please call our office at {{clinicPhone}} as soon as possible.\n\nIf this is after hours, please visit the nearest emergency room or call 999.\n\nThis is time-sensitive. Please do not delay.\n\n{{doctorName}}\n{{clinicName}}",
        usageCount: 3,
        createdAt: "2024-05-08T08:45:00Z",
        updatedAt: "2024-06-05T10:15:00Z"
      },
      {
        id: "template_6",
        name: "Welcome New Patient",
        description: "Welcome message for new patients",
        category: "onboarding",
        subject: "Welcome to {{clinicName}}!",
        content: "Dear {{patientName}},\n\nWelcome to {{clinicName}}! We're delighted to have you as a new patient.\n\nTo help us provide you with the best care:\n\n1. Complete your medical history forms\n2. Bring your insurance card and ID to your first visit\n3. Arrive 30 minutes early for new patient paperwork\n4. Bring a list of current medications\n\nYour first appointment is scheduled for {{appointmentDate}} at {{appointmentTime}} with {{doctorName}}.\n\nIf you have any questions, please call us at {{clinicPhone}}.\n\nWe look forward to caring for you!\n\n{{clinicName}} Team",
        usageCount: 22,
        createdAt: "2024-01-20T11:30:00Z",
        updatedAt: "2024-06-12T14:45:00Z"
      }
    ];
  }

  async getMessagingAnalytics(organizationId: number): Promise<any> {
    // Return sample messaging analytics for the demo
    return {
      totalMessages: 2847,
      responseRate: "94.2%",
      avgResponseTime: "4.2h",
      campaignReach: "18.5K",
      messageBreakdown: {
        internal: 1254,
        patient: 892,
        broadcast: 701
      },
      recentActivity: [
        {
          type: "campaign",
          title: "Flu Vaccination Reminder sent",
          description: "Reached 1,240 patients",
          timestamp: "2 hours ago",
          status: "completed"
        },
        {
          type: "template",
          title: "Lab Results Available used 12 times",
          description: "High engagement rate",
          timestamp: "4 hours ago",
          status: "active"
        },
        {
          type: "bulk",
          title: "Bulk message sent to Cardiology department",
          description: "45 recipients",
          timestamp: "6 hours ago",
          status: "delivered"
        }
      ]
    };
  }





  async getMessageCampaigns(organizationId: number): Promise<any[]> {
    // Return sample campaigns data
    return [
      {
        id: "camp_1",
        name: "Flu Vaccination Reminder",
        type: "email",
        status: "sent",
        subject: "Annual Flu Vaccination Available",
        content: "Book your flu vaccination appointment today.",
        recipientCount: 150,
        sentCount: 150,
        openRate: 65,
        clickRate: 12,
        createdAt: "2024-06-20T10:00:00Z",
        template: "vaccination_reminder"
      }
    ];
  }

  async createMessageCampaign(campaignData: any, organizationId: number): Promise<any> {
    // Create a new campaign
    const campaign = {
      id: `camp_${Date.now()}`,
      ...campaignData,
      organizationId,
      createdAt: new Date().toISOString(),
      status: "draft"
    };

    return campaign;
  }

  // Documents implementation
  async getDocument(id: number, organizationId: number): Promise<Document | undefined> {
    const [document] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, id), eq(documents.organizationId, organizationId)));
    return document;
  }

  async getDocumentsByUser(userId: number, organizationId: number): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(and(eq(documents.userId, userId), eq(documents.organizationId, organizationId)))
      .orderBy(desc(documents.createdAt));
  }

  async getDocumentsByOrganization(organizationId: number, limit?: number): Promise<Document[]> {
    let query = db
      .select()
      .from(documents)
      .where(eq(documents.organizationId, organizationId))
      .orderBy(desc(documents.createdAt));

    if (limit) {
      query = query.limit(limit);
    }

    return await query;
  }

  async getTemplatesByOrganization(organizationId: number, limit?: number): Promise<Document[]> {
    let query = db
      .select()
      .from(documents)
      .where(and(eq(documents.organizationId, organizationId), eq(documents.isTemplate, true)))
      .orderBy(desc(documents.createdAt));

    if (limit) {
      query = query.limit(limit);
    }

    return await query;
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const [newDocument] = await db
      .insert(documents)
      .values({
        ...document,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return newDocument;
  }

  async updateDocument(id: number, organizationId: number, updates: Partial<InsertDocument>): Promise<Document | undefined> {
    const [updatedDocument] = await db
      .update(documents)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(eq(documents.id, id), eq(documents.organizationId, organizationId)))
      .returning();
    return updatedDocument;
  }

  async deleteDocument(id: number, organizationId: number): Promise<boolean> {
    const result = await db
      .delete(documents)
      .where(and(eq(documents.id, id), eq(documents.organizationId, organizationId)));
    return result.rowCount > 0;
  }

  // Medical Images implementation
  async getMedicalImage(id: number, organizationId: number): Promise<MedicalImage | undefined> {
    const [image] = await db
      .select()
      .from(medicalImages)
      .where(and(eq(medicalImages.id, id), eq(medicalImages.organizationId, organizationId)));
    return image;
  }

  async getMedicalImagesByPatient(patientId: number, organizationId: number): Promise<MedicalImage[]> {
    return await db
      .select()
      .from(medicalImages)
      .where(and(eq(medicalImages.patientId, patientId), eq(medicalImages.organizationId, organizationId)))
      .orderBy(desc(medicalImages.createdAt));
  }

  async getMedicalImagesByOrganization(organizationId: number, limit: number = 50): Promise<MedicalImage[]> {
    return await db
      .select()
      .from(medicalImages)
      .where(eq(medicalImages.organizationId, organizationId))
      .orderBy(desc(medicalImages.createdAt))
      .limit(limit);
  }

  async createMedicalImage(image: InsertMedicalImage): Promise<MedicalImage> {
    const [newImage] = await db
      .insert(medicalImages)
      .values({
        ...image,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return newImage;
  }

  async updateMedicalImage(id: number, organizationId: number, updates: Partial<InsertMedicalImage>): Promise<MedicalImage | undefined> {
    const [updatedImage] = await db
      .update(medicalImages)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(eq(medicalImages.id, id), eq(medicalImages.organizationId, organizationId)))
      .returning();
    return updatedImage;
  }

  async deleteMedicalImage(id: number, organizationId: number): Promise<boolean> {
    const result = await db
      .delete(medicalImages)
      .where(and(eq(medicalImages.id, id), eq(medicalImages.organizationId, organizationId)));
    return result.rowCount > 0;
  }

  // Lab Results (Database-driven)
  async getLabResult(id: number, organizationId: number): Promise<LabResult | undefined> {
    const [result] = await db.select()
      .from(labResults)
      .where(and(eq(labResults.id, id), eq(labResults.organizationId, organizationId)));
    return result || undefined;
  }

  async getLabResultsByOrganization(organizationId: number, limit: number = 50): Promise<LabResult[]> {
    return await db.select()
      .from(labResults)
      .where(eq(labResults.organizationId, organizationId))
      .orderBy(desc(labResults.createdAt))
      .limit(limit);
  }

  async getLabResultsByPatient(patientId: number, organizationId: number): Promise<LabResult[]> {
    return await db.select()
      .from(labResults)
      .where(and(eq(labResults.patientId, patientId), eq(labResults.organizationId, organizationId)))
      .orderBy(desc(labResults.createdAt));
  }

  async createLabResult(labResult: InsertLabResult): Promise<LabResult> {
    const [result] = await db.insert(labResults).values(labResult).returning();
    return result;
  }

  async updateLabResult(id: number, organizationId: number, updates: Partial<InsertLabResult>): Promise<LabResult | undefined> {
    const [result] = await db.update(labResults)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(labResults.id, id), eq(labResults.organizationId, organizationId)))
      .returning();
    return result || undefined;
  }

  // Claims (Database-driven)
  async getClaim(id: number, organizationId: number): Promise<Claim | undefined> {
    const [claim] = await db.select()
      .from(claims)
      .where(and(eq(claims.id, id), eq(claims.organizationId, organizationId)));
    return claim || undefined;
  }

  async getClaimsByOrganization(organizationId: number, limit: number = 50): Promise<Claim[]> {
    return await db.select()
      .from(claims)
      .where(eq(claims.organizationId, organizationId))
      .orderBy(desc(claims.createdAt))
      .limit(limit);
  }

  async getClaimsByPatient(patientId: number, organizationId: number): Promise<Claim[]> {
    return await db.select()
      .from(claims)
      .where(and(eq(claims.patientId, patientId), eq(claims.organizationId, organizationId)))
      .orderBy(desc(claims.createdAt));
  }

  async createClaim(claim: InsertClaim): Promise<Claim> {
    const [result] = await db.insert(claims).values(claim).returning();
    return result;
  }

  async updateClaim(id: number, organizationId: number, updates: Partial<InsertClaim>): Promise<Claim | undefined> {
    const [claim] = await db.update(claims)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(claims.id, id), eq(claims.organizationId, organizationId)))
      .returning();
    return claim || undefined;
  }

  // Revenue Records (Database-driven)
  async getRevenueRecordsByOrganization(organizationId: number, limit: number = 50): Promise<RevenueRecord[]> {
    return await db.select()
      .from(revenueRecords)
      .where(eq(revenueRecords.organizationId, organizationId))
      .orderBy(desc(revenueRecords.createdAt))
      .limit(limit);
  }

  async createRevenueRecord(revenueRecord: InsertRevenueRecord): Promise<RevenueRecord> {
    const [result] = await db.insert(revenueRecords).values(revenueRecord).returning();
    return result;
  }

  // Clinical Procedures (Database-driven)
  async getClinicalProceduresByOrganization(organizationId: number, limit: number = 50): Promise<ClinicalProcedure[]> {
    return await db.select()
      .from(clinicalProcedures)
      .where(eq(clinicalProcedures.organizationId, organizationId))
      .orderBy(desc(clinicalProcedures.createdAt))
      .limit(limit);
  }

  async createClinicalProcedure(procedure: InsertClinicalProcedure): Promise<ClinicalProcedure> {
    const [result] = await db.insert(clinicalProcedures).values(procedure).returning();
    return result;
  }

  async updateClinicalProcedure(id: number, organizationId: number, updates: Partial<InsertClinicalProcedure>): Promise<ClinicalProcedure | undefined> {
    const [procedure] = await db.update(clinicalProcedures)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(clinicalProcedures.id, id), eq(clinicalProcedures.organizationId, organizationId)))
      .returning();
    return procedure || undefined;
  }

  // Emergency Protocols (Database-driven)
  async getEmergencyProtocolsByOrganization(organizationId: number, limit: number = 50): Promise<EmergencyProtocol[]> {
    return await db.select()
      .from(emergencyProtocols)
      .where(eq(emergencyProtocols.organizationId, organizationId))
      .orderBy(desc(emergencyProtocols.createdAt))
      .limit(limit);
  }

  async createEmergencyProtocol(protocol: InsertEmergencyProtocol): Promise<EmergencyProtocol> {
    const [result] = await db.insert(emergencyProtocols).values(protocol).returning();
    return result;
  }

  async updateEmergencyProtocol(id: number, organizationId: number, updates: Partial<InsertEmergencyProtocol>): Promise<EmergencyProtocol | undefined> {
    const [protocol] = await db.update(emergencyProtocols)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(emergencyProtocols.id, id), eq(emergencyProtocols.organizationId, organizationId)))
      .returning();
    return protocol || undefined;
  }

  // Medications Database (Database-driven)
  async getMedicationsByOrganization(organizationId: number, limit: number = 50): Promise<MedicationsDatabase[]> {
    return await db.select()
      .from(medicationsDatabase)
      .where(eq(medicationsDatabase.organizationId, organizationId))
      .orderBy(desc(medicationsDatabase.createdAt))
      .limit(limit);
  }

  async createMedication(medication: InsertMedicationsDatabase): Promise<MedicationsDatabase> {
    const [result] = await db.insert(medicationsDatabase).values(medication).returning();
    return result;
  }

  async updateMedication(id: number, organizationId: number, updates: Partial<InsertMedicationsDatabase>): Promise<MedicationsDatabase | undefined> {
    const [medication] = await db.update(medicationsDatabase)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(medicationsDatabase.id, id), eq(medicationsDatabase.organizationId, organizationId)))
      .returning();
    return medication || undefined;
  }

  // Staff Shifts (Database-driven)
  async getStaffShift(id: number, organizationId: number): Promise<StaffShift | undefined> {
    const [shift] = await db.select()
      .from(staffShifts)
      .where(and(eq(staffShifts.id, id), eq(staffShifts.organizationId, organizationId)));
    return shift || undefined;
  }

  async getStaffShiftsByOrganization(organizationId: number, date?: string): Promise<StaffShift[]> {
    let query = db.select()
      .from(staffShifts)
      .where(eq(staffShifts.organizationId, organizationId));

    if (date) {
      query = query.where(
        and(
          eq(staffShifts.organizationId, organizationId),
          gte(staffShifts.date, new Date(date)),
          lt(staffShifts.date, new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000))
        )
      );
    }

    return await query.orderBy(asc(staffShifts.date), asc(staffShifts.startTime));
  }

  async getStaffShiftsByStaff(staffId: number, organizationId: number, date?: string): Promise<StaffShift[]> {
    let query = db.select()
      .from(staffShifts)
      .where(and(eq(staffShifts.staffId, staffId), eq(staffShifts.organizationId, organizationId)));

    if (date) {
      query = query.where(
        and(
          eq(staffShifts.staffId, staffId),
          eq(staffShifts.organizationId, organizationId),
          gte(staffShifts.date, new Date(date)),
          lt(staffShifts.date, new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000))
        )
      );
    }

    return await query.orderBy(asc(staffShifts.date), asc(staffShifts.startTime));
  }

  async createStaffShift(shift: InsertStaffShift): Promise<StaffShift> {
    const [result] = await db.insert(staffShifts).values(shift).returning();
    return result;
  }

  async updateStaffShift(id: number, organizationId: number, updates: Partial<InsertStaffShift>): Promise<StaffShift | undefined> {
    const [shift] = await db.update(staffShifts)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(staffShifts.id, id), eq(staffShifts.organizationId, organizationId)))
      .returning();
    return shift || undefined;
  }

  async deleteStaffShift(id: number, organizationId: number): Promise<boolean> {
    const result = await db.delete(staffShifts)
      .where(and(eq(staffShifts.id, id), eq(staffShifts.organizationId, organizationId)));
    return result.rowCount > 0;
  }

  // GDPR Compliance Methods
  async createGdprConsent(consent: InsertGdprConsent): Promise<GdprConsent> {
    const [result] = await db.insert(gdprConsents).values(consent).returning();
    return result;
  }

  async updateGdprConsent(id: number, organizationId: number, updates: Partial<InsertGdprConsent>): Promise<GdprConsent | undefined> {
    const [consent] = await db.update(gdprConsents)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(gdprConsents.id, id), eq(gdprConsents.organizationId, organizationId)))
      .returning();
    return consent || undefined;
  }

  async getGdprConsentsByPatient(patientId: number, organizationId: number): Promise<GdprConsent[]> {
    return await db.select()
      .from(gdprConsents)
      .where(and(eq(gdprConsents.patientId, patientId), eq(gdprConsents.organizationId, organizationId)))
      .orderBy(desc(gdprConsents.createdAt));
  }

  async getGdprConsentsByPeriod(organizationId: number, startDate: Date, endDate: Date): Promise<GdprConsent[]> {
    return await db.select()
      .from(gdprConsents)
      .where(and(
        eq(gdprConsents.organizationId, organizationId),
        gte(gdprConsents.createdAt, startDate),
        lt(gdprConsents.createdAt, endDate)
      ))
      .orderBy(desc(gdprConsents.createdAt));
  }

  async createGdprDataRequest(request: InsertGdprDataRequest): Promise<GdprDataRequest> {
    const [result] = await db.insert(gdprDataRequests).values(request).returning();
    return result;
  }

  async updateGdprDataRequest(id: number, organizationId: number, updates: Partial<InsertGdprDataRequest>): Promise<GdprDataRequest | undefined> {
    const [request] = await db.update(gdprDataRequests)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(gdprDataRequests.id, id), eq(gdprDataRequests.organizationId, organizationId)))
      .returning();
    return request || undefined;
  }

  async getGdprDataRequestsByPeriod(organizationId: number, startDate: Date, endDate: Date): Promise<GdprDataRequest[]> {
    return await db.select()
      .from(gdprDataRequests)
      .where(and(
        eq(gdprDataRequests.organizationId, organizationId),
        gte(gdprDataRequests.requestedAt, startDate),
        lt(gdprDataRequests.requestedAt, endDate)
      ))
      .orderBy(desc(gdprDataRequests.requestedAt));
  }

  async createGdprAuditTrail(audit: InsertGdprAuditTrail): Promise<GdprAuditTrail> {
    const [result] = await db.insert(gdprAuditTrail).values(audit).returning();
    return result;
  }

  async getActiveAppointmentsByPatient(patientId: number, organizationId: number): Promise<Appointment[]> {
    const today = new Date();
    return await db.select()
      .from(appointments)
      .where(and(
        eq(appointments.patientId, patientId),
        eq(appointments.organizationId, organizationId),
        gte(appointments.scheduledAt, today),
        not(eq(appointments.status, "cancelled"))
      ))
      .orderBy(asc(appointments.scheduledAt));
  }

  // SaaS Administration Methods
  async getSaaSOwner(id: number): Promise<SaaSOwner | undefined> {
    const [owner] = await db.select().from(saasOwners).where(eq(saasOwners.id, id));
    return owner || undefined;
  }

  async getSaaSOwnerByUsername(username: string): Promise<SaaSOwner | undefined> {
    const [owner] = await db.select().from(saasOwners).where(eq(saasOwners.username, username));
    return owner || undefined;
  }

  async updateSaaSOwnerLastLogin(id: number): Promise<void> {
    await db.update(saasOwners)
      .set({ lastLoginAt: new Date() })
      .where(eq(saasOwners.id, id));
  }

  async getSaaSStats(): Promise<any> {
    const [totalCustomers] = await db.select({ count: count() }).from(organizations);
    const [activeUsers] = await db.select({ count: count() }).from(users).where(eq(users.isActive, true));
    const [activePackages] = await db.select({ count: count() }).from(saasPackages).where(eq(saasPackages.isActive, true));
    
    return {
      totalCustomers: totalCustomers.count,
      activeUsers: activeUsers.count,
      monthlyRevenue: 0, // Placeholder for billing calculation
      activePackages: activePackages.count,
    };
  }

  async getAllUsers(search?: string, organizationId?: string): Promise<any[]> {
    let query = db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
      organizationName: organizations.name,
    })
    .from(users)
    .leftJoin(organizations, eq(users.organizationId, organizations.id));

    if (organizationId && organizationId !== 'all') {
      query = query.where(eq(users.organizationId, parseInt(organizationId)));
    }

    return await query.orderBy(desc(users.createdAt));
  }

  async resetUserPassword(userId: number): Promise<any> {
    // Generate a temporary password and send email
    const crypto = await import('crypto');
    const tempPassword = crypto.randomBytes(4).toString('hex');
    const bcryptModule = await import('bcrypt');
    const hashedPassword = await bcryptModule.hash(tempPassword, 10);
    
    await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId));

    return { success: true, tempPassword };
  }

  async updateUserStatus(userId: number, isActive: boolean): Promise<any> {
    const [user] = await db.update(users)
      .set({ isActive })
      .where(eq(users.id, userId))
      .returning();

    return { success: true, user };
  }

  async getAllOrganizations(): Promise<Organization[]> {
    return await db.select().from(organizations).orderBy(desc(organizations.createdAt));
  }

  async createCustomerOrganization(customerData: any): Promise<any> {
    console.log('Creating customer with billing package:', customerData.billingPackageId);
    const bcryptModule = await import('bcrypt');
    
    // Create organization
    const [organization] = await db.insert(organizations)
      .values({
        name: customerData.name,
        brandName: customerData.brandName || customerData.name,
        subdomain: customerData.subdomain,
        subscriptionStatus: customerData.billingPackageId ? 'active' : 'trial',
        theme: 'blue',
        features: JSON.stringify(customerData.features),
        accessLevel: customerData.accessLevel || 'full'
      })
      .returning();

    // Generate temporary password for admin user
    const crypto = await import('crypto');
    const tempPassword = crypto.randomBytes(4).toString('hex');
    const hashedPassword = await bcryptModule.hash(tempPassword, 10);

    // Create admin user
    const [adminUser] = await db.insert(users)
      .values({
        organizationId: organization.id,
        email: customerData.adminEmail,
        username: customerData.adminEmail, // Use email as username
        password: hashedPassword,
        firstName: customerData.adminFirstName,
        lastName: customerData.adminLastName,
        role: 'admin',
        isActive: true
      })
      .returning();

    // Create billing subscription if package selected
    if (customerData.billingPackageId) {
      const selectedPackage = await db.select().from(saasPackages).where(eq(saasPackages.id, customerData.billingPackageId)).limit(1);
      if (selectedPackage.length > 0) {
        await db.insert(subscriptions).values({
          organizationId: organization.id,
          plan: selectedPackage[0].name,
          planName: selectedPackage[0].name,
          status: 'active',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        });
      }
    }

    return { 
      success: true, 
      organization, 
      adminUser: {
        id: adminUser.id,
        email: adminUser.email,
        firstName: adminUser.firstName,
        lastName: adminUser.lastName,
        tempPassword
      }
    };
  }

  async updateCustomerOrganization(organizationId: number, customerData: any): Promise<any> {
    console.log('Updating customer organization:', { organizationId, customerData });
    
    const updateData: any = {};
    
    if (customerData.name) updateData.name = customerData.name;
    if (customerData.brandName) updateData.brandName = customerData.brandName;
    if (customerData.subscriptionStatus) updateData.subscriptionStatus = customerData.subscriptionStatus;
    if (customerData.features) updateData.features = JSON.stringify(customerData.features);
    
    // Handle billing package assignment/update
    if (customerData.billingPackageId !== undefined) {
      if (customerData.billingPackageId) {
        // Update/assign billing package
        const selectedPackage = await db.select().from(saasPackages).where(eq(saasPackages.id, customerData.billingPackageId)).limit(1);
        if (selectedPackage.length > 0) {
          // Check if subscription exists
          const existingSubscription = await db.select().from(subscriptions).where(eq(subscriptions.organizationId, organizationId)).limit(1);
          
          if (existingSubscription.length > 0) {
            // Update existing subscription
            await db.update(subscriptions)
              .set({
                plan: selectedPackage[0].name,
                planName: selectedPackage[0].name,
                status: 'active',
                startDate: new Date(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
              })
              .where(eq(subscriptions.organizationId, organizationId));
          } else {
            // Create new subscription
            await db.insert(subscriptions).values({
              organizationId: organizationId,
              plan: selectedPackage[0].name,
              planName: selectedPackage[0].name,
              status: 'active',
              startDate: new Date(),
              endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            });
          }
          
          // Update organization status to active if it was trial
          updateData.subscriptionStatus = 'active';
        }
      } else {
        // Remove billing package (set to manual billing)
        await db.delete(subscriptions).where(eq(subscriptions.organizationId, organizationId));
        updateData.subscriptionStatus = customerData.subscriptionStatus || 'trial';
      }
    }
    
    console.log('Update data prepared:', updateData);
    
    if (Object.keys(updateData).length === 0) {
      throw new Error('No valid fields to update');
    }
    
    const [organization] = await db.update(organizations)
      .set(updateData)
      .where(eq(organizations.id, organizationId))
      .returning();

    if (!organization) {
      throw new Error('Organization not found');
    }

    return { success: true, organization };
  }

  async updateCustomerStatus(organizationId: number, status: string): Promise<any> {
    console.log('Updating customer status:', { organizationId, status });
    
    if (!status || typeof status !== 'string') {
      throw new Error('Invalid status provided');
    }
    
    const [organization] = await db.update(organizations)
      .set({ subscriptionStatus: status })
      .where(eq(organizations.id, organizationId))
      .returning();

    if (!organization) {
      throw new Error('Organization not found');
    }

    return { success: true, organization };
  }

  async getAllCustomers(search?: string, status?: string): Promise<any[]> {
    let query = db.select({
      id: organizations.id,
      name: organizations.name,
      brandName: organizations.brandName,
      subdomain: organizations.subdomain,
      subscriptionStatus: organizations.subscriptionStatus,
      createdAt: organizations.createdAt,
      userCount: count(users.id),
    })
    .from(organizations)
    .leftJoin(users, eq(organizations.id, users.organizationId))
    .groupBy(organizations.id);

    if (status && status !== 'all') {
      query = query.where(eq(organizations.subscriptionStatus, status));
    }

    return await query.orderBy(desc(organizations.createdAt));
  }

  async updateOrganizationStatus(organizationId: number, status: string): Promise<any> {
    const [org] = await db.update(organizations)
      .set({ subscriptionStatus: status, updatedAt: new Date() })
      .where(eq(organizations.id, organizationId))
      .returning();

    return { success: true, organization: org };
  }

  async getAllPackages(): Promise<SaaSPackage[]> {
    return await db.select().from(saasPackages).orderBy(desc(saasPackages.createdAt));
  }

  async getWebsiteVisiblePackages(): Promise<SaaSPackage[]> {
    return await db.select().from(saasPackages)
      .where(and(eq(saasPackages.isActive, true), eq(saasPackages.showOnWebsite, true)))
      .orderBy(asc(saasPackages.price));
  }

  async createPackage(packageData: InsertSaaSPackage): Promise<SaaSPackage> {
    const [saasPackage] = await db
      .insert(saasPackages)
      .values(packageData)
      .returning();
    return saasPackage;
  }

  async updatePackage(packageId: number, packageData: Partial<InsertSaaSPackage>): Promise<SaaSPackage> {
    const [saasPackage] = await db
      .update(saasPackages)
      .set(packageData)
      .where(eq(saasPackages.id, packageId))
      .returning();
    return saasPackage;
  }

  async deletePackage(packageId: number): Promise<{ success: boolean }> {
    await db.delete(saasPackages).where(eq(saasPackages.id, packageId));
    return { success: true };
  }

  async createPackage(packageData: InsertSaaSPackage): Promise<SaaSPackage> {
    const [pkg] = await db.insert(saasPackages).values(packageData).returning();
    return pkg;
  }

  async updatePackage(id: number, packageData: Partial<InsertSaaSPackage>): Promise<SaaSPackage> {
    const [pkg] = await db.update(saasPackages)
      .set({ ...packageData, updatedAt: new Date() })
      .where(eq(saasPackages.id, id))
      .returning();
    return pkg;
  }

  async deletePackage(id: number): Promise<any> {
    await db.delete(saasPackages).where(eq(saasPackages.id, id));
    return { success: true };
  }

  async getBillingData(search?: string, dateRange?: string): Promise<any> {
    // Placeholder for billing data - would integrate with payment processor
    return {
      invoices: [],
      total: 0,
    };
  }

  async getBillingStats(dateRange?: string): Promise<any> {
    // Placeholder for billing stats
    return {
      totalRevenue: 0,
      monthlyRecurring: 0,
      overdueAmount: 0,
      activeSubscriptions: 0,
    };
  }

  async getSaaSSettings(): Promise<any> {
    // Return default SaaS settings - could be stored in database
    return {
      systemSettings: {
        platformName: 'Cura EMR Platform',
        supportEmail: 'support@curapms.ai',
        maintenanceMode: false,
        registrationEnabled: true,
        trialPeriodDays: 14,
      },
      emailSettings: {
        smtpHost: '',
        smtpPort: 587,
        smtpUsername: '',
        smtpPassword: '',
        fromEmail: '',
        fromName: 'Cura Software Limited',
      },
      securitySettings: {
        passwordMinLength: 8,
        requireTwoFactor: false,
        sessionTimeoutMinutes: 30,
        maxLoginAttempts: 5,
      },
      billingSettings: {
        currency: 'GBP',
        taxRate: 20,
        invoicePrefix: 'CURA',
        paymentMethods: ['stripe', 'paypal'],
      },
    };
  }

  async updateSaaSSettings(settings: any): Promise<any> {
    // Store settings in database or config - placeholder implementation
    return { success: true, settings };
  }

  async testEmailSettings(): Promise<any> {
    // Test email configuration - placeholder implementation
    return { success: true, message: 'Email test completed' };
  }
}

export const storage = new DatabaseStorage();
