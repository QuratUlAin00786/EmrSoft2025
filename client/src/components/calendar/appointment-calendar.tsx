import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Calendar, Clock, MapPin, User, Users, Video, Stethoscope, FileText, Plus, Save, X, Mic, Square, Edit, Trash2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from "date-fns";

const anatomicalDiagramImage = "/anatomical-diagram-clean.svg";
const facialDiagramImage = "/clean-facial-diagram.png";
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
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/hooks/use-tenant";
import { cn } from "@/lib/utils";

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

export default function AppointmentCalendar({ onNewAppointment }: { onNewAppointment?: () => void }) {
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

  // Real-time appointment updates via Server-Sent Events
  useEffect(() => {
    if (!user || !tenant) return;

    console.log("[Calendar SSE] Setting up real-time connection...");
    const eventSource = new EventSource(`/api/appointments/stream`, {});

    eventSource.onopen = () => {
      console.log("[Calendar SSE] Connected to appointment stream");
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("[Calendar SSE] Received appointment event:", data);

        // Handle different appointment events
        if (data.type === 'appointment.created' || data.type === 'appointment.updated' || data.type === 'appointment.deleted') {
          // Invalidate appointments query to trigger refetch
          queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
          
          // Show notification
          const eventAction = data.type.split('.')[1];
          toast({
            title: "Appointment Updated",
            description: `An appointment has been ${eventAction} in real-time.`,
          });
        }
      } catch (error) {
        console.error("[Calendar SSE] Error parsing event data:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("[Calendar SSE] Connection error:", error);
    };

    return () => {
      console.log("[Calendar SSE] Closing connection");
      eventSource.close();
    };
  }, [user, tenant, queryClient, toast]);
  
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
  // State for new appointment modal
  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showEditSuccessModal, setShowEditSuccessModal] = useState(false);
  const [validationErrorMessage, setValidationErrorMessage] = useState<string>("");
  const [showValidationError, setShowValidationError] = useState(false);
  const [newAppointmentDate, setNewAppointmentDate] = useState<Date | undefined>(undefined);
  const [newSelectedTimeSlot, setNewSelectedTimeSlot] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedProviderId, setSelectedProviderId] = useState<string>("");
  const [selectedDuration, setSelectedDuration] = useState<number>(30);
  const [patientError, setPatientError] = useState<string>("");
  const [providerError, setProviderError] = useState<string>("");
  const [openRoleCombo, setOpenRoleCombo] = useState(false);
  const [openProviderCombo, setOpenProviderCombo] = useState(false);
  const [openPatientCombo, setOpenPatientCombo] = useState(false);
  const [newAppointmentData, setNewAppointmentData] = useState<any>({
    title: "",
    type: "consultation",
    patientId: "",
    description: "",
  });
  // State for edit appointment modal
  const [showEditAppointment, setShowEditAppointment] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<any>(null);
  const [editAppointmentDate, setEditAppointmentDate] = useState<Date | undefined>(undefined);
  const [editSelectedTimeSlot, setEditSelectedTimeSlot] = useState<string>("");
  const [showInsufficientTimeWarning, setShowInsufficientTimeWarning] = useState(false);
  const [insufficientTimeMessage, setInsufficientTimeMessage] = useState<string>("");
  
  // State for invoice creation workflow
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [showInvoiceSummaryDialog, setShowInvoiceSummaryDialog] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>({
    serviceDate: "",
    doctor: "",
    invoiceDate: "",
    dueDate: "",
    services: [],
    insuranceProvider: "",
    totalAmount: "0.00",
    notes: "",
    paymentMethod: ""
  });
  const [doctorFee, setDoctorFee] = useState<any>(null);


  // Convert time slot string to 24-hour format
  const timeSlotTo24Hour = (timeSlot: string): string => {
    const [time, period] = timeSlot.split(' ');
    const [hours, minutes] = time.split(':');
    let hour24 = parseInt(hours);
    
    if (period === 'PM' && hour24 !== 12) {
      hour24 += 12;
    } else if (period === 'AM' && hour24 === 12) {
      hour24 = 0;
    }
    
    return `${hour24.toString().padStart(2, '0')}:${minutes}`;
  };

  // Check if time slot is within staff's working hours/shift
  const isTimeSlotInShift = (timeSlot: string, date: Date): boolean => {
    if (!selectedProviderId || !usersData) return true;
    
    const provider = usersData.find((user: any) => user.id.toString() === selectedProviderId);
    if (!provider) return true;
    
    // TIER 1: Check for custom shifts for this date and provider
    if (shiftsData && Array.isArray(shiftsData)) {
      const selectedDateStr = format(date, 'yyyy-MM-dd');
      const providerShift = shiftsData.find((shift: any) => {
        const shiftDateStr = shift.date instanceof Date 
          ? format(shift.date, 'yyyy-MM-dd')
          : shift.date.substring(0, 10);
        return shift.staffId.toString() === selectedProviderId && shiftDateStr === selectedDateStr;
      });
      
      if (providerShift) {
        // Use the custom shift times
        const slotTime = timeSlotTo24Hour(timeSlot);
        const startTime = providerShift.startTime;
        const endTime = providerShift.endTime;
        
        return slotTime >= startTime && slotTime <= endTime;
      }
    }
    
    // TIER 2: If no custom shifts, fall back to default shifts from doctor_default_shifts
    if (defaultShiftsData && defaultShiftsData.length > 0) {
      const defaultShift = defaultShiftsData.find((ds: any) => 
        ds.userId.toString() === selectedProviderId
      );
      
      if (defaultShift) {
        const dayOfWeek = format(date, 'EEEE');
        const workingDays = defaultShift.workingDays || [];
        
        // Check if this day is a working day
        if (workingDays.includes(dayOfWeek)) {
          const slotTime = timeSlotTo24Hour(timeSlot);
          const startTime = defaultShift.startTime || '00:00';
          const endTime = defaultShift.endTime || '23:59';
          
          return slotTime >= startTime && slotTime <= endTime;
        }
        
        return false; // Not a working day
      }
    }
    
    // Fallback to generic working hours if no shift found (legacy support)
    if (!provider.workingHours || !provider.workingDays) return true;
    
    // Check if the selected date falls on a working day
    const dayName = format(date, 'EEEE'); // e.g., "Monday"
    if (!provider.workingDays.includes(dayName)) return false;
    
    // Check if time slot is within working hours
    const slotTime = timeSlotTo24Hour(timeSlot);
    const startTime = provider.workingHours.start || '00:00';
    const endTime = provider.workingHours.end || '23:59';
    
    return slotTime >= startTime && slotTime <= endTime;
  };

  // Function to check if a time slot is available and within shift
  const isTimeSlotAvailable = (date: Date, timeSlot: string) => {
    if (!date || !timeSlot || !appointments) return true;
    
    // Determine which provider to check for shift validation
    const providerForShift = editingAppointment ? editingAppointment.providerId : (selectedProviderId ? parseInt(selectedProviderId) : null);
    
    // Check if slot is within staff's working hours
    if (providerForShift && !isTimeSlotInShift(timeSlot, date)) {
      console.log('[Availability Check] Slot not in shift for provider:', providerForShift, 'Time:', timeSlot);
      return false;
    }
    
    const selectedDateString = format(date, 'yyyy-MM-dd');
    
    // Log the provider being checked
    console.log('[Availability Check] Checking slot:', timeSlot, 'for provider:', providerForShift || 'ALL', 'on date:', selectedDateString);
    
    // Convert the time slot to minutes (this represents the START time of the slot)
    const [time, period] = timeSlot.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    let hour24 = hours;
    if (period === 'PM' && hours !== 12) hour24 += 12;
    if (period === 'AM' && hours === 12) hour24 = 0;
    const slotStartMinutes = hour24 * 60 + minutes;
    // Each slot is 15 minutes, but we need to check if starting an appointment HERE would fit
    const slotEndMinutes = slotStartMinutes + 15; // Just this 15-min slot
    
    // *** CHANGE 2: Enhanced conflict checking with logging ***
    // Check if this slot overlaps with any existing appointment
    const isBooked = appointments.some((apt: any) => {
      // Exclude the appointment being edited from conflict checks
      if (editingAppointment && apt.id === editingAppointment.id) {
        console.log('[Availability Check] Excluding current editing appointment:', apt.id);
        return false;
      }
      
      // Determine which provider to check: editing appointment's provider or selected provider for new appointments
      const providerToCheck = editingAppointment ? editingAppointment.providerId : (selectedProviderId ? parseInt(selectedProviderId) : null);
      
      // Only check appointments for the relevant provider
      if (providerToCheck && apt.providerId !== providerToCheck) {
        return false;
      }
      
      // Parse the scheduledAt directly without timezone conversion
      // Format: "2025-10-05T00:00:00.000Z" or "2025-10-05T22:00:00.000Z"
      const aptDateString = apt.scheduledAt.substring(0, 10); // Extract "2025-10-05"
      
      // Only check appointments on the same date
      if (aptDateString !== selectedDateString) return false;
      
      // Extract time in 24-hour format directly from the ISO string (no timezone conversion)
      const timeString = apt.scheduledAt.substring(11, 16); // Extract "00:00" or "22:00"
      const [aptHour, aptMinute] = timeString.split(':').map(Number);
      const aptStartMinutes = aptHour * 60 + aptMinute;
      const aptDuration = apt.duration || 30; // Default to 30 if duration not set
      const aptEndMinutes = aptStartMinutes + aptDuration;
      
      // Check if this 15-minute slot overlaps with the existing appointment
      // Two time ranges overlap if: slot_start < existing_end AND slot_end > existing_start
      const hasConflict = slotStartMinutes < aptEndMinutes && slotEndMinutes > aptStartMinutes;
      
      if (hasConflict) {
        console.log('[Availability Check] ❌ CONFLICT DETECTED:', {
          slot: timeSlot,
          slotRange: `${slotStartMinutes}-${slotEndMinutes} mins`,
          providerChecking: providerToCheck,
          conflictingAppointment: {
            id: apt.id,
            providerId: apt.providerId,
            time: timeString,
            range: `${aptStartMinutes}-${aptEndMinutes} mins`,
            duration: aptDuration
          }
        });
      }
      
      return hasConflict;
    });
    
    return !isBooked;
  };

  // Function to check if consecutive slots are available for the selected duration
  const checkConsecutiveSlotsAvailable = (date: Date, startTimeSlot: string, duration: number): { available: boolean; availableMinutes: number } => {
    if (!date || !startTimeSlot) return { available: true, availableMinutes: duration };
    
    // Calculate how many 15-minute slots we need
    const slotsNeeded = duration / 15;
    
    // Convert start time slot to minutes
    const [time, period] = startTimeSlot.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    let hour24 = hours;
    if (period === 'PM' && hours !== 12) hour24 += 12;
    if (period === 'AM' && hours === 12) hour24 = 0;
    let currentSlotMinutes = hour24 * 60 + minutes;
    
    // Check each consecutive 15-minute slot
    let availableSlots = 0;
    for (let i = 0; i < slotsNeeded; i++) {
      const slotHour = Math.floor(currentSlotMinutes / 60);
      const slotMinute = currentSlotMinutes % 60;
      
      // Convert back to 12-hour format for checking
      let displayHour = slotHour % 12;
      if (displayHour === 0) displayHour = 12;
      const slotPeriod = slotHour >= 12 ? 'PM' : 'AM';
      const slotTimeString = `${displayHour}:${slotMinute.toString().padStart(2, '0')} ${slotPeriod}`;
      
      // Check if this slot is available
      if (isTimeSlotAvailable(date, slotTimeString)) {
        availableSlots++;
        currentSlotMinutes += 15;
      } else {
        break; // Stop at first unavailable slot
      }
    }
    
    const availableMinutes = availableSlots * 15;
    return {
      available: availableSlots === slotsNeeded,
      availableMinutes: availableMinutes
    };
  };

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

  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/appointments", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      setShowConfirmationDialog(false);
      setShowSuccessModal(true);
    },
    onError: (error) => {
      console.error("Create appointment error:", error);
      toast({
        title: "Creation Failed",
        description: "Failed to create the appointment. Please try again.",
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
      setShowEditSuccessModal(true);
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

  // Cancel appointment mutation
  const cancelAppointmentMutation = useMutation({
    mutationFn: async (appointmentId: number) => {
      const response = await apiRequest("PATCH", `/api/appointments/${appointmentId}`, { status: 'cancelled' });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Appointment Cancelled",
        description: "The appointment has been successfully cancelled.",
      });
    },
    onError: (error) => {
      console.error("Cancel appointment error:", error);
      toast({
        title: "Cancellation Failed",
        description: "Failed to cancel the appointment. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Create invoice mutation
  const createInvoiceMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/invoices", data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create invoice");
      }
      return response.json();
    },
    onSuccess: (data) => {
      console.log("Invoice created successfully:", data);
      // Invalidate invoices query to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
    },
    onError: (error) => {
      console.error("Create invoice error:", error);
      toast({
        title: "Invoice Creation Failed",
        description: error instanceof Error ? error.message : "Failed to create the invoice. Please try again.",
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

  // Handle cancel appointment
  const handleCancelAppointment = (appointmentId: number) => {
    cancelAppointmentMutation.mutate(appointmentId);
  };

  // Handle edit appointment
  const handleEditAppointment = async (appointment: any) => {
    // *** CHANGE 1: Refetch appointments from database to ensure we have latest data for conflict checking ***
    console.log('[Edit Appointment] Fetching latest appointments data from database...');
    await refetch();
    console.log('[Edit Appointment] Appointments data refreshed');
    
    setEditingAppointment(appointment);
    
    // *** FIX: Parse ISO string without timezone conversion ***
    // Extract date and time components directly from ISO string
    const isoString = appointment.scheduledAt;
    const dateMatch = isoString.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
    
    if (dateMatch) {
      const [, year, month, day, hour, minute] = dateMatch;
      // Create date using local timezone (no conversion)
      const appointmentDate = new Date(
        parseInt(year),
        parseInt(month) - 1, // JavaScript months are 0-indexed
        parseInt(day),
        parseInt(hour),
        parseInt(minute),
        0
      );
      setEditAppointmentDate(appointmentDate);
      
      // Convert to 12-hour format for display
      const hours = parseInt(hour);
      const minutes = parseInt(minute);
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
      const timeString = `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
      setEditSelectedTimeSlot(timeString);
      
      console.log('[Edit Appointment] Opening edit dialog with appointment:', {
        id: appointment.id,
        scheduledAt: appointment.scheduledAt,
        selectedDate: appointmentDate,
        selectedTimeSlot: timeString
      });
    }
    
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
    // Patients can create appointments for themselves, staff can create for anyone
    return true;
  };

  const canViewAppointmentDetails = () => {
    if (!user) return false;
    // Everyone can view appointment details (filtered by backend already)
    return true;
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

  // Fetch roles from the roles table filtered by organization_id
  const { data: rolesData = [] } = useQuery({
    queryKey: ["/api/roles"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/roles");
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Roles fetch error:", error);
        return [];
      }
    },
  });

  // Fetch all shifts for the selected provider to determine available dates
  const { data: allProviderShifts } = useQuery({
    queryKey: ["/api/shifts/provider", selectedProviderId],
    staleTime: 30000,
    enabled: !!selectedProviderId,
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/shifts?staffId=${selectedProviderId}`);
      const data = await response.json();
      return data;
    },
  });

  // Fetch shifts for the selected date when provider is selected
  const { data: shiftsData } = useQuery({
    queryKey: ["/api/shifts", newAppointmentDate ? format(newAppointmentDate, 'yyyy-MM-dd') : null],
    staleTime: 30000,
    enabled: !!newAppointmentDate,
    queryFn: async () => {
      const dateStr = format(newAppointmentDate!, 'yyyy-MM-dd');
      const response = await apiRequest('GET', `/api/shifts?date=${dateStr}`);
      const data = await response.json();
      return data;
    },
  });

  // Fetch default shifts for fallback when no custom shifts exist
  const { data: defaultShiftsData = [] } = useQuery({
    queryKey: ["/api/default-shifts"],
    staleTime: 60000,
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/default-shifts?forBooking=true');
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });

  // Generate time slots with two-tier system: custom shifts OR default shifts
  const timeSlots = useMemo(() => {
    // If no provider or date selected, return empty array
    if (!selectedProviderId || !newAppointmentDate) {
      return [];
    }

    // TIER 1: Check for custom shifts for the selected provider AND date
    const selectedDateStr = format(newAppointmentDate, 'yyyy-MM-dd');
    let providerShifts = shiftsData?.filter((shift: any) => {
      // Filter by staff ID
      if (shift.staffId.toString() !== selectedProviderId) return false;
      
      // Filter by selected date
      const shiftDateStr = shift.date instanceof Date 
        ? format(shift.date, 'yyyy-MM-dd')
        : shift.date.substring(0, 10);
      
      return shiftDateStr === selectedDateStr;
    }) || [];

    console.log(`[TIME_SLOTS] Provider ${selectedProviderId}, Date: ${format(newAppointmentDate, 'yyyy-MM-dd EEEE')}`);
    console.log(`[TIME_SLOTS] Custom shifts found: ${providerShifts.length}`, providerShifts);

    // TIER 2: If no custom shifts, use default shifts from doctor_default_shifts
    if (providerShifts.length === 0 && defaultShiftsData.length > 0) {
      console.log('[TIME_SLOTS] No custom shifts, checking default shifts...');
      
      const defaultShift = defaultShiftsData.find((ds: any) => 
        ds.userId.toString() === selectedProviderId
      );

      if (defaultShift) {
        const dayOfWeek = format(newAppointmentDate, 'EEEE');
        const workingDays = defaultShift.workingDays || [];
        
        console.log(`[TIME_SLOTS] Day: ${dayOfWeek}, Working days:`, workingDays);
        
        if (workingDays.includes(dayOfWeek)) {
          providerShifts = [{
            staffId: defaultShift.userId,
            startTime: defaultShift.startTime,
            endTime: defaultShift.endTime,
            date: newAppointmentDate,
            isDefault: true
          }];
          console.log('[TIME_SLOTS] Using default shift:', providerShifts[0]);
        } else {
          console.log('[TIME_SLOTS] Not a working day');
        }
      } else {
        console.log('[TIME_SLOTS] No default shift found');
      }
    }

    // If still no shifts found, return empty array
    if (!providerShifts || providerShifts.length === 0) {
      console.log('[TIME_SLOTS] No shifts available');
      return [];
    }

    const allSlots: string[] = [];

    // Generate time slots for each shift
    for (const shift of providerShifts) {
      // Parse start and end times from shift
      const [startHour, startMinute] = shift.startTime.split(':').map(Number);
      const [endHour, endMinute] = shift.endTime.split(':').map(Number);

      let currentHour = startHour;
      let currentMinute = startMinute;

      // Generate 15-minute interval slots between start and end time
      // Use < instead of <= because we can't start an appointment AT the end time
      while (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute)) {
        const hour12 = currentHour === 0 ? 12 : currentHour > 12 ? currentHour - 12 : currentHour;
        const period = currentHour < 12 ? 'AM' : 'PM';
        const timeString = `${hour12}:${currentMinute.toString().padStart(2, '0')} ${period}`;
        
        // Only add if not already in the array (avoid duplicates from overlapping shifts)
        if (!allSlots.includes(timeString)) {
          allSlots.push(timeString);
        }

        // Move to next 15-minute slot
        currentMinute += 15;
        if (currentMinute >= 60) {
          currentMinute = 0;
          currentHour++;
        }
      }
    }

    // Sort slots chronologically
    allSlots.sort((a, b) => {
      const timeA = timeSlotTo24Hour(a);
      const timeB = timeSlotTo24Hour(b);
      return timeA.localeCompare(timeB);
    });

    console.log(`[TIME SLOTS] Generated ${allSlots.length} slots for provider ${selectedProviderId}:`, allSlots);
    console.log(`[TIME SLOTS] From ${providerShifts.length} shifts:`, providerShifts);

    return allSlots;
  }, [selectedProviderId, newAppointmentDate, shiftsData, defaultShiftsData, selectedDuration]);

  // *** CHANGE 4: Fetch shifts for EDIT appointment date ***
  const { data: editShiftsData } = useQuery({
    queryKey: ["/api/shifts", editAppointmentDate ? format(editAppointmentDate, 'yyyy-MM-dd') : null, "edit"],
    staleTime: 30000,
    enabled: !!editAppointmentDate && !!editingAppointment,
    queryFn: async () => {
      const dateStr = format(editAppointmentDate!, 'yyyy-MM-dd');
      const response = await apiRequest('GET', `/api/shifts?date=${dateStr}`);
      const data = await response.json();
      console.log('[EDIT TIME_SLOTS] Fetched shifts for date:', dateStr, data);
      return data;
    },
  });

  // *** CHANGE 4: Generate time slots for EDIT appointment dialog ***
  const editTimeSlots = useMemo(() => {
    // If no editing appointment or date selected, return empty array
    if (!editingAppointment || !editAppointmentDate) {
      console.log('[EDIT TIME_SLOTS] No editing appointment or date');
      return [];
    }

    // TIER 1: Check for custom shifts for the provider AND date
    const selectedDateStr = format(editAppointmentDate, 'yyyy-MM-dd');
    let providerShifts = editShiftsData?.filter((shift: any) => {
      // Filter by staff ID from the editing appointment's provider
      if (shift.staffId !== editingAppointment.providerId) return false;
      
      // Filter by selected date
      const shiftDateStr = shift.date instanceof Date 
        ? format(shift.date, 'yyyy-MM-dd')
        : shift.date.substring(0, 10);
      
      return shiftDateStr === selectedDateStr;
    }) || [];

    console.log(`[EDIT TIME_SLOTS] Provider ${editingAppointment.providerId}, Date: ${format(editAppointmentDate, 'yyyy-MM-dd EEEE')}`);
    console.log(`[EDIT TIME_SLOTS] Custom shifts found: ${providerShifts.length}`, providerShifts);

    // TIER 2: If no custom shifts, use default shifts from doctor_default_shifts
    if (providerShifts.length === 0 && defaultShiftsData.length > 0) {
      console.log('[EDIT TIME_SLOTS] No custom shifts, checking default shifts...');
      
      const defaultShift = defaultShiftsData.find((ds: any) => 
        ds.userId === editingAppointment.providerId
      );

      if (defaultShift) {
        const dayOfWeek = format(editAppointmentDate, 'EEEE');
        const workingDays = defaultShift.workingDays || [];
        
        console.log(`[EDIT TIME_SLOTS] Day: ${dayOfWeek}, Working days:`, workingDays);
        
        if (workingDays.includes(dayOfWeek)) {
          providerShifts = [{
            staffId: defaultShift.userId,
            startTime: defaultShift.startTime,
            endTime: defaultShift.endTime,
            date: editAppointmentDate,
            isDefault: true
          }];
          console.log('[EDIT TIME_SLOTS] Using default shift:', providerShifts[0]);
        } else {
          console.log('[EDIT TIME_SLOTS] Not a working day');
        }
      } else {
        console.log('[EDIT TIME_SLOTS] No default shift found');
      }
    }

    // If still no shifts found, return empty array
    if (!providerShifts || providerShifts.length === 0) {
      console.log('[EDIT TIME_SLOTS] No shifts available');
      return [];
    }

    const allSlots: string[] = [];

    // Generate time slots for each shift
    for (const shift of providerShifts) {
      // Parse start and end times from shift
      const [startHour, startMinute] = shift.startTime.split(':').map(Number);
      const [endHour, endMinute] = shift.endTime.split(':').map(Number);

      let currentHour = startHour;
      let currentMinute = startMinute;

      // Generate 15-minute interval slots between start and end time
      while (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute)) {
        const hour12 = currentHour === 0 ? 12 : currentHour > 12 ? currentHour - 12 : currentHour;
        const period = currentHour < 12 ? 'AM' : 'PM';
        const timeString = `${hour12}:${currentMinute.toString().padStart(2, '0')} ${period}`;
        
        // Only add if not already in the array
        if (!allSlots.includes(timeString)) {
          allSlots.push(timeString);
        }

        // Move to next 15-minute slot
        currentMinute += 15;
        if (currentMinute >= 60) {
          currentMinute = 0;
          currentHour++;
        }
      }
    }

    // Sort slots chronologically
    allSlots.sort((a, b) => {
      const timeA = timeSlotTo24Hour(a);
      const timeB = timeSlotTo24Hour(b);
      return timeA.localeCompare(timeB);
    });

    console.log(`[EDIT TIME_SLOTS] Generated ${allSlots.length} slots for provider ${editingAppointment.providerId}:`, allSlots);

    return allSlots;
  }, [editingAppointment, editAppointmentDate, editShiftsData, defaultShiftsData]);

  const isDataLoaded = !isUsersLoading && !isPatientsLoading;

  // Get filtered users by selected role
  const filteredUsers = usersData?.filter((user: any) => {
    if (!selectedRole) return false;
    return user.role === selectedRole;
  }) || [];

  // Map roles to dropdown options format from roles table, excluding 'patient', 'admin', and 'Administrator'
  const availableRoles = rolesData
    .filter((role: any) => {
      const roleName = (role.name || '').toLowerCase();
      return !['patient', 'admin', 'administrator'].includes(roleName);
    })
    .map((role: any) => role.name);

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

  const getCreatedByUser = (createdById: number | null | undefined) => {
    if (!createdById || !usersData || !Array.isArray(usersData)) return null;
    const creator = usersData.find((u: any) => u.id === createdById);
    return creator ? { name: `${creator.firstName || ''} ${creator.lastName || ''}`.trim(), role: creator.role } : null;
  };

  // Check if a date has shifts (custom or default)
  const hasShiftsOnDate = (date: Date): boolean => {
    if (!selectedProviderId) return false;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // Check for custom shifts first
    const hasCustomShift = allProviderShifts?.some((shift: any) => {
      const shiftDateStr = shift.date.substring(0, 10);
      return shiftDateStr === dateStr && shift.staffId.toString() === selectedProviderId;
    });
    
    if (hasCustomShift) return true;
    
    // Check for default shifts - if the day is a working day
    if (defaultShiftsData && defaultShiftsData.length > 0) {
      const defaultShift = defaultShiftsData.find((ds: any) => 
        ds.userId.toString() === selectedProviderId
      );
      
      if (defaultShift) {
        const dayOfWeek = format(date, 'EEEE');
        const workingDays = defaultShift.workingDays || [];
        return workingDays.includes(dayOfWeek);
      }
    }
    
    return false;
  };

  // *** FIX: Check if a date has shifts for EDIT mode (uses editing appointment's provider) ***
  const hasShiftsOnDateForEdit = (date: Date): boolean => {
    if (!editingAppointment) return false;
    
    const providerId = editingAppointment.providerId;
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // Check for custom shifts first in allProviderShifts
    const hasCustomShift = allProviderShifts?.some((shift: any) => {
      const shiftDateStr = shift.date.substring(0, 10);
      return shiftDateStr === dateStr && shift.staffId === providerId;
    });
    
    if (hasCustomShift) return true;
    
    // Check for default shifts - if the day is a working day
    if (defaultShiftsData && defaultShiftsData.length > 0) {
      const defaultShift = defaultShiftsData.find((ds: any) => 
        ds.userId === providerId
      );
      
      if (defaultShift) {
        const dayOfWeek = format(date, 'EEEE');
        const workingDays = defaultShift.workingDays || [];
        return workingDays.includes(dayOfWeek);
      }
    }
    
    return false;
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
            {canCreateAppointments() && (
              <Button 
                onClick={() => {
                  if (user?.role === 'admin') {
                    setShowNewAppointment(true);
                  } else {
                    onNewAppointment?.();
                  }
                }}
                className="flex items-center gap-2"
                data-testid="button-new-appointment"
              >
                <Plus className="h-3 w-3" />
                New Appointment
              </Button>
            )}
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
                      <div className="flex items-center space-x-2 mt-1">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {appointment.duration || 30} minutes
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-right mr-4">
                   
                      <div className="font-medium">Dr. {appointment.providerName}</div>
                      {user?.role === 'admin' && (() => {
                        const provider = usersData?.find((u: any) => u.id === appointment.providerId);
                        return provider && (provider.medicalSpecialtyCategory || provider.subSpecialty) ? (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {provider.medicalSpecialtyCategory && <div>{provider.medicalSpecialtyCategory}</div>}
                            {provider.subSpecialty && <div>{provider.subSpecialty}</div>}
                          </div>
                        ) : null;
                      })()}
                      {(() => {
                        const createdBy = getCreatedByUser(appointment.createdBy);
                        return createdBy ? (
                          <div className="text-xs text-gray-400 mt-1">
                            Created By: {createdBy.name} ({createdBy.role})
                          </div>
                        ) : null;
                      })()}
                    </div>
                    {appointment.status !== 'cancelled' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancelAppointment(appointment.id);
                        }}
                        className="text-red-600 hover:text-red-800 hover:bg-red-50 border-red-300"
                        data-testid={`cancel-appointment-${appointment.id}`}
                      >
                        Cancel Appointment
                      </Button>
                    )}
                    <div className="flex items-center space-x-1">
                      {canEditAppointments() && (
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
                      )}
                      {canDeleteAppointments() && (
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
                      )}
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

      {/* New Appointment Dialog */}
      <Dialog open={showNewAppointment} onOpenChange={setShowNewAppointment}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <div className="p-2">
            <DialogHeader className="mb-6">
              <DialogTitle className="fs-3 font-bold text-blue-800">
                Create New Appointment
              </DialogTitle>
              <DialogDescription>
                Fill in the details to create a new appointment
              </DialogDescription>
            </DialogHeader>
            
            {user?.role === 'admin' ? (
              /* Admin Layout - Full Width with Rows */
              <div className="space-y-6">
                {/* Row 1: Select Role and Select Name */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Select Role
                    </Label>
                    <Popover open={openRoleCombo} onOpenChange={setOpenRoleCombo}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openRoleCombo}
                          className="w-full justify-between mt-1"
                          data-testid="select-role"
                        >
                          {selectedRole
                            ? selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)
                            : "Choose a role..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search role..." />
                          <CommandList>
                            <CommandEmpty>No role found.</CommandEmpty>
                            <CommandGroup>
                              {availableRoles.map((role: string) => (
                                <CommandItem
                                  key={role}
                                  value={role}
                                  onSelect={(currentValue) => {
                                    setSelectedRole(currentValue);
                                    setSelectedProviderId(""); // Reset provider when role changes
                                    setProviderError(""); // Clear provider error
                                    setOpenRoleCombo(false);
                                  }}
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${
                                      selectedRole === role ? "opacity-100" : "opacity-0"
                                    }`}
                                  />
                                  {role.charAt(0).toUpperCase() + role.slice(1)}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Select Name
                    </Label>
                    <Popover open={openProviderCombo} onOpenChange={setOpenProviderCombo}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openProviderCombo}
                          className="w-full justify-between mt-1"
                          data-testid="select-name"
                          disabled={!selectedRole}
                        >
                          {selectedProviderId && filteredUsers
                            ? (() => {
                                const provider = filteredUsers.find((u: any) => u.id.toString() === selectedProviderId);
                                return provider ? `${provider.firstName} ${provider.lastName}` : "Select a name...";
                              })()
                            : selectedRole ? "Select a name..." : "Select a role first"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search name..." />
                          <CommandList>
                            <CommandEmpty>No provider found.</CommandEmpty>
                            <CommandGroup>
                              {filteredUsers.map((user: any) => (
                                <CommandItem
                                  key={user.id}
                                  value={`${user.firstName} ${user.lastName}`}
                                  onSelect={() => {
                                    setSelectedProviderId(user.id.toString());
                                    setProviderError(""); // Clear error when provider is selected
                                    setOpenProviderCombo(false);
                                  }}
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${
                                      selectedProviderId === user.id.toString() ? "opacity-100" : "opacity-0"
                                    }`}
                                  />
                                  {user.firstName} {user.lastName}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {providerError && (
                      <p className="text-red-500 text-sm mt-1">{providerError}</p>
                    )}
                  </div>
                </div>

                {/* Row 2: Patient and Duration */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Patient</Label>
                    <Popover open={openPatientCombo} onOpenChange={setOpenPatientCombo}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openPatientCombo}
                          className="w-full justify-between mt-1"
                          data-testid="select-patient"
                        >
                          {newAppointmentData.patientId && patientsData
                            ? (() => {
                                const patient = patientsData.find((p: any) => p.id.toString() === newAppointmentData.patientId);
                                return patient ? `${patient.firstName} ${patient.lastName} (${patient.patientId})` : "Select a patient";
                              })()
                            : "Select a patient"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search patient..." />
                          <CommandList>
                            <CommandEmpty>No patient found.</CommandEmpty>
                            <CommandGroup>
                              {patientsData && patientsData.map((patient: any) => (
                                <CommandItem
                                  key={patient.id}
                                  value={`${patient.firstName} ${patient.lastName} ${patient.patientId}`}
                                  onSelect={() => {
                                    setNewAppointmentData({ ...newAppointmentData, patientId: patient.id.toString() });
                                    setPatientError(""); // Clear error when patient is selected
                                    setOpenPatientCombo(false);
                                  }}
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${
                                      newAppointmentData.patientId === patient.id.toString() ? "opacity-100" : "opacity-0"
                                    }`}
                                  />
                                  {patient.firstName} {patient.lastName} ({patient.patientId})
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {patientError && (
                      <p className="text-red-500 text-sm mt-1">{patientError}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Duration
                    </Label>
                    <Select 
                      value={selectedDuration.toString()}
                      onValueChange={(value) => {
                        setSelectedDuration(parseInt(value));
                        setNewSelectedTimeSlot(""); // Reset time slot when duration changes
                      }}
                    >
                      <SelectTrigger className="mt-1" data-testid="select-duration">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">60 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Row 3: Select Date and Select Time Slot */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Date Selection */}
                  <div>
                    <Label className="text-sm font-medium text-gray-600 mb-2 block">Select Date</Label>
                    <div className="border rounded-lg p-3 bg-gray-50">
                      <CalendarComponent
                        mode="single"
                        selected={newAppointmentDate}
                        onSelect={(date) => {
                          setNewAppointmentDate(date);
                        }}
                        disabled={(date: Date) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          
                          if (date < today) return true;
                          
                          return !hasShiftsOnDate(date);
                        }}
                        className="rounded-md"
                      />
                    </div>
                  </div>

                  {/* Time Slot Selection */}
                  <div>
                    <Label className="text-sm font-medium text-gray-600 mb-2 block">Select Time Slot</Label>
                    <div className="border rounded-lg p-3 bg-gray-50 h-[320px] overflow-y-auto">
                      {!newAppointmentDate ? (
                        <div className="flex items-center justify-center h-full">
                          <p className="text-gray-400 text-sm">Time slots will appear here</p>
                        </div>
                      ) : timeSlots.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <p className="text-gray-500 text-sm font-medium">Time slot not available</p>
                            <p className="text-gray-400 text-xs mt-1">{format(newAppointmentDate, 'MMMM dd, yyyy')}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {timeSlots.map((slot) => {
                            const isAvailable = isTimeSlotAvailable(newAppointmentDate, slot);
                            const isSelected = newSelectedTimeSlot === slot;
                            
                            return (
                              <Button
                                key={slot}
                                variant={isSelected ? "default" : "outline"}
                                className={`h-10 text-xs font-medium ${
                                  !isAvailable 
                                    ? "bg-gray-200 text-gray-400 cursor-not-allowed border-gray-300" 
                                    : isSelected 
                                      ? "bg-blue-500 hover:bg-blue-600 text-white border-blue-500" 
                                      : "bg-green-500 hover:bg-green-600 text-white border-green-500"
                                }`}
                                disabled={!isAvailable}
                                onClick={() => {
                                  if (!newAppointmentDate) return;
                                  
                                  // Validate if consecutive slots are available for the selected duration
                                  const validation = checkConsecutiveSlotsAvailable(newAppointmentDate, slot, selectedDuration);
                                  
                                  if (!validation.available) {
                                    // Show modal for admin users
                                    if (user?.role === 'admin') {
                                      setValidationErrorMessage(`Only ${validation.availableMinutes} minutes are available at ${slot}. Please select another time slot.`);
                                      setShowValidationError(true);
                                    } else {
                                      toast({
                                        title: "Insufficient Time Available",
                                        description: `Only ${validation.availableMinutes} minutes are available at ${slot}. Please select another time slot.`,
                                        variant: "destructive",
                                      });
                                    }
                                    return;
                                  }
                                  
                                  setNewSelectedTimeSlot(slot);
                                }}
                              >
                                {slot}
                              </Button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Non-Admin Layout - Original 3-column layout */
              <div className="grid grid-cols-3 gap-6">
                {/* Left Column - Selection Fields */}
                <div className="col-span-2 space-y-6">
                  {/* Patient Selection */}
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Patient</Label>
                    <Select 
                      value={newAppointmentData.patientId}
                      onValueChange={(value) => {
                        setNewAppointmentData({ ...newAppointmentData, patientId: value });
                      }}
                    >
                      <SelectTrigger className="mt-1" data-testid="select-patient">
                        <SelectValue placeholder="Select a patient" />
                      </SelectTrigger>
                      <SelectContent>
                        {patientsData && patientsData.map((patient: any) => (
                          <SelectItem key={patient.id} value={patient.id.toString()}>
                            {patient.firstName} {patient.lastName} ({patient.patientId})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Role and Name Selection Row */}
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <Label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Select Role
                      </Label>
                      <Select 
                        value={selectedRole}
                        onValueChange={(value) => {
                          setSelectedRole(value);
                          setSelectedProviderId("");
                        }}
                      >
                        <SelectTrigger className="mt-1" data-testid="select-role">
                          <SelectValue placeholder="Choose a role..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableRoles.map((role: string) => (
                            <SelectItem key={role} value={role}>
                              {role.charAt(0).toUpperCase() + role.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Select Name
                      </Label>
                      <Select 
                        value={selectedProviderId}
                        onValueChange={(value) => {
                          setSelectedProviderId(value);
                        }}
                        disabled={!selectedRole}
                      >
                        <SelectTrigger className="mt-1" data-testid="select-name">
                          <SelectValue placeholder={selectedRole ? "Select a name..." : "Select a role first"} />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredUsers.map((user: any) => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.firstName} {user.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Duration Selector */}
                  <div>
                    <Label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Duration
                    </Label>
                    <Select 
                      value={selectedDuration.toString()}
                      onValueChange={(value) => {
                        setSelectedDuration(parseInt(value));
                        setNewSelectedTimeSlot("");
                      }}
                    >
                      <SelectTrigger className="mt-1" data-testid="select-duration">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">60 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date Selection */}
                  <div>
                    <Label className="text-sm font-medium text-gray-600 mb-2 block">Select Date</Label>
                    <div className="border rounded-lg p-3 bg-gray-50">
                      <CalendarComponent
                        mode="single"
                        selected={newAppointmentDate}
                        onSelect={(date) => {
                          setNewAppointmentDate(date);
                        }}
                        disabled={(date: Date) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          
                          if (date < today) return true;
                          
                          return !hasShiftsOnDate(date);
                        }}
                        className="rounded-md"
                      />
                    </div>
                  </div>

                  {/* Time Slot Selection */}
                  <div>
                    <Label className="text-sm font-medium text-gray-600 mb-2 block">Select Time Slot</Label>
                    <div className="border rounded-lg p-3 bg-gray-50 h-[320px] overflow-y-auto">
                      <div className="grid grid-cols-2 gap-2">
                        {timeSlots.map((slot) => {
                          const isAvailable = newAppointmentDate ? isTimeSlotAvailable(newAppointmentDate, slot) : true;
                          const isSelected = newSelectedTimeSlot === slot;
                          
                          return (
                            <Button
                              key={slot}
                              variant={isSelected ? "default" : "outline"}
                              className={`h-10 text-xs font-medium ${
                                !isAvailable 
                                  ? "bg-gray-200 text-gray-400 cursor-not-allowed border-gray-300" 
                                  : isSelected 
                                    ? "bg-blue-500 hover:bg-blue-600 text-white border-blue-500" 
                                    : "bg-green-500 hover:bg-green-600 text-white border-green-500"
                              }`}
                              disabled={!isAvailable}
                              onClick={() => {
                                if (!newAppointmentDate) return;
                                
                                // Validate if consecutive slots are available for the selected duration
                                const validation = checkConsecutiveSlotsAvailable(newAppointmentDate, slot, selectedDuration);
                                
                                if (!validation.available) {
                                  toast({
                                    title: "Insufficient Time Available",
                                    description: `Only ${validation.availableMinutes} minutes are available at ${slot}. Please select another time slot.`,
                                    variant: "destructive",
                                  });
                                  return;
                                }
                                
                                setNewSelectedTimeSlot(slot);
                              }}
                            >
                              {slot}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Patient Info & Booking Summary */}
                <div className="space-y-6">
                  {/* Patient Information */}
                  {newAppointmentData.patientId && patientsData && (() => {
                    const selectedPatient = patientsData.find((p: any) => p.id.toString() === newAppointmentData.patientId);
                    if (!selectedPatient) return null;
                    
                    return (
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <h3 className="text-sm font-semibold text-gray-800 mb-3">Patient Information</h3>
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-lg">
                            {selectedPatient.firstName?.charAt(0)}{selectedPatient.lastName?.charAt(0)}
                          </div>
                          <div className="flex-1 space-y-1 text-sm">
                            <p className="font-semibold text-gray-900">
                              {selectedPatient.firstName} {selectedPatient.lastName}
                            </p>
                            <p className="text-gray-600 text-xs">
                              {selectedPatient.patientId}
                            </p>
                            {selectedPatient.phone && (
                              <p className="text-gray-600 text-xs flex items-center gap-1">
                                📞 {selectedPatient.phone}
                              </p>
                            )}
                            {selectedPatient.email && (
                              <p className="text-gray-600 text-xs flex items-center gap-1">
                                ✉️ {selectedPatient.email}
                              </p>
                            )}
                            {selectedPatient.nhsNumber && (
                              <p className="text-gray-600 text-xs">
                                NHS: {selectedPatient.nhsNumber}
                              </p>
                            )}
                            {selectedPatient.address && (selectedPatient.address.city || selectedPatient.address.postcode) && (
                              <p className="text-gray-600 text-xs">
                                📍 {selectedPatient.address.city}, {selectedPatient.address.postcode}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Booking Summary */}
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <h3 className="text-sm font-semibold text-gray-800 mb-3">Booking Summary</h3>
                    <div className="space-y-3 text-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-gray-500 text-xs">Role</p>
                          <p className="font-medium text-gray-900">
                            {selectedRole ? selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1) : "Not selected"}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Duration</p>
                          <p className="font-medium text-gray-900">{selectedDuration} minutes</p>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-gray-500 text-xs">Patient</p>
                        <p className="font-medium text-gray-900">
                          {newAppointmentData.patientId && patientsData 
                            ? (() => {
                                const patient = patientsData.find((p: any) => p.id.toString() === newAppointmentData.patientId);
                                return patient ? `${patient.firstName} ${patient.lastName}` : "Not selected";
                              })()
                            : "Not selected"}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-gray-500 text-xs">Provider</p>
                        <p className="font-medium text-gray-900">
                          {selectedProviderId && usersData
                            ? (() => {
                                const provider = usersData.find((u: any) => u.id.toString() === selectedProviderId);
                                return provider ? `${provider.firstName} ${provider.lastName}` : "Not selected";
                              })()
                            : "Not selected"}
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-gray-500 text-xs">Date</p>
                          <p className="font-medium text-gray-900">
                            {newAppointmentDate ? format(newAppointmentDate, 'MMM dd, yyyy') : "Not selected"}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Time</p>
                          <p className="font-medium text-gray-900">
                            {newSelectedTimeSlot || "Not selected"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 pt-6 border-t mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowNewAppointment(false);
                    setNewAppointmentDate(undefined);
                    setNewSelectedTimeSlot("");
                    setSelectedRole("");
                    setSelectedProviderId("");
                    setSelectedDuration(30);
                    setNewAppointmentData({
                      title: "",
                      type: "consultation",
                      patientId: "",
                      description: "",
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    // Clear previous errors
                    setPatientError("");
                    setProviderError("");
                    
                    // Validate fields and set inline errors
                    let hasError = false;
                    
                    if (!newAppointmentData.patientId) {
                      setPatientError("Please select a patient.");
                      hasError = true;
                    }
                    
                    if (!selectedProviderId) {
                      setProviderError("Please select a provider.");
                      hasError = true;
                    }
                    
                    if (!selectedRole) {
                      toast({
                        title: "Missing Information",
                        description: "Please select a role.",
                        variant: "destructive",
                      });
                      hasError = true;
                    }
                    
                    if (!newAppointmentDate || !newSelectedTimeSlot) {
                      toast({
                        title: "Missing Information",
                        description: "Please select both date and time slot.",
                        variant: "destructive",
                      });
                      hasError = true;
                    }
                    
                    if (hasError) {
                      return;
                    }
                    
                    // Fetch doctor's fee
                    try {
                      const response = await apiRequest("GET", `/api/doctors-fee/${selectedProviderId}`);
                      if (!response.ok) {
                        throw new Error("Failed to fetch doctor's fee");
                      }
                      const feeData = await response.json();
                      setDoctorFee(feeData);
                      
                      // Initialize invoice data with fetched fee
                      const selectedDate = format(newAppointmentDate!, 'yyyy-MM-dd');
                      const today = format(new Date(), 'yyyy-MM-dd');
                      const dueDate = new Date();
                      dueDate.setDate(dueDate.getDate() + 30);
                      const dueDateStr = format(dueDate, 'yyyy-MM-dd');
                      
                      const selectedPatient = patientsData?.find((p: any) => p.id.toString() === newAppointmentData.patientId);
                      const providerName = usersData?.find((u: any) => u.id.toString() === selectedProviderId);
                      
                      setInvoiceData({
                        serviceDate: selectedDate,
                        doctor: `${providerName?.firstName || ''} ${providerName?.lastName || ''}`,
                        invoiceDate: today,
                        dueDate: dueDateStr,
                        services: [{
                          code: feeData.serviceCode || 'CONS-001',
                          description: feeData.serviceName || 'General Consultation',
                          quantity: 1,
                          amount: parseFloat(feeData.basePrice || '50.00')
                        }],
                        insuranceProvider: selectedPatient?.insuranceProvider || 'None (Patient Self-Pay)',
                        totalAmount: feeData.basePrice || '50.00',
                        notes: ''
                      });
                      
                      // Show invoice dialog
                      setShowInvoiceDialog(true);
                    } catch (error) {
                      console.error("Error fetching doctor's fee:", error);
                      toast({
                        title: "Error",
                        description: "Failed to fetch doctor's fee. Please try again.",
                        variant: "destructive",
                      });
                      return; // Stop if fee fetch fails
                    }
                  }}
                >
                  Create Appointment
                </Button>
              </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Appointment Confirmation Dialog */}
      <Dialog open={showConfirmationDialog} onOpenChange={setShowConfirmationDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-blue-800">Appointment Summary</DialogTitle>
            <DialogDescription>Please review the appointment details before confirming</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 mt-4">
            {/* Patient Information */}
            {newAppointmentData.patientId && patientsData && (() => {
              const selectedPatient = patientsData.find((p: any) => p.id.toString() === newAppointmentData.patientId);
              if (!selectedPatient) return null;
              
              return (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h3 className="text-sm font-semibold text-gray-800 mb-3">Patient Information</h3>
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-lg">
                      {selectedPatient.firstName?.charAt(0)}{selectedPatient.lastName?.charAt(0)}
                    </div>
                    <div className="flex-1 space-y-1 text-sm">
                      <p className="font-semibold text-gray-900">
                        {selectedPatient.firstName} {selectedPatient.lastName}
                      </p>
                      <p className="text-gray-600 text-xs">{selectedPatient.patientId}</p>
                      {selectedPatient.phone && (
                        <p className="text-gray-600 text-xs flex items-center gap-1">
                          📞 {selectedPatient.phone}
                        </p>
                      )}
                      {selectedPatient.email && (
                        <p className="text-gray-600 text-xs flex items-center gap-1">
                          ✉️ {selectedPatient.email}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Booking Summary */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Booking Summary</h3>
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-500 text-xs">Role</p>
                    <p className="font-medium text-gray-900">
                      {selectedRole ? selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1) : "Not selected"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Duration</p>
                    <p className="font-medium text-gray-900">{selectedDuration} minutes</p>
                  </div>
                </div>
                
                <div>
                  <p className="text-gray-500 text-xs">Provider</p>
                  <p className="font-medium text-gray-900">
                    {selectedProviderId && usersData
                      ? (() => {
                          const provider = usersData.find((u: any) => u.id.toString() === selectedProviderId);
                          return provider ? `${provider.firstName} ${provider.lastName}` : "Not selected";
                        })()
                      : "Not selected"}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-500 text-xs">Date</p>
                    <p className="font-medium text-gray-900">
                      {newAppointmentDate ? format(newAppointmentDate, 'MMM dd, yyyy') : "Not selected"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Time</p>
                    <p className="font-medium text-gray-900">
                      {newSelectedTimeSlot || "Not selected"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-6 border-t mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmationDialog(false);
              }}
            >
              Go Back
            </Button>
            <Button
              onClick={() => {
                // Create new datetime without timezone conversion
                const selectedDate = format(newAppointmentDate!, 'yyyy-MM-dd');
                const [time, period] = newSelectedTimeSlot.split(' ');
                const [hours, minutes] = time.split(':');
                let hour24 = parseInt(hours);
                
                if (period === 'PM' && hour24 !== 12) {
                  hour24 += 12;
                } else if (period === 'AM' && hour24 === 12) {
                  hour24 = 0;
                }
                
                const newScheduledAt = `${selectedDate}T${hour24.toString().padStart(2, '0')}:${minutes}:00.000Z`;
                
                // Generate title from patient and provider names
                const patientName = patientsData?.find((p: any) => p.id.toString() === newAppointmentData.patientId);
                const providerName = usersData?.find((u: any) => u.id.toString() === selectedProviderId);
                const generatedTitle = `${patientName?.firstName || 'Patient'} - ${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)} Appointment`;
                
                createAppointmentMutation.mutate({
                  patientId: parseInt(newAppointmentData.patientId),
                  providerId: parseInt(selectedProviderId),
                  assignedRole: selectedRole,
                  title: generatedTitle,
                  type: "consultation",
                  status: "scheduled",
                  scheduledAt: newScheduledAt,
                  duration: selectedDuration,
                  description: "",
                  createdBy: user?.id,
                });
                
                setShowConfirmationDialog(false);
                setShowNewAppointment(false); // Close main dialog
              }}
              disabled={createAppointmentMutation.isPending}
            >
              {createAppointmentMutation.isPending ? "Confirming..." : "Confirm"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create New Invoice Dialog */}
      <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-blue-800">Create New Invoice</DialogTitle>
            <DialogDescription>Invoice details for the appointment</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Patient</Label>
                <Input 
                  value={patientsData?.find((p: any) => p.id.toString() === newAppointmentData.patientId)?.firstName + ' ' + patientsData?.find((p: any) => p.id.toString() === newAppointmentData.patientId)?.lastName || ''}
                  disabled
                  className="bg-gray-100"
                />
              </div>
              <div>
                <Label>Service Date</Label>
                <Input 
                  type="date"
                  value={invoiceData.serviceDate}
                  onChange={(e) => setInvoiceData({...invoiceData, serviceDate: e.target.value})}
                />
              </div>
            </div>

            <div>
              <Label>Doctor</Label>
              <Input 
                value={invoiceData.doctor}
                disabled
                className="bg-gray-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Invoice Date</Label>
                <Input 
                  type="date"
                  value={invoiceData.invoiceDate}
                  onChange={(e) => setInvoiceData({...invoiceData, invoiceDate: e.target.value})}
                />
              </div>
              <div>
                <Label>Due Date</Label>
                <Input 
                  type="date"
                  value={invoiceData.dueDate}
                  onChange={(e) => setInvoiceData({...invoiceData, dueDate: e.target.value})}
                />
              </div>
            </div>

            <div className="border rounded p-4 bg-gray-50">
              <h5 className="font-semibold mb-2">Services & Procedures</h5>
              <div className="grid grid-cols-3 gap-2 mb-2 text-sm font-medium">
                <div>Code</div>
                <div>Description</div>
                <div>Amount</div>
              </div>
              {invoiceData.services.map((service: any, index: number) => (
                <div key={index} className="grid grid-cols-3 gap-2 mb-2">
                  <Input value={service.code} disabled className="bg-gray-100" />
                  <Input value={service.description} disabled className="bg-gray-100" />
                  <Input value={service.amount.toFixed(2)} disabled className="bg-gray-100" />
                </div>
              ))}
            </div>

            <div>
              <Label>Insurance Provider</Label>
              <Input 
                value={invoiceData.insuranceProvider}
                onChange={(e) => setInvoiceData({...invoiceData, insuranceProvider: e.target.value})}
              />
            </div>

            <div>
              <Label>Total Amount</Label>
              <Input 
                value={invoiceData.totalAmount}
                disabled
                className="bg-gray-100 font-bold text-lg"
              />
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea 
                value={invoiceData.notes}
                onChange={(e) => setInvoiceData({...invoiceData, notes: e.target.value})}
                placeholder="Add any additional notes about this invoice..."
              />
            </div>

            <div>
              <Label>Payment Method</Label>
              <Select
                value={invoiceData.paymentMethod}
                onValueChange={(value) => setInvoiceData({...invoiceData, paymentMethod: value})}
              >
                <SelectTrigger data-testid="select-payment-method">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Debit Card">Debit Card</SelectItem>
                  <SelectItem value="Credit Card">Credit Card</SelectItem>
                  <SelectItem value="Insurance">Insurance</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Check">Check</SelectItem>
                  <SelectItem value="Online Payment">Online Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowInvoiceDialog(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                // Close invoice dialog and show summary
                setShowInvoiceDialog(false);
                setShowInvoiceSummaryDialog(true);
              }}
            >
              Create Invoice
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invoice Summary Dialog */}
      <Dialog open={showInvoiceSummaryDialog} onOpenChange={setShowInvoiceSummaryDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-blue-800">Appointment & Invoice Summary</DialogTitle>
            <DialogDescription>Please review the appointment and invoice details before confirming</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 mt-4">
            {/* Invoice Summary */}
            <div className="border rounded-lg p-4 bg-blue-50">
              <h3 className="text-sm font-semibold text-blue-900 mb-3">Invoice Details</h3>
              <div className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-blue-600 text-xs">Patient</p>
                    <p className="font-medium text-blue-900">
                      {patientsData?.find((p: any) => p.id.toString() === newAppointmentData.patientId)?.firstName} {patientsData?.find((p: any) => p.id.toString() === newAppointmentData.patientId)?.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-blue-600 text-xs">Doctor</p>
                    <p className="font-medium text-blue-900">{invoiceData.doctor}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-blue-600 text-xs">Service Date</p>
                    <p className="font-medium text-blue-900">{invoiceData.serviceDate}</p>
                  </div>
                  <div>
                    <p className="text-blue-600 text-xs">Total Amount</p>
                    <p className="font-medium text-blue-900 text-lg">£{invoiceData.totalAmount}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Appointment Summary */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Appointment Details</h3>
              <div className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-500 text-xs">Date</p>
                    <p className="font-medium text-gray-900">
                      {newAppointmentDate ? format(newAppointmentDate, 'MMM dd, yyyy') : "Not selected"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Time Slot</p>
                    <p className="font-medium text-gray-900">{newSelectedTimeSlot || "Not selected"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-500 text-xs">Duration</p>
                    <p className="font-medium text-gray-900">{selectedDuration} minutes</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Type</p>
                    <p className="font-medium text-gray-900">Consultation</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-6 border-t mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setShowInvoiceSummaryDialog(false);
                setShowInvoiceDialog(true);
              }}
            >
              Go Back
            </Button>
            <Button
              onClick={async () => {
                try {
                  const selectedPatient = patientsData?.find((p: any) => p.id.toString() === newAppointmentData.patientId);
                  
                  // Create invoice first
                  const invoicePayload = {
                    patientId: selectedPatient?.patientId || '',
                    patientName: `${selectedPatient?.firstName || ''} ${selectedPatient?.lastName || ''}`,
                    nhsNumber: selectedPatient?.nhsNumber || '',
                    dateOfService: invoiceData.serviceDate,
                    invoiceDate: invoiceData.invoiceDate,
                    dueDate: invoiceData.dueDate,
                    status: 'draft',
                    invoiceType: 'payment',
                    subtotal: invoiceData.totalAmount,
                    tax: '0',
                    discount: '0',
                    totalAmount: invoiceData.totalAmount,
                    paidAmount: '0',
                    items: invoiceData.services,
                    insuranceProvider: invoiceData.insuranceProvider,
                    notes: invoiceData.notes,
                    paymentMethod: invoiceData.paymentMethod
                  };
                  
                  console.log("Creating invoice with payload:", invoicePayload);
                  await createInvoiceMutation.mutateAsync(invoicePayload);
                  
                  // Create appointment
                  const selectedDate = format(newAppointmentDate!, 'yyyy-MM-dd');
                  const [time, period] = newSelectedTimeSlot.split(' ');
                  const [hours, minutes] = time.split(':');
                  let hour24 = parseInt(hours);
                  
                  if (period === 'PM' && hour24 !== 12) {
                    hour24 += 12;
                  } else if (period === 'AM' && hour24 === 12) {
                    hour24 = 0;
                  }
                  
                  const newScheduledAt = `${selectedDate}T${hour24.toString().padStart(2, '0')}:${minutes}:00.000Z`;
                  const providerName = usersData?.find((u: any) => u.id.toString() === selectedProviderId);
                  const generatedTitle = `${selectedPatient?.firstName || 'Patient'} - ${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)} Appointment`;
                  
                  const appointmentPayload = {
                    patientId: parseInt(newAppointmentData.patientId),
                    providerId: parseInt(selectedProviderId),
                    assignedRole: selectedRole,
                    title: generatedTitle,
                    type: "consultation",
                    status: "scheduled",
                    scheduledAt: newScheduledAt,
                    duration: selectedDuration,
                    description: "",
                    createdBy: user?.id,
                  };
                  
                  console.log("Creating appointment with payload:", appointmentPayload);
                  await createAppointmentMutation.mutateAsync(appointmentPayload);
                  
                  // Invalidate queries to refresh data
                  queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
                  
                  // Close all dialogs
                  setShowInvoiceSummaryDialog(false);
                  setShowNewAppointment(false);
                  
                  // Show success
                  toast({
                    title: "Appointment Created",
                    description: "Appointment and invoice have been created successfully.",
                  });
                  
                  // Reset form and invoice data
                  setNewAppointmentDate(undefined);
                  setNewSelectedTimeSlot("");
                  setSelectedRole("");
                  setSelectedProviderId("");
                  setSelectedDuration(30);
                  setNewAppointmentData({
                    title: "",
                    type: "consultation",
                    patientId: "",
                    description: "",
                  });
                  setInvoiceData({
                    serviceDate: "",
                    doctor: "",
                    invoiceDate: "",
                    dueDate: "",
                    services: [],
                    insuranceProvider: "",
                    totalAmount: "0.00",
                    notes: "",
                    paymentMethod: ""
                  });
                } catch (error) {
                  console.error("Error creating appointment and invoice:", error);
                  toast({
                    title: "Creation Failed",
                    description: error instanceof Error ? error.message : "Failed to create appointment and invoice. Please try again.",
                    variant: "destructive",
                  });
                }
              }}
              disabled={createAppointmentMutation.isPending || createInvoiceMutation.isPending}
            >
              {(createAppointmentMutation.isPending || createInvoiceMutation.isPending) ? "Confirming..." : "Confirm"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Validation Error Dialog */}
      <Dialog open={showValidationError} onOpenChange={setShowValidationError}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-600">Insufficient Time Available</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-gray-700">{validationErrorMessage}</p>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => {
                setShowValidationError(false);
              }}
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-green-600">Success</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-gray-700">The appointment has been successfully created.</p>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => {
                setShowSuccessModal(false);
                setShowNewAppointment(false);
                setNewAppointmentDate(undefined);
                setNewSelectedTimeSlot("");
                setSelectedRole("");
                setSelectedProviderId("");
                setSelectedDuration(30);
                setNewAppointmentData({
                  title: "",
                  type: "consultation",
                  patientId: "",
                  description: "",
                });
              }}
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Success Modal */}
      <Dialog open={showEditSuccessModal} onOpenChange={setShowEditSuccessModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-green-600">Success</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-gray-700">Appointment updated successfully.</p>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => {
                setShowEditSuccessModal(false);
                setEditingAppointment(null);
                setEditAppointmentDate(undefined);
                setEditSelectedTimeSlot("");
              }}
              data-testid="button-edit-success-ok"
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Appointment Dialog */}
      <Dialog open={showEditAppointment} onOpenChange={setShowEditAppointment}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {editingAppointment && (
            <div className="p-2">
              <DialogHeader className="mb-6">
                <DialogTitle className="text-xl font-bold text-blue-800">
                  Edit Appointment
                </DialogTitle>
                <DialogDescription>
                  Update appointment details for {getPatientName(editingAppointment.patientId)}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Title and Type Row */}
                <div className="grid grid-cols-2 gap-6">
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

                {/* Date and Time Selection - Side by Side Layout */}
                <div className="grid grid-cols-2 gap-8">
                  {/* Date Selection */}
                  <div>
                    <Label className="text-lg font-semibold text-gray-800 mb-3 block">Select Date</Label>
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <CalendarComponent
                        mode="single"
                        selected={editAppointmentDate}
                        onSelect={(date) => {
                          setEditAppointmentDate(date);
                          if (date && editSelectedTimeSlot) {
                            const timeSlot = editSelectedTimeSlot;
                            // Parse time slot to get hours and minutes
                            const [time, period] = timeSlot.split(' ');
                            const [hours, minutes] = time.split(':').map(Number);
                            const hour24 = period === 'AM' ? (hours === 12 ? 0 : hours) : (hours === 12 ? 12 : hours + 12);
                            
                            // Create new date with correct local time (no timezone conversion)
                            const newDateTime = new Date(date);
                            newDateTime.setHours(hour24, minutes, 0, 0);
                            setEditingAppointment({ ...editingAppointment, scheduledAt: newDateTime.toISOString() });
                          }
                        }}
                        disabled={(date: Date) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          
                          if (date < today) return true;
                          
                          // *** FIX: Use hasShiftsOnDateForEdit for Edit mode to check editing appointment's provider ***
                          return !hasShiftsOnDateForEdit(date);
                        }}
                        className="rounded-md"
                        initialFocus
                      />
                    </div>
                  </div>

                  {/* Time Slot Selection */}
                  <div>
                    <Label className="text-lg font-semibold text-gray-800 mb-3 block">Select Time Slot</Label>
                    {/* Color Legend */}
                    <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                      <div className="text-xs font-medium text-gray-700 mb-1">Legend:</div>
                      <div className="flex flex-wrap gap-3 text-xs">
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-green-500 rounded"></div>
                          <span>Available</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-orange-500 rounded"></div>
                          <span>Current</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-blue-500 rounded"></div>
                          <span>Selected</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-gray-600 rounded opacity-60"></div>
                          <span>Booked/Blocked</span>
                        </div>
                      </div>
                    </div>
                    <div className="border rounded-lg p-4 bg-gray-50 h-[300px] overflow-y-auto">
                      {/* *** CHANGE 5: Use editTimeSlots instead of timeSlots *** */}
                      {editTimeSlots.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-gray-500">
                          No available time slots for this date. Please select a different date.
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {editTimeSlots.map((slot) => {
                            const isAvailable = editAppointmentDate ? isTimeSlotAvailable(editAppointmentDate, slot) : true;
                            
                            // Get the original appointment time slot (read as local time)
                            const originalTimeSlot = (() => {
                              const date = new Date(editingAppointment.scheduledAt);
                              const hours = date.getHours();
                              const minutes = date.getMinutes();
                              const period = hours >= 12 ? 'PM' : 'AM';
                              const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
                              return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
                            })();
                            const isOriginalSlot = slot === originalTimeSlot;
                            
                            // Check if this slot is selected (newly chosen by user)
                            const isSelected = editSelectedTimeSlot === slot || 
                              (editSelectedTimeSlot === "" && isOriginalSlot);
                            
                            // Determine if user changed to a different slot
                            const isNewlySelected = editSelectedTimeSlot === slot && !isOriginalSlot;
                            
                            return (
                              <Button
                                key={slot}
                                variant={isSelected ? "default" : "outline"}
                                className={`h-12 text-sm font-medium ${
                                  !isAvailable 
                                    ? "bg-gray-600 text-white cursor-not-allowed border-gray-700 opacity-60 line-through" 
                                    : isNewlySelected
                                      ? "bg-blue-500 hover:bg-blue-600 text-white border-blue-500"
                                    : isOriginalSlot 
                                      ? "bg-orange-500 hover:bg-orange-600 text-white border-orange-500" 
                                      : "bg-green-500 hover:bg-green-600 text-white border-green-500"
                                }`}
                                disabled={!isAvailable}
                                onClick={() => {
                                  // Validate if enough consecutive slots are available for the appointment duration
                                  const duration = editingAppointment.duration || 30;
                                  const availabilityCheck = checkConsecutiveSlotsAvailable(editAppointmentDate!, slot, duration);
                                  
                                  if (!availabilityCheck.available) {
                                    // Show warning dialog with available time
                                    setInsufficientTimeMessage(
                                      `Only ${availabilityCheck.availableMinutes} minutes are available at ${slot}. Please select another time slot.`
                                    );
                                    setShowInsufficientTimeWarning(true);
                                    return;
                                  }
                                  
                                  setEditSelectedTimeSlot(slot);
                                  if (editAppointmentDate) {
                                    // Parse time slot to get hours and minutes
                                    const [time, period] = slot.split(' ');
                                    const [hours, minutes] = time.split(':').map(Number);
                                    const hour24 = period === 'AM' ? (hours === 12 ? 0 : hours) : (hours === 12 ? 12 : hours + 12);
                                    
                                    // Create new date with correct local time (no timezone conversion)
                                    const newDateTime = new Date(editAppointmentDate);
                                    newDateTime.setHours(hour24, minutes, 0, 0);
                                    setEditingAppointment({ ...editingAppointment, scheduledAt: newDateTime.toISOString() });
                                  }
                                }}
                              >
                                {slot}
                              </Button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status, Duration and Description Row */}
                <div className="grid grid-cols-3 gap-6">
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
                    <Label className="text-sm font-medium text-gray-600">Duration (minutes)</Label>
                    <Select 
                      defaultValue={String(editingAppointment.duration || 30)}
                      onValueChange={(value) => {
                        setEditingAppointment({ ...editingAppointment, duration: parseInt(value) });
                      }}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">60 minutes</SelectItem>
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
                </div>

                <div className="flex justify-end space-x-2 pt-4">
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
                      // *** CHANGE 3: Validate date and time slot selection ***
                      if (!editAppointmentDate || !editSelectedTimeSlot) {
                        toast({
                          title: "Missing Information",
                          description: "Please select both date and time slot.",
                          variant: "destructive",
                        });
                        return;
                      }
                      
                      // *** CHANGE 3: Check for appointment conflicts before saving ***
                      const isSlotAvailable = isTimeSlotAvailable(editAppointmentDate, editSelectedTimeSlot);
                      
                      if (!isSlotAvailable) {
                        console.log('[Edit Appointment] Validation failed - slot not available');
                        toast({
                          title: "Time Slot Unavailable",
                          description: "This time slot is already booked or blocked. Please select a different time.",
                          variant: "destructive",
                        });
                        return;
                      }
                      
                      console.log('[Edit Appointment] Validation passed - proceeding with update');
                      
                      // Create new datetime without timezone conversion
                      const selectedDate = format(editAppointmentDate, 'yyyy-MM-dd');
                      const [time, period] = editSelectedTimeSlot.split(' ');
                      const [hours, minutes] = time.split(':');
                      let hour24 = parseInt(hours);
                      
                      if (period === 'PM' && hour24 !== 12) {
                        hour24 += 12;
                      } else if (period === 'AM' && hour24 === 12) {
                        hour24 = 0;
                      }
                      
                      const newScheduledAt = `${selectedDate}T${hour24.toString().padStart(2, '0')}:${minutes}:00.000Z`;
                      
                      console.log('[Edit Appointment] Submitting update:', {
                        appointmentId: editingAppointment.id,
                        newScheduledAt,
                        title: editingAppointment.title,
                        status: editingAppointment.status
                      });
                      
                      editAppointmentMutation.mutate({
                        id: editingAppointment.id,
                        data: {
                          title: editingAppointment.title,
                          type: editingAppointment.type,
                          status: editingAppointment.status,
                          // *** FIX: Convert ISO string to Date object for database ***
                          scheduledAt: new Date(newScheduledAt),
                          description: editingAppointment.description,
                          duration: editingAppointment.duration,
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

      {/* Insufficient Time Available Warning Dialog */}
      <Dialog open={showInsufficientTimeWarning} onOpenChange={setShowInsufficientTimeWarning}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-600">Insufficient Time Available</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-gray-700">{insufficientTimeMessage}</p>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => {
                setShowInsufficientTimeWarning(false);
                setInsufficientTimeMessage("");
              }}
              className="bg-blue-500 hover:bg-blue-600"
              data-testid="button-insufficient-time-ok"
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}