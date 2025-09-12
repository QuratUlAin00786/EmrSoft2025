import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Header } from "@/components/layout/header";

// Medical Specialties Data Structure
const medicalSpecialties = {
  "General & Primary Care": {
    "General Practitioner (GP) / Family Physician": ["Common illnesses", "Preventive care"],
    "Internal Medicine Specialist": ["Adult health", "Chronic diseases (diabetes, hypertension)"]
  },
  "Surgical Specialties": {
    "General Surgeon": [
      "Abdominal Surgery",
      "Hernia Repair", 
      "Gallbladder & Appendix Surgery",
      "Colorectal Surgery",
      "Breast Surgery",
      "Endocrine Surgery (thyroid, parathyroid, adrenal)",
      "Trauma & Emergency Surgery"
    ],
    "Orthopedic Surgeon": [
      "Joint Replacement (hip, knee, shoulder)",
      "Spine Surgery",
      "Sports Orthopedics (ACL tears, ligament reconstruction)",
      "Pediatric Orthopedics",
      "Arthroscopy (keyhole joint surgery)",
      "Trauma & Fracture Care"
    ],
    "Neurosurgeon": [
      "Brain Tumor Surgery",
      "Spinal Surgery", 
      "Cerebrovascular Surgery (stroke, aneurysm)",
      "Pediatric Neurosurgery",
      "Functional Neurosurgery (Parkinson's, epilepsy, DBS)",
      "Trauma Neurosurgery"
    ]
  },
  "Heart & Circulation": {
    "Cardiologist": ["Heart diseases", "ECG", "Angiography"],
    "Vascular Surgeon": ["Arteries", "Veins", "Blood vessels"]
  },
  "Women's Health": {
    "Gynecologist": ["Female reproductive system"],
    "Obstetrician": ["Pregnancy & childbirth"],
    "Fertility Specialist (IVF Expert)": ["Infertility treatment"]
  },
  "Children's Health": {
    "Pediatrician": ["General child health"],
    "Pediatric Surgeon": ["Infant & child surgeries"],
    "Neonatologist": ["Newborn intensive care"]
  },
  "Brain & Nervous System": {
    "Neurologist": ["Stroke", "Epilepsy", "Parkinson's"],
    "Psychiatrist": ["Mental health (depression, anxiety)"],
    "Psychologist (Clinical)": ["Therapy & counseling"]
  },
  "Digestive System": {
    "Gastroenterologist": ["Stomach", "Intestines"],
    "Hepatologist": ["Liver specialist"],
    "Colorectal Surgeon": ["Colon", "Rectum", "Anus"]
  },
  "Others": {
    "Geriatrician": ["Elderly care"],
    "Pathologist": ["Lab & diagnostic testing"],
    "Radiologist": ["Imaging (X-ray, CT, MRI)"],
    "Anesthesiologist": ["Pain & anesthesia"],
    "Emergency Medicine Specialist": ["Accidents", "Trauma"]
  }
};
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Search, 
  Plus, 
  Eye, 
  Download, 
  User, 
  Clock, 
  AlertTriangle, 
  Check, 
  FileText,
  TrendingUp,
  TrendingDown,
  Minus,
  Trash2,
  FileText as Prescription,
  Printer
} from "lucide-react";

interface DatabaseLabResult {
  id: number;
  organizationId: number;
  patientId: number;
  testId: string;
  testType: string;
  orderedBy: number;
  doctorName?: string;
  mainSpecialty?: string;
  subSpecialty?: string;
  priority?: string;
  orderedAt: string;
  collectedAt?: string;
  completedAt?: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  results: Array<{
    name: string;
    value: string;
    unit: string;
    referenceRange: string;
    status: "normal" | "abnormal_high" | "abnormal_low" | "critical";
    flag?: string;
  }>;
  criticalValues: boolean;
  notes?: string;
  createdAt: string;
  // Enhanced doctor details (legacy fields)
  doctorFirstName?: string;
  doctorLastName?: string;
  doctorEmail?: string;
  doctorRole?: string;
  doctorDepartment?: string;
  doctorWorkingDays?: string[];
  doctorWorkingHours?: {
    start?: string;
    end?: string;
  };
  doctorPermissions?: any;
}

interface User {
  id: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
}

// Database-driven lab results - no more mock data

export default function LabResultsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showPrescriptionDialog, setShowPrescriptionDialog] = useState(false);
  const [selectedResult, setSelectedResult] = useState<DatabaseLabResult | null>(null);
  
  // Doctor specialty states for lab order
  const [selectedSpecialtyCategory, setSelectedSpecialtyCategory] = useState<string>("");
  const [selectedSubSpecialty, setSelectedSubSpecialty] = useState<string>("");
  const [selectedSpecificArea, setSelectedSpecificArea] = useState<string>("");
  const [shareFormData, setShareFormData] = useState({
    method: "",
    email: "",
    whatsapp: "",
    message: ""
  });
  const [orderFormData, setOrderFormData] = useState({
    patientId: "",
    patientName: "",
    testType: "",
    priority: "routine",
    notes: "",
    doctorId: "",
    doctorName: "",
    mainSpecialty: "",
    subSpecialty: ""
  });

  const { data: labResults = [], isLoading } = useQuery({
    queryKey: ["/api/lab-results"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/lab-results");
      return await response.json();
    }
  });

  // Real API data fetching for patients
  const { data: patients = [], isLoading: patientsLoading } = useQuery({
    queryKey: ["/api/patients"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/patients");
      const data = await response.json();
      return data;
    }
  });

  // Fetch medical staff for doctor selection
  const { data: medicalStaffData, isLoading: medicalStaffLoading } = useQuery({
    queryKey: ["/api/medical-staff"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/medical-staff");
      const data = await response.json();
      return data;
    }
  });

  const doctors = medicalStaffData?.staff?.filter((staff: any) => staff.role === 'doctor') || [];


  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users");
      return res.json();
    }
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createLabOrderMutation = useMutation({
    mutationFn: async (labOrderData: any) => {
      return await apiRequest("POST", "/api/lab-results", labOrderData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Lab test ordered successfully",
      });
      setShowOrderDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/lab-results"] });
      setOrderFormData({
        patientId: "",
        patientName: "",
        testType: "",
        priority: "routine",
        notes: "",
        doctorId: "",
        doctorName: "",
        mainSpecialty: "",
        subSpecialty: ""
      });
      
      // Reset specialty states
      setSelectedSpecialtyCategory("");
      setSelectedSubSpecialty("");
      setSelectedSpecificArea("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create lab order",
        variant: "destructive",
      });
    },
  });

  const deleteLabResultMutation = useMutation({
    mutationFn: async (resultId: number) => {
      return await apiRequest("DELETE", `/api/lab-results/${resultId.toString()}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Lab result deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/lab-results"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete lab result",
        variant: "destructive",
      });
    },
  });

  const handleOrderTest = () => {
    setShowOrderDialog(true);
  };

  const handleViewResult = (result: DatabaseLabResult) => {
    console.log("handleViewResult called with:", result);
    setSelectedResult(result);
    setShowViewDialog(true);
    console.log("showViewDialog set to true");
  };

  const handleDownloadResult = async (resultId: number | string) => {
    const result = Array.isArray(labResults) ? labResults.find((r: any) => r.id.toString() === resultId.toString()) : null;
    if (result) {
      const patientName = getPatientName(result.patientId);
      
      try {
        // Fetch prescriptions for this patient
        const response = await apiRequest("GET", `/api/prescriptions/patient/${result.patientId.toString()}`);
        const prescriptions = await response.json();
        
        toast({
          title: "Download Report",
          description: `Prescription report for ${patientName} downloaded successfully`,
        });
        
        // Create prescription document content
        let prescriptionsText = '';
        if (prescriptions && prescriptions.length > 0) {
          prescriptionsText = prescriptions.map((prescription: any) => {
            const medications = prescription.medications || [];
            const medicationsText = medications.length > 0 
              ? medications.map((med: any) => 
                  `  - ${med.name}: ${med.dosage}, ${med.frequency}, Duration: ${med.duration}\n    Instructions: ${med.instructions}\n    Quantity: ${med.quantity}, Refills: ${med.refills}`
                ).join('\n')
              : `  - ${prescription.medicationName}: ${prescription.dosage || 'N/A'}, ${prescription.frequency || 'N/A'}\n    Instructions: ${prescription.instructions || 'N/A'}`;
            
            return `Prescription #${prescription.prescriptionNumber || prescription.id}
Issued: ${new Date(prescription.issuedDate || prescription.createdAt).toLocaleDateString()}
Status: ${prescription.status}
Diagnosis: ${prescription.diagnosis || 'N/A'}

Medications:
${medicationsText}

Notes: ${prescription.notes || 'No additional notes'}
-------------------------------------------`;
          }).join('\n\n');
        } else {
          prescriptionsText = 'No prescriptions found for this patient.';
        }
        
        // Create and download the prescription document
        const documentContent = `PRESCRIPTION REPORT

Patient: ${patientName}
Patient ID: ${result.patientId}
Report Date: ${new Date().toLocaleDateString()}

===========================================

${prescriptionsText}

===========================================
Report generated from Cura EMR System`;
        
        const blob = new Blob([documentContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `prescriptions-${patientName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
      } catch (error) {
        console.error('Error fetching prescriptions:', error);
        toast({
          title: "Error",
          description: "Failed to fetch prescriptions for this patient",
          variant: "destructive",
        });
      }
    }
  };

  const handleShareResult = (result: DatabaseLabResult) => {
    setSelectedResult(result);
    setShowReviewDialog(true);
  };

  const handleGeneratePrescription = (result: DatabaseLabResult) => {
    setSelectedResult(result);
    setShowPrescriptionDialog(true);
  };

  const handlePrintPrescription = () => {
    window.print();
  };

  // Get doctor specialization from department or permissions
  const getDoctorSpecialization = (result: DatabaseLabResult) => {
    if (result.doctorDepartment) {
      // Map department to specialty format
      const specialtyMapping: { [key: string]: string } = {
        'Cardiology': 'Cardiologist',
        'Cardialogy': 'Cardiologist', // Handle typo
        'Neurology': 'Neurologist',
        'Pediatrics': 'Pediatrician',
        'Orthopedics': 'Orthopedic Surgeon',
        'Dermatology': 'Dermatologist',
        'Radiology': 'Radiologist',
        'Pathology': 'Pathologist',
        'Emergency': 'Emergency Medicine Specialist',
        'Internal Medicine': 'Internal Medicine Specialist',
        'Surgery': 'General Surgeon'
      };
      return specialtyMapping[result.doctorDepartment] || result.doctorDepartment;
    }
    return 'Medical Doctor';
  };

  const handleFlagCritical = (resultId: string) => {
    const result = Array.isArray(labResults) ? labResults.find((r: any) => r.id === resultId) : null;
    if (result) {
      toast({
        title: "Critical Value Flagged",
        description: `Critical alert created for ${getPatientName(result.patientId)}`,
        variant: "destructive",
      });
      // In a real implementation, this would create alerts and notifications
    }
  };

  // Helper function to get patient name from patient ID
  const getPatientName = (patientId: number) => {
    const patient = Array.isArray(patients) && patients ? patients.find((p: any) => p?.id === patientId) : null;
    return patient && patient.firstName && patient.lastName ? `${patient.firstName} ${patient.lastName}` : `Patient #${patientId}`;
  };

  // Helper function to get user name from user ID  
  const getUserName = (userId: number) => {
    if (!Array.isArray(users) || !users) return `User #${userId}`;
    const user = users.find((u: any) => u && u.id === userId);
    if (!user) return `User #${userId}`;
    const firstName = user?.firstName ?? '';
    const lastName = user?.lastName ?? '';
    if (!firstName || !lastName) return `User #${userId}`;
    return `${firstName} ${lastName}`;
  };

  const filteredResults = Array.isArray(labResults) ? labResults.filter((result: DatabaseLabResult) => {
    const patientName = getPatientName(result.patientId);
    const matchesSearch = !searchQuery || 
      patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      result.testType.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || result.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) : [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'collected': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getResultStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'bg-green-100 text-green-800';
      case 'abnormal_high': return 'bg-orange-100 text-orange-800';
      case 'abnormal_low': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <>
        <Header title="Lab Results" subtitle="View and manage laboratory test results" />
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
        title="Lab Results" 
        subtitle="View and manage laboratory test results"
      />
      
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending Results</p>
                    <p className="text-2xl font-bold">{filteredResults.filter(r => r.status === 'pending').length}</p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Critical Values</p>
                    <p className="text-2xl font-bold">{filteredResults.filter(r => r.notes?.toLowerCase().includes('critical') || r.value?.toLowerCase().includes('high')).length}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Completed Today</p>
                    <p className="text-2xl font-bold">
                      {filteredResults.filter(r => r.status === 'completed' && 
                        new Date(r.createdAt || '').toDateString() === new Date().toDateString()).length}
                    </p>
                  </div>
                  <Check className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Results</p>
                    <p className="text-2xl font-bold">{filteredResults.length}</p>
                  </div>
                  <FileText className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search lab results..."
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
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="collected">Collected</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button onClick={handleOrderTest} className="bg-medical-blue hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Order Lab Test
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Lab Results List */}
          <div className="space-y-4">
            {filteredResults.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">No lab results found</h3>
                  <p className="text-gray-600">Try adjusting your search terms or filters</p>
                </CardContent>
              </Card>
            ) : (
              filteredResults.map((result) => (
                <Card key={result.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-lg font-semibold">{getPatientName(result.patientId)}</h3>
                          <Badge className={getStatusColor(result.status)}>
                            {result.status}
                          </Badge>
                          {result.criticalValues && (
                            <Badge variant="destructive" className="flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Critical
                            </Badge>
                          )}
                        </div>
                        
                        <div className="space-y-2 mb-4">
                          <p className="text-sm text-gray-600">
                            <strong>Test:</strong> {result.testType}
                          </p>
                          <p className="text-sm text-gray-600">
                            <strong>Test ID:</strong> {result.testId}
                          </p>
                          
                          {/* Doctor Information Display */}
                          <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-blue-600" />
                              <div className="space-y-1">
                                <p className="font-medium text-gray-900 dark:text-gray-100">
                                  {result.doctorName || `Dr. ${result.doctorFirstName || 'Unknown'} ${result.doctorLastName || 'Doctor'}`}
                                </p>
                                {result.mainSpecialty && (
                                  <p className="text-xs text-blue-700 dark:text-blue-300">
                                    <strong>Main Specialization:</strong> {result.mainSpecialty}
                                  </p>
                                )}
                                {result.subSpecialty && (
                                  <p className="text-xs text-blue-700 dark:text-blue-300">
                                    <strong>Sub-Specialization:</strong> {result.subSpecialty}
                                  </p>
                                )}
                                {result.priority && (
                                  <p className="text-xs text-green-700 dark:text-green-300">
                                    <strong>Priority:</strong> {result.priority}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <p className="text-sm text-gray-600">
                            <strong>Ordered:</strong> {format(new Date(result.orderedAt), 'MMM dd, yyyy HH:mm')}
                          </p>
                          {result.completedAt && (
                            <p className="text-sm text-gray-600">
                              <strong>Completed:</strong> {format(new Date(result.completedAt), 'MMM dd, yyyy HH:mm')}
                            </p>
                          )}
                        </div>
                        
                        {result.results && result.results.length > 0 && (
                          <div className="mt-4">
                            <h4 className="font-medium mb-2">Test Results:</h4>
                            <div className="space-y-2">
                              {result.results.map((testResult: any, index: number) => (
                                <div key={index} className="p-3 rounded-lg border bg-blue-50 border-blue-200">
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium">{testResult.name}</span>
                                    <Badge className={getStatusColor(testResult.status)}>
                                      {testResult.status}
                                    </Badge>
                                  </div>
                                  <div className="text-sm text-gray-600 mt-1">
                                    <span className="font-medium">{testResult.value} {testResult.unit}</span>
                                    <span className="ml-2">Ref: {testResult.referenceRange}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {result.notes && (
                          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <h4 className="font-medium text-blue-800 mb-1">Notes</h4>
                            <p className="text-sm text-blue-700">{result.notes}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <Button variant="outline" size="sm" onClick={() => handleViewResult(result)}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleGeneratePrescription(result)}
                          className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                        >
                          <Prescription className="h-4 w-4 mr-1" />
                          Generate Prescription
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDownloadResult(result.id)}>
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleShareResult(result)}>
                          <User className="h-4 w-4 mr-1" />
                          Review
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => deleteLabResultMutation.mutate(result.id)}
                          disabled={deleteLabResultMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
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

      {/* Order Lab Test Dialog */}
      <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Order Lab Test</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="patient">Select Patient</Label>
              <Select 
                value={orderFormData.patientId} 
                onValueChange={(value) => {
                  const selectedPatient = Array.isArray(patients) ? patients.find((p: any) => p.id.toString() === value) : null;
                  setOrderFormData(prev => ({ 
                    ...prev, 
                    patientId: value,
                    patientName: selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : ''
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a patient" />
                </SelectTrigger>
                <SelectContent>
                  {patientsLoading ? (
                    <SelectItem value="loading" disabled>Loading patients...</SelectItem>
                  ) : patients && Array.isArray(patients) && patients.length > 0 ? (
                    patients.map((patient: any) => (
                      <SelectItem key={patient.id} value={patient.id.toString()}>
                        {`${patient.firstName} ${patient.lastName} (${patient.patientId})`}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>No patients available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="doctor">Select Doctor</Label>
              <Select 
                value={orderFormData.doctorId} 
                onValueChange={(value) => {
                  const selectedDoctor = doctors.find((d: any) => d.id.toString() === value);
                  setOrderFormData(prev => ({ 
                    ...prev, 
                    doctorId: value,
                    doctorName: selectedDoctor ? `Dr. ${selectedDoctor.firstName} ${selectedDoctor.lastName}` : ''
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a doctor" />
                </SelectTrigger>
                <SelectContent>
                  {medicalStaffLoading ? (
                    <SelectItem value="loading" disabled>Loading doctors...</SelectItem>
                  ) : doctors.length > 0 ? (
                    doctors.filter((doctor: any) => doctor.role !== 'admin').map((doctor: any) => (
                      <SelectItem key={doctor.id} value={doctor.id.toString()}>
                        Dr. {doctor.firstName} {doctor.lastName}
                        {doctor.department && ` - ${doctor.department}`}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>No doctors available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="mainSpecialty">Main Specialization</Label>
              <Select 
                value={selectedSpecialtyCategory}
                onValueChange={(value) => {
                  setSelectedSpecialtyCategory(value);
                  setSelectedSubSpecialty("");
                  setSelectedSpecificArea("");
                  setOrderFormData(prev => ({ ...prev, mainSpecialty: value, subSpecialty: "" }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select main specialization" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(medicalSpecialties).map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedSpecialtyCategory && (
              <div className="space-y-2">
                <Label htmlFor="subSpecialty">Sub-Specialization</Label>
                <Select 
                  value={selectedSubSpecialty}
                  onValueChange={(value) => {
                    setSelectedSubSpecialty(value);
                    setSelectedSpecificArea("");
                    setOrderFormData(prev => ({ ...prev, subSpecialty: value }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select sub-specialization" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(medicalSpecialties[selectedSpecialtyCategory as keyof typeof medicalSpecialties] || {}).map((subSpecialty) => (
                      <SelectItem key={subSpecialty} value={subSpecialty}>
                        {subSpecialty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="testType">Test Type</Label>
              <Select value={orderFormData.testType} onValueChange={(value) => setOrderFormData(prev => ({ ...prev, testType: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select test type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Complete Blood Count (CBC)">Complete Blood Count (CBC)</SelectItem>
                  <SelectItem value="Basic Metabolic Panel">Basic Metabolic Panel</SelectItem>
                  <SelectItem value="Comprehensive Metabolic Panel">Comprehensive Metabolic Panel</SelectItem>
                  <SelectItem value="Lipid Panel">Lipid Panel</SelectItem>
                  <SelectItem value="Liver Function Tests">Liver Function Tests</SelectItem>
                  <SelectItem value="Thyroid Function Tests">Thyroid Function Tests</SelectItem>
                  <SelectItem value="Hemoglobin A1C">Hemoglobin A1C</SelectItem>
                  <SelectItem value="Urinalysis">Urinalysis</SelectItem>
                  <SelectItem value="Vitamin D">Vitamin D</SelectItem>
                  <SelectItem value="Iron Studies">Iron Studies</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={orderFormData.priority} onValueChange={(value) => setOrderFormData(prev => ({ ...prev, priority: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="routine">Routine</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="stat">STAT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Clinical Notes</Label>
              <Textarea
                id="notes"
                placeholder="Enter clinical notes or special instructions"
                value={orderFormData.notes}
                onChange={(e) => setOrderFormData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowOrderDialog(false)} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  createLabOrderMutation.mutate({
                    patientId: parseInt(orderFormData.patientId),
                    testType: orderFormData.testType,
                    priority: orderFormData.priority,
                    notes: orderFormData.notes,
                    doctorId: orderFormData.doctorId ? parseInt(orderFormData.doctorId) : null,
                    doctorName: orderFormData.doctorName,
                    mainSpecialty: orderFormData.mainSpecialty,
                    subSpecialty: orderFormData.subSpecialty
                  });
                }}
                disabled={createLabOrderMutation.isPending || !orderFormData.patientId || !orderFormData.testType || !orderFormData.doctorId}
                className="flex-1 bg-medical-blue hover:bg-blue-700"
              >
                {createLabOrderMutation.isPending ? "Ordering..." : "Order Test"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Lab Result Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lab Result Details</DialogTitle>
          </DialogHeader>
          {selectedResult && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Patient</Label>
                  <p className="text-lg font-semibold">{getPatientName(selectedResult.patientId)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Patient ID</Label>
                  <p className="text-lg">{selectedResult.patientId}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Test Type</Label>
                  <p className="text-lg">{selectedResult.testType}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Status</Label>
                  <Badge 
                    variant={
                      selectedResult.status === 'completed' ? 'default' : 
                      selectedResult.status === 'pending' ? 'secondary' : 
                      selectedResult.status === 'processing' ? 'outline' : 'destructive'
                    }
                  >
                    {selectedResult.status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Ordered By</Label>
                  <p className="text-lg">{getUserName(selectedResult.orderedBy)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Ordered Date</Label>
                  <p className="text-lg">{format(new Date(selectedResult.orderedAt), "PPP")}</p>
                </div>
                {selectedResult.collectedAt && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Collected Date</Label>
                    <p className="text-lg">{format(new Date(selectedResult.collectedAt), "PPP")}</p>
                  </div>
                )}
                {selectedResult.completedAt && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Completed Date</Label>
                    <p className="text-lg">{format(new Date(selectedResult.completedAt), "PPP")}</p>
                  </div>
                )}
              </div>

              {selectedResult.results && selectedResult.results.length > 0 && (
                <div>
                  <Label className="text-lg font-semibold mb-4 block">Test Results</Label>
                  <div className="space-y-3">
                    {selectedResult.results.map((result: any, index: number) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <p className="font-medium">{result.name}</p>
                            <p className="text-sm text-gray-600">Reference Range: {result.referenceRange}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-semibold">{result.value} {result.unit}</p>
                            <Badge 
                              variant={
                                result.status === 'normal' ? 'default' : 
                                result.status === 'abnormal_high' || result.status === 'abnormal_low' ? 'secondary' : 
                                'destructive'
                              }
                              className="ml-2"
                            >
                              {result.status.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                        {result.flag && (
                          <p className="text-sm text-yellow-600 mt-2">⚠️ {result.flag}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedResult.notes && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Clinical Notes</Label>
                  <p className="text-sm mt-1 p-3 bg-gray-50 rounded-md">{selectedResult.notes}</p>
                </div>
              )}

              {selectedResult.criticalValues && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 font-medium">⚠️ Critical Values Alert</p>
                  <p className="text-red-600 text-sm">This result contains critical values that require immediate attention.</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowViewDialog(false)}>
                  Close
                </Button>
                <Button onClick={() => handleDownloadResult(selectedResult.id)} className="bg-medical-blue hover:bg-blue-700">
                  Download Report
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Review Lab Result Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review & Share Lab Results</DialogTitle>
          </DialogHeader>
          {selectedResult && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">{getPatientName(selectedResult.patientId).charAt(0)}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{getPatientName(selectedResult.patientId)}</h3>
                    <p className="text-sm text-gray-600">Patient ID: {selectedResult.patientId}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Test Information</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Test Type:</span>
                      <span className="font-medium">{selectedResult.testType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ordered By:</span>
                      <span className="font-medium">{selectedResult.orderedBy}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <Badge 
                        variant={
                          selectedResult.status === 'completed' ? 'default' : 
                          selectedResult.status === 'pending' ? 'secondary' : 'outline'
                        }
                      >
                        {selectedResult.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Completed:</span>
                      <span className="font-medium">
                        {selectedResult.completedAt ? format(new Date(selectedResult.completedAt), "PPP") : "Not completed"}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Clinical Review</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="reviewed" className="rounded" />
                      <Label htmlFor="reviewed" className="text-sm">Results reviewed by physician</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="interpreted" className="rounded" />
                      <Label htmlFor="interpreted" className="text-sm">Clinical interpretation complete</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="actions" className="rounded" />
                      <Label htmlFor="actions" className="text-sm">Follow-up actions identified</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="approved" className="rounded" />
                      <Label htmlFor="approved" className="text-sm">Approved for patient sharing</Label>
                    </div>
                  </div>
                </div>
              </div>

              {selectedResult.results && selectedResult.results.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Test Results Summary</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedResult.results.slice(0, 4).map((result: any, index: number) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-sm">{result.name}</span>
                          <Badge 
                            variant={result.status === 'normal' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {result.status}
                          </Badge>
                        </div>
                        <div className="text-lg font-semibold mt-1">{result.value} {result.unit}</div>
                        <div className="text-xs text-gray-600">Ref: {result.referenceRange}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="physicianNotes" className="text-sm font-medium">Physician Notes</Label>
                <Textarea
                  id="physicianNotes"
                  placeholder="Add clinical interpretation, recommendations, or follow-up instructions..."
                  className="mt-2"
                  rows={3}
                />
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
                    Cancel
                  </Button>
                  <Button variant="outline" onClick={() => handleDownloadResult(selectedResult.id)}>
                    Download Report
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => {
                      setShowReviewDialog(false);
                      setShowShareDialog(true);
                      setShareFormData({
                        method: "",
                        email: "",
                        whatsapp: "",
                        message: `Lab results for ${selectedResult.testType} are now available for review.`
                      });
                    }}
                    className="bg-medical-blue hover:bg-blue-700"
                  >
                    Share with Patient
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Share with Patient Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share Lab Results</DialogTitle>
          </DialogHeader>
          {selectedResult && (
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                Share results for <strong>{getPatientName(selectedResult.patientId)}</strong>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">Contact Method</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="email"
                      name="method"
                      value="email"
                      checked={shareFormData.method === "email"}
                      onChange={(e) => setShareFormData(prev => ({ ...prev, method: e.target.value }))}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="email" className="text-sm">Email</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="whatsapp"
                      name="method"
                      value="whatsapp"
                      checked={shareFormData.method === "whatsapp"}
                      onChange={(e) => setShareFormData(prev => ({ ...prev, method: e.target.value }))}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="whatsapp" className="text-sm">WhatsApp</Label>
                  </div>
                </div>
              </div>

              {shareFormData.method === "email" && (
                <div className="space-y-2">
                  <Label htmlFor="emailAddress" className="text-sm font-medium">Email Address</Label>
                  <Input
                    id="emailAddress"
                    type="email"
                    placeholder="patient@example.com"
                    value={shareFormData.email}
                    onChange={(e) => setShareFormData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
              )}

              {shareFormData.method === "whatsapp" && (
                <div className="space-y-2">
                  <Label htmlFor="whatsappNumber" className="text-sm font-medium">WhatsApp Number</Label>
                  <Input
                    id="whatsappNumber"
                    type="tel"
                    placeholder="+44 7XXX XXXXXX"
                    value={shareFormData.whatsapp}
                    onChange={(e) => setShareFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="shareMessage" className="text-sm font-medium">Message</Label>
                <Textarea
                  id="shareMessage"
                  placeholder="Add a personal message..."
                  value={shareFormData.message}
                  onChange={(e) => setShareFormData(prev => ({ ...prev, message: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <Button variant="outline" onClick={() => setShowShareDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    const method = shareFormData.method === "email" ? "email" : "WhatsApp";
                    const contact = shareFormData.method === "email" ? shareFormData.email : shareFormData.whatsapp;
                    
                    toast({
                      title: "Results Shared",
                      description: `Lab results sent to ${getPatientName(selectedResult.patientId)} via ${method} (${contact})`,
                    });
                    setShowShareDialog(false);
                    setShareFormData({
                      method: "",
                      email: "",
                      whatsapp: "",
                      message: ""
                    });
                  }}
                  disabled={!shareFormData.method || 
                    (shareFormData.method === "email" && !shareFormData.email) ||
                    (shareFormData.method === "whatsapp" && !shareFormData.whatsapp)}
                  className="bg-medical-blue hover:bg-blue-700"
                >
                  Send Results
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Lab Result Prescription Dialog */}
      <Dialog open={showPrescriptionDialog} onOpenChange={setShowPrescriptionDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-xl font-bold">Lab Result Prescription</DialogTitle>
          </DialogHeader>
          
          {selectedResult && (
            <div className="prescription-content space-y-6 py-4" id="prescription-print">
              {/* Header */}
              <div className="text-center border-b pb-4">
                <h1 className="text-2xl font-bold text-medical-blue">CURA EMR SYSTEM</h1>
                <p className="text-sm text-gray-600">Laboratory Test Prescription</p>
              </div>

              {/* Doctor and Patient Information */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-800 border-b">Physician Information</h3>
                  <div className="space-y-1 text-sm">
                    <p><strong>Name:</strong> {selectedResult.doctorName || `Dr. ${selectedResult.doctorFirstName || 'Unknown'} ${selectedResult.doctorLastName || 'Doctor'}`}</p>
                    {selectedResult.mainSpecialty && (
                      <p><strong>Main Specialization:</strong> {selectedResult.mainSpecialty}</p>
                    )}
                    {selectedResult.subSpecialty && (
                      <p><strong>Sub-Specialization:</strong> {selectedResult.subSpecialty}</p>
                    )}
                    {selectedResult.priority && (
                      <p><strong>Priority:</strong> {selectedResult.priority}</p>
                    )}
                    {selectedResult.doctorEmail && (
                      <p><strong>Contact:</strong> {selectedResult.doctorEmail}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-800 border-b">Patient Information</h3>
                  <div className="space-y-1 text-sm">
                    <p><strong>Name:</strong> {getPatientName(selectedResult.patientId)}</p>
                    <p><strong>Patient ID:</strong> {selectedResult.patientId}</p>
                    <p><strong>Date:</strong> {format(new Date(), 'MMM dd, yyyy')}</p>
                    <p><strong>Time:</strong> {format(new Date(), 'HH:mm')}</p>
                  </div>
                </div>
              </div>

              {/* Prescription Details */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-800 text-lg border-b pb-2">℞ Laboratory Test Prescription</h3>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Test ID:</p>
                      <p className="font-mono text-blue-800">{selectedResult.testId}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Test Type:</p>
                      <p className="font-semibold text-blue-800">{selectedResult.testType}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Ordered Date:</p>
                      <p>{format(new Date(selectedResult.orderedAt), 'MMM dd, yyyy HH:mm')}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Status:</p>
                      <Badge className={getStatusColor(selectedResult.status)}>
                        {selectedResult.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>

                  {selectedResult.results && selectedResult.results.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700 mb-3">Test Results:</p>
                      <div className="space-y-2">
                        {selectedResult.results.map((testResult: any, index: number) => (
                          <div key={index} className="bg-white border rounded p-3">
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-medium text-gray-900">{testResult.name}</span>
                              <Badge className={getResultStatusColor(testResult.status)}>
                                {testResult.status.replace('_', ' ').toUpperCase()}
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-700">
                              <p><strong>Value:</strong> {testResult.value} {testResult.unit}</p>
                              <p><strong>Reference Range:</strong> {testResult.referenceRange}</p>
                              {testResult.flag && (
                                <p><strong>Flag:</strong> {testResult.flag}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedResult.notes && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm font-medium text-gray-700 mb-2">Clinical Notes:</p>
                      <p className="text-sm text-gray-800 bg-yellow-50 border-l-4 border-yellow-400 p-3">
                        {selectedResult.notes}
                      </p>
                    </div>
                  )}
                </div>

                {selectedResult.criticalValues && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                    <div className="flex items-center gap-2 text-red-800">
                      <AlertTriangle className="h-5 w-5" />
                      <span className="font-semibold">CRITICAL VALUES DETECTED</span>
                    </div>
                    <p className="text-sm text-red-700 mt-2">
                      This lab result contains critical values that require immediate attention.
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t pt-4 mt-6">
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <p>Generated by Cura EMR System</p>
                  <p>Date: {format(new Date(), 'MMM dd, yyyy HH:mm')}</p>
                </div>
                <div className="mt-4 text-center">
                  <div className="border-t border-gray-300 w-64 mx-auto mb-2"></div>
                  <p className="text-sm font-medium">Dr. {selectedResult.doctorFirstName} {selectedResult.doctorLastName}</p>
                  <p className="text-xs text-gray-600">{getDoctorSpecialization(selectedResult)}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center pt-4 border-t">
            <Button variant="outline" onClick={() => setShowPrescriptionDialog(false)}>
              Close
            </Button>
            <Button 
              onClick={handlePrintPrescription}
              className="bg-medical-blue hover:bg-blue-700"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Prescription
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}