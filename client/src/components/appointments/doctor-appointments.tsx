import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Calendar, Users, Clock, Stethoscope } from "lucide-react";
import AppointmentCalendar from "@/components/calendar/appointment-calendar";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

export function DoctorAppointments() {
  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const { user } = useAuth();

  // Fetch doctor's appointments (backend will filter automatically)
  const { data: appointmentsData } = useQuery({
    queryKey: ["/api/appointments"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/appointments');
      return response.json();
    },
  });

  const myAppointments = appointmentsData?.length || 0;
  const todayAppointments = appointmentsData?.filter((apt: any) => {
    const today = new Date().toDateString();
    const aptDate = new Date(apt.scheduledAt).toDateString();
    return today === aptDate && apt.status !== 'cancelled';
  }).length || 0;

  const nextAppointment = appointmentsData?.filter((apt: any) => {
    const now = new Date();
    const aptDate = new Date(apt.scheduledAt);
    return aptDate > now && apt.status === 'scheduled';
  }).sort((a: any, b: any) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0];

  return (
    <div className="space-y-6" data-testid="doctor-appointments">
      {/* Doctor Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-blue-800">My Appointments</h1>
          <p className="text-gray-600">Dr. {user?.firstName} {user?.lastName} - Your scheduled appointments</p>
        </div>
        <Button 
          onClick={() => setShowNewAppointment(true)}
          className="flex items-center gap-2"
          data-testid="doctor-new-appointment"
        >
          <Plus className="h-4 w-4" />
          Book Appointment
        </Button>
      </div>

      {/* Doctor Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Appointments</CardTitle>
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{myAppointments}</div>
            <p className="text-xs text-muted-foreground">Total appointments</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Schedule</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{todayAppointments}</div>
            <p className="text-xs text-muted-foreground">Appointments today</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Patient</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {nextAppointment ? (
              <div>
                <div className="text-sm font-bold text-purple-600">
                  {new Date(nextAppointment.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <p className="text-xs text-muted-foreground">{nextAppointment.title}</p>
              </div>
            ) : (
              <div className="text-sm text-gray-500">No upcoming appointments</div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Access Level</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                Doctor
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Doctor Appointment Tabs */}
      <Tabs defaultValue="calendar" className="space-y-4">
        <TabsList>
          <TabsTrigger value="calendar">My Calendar</TabsTrigger>
          <TabsTrigger value="today">Today's Schedule</TabsTrigger>
          <TabsTrigger value="notes">Patient Notes</TabsTrigger>
        </TabsList>
        
        <TabsContent value="calendar">
          <AppointmentCalendar 
            onNewAppointment={() => setShowNewAppointment(true)} 
          />
        </TabsContent>
        
        <TabsContent value="today">
          <Card>
            <CardHeader>
              <CardTitle>Today's Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Today's appointment list and quick actions</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="notes">
          <Card>
            <CardHeader>
              <CardTitle>Patient Notes & History</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Quick access to patient notes and consultation history</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}