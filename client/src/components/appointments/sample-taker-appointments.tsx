import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Calendar, TestTube, Clock, Activity } from "lucide-react";
import AppointmentCalendar from "@/components/calendar/appointment-calendar";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

export function SampleTakerAppointments() {
  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const { user } = useAuth();

  // Fetch relevant appointments (sample collection appointments)
  const { data: appointmentsData } = useQuery({
    queryKey: ["/api/appointments"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/appointments');
      return response.json();
    },
  });

  const totalAppointments = appointmentsData?.length || 0;
  const labAppointments = appointmentsData?.filter((apt: any) => {
    return apt.type === 'procedure' || apt.title?.toLowerCase().includes('lab') || apt.title?.toLowerCase().includes('test');
  }).length || 0;

  const todayLabs = appointmentsData?.filter((apt: any) => {
    const today = new Date().toDateString();
    const aptDate = new Date(apt.scheduledAt).toDateString();
    const isLabRelated = apt.type === 'procedure' || apt.title?.toLowerCase().includes('lab') || apt.title?.toLowerCase().includes('test');
    return today === aptDate && isLabRelated;
  }).length || 0;

  return (
    <div className="space-y-6" data-testid="sample-taker-appointments">
      {/* Sample Taker Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-blue-800">Lab Collection Schedule</h1>
          <p className="text-gray-600">{user?.firstName} {user?.lastName} - Sample collection and laboratory coordination</p>
        </div>
        <Button 
          onClick={() => setShowNewAppointment(true)}
          className="flex items-center gap-2"
          data-testid="sample-taker-new-appointment"
        >
          <Plus className="h-4 w-4" />
          Schedule Collection
        </Button>
      </div>

      {/* Sample Taker Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">All Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalAppointments}</div>
            <p className="text-xs text-muted-foreground">Total appointments</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lab Collections</CardTitle>
            <TestTube className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{labAppointments}</div>
            <p className="text-xs text-muted-foreground">Sample collections</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Collections</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{todayLabs}</div>
            <p className="text-xs text-muted-foreground">Scheduled today</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lab Access</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Badge variant="secondary" className="bg-orange-50 text-orange-700">
                Sample Taker
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sample Taker Appointment Tabs */}
      <Tabs defaultValue="calendar" className="space-y-4">
        <TabsList>
          <TabsTrigger value="calendar">Collection Schedule</TabsTrigger>
          <TabsTrigger value="samples">Sample Tracking</TabsTrigger>
          <TabsTrigger value="protocols">Lab Protocols</TabsTrigger>
        </TabsList>
        
        <TabsContent value="calendar">
          <AppointmentCalendar 
            onNewAppointment={() => setShowNewAppointment(true)} 
          />
        </TabsContent>
        
        <TabsContent value="samples">
          <Card>
            <CardHeader>
              <CardTitle>Sample Collection Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Track collected samples and laboratory submissions</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="protocols">
          <Card>
            <CardHeader>
              <CardTitle>Collection Protocols</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Laboratory collection procedures and protocols</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}