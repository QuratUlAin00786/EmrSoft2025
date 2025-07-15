import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Clock, MapPin, User, Video, Stethoscope, FileText } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { FullConsultationInterface } from "@/components/consultation/full-consultation-interface";
import type { Appointment } from "@/types";

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
  const { toast } = useToast();

  const [appointments, setAppointments] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingAppointment, setIsCreatingAppointment] = useState(false);
  
  // Form state for new appointment
  const [formData, setFormData] = useState({
    patientId: "",
    providerId: "",
    title: "",
    description: "",
    date: format(new Date(), "yyyy-MM-dd"),
    time: "09:00",
    type: "consultation",
    duration: "30",
    isVirtual: false,
    location: "",
    department: ""
  });

  const fetchAppointments = async () => {
    try {
      setIsLoading(true);
      console.log("Fetching appointments from calendar...");
      
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'X-Tenant-Subdomain': 'demo'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/appointments', {
        headers,
        credentials: 'include'
      });
      
      console.log("Appointments response status:", response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Fetched appointments data:", data);
      setAppointments(data || []);
    } catch (err) {
      console.error("Error fetching appointments:", err);
      setAppointments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'X-Tenant-Subdomain': 'demo'
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
      
      const data = await response.json();
      // Remove duplicates based on patient name (what user sees)
      const uniquePatients = data ? data.filter((patient: any, index: number, self: any[]) => 
        index === self.findIndex((p: any) => `${p.firstName} ${p.lastName}` === `${patient.firstName} ${patient.lastName}`)
      ) : [];
      setPatients(uniquePatients);
    } catch (err) {
      console.error("Error fetching patients:", err);
      setPatients([]);
    }
  };

  const fetchProviders = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'X-Tenant-Subdomain': 'demo'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/medical-staff', {
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      // Remove duplicates based on provider name (what user sees)
      const uniqueProviders = data ? data.filter((provider: any, index: number, self: any[]) => 
        index === self.findIndex((p: any) => `${p.firstName} ${p.lastName}` === `${provider.firstName} ${provider.lastName}`)
      ) : [];
      setProviders(uniqueProviders);
    } catch (err) {
      console.error("Error fetching providers:", err);
      setProviders([]);
    }
  };

  useEffect(() => {
    fetchAppointments();
    fetchPatients();
    fetchProviders();
  }, []);

  const createAppointment = async () => {
    if (!formData.patientId || !formData.providerId || !formData.title || !formData.department) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields including department",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsCreatingAppointment(true);
      
      // Combine date and time into a proper datetime
      const scheduledAt = new Date(`${formData.date}T${formData.time}`);
      
      const appointmentData = {
        patientId: formData.patientId, // Send as string for backend to handle properly
        providerId: parseInt(formData.providerId),
        title: formData.title,
        description: formData.description,
        scheduledAt: scheduledAt.toISOString(),
        duration: parseInt(formData.duration),
        type: formData.type,
        location: formData.isVirtual ? "Virtual" : `${formData.location || 'Room 101'}, ${formData.department} Department`,
        isVirtual: formData.isVirtual
      };

      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Tenant-Subdomain': 'demo'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(appointmentData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const newAppointment = await response.json();
      
      // Refresh the appointments list from the server
      await fetchAppointments();
      
      // Reset form and close dialog
      setFormData({
        patientId: "",
        providerId: "",
        title: "",
        description: "",
        date: format(selectedDate, "yyyy-MM-dd"),
        time: "09:00",
        type: "consultation",
        duration: "30",
        isVirtual: false,
        location: "",
        department: ""
      });
      
      setShowNewAppointment(false);
      
      toast({
        title: "Appointment Scheduled",
        description: "New appointment has been successfully created",
      });
      
    } catch (error) {
      console.error("Error creating appointment:", error);
      toast({
        title: "Error",
        description: "Failed to create appointment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCreatingAppointment(false);
    }
  };

  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getAppointmentsForDate = (date: Date) => {
    return (appointments as any || []).filter((apt: any) => 
      isSameDay(new Date(apt.scheduledAt), date)
    );
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
                onClick={() => {
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
                      {dayAppointments.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1 justify-center">
                          {dayAppointments.slice(0, 2).map((apt: any, index: number) => (
                            <div
                              key={index}
                              className="w-2 h-2 rounded-full bg-blue-500"
                            />
                          ))}
                          {dayAppointments.length > 2 && (
                            <div className="text-xs text-gray-500">+{dayAppointments.length - 2}</div>
                          )}
                        </div>
                      )}
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

      {/* Selected Date Appointments */}
      <Card>
        <CardHeader>
          <CardTitle>
            Appointments for {format(selectedDate, "EEEE, MMMM d, yyyy")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedDateAppointments.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No appointments scheduled for this date
            </p>
          ) : (
            <div className="space-y-4">
              {selectedDateAppointments.map((appointment: Appointment) => (
                <div
                  key={appointment.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex flex-col space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold">{appointment.title}</h4>
                      <Badge className={statusColors[appointment.status]}>
                        {appointment.status}
                      </Badge>
                      <Badge className={typeColors[appointment.type]}>
                        {appointment.type}
                      </Badge>
                      {appointment.location && appointment.location.includes('Department') && (
                        <Badge className="bg-blue-100 text-blue-800">
                          {(() => {
                            const parts = appointment.location.split(', ');
                            return parts.find(part => part.includes('Department')) || 
                                   parts[parts.length - 1];
                          })()}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {format(new Date(appointment.scheduledAt), "h:mm a")} 
                        ({appointment.duration} min)
                      </div>
                      {appointment.isVirtual ? (
                        <div className="flex items-center gap-1">
                          <Video className="h-4 w-4" />
                          Virtual
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {appointment.location || "In-person"}
                        </div>
                      )}
                    </div>
                    
                    {appointment.description && (
                      <p className="text-sm text-gray-600">
                        {appointment.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <User className="h-4 w-4" />
                      Patient ID: {appointment.patientId}
                    </div>
                    
                    <div className="flex gap-2 flex-wrap">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedAppointment(appointment);
                          setShowAppointmentDetails(true);
                          toast({
                            title: "Appointment Details",
                            description: "Viewing appointment information",
                          });
                        }}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                      {appointment.status === "scheduled" && (
                        <Button 
                          size="sm"
                          onClick={() => {
                            setSelectedAppointment(appointment);
                            setShowConsultation(true);
                            toast({
                              title: "Starting Consultation",
                              description: `Beginning consultation for Patient ${appointment.patientId}`,
                            });
                          }}
                        >
                          <Stethoscope className="h-4 w-4 mr-1" />
                          Start Consultation
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
                          return parts.find(part => part.includes('Department')) || 
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
                      const token = localStorage.getItem('auth_token');
                      const headers: Record<string, string> = {
                        'X-Tenant-Subdomain': 'demo'
                      };
                      
                      if (token) {
                        headers['Authorization'] = `Bearer ${token}`;
                      }

                      const response = await fetch(`/api/appointments/${selectedAppointment.id}`, {
                        method: 'DELETE',
                        headers,
                        credentials: 'include'
                      });

                      if (!response.ok) {
                        throw new Error(`HTTP ${response.status}`);
                      }

                      await fetchAppointments(); // Refresh the appointments list
                      setShowAppointmentDetails(false);
                      
                      toast({
                        title: "Appointment Deleted",
                        description: "The appointment has been successfully deleted",
                      });
                    } catch (error) {
                      console.error("Error deleting appointment:", error);
                      toast({
                        title: "Error",
                        description: "Failed to delete appointment. Please try again.",
                        variant: "destructive"
                      });
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

      {/* New Appointment Dialog */}
      <Dialog open={showNewAppointment} onOpenChange={setShowNewAppointment}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Schedule New Appointment
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto max-h-[calc(90vh-120px)]">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Patient *</label>
                <select 
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={formData.patientId}
                  onChange={(e) => setFormData(prev => ({ ...prev, patientId: e.target.value }))}
                >
                  <option value="">Select patient...</option>
                  {patients.map((patient: any) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.firstName} {patient.lastName} ({patient.patientId})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Provider *</label>
                <select 
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={formData.providerId}
                  onChange={(e) => setFormData(prev => ({ ...prev, providerId: e.target.value }))}
                >
                  <option value="">Select provider...</option>
                  {providers.map((provider: any) => (
                    <option key={provider.id} value={provider.id}>
                      Dr. {provider.firstName} {provider.lastName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Department *</label>
              <select 
                className="w-full p-2 border border-gray-300 rounded-md"
                value={formData.department}
                onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
              >
                <option value="">Select department...</option>
                <option value="Cardiology">Cardiology</option>
                <option value="Neurology">Neurology</option>
                <option value="Orthopedics">Orthopedics</option>
                <option value="Pediatrics">Pediatrics</option>
                <option value="Dermatology">Dermatology</option>
                <option value="Radiology">Radiology</option>
                <option value="Emergency Medicine">Emergency Medicine</option>
                <option value="Family Medicine">Family Medicine</option>
                <option value="Internal Medicine">Internal Medicine</option>
                <option value="Surgery">Surgery</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Title *</label>
              <input 
                type="text"
                className="w-full p-2 border border-gray-300 rounded-md"
                placeholder="Enter appointment title..."
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Date</label>
                <input 
                  type="date" 
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Time</label>
                <input 
                  type="time" 
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={formData.time}
                  onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Type</label>
                <select 
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                >
                  <option value="consultation">Consultation</option>
                  <option value="follow_up">Follow-up</option>
                  <option value="procedure">Procedure</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Duration (minutes)</label>
                <select 
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={formData.duration}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Description</label>
              <textarea 
                className="w-full p-2 border border-gray-300 rounded-md"
                rows={3}
                placeholder="Enter appointment details..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="virtual" 
                className="rounded"
                checked={formData.isVirtual}
                onChange={(e) => setFormData(prev => ({ ...prev, isVirtual: e.target.checked }))}
              />
              <label htmlFor="virtual" className="text-sm text-gray-700">Virtual appointment</label>
            </div>
            
            {!formData.isVirtual && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Location</label>
                <input 
                  type="text"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="Enter appointment location..."
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>
            )}
            
            <div className="flex gap-2 pt-4">
              <Button 
                onClick={createAppointment}
                disabled={isCreatingAppointment}
              >
                {isCreatingAppointment ? "Scheduling..." : "Schedule Appointment"}
              </Button>
              <Button variant="outline" onClick={() => setShowNewAppointment(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}