import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Heart, Pill, FileText, Clock, AlertCircle, MessageSquare, User, MapPin, Video } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { format } from "date-fns";
import AIChatbot from "@/components/ai-chatbot";

const statusColors = {
  scheduled: "#4A7DFF",
  completed: "#6CFFEB",
  cancelled: "#162B61",
  no_show: "#9B9EAF",
};

export function PatientDashboard() {
  const { user } = useAuth();
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  
  const { data: appointmentsData, isLoading: appointmentsLoading, error: appointmentsError } = useQuery({
    queryKey: ["/api/appointments"],
  });

  const { data: prescriptionsData } = useQuery({
    queryKey: ["/api/patients/my-prescriptions"],
  });

  const { data: doctorsData } = useQuery({
    queryKey: ["/api/medical-staff"],
  });

  // Helper functions
  const getDoctorSpecialtyData = (providerId: number) => {
    const doctorsResponse = doctorsData as any;
    if (!doctorsResponse?.staff || !Array.isArray(doctorsResponse.staff))
      return { name: "", category: "", subSpecialty: "" };
    const provider = doctorsResponse.staff.find((u: any) => u.id === providerId);
    return provider
      ? {
          name: `${provider.firstName} ${provider.lastName}`,
          category: provider.medicalSpecialtyCategory || "",
          subSpecialty: provider.subSpecialty || "",
        }
      : { name: "", category: "", subSpecialty: "" };
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

  // Upcoming Appointments function with full functionality for patients only
  const getUpcomingAppointments = () => {
    // Only show appointments if user is a patient
    if (user?.role !== 'patient') {
      return {
        appointments: [],
        count: 0,
        nextAppointment: null,
        remainingAppointments: [],
      };
    }

    const now = new Date();
    const allAppointments = Array.isArray(appointmentsData) ? appointmentsData : [];
    
    // Filter for current patient's upcoming appointments only
    const patientAppointments = allAppointments.filter((appointment: any) => {
      const appointmentDate = new Date(appointment.scheduledAt);
      const isUpcoming = appointmentDate > now;
      // For patient role, appointments are already filtered by backend
      return isUpcoming;
    });

    // Sort by date (earliest first)
    const sortedAppointments = patientAppointments.sort((a: any, b: any) => {
      return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
    });

    return {
      appointments: sortedAppointments,
      count: sortedAppointments.length,
      nextAppointment: sortedAppointments[0] || null,
      remainingAppointments: sortedAppointments.slice(1),
    };
  };

  const upcomingAppointmentsData = getUpcomingAppointments();

  // Extract data from API responses with proper type checking
  const patientAppointments = (appointmentsData as any)?.appointments || [];
  const nextAppointment = (appointmentsData as any)?.nextAppointment;
  const prescriptions = (prescriptionsData as any)?.prescriptions || [];
  const totalPrescriptions = (prescriptionsData as any)?.totalCount || 0;
  const patientId = (prescriptionsData as any)?.patientId || (appointmentsData as any)?.patientId;

  const patientCards = [
    {
      title: "Next Appointment",
      value: nextAppointment ? new Date(nextAppointment.scheduledAt).toLocaleDateString() : "None",
      description: nextAppointment ? nextAppointment.provider : "Schedule one today",
      icon: Calendar,
      href: "/appointments",
      color: "bg-blue-100 text-blue-800"
    },
    {
      title: "Active Prescriptions",
      value: totalPrescriptions.toString(),
      description: patientId ? `Patient ID: ${patientId}` : "Current medications",
      icon: Pill,
      href: "/prescriptions",
      color: "bg-green-100 text-green-800"
    },
    {
      title: "Health Score",
      value: "Good",
      description: "Based on recent vitals",
      icon: Heart,
      href: "/health-summary",
      color: "bg-purple-100 text-purple-800"
    },
    {
      title: "Pending Results",
      value: "0",
      description: "Lab test results",
      icon: FileText,
      href: "/lab-results",
      color: "bg-orange-100 text-orange-800"
    }
  ];

  const quickActions = [
    { title: "Book Appointment", description: "Schedule with your healthcare provider", icon: Calendar, href: "/appointments" },
    { title: "View Prescriptions", description: "Check your current medications", icon: Pill, href: "/prescriptions" },
    { title: "Lab Results", description: "View your test results", icon: FileText, href: "/lab-results" },
    { title: "Health Records", description: "Access your medical history", icon: Heart, href: "/medical-records" }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.firstName || "Patient"}
        </h1>
        <p className="text-neutral-600">
          Your personal health dashboard and medical information
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {patientCards.map((card) => (
          <Link key={card.title} href={card.href}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <div className={`p-2 rounded-full ${card.color}`}>
                  <card.icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-neutral-500">{card.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Card key={action.title} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <action.icon className="h-8 w-8 text-primary" />
                  <div>
                    <CardTitle className="text-base">{action.title}</CardTitle>
                    <CardDescription className="text-sm">{action.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <Link href={action.href}>
                  <Button className="w-full" variant="outline">Access</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Patient-specific content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Appointments</CardTitle>
            <CardDescription>Your scheduled healthcare visits</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingAppointmentsData.appointments.length > 0 ? (
                upcomingAppointmentsData.appointments.slice(0, 3).map((appointment: any, index: number) => (
                  <div key={appointment.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="space-y-1">
                      <p className="font-medium text-gray-900">{appointment.title}</p>
                      {getDoctorSpecialtyData(appointment.providerId).name && (
                        <p className="text-sm text-gray-600">
                          {getDoctorSpecialtyData(appointment.providerId).name}
                        </p>
                      )}
                      {appointment.location && (
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500">{appointment.location}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-sm font-medium text-gray-900">
                        {formatDate(appointment.scheduledAt)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatTime(appointment.scheduledAt)}
                      </p>
                      <Badge
                        style={{
                          backgroundColor: statusColors[appointment.status as keyof typeof statusColors],
                        }}
                        className="text-white text-xs"
                      >
                        {appointment.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <Calendar className="h-12 w-12 text-neutral-300 mx-auto mb-2" />
                  <p className="text-neutral-500">No upcoming appointments</p>
                  <Button className="mt-2" size="sm" asChild>
                    <Link href="/appointments">Book Appointment</Link>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Health Reminders</CardTitle>
            <CardDescription>Important health notices</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg border-blue-200 bg-blue-50">
                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium">Medication Reminder</p>
                    <p className="text-sm text-neutral-600">Take evening medication</p>
                  </div>
                </div>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Today</span>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg border-green-200 bg-green-50">
                <div className="flex items-center space-x-3">
                  <Heart className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium">Health Check</p>
                    <p className="text-sm text-neutral-600">Annual physical due</p>
                  </div>
                </div>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">This Month</span>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg border-orange-200 bg-orange-50">
                <div className="flex items-center space-x-3">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="font-medium">Lab Results</p>
                    <p className="text-sm text-neutral-600">New results available</p>
                  </div>
                </div>
                <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">New</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Floating AI Chatbot Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <Button
          onClick={() => setIsChatbotOpen(true)}
          className="w-14 h-14 rounded-full bg-medical-blue hover:bg-blue-700 shadow-lg transition-all duration-300 hover:scale-110"
          size="lg"
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      </div>

      {/* AI Chatbot */}
      <AIChatbot 
        isOpen={isChatbotOpen} 
        onClose={() => setIsChatbotOpen(false)} 
      />
    </div>
  );
}