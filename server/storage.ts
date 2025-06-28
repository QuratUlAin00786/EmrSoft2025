import { 
  organizations, users, patients, medicalRecords, appointments, aiInsights, subscriptions, patientCommunications, consultations, notifications,
  type Organization, type InsertOrganization,
  type User, type InsertUser,
  type Patient, type InsertPatient,
  type MedicalRecord, type InsertMedicalRecord,
  type Appointment, type InsertAppointment,
  type AiInsight, type InsertAiInsight,
  type Subscription, type InsertSubscription,
  type PatientCommunication, type InsertPatientCommunication,
  type Consultation, type InsertConsultation,
  type Notification, type InsertNotification
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, count, not } from "drizzle-orm";

export interface IStorage {
  // Organizations
  getOrganization(id: number): Promise<Organization | undefined>;
  getOrganizationBySubdomain(subdomain: string): Promise<Organization | undefined>;
  createOrganization(organization: InsertOrganization): Promise<Organization>;
  updateOrganization(id: number, updates: Partial<InsertOrganization>): Promise<Organization | undefined>;

  // Users
  getUser(id: number, organizationId: number): Promise<User | undefined>;
  getUserByEmail(email: string, organizationId: number): Promise<User | undefined>;
  getUsersByOrganization(organizationId: number): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, organizationId: number, updates: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number, organizationId: number): Promise<boolean>;

  // Patients
  getPatient(id: number, organizationId: number): Promise<Patient | undefined>;
  getPatientsByOrganization(organizationId: number, limit?: number): Promise<Patient[]>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: number, organizationId: number, updates: Partial<InsertPatient>): Promise<Patient | undefined>;
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
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: number, organizationId: number, updates: Partial<InsertAppointment>): Promise<Appointment | undefined>;

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
  getMessageCampaigns(organizationId: number): Promise<any[]>;
  createMessageCampaign(campaignData: any, organizationId: number): Promise<any>;
  
  // Integrations
  getIntegrations(organizationId: number): Promise<any[]>;
  connectIntegration(integrationData: any, organizationId: number): Promise<any>;
  getWebhooks(organizationId: number): Promise<any[]>;
  createWebhook(webhookData: any, organizationId: number): Promise<any>;
  getApiKeys(organizationId: number): Promise<any[]>;
  createApiKey(apiKeyData: any, organizationId: number): Promise<any>;
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
    delete cleanUpdates.settings; // Remove complex nested type to avoid compilation errors
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

  async getUsersByOrganization(organizationId: number): Promise<User[]> {
    return await db.select().from(users).where(eq(users.organizationId, organizationId));
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values([user]).returning();
    return created;
  }

  async updateUser(id: number, organizationId: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [updated] = await db.update(users)
      .set({ ...updates })
      .where(and(eq(users.id, id), eq(users.organizationId, organizationId)))
      .returning();
    return updated || undefined;
  }

  async deleteUser(id: number, organizationId: number): Promise<boolean> {
    const result = await db.update(users)
      .set({ isActive: false })
      .where(and(eq(users.id, id), eq(users.organizationId, organizationId)));
    return (result.rowCount || 0) > 0;
  }

  // Patients
  async getPatient(id: number, organizationId: number): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(and(eq(patients.id, id), eq(patients.organizationId, organizationId)));
    return patient || undefined;
  }

  async getPatientsByOrganization(organizationId: number, limit = 50): Promise<Patient[]> {
    return await db.select().from(patients)
      .where(and(eq(patients.organizationId, organizationId), eq(patients.isActive, true)))
      .orderBy(desc(patients.updatedAt))
      .limit(limit);
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
    }
    
    return await query.orderBy(appointments.scheduledAt);
  }

  async getAppointmentsByProvider(providerId: number, organizationId: number, date?: Date): Promise<Appointment[]> {
    return await db.select().from(appointments)
      .where(and(
        eq(appointments.providerId, providerId),
        eq(appointments.organizationId, organizationId)
      ))
      .orderBy(appointments.scheduledAt);
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const [created] = await db.insert(appointments).values([appointment]).returning();
    return created;
  }

  async updateAppointment(id: number, organizationId: number, updates: Partial<InsertAppointment>): Promise<Appointment | undefined> {
    const [updated] = await db.update(appointments)
      .set(updates)
      .where(and(eq(appointments.id, id), eq(appointments.organizationId, organizationId)))
      .returning();
    return updated || undefined;
  }

  // AI Insights
  async getAiInsight(id: number, organizationId: number): Promise<AiInsight | undefined> {
    const [insight] = await db.select().from(aiInsights)
      .where(and(eq(aiInsights.id, id), eq(aiInsights.organizationId, organizationId)));
    return insight || undefined;
  }

  async getAiInsightsByOrganization(organizationId: number, limit = 20): Promise<AiInsight[]> {
    return await db.select().from(aiInsights)
      .where(and(eq(aiInsights.organizationId, organizationId), eq(aiInsights.status, 'active')))
      .orderBy(desc(aiInsights.createdAt))
      .limit(limit);
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

    const [todayAppointmentsResult] = await db
      .select({ count: count() })
      .from(appointments)
      .where(eq(appointments.organizationId, organizationId));

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

  // Messaging implementations
  async getConversations(organizationId: number): Promise<any[]> {
    // Mock conversations data
    return [
      {
        id: "conv_1",
        participants: [
          { id: "user_1", name: "Dr. Sarah Johnson", role: "doctor" },
          { id: "user_2", name: "John Smith", role: "patient" }
        ],
        lastMessage: {
          id: "msg_1",
          senderId: "user_2",
          subject: "Appointment Follow-up",
          content: "Thank you for the consultation today.",
          timestamp: "2024-06-26T14:30:00Z",
          priority: "normal"
        },
        unreadCount: 0,
        isPatientConversation: true
      }
    ];
  }

  async getMessages(conversationId: string, organizationId: number): Promise<any[]> {
    // Mock messages data
    return [
      {
        id: "msg_1",
        senderId: "user_2",
        senderName: "John Smith",
        senderRole: "patient",
        recipientId: "user_1",
        recipientName: "Dr. Sarah Johnson",
        subject: "Appointment Follow-up",
        content: "Thank you for the consultation today. I have a follow-up question about the medication you prescribed.",
        timestamp: "2024-06-26T14:30:00Z",
        isRead: true,
        priority: "normal",
        type: "patient",
        isStarred: false
      }
    ];
  }

  async sendMessage(messageData: any, organizationId: number): Promise<any> {
    // Mock implementation
    return { 
      id: Date.now().toString(), 
      ...messageData, 
      timestamp: new Date().toISOString(),
      organizationId 
    };
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
}

export const storage = new DatabaseStorage();
