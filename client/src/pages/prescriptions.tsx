import { useState, useEffect } from "react";
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
  Clock, 
  User, 
  Calendar,
  FileText,
  Printer,
  Send,
  Eye,
  Edit,
  Trash2
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
  status: 'active' | 'completed' | 'cancelled' | 'pending';
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
  const [patients, setPatients] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const queryClient = useQueryClient();

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
      setProviders(data || []);
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
    queryKey: ["/api/prescriptions", Date.now()], // Force fresh data
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'X-Tenant-Subdomain': 'demo',
        'Cache-Control': 'no-cache'
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
      console.log("🔍 RAW PRESCRIPTIONS DATA:", data);
      return data;
    },
    enabled: true,
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache
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

  console.log("🔍 PROCESSED PRESCRIPTIONS:", prescriptions);
  console.log("🔍 PRESCRIPTIONS LENGTH:", prescriptions.length);



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
    mutationFn: async ({ prescriptionId, pharmacyData }: { prescriptionId: string, pharmacyData: any }) => {
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Tenant-Subdomain': 'demo'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`/api/prescriptions/${prescriptionId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ pharmacy: pharmacyData }),
        credentials: "include",
      });
      if (!response.ok) throw new Error('Failed to send prescription to pharmacy');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Prescription sent to pharmacy successfully",
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
                  <h3 className="text-lg font-medium text-gray-600 mb-2">No prescriptions found</h3>
                  <p className="text-gray-600">Try adjusting your search terms or filters</p>
                </CardContent>
              </Card>
            ) : (
              filteredPrescriptions.map((prescription) => (
                <Card key={prescription.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <h3 className="text-lg font-semibold">{prescription.patientName}</h3>
                          <Badge className={getStatusColor(prescription.status)}>
                            {prescription.status}
                          </Badge>
                          {prescription.interactions && prescription.interactions.length > 0 && (
                            <Badge variant="destructive" className="flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Drug Interactions
                            </Badge>
                          )}
                        </div>
                        
                        <div className="space-y-2 mb-4">
                          <p className="text-sm text-gray-600">
                            <strong>Diagnosis:</strong> {prescription.diagnosis}
                          </p>
                          <p className="text-sm text-gray-600">
                            <strong>Prescribed by:</strong> {prescription.providerName}
                          </p>
                          <p className="text-sm text-gray-600">
                            <strong>Date:</strong> {format(new Date(prescription.prescribedAt), 'MMM dd, yyyy HH:mm')}
                          </p>
                          {prescription.pharmacy && (
                            <p className="text-sm text-gray-600">
                              <strong>Pharmacy:</strong> {prescription.pharmacy.name}
                            </p>
                          )}
                        </div>
                        
                        <div className="space-y-3">
                          <h4 className="font-medium">Medications:</h4>
                          {prescription.medications.map((medication: any, index: number) => (
                            <div key={index} className="bg-gray-50 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium">{medication.name}</span>
                                <span className="text-sm text-gray-600">{medication.dosage}</span>
                              </div>
                              <div className="text-sm text-gray-600 space-y-1">
                                <p><strong>Frequency:</strong> {medication.frequency}</p>
                                <p><strong>Duration:</strong> {medication.duration}</p>
                                <p><strong>Quantity:</strong> {medication.quantity} | <strong>Refills:</strong> {medication.refills}</p>
                                {medication.instructions && (
                                  <p><strong>Instructions:</strong> {medication.instructions}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {prescription.interactions && prescription.interactions.length > 0 && (
                          <div className="mt-4">
                            <h4 className="font-medium text-red-800 mb-2">Drug Interactions:</h4>
                            <div className="space-y-2">
                              {prescription.interactions.map((interaction: any, index: number) => (
                                <div key={index} className="flex items-start gap-2 p-2 bg-red-50 rounded-lg">
                                  <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                                  <div>
                                    <Badge className={getSeverityColor(interaction.severity)}>
                                      {interaction.severity}
                                    </Badge>
                                    <p className="text-sm text-red-800 mt-1">{interaction.description}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-1 sm:gap-2 lg:ml-4">
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
                  </CardContent>
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
            <DialogTitle>Send Prescription to Pharmacy</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pharmacyName">Pharmacy Name</Label>
              <Input
                id="pharmacyName"
                placeholder="Enter pharmacy name"
                defaultValue="HealthPlus Pharmacy"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pharmacyAddress">Address</Label>
              <Input
                id="pharmacyAddress"
                placeholder="Pharmacy address"
                defaultValue="123 High Street, London SW1A 1AA"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pharmacyPhone">Phone</Label>
              <Input
                id="pharmacyPhone"
                placeholder="Phone number"
                defaultValue="020 7946 0958"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pharmacyFax">Fax (Optional)</Label>
              <Input
                id="pharmacyFax"
                placeholder="Fax number"
                defaultValue="020 7946 0959"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pharmacyNPI">NPI Number (Optional)</Label>
              <Input
                id="pharmacyNPI"
                placeholder="NPI number"
                defaultValue="1234567890"
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowPharmacyDialog(false)} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  const pharmacyData = {
                    name: (document.getElementById('pharmacyName') as HTMLInputElement)?.value || "HealthPlus Pharmacy",
                    address: (document.getElementById('pharmacyAddress') as HTMLInputElement)?.value || "123 High Street, London SW1A 1AA",
                    phone: (document.getElementById('pharmacyPhone') as HTMLInputElement)?.value || "020 7946 0958",
                    fax: (document.getElementById('pharmacyFax') as HTMLInputElement)?.value || "020 7946 0959",
                    npi: (document.getElementById('pharmacyNPI') as HTMLInputElement)?.value || "1234567890"
                  };
                  sendToPharmacyMutation.mutate({ 
                    prescriptionId: selectedPrescriptionId, 
                    pharmacyData 
                  });
                }}
                disabled={sendToPharmacyMutation.isPending}
                className="flex-1 bg-medical-blue hover:bg-blue-700"
              >
                {sendToPharmacyMutation.isPending ? "Sending..." : "Send to Pharmacy"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}