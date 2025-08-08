import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Users, Calendar, Brain, Stethoscope, Pill, FileText } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export function DoctorDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: upcomingAppointments } = useQuery({
    queryKey: ["/api/appointments/upcoming"],
  });

  const doctorCards = [
    {
      title: "Today's Patients",
      value: stats?.todayAppointments || "0",
      description: "Scheduled appointments",
      icon: Calendar,
      href: "/appointments",
      color: "bg-blue-100 text-blue-800"
    },
    {
      title: "Total Patients",
      value: stats?.totalPatients || "0",
      description: "Under your care",
      icon: Users,
      href: "/patients",
      color: "bg-green-100 text-green-800"
    },
    {
      title: "AI Clinical Insights",
      value: stats?.aiSuggestions || "0",
      description: "New recommendations",
      icon: Brain,
      href: "/ai-insights",
      color: "bg-purple-100 text-purple-800"
    },
    {
      title: "Pending Prescriptions",
      value: isLoading ? "--" : "0",
      description: "Awaiting review",
      icon: Pill,
      href: "/prescriptions",
      color: "bg-orange-100 text-orange-800"
    }
  ];

  const quickActions = [
    { title: "New Consultation", description: "Start a patient consultation", icon: Stethoscope, href: "/appointments" },
    { title: "Review Lab Results", description: "Check pending test results", icon: FileText, href: "/lab-results" },
    { title: "AI Insights", description: "View clinical recommendations", icon: Brain, href: "/ai-insights" },
    { title: "Patient Records", description: "Access medical histories", icon: Users, href: "/patients" }
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Doctor Dashboard</h1>
        <p className="text-neutral-600">
          Clinical overview and patient management tools
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {doctorCards.map((card) => (
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
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Quick Actions</h2>
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

      {/* Today's Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Schedule</CardTitle>
          <CardDescription>Your upcoming appointments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {upcomingAppointments?.slice(0, 3).map((appointment: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Patient Consultation</p>
                  <p className="text-sm text-neutral-600">
                    {new Date(appointment.scheduledAt).toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      hour12: true 
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{appointment.title}</p>
                  <p className="text-xs text-neutral-500">{appointment.duration} min</p>
                </div>
              </div>
            )) || (
              <p className="text-neutral-500 text-center py-4">No appointments scheduled for today</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}