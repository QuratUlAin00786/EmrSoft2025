import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar, decimal } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Organizations (Tenants)
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  subdomain: varchar("subdomain", { length: 50 }).notNull().unique(),
  region: varchar("region", { length: 10 }).notNull().default("UK"), // UK, EU, ME, SA, US
  brandName: text("brand_name").notNull(),
  settings: jsonb("settings").$type<{
    theme?: { primaryColor?: string; logoUrl?: string };
    compliance?: { gdprEnabled?: boolean; dataResidency?: string };
    features?: { aiEnabled?: boolean; billingEnabled?: boolean };
  }>().default({}),
  subscriptionStatus: varchar("subscription_status", { length: 20 }).notNull().default("trial"), // trial, active, suspended, cancelled
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  email: text("email").notNull(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: varchar("role", { length: 20 }).notNull().default("doctor"), // admin, doctor, nurse, receptionist
  department: text("department"),
  isActive: boolean("is_active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Patients
export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  patientId: text("patient_id").notNull(), // Custom patient ID per organization
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  dateOfBirth: timestamp("date_of_birth").notNull(),
  email: text("email"),
  phone: text("phone"),
  nhsNumber: text("nhs_number"), // NHS number for UK patients
  address: jsonb("address").$type<{
    street?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  }>().default({}),
  insuranceInfo: jsonb("insurance_info").$type<{
    provider?: string;
    policyNumber?: string;
    groupNumber?: string;
    memberNumber?: string;
    planType?: string;
    effectiveDate?: string;
    expirationDate?: string;
    copay?: number;
    deductible?: number;
    isActive?: boolean;
  }>().default({}),
  emergencyContact: jsonb("emergency_contact").$type<{
    name?: string;
    relationship?: string;
    phone?: string;
    email?: string;
  }>().default({}),
  medicalHistory: jsonb("medical_history").$type<{
    allergies?: string[];
    chronicConditions?: string[];
    medications?: string[];
    familyHistory?: {
      father?: string[];
      mother?: string[];
      siblings?: string[];
      grandparents?: string[];
    };
    socialHistory?: {
      smoking?: string;
      alcohol?: string;
      occupation?: string;
      maritalStatus?: string;
    };
    immunizations?: Array<{
      vaccine: string;
      date: string;
      provider: string;
    }>;
  }>().default({}),
  riskLevel: varchar("risk_level", { length: 10 }).notNull().default("low"), // low, medium, high
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Medical Records
export const medicalRecords = pgTable("medical_records", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  patientId: integer("patient_id").notNull(),
  providerId: integer("provider_id").notNull(), // user who created the record
  type: varchar("type", { length: 20 }).notNull(), // consultation, prescription, lab_result, imaging
  title: text("title").notNull(),
  notes: text("notes"),
  diagnosis: text("diagnosis"),
  treatment: text("treatment"),
  prescription: jsonb("prescription").$type<{
    medications?: Array<{
      name: string;
      dosage: string;
      frequency: string;
      duration: string;
    }>;
  }>().default({}),
  attachments: jsonb("attachments").$type<string[]>().default([]),
  aiSuggestions: jsonb("ai_suggestions").$type<{
    riskAssessment?: string;
    recommendations?: string[];
    drugInteractions?: string[];
  }>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Appointments
export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  patientId: integer("patient_id").notNull(),
  providerId: integer("provider_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  scheduledAt: timestamp("scheduled_at").notNull(),
  duration: integer("duration").notNull().default(30), // minutes
  status: varchar("status", { length: 20 }).notNull().default("scheduled"), // scheduled, completed, cancelled, no_show
  type: varchar("type", { length: 20 }).notNull().default("consultation"), // consultation, follow_up, procedure
  location: text("location"),
  isVirtual: boolean("is_virtual").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// AI Insights
export const aiInsights = pgTable("ai_insights", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  patientId: integer("patient_id"),
  type: varchar("type", { length: 30 }).notNull(), // risk_alert, drug_interaction, treatment_suggestion, preventive_care
  title: text("title").notNull(),
  description: text("description").notNull(),
  severity: varchar("severity", { length: 10 }).notNull().default("medium"), // low, medium, high, critical
  actionRequired: boolean("action_required").notNull().default(false),
  confidence: varchar("confidence", { length: 10 }), // 0.00 to 1.00
  metadata: jsonb("metadata").$type<{
    relatedConditions?: string[];
    suggestedActions?: string[];
    references?: string[];
  }>().default({}),
  status: varchar("status", { length: 20 }).notNull().default("active"), // active, dismissed, resolved
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Subscriptions
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  plan: varchar("plan", { length: 20 }).notNull(), // starter, professional, enterprise
  status: varchar("status", { length: 20 }).notNull().default("trial"), // trial, active, suspended, cancelled
  userLimit: integer("user_limit").notNull().default(5),
  currentUsers: integer("current_users").notNull().default(0),
  monthlyPrice: decimal("monthly_price", { precision: 10, scale: 2 }),
  trialEndsAt: timestamp("trial_ends_at"),
  nextBillingAt: timestamp("next_billing_at"),
  features: jsonb("features").$type<{
    aiInsights?: boolean;
    advancedReporting?: boolean;
    apiAccess?: boolean;
    whiteLabel?: boolean;
  }>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  patients: many(patients),
  subscription: many(subscriptions),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
  medicalRecords: many(medicalRecords),
  appointments: many(appointments),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [patients.organizationId],
    references: [organizations.id],
  }),
  medicalRecords: many(medicalRecords),
  appointments: many(appointments),
  aiInsights: many(aiInsights),
}));

export const medicalRecordsRelations = relations(medicalRecords, ({ one }) => ({
  organization: one(organizations, {
    fields: [medicalRecords.organizationId],
    references: [organizations.id],
  }),
  patient: one(patients, {
    fields: [medicalRecords.patientId],
    references: [patients.id],
  }),
  provider: one(users, {
    fields: [medicalRecords.providerId],
    references: [users.id],
  }),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  organization: one(organizations, {
    fields: [appointments.organizationId],
    references: [organizations.id],
  }),
  patient: one(patients, {
    fields: [appointments.patientId],
    references: [patients.id],
  }),
  provider: one(users, {
    fields: [appointments.providerId],
    references: [users.id],
  }),
}));

export const aiInsightsRelations = relations(aiInsights, ({ one }) => ({
  organization: one(organizations, {
    fields: [aiInsights.organizationId],
    references: [organizations.id],
  }),
  patient: one(patients, {
    fields: [aiInsights.patientId],
    references: [patients.id],
  }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  organization: one(organizations, {
    fields: [subscriptions.organizationId],
    references: [organizations.id],
  }),
}));

// Insert schemas
export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastLoginAt: true,
});

export const insertPatientSchema = createInsertSchema(patients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMedicalRecordSchema = createInsertSchema(medicalRecords).omit({
  id: true,
  createdAt: true,
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
});

export const insertAiInsightSchema = createInsertSchema(aiInsights).omit({
  id: true,
  createdAt: true,
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;

export type MedicalRecord = typeof medicalRecords.$inferSelect;
export type InsertMedicalRecord = z.infer<typeof insertMedicalRecordSchema>;

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;

export type AiInsight = typeof aiInsights.$inferSelect;
export type InsertAiInsight = z.infer<typeof insertAiInsightSchema>;

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
