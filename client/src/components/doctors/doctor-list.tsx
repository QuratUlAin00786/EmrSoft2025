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
import { useState } from "react";
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

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function DoctorList({
  onSelectDoctor,
  showAppointmentButton = false,
}: DoctorListProps) {
  const [, setLocation] = useLocation();
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [workingDays, setWorkingDays] = useState<string[]>([]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

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

  // Fetch doctor appointments for availability checking
  const { data: doctorAppointments } = useQuery({
    queryKey: ["/api/appointments", selectedBookingDoctor?.id, selectedDate],
    queryFn: async () => {
      if (!selectedBookingDoctor?.id || !selectedDate) return [];
      const response = await apiRequest(
        "GET",
        `/api/appointments?doctorId=${selectedBookingDoctor.id}&date=${selectedDate.toISOString().split("T")[0]}`,
      );
      const data = await response.json();
      return data;
    },
    enabled: isBookingOpen && !!selectedBookingDoctor?.id && !!selectedDate,
  });

  // Generate time slots (9 AM to 5 PM, 30-minute intervals)
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour <= 17; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (hour === 17 && minute > 0) break; // Stop at 5:00 PM
        const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
        const displayTime = formatTime(timeString);
        slots.push({ value: timeString, display: displayTime });
      }
    }
    return slots;
  };

  // Check if a time slot is available
  const isTimeSlotAvailable = (timeSlot: string) => {
    if (!doctorAppointments || !selectedDate) return true;

    const slotDateTime = new Date(selectedDate);
    const [hours, minutes] = timeSlot.split(":").map(Number);
    slotDateTime.setHours(hours, minutes, 0, 0);

    return !doctorAppointments.some((appointment: any) => {
      const appointmentDate = new Date(appointment.scheduledAt);
      return (
        Math.abs(appointmentDate.getTime() - slotDateTime.getTime()) <
        30 * 60 * 1000
      ); // 30 minutes threshold
    });
  };

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
      toast({
        title: "Appointment Booked",
        description: `Appointment with Dr. ${selectedBookingDoctor?.firstName} ${selectedBookingDoctor?.lastName} has been scheduled successfully.`,
      });

      // Invalidate queries to refresh appointment data and availability
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({
        queryKey: [
          "/api/appointments",
          selectedBookingDoctor?.id,
          selectedDate,
        ],
      });

      // Reset form and close dialog
      setSelectedPatient("");
      setSelectedDate(undefined);
      setSelectedTimeSlot("");
      setAppointmentType("Consultation");
      setDuration("30");
      setAppointmentTitle("");
      setAppointmentDescription("");
      setAppointmentLocation("");
      setIsBookingOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Booking Failed",
        description:
          error.message || "Failed to book appointment. Please try again.",
        variant: "destructive",
      });
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

    // Create the appointment datetime without timezone conversion
    const appointmentDateTime = new Date(selectedDate);
    const [hours, minutes] = selectedTimeSlot.split(":").map(Number);
    appointmentDateTime.setHours(hours, minutes, 0, 0);

    // Format datetime without timezone conversion
    const year = appointmentDateTime.getFullYear();
    const month = String(appointmentDateTime.getMonth() + 1).padStart(2, "0");
    const day = String(appointmentDateTime.getDate()).padStart(2, "0");
    const hourStr = String(appointmentDateTime.getHours()).padStart(2, "0");
    const minuteStr = String(appointmentDateTime.getMinutes()).padStart(2, "0");
    const scheduledAtString = `${year}-${month}-${day}T${hourStr}:${minuteStr}:00.000Z`;

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
    };

    bookAppointmentMutation.mutate(appointmentData);
  };

  const openBookingDialog = (doctor: Doctor) => {
    setSelectedBookingDoctor(doctor);
    // Auto-select the first patient if available
    if (patients && patients.length > 0) {
      setSelectedPatient(patients[0].id.toString());
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
  const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
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
            <p className="text-sm text-gray-400 mt-1">
              All staff are currently off duty
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader></CardHeader>
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
                    <Badge
                      className={
                        roleColors[doctor.role as keyof typeof roleColors] ||
                        "bg-gray-100 text-gray-800"
                      }
                    >
                      {doctor.role}
                    </Badge>
                  </div>

                  {doctor.department && (
                    <div className="flex items-center gap-1 mb-2">
                      <MapPin className="h-3 w-3 text-gray-400" />
                      <Badge
                        variant="outline"
                        className={
                          departmentColors[
                            doctor.department as keyof typeof departmentColors
                          ] || "bg-gray-100 text-gray-800"
                        }
                      >
                        {doctor.department}
                      </Badge>
                    </div>
                  )}

                  {/* Working Hours Display */}
                  {doctor.workingDays &&
                    doctor.workingDays.length > 0 &&
                    doctor.workingHours && (
                      <div className="flex items-center gap-1 mb-2">
                        <Clock className="h-3 w-3 text-blue-500 dark:text-blue-400" />
                        <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                          {doctor.workingDays.slice(0, 3).join(", ")}
                          {doctor.workingDays.length > 3 &&
                            ` +${doctor.workingDays.length - 3} more`}
                          {" · "}
                          {doctor.workingHours.start} -{" "}
                          {doctor.workingHours.end}
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
                        Last active:{" "}
                        {new Date(doctor.lastLoginAt).toLocaleDateString()}
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
                    Book
                  </Button>
                )}
                {user?.role !== 'patient' && (
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
                )}
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
      <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
        <DialogContent
          className="max-w-6xl max-h-[90vh] overflow-y-auto"
          aria-describedby="booking-dialog-description"
        >
          <DialogHeader>
            <DialogTitle>
              Schedule New Appointment
            </DialogTitle>
          </DialogHeader>
          <div id="booking-dialog-description" className="sr-only">
            Schedule a new appointment by selecting specialty, doctor, date, and time slot.
          </div>

          <div className="grid grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Select Medical Specialty Category */}
              <div>
                <Label className="text-sm font-medium">Select Medical Specialty Category</Label>
                <Select
                  value={appointmentType}
                  onValueChange={setAppointmentType}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select Specialty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General & Primary Care">General & Primary Care</SelectItem>
                    <SelectItem value="Cardiology">Cardiology</SelectItem>
                    <SelectItem value="Dermatology">Dermatology</SelectItem>
                    <SelectItem value="Neurology">Neurology</SelectItem>
                    <SelectItem value="Orthopedics">Orthopedics</SelectItem>
                    <SelectItem value="Pediatrics">Pediatrics</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Select Sub-Specialty */}
              <div>
                <Label className="text-sm font-medium">Select Sub-Specialty</Label>
                <Select
                  value=""
                  onValueChange={() => {}}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select Sub-Specialty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general-practitioner">General Practitioner (GP) / Family Physician</SelectItem>
                    <SelectItem value="internal-medicine">Internal Medicine</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Select Doctor */}
              <div>
                <Label className="text-sm font-medium">Select Doctor</Label>
                <Select
                  value={selectedBookingDoctor?.id.toString() || ""}
                  onValueChange={(value) => {
                    const doctor = availableStaff.find((d: Doctor) => d.id.toString() === value);
                    if (doctor) setSelectedBookingDoctor(doctor);
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select Doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStaff.map((doctor: Doctor) => (
                      <SelectItem key={doctor.id} value={doctor.id.toString()}>
                        Dr. {doctor.firstName} {doctor.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Patient Selection (hidden but needed for booking) */}
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

              {/* My Information */}
              <div>
                <Label className="text-sm font-medium mb-2 block">My Information</Label>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {patients?.find((p: any) => p.id.toString() === selectedPatient)?.firstName} {patients?.find((p: any) => p.id.toString() === selectedPatient)?.lastName}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        📧 {patients?.find((p: any) => p.id.toString() === selectedPatient)?.email}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        📞 {patients?.find((p: any) => p.id.toString() === selectedPatient)?.phone}
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-400">
                        Patient ID: P{String(patients?.find((p: any) => p.id.toString() === selectedPatient)?.id).padStart(6, '0')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Patient Information */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Patient Information</Label>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                      {patients?.find((p: any) => p.id.toString() === selectedPatient)?.firstName?.charAt(0)}{patients?.find((p: any) => p.id.toString() === selectedPatient)?.lastName?.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {patients?.find((p: any) => p.id.toString() === selectedPatient)?.firstName} {patients?.find((p: any) => p.id.toString() === selectedPatient)?.lastName}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        OP{String(patients?.find((p: any) => p.id.toString() === selectedPatient)?.id).padStart(6, '0')}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <span>📞</span>
                      <span>{patients?.find((p: any) => p.id.toString() === selectedPatient)?.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>📧</span>
                      <span>{patients?.find((p: any) => p.id.toString() === selectedPatient)?.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>🏥</span>
                      <span>NHS: {patients?.find((p: any) => p.id.toString() === selectedPatient)?.nhsNumber}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>📍</span>
                      <span>{patients?.find((p: any) => p.id.toString() === selectedPatient)?.address?.city}, {patients?.find((p: any) => p.id.toString() === selectedPatient)?.address?.country}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Select Date */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Select Date</Label>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date: Date | undefined) => setSelectedDate(date)}
                    disabled={(date: Date) =>
                      date < new Date() || date < new Date("1900-01-01")
                    }
                    className="w-full"
                  />
                </div>
              </div>

              {/* Select Time Slot */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Select Time Slot</Label>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 min-h-[120px] flex items-center justify-center">
                  {!selectedBookingDoctor || !selectedDate ? (
                    <p className="text-gray-500 text-center">
                      Please select a doctor and date to view available time slots.
                    </p>
                  ) : (
                    <div className="grid grid-cols-4 gap-2 w-full">
                      {generateTimeSlots().map((slot) => {
                        const isAvailable = isTimeSlotAvailable(slot.value);
                        const isSelected = selectedTimeSlot === slot.value;

                        return (
                          <Button
                            key={slot.value}
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedTimeSlot(slot.value)}
                            disabled={!isAvailable}
                            className={cn(
                              "h-8 text-xs",
                              isSelected &&
                                "bg-blue-500 text-white hover:bg-blue-600",
                              isAvailable &&
                                !isSelected &&
                                "bg-green-100 text-green-800 hover:bg-green-200 border-green-300",
                              !isAvailable &&
                                "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed",
                            )}
                          >
                            {slot.display}
                          </Button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Booking Summary */}
          <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-lg font-medium mb-4">Booking Summary</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">Medical Specialty</Label>
                  <p className="text-sm font-medium">{appointmentType || "Not selected"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">Patient</Label>
                  <p className="text-sm font-medium">
                    {selectedPatient 
                      ? `${patients?.find((p: any) => p.id.toString() === selectedPatient)?.firstName} ${patients?.find((p: any) => p.id.toString() === selectedPatient)?.lastName}`
                      : "Not selected"
                    }
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">Date</Label>
                  <p className="text-sm font-medium">{selectedDate ? format(selectedDate, "PPP") : "Not selected"}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">Sub-Specialty</Label>
                  <p className="text-sm font-medium">Not selected</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">Doctor</Label>
                  <p className="text-sm font-medium">
                    {selectedBookingDoctor 
                      ? `Dr. ${selectedBookingDoctor.firstName} ${selectedBookingDoctor.lastName}`
                      : "Not selected"
                    }
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">Time</Label>
                  <p className="text-sm font-medium">{selectedTimeSlot || "Not selected"}</p>
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
                !selectedTimeSlot ||
                bookAppointmentMutation.isPending
              }
              onClick={handleBookAppointment}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {bookAppointmentMutation.isPending
                ? "Booking..."
                : "Book Appointment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
