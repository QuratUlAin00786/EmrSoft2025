import { Header } from "@/components/layout/header";
import { RoleBasedDashboard } from "@/components/dashboards/role-based-dashboard";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useQuery } from "@tanstack/react-query";

export default function Dashboard() {
  const { user } = useAuth();

  // Function to count active patients
  const { data: activePatients, isLoading: activePatientsLoading } = useQuery({
    queryKey: ["/api/patients/active"],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'X-Tenant-Subdomain': 'demo'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // Fetch only active patients (is_active = true)
      const response = await fetch('/api/patients?isActive=true', {
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return response.json();
    },
    retry: false,
    staleTime: 0,
  });

  const activePatientCount = Array.isArray(activePatients) ? activePatients.length : 0;

  return (
    <div>
      <div className="">
        <Header 
          title="Dashboard" 
          subtitle={`Welcome back, John. Here's your patient overview. Total Active Patients: ${activePatientsLoading ? '...' : activePatientCount}`}
        />
        <div className="mr-6 mt-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-600 dark:text-neutral-400">Theme:</span>
            <ThemeToggle />
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-6">
        <RoleBasedDashboard />
      </div>
    </div>
  );
}
