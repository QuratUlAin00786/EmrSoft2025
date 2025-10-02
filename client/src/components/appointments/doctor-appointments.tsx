import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, Video, Stethoscope, Plus, ArrowRight } from "lucide-react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday, isPast, isFuture, parseISO } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

const statusColors = {
  scheduled: "#4A7DFF",
  completed: "#6CFFEB", 
  cancelled: "#162B61",
  no_show: "#9B9EAF"
};

export default function DoctorAppointments({ onNewAppointment }: { onNewAppointment?: () => void }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"week" | "day">("week");
  const [appointmentFilter, setAppointmentFilter] = useState<"all" | "upcoming" | "past">("upcoming");
  const { user } = useAuth();

  // Fetch appointments for this doctor
  const { data: appointmentsData, isLoading } = useQuery({
    queryKey: ["/api/appointments"],
    staleTime: 30000,
    refetchInterval: 60000,
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/appointments');
      const data = await response.json();
      return data;
    },
  });

  // Fetch users for patient names
  const { data: usersData } = useQuery({
    queryKey: ["/api/users"],
    staleTime: 60000,
  });

  // Fetch patients
  const { data: patientsData } = useQuery({
    queryKey: ["/api/patients"],
    staleTime: 60000,
  });

  const appointments = appointmentsData || [];

  // Filter appointments for current doctor based on organizationId and role
  const doctorAppointments = React.useMemo(() => {
    if (!user || user.role !== 'doctor') return [];
    
    console.log('🩺 DOCTOR APPOINTMENTS: Current user', {
      id: user.id,
      role: user.role,
      organizationId: user.organizationId
    });
    
    console.log('📊 DOCTOR APPOINTMENTS: Fetched data', {
      totalAppointments: appointments.length,
      totalPatients: patientsData?.length || 0
    });

    // Filter appointments where doctorId matches current user's id
    const filtered = appointments.filter((apt: any) => {
      return apt.doctorId === user.id && apt.organizationId === user.organizationId;
    });

    console.log('✅ DOCTOR APPOINTMENTS: Filtered', filtered.length, 'appointments for doctor ID', user.id, 'in organization', user.organizationId);
    
    return filtered;
  }, [appointments, user, patientsData]);

  // Categorize appointments into upcoming and past
  const categorizedAppointments = React.useMemo(() => {
    const now = new Date();
    const upcoming = doctorAppointments.filter((apt: any) => {
      const aptDate = new Date(apt.scheduledAt);
      return isFuture(aptDate) || isSameDay(aptDate, now);
    }).sort((a: any, b: any) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

    const past = doctorAppointments.filter((apt: any) => {
      const aptDate = new Date(apt.scheduledAt);
      return isPast(aptDate) && !isSameDay(aptDate, now);
    }).sort((a: any, b: any) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

    console.log('📅 DOCTOR APPOINTMENTS: Categorized', {
      upcoming: upcoming.length,
      past: past.length
    });

    return { upcoming, past };
  }, [doctorAppointments]);

  // Get filtered appointments based on selected filter
  const filteredAppointments = React.useMemo(() => {
    let result = [];
    if (appointmentFilter === 'all') {
      result = doctorAppointments;
    } else if (appointmentFilter === 'upcoming') {
      result = categorizedAppointments.upcoming;
    } else {
      result = categorizedAppointments.past;
    }

    console.log('🎯 DOCTOR APPOINTMENTS: Displaying', result.length, 'appointments (filter:', appointmentFilter + ')');
    return result;
  }, [doctorAppointments, categorizedAppointments, appointmentFilter]);

  // Get next upcoming appointment
  const nextAppointment = categorizedAppointments.upcoming[0] || null;

  const getPatientName = (patientId: number) => {
    if (!patientsData || !Array.isArray(patientsData)) return `Patient ${patientId}`;
    const patient = patientsData.find((p: any) => p.id === patientId);
    return patient ? `${patient.firstName} ${patient.lastName}` : `Patient ${patientId}`;
  };

  const formatTime = (timeString: string) => {
    try {
      const date = new Date(timeString);
      return format(date, "h:mm a");
    } catch {
      return "Invalid time";
    }
  };

  const getAppointmentsForDate = (date: Date) => {
    return doctorAppointments.filter((apt: any) => {
      const appointmentDate = new Date(apt.scheduledAt);
      return isSameDay(appointmentDate, date);
    });
  };

  const weekStart = startOfWeek(selectedDate);
  const weekEnd = endOfWeek(selectedDate);
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

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
    <div className="space-y-6" data-testid="doctor-appointments-view">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Stethoscope className="h-6 w-6 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-blue-800">My Schedule</h2>
            <p className="text-gray-600">Dr. {user?.firstName} {user?.lastName}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button
            variant={viewMode === "week" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("week")}
          >
            Week View
          </Button>
          <Button
            variant={viewMode === "day" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("day")}
          >
            Day View
          </Button>
          <Button 
            onClick={() => onNewAppointment?.()}
            className="flex items-center gap-2"
            data-testid="button-schedule-appointment"
          >
            <Plus className="h-3 w-3" />
            Schedule Patient
          </Button>
        </div>
      </div>

      {/* Appointment Filters */}
      <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-800 p-2 rounded-lg">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter:</span>
        <Button
          variant={appointmentFilter === "upcoming" ? "default" : "outline"}
          size="sm"
          onClick={() => setAppointmentFilter("upcoming")}
          data-testid="filter-upcoming"
        >
          Upcoming ({categorizedAppointments.upcoming.length})
        </Button>
        <Button
          variant={appointmentFilter === "past" ? "default" : "outline"}
          size="sm"
          onClick={() => setAppointmentFilter("past")}
          data-testid="filter-past"
        >
          Past ({categorizedAppointments.past.length})
        </Button>
        <Button
          variant={appointmentFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setAppointmentFilter("all")}
          data-testid="filter-all"
        >
          All ({doctorAppointments.length})
        </Button>
      </div>

      {/* Weekly View */}
      {viewMode === "week" && (
        <div className="grid grid-cols-7 gap-4">
          {weekDays.map((day) => {
            const dayAppointments = getAppointmentsForDate(day);
            const isSelected = isSameDay(day, selectedDate);
            const isCurrentDay = isToday(day);
            
            return (
              <Card 
                key={day.toString()} 
                className={`h-96 cursor-pointer transition-colors ${
                  isSelected ? 'border-blue-500 bg-blue-50' : ''
                } ${isCurrentDay ? 'border-yellow-400 bg-yellow-50' : ''}`}
                onClick={() => setSelectedDate(day)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    {format(day, "EEE")}
                    <br />
                    <span className={`text-lg ${isCurrentDay ? 'text-yellow-800 font-bold' : ''}`}>
                      {format(day, "d")}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-1">
                  {dayAppointments.slice(0, 4).map((appointment: any) => (
                    <div
                      key={appointment.id}
                      className="p-2 rounded text-xs border-l-4"
                      style={{ borderLeftColor: statusColors[appointment.status as keyof typeof statusColors] }}
                      data-testid={`appointment-${appointment.id}`}
                    >
                      <div className="font-medium truncate">{formatTime(appointment.scheduledAt)}</div>
                      <div className="text-gray-600 truncate">{getPatientName(appointment.patientId)}</div>
                      <div className="text-gray-500 truncate">{appointment.type}</div>
                    </div>
                  ))}
                  {dayAppointments.length > 4 && (
                    <div className="text-xs text-gray-500 text-center py-1">
                      +{dayAppointments.length - 4} more
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Day View */}
      {viewMode === "day" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDate(new Date(selectedDate.getTime() - 24 * 60 * 60 * 1000))}
                >
                  Previous Day
                </Button>
                <span className="text-lg font-bold">
                  {format(selectedDate, "EEEE, MMMM d, yyyy")}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDate(new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000))}
                >
                  Next Day
                </Button>
              </div>
              <Badge variant="secondary">
                {getAppointmentsForDate(selectedDate).length} appointments
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {getAppointmentsForDate(selectedDate).map((appointment: any) => (
                <Card key={appointment.id} className="border-l-4" style={{ borderLeftColor: statusColors[appointment.status as keyof typeof statusColors] }}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div>
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">{formatTime(appointment.scheduledAt)}</span>
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">{getPatientName(appointment.patientId)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{appointment.title}</div>
                        <Badge 
                          style={{ backgroundColor: statusColors[appointment.status as keyof typeof statusColors] }}
                          className="text-white"
                        >
                          {appointment.status.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                    {appointment.description && (
                      <p className="text-sm text-gray-600 mt-2">{appointment.description}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
              {getAppointmentsForDate(selectedDate).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No appointments scheduled for this day</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Today's Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {getAppointmentsForDate(new Date()).length}
              </div>
              <div className="text-sm text-gray-500">Total Today</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {getAppointmentsForDate(new Date()).filter((apt: any) => apt.status === 'completed').length}
              </div>
              <div className="text-sm text-gray-500">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {getAppointmentsForDate(new Date()).filter((apt: any) => apt.status === 'scheduled').length}
              </div>
              <div className="text-sm text-gray-500">Scheduled</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {getAppointmentsForDate(new Date()).filter((apt: any) => apt.status === 'cancelled' || apt.status === 'no_show').length}
              </div>
              <div className="text-sm text-gray-500">Cancelled/No-show</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Upcoming Appointment */}
      {nextAppointment && (
        <Card className="border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-900/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowRight className="h-5 w-5 text-blue-600" />
              Next Upcoming Appointment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold text-lg">
                    {format(new Date(nextAppointment.scheduledAt), "EEEE, MMMM d, yyyy")}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold text-lg">
                    {formatTime(nextAppointment.scheduledAt)}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-blue-600" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Patient: {getPatientName(nextAppointment.patientId)}
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Type: {nextAppointment.type}
                </div>
                {nextAppointment.description && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    {nextAppointment.description}
                  </div>
                )}
              </div>
              <Badge 
                style={{ backgroundColor: statusColors[nextAppointment.status as keyof typeof statusColors] }}
                className="text-white text-lg px-4 py-2"
              >
                {nextAppointment.status.toUpperCase()}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}