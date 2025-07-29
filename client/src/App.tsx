import { Switch, Route, useLocation } from "wouter";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TenantProvider } from "@/hooks/use-tenant";
import { AuthProvider } from "@/hooks/use-auth";
import { LocaleProvider } from "@/hooks/use-locale";
import { ThemeProvider } from "@/hooks/use-theme";
import { Sidebar } from "@/components/layout/sidebar";
import { LoadingPage } from "@/components/common/loading-spinner";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import curaLogoPath from "@assets/Cura Logo Main_1751893631982.png";

// Pages
import Dashboard from "@/pages/dashboard";
import Patients from "@/pages/patients";
import AiInsights from "@/pages/ai-insights";
import UserManagement from "@/pages/user-management";
import PermissionsReference from "@/pages/permissions-reference";
import StaffProfile from "@/pages/staff-profile";
import Subscription from "@/pages/subscription";
import Settings from "@/pages/settings";
import ShiftsPage from "@/pages/shifts";
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
import EmergencyProtocols from "@/pages/emergency-protocols";
import MedicationGuide from "@/pages/medication-guide";
import PreventionGuidelines from "@/pages/prevention-guidelines";
import ClinicalProcedures from "@/pages/clinical-procedures";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";

function ProtectedApp() {
  // Load and apply theme from organization settings
  const { data: organization } = useQuery({
    queryKey: ["/api/tenant/info"],
    retry: false,
  });

  // Apply theme colors to CSS variables
  const applyTheme = (themeValue: string) => {
    const root = document.documentElement;
    
    switch (themeValue) {
      case 'green':
        root.style.setProperty('--primary', 'hsl(142, 70%, 45%)'); // Medical Green
        root.style.setProperty('--medical-blue', 'hsl(142, 70%, 45%)');
        break;
      case 'purple':
        root.style.setProperty('--primary', 'hsl(261, 73%, 52%)'); // Professional Purple
        root.style.setProperty('--medical-blue', 'hsl(261, 73%, 52%)');
        break;
      case 'dark':
        root.style.setProperty('--primary', 'hsl(0, 0%, 20%)'); // Dark Mode
        root.style.setProperty('--medical-blue', 'hsl(0, 0%, 20%)');
        break;
      default: // Medical Blue
        root.style.setProperty('--primary', 'hsl(210, 100%, 46%)');
        root.style.setProperty('--medical-blue', 'hsl(210, 100%, 46%)');
        break;
    }
  };

  // Apply theme immediately on component mount from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('cura-theme');
    if (savedTheme) {
      applyTheme(savedTheme);
    }
  }, []);

  // Apply theme when organization data loads and save to localStorage
  useEffect(() => {
    if (organization?.settings?.theme?.primaryColor) {
      const themeColor = organization.settings.theme.primaryColor;
      applyTheme(themeColor);
      localStorage.setItem('cura-theme', themeColor);
    }
  }, [organization?.settings?.theme?.primaryColor]);

  return (
    <div className="flex h-screen bg-neutral-50">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-y-auto lg:ml-0">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/dashboard" component={Dashboard} />
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
          <Route path="/emergency-protocols" component={EmergencyProtocols} />
          <Route path="/medication-guide" component={MedicationGuide} />
          <Route path="/prevention-guidelines" component={PreventionGuidelines} />
          <Route path="/clinical-procedures" component={ClinicalProcedures} />
          <Route path="/users" component={UserManagement} />
          <Route path="/user-management" component={UserManagement} />
          <Route path="/shifts" component={ShiftsPage} />
          <Route path="/permissions-reference" component={PermissionsReference} />
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
  const [location, setLocation] = useLocation();

  if (loading) {
    return <LoadingPage />;
  }

  // Redirect authenticated users away from login page
  if (isAuthenticated && location === '/login') {
    setLocation('/dashboard');
    return <LoadingPage />;
  }

  // Redirect unauthenticated users to login page
  if (!isAuthenticated && location !== '/login') {
    setLocation('/login');
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
        <ThemeProvider>
          <TenantProvider>
            <AuthProvider>
              <LocaleProvider>
                <div className="min-h-screen">
                  <AppRouter />
                </div>
                <Toaster />
              </LocaleProvider>
            </AuthProvider>
          </TenantProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
