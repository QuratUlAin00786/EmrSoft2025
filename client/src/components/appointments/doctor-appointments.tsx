import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, MapPin, Phone, Mail, Plus } from "lucide-react";
import { format, isBefore, isAfter, startOfDay, parseISO } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";

const statusColors = {
  scheduled: "bg-blue-100 text-blue-800 border-blue-200",
  completed: "bg-green-100 text-green-800 border-green-200", 
  cancelled: "bg-gray-100 text-gray-800 border-gray-200",
  no_show: "bg-red-100 text-red-800 border-red-200"
};

export default function DoctorAppointments({ onNewAppointment }: { onNewAppointment?: () => void }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"upcoming" | "past" | "all">("upcoming");
  const [filterDate, setFilterDate] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  console.log("🩺 DOCTOR APPOINTMENTS: Current user", { id: user?.id, role: user?.role, organizationId: user?.organizationId });

  // Fetch all appointments
  const { data: appointmentsData, isLoading: appointmentsLoading } = useQuery({
    queryKey: ["/api/appointments"],
    staleTime: 30000,
    refetchInterval: 60000,
  });

  // Fetch patients
  const { data: patientsData, isLoading: patientsLoading } = useQuery({
    queryKey: ["/api/patients"],
    staleTime: 60000,
  });

  const allAppointments = appointmentsData || [];
  const patients = patientsData || [];

  console.log("📊 DOCTOR APPOINTMENTS: Fetched data", { 
    totalAppointments: allAppointments.length, 
    totalPatients: patients.length 
  });

  // Filter appointments for current doctor based on doctorId and organizationId
  const doctorAppointments = useMemo(() => {
    if (!user?.id || !user?.organizationId) {
      console.log("⚠️ DOCTOR APPOINTMENTS: No user ID or organization ID");
      return [];
    }

    const filtered = allAppointments.filter((apt: any) => {
      const matchesDoctor = apt.doctorId === user.id;
      const matchesOrganization = apt.organizationId === user.organizationId;
      
      console.log(`🔍 Appointment ID ${apt.id}:`, {
        doctorId: apt.doctorId,
        currentUserId: user.id,
        matchesDoctor,
        organizationId: apt.organizationId,
        userOrgId: user.organizationId,
        matchesOrganization,
        included: matchesDoctor && matchesOrganization
      });

      return matchesDoctor && matchesOrganization;
    });

    console.log(`✅ DOCTOR APPOINTMENTS: Filtered ${filtered.length} appointments for doctor ID ${user.id} in organization ${user.organizationId}`);
    return filtered;
  }, [allAppointments, user?.id, user?.organizationId]);

  // Separate appointments into upcoming and past
  const { upcomingAppointments, pastAppointments } = useMemo(() => {
    const now = new Date();
    const upcoming: any[] = [];
    const past: any[] = [];

    doctorAppointments.forEach((apt: any) => {
      const appointmentDate = new Date(apt.scheduledAt);
      if (isAfter(appointmentDate, now)) {
        upcoming.push(apt);
      } else {
        past.push(apt);
      }
    });

    // Sort upcoming by date ascending (soonest first)
    upcoming.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    
    // Sort past by date descending (most recent first)
    past.sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

    console.log("📅 DOCTOR APPOINTMENTS: Categorized", { 
      upcoming: upcoming.length, 
      past: past.length 
    });

    return { upcomingAppointments: upcoming, pastAppointments: past };
  }, [doctorAppointments]);

  // Get appointments to display based on active tab
  const displayAppointments = useMemo(() => {
    let appointments = activeTab === "upcoming" 
      ? upcomingAppointments 
      : activeTab === "past" 
      ? pastAppointments 
      : doctorAppointments;

    // Apply date filter
    if (filterDate) {
      appointments = appointments.filter((apt: any) => {
        const aptDate = format(new Date(apt.scheduledAt), "yyyy-MM-dd");
        return aptDate === filterDate;
      });
    }

    // Apply status filter
    if (filterStatus) {
      appointments = appointments.filter((apt: any) => apt.status === filterStatus);
    }

    console.log(`🎯 DOCTOR APPOINTMENTS: Displaying ${appointments.length} appointments (tab: ${activeTab}, dateFilter: ${filterDate}, statusFilter: ${filterStatus})`);
    return appointments;
  }, [activeTab, upcomingAppointments, pastAppointments, doctorAppointments, filterDate, filterStatus]);

  // Get next upcoming appointment
  const nextAppointment = upcomingAppointments[0] || null;

  const getPatientInfo = (patientId: number) => {
    const patient = patients.find((p: any) => p.id === patientId);
    return patient || null;
  };

  const clearFilters = () => {
    setFilterDate("");
    setFilterStatus("");
  };

  const isLoading = appointmentsLoading || patientsLoading;

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
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Appointments</h2>
          <p className="text-gray-600 dark:text-gray-400">{user?.firstName} {user?.lastName}</p>
        </div>
        <Button 
          onClick={() => onNewAppointment?.()}
          className="flex items-center gap-2"
          data-testid="button-book-appointment"
        >
          <Plus className="h-4 w-4" />
          Book Appointment
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        <Button
          variant={activeTab === "upcoming" ? "default" : "outline"}
          onClick={() => setActiveTab("upcoming")}
          data-testid="tab-upcoming"
        >
          Upcoming ({upcomingAppointments.length})
        </Button>
        <Button
          variant={activeTab === "past" ? "default" : "outline"}
          onClick={() => setActiveTab("past")}
          data-testid="tab-past"
        >
          Past ({pastAppointments.length})
        </Button>
        <Button
          variant={activeTab === "all" ? "default" : "outline"}
          onClick={() => setActiveTab("all")}
          data-testid="tab-all"
        >
          All ({doctorAppointments.length})
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Filter by Date
          </label>
          <Input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            placeholder="dd/mm/yyyy"
            data-testid="input-filter-date"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Filter by Status
          </label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger data-testid="select-filter-status">
              <SelectValue placeholder="SCHEDULED" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="scheduled">SCHEDULED</SelectItem>
              <SelectItem value="completed">COMPLETED</SelectItem>
              <SelectItem value="cancelled">CANCELLED</SelectItem>
              <SelectItem value="no_show">NO SHOW</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button 
            variant="outline" 
            onClick={clearFilters}
            data-testid="button-clear-filters"
          >
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Appointments List */}
      <div className="space-y-4">
        {displayAppointments.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
                No {activeTab} appointments found
              </h3>
              <p className="text-gray-500 dark:text-gray-500">
                {activeTab === "upcoming" 
                  ? "You don't have any upcoming appointments scheduled."
                  : activeTab === "past"
                  ? "You don't have any past appointments."
                  : "You don't have any appointments."}
              </p>
            </CardContent>
          </Card>
        ) : (
          displayAppointments.map((appointment: any) => {
            const patient = getPatientInfo(appointment.patientId);
            const appointmentDate = new Date(appointment.scheduledAt);

            return (
              <Card key={appointment.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      {/* Patient Avatar */}
                      {patient && (
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                            {patient.firstName?.[0]}{patient.lastName?.[0]}
                          </div>
                        </div>
                      )}

                      {/* Appointment Details */}
                      <div className="flex-1 space-y-3">
                        <div>
                          <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                            {patient ? `${patient.firstName} ${patient.lastName}` : `Patient ${appointment.patientId}`}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {appointment.title || appointment.type}
                          </p>
                        </div>

                        {/* Date and Time */}
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <Calendar className="h-4 w-4" />
                            <span>{format(appointmentDate, "EEEE, MMMM d, yyyy")}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <Clock className="h-4 w-4" />
                            <span>{format(appointmentDate, "h:mm a")}</span>
                          </div>
                        </div>

                        {/* Patient Contact Info */}
                        {patient && (
                          <div className="flex items-center gap-4 text-sm">
                            {patient.phoneNumber && (
                              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                <Phone className="h-4 w-4" />
                                <span>{patient.phoneNumber}</span>
                              </div>
                            )}
                            {patient.email && (
                              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                <Mail className="h-4 w-4" />
                                <span>{patient.email}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Description */}
                        {appointment.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {appointment.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <Badge 
                      className={`${statusColors[appointment.status as keyof typeof statusColors]} px-3 py-1`}
                      data-testid={`badge-status-${appointment.id}`}
                    >
                      {appointment.status.toUpperCase().replace('_', ' ')}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Next Upcoming Appointment */}
      {nextAppointment && (
        <Card className="border-blue-500 bg-blue-50 dark:bg-blue-900">
          <CardHeader>
            <CardTitle className="text-lg text-blue-900 dark:text-blue-100">
              Next Upcoming Appointment
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const patient = getPatientInfo(nextAppointment.patientId);
              const appointmentDate = new Date(nextAppointment.scheduledAt);

              return (
                <div className="flex items-start gap-4">
                  {/* Patient Avatar */}
                  {patient && (
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                        {patient.firstName?.[0]}{patient.lastName?.[0]}
                      </div>
                    </div>
                  )}

                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-blue-900 dark:text-blue-100">
                      {patient ? `${patient.firstName} ${patient.lastName}` : `Patient ${nextAppointment.patientId}`}
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                      {nextAppointment.title || nextAppointment.type}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-blue-700 dark:text-blue-300">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{format(appointmentDate, "EEEE, MMMM d, yyyy")}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>{format(appointmentDate, "h:mm a")}</span>
                      </div>
                    </div>
                  </div>

                  <Badge className="bg-blue-600 text-white">
                    {nextAppointment.status.toUpperCase().replace('_', ' ')}
                  </Badge>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
