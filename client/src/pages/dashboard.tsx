import { Header } from "@/components/layout/header";
import { RoleBasedDashboard } from "@/components/dashboards/role-based-dashboard";
import { useAuth } from "@/hooks/use-auth";

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <>
      <Header 
        title="Dashboard" 
        subtitle="Welcome back, John. Here's your patient overview."
      />
      
      <div className="flex-1 overflow-auto p-6">
        <RoleBasedDashboard />
      </div>
    </>
  );
}
