import { Header } from "@/components/layout/header";
import AppointmentCalendar from "@/components/calendar/appointment-calendar";
import { DoctorList } from "@/components/doctors/doctor-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Plus, Users, Clock, User, X } from "lucide-react";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function CalendarPage() {
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
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
      // Aggressive cache invalidation to ensure calendar updates
      queryClient.removeQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      // Force immediate refresh
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ["/api/appointments"] });
      }, 50);
      setSelectedDoctor(null);
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
        <div className="mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Calendar & Scheduling
            </h3>
            <p className="text-sm text-neutral-600">
              View appointments, manage schedules, and book new consultations.
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Calendar - 2 columns */}
          <div className="lg:col-span-2">
            <AppointmentCalendar />
          </div>
          
          {/* Doctor List - 1 column */}
          <div>
            <div className="mb-4">
              <h4 className="font-medium text-gray-900 flex items-center gap-2 mb-3">
                <Users className="h-4 w-4" />
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
          <div className="bg-yellow-100 border border-yellow-300 p-3 rounded">
            Selected Doctor: {selectedDoctor ? `${selectedDoctor.firstName} ${selectedDoctor.lastName}` : 'None'}
          </div>
        </div>

        {/* Booking Form */}
        {selectedDoctor && (
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
                    <Label htmlFor="patientId">Patient ID *</Label>
                    <Input
                      id="patientId"
                      placeholder="Enter: 165, 159, P000004, P000005, or P000158"
                      value={bookingForm.patientId}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, patientId: e.target.value }))}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Valid IDs: 165, 159, P000004, P000005, P000158
                    </p>
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
      </div>
    </>
  );
}