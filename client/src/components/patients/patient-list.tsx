import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarContent, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, Eye, User, Phone, MapPin, AlertTriangle, Clock, Bell, FileText, Flag, Trash2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { PatientSearch, SearchFilters } from "./patient-search";
import { PatientCommunicationDialog } from "./patient-communication-dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

function getPatientInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

function getRiskLevelColor(riskLevel: string) {
  switch (riskLevel?.toLowerCase()) {
    case 'low': return 'bg-green-100 text-green-800';
    case 'medium': return 'bg-yellow-100 text-yellow-800';
    case 'high': return 'bg-orange-100 text-orange-800';
    case 'critical': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

function getConditionColor(condition?: string) {
  if (!condition) return 'bg-gray-100 text-gray-600';
  
  const lowerCondition = condition.toLowerCase();
  if (lowerCondition.includes('diabetes')) return 'bg-purple-100 text-purple-700';
  if (lowerCondition.includes('hypertension') || lowerCondition.includes('blood pressure')) return 'bg-red-100 text-red-700';
  if (lowerCondition.includes('asthma') || lowerCondition.includes('respiratory')) return 'bg-blue-100 text-blue-700';
  if (lowerCondition.includes('heart') || lowerCondition.includes('cardiac')) return 'bg-pink-100 text-pink-700';
  
  return 'bg-gray-100 text-gray-600';
}

interface PatientListProps {
  onSelectPatient?: (patient: any) => void;
}

export function PatientList({ onSelectPatient }: PatientListProps = {}) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Debug logging for user role
  console.log("PatientList - user:", user);
  console.log("PatientList - user role:", user?.role);
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
    queryFn: async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const headers: Record<string, string> = {
          'X-Tenant-Subdomain': 'demo'
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
    staleTime: 0,
    retry: 1
  });

  console.log("PatientList - isLoading:", isLoading, "error:", error, "patients:", patients);



  const handleViewPatient = (patient: any) => {
    if (onSelectPatient) {
      onSelectPatient(patient);
    } else {
      setLocation(`/patients/${patient.id}`);
    }
  };



  const handleSearch = (query: string, filters: SearchFilters) => {
    setSearchQuery(query);
    setSearchFilters(filters);
    
    if (!patients || !Array.isArray(patients)) return;
    
    let filtered = [...patients];
    
    if (query.trim()) {
      const searchTerm = query.toLowerCase().trim();
      filtered = filtered.filter(patient => {
        switch (filters.searchType) {
          case 'name':
            return `${patient.firstName} ${patient.lastName}`.toLowerCase().includes(searchTerm);
          case 'postcode':
            return patient.address?.postcode?.toLowerCase().includes(searchTerm);
          case 'phone':
            return patient.phone?.toLowerCase().includes(searchTerm);
          case 'nhsNumber':
            return patient.nhsNumber?.toLowerCase().includes(searchTerm);
          case 'email':
            return patient.email?.toLowerCase().includes(searchTerm);
          default:
            return `${patient.firstName} ${patient.lastName}`.toLowerCase().includes(searchTerm) ||
                   patient.address?.postcode?.toLowerCase().includes(searchTerm) ||
                   patient.phone?.toLowerCase().includes(searchTerm) ||
                   patient.nhsNumber?.toLowerCase().includes(searchTerm) ||
                   patient.email?.toLowerCase().includes(searchTerm);
        }
      });
    }
    
    if (filters.insuranceProvider && filters.insuranceProvider !== '') {
      filtered = filtered.filter(patient => 
        patient.insuranceInfo?.provider === filters.insuranceProvider
      );
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-medical-blue"></div>
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

  const displayPatients = searchQuery || Object.keys(searchFilters).length > 1 
    ? filteredPatients 
    : (Array.isArray(patients) ? patients : []);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Patients</h2>
        <div className="text-sm text-gray-500">
          {displayPatients.length} patient{displayPatients.length !== 1 ? 's' : ''} found
        </div>
      </div>

      <PatientSearch onSearch={handleSearch} onClear={handleClearSearch} />

      {displayPatients.length === 0 ? (
        <div className="text-center py-12">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No patients found</h3>
          <p className="text-gray-500">
            {searchQuery ? "Try adjusting your search criteria" : "No patients have been added yet"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayPatients.map((patient: any) => {

            
            return (
              <Card key={patient.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-medical-blue text-white font-semibold">
                          {getPatientInitials(patient.firstName, patient.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {patient.firstName} {patient.lastName}
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
                      <p className="text-sm text-neutral-600">
                        Age {calculateAge(patient.dateOfBirth)} • {patient.patientId}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    {patient.riskLevel && (
                      <Badge className={`text-xs ${getRiskLevelColor(patient.riskLevel)}`}>
                        {patient.riskLevel}
                      </Badge>
                    )}
                    {patient.insuranceInfo?.provider && (
                      <Badge variant="outline" className="text-xs">
                        {patient.insuranceInfo.provider.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  {patient.phone && (
                    <div className="flex items-center text-neutral-600">
                      <Phone className="h-4 w-4 mr-2" />
                      {patient.phone}
                    </div>
                  )}
                  {patient.address?.postcode && (
                    <div className="flex items-center text-neutral-600">
                      <MapPin className="h-4 w-4 mr-2" />
                      {patient.address.postcode}
                      {patient.address.city && `, ${patient.address.city}`}
                    </div>
                  )}
                  {patient.email && (
                    <div className="flex items-center text-neutral-600 truncate">
                      <User className="h-4 w-4 mr-2" />
                      {patient.email}
                    </div>
                  )}
                </div>

                {patient.medicalHistory?.chronicConditions && patient.medicalHistory.chronicConditions.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-neutral-700">Conditions:</p>
                    <div className="flex flex-wrap gap-1">
                      {patient.medicalHistory.chronicConditions.slice(0, 2).map((condition: string, index: number) => (
                        <Badge 
                          key={index} 
                          variant="outline" 
                          className={`text-xs ${getConditionColor(condition)}`}
                        >
                          {condition}
                        </Badge>
                      ))}
                      {patient.medicalHistory.chronicConditions.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{patient.medicalHistory.chronicConditions.length - 2} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {patient.lastVisit && (
                  <div className="flex items-center text-xs text-neutral-500">
                    <Clock className="h-3 w-3 mr-1" />
                    Last visit: {formatDistanceToNow(new Date(patient.lastVisit), { addSuffix: true })}
                  </div>
                )}

                <div className="space-y-2">
                  {/* Primary action buttons - Medical Records prominently featured */}
                  <div className="flex gap-2">
                    <Button 
                      size="default"
                      variant="outline"
                      onClick={() => setLocation(`/patients/${patient.id}/records`)}
                      className="flex-1 border-medical-blue text-medical-blue hover:bg-medical-blue hover:text-white text-sm"
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      Records
                    </Button>
                    <Button 
                      size="default"
                      onClick={() => handleBookAppointment(patient)}
                      className="flex-1 bg-medical-blue hover:bg-blue-700 text-sm"
                    >
                      <Calendar className="h-4 w-4 mr-1" />
                      Book
                    </Button>
                  </div>
                  
                  {/* Secondary actions */}
                  <div className="flex gap-1">
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => handleViewPatient(patient)}
                      className="flex-1 text-xs h-7"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => handleRemindPatient(patient)}
                      className="flex-1 text-xs h-7"
                    >
                      <Bell className="h-3 w-3 mr-1" />
                      Remind
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => handleFlagPatient(patient)}
                      className="flex-1 text-xs h-7"
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
                        className="flex-1 text-xs h-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>

                {patient.alerts && patient.alerts.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-2">
                    <div className="flex items-center text-red-700 text-xs font-medium mb-1">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Urgent Alerts
                    </div>
                    {patient.alerts.slice(0, 2).map((alert: any, index: number) => (
                      <p key={index} className="text-xs text-red-600">
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
  </div>
);
}