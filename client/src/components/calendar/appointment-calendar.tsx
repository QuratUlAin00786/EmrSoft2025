import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Calendar, Clock, MapPin, User, Video, Stethoscope, FileText } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { FullConsultationInterface } from "@/components/consultation/full-consultation-interface";
import type { Appointment } from "@/types";
import { NewAppointmentModal } from "./new-appointment-modal";

const statusColors = {
  scheduled: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  no_show: "bg-gray-100 text-gray-800"
};

const typeColors = {
  consultation: "bg-purple-100 text-purple-800",
  follow_up: "bg-orange-100 text-orange-800",
  procedure: "bg-cyan-100 text-cyan-800"
};

export default function AppointmentCalendar() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [showAppointmentDetails, setShowAppointmentDetails] = useState(false);
  const [showConsultation, setShowConsultation] = useState(false);
  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const [dialogStable, setDialogStable] = useState(true);
  const { toast } = useToast();

  const { data: appointments = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/appointments"],
    queryFn: async () => {
      console.log("Fetching appointments from calendar using React Query...");
      
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'X-Tenant-Subdomain': 'demo'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`/api/appointments?_t=${Date.now()}`, {
        headers: {
          ...headers,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        credentials: 'include'
      });
      
      console.log("Appointments response status:", response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Fetched appointments data:", data);
      console.log("Appointments count:", data?.length || 0);
      if (data && data.length > 0) {
        console.log("First appointment details:", {
          id: data[0].id,
          scheduledAt: data[0].scheduledAt,
          patientId: data[0].patientId,
          title: data[0].title
        });
      }
      return data || [];
    },
    staleTime: 30000,
    refetchOnWindowFocus: true
  });

  // Auto-refresh appointments every 30 seconds to catch newly created appointments
  // Auto-refresh removed to prevent screen blinking



  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getAppointmentsForDate = (date: Date) => {
    return (appointments as any || []).filter((apt: any) => {
      const appointmentDate = new Date(apt.scheduledAt);
      return isSameDay(appointmentDate, date);
    });
  };

  const selectedDateAppointments = getAppointmentsForDate(selectedDate);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Appointment Calendar
            </CardTitle>
            <div className="flex items-center gap-1 flex-wrap">
              <Button
                variant={viewMode === "month" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("month")}
                className={`${viewMode === "month" ? "bg-medical-blue text-white" : ""} text-xs sm:text-sm`}
              >
                Month
              </Button>
              <Button
                variant={viewMode === "week" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("week")}
                className={`${viewMode === "week" ? "bg-medical-blue text-white" : ""} text-xs sm:text-sm`}
              >
                Week
              </Button>
              <Button
                variant={viewMode === "day" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("day")}
                className={`${viewMode === "day" ? "bg-medical-blue text-white" : ""} text-xs sm:text-sm`}
              >
                Day
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <h3 className="text-lg font-semibold">
              {format(selectedDate, "MMMM yyyy")}
            </h3>
            <div className="flex flex-wrap gap-1 sm:gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1))}
                className="text-xs sm:text-sm px-2 sm:px-3"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(new Date())}
                className="text-xs sm:text-sm px-2 sm:px-3"
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1))}
                className="text-xs sm:text-sm px-2 sm:px-3"
              >
                Next
              </Button>
              <Button
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowNewAppointment(true);
                  toast({
                    title: "New Appointment",
                    description: "Opening appointment booking form",
                  });
                }}
                className="bg-medical-blue text-white hover:bg-blue-700 text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap"
              >
                + New Appointment
              </Button>
            </div>
          </div>

          {/* Calendar Views */}
          {viewMode === "month" && (
            <div className="grid grid-cols-7 gap-1 mb-4">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                <div key={day} className="p-2 text-sm font-medium text-center text-gray-500">
                  {day}
                </div>
              ))}
              {calendarDays.map(day => {
                const dayAppointments = getAppointmentsForDate(day);
                const isSelected = isSameDay(day, selectedDate);
                const isCurrentDay = isToday(day);
                
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={`
                      p-2 text-sm border rounded-lg hover:bg-gray-50 transition-colors
                      ${isSelected ? "bg-blue-100 border-blue-300" : "border-gray-200"}
                      ${isCurrentDay ? "bg-blue-50 font-semibold" : ""}
                    `}
                  >
                    <div className="text-center">
                      <div className={isCurrentDay ? "text-blue-600" : ""}>
                        {format(day, "d")}
                      </div>

                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {viewMode === "week" && (
            <div className="mb-4">
              <div className="text-center font-medium text-gray-700 mb-4">
                Week View - {format(selectedDate, "MMMM yyyy")}
              </div>
              <div className="grid grid-cols-8 gap-1">
                <div className="p-2 text-sm font-medium text-gray-500">Time</div>
                {Array.from({ length: 7 }, (_, i) => {
                  const weekStart = new Date(selectedDate);
                  weekStart.setDate(selectedDate.getDate() - selectedDate.getDay() + i);
                  return (
                    <div key={i} className="p-2 text-sm font-medium text-center text-gray-500">
                      <div>{format(weekStart, "EEE")}</div>
                      <div className="text-xs">{format(weekStart, "MMM d")}</div>
                    </div>
                  );
                })}
                {Array.from({ length: 12 }, (_, hour) => {
                  const timeSlot = hour + 8;
                  return (
                    <div key={hour} className="contents">
                      <div className="p-2 text-sm text-gray-500">
                        {timeSlot.toString().padStart(2, '0')}:00
                      </div>
                      {Array.from({ length: 7 }, (_, dayIndex) => {
                        const weekDay = new Date(selectedDate);
                        weekDay.setDate(selectedDate.getDate() - selectedDate.getDay() + dayIndex);
                        const dayAppointments = getAppointmentsForDate(weekDay);
                        const hourAppointments = dayAppointments.filter((apt: any) => 
                          new Date(apt.scheduledAt).getHours() === timeSlot
                        );
                        return (
                          <div key={dayIndex} className="p-1 border border-gray-200 min-h-[60px]">
                            {hourAppointments.map((apt: any) => (
                              <div key={apt.id} className="text-xs p-1 bg-medical-blue text-white rounded mb-1">
                                Patient {apt.patientId}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {viewMode === "day" && (
            <div className="mb-4">
              <div className="text-center font-medium text-gray-700 mb-4">
                {format(selectedDate, "EEEE, MMMM d, yyyy")}
              </div>
              <div className="space-y-2">
                {Array.from({ length: 12 }, (_, hour) => {
                  const timeSlot = hour + 8;
                  const hourAppointments = selectedDateAppointments.filter((apt: any) => 
                    new Date(apt.scheduledAt).getHours() === timeSlot
                  );
                  return (
                    <div key={hour} className="flex items-start border-b border-gray-100 py-2">
                      <div className="w-16 text-sm text-gray-500 pt-1">
                        {timeSlot.toString().padStart(2, '0')}:00
                      </div>
                      <div className="flex-1 ml-4">
                        {hourAppointments.length > 0 ? (
                          hourAppointments.map((apt: any) => (
                            <div key={apt.id} className="p-3 bg-medical-blue text-white rounded mb-2">
                              <div className="font-medium">Patient ID: {apt.patientId}</div>
                              <div className="text-sm">{apt.type}</div>
                              <div className="text-xs">
                                {format(new Date(apt.scheduledAt), "h:mm a")} ({apt.duration} min)
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-gray-400 text-sm py-2">No appointments</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Upcoming Appointments */}
      <Card>
        <CardHeader>
          <CardTitle>
            All Upcoming Appointments ({appointments.length} total)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {appointments.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              No appointments scheduled
            </p>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {appointments
                .filter((appointment: Appointment, index: number, self: Appointment[]) => 
                  index === self.findIndex((a: Appointment) => 
                    a.patientId === appointment.patientId && 
                    a.title === appointment.title && 
                    a.scheduledAt === appointment.scheduledAt &&
                    a.location === appointment.location
                  )
                )
                .slice(0, 20)
                .map((appointment: Appointment) => (
                <div
                  key={appointment.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors cursor-pointer dark:border-border"
                  onClick={() => {
                    setSelectedAppointment(appointment);
                    setShowAppointmentDetails(true);
                  }}
                >
                  <div className="flex flex-col space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold dark:text-foreground">{appointment.title}</h4>
                      <Badge className={statusColors[appointment.status]}>
                        {appointment.status}
                      </Badge>
                      <Badge className={typeColors[appointment.type]}>
                        {appointment.type}
                      </Badge>
                      <Badge className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                        {format(new Date(appointment.scheduledAt), "MMM d, yyyy")}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {format(new Date(appointment.scheduledAt), "h:mm a")} 
                        ({appointment.duration} min)
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {appointment.location || "In-person"}
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        Patient ID: {appointment.patientId}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Appointment Details Dialog */}
      <Dialog open={showAppointmentDetails} onOpenChange={setShowAppointmentDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Appointment Details
            </DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Patient Information</h4>
                  <p className="text-sm"><strong>Patient ID:</strong> {selectedAppointment.patientId}</p>
                  <p className="text-sm"><strong>Type:</strong> {selectedAppointment.type}</p>
                  <p className="text-sm"><strong>Status:</strong> 
                    <Badge className={`ml-2 ${(statusColors as any)[selectedAppointment.status] || 'bg-gray-100'}`}>
                      {selectedAppointment.status}
                    </Badge>
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Appointment Details</h4>
                  <p className="text-sm"><strong>Date:</strong> {format(new Date(selectedAppointment.scheduledAt), "PPP")}</p>
                  <p className="text-sm"><strong>Time:</strong> {format(new Date(selectedAppointment.scheduledAt), "h:mm a")}</p>
                  <p className="text-sm"><strong>Duration:</strong> {selectedAppointment.duration} minutes</p>
                  <p className="text-sm"><strong>Location:</strong> {selectedAppointment.location}</p>
                  {selectedAppointment.location && selectedAppointment.location.includes('Department') && (
                    <p className="text-sm"><strong>Department:</strong> 
                      <Badge className="ml-2 bg-blue-100 text-blue-800">
                        {(() => {
                          const parts = selectedAppointment.location.split(', ');
                          return parts.find((part: string) => part.includes('Department')) || 
                                 parts[parts.length - 1];
                        })()}
                      </Badge>
                    </p>
                  )}
                </div>
              </div>
              
              {selectedAppointment.description && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Description</h4>
                  <p className="text-sm text-gray-600">{selectedAppointment.description}</p>
                </div>
              )}
              
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={() => {
                    setShowAppointmentDetails(false);
                    setShowConsultation(true);
                    toast({
                      title: "Starting Consultation",
                      description: `Beginning consultation for Patient ${selectedAppointment.patientId}`,
                    });
                  }}
                  disabled={selectedAppointment.status !== "scheduled"}
                >
                  <Stethoscope className="h-4 w-4 mr-2" />
                  Start Consultation
                </Button>
                <Button 
                  variant="destructive"
                  onClick={async () => {
                    try {
                      await apiRequest('DELETE', `/api/appointments/${selectedAppointment.id}`);

                      // Close dialog first
                      setShowAppointmentDetails(false);
                      
                      // Refresh appointments list immediately
                      refetch();
                      
                      toast({
                        title: "Appointment Deleted",
                        description: "The appointment has been successfully deleted",
                      });
                    } catch (error) {
                      console.error("Error deleting appointment:", error);
                      
                      // Check if it's already deleted (404 error)
                      if ((error as any)?.message?.includes('404') || (error as any)?.message?.includes('not found')) {
                        setShowAppointmentDetails(false);
                        refetch();
                        toast({
                          title: "Appointment Deleted",
                          description: "The appointment has been successfully deleted",
                        });
                      } else {
                        toast({
                          title: "Error",
                          description: "Failed to delete appointment. Please try again.",
                          variant: "destructive"
                        });
                      }
                    }
                  }}
                >
                  Delete
                </Button>
                <Button variant="outline" onClick={() => setShowAppointmentDetails(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Full Consultation Interface */}
      <FullConsultationInterface 
        open={showConsultation} 
        onOpenChange={setShowConsultation}
        patient={selectedAppointment ? { 
          id: selectedAppointment.patientId,
          firstName: `Patient`,
          lastName: selectedAppointment.patientId.toString(),
          dateOfBirth: "1990-01-01",
          phone: "Not provided",
          email: "Not provided"
        } : null}
      />

      {/* New Appointment Modal */}
      <NewAppointmentModal 
        isOpen={showNewAppointment}
        onClose={() => setShowNewAppointment(false)}
        onAppointmentCreated={() => {
          console.log("📅 Calendar refetch triggered...");
          refetch().then(() => {
            console.log("✅ Calendar refetch completed");
          });
          setSelectedDate(new Date());
        }}
      />
    </div>
  );
}