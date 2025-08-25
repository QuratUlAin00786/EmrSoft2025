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
import { Calendar, Clock, MapPin, User, Video, Stethoscope, FileText, Plus, Save, X, Mic, Square } from "lucide-react";
import anatomicalDiagramImage from "@assets/2_1754469563272.png";
import facialDiagramImage from "@assets/1_1754469776185.png";
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
import ConsultationNotes from "@/components/medical/consultation-notes";

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
  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const [dialogStable, setDialogStable] = useState(true);
  const [activeTab, setActiveTab] = useState("basic");
  
  // Anatomical Analysis State
  const [showAnatomicalViewer, setShowAnatomicalViewer] = useState(false);
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>("");
  const [selectedAnalysisType, setSelectedAnalysisType] = useState<string>("");
  const [selectedTreatment, setSelectedTreatment] = useState<string>("");
  const [generatedTreatmentPlan, setGeneratedTreatmentPlan] = useState<string>("");
  const [isGeneratingPlan, setIsGeneratingPlan] = useState<boolean>(false);
  const [isSavingAnalysis, setIsSavingAnalysis] = useState<boolean>(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

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
  const { toast } = useToast();

  // Generate comprehensive treatment plan
  const generateTreatmentPlan = async () => {
    if (!selectedMuscleGroup || !selectedAnalysisType || !selectedTreatment) {
      toast({
        title: "Missing Information",
        description: "Please select muscle group, analysis type, and treatment before generating plan.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingPlan(true);
    
    const treatmentPlan = `
COMPREHENSIVE FACIAL MUSCLE TREATMENT PLAN

Patient: ${getPatientName(selectedAppointment.patientId)}
Date: ${format(new Date(), 'MMMM dd, yyyy')}

TARGET ANALYSIS:
• Muscle Group: ${selectedMuscleGroup.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
• Analysis Type: ${selectedAnalysisType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
• Primary Treatment: ${selectedTreatment.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}

TREATMENT PROTOCOL:
1. Initial Assessment & Baseline Documentation
2. Pre-treatment Preparation & Patient Consultation
3. ${selectedTreatment.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Implementation
4. Post-treatment Monitoring & Assessment
5. Follow-up Care & Progress Evaluation

EXPECTED OUTCOMES:
• Improved muscle function and symmetry
• Reduced symptoms and enhanced patient comfort
• Optimized aesthetic and functional results
• Long-term maintenance planning

NEXT STEPS:
• Schedule follow-up appointment in 1-2 weeks
• Monitor patient response and adjust treatment as needed
• Document progress with photographic evidence
• Review treatment effectiveness and make modifications if required

Generated on: ${format(new Date(), 'PPpp')}
`;

    setGeneratedTreatmentPlan(treatmentPlan);
    setIsGeneratingPlan(false);
    
    toast({
      title: "Treatment Plan Generated",
      description: "Comprehensive treatment plan has been created successfully.",
    });
  };

  // Save anatomical analysis as medical record
  const saveAnalysis = async () => {
    if (!selectedMuscleGroup || !selectedAnalysisType) {
      toast({
        title: "Missing Information",
        description: "Please select at least muscle group and analysis type before saving.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedAppointment?.patientId) {
      toast({
        title: "Error",
        description: "No patient selected for this analysis.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingAnalysis(true);
    
    try {
      const analysisData = {
        type: "consultation",
        title: `Anatomical Analysis - ${selectedMuscleGroup.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
        notes: `FACIAL MUSCLE ANALYSIS REPORT

Patient: ${getPatientName(selectedAppointment.patientId)}
Date: ${format(new Date(), 'MMMM dd, yyyy')}

ANALYSIS DETAILS:
• Target Muscle Group: ${selectedMuscleGroup.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
• Analysis Type: ${selectedAnalysisType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
${selectedTreatment ? `• Primary Treatment: ${selectedTreatment.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}` : ''}

CLINICAL OBSERVATIONS:
- Comprehensive anatomical assessment completed
- Interactive muscle group identification performed
- Professional analysis methodology applied

${generatedTreatmentPlan ? `\nTREATMENT PLAN:\n${generatedTreatmentPlan}` : ''}

Analysis completed on: ${format(new Date(), 'PPpp')}`,
        diagnosis: `Anatomical analysis of ${selectedMuscleGroup.replace(/_/g, ' ')} - ${selectedAnalysisType.replace(/_/g, ' ')}`,
        treatment: selectedTreatment ? selectedTreatment.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : undefined
      };

      const response = await apiRequest("POST", `/api/patients/${selectedAppointment.patientId}/records`, analysisData);
      
      toast({
        title: "Analysis Saved",
        description: "Anatomical analysis has been saved to medical records successfully.",
      });

      // Reset the form
      setSelectedMuscleGroup("");
      setSelectedAnalysisType("");
      setSelectedTreatment("");
      setGeneratedTreatmentPlan("");
      setShowAnatomicalViewer(false);
      
    } catch (error) {
      console.error('Error saving analysis:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save anatomical analysis. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingAnalysis(false);
    }
  };

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
                <div className="w-full mt-4">
                  <ConsultationNotes 
                    patientId={selectedAppointment.patientId}
                    patientName={isDataLoaded ? ((selectedAppointment as any)?.patientName || getPatientName(selectedAppointment?.patientId)) : `Patient ${selectedAppointment?.patientId}`}
                    patientNumber={`Patient ${selectedAppointment?.patientId}`}
                  />
                </div>
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
              <TabsList className="grid w-full grid-cols-4 mb-6">
                <TabsTrigger value="basic" className="bg-blue-100 dark:bg-blue-900/30 font-semibold data-[state=active]:bg-blue-100 data-[state=active]:dark:bg-blue-900/50">Basic Info ⭐</TabsTrigger>
                <TabsTrigger value="clinical">Clinical Notes</TabsTrigger>
                <TabsTrigger value="medications">Medications</TabsTrigger>
                <TabsTrigger value="followup">Follow-up</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-6 p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="type">Record Type</Label>
                    <Select
                      value={form.watch("type")}
                      onValueChange={(value) => form.setValue("type", value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
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
                      placeholder="e.g., Annual Checkup, Blood Work Results"
                    />
                    {form.formState.errors.title && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.title.message}
                      </p>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="clinical" className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-700 mb-4">
                  <Label htmlFor="examination" className="text-blue-800 dark:text-blue-200 font-semibold">Examination</Label>
                  <Select
                    onValueChange={(value) => {
                      if (value === "anatomical") {
                        setShowAnatomicalViewer(true);
                      }
                    }}
                  >
                    <SelectTrigger className="mt-2 border-blue-300 dark:border-blue-600">
                      <SelectValue placeholder="Select examination type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General Examination</SelectItem>
                      <SelectItem value="cardiovascular">Cardiovascular</SelectItem>
                      <SelectItem value="respiratory">Respiratory</SelectItem>
                      <SelectItem value="neurological">Neurological</SelectItem>
                      <SelectItem value="anatomical">🔬 Anatomical (View Muscles)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="notes">Clinical Notes</Label>
                    <div className="flex items-center space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex items-center space-x-1"
                        disabled
                        title="Speech recognition not available in this context"
                      >
                        <Mic className="h-3 w-3" />
                        <span>Transcribe Audio</span>
                      </Button>
                      <span className="text-xs text-gray-500">
                        (Audio transcription not available)
                      </span>
                    </div>
                  </div>
                  <Textarea
                    {...form.register("notes")}
                    placeholder="Detailed consultation notes, observations, and findings..."
                    className="min-h-32 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                  />
                  {form.formState.errors.notes && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.notes.message}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="diagnosis">Diagnosis</Label>
                    <Textarea
                      {...form.register("diagnosis")}
                      placeholder="Primary and secondary diagnoses with ICD codes..."
                      className="min-h-24 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                    />
                  </div>
                  <div>
                    <Label htmlFor="treatment">Treatment Plan</Label>
                    <Textarea
                      {...form.register("treatment")}
                      placeholder="Treatment recommendations and care plan..."
                      className="min-h-24 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="medications" className="space-y-4">
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-4">Prescribed Medications</h4>
                  <div className="space-y-4">
                    {(form.watch("medications") || []).map((_, index) => (
                      <div key={index} className="grid grid-cols-4 gap-3 p-3 border rounded">
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

      {/* Professional Anatomical Analysis Dialog */}
      <Dialog open={showAnatomicalViewer} onOpenChange={setShowAnatomicalViewer}>
        <DialogContent className="max-w-6xl h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl font-bold text-blue-800 mb-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">🔬</span>
              </div>
              Professional Anatomical Analysis
            </DialogTitle>
            <p className="text-gray-600 text-sm">Advanced facial muscle analysis with optimized container spacing</p>
          </DialogHeader>

          <div className="space-y-6">
            {/* Optimized Image Container - Fits Snugly Around Content */}
            <div className="bg-white border-2 border-gray-300 rounded-lg shadow-lg" style={{ width: 'fit-content', margin: '0 auto' }}>
              <div className="relative" style={{ width: '700px', height: '800px' }}>
                <img 
                  key={currentImageIndex}
                  src={currentImageIndex === 0 ? anatomicalDiagramImage : facialDiagramImage}
                  alt={currentImageIndex === 0 ? "Facial muscle anatomy diagram with detailed muscle labels" : "Facial Anatomy Reference Diagram"}
                  className="rounded-lg transition-opacity duration-300"
                  style={{
                    height: '800px',
                    width: '700px',
                    objectFit: 'contain',
                    objectPosition: 'center',
                    backgroundColor: 'white',
                    display: 'block'
                  }}
                />
                
                {/* Interactive Yellow Circle Highlights */}
                {selectedMuscleGroup && muscleCoordinates[selectedMuscleGroup as keyof typeof muscleCoordinates] && (
                  <div
                    className="absolute rounded-full border-4 border-yellow-400 bg-yellow-300 bg-opacity-50 animate-pulse"
                    style={{
                      width: '40px',
                      height: '40px',
                      left: `${muscleCoordinates[selectedMuscleGroup as keyof typeof muscleCoordinates].x - 20}px`,
                      top: `${muscleCoordinates[selectedMuscleGroup as keyof typeof muscleCoordinates].y - 20}px`,
                      zIndex: 10,
                      boxShadow: '0 0 20px rgba(255, 235, 59, 0.8)'
                    }}
                  >
                    <div className="absolute inset-0 rounded-full border-2 border-yellow-500 animate-ping"></div>
                  </div>
                )}
                
                {/* Analysis Type Highlight (different color) */}
                {selectedAnalysisType && selectedMuscleGroup && muscleCoordinates[selectedMuscleGroup as keyof typeof muscleCoordinates] && (
                  <div
                    className="absolute rounded-full border-3 border-blue-400 bg-blue-300 bg-opacity-40"
                    style={{
                      width: '60px',
                      height: '60px',
                      left: `${muscleCoordinates[selectedMuscleGroup as keyof typeof muscleCoordinates].x - 30}px`,
                      top: `${muscleCoordinates[selectedMuscleGroup as keyof typeof muscleCoordinates].y - 30}px`,
                      zIndex: 5
                    }}
                  />
                )}
                
                {/* Treatment Highlight (green overlay) */}
                {selectedTreatment && selectedMuscleGroup && muscleCoordinates[selectedMuscleGroup as keyof typeof muscleCoordinates] && (
                  <div
                    className="absolute rounded-full border-2 border-green-400 bg-green-300 bg-opacity-30"
                    style={{
                      width: '80px',
                      height: '80px',
                      left: `${muscleCoordinates[selectedMuscleGroup as keyof typeof muscleCoordinates].x - 40}px`,
                      top: `${muscleCoordinates[selectedMuscleGroup as keyof typeof muscleCoordinates].y - 40}px`,
                      zIndex: 3
                    }}
                  />
                )}
                
                {/* Navigation Controls */}
                <button
                  onClick={() => setCurrentImageIndex(currentImageIndex === 0 ? 1 : 0)}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full transition-all duration-200 shadow-lg"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>

                <button
                  onClick={() => setCurrentImageIndex(currentImageIndex === 0 ? 1 : 0)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full transition-all duration-200 shadow-lg"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>

                {/* Image Indicators */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                  <div className={`w-3 h-3 rounded-full transition-all duration-200 ${currentImageIndex === 0 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                  <div className={`w-3 h-3 rounded-full transition-all duration-200 ${currentImageIndex === 1 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                </div>
              </div>
              
              {/* Image Label */}
              <div className="mt-4 text-center">
                <div className={`inline-flex items-center px-4 py-2 rounded-full text-white text-sm font-semibold shadow-lg ${
                  currentImageIndex === 0 ? 'bg-blue-600' : 'bg-green-600'
                }`}>
                  <div className="w-3 h-3 bg-white rounded-full mr-2 animate-pulse"></div>
                  {currentImageIndex === 0 ? 'Professional Medical Anatomical Diagram' : 'Anatomical Reference View'}
                </div>
              </div>
            </div>

            {/* Comprehensive Treatment Analysis Controls */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              {/* Muscle Analysis Section */}
              <Card className="border-2 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-blue-800">Facial Muscle Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">Target Muscle Group</Label>
                    <Select value={selectedMuscleGroup} onValueChange={setSelectedMuscleGroup}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select muscle group" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="frontalis">Frontalis (Forehead)</SelectItem>
                        <SelectItem value="temporalis">Temporalis</SelectItem>
                        <SelectItem value="corrugator">Corrugator Supercilii</SelectItem>
                        <SelectItem value="procerus">Procerus</SelectItem>
                        <SelectItem value="orbicularis_oculi">Orbicularis Oculi</SelectItem>
                        <SelectItem value="levator_labii">Levator Labii Superioris</SelectItem>
                        <SelectItem value="zygomaticus_major">Zygomaticus Major</SelectItem>
                        <SelectItem value="zygomaticus_minor">Zygomaticus Minor</SelectItem>
                        <SelectItem value="masseter">Masseter</SelectItem>
                        <SelectItem value="buccinator">Buccinator</SelectItem>
                        <SelectItem value="orbicularis_oris">Orbicularis Oris</SelectItem>
                        <SelectItem value="mentalis">Mentalis</SelectItem>
                        <SelectItem value="depressor_anguli">Depressor Anguli Oris</SelectItem>
                        <SelectItem value="platysma">Platysma</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">Analysis Type</Label>
                    <Select value={selectedAnalysisType} onValueChange={setSelectedAnalysisType}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select analysis type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="muscle_tone">Muscle Tone Assessment</SelectItem>
                        <SelectItem value="asymmetry">Asymmetry Analysis</SelectItem>
                        <SelectItem value="movement_range">Range of Movement</SelectItem>
                        <SelectItem value="tension_points">Tension Point Mapping</SelectItem>
                        <SelectItem value="nerve_function">Nerve Function Test</SelectItem>
                        <SelectItem value="weakness_assessment">Weakness Assessment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Treatment Options Section */}
              <Card className="border-2 border-green-200">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-green-800">Treatment Options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">Primary Treatment</Label>
                    <Select value={selectedTreatment} onValueChange={setSelectedTreatment}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select primary treatment" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="botox_injection">Botox Injection Therapy</SelectItem>
                        <SelectItem value="dermal_fillers">Dermal Filler Treatment</SelectItem>
                        <SelectItem value="muscle_relaxants">Muscle Relaxant Medication</SelectItem>
                        <SelectItem value="physical_therapy">Physical Therapy</SelectItem>
                        <SelectItem value="facial_massage">Therapeutic Facial Massage</SelectItem>
                        <SelectItem value="nerve_blocks">Nerve Block Procedures</SelectItem>
                        <SelectItem value="laser_therapy">Laser Therapy</SelectItem>
                        <SelectItem value="microcurrent">Microcurrent Therapy</SelectItem>
                        <SelectItem value="ultrasound">Ultrasound Treatment</SelectItem>
                        <SelectItem value="surgical_intervention">Surgical Intervention</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">Treatment Intensity</Label>
                    <Select>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select intensity level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minimal">Minimal (Conservative approach)</SelectItem>
                        <SelectItem value="moderate">Moderate (Standard treatment)</SelectItem>
                        <SelectItem value="intensive">Intensive (Aggressive treatment)</SelectItem>
                        <SelectItem value="maintenance">Maintenance (Follow-up care)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">Session Frequency</Label>
                    <Select>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly Sessions</SelectItem>
                        <SelectItem value="biweekly">Bi-weekly Sessions</SelectItem>
                        <SelectItem value="monthly">Monthly Sessions</SelectItem>
                        <SelectItem value="quarterly">Quarterly Sessions</SelectItem>
                        <SelectItem value="single">Single Session</SelectItem>
                        <SelectItem value="emergency">Emergency/As Needed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Additional Analysis Tools */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
              <Card className="border border-purple-200">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-purple-800 mb-2">Symptom Assessment</h4>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Primary symptoms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="facial_pain">Facial Pain</SelectItem>
                      <SelectItem value="muscle_spasms">Muscle Spasms</SelectItem>
                      <SelectItem value="asymmetry">Facial Asymmetry</SelectItem>
                      <SelectItem value="weakness">Muscle Weakness</SelectItem>
                      <SelectItem value="tension">Chronic Tension</SelectItem>
                      <SelectItem value="twitching">Muscle Twitching</SelectItem>
                      <SelectItem value="stiffness">Joint Stiffness</SelectItem>
                      <SelectItem value="numbness">Numbness/Tingling</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              <Card className="border border-orange-200">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-orange-800 mb-2">Severity Scale</h4>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Rate severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Minimal (Barely noticeable)</SelectItem>
                      <SelectItem value="2">2 - Mild (Minor discomfort)</SelectItem>
                      <SelectItem value="3">3 - Moderate (Noticeable symptoms)</SelectItem>
                      <SelectItem value="4">4 - Severe (Significant impact)</SelectItem>
                      <SelectItem value="5">5 - Critical (Immediate attention)</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              <Card className="border border-teal-200">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-teal-800 mb-2">Follow-up Plan</h4>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Follow-up timeline" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1_week">1 Week Follow-up</SelectItem>
                      <SelectItem value="2_weeks">2 Weeks Follow-up</SelectItem>
                      <SelectItem value="1_month">1 Month Follow-up</SelectItem>
                      <SelectItem value="3_months">3 Months Follow-up</SelectItem>
                      <SelectItem value="6_months">6 Months Follow-up</SelectItem>
                      <SelectItem value="annual">Annual Review</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            </div>

            {/* Generated Treatment Plan Display */}
            {generatedTreatmentPlan && (
              <Card className="mt-6 border-2 border-green-500 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-green-800 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Generated Treatment Plan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono bg-white p-4 rounded border">
                    {generatedTreatmentPlan}
                  </pre>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex justify-center space-x-4 mt-6">
              <Button 
                onClick={generateTreatmentPlan}
                disabled={isGeneratingPlan}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 font-semibold shadow-lg disabled:opacity-50"
              >
                {isGeneratingPlan ? "Generating..." : "Generate Treatment Plan"}
              </Button>
              <Button 
                onClick={saveAnalysis}
                disabled={isSavingAnalysis}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 font-semibold shadow-lg disabled:opacity-50"
              >
                {isSavingAnalysis ? "Saving..." : "Save Analysis"}
              </Button>
              <Button 
                onClick={() => setShowAnatomicalViewer(false)}
                variant="outline"
                className="px-6 py-3 font-semibold shadow-lg"
              >
                Close Analysis
              </Button>
            </div>
          </div>
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