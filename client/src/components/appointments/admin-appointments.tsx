import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Calendar, Users, Clock, TrendingUp } from "lucide-react";
import AppointmentCalendar from "@/components/calendar/appointment-calendar";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

// Appointment form schema
const appointmentSchema = z.object({
  patientId: z.string().trim().min(1, "Please select a patient"),
  providerId: z.string().trim().min(1, "Please select a provider"),
  title: z.string().trim().min(1, "Appointment title is required"),
  description: z.string().trim().optional(),
  date: z.string().trim().min(1, "Date is required").refine(
    (val) => !isNaN(Date.parse(val)),
    { message: "Please enter a valid date" }
  ),
  time: z.string().trim().min(1, "Time is required").regex(
    /^([01]\d|2[0-3]):([0-5]\d)$/,
    "Please enter a valid time (HH:MM format)"
  ),
  duration: z.string().trim().min(1, "Duration is required").refine(
    (val) => !isNaN(parseInt(val)) && parseInt(val) > 0,
    { message: "Duration must be a positive number" }
  ),
  type: z.string().trim().min(1, "Appointment type is required"),
  department: z.string().trim().min(1, "Department is required"),
  location: z.string().trim().optional(),
  isVirtual: z.boolean()
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

export function AdminAppointments() {
  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [allProviders, setAllProviders] = useState<any[]>([]);
  const [availableProviders, setAvailableProviders] = useState<any[]>([]);
  const { toast } = useToast();

  // Fetch appointments statistics
  const { data: appointmentsData } = useQuery({
    queryKey: ["/api/appointments"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/appointments');
      return response.json();
    },
  });

  const totalAppointments = appointmentsData?.length || 0;
  const todayAppointments = appointmentsData?.filter((apt: any) => {
    const today = new Date().toDateString();
    const aptDate = new Date(apt.scheduledAt).toDateString();
    return today === aptDate;
  }).length || 0;

  const upcomingAppointments = appointmentsData?.filter((apt: any) => {
    const now = new Date();
    const aptDate = new Date(apt.scheduledAt);
    return aptDate > now && apt.status !== 'cancelled';
  }).length || 0;

  // New appointment form
  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      patientId: "",
      providerId: "",
      title: "",
      description: "",
      date: new Date().toISOString().split('T')[0],
      time: "09:00",
      duration: "30",
      type: "consultation",
      department: "Cardiology",
      location: "",
      isVirtual: false
    }
  });

  const formData = form.watch();

  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: async (appointmentData: any) => {
      console.log("🚀 MUTATION START - Sending appointment data:", appointmentData);
      const result = await apiRequest("POST", "/api/appointments", appointmentData);
      console.log("✅ MUTATION SUCCESS - API returned:", result);
      return result;
    },
    onSuccess: (data) => {
      console.log("🎉 MUTATION onSuccess triggered with data:", data);
      
      // Invalidate appointments cache to refresh the calendar
      console.log("♻️ Invalidating React Query cache...");
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      
      // Force immediate refetch to ensure appointments list updates
      console.log("🔄 Forcing immediate refetch of appointments...");
      queryClient.refetchQueries({ queryKey: ["/api/appointments"] });
      
      // Reset form
      form.reset({
        patientId: "",
        providerId: "",
        title: "",
        description: "",
        date: new Date().toISOString().split('T')[0],
        time: "09:00",
        duration: "30",
        type: "consultation",
        department: "Cardiology",
        location: "",
        isVirtual: false
      });
      
      // Close modal
      console.log("🔄 Closing modal...");
      setShowNewAppointment(false);
      
      // Show success toast
      setTimeout(() => {
        toast({
          title: "Success",
          description: "Appointment scheduled successfully - ID: " + ((data as any)?.id || 'Unknown')
        });
      }, 100);
    },
    onError: (error: any) => {
      console.error("❌ MUTATION ERROR:", error);
      
      // Show detailed validation error if available
      const errorMessage = error.message || "Failed to create appointment";
      
      toast({
        title: "Appointment Creation Failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  });

  const fetchPatients = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'X-Tenant-Subdomain': 'cura'
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
      const uniquePatients = data ? data.filter((patient: any, index: number, self: any[]) => 
        index === self.findIndex((p: any) => p.id === patient.id)
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
        'X-Tenant-Subdomain': 'cura'
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
      console.log("Raw medical staff response:", data);
      
      // The API returns {staff: [...]} structure
      const staffArray = data?.staff || [];
      const uniqueProviders = staffArray.filter((provider: any, index: number, self: any[]) => 
        index === self.findIndex((p: any) => `${p.firstName} ${p.lastName}` === `${provider.firstName} ${provider.lastName}`)
      );
      
      console.log("Processed providers:", uniqueProviders);
      setAllProviders(uniqueProviders);
    } catch (err) {
      console.error("Error fetching providers:", err);
      setAllProviders([]);
    }
  };

  const filterAvailableProviders = () => {
    if (!formData.date || !formData.time || allProviders.length === 0) {
      setAvailableProviders(allProviders);
      return;
    }

    const appointmentDate = new Date(formData.date);
    const dayOfWeek = appointmentDate.toLocaleDateString('en-US', { weekday: 'long' });
    console.log("📅 Filtering providers for:", dayOfWeek, "at", formData.time);
    
    const availableOnThisDateTime = allProviders.filter(provider => {
      // Check working days
      if (provider.workingDays && provider.workingDays.length > 0) {
        if (!provider.workingDays.includes(dayOfWeek)) {
          console.log(`❌ ${provider.firstName} ${provider.lastName} not available on ${dayOfWeek}`);
          return false;
        }
      }

      // Check working hours
      if (provider.workingHours && provider.workingHours.start && provider.workingHours.end) {
        const appointmentTime = formData.time;
        const startTime = provider.workingHours.start;
        const endTime = provider.workingHours.end;

        if (appointmentTime < startTime || appointmentTime > endTime) {
          console.log(`❌ ${provider.firstName} ${provider.lastName} not available at ${appointmentTime} (works ${startTime}-${endTime})`);
          return false;
        }
      }

      console.log(`✅ ${provider.firstName} ${provider.lastName} is available`);
      return true;
    });

    console.log(`🔍 Found ${availableOnThisDateTime.length} available providers out of ${allProviders.length}`);
    setAvailableProviders(availableOnThisDateTime);
    
    // Clear selected provider if they're no longer available
    if (formData.providerId && !availableOnThisDateTime.find(p => p.id === parseInt(formData.providerId))) {
      form.setValue("providerId", "");
    }
  };

  useEffect(() => {
    if (showNewAppointment) {
      // Reset form completely when modal opens to prevent multiple selections
      form.reset({
        patientId: "",
        providerId: "",
        title: "",
        description: "",
        date: new Date().toISOString().split('T')[0],
        time: "09:00",
        duration: "30",
        type: "consultation",
        department: "Cardiology",
        location: "",
        isVirtual: false
      });
      
      fetchPatients();
      fetchProviders();
    }
  }, [showNewAppointment]);

  // Filter available providers when date or time changes
  useEffect(() => {
    filterAvailableProviders();
  }, [formData.date, formData.time, allProviders]);

  const onSubmit = (data: AppointmentFormData) => {
    console.log("🔍 FORM VALIDATION - Form data:", data);

    // Check if selected provider is in available list
    if (data.providerId && !availableProviders.find(p => p.id === parseInt(data.providerId))) {
      form.setError("providerId", {
        type: "manual",
        message: "Selected provider is not available at this time"
      });
      return;
    }

    // Create date in local timezone and keep it as local time for proper scheduling
    const localDateTime = `${data.date}T${data.time}:00`;
    
    // The patientId field now contains the database ID (as string)
    const patientDatabaseId = parseInt(data.patientId);
    
    const appointmentData = {
      patientId: patientDatabaseId, // Use numeric database ID directly
      providerId: parseInt(data.providerId),
      title: data.title || `${data.type} appointment`,
      description: data.description || "",
      scheduledAt: localDateTime,
      duration: parseInt(data.duration),
      type: data.type,
      status: "scheduled", // Required field - set default status
      location: data.isVirtual ? "Virtual" : (data.location || `${data.department || 'General'} Department`),
      isVirtual: data.isVirtual
    };
    
    console.log("Appointment data being sent:", appointmentData);

    createAppointmentMutation.mutate(appointmentData);
  };

  return (
    <div className="space-y-6" data-testid="admin-appointments">
      {/* Admin Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-blue-800">Appointment Management</h1>
          <p className="text-gray-600">Administrative view - All appointments across the organization</p>
        </div>
        <Button 
          onClick={() => setShowNewAppointment(true)}
          className="flex items-center gap-2"
          data-testid="admin-new-appointment"
        >
          <Plus className="h-4 w-4" />
          Schedule Appointment
        </Button>
      </div>

      {/* Admin Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalAppointments}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{todayAppointments}</div>
            <p className="text-xs text-muted-foreground">Scheduled for today</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{upcomingAppointments}</div>
            <p className="text-xs text-muted-foreground">Future appointments</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admin Controls</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                Full Access
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Appointment Tabs */}
      <Tabs defaultValue="calendar" className="space-y-4">
        <TabsList>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="calendar">
          <AppointmentCalendar 
            onNewAppointment={() => setShowNewAppointment(true)} 
          />
        </TabsContent>
        
        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>All Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">List view functionality can be implemented here</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Appointment Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Analytics dashboard for administrators</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Appointment Modal */}
      {showNewAppointment && (
        <div 
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowNewAppointment(false);
            }
          }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-semibold dark:text-white">Schedule New Appointment</h2>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNewAppointment(false)}
                  className="h-8 w-8 p-0"
                  data-testid="button-close"
                >
                  ✕
                </Button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                Fill in the details below to schedule a new patient appointment.
              </p>
            </div>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="patientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="required">Patient</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} data-testid="select-patient">
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select patient..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {patients.map((patient: any) => (
                              <SelectItem key={`patient-${patient.id}`} value={patient.id.toString()}>
                                {patient.firstName} {patient.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="providerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="required">Provider</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} data-testid="select-provider">
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select available provider..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {availableProviders.map((provider: any) => (
                              <SelectItem key={provider.id} value={provider.id.toString()}>
                                Dr. {provider.firstName} {provider.lastName}
                                {provider.department && ` - ${provider.department}`}
                                {provider.specialization && ` (${provider.specialization})`}
                                {provider.workingHours?.start && provider.workingHours?.end 
                                  ? ` | ${provider.workingHours.start}-${provider.workingHours.end}`
                                  : ''}
                              </SelectItem>
                            ))}
                            {availableProviders.length === 0 && formData.date && formData.time && (
                              <SelectItem value="no-providers" disabled>No providers available at this time</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="required">Department</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} data-testid="select-department">
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select department..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Cardiology">Cardiology</SelectItem>
                          <SelectItem value="Neurology">Neurology</SelectItem>
                          <SelectItem value="Orthopedics">Orthopedics</SelectItem>
                          <SelectItem value="Pediatrics">Pediatrics</SelectItem>
                          <SelectItem value="Oncology">Oncology</SelectItem>
                          <SelectItem value="Dermatology">Dermatology</SelectItem>
                          <SelectItem value="Psychiatry">Psychiatry</SelectItem>
                          <SelectItem value="Emergency Medicine">Emergency Medicine</SelectItem>
                          <SelectItem value="Radiology">Radiology</SelectItem>
                          <SelectItem value="General Medicine">General Medicine</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="required">Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="required">Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} data-testid="input-time" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {availableProviders.length === 0 && formData.date && formData.time && allProviders.length > 0 && (
                  <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3 text-sm text-yellow-800 dark:text-yellow-200">
                    ⚠️ No providers are available at the selected date and time. Please choose a different time.
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (minutes)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} data-testid="select-duration">
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select duration..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="15">15 minutes</SelectItem>
                            <SelectItem value="30">30 minutes</SelectItem>
                            <SelectItem value="45">45 minutes</SelectItem>
                            <SelectItem value="60">1 hour</SelectItem>
                            <SelectItem value="90">1.5 hours</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} data-testid="select-type">
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="consultation">Consultation</SelectItem>
                            <SelectItem value="follow_up">Follow-up</SelectItem>
                            <SelectItem value="routine_checkup">Check-up</SelectItem>
                            <SelectItem value="procedure">Procedure</SelectItem>
                            <SelectItem value="emergency">Emergency</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="required">Title</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Appointment title..." data-testid="input-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Additional notes..." 
                          className="h-20" 
                          data-testid="textarea-description" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Room number or location..." data-testid="input-location" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isVirtual"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox 
                          checked={field.value} 
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-virtual"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Virtual appointment</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <div className="flex gap-2 pt-4">
                  <Button 
                    type="submit"
                    disabled={createAppointmentMutation.isPending}
                    data-testid="button-submit"
                  >
                    {createAppointmentMutation.isPending ? "Scheduling..." : "Schedule Appointment"}
                  </Button>
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={() => setShowNewAppointment(false)}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      )}
    </div>
  );
}