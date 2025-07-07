import { db } from "./db.js";
import { organizations, users, patients, appointments, medicalRecords, notifications, prescriptions, subscriptions, aiInsights } from "@shared/schema.js";
import { authService } from "./services/auth.js";
import { eq } from "drizzle-orm";

export async function seedDatabase() {
  try {
    console.log("Seeding database with sample data...");

    // Get or create sample organization
    let [org] = await db.select().from(organizations).where(eq(organizations.subdomain, "demo"));
    
    if (!org) {
      [org] = await db.insert(organizations).values([{
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
    } else {
      console.log(`Using existing organization: ${org.name} (ID: ${org.id})`);
    }

    // Create sample users only if they don't exist
    const existingUsers = await db.select().from(users).where(eq(users.organizationId, org.id));
    
    let createdUsers = existingUsers;
    
    if (existingUsers.length === 0) {
      const hashedPassword = await authService.hashPassword("admin123");
      
      const sampleUsers = [
      {
        organizationId: org.id,
        email: "admin",
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
        email: "doctor",
        username: "doctor",
        password: hashedPassword,
        firstName: "Sarah",
        lastName: "Smith",
        role: "doctor",
        department: "Cardiology",
        isActive: true
      },
      {
        organizationId: org.id,
        email: "nurse",
        username: "nurse",
        password: hashedPassword,
        firstName: "Emily",
        lastName: "Johnson",
        role: "nurse",
        department: "General Medicine",
        isActive: true
      }
    ];

      createdUsers = await db.insert(users).values(sampleUsers).returning();
      console.log(`Created ${createdUsers.length} users`);
    } else {
      console.log(`Using existing ${existingUsers.length} users`);
    }

    // Create sample patients only if they don't exist
    const existingPatients = await db.select().from(patients).where(eq(patients.organizationId, org.id));
    
    let createdPatients = existingPatients;
    
    if (existingPatients.length === 0) {
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

      createdPatients = await db.insert(patients).values(samplePatients).returning();
      console.log(`Created ${createdPatients.length} patients`);
    } else {
      console.log(`Using existing ${existingPatients.length} patients`);
    }

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

    // Create sample notifications
    const sampleNotifications = [
      {
        organizationId: org.id,
        userId: createdUsers[1].id, // Dr. Smith
        title: "Lab Results Available",
        message: "Blood work results for Sarah Johnson are now available for review.",
        type: "lab_result",
        priority: "normal" as const,
        status: "unread" as const,
        isActionable: true,
        actionUrl: "/patients/1/lab-results",
        relatedEntityType: "patient",
        relatedEntityId: createdPatients[0].id,
        metadata: {
          patientId: createdPatients[0].id,
          patientName: "Sarah Johnson",
          urgency: "medium" as const,
          department: "Laboratory",
          icon: "Activity",
          color: "blue"
        }
      },
      {
        organizationId: org.id,
        userId: createdUsers[1].id, // Dr. Smith
        title: "Appointment Reminder",
        message: "Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.",
        type: "appointment_reminder",
        priority: "high" as const,
        status: "unread" as const,
        isActionable: true,
        actionUrl: "/calendar",
        relatedEntityType: "appointment",
        relatedEntityId: createdAppointments[0].id,
        metadata: {
          patientId: createdPatients[0].id,
          patientName: "Sarah Johnson",
          appointmentId: createdAppointments[0].id,
          urgency: "high" as const,
          department: "Cardiology",
          icon: "Calendar",
          color: "orange"
        }
      },
      {
        organizationId: org.id,
        userId: createdUsers[0].id, // Admin
        title: "Critical Drug Interaction Alert",
        message: "Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.",
        type: "prescription_alert",
        priority: "critical" as const,
        status: "unread" as const,
        isActionable: true,
        actionUrl: "/patients/2/prescriptions",
        relatedEntityType: "patient",
        relatedEntityId: createdPatients[1].id,
        metadata: {
          patientId: createdPatients[1].id,
          patientName: "Robert Davis",
          urgency: "critical" as const,
          department: "Pharmacy",
          icon: "AlertTriangle",
          color: "red",
          requiresResponse: true
        }
      },
      {
        organizationId: org.id,
        userId: createdUsers[2].id, // Nurse Williams
        title: "Patient Message",
        message: "Sarah Johnson has sent a message regarding her medication side effects.",
        type: "message",
        priority: "normal" as const,
        status: "read" as const,
        isActionable: true,
        actionUrl: "/messaging/conversations/1",
        relatedEntityType: "patient",
        relatedEntityId: createdPatients[0].id,
        readAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // Read 2 hours ago
        metadata: {
          patientId: createdPatients[0].id,
          patientName: "Sarah Johnson",
          urgency: "medium" as const,
          department: "General",
          icon: "MessageSquare",
          color: "green"
        }
      },
      {
        organizationId: org.id,
        userId: createdUsers[1].id, // Dr. Smith
        title: "System Maintenance Alert",
        message: "Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.",
        type: "system_alert",
        priority: "low" as const,
        status: "unread" as const,
        isActionable: false,
        metadata: {
          urgency: "low" as const,
          department: "IT",
          icon: "Settings",
          color: "gray",
          autoMarkAsRead: true
        }
      }
    ];

    await db.insert(notifications).values(sampleNotifications);
    console.log(`Created ${sampleNotifications.length} sample notifications`);

    // Create sample prescriptions
    const samplePrescriptions = [
      {
        organizationId: org.id,
        patientId: createdPatients[0].id, // Sarah Johnson
        providerId: createdUsers[1].id, // Dr. Smith
        prescriptionNumber: `RX-${Date.now()}-001`,
        status: "active" as const,
        diagnosis: "Hypertension",
        medications: [
          {
            name: "Lisinopril",
            dosage: "10mg",
            frequency: "Once daily",
            duration: "30 days",
            quantity: 30,
            refills: 5,
            instructions: "Take with or without food. Monitor blood pressure.",
            genericAllowed: true
          }
        ],
        pharmacy: {
          name: "City Pharmacy",
          address: "123 Main St, London",
          phone: "+44 20 7946 0958"
        },
        notes: "Patient tolerates ACE inhibitors well"
      },
      {
        organizationId: org.id,
        patientId: createdPatients[1].id, // Robert Davis
        providerId: createdUsers[1].id, // Dr. Smith
        prescriptionNumber: `RX-${Date.now()}-002`,
        status: "active" as const,
        diagnosis: "Type 2 Diabetes",
        medications: [
          {
            name: "Metformin",
            dosage: "500mg",
            frequency: "Twice daily with meals",
            duration: "90 days",
            quantity: 180,
            refills: 3,
            instructions: "Take with breakfast and dinner",
            genericAllowed: true
          }
        ],
        pharmacy: {
          name: "Local Pharmacy",
          address: "456 High St, London",
          phone: "+44 20 7946 0959"
        },
        notes: "Monitor blood glucose levels"
      }
    ];

    const createdPrescriptions = await db.insert(prescriptions).values(samplePrescriptions).returning();
    console.log(`Created ${createdPrescriptions.length} sample prescriptions`);

    // Create sample AI insights
    const sampleAiInsights = [
      {
        organizationId: org.id,
        patientId: createdPatients[0].id, // Sarah Johnson
        type: "risk_alert",
        title: "Cardiovascular Risk Assessment",
        description: "Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.",
        severity: "medium" as const,
        actionRequired: true,
        confidence: "0.85",
        metadata: {
          relatedConditions: ["Hypertension", "Family History CVD"],
          suggestedActions: ["Diet consultation", "Exercise program", "Medication review"],
          references: ["AHA Guidelines 2023", "ESC Guidelines"]
        },
        status: "active" as const
      },
      {
        organizationId: org.id,
        patientId: createdPatients[1].id, // Robert Davis
        type: "drug_interaction",
        title: "Potential Drug Interaction Alert",
        description: "Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.",
        severity: "high" as const,
        actionRequired: true,
        confidence: "0.92",
        metadata: {
          relatedConditions: ["Type 2 Diabetes", "Drug Interaction"],
          suggestedActions: ["Monitor blood glucose", "Review medication timing", "Patient education"],
          references: ["Drug Interaction Database", "FDA Guidelines"]
        },
        status: "active" as const
      },
      {
        organizationId: org.id,
        patientId: createdPatients[0].id, // Sarah Johnson
        type: "treatment_suggestion",
        title: "Hypertension Management Optimization",
        description: "Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.",
        severity: "low" as const,
        actionRequired: false,
        confidence: "0.78",
        metadata: {
          relatedConditions: ["Hypertension", "ACE Inhibitor Therapy"],
          suggestedActions: ["DASH diet counseling", "Regular exercise program", "Weight management"],
          references: ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"]
        },
        status: "active" as const
      },
      {
        organizationId: org.id,
        patientId: createdPatients[1].id, // Robert Davis
        type: "preventive_care",
        title: "Diabetic Screening Recommendations",
        description: "Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.",
        severity: "medium" as const,
        actionRequired: true,
        confidence: "0.95",
        metadata: {
          relatedConditions: ["Type 2 Diabetes", "Preventive Care"],
          suggestedActions: ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"],
          references: ["ADA Standards of Care", "Diabetic Complications Guidelines"]
        },
        status: "active" as const
      },
      {
        organizationId: org.id,
        patientId: createdPatients[0].id, // Sarah Johnson
        type: "risk_alert",
        title: "Medication Adherence Concern",
        description: "AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.",
        severity: "medium" as const,
        actionRequired: true,
        confidence: "0.73",
        metadata: {
          relatedConditions: ["Medication Adherence", "Hypertension"],
          suggestedActions: ["Adherence counseling", "Pill organizer", "Follow-up call"],
          references: ["Medication Adherence Guidelines", "Patient Education Resources"]
        },
        status: "active" as const
      }
    ];

    const createdAiInsights = await db.insert(aiInsights).values(sampleAiInsights).returning();
    console.log(`Created ${createdAiInsights.length} sample AI insights`);

    // Create sample subscription if it doesn't exist
    const existingSubscription = await db.select().from(subscriptions).where(eq(subscriptions.organizationId, org.id));
    
    if (existingSubscription.length === 0) {
      const sampleSubscription = {
        organizationId: org.id,
        plan: "professional",
        status: "active",
        currentUsers: 3,
        userLimit: 25,
        monthlyPrice: "79.00",
        nextBillingAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        trialEndsAt: null,
        features: {
          aiInsights: true,
          advancedReporting: true,
          apiAccess: true,
          whiteLabel: false
        }
      };

      const createdSubscription = await db.insert(subscriptions).values([sampleSubscription]).returning();
      console.log(`Created subscription for organization: ${createdSubscription[0].plan}`);
    } else {
      console.log("Subscription already exists for this organization");
    }

    console.log("Database seeding completed successfully!");
    
  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }
}