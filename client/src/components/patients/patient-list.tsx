import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarContent, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, Eye, User, Phone, MapPin, AlertTriangle, Clock, Bell, FileText } from "lucide-react";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { PatientSearch, SearchFilters } from "./patient-search";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({ searchType: 'all' });
  const [filteredPatients, setFilteredPatients] = useState<any[]>([]);

  const { data: patients, isLoading, error } = useQuery({
    queryKey: ["/api/patients"],
    queryFn: () => fetch("/api/patients").then(res => res.json())
  });

  const sendReminderMutation = useMutation({
    mutationFn: async (patientId: number) => {
      return apiRequest('POST', `/api/patients/${patientId}/send-reminder`, {
        type: 'appointment_reminder',
        message: 'Please remember your upcoming appointment'
      });
    },
    onSuccess: () => {
      toast({
        title: "Reminder sent",
        description: "Patient has been notified about their appointment",
      });
    }
  });

  const flagPatientMutation = useMutation({
    mutationFn: async ({ patientId, flag }: { patientId: number; flag: string }) => {
      return apiRequest('PATCH', `/api/patients/${patientId}`, {
        flags: [flag]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      toast({
        title: "Patient flagged",
        description: "Flag has been added to patient record",
      });
    }
  });

  const handleViewPatient = (patient: any) => {
    if (onSelectPatient) {
      onSelectPatient(patient);
    } else {
      setLocation(`/patients/${patient.id}`);
    }
  };

  const handleBookAppointment = (patient: any) => {
    setLocation(`/appointments?patientId=${patient.id}`);
  };

  const handleSearch = (query: string, filters: SearchFilters) => {
    setSearchQuery(query);
    setSearchFilters(filters);
    
    if (!patients) return;
    
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

  const handleSendReminder = (patientId: number) => {
    sendReminderMutation.mutate(patientId);
  };

  const handleFlagPatient = (patientId: number, flag: string) => {
    flagPatientMutation.mutate({ patientId, flag });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-medical-blue"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600">Failed to load patients</p>
      </div>
    );
  }

  const displayPatients = searchQuery || Object.keys(searchFilters).length > 1 
    ? filteredPatients 
    : patients || [];

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
          {displayPatients.map((patient: any) => (
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
                      <CardTitle className="text-lg">
                        {patient.firstName} {patient.lastName}
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
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleViewPatient(patient)}
                      className="flex-1"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => handleBookAppointment(patient)}
                      className="flex-1 bg-medical-blue hover:bg-blue-700"
                    >
                      <Calendar className="h-4 w-4 mr-1" />
                      Book
                    </Button>
                  </div>
                  
                  <div className="flex gap-1">
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => handleSendReminder(patient.id)}
                      disabled={sendReminderMutation.isPending}
                      className="flex-1 text-xs h-7"
                    >
                      <Bell className="h-3 w-3 mr-1" />
                      Remind
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => setLocation(`/patients/${patient.id}/records`)}
                      className="flex-1 text-xs h-7"
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      Records
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => handleFlagPatient(patient.id, 'follow-up')}
                      disabled={flagPatientMutation.isPending}
                      className="flex-1 text-xs h-7"
                    >
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Flag
                    </Button>
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
          ))}
        </div>
      )}
    </div>
  );
}