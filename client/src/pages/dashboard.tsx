import { Header } from "@/components/layout/header";
import { RoleBasedDashboard } from "@/components/dashboards/role-based-dashboard";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useQuery } from "@tanstack/react-query";
import { getActiveSubdomain } from "@/lib/subdomain-utils";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect lab_technician role to their dedicated dashboard
  useEffect(() => {
    if (user?.role === 'lab_technician') {
      const subdomain = getActiveSubdomain();
      setLocation(`/${subdomain}/lab-technician-dashboard`);
    }
  }, [user, setLocation]);

  // Function to count active patients
  const { data: activePatients, isLoading: activePatientsLoading } = useQuery({
    queryKey: ["/api/patients/active"],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {
        "X-Tenant-Subdomain": getActiveSubdomain(),
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // Fetch only active patients (is_active = true)
      const response = await fetch("/api/patients?isActive=true", {
        headers,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return response.json();
    },
    retry: false,
    staleTime: 0,
  });

  const activePatientCount = Array.isArray(activePatients)
    ? activePatients.length
    : 0;

  return (
    <div>
      {/* Top row: Header + Theme Toggle */}
      <div className="flex items-center justify-between mr-6 bg-white px-2 py-1 rounded">
        <Header
          title="Dashboard"
          subtitle={`Welcome back. Here's your patient overview. Total Active Patients: ${
            activePatientsLoading ? "..." : activePatientCount
          }`}
        />

        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-600">Theme:</span>
          <ThemeToggle />
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="flex-1 overflow-auto p-6">
        <RoleBasedDashboard />
      </div>
    </div>
  );
}
