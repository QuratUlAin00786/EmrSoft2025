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
  const [providers, setProviders] = useState<any[]>([]);

  const createAppointmentMutation = useMutation({
    mutationFn: async (appointmentData: any) => {
      return await apiRequest("POST", "/api/appointments", appointmentData);
    },
    onSuccess: () => {
      // Invalidate appointments cache to refresh the calendar
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
      onClose();
      onAppointmentCreated();
      
      // Show success toast
      setTimeout(() => {
        toast({
          title: "Success",
          description: "Appointment scheduled successfully"
        });
      }, 100);
    },
    onError: (error: any) => {
      console.error("Error creating appointment:", error);
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
    if (isOpen) {
      fetchPatients();
      fetchProviders();
    }
  }, [isOpen]);

  const createAppointment = () => {
    if (!formData.patientId || !formData.providerId) {
      toast({
        title: "Missing Information", 
        description: "Please select both patient and provider",
        variant: "destructive"
      });
      return;
    }

    const scheduledAt = new Date(`${formData.date}T${formData.time}`);
    
    const appointmentData = {
      patientId: formData.patientId,
      providerId: parseInt(formData.providerId),
      title: formData.title || `${formData.type} appointment`,
      description: formData.description || "",
      scheduledAt: scheduledAt.toISOString(),
      duration: parseInt(formData.duration),
      type: formData.type,
      location: formData.isVirtual ? "Virtual" : (formData.location || `${formData.department || 'General'} Department`),
      isVirtual: formData.isVirtual
    };

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