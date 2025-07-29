import { Header } from "@/components/layout/header";
import { RoleBasedDashboard } from "@/components/dashboards/role-based-dashboard";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <>
      <div className="flex items-center justify-between">
        <Header 
          title="Dashboard" 
          subtitle="Welcome back, John. Here's your patient overview."
        />
        <div className="mr-6 mt-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-600">Theme:</span>
            <ThemeToggle />
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-6">
        <RoleBasedDashboard />
      </div>
    </>
  );
}
