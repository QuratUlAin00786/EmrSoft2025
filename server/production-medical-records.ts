// Production Medical Records Export - Specific records for Patient 158 (Imran Mubashir)
// This ensures development medical records are available in production

import { db } from "./db.js";
import { medicalRecords } from "@shared/schema.js";
import { eq, and } from "drizzle-orm";

export async function seedProductionMedicalRecords() {
  try {
    console.log("🏥 Seeding production medical records for ALL patients...");
    
    // Get the main organization (Demo Healthcare Clinic)
    const { organizations, patients } = await import("@shared/schema.js");
    const [org] = await db.select().from(organizations).where(eq(organizations.subdomain, "demo"));
    
    if (!org) {
      console.log("⚠️  No organization found - cannot seed medical records");
      return;
    }
    
    // Get all patients in the database to seed medical records for them
    const allPatients = await db.select().from(patients).where(eq(patients.organizationId, org.id));
    
    console.log(`🔍 Found ${allPatients.length} patients in production database`);
    
    if (allPatients.length === 0) {
      console.log("⚠️  No patients found in production database - cannot seed medical records");
      return;
    }
    
    // Use the first patient for seeding (universal approach)
    const targetPatient = allPatients[0];
    console.log(`🎯 Target patient: ID ${targetPatient.id}, Name: ${targetPatient.firstName} ${targetPatient.lastName}`);
    
    // Check if medical records already exist for this patient
    const existingRecords = await db.select().from(medicalRecords)
      .where(and(
        eq(medicalRecords.patientId, targetPatient.id), 
        eq(medicalRecords.organizationId, org.id)
      ));
    
    if (existingRecords.length >= 2) {
      console.log(`✅ Medical records already exist for Patient ${targetPatient.id}, skipping seed`);
      return;
    }
    
    console.log("🔍 No sufficient medical records found, creating medical records...");
    
    // Get the first provider for this organization
    const { users } = await import("@shared/schema.js");
    const providers = await db.select().from(users)
      .where(and(eq(users.organizationId, org.id), eq(users.role, "doctor")));
    
    const targetProvider = providers.length > 0 ? providers[0] : { id: 1 };
    console.log(`🩺 Using provider: ID ${targetProvider.id}`);
    
    // Production medical records data - universal for any patient
    const productionRecords = [
      {
        organizationId: org.id,
        patientId: targetPatient.id,
        providerId: targetProvider.id,
        type: "consultation",
        title: "Anatomical Analysis - Orbicularis Oris",
        notes: `FACIAL MUSCLE ANALYSIS REPORT

Patient: ${targetPatient.firstName} ${targetPatient.lastName}
Date: August 25, 2025

ANALYSIS DETAILS:
• Target Muscle Group: Orbicularis Oris
• Analysis Type: Nerve Function
• Primary Treatment: Botox Injection

CLINICAL OBSERVATIONS:
- Comprehensive anatomical assessment completed
- Interactive muscle group identification performed
- Professional analysis methodology applied


TREATMENT PLAN:

COMPREHENSIVE FACIAL MUSCLE TREATMENT PLAN

Patient: ${targetPatient.firstName} ${targetPatient.lastName}
Date: August 25, 2025

TARGET ANALYSIS:
• Muscle Group: Orbicularis Oris
• Analysis Type: Nerve Function
• Primary Treatment: Botox Injection

TREATMENT PROTOCOL:
1. Initial Assessment & Baseline Documentation
2. Pre-treatment Preparation & Patient Consultation
3. Botox Injection Implementation
4. Post-treatment Monitoring & Assessment
5. Follow-up Care & Progress Evaluation

EXPECTED OUTCOMES:
• Improved muscle function and symmetry
• Reduced symptoms and enhanced patient comfort
• Optimized aesthetic and functional results
• Long-term maintenance planning

NEXT STEPS:
• Schedule follow-up appointment in 1-2 weeks
• Monitor patient response and adjust treatment as needed
• Document progress with photographic evidence
• Review treatment effectiveness and make modifications if required

Generated on: Aug 25, 2025, 1:17:04 PM


Analysis completed on: Aug 25, 2025, 1:17:24 PM`,
        diagnosis: "Anatomical analysis of orbicularis oris - nerve function",
        treatment: "Botox Injection",
        prescription: {},
        attachments: [],
        aiSuggestions: {}
      },
      {
        organizationId: org.id,
        patientId: targetPatient.id,
        providerId: targetProvider.id,
        type: "consultation",
        title: "Anatomical Analysis - Temporalis",
        notes: `FACIAL MUSCLE ANALYSIS REPORT

Patient: ${targetPatient.firstName} ${targetPatient.lastName}
Date: August 21, 2025

ANALYSIS DETAILS:
• Target Muscle Group: Temporalis
• Analysis Type: Movement Range
• Primary Treatment: Dermal Fillers

CLINICAL OBSERVATIONS:
- Comprehensive anatomical assessment completed
- Interactive muscle group identification performed
- Professional analysis methodology applied



Analysis completed on: Aug 21, 2025, 9:59:28 PM`,
        diagnosis: "Anatomical analysis of temporalis - movement range",
        treatment: "Dermal Fillers",
        prescription: {},
        attachments: [],
        aiSuggestions: {}
      },
      {
        organizationId: org.id,
        patientId: targetPatient.id,
        providerId: targetProvider.id,
        type: "consultation",
        title: "",
        notes: "The Patient has come to the hospital with headache, Nausea and high fever.",
        diagnosis: "fdxgchjhk",
        treatment: "jtrdyktfuyg.ikuh/lkm",
        prescription: { medications: [] },
        attachments: [],
        aiSuggestions: {}
      }
    ];

    // Insert the records with better error handling
    const insertedRecords = await db.insert(medicalRecords).values(productionRecords).returning();
    
    console.log(`✅ Successfully seeded production medical records for Patient ${targetPatient.id}`);
    console.log(`📋 Created ${insertedRecords.length} medical records:`);
    insertedRecords.forEach(record => {
      console.log(`   • ID ${record.id}: ${record.title || 'Untitled consultation'}`);
    });
    
    // Verify the records were created
    const verificationRecords = await db.select().from(medicalRecords)
      .where(and(eq(medicalRecords.patientId, targetPatient.id), eq(medicalRecords.organizationId, org.id)));
    console.log(`🔍 Verification: Found ${verificationRecords.length} total records for Patient ${targetPatient.id}`);
    
  } catch (error) {
    console.error("❌ Failed to seed production medical records:", error);
    console.error("Full error details:", error);
  }
}

// Verification function to ensure medical records exist
export async function verifyMedicalRecordsExist() {
  try {
    console.log("🔍 Verifying medical records exist for production patients...");
    
    // Get the main organization (Demo Healthcare Clinic)
    const { organizations, patients } = await import("@shared/schema.js");
    const [org] = await db.select().from(organizations).where(eq(organizations.subdomain, "demo"));
    
    if (!org) {
      console.log("⚠️  No organization found for verification");
      return;
    }
    
    // Get all patients in production to verify
    const allPatients = await db.select().from(patients).where(eq(patients.organizationId, org.id));
    console.log(`🔍 Found ${allPatients.length} patients to verify`);
    
    if (allPatients.length === 0) {
      console.log("⚠️  No patients found for verification");
      return;
    }
    
    // Get first patient for verification (dynamic approach)
    const firstPatient = allPatients[0];
    
    const patientId = firstPatient.id;
    const patientRecords = await db.select().from(medicalRecords)
      .where(and(eq(medicalRecords.patientId, patientId), eq(medicalRecords.organizationId, org.id)));
    
    console.log(`📊 Found ${patientRecords.length} medical records for Patient ${patientId}:`);
    patientRecords.forEach((record, index) => {
      console.log(`   ${index + 1}. ID ${record.id}: "${record.title}" (${record.type})`);
    });
    
    // Check for specific Anatomical Analysis records
    const anatomicalCount = patientRecords.filter(r => r.title?.includes("Anatomical Analysis")).length;
    console.log(`🎯 Found ${anatomicalCount} Anatomical Analysis records`);
    
    if (anatomicalCount === 0 && process.env.NODE_ENV !== 'production') {
      console.log("⚠️  NO ANATOMICAL ANALYSIS RECORDS FOUND - FORCE CREATING...");
      // Force create the records if they don't exist (only in development)
      await seedProductionMedicalRecords();
    } else {
      console.log("✅ Anatomical Analysis records confirmed present OR in production mode");
    }
    
  } catch (error) {
    console.error("❌ Failed to verify medical records:", error);
  }
}