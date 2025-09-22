import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Calendar, Users, Clock, TrendingUp } from "lucide-react";
import AppointmentCalendar from "@/components/calendar/appointment-calendar";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export function AdminAppointments() {
  const [showNewAppointment, setShowNewAppointment] = useState(false);

  // Fetch appointments statistics
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
    return today === aptDate;
  }).length || 0;

  const upcomingAppointments = appointmentsData?.filter((apt: any) => {
    const now = new Date();
    const aptDate = new Date(apt.scheduledAt);
    return aptDate > now && apt.status !== 'cancelled';
  }).length || 0;

  return (
    <div className="space-y-6" data-testid="admin-appointments">
      {/* Admin Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-blue-800">Appointment Management</h1>
          <p className="text-gray-600">Administrative view - All appointments across the organization</p>
        </div>
        <Button 
          onClick={() => setShowNewAppointment(true)}
          className="flex items-center gap-2"
          data-testid="admin-new-appointment"
        >
          <Plus className="h-4 w-4" />
          Schedule Appointment
        </Button>
      </div>

      {/* Admin Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalAppointments}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{todayAppointments}</div>
            <p className="text-xs text-muted-foreground">Scheduled for today</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{upcomingAppointments}</div>
            <p className="text-xs text-muted-foreground">Future appointments</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admin Controls</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                Full Access
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Appointment Tabs */}
      <Tabs defaultValue="calendar" className="space-y-4">
        <TabsList>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="calendar">
          <AppointmentCalendar 
            onNewAppointment={() => setShowNewAppointment(true)} 
          />
        </TabsContent>
        
        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>All Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">List view functionality can be implemented here</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Appointment Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Analytics dashboard for administrators</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}