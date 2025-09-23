import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarContent, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Stethoscope, User, Calendar, Clock, MapPin, Edit } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import type { User as Doctor, Appointment } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface DoctorListProps {
  onSelectDoctor?: (doctor: Doctor) => void;
  showAppointmentButton?: boolean;
}

const departmentColors = {
  "Cardiology": "bg-red-100 text-red-800",
  "General Medicine": "bg-blue-100 text-blue-800",
  "Pediatrics": "bg-green-100 text-green-800",
  "Orthopedics": "bg-purple-100 text-purple-800",
  "Neurology": "bg-indigo-100 text-indigo-800",
  "Dermatology": "bg-yellow-100 text-yellow-800",
  "Psychiatry": "bg-pink-100 text-pink-800",
  "Surgery": "bg-gray-100 text-gray-800",
  "Emergency": "bg-orange-100 text-orange-800",
  "Administration": "bg-slate-100 text-slate-800"
};

const roleColors = {
  "doctor": "bg-blue-100 text-blue-800",
  "nurse": "bg-green-100 text-green-800",
  "admin": "bg-purple-100 text-purple-800",
  "receptionist": "bg-orange-100 text-orange-800"
};

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function DoctorList({ onSelectDoctor, showAppointmentButton = false }: DoctorListProps) {
  const [, setLocation] = useLocation();
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [workingDays, setWorkingDays] = useState<string[]>([]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  
  // Booking dialog state
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedBookingDoctor, setSelectedBookingDoctor] = useState<Doctor | null>(null);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [selectedDateTime, setSelectedDateTime] = useState("");
  const [appointmentType, setAppointmentType] = useState("Consultation");
  const [duration, setDuration] = useState("30");
  const [appointmentTitle, setAppointmentTitle] = useState("");
  const [appointmentDescription, setAppointmentDescription] = useState("");
  const [appointmentLocation, setAppointmentLocation] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: medicalStaffResponse, isLoading, error } = useQuery({
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

  const updateScheduleMutation = useMutation({
    mutationFn: async (data: { userId: number; workingDays: string[]; workingHours: { start: string; end: string } }) => {
      const response = await apiRequest("PATCH", `/api/users/${data.userId}`, {
        workingDays: data.workingDays,
        workingHours: data.workingHours
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
          workingHours: updatedUserData.workingHours || { start: "09:00", end: "17:00" }
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

  const openScheduleDialog = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setWorkingDays(doctor.workingDays || []);
    const hours = doctor.workingHours as { start?: string; end?: string } || {};
    setStartTime(hours.start || "09:00");
    setEndTime(hours.end || "17:00");
    setIsScheduleOpen(true);
  };

  const openBookingDialog = (doctor: Doctor) => {
    setSelectedBookingDoctor(doctor);
    setSelectedPatient("");
    setSelectedDateTime("");
    setAppointmentType("Consultation");
    setDuration("30");
    setAppointmentTitle("");
    setAppointmentDescription("");
    setAppointmentLocation("");
    setIsBookingOpen(true);
  };


  const handleScheduleUpdate = () => {
    if (!selectedDoctor) return;
    
    updateScheduleMutation.mutate({
      userId: selectedDoctor.id,
      workingDays,
      workingHours: { start: startTime, end: endTime }
    });
  };

  const toggleWorkingDay = (day: string) => {
    setWorkingDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const formatTime = (time: string): string => {
    if (!time) return "";
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };
  
  // Filter to show only available staff members
  // Based on backend logic: staff are available if they have no working days set OR if today is in their working days
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const availableStaff = medicalStaff.filter((doctor: Doctor) => {
    // If no working days are set, staff is considered available (like mobile users)
    if (!doctor.workingDays || doctor.workingDays.length === 0) {
      return true;
    }
    // If working days are set, check if today is included
    return doctor.workingDays.includes(today);
  });

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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Medical Staff
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No available medical staff</p>
            <p className="text-sm text-gray-400 mt-1">All staff are currently off duty</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Stethoscope className="h-5 w-5" />
          Medical Staff ({availableDoctors}/{totalDoctors} Available)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {availableStaff.map((doctor: Doctor) => (
            <div 
              key={doctor.id} 
              className="flex items-start justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              <div className="flex items-start gap-3 flex-1">
                <Avatar>
                  <AvatarFallback className="bg-blue-100 text-blue-700">
                    {getInitials(doctor.firstName, doctor.lastName)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 
                      className="font-semibold text-gray-900 dark:text-gray-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      onClick={() => openScheduleDialog(doctor)}
                    >
                      Dr. {doctor.firstName} {doctor.lastName}
                    </h4>
                    <Badge className={roleColors[doctor.role as keyof typeof roleColors] || "bg-gray-100 text-gray-800"}>
                      {doctor.role}
                    </Badge>
                  </div>
                  
                  {doctor.department && (
                    <div className="flex items-center gap-1 mb-2">
                      <MapPin className="h-3 w-3 text-gray-400" />
                      <Badge 
                        variant="outline" 
                        className={departmentColors[doctor.department as keyof typeof departmentColors] || "bg-gray-100 text-gray-800"}
                      >
                        {doctor.department}
                      </Badge>
                    </div>
                  )}

                  {/* Working Hours Display */}
                  {doctor.workingDays && doctor.workingDays.length > 0 && doctor.workingHours && (
                    <div className="flex items-center gap-1 mb-2">
                      <Clock className="h-3 w-3 text-blue-500 dark:text-blue-400" />
                      <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                        {doctor.workingDays.slice(0, 3).join(", ")}
                        {doctor.workingDays.length > 3 && ` +${doctor.workingDays.length - 3} more`} 
                        {" · "}{doctor.workingHours.start} - {doctor.workingHours.end}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      ID: {doctor.id}
                    </span>
                    {doctor.lastLoginAt && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Last active: {new Date(doctor.lastLoginAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                {showAppointmentButton && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      openBookingDialog(doctor);
                    }}
                  >
                    <Calendar className="h-3 w-3 mr-1" />
                    Book
                  </Button>
                )}
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    openScheduleDialog(doctor);
                  }}
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Edit Schedule
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLocation(`/staff/${doctor.id}`);
                  }}
                >
                  View Profile
                </Button>
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
              Edit Schedule - Dr. {selectedDoctor?.firstName} {selectedDoctor?.lastName}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Working Days */}
            <div>
              <Label className="text-base font-medium">Working Days</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
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
                  {selectedDoctor.workingDays && selectedDoctor.workingDays.length > 0 ? (
                    <>
                      <p>Days: {selectedDoctor.workingDays.join(", ")}</p>
                      {selectedDoctor.workingHours && (
                        <p>Hours: {formatTime(selectedDoctor.workingHours.start || "")} - {formatTime(selectedDoctor.workingHours.end || "")}</p>
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
                {updateScheduleMutation.isPending ? "Updating..." : "Update Schedule"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Booking Dialog */}
      <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Book Appointment with {selectedBookingDoctor?.firstName} {selectedBookingDoctor?.lastName}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Top row - Patient and Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              {/* Patient Selection */}
              <div>
                <Label className="text-sm font-medium">
                  Patient <span className="text-red-500">*</span>
                </Label>
                <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select patient..." />
                  </SelectTrigger>
                  <SelectContent>
                    {patients?.map((patient: any) => (
                      <SelectItem key={patient.id} value={patient.id.toString()}>
                        {patient.firstName} {patient.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date & Time */}
              <div>
                <Label className="text-sm font-medium">
                  Date & Time <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="datetime-local"
                  value={selectedDateTime}
                  onChange={(e) => setSelectedDateTime(e.target.value)}
                  placeholder="dd/mm/yyyy --:--"
                  className="mt-1"
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>
            </div>

            {/* Second row - Appointment Type and Duration */}
            <div className="grid grid-cols-2 gap-4">
              {/* Appointment Type */}
              <div>
                <Label className="text-sm font-medium">Appointment Type</Label>
                <Select value={appointmentType} onValueChange={setAppointmentType}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Consultation">Consultation</SelectItem>
                    <SelectItem value="Follow-up">Follow-up</SelectItem>
                    <SelectItem value="Emergency">Emergency</SelectItem>
                    <SelectItem value="Check-up">Check-up</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Duration */}
              <div>
                <Label className="text-sm font-medium">Duration (minutes)</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">60 minutes</SelectItem>
                    <SelectItem value="90">90 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Title */}
            <div>
              <Label className="text-sm font-medium">Title (optional)</Label>
              <Input
                type="text"
                value={appointmentTitle}
                onChange={(e) => setAppointmentTitle(e.target.value)}
                placeholder="Enter appointment title"
                className="mt-1"
              />
            </div>

            {/* Description */}
            <div>
              <Label className="text-sm font-medium">Description</Label>
              <Textarea
                value={appointmentDescription}
                onChange={(e) => setAppointmentDescription(e.target.value)}
                placeholder="Enter appointment description or notes"
                className="mt-1 min-h-24"
              />
            </div>

            {/* Location */}
            <div>
              <Label className="text-sm font-medium">Location</Label>
              <Input
                type="text"
                value={appointmentLocation}
                onChange={(e) => setAppointmentLocation(e.target.value)}
                placeholder="Room or department location"
                className="mt-1"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsBookingOpen(false)}
              >
                Cancel
              </Button>
              <Button
                disabled={!selectedPatient || !selectedDateTime}
                onClick={() => {
                  toast({
                    title: "Appointment Booked",
                    description: `Appointment with Dr. ${selectedBookingDoctor?.firstName} ${selectedBookingDoctor?.lastName} has been scheduled successfully.`,
                  });
                  setIsBookingOpen(false);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Book Appointment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}