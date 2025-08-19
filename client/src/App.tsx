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
import { AIChatWidget } from "@/components/ai-chat-widget";
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
import Inventory from "@/pages/inventory";
import GDPRCompliance from "@/pages/gdpr-compliance";
import AiAgent from "@/pages/ai-agent";
import QuickBooks from "@/pages/quickbooks";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";

// Landing Pages
import LandingPage from "@/pages/landing/LandingPage";
import AboutPage from "@/pages/landing/AboutPage";
import FeaturesPage from "@/pages/landing/FeaturesPage";
import PricingPage from "@/pages/landing/PricingPage";
import LoginPage from "@/pages/auth/LoginPage";

// Legal Pages
import PrivacyPolicy from "@/pages/legal/PrivacyPolicy";
import TermsOfService from "@/pages/legal/TermsOfService";
import GDPRCompliancePage from "@/pages/legal/GDPRCompliance";
import Press from "@/pages/legal/Press";

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
    if (organization && typeof organization === 'object' && organization !== null && 'settings' in organization) {
      const settings = (organization as any).settings;
      if (settings && typeof settings === 'object' && 'theme' in settings && settings.theme && 'primaryColor' in settings.theme) {
        const themeColor = settings.theme.primaryColor as string;
        applyTheme(themeColor);
        localStorage.setItem('cura-theme', themeColor);
      }
    }
  }, [organization]);

  return (
    <div className="flex h-screen bg-neutral-50 dark:bg-background">
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
          <Route path="/inventory" component={Inventory} />
          <Route path="/gdpr-compliance" component={GDPRCompliance} />
          <Route path="/ai-agent" component={AiAgent} />
          <Route path="/quickbooks" component={QuickBooks} />
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
      
      {/* AI Chat Widget available on all pages */}
      <AIChatWidget />
    </div>
  );
}

function AppRouter() {
  const { isAuthenticated, loading } = useAuth();
  const [location, setLocation] = useLocation();

  // Handle redirects in useEffect to avoid setting state during render
  useEffect(() => {
    if (loading) return;

    const isLandingPage = location.startsWith('/landing') || 
                         location.startsWith('/auth/login') || 
                         location.startsWith('/legal') || 
                         location === '/';

    // If user is authenticated and on a public page, redirect to dashboard
    if (isAuthenticated && isLandingPage) {
      setLocation('/dashboard');
      return;
    }

    // If user is not authenticated and not on a public page, redirect to landing
    if (!isAuthenticated && !isLandingPage) {
      setLocation('/landing');
      return;
    }
  }, [isAuthenticated, loading, location, setLocation]);

  if (loading) {
    return <LoadingPage />;
  }

  const isLandingPage = location.startsWith('/landing') || 
                       location.startsWith('/auth/login') || 
                       location.startsWith('/legal') || 
                       location === '/';

  // Render public pages for unauthenticated users
  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={LandingPage} />
        <Route path="/landing" component={LandingPage} />
        <Route path="/landing/about" component={AboutPage} />
        <Route path="/landing/features" component={FeaturesPage} />
        <Route path="/landing/pricing" component={PricingPage} />
        <Route path="/auth/login" component={LoginPage} />
        <Route path="/legal/privacy" component={PrivacyPolicy} />
        <Route path="/legal/terms" component={TermsOfService} />
        <Route path="/legal/gdpr" component={GDPRCompliancePage} />
        <Route path="/legal/press" component={Press} />
        <Route component={LandingPage} />
      </Switch>
    );
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
