import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

interface NewAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAppointmentCreated: () => void;
}

export function NewAppointmentModal({ isOpen, onClose, onAppointmentCreated }: NewAppointmentModalProps) {
  const { toast } = useToast();
  const [patients, setPatients] = useState<any[]>([]);
  const [allProviders, setAllProviders] = useState<any[]>([]);
  const [availableProviders, setAvailableProviders] = useState<any[]>([]);

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
      
      // Reset form
      setFormData({
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
      
      // Close modal and notify parent
      console.log("🔄 Calling onAppointmentCreated callback...");
      onClose();
      onAppointmentCreated();
      
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
      toast({
        title: "Error",
        description: error.message || "Failed to create appointment",
        variant: "destructive"
      });
    }
  });
  
  const [formData, setFormData] = useState({
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
      setFormData(prev => ({ ...prev, providerId: "" }));
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPatients();
      fetchProviders();
    }
  }, [isOpen]);

  // Filter available providers when date or time changes
  useEffect(() => {
    filterAvailableProviders();
  }, [formData.date, formData.time, allProviders]);

  const createAppointment = () => {
    if (!formData.patientId || !formData.providerId) {
      toast({
        title: "Missing Information", 
        description: "Please select both patient and provider",
        variant: "destructive"
      });
      return;
    }

    // Check if selected provider is in available list
    if (formData.providerId && !availableProviders.find(p => p.id === parseInt(formData.providerId))) {
      toast({
        title: "Provider Not Available", 
        description: "Selected provider is not available at this time",
        variant: "destructive"
      });
      return;
    }

    // Create date in local timezone and keep it as local time for proper scheduling
    const localDateTime = `${formData.date}T${formData.time}:00`;
    
    // Find the actual patient ID from the selected patientId string
    const selectedPatient = patients.find(p => p.patientId === formData.patientId);
    
    const appointmentData = {
      patientId: selectedPatient ? selectedPatient.id : parseInt(formData.patientId), // Use numeric ID
      providerId: parseInt(formData.providerId),
      title: formData.title || `${formData.type} appointment`,
      description: formData.description || "",
      scheduledAt: localDateTime,
      duration: parseInt(formData.duration),
      type: formData.type,
      status: "scheduled", // Required field - set default status
      location: formData.isVirtual ? "Virtual" : (formData.location || `${formData.department || 'General'} Department`),
      isVirtual: formData.isVirtual
    };
    
    console.log("Appointment data being sent:", appointmentData);

    createAppointmentMutation.mutate(appointmentData);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold">Schedule New Appointment</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              ✕
            </Button>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Fill in the details below to schedule a new patient appointment.
          </p>
        </div>
        
        <div className="p-6 space-y-4">
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
                  <option key={patient.id} value={patient.patientId}>
                    {patient.firstName} {patient.lastName}
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
                <option value="">Select available provider...</option>
                {availableProviders.map((provider: any) => (
                  <option key={provider.id} value={provider.id}>
                    Dr. {provider.firstName} {provider.lastName}
                    {provider.workingHours?.start && provider.workingHours?.end 
                      ? ` (${provider.workingHours.start}-${provider.workingHours.end})`
                      : ''}
                  </option>
                ))}
                {availableProviders.length === 0 && formData.date && formData.time && (
                  <option value="" disabled>No providers available at this time</option>
                )}
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
              <option value="Cardiology">Cardiology</option>
              <option value="Neurology">Neurology</option>
              <option value="Orthopedics">Orthopedics</option>
              <option value="Pediatrics">Pediatrics</option>
              <option value="Oncology">Oncology</option>
              <option value="Dermatology">Dermatology</option>
              <option value="Psychiatry">Psychiatry</option>
              <option value="Emergency Medicine">Emergency Medicine</option>
              <option value="Radiology">Radiology</option>
              <option value="General Medicine">General Medicine</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Date *</label>
              <input 
                type="date"
                className="w-full p-2 border border-gray-300 rounded-md"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Time *</label>
              <input 
                type="time"
                className="w-full p-2 border border-gray-300 rounded-md"
                value={formData.time}
                onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
              />
            </div>
          </div>

          {availableProviders.length === 0 && formData.date && formData.time && allProviders.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
              ⚠️ No providers are available at the selected date and time. Please choose a different time.
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
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
                <option value="60">1 hour</option>
                <option value="90">1.5 hours</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Type</label>
              <select 
                className="w-full p-2 border border-gray-300 rounded-md"
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
              >
                <option value="consultation">Consultation</option>
                <option value="follow-up">Follow-up</option>
                <option value="checkup">Check-up</option>
                <option value="procedure">Procedure</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Title</label>
            <input 
              type="text"
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="Appointment title..."
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Description</label>
            <textarea 
              className="w-full p-2 border border-gray-300 rounded-md h-20"
              placeholder="Additional notes..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <div className="flex items-center space-x-2">
            <input 
              type="checkbox"
              id="isVirtual"
              checked={formData.isVirtual}
              onChange={(e) => setFormData(prev => ({ ...prev, isVirtual: e.target.checked }))}
              className="rounded"
            />
            <label htmlFor="isVirtual" className="text-sm font-medium text-gray-700">
              Virtual appointment
            </label>
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              onClick={createAppointment}
              disabled={createAppointmentMutation.isPending}
            >
              {createAppointmentMutation.isPending ? "Scheduling..." : "Schedule Appointment"}
            </Button>
            <Button 
              variant="outline" 
              onClick={onClose}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}