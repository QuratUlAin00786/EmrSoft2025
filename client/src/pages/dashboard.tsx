import { Header } from "@/components/layout/header";
import { Link } from "wouter";
import { StatsOverview } from "@/components/dashboard/stats-overview";
import { AiInsightsPanel } from "@/components/dashboard/ai-insights-panel";
import { RecentPatients } from "@/components/dashboard/recent-patients";
import { SchedulePanel } from "@/components/dashboard/schedule-panel";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { SubscriptionStatus } from "@/components/dashboard/subscription-status";
import { PatientAlerts } from "@/components/alerts/patient-alerts";
import { FullConsultationInterface } from "@/components/consultation/full-consultation-interface";
import AppointmentCalendar from "@/components/calendar/appointment-calendar";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { PatientModal } from "@/components/patients/patient-modal";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [showConsultation, setShowConsultation] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);

  const startConsultation = (patient?: any) => {
    console.log('startConsultation called with patient:', patient);
    setSelectedPatient(patient || null);
    setShowConsultation(true);
    console.log('showConsultation set to true');
    toast({
      title: "Consultation Started",
      description: "Opening patient consultation interface",
    });
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case "Add New Patient":
        setShowPatientModal(true);
        toast({
          title: "Patient Registration",
          description: "Opening new patient registration form",
        });
        break;
      case "Schedule Appointment":
        setLocation("/calendar");
        toast({
          title: "Appointment Scheduler",
          description: "Opening appointment calendar",
        });
        break;
      case "AI Assistant":
        setLocation("/ai-insights");
        toast({
          title: "AI Assistant",
          description: "Opening AI insights and recommendations",
        });
        break;
      case "Create Prescription":
        setLocation("/prescriptions");
        toast({
          title: "Prescription Manager",
          description: "Opening prescription management system",
        });
        break;
      case "Medical Records":
        setLocation("/patients");
        toast({
          title: "Patient Records",
          description: "Opening patient medical records",
        });
        break;
      case "consultation":
        console.log('Starting consultation from quick action');
        startConsultation();
        break;
      default:
        console.log(`Unknown action: ${action}`);
    }
  };

  return (
    <>
      <Header 
        title="Dashboard" 
        subtitle={`Welcome back, ${user?.firstName || 'User'}. Here's your patient overview.`}
      />
      
      <div className="flex-1 overflow-auto p-6">
        <StatsOverview />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            <AppointmentCalendar />
            <RecentPatients />
          </div>

          {/* Sidebar - 1 column */}
          <div className="space-y-6">
            <QuickActions onAction={handleQuickAction} />
            <AiInsightsPanel />
            {user?.role === "admin" && <SubscriptionStatus />}
          </div>
        </div>
      </div>

      <PatientModal 
        open={showPatientModal}
        onOpenChange={setShowPatientModal}
      />
      
      <FullConsultationInterface 
        open={showConsultation}
        onOpenChange={setShowConsultation}
        patient={selectedPatient}
      />
    </>
  );
}
