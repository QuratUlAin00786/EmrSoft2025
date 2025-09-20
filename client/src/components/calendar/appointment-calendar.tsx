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
import { Calendar, Clock, MapPin, User, Video, Stethoscope, FileText, Plus, Save, X, Mic, Square, Edit, Trash2 } from "lucide-react";
import anatomicalDiagramImage from "@assets/2_1754469563272.png";
import facialDiagramImage from "@assets/1_1754469776185.png";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Appointment } from "@/types";
import ConsultationNotes from "@/components/medical/consultation-notes";
import { FullConsultationInterface } from "@/components/consultation/full-consultation-interface";

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

  // Always render the consultation interface, even during loading
  // This ensures the dialog shows properly and doesn't appear empty to the user
  return (
    <FullConsultationInterface
      open={show}
      onOpenChange={onOpenChange}
      patient={patient || undefined}
    />
  );
}

export default function AppointmentCalendar() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [showAppointmentDetails, setShowAppointmentDetails] = useState(false);
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

  // State for ConsultationNotes modal
  const [showConsultationNotes, setShowConsultationNotes] = useState(false);
  // State for Full Consultation interface
  const [showFullConsultation, setShowFullConsultation] = useState(false);
  // State for edit appointment modal
  const [showEditAppointment, setShowEditAppointment] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<any>(null);

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
  const queryClient = useQueryClient();

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
    setShowEditAppointment(true);
  };

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
Date: ${new Date().toLocaleDateString()}
Muscle Group: ${selectedMuscleGroup.replace('_', ' ').toUpperCase()}
Analysis Type: ${selectedAnalysisType}
Treatment: ${selectedTreatment}

ASSESSMENT:
The ${selectedMuscleGroup.replace('_', ' ')} shows signs requiring ${selectedAnalysisType} intervention. 
Based on clinical examination, ${selectedTreatment} is recommended as the primary treatment approach.

TREATMENT PROTOCOL:
1. Initial Assessment: Complete facial muscle evaluation
2. Targeted Therapy: ${selectedTreatment} sessions focusing on ${selectedMuscleGroup.replace('_', ' ')}
3. Monitoring: Regular follow-up appointments to track progress
4. Home Care: Patient education on proper muscle care techniques

EXPECTED OUTCOMES:
- Improved muscle function and symmetry
- Reduced symptoms and discomfort
- Enhanced facial expression capabilities
- Long-term muscle health maintenance

FOLLOW-UP SCHEDULE:
- Week 2: Progress evaluation
- Month 1: Treatment effectiveness assessment
- Month 3: Long-term outcome review

Prepared by: Dr. ${getProviderName(selectedAppointment.providerId)}
Medical License: [License Number]
    `;

    setGeneratedTreatmentPlan(treatmentPlan);
    setIsGeneratingPlan(false);
    
    toast({
      title: "Treatment Plan Generated",
      description: "Comprehensive treatment plan has been created successfully.",
    });
  };

  // Save anatomical analysis
  const saveAnatomicalAnalysis = async () => {
    if (!generatedTreatmentPlan) {
      toast({
        title: "No Treatment Plan",
        description: "Please generate a treatment plan before saving.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingAnalysis(true);
    
    const analysisData = {
      patientId: selectedAppointment.patientId,
      appointmentId: selectedAppointment.id,
      muscleGroup: selectedMuscleGroup,
      analysisType: selectedAnalysisType,
      treatment: selectedTreatment,
      treatmentPlan: generatedTreatmentPlan,
      analysisDate: new Date().toISOString(),
      providerId: selectedAppointment.providerId
    };

    try {
      const response = await fetch('/api/anatomical-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'X-Tenant-Subdomain': 'cura'
        },
        credentials: 'include',
        body: JSON.stringify(analysisData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      setIsSavingAnalysis(false);
      setShowAnatomicalViewer(false);
      
      // Reset analysis state
      setSelectedMuscleGroup("");
      setSelectedAnalysisType("");
      setSelectedTreatment("");
      setGeneratedTreatmentPlan("");
      
      toast({
        title: "Analysis Saved",
        description: "Anatomical analysis has been saved to patient records.",
      });
    } catch (error) {
      setIsSavingAnalysis(false);
      toast({
        title: "Save Failed",
        description: "Failed to save anatomical analysis. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Voice transcription states
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscriptionSupported, setIsTranscriptionSupported] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [recognition, setRecognition] = useState<any>(null);

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
  const { data: appointmentsData, isLoading, refetch, error } = useQuery({
    queryKey: ["/api/appointments"],
    staleTime: 30000,
    refetchInterval: 60000,
    retry: 3,
    retryDelay: 1000,
    queryFn: async () => {
      console.log("[Calendar] Fetching appointments...");
      const response = await apiRequest('GET', '/api/appointments');
      const data = await response.json();
      console.log("[Calendar] Appointments data received:", data);
      return data;
    },
  });

  // Fetch users for patient and provider names
  const { data: usersData, isLoading: isUsersLoading } = useQuery({
    queryKey: ["/api/users"],
    staleTime: 60000,
    queryFn: async () => {
      console.log("[Calendar] Fetching users data...");
      const response = await apiRequest('GET', '/api/users');
      const data = await response.json();
      console.log("[Calendar] Users data received:", data);
      return data;
    },
  });

  // Fetch patients
  const { data: patientsData, isLoading: isPatientsLoading } = useQuery({
    queryKey: ["/api/patients"],
    staleTime: 60000,
    queryFn: async () => {
      console.log("[Calendar] Fetching patients data...");
      const response = await apiRequest('GET', '/api/patients');
      const data = await response.json();
      console.log("[Calendar] Patients data received:", data);
      return data;
    },
  });

  const isDataLoaded = !isUsersLoading && !isPatientsLoading;

  // Helper functions
  const getPatientName = (patientId: number) => {
    if (!patientsData || !Array.isArray(patientsData)) return `Patient ${patientId}`;
    const patient = patientsData.find((p: any) => p.id === patientId);
    return patient ? `${patient.firstName} ${patient.lastName}` : `Patient ${patientId}`;
  };

  const getProviderName = (providerId: number) => {
    if (!usersData || !Array.isArray(usersData)) return `Provider ${providerId}`;
    const provider = usersData.find((u: any) => u.id === providerId);
    console.log(`[Calendar] Looking up provider ${providerId}:`, provider);
    return provider ? `${provider.firstName || ''} ${provider.lastName || ''}`.trim() : `Provider ${providerId}`;
  };



  // Process and validate appointments - show appointments even if patient data is still loading  
  const appointments = (appointmentsData && Array.isArray(appointmentsData) ? appointmentsData.filter((apt: any) => {
    const isValid = apt && apt.id && apt.scheduledAt;
    if (!isValid) {
      console.warn('[Calendar] Invalid appointment filtered out:', apt);
    }
    return isValid;
  }) : [])
    .map((apt: any) => {
      try {
        // Always try to get actual names, fall back to IDs if data not available
        const patientName = getPatientName(apt.patientId);
        const providerName = getProviderName(apt.providerId);
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
  
  // Data processing complete
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter((apt: any) => {
      // Parse the date more reliably to avoid timezone issues
      const appointmentDate = new Date(apt.scheduledAt);
      const result = isSameDay(appointmentDate, date);
      return result;
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

  const formatTime = (timeString: string) => {
    try {
      // Remove 'Z' to treat as local time and avoid timezone conversion
      const cleanTimeString = timeString.replace('Z', '');
      const date = new Date(cleanTimeString);
      return format(date, "h:mm a");
    } catch (error) {
      return "Invalid time";
    }
  };

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
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
            <Button 
              onClick={() => setShowNewAppointmentModal(true)}
              className="flex items-center gap-2"
              data-testid="button-new-appointment"
            >
              <Plus className="h-3 w-3" />
              New Appointment
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-7 gap-4 mb-4">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="text-center font-semibold text-gray-600 dark:text-gray-300 py-2">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day) => {
              const dayAppointments = getAppointmentsForDate(day);
              const isSelected = isSameDay(day, selectedDate);
              const isCurrentDay = isToday(day);
              
              return (
                <div
                  key={day.toString()}
                  className={`
                    h-[50px] p-1 border rounded cursor-pointer transition-colors flex flex-col
                    ${isSelected 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400' 
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}
                    ${isCurrentDay ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-600' : ''}
                  `}
                  onClick={() => setSelectedDate(day)}
                >
                  <div className={`text-sm font-medium ${isCurrentDay ? 'text-yellow-800 dark:text-yellow-200' : 'text-gray-900 dark:text-gray-100'}`}>
                    {format(day, "d")}
                  </div>
                  <div className="flex flex-wrap gap-0.5 mt-0.5 flex-1">
                    {dayAppointments.slice(0, 3).map((appointment: any) => (
                      <div
                        key={appointment.id}
                        className="w-3 h-3 rounded-full cursor-pointer border border-white shadow-sm"
                        style={{
                          backgroundColor: statusBgColors[appointment.status as keyof typeof statusBgColors] || statusBgColors.scheduled
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAppointment(appointment);
                          setShowAppointmentDetails(true);
                        }}
                        title={`${formatTime(appointment.scheduledAt)} - ${appointment.patientName}`}
                      />
                    ))}
                    {dayAppointments.length > 3 && (
                      <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                        +{dayAppointments.length - 3}
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-blue-800">
            <Calendar className="h-5 w-5 mr-2" />
            Appointments for {format(selectedDate, "EEEE, MMMM d, yyyy")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedDateAppointments.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">No appointments scheduled for this date.</p>
          ) : (
            <div className="space-y-3">
              {selectedDateAppointments.map((appointment: any) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between p-4 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <div 
                    className="flex items-center space-x-4 flex-1 cursor-pointer"
                    onClick={() => {
                      setSelectedAppointment(appointment);
                      setShowAppointmentDetails(true);
                    }}
                  >
                    <div className="flex flex-col">
                      <Badge
                        style={{
                          backgroundColor: statusBgColors[appointment.status as keyof typeof statusBgColors] || statusBgColors.scheduled,
                          color: statusColors[appointment.status as keyof typeof statusColors] || statusColors.scheduled
                        }}
                      >
                        {appointment.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{formatTime(appointment.scheduledAt)}</span>
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-300">{getPatientName(appointment.patientId)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-right mr-4">
                      <div className="font-medium">{appointment.title}</div>
                      <div className="text-sm text-gray-500">Dr. {appointment.providerName}</div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditAppointment(appointment);
                        }}
                        className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                        data-testid={`edit-appointment-${appointment.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAppointment(appointment.id, appointment.title);
                        }}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
                        data-testid={`delete-appointment-${appointment.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
          {selectedAppointment && (
            <div>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-blue-800">
                  Appointment Details
                </DialogTitle>
                <DialogDescription>
                  {format(new Date(selectedAppointment.scheduledAt), "EEEE, MMMM d, yyyy 'at' h:mm a")}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 mt-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Patient</Label>
                    <p className="text-lg">{getPatientName(selectedAppointment.patientId)}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Provider</Label>
                    <p className="text-lg">Dr. {selectedAppointment.providerName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Type</Label>
                    <Badge
                      style={{
                        backgroundColor: typeBgColors[selectedAppointment.type as keyof typeof typeBgColors] || typeBgColors.consultation,
                        color: typeColors[selectedAppointment.type as keyof typeof typeColors] || typeColors.consultation
                      }}
                    >
                      {selectedAppointment.type.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Status</Label>
                    <Badge
                      style={{
                        backgroundColor: statusBgColors[selectedAppointment.status as keyof typeof statusBgColors] || statusBgColors.scheduled,
                        color: statusColors[selectedAppointment.status as keyof typeof statusColors] || statusColors.scheduled
                      }}
                    >
                      {selectedAppointment.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-600">Description</Label>
                  <p className="mt-1">{selectedAppointment.description}</p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span>{selectedAppointment.location}</span>
                  {selectedAppointment.isVirtual && (
                    <Badge variant="outline" className="ml-2">
                      <Video className="h-3 w-3 mr-1" />
                      Virtual
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex justify-between mt-6">
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowFullConsultation(true);
                    }}
                    className="flex items-center space-x-2 bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100"
                  >
                    <Stethoscope className="h-4 w-4" />
                    <span>Add Medical Record</span>
                  </Button>
                </div>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    try {
                      await apiRequest("DELETE", `/api/appointments/${selectedAppointment.id}`);
                      setShowAppointmentDetails(false);
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
                
                {/* Interactive muscle points overlaid on image */}
                {Object.entries(muscleCoordinates).map(([muscle, coords]) => (
                  <div
                    key={muscle}
                    className={`absolute w-4 h-4 rounded-full cursor-pointer transition-all duration-200 border-2 ${
                      selectedMuscleGroup === muscle 
                        ? 'bg-red-500 border-red-600 scale-150 shadow-lg' 
                        : 'bg-blue-500 border-blue-600 hover:bg-blue-400 hover:scale-125'
                    }`}
                    style={{
                      left: `${coords.x}px`,
                      top: `${coords.y}px`,
                      transform: 'translate(-50%, -50%)',
                      zIndex: 10
                    }}
                    onClick={() => setSelectedMuscleGroup(muscle)}
                    title={muscle.replace('_', ' ').toUpperCase()}
                  />
                ))}
              </div>
            </div>

            {/* Image Toggle Controls */}
            <div className="flex justify-center space-x-4">
              <Button
                variant={currentImageIndex === 0 ? "default" : "outline"}
                onClick={() => setCurrentImageIndex(0)}
                className="flex items-center space-x-2"
              >
                <span>🔬</span>
                <span>Detailed Anatomy</span>
              </Button>
              <Button
                variant={currentImageIndex === 1 ? "default" : "outline"}
                onClick={() => setCurrentImageIndex(1)}
                className="flex items-center space-x-2"
              >
                <span>📊</span>
                <span>Reference Diagram</span>
              </Button>
            </div>

            {/* Analysis Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-blue-50 p-6 rounded-lg border border-blue-200">
              <div className="space-y-2">
                <Label className="text-blue-800 font-semibold">Selected Muscle Group</Label>
                <div className="p-3 bg-white rounded border border-blue-300">
                  {selectedMuscleGroup ? (
                    <span className="text-blue-700 font-medium">
                      {selectedMuscleGroup.replace('_', ' ').toUpperCase()}
                    </span>
                  ) : (
                    <span className="text-gray-500">Click on a muscle point above</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-blue-800 font-semibold">Analysis Type</Label>
                <Select value={selectedAnalysisType} onValueChange={setSelectedAnalysisType}>
                  <SelectTrigger className="border-blue-300">
                    <SelectValue placeholder="Select analysis type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="strength_assessment">Strength Assessment</SelectItem>
                    <SelectItem value="mobility_evaluation">Mobility Evaluation</SelectItem>
                    <SelectItem value="symmetry_analysis">Symmetry Analysis</SelectItem>
                    <SelectItem value="function_testing">Function Testing</SelectItem>
                    <SelectItem value="nerve_conduction">Nerve Conduction</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-blue-800 font-semibold">Treatment</Label>
                <Select value={selectedTreatment} onValueChange={setSelectedTreatment}>
                  <SelectTrigger className="border-blue-300">
                    <SelectValue placeholder="Select treatment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="physical_therapy">Physical Therapy</SelectItem>
                    <SelectItem value="botox_injection">Botox Injection</SelectItem>
                    <SelectItem value="muscle_stimulation">Electrical Muscle Stimulation</SelectItem>
                    <SelectItem value="massage_therapy">Massage Therapy</SelectItem>
                    <SelectItem value="surgical_intervention">Surgical Intervention</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Treatment Plan Generation */}
            <div className="space-y-4">
              <div className="flex justify-center">
                <Button
                  onClick={generateTreatmentPlan}
                  disabled={isGeneratingPlan || !selectedMuscleGroup || !selectedAnalysisType || !selectedTreatment}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-3"
                >
                  {isGeneratingPlan ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Generating Plan...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Generate Treatment Plan
                    </>
                  )}
                </Button>
              </div>

              {generatedTreatmentPlan && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-blue-800">Generated Treatment Plan</h3>
                    <Button
                      onClick={saveAnatomicalAnalysis}
                      disabled={isSavingAnalysis}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isSavingAnalysis ? (
                        <>
                          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Analysis
                        </>
                      )}
                    </Button>
                  </div>
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded border">
                    {generatedTreatmentPlan}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>


      {/* ConsultationNotes Modal */}
      {showConsultationNotes && selectedAppointment && (
        <Dialog open={showConsultationNotes} onOpenChange={setShowConsultationNotes}>
          <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
            <ConsultationNotes
              patientId={selectedAppointment.patientId}
              patientName={selectedAppointment.patientName}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Full Consultation Interface Modal */}
      {showFullConsultation && selectedAppointment && (
        <FullConsultationWrapper
          patientId={selectedAppointment.patientId}
          show={showFullConsultation}
          onOpenChange={setShowFullConsultation}
        />
      )}

      {/* Edit Appointment Dialog */}
      <Dialog open={showEditAppointment} onOpenChange={setShowEditAppointment}>
        <DialogContent className="max-w-2xl">
          {editingAppointment && (
            <div>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-blue-800">
                  Edit Appointment
                </DialogTitle>
                <DialogDescription>
                  Update appointment details for {getPatientName(editingAppointment.patientId)}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 mt-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Title</Label>
                    <Input 
                      defaultValue={editingAppointment.title}
                      onChange={(e) => {
                        setEditingAppointment({ ...editingAppointment, title: e.target.value });
                      }}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Type</Label>
                    <Select 
                      defaultValue={editingAppointment.type}
                      onValueChange={(value) => {
                        setEditingAppointment({ ...editingAppointment, type: value });
                      }}
                    >
                      <SelectTrigger className="mt-1">
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Date</Label>
                    <Input 
                      type="date"
                      defaultValue={format(new Date(editingAppointment.scheduledAt), 'yyyy-MM-dd')}
                      onChange={(e) => {
                        const currentTime = format(new Date(editingAppointment.scheduledAt), 'HH:mm');
                        const newDateTime = new Date(`${e.target.value}T${currentTime}:00`);
                        setEditingAppointment({ ...editingAppointment, scheduledAt: newDateTime.toISOString() });
                      }}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Time</Label>
                    <Input 
                      type="time"
                      defaultValue={format(new Date(editingAppointment.scheduledAt), 'HH:mm')}
                      onChange={(e) => {
                        const currentDate = format(new Date(editingAppointment.scheduledAt), 'yyyy-MM-dd');
                        const newDateTime = new Date(`${currentDate}T${e.target.value}:00`);
                        setEditingAppointment({ ...editingAppointment, scheduledAt: newDateTime.toISOString() });
                      }}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-600">Status</Label>
                  <Select 
                    defaultValue={editingAppointment.status}
                    onValueChange={(value) => {
                      setEditingAppointment({ ...editingAppointment, status: value });
                    }}
                  >
                    <SelectTrigger className="mt-1">
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
                  <Label className="text-sm font-medium text-gray-600">Description</Label>
                  <Textarea 
                    defaultValue={editingAppointment.description || ''}
                    onChange={(e) => {
                      setEditingAppointment({ ...editingAppointment, description: e.target.value });
                    }}
                    className="mt-1"
                    rows={3}
                    placeholder="Add appointment notes or description..."
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowEditAppointment(false);
                      setEditingAppointment(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      editAppointmentMutation.mutate({
                        id: editingAppointment.id,
                        data: {
                          title: editingAppointment.title,
                          type: editingAppointment.type,
                          status: editingAppointment.status,
                          scheduledAt: editingAppointment.scheduledAt,
                          description: editingAppointment.description,
                        }
                      });
                    }}
                    disabled={editAppointmentMutation.isPending}
                  >
                    {editAppointmentMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}