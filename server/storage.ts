import { 
  organizations, users, patients, medicalRecords, appointments, aiInsights, subscriptions, patientCommunications, consultations,
  type Organization, type InsertOrganization,
  type User, type InsertUser,
  type Patient, type InsertPatient,
  type MedicalRecord, type InsertMedicalRecord,
  type Appointment, type InsertAppointment,
  type AiInsight, type InsertAiInsight,
  type Subscription, type InsertSubscription,
  type PatientCommunication, type InsertPatientCommunication,
  type Consultation, type InsertConsultation
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, count } from "drizzle-orm";

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
    const [created] = await db.insert(organizations).values(organization).returning();
    return created;
  }

  async updateOrganization(id: number, updates: Partial<InsertOrganization>): Promise<Organization | undefined> {
    const [updated] = await db.update(organizations).set({ 
      ...updates,
      updatedAt: new Date(),
    }).where(eq(organizations.id, id)).returning();
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
    const [created] = await db.insert(patients).values([patient]).returning();
    return created;
  }

  async updatePatient(id: number, organizationId: number, updates: Partial<InsertPatient>): Promise<Patient | undefined> {
    const cleanUpdates = { ...updates };
    delete cleanUpdates.address; // Remove address to avoid type issues
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
    const [created] = await db.insert(medicalRecords).values([record]).returning();
    return created;
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
    const [created] = await db.insert(aiInsights).values([insight]).returning();
    return created;
  }

  async updateAiInsight(id: number, organizationId: number, updates: Partial<InsertAiInsight>): Promise<AiInsight | undefined> {
    const cleanUpdates = { ...updates };
    delete cleanUpdates.metadata; // Remove metadata to avoid type issues
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
    const [created] = await db.insert(subscriptions).values([subscription]).returning();
    return created;
  }

  async updateSubscription(organizationId: number, updates: Partial<InsertSubscription>): Promise<Subscription | undefined> {
    const cleanUpdates = { ...updates };
    delete cleanUpdates.features; // Remove features to avoid type issues
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
    const [newCommunication] = await db
      .insert(patientCommunications)
      .values(communication)
      .returning();
    return newCommunication;
  }

  async updatePatientCommunication(id: number, organizationId: number, updates: Partial<InsertPatientCommunication>): Promise<PatientCommunication | undefined> {
    const [updatedCommunication] = await db
      .update(patientCommunications)
      .set({ ...updates, updatedAt: new Date() })
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
    const [created] = await db
      .insert(consultations)
      .values(consultation)
      .returning();
    return created;
  }

  async updateConsultation(id: number, organizationId: number, updates: Partial<InsertConsultation>): Promise<Consultation | undefined> {
    const [updated] = await db
      .update(consultations)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(consultations.id, id), eq(consultations.organizationId, organizationId)))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
