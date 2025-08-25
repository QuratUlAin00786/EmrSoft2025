import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Users, Calendar, Brain, CreditCard, Settings, UserCog, Crown, BarChart3, Plus, UserPlus, ClipboardPlus, Pill } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import AppointmentCalendar from "../calendar/appointment-calendar";

// Recent Patients List Component
function RecentPatientsList() {
  const { data: patients, isLoading, error } = useQuery({
    queryKey: ["/api/patients"],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'X-Tenant-Subdomain': 'demo'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/patients', {
        headers: {
          ...headers,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return response.json();
    },
    retry: 1,
    staleTime: 30000
  });

  if (isLoading) {
    return <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Loading patients...</div>;
  }

  if (error || !patients) {
    return <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Unable to load patient data. Please try again later.</div>;
  }

  // Ensure patients is an array
  const patientsArray = Array.isArray(patients) ? patients : [];
  
  if (patientsArray.length === 0) {
    return <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No patients found.</div>;
  }

  // Get the 5 most recent patients (sorted by creation date)
  const recentPatients = patientsArray
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-3">
      {recentPatients.map((patient: any) => (
        <div key={patient.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
          <div className="flex-1">
            <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
              {patient.firstName} {patient.lastName}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Patient ID: {patient.patientId || patient.id}
            </div>
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500">
            {patient.createdAt ? new Date(patient.createdAt).toLocaleDateString() : "Recent"}
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdminDashboard() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'X-Tenant-Subdomain': 'demo'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/dashboard/stats', {
        headers: {
          ...headers,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
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

  const dashboardCards = [
    {
      title: "Total Patients",
      value: isLoading ? "--" : (stats?.totalPatients?.toString() || "0"),
      description: isLoading ? "Loading..." : `${stats?.totalPatients || 0} active patients`,
      icon: Users,
      href: "/patients",
      color: "text-blue-500"
    },
    {
      title: "Today's Appointments", 
      value: isLoading ? "--" : (stats?.todayAppointments?.toString() || "0"),
      description: isLoading ? "Loading..." : `${stats?.todayAppointments || 0} scheduled today`,
      icon: Calendar,
      href: "/appointments",
      color: "text-green-500"
    },
    {
      title: "AI Suggestions",
      value: isLoading ? "--" : (stats?.aiSuggestions?.toString() || "0"), 
      description: isLoading ? "Loading..." : `${stats?.aiSuggestions || 0} active insights`,
      icon: Brain,
      href: "/ai-insights",
      color: "text-purple-500"
    },
    {
      title: "Revenue (MTD)",
      value: isLoading ? "--" : `£${(stats?.revenue || 0).toLocaleString()}`,
      description: isLoading ? "Loading..." : "Month to date revenue",
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
              <CardTitle className="text-sm font-medium text-gray-600 dark:!text-gray-300">{card.title}</CardTitle>
              <card.icon className={`h-6 w-6 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:!text-gray-100">{card.value}</div>
              <p className="text-xs text-gray-500 dark:!text-gray-400">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Area with Quick Actions and Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2 space-y-4">
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
          
          {/* AI Patient Insights */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold">AI Patient Insights</CardTitle>
              <div className="flex items-center gap-1 text-xs bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300 px-2 py-1 rounded-full">
                <Brain className="h-3 w-3" />
                AI Powered
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No AI insights available at the moment.
              </p>
            </CardContent>
          </Card>
          
          {/* Subscription Info */}
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">Subscription info unavailable</div>
                <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded mx-auto"></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Appointment Calendar */}
        <div className="lg:col-span-3">
          <AppointmentCalendar />
        </div>
      </div>
      
      {/* Recent Patients List */}
      <div className="mt-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">Recent Patients</CardTitle>
            <Link href="/patients">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <RecentPatientsList />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}