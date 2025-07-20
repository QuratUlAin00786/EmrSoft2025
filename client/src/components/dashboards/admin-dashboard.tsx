import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Users, Calendar, Brain, CreditCard, Settings, UserCog, Crown, BarChart3, Plus, UserPlus, ClipboardPlus, Pill } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import AppointmentCalendar from "../calendar/appointment-calendar";

export function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const dashboardCards = [
    {
      title: "Total Patients",
      value: "--",
      description: "Fetch data for Total Patients",
      icon: Users,
      href: "/patients",
      color: "text-blue-500"
    },
    {
      title: "Today's Appointments", 
      value: "--",
      description: "Fetch data for Today's Appointments",
      icon: Calendar,
      href: "/appointments",
      color: "text-green-500"
    },
    {
      title: "AI Suggestions",
      value: "--", 
      description: "Fetch data for AI Suggestions",
      icon: Brain,
      href: "/ai-insights",
      color: "text-purple-500"
    },
    {
      title: "Revenue (MTD)",
      value: "--",
      description: "Fetch data for Revenue (MTD)",
      icon: CreditCard,
      href: "/billing",
      color: "text-yellow-500"
    }
  ];

  const quickActions = [
    { title: "Add New Patient", description: "", icon: UserPlus, href: "/patients" },
    { title: "Schedule Appointment", description: "", icon: Calendar, href: "/appointments" },
    { title: "Create Prescription", description: "", icon: Pill, href: "/prescriptions" },
    { title: "Medical Records", description: "", icon: ClipboardPlus, href: "/patients" },
    { title: "AI Assistant", description: "", icon: Brain, href: "/ai-insights" }
  ];

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardCards.map((card) => (
          <Card key={card.title} className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">{card.title}</CardTitle>
              <card.icon className={`h-6 w-6 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{card.value}</div>
              <p className="text-xs text-gray-500">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Area with Calendar and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Appointment Calendar */}
        <div className="lg:col-span-2">
          <AppointmentCalendar />
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {quickActions.map((action) => (
                <Link key={action.title} href={action.href}>
                  <Button variant="outline" className="w-full justify-start text-left">
                    <action.icon className="h-4 w-4 mr-2" />
                    {action.title}
                  </Button>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}