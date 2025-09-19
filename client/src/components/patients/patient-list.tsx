import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarContent, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, Eye, User, Phone, MapPin, AlertTriangle, Clock, Bell, FileText, Flag, Trash2, Hash, Edit, X, Stethoscope, Pill, Activity, Camera } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import { formatDistanceToNow, format } from "date-fns";
import { PatientSearch, SearchFilters } from "./patient-search";
import { PatientCommunicationDialog } from "./patient-communication-dialog";
import { PatientModal } from "./patient-modal";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/hooks/use-tenant";

function getPatientInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function calculateAge(dateOfBirth: string): number {
  if (!dateOfBirth) {
    console.warn('No dateOfBirth provided for age calculation');
    return 0;
  }
  
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  
  // Check if birthDate is valid
  if (isNaN(birthDate.getTime())) {
    console.warn('Invalid dateOfBirth format:', dateOfBirth);
    return 0;
  }
  
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  console.log(`Calculated age for DOB ${dateOfBirth}: ${age}`);
  return age;
}

function getRiskLevelColor(riskLevel: string) {
  switch (riskLevel?.toLowerCase()) {
    case 'low': return 'text-white';
    case 'medium': return 'text-white';
    case 'high': return 'text-white';
    case 'critical': return 'text-white';
    default: return 'text-white';
  }
}

function getRiskLevelBgColor(riskLevel: string) {
  switch (riskLevel?.toLowerCase()) {
    case 'low': return '#9B9EAF';        // Steel
    case 'medium': return '#7279FB';     // Electric Lilac  
    case 'high': return '#4A7DFF';       // Bluewave
    case 'critical': return '#C073FF';   // Electric Violet
    default: return '#9B9EAF';           // Steel
  }
}

function getConditionColor(condition?: string) {
  return 'text-white';
}

function getConditionBgColor(condition?: string) {
  if (!condition) return '#9B9EAF';  // Steel
  
  const lowerCondition = condition.toLowerCase();
  if (lowerCondition.includes('diabetes')) return '#C073FF';        // Electric Violet
  if (lowerCondition.includes('hypertension') || lowerCondition.includes('blood pressure')) return '#6CFFEB';  // Mint Drift
  if (lowerCondition.includes('asthma') || lowerCondition.includes('respiratory')) return '#4A7DFF';  // Bluewave
  if (lowerCondition.includes('heart') || lowerCondition.includes('cardiac')) return '#7279FB';  // Electric Lilac
  
  return '#162B61';  // Midnight for other conditions
}

interface PatientListProps {
  onSelectPatient?: (patient: any) => void;
}

interface PatientDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: any | null;
}

// Comprehensive Patient Details Modal Component
function PatientDetailsModal({ open, onOpenChange, patient }: PatientDetailsModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("basic");

  // Fetch medical records by patient ID
  const { data: medicalRecords = [], isLoading: recordsLoading } = useQuery({
    queryKey: ['/api/patients', patient?.id, 'records'],
    queryFn: async () => {
      if (!patient?.id) return [];
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'X-Tenant-Subdomain': 'demo'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/patients/${patient.id}/records`, {
        headers,
        credentials: 'include'
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    enabled: !!patient?.id && open
  });

  // Fetch patient history by patient ID
  const { data: patientHistory = {}, isLoading: historyLoading } = useQuery({
    queryKey: ['/api/patients', patient?.id, 'history'],
    queryFn: async () => {
      if (!patient?.id) return {};
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'X-Tenant-Subdomain': 'demo'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/patients/${patient.id}/history`, {
        headers,
        credentials: 'include'
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    enabled: !!patient?.id && open
  });

  // Fetch prescriptions by patient ID
  const { data: prescriptions = [], isLoading: prescriptionsLoading } = useQuery({
    queryKey: ['/api/patients', patient?.id, 'prescriptions'],
    queryFn: async () => {
      if (!patient?.id) return [];
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'X-Tenant-Subdomain': 'demo'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/patients/${patient.id}/prescriptions`, {
        headers,
        credentials: 'include'
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    enabled: !!patient?.id && open
  });

  // Fetch lab results by patient ID
  const { data: labResults = [], isLoading: labResultsLoading } = useQuery({
    queryKey: ['/api/patients', patient?.id, 'lab-results'],
    queryFn: async () => {
      if (!patient?.id) return [];
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'X-Tenant-Subdomain': 'demo'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/patients/${patient.id}/lab-results`, {
        headers,
        credentials: 'include'
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    enabled: !!patient?.id && open
  });

  // Fetch medical imaging by patient ID
  const { data: medicalImaging = [], isLoading: imagingLoading } = useQuery({
    queryKey: ['/api/patients', patient?.id, 'medical-imaging'],
    queryFn: async () => {
      if (!patient?.id) return [];
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'X-Tenant-Subdomain': 'demo'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/patients/${patient.id}/medical-imaging`, {
        headers,
        credentials: 'include'
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    enabled: !!patient?.id && open
  });

  // Fetch health insurance information by patient ID
  const { data: insuranceInfo = {}, isLoading: insuranceLoading } = useQuery({
    queryKey: ['/api/patients', patient?.id, 'insurance'],
    queryFn: async () => {
      if (!patient?.id) return {};
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'X-Tenant-Subdomain': 'demo'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/patients/${patient.id}/insurance`, {
        headers,
        credentials: 'include'
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    enabled: !!patient?.id && open
  });

  // Fetch address information by patient ID
  const { data: addressInfo = {}, isLoading: addressLoading } = useQuery({
    queryKey: ['/api/patients', patient?.id, 'address'],
    queryFn: async () => {
      if (!patient?.id) return {};
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'X-Tenant-Subdomain': 'demo'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/patients/${patient.id}/address`, {
        headers,
        credentials: 'include'
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    enabled: !!patient?.id && open
  });

  // Fetch emergency contact by patient ID
  const { data: emergencyContact = {}, isLoading: emergencyContactLoading } = useQuery({
    queryKey: ['/api/patients', patient?.id, 'emergency-contact'],
    queryFn: async () => {
      if (!patient?.id) return {};
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'X-Tenant-Subdomain': 'demo'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/patients/${patient.id}/emergency-contact`, {
        headers,
        credentials: 'include'
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    enabled: !!patient?.id && open
  });

  if (!patient) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[946px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Patient Details - {patient.firstName} {patient.lastName}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-9">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="records">Medical Records</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
            <TabsTrigger value="lab">Lab Results</TabsTrigger>
            <TabsTrigger value="imaging">Imaging</TabsTrigger>
            <TabsTrigger value="insurance">Insurance</TabsTrigger>
            <TabsTrigger value="address">Address</TabsTrigger>
            <TabsTrigger value="emergency">Emergency</TabsTrigger>
          </TabsList>

          {/* Basic Information Tab */}
          <TabsContent value="basic" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Name</p>
                    <p className="text-lg">{patient.firstName} {patient.lastName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Patient ID</p>
                    <p className="text-lg">{patient.patientId}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Date of Birth</p>
                    <p>{patient.dateOfBirth ? format(new Date(patient.dateOfBirth), 'MMM dd, yyyy') : 'Not available'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Age</p>
                    <p>{calculateAge(patient.dateOfBirth)}y</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone</p>
                    <p>{patient.phone || 'Not available'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</p>
                    <p>{patient.email || 'Not available'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">NHS Number</p>
                    <p>{patient.nhsNumber || 'Not available'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Risk Level</p>
                    <Badge className={getRiskLevelColor(patient.riskLevel)} style={{ backgroundColor: getRiskLevelBgColor(patient.riskLevel) }}>
                      {patient.riskLevel || 'Not assessed'}
                    </Badge>
                  </div>
                </div>
                
                {patient.address && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Address</p>
                    <p>{patient.address.street || ''} {patient.address.city || ''} {patient.address.postcode || ''}</p>
                  </div>
                )}

                {patient.medicalHistory?.allergies && patient.medicalHistory.allergies.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Allergies</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {patient.medicalHistory.allergies.map((allergy: string, index: number) => (
                        <Badge key={index} variant="destructive" className="text-xs">
                          {allergy}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {patient.medicalHistory?.chronicConditions && patient.medicalHistory.chronicConditions.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Chronic Conditions</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {patient.medicalHistory.chronicConditions.map((condition: string, index: number) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {condition}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Medical Records Tab */}
          <TabsContent value="records" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Stethoscope className="h-5 w-5" />
                  Medical Records ({medicalRecords.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recordsLoading ? (
                  <div className="text-center py-4">Loading medical records...</div>
                ) : medicalRecords.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No medical records found</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {medicalRecords.map((record: any) => (
                      <Card key={record.id} className="border-l-4" style={{ borderLeftColor: '#4A7DFF' }}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold">{record.title}</h4>
                            <Badge variant="outline">{record.type}</Badge>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                            {format(new Date(record.createdAt), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                          {record.notes && (
                            <p className="text-sm">{record.notes}</p>
                          )}
                          {record.diagnosis && (
                            <div className="mt-2">
                              <p className="text-sm font-medium">Diagnosis:</p>
                              <p className="text-sm text-gray-600 dark:text-gray-300">{record.diagnosis}</p>
                            </div>
                          )}
                          {record.treatment && (
                            <div className="mt-2">
                              <p className="text-sm font-medium">Treatment:</p>
                              <p className="text-sm text-gray-600 dark:text-gray-300">{record.treatment}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Complete Patient History Tab */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Complete Patient History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <div className="text-center py-4">Loading patient history...</div>
                ) : (
                  <div className="space-y-4" style={{height: '350px', overflowY: 'auto'}}>
                    {patientHistory?.familyHistory && (
                      <div>
                        <h4 className="font-semibold mb-2">Family History</h4>
                        <div className="space-y-2">
                          {Object.entries(patientHistory.familyHistory).map(([relation, conditions]: [string, any]) => (
                            <div key={relation} className="border rounded p-3">
                              <p className="font-medium capitalize">{relation}</p>
                              {Array.isArray(conditions) && conditions.length > 0 ? (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {conditions.map((condition: string, index: number) => (
                                    <Badge key={index} variant="outline" className="text-xs">
                                      {condition}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500">No conditions reported</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {patientHistory?.socialHistory && (
                      <div>
                        <h4 className="font-semibold mb-2">Social History</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {Object.entries(patientHistory.socialHistory).map(([key, value]: [string, any]) => {
                            // Handle nested objects (like {"status": "never"}) and strings
                            const displayValue = typeof value === 'object' && value !== null 
                              ? Object.values(value).join(', ') || 'Not specified'
                              : value || 'Not specified';
                            
                            return (
                              <div key={key}>
                                <p className="text-sm font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-300">{displayValue}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {patientHistory?.allergies && patientHistory.allergies.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Allergies</h4>
                        <div className="flex flex-wrap gap-2">
                          {patientHistory.allergies.map((allergy: string, index: number) => (
                            <Badge key={index} variant="destructive" className="text-xs">
                              {allergy}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {patientHistory?.chronicConditions && patientHistory.chronicConditions.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Chronic Conditions</h4>
                        <div className="flex flex-wrap gap-2">
                          {patientHistory.chronicConditions.map((condition: string, index: number) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {condition}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {patientHistory?.medications && patientHistory.medications.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Current Medications</h4>
                        <div className="flex flex-wrap gap-2">
                          {patientHistory.medications.map((medication: string, index: number) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {medication}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {patientHistory?.immunizations && patientHistory.immunizations.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Immunizations</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {patientHistory.immunizations.map((immunization: any, index: number) => (
                            <div key={index} className="border rounded p-3">
                              <p className="font-medium text-sm">
                                {typeof immunization === 'string' ? immunization : immunization.vaccine || immunization.name || 'Unknown Vaccine'}
                              </p>
                              {typeof immunization === 'object' && immunization.date && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Date: {format(new Date(immunization.date), "MMM d, yyyy")}
                                </p>
                              )}
                              {typeof immunization === 'object' && immunization.nextDue && (
                                <p className="text-xs text-blue-600 mt-1">
                                  Next due: {format(new Date(immunization.nextDue), "MMM d, yyyy")}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {(!patientHistory?.familyHistory && 
                      !patientHistory?.socialHistory && 
                      (!patientHistory?.allergies || patientHistory.allergies.length === 0) &&
                      (!patientHistory?.chronicConditions || patientHistory.chronicConditions.length === 0) &&
                      (!patientHistory?.medications || patientHistory.medications.length === 0) &&
                      (!patientHistory?.immunizations || patientHistory.immunizations.length === 0)) && (
                      <div className="text-center py-8 text-gray-500">
                        <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No patient history available</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Prescriptions Tab */}
          <TabsContent value="prescriptions" className="space-y-4">
            {prescriptionsLoading ? (
              <div className="text-center py-4">Loading prescriptions...</div>
            ) : prescriptions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Pill className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No prescriptions found</p>
              </div>
            ) : (
              <div className="space-y-6">
                {prescriptions.map((prescription: any) => (
                  <div key={prescription.id} className="space-y-6 border rounded-lg p-6 bg-gray-50 dark:bg-gray-800">
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
                            <p className="font-medium">{patient?.firstName} {patient?.lastName}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">Patient ID</p>
                            <p className="font-mono text-sm">{patient?.id}</p>
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
                            <p className="font-medium">{prescription.prescribedBy || 'Provider undefined'}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">Provider ID</p>
                            <p className="font-mono text-sm">{prescription.providerId || 'N/A'}</p>
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
                            <Badge style={{ backgroundColor: '#7279FB', color: 'white' }}>
                              {prescription.status || 'signed'}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">Prescribed Date</p>
                            <p className="font-medium">
                              {prescription.createdAt ? format(new Date(prescription.createdAt), "dd/MM/yyyy") : '01/01/1970'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">Prescription ID</p>
                            <p className="font-mono text-sm">{prescription.id}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Diagnosis</p>
                          <p className="font-medium">{prescription.diagnosis || 'e'}</p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Medications */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Pill className="h-5 w-5" />
                          Medications (0)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center py-4 text-gray-500">
                          <p>No detailed medication information available</p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Pharmacy Information */}
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
                          <p className="font-medium">Halo Health</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Address</p>
                          <p>Unit 2 Drayton Court, Solihull, B90 4NG</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Phone</p>
                          <p>+44(0)121 827 5531</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Lab Results Tab */}
          <TabsContent value="lab" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Lab Results ({labResults.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {labResultsLoading ? (
                  <div className="text-center py-4">Loading lab results...</div>
                ) : labResults.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No lab results found</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {labResults.map((result: any) => (
                      <Card key={result.id} className="border-l-4" style={{ borderLeftColor: '#6CFFEB' }}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold">{result.testName || result.name}</h4>
                            <Badge style={{ backgroundColor: '#6CFFEB', color: '#162B61' }}>
                              {result.status || 'Completed'}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                            Test Date: {format(new Date(result.testDate || result.createdAt), "MMM d, yyyy")}
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="font-medium">Result:</p>
                              <p>{result.result || result.value || 'Pending'}</p>
                            </div>
                            <div>
                              <p className="font-medium">Reference Range:</p>
                              <p>{result.referenceRange || 'Not specified'}</p>
                            </div>
                            <div>
                              <p className="font-medium">Units:</p>
                              <p>{result.units || 'Not specified'}</p>
                            </div>
                          </div>
                          {result.notes && (
                            <div className="mt-2">
                              <p className="font-medium text-sm">Notes:</p>
                              <p className="text-sm text-gray-600 dark:text-gray-300">{result.notes}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Medical Imaging Tab */}
          <TabsContent value="imaging" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Medical Imaging ({medicalImaging.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {imagingLoading ? (
                  <div className="text-center py-4">Loading medical imaging...</div>
                ) : medicalImaging.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No medical imaging found</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {medicalImaging.map((imaging: any) => (
                      <Card key={imaging.id} className="border-l-4" style={{ borderLeftColor: '#C073FF' }}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold">{imaging.studyType || imaging.type}</h4>
                            <Badge style={{ backgroundColor: '#C073FF', color: 'white' }}>
                              {imaging.status || 'Completed'}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                            Study Date: {format(new Date(imaging.studyDate || imaging.createdAt), "MMM d, yyyy")}
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="font-medium">Body Part:</p>
                              <p>{imaging.bodyPart || imaging.anatomicalSite || 'Not specified'}</p>
                            </div>
                            <div>
                              <p className="font-medium">Modality:</p>
                              <p>{imaging.modality || 'Not specified'}</p>
                            </div>
                            <div>
                              <p className="font-medium">Radiologist:</p>
                              <p>{imaging.radiologist || imaging.performedBy || 'Not specified'}</p>
                            </div>
                            <div>
                              <p className="font-medium">Priority:</p>
                              <p>{imaging.priority || 'Routine'}</p>
                            </div>
                          </div>
                          {imaging.findings && (
                            <div className="mt-2">
                              <p className="font-medium text-sm">Findings:</p>
                              <p className="text-sm text-gray-600 dark:text-gray-300">{imaging.findings}</p>
                            </div>
                          )}
                          {imaging.impression && (
                            <div className="mt-2">
                              <p className="font-medium text-sm">Impression:</p>
                              <p className="text-sm text-gray-600 dark:text-gray-300">{imaging.impression}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Health Insurance Information Tab */}
          <TabsContent value="insurance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Health Insurance Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                {insuranceLoading ? (
                  <div className="text-center py-4">Loading insurance information...</div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Insurance Provider</p>
                        <p className="text-lg">{insuranceInfo.provider || patient.insuranceInfo?.provider || 'Not available'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Policy Number</p>
                        <p className="text-lg">{insuranceInfo.policyNumber || patient.insuranceInfo?.policyNumber || 'Not available'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Group Number</p>
                        <p>{insuranceInfo.groupNumber || patient.insuranceInfo?.groupNumber || 'Not available'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Member ID</p>
                        <p>{insuranceInfo.memberId || patient.insuranceInfo?.memberId || 'Not available'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Coverage Type</p>
                        <p>{insuranceInfo.coverageType || patient.insuranceInfo?.coverageType || 'Not available'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Plan Type</p>
                        <p>{insuranceInfo.planType || patient.insuranceInfo?.planType || 'Not available'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Effective Date</p>
                        <p>{insuranceInfo.effectiveDate ? format(new Date(insuranceInfo.effectiveDate), 'MMM dd, yyyy') : (patient.insuranceInfo?.effectiveDate ? format(new Date(patient.insuranceInfo.effectiveDate), 'MMM dd, yyyy') : 'Not available')}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Expiration Date</p>
                        <p>{insuranceInfo.expirationDate ? format(new Date(insuranceInfo.expirationDate), 'MMM dd, yyyy') : (patient.insuranceInfo?.expirationDate ? format(new Date(patient.insuranceInfo.expirationDate), 'MMM dd, yyyy') : 'Not available')}</p>
                      </div>
                    </div>
                    
                    {(insuranceInfo.copayAmount || patient.insuranceInfo?.copayAmount) && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Copay Amount</p>
                        <p className="text-lg font-semibold text-green-600">${insuranceInfo.copayAmount || patient.insuranceInfo?.copayAmount}</p>
                      </div>
                    )}

                    {(insuranceInfo.deductible || patient.insuranceInfo?.deductible) && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Deductible</p>
                        <p className="text-lg">${insuranceInfo.deductible || patient.insuranceInfo?.deductible}</p>
                      </div>
                    )}

                    {(insuranceInfo.notes || patient.insuranceInfo?.notes) && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Notes</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{insuranceInfo.notes || patient.insuranceInfo?.notes}</p>
                      </div>
                    )}

                    {(!insuranceInfo.provider && !patient.insuranceInfo?.provider) && (
                      <div className="text-center py-8 text-gray-500">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No insurance information available</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Address Information Tab */}
          <TabsContent value="address" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Address Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                {addressLoading ? (
                  <div className="text-center py-4">Loading address information...</div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Street Address</p>
                        <p className="text-lg">{addressInfo.street || patient.address?.street || 'Not available'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">City</p>
                        <p>{addressInfo.city || patient.address?.city || 'Not available'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">State/County</p>
                        <p>{addressInfo.state || addressInfo.county || patient.address?.state || patient.address?.county || 'Not available'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Postal Code</p>
                        <p>{addressInfo.postcode || addressInfo.zipCode || patient.address?.postcode || 'Not available'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Country</p>
                        <p>{addressInfo.country || patient.address?.country || 'Not available'}</p>
                      </div>
                    </div>

                    {(addressInfo.apartment || addressInfo.unit || patient.address?.apartment) && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Apartment/Unit</p>
                        <p>{addressInfo.apartment || addressInfo.unit || patient.address?.apartment}</p>
                      </div>
                    )}

                    {(addressInfo.addressType || patient.address?.type) && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Address Type</p>
                        <Badge variant="outline">{addressInfo.addressType || patient.address?.type}</Badge>
                      </div>
                    )}

                    {(!addressInfo.street && !patient.address?.street) && (
                      <div className="text-center py-8 text-gray-500">
                        <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No address information available</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Emergency Contact Tab */}
          <TabsContent value="emergency" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Emergency Contact
                </CardTitle>
              </CardHeader>
              <CardContent>
                {emergencyContactLoading ? (
                  <div className="text-center py-4">Loading emergency contact...</div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Contact Name</p>
                        <p className="text-lg">{emergencyContact.name || emergencyContact.contactName || patient.emergencyContact?.name || 'Not available'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Relationship</p>
                        <p>{emergencyContact.relationship || patient.emergencyContact?.relationship || 'Not available'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Primary Phone</p>
                        <p>{emergencyContact.phone || emergencyContact.primaryPhone || patient.emergencyContact?.phone || 'Not available'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Secondary Phone</p>
                        <p>{emergencyContact.secondaryPhone || emergencyContact.alternatePhone || patient.emergencyContact?.secondaryPhone || 'Not available'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</p>
                        <p>{emergencyContact.email || patient.emergencyContact?.email || 'Not available'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Preferred Contact Method</p>
                        <p>{emergencyContact.preferredContactMethod || patient.emergencyContact?.preferredContactMethod || 'Not available'}</p>
                      </div>
                    </div>

                    {(emergencyContact.address || patient.emergencyContact?.address) && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Address</p>
                        <p>{emergencyContact.address || patient.emergencyContact?.address}</p>
                      </div>
                    )}

                    {(emergencyContact.notes || patient.emergencyContact?.notes) && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Notes</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{emergencyContact.notes || patient.emergencyContact?.notes}</p>
                      </div>
                    )}

                    {(!emergencyContact.name && !emergencyContact.contactName && !patient.emergencyContact?.name) && (
                      <div className="text-center py-8 text-gray-500">
                        <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No emergency contact information available</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export function PatientList({ onSelectPatient }: PatientListProps = {}) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { tenant } = useTenant();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({ searchType: 'all' });
  const [filteredPatients, setFilteredPatients] = useState<any[]>([]);
  const [communicationDialog, setCommunicationDialog] = useState<{
    open: boolean;
    patient: any | null;
    mode: "flag" | "reminder";
  }>({
    open: false,
    patient: null,
    mode: "reminder"
  });

  const [editModal, setEditModal] = useState<{
    open: boolean;
    patient: any | null;
  }>({
    open: false,
    patient: null
  });

  const [patientDetailsModal, setPatientDetailsModal] = useState<{
    open: boolean;
    patient: any | null;
  }>({
    open: false,
    patient: null
  });





  const handleRemindPatient = (patient: any) => {
    setCommunicationDialog({
      open: true,
      patient,
      mode: "reminder"
    });
  };

  const handleFlagPatient = (patient: any) => {
    setCommunicationDialog({
      open: true,
      patient,
      mode: "flag"
    });
  };

  const handleEditPatient = (patient: any) => {
    setEditModal({
      open: true,
      patient
    });
  };

  // Delete patient mutation
  const deletePatientMutation = useMutation({
    mutationFn: async (patientId: number) => {
      return apiRequest('DELETE', `/api/patients/${patientId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      toast({
        title: "Patient deleted",
        description: "Patient has been successfully removed from the system.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting patient",
        description: error.message || "Failed to delete patient. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDeletePatient = (patient: any) => {
    if (window.confirm(`Are you sure you want to delete ${patient.firstName} ${patient.lastName}? This action cannot be undone.`)) {
      deletePatientMutation.mutate(patient.id);
    }
  };

  const handleViewRecords = (patient: any) => {
    console.log('View records for:', patient.firstName, patient.lastName);
    toast({
      title: "Medical Records",
      description: `Opening medical records for ${patient.firstName} ${patient.lastName}`,
    });
    setLocation(`/patients/${patient.id}/records`);
  };



  const { data: patients, isLoading, error } = useQuery({
    queryKey: ["/api/patients"],
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const headers: Record<string, string> = {
          'X-Tenant-Subdomain': tenant?.subdomain || 'demo'
        };
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        console.log("Fetching patients with headers:", headers);
        
        const response = await fetch("/api/patients", {
          headers,
          credentials: 'include'
        });

        console.log("Patients response status:", response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Patients fetch failed:", response.status, errorText);
          throw new Error(`Failed to fetch patients: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        console.log("Patients data received:", data);
        return data;
      } catch (err) {
        console.error("Error in patients queryFn:", err);
        throw err;
      }
    },
    refetchOnMount: true,
    retry: 1
  });

  console.log("PatientList - isLoading:", isLoading, "error:", error, "patients:", patients);

  // Auto-apply filters when data or filters change
  useEffect(() => {
    if (patients && (searchQuery || searchFilters.insuranceProvider || searchFilters.riskLevel || searchFilters.lastVisit)) {
      handleSearch(searchQuery, searchFilters);
    }
  }, [patients, searchQuery, searchFilters]);

  // Sync editModal.patient with fresh data after cache invalidation
  useEffect(() => {
    if (editModal.open && editModal.patient && patients && Array.isArray(patients)) {
      const updatedPatient = patients.find(p => p.id === editModal.patient.id);
      if (updatedPatient) {
        // Only update if the data has actually changed to avoid unnecessary re-renders
        const currentPatientData = JSON.stringify(editModal.patient);
        const updatedPatientData = JSON.stringify(updatedPatient);
        
        if (currentPatientData !== updatedPatientData) {
          console.log('Syncing editModal.patient with fresh data for patient:', updatedPatient.id);
          setEditModal(prev => ({
            ...prev,
            patient: updatedPatient
          }));
        }
      }
    }
  }, [patients, editModal.open, editModal.patient?.id]);


  const handleViewPatient = (patient: any) => {
    if (onSelectPatient) {
      onSelectPatient(patient);
    } else {
      setPatientDetailsModal({
        open: true,
        patient: patient
      });
    }
  };



  const handleSearch = (query: string, filters: SearchFilters) => {
    setSearchQuery(query);
    setSearchFilters(filters);
    
    if (!patients || !Array.isArray(patients)) return;
    
    let filtered = [...patients];
    
    if (query.trim()) {
      const searchTerm = query.toLowerCase().trim();
      // Normalize phone numbers for searching - remove spaces, dashes, parentheses
      const normalizePhone = (phone: string) => phone?.replace(/[\s\-\(\)]/g, '') || '';
      
      filtered = filtered.filter(patient => {
        switch (filters.searchType) {
          case 'name':
            return `${patient.firstName} ${patient.lastName}`.toLowerCase().includes(searchTerm);
          case 'postcode':
            return patient.address?.postcode?.toLowerCase().includes(searchTerm);
          case 'phone':
            const patientPhone = normalizePhone(patient.phone?.toLowerCase() || '');
            const normalizedSearchTerm = normalizePhone(searchTerm);
            return patientPhone.includes(normalizedSearchTerm);
          case 'nhsNumber':
            return patient.nhsNumber?.toLowerCase().includes(searchTerm);
          case 'email':
            return patient.email?.toLowerCase().includes(searchTerm);
          default:
            const defaultPatientPhone = normalizePhone(patient.phone?.toLowerCase() || '');
            const defaultNormalizedSearchTerm = normalizePhone(searchTerm);
            return `${patient.firstName} ${patient.lastName}`.toLowerCase().includes(searchTerm) ||
                   patient.address?.postcode?.toLowerCase().includes(searchTerm) ||
                   defaultPatientPhone.includes(defaultNormalizedSearchTerm) ||
                   patient.nhsNumber?.toLowerCase().includes(searchTerm) ||
                   patient.email?.toLowerCase().includes(searchTerm);
        }
      });
    }
    
    if (filters.insuranceProvider && filters.insuranceProvider !== '') {
      filtered = filtered.filter(patient => {
        // Handle different insurance provider formats
        const provider = patient.insuranceInfo?.provider?.toLowerCase() || '';
        const filterProvider = filters.insuranceProvider?.toLowerCase() || '';
        
        // Special handling for common provider names
        if (filterProvider === 'nhs') return provider.includes('nhs') || provider === '';
        if (filterProvider === 'axa-ppp') return provider.includes('axa') || provider.includes('ppp');
        
        return provider.includes(filterProvider);
      });
    }
    
    if (filters.riskLevel) {
      filtered = filtered.filter(patient => patient.riskLevel === filters.riskLevel);
    }
    
    setFilteredPatients(filtered);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchFilters({ searchType: 'all' });
    setFilteredPatients([]);
  };

  const handleBookAppointment = (patient: any) => {
    console.log('Booking appointment for:', patient.firstName, patient.lastName);
    toast({
      title: "Book Appointment",
      description: `Opening appointment booking for ${patient.firstName} ${patient.lastName}`,
    });
    setLocation(`/calendar?patientId=${patient.id}`);
  };



  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#4A7DFF' }}></div>
      </div>
    );
  }

  if (error) {
    console.error("Patient list error:", error);
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600">Failed to load patients</p>
        <p className="text-sm text-gray-500 mt-2">{error.message}</p>
      </div>
    );
  }

  // Check if any filters are actually applied (not just default values)
  const hasActiveFilters = searchQuery || 
    searchFilters.insuranceProvider || 
    searchFilters.riskLevel || 
    searchFilters.lastVisit ||
    (searchFilters.searchType && searchFilters.searchType !== 'all');

  const displayPatients = hasActiveFilters 
    ? filteredPatients 
    : (Array.isArray(patients) ? patients : []);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Patients</h2>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {displayPatients.length} patient{displayPatients.length !== 1 ? 's' : ''} found
        </div>
      </div>

      <PatientSearch onSearch={handleSearch} onClear={handleClearSearch} />

      {displayPatients.length === 0 ? (
        <div className="text-center py-12">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No patients found</h3>
          <p className="text-gray-500 dark:text-gray-400">
            {searchQuery ? "Try adjusting your search criteria" : "No patients have been added yet"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-auto">
          {displayPatients.map((patient: any) => {

            
            return (
              <Card key={patient.id} className="hover:shadow-md transition-shadow h-[400px] flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="text-white font-semibold" style={{ backgroundColor: '#4A7DFF' }}>
                          {getPatientInitials(patient.firstName, patient.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <span className="patient-name">{patient.firstName} {patient.lastName}</span>
                          <TooltipProvider>
                            {patient.medicalHistory?.allergies && patient.medicalHistory.allergies.length > 0 && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <AlertTriangle className="h-4 w-4 text-red-500" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Allergies: {patient.medicalHistory.allergies.join(', ')}</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {patient.medicalHistory?.chronicConditions && patient.medicalHistory.chronicConditions.length > 0 && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Clock className="h-4 w-4 text-orange-500" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Conditions: {patient.medicalHistory.chronicConditions.join(', ')}</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </TooltipProvider>
                        </CardTitle>
                      <p className="text-sm patient-info">
                        {patient.dateOfBirth ? 
                          (() => {
                            const birthDate = new Date(patient.dateOfBirth);
                            const today = new Date();
                            const age = today.getFullYear() - birthDate.getFullYear() - 
                              (today.getMonth() < birthDate.getMonth() || 
                               (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate()) ? 1 : 0);
                            return `Age ${age}y`;
                          })() : 
                          "Age Not Available"
                        } • {patient.patientId}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-1 h-20 overflow-hidden">
                    {patient.riskLevel && (
                      <Badge 
                        className={`text-xs ${getRiskLevelColor(patient.riskLevel)}`}
                        style={{ backgroundColor: getRiskLevelBgColor(patient.riskLevel) }}
                      >
                        {patient.riskLevel}
                      </Badge>
                    )}
                    {patient.insuranceInfo?.provider && (
                      <Badge variant="outline" className="text-xs dark:text-gray-200 dark:border-gray-600">
                        {patient.insuranceInfo.provider.toUpperCase()}
                      </Badge>
                    )}
                    {patient.flags && patient.flags.length > 0 && (
                      <div className="flex flex-col items-end space-y-1 max-h-12 overflow-hidden">
                        {patient.flags.slice(0, 1).map((flag: string, index: number) => {
                          const [type, priority, reason] = flag.split(':');
                          const flagColor = priority === 'urgent' ? 'text-white' :
                                          priority === 'high' ? 'text-white' :
                                          priority === 'medium' ? 'text-white' :
                                          'text-white';
                          const flagBgColor = '#162B61';  // Midnight dark blue for all flags
                          return (
                            <Badge 
                              key={index} 
                              className={`text-xs ${flagColor}`}
                              style={{ backgroundColor: flagBgColor }}
                              title={`${type}: ${reason}`}
                            >
                              🚩 {type}
                            </Badge>
                          );
                        })}
                        {patient.flags.length > 1 && (
                          <Badge variant="outline" className="text-xs text-gray-600 dark:text-gray-300">
                            +{patient.flags.length - 1} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3 overflow-visible pb-6 flex-1 flex flex-col justify-between">
                <div className="space-y-2 text-sm">
                  {patient.phone && (
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-2 text-gray-600 dark:text-gray-300" />
                      <span className="text-neutral-600 dark:text-neutral-300">{patient.phone}</span>
                    </div>
                  )}
                  {patient.email && (
                    <div className="flex items-center truncate">
                      <User className="h-4 w-4 mr-2 text-gray-600 dark:text-gray-300" />
                      <span className="text-neutral-600 dark:text-neutral-300 truncate">{patient.email}</span>
                    </div>
                  )}
                  {patient.nhsNumber && (
                    <div className="flex items-center text-neutral-600 dark:text-white">
                      <FileText className="h-4 w-4 mr-2" />
                      NHS: {patient.nhsNumber}
                    </div>
                  )}
                  {patient.address?.postcode && (
                    <div className="flex items-center text-neutral-600 dark:text-neutral-300">
                      <MapPin className="h-4 w-4 mr-2" />
                      {patient.address.postcode}
                      {patient.address.city && `, ${patient.address.city}`}
                    </div>
                  )}
                </div>

                {patient.medicalHistory?.chronicConditions && patient.medicalHistory.chronicConditions.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Conditions:</p>
                    <div className="flex flex-wrap gap-1">
                      {patient.medicalHistory.chronicConditions.slice(0, 2).map((condition: string, index: number) => (
                        <Badge 
                          key={index} 
                          className={`text-xs ${getConditionColor(condition)}`}
                          style={{ backgroundColor: getConditionBgColor(condition) }}
                        >
                          {condition}
                        </Badge>
                      ))}
                      {patient.medicalHistory.chronicConditions.length > 2 && (
                        <Badge variant="outline" className="text-xs dark:text-gray-200 dark:border-gray-600">
                          +{patient.medicalHistory.chronicConditions.length - 2} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {patient.lastVisit && (
                  <div className="flex items-center text-xs text-neutral-500 dark:text-neutral-400">
                    <Clock className="h-3 w-3 mr-1" />
                    Last visit: {formatDistanceToNow(new Date(patient.lastVisit), { addSuffix: true })}
                  </div>
                )}

                <div className="space-y-2 mt-4">
                  {/* Primary action buttons - Medical Records prominently featured */}
                  <div className="flex gap-2">
                    <Button 
                      size="default"
                      variant="outline"
                      onClick={() => setLocation(`/patients/${patient.id}/records`)}
                      className="flex-1 text-sm text-white"
                      style={{ borderColor: '#4A7DFF', backgroundColor: '#4A7DFF' }}
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      Records
                    </Button>
                    <Button 
                      size="default"
                      onClick={() => handleBookAppointment(patient)}
                      className="flex-1 text-sm text-white"
                      style={{ backgroundColor: '#7279FB' }}
                    >
                      <Calendar className="h-4 w-4 mr-1" />
                      Book
                    </Button>
                  </div>
                  
                  {/* Secondary actions */}
                  <div className={`grid ${user?.role === 'admin' ? 'grid-cols-5' : (user?.role === 'admin' || user?.role === 'doctor' || user?.role === 'nurse') ? 'grid-cols-4' : 'grid-cols-3'} gap-1`}>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => handleViewPatient(patient)}
                      className="flex-1 text-xs h-7"
                      data-testid={`button-view-${patient.id}`}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                    {(user?.role === 'admin' || user?.role === 'doctor' || user?.role === 'nurse') && (
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => handleEditPatient(patient)}
                        className="flex-1 text-xs h-7"
                        data-testid={`button-edit-${patient.id}`}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => handleRemindPatient(patient)}
                      className="flex-1 text-xs h-7"
                      data-testid={`button-remind-${patient.id}`}
                    >
                      <Bell className="h-3 w-3 mr-1" />
                      Remind
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => handleFlagPatient(patient)}
                      className="flex-1 text-xs h-7"
                      data-testid={`button-flag-${patient.id}`}
                    >
                      <Flag className="h-3 w-3 mr-1" />
                      Flag
                    </Button>
                    {user?.role === 'admin' && (
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => handleDeletePatient(patient)}
                        disabled={deletePatientMutation.isPending}
                        className="flex-1 text-xs h-7 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 dark:text-red-400 dark:hover:text-red-300"
                        data-testid={`button-delete-${patient.id}`}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>

                {patient.alerts && patient.alerts.length > 0 && (
                  <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-2">
                    <div className="flex items-center text-red-700 dark:text-red-300 text-xs font-medium mb-1">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Urgent Alerts
                    </div>
                    {patient.alerts.slice(0, 2).map((alert: any, index: number) => (
                      <p key={index} className="text-xs text-red-600 dark:text-red-400">
                        {alert.message || alert}
                      </p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    )}

    {/* Enhanced Communication Dialog */}
    <PatientCommunicationDialog
      open={communicationDialog.open}
      onOpenChange={(open) => setCommunicationDialog(prev => ({ ...prev, open }))}
      patient={communicationDialog.patient}
      mode={communicationDialog.mode}
    />
    
    <PatientModal
      open={editModal.open}
      onOpenChange={(open) => setEditModal({open, patient: open ? editModal.patient : null})}
      editMode={true}
      editPatient={editModal.patient}
    />

    {/* Comprehensive Patient Details Modal */}
    <PatientDetailsModal
      open={patientDetailsModal.open}
      onOpenChange={(open) => setPatientDetailsModal({open, patient: open ? patientDetailsModal.patient : null})}
      patient={patientDetailsModal.patient}
    />
  </div>
);
}