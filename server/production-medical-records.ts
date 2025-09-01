// Production Medical Records Export - Specific records for Patient 158 (Imran Mubashir)
// This ensures development medical records are available in production

import { db } from "./db.js";
import { medicalRecords } from "@shared/schema.js";
import { eq, and } from "drizzle-orm";

export async function seedProductionMedicalRecords() {
  try {
    console.log("🏥 Seeding production medical records for Patient 158 (Imran Mubashir)...");
    
    // Check if the specific Anatomical Analysis records exist
    const anatomicalRecords = await db.select().from(medicalRecords)
      .where(and(
        eq(medicalRecords.patientId, 158), 
        eq(medicalRecords.organizationId, 1),
        eq(medicalRecords.title, "Anatomical Analysis - Orbicularis Oris")
      ));
    
    if (anatomicalRecords.length > 0) {
      console.log("✅ Anatomical Analysis medical records already exist for Patient 158, skipping seed");
      return;
    }
    
    console.log("🔍 No Anatomical Analysis records found, creating medical records...");
    
    // Production medical records data - exact copies from development
    const productionRecords = [
      {
        organizationId: 1,
        patientId: 158,
        providerId: 348,
        type: "consultation",
        title: "Anatomical Analysis - Orbicularis Oris",
        notes: `FACIAL MUSCLE ANALYSIS REPORT

Patient: Imran Mubashir
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

Patient: Imran Mubashir
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
        organizationId: 1,
        patientId: 158,
        providerId: 348,
        type: "consultation",
        title: "Anatomical Analysis - Temporalis",
        notes: `FACIAL MUSCLE ANALYSIS REPORT

Patient: Imran Mubashir
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
        organizationId: 1,
        patientId: 158,
        providerId: 348,
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
    
    console.log("✅ Successfully seeded production medical records for Patient 158");
    console.log(`📋 Created ${insertedRecords.length} medical records:`);
    insertedRecords.forEach(record => {
      console.log(`   • ID ${record.id}: ${record.title || 'Untitled consultation'}`);
    });
    
    // Verify the records were created
    const verificationRecords = await db.select().from(medicalRecords)
      .where(and(eq(medicalRecords.patientId, 158), eq(medicalRecords.organizationId, 1)));
    console.log(`🔍 Verification: Found ${verificationRecords.length} total records for Patient 158`);
    
  } catch (error) {
    console.error("❌ Failed to seed production medical records:", error);
    console.error("Full error details:", error);
  }
}

// Verification function to ensure medical records exist
export async function verifyMedicalRecordsExist() {
  try {
    console.log("🔍 Verifying medical records exist for Patient 158...");
    
    const allRecords = await db.select().from(medicalRecords)
      .where(and(eq(medicalRecords.patientId, 158), eq(medicalRecords.organizationId, 1)));
    
    console.log(`📊 Found ${allRecords.length} medical records for Patient 158:`);
    allRecords.forEach((record, index) => {
      console.log(`   ${index + 1}. ID ${record.id}: "${record.title}" (${record.type})`);
    });
    
    // Check for specific Anatomical Analysis records
    const anatomicalCount = allRecords.filter(r => r.title?.includes("Anatomical Analysis")).length;
    console.log(`🎯 Found ${anatomicalCount} Anatomical Analysis records`);
    
    if (anatomicalCount === 0) {
      console.log("⚠️  NO ANATOMICAL ANALYSIS RECORDS FOUND - FORCE CREATING...");
      // Force create the records if they don't exist
      await seedProductionMedicalRecords();
    } else {
      console.log("✅ Anatomical Analysis records confirmed present");
    }
    
  } catch (error) {
    console.error("❌ Failed to verify medical records:", error);
  }
}