import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Clock, User, Video, Stethoscope, Plus, ArrowRight, Edit, Search, X, Filter } from "lucide-react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday, isPast, isFuture, parseISO } from "date-fns";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { isDoctorLike } from "@/lib/role-utils";

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
  
  // Search/Filter states
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [filterDate, setFilterDate] = useState<string>("");
  const [filterPatientName, setFilterPatientName] = useState<string>("");
  const [filterPatientId, setFilterPatientId] = useState<string>("");
  const [filterNhsNumber, setFilterNhsNumber] = useState<string>("");
  
  // Cancel confirmation modal state
  const [appointmentToCancel, setAppointmentToCancel] = useState<number | null>(null);
  
  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch appointments for this doctor - backend automatically filters by logged-in user's role
  const { data: appointmentsData, isLoading } = useQuery({
    queryKey: ["/api/appointments", "doctor", user?.id],
    staleTime: 30000,
    refetchInterval: 60000,
    enabled: !!user?.id && isDoctorLike(user?.role),
    queryFn: async () => {
      // Backend automatically filters appointments for doctors (returns only their own appointments)
      const response = await apiRequest('GET', '/api/appointments');
      const data = await response.json();
      return data;
    },
  });

  // Fetch users for patient names and doctor info
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/users"],
    staleTime: 60000,
    enabled: !!user?.id,
  });

  // Fetch patients
  const { data: patientsData, isLoading: patientsLoading } = useQuery({
    queryKey: ["/api/patients"],
    staleTime: 60000,
    enabled: !!user?.id,
  });

  // Cancel appointment mutation
  const cancelAppointmentMutation = useMutation({
    mutationFn: async (appointmentId: number) => {
      const response = await apiRequest('PUT', `/api/appointments/${appointmentId}`, {
        status: 'cancelled'
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      setSuccessMessage("The appointment has been successfully cancelled.");
      setShowSuccessModal(true);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel appointment",
        variant: "destructive",
      });
    },
  });

  const appointments = appointmentsData || [];

  // Doctor appointments are already filtered by backend based on logged-in user's role
  const doctorAppointments = React.useMemo(() => {
    if (!user || !isDoctorLike(user.role)) return [];
    
    console.log('🩺 DOCTOR APPOINTMENTS: Current user', {
      id: user.id,
      role: user.role,
      organizationId: user.organizationId
    });
    
    console.log('📊 DOCTOR APPOINTMENTS: Fetched data', {
      totalAppointments: appointments.length,
      totalPatients: patientsData?.length || 0
    });

    // Backend already filters by role (doctors see only their own appointments)
    // Data is already scoped to correct organizationId by tenant middleware
    // Return appointments as-is from backend
    console.log('✅ DOCTOR APPOINTMENTS: Showing', appointments.length, 'appointments for doctor ID', user.id, 'in organization', user.organizationId);
    
    return appointments;
  }, [appointments, user, patientsData]);

  // Helper functions - MUST be defined before useMemo that uses them
  const getPatientName = React.useCallback((patientId: number) => {
    // patientId is actually a user ID - find patient record by user_id
    if (patientsData && Array.isArray(patientsData)) {
      const patient = patientsData.find((p: any) => p.userId === patientId);
      
      if (patient) {
        const name = `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
        if (name) return name;
      }
    }
    
    return '';
  }, [patientsData, usersData]);

  const getDoctorNameWithSpecialization = React.useCallback((doctorId: number) => {
    if (!usersData || !Array.isArray(usersData)) return `Doctor ${doctorId}`;
    const doctor = usersData.find((u: any) => u.id === doctorId);
    if (!doctor) return `Doctor ${doctorId}`;
    
    const name = `Dr. ${doctor.firstName || ''} ${doctor.lastName || ''}`.trim();
    const specialization = doctor.department || doctor.medicalSpecialtyCategory || '';
    
    return specialization ? `${name} (${specialization})` : name;
  }, [usersData]);

  const getCreatedByName = (createdById: number) => {
    if (!usersData || !Array.isArray(usersData)) return `User ${createdById}`;
    const creator = usersData.find((u: any) => u.id === createdById);
    if (!creator) return `User ${createdById}`;
    
    const name = `${creator.firstName || ''} ${creator.lastName || ''}`.trim();
    return name || `User ${createdById}`;
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

  // Get filtered appointments based on selected filter and search criteria
  const filteredAppointments = React.useMemo(() => {
    let result = [];
    if (appointmentFilter === 'all') {
      result = doctorAppointments;
    } else if (appointmentFilter === 'upcoming') {
      result = categorizedAppointments.upcoming;
    } else {
      result = categorizedAppointments.past;
    }

    // Apply search filters (date, patient name, patient ID, NHS number)
    if (filterDate || filterPatientName || filterPatientId || filterNhsNumber) {
      result = result.filter((apt: any) => {
        // Filter by date
        if (filterDate) {
          const aptDate = format(new Date(apt.scheduledAt), 'yyyy-MM-dd');
          if (aptDate !== filterDate) return false;
        }

        // Filter by patient name
        if (filterPatientName) {
          const patientName = getPatientName(apt.patientId).toLowerCase();
          if (!patientName.includes(filterPatientName.toLowerCase())) return false;
        }

        // Filter by patient ID or NHS number (need to look up in patients table)
        if (filterPatientId || filterNhsNumber) {
          // Find patient record by ID in patients table
          const patient = patientsData?.find((p: any) => p.id === apt.patientId);
          
          if (filterPatientId) {
            if (!patient || !patient.patientId?.toLowerCase().includes(filterPatientId.toLowerCase())) {
              return false;
            }
          }

          if (filterNhsNumber) {
            if (!patient || !patient.nhsNumber?.toLowerCase().includes(filterNhsNumber.toLowerCase())) {
              return false;
            }
          }
        }

        return true;
      });
    }

    console.log('🎯 DOCTOR APPOINTMENTS: Displaying', result.length, 'appointments (filter:', appointmentFilter + ', search filters active:', !!(filterDate || filterPatientName || filterPatientId || filterNhsNumber) + ')');
    return result;
  }, [doctorAppointments, categorizedAppointments, appointmentFilter, filterDate, filterPatientName, filterPatientId, filterNhsNumber, patientsData, usersData]);

  // Get next upcoming appointment
  const nextAppointment = categorizedAppointments.upcoming[0] || null;
  
  // Get doctor info for next appointment
  const nextAppointmentDoctor = React.useMemo(() => {
    if (nextAppointment?.createdBy && usersData && Array.isArray(usersData)) {
      return usersData.find((u: any) => u.id === nextAppointment.createdBy);
    }
    return null;
  }, [nextAppointment, usersData]);

  const weekStart = startOfWeek(selectedDate);
  const weekEnd = endOfWeek(selectedDate);
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  if (isLoading || usersLoading || patientsLoading) {
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
      <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 p-2 rounded-lg">
        <div className="flex items-center space-x-2">
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
        <Button
          variant={showSearchPanel ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setShowSearchPanel(!showSearchPanel);
            if (showSearchPanel) {
              // Clear all filters when closing
              setFilterDate("");
              setFilterPatientName("");
              setFilterPatientId("");
              setFilterNhsNumber("");
            }
          }}
          data-testid="button-toggle-search"
        >
          <Filter className="h-4 w-4 mr-1" />
          {showSearchPanel ? "Hide Search" : "Search"}
        </Button>
      </div>

      {/* Search Filters */}
      {showSearchPanel && (
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Search className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-semibold text-blue-800 dark:text-blue-300">Search Appointments</span>
              {(filterDate || filterPatientName || filterPatientId || filterNhsNumber) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilterDate("");
                    setFilterPatientName("");
                    setFilterPatientId("");
                    setFilterNhsNumber("");
                  }}
                  className="ml-auto text-xs"
                  data-testid="button-clear-filters"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear Filters
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Date</label>
                <Input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  placeholder="Filter by date"
                  className="w-full"
                  data-testid="input-filter-date"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Patient Name</label>
                <Input
                  type="text"
                  value={filterPatientName}
                  onChange={(e) => setFilterPatientName(e.target.value)}
                  placeholder="Search by name"
                  className="w-full"
                  data-testid="input-filter-patient-name"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Patient ID</label>
                <Input
                  type="text"
                  value={filterPatientId}
                  onChange={(e) => setFilterPatientId(e.target.value)}
                  placeholder="Search by patient ID"
                  className="w-full"
                  data-testid="input-filter-patient-id"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">NHS Number</label>
                <Input
                  type="text"
                  value={filterNhsNumber}
                  onChange={(e) => setFilterNhsNumber(e.target.value)}
                  placeholder="Search by NHS number"
                  className="w-full"
                  data-testid="input-filter-nhs-number"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                {nextAppointmentDoctor && (
                  <div className="flex items-center space-x-2">
                    <Stethoscope className="h-5 w-5 text-blue-600" />
                    <span className="text-gray-700 dark:text-gray-300">
                      Doctor: {nextAppointmentDoctor.firstName} {nextAppointmentDoctor.lastName}
                    </span>
                  </div>
                )}
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

      {/* Filtered Appointments List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {appointmentFilter === 'upcoming' && `Upcoming Appointments (${filteredAppointments.length})`}
            {appointmentFilter === 'past' && `Past Appointments (${filteredAppointments.length})`}
            {appointmentFilter === 'all' && `All Appointments (${filteredAppointments.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredAppointments.map((appointment: any) => (
              <Card 
                key={appointment.id} 
                className="border-l-4" 
                style={{ borderLeftColor: statusColors[appointment.status as keyof typeof statusColors] }}
                data-testid={`filtered-appointment-${appointment.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">
                            {format(new Date(appointment.scheduledAt), "EEEE, MMMM d, yyyy")}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{formatTime(appointment.scheduledAt)}</span>
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{getPatientName(appointment.patientId)}</span>
                        </div>
                        {isDoctorLike(user?.role || '') && usersData && (() => {
                          const doctor = usersData.find((u: any) => u.id === user?.id);
                          return doctor && (doctor.medicalSpecialtyCategory || doctor.subSpecialty) ? (
                            <>
                              {doctor.medicalSpecialtyCategory && (
                                <div className="flex items-center space-x-2 mt-1">
                                  <Stethoscope className="h-4 w-4 text-gray-400" />
                                  <span className="text-xs text-gray-600">{doctor.medicalSpecialtyCategory}</span>
                                </div>
                              )}
                              {doctor.subSpecialty && (
                                <div className="flex items-center space-x-2 mt-1">
                                  <Stethoscope className="h-4 w-4 text-gray-400" />
                                  <span className="text-xs text-gray-600">{doctor.subSpecialty}</span>
                                </div>
                              )}
                            </>
                          ) : null;
                        })()}
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <div className="text-sm text-gray-600">Type: {appointment.type}</div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge 
                          style={{ backgroundColor: statusColors[appointment.status as keyof typeof statusColors] }}
                          className="text-white"
                        >
                          {appointment.status.toUpperCase()}
                        </Badge>
                        {appointment.status !== 'cancelled' && isDoctorLike(user?.role || '') && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setAppointmentToCancel(appointment.id)}
                            data-testid={`button-cancel-${appointment.id}`}
                          >
                            <Edit className="h-4 w-4" />
                            Cancel Appointment
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  {appointment.description && (
                    <p className="text-sm text-gray-600 mt-2">{appointment.description}</p>
                  )}
                  {appointment.location && (
                    <p className="text-sm text-gray-500 mt-1">Location: {appointment.location}</p>
                  )}
                </CardContent>
              </Card>
            ))}
            {filteredAppointments.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No {appointmentFilter} appointments found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cancel Appointment Confirmation Modal */}
      <Dialog open={appointmentToCancel !== null} onOpenChange={(open) => !open && setAppointmentToCancel(null)}>
        <DialogContent data-testid="dialog-cancel-appointment">
          <DialogHeader>
            <DialogTitle>Cancel Appointment</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this appointment? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setAppointmentToCancel(null)}
              data-testid="button-cancel-modal"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (appointmentToCancel) {
                  cancelAppointmentMutation.mutate(appointmentToCancel);
                  setAppointmentToCancel(null);
                }
              }}
              disabled={cancelAppointmentMutation.isPending}
              data-testid="button-delete-appointment"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-green-600">Success</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-gray-700">{successMessage}</p>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => {
                setShowSuccessModal(false);
                setSuccessMessage("");
              }}
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}