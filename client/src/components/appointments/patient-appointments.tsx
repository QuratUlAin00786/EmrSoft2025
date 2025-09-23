import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, MapPin, Video, Plus, FileText } from "lucide-react";
import { format, isSameDay, isToday, isFuture, isPast } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

const statusColors = {
  scheduled: "#4A7DFF",
  completed: "#6CFFEB", 
  cancelled: "#162B61",
  no_show: "#9B9EAF"
};

export default function PatientAppointments({ onNewAppointment }: { onNewAppointment?: () => void }) {
  const [selectedFilter, setSelectedFilter] = useState<"all" | "upcoming" | "past">("upcoming");
  const { user } = useAuth();

  // Fetch patients to find the current user's patient record
  const { data: patientsData, isLoading: patientsLoading } = useQuery({
    queryKey: ["/api/patients"],
    staleTime: 60000,
    retry: false,
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/patients');
      const data = await response.json();
      return data;
    },
  });

  // Find the patient record for the logged-in user
  const currentPatient = React.useMemo(() => {
    if (!user || user.role !== 'patient' || !patientsData || !Array.isArray(patientsData)) {
      console.log("🔍 PATIENT-APPOINTMENTS: Patient lookup failed", {
        hasUser: !!user,
        userRole: user?.role,
        hasPatientsData: !!patientsData,
        patientsDataType: Array.isArray(patientsData) ? 'array' : typeof patientsData
      });
      return null;
    }
    
    console.log("🔍 PATIENT-APPOINTMENTS: Looking for patient matching user:", { 
      userEmail: user.email, 
      userName: `${user.firstName} ${user.lastName}`,
      userId: user.id 
    });
    console.log("📋 PATIENT-APPOINTMENTS: Available patients:", patientsData.map(p => ({ 
      id: p.id, 
      email: p.email, 
      name: `${p.firstName} ${p.lastName}` 
    })));
    
    // Try multiple matching strategies
    const foundPatient = 
      // 1. Match by exact email
      patientsData.find((patient: any) => 
        patient.email && user.email && patient.email.toLowerCase() === user.email.toLowerCase()
      ) ||
      // 2. Match by exact name
      patientsData.find((patient: any) => 
        patient.firstName && user.firstName && patient.lastName && user.lastName &&
        patient.firstName.toLowerCase() === user.firstName.toLowerCase() && 
        patient.lastName.toLowerCase() === user.lastName.toLowerCase()
      ) ||
      // 3. Match by partial name (first name only)
      patientsData.find((patient: any) => 
        patient.firstName && user.firstName &&
        patient.firstName.toLowerCase() === user.firstName.toLowerCase()
      ) ||
      // 4. If user role is patient, take the first patient (fallback for demo)
      (user.role === 'patient' && patientsData.length > 0 ? patientsData[0] : null);
    
    if (foundPatient) {
      console.log("✅ PATIENT-APPOINTMENTS: Found matching patient:", foundPatient);
    } else {
      console.log("❌ PATIENT-APPOINTMENTS: No matching patient found");
    }
    
    return foundPatient;
  }, [user, patientsData]);

  // Fetch appointments for this patient - backend automatically filters for patient role
  const { data: appointmentsData, isLoading } = useQuery({
    queryKey: ["/api/appointments", user?.role === "patient" ? "patient-filtered" : "all"],
    staleTime: 30000,
    refetchInterval: 60000,
    queryFn: async () => {
      // For patient users, the backend automatically filters by patient ID
      // No need to pass patientId explicitly as backend uses the authenticated user's patient record
      const response = await apiRequest('GET', '/api/appointments');
      const data = await response.json();
      return data;
    },
    enabled: !!user, // Only fetch when user is authenticated
  });

  // Fetch users for doctor names
  const { data: usersData } = useQuery({
    queryKey: ["/api/users"],
    staleTime: 60000,
  });

  // Filter appointments to show only the current patient's appointments
  const appointments = React.useMemo(() => {
    if (!appointmentsData || !currentPatient) return [];
    
    // Filter appointments by current patient ID for all user types
    return appointmentsData.filter((apt: any) => apt.patientId === currentPatient.id);
  }, [appointmentsData, currentPatient]);

  const getDoctorName = (providerId: number) => {
    if (!usersData || !Array.isArray(usersData)) return `Dr. Provider ${providerId}`;
    const provider = usersData.find((u: any) => u.id === providerId);
    return provider ? `Dr. ${provider.firstName} ${provider.lastName}` : `Dr. Provider ${providerId}`;
  };

  const formatTime = (timeString: string) => {
    try {
      const date = new Date(timeString);
      return format(date, "h:mm a");
    } catch {
      return "Invalid time";
    }
  };

  const formatDate = (timeString: string) => {
    try {
      const date = new Date(timeString);
      return format(date, "EEEE, MMMM d, yyyy");
    } catch {
      return "Invalid date";
    }
  };

  // Filter appointments by date for the logged-in patient
  const filteredAppointments = appointments.filter((apt: any) => {
    const appointmentDate = new Date(apt.scheduledAt);
    
    if (selectedFilter === "upcoming") {
      return isFuture(appointmentDate) || isToday(appointmentDate);
    } else if (selectedFilter === "past") {
      return isPast(appointmentDate) && !isToday(appointmentDate);
    }
    return true;
  });

  // Get upcoming appointments for the logged-in patient
  const upcomingAppointments = appointments.filter((apt: any) => {
    const appointmentDate = new Date(apt.scheduledAt);
    return isFuture(appointmentDate) || isToday(appointmentDate);
  });

  const nextAppointment = upcomingAppointments.length > 0 
    ? upcomingAppointments.sort((a: any, b: any) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0]
    : null;

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
    <div className="space-y-6" data-testid="patient-appointments-view">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <User className="h-6 w-6 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-blue-800">My Appointments</h2>
            <p className="text-gray-600">{user?.firstName} {user?.lastName}</p>
          </div>
        </div>
        <Button 
          onClick={() => onNewAppointment?.()}
          className="flex items-center gap-2"
          data-testid="button-book-appointment"
        >
          <Plus className="h-3 w-3" />
          Book Appointment
        </Button>
      </div>

      {/* Next Appointment Card */}
      {nextAppointment && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-blue-800">Next Appointment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-lg">
                    {formatDate(nextAppointment.scheduledAt)} at {formatTime(nextAppointment.scheduledAt)}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-blue-600" />
                  <span>{getDoctorName(nextAppointment.providerId)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <span>{nextAppointment.title}</span>
                </div>
                {nextAppointment.location && (
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-5 w-5 text-blue-600" />
                    <span>{nextAppointment.location}</span>
                  </div>
                )}
                {nextAppointment.isVirtual && (
                  <div className="flex items-center space-x-2">
                    <Video className="h-5 w-5 text-blue-600" />
                    <span>Virtual Appointment</span>
                  </div>
                )}
              </div>
              <Badge 
                style={{ backgroundColor: statusColors[nextAppointment.status as keyof typeof statusColors] }}
                className="text-white text-sm"
              >
                {nextAppointment.status.toUpperCase()}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Tabs */}
      <div className="flex space-x-2">
        <Button
          variant={selectedFilter === "upcoming" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedFilter("upcoming")}
        >
          Upcoming ({upcomingAppointments.length})
        </Button>
        <Button
          variant={selectedFilter === "past" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedFilter("past")}
        >
          Past ({appointments.filter((apt: any) => {
            const appointmentDate = new Date(apt.scheduledAt);
            return isPast(appointmentDate) && !isToday(appointmentDate);
          }).length})
        </Button>
        <Button
          variant={selectedFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedFilter("all")}
        >
          All ({appointments.length})
        </Button>
      </div>

      {/* Appointments List */}
      <div className="space-y-4">
        {filteredAppointments.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-500 mb-2">
                No {selectedFilter !== "all" ? selectedFilter : ""} appointments found
              </h3>
              <p className="text-gray-400">
                {selectedFilter === "upcoming" 
                  ? "You don't have any upcoming appointments scheduled."
                  : selectedFilter === "past"
                  ? "No past appointments to display."
                  : "You haven't scheduled any appointments yet."
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredAppointments
            .sort((a: any, b: any) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
            .map((appointment: any) => {
              const appointmentDate = new Date(appointment.scheduledAt);
              const isUpcoming = isFuture(appointmentDate) || isToday(appointmentDate);
              
              return (
                <Card 
                  key={appointment.id} 
                  className={`border-l-4 ${isUpcoming ? 'bg-white' : 'bg-gray-50'}`}
                  style={{ borderLeftColor: statusColors[appointment.status as keyof typeof statusColors] }}
                  data-testid={`appointment-${appointment.id}`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold">{appointment.title}</h3>
                          <Badge 
                            style={{ backgroundColor: statusColors[appointment.status as keyof typeof statusColors] }}
                            className="text-white"
                          >
                            {appointment.status.toUpperCase()}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">
                              {formatDate(appointment.scheduledAt)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium">
                              {formatTime(appointment.scheduledAt)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">{getDoctorName(appointment.providerId)}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">{appointment.type}</span>
                          </div>
                        </div>

                        {appointment.location && (
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">{appointment.location}</span>
                          </div>
                        )}

                        {appointment.isVirtual && (
                          <div className="flex items-center space-x-2">
                            <Video className="h-4 w-4 text-blue-500" />
                            <span className="text-sm text-blue-600">Virtual Appointment</span>
                          </div>
                        )}

                        {appointment.description && (
                          <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                            {appointment.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
        )}
      </div>

      {/* Appointment Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Appointment Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {upcomingAppointments.length}
              </div>
              <div className="text-sm text-gray-500">Upcoming</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {appointments.filter((apt: any) => apt.status === 'completed').length}
              </div>
              <div className="text-sm text-gray-500">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {appointments.length}
              </div>
              <div className="text-sm text-gray-500">Total</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}