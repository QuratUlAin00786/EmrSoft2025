import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();

  const { data: prescriptions = mockPrescriptions, isLoading } = useQuery({
    queryKey: ["/api/prescriptions", statusFilter],
    enabled: true,
  });

  const createPrescriptionMutation = useMutation({
    mutationFn: async (prescriptionData: any) => {
      const response = await fetch("/api/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prescriptionData),
      });
      if (!response.ok) throw new Error("Failed to create prescription");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prescriptions"] });
      setShowNewPrescription(false);
    },
  });

  const handleCreatePrescription = () => {
    setShowNewPrescription(true);
  };

  const handleViewPrescription = (prescription: Prescription) => {
    setSelectedPrescription(prescription);
  };

  const handlePrintPrescription = (prescriptionId: string) => {
    console.log('Printing prescription:', prescriptionId);
  };

  const handleSendToPharmacy = (prescriptionId: string) => {
    console.log('Sending to pharmacy:', prescriptionId);
  };

  const handleEditPrescription = (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    setShowNewPrescription(true);
  };

  const handleCancelPrescription = (prescriptionId: string) => {
    if (window.confirm('Are you sure you want to cancel this prescription?')) {
      console.log('Cancelling prescription:', prescriptionId);
    }
  };

  const filteredPrescriptions = prescriptions.filter(prescription => {
    const matchesSearch = !searchQuery || 
      prescription.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prescription.medications.some(med => med.name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || prescription.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });



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
      
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Prescriptions</p>
                    <p className="text-2xl font-bold">{filteredPrescriptions.filter(p => p.status === 'active').length}</p>
                  </div>
                  <Pill className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending Approval</p>
                    <p className="text-2xl font-bold">{filteredPrescriptions.filter(p => p.status === 'pending').length}</p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Drug Interactions</p>
                    <p className="text-2xl font-bold">
                      {filteredPrescriptions.filter(p => p.interactions && p.interactions.length > 0).length}
                    </p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Prescriptions</p>
                    <p className="text-2xl font-bold">{filteredPrescriptions.length}</p>
                  </div>
                  <FileText className="h-8 w-8 text-blue-600" />
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
                    <Button className="bg-medical-blue hover:bg-blue-700">
                      <Plus className="h-4 w-4 mr-2" />
                      New Prescription
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Create New Prescription</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="patient">Patient</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select patient" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="p_001">Sarah Johnson</SelectItem>
                              <SelectItem value="p_002">Robert Davis</SelectItem>
                              <SelectItem value="p_003">Emily Watson</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="diagnosis">Diagnosis</Label>
                          <Input placeholder="Enter diagnosis" />
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <Label>Medications</Label>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="medication">Medication Name</Label>
                            <Input placeholder="Enter medication" />
                          </div>
                          <div>
                            <Label htmlFor="dosage">Dosage</Label>
                            <Input placeholder="e.g., 10mg" />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="frequency">Frequency</Label>
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder="Select frequency" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="once">Once daily</SelectItem>
                                <SelectItem value="twice">Twice daily</SelectItem>
                                <SelectItem value="three">Three times daily</SelectItem>
                                <SelectItem value="four">Four times daily</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="quantity">Quantity</Label>
                            <Input type="number" placeholder="30" />
                          </div>
                          <div>
                            <Label htmlFor="refills">Refills</Label>
                            <Input type="number" placeholder="3" />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="instructions">Instructions</Label>
                          <Textarea placeholder="Special instructions for patient" />
                        </div>
                      </div>
                      
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowNewPrescription(false)}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={() => {
                            createPrescriptionMutation.mutate({
                              patientId: "p_001", // This should be from form
                              diagnosis: "Sample Diagnosis",
                              medications: []
                            });
                          }}
                          disabled={createPrescriptionMutation.isPending}
                        >
                          {createPrescriptionMutation.isPending ? "Creating..." : "Create Prescription"}
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
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
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
                          {prescription.medications.map((medication, index) => (
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
                              {prescription.interactions.map((interaction, index) => (
                                <div key={index} className="flex items-start gap-2 p-2 bg-red-50 rounded-lg">
                                  <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                                  <div>
                                    <Badge className={getSeverityColor(interaction.severity)} size="sm">
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
                      
                      <div className="flex gap-2 ml-4">
                        <Button variant="outline" size="sm" onClick={() => handleViewPrescription(prescription)}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handlePrintPrescription(prescription.id)}>
                          <Printer className="h-4 w-4 mr-1" />
                          Print
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleSendToPharmacy(prescription.id)}>
                          <Send className="h-4 w-4 mr-1" />
                          Send to Pharmacy
                        </Button>
                        {prescription.status === 'active' && (
                          <Button variant="outline" size="sm" onClick={() => handleEditPrescription(prescription)}>
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}