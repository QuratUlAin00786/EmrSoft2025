import { db } from "./db.js";
import { organizations, users, patients, appointments, medicalRecords } from "@shared/schema.js";
import { authService } from "./services/auth.js";

export async function seedDatabase() {
  try {
    console.log("Seeding database with sample data...");

    // Create sample organization
    const [org] = await db.insert(organizations).values([{
      name: "Averox Healthcare",
      subdomain: "demo",
      region: "UK",
      brandName: "MediCore Demo",
      settings: {
        theme: { primaryColor: "#3b82f6", logoUrl: "" },
        compliance: { gdprEnabled: true, dataResidency: "UK" },
        features: { aiEnabled: true, billingEnabled: true }
      },
      subscriptionStatus: "active"
    }]).returning();

    console.log(`Created organization: ${org.name} (ID: ${org.id})`);

    // Create sample users
    const hashedPassword = await authService.hashPassword("password123");
    
    const sampleUsers = [
      {
        organizationId: org.id,
        email: "admin@demo.medicoreemr.com",
        username: "admin",
        password: hashedPassword,
        firstName: "John",
        lastName: "Administrator",
        role: "admin",
        department: "Administration",
        isActive: true
      },
      {
        organizationId: org.id,
        email: "dr.smith@demo.medicoreemr.com",
        username: "drsmith",
        password: hashedPassword,
        firstName: "Sarah",
        lastName: "Smith",
        role: "doctor",
        department: "Cardiology",
        isActive: true
      },
      {
        organizationId: org.id,
        email: "nurse.johnson@demo.medicoreemr.com",
        username: "nursejohnson",
        password: hashedPassword,
        firstName: "Emily",
        lastName: "Johnson",
        role: "nurse",
        department: "General Medicine",
        isActive: true
      }
    ];

    const createdUsers = await db.insert(users).values(sampleUsers).returning();
    console.log(`Created ${createdUsers.length} users`);

    // Create sample patients
    const samplePatients = [
      {
        organizationId: org.id,
        patientId: "P001",
        firstName: "Alice",
        lastName: "Williams",
        dateOfBirth: new Date("1985-03-15"),
        email: "alice.williams@email.com",
        phone: "+44 7700 900123",
        nhsNumber: "123 456 7890",
        address: {
          street: "123 Main Street",
          city: "London",
          state: "Greater London",
          postcode: "SW1A 1AA",
          country: "UK"
        },
        emergencyContact: {
          name: "Bob Williams",
          relationship: "Spouse",
          phone: "+44 7700 900124"
        },
        medicalHistory: {
          allergies: ["Penicillin", "Nuts"],
          chronicConditions: ["Hypertension"],
          medications: ["Lisinopril 10mg"]
        },
        riskLevel: "medium",
        isActive: true
      },
      {
        organizationId: org.id,
        patientId: "P002",
        firstName: "Robert",
        lastName: "Davis",
        dateOfBirth: new Date("1970-07-22"),
        email: "robert.davis@email.com",
        phone: "+44 7700 900125",
        nhsNumber: "234 567 8901",
        address: {
          street: "456 Oak Avenue",
          city: "Manchester",
          state: "Greater Manchester",
          postcode: "M1 1AA",
          country: "UK"
        },
        emergencyContact: {
          name: "Susan Davis",
          relationship: "Spouse",
          phone: "+44 7700 900126"
        },
        medicalHistory: {
          allergies: ["Shellfish"],
          chronicConditions: ["Diabetes Type 2", "High Cholesterol"],
          medications: ["Metformin 500mg", "Simvastatin 20mg"]
        },
        riskLevel: "high",
        isActive: true
      }
    ];

    const createdPatients = await db.insert(patients).values(samplePatients).returning();
    console.log(`Created ${createdPatients.length} patients`);

    // Create sample appointments
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(14, 30, 0, 0);

    const sampleAppointments = [
      {
        organizationId: org.id,
        patientId: createdPatients[0].id,
        providerId: createdUsers[1].id, // Dr. Smith
        title: "Cardiology Consultation",
        description: "Follow-up for hypertension management",
        scheduledAt: tomorrow,
        duration: 30,
        status: "scheduled",
        type: "consultation",
        location: "Room 205, Cardiology Department",
        isVirtual: false
      },
      {
        organizationId: org.id,
        patientId: createdPatients[1].id,
        providerId: createdUsers[1].id, // Dr. Smith
        title: "Diabetes Review",
        description: "Annual diabetes checkup and medication review",
        scheduledAt: nextWeek,
        duration: 45,
        status: "scheduled",
        type: "follow_up",
        location: "Room 102, General Medicine",
        isVirtual: false
      }
    ];

    const createdAppointments = await db.insert(appointments).values(sampleAppointments).returning();
    console.log(`Created ${createdAppointments.length} appointments`);

    // Create sample medical records
    const sampleRecords = [
      {
        organizationId: org.id,
        patientId: createdPatients[0].id,
        providerId: createdUsers[1].id,
        type: "consultation",
        title: "Initial Cardiac Assessment",
        notes: "Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.",
        diagnosis: "Essential Hypertension (I10)",
        treatment: "Continue current medication, dietary consultation recommended",
        prescription: {
          medications: [
            {
              name: "Lisinopril",
              dosage: "10mg",
              frequency: "Once daily",
              duration: "30 days"
            }
          ]
        },
        attachments: [],
        aiSuggestions: {
          riskAssessment: "Moderate cardiovascular risk",
          recommendations: ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"],
          drugInteractions: []
        }
      }
    ];

    await db.insert(medicalRecords).values(sampleRecords);
    console.log("Created sample medical records");

    console.log("Database seeding completed successfully!");
    
  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }
}