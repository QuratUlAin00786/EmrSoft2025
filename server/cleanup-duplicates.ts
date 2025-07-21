import { db } from "./db.js";
import { patients, appointments, prescriptions, labResults, medicalRecords, notifications } from "@shared/schema.js";
import { eq, and, sql } from "drizzle-orm";

export async function cleanupDuplicates() {
  console.log("🧹 Starting database cleanup - removing duplicate entries...");

  try {
    // 1. Clean up duplicate appointments first (no foreign key dependencies)
    console.log("Cleaning up duplicate appointments...");
    
    const duplicateAppointments = await db.execute(sql`
      DELETE FROM appointments 
      WHERE id NOT IN (
        SELECT MIN(id) 
        FROM appointments 
        GROUP BY organization_id, patient_id, title, scheduled_at::date
      )
    `);
    console.log(`Removed ${duplicateAppointments.rowCount} duplicate appointments`);

    // 2. Clean up duplicate prescriptions
    console.log("Cleaning up duplicate prescriptions...");
    
    const duplicatePrescriptions = await db.execute(sql`
      DELETE FROM prescriptions 
      WHERE id NOT IN (
        SELECT MIN(id) 
        FROM prescriptions 
        GROUP BY organization_id, patient_id, prescription_number, prescribed_at::date
      )
    `);
    console.log(`Removed ${duplicatePrescriptions.rowCount} duplicate prescriptions`);

    // 3. Clean up duplicate lab results
    console.log("Cleaning up duplicate lab results...");
    
    const duplicateLabResults = await db.execute(sql`
      DELETE FROM lab_results 
      WHERE id NOT IN (
        SELECT MIN(id) 
        FROM lab_results 
        GROUP BY organization_id, patient_id, test_type, ordered_at::date
      )
    `);
    console.log(`Removed ${duplicateLabResults.rowCount} duplicate lab results`);

    // 4. Clean up duplicate medical records
    console.log("Cleaning up duplicate medical records...");
    
    const duplicateRecords = await db.execute(sql`
      DELETE FROM medical_records 
      WHERE id NOT IN (
        SELECT MIN(id) 
        FROM medical_records 
        GROUP BY organization_id, patient_id, created_at::date
      )
    `);
    console.log(`Removed ${duplicateRecords.rowCount} duplicate medical records`);

    // 5. Clean up duplicate notifications
    console.log("Cleaning up duplicate notifications...");
    
    const duplicateNotifications = await db.execute(sql`
      DELETE FROM notifications 
      WHERE id NOT IN (
        SELECT MIN(id) 
        FROM notifications 
        GROUP BY organization_id, user_id, type, created_at::date
      )
    `);
    console.log(`Removed ${duplicateNotifications.rowCount} duplicate notifications`);

    // 6. Clean up duplicate medical images
    console.log("Cleaning up duplicate medical images...");
    
    const duplicateImages = await db.execute(sql`
      DELETE FROM medical_images 
      WHERE id NOT IN (
        SELECT MIN(id) 
        FROM medical_images 
        GROUP BY organization_id, patient_id, study_type, modality, created_at::date
      )
    `);
    console.log(`Removed ${duplicateImages.rowCount} duplicate medical images`);

    // 7. Skip patient cleanup due to complex foreign key relationships
    console.log("Skipping patient cleanup due to complex foreign key relationships - focusing on preventing future duplicates instead");



    // 8. Get final counts
    const finalCounts = await Promise.all([
      db.execute(sql`SELECT COUNT(*) as count FROM patients WHERE organization_id = 1`),
      db.execute(sql`SELECT COUNT(*) as count FROM appointments WHERE organization_id = 1`),
      db.execute(sql`SELECT COUNT(*) as count FROM prescriptions WHERE organization_id = 1`),
      db.execute(sql`SELECT COUNT(*) as count FROM lab_results WHERE organization_id = 1`),
      db.execute(sql`SELECT COUNT(*) as count FROM medical_records WHERE organization_id = 1`),
      db.execute(sql`SELECT COUNT(*) as count FROM notifications WHERE organization_id = 1`),
      db.execute(sql`SELECT COUNT(*) as count FROM medical_images WHERE organization_id = 1`)
    ]);

    console.log("📊 Final database counts after cleanup:");
    console.log(`  Patients: ${finalCounts[0].rows[0].count}`);
    console.log(`  Appointments: ${finalCounts[1].rows[0].count}`);
    console.log(`  Prescriptions: ${finalCounts[2].rows[0].count}`);
    console.log(`  Lab Results: ${finalCounts[3].rows[0].count}`);
    console.log(`  Medical Records: ${finalCounts[4].rows[0].count}`);
    console.log(`  Notifications: ${finalCounts[5].rows[0].count}`);
    console.log(`  Medical Images: ${finalCounts[6].rows[0].count}`);

    console.log("✅ Database cleanup completed successfully!");

  } catch (error) {
    console.error("❌ Error during database cleanup:", error);
    throw error;
  }
}