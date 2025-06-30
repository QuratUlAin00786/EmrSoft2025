import { Switch, Route } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TenantProvider } from "@/hooks/use-tenant";
import { AuthProvider } from "@/hooks/use-auth";
import { LocaleProvider } from "@/hooks/use-locale";
import { Sidebar } from "@/components/layout/sidebar";
import { LoadingPage } from "@/components/common/loading-spinner";
import { useAuth } from "@/hooks/use-auth";
import haloLogoPath from "@assets/Screenshot 2025-06-25 at 12.40.02_1750837361778.png";

// Pages
import Dashboard from "@/pages/dashboard";
import Patients from "@/pages/patients";
import AiInsights from "@/pages/ai-insights";
import UserManagement from "@/pages/user-management";
import StaffProfile from "@/pages/staff-profile";
import Subscription from "@/pages/subscription";
import Settings from "@/pages/settings";
import CalendarPage from "@/pages/calendar";
import FormsPage from "@/pages/forms";
import MessagingPage from "@/pages/messaging";
import IntegrationsPage from "@/pages/integrations";
import PrescriptionsPage from "@/pages/prescriptions";
import LabResultsPage from "@/pages/lab-results";
import ImagingPage from "@/pages/imaging";
import BillingPage from "@/pages/billing";
import AnalyticsPage from "@/pages/analytics";
import AutomationPage from "@/pages/automation";
import PatientPortal from "@/pages/patient-portal";
import ClinicalDecisionSupport from "@/pages/clinical-decision-support";
import Telemedicine from "@/pages/telemedicine";
import PopulationHealth from "@/pages/population-health";
import MobileHealth from "@/pages/mobile-health";
import VoiceDocumentation from "@/pages/voice-documentation";
import FinancialIntelligence from "@/pages/financial-intelligence";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";

function ProtectedApp() {
  return (
    <div className="flex h-screen bg-neutral-50">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-y-auto">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/patients" component={Patients} />
          <Route path="/patients/:id" component={Patients} />
          <Route path="/patients/:id/records" component={Patients} />
          <Route path="/calendar" component={CalendarPage} />
          <Route path="/appointments" component={CalendarPage} />
          <Route path="/prescriptions" component={PrescriptionsPage} />
          <Route path="/lab-results" component={LabResultsPage} />
          <Route path="/imaging" component={ImagingPage} />
          <Route path="/forms" component={FormsPage} />
          <Route path="/messaging" component={MessagingPage} />
          <Route path="/integrations" component={IntegrationsPage} />
          <Route path="/billing" component={BillingPage} />
          <Route path="/analytics" component={AnalyticsPage} />
          <Route path="/automation" component={AutomationPage} />
          <Route path="/patient-portal" component={PatientPortal} />
          <Route path="/ai-insights" component={AiInsights} />
          <Route path="/clinical-decision-support" component={ClinicalDecisionSupport} />
          <Route path="/telemedicine" component={Telemedicine} />
          <Route path="/population-health" component={PopulationHealth} />
          <Route path="/mobile-health" component={MobileHealth} />
          <Route path="/voice-documentation" component={VoiceDocumentation} />
          <Route path="/financial-intelligence" component={FinancialIntelligence} />
          <Route path="/users" component={UserManagement} />
          <Route path="/staff/:id" component={StaffProfile} />
          <Route path="/subscription" component={Subscription} />
          <Route path="/settings" component={Settings} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function AppRouter() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingPage />;
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return <ProtectedApp />;
}

// Create query client instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <TenantProvider>
          <AuthProvider>
            <LocaleProvider>
              <div className="min-h-screen">
                <ProtectedApp />
              </div>
              <Toaster />
            </LocaleProvider>
          </AuthProvider>
        </TenantProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
