import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Calendar, Users, Clock, HeartPulse } from "lucide-react";
import AppointmentCalendar from "@/components/calendar/appointment-calendar";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

export function NurseAppointments() {
  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const { user } = useAuth();

  // Fetch all appointments (nurses can see all appointments)
  const { data: appointmentsData } = useQuery({
    queryKey: ["/api/appointments"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/appointments');
      return response.json();
    },
  });

  const totalAppointments = appointmentsData?.length || 0;
  const todayAppointments = appointmentsData?.filter((apt: any) => {
    const today = new Date().toDateString();
    const aptDate = new Date(apt.scheduledAt).toDateString();
    return today === aptDate && apt.status !== 'cancelled';
  }).length || 0;

  const priorityAppointments = appointmentsData?.filter((apt: any) => {
    return apt.type === 'procedure' || apt.status === 'scheduled';
  }).length || 0;

  return (
    <div className="space-y-6" data-testid="nurse-appointments">
      {/* Nurse Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-blue-800">Patient Care Schedule</h1>
          <p className="text-gray-600">Nurse {user?.firstName} {user?.lastName} - Patient care coordination</p>
        </div>
        <Button 
          onClick={() => setShowNewAppointment(true)}
          className="flex items-center gap-2"
          data-testid="nurse-new-appointment"
        >
          <Plus className="h-4 w-4" />
          Schedule Care
        </Button>
      </div>

      {/* Nurse Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">All Appointments</CardTitle>
            <HeartPulse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalAppointments}</div>
            <p className="text-xs text-muted-foreground">Patient appointments</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Care</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{todayAppointments}</div>
            <p className="text-xs text-muted-foreground">Appointments today</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Priority Cases</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{priorityAppointments}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Care Access</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Badge variant="secondary" className="bg-green-50 text-green-700">
                Patient Care
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Nurse Appointment Tabs */}
      <Tabs defaultValue="calendar" className="space-y-4">
        <TabsList>
          <TabsTrigger value="calendar">Care Calendar</TabsTrigger>
          <TabsTrigger value="priority">Priority Patients</TabsTrigger>
          <TabsTrigger value="vitals">Vital Signs</TabsTrigger>
        </TabsList>
        
        <TabsContent value="calendar">
          <AppointmentCalendar 
            onNewAppointment={() => setShowNewAppointment(true)} 
          />
        </TabsContent>
        
        <TabsContent value="priority">
          <Card>
            <CardHeader>
              <CardTitle>Priority Patient Care</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">High-priority patients requiring immediate attention</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="vitals">
          <Card>
            <CardHeader>
              <CardTitle>Vital Signs & Care Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Patient vital signs tracking and care documentation</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}