import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarContent, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Stethoscope,
  User,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Edit,
} from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useState, useMemo, useEffect } from "react";
import { isDoctorLike } from "@/lib/role-utils";
import type { User as Doctor, Appointment } from "@shared/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface DoctorListProps {
  onSelectDoctor?: (doctor: Doctor) => void;
  showAppointmentButton?: boolean;
  filterRole?: string;
  filterSearch?: string;
}

const departmentColors = {
  Cardiology: "bg-red-100 text-red-800",
  "General Medicine": "bg-blue-100 text-blue-800",
  Pediatrics: "bg-green-100 text-green-800",
  Orthopedics: "bg-purple-100 text-purple-800",
  Neurology: "bg-indigo-100 text-indigo-800",
  Dermatology: "bg-yellow-100 text-yellow-800",
  Psychiatry: "bg-pink-100 text-pink-800",
  Surgery: "bg-gray-100 text-gray-800",
  Emergency: "bg-orange-100 text-orange-800",
  Administration: "bg-slate-100 text-slate-800",
};

const roleColors = {
  doctor: "bg-blue-100 text-blue-800",
  nurse: "bg-green-100 text-green-800",
  admin: "bg-purple-100 text-purple-800",
  receptionist: "bg-orange-100 text-orange-800",
};

// Helper function to get the correct tenant subdomain
function getTenantSubdomain(): string {
  const storedSubdomain = localStorage.getItem('user_subdomain');
  if (storedSubdomain) {
    return storedSubdomain;
  }
  
  const urlParams = new URLSearchParams(window.location.search);
  const subdomainParam = urlParams.get('subdomain');
  if (subdomainParam) {
    return subdomainParam;
  }
  
  const hostname = window.location.hostname;
  if (hostname.includes('.replit.app') || hostname.includes('localhost') || hostname.includes('replit.dev') || hostname.includes('127.0.0.1')) {
    return 'demo';
  }
  
  const parts = hostname.split('.');
  if (parts.length >= 2) {
    return parts[0] || 'demo';
  }
  
  return 'demo';
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function DoctorList({
  onSelectDoctor,
  showAppointmentButton = false,
  filterRole = "all",
  filterSearch = "",
}: DoctorListProps) {
  const [, setLocation] = useLocation();
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [workingDays, setWorkingDays] = useState<string[]>([]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  
  // Medical Specialty Filter state
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>("all");
  const [openSpecialtyCombobox, setOpenSpecialtyCombobox] = useState(false);

  // Booking dialog state
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedBookingDoctor, setSelectedBookingDoctor] =
    useState<Doctor | null>(null);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("");
  const [appointmentType, setAppointmentType] = useState("Consultation");
  const [duration, setDuration] = useState("30");
  const [appointmentTitle, setAppointmentTitle] = useState("");
  const [appointmentDescription, setAppointmentDescription] = useState("");
  const [appointmentLocation, setAppointmentLocation] = useState("");
  
  // Confirmation dialog state
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  
  // Insufficient time alert state
  const [showInsufficientTimeModal, setShowInsufficientTimeModal] = useState(false);
  const [insufficientTimeMessage, setInsufficientTimeMessage] = useState("");
  
  // Track currently booking slot to prevent duplicates
  const [bookingInProgress, setBookingInProgress] = useState<string | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const {
    data: medicalStaffResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/medical-staff"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/medical-staff");
      const data = await response.json();
      return data;
    },
    enabled: true,
  });

  const medicalStaff = medicalStaffResponse?.staff || [];
  const totalDoctors = medicalStaffResponse?.totalDoctors || 0;
  const availableDoctors = medicalStaffResponse?.availableDoctors || 0;

  // Fetch doctor's appointments to show their patients (for doctor role only)
  const { data: doctorAppointments } = useQuery({
    queryKey: ["/api/appointments", "doctor-patients", user?.id],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/appointments");
      const data = await response.json();
      return data;
    },
    enabled: isDoctorLike(user?.role),
  });

  // Fetch patients for dropdown
  const { data: patients } = useQuery({
    queryKey: ["/api/patients"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/patients");
      const data = await response.json();
      return data;
    },
    enabled: isBookingOpen,
  });

  // Fetch all shifts for the selected doctor to determine available dates
  const { data: allDoctorShifts } = useQuery({
    queryKey: ["/api/shifts/doctor", selectedBookingDoctor?.id],
    staleTime: 30000,
    enabled: isBookingOpen && !!selectedBookingDoctor?.id,
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/shifts?staffId=${selectedBookingDoctor!.id}`);
      const data = await response.json();
      return data;
    },
  });

  // Fetch default shifts for fallback when custom shifts don't exist
  const { data: defaultShiftsData = [] } = useQuery({
    queryKey: ["/api/default-shifts", "forBooking"],
    staleTime: 60000,
    enabled: isBookingOpen && !!user,
    retry: false,
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/default-shifts?forBooking=true');
        if (!response.ok) {
          return [];
        }
        const data = await response.json();
        return data;
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch shifts for the selected date and doctor
  const { data: shiftsData } = useQuery({
    queryKey: ["/api/shifts", selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null],
    staleTime: 30000,
    enabled: !!selectedDate && isBookingOpen,
    queryFn: async () => {
      const dateStr = format(selectedDate!, 'yyyy-MM-dd');
      const response = await apiRequest('GET', `/api/shifts?date=${dateStr}`);
      const data = await response.json();
      return data;
    },
  });

  // Fetch all appointments for availability checking
  const { data: appointments } = useQuery({
    queryKey: ["/api/appointments"],
    staleTime: 30000,
    enabled: isBookingOpen,
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/appointments');
      const data = await response.json();
      return data;
    },
  });

  // Auto-select first available date when booking dialog opens and data is loaded
  const [hasAutoSelectedDate, setHasAutoSelectedDate] = useState(false);

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

  // Check if a time slot is available
  const isTimeSlotAvailable = (date: Date, timeSlot: string) => {
    if (!date || !timeSlot || !appointments) return true;
    
    const selectedDateString = format(date, 'yyyy-MM-dd');
    const slot24Hour = timeSlotTo24Hour(timeSlot);
    
    // Check if this slot is currently being booked
    if (bookingInProgress) {
      const bookingKey = `${selectedDateString}_${slot24Hour}_${selectedBookingDoctor?.id}`;
      if (bookingInProgress === bookingKey) {
        return false;
      }
    }
    
    // Convert the time slot to minutes (this represents the START time of the slot)
    const [time, period] = timeSlot.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    let hour24 = hours;
    if (period === 'PM' && hours !== 12) hour24 += 12;
    if (period === 'AM' && hours === 12) hour24 = 0;
    const slotStartMinutes = hour24 * 60 + minutes;
    const slotEndMinutes = slotStartMinutes + 15;
    
    // Check if this slot overlaps with any existing appointment for this doctor
    const isBooked = appointments.some((apt: any) => {
      // Only check appointments for the selected doctor
      if (selectedBookingDoctor && apt.providerId !== selectedBookingDoctor.id) {
        return false;
      }
      
      // Parse the scheduledAt directly without timezone conversion
      const aptDateString = apt.scheduledAt.substring(0, 10);
      
      // Only check appointments on the same date
      if (aptDateString !== selectedDateString) return false;
      
      // Extract time in 24-hour format
      const timeString = apt.scheduledAt.substring(11, 16);
      const [aptHour, aptMinute] = timeString.split(':').map(Number);
      const aptStartMinutes = aptHour * 60 + aptMinute;
      const aptDuration = apt.duration || 30;
      const aptEndMinutes = aptStartMinutes + aptDuration;
      
      // Check if this 15-minute slot overlaps with the existing appointment
      return slotStartMinutes < aptEndMinutes && slotEndMinutes > aptStartMinutes;
    });
    
    return !isBooked;
  };

  // Check if sufficient consecutive time is available for the selected duration
  const checkSufficientTime = (startTimeSlot: string, durationMinutes: number): { available: boolean; availableMinutes: number } => {
    if (!selectedDate || !selectedBookingDoctor) return { available: false, availableMinutes: 0 };

    const startTime24 = timeSlotTo24Hour(startTimeSlot);
    const [startHour, startMinute] = startTime24.split(':').map(Number);

    // Generate all 15-minute slots needed for the duration
    const slotsNeeded = Math.ceil(durationMinutes / 15);
    let availableMinutes = 0;
    
    for (let i = 0; i < slotsNeeded; i++) {
      let currentMinute = startMinute + (i * 15);
      let currentHour = startHour;
      
      if (currentMinute >= 60) {
        currentHour += Math.floor(currentMinute / 60);
        currentMinute = currentMinute % 60;
      }

      // Convert to 12-hour format to match timeSlots array
      const hour12 = currentHour === 0 ? 12 : currentHour > 12 ? currentHour - 12 : currentHour;
      const period = currentHour < 12 ? 'AM' : 'PM';
      const timeSlotStr = `${hour12}:${currentMinute.toString().padStart(2, '0')} ${period}`;

      // Check if this slot exists and is available
      if (!timeSlots.includes(timeSlotStr) || !isTimeSlotAvailable(selectedDate, timeSlotStr)) {
        return { available: false, availableMinutes };
      }
      
      availableMinutes += 15;
    }

    return { available: true, availableMinutes };
  };

  // Generate time slots based on shifts from database (15-minute intervals)
  // Two-tier system: Use custom shifts first, fall back to default shifts if no custom shift exists
  const timeSlots = useMemo(() => {
    // If no doctor or date selected, return empty array
    if (!selectedBookingDoctor || !selectedDate) {
      return [];
    }

    let shiftsToUse: any[] = [];

    // First, check if there are custom shifts for the selected date
    if (shiftsData) {
      const customShifts = shiftsData.filter((shift: any) => 
        shift.staffId === selectedBookingDoctor.id
      );
      
      if (customShifts.length > 0) {
        shiftsToUse = customShifts;
      }
    }

    // If no custom shifts, fall back to default shifts
    if (shiftsToUse.length === 0 && defaultShiftsData && defaultShiftsData.length > 0) {
      const dayOfWeek = format(selectedDate, 'EEEE');
      
      const defaultShift = defaultShiftsData.find((shift: any) => 
        shift.userId === selectedBookingDoctor.id
      );
      
      // Only use default shift if the selected date's day is in working days
      if (defaultShift && defaultShift.workingDays && defaultShift.workingDays.includes(dayOfWeek)) {
        shiftsToUse = [defaultShift];
      }
    }

    // If still no shifts found, return empty array
    if (shiftsToUse.length === 0) {
      return [];
    }

    const allSlots: string[] = [];

    // Generate time slots for each shift (15-minute intervals)
    for (const shift of shiftsToUse) {
      const [startHour, startMinute] = shift.startTime.split(':').map(Number);
      const [endHour, endMinute] = shift.endTime.split(':').map(Number);

      let currentHour = startHour;
      let currentMinute = startMinute;

      while (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute)) {
        const hour12 = currentHour === 0 ? 12 : currentHour > 12 ? currentHour - 12 : currentHour;
        const period = currentHour < 12 ? 'AM' : 'PM';
        const timeString = `${hour12}:${currentMinute.toString().padStart(2, '0')} ${period}`;
        
        if (!allSlots.includes(timeString)) {
          allSlots.push(timeString);
        }

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

    return allSlots;
  }, [selectedBookingDoctor, selectedDate, shiftsData, defaultShiftsData]);

  const updateScheduleMutation = useMutation({
    mutationFn: async (data: {
      userId: number;
      workingDays: string[];
      workingHours: { start: string; end: string };
    }) => {
      const response = await apiRequest("PATCH", `/api/users/${data.userId}`, {
        workingDays: data.workingDays,
        workingHours: data.workingHours,
      });
      return await response.json();
    },
    onSuccess: (updatedUserData) => {
      toast({
        title: "Schedule Updated",
        description: "Doctor's schedule has been updated successfully.",
      });

      // Update the selectedDoctor with fresh data from server
      if (selectedDoctor && updatedUserData) {
        const newDoctor = {
          ...selectedDoctor,
          workingDays: updatedUserData.workingDays || [],
          workingHours: updatedUserData.workingHours || {
            start: "09:00",
            end: "17:00",
          },
        };
        setSelectedDoctor(newDoctor);

        // Also update the form fields to show the new values
        setWorkingDays(updatedUserData.workingDays || []);
        setStartTime(updatedUserData.workingHours?.start || "09:00");
        setEndTime(updatedUserData.workingHours?.end || "17:00");
      }

      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/medical-staff"] });

      // Close the dialog after brief delay to show the update
      setTimeout(() => {
        setIsScheduleOpen(false);
      }, 1000);
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update schedule",
        variant: "destructive",
      });
    },
  });

  // Appointment booking mutation
  const bookAppointmentMutation = useMutation({
    mutationFn: async (appointmentData: any) => {
      const response = await apiRequest(
        "POST",
        "/api/appointments",
        appointmentData,
      );
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate queries to refresh appointment data and availability
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({
        queryKey: [
          "/api/appointments",
          selectedBookingDoctor?.id,
          selectedDate,
        ],
      });

      // Clear booking in progress
      setBookingInProgress(null);

      // Close confirmation dialog and show success modal
      setIsConfirmationOpen(false);
      setIsBookingOpen(false);
      setIsSuccessModalOpen(true);
    },
    onError: (error: any) => {
      toast({
        title: "Booking Failed",
        description:
          error.message || "Failed to book appointment. Please try again.",
        variant: "destructive",
      });
      
      // Clear booking in progress
      setBookingInProgress(null);
      setIsConfirmationOpen(false);
    },
  });

  const openScheduleDialog = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setWorkingDays(doctor.workingDays || []);
    const hours =
      (doctor.workingHours as { start?: string; end?: string }) || {};
    setStartTime(hours.start || "09:00");
    setEndTime(hours.end || "17:00");
    setIsScheduleOpen(true);
  };

  const handleBookAppointment = () => {
    if (
      !selectedPatient ||
      !selectedDate ||
      !selectedTimeSlot ||
      !selectedBookingDoctor
    ) {
      return;
    }

    // Convert selectedTimeSlot from 24-hour format (HH:MM) to 12-hour format for validation
    const [hours, minutes] = selectedTimeSlot.split(":").map(Number);
    const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    const period = hours < 12 ? 'AM' : 'PM';
    const timeSlot12Hour = `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
    
    // Validate sufficient time is available for the selected duration
    const { available, availableMinutes } = checkSufficientTime(timeSlot12Hour, parseInt(duration));
    
    if (!available) {
      setInsufficientTimeMessage(
        `Only ${availableMinutes} minutes are available at ${timeSlot12Hour}. Please select another time slot.`
      );
      setShowInsufficientTimeModal(true);
      return;
    }

    // Create the appointment datetime string without timezone conversion
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const day = String(selectedDate.getDate()).padStart(2, "0");
    const hourStr = String(hours).padStart(2, "0");
    const minuteStr = String(minutes).padStart(2, "0");
    
    const scheduledAtString = `${year}-${month}-${day}T${hourStr}:${minuteStr}:00`;
    const selectedDateString = format(selectedDate, 'yyyy-MM-dd');
    
    // Mark this slot as being booked to prevent duplicates
    const bookingKey = `${selectedDateString}_${selectedTimeSlot}_${selectedBookingDoctor.id}`;
    setBookingInProgress(bookingKey);

    const appointmentData = {
      patientId: parseInt(selectedPatient),
      providerId: selectedBookingDoctor.id,
      title:
        appointmentTitle ||
        `${appointmentType} with ${selectedBookingDoctor.firstName} ${selectedBookingDoctor.lastName}`,
      description: appointmentDescription || `${appointmentType} appointment`,
      scheduledAt: scheduledAtString,
      duration: parseInt(duration),
      type: appointmentType.toLowerCase().replace("-", "_") as
        | "consultation"
        | "follow_up"
        | "procedure",
      location:
        appointmentLocation ||
        `${selectedBookingDoctor.department || "General"} Department`,
      status: "scheduled",
      isVirtual: false,
      createdBy: user?.id,
    };

    bookAppointmentMutation.mutate(appointmentData);
  };

  const openBookingDialog = (doctor: Doctor) => {
    setSelectedBookingDoctor(doctor);
    // Auto-select the logged-in patient if user is a patient
    if (patients && patients.length > 0) {
      if (user?.role === 'patient') {
        // Find the patient record matching the logged-in user by email
        const currentPatient = patients.find((patient: any) => 
          patient.email && user?.email && patient.email.toLowerCase() === user.email.toLowerCase()
        ) || patients.find((patient: any) => 
          patient.firstName && user?.firstName && patient.lastName && user?.lastName &&
          patient.firstName.toLowerCase() === user.firstName.toLowerCase() && 
          patient.lastName.toLowerCase() === user.lastName.toLowerCase()
        );
        
        if (currentPatient) {
          setSelectedPatient(currentPatient.id.toString());
        } else {
          setSelectedPatient(patients[0].id.toString());
        }
      } else {
        // For non-patient users, select the first patient
        setSelectedPatient(patients[0].id.toString());
      }
    } else {
      setSelectedPatient("");
    }
    setSelectedDate(undefined);
    setSelectedTimeSlot("");
    setAppointmentType("Consultation");
    setDuration("30");
    setAppointmentTitle("");
    setAppointmentDescription("");
    setAppointmentLocation("");
    setBookingInProgress(null);
    setIsBookingOpen(true);
  };

  const handleScheduleUpdate = () => {
    if (!selectedDoctor) return;

    updateScheduleMutation.mutate({
      userId: selectedDoctor.id,
      workingDays,
      workingHours: { start: startTime, end: endTime },
    });
  };

  const toggleWorkingDay = (day: string) => {
    setWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  // Check if a date has shifts in the database (custom shifts OR default shifts)
  const hasShiftsOnDate = (date: Date): boolean => {
    if (!selectedBookingDoctor) return false;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // First check if there are custom shifts for this specific date
    if (allDoctorShifts) {
      const hasCustomShift = allDoctorShifts.some((shift: any) => {
        const shiftDateStr = shift.date.substring(0, 10);
        return shiftDateStr === dateStr && shift.staffId === selectedBookingDoctor.id;
      });
      
      if (hasCustomShift) {
        return true;
      }
    }
    
    // If no custom shift, check if there's a default shift with this day in working days
    if (defaultShiftsData && defaultShiftsData.length > 0) {
      const dayOfWeek = format(date, 'EEEE'); // Get day name (e.g., "Monday")
      
      const defaultShift = defaultShiftsData.find((shift: any) => 
        shift.userId === selectedBookingDoctor.id
      );
      
      if (defaultShift && defaultShift.workingDays && defaultShift.workingDays.includes(dayOfWeek)) {
        return true;
      }
    }
    
    return false;
  };

  // Auto-select first available date when booking dialog opens and data is loaded
  useEffect(() => {
    if (isBookingOpen && selectedBookingDoctor) {
      // Reset selectedDate and auto-select flag when doctor changes or dialog opens
      setSelectedDate(undefined);
      setHasAutoSelectedDate(false);
      
      // Wait a bit for data to load
      const timeoutId = setTimeout(() => {
        // Find the first available date starting from today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Check up to 60 days ahead
        for (let i = 0; i < 60; i++) {
          const checkDate = new Date(today);
          checkDate.setDate(today.getDate() + i);
          
          if (hasShiftsOnDate(checkDate)) {
            setSelectedDate(checkDate);
            setHasAutoSelectedDate(true);
            break;
          }
        }
      }, 300);
      
      return () => clearTimeout(timeoutId);
    }
    
    // Reset auto-select flag when dialog closes
    if (!isBookingOpen && hasAutoSelectedDate) {
      setHasAutoSelectedDate(false);
    }
  }, [isBookingOpen, selectedBookingDoctor, allDoctorShifts, defaultShiftsData]);

  // Format time to 12-hour format for display
  const formatTime = (time: string): string => {
    if (!time) return "";
    
    // Handle 24-hour format like "14:30"
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes || '00'} ${ampm}`;
  };

  // Filter to show available staff or patients based on user role
  // For patient role: show all users except admin and patient
  // For doctor role: show patients who have appointments with them
  // For admin role: show only doctors who are available today
  const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
  
  // For doctors: extract unique patients from their appointments
  const doctorPatients = useMemo(() => {
    if (!isDoctorLike(user?.role) || !user || !doctorAppointments || !patients) {
      return [];
    }

    // Get unique patient IDs from doctor's appointments
    const patientIds = new Set(
      doctorAppointments
        .filter((apt: any) => apt.providerId === user.id)
        .map((apt: any) => apt.patientId)
    );

    // Return patients who have appointments with this doctor
    return patients.filter((patient: any) => patientIds.has(patient.id));
  }, [user, doctorAppointments, patients]);

  // Get unique medical specialties from doctors
  const uniqueSpecialties = useMemo(() => {
    const specialties = new Set<string>();
    medicalStaff.forEach((staff: Doctor) => {
      if (staff.role === 'doctor' && staff.medicalSpecialtyCategory) {
        specialties.add(staff.medicalSpecialtyCategory);
      }
    });
    return Array.from(specialties).sort();
  }, [medicalStaff]);

  const availableStaff = useMemo(() => {
    // If logged-in user is a doctor, show their patients
    if (isDoctorLike(user?.role)) {
      return doctorPatients;
    }

    // If logged-in user is a patient, show all users except patient, admin, sample_taker, lab_technician
    if (user?.role === 'patient') {
      return medicalStaff.filter((doctor: Doctor) => {
        // Exclude patient, admin, sample_taker, lab_technician roles
        if (doctor.role === 'admin' || doctor.role === 'patient' || doctor.role === 'sample_taker' || doctor.role === 'lab_technician') {
          return false;
        }
        
        // Apply role filter if a specific role is selected
        if (filterRole !== 'all' && filterRole !== '' && doctor.role !== filterRole) {
          return false;
        }
        
        // Apply medical specialty filter when role is doctor
        if (filterRole === 'doctor' && selectedSpecialty !== 'all') {
          if (doctor.medicalSpecialtyCategory !== selectedSpecialty) {
            return false;
          }
        }
        
        return true;
      });
    }
    
    // For admin role: show all users except patient, admin, sample_taker, lab_technician, with role filter and search
    if (user?.role === 'admin') {
      return medicalStaff.filter((staff: Doctor) => {
        // Exclude patient, admin, sample_taker, lab_technician roles
        if (staff.role === 'patient' || staff.role === 'admin' || staff.role === 'sample_taker' || staff.role === 'lab_technician') {
          return false;
        }
        
        // Apply role filter if a specific role is selected
        if (filterRole !== 'all' && filterRole !== '' && staff.role !== filterRole) {
          return false;
        }
        
        // Apply medical specialty filter when role is doctor
        if (filterRole === 'doctor' && selectedSpecialty !== 'all') {
          if (staff.medicalSpecialtyCategory !== selectedSpecialty) {
            return false;
          }
        }
        
        // Apply search filter
        if (filterSearch.trim()) {
          const query = filterSearch.toLowerCase();
          const fullName = `${staff.firstName} ${staff.lastName}`.toLowerCase();
          const email = (staff.email || '').toLowerCase();
          const specialization = (staff.medicalSpecialtyCategory || '').toLowerCase();
          const department = (staff.department || '').toLowerCase();
          
          const matches = 
            fullName.includes(query) ||
            email.includes(query) ||
            specialization.includes(query) ||
            department.includes(query);
            
          if (!matches) {
            return false;
          }
        }
        
        return true;
      });
    }
    
    // For other roles: show only doctors who are available today
    return medicalStaff.filter((doctor: Doctor) => {
      if (!isDoctorLike(doctor.role)) {
        return false;
      }
      // If no working days are set, staff is considered available (like mobile users)
      if (!doctor.workingDays || doctor.workingDays.length === 0) {
        return true;
      }
      // If working days are set, check if today is included
      return doctor.workingDays.includes(today);
    });
  }, [user, doctorPatients, medicalStaff, filterRole, filterSearch, selectedSpecialty, today]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (availableStaff.length === 0) {
    return (
      <Card>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            {isDoctorLike(user?.role) ? (
              <>
                <p>No patients with appointments</p>
                <p className="text-sm text-gray-400 mt-1">
                  You don't have any patients with appointments yet
                </p>
              </>
            ) : (
              <>
                <p>No available medical staff</p>
                <p className="text-sm text-gray-400 mt-1">
                  All staff are currently off duty
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <div className="space-y-4">
          {/* Medical Specialty Filter - Show for admin and patient when role is doctor */}
          {(user?.role === 'admin' || user?.role === 'patient') && filterRole === 'doctor' && uniqueSpecialties.length > 0 && (
            <div className="mb-4">
              <Label htmlFor="specialty-filter" className="text-sm font-medium mb-2 block">
                Filter by Medical Specialty
              </Label>
              <Popover open={openSpecialtyCombobox} onOpenChange={setOpenSpecialtyCombobox}>
                <PopoverTrigger asChild>
                  <Button
                    id="specialty-filter"
                    variant="outline"
                    role="combobox"
                    aria-expanded={openSpecialtyCombobox}
                    className="w-full justify-between"
                    data-testid="specialty-filter"
                  >
                    {selectedSpecialty === "all"
                      ? "All Specialties"
                      : uniqueSpecialties.find((specialty) => specialty === selectedSpecialty) || "All Specialties"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search specialty..." />
                    <CommandEmpty>No specialty found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="all"
                        onSelect={() => {
                          setSelectedSpecialty("all");
                          setOpenSpecialtyCombobox(false);
                        }}
                      >
                        <CheckIcon
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedSpecialty === "all" ? "opacity-100" : "opacity-0"
                          )}
                        />
                        All Specialties
                      </CommandItem>
                      {uniqueSpecialties.map((specialty) => (
                        <CommandItem
                          key={specialty}
                          value={specialty}
                          onSelect={(currentValue) => {
                            setSelectedSpecialty(currentValue === selectedSpecialty ? "all" : currentValue);
                            setOpenSpecialtyCombobox(false);
                          }}
                        >
                          <CheckIcon
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedSpecialty === specialty ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {specialty}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}
          
          {availableStaff.map((item: any) => (
            <div
              key={item.id}
              className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              <div className="flex items-start gap-3 w-full">
                <div className="flex-shrink-0">
                  <Avatar>
                    <AvatarFallback className="bg-blue-100 text-blue-700">
                      {getInitials(item.firstName, item.lastName)}
                    </AvatarFallback>
                  </Avatar>
                </div>

                <div className="flex-1 min-w-0 space-y-2 overflow-hidden">
                  {/* Row 1: Name */}
                  <div className="mb-1">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-wrap">
                      {item.firstName} {item.lastName}
                    </h4>
                  </div>

                  {/* Row 2: Email */}
                  {item.email && (
                    <div className="w-full">
                      <span className="text-sm text-gray-600 dark:text-gray-300 block truncate">
                        {item.email}
                      </span>
                    </div>
                  )}

                  {/* Row 3: Role Badge - Show for admin and patient users */}
                  {(user?.role === 'admin' || user?.role === 'patient') && item.role && (
                    <div className="w-full">
                      <Badge className={`${roleColors[item.role as keyof typeof roleColors] || 'bg-gray-100 text-gray-800'} max-w-full truncate inline-block capitalize`}>
                        {item.role}
                      </Badge>
                    </div>
                  )}

                  {/* For Doctor View: Show Patient-specific information */}
                  {isDoctorLike(user?.role) && (
                    <>
                      {/* Patient ID */}
                      {item.patientId && (
                        <div className="w-full">
                          <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 max-w-full truncate inline-block">
                            ID: {item.patientId}
                          </Badge>
                        </div>
                      )}

                      {/* Phone Number */}
                      {(item.phone || item.phoneNumber) && (
                        <div className="flex items-start gap-1 w-full">
                          <span className="text-sm text-gray-600 dark:text-gray-300 flex-1 min-w-0">
                            📱 {item.phone || item.phoneNumber}
                          </span>
                        </div>
                      )}

                      {/* Date of Birth / Age */}
                      {item.dateOfBirth && (
                        <div className="flex items-start gap-1 text-sm text-gray-500 dark:text-gray-400 w-full">
                          <span className="flex-1 min-w-0">
                            Age: {new Date().getFullYear() - new Date(item.dateOfBirth).getFullYear()} years
                          </span>
                        </div>
                      )}
                    </>
                  )}

                  {/* For Admin/Patient View: Show Doctor-specific information */}
                  {user?.role !== 'doctor' && (
                    <>
                      {/* Row 3: Medical Specialty Category */}
                      {item.medicalSpecialtyCategory && (
                        <div className="w-full">
                          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 max-w-full truncate inline-block">
                            {item.medicalSpecialtyCategory}
                          </Badge>
                        </div>
                      )}

                      {/* Row 4: Sub-specialty */}
                      {item.subSpecialty && (
                        <div className="w-full">
                          <Badge
                            variant="outline"
                            className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-700 max-w-full truncate inline-block"
                          >
                            {item.subSpecialty}
                          </Badge>
                        </div>
                      )}


                      {/* Row 6: Last Active */}
                      {item.lastLoginAt && (
                        <div className="flex items-start gap-1 text-sm text-gray-500 dark:text-gray-400 w-full">
                          <Clock className="h-3 w-3 flex-shrink-0 mt-0.5" />
                          <span className="flex-1 min-w-0">
                            Last active:{" "}
                            {new Date(item.lastLoginAt).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </>
                  )}

                  {/* Row 7: Action Buttons */}
                  <div className="flex items-center gap-2 pt-2 flex-wrap">
                    {showAppointmentButton && user?.role !== 'doctor' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          openBookingDialog(item);
                        }}
                        className="flex-shrink-0"
                      >
                        Book
                      </Button>
                    )}
                    {user?.role !== 'patient' && !isDoctorLike(user?.role) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          openScheduleDialog(item);
                        }}
                        className="flex-shrink-0 hidden"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit Schedule
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="bg-white hover:bg-gray-50 border border-gray-200 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        const profilePath = isDoctorLike(user?.role) 
                          ? `/${getTenantSubdomain()}/patients/${item.id}`
                          : `/${getTenantSubdomain()}/staff/${item.id}`;
                        setLocation(profilePath);
                      }}
                    >
                      View Profile
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      {/* Schedule Edit Dialog */}
      <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Edit Schedule - Dr. {selectedDoctor?.firstName}{" "}
              {selectedDoctor?.lastName}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Working Days */}
            <div>
              <Label className="text-base font-medium">Working Days</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {[
                  "Monday",
                  "Tuesday",
                  "Wednesday",
                  "Thursday",
                  "Friday",
                  "Saturday",
                  "Sunday",
                ].map((day) => (
                  <div key={day} className="flex items-center space-x-2">
                    <Checkbox
                      id={day}
                      checked={workingDays.includes(day)}
                      onCheckedChange={() => toggleWorkingDay(day)}
                    />
                    <Label htmlFor={day} className="text-sm">
                      {day}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Working Hours */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startTime" className="text-sm font-medium">
                  Start Time
                </Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="endTime" className="text-sm font-medium">
                  End Time
                </Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Current Schedule Display */}
            {selectedDoctor && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm font-medium mb-1">Current Schedule:</p>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedDoctor.workingDays &&
                  selectedDoctor.workingDays.length > 0 ? (
                    <>
                      <p>Days: {selectedDoctor.workingDays.join(", ")}</p>
                      {selectedDoctor.workingHours && (
                        <p>
                          Hours:{" "}
                          {formatTime(selectedDoctor.workingHours.start || "")}{" "}
                          - {formatTime(selectedDoctor.workingHours.end || "")}
                        </p>
                      )}
                    </>
                  ) : (
                    <p>No schedule set (Always available)</p>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsScheduleOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleScheduleUpdate}
                disabled={updateScheduleMutation.isPending}
              >
                {updateScheduleMutation.isPending
                  ? "Updating..."
                  : "Update Schedule"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Booking Dialog */}
      <Dialog open={isBookingOpen} onOpenChange={(open) => {
        setIsBookingOpen(open);
        if (!open) {
          setBookingInProgress(null);
        }
      }}>
        <DialogContent
          className="max-w-6xl max-h-[90vh] overflow-y-auto"
          aria-describedby="booking-dialog-description"
        >
          <DialogHeader>
            <DialogTitle>
              Book Appointment with Dr. {selectedBookingDoctor ? `${selectedBookingDoctor.firstName} ${selectedBookingDoctor.lastName}` : 'John Smith'}
            </DialogTitle>
          </DialogHeader>
          <div id="booking-dialog-description" className="sr-only">
            Schedule a new appointment by selecting specialty, doctor, date, and time slot.
          </div>

          <div className="space-y-4">
            {/* First Row - Appointment Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Appointment Type</Label>
                <Select
                  value={appointmentType}
                  onValueChange={setAppointmentType}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Consultation">Consultation</SelectItem>
                    <SelectItem value="Follow-up">Follow-up</SelectItem>
                    <SelectItem value="Procedure">Procedure</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium">Duration (minutes)</Label>
                <Select
                  value={duration}
                  onValueChange={setDuration}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select Duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">60 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Second Row - Doctor and Patient Information */}
            <div className="grid grid-cols-2 gap-4">
              {/* Doctor Information */}
              <div>
                <Label className="text-sm font-medium mb-1 block">Doctor Information</Label>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 h-40">
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white mb-1">
                        Dr. {selectedBookingDoctor ? `${selectedBookingDoctor.firstName} ${selectedBookingDoctor.lastName}` : 'John Smith'}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        {selectedBookingDoctor?.medicalSpecialtyCategory || 'General & Primary Care'}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        {selectedBookingDoctor?.subSpecialty || 'General Practitioner (GP) / Family Physician'}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                          <span>📧</span>
                          <span className="truncate">{selectedBookingDoctor?.email || 'doctor@cura.com'}</span>
                        </div>
                        <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          Doctor ID: {selectedBookingDoctor ? String(selectedBookingDoctor.id).padStart(6, '0') : '000041'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Patient Information */}
              <div>
                <Label className="text-sm font-medium mb-1 block">Patient Information</Label>
                {user?.role === 'admin' ? (
                  /* Admin: Show patient dropdown with search */
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 h-40">
                    <Select
                      value={selectedPatient}
                      onValueChange={setSelectedPatient}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a patient" />
                      </SelectTrigger>
                      <SelectContent>
                        {patients && patients.length > 0 ? (
                          patients.map((patient: any) => (
                            <SelectItem
                              key={patient.id}
                              value={patient.id.toString()}
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium text-xs flex-shrink-0">
                                  {patient.firstName?.charAt(0)}{patient.lastName?.charAt(0)}
                                </div>
                                <span>
                                  {patient.firstName} {patient.lastName} (OP{String(patient.id).padStart(6, '0')})
                                </span>
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-patients" disabled>
                            No patients available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  /* Non-Admin: Show patient information card */
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 h-40">
                    <div className="flex items-start gap-2 mb-2">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium flex-shrink-0">
                        {patients?.find((p: any) => p.id.toString() === selectedPatient)?.firstName?.charAt(0) || 'S'}{patients?.find((p: any) => p.id.toString() === selectedPatient)?.lastName?.charAt(0) || 'a'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white mb-1">
                          {patients?.find((p: any) => p.id.toString() === selectedPatient)?.firstName || 'Shabana'} {patients?.find((p: any) => p.id.toString() === selectedPatient)?.lastName || 'ali'}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          OP{String(patients?.find((p: any) => p.id.toString() === selectedPatient)?.id || '00025').padStart(6, '0')}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                        <span>📞</span>
                        <span className="truncate">{patients?.find((p: any) => p.id.toString() === selectedPatient)?.phone || '+923115459791'}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                        <span>📧</span>
                        <span className="truncate">{patients?.find((p: any) => p.id.toString() === selectedPatient)?.email || 'patient2@cura.com'}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                        <span>🏥</span>
                        <span className="truncate">NHS: {patients?.find((p: any) => p.id.toString() === selectedPatient)?.nhsNumber || '312312123'}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                        <span>📍</span>
                        <span className="truncate">{patients?.find((p: any) => p.id.toString() === selectedPatient)?.address?.city || 'guyg'}, {patients?.find((p: any) => p.id.toString() === selectedPatient)?.address?.country || 'United Kingdom'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Third Row - Date and Time Selection */}
            <div className="grid grid-cols-2 gap-4">
              {/* Select Date */}
              <div>
                <Label className="text-sm font-medium mb-1 block">Select Date</Label>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-2">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date: Date | undefined) => setSelectedDate(date)}
                    disabled={(date: Date) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      
                      if (date < today) return true;
                      
                      return !hasShiftsOnDate(date);
                    }}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Select Time Slot */}
              <div>
                <Label className="text-sm font-medium mb-1 block">Select Time Slot</Label>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-2 h-[320px] overflow-y-auto">
                  {!selectedDate ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-gray-400 text-sm">Time slots will appear here</p>
                    </div>
                  ) : timeSlots.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <p className="text-gray-500 text-sm font-medium">Time slot not available</p>
                        <p className="text-gray-400 text-xs mt-1">{format(selectedDate, 'MMMM dd, yyyy')}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {timeSlots.map((slot) => {
                        const isAvailable = isTimeSlotAvailable(selectedDate, slot);
                        const isSelected = selectedTimeSlot === timeSlotTo24Hour(slot);

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
                              if (!selectedDate) return;
                              setSelectedTimeSlot(timeSlotTo24Hour(slot));
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

            {/* Hidden Patient Selection (needed for booking) */}
            <div className="hidden">
              <Select
                value={selectedPatient}
                onValueChange={setSelectedPatient}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select patient..." />
                </SelectTrigger>
                <SelectContent>
                  {patients?.map((patient: any) => (
                    <SelectItem
                      key={patient.id}
                      value={patient.id.toString()}
                    >
                      {patient.firstName} {patient.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Fourth Row - Title and Booking Summary */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              <div className="grid grid-cols-2 gap-3 mb-3">
                {/* Title Field */}
                <div>
                  <Label className="text-sm font-medium">Title (optional)</Label>
                  <Input
                    type="text"
                    placeholder="Enter appointment title"
                    value={appointmentTitle}
                    onChange={(e) => setAppointmentTitle(e.target.value)}
                    className="mt-1"
                  />
                </div>
                
                {/* Description */}
                <div>
                  <Label className="text-sm font-medium">Description</Label>
                  <Input
                    type="text"
                    placeholder="Enter appointment description"
                    value={appointmentDescription}
                    onChange={(e) => setAppointmentDescription(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsBookingOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                !selectedPatient ||
                !selectedDate ||
                !selectedTimeSlot
              }
              onClick={() => setIsConfirmationOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Book Appointment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmationOpen} onOpenChange={(open) => {
        setIsConfirmationOpen(open);
        if (!open && !bookAppointmentMutation.isPending) {
          setBookingInProgress(null);
        }
      }}>
        <DialogContent className="max-w-2xl" aria-describedby="confirmation-dialog-description">
          <DialogHeader>
            <DialogTitle>Appointment Booking Confirmation</DialogTitle>
          </DialogHeader>
          <div id="confirmation-dialog-description" className="sr-only">
            Review and confirm your appointment booking details before submission.
          </div>
          
          <div className="space-y-4">
            <h3 className="text-base font-medium">Booking Summary</h3>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">Appointment Type</Label>
                    <p className="text-sm font-medium">{appointmentType}</p>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">Patient</Label>
                    <p className="text-sm font-medium">
                      {selectedPatient 
                        ? `${patients?.find((p: any) => p.id.toString() === selectedPatient)?.firstName} ${patients?.find((p: any) => p.id.toString() === selectedPatient)?.lastName}`
                        : "Not selected"
                      }
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">Date</Label>
                    <p className="text-sm font-medium">{selectedDate ? format(selectedDate, "PPP") : "Not selected"}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">Duration</Label>
                    <p className="text-sm font-medium">{duration} minutes</p>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">Doctor</Label>
                    <p className="text-sm font-medium">
                      {selectedBookingDoctor 
                        ? `Dr. ${selectedBookingDoctor.firstName} ${selectedBookingDoctor.lastName}`
                        : "Not selected"
                      }
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">Time</Label>
                    <p className="text-sm font-medium">{selectedTimeSlot ? formatTime(selectedTimeSlot) : "Not selected"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsConfirmationOpen(false)}
              disabled={bookAppointmentMutation.isPending}
            >
              Go Back
            </Button>
            <Button
              onClick={handleBookAppointment}
              disabled={bookAppointmentMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {bookAppointmentMutation.isPending ? "Confirming..." : "Confirm"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={isSuccessModalOpen} onOpenChange={setIsSuccessModalOpen}>
        <DialogContent className="max-w-md" aria-describedby="success-dialog-description">
          <DialogHeader>
            <DialogTitle className="text-center text-green-600 dark:text-green-400">Success!</DialogTitle>
          </DialogHeader>
          <div id="success-dialog-description" className="sr-only">
            Appointment booking confirmation message.
          </div>
          
          <div className="text-center py-6">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-900 dark:text-white">
              Appointment with Dr. {selectedBookingDoctor?.firstName} {selectedBookingDoctor?.lastName} has been scheduled successfully.
            </p>
          </div>

          <div className="flex justify-center">
            <Button
              onClick={() => {
                setIsSuccessModalOpen(false);
                // Reset form
                setSelectedPatient("");
                setSelectedDate(undefined);
                setSelectedTimeSlot("");
                setAppointmentType("Consultation");
                setDuration("30");
                setAppointmentTitle("");
                setAppointmentDescription("");
                setAppointmentLocation("");
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Insufficient Time Alert Dialog */}
      <AlertDialog open={showInsufficientTimeModal} onOpenChange={setShowInsufficientTimeModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Insufficient Time Available</AlertDialogTitle>
            <AlertDialogDescription>
              {insufficientTimeMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowInsufficientTimeModal(false)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
