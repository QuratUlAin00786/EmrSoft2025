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
import { Calendar, Plus, Users, Clock, User, X } from "lucide-react";
import { useState, useEffect } from "react";
import { format, isBefore, startOfDay } from "date-fns";
import { useLocation } from "wouter";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function CalendarPage() {
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false);
  const [selectedSpecialty, setSelectedSpecialty] = useState("");
  const [selectedSubSpecialty, setSelectedSubSpecialty] = useState("");
  const [filteredDoctors, setFilteredDoctors] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("");
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
  
  // Fetch medical staff for specialty filtering
  const { data: medicalStaffResponse } = useQuery<any>({
    queryKey: ["/api/medical-staff"],
    retry: false,
  });
  
  const medicalStaff = medicalStaffResponse?.staff || [];
  
  // Helper functions for specialty filtering
  const getUniqueSpecialties = (): string[] => {
    if (!Array.isArray(medicalStaff)) return [];
    const specialties = (medicalStaff as any[])
      .filter((staff: any) => staff.role === 'doctor' && staff.medicalSpecialtyCategory)
      .map((staff: any) => staff.medicalSpecialtyCategory as string);
    return [...new Set(specialties)];
  };
  
  const getSubSpecialties = (specialty: string): string[] => {
    if (!Array.isArray(medicalStaff)) return [];
    const subSpecialties = (medicalStaff as any[])
      .filter((staff: any) => 
        staff.role === 'doctor' && 
        staff.medicalSpecialtyCategory === specialty && 
        staff.subSpecialty
      )
      .map((staff: any) => staff.subSpecialty as string);
    return [...new Set(subSpecialties)];
  };
  
  const filterDoctorsBySpecialty = () => {
    if (!selectedSpecialty || !Array.isArray(medicalStaff)) return [];
    
    const filtered = (medicalStaff as any[]).filter((staff: any) => 
      staff.role === 'doctor' && 
      staff.medicalSpecialtyCategory === selectedSpecialty &&
      (!selectedSubSpecialty || staff.subSpecialty === selectedSubSpecialty)
    );
    
    setFilteredDoctors(filtered);
    return filtered;
  };
  
  // Generate time slots based on doctor's working hours
  const generateTimeSlots = (workingHours: any) => {
    const slots = [];
    const startHour = parseInt(workingHours?.start?.split(':')[0] || '9');
    const endHour = parseInt(workingHours?.end?.split(':')[0] || '17');
    
    for (let hour = startHour; hour < endHour; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    
    return slots;
  };
  
  // Fetch existing appointments for selected doctor and date
  const { data: existingAppointments = [] } = useQuery<any[]>({
    queryKey: ["/api/appointments", selectedDoctor?.id, selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null],
    enabled: !!(selectedDoctor && selectedDate),
    retry: false,
  });
  
  // Check if time slot is available with proper overlap detection
  const isTimeSlotAvailable = (timeSlot: string) => {
    if (!selectedDate) return false;
    
    // Calculate slot start and end times
    const slotDate = format(selectedDate, 'yyyy-MM-dd');
    const slotStart = new Date(`${slotDate}T${timeSlot}:00`);
    const slotDuration = parseInt(bookingForm.duration) || 30; // Default 30 minutes
    const slotEnd = new Date(slotStart.getTime() + slotDuration * 60 * 1000);
    
    // Check if slot is in the past (for same-day bookings)
    const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
    if (isToday && slotStart < new Date()) {
      return false; // Disable past time slots on today
    }
    
    // Check for overlaps with existing appointments
    if (existingAppointments?.length) {
      return !existingAppointments.some((apt: any) => {
        // Only check appointments for the same doctor
        if (apt.providerId !== selectedDoctor?.id) return false;
        
        // Calculate existing appointment start and end times
        const aptStart = new Date(apt.scheduledAt);
        const aptDuration = apt.duration || 30; // Default 30 minutes
        const aptEnd = new Date(aptStart.getTime() + aptDuration * 60 * 1000);
        
        // Check for overlap: slotStart < aptEnd && aptStart < slotEnd
        return slotStart < aptEnd && aptStart < slotEnd;
      });
    }
    
    return true;
  };
  
  // Update filtered doctors when specialty/sub-specialty changes
  useEffect(() => {
    if (selectedSpecialty) {
      filterDoctorsBySpecialty();
    }
  }, [selectedSpecialty, selectedSubSpecialty, medicalStaff]);
  
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
      // Invalidate specific appointment queries for the doctor/date
      if (selectedDoctor && selectedDate) {
        queryClient.invalidateQueries({ 
          queryKey: ["/api/appointments", selectedDoctor.id, format(selectedDate, 'yyyy-MM-dd')] 
        });
      }
      // Force immediate refetch to ensure appointments list updates
      queryClient.refetchQueries({ queryKey: ["/api/appointments"] });
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
      
      // Check if the error message contains patient not found (server returns 400: {"error":"Patient not found"})
      if (error.message && error.message.includes("Patient not found")) {
        errorMessage = "Patient not found. Please use a valid patient ID like: 165, 159, P000004, P000005, or P000158.";
      }
      
      toast({
        title: "Error",
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
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              View appointments, manage schedules, and book new consultations.
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
                      <Select 
                        value={selectedSpecialty} 
                        onValueChange={setSelectedSpecialty}
                        data-testid="select-specialty"
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Select Specialty" />
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

                    {/* Step 2: Select Sub-Specialty */}
                    {selectedSpecialty && (
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
                    )}

                    {/* Step 3: Select Doctor */}
                    {selectedSpecialty && (
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
                              No doctors found for the selected specialty combination. Please try a different selection.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Patient Selection */}
                    {selectedDoctor && (
                      <div>
                        <Label className="text-sm font-medium text-gray-900 dark:text-white">
                          Select Patient
                        </Label>
                        <Select 
                          value={bookingForm.patientId} 
                          onValueChange={(value) => setBookingForm(prev => ({ ...prev, patientId: value }))}
                          data-testid="select-patient"
                        >
                          <SelectTrigger className="mt-2">
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
                    )}
                  </div>

                  {/* Right Column - Calendar and Time Slots */}
                  <div className="space-y-6">
                    {/* Step 4: Select Date */}
                    {selectedDoctor && (
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
                            
                            // Disable days not in doctor's working days
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
                    )}

                    {/* Step 5: Select Time Slot */}
                    {selectedDoctor && selectedDate && (
                      <div>
                        <Label className="text-sm font-medium text-gray-900 dark:text-white mb-3 block">
                          Select Time Slot
                        </Label>
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
                      </div>
                    )}
                  </div>
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
                          providerId: selectedDoctor.id,
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