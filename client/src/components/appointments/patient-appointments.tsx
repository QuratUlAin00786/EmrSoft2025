import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Calendar, User, Clock, FileText } from "lucide-react";
import AppointmentCalendar from "@/components/calendar/appointment-calendar";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

export function PatientAppointments() {
  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const { user } = useAuth();

  // Fetch patient's appointments (backend will filter to show only their appointments)
  const { data: appointmentsData } = useQuery({
    queryKey: ["/api/appointments"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/appointments');
      return response.json();
    },
  });

  const myAppointments = appointmentsData?.length || 0;
  const upcomingAppointments = appointmentsData?.filter((apt: any) => {
    const now = new Date();
    const aptDate = new Date(apt.scheduledAt);
    return aptDate > now && apt.status !== 'cancelled';
  }).length || 0;

  const nextAppointment = appointmentsData?.filter((apt: any) => {
    const now = new Date();
    const aptDate = new Date(apt.scheduledAt);
    return aptDate > now && apt.status === 'scheduled';
  }).sort((a: any, b: any) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0];

  return (
    <div className="space-y-6" data-testid="patient-appointments">
      {/* Patient Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-blue-800">My Appointments</h1>
          <p className="text-gray-600">Welcome back, {user?.firstName}! Manage your healthcare appointments</p>
        </div>
        <Button 
          onClick={() => setShowNewAppointment(true)}
          className="flex items-center gap-2"
          data-testid="patient-new-appointment"
        >
          <Plus className="h-4 w-4" />
          Book Appointment
        </Button>
      </div>

      {/* Patient Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Appointments</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{myAppointments}</div>
            <p className="text-xs text-muted-foreground">Total appointments</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{upcomingAppointments}</div>
            <p className="text-xs text-muted-foreground">Future appointments</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Visit</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {nextAppointment ? (
              <div>
                <div className="text-sm font-bold text-purple-600">
                  {new Date(nextAppointment.scheduledAt).toLocaleDateString()}
                </div>
                <p className="text-xs text-muted-foreground">{nextAppointment.title}</p>
              </div>
            ) : (
              <div className="text-sm text-gray-500">No upcoming visits</div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Health Records</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                Patient Portal
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Patient Appointment Tabs */}
      <Tabs defaultValue="calendar" className="space-y-4">
        <TabsList>
          <TabsTrigger value="calendar">My Calendar</TabsTrigger>
          <TabsTrigger value="history">Appointment History</TabsTrigger>
          <TabsTrigger value="health">Health Summary</TabsTrigger>
        </TabsList>
        
        <TabsContent value="calendar">
          <AppointmentCalendar 
            onNewAppointment={() => setShowNewAppointment(true)} 
          />
        </TabsContent>
        
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Appointment History</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Your past appointments and visit summaries</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="health">
          <Card>
            <CardHeader>
              <CardTitle>Health Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Your health overview and key metrics from appointments</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}