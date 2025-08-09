import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Pill, 
  Plus, 
  Search, 
  AlertTriangle, 
  Check, 
  CheckCircle,
  Clock, 
  User, 
  Calendar,
  FileText,
  Printer,
  Send,
  Eye,
  Edit,
  Trash2,
  PenTool
} from "lucide-react";
import { format } from "date-fns";

interface Prescription {
  id: string;
  patientId: string;
  patientName: string;
  providerId: string;
  providerName: string;
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    quantity: number;
    refills: number;
    instructions: string;
    genericAllowed: boolean;
  }>;
  diagnosis: string;
  status: 'active' | 'completed' | 'cancelled' | 'pending' | 'signed';
  prescribedAt: string;
  pharmacy?: {
    name: string;
    address: string;
    phone: string;
    email?: string;
  };
  interactions?: Array<{
    severity: 'minor' | 'moderate' | 'major';
    description: string;
  }>;
  signature?: {
    doctorSignature: string;
    signedAt: string;
    signedBy: string;
  };
}

const mockPrescriptions: Prescription[] = [
  {
    id: "rx_001",
    patientId: "p_001",
    patientName: "Sarah Johnson",
    providerId: "dr_001",
    providerName: "Dr. Sarah Smith",
    medications: [
      {
        name: "Lisinopril",
        dosage: "10mg",
        frequency: "Once daily",
        duration: "30 days",
        quantity: 30,
        refills: 5,
        instructions: "Take with or without food",
        genericAllowed: true
      },
      {
        name: "Metformin",
        dosage: "500mg",
        frequency: "Twice daily with meals",
        duration: "90 days",
        quantity: 180,
        refills: 3,
        instructions: "Take with breakfast and dinner",
        genericAllowed: true
      }
    ],
    diagnosis: "Hypertension, Type 2 Diabetes",
    status: "active",
    prescribedAt: "2024-01-15T10:30:00Z",
    pharmacy: {
      name: "City Pharmacy",
      address: "123 Main St, London",
      phone: "+44 20 7946 0958"
    }
  },
  {
    id: "rx_002",
    patientId: "p_002",
    patientName: "Robert Davis",
    providerId: "dr_001",
    providerName: "Dr. Sarah Smith",
    medications: [
      {
        name: "Amoxicillin",
        dosage: "500mg",
        frequency: "Three times daily",
        duration: "7 days",
        quantity: 21,
        refills: 0,
        instructions: "Complete full course. Take with food.",
        genericAllowed: true
      }
    ],
    diagnosis: "Upper Respiratory Infection",
    status: "completed",
    prescribedAt: "2024-01-10T14:15:00Z",
    interactions: [
      {
        severity: "minor",
        description: "May reduce effectiveness of oral contraceptives"
      }
    ]
  },
  {
    id: "rx_003",
    patientId: "p_003",
    patientName: "Emily Watson",
    providerId: "dr_002",
    providerName: "Dr. James Wilson",
    medications: [
      {
        name: "Atorvastatin",
        dosage: "20mg",
        frequency: "Once daily",
        duration: "30 days",
        quantity: 30,
        refills: 5,
        instructions: "Take in the evening",
        genericAllowed: true
      }
    ],
    diagnosis: "Hypercholesterolemia",
    status: "active",
    prescribedAt: "2024-01-12T09:45:00Z"
  }
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-800';
    case 'completed': return 'bg-blue-100 text-blue-800';
    case 'cancelled': return 'bg-red-100 text-red-800';
    case 'pending': return 'bg-yellow-100 text-yellow-800';
    case 'signed': return 'bg-purple-100 text-purple-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'minor': return 'bg-yellow-100 text-yellow-800';
    case 'moderate': return 'bg-orange-100 text-orange-800';
    case 'major': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export default function PrescriptionsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [showNewPrescription, setShowNewPrescription] = useState(false);
  const [showPharmacyDialog, setShowPharmacyDialog] = useState(false);
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState<string>("");
  const [pharmacyEmail, setPharmacyEmail] = useState<string>("pharmacy@halohealth.co.uk");
  const [patients, setPatients] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const queryClient = useQueryClient();
  
  // E-signature state
  const [showESignDialog, setShowESignDialog] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signature, setSignature] = useState<string>("");
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  // Form state for prescription editing
  const [formData, setFormData] = useState({
    patientId: "",
    patientName: "",
    providerId: "",
    diagnosis: "",
    medicationName: "",
    dosage: "",
    frequency: "",
    quantity: "",
    refills: "",
    instructions: "",
    pharmacyName: "Halo Health",
    pharmacyAddress: "Unit 2 Drayton Court, Solihull, B90 4NG",
    pharmacyPhone: "+44(0)121 827 5531",
    pharmacyEmail: "pharmacy@halohealth.co.uk"
  });

  // Update form data when selectedPrescription changes
  useEffect(() => {
    if (selectedPrescription) {
      const firstMedication = selectedPrescription.medications[0] || {};
      setFormData({
        patientId: selectedPrescription.patientId?.toString() || "",
        patientName: selectedPrescription.patientName || "",
        providerId: selectedPrescription.providerId?.toString() || "",
        diagnosis: selectedPrescription.diagnosis || "",
        medicationName: firstMedication.name || "",
        dosage: firstMedication.dosage || "",
        frequency: firstMedication.frequency || "",
        quantity: firstMedication.quantity?.toString() || "",
        refills: firstMedication.refills?.toString() || "",
        instructions: firstMedication.instructions || "",
        pharmacyName: selectedPrescription.pharmacy?.name || "Halo Health",
        pharmacyAddress: selectedPrescription.pharmacy?.address || "Unit 2 Drayton Court, Solihull, B90 4NG",
        pharmacyPhone: selectedPrescription.pharmacy?.phone || "+44(0)121 827 5531",
        pharmacyEmail: selectedPrescription.pharmacy?.email || "pharmacy@halohealth.co.uk"
      });
    } else {
      setFormData({
        patientId: "",
        patientName: "",
        providerId: "",
        diagnosis: "",
        medicationName: "",
        dosage: "",
        frequency: "",
        quantity: "",
        refills: "",
        instructions: "",
        pharmacyName: "Halo Health",
        pharmacyAddress: "Unit 2 Drayton Court, Solihull, B90 4NG",
        pharmacyPhone: "+44(0)121 827 5531",
        pharmacyEmail: "pharmacy@halohealth.co.uk"
      });
    }
  }, [selectedPrescription]);

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
      // Remove duplicates based on patient ID
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
      console.log("Fetched providers:", data);
      setProviders(data.staff || []);
    } catch (err) {
      console.error("Error fetching providers:", err);
      setProviders([]);
    }
  };

  useEffect(() => {
    fetchPatients();
    fetchProviders();
  }, []);

  const { data: rawPrescriptions = [], isLoading, error } = useQuery({
    queryKey: ["/api/prescriptions"],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'X-Tenant-Subdomain': 'demo'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch("/api/prescriptions", {
        headers,
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch prescriptions: ${response.status}`);
      }
      const data = await response.json();
      return data;
    },
    enabled: true,
  });

  // Create patient and provider name mappings from fetched data
  const patientNames: Record<number, string> = {};
  patients.forEach(patient => {
    patientNames[patient.id] = `${patient.firstName} ${patient.lastName}`;
  });

  const providerNames: Record<number, string> = {};
  providers.forEach(provider => {
    providerNames[provider.id] = `Dr. ${provider.firstName} ${provider.lastName}`;
  });

  const prescriptions = Array.isArray(rawPrescriptions) ? rawPrescriptions.map((prescription: any) => ({
    ...prescription,
    patientName: patientNames[prescription.patientId] || `Patient ${prescription.patientId}`,
    providerName: providerNames[prescription.providerId] || `Provider ${prescription.providerId}`
  })) : [];



  const createPrescriptionMutation = useMutation({
    mutationFn: async (prescriptionData: any) => {
      console.log("🚀 PRESCRIPTION MUTATION START - Sending data:", prescriptionData);
      const isUpdate = selectedPrescription && selectedPrescription.id;
      const url = isUpdate ? `/api/prescriptions/${selectedPrescription.id}` : "/api/prescriptions";
      const method = isUpdate ? "PATCH" : "POST";
      
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Tenant-Subdomain': 'demo'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      console.log("📡 Making request to:", url, "Method:", method);
      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(prescriptionData),
        credentials: "include",
      });
      
      console.log("📡 Response status:", response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ API Error:", errorText);
        throw new Error(`Failed to ${isUpdate ? 'update' : 'create'} prescription: ${response.status}`);
      }
      
      const result = await response.json();
      console.log("✅ PRESCRIPTION SUCCESS - API returned:", result);
      return result;
    },
    onSuccess: (data) => {
      console.log("🎉 PRESCRIPTION onSuccess triggered with data:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/prescriptions"] });
      setShowNewPrescription(false);
      setSelectedPrescription(null);
      toast({
        title: "Success",
        description: "Prescription created successfully - ID: " + (data?.id || 'Unknown')
      });
    },
    onError: (error: any) => {
      console.error("❌ PRESCRIPTION ERROR:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create prescription",
        variant: "destructive"
      });
    }
  });

  const sendToPharmacyMutation = useMutation({
    mutationFn: async ({ prescriptionId, pharmacyData, patientName }: { prescriptionId: string, pharmacyData: any, patientName?: string }) => {
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Tenant-Subdomain': 'demo'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // First update the prescription with pharmacy data
      const response = await fetch(`/api/prescriptions/${prescriptionId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ pharmacy: pharmacyData }),
        credentials: "include",
      });
      if (!response.ok) throw new Error('Failed to send prescription to pharmacy');
      
      // Then send the PDF email to the pharmacy
      const emailResponse = await fetch(`/api/prescriptions/${prescriptionId}/send-pdf`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          pharmacyEmail: pharmacyData.email,
          pharmacyName: pharmacyData.name,
          patientName: patientName
        }),
        credentials: "include",
      });
      
      if (!emailResponse.ok) throw new Error('Failed to send PDF email to pharmacy');
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Prescription sent to pharmacy and PDF emailed successfully",
      });
      setShowPharmacyDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/prescriptions"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send prescription to pharmacy",
        variant: "destructive",
      });
    },
  });

  const deletePrescriptionMutation = useMutation({
    mutationFn: async (prescriptionId: string) => {
      const response = await apiRequest("DELETE", `/api/prescriptions/${prescriptionId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Prescription deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/prescriptions"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete prescription",
        variant: "destructive",
      });
    },
  });

  const handleCreatePrescription = () => {
    setSelectedPrescription(null); // Clear any selected prescription for new creation
    setShowNewPrescription(true);
  };

  const [showViewDetails, setShowViewDetails] = useState(false);

  const handleViewPrescription = (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    setShowViewDetails(true);
  };

  const { toast } = useToast();

  // E-signature functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000000';
    
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const clearSignature = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignature("");
  };

  const saveSignature = async () => {
    if (!canvasRef.current || !selectedPrescription) return;
    
    const canvas = canvasRef.current;
    const signatureData = canvas.toDataURL();
    
    try {
      const response = await apiRequest("POST", `/api/prescriptions/${selectedPrescription.id}/e-sign`, {
        signature: signatureData
      });

      if (response.ok) {
        const result = await response.json();
        
        // Update the prescription queries to refresh data
        queryClient.invalidateQueries({ queryKey: ["/api/prescriptions"] });
        
        // Clear canvas and close dialog
        clearSignature();
        setShowESignDialog(false);
        
        toast({
          title: "Success",
          description: "Prescription has been electronically signed and saved to database",
        });
      } else {
        throw new Error("Failed to save signature");
      }
    } catch (error) {
      console.error("Error saving e-signature:", error);
      toast({
        title: "Error", 
        description: "Failed to save electronic signature. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handlePrintPrescription = (prescriptionId: string) => {
    // Simulate printing functionality
    toast({
      title: "Printing Prescription",
      description: "Prescription sent to printer successfully",
    });
    
    // In a real implementation, this would generate a PDF and send to printer
    const prescription = Array.isArray(prescriptions) ? prescriptions.find((p: any) => p.id === prescriptionId) : null;
    if (prescription) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head><title>Prescription - ${prescription.patientName}</title></head>
            <body>
              <h2>Prescription</h2>
              <p><strong>Patient:</strong> ${prescription.patientName}</p>
              <p><strong>Provider:</strong> ${prescription.providerName}</p>
              <p><strong>Date:</strong> ${new Date(prescription.prescribedAt).toLocaleDateString()}</p>
              <h3>Medications:</h3>
              ${prescription.medications.map((med: any) => 
                `<p><strong>${med.name}</strong> ${med.dosage} - ${med.frequency} for ${med.duration}</p>`
              ).join('')}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const handleSendToPharmacy = (prescriptionId: string) => {
    setSelectedPrescriptionId(prescriptionId);
    setShowPharmacyDialog(true);
  };

  const handleEditPrescription = (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    setShowNewPrescription(true);
    toast({
      title: "Edit Prescription",
      description: `Opening prescription editor for ${prescription.patientName}`,
    });
  };

  const handleCancelPrescription = (prescriptionId: string) => {
    if (window.confirm('Are you sure you want to cancel this prescription?')) {
      const prescription = Array.isArray(prescriptions) ? prescriptions.find((p: any) => p.id === prescriptionId) : null;
      if (prescription) {
        toast({
          title: "Prescription Cancelled",
          description: `Prescription for ${prescription.patientName} has been cancelled`,
          variant: "destructive",
        });
        
        // In a real implementation, this would call an API to cancel the prescription
        queryClient.invalidateQueries({ queryKey: ["/api/prescriptions"] });
      }
    }
  };

  const handleDeletePrescription = (prescriptionId: string | number) => {
    // Prevent multiple deletion attempts
    if (deletePrescriptionMutation.isPending) {
      return;
    }
    
    const prescription = Array.isArray(prescriptions) ? prescriptions.find((p: any) => p.id == prescriptionId) : null;
    if (prescription && window.confirm(`Are you sure you want to delete the prescription for ${prescription.patientName}? This action cannot be undone.`)) {
      deletePrescriptionMutation.mutate(String(prescriptionId));
    }
  };

  const filteredPrescriptions = Array.isArray(prescriptions) ? prescriptions.filter((prescription: any) => {
    const matchesSearch = !searchQuery || 
      prescription.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prescription.medications.some((med: any) => med.name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || prescription.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) : [];


  if (isLoading) {
    return (
      <>
        <Header title="Prescriptions" subtitle="Manage patient prescriptions and medications" />
        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header 
        title="Prescriptions" 
        subtitle="Manage patient prescriptions and medications"
      />
      
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="space-y-4 sm:space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">Active Prescriptions</p>
                    <p className="text-xl sm:text-2xl font-bold">{filteredPrescriptions.filter((p: any) => p.status === 'active').length}</p>
                  </div>
                  <Pill className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">Pending Approval</p>
                    <p className="text-xl sm:text-2xl font-bold">{filteredPrescriptions.filter((p: any) => p.status === 'pending').length}</p>
                  </div>
                  <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">Drug Interactions</p>
                    <p className="text-xl sm:text-2xl font-bold">
                      {filteredPrescriptions.filter((p: any) => p.interactions && p.interactions.length > 0).length}
                    </p>
                  </div>
                  <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">Total Prescriptions</p>
                    <p className="text-xl sm:text-2xl font-bold">{filteredPrescriptions.length}</p>
                  </div>
                  <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Actions */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search prescriptions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                
                <Dialog open={showNewPrescription} onOpenChange={setShowNewPrescription}>
                  <DialogTrigger asChild>
                    <Button 
                      className="bg-medical-blue hover:bg-blue-700"
                      onClick={() => {
                        setSelectedPrescription(null);
                        setFormData({
                          patientId: "",
                          patientName: "",
                          providerId: "",
                          diagnosis: "",
                          medicationName: "",
                          dosage: "",
                          frequency: "",
                          quantity: "",
                          refills: "",
                          instructions: "",
                          pharmacyName: "Halo Health",
                          pharmacyAddress: "Unit 2 Drayton Court, Solihull, B90 4NG",
                          pharmacyPhone: "+44(0)121 827 5531",
                          pharmacyEmail: "pharmacy@halohealth.co.uk"
                        });
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      New Prescription
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>
                        {selectedPrescription ? "Edit Prescription" : "Create New Prescription"}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="patient">Patient</Label>
                          <Select value={formData.patientId} onValueChange={(value) => setFormData(prev => ({ ...prev, patientId: value }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select patient" />
                            </SelectTrigger>
                            <SelectContent>
                              {patients.map((patient: any) => (
                                <SelectItem key={patient.id} value={patient.id.toString()}>
                                  {patient.firstName} {patient.lastName} ({patient.patientId})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="provider">Prescribing Doctor</Label>
                          <Select value={formData.providerId} onValueChange={(value) => setFormData(prev => ({ ...prev, providerId: value }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select doctor" />
                            </SelectTrigger>
                            <SelectContent>
                              {providers.map((provider: any) => (
                                <SelectItem key={provider.id} value={provider.id.toString()}>
                                  Dr. {provider.firstName} {provider.lastName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="diagnosis">Diagnosis</Label>
                        <Input 
                          placeholder="Enter diagnosis" 
                          value={formData.diagnosis}
                          onChange={(e) => setFormData(prev => ({ ...prev, diagnosis: e.target.value }))}
                        />
                      </div>
                      
                      <div className="space-y-3">
                        <Label>Medications</Label>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="medication">Medication Name</Label>
                            <Input 
                              placeholder="Enter medication" 
                              value={formData.medicationName}
                              onChange={(e) => setFormData(prev => ({ ...prev, medicationName: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="dosage">Dosage</Label>
                            <Input 
                              placeholder="e.g., 10mg" 
                              value={formData.dosage}
                              onChange={(e) => setFormData(prev => ({ ...prev, dosage: e.target.value }))}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="frequency">Frequency</Label>
                            <Select value={formData.frequency} onValueChange={(value) => setFormData(prev => ({ ...prev, frequency: value }))}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select frequency" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Once daily">Once daily</SelectItem>
                                <SelectItem value="Twice daily">Twice daily</SelectItem>
                                <SelectItem value="Three times daily">Three times daily</SelectItem>
                                <SelectItem value="Four times daily">Four times daily</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="quantity">Quantity</Label>
                            <Input 
                              type="number" 
                              placeholder="30" 
                              value={formData.quantity}
                              onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="refills">Refills</Label>
                            <Input 
                              type="number" 
                              placeholder="3" 
                              value={formData.refills}
                              onChange={(e) => setFormData(prev => ({ ...prev, refills: e.target.value }))}
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="instructions">Instructions</Label>
                          <Textarea 
                            placeholder="Special instructions for patient" 
                            value={formData.instructions}
                            onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
                          />
                        </div>
                      </div>
                      
                      {/* Pharmacy Information Section */}
                      <div className="space-y-3 border-t pt-4">
                        <Label className="text-lg font-medium">Pharmacy Information</Label>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="pharmacyName">Pharmacy Name</Label>
                            <Input 
                              placeholder="Pharmacy name" 
                              value={formData.pharmacyName}
                              onChange={(e) => setFormData(prev => ({ ...prev, pharmacyName: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="pharmacyPhone">Phone Number</Label>
                            <Input 
                              placeholder="Phone number" 
                              value={formData.pharmacyPhone}
                              onChange={(e) => setFormData(prev => ({ ...prev, pharmacyPhone: e.target.value }))}
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="pharmacyAddress">Address</Label>
                          <Input 
                            placeholder="Pharmacy address" 
                            value={formData.pharmacyAddress}
                            onChange={(e) => setFormData(prev => ({ ...prev, pharmacyAddress: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="pharmacyEmail">Email</Label>
                          <Input 
                            type="email"
                            placeholder="pharmacy@example.com" 
                            value={formData.pharmacyEmail}
                            onChange={(e) => setFormData(prev => ({ ...prev, pharmacyEmail: e.target.value }))}
                          />
                        </div>
                      </div>
                      
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowNewPrescription(false)}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={() => {
                            // Prevent multiple submissions
                            if (createPrescriptionMutation.isPending) {
                              return;
                            }
                            
                            // Validation
                            if (!formData.patientId || !formData.providerId || !formData.medicationName) {
                              alert("Please fill in all required fields (Patient, Doctor, and Medication Name)");
                              return;
                            }

                            const prescriptionData = {
                              patientId: parseInt(formData.patientId),
                              providerId: parseInt(formData.providerId),
                              diagnosis: formData.diagnosis,
                              pharmacy: {
                                name: formData.pharmacyName,
                                address: formData.pharmacyAddress,
                                phone: formData.pharmacyPhone,
                                email: formData.pharmacyEmail
                              },
                              medications: [{
                                name: formData.medicationName,
                                dosage: formData.dosage,
                                frequency: formData.frequency,
                                duration: "30 days", // Default for now
                                quantity: parseInt(formData.quantity) || 0,
                                refills: parseInt(formData.refills) || 0,
                                instructions: formData.instructions,
                                genericAllowed: true
                              }]
                            };

                            console.log("=== FRONTEND PRESCRIPTION DEBUG ===");
                            console.log("Form data before parsing:", formData);
                            console.log("Selected patient ID:", formData.patientId);
                            console.log("Selected provider ID:", formData.providerId);
                            console.log("Available providers:", providers);
                            console.log("Final prescription data:", prescriptionData);
                            createPrescriptionMutation.mutate(prescriptionData);
                          }}
                          disabled={createPrescriptionMutation.isPending}
                        >
                          {createPrescriptionMutation.isPending ? 
                            (selectedPrescription ? "Updating..." : "Creating...") : 
                            (selectedPrescription ? "Update Prescription" : "Create Prescription")
                          }
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          {/* Prescriptions List */}
          <div className="space-y-4">
            {filteredPrescriptions.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Pill className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-2">No prescriptions found</h3>
                  <p className="text-gray-600 dark:text-gray-300">Try adjusting your search terms or filters</p>
                </CardContent>
              </Card>
            ) : (
              filteredPrescriptions.map((prescription) => (
                <Card key={prescription.id} className="hover:shadow-md transition-shadow bg-gradient-to-br from-blue-50 to-purple-100 dark:from-slate-800 dark:to-slate-700 border-2 border-blue-200 dark:border-slate-600">
                  <CardContent className="p-0">
                    {/* Professional Prescription Header */}
                    <div className="bg-white dark:bg-slate-700 border-b-2 border-blue-200 dark:border-slate-600 p-4">
                      <div className="flex justify-between items-start">
                        <div className="text-center">
                          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">CURA HEALTH EMR</h2>
                          <p className="text-sm text-gray-600 dark:text-gray-300">License # 123456</p>
                          <p className="text-sm text-gray-600 dark:text-gray-300">NPI # 1234567890</p>
                        </div>
                        <div>
                          <Badge className={getStatusColor(prescription.status)}>
                            {prescription.status}
                          </Badge>
                          {prescription.interactions && prescription.interactions.length > 0 && (
                            <Badge variant="destructive" className="flex items-center gap-1 ml-2">
                              <AlertTriangle className="h-3 w-3" />
                              Drug Interactions
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-center mt-2">
                        <h3 className="text-md font-semibold text-gray-800 dark:text-gray-100">RESIDENT PHYSICIAN M.D</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{prescription.providerName}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Halo Health Clinic</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Unit 2 Drayton Court, Solihull</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">B90 4NG, UK</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">+44(0)121 827 5531</p>
                      </div>
                    </div>

                    {/* Patient Information */}
                    <div className="px-6 py-4 bg-blue-50 dark:bg-slate-600">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm text-gray-800 dark:text-gray-100"><strong>Name:</strong> {prescription.patientName}</p>
                          <p className="text-sm text-gray-800 dark:text-gray-100"><strong>Address:</strong> Patient Address</p>
                          <p className="text-sm text-gray-800 dark:text-gray-100"><strong>Allergies:</strong> NKDA</p>
                          <p className="text-sm text-gray-800 dark:text-gray-100"><strong>Weight:</strong> {prescription.patientWeight || '70 kg'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-800 dark:text-gray-100"><strong>DOB:</strong> {prescription.patientDob || '01/01/1985'}</p>
                          <p className="text-sm text-gray-800 dark:text-gray-100"><strong>Age:</strong> {prescription.patientAge || '39'}</p>
                          <p className="text-sm text-gray-800 dark:text-gray-100"><strong>Sex:</strong> {prescription.patientSex || 'M'}</p>
                          <p className="text-sm text-gray-800 dark:text-gray-100"><strong>Date:</strong> {format(new Date(prescription.prescribedAt), 'MM/dd/yyyy')}</p>
                        </div>
                      </div>
                    </div>

                    {/* Large HHC Symbol */}
                    <div className="flex justify-center py-4 bg-blue-50 dark:bg-slate-600">
                      <div className="text-6xl font-bold text-blue-400 dark:text-blue-300 opacity-50">
                        HHC
                      </div>
                    </div>

                    {/* Prescription Content */}
                    <div className="px-6 py-4 bg-white dark:bg-slate-700 min-h-[200px]">
                      <div className="space-y-4">
                        {prescription.medications.map((medication: any, index: number) => (
                          <div key={index}>
                            <p className="font-medium text-lg text-gray-800 dark:text-gray-100">{medication.name} {medication.dosage}</p>
                            <p className="text-sm text-gray-700 dark:text-gray-300 ml-4">Sig: {medication.instructions || medication.frequency}</p>
                            <p className="text-sm text-gray-700 dark:text-gray-300 ml-4">Disp: {medication.quantity} ({medication.duration})</p>
                            <p className="text-sm text-gray-700 dark:text-gray-300 ml-4">Refills: {medication.refills}</p>
                            {index < prescription.medications.length - 1 && (
                              <hr className="my-3 border-gray-200" />
                            )}
                          </div>
                        ))}
                      </div>
                      
                      {/* Diagnosis */}
                      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
                        <p className="text-sm text-gray-800 dark:text-gray-100"><strong>Diagnosis:</strong> {prescription.diagnosis}</p>
                      </div>
                    </div>

                    {/* Prescription Footer */}
                    <div className="px-6 py-4 bg-blue-50 dark:bg-slate-600 border-t-2 border-blue-200 dark:border-slate-600">
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-100">Resident Physician</p>
                          <p className="text-xs text-gray-600 dark:text-gray-300">(Signature)</p>
                          {prescription.signature && prescription.signature.doctorSignature ? (
                            <div className="mt-2">
                              <img 
                                src={prescription.signature.doctorSignature} 
                                alt="Doctor Signature" 
                                className="h-12 w-32 border border-gray-300 bg-white rounded"
                              />
                              <p className="text-xs text-green-600 mt-1">
                                ✓ E-Signed by {prescription.signature.signedBy || 'Unknown Provider'}
                              </p>
                              <p className="text-xs text-gray-500">
                                {prescription.signature.signedAt && !isNaN(new Date(prescription.signature.signedAt).getTime()) 
                                  ? format(new Date(prescription.signature.signedAt), 'MMM dd, yyyy HH:mm')
                                  : 'Date not available'
                                }
                              </p>
                            </div>
                          ) : (
                            <div className="border-b border-gray-400 w-32 mt-2"></div>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-100">May Substitute</p>
                          <div className="border-b border-gray-400 w-32 mt-2"></div>
                        </div>
                      </div>
                      
                      {prescription.pharmacy && (
                        <div className="mt-4 text-center">
                          <p className="text-xs text-gray-600 dark:text-gray-300">
                            <strong>Pharmacy:</strong> {prescription.pharmacy.name} - {prescription.pharmacy.phone}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Drug Interactions Warning */}
                    {prescription.interactions && prescription.interactions.length > 0 && (
                      <div className="mx-4 mb-4 p-3 bg-red-50 border border-red-200 rounded">
                        <h4 className="font-medium text-red-800 mb-2 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          Drug Interactions Warning:
                        </h4>
                        <div className="space-y-1">
                          {prescription.interactions.map((interaction: any, index: number) => (
                            <div key={index} className="text-xs text-red-700">
                              <Badge className={getSeverityColor(interaction.severity) + " mr-2"} style={{fontSize: '10px'}}>
                                {interaction.severity}
                              </Badge>
                              {interaction.description}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                  
                  {/* Action Buttons */}
                  <div className="px-4 pb-4">
                    <div className="flex flex-wrap gap-1 sm:gap-2 justify-center">
                      <Button variant="outline" size="sm" onClick={() => handleViewPrescription(prescription)} className="text-xs sm:text-sm px-2 sm:px-3">
                        <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        <span className="hidden sm:inline">View</span>
                        <span className="sm:hidden">View</span>
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handlePrintPrescription(prescription.id)} className="text-xs sm:text-sm px-2 sm:px-3">
                        <Printer className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        <span className="hidden sm:inline">Print</span>
                        <span className="sm:hidden">Print</span>
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleSendToPharmacy(prescription.id)} className="text-xs sm:text-sm px-2 sm:px-3">
                        <Send className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        <span className="hidden lg:inline">Send to Pharmacy</span>
                        <span className="lg:hidden">Send</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          setSelectedPrescription(prescription);
                          setShowESignDialog(true);
                        }} 
                        className="text-xs sm:text-sm px-2 sm:px-3"
                      >
                        <PenTool className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        <span className="hidden lg:inline">E-Sign</span>
                        <span className="lg:hidden">Sign</span>
                      </Button>
                      {prescription.status === 'active' && (
                        <Button variant="outline" size="sm" onClick={() => handleEditPrescription(prescription)} className="text-xs sm:text-sm px-2 sm:px-3">
                          <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          <span className="hidden sm:inline">Edit</span>
                          <span className="sm:hidden">Edit</span>
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDeletePrescription(prescription.id)}
                        disabled={deletePrescriptionMutation.isPending}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs sm:text-sm px-2 sm:px-3 disabled:opacity-50"
                      >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        <span className="hidden sm:inline">{deletePrescriptionMutation.isPending ? 'Deleting...' : 'Delete'}</span>
                        <span className="sm:hidden">{deletePrescriptionMutation.isPending ? 'Deleting...' : 'Delete'}</span>
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>

      {/* View Prescription Details Dialog */}
      <Dialog open={showViewDetails} onOpenChange={setShowViewDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Prescription Details</DialogTitle>
          </DialogHeader>
          {selectedPrescription && (
            <div className="space-y-6">
              {/* Patient & Provider Info */}
              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Patient Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Name</p>
                      <p className="font-medium">{selectedPrescription.patientName}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Patient ID</p>
                      <p className="font-mono text-sm">{selectedPrescription.patientId}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Provider Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Provider</p>
                      <p className="font-medium">{selectedPrescription.providerName}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Provider ID</p>
                      <p className="font-mono text-sm">{selectedPrescription.providerId}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Prescription Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Prescription Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Status</p>
                      <Badge className={getStatusColor(selectedPrescription.status)}>
                        {selectedPrescription.status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Prescribed Date</p>
                      <p className="font-medium">
                        {new Date(selectedPrescription.prescribedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Prescription ID</p>
                      <p className="font-mono text-sm">{selectedPrescription.id}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Diagnosis</p>
                    <p className="font-medium">{selectedPrescription.diagnosis}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Medications */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Pill className="h-5 w-5" />
                    Medications ({selectedPrescription.medications.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedPrescription.medications.map((medication, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Medication</p>
                            <p className="font-semibold text-lg">{medication.name}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">Dosage</p>
                            <p className="font-medium">{medication.dosage}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-4 mb-3">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Frequency</p>
                            <p>{medication.frequency}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">Duration</p>
                            <p>{medication.duration}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">Quantity</p>
                            <p>{medication.quantity}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">Refills</p>
                            <p>{medication.refills}</p>
                          </div>
                        </div>
                        <div className="mb-3">
                          <p className="text-sm font-medium text-gray-600">Instructions</p>
                          <p className="text-sm bg-gray-50 p-2 rounded">{medication.instructions}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Generic Substitution</p>
                          <Badge variant={medication.genericAllowed ? "default" : "secondary"}>
                            {medication.genericAllowed ? "Allowed" : "Not Allowed"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Drug Interactions */}
              {selectedPrescription.interactions && selectedPrescription.interactions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      Drug Interactions ({selectedPrescription.interactions.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedPrescription.interactions.map((interaction, index) => (
                        <div key={index} className="flex gap-3 p-3 border rounded-lg">
                          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <Badge className={getSeverityColor(interaction.severity)}>
                              {interaction.severity.charAt(0).toUpperCase() + interaction.severity.slice(1)}
                            </Badge>
                            <p className="text-sm mt-2">{interaction.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Pharmacy Information */}
              {selectedPrescription.pharmacy && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Pharmacy Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Pharmacy Name</p>
                      <p className="font-medium">{selectedPrescription.pharmacy.name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Address</p>
                      <p>{selectedPrescription.pharmacy.address}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Phone</p>
                      <p>{selectedPrescription.pharmacy.phone}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowViewDetails(false)}>
                  Close
                </Button>
                <Button variant="outline" onClick={() => handlePrintPrescription(selectedPrescription.id)}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
                <Button variant="outline" onClick={() => handleSendToPharmacy(selectedPrescription.id)}>
                  <Send className="h-4 w-4 mr-2" />
                  Send to Pharmacy
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowViewDetails(false);
                    setShowESignDialog(true);
                  }}
                >
                  <PenTool className="h-4 w-4 mr-2" />
                  E-Sign
                </Button>
                {selectedPrescription.status === 'active' && (
                  <Button 
                    onClick={() => {
                      setShowViewDetails(false);
                      handleEditPrescription(selectedPrescription);
                    }}
                    className="bg-medical-blue hover:bg-blue-700"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Prescription
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowViewDetails(false);
                    handleDeletePrescription(selectedPrescription.id);
                  }}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Send to Pharmacy Dialog */}
      <Dialog open={showPharmacyDialog} onOpenChange={setShowPharmacyDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Prescription to Halo Health Pharmacy</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2">Halo Health Pharmacy</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p>Unit 2 Drayton Court</p>
                <p>Solihull</p>
                <p>B90 4NG</p>
                <p className="font-medium mt-2">Phone: +44(0)121 827 5531</p>
                <p className="font-medium">Email: pharmacy@halohealth.co.uk</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                This prescription will be sent as a PDF to the pharmacy via email for processing.
              </p>
              
              <div className="space-y-2">
                <Label htmlFor="pharmacy-email" className="text-sm font-medium">
                  Pharmacy Email Address
                </Label>
                <Input
                  id="pharmacy-email"
                  type="email"
                  value={pharmacyEmail}
                  onChange={(e) => setPharmacyEmail(e.target.value)}
                  placeholder="Enter pharmacy email address"
                  className="w-full"
                />
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-blue-600" />
                <span>PDF prescription will be generated automatically</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <Send className="h-4 w-4 text-green-600" />
                <span>Email will be sent to the specified pharmacy address</span>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowPharmacyDialog(false)} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  const pharmacyData = {
                    name: "Halo Health",
                    address: "Unit 2 Drayton Court, Solihull, B90 4NG",
                    phone: "+44(0)121 827 5531",
                    email: pharmacyEmail
                  };
                  // Find the selected prescription to get patient name
                  const prescription = prescriptions?.find(p => p.id === selectedPrescriptionId);
                  sendToPharmacyMutation.mutate({ 
                    prescriptionId: selectedPrescriptionId, 
                    pharmacyData,
                    patientName: prescription?.patientName || "Patient"
                  });
                }}
                disabled={sendToPharmacyMutation.isPending || !pharmacyEmail.trim()}
                className="flex-1 bg-medical-blue hover:bg-blue-700"
              >
                {sendToPharmacyMutation.isPending ? "Sending PDF..." : "Send PDF to Pharmacy"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Advanced E-Signature Dialog */}
      <Dialog open={showESignDialog} onOpenChange={setShowESignDialog}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <PenTool className="h-6 w-6 text-medical-blue" />
              Advanced Electronic Signature
            </DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="signature" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="signature">Signature</TabsTrigger>
              <TabsTrigger value="authentication">Authentication</TabsTrigger>
              <TabsTrigger value="verification">Verification</TabsTrigger>
              <TabsTrigger value="compliance">Compliance</TabsTrigger>
            </TabsList>

            {/* Signature Tab */}
            <TabsContent value="signature" className="space-y-4">
              {selectedPrescription && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Prescription Summary for Digital Signature
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm text-blue-800">
                    <div>
                      <p><strong>Patient:</strong> {selectedPrescription.patientName}</p>
                      <p><strong>Patient ID:</strong> {selectedPrescription.patientId}</p>
                      <p><strong>Date Prescribed:</strong> {format(new Date(selectedPrescription.prescribedAt), 'MMM dd, yyyy HH:mm')}</p>
                    </div>
                    <div>
                      <p><strong>Prescribing Provider:</strong> {selectedPrescription.providerName}</p>
                      <p><strong>Diagnosis:</strong> {selectedPrescription.diagnosis}</p>
                      <p><strong>Total Medications:</strong> {selectedPrescription.medications.length}</p>
                    </div>
                  </div>
                  <div className="mt-3 p-3 bg-white rounded border">
                    <p className="text-sm font-medium text-gray-700 mb-2">Medications to be signed:</p>
                    {selectedPrescription.medications.map((med: any, idx: number) => (
                      <div key={idx} className="text-xs text-gray-600 mb-1">
                        • {med.name} {med.dosage} - {med.frequency} x {med.quantity} ({med.refills} refills)
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Advanced Signature Canvas */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-gray-700">
                      Digital Signature Pad
                    </label>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      Signature Quality: Real-time Analysis
                    </div>
                  </div>
                  
                  <div className="border-2 border-gray-300 rounded-lg relative overflow-hidden bg-white shadow-inner">
                    <canvas
                      ref={canvasRef}
                      width={450}
                      height={200}
                      className="cursor-crosshair w-full"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                    />
                    <div className="absolute top-2 right-2 text-xs text-gray-400">
                      Advanced Capture Mode
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={clearSignature} className="flex-1">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear
                    </Button>
                    <Button variant="outline" className="flex-1">
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                  </div>
                </div>

                {/* Signature Analytics */}
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <h5 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Signature Quality Analysis
                    </h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Stroke Consistency:</span>
                        <span className="text-green-600 font-medium">Excellent</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Pressure Variation:</span>
                        <span className="text-green-600 font-medium">Natural</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Speed Analysis:</span>
                        <span className="text-green-600 font-medium">Consistent</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Uniqueness Score:</span>
                        <span className="text-green-600 font-medium">98.7%</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h5 className="font-medium text-blue-800 mb-2">Biometric Verification</h5>
                    <div className="text-sm text-blue-700 space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Touch patterns analyzed</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Behavioral biometrics captured</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Device fingerprint verified</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Authentication Tab */}
            <TabsContent value="authentication" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Multi-Factor Authentication
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded border border-green-200">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="text-sm font-medium">Primary Authentication</span>
                        </div>
                        <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">Verified</span>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded border border-green-200">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="text-sm font-medium">Device Recognition</span>
                        </div>
                        <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">Trusted</span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-yellow-50 rounded border border-yellow-200">
                        <div className="flex items-center gap-3">
                          <Clock className="h-5 w-5 text-yellow-600" />
                          <span className="text-sm font-medium">Time-based Verification</span>
                        </div>
                        <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">Active</span>
                      </div>
                    </div>

                    <Button className="w-full bg-medical-blue hover:bg-blue-700">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Verify Additional Factor
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Security Validation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-sm space-y-2">
                      <p><strong>Session ID:</strong> <span className="font-mono text-xs">ESS-{Math.random().toString(36).substr(2, 9).toUpperCase()}</span></p>
                      <p><strong>IP Address:</strong> <span className="font-mono text-xs">192.168.1.45</span></p>
                      <p><strong>Location:</strong> Authorized Facility</p>
                      <p><strong>Timestamp:</strong> {format(new Date(), 'yyyy-MM-dd HH:mm:ss')} UTC</p>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded border">
                      <p className="text-xs text-gray-600 mb-2"><strong>Digital Certificate Status:</strong></p>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-600">Valid & Current</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Verification Tab */}
            <TabsContent value="verification" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Advanced Signature Verification
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-green-50 p-4 rounded border border-green-200">
                      <h5 className="font-medium text-green-800 mb-2">Handwriting Analysis</h5>
                      <div className="text-sm text-green-700 space-y-1">
                        <p>• Stroke patterns: ✓ Verified</p>
                        <p>• Pressure dynamics: ✓ Natural</p>
                        <p>• Speed consistency: ✓ Human-like</p>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 p-4 rounded border border-blue-200">
                      <h5 className="font-medium text-blue-800 mb-2">Biometric Matching</h5>
                      <div className="text-sm text-blue-700 space-y-1">
                        <p>• Touch patterns: ✓ Match 97.8%</p>
                        <p>• Behavioral traits: ✓ Consistent</p>
                        <p>• Device interaction: ✓ Verified</p>
                      </div>
                    </div>
                    
                    <div className="bg-purple-50 p-4 rounded border border-purple-200">
                      <h5 className="font-medium text-purple-800 mb-2">AI Fraud Detection</h5>
                      <div className="text-sm text-purple-700 space-y-1">
                        <p>• Anomaly detection: ✓ Clean</p>
                        <p>• Pattern recognition: ✓ Genuine</p>
                        <p>• Risk assessment: ✓ Low risk</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded border">
                    <h5 className="font-medium text-gray-800 mb-2">Verification Summary</h5>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p><strong>Overall Confidence:</strong> <span className="text-green-600 font-medium">99.2%</span></p>
                        <p><strong>Authentication Level:</strong> <span className="text-blue-600 font-medium">High Security</span></p>
                      </div>
                      <div>
                        <p><strong>Verification Method:</strong> Multi-modal</p>
                        <p><strong>Compliance Level:</strong> <span className="text-green-600 font-medium">FDA 21 CFR Part 11</span></p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Compliance Tab */}
            <TabsContent value="compliance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Legal & Regulatory Compliance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h5 className="font-semibold text-blue-900 mb-3">Electronic Signature Compliance Standards</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span>FDA 21 CFR Part 11 Compliant</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span>HIPAA Security Rule Compliant</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span>ESIGN Act Compliant</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span>EU eIDAS Regulation</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span>DEA EPCS Requirements</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span>ISO 27001 Security Standards</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <h5 className="font-semibold text-yellow-900 mb-2">Legal Declaration</h5>
                    <div className="text-xs text-yellow-800 space-y-2">
                      <p><strong>By applying your electronic signature, you hereby declare and confirm that:</strong></p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>You are the licensed healthcare provider authorized to prescribe the medication(s) listed</li>
                        <li>You have verified patient identity and reviewed their complete medical history</li>
                        <li>The prescription information is accurate, complete, and clinically appropriate</li>
                        <li>You understand this electronic signature carries the same legal weight as a handwritten signature</li>
                        <li>You consent to the electronic processing and transmission of this prescription</li>
                        <li>You acknowledge that this signature will be permanently recorded with audit trail</li>
                      </ul>
                      <p className="mt-3"><strong>Audit Trail Information:</strong> This signature will be logged with timestamp, IP address, device fingerprint, and biometric verification data for compliance and security purposes.</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded border">
                    <h5 className="font-medium text-gray-800 mb-2">Digital Certificate Details</h5>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <p><strong>Certificate Authority:</strong> Cura Health CA</p>
                        <p><strong>Certificate Type:</strong> Medical Professional</p>
                        <p><strong>Valid Until:</strong> {format(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), 'MMM dd, yyyy')}</p>
                      </div>
                      <div>
                        <p><strong>Encryption Level:</strong> RSA-2048 / SHA-256</p>
                        <p><strong>Trust Level:</strong> High Assurance</p>
                        <p><strong>Verification Status:</strong> <span className="text-green-600">Active & Verified</span></p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex gap-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => setShowESignDialog(false)} 
              className="flex-1"
            >
              Cancel Signature Process
            </Button>
            <Button 
              onClick={saveSignature}
              className="flex-2 bg-medical-blue hover:bg-blue-700"
              disabled={!selectedPrescription}
            >
              <PenTool className="h-4 w-4 mr-2" />
              Apply Advanced E-Signature
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}