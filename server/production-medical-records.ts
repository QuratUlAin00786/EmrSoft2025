// Production Medical Records Export - Specific records for Patient 158 (Imran Mubashir)
// This ensures development medical records are available in production

import { db } from "./db.js";
import { medicalRecords } from "@shared/schema.js";
import { eq, and } from "drizzle-orm";

export async function seedProductionMedicalRecords() {
  try {
    console.log("🏥 Seeding production medical records for Patient 158 (Imran Mubashir)...");
    
    // Check if records already exist
    const existingRecords = await db.select().from(medicalRecords)
      .where(and(eq(medicalRecords.patientId, 158), eq(medicalRecords.organizationId, 1)));
    
    if (existingRecords.length >= 3) {
      console.log("✅ Medical records already exist for Patient 158, skipping seed");
      return;
    }
    
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

    // Insert the records
    await db.insert(medicalRecords).values(productionRecords);
    
    console.log("✅ Successfully seeded production medical records for Patient 158");
    console.log("📋 Records added:");
    console.log("   • Anatomical Analysis - Orbicularis Oris");
    console.log("   • Anatomical Analysis - Temporalis");
    console.log("   • Headache/fever consultation");
    
  } catch (error) {
    console.error("❌ Failed to seed production medical records:", error);
  }
}