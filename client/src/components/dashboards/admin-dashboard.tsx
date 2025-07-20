import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Users, Calendar, Brain, CreditCard, Settings, UserCog, Crown, BarChart3 } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: organizationData } = useQuery({
    queryKey: ["/api/organization/settings"],
  });

  const adminCards = [
    {
      title: "Total Users",
      value: stats?.totalUsers || "0",
      description: "Across all roles",
      icon: Users,
      href: "/users",
      color: "bg-blue-100 text-blue-800"
    },
    {
      title: "Total Patients",
      value: stats?.totalPatients || "0",
      description: "+2 new this week",
      icon: Users,
      href: "/patients",
      color: "bg-green-100 text-green-800"
    },
    {
      title: "Organization Revenue",
      value: `£${stats?.revenue?.toLocaleString() || "0"}`,
      description: "Monthly recurring",
      icon: CreditCard,
      href: "/billing",
      color: "bg-purple-100 text-purple-800"
    },
    {
      title: "AI Insights Generated",
      value: stats?.aiSuggestions || "0",
      description: "This month",
      icon: Brain,
      href: "/ai-insights",
      color: "bg-orange-100 text-orange-800"
    }
  ];

  const quickActions = [
    { title: "Manage Users", description: "Add, edit, or deactivate user accounts", icon: UserCog, href: "/users" },
    { title: "System Settings", description: "Configure organization preferences", icon: Settings, href: "/settings" },
    { title: "Subscription", description: "Manage billing and features", icon: Crown, href: "/subscription" },
    { title: "Analytics", description: "View system-wide reports", icon: BarChart3, href: "/analytics" }
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-neutral-600">
          Welcome back, John. Here's your patient overview.
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {adminCards.map((card) => (
          <Link key={card.title} href={card.href}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <div className={`p-2 rounded-full ${card.color}`}>
                  <card.icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-neutral-500">{card.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Card key={action.title} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <action.icon className="h-8 w-8 text-primary" />
                  <div>
                    <CardTitle className="text-base">{action.title}</CardTitle>
                    <CardDescription className="text-sm">{action.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <Link href={action.href}>
                  <Button className="w-full" variant="outline">Access</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
          <CardDescription>Current system health and performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">99.9%</div>
              <p className="text-sm text-neutral-600">System Uptime</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats?.totalPatients || 0}</div>
              <p className="text-sm text-neutral-600">Active Patients</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats?.todayAppointments || 0}</div>
              <p className="text-sm text-neutral-600">Today's Appointments</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}