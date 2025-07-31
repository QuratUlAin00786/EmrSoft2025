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
  updatedAt: timestamp("updated_at").defaultNow(),
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
  role: varchar("role", { length: 20 }).notNull().default("doctor"), // admin, doctor, nurse, receptionist, patient, sample_taker
  department: text("department"),
  workingDays: jsonb("working_days").$type<string[]>().default([]),
  workingHours: jsonb("working_hours").$type<{
    start?: string;
    end?: string;
  }>().default({}),
  permissions: jsonb("permissions").$type<{
    modules?: {
      patients?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
      appointments?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
      medicalRecords?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
      prescriptions?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
      billing?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
      analytics?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
      userManagement?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
      settings?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
      aiInsights?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
      messaging?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
      telemedicine?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
      populationHealth?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
      clinicalDecision?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
      labResults?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
      medicalImaging?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
      voiceDocumentation?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
      forms?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
      integrations?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
      automation?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
      mobileHealth?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
    };
    fields?: {
      patientSensitiveInfo?: boolean;
      financialData?: boolean;
      medicalHistory?: boolean;
      prescriptionDetails?: boolean;
      labResults?: boolean;
      imagingResults?: boolean;
      billingInformation?: boolean;
      insuranceDetails?: boolean;
    };
  }>().default({}),
  isActive: boolean("is_active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Roles
export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  name: varchar("name", { length: 50 }).notNull(),
  displayName: text("display_name").notNull(),
  description: text("description").notNull(),
  permissions: jsonb("permissions").$type<{
    modules: {
      [key: string]: {
        view: boolean;
        create: boolean;
        edit: boolean;
        delete: boolean;
      };
    };
    fields: {
      [key: string]: {
        view: boolean;
        edit: boolean;
      };
    };
  }>().notNull(),
  isSystem: boolean("is_system").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Staff Shifts and Availability
export const staffShifts = pgTable("staff_shifts", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  staffId: integer("staff_id").notNull(),
  date: timestamp("date").notNull(),
  shiftType: varchar("shift_type", { length: 20 }).notNull().default("regular"), // regular, overtime, on_call, absent
  startTime: varchar("start_time", { length: 5 }).notNull(), // "09:00"
  endTime: varchar("end_time", { length: 5 }).notNull(), // "17:00"
  status: varchar("status", { length: 20 }).notNull().default("scheduled"), // scheduled, completed, cancelled, absent
  notes: text("notes"),
  isAvailable: boolean("is_available").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
  flags: jsonb("flags").$type<string[]>().default([]),
  communicationPreferences: jsonb("communication_preferences").$type<{
    preferredMethod?: "email" | "sms" | "phone" | "whatsapp";
    emailNotifications?: boolean;
    smsNotifications?: boolean;
    appointmentReminders?: boolean;
    medicationReminders?: boolean;
    followUpReminders?: boolean;
    marketingCommunications?: boolean;
    emergencyContactOnly?: boolean;
  }>().default({}),
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

// Documents - For Forms and other document storage
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  type: varchar("type", { length: 50 }).notNull().default("medical_form"), // medical_form, letter, report, etc.
  content: text("content").notNull(), // HTML content of the document
  metadata: jsonb("metadata").$type<{
    subject?: string;
    recipient?: string;
    location?: string;
    practitioner?: string;
    header?: string;
    templateUsed?: string;
  }>().default({}),
  isTemplate: boolean("is_template").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

// Consultations
export const consultations = pgTable("consultations", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  appointmentId: integer("appointment_id"),
  patientId: integer("patient_id").notNull(),
  providerId: integer("provider_id").notNull(),
  consultationType: varchar("consultation_type", { length: 20 }).notNull(), // routine, urgent, follow_up, emergency
  chiefComplaint: text("chief_complaint"),
  historyOfPresentIllness: text("history_of_present_illness"),
  vitals: jsonb("vitals").$type<{
    bloodPressure?: string;
    heartRate?: string;
    temperature?: string;
    respiratoryRate?: string;
    oxygenSaturation?: string;
    weight?: string;
    height?: string;
  }>().default({}),
  physicalExam: text("physical_exam"),
  assessment: text("assessment"),
  diagnosis: text("diagnosis").array(),
  treatmentPlan: text("treatment_plan"),
  prescriptions: text("prescriptions").array(),
  followUpInstructions: text("follow_up_instructions"),
  consultationNotes: text("consultation_notes"),
  status: varchar("status", { length: 20 }).notNull().default("in_progress"), // in_progress, completed, cancelled
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  duration: integer("duration"), // in minutes
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Prescriptions
export const prescriptions = pgTable("prescriptions", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  providerId: integer("provider_id").notNull().references(() => users.id),
  consultationId: integer("consultation_id").references(() => consultations.id),
  prescriptionNumber: varchar("prescription_number", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("active"), // active, completed, cancelled, expired
  diagnosis: text("diagnosis"),
  medications: jsonb("medications").$type<Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    quantity: number;
    refills: number;
    instructions: string;
    genericAllowed: boolean;
    ndc?: string; // National Drug Code
    startDate?: string;
    endDate?: string;
  }>>().default([]),
  pharmacy: jsonb("pharmacy").$type<{
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
    fax?: string;
    npi?: string; // National Provider Identifier
  }>().default({}),
  prescribedAt: timestamp("prescribed_at").defaultNow().notNull(),
  validUntil: timestamp("valid_until"),
  notes: text("notes"),
  isElectronic: boolean("is_electronic").notNull().default(true),
  interactions: jsonb("interactions").$type<Array<{
    severity: "minor" | "moderate" | "major";
    description: string;
    medications: string[];
  }>>().default([]),
  signature: jsonb("signature").$type<{
    doctorSignature?: string; // base64 encoded signature image
    signedBy?: string; // doctor name
    signedAt?: string; // ISO timestamp
    signerId?: number; // user ID who signed
  }>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Medical Images
export const medicalImages = pgTable("medical_images", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  uploadedBy: integer("uploaded_by").notNull().references(() => users.id),
  studyType: text("study_type").notNull(),
  modality: varchar("modality", { length: 50 }).notNull(), // X-Ray, CT, MRI, Ultrasound, etc.
  bodyPart: text("body_part"),
  indication: text("indication"),
  priority: varchar("priority", { length: 20 }).notNull().default("routine"), // routine, urgent, stat
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(), // in bytes
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  imageData: text("image_data"), // base64 encoded image data
  status: varchar("status", { length: 20 }).notNull().default("uploaded"), // uploaded, processing, analyzed, reported
  metadata: jsonb("metadata").$type<{
    imageCount?: number;
    totalSize?: string;
    resolution?: string;
    acquisitionDate?: string;
  }>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Patient Communications Tracking
export const patientCommunications = pgTable("patient_communications", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  sentBy: integer("sent_by").notNull().references(() => users.id),
  type: varchar("type", { length: 50 }).notNull(), // appointment_reminder, medication_reminder, follow_up_reminder, billing_notice, marketing
  method: varchar("method", { length: 20 }).notNull(), // email, sms, phone, whatsapp
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, sent, delivered, failed, opened, clicked
  message: text("message").notNull(),
  scheduledFor: timestamp("scheduled_for"),
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata").$type<{
    appointmentId?: number;
    reminderType?: string;
    urgency?: "low" | "medium" | "high";
    retryCount?: number;
    cost?: number;
    provider?: string; // Twilio, SendGrid, etc.
    flagType?: "urgent" | "follow-up" | "billing" | "general";
    priority?: "low" | "medium" | "high" | "urgent";
    method?: string;
  }>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  userId: integer("user_id").notNull().references(() => users.id), // Who should receive this notification
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: varchar("type", { length: 50 }).notNull(), // appointment_reminder, lab_result, prescription_alert, system_alert, payment_due, etc.
  priority: varchar("priority", { length: 20 }).notNull().default("normal"), // low, normal, high, critical
  status: varchar("status", { length: 20 }).notNull().default("unread"), // unread, read, dismissed, archived
  relatedEntityType: varchar("related_entity_type", { length: 50 }), // patient, appointment, prescription, etc.
  relatedEntityId: integer("related_entity_id"), // ID of the related entity
  actionUrl: text("action_url"), // URL to navigate to when clicked
  isActionable: boolean("is_actionable").notNull().default(false), // Whether this notification requires an action
  scheduledFor: timestamp("scheduled_for"), // For delayed notifications
  expiresAt: timestamp("expires_at"), // When notification should auto-expire
  metadata: jsonb("metadata").$type<{
    patientId?: number;
    patientName?: string;
    appointmentId?: number;
    prescriptionId?: number;
    urgency?: "low" | "medium" | "high" | "critical";
    department?: string;
    requiresResponse?: boolean;
    autoMarkAsRead?: boolean;
    icon?: string;
    color?: string;
  }>().default({}),
  readAt: timestamp("read_at"),
  dismissedAt: timestamp("dismissed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// GDPR Consent Management
export const gdprConsents = pgTable("gdpr_consents", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  consentType: varchar("consent_type", { length: 50 }).notNull(), // data_processing, marketing, research, data_sharing
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, granted, withdrawn, expired
  grantedAt: timestamp("granted_at"),
  withdrawnAt: timestamp("withdrawn_at"),
  expiresAt: timestamp("expires_at"),
  purpose: text("purpose").notNull(), // specific purpose for data processing
  legalBasis: varchar("legal_basis", { length: 50 }).notNull(), // legitimate_interest, consent, contract, legal_obligation
  dataCategories: jsonb("data_categories").$type<string[]>().default([]), // personal_data, health_data, financial_data
  retentionPeriod: integer("retention_period"), // in months
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  consentMethod: varchar("consent_method", { length: 30 }).notNull().default("digital"), // digital, written, verbal
  metadata: jsonb("metadata").$type<{
    version?: string;
    language?: string;
    consentDocument?: string;
    witnesses?: string[];
  }>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// GDPR Data Requests (Right to Access, Portability, Erasure)
export const gdprDataRequests = pgTable("gdpr_data_requests", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  requestType: varchar("request_type", { length: 30 }).notNull(), // access, portability, erasure, rectification
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, in_progress, completed, rejected
  requestReason: text("request_reason"),
  identityVerified: boolean("identity_verified").notNull().default(false),
  processedBy: integer("processed_by").references(() => users.id),
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  dueDate: timestamp("due_date").notNull(), // 30 days from request
  responseData: jsonb("response_data").$type<{
    exportedFiles?: string[];
    dataCategories?: string[];
    deletedRecords?: string[];
    rectificationChanges?: any[];
  }>().default({}),
  rejectionReason: text("rejection_reason"),
  communicationLog: jsonb("communication_log").$type<Array<{
    timestamp: string;
    type: string;
    message: string;
    sentBy: string;
  }>>().default([]),
  metadata: jsonb("metadata").$type<{
    requestMethod?: string; // email, portal, written
    documentsSent?: string[];
    followUpRequired?: boolean;
  }>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// GDPR Audit Trail
export const gdprAuditTrail = pgTable("gdpr_audit_trail", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  userId: integer("user_id").references(() => users.id),
  patientId: integer("patient_id").references(() => patients.id),
  action: varchar("action", { length: 50 }).notNull(), // data_access, data_export, data_deletion, consent_change
  resourceType: varchar("resource_type", { length: 30 }).notNull(), // patient, medical_record, prescription, etc.
  resourceId: integer("resource_id"),
  dataCategories: jsonb("data_categories").$type<string[]>().default([]),
  legalBasis: varchar("legal_basis", { length: 50 }),
  purpose: text("purpose"),
  changes: jsonb("changes").$type<Array<{
    field: string;
    oldValue: any;
    newValue: any;
  }>>().default([]),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  sessionId: varchar("session_id", { length: 100 }),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  metadata: jsonb("metadata").$type<{
    riskLevel?: string;
    complianceFlags?: string[];
    retentionPeriod?: number;
  }>().default({}),
});

// GDPR Data Processing Activities
export const gdprProcessingActivities = pgTable("gdpr_processing_activities", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  activityName: text("activity_name").notNull(),
  purpose: text("purpose").notNull(),
  legalBasis: varchar("legal_basis", { length: 50 }).notNull(),
  dataCategories: jsonb("data_categories").$type<string[]>().default([]),
  dataSubjects: jsonb("data_subjects").$type<string[]>().default([]), // patients, employees, visitors
  recipients: jsonb("recipients").$type<string[]>().default([]), // internal staff, third parties
  internationalTransfers: jsonb("international_transfers").$type<Array<{
    country: string;
    safeguards: string;
    adequacyDecision: boolean;
  }>>().default([]),
  retentionPeriod: integer("retention_period"), // in months
  securityMeasures: jsonb("security_measures").$type<string[]>().default([]),
  dataProtectionImpactAssessment: boolean("dpia_required").notNull().default(false),
  status: varchar("status", { length: 20 }).notNull().default("active"), // active, suspended, terminated
  reviewDate: timestamp("review_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Lab Results
export const labResults = pgTable("lab_results", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  testId: varchar("test_id", { length: 50 }).notNull(),
  testType: text("test_type").notNull(),
  orderedBy: integer("ordered_by").notNull().references(() => users.id),
  orderedAt: timestamp("ordered_at").notNull(),
  collectedAt: timestamp("collected_at"),
  completedAt: timestamp("completed_at"),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, processing, completed, cancelled
  results: jsonb("results").$type<Array<{
    name: string;
    value: string;
    unit: string;
    referenceRange: string;
    status: "normal" | "abnormal_high" | "abnormal_low" | "critical";
    flag?: string;
  }>>().default([]),
  criticalValues: boolean("critical_values").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Financial Claims
export const claims = pgTable("claims", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  claimNumber: varchar("claim_number", { length: 50 }).notNull().unique(),
  serviceDate: timestamp("service_date").notNull(),
  submissionDate: timestamp("submission_date").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, approved, denied, paid
  paymentAmount: decimal("payment_amount", { precision: 10, scale: 2 }),
  paymentDate: timestamp("payment_date"),
  denialReason: text("denial_reason"),
  insuranceProvider: text("insurance_provider").notNull(),
  procedures: jsonb("procedures").$type<Array<{
    code: string;
    description: string;
    amount: number;
  }>>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Revenue Data
export const revenueRecords = pgTable("revenue_records", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  month: varchar("month", { length: 7 }).notNull(), // YYYY-MM format
  revenue: decimal("revenue", { precision: 12, scale: 2 }).notNull(),
  expenses: decimal("expenses", { precision: 12, scale: 2 }).notNull(),
  profit: decimal("profit", { precision: 12, scale: 2 }).notNull(),
  collections: decimal("collections", { precision: 12, scale: 2 }).notNull(),
  target: decimal("target", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Clinical Procedures
export const clinicalProcedures = pgTable("clinical_procedures", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  duration: text("duration").notNull(),
  complexity: varchar("complexity", { length: 20 }).notNull(), // low, medium, high
  prerequisites: jsonb("prerequisites").$type<string[]>().default([]),
  steps: jsonb("steps").$type<string[]>().default([]),
  complications: jsonb("complications").$type<string[]>().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Emergency Protocols
export const emergencyProtocols = pgTable("emergency_protocols", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  title: text("title").notNull(),
  priority: varchar("priority", { length: 20 }).notNull(), // low, medium, high, critical
  steps: jsonb("steps").$type<string[]>().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Medications Database
export const medicationsDatabase = pgTable("medications_database", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  category: text("category").notNull(),
  dosage: text("dosage").notNull(),
  interactions: jsonb("interactions").$type<string[]>().default([]),
  warnings: jsonb("warnings").$type<string[]>().default([]),
  severity: varchar("severity", { length: 20 }).notNull(), // low, medium, high
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
  shifts: many(staffShifts),
}));

export const rolesRelations = relations(roles, ({ one }) => ({
  organization: one(organizations, {
    fields: [roles.organizationId],
    references: [organizations.id],
  }),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [patients.organizationId],
    references: [organizations.id],
  }),
  medicalRecords: many(medicalRecords),
  appointments: many(appointments),
  aiInsights: many(aiInsights),
  communications: many(patientCommunications),
  prescriptions: many(prescriptions),
  medicalImages: many(medicalImages),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  organization: one(organizations, {
    fields: [notifications.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const patientCommunicationsRelations = relations(patientCommunications, ({ one }) => ({
  organization: one(organizations, {
    fields: [patientCommunications.organizationId],
    references: [organizations.id],
  }),
  patient: one(patients, {
    fields: [patientCommunications.patientId],
    references: [patients.id],
  }),
  sentByUser: one(users, {
    fields: [patientCommunications.sentBy],
    references: [users.id],
  }),
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

export const documentsRelations = relations(documents, ({ one }) => ({
  organization: one(organizations, {
    fields: [documents.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [documents.userId],
    references: [users.id],
  }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  organization: one(organizations, {
    fields: [subscriptions.organizationId],
    references: [organizations.id],
  }),
}));

export const consultationsRelations = relations(consultations, ({ one }) => ({
  organization: one(organizations, {
    fields: [consultations.organizationId],
    references: [organizations.id],
  }),
  appointment: one(appointments, {
    fields: [consultations.appointmentId],
    references: [appointments.id],
  }),
  patient: one(patients, {
    fields: [consultations.patientId],
    references: [patients.id],
  }),
  provider: one(users, {
    fields: [consultations.providerId],
    references: [users.id],
  }),
}));

export const prescriptionsRelations = relations(prescriptions, ({ one }) => ({
  organization: one(organizations, {
    fields: [prescriptions.organizationId],
    references: [organizations.id],
  }),
  patient: one(patients, {
    fields: [prescriptions.patientId],
    references: [patients.id],
  }),
  provider: one(users, {
    fields: [prescriptions.providerId],
    references: [users.id],
  }),
  consultation: one(consultations, {
    fields: [prescriptions.consultationId],
    references: [consultations.id],
  }),
}));

export const medicalImagesRelations = relations(medicalImages, ({ one }) => ({
  organization: one(organizations, {
    fields: [medicalImages.organizationId],
    references: [organizations.id],
  }),
  patient: one(patients, {
    fields: [medicalImages.patientId],
    references: [patients.id],
  }),
  uploadedByUser: one(users, {
    fields: [medicalImages.uploadedBy],
    references: [users.id],
  }),
}));

// Lab Results Relations
export const labResultsRelations = relations(labResults, ({ one }) => ({
  organization: one(organizations, {
    fields: [labResults.organizationId],
    references: [organizations.id],
  }),
  patient: one(patients, {
    fields: [labResults.patientId],
    references: [patients.id],
  }),
  orderedByUser: one(users, {
    fields: [labResults.orderedBy],
    references: [users.id],
  }),
}));

// Claims Relations
export const claimsRelations = relations(claims, ({ one }) => ({
  organization: one(organizations, {
    fields: [claims.organizationId],
    references: [organizations.id],
  }),
  patient: one(patients, {
    fields: [claims.patientId],
    references: [patients.id],
  }),
}));

// Revenue Records Relations
export const revenueRecordsRelations = relations(revenueRecords, ({ one }) => ({
  organization: one(organizations, {
    fields: [revenueRecords.organizationId],
    references: [organizations.id],
  }),
}));

// Clinical Procedures Relations
export const clinicalProceduresRelations = relations(clinicalProcedures, ({ one }) => ({
  organization: one(organizations, {
    fields: [clinicalProcedures.organizationId],
    references: [organizations.id],
  }),
}));

// Emergency Protocols Relations
export const emergencyProtocolsRelations = relations(emergencyProtocols, ({ one }) => ({
  organization: one(organizations, {
    fields: [emergencyProtocols.organizationId],
    references: [organizations.id],
  }),
}));

// Medications Database Relations
export const medicationsDatabaseRelations = relations(medicationsDatabase, ({ one }) => ({
  organization: one(organizations, {
    fields: [medicationsDatabase.organizationId],
    references: [organizations.id],
  }),
}));

// Staff Shifts Relations
export const staffShiftsRelations = relations(staffShifts, ({ one }) => ({
  organization: one(organizations, {
    fields: [staffShifts.organizationId],
    references: [organizations.id],
  }),
  staff: one(users, {
    fields: [staffShifts.staffId],
    references: [users.id],
  }),
}));

// GDPR Relations
export const gdprConsentsRelations = relations(gdprConsents, ({ one }) => ({
  organization: one(organizations, {
    fields: [gdprConsents.organizationId],
    references: [organizations.id],
  }),
  patient: one(patients, {
    fields: [gdprConsents.patientId],
    references: [patients.id],
  }),
}));

export const gdprDataRequestsRelations = relations(gdprDataRequests, ({ one }) => ({
  organization: one(organizations, {
    fields: [gdprDataRequests.organizationId],
    references: [organizations.id],
  }),
  patient: one(patients, {
    fields: [gdprDataRequests.patientId],
    references: [patients.id],
  }),
  processedByUser: one(users, {
    fields: [gdprDataRequests.processedBy],
    references: [users.id],
  }),
}));

export const gdprAuditTrailRelations = relations(gdprAuditTrail, ({ one }) => ({
  organization: one(organizations, {
    fields: [gdprAuditTrail.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [gdprAuditTrail.userId],
    references: [users.id],
  }),
  patient: one(patients, {
    fields: [gdprAuditTrail.patientId],
    references: [patients.id],
  }),
}));

export const gdprProcessingActivitiesRelations = relations(gdprProcessingActivities, ({ one }) => ({
  organization: one(organizations, {
    fields: [gdprProcessingActivities.organizationId],
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

export const insertRoleSchema = createInsertSchema(roles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertConsultationSchema = createInsertSchema(consultations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPatientCommunicationSchema = createInsertSchema(patientCommunications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPrescriptionSchema = createInsertSchema(prescriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMedicalImageSchema = createInsertSchema(medicalImages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLabResultSchema = createInsertSchema(labResults).omit({
  id: true,
  createdAt: true,
});

export const insertClaimSchema = createInsertSchema(claims).omit({
  id: true,
  createdAt: true,
});

export const insertRevenueRecordSchema = createInsertSchema(revenueRecords).omit({
  id: true,
  createdAt: true,
});

export const insertClinicalProcedureSchema = createInsertSchema(clinicalProcedures).omit({
  id: true,
  createdAt: true,
});

export const insertEmergencyProtocolSchema = createInsertSchema(emergencyProtocols).omit({
  id: true,
  createdAt: true,
});

export const insertMedicationsDatabaseSchema = createInsertSchema(medicationsDatabase).omit({
  id: true,
  createdAt: true,
});

export const insertStaffShiftSchema = createInsertSchema(staffShifts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// GDPR Insert Schemas
export const insertGdprConsentSchema = createInsertSchema(gdprConsents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGdprDataRequestSchema = createInsertSchema(gdprDataRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGdprAuditTrailSchema = createInsertSchema(gdprAuditTrail).omit({
  id: true,
});

export const insertGdprProcessingActivitySchema = createInsertSchema(gdprProcessingActivities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Role = typeof roles.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;

export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;

export type MedicalRecord = typeof medicalRecords.$inferSelect;
export type InsertMedicalRecord = z.infer<typeof insertMedicalRecordSchema>;

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;

export type AiInsight = typeof aiInsights.$inferSelect;
export type InsertAiInsight = z.infer<typeof insertAiInsightSchema>;

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;

export type Consultation = typeof consultations.$inferSelect;
export type InsertConsultation = z.infer<typeof insertConsultationSchema>;

export type PatientCommunication = typeof patientCommunications.$inferSelect;
export type InsertPatientCommunication = z.infer<typeof insertPatientCommunicationSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type Prescription = typeof prescriptions.$inferSelect;
export type InsertPrescription = z.infer<typeof insertPrescriptionSchema>;

export type MedicalImage = typeof medicalImages.$inferSelect;
export type InsertMedicalImage = z.infer<typeof insertMedicalImageSchema>;

export type LabResult = typeof labResults.$inferSelect;
export type InsertLabResult = z.infer<typeof insertLabResultSchema>;

export type Claim = typeof claims.$inferSelect;
export type InsertClaim = z.infer<typeof insertClaimSchema>;

export type RevenueRecord = typeof revenueRecords.$inferSelect;
export type InsertRevenueRecord = z.infer<typeof insertRevenueRecordSchema>;

export type ClinicalProcedure = typeof clinicalProcedures.$inferSelect;
export type InsertClinicalProcedure = z.infer<typeof insertClinicalProcedureSchema>;

export type EmergencyProtocol = typeof emergencyProtocols.$inferSelect;
export type InsertEmergencyProtocol = z.infer<typeof insertEmergencyProtocolSchema>;

export type MedicationsDatabase = typeof medicationsDatabase.$inferSelect;
export type InsertMedicationsDatabase = z.infer<typeof insertMedicationsDatabaseSchema>;

export type StaffShift = typeof staffShifts.$inferSelect;
export type InsertStaffShift = z.infer<typeof insertStaffShiftSchema>;

// GDPR Types
export type GdprConsent = typeof gdprConsents.$inferSelect;
export type InsertGdprConsent = z.infer<typeof insertGdprConsentSchema>;

export type GdprDataRequest = typeof gdprDataRequests.$inferSelect;
export type InsertGdprDataRequest = z.infer<typeof insertGdprDataRequestSchema>;

export type GdprAuditTrail = typeof gdprAuditTrail.$inferSelect;
export type InsertGdprAuditTrail = z.infer<typeof insertGdprAuditTrailSchema>;

export type GdprProcessingActivity = typeof gdprProcessingActivities.$inferSelect;
export type InsertGdprProcessingActivity = z.infer<typeof insertGdprProcessingActivitySchema>;


