import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Calendar, Brain, CreditCard, Settings, UserCog, Crown, BarChart3, Plus, UserPlus, ClipboardPlus, Pill, Clock, MapPin, User, Video, Stethoscope, FileText, Save, X, Mic, Square, Edit, Trash2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import anatomicalDiagramImage from "@assets/2_1754469563272.png";
import facialDiagramImage from "@assets/1_1754469776185.png";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Appointment } from "@/types";
import ConsultationNotes from "@/components/medical/consultation-notes";
import { FullConsultationInterface } from "@/components/consultation/full-consultation-interface";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/hooks/use-tenant";
import { AiInsightsPanel } from "../dashboard/ai-insights-panel";

// Appointment Calendar Constants
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

// Wrapper component to fetch patient data and pass to FullConsultationInterface
function FullConsultationWrapper({ patientId, show, onOpenChange }: { patientId: number; show: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: patient, isLoading } = useQuery({
    queryKey: ['/api/patients', patientId],
    enabled: show && !!patientId,
  });

  if (!show) return null;

  return (
    <FullConsultationInterface
      open={show}
      onOpenChange={onOpenChange}
      patient={patient || undefined}
    />
  );
}

// Recent Patients List Component
function RecentPatientsList() {
  const [patients, setPatients] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function fetchPatients() {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/patients', {
          headers: {
            'X-Tenant-Subdomain': 'demo',
          },
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch patients: ${response.status}`);
        }
        
        const data = await response.json();
        setPatients(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load patients');
        setPatients([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPatients();
  }, []);

  if (isLoading) {
    return <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Loading patients...</div>;
  }

  if (error || patients.length === 0) {
    return <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
      {error || "No patients found."}
    </div>;
  }

  // Get the 5 most recent patients (sorted by creation date)
  const recentPatients = patients
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
  const [, setLocation] = useLocation();
  
  // Appointment Calendar State
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [showAppointmentDetails, setShowAppointmentDetails] = useState(false);
  const [dialogStable, setDialogStable] = useState(true);
  const [activeTab, setActiveTab] = useState("basic");

  const { user } = useAuth();
  const { tenant } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Anatomical Analysis State
  const [showAnatomicalViewer, setShowAnatomicalViewer] = useState(false);
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>("");
  const [selectedAnalysisType, setSelectedAnalysisType] = useState<string>("");
  const [selectedTreatment, setSelectedTreatment] = useState<string>("");
  const [generatedTreatmentPlan, setGeneratedTreatmentPlan] = useState<string>("");
  const [isGeneratingPlan, setIsGeneratingPlan] = useState<boolean>(false);
  const [isSavingAnalysis, setIsSavingAnalysis] = useState<boolean>(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // State for ConsultationNotes modal
  const [showConsultationNotes, setShowConsultationNotes] = useState(false);
  // State for Full Consultation interface
  const [showFullConsultation, setShowFullConsultation] = useState(false);
  // State for edit appointment modal
  const [showEditAppointment, setShowEditAppointment] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<any>(null);
  const [editAppointmentDate, setEditAppointmentDate] = useState<Date | undefined>(undefined);
  const [editSelectedTimeSlot, setEditSelectedTimeSlot] = useState<string>("");

  // Voice transcription states
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscriptionSupported, setIsTranscriptionSupported] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [recognition, setRecognition] = useState<any>(null);

  // Time slots for appointment booking
  const timeSlots = [
    "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
    "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
    "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM", "5:00 PM"
  ];

  // Define muscle coordinates for interactive highlighting
  const muscleCoordinates = {
    frontalis: { x: 350, y: 180 },
    temporalis: { x: 280, y: 220 },
    corrugator: { x: 320, y: 200 },
    procerus: { x: 350, y: 220 },
    orbicularis_oculi: { x: 320, y: 240 },
    levator_labii: { x: 340, y: 280 },
    zygomaticus_major: { x: 380, y: 310 },
    zygomaticus_minor: { x: 370, y: 290 },
    masseter: { x: 400, y: 350 },
    buccinator: { x: 380, y: 340 },
    orbicularis_oris: { x: 350, y: 380 },
    mentalis: { x: 350, y: 420 },
    depressor_anguli: { x: 370, y: 400 },
    platysma: { x: 350, y: 450 }
  };

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

  // Real-time appointment updates via Server-Sent Events
  useEffect(() => {
    if (!user || !tenant) return;

    console.log("[Admin Calendar SSE] Setting up real-time connection...");
    const eventSource = new EventSource(`/api/appointments/stream`, {});

    eventSource.onopen = () => {
      console.log("[Admin Calendar SSE] Connected to appointment stream");
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("[Admin Calendar SSE] Received appointment event:", data);

        if (data.type === 'appointment.created' || data.type === 'appointment.updated' || data.type === 'appointment.deleted') {
          queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
          
          const eventAction = data.type.split('.')[1];
          toast({
            title: "Appointment Updated",
            description: `An appointment has been ${eventAction} in real-time.`,
          });
        }
      } catch (error) {
        console.error("[Admin Calendar SSE] Error parsing event data:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("[Admin Calendar SSE] Connection error:", error);
    };

    return () => {
      console.log("[Admin Calendar SSE] Closing connection");
      eventSource.close();
    };
  }, [user, tenant, queryClient, toast]);

  // Check for speech recognition support
  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      setIsTranscriptionSupported(true);
      const recognitionInstance = new (window as any).webkitSpeechRecognition();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'en-US';
      setRecognition(recognitionInstance);
    }
  }, []);

  // Function to check if a time slot is available
  const isTimeSlotAvailable = (date: Date, timeSlot: string) => {
    if (!date || !timeSlot || !appointmentsData) return true;
    
    const selectedDateString = format(date, 'yyyy-MM-dd');
    
    return !appointmentsData.some((apt: any) => {
      if (editingAppointment && apt.id === editingAppointment.id) return false;
      
      const cleanTimeString = apt.scheduledAt.replace('Z', '');
      const aptDate = new Date(cleanTimeString);
      const aptTime = format(aptDate, 'h:mm a');
      const aptDateString = format(aptDate, 'yyyy-MM-dd');
      
      return aptDateString === selectedDateString && aptTime === timeSlot;
    });
  };

  // Delete appointment mutation
  const deleteAppointmentMutation = useMutation({
    mutationFn: async (appointmentId: number) => {
      const response = await apiRequest("DELETE", `/api/appointments/${appointmentId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Appointment Deleted",
        description: "The appointment has been successfully deleted.",
      });
    },
    onError: (error) => {
      console.error("Delete appointment error:", error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete the appointment. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Edit appointment mutation
  const editAppointmentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest("PATCH", `/api/appointments/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      setShowEditAppointment(false);
      setEditingAppointment(null);
      setEditAppointmentDate(undefined);
      setEditSelectedTimeSlot("");
      toast({
        title: "Appointment Updated",
        description: "The appointment has been successfully updated.",
      });
    },
    onError: (error) => {
      console.error("Edit appointment error:", error);
      toast({
        title: "Update Failed", 
        description: "Failed to update the appointment. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle delete appointment
  const handleDeleteAppointment = (appointmentId: number, appointmentTitle: string) => {
    if (window.confirm(`Are you sure you want to delete "${appointmentTitle}"? This action cannot be undone.`)) {
      deleteAppointmentMutation.mutate(appointmentId);
    }
  };

  // Handle edit appointment
  const handleEditAppointment = (appointment: any) => {
    setEditingAppointment(appointment);
    
    const cleanTimeString = appointment.scheduledAt.replace('Z', '');
    const appointmentDate = new Date(cleanTimeString);
    setEditAppointmentDate(appointmentDate);
    
    const hours = appointmentDate.getHours();
    const minutes = appointmentDate.getMinutes();
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
    const timeString = `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    setEditSelectedTimeSlot(timeString);
    
    setShowEditAppointment(true);
  };

  // Role-based permissions helper
  const canEditAppointments = () => {
    if (!user) return false;
    const allowedRoles = ['admin', 'doctor', 'nurse', 'receptionist'];
    return allowedRoles.includes(user.role);
  };

  const canDeleteAppointments = () => {
    if (!user) return false;
    const allowedRoles = ['admin', 'doctor', 'nurse', 'receptionist'];
    return allowedRoles.includes(user.role);
  };

  const canCreateAppointments = () => {
    if (!user) return false;
    return true;
  };

  const canViewAppointmentDetails = () => {
    if (!user) return false;
    return true;
  };

  const startRecording = () => {
    if (recognition) {
      setIsRecording(true);
      recognition.start();
      
      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      recognition.onerror = () => {
        setIsRecording(false);
        toast({
          title: "Recording Error",
          description: "Failed to record audio. Please try again.",
          variant: "destructive",
        });
      };
    }
  };

  const stopRecording = () => {
    if (recognition) {
      recognition.stop();
      setIsRecording(false);
    }
  };

  // Fetch appointments
  const { data: appointmentsData, isLoading: appointmentsLoading } = useQuery({
    queryKey: ["/api/appointments"],
    staleTime: 30000,
    refetchInterval: 60000,
    retry: 3,
    retryDelay: 1000,
    queryFn: async () => {
      console.log("[Admin Calendar] Fetching appointments...");
      const response = await apiRequest('GET', '/api/appointments');
      const data = await response.json();
      console.log("[Admin Calendar] Appointments data received:", data);
      return data;
    },
  });

  // Fetch users for patient and provider names
  const { data: usersData, isLoading: isUsersLoading } = useQuery({
    queryKey: ["/api/users"],
    staleTime: 60000,
    queryFn: async () => {
      console.log("[Admin Calendar] Fetching users data...");
      const response = await apiRequest('GET', '/api/users');
      const data = await response.json();
      console.log("[Admin Calendar] Users data received:", data);
      return data;
    },
  });

  // Fetch patients
  const { data: patientsData, isLoading: isPatientsLoading } = useQuery({
    queryKey: ["/api/patients"],
    staleTime: 60000,
    queryFn: async () => {
      console.log("[Admin Calendar] Fetching patients data...");
      const response = await apiRequest('GET', '/api/patients');
      const data = await response.json();
      console.log("[Admin Calendar] Patients data received:", data);
      return data;
    },
  });

  // Helper functions
  const getPatientName = (patientId: number) => {
    if (!patientsData || !Array.isArray(patientsData)) return `Patient ${patientId}`;
    const patient = patientsData.find((p: any) => p.id === patientId);
    return patient ? `${patient.firstName} ${patient.lastName}` : `Patient ${patientId}`;
  };

  const getProviderName = (providerId: number) => {
    if (!usersData || !Array.isArray(usersData)) return `Provider ${providerId}`;
    const provider = usersData.find((u: any) => u.id === providerId);
    return provider ? `${provider.firstName || ''} ${provider.lastName || ''}`.trim() : `Provider ${providerId}`;
  };

  // Process appointments
  const appointments = (appointmentsData && Array.isArray(appointmentsData) ? appointmentsData.filter((apt: any) => {
    const isValid = apt && apt.id && apt.scheduledAt;
    if (!isValid) {
      console.warn('[Admin Calendar] Invalid appointment filtered out:', apt);
    }
    return isValid;
  }) : [])
    .map((apt: any) => {
      try {
        const patientName = getPatientName(apt.patientId);
        const providerName = getProviderName(apt.providerId);
        const processed = {
          ...apt,
          patientName,
          providerName,
          scheduledAt: apt.scheduledAt
        };
        return processed;
      } catch (error) {
        console.error('[Admin Calendar] Error processing appointment:', apt.id, error);
        return null;
      }
    })
    .filter((apt: any) => apt !== null)
    .sort((a: any, b: any) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  // Calendar data processing
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

  const formatTime = (timeString: string) => {
    try {
      const cleanTimeString = timeString.replace('Z', '');
      const date = new Date(cleanTimeString);
      return format(date, "h:mm a");
    } catch (error) {
      return "Invalid time";
    }
  };

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

      {/* Main Content Area with Calendar and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* First Row - Appointment Calendar */}
        <div className="lg:col-span-2">
          {appointmentsLoading ? (
            <Card>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-64 bg-gray-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Calendar Header */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <h2 className="text-2xl font-bold text-blue-800">
                        {format(selectedDate, "MMMM yyyy")}
                      </h2>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1))}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedDate(new Date())}
                        >
                          Today
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1))}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                    {canCreateAppointments() && (
                      <Button onClick={() => setLocation("/appointments")} className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        New Appointment
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-7 gap-4 mb-4">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                      <div key={day} className="p-2 text-center font-medium text-gray-500 dark:text-gray-400">
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-4">
                    {calendarDays.map((day) => {
                      const dayAppointments = getAppointmentsForDate(day);
                      const isSelected = isSameDay(day, selectedDate);
                      const isCurrentDay = isToday(day);
                      
                      return (
                        <div
                          key={day.toISOString()}
                          className={`
                            min-h-24 p-2 border rounded-lg cursor-pointer transition-colors
                            ${isSelected ? 'bg-blue-100 dark:bg-blue-900 border-blue-300' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}
                            ${isCurrentDay ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-gray-200 dark:border-gray-700'}
                          `}
                          onClick={() => setSelectedDate(day)}
                        >
                          <div className={`text-sm font-medium mb-1 ${isCurrentDay ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                            {format(day, "d")}
                          </div>
                          <div className="space-y-1">
                            {dayAppointments.slice(0, 3).map((apt) => (
                              <div
                                key={apt.id}
                                className="text-xs p-1 rounded truncate cursor-pointer hover:opacity-80"
                                style={{
                                  backgroundColor: statusBgColors[apt.status as keyof typeof statusBgColors],
                                  color: statusColors[apt.status as keyof typeof statusColors]
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedAppointment(apt);
                                  setShowAppointmentDetails(true);
                                }}
                              >
                                {formatTime(apt.scheduledAt)} - {apt.patientName || `Patient ${apt.patientId}`}
                              </div>
                            ))}
                            {dayAppointments.length > 3 && (
                              <div className="text-xs text-gray-500 text-center">
                                +{dayAppointments.length - 3} more
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Selected Date Appointments */}
              {selectedDateAppointments.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Appointments for {format(selectedDate, "MMMM d, yyyy")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedDateAppointments.map((apt) => (
                        <div key={apt.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {formatTime(apt.scheduledAt)}
                              </div>
                              <Badge
                                style={{
                                  backgroundColor: statusBgColors[apt.status as keyof typeof statusBgColors],
                                  color: statusColors[apt.status as keyof typeof statusColors]
                                }}
                              >
                                {apt.status}
                              </Badge>
                              <Badge 
                                variant="outline"
                                style={{
                                  backgroundColor: typeBgColors[apt.type as keyof typeof typeBgColors],
                                  color: typeColors[apt.type as keyof typeof typeColors],
                                  borderColor: typeBgColors[apt.type as keyof typeof typeBgColors]
                                }}
                              >
                                {apt.type}
                              </Badge>
                            </div>
                            <div className="mt-1">
                              <div className="text-sm font-medium">{apt.title}</div>
                              <div className="text-xs text-gray-500">
                                Patient: {apt.patientName || `Patient ${apt.patientId}`} | Provider: {apt.providerName || `Provider ${apt.providerId}`}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {canViewAppointmentDetails() && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedAppointment(apt);
                                  setShowAppointmentDetails(true);
                                }}
                              >
                                View
                              </Button>
                            )}
                            {canEditAppointments() && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditAppointment(apt)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {canDeleteAppointments() && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteAppointment(apt.id, apt.title)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* Right Column - Quick Actions, AI Insights, and Subscription */}
        <div className="space-y-4 lg:row-span-2">
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
          <AiInsightsPanel />
          
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

        {/* Second Row - Recent Patients List (same width as appointments) */}
        <div className="lg:col-span-2">
          <Card className="h-full">
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

      {/* Appointment Details Dialog */}
      <Dialog open={showAppointmentDetails} onOpenChange={setShowAppointmentDetails}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Date & Time</Label>
                  <p className="text-sm">{format(new Date(selectedAppointment.scheduledAt), "MMMM d, yyyy 'at' h:mm a")}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Duration</Label>
                  <p className="text-sm">{selectedAppointment.duration || 30} minutes</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Patient</Label>
                  <p className="text-sm">{selectedAppointment.patientName || `Patient ${selectedAppointment.patientId}`}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Provider</Label>
                  <p className="text-sm">{selectedAppointment.providerName || `Provider ${selectedAppointment.providerId}`}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <Badge 
                    style={{
                      backgroundColor: statusBgColors[selectedAppointment.status as keyof typeof statusBgColors],
                      color: statusColors[selectedAppointment.status as keyof typeof statusColors]
                    }}
                  >
                    {selectedAppointment.status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Type</Label>
                  <Badge 
                    variant="outline"
                    style={{
                      backgroundColor: typeBgColors[selectedAppointment.type as keyof typeof typeBgColors],
                      color: typeColors[selectedAppointment.type as keyof typeof typeColors],
                      borderColor: typeBgColors[selectedAppointment.type as keyof typeof typeBgColors]
                    }}
                  >
                    {selectedAppointment.type}
                  </Badge>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Title</Label>
                <p className="text-sm mt-1">{selectedAppointment.title}</p>
              </div>
              
              {selectedAppointment.notes && (
                <div>
                  <Label className="text-sm font-medium">Notes</Label>
                  <p className="text-sm mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded">{selectedAppointment.notes}</p>
                </div>
              )}
              
              <div className="flex justify-between pt-4">
                <div className="flex gap-2">
                  {canEditAppointments() && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowAppointmentDetails(false);
                        handleEditAppointment(selectedAppointment);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  )}
                  {canDeleteAppointments() && (
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setShowAppointmentDetails(false);
                        handleDeleteAppointment(selectedAppointment.id, selectedAppointment.title);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  )}
                </div>
                <Button onClick={() => setShowAppointmentDetails(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Appointment Dialog */}
      <Dialog open={showEditAppointment} onOpenChange={setShowEditAppointment}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Appointment</DialogTitle>
          </DialogHeader>
          {editingAppointment && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-date">Date</Label>
                  <CalendarComponent
                    mode="single"
                    selected={editAppointmentDate}
                    onSelect={setEditAppointmentDate}
                    className="rounded-md border"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-time">Time Slot</Label>
                  <Select value={editSelectedTimeSlot} onValueChange={setEditSelectedTimeSlot}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select time slot" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((slot) => (
                        <SelectItem 
                          key={slot} 
                          value={slot}
                          disabled={!isTimeSlotAvailable(editAppointmentDate!, slot)}
                        >
                          {slot} {!isTimeSlotAvailable(editAppointmentDate!, slot) ? "(Unavailable)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-title">Title</Label>
                  <Input
                    id="edit-title"
                    defaultValue={editingAppointment.title}
                    onChange={(e) => {
                      setEditingAppointment({
                        ...editingAppointment,
                        title: e.target.value
                      });
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-duration">Duration (minutes)</Label>
                  <Input
                    id="edit-duration"
                    type="number"
                    defaultValue={editingAppointment.duration || 30}
                    onChange={(e) => {
                      setEditingAppointment({
                        ...editingAppointment,
                        duration: parseInt(e.target.value)
                      });
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-status">Status</Label>
                  <Select 
                    defaultValue={editingAppointment.status}
                    onValueChange={(value) => {
                      setEditingAppointment({
                        ...editingAppointment,
                        status: value
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="no_show">No Show</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-type">Type</Label>
                  <Select 
                    defaultValue={editingAppointment.type}
                    onValueChange={(value) => {
                      setEditingAppointment({
                        ...editingAppointment,
                        type: value
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="consultation">Consultation</SelectItem>
                      <SelectItem value="follow_up">Follow-up</SelectItem>
                      <SelectItem value="procedure">Procedure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea
                  id="edit-notes"
                  defaultValue={editingAppointment.notes || ""}
                  onChange={(e) => {
                    setEditingAppointment({
                      ...editingAppointment,
                      notes: e.target.value
                    });
                  }}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowEditAppointment(false);
                    setEditingAppointment(null);
                    setEditAppointmentDate(undefined);
                    setEditSelectedTimeSlot("");
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    if (!editAppointmentDate || !editSelectedTimeSlot) {
                      toast({
                        title: "Missing Information",
                        description: "Please select both date and time.",
                        variant: "destructive",
                      });
                      return;
                    }

                    // Convert time slot to 24-hour format
                    const [time, period] = editSelectedTimeSlot.split(' ');
                    const [hours, minutes] = time.split(':');
                    let hour24 = parseInt(hours);
                    
                    if (period === 'PM' && hour24 !== 12) {
                      hour24 += 12;
                    } else if (period === 'AM' && hour24 === 12) {
                      hour24 = 0;
                    }

                    const appointmentDateTime = new Date(editAppointmentDate);
                    appointmentDateTime.setHours(hour24, parseInt(minutes), 0, 0);

                    const updateData = {
                      title: editingAppointment.title,
                      scheduledAt: appointmentDateTime.toISOString(),
                      duration: editingAppointment.duration || 30,
                      status: editingAppointment.status,
                      type: editingAppointment.type,
                      notes: editingAppointment.notes || ""
                    };

                    editAppointmentMutation.mutate({ 
                      id: editingAppointment.id, 
                      data: updateData 
                    });
                  }}
                  disabled={editAppointmentMutation.isPending}
                >
                  {editAppointmentMutation.isPending ? "Updating..." : "Update Appointment"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Consultation Notes Dialog */}
      {showConsultationNotes && selectedAppointment && (
        <ConsultationNotes
          patientId={selectedAppointment.patientId}
          patientName={selectedAppointment.patientName}
          patientNumber={selectedAppointment.patientId?.toString()}
        />
      )}

      {/* Full Consultation Interface */}
      {showFullConsultation && selectedAppointment && (
        <FullConsultationWrapper
          patientId={selectedAppointment.patientId}
          show={showFullConsultation}
          onOpenChange={setShowFullConsultation}
        />
      )}
    </div>
  );
}