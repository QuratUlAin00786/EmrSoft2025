import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TenantProvider } from "@/hooks/use-tenant";
import { AuthProvider } from "@/hooks/use-auth";
import { LocaleProvider } from "@/hooks/use-locale";
import { Sidebar } from "@/components/layout/sidebar";
import { LoadingPage } from "@/components/common/loading-spinner";
import haloLogoPath from "@assets/Screenshot 2025-06-25 at 12.40.02_1750837361778.png";

// Pages
import Dashboard from "@/pages/dashboard";
import Patients from "@/pages/patients";
import AiInsights from "@/pages/ai-insights";
import UserManagement from "@/pages/user-management";
import Subscription from "@/pages/subscription";
import Settings from "@/pages/settings";
import CalendarPage from "@/pages/calendar";
import FormsPage from "@/pages/forms";
import PrescriptionsPage from "@/pages/prescriptions";
import LabResultsPage from "@/pages/lab-results";
import ImagingPage from "@/pages/imaging";
import BillingPage from "@/pages/billing";
import NotFound from "@/pages/not-found";

function ProtectedApp() {
  return (
    <div className="flex h-screen bg-neutral-50">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/patients" component={Patients} />
          <Route path="/appointments" component={CalendarPage} />
          <Route path="/prescriptions" component={PrescriptionsPage} />
          <Route path="/lab-results" component={LabResultsPage} />
          <Route path="/imaging" component={ImagingPage} />
          <Route path="/forms" component={FormsPage} />
          <Route path="/billing" component={BillingPage} />
          <Route path="/ai-insights" component={AiInsights} />
          <Route path="/users" component={UserManagement} />
          <Route path="/subscription" component={Subscription} />
          <Route path="/settings" component={Settings} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function LoginScreen() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-6">
        <div className="text-center">
          <div className="flex flex-col items-center text-center mb-6">
            <img 
              src={haloLogoPath} 
              alt="EMR Logo" 
              className="h-20 w-auto mb-3"
            />
            <div>
              <p className="text-sm text-gray-500 mt-1">EMR, UK Healthcare</p>
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Welcome to Your EMR System
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Multi-tenant healthcare management system
          </p>
        </div>
        
        <div className="mt-8 space-y-6">
          <p className="text-center text-sm text-gray-600">
            Development mode - Authentication bypassed
          </p>
        </div>
      </div>
    </div>
  );
}

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
