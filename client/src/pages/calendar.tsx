import { Header } from "@/components/layout/header";
import AppointmentCalendar from "@/components/calendar/appointment-calendar";
import { DoctorList } from "@/components/doctors/doctor-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar, Plus, Users, Clock, User, X, Check, ChevronsUpDown, Phone, Mail, FileText, MapPin, Filter, FilterX } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { format, isBefore, startOfDay } from "date-fns";
import { useLocation } from "wouter";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Medical Specialties Data Structure - same as user-management.tsx
const medicalSpecialties = {
  "General & Primary Care": {
    "General Practitioner (GP) / Family Physician": ["Common illnesses", "Preventive care"],
    "Internal Medicine Specialist": ["Adult health", "Chronic diseases (diabetes, hypertension)"]
  },
  "Surgical Specialties": {
    "General Surgeon": [
      "Abdominal Surgery",
      "Hernia Repair", 
      "Gallbladder & Appendix Surgery",
      "Colorectal Surgery",
      "Breast Surgery",
      "Endocrine Surgery (thyroid, parathyroid, adrenal)",
      "Trauma & Emergency Surgery"
    ],
    "Orthopedic Surgeon": [
      "Joint Replacement (hip, knee, shoulder)",
      "Spine Surgery",
      "Sports Orthopedics (ACL tears, ligament reconstruction)",
      "Pediatric Orthopedics",
      "Arthroscopy (keyhole joint surgery)",
      "Trauma & Fracture Care"
    ],
    "Neurosurgeon": [
      "Brain Tumor Surgery",
      "Spinal Surgery", 
      "Cerebrovascular Surgery (stroke, aneurysm)",
      "Pediatric Neurosurgery",
      "Functional Neurosurgery (Parkinson's, epilepsy, DBS)",
      "Trauma Neurosurgery"
    ],
    "Cardiothoracic Surgeon": [
      "Cardiac Surgery – Bypass, valve replacement",
      "Thoracic Surgery – Lungs, esophagus, chest tumors", 
      "Congenital Heart Surgery – Pediatric heart defects",
      "Heart & Lung Transplants",
      "Minimally Invasive / Robotic Heart Surgery"
    ],
    "Plastic & Reconstructive Surgeon": [
      "Cosmetic Surgery (nose job, facelift, liposuction)",
      "Reconstructive Surgery (after cancer, trauma)",
      "Burn Surgery",
      "Craniofacial Surgery (cleft lip/palate, facial bones)",
      "Hand Surgery"
    ],
    "ENT Surgeon (Otolaryngologist)": [
      "Otology (ear surgeries, cochlear implants)",
      "Rhinology (sinus, deviated septum)",
      "Laryngology (voice box, throat)",
      "Head & Neck Surgery (thyroid, tumors)",
      "Pediatric ENT (tonsils, adenoids, ear tubes)",
      "Facial Plastic Surgery (nose/ear correction)"
    ],
    "Urologist": [
      "Endourology (kidney stones, minimally invasive)",
      "Uro-Oncology (prostate, bladder, kidney cancer)",
      "Pediatric Urology",
      "Male Infertility & Andrology",
      "Renal Transplant Surgery",
      "Neurourology (bladder control disorders)"
    ]
  },
  "Heart & Circulation": {
    "Cardiologist": ["Heart diseases", "ECG", "Angiography"],
    "Vascular Surgeon": ["Arteries", "Veins", "Blood vessels"]
  },
  "Women's Health": {
    "Gynecologist": ["Female reproductive system"],
    "Obstetrician": ["Pregnancy & childbirth"],
    "Fertility Specialist (IVF Expert)": ["Infertility treatment"]
  },
  "Children's Health": {
    "Pediatrician": ["General child health"],
    "Pediatric Surgeon": ["Infant & child surgeries"],
    "Neonatologist": ["Newborn intensive care"]
  },
  "Brain & Nervous System": {
    "Neurologist": ["Stroke", "Epilepsy", "Parkinson's"],
    "Psychiatrist": ["Mental health (depression, anxiety)"],
    "Psychologist (Clinical)": ["Therapy & counseling"]
  },
  "Skin, Hair & Appearance": {
    "Dermatologist": ["Skin", "Hair", "Nails"],
    "Cosmetologist": ["Non-surgical cosmetic treatments"],
    "Aesthetic / Cosmetic Surgeon": ["Surgical enhancements"]
  },
  "Eye & Vision": {
    "Ophthalmologist": ["Cataracts", "Glaucoma", "Surgeries"],
    "Optometrist": ["Vision correction (glasses, lenses)"]
  },
  "Teeth & Mouth": {
    "Dentist (General)": ["Oral health", "Fillings"],
    "Orthodontist": ["Braces", "Alignment"],
    "Oral & Maxillofacial Surgeon": ["Jaw surgery", "Implants"],
    "Periodontist": ["Gum disease specialist"],
    "Endodontist": ["Root canal specialist"]
  },
  "Digestive System": {
    "Gastroenterologist": ["Stomach", "Intestines"],
    "Hepatologist": ["Liver specialist"],
    "Colorectal Surgeon": ["Colon", "Rectum", "Anus"]
  },
  "Kidneys & Urinary Tract": {
    "Nephrologist": ["Kidney diseases", "Dialysis"],
    "Urologist": ["Surgical urological procedures"]
  },
  "Respiratory System": {
    "Pulmonologist": ["Asthma", "COPD", "Tuberculosis"],
    "Thoracic Surgeon": ["Lung surgeries"]
  },
  "Cancer": {
    "Oncologist": ["Medical cancer specialist"],
    "Radiation Oncologist": ["Radiation therapy"],
    "Surgical Oncologist": ["Cancer surgeries"]
  },
  "Endocrine & Hormones": {
    "Endocrinologist": ["Diabetes", "Thyroid", "Hormones"]
  },
  "Muscles & Joints": {
    "Rheumatologist": ["Arthritis", "Autoimmune"],
    "Sports Medicine Specialist": ["Athlete injuries"]
  },
  "Blood & Immunity": {
    "Hematologist": ["Blood diseases (anemia, leukemia)"],
    "Immunologist / Allergist": ["Immune & allergy disorders"]
  },
  "Others": {
    "Geriatrician": ["Elderly care"],
    "Pathologist": ["Lab & diagnostic testing"],
    "Radiologist": ["Imaging (X-ray, CT, MRI)"],
    "Anesthesiologist": ["Pain & anesthesia"],
    "Emergency Medicine Specialist": ["Accidents", "Trauma"],
    "Occupational Medicine Specialist": ["Workplace health"]
  }
};

export default function CalendarPage() {
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false);
  const [selectedSpecialty, setSelectedSpecialty] = useState("");
  const [selectedSubSpecialty, setSelectedSubSpecialty] = useState("");
  const [filteredDoctors, setFilteredDoctors] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("");
  const [specialtyComboboxOpen, setSpecialtyComboboxOpen] = useState(false);
  const [patientComboboxOpen, setPatientComboboxOpen] = useState(false);
  
  // Filter functionality state
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filterSpecialty, setFilterSpecialty] = useState("");
  const [filterSubSpecialty, setFilterSubSpecialty] = useState("");
  const [filterDoctor, setFilterDoctor] = useState("");
  const [filterDate, setFilterDate] = useState<Date | undefined>(undefined);
  const [filteredAppointments, setFilteredAppointments] = useState<any[]>([]);
  const [bookingForm, setBookingForm] = useState({
    patientId: "",
    title: "",
    description: "",
    scheduledAt: "",
    duration: "30",
    type: "consultation",
    location: "",
    isVirtual: false
  });
  const [location] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch patients for the dropdown
  const { data: patients = [] } = useQuery<any[]>({
    queryKey: ["/api/patients"],
    retry: false,
  });
  
  // Fetch all users for specialty filtering (we need all doctors, not just available ones)
  const { data: allUsers = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
    retry: false,
  });
  
  // Filter to get all doctors for specialty filtering
  const allDoctors = allUsers.filter((user: any) => user.role === 'doctor');
  
  // Query for filtered appointments
  const { data: allAppointments = [] } = useQuery<any[]>({
    queryKey: ["/api/appointments"],
    retry: false,
  });
  
  // Function to apply filters
  const applyFilters = () => {
    if (!filterDoctor && !filterDate) {
      setFilteredAppointments([]);
      return;
    }
    
    let filtered = [...allAppointments];
    
    // Filter by doctor
    if (filterDoctor) {
      const selectedDoctorId = parseInt(filterDoctor);
      filtered = filtered.filter((appointment: any) => appointment.providerId === selectedDoctorId);
    }
    
    // Filter by date
    if (filterDate) {
      const filterDateStr = format(filterDate, 'yyyy-MM-dd');
      filtered = filtered.filter((appointment: any) => {
        const appointmentDate = new Date(appointment.scheduledAt);
        return format(appointmentDate, 'yyyy-MM-dd') === filterDateStr;
      });
    }
    
    setFilteredAppointments(filtered);
  };
  
  // Apply filters when filter values change
  useEffect(() => {
    if (showFilterPanel) {
      applyFilters();
    }
  }, [filterDoctor, filterDate, allAppointments, showFilterPanel]);
  
  // Filter doctors by specialty for filter panel - reactive to filter changes
  const filteredDoctorsBySpecialty = useMemo(() => {
    console.log('Filtering doctors - Specialty:', filterSpecialty, 'Sub-specialty:', filterSubSpecialty);
    console.log('All doctors:', allDoctors);
    
    if (!filterSpecialty && !filterSubSpecialty) {
      console.log('No filters, returning all doctors:', allDoctors.length);
      return allDoctors;
    }
    
    const filtered = allDoctors.filter((doctor: any) => {
      console.log(`Checking doctor: ${doctor.firstName} ${doctor.lastName}, category: ${doctor.medicalSpecialtyCategory}, subSpecialty: ${doctor.subSpecialty}`);
      
      if (filterSubSpecialty) {
        const matches = doctor.subSpecialty === filterSubSpecialty;
        console.log(`Sub-specialty filter: ${filterSubSpecialty} matches ${doctor.subSpecialty}:`, matches);
        return matches;
      } else if (filterSpecialty) {
        const matches = doctor.medicalSpecialtyCategory === filterSpecialty;
        console.log(`Specialty filter: ${filterSpecialty} matches ${doctor.medicalSpecialtyCategory}:`, matches);
        return matches;
      }
      return true;
    });
    
    console.log('Filtered doctors result:', filtered.length, filtered);
    return filtered;
  }, [allDoctors, filterSpecialty, filterSubSpecialty]);
  
  // Helper functions for specialty filtering - using consistent data from medicalSpecialties object
  const getUniqueSpecialties = (): string[] => {
    return Object.keys(medicalSpecialties);
  };
  
  const getSubSpecialties = (specialty?: string): string[] => {
    if (!specialty) {
      // If no specialty selected, return all sub-specialties
      const allSubSpecialties: string[] = [];
      Object.values(medicalSpecialties).forEach(specialtyData => {
        allSubSpecialties.push(...Object.keys(specialtyData));
      });
      return allSubSpecialties;
    }
    
    const specialtyData = medicalSpecialties[specialty as keyof typeof medicalSpecialties];
    return specialtyData ? Object.keys(specialtyData) : [];
  };
  
  const filterDoctorsBySpecialty = () => {
    if (!Array.isArray(allDoctors)) {
      setFilteredDoctors([]);
      return [];
    }
    
    console.log('Filtering doctors with specialty:', selectedSpecialty, 'sub-specialty:', selectedSubSpecialty);
    console.log('Available doctors:', allDoctors);
    
    // If no specialty is selected, show all doctors
    if (!selectedSpecialty) {
      console.log('No specialty selected, showing all doctors:', allDoctors);
      setFilteredDoctors(allDoctors);
      return allDoctors;
    }
    
    const filtered = allDoctors.filter((doctor: any) => {
      const hasSpecialty = doctor.medicalSpecialtyCategory === selectedSpecialty;
      const hasSubSpecialty = !selectedSubSpecialty || doctor.subSpecialty === selectedSubSpecialty;
      
      console.log(`Checking ${doctor.firstName} ${doctor.lastName}:`, {
        specialty: doctor.medicalSpecialtyCategory,
        hasSpecialty,
        subSpecialty: doctor.subSpecialty,
        hasSubSpecialty
      });
      
      return hasSpecialty && hasSubSpecialty;
    });
    
    console.log('Filtered doctors:', filtered);
    setFilteredDoctors(filtered);
    return filtered;
  };
  
  // Generate time slots based on doctor's working hours
  const generateTimeSlots = (workingHours: any) => {
    console.log('[TIME_SLOTS] Generating time slots for working hours:', workingHours);
    
    if (!workingHours || !workingHours.start || !workingHours.end) {
      console.log('[TIME_SLOTS] No valid working hours found, using default 9 AM to 5 PM');
      workingHours = { start: '09:00', end: '17:00' };
    }
    
    const slots = [];
    const startHour = parseInt(workingHours.start.split(':')[0]);
    const startMinute = parseInt(workingHours.start.split(':')[1] || '0');
    const endHour = parseInt(workingHours.end.split(':')[0]);
    const endMinute = parseInt(workingHours.end.split(':')[1] || '0');
    
    console.log(`[TIME_SLOTS] Generating slots from ${startHour}:${startMinute.toString().padStart(2, '0')} to ${endHour}:${endMinute.toString().padStart(2, '0')}`);
    
    // FIXED: Generate time slots in 30-minute intervals up to but not including end time
    for (let hour = startHour; hour < endHour; hour++) {
      // Add the top of the hour slot
      const hourSlot = `${hour.toString().padStart(2, '0')}:00`;
      slots.push(hourSlot);
      console.log(`[TIME_SLOTS] Added slot: ${hourSlot}`);
      
      // Add the half-hour slot  
      const halfHourSlot = `${hour.toString().padStart(2, '0')}:30`;
      slots.push(halfHourSlot);
      console.log(`[TIME_SLOTS] Added slot: ${halfHourSlot}`);
    }
    
    console.log(`[TIME_SLOTS] Generated ${slots.length} time slots:`, slots);
    console.log(`[TIME_SLOTS] First slot: ${slots[0]}, Last slot: ${slots[slots.length - 1]}`);
    
    // Verify 4:30 PM slot is included for default working hours
    if (workingHours.start === '09:00' && workingHours.end === '17:00') {
      const has430PM = slots.includes('16:30');
      console.log(`[TIME_SLOTS] VERIFICATION: 4:30 PM (16:30) slot included: ${has430PM}`);
      if (!has430PM) {
        console.error(`[TIME_SLOTS] ERROR: 4:30 PM slot missing from generated slots!`);
      }
    }
    
    return slots;
  };
  
  // Get booked time slots for selected doctor and date - SIMPLIFIED TIMEZONE-AWARE VERSION
  const getBookedTimeSlots = () => {
    if (!selectedDate || !selectedDoctor) {
      console.log(`[TIME_SLOTS] No doctor or date selected`);
      return [];
    }

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    console.log(`[TIME_SLOTS] Getting booked slots for doctor ${selectedDoctor.id} on ${dateStr}`);
    
    // Get appointment data
    let appointmentsData: any[] = [];
    
    // Try React Query cache first
    try {
      const cacheData = queryClient.getQueryData(["/api/appointments"]) as any[];
      if (cacheData && Array.isArray(cacheData) && cacheData.length > 0) {
        appointmentsData = cacheData;
        console.log(`[TIME_SLOTS] Using React Query cache data: ${appointmentsData.length} appointments`);
      }
    } catch (error) {
      console.log(`[TIME_SLOTS] Error accessing React Query cache:`, error);
    }
    
    // Fallback to allAppointments from useQuery hook
    if (appointmentsData.length === 0) {
      if (allAppointments && Array.isArray(allAppointments) && allAppointments.length > 0) {
        appointmentsData = allAppointments;
        console.log(`[TIME_SLOTS] Using allAppointments hook data: ${appointmentsData.length} appointments`);
      } else {
        console.log(`[TIME_SLOTS] allAppointments is empty or invalid:`, allAppointments);
      }
    }
    
    if (appointmentsData.length === 0) {
      console.log(`[TIME_SLOTS] No appointment data available - all slots will show as available`);
      return [];
    }
    
    console.log(`[TIME_SLOTS] Found ${appointmentsData.length} total appointments`);
    
    // Filter appointments for the selected doctor and date
    const doctorAppointments = appointmentsData.filter(apt => {
      if (!apt || !apt.providerId || !apt.scheduledAt) {
        console.log(`[TIME_SLOTS] Skipping invalid appointment:`, apt);
        return false;
      }
      
      const matchesDoctor = Number(apt.providerId) === Number(selectedDoctor.id);
      
      // Convert appointment UTC time to local date for comparison
      const appointmentDate = new Date(apt.scheduledAt);
      const localDateStr = format(appointmentDate, 'yyyy-MM-dd');
      const matchesDate = localDateStr === dateStr;
      
      console.log(`[TIME_SLOTS] Appointment ${apt.id}: doctor_match=${matchesDoctor}, date_match=${matchesDate}, scheduledAt=${apt.scheduledAt}, localDate=${localDateStr}`);
      
      return matchesDoctor && matchesDate;
    });

    console.log(`[TIME_SLOTS] Found ${doctorAppointments.length} appointments for doctor ${selectedDoctor.id} on ${dateStr}`);

    // Extract time slots in HH:mm format (24-hour format to match time slot generation)
    const bookedSlots = doctorAppointments.map(apt => {
      // Convert UTC time to local time and extract time portion
      const appointmentDate = new Date(apt.scheduledAt);
      const localTime = format(appointmentDate, 'HH:mm');
      
      console.log(`[TIME_SLOTS] Appointment ${apt.id}: scheduledAt=${apt.scheduledAt} -> localTime=${localTime}`);
      return localTime;
    }).filter(slot => slot !== ''); // Remove empty slots

    console.log(`[TIME_SLOTS] Final booked time slots:`, bookedSlots);
    return bookedSlots;
  };

  // Check if time slot is available - ENHANCED WITH DEBUGGING
  const isTimeSlotAvailable = (timeSlot: string) => {
    console.log(`[TIME_SLOTS] ========== CHECKING AVAILABILITY FOR ${timeSlot} ==========`);
    
    if (!selectedDate || !selectedDoctor) {
      console.log(`[TIME_SLOTS] ${timeSlot} - No doctor or date selected - RETURNING FALSE`);
      return false;
    }
    
    console.log(`[TIME_SLOTS] ${timeSlot} - Selected doctor: ${selectedDoctor.id} (${selectedDoctor.firstName} ${selectedDoctor.lastName})`);
    console.log(`[TIME_SLOTS] ${timeSlot} - Selected date: ${format(selectedDate, 'yyyy-MM-dd')}`);
    
    // Check if slot is in the past (for same-day bookings)
    const slotDateStr = format(selectedDate, 'yyyy-MM-dd');
    const slotStart = new Date(`${slotDateStr}T${timeSlot}:00`);
    const isToday = slotDateStr === format(new Date(), 'yyyy-MM-dd');
    const currentTime = new Date();
    
    console.log(`[TIME_SLOTS] ${timeSlot} - Date check: slotDate=${slotDateStr}, isToday=${isToday}, currentTime=${currentTime.toISOString()}, slotTime=${slotStart.toISOString()}`);
    
    if (isToday && slotStart < currentTime) {
      console.log(`[TIME_SLOTS] ${timeSlot} - SLOT IS IN THE PAST - BLOCKED (GREY)`);
      return false;
    }
    
    // Get booked time slots for this doctor and date
    console.log(`[TIME_SLOTS] ${timeSlot} - Getting booked slots...`);
    const bookedSlots = getBookedTimeSlots();
    const isBooked = bookedSlots.includes(timeSlot);
    
    console.log(`[TIME_SLOTS] ${timeSlot} - Booked slots for this doctor/date:`, bookedSlots);
    console.log(`[TIME_SLOTS] ${timeSlot} - Is this slot booked? ${isBooked}`);
    
    const result = !isBooked;
    console.log(`[TIME_SLOTS] ${timeSlot} - FINAL RESULT: ${result ? 'AVAILABLE (GREEN)' : 'BLOCKED (GREY)'}`);
    console.log(`[TIME_SLOTS] ========== END CHECK FOR ${timeSlot} ==========`);
    
    return result; // true = available (green), false = blocked (grey)
  };
  
  // Update filtered doctors when specialty/sub-specialty changes or when doctors data loads
  useEffect(() => {
    filterDoctorsBySpecialty();
  }, [selectedSpecialty, selectedSubSpecialty, allDoctors]);
  
  // Check for patientId in URL params to auto-book appointment
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const patientId = urlParams.get('patientId');
    if (patientId) {
      setBookingForm(prev => ({ ...prev, patientId }));
    }
  }, [location]);

  const createAppointmentMutation = useMutation({
    mutationFn: async (appointmentData: any) => {
      const response = await apiRequest("POST", "/api/appointments", appointmentData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Appointment Created",
        description: "The appointment has been successfully booked.",
      });
      // Update calendar data with proper cache invalidation
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      // Invalidate specific appointment queries for the selected date
      if (selectedDate) {
        queryClient.invalidateQueries({ 
          queryKey: ["/api/appointments", format(selectedDate, 'yyyy-MM-dd')] 
        });
      }
      // Close modal and reset form
      setShowNewAppointmentModal(false);
      setSelectedSpecialty("");
      setSelectedSubSpecialty("");
      setFilteredDoctors([]);
      setSelectedDoctor(null);
      setSelectedDate(undefined);
      setSelectedTimeSlot("");
      setBookingForm({
        patientId: "",
        title: "",
        description: "",
        scheduledAt: "",
        duration: "30",
        type: "consultation",
        location: "",
        isVirtual: false
      });
    },
    onError: (error) => {
      console.error("Appointment creation error:", error);
      let errorMessage = "Failed to create appointment. Please try again.";
      
      // Check if the error message contains specific errors
      if (error.message && error.message.includes("Patient not found")) {
        errorMessage = "Patient not found. Please use a valid patient ID like: 165, 159, P000004, P000005, or P000158.";
      } else if (error.message && error.message.includes("already scheduled at this time")) {
        errorMessage = "This time slot is already booked. Please select a different time slot.";
      } else if (error.message && error.message.includes("Doctor is already scheduled")) {
        errorMessage = "The selected doctor is not available at this time. Please choose a different time slot.";
      }
      
      toast({
        title: "Booking Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleBookAppointment = () => {
    if (!selectedDoctor || !bookingForm.patientId || !bookingForm.scheduledAt) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    // Handle both numeric and string patient IDs
    let patientId: string | number = bookingForm.patientId;
    
    // If it's a pure number, convert to integer
    if (/^\d+$/.test(bookingForm.patientId)) {
      patientId = parseInt(bookingForm.patientId);
    }
    // If it's a patient ID format (like P000004), keep as string
    // The server will handle the lookup

    const appointmentData = {
      ...bookingForm,
      patientId: patientId,
      providerId: selectedDoctor.id,
      title: bookingForm.title || `${bookingForm.type} with ${selectedDoctor.firstName} ${selectedDoctor.lastName}`,
      location: bookingForm.location || `${selectedDoctor.department} Department`,
      duration: parseInt(bookingForm.duration)
    };

    createAppointmentMutation.mutate(appointmentData);
  };

  return (
    <>
      <Header 
        title="Appointments" 
        subtitle="Schedule and manage patient appointments efficiently."
      />
      
      <div className="flex-1 overflow-auto p-6">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-900 dark:text-white" />
              Calendar & Scheduling
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowFilterPanel(!showFilterPanel);
                  if (showFilterPanel) {
                    // Reset filter when closing
                    setFilterSpecialty("");
                    setFilterSubSpecialty("");
                    setFilterDoctor("");
                    setFilterDate(undefined);
                    setFilteredAppointments([]);
                  }
                }}
                className="ml-2"
                data-testid="button-filter-appointments"
              >
                {showFilterPanel ? (
                  <FilterX className="h-4 w-4" />
                ) : (
                  <Filter className="h-4 w-4" />
                )}
              </Button>
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              {showFilterPanel 
                ? "Use filters to find specific appointments by doctor, specialty, or date."
                : "View appointments, manage schedules, and book new consultations."
              }
            </p>
          </div>
          <Button 
            onClick={() => setShowNewAppointmentModal(true)}
            className="flex items-center gap-2"
            data-testid="button-new-appointment"
          >
            <Plus className="h-4 w-4" />
            New Appointment
          </Button>
        </div>

        {/* Filter Panel */}
        {showFilterPanel && (
          <div className="mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filter Appointments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  {/* Medical Specialty Category */}
                  <div>
                    <Label>Medical Specialty Category</Label>
                    <Select value={filterSpecialty} onValueChange={(value) => {
                      setFilterSpecialty(value);
                      setFilterSubSpecialty(""); // Reset sub-specialty when specialty changes
                      setFilterDoctor(""); // Reset doctor when specialty changes
                    }}>
                      <SelectTrigger data-testid="select-filter-specialty">
                        <SelectValue placeholder="Select category..." />
                      </SelectTrigger>
                      <SelectContent>
                        {getUniqueSpecialties().map((specialty) => (
                          <SelectItem key={specialty} value={specialty}>
                            {specialty}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sub-Specialty */}
                  <div>
                    <Label>Sub-Specialty</Label>
                    <Select value={filterSubSpecialty} onValueChange={(value) => {
                      setFilterSubSpecialty(value);
                      setFilterDoctor(""); // Reset doctor when sub-specialty changes
                    }}>
                      <SelectTrigger data-testid="select-filter-subspecialty">
                        <SelectValue placeholder="Select sub-specialty..." />
                      </SelectTrigger>
                      <SelectContent>
                        {getSubSpecialties(filterSpecialty).map((subSpecialty) => (
                          <SelectItem key={subSpecialty} value={subSpecialty}>
                            {subSpecialty}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Doctor */}
                  <div>
                    <Label>Doctor</Label>
                    <Select value={filterDoctor} onValueChange={setFilterDoctor}>
                      <SelectTrigger data-testid="select-filter-doctor">
                        <SelectValue placeholder="Select doctor..." />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredDoctorsBySpecialty.map((doctor: any) => (
                          <SelectItem key={doctor.id} value={doctor.id.toString()}>
                            Dr. {doctor.firstName} {doctor.lastName} - {doctor.specialization}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date */}
                  <div>
                    <Label>Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                          data-testid="button-filter-date"
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {filterDate ? format(filterDate, "PPP") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={filterDate}
                          onSelect={setFilterDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Conditional Content - Either Default Calendar or Filtered Appointments */}
        {showFilterPanel && (filterDoctor || filterDate) ? (
          /* Filtered Appointments View */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900 dark:text-white">
                Filtered Appointments ({filteredAppointments.length} found)
              </h4>
            </div>
            
            {filteredAppointments.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    No appointments found
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    No appointments match your filter criteria. Try adjusting your filters.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredAppointments.map((appointment: any) => {
                  const doctor = allUsers.find((u: any) => u.id === appointment.providerId);
                  const patient = patients.find((p: any) => p.id === appointment.patientId);
                  const appointmentDate = new Date(appointment.scheduledAt);
                  
                  return (
                    <Card key={appointment.id} className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h5 className="font-semibold text-gray-900 dark:text-white">
                              {appointment.title || "Appointment"}
                            </h5>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                              appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                              appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {appointment.status}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <span>Patient: {patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              <span>Doctor: {doctor ? `Dr. ${doctor.firstName} ${doctor.lastName}` : 'Unknown'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>{format(appointmentDate, 'EEEE, MMMM dd, yyyy')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              <span>{format(appointmentDate, 'h:mm a')} ({appointment.duration} mins)</span>
                            </div>
                            {appointment.location && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                <span>{appointment.location}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Default Calendar View */
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Calendar - 2 columns */}
            <div className="lg:col-span-2">
              <AppointmentCalendar />
            </div>
            
            {/* Doctor List - 1 column */}
            <div>
              <div className="mb-4">
                <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4 text-gray-900 dark:text-white" />
                  Available Doctors
                </h4>
              </div>
              <DoctorList 
                onSelectDoctor={(doctor) => {
                  console.log("Setting selected doctor:", doctor);
                  setSelectedDoctor(doctor);
                }}
                showAppointmentButton={true}
              />
            </div>
          </div>
        )}

        {/* Selected Doctor Indicator */}
        <div className="mt-6">
          <div className="bg-yellow-100 border border-yellow-300 p-3 rounded text-gray-900 dark:text-gray-900">
            Selected Doctor: {selectedDoctor ? `${selectedDoctor.firstName} ${selectedDoctor.lastName}` : 'None'}
          </div>
        </div>

        {/* Booking Form */}
        {selectedDoctor && !showNewAppointmentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">
                    Book Appointment with {selectedDoctor.firstName} {selectedDoctor.lastName}
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedDoctor(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="patientId">Patient *</Label>
                    <Select value={bookingForm.patientId} onValueChange={(value) => setBookingForm(prev => ({ ...prev, patientId: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select patient..." />
                      </SelectTrigger>
                      <SelectContent>
                        {patients.map((patient: any) => (
                          <SelectItem key={patient.id} value={patient.patientId || patient.id.toString()}>
                            {patient.firstName} {patient.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="scheduledAt">Date & Time *</Label>
                    <Input
                      id="scheduledAt"
                      type="datetime-local"
                      value={bookingForm.scheduledAt}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, scheduledAt: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="type">Appointment Type</Label>
                    <Select value={bookingForm.type} onValueChange={(value) => setBookingForm(prev => ({ ...prev, type: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="consultation">Consultation</SelectItem>
                        <SelectItem value="follow_up">Follow-up</SelectItem>
                        <SelectItem value="check_up">Check-up</SelectItem>
                        <SelectItem value="procedure">Procedure</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="duration">Duration (minutes)</Label>
                    <Select value={bookingForm.duration} onValueChange={(value) => setBookingForm(prev => ({ ...prev, duration: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="45">45 minutes</SelectItem>
                        <SelectItem value="60">60 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="md:col-span-2">
                    <Label htmlFor="title">Title (optional)</Label>
                    <Input
                      id="title"
                      placeholder="Enter appointment title"
                      value={bookingForm.title}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Enter appointment description or notes"
                      value={bookingForm.description}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      placeholder="Room or department location"
                      value={bookingForm.location}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, location: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedDoctor(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleBookAppointment}
                    disabled={createAppointmentMutation.isPending}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    {createAppointmentMutation.isPending ? "Booking..." : "Book Appointment"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* New Appointment Modal */}
        {showNewAppointmentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Schedule New Appointment
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowNewAppointmentModal(false);
                      setSelectedSpecialty("");
                      setSelectedSubSpecialty("");
                      setFilteredDoctors([]);
                      setSelectedDoctor(null);
                      setSelectedDate(undefined);
                      setSelectedTimeSlot("");
                    }}
                    data-testid="button-close-modal"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Left Column - Filters and Doctor Selection */}
                  <div className="space-y-6">
                    {/* Step 1: Select Specialty */}
                    <div>
                      <Label className="text-sm font-medium text-gray-900 dark:text-white">
                        Select Medical Specialty Category
                      </Label>
                      <Popover open={specialtyComboboxOpen} onOpenChange={setSpecialtyComboboxOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={specialtyComboboxOpen}
                            className="mt-2 w-full justify-between"
                            data-testid="trigger-specialty-combobox"
                          >
                            {selectedSpecialty || "Select Specialty"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <Command>
                            <CommandInput 
                              placeholder="Search specialties..." 
                              data-testid="input-search-specialty"
                            />
                            <CommandList>
                              <CommandEmpty>No specialty found.</CommandEmpty>
                              <CommandGroup>
                                {getUniqueSpecialties().map((specialty) => (
                                  <CommandItem
                                    key={specialty}
                                    value={specialty}
                                    onSelect={(currentValue) => {
                                      setSelectedSpecialty(currentValue === selectedSpecialty ? "" : currentValue);
                                      setSpecialtyComboboxOpen(false);
                                    }}
                                    data-testid={`item-specialty-${specialty.replace(/\s+/g, '-').toLowerCase()}`}
                                  >
                                    <Check
                                      className={`mr-2 h-4 w-4 ${
                                        specialty === selectedSpecialty ? "opacity-100" : "opacity-0"
                                      }`}
                                    />
                                    {specialty}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Step 2: Select Sub-Specialty */}
                    <div>
                      <Label className="text-sm font-medium text-gray-900 dark:text-white">
                        Select Sub-Specialty
                      </Label>
                      <Select 
                        value={selectedSubSpecialty} 
                        onValueChange={setSelectedSubSpecialty}
                        data-testid="select-subspecialty"
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Select Sub-Specialty" />
                        </SelectTrigger>
                        <SelectContent>
                          {getSubSpecialties(selectedSpecialty).map((subSpecialty) => (
                            <SelectItem key={subSpecialty} value={subSpecialty}>
                              {subSpecialty}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Step 3: Select Doctor */}
                    <div>
                      <Label className="text-sm font-medium text-gray-900 dark:text-white">
                        Select Doctor
                      </Label>
                      {filteredDoctors.length > 0 ? (
                        <Select 
                          value={selectedDoctor?.id?.toString() || ""} 
                          onValueChange={(value) => {
                            const doctor = filteredDoctors.find(d => d.id.toString() === value);
                            setSelectedDoctor(doctor);
                          }}
                          data-testid="select-doctor"
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Select Doctor" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredDoctors.map((doctor) => (
                              <SelectItem key={doctor.id} value={doctor.id.toString()}>
                                Dr. {doctor.firstName} {doctor.lastName} 
                                {doctor.department && ` (${doctor.department})`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                          <p className="text-sm text-yellow-800">
                            {selectedSpecialty ? 
                              "No doctors found for the selected specialty combination. Please try a different selection." :
                              "Loading doctors..."}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Patient Selection */}
                    <div>
                      <Label className="text-sm font-medium text-gray-900 dark:text-white">
                        Select Patient
                      </Label>
                      <Popover open={patientComboboxOpen} onOpenChange={setPatientComboboxOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={patientComboboxOpen}
                            className="mt-2 w-full justify-between"
                            data-testid="trigger-patient-combobox"
                          >
                            {bookingForm.patientId 
                              ? (() => {
                                  const selectedPatient = patients.find((patient: any) => {
                                    const pId = patient.patientId || patient.id.toString();
                                    return pId === bookingForm.patientId;
                                  });
                                  
                                  if (!selectedPatient) {
                                    return "Select patient...";
                                  }
                                  
                                  const displayName = `${selectedPatient.firstName} ${selectedPatient.lastName}`;
                                  const patientId = selectedPatient.patientId || `P${selectedPatient.id.toString().padStart(6, '0')}`;
                                  return `${displayName} (${patientId})`;
                                })()
                              : "Select patient..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <Command>
                            <CommandInput 
                              placeholder="Search patients..." 
                              data-testid="input-search-patient"
                            />
                            <CommandList>
                              <CommandEmpty>No patient found.</CommandEmpty>
                              <CommandGroup>
                                {patients.map((patient: any) => {
                                  const patientValue = patient.patientId || patient.id.toString();
                                  const patientDisplayName = `${patient.firstName} ${patient.lastName}`;
                                  const patientWithId = `${patientDisplayName} (${patient.patientId || `P${patient.id.toString().padStart(6, '0')}`})`;
                                  
                                  return (
                                    <CommandItem
                                      key={patient.id}
                                      value={patientWithId}
                                      onSelect={(currentValue) => {
                                        setBookingForm(prev => ({ ...prev, patientId: patientValue }));
                                        setPatientComboboxOpen(false);
                                      }}
                                      data-testid={`item-patient-${patient.id}`}
                                    >
                                      <Check
                                        className={`mr-2 h-4 w-4 ${
                                          patientValue === bookingForm.patientId ? "opacity-100" : "opacity-0"
                                        }`}
                                      />
                                      {patientWithId}
                                    </CommandItem>
                                  );
                                })}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Patient Information Card - Shows when patient is selected */}
                    {bookingForm.patientId && (
                      <div>
                        <Label className="text-sm font-medium text-gray-900 dark:text-white mb-2 block">
                          Patient Information
                        </Label>
                        {(() => {
                          const selectedPatient = patients.find((patient: any) => 
                            (patient.patientId || patient.id.toString()) === bookingForm.patientId
                          );
                          
                          if (!selectedPatient) return null;
                          
                          // Calculate age from date of birth
                          const age = selectedPatient.dateOfBirth 
                            ? new Date().getFullYear() - new Date(selectedPatient.dateOfBirth).getFullYear()
                            : null;
                          
                          // Get patient initials for avatar
                          const initials = `${selectedPatient.firstName?.[0] || ''}${selectedPatient.lastName?.[0] || ''}`.toUpperCase();
                          
                          return (
                            <Card className="mt-2">
                              <CardContent className="p-4">
                                <div className="flex items-start gap-4">
                                  {/* Patient Avatar */}
                                  <div className="flex-shrink-0">
                                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-lg" data-testid={`avatar-patient-${selectedPatient.id}`}>
                                      {initials}
                                    </div>
                                  </div>
                                  
                                  {/* Patient Details */}
                                  <div className="flex-1 space-y-3">
                                    {/* Name and Age/ID */}
                                    <div>
                                      <h3 className="font-semibold text-lg text-gray-900 dark:text-white" data-testid={`text-patient-name-${selectedPatient.id}`}>
                                        {selectedPatient.firstName} {selectedPatient.lastName}
                                      </h3>
                                      <p className="text-gray-600 dark:text-gray-400" data-testid={`text-patient-age-id-${selectedPatient.id}`}>
                                        {age && `Age ${age} • `}{selectedPatient.patientId || `P${selectedPatient.id.toString().padStart(6, '0')}`}
                                      </p>
                                    </div>
                                    
                                    {/* Contact Information */}
                                    <div className="space-y-2 text-sm">
                                      {(selectedPatient.phone || selectedPatient.phoneNumber) && (
                                        <div className="flex items-center gap-2" data-testid={`text-patient-phone-${selectedPatient.id}`}>
                                          <Phone className="h-4 w-4 text-gray-500" />
                                          <span className="text-gray-700 dark:text-gray-300">{selectedPatient.phone || selectedPatient.phoneNumber}</span>
                                        </div>
                                      )}
                                      
                                      {selectedPatient.email && (
                                        <div className="flex items-center gap-2" data-testid={`text-patient-email-${selectedPatient.id}`}>
                                          <Mail className="h-4 w-4 text-gray-500" />
                                          <span className="text-gray-700 dark:text-gray-300">{selectedPatient.email}</span>
                                        </div>
                                      )}
                                      
                                      {selectedPatient.nhsNumber && (
                                        <div className="flex items-center gap-2" data-testid={`text-patient-nhs-${selectedPatient.id}`}>
                                          <FileText className="h-4 w-4 text-gray-500" />
                                          <span className="text-gray-700 dark:text-gray-300">NHS: {selectedPatient.nhsNumber}</span>
                                        </div>
                                      )}
                                      
                                      {selectedPatient.address && (selectedPatient.address.city || selectedPatient.address.country) && (
                                        <div className="flex items-center gap-2" data-testid={`text-patient-address-${selectedPatient.id}`}>
                                          <MapPin className="h-4 w-4 text-gray-500" />
                                          <span className="text-gray-700 dark:text-gray-300">
                                            {[selectedPatient.address.city, selectedPatient.address.country].filter(Boolean).join(', ')}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Right Column - Calendar and Time Slots */}
                  <div className="space-y-6">
                    {/* Step 4: Select Date */}
                    <div>
                      <Label className="text-sm font-medium text-gray-900 dark:text-white mb-2 block">
                        Select Date
                      </Label>
                      <CalendarComponent
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        disabled={(date) => {
                          // Disable past dates (but allow today)
                          if (isBefore(startOfDay(date), startOfDay(new Date()))) return true;
                          
                          // Disable days not in doctor's working days (if doctor is selected)
                          if (selectedDoctor?.workingDays?.length > 0) {
                            const dayName = format(date, 'EEEE');
                            return !selectedDoctor.workingDays.includes(dayName);
                          }
                          
                          return false;
                        }}
                        className="rounded-md border"
                        data-testid="calendar-date-picker"
                      />
                    </div>

                    {/* Step 5: Select Time Slot */}
                    <div>
                      <Label className="text-sm font-medium text-gray-900 dark:text-white mb-3 block">
                        Select Time Slot
                      </Label>
                      {selectedDoctor && selectedDate ? (
                        <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                          {generateTimeSlots(selectedDoctor.workingHours).map((timeSlot) => {
                            const isAvailable = isTimeSlotAvailable(timeSlot);
                            const isSelected = selectedTimeSlot === timeSlot;
                            
                            return (
                              <Button
                                key={timeSlot}
                                variant={isSelected ? "default" : "outline"}
                                size="sm"
                                className={`
                                  ${isAvailable && !isSelected 
                                    ? "bg-green-100 hover:bg-green-200 text-green-800 border-green-300" 
                                    : ""
                                  }
                                  ${!isAvailable 
                                    ? "bg-gray-300 text-gray-500 cursor-not-allowed opacity-50" 
                                    : ""
                                  }
                                  ${isSelected 
                                    ? "bg-blue-600 text-white" 
                                    : ""
                                  }
                                `}
                                onClick={() => isAvailable && setSelectedTimeSlot(timeSlot)}
                                disabled={!isAvailable}
                                data-testid={`time-slot-${timeSlot.replace(':', '-')}`}
                              >
                                {format(new Date(`2000-01-01T${timeSlot}:00`), 'h:mm a')}
                              </Button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-md">
                          <p className="text-sm text-gray-600">
                            Please select a doctor and date to view available time slots.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Booking Summary - Always visible */}
                <div className="mt-6 pt-6 border-t">
                  <Label className="text-lg font-medium text-gray-900 dark:text-white mb-4 block">
                    Booking Summary
                  </Label>
                  <Card>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <Label className="text-gray-600 dark:text-gray-400">Medical Specialty</Label>
                          <p className="font-medium" data-testid="text-summary-specialty">
                            {selectedSpecialty || "Not selected"}
                          </p>
                        </div>
                        <div>
                          <Label className="text-gray-600 dark:text-gray-400">Sub-Specialty</Label>
                          <p className="font-medium" data-testid="text-summary-subspecialty">
                            {selectedSubSpecialty || "Not selected"}
                          </p>
                        </div>
                        <div>
                          <Label className="text-gray-600 dark:text-gray-400">Patient</Label>
                          <p className="font-medium" data-testid="text-summary-patient">
                            {bookingForm.patientId 
                              ? (() => {
                                  const patient = patients.find((p: any) => 
                                    (p.patientId || p.id.toString()) === bookingForm.patientId
                                  );
                                  return patient ? `${patient.firstName} ${patient.lastName}` : "Not found";
                                })()
                              : "Not selected"}
                          </p>
                        </div>
                        <div>
                          <Label className="text-gray-600 dark:text-gray-400">Doctor</Label>
                          <p className="font-medium" data-testid="text-summary-doctor">
                            {selectedDoctor 
                              ? `Dr. ${selectedDoctor.firstName} ${selectedDoctor.lastName}`
                              : "Not selected"}
                          </p>
                        </div>
                        <div>
                          <Label className="text-gray-600 dark:text-gray-400">Date</Label>
                          <p className="font-medium" data-testid="text-summary-date">
                            {selectedDate 
                              ? format(selectedDate, 'EEEE, MMMM dd, yyyy')
                              : "Not selected"}
                          </p>
                        </div>
                        <div>
                          <Label className="text-gray-600 dark:text-gray-400">Time</Label>
                          <p className="font-medium" data-testid="text-summary-time">
                            {selectedTimeSlot 
                              ? format(new Date(`2000-01-01T${selectedTimeSlot}:00`), 'h:mm a')
                              : "Not selected"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Book Appointment Button */}
                {selectedDoctor && selectedDate && selectedTimeSlot && bookingForm.patientId && (
                  <div className="flex justify-end gap-2 mt-6 pt-6 border-t">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowNewAppointmentModal(false);
                        setSelectedSpecialty("");
                        setSelectedSubSpecialty("");
                        setFilteredDoctors([]);
                        setSelectedDoctor(null);
                        setSelectedDate(undefined);
                        setSelectedTimeSlot("");
                      }}
                      data-testid="button-cancel-appointment"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        const appointmentDateTime = `${format(selectedDate, 'yyyy-MM-dd')}T${selectedTimeSlot}:00`;
                        
                        // Handle both numeric and string patient IDs
                        let patientId: string | number = bookingForm.patientId;
                        if (/^\d+$/.test(bookingForm.patientId)) {
                          patientId = parseInt(bookingForm.patientId);
                        }

                        const appointmentData = {
                          ...bookingForm,
                          patientId: patientId,
                          providerId: Number(selectedDoctor.id), // Ensure numeric ID consistency
                          title: bookingForm.title || `${bookingForm.type} with ${selectedDoctor.firstName} ${selectedDoctor.lastName}`,
                          location: bookingForm.location || `${selectedDoctor.department} Department`,
                          duration: parseInt(bookingForm.duration),
                          scheduledAt: appointmentDateTime
                        };

                        createAppointmentMutation.mutate(appointmentData);
                      }}
                      disabled={createAppointmentMutation.isPending}
                      data-testid="button-book-appointment"
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      {createAppointmentMutation.isPending ? "Booking..." : "Book Appointment"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}