import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, MapPin, User, Video, Stethoscope, FileText, Plus, Save, X } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import type { Appointment } from "@/types";
import { NewAppointmentModal } from "./new-appointment-modal";

// Medical record form schema
const medicalRecordSchema = z.object({
  type: z.enum(["consultation", "prescription", "lab_result", "imaging", "procedure"]),
  title: z.string().min(1, "Title is required"),
  notes: z.string().min(10, "Notes must be at least 10 characters"),
  diagnosis: z.string().optional(),
  treatment: z.string().optional(),
  medications: z.array(z.object({
    name: z.string(),
    dosage: z.string(),
    frequency: z.string(),
    duration: z.string(),
    instructions: z.string().optional()
  })).optional(),
  followUpRequired: z.boolean().optional(),
  followUpDate: z.string().optional(),
});

const statusColors = {
  scheduled: "text-white",
  completed: "text-white", 
  cancelled: "text-white",
  no_show: "text-white"
};

const statusBgColors = {
  scheduled: "#4A7DFF",  // Bluewave
  completed: "#6CFFEB",  // Mint Drift
  cancelled: "#162B61",  // Midnight
  no_show: "#9B9EAF"     // Steel
};

const typeColors = {
  consultation: "text-white",
  follow_up: "text-white",
  procedure: "text-white"
};

const typeBgColors = {
  consultation: "#7279FB",  // Electric Lilac
  follow_up: "#C073FF",     // Electric Violet
  procedure: "#4A7DFF"      // Bluewave
};

export default function AppointmentCalendar() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [showAppointmentDetails, setShowAppointmentDetails] = useState(false);
  const [showMedicalRecord, setShowMedicalRecord] = useState(false);
  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const [dialogStable, setDialogStable] = useState(true);
  const [activeTab, setActiveTab] = useState("basic");
  const { toast } = useToast();

  const { data: rawAppointments = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/appointments"],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'X-Tenant-Subdomain': 'cura'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/appointments', {
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log("[Calendar] Fetched appointments:", data);
      return data || [];
    },
    staleTime: 0, // Reduced stale time to ensure fresh data
    refetchOnWindowFocus: true, // Enable refetch on window focus
    refetchInterval: 10000 // Refetch every 10 seconds to ensure real-time updates
  });

  // Fetch patients data to get patient names
  const { data: patients = [] } = useQuery({
    queryKey: ["/api/patients"],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'X-Tenant-Subdomain': 'cura'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/patients', {
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return await response.json();
    },
    staleTime: 60000 // 1 minute cache
  });

  // Fetch users data to get provider names
  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'X-Tenant-Subdomain': 'cura'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/users', {
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return await response.json();
    },
    staleTime: 60000 // 1 minute cache
  });

  // Helper functions to get patient and provider names
  const getPatientName = (patientId: number) => {
    const patient = patients.find((p: any) => p.id === patientId);
    return patient ? `${patient.firstName} ${patient.lastName}` : `Patient ID: ${patientId}`;
  };

  const getProviderName = (providerId: number) => {
    const provider = users.find((u: any) => u.id === providerId);
    return provider ? `Dr. ${provider.firstName} ${provider.lastName}` : `Provider ID: ${providerId}`;
  };

  // Check if patient and user data is loaded for name resolution
  const isDataLoaded = patients.length > 0 && users.length > 0;
  
  // Process appointments to ensure they're properly typed and add patient/provider names when available
  const appointments = (rawAppointments?.filter((apt: any) => {
    const isValid = apt && apt.id && apt.scheduledAt;
    if (!isValid) {
      console.log("[Calendar] Filtering out invalid appointment:", apt);
    }
    return isValid;
  }) || [])
    .map((apt: any) => {
      try {
        // Always include the appointment, but only add names when data is loaded
        const patientName = isDataLoaded ? getPatientName(apt.patientId) : `Patient ${apt.patientId}`;
        const providerName = isDataLoaded ? getProviderName(apt.providerId) : `Provider ${apt.providerId}`;
        const processed = {
          ...apt,
          patientName,
          providerName,
          // Ensure scheduledAt is valid
          scheduledAt: apt.scheduledAt
        };
        console.log("[Calendar] Processed appointment:", processed.id, processed.title, processed.scheduledAt);
        return processed;
      } catch (error) {
        console.error('[Calendar] Error processing appointment:', apt.id, error);
        return null;
      }
    })
    .filter((apt: any) => apt !== null)
    .sort((a: any, b: any) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  
  console.log("[Calendar] Final processed appointments count:", appointments.length);
  console.log("[Calendar] All appointments:", appointments.map((apt: any) => ({ id: apt.id, title: apt.title, scheduledAt: apt.scheduledAt })));
  
  // Medical record form
  const form = useForm({
    resolver: zodResolver(medicalRecordSchema),
    defaultValues: {
      type: "consultation" as const,
      title: "",
      notes: "",
      diagnosis: "",
      treatment: "",
      medications: [],
      followUpRequired: false,
      followUpDate: "",
    },
  });

  // Save medical record mutation
  const saveMedicalRecord = useMutation({
    mutationFn: async (data: any) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/patients/${selectedAppointment?.patientId}/records`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Tenant-Subdomain': 'cura'
        },
        credentials: 'include',
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Medical record saved",
        description: "The medical record has been saved successfully.",
      });
      setShowMedicalRecord(false);
      form.reset();
      setActiveTab("basic");
    },
    onError: (error: any) => {
      toast({
        title: "Error saving record",
        description: error.message || "Failed to save the medical record. Please try again.",
        variant: "destructive",
      });
    }
  });

  const onSubmit = async (data: any) => {
    saveMedicalRecord.mutate(data);
  };
  
  // Data processing complete

  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter((apt: any) => {
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
                variant="outline"
                size="sm"
                onClick={async () => {
                  console.log("[Calendar] Manual refresh triggered");
                  try {
                    await refetch();
                    toast({
                      title: "Calendar refreshed",
                      description: "Appointments data has been updated",
                    });
                  } catch (error) {
                    console.error("[Calendar] Refresh failed:", error);
                    toast({
                      title: "Refresh failed",
                      description: "Could not refresh appointments data",
                      variant: "destructive",
                    });
                  }
                }}
                className="text-xs sm:text-sm"
              >
                Refresh
              </Button>
              <Button
                variant={viewMode === "month" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("month")}
                style={{ backgroundColor: viewMode === "month" ? "#4A7DFF" : undefined, color: viewMode === "month" ? "white" : undefined }}
                className="text-xs sm:text-sm"
              >
                Month
              </Button>
              <Button
                variant={viewMode === "week" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("week")}
                style={{ backgroundColor: viewMode === "week" ? "#4A7DFF" : undefined, color: viewMode === "week" ? "white" : undefined }}
                className="text-xs sm:text-sm"
              >
                Week
              </Button>
              <Button
                variant={viewMode === "day" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("day")}
                style={{ backgroundColor: viewMode === "day" ? "#4A7DFF" : undefined, color: viewMode === "day" ? "white" : undefined }}
                className="text-xs sm:text-sm"
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
                style={{ backgroundColor: "#4A7DFF", color: "white" }}
                className="hover:opacity-90 text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap"
              >
                + New Appointment
              </Button>
            </div>
          </div>

          {/* Calendar Views */}
          {viewMode === "month" && (
            <div className="grid grid-cols-7 gap-1 mb-4">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                <div key={day} className="p-2 text-sm font-medium text-center text-gray-500 dark:text-gray-400">
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
                      p-2 text-sm border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                      ${isSelected ? "border-[#4A7DFF]" : "border-gray-200 dark:border-gray-600"}
                      ${isCurrentDay ? "font-semibold" : ""}
                    `}
                  >
                    <div className="text-center">
                      <div 
                        className={isCurrentDay ? "text-gray-900 dark:text-gray-100" : "text-gray-900 dark:text-gray-100"}
                        style={{ 
                          backgroundColor: isSelected ? "#4A7DFF" : isCurrentDay ? "#E0E1F4" : undefined,
                          color: isSelected ? "white" : isCurrentDay ? "#162B61" : undefined,
                          borderRadius: "4px",
                          padding: "2px 4px"
                        }}
                      >
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
                              <div 
                              key={apt.id} 
                              className="text-xs p-1 text-white rounded mb-1"
                              style={{ backgroundColor: "#4A7DFF" }}
                            >
                                {isDataLoaded ? (apt.patientName || getPatientName(apt.patientId)) : `Patient ${apt.patientId}`}
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
                            <div 
                              key={apt.id} 
                              className="p-3 text-white rounded mb-2"
                              style={{ backgroundColor: "#4A7DFF" }}
                            >
                              <div className="font-medium">{isDataLoaded ? (apt.patientName || getPatientName(apt.patientId)) : `Patient ${apt.patientId}`}</div>
                              <div className="text-sm">{apt.type}</div>
                              <div className="text-xs">
                                {new Date(apt.scheduledAt).toLocaleTimeString('en-US', { 
                                  hour: 'numeric', 
                                  minute: '2-digit', 
                                  hour12: true
                                })} ({apt.duration} min)
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
              {appointments.slice(0, 20)
                .filter((appointment: any) => appointment && appointment.id)
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
                      <Badge 
                        className={statusColors[appointment.status]}
                        style={{ backgroundColor: statusBgColors[appointment.status] }}
                      >
                        {appointment.status}
                      </Badge>
                      <Badge 
                        className={typeColors[appointment.type]}
                        style={{ backgroundColor: typeBgColors[appointment.type] }}
                      >
                        {appointment.type}
                      </Badge>
                      <Badge className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                        {format(new Date(appointment.scheduledAt), "MMM d, yyyy")}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {new Date(appointment.scheduledAt).toLocaleTimeString('en-US', { 
                          hour: 'numeric', 
                          minute: '2-digit', 
                          hour12: true,
                          timeZone: 'UTC'
                        })} 
                        ({appointment.duration} min)
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {appointment.location || "In-person"}
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {isDataLoaded ? ((appointment as any).patientName || getPatientName(appointment.patientId)) : `Patient ID: ${appointment.patientId}`}
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
              <Calendar className="h-5 w-5" style={{ color: "#4A7DFF" }} />
              Appointment Details
            </DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Patient Information</h4>
                  <p className="text-sm"><strong>Patient:</strong> {isDataLoaded ? (selectedAppointment.patientName || getPatientName(selectedAppointment.patientId)) : `Patient ID: ${selectedAppointment.patientId}`}</p>
                  <p className="text-sm"><strong>Doctor:</strong> {isDataLoaded ? (selectedAppointment.providerName || getProviderName(selectedAppointment.providerId)) : `Provider ID: ${selectedAppointment.providerId}`}</p>
                  <p className="text-sm"><strong>Type:</strong> {selectedAppointment.type}</p>
                  <p className="text-sm"><strong>Status:</strong> 
                    <Badge 
                      className={`ml-2 ${statusColors[selectedAppointment.status] || 'text-white'}`}
                      style={{ backgroundColor: statusBgColors[selectedAppointment.status] || '#9B9EAF' }}
                    >
                      {selectedAppointment.status}
                    </Badge>
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Appointment Details</h4>
                  <p className="text-sm"><strong>Date:</strong> {format(new Date(selectedAppointment.scheduledAt), "PPP")}</p>
                  <p className="text-sm"><strong>Time:</strong> {new Date(selectedAppointment.scheduledAt).toLocaleTimeString('en-US', { 
                    hour: 'numeric', 
                    minute: '2-digit', 
                    hour12: true,
                    timeZone: 'UTC'
                  })}</p>
                  <p className="text-sm"><strong>Duration:</strong> {selectedAppointment.duration} minutes</p>
                  <p className="text-sm"><strong>Location:</strong> {selectedAppointment.location}</p>
                  {selectedAppointment.location && selectedAppointment.location.includes('Department') && (
                    <p className="text-sm"><strong>Department:</strong> 
                      <Badge 
                        className="ml-2 text-white"
                        style={{ backgroundColor: '#4A7DFF' }}
                      >
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
                    // Pre-fill form with appointment details
                    form.setValue("title", `Medical Record - ${selectedAppointment.title}`);
                    form.setValue("type", "consultation");
                    setShowAppointmentDetails(false);
                    setShowMedicalRecord(true);
                    toast({
                      title: "Opening Medical Record",
                      description: `Creating medical record for ${isDataLoaded ? ((selectedAppointment as any).patientName || getPatientName(selectedAppointment.patientId)) : `Patient ${selectedAppointment.patientId}`}`,
                    });
                  }}
                  disabled={selectedAppointment.status !== "scheduled"}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Add Medical Record
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

      {/* Medical Record Dialog */}
      <Dialog open={showMedicalRecord} onOpenChange={setShowMedicalRecord}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-blue-800">
              Add Medical Record - {isDataLoaded ? ((selectedAppointment as any)?.patientName || getPatientName(selectedAppointment?.patientId)) : `Patient ${selectedAppointment?.patientId}`}
            </DialogTitle>
            <DialogDescription>
              Create a new medical record for this patient
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="clinical">Clinical</TabsTrigger>
                <TabsTrigger value="medications">Medications</TabsTrigger>
                <TabsTrigger value="followup">Follow-up</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="type">Record Type</Label>
                    <Select value={form.watch("type")} onValueChange={(value) => form.setValue("type", value as any)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select record type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="consultation">Consultation</SelectItem>
                        <SelectItem value="prescription">Prescription</SelectItem>
                        <SelectItem value="lab_result">Lab Result</SelectItem>
                        <SelectItem value="imaging">Imaging</SelectItem>
                        <SelectItem value="procedure">Procedure</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      {...form.register("title")}
                      placeholder="Enter record title"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    {...form.register("notes")}
                    placeholder="Enter detailed notes about the consultation..."
                    rows={4}
                  />
                </div>
              </TabsContent>

              <TabsContent value="clinical" className="space-y-4">
                <div>
                  <Label htmlFor="diagnosis">Diagnosis</Label>
                  <Textarea
                    {...form.register("diagnosis")}
                    placeholder="Enter diagnosis..."
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="treatment">Treatment Plan</Label>
                  <Textarea
                    {...form.register("treatment")}
                    placeholder="Enter treatment plan..."
                    rows={3}
                  />
                </div>
              </TabsContent>

              <TabsContent value="medications" className="space-y-4">
                <div>
                  <Label>Prescribed Medications</Label>
                  {(form.watch("medications") || []).map((medication: any, index: number) => (
                    <div key={index} className="grid grid-cols-4 gap-2 mb-2">
                      <Input
                        {...form.register(`medications.${index}.name` as any)}
                        placeholder="Medication name"
                      />
                      <Input
                        {...form.register(`medications.${index}.dosage` as any)}
                        placeholder="Dosage (e.g., 10mg)"
                      />
                      <Input
                        {...form.register(`medications.${index}.frequency` as any)}
                        placeholder="Frequency (e.g., twice daily)"
                      />
                      <Input
                        {...form.register(`medications.${index}.duration` as any)}
                        placeholder="Duration (e.g., 30 days)"
                      />
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const current = form.watch("medications") || [];
                      form.setValue("medications", [...current, { name: "", dosage: "", frequency: "", duration: "" }] as any);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Medication
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="followup" className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    {...form.register("followUpRequired")}
                    className="rounded border-gray-300"
                  />
                  <Label>Follow-up appointment required</Label>
                </div>
                {form.watch("followUpRequired") && (
                  <div>
                    <Label htmlFor="followUpDate">Follow-up Date</Label>
                    <Input
                      type="date"
                      {...form.register("followUpDate" as any)}
                    />
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowMedicalRecord(false);
                  form.reset();
                  setActiveTab("basic");
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saveMedicalRecord.isPending}
              >
                {saveMedicalRecord.isPending ? "Saving..." : "Save Record"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

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