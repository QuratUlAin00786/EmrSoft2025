import { Header } from "@/components/layout/header";
import { StatsOverview } from "@/components/dashboard/stats-overview";
import { AiInsightsPanel } from "@/components/dashboard/ai-insights-panel";
import { RecentPatients } from "@/components/dashboard/recent-patients";
import { SchedulePanel } from "@/components/dashboard/schedule-panel";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { SubscriptionStatus } from "@/components/dashboard/subscription-status";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { PatientModal } from "@/components/patients/patient-modal";

export default function Dashboard() {
  const { user } = useAuth();
  const [showPatientModal, setShowPatientModal] = useState(false);

  const handleQuickAction = (action: string) => {
    switch (action) {
      case "addPatient":
        setShowPatientModal(true);
        break;
      case "scheduleAppointment":
        // TODO: Implement appointment scheduling modal
        console.log("Open appointment scheduler");
        break;
      case "aiChat":
        // TODO: Implement AI assistant chat interface
        console.log("Open AI assistant chat");
        break;
      case "prescribe":
        // TODO: Implement prescription creation modal
        console.log("Open prescription creator");
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
            <AiInsightsPanel />
            <RecentPatients />
          </div>

          {/* Sidebar - 1 column */}
          <div className="space-y-6">
            <SchedulePanel />
            <QuickActions onAction={handleQuickAction} />
            {user?.role === "admin" && <SubscriptionStatus />}
          </div>
        </div>
      </div>

      <PatientModal 
        open={showPatientModal}
        onOpenChange={setShowPatientModal}
      />
    </>
  );
}
