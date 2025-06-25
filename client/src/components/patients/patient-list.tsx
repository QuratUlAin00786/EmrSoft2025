import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarContent, AvatarFallback } from "@/components/ui/avatar";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { ConsultationDialog } from "@/components/consultation/consultation-dialog";
import { Search, Eye, FileText, Calendar, Stethoscope } from "lucide-react";
import type { Patient } from "@/types";

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

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });
}

function getRiskLevelColor(riskLevel: string) {
  switch (riskLevel) {
    case "high":
      return "bg-red-100 text-red-800";
    case "medium":
      return "bg-yellow-100 text-yellow-800";
    case "low":
    default:
      return "bg-green-100 text-green-800";
  }
}

function getConditionColor(condition?: string) {
  if (!condition) return "bg-gray-100 text-gray-800";
  
  const lowerCondition = condition.toLowerCase();
  if (lowerCondition.includes("diabetes")) return "bg-yellow-100 text-yellow-800";
  if (lowerCondition.includes("hypertension") || lowerCondition.includes("blood pressure")) return "bg-blue-100 text-blue-800";
  if (lowerCondition.includes("heart") || lowerCondition.includes("cardiac")) return "bg-red-100 text-red-800";
  if (lowerCondition.includes("pain")) return "bg-orange-100 text-orange-800";
  return "bg-gray-100 text-gray-800";
}

interface PatientListProps {
  onSelectPatient?: (patient: any) => void;
}

export function PatientList({ onSelectPatient }: PatientListProps = {}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showConsultation, setShowConsultation] = useState(false);
  const [selectedPatientForConsultation, setSelectedPatientForConsultation] = useState<any>(null);

  const startConsultation = (patient: any) => {
    setSelectedPatientForConsultation({
      id: patient.id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      dateOfBirth: patient.dateOfBirth,
      nhsNumber: patient.nhsNumber,
      medicalHistory: patient.medicalHistory?.chronicConditions || [],
      allergies: patient.medicalHistory?.allergies || [],
      currentMedications: patient.medicalHistory?.currentMedications || []
    });
    setShowConsultation(true);
  };
  
  const { data: patients, isLoading, error } = useQuery<Patient[]>({
    queryKey: ["/api/patients", { limit: 100 }],
  });

  const filteredPatients = patients?.filter(patient => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
    const patientId = patient.patientId.toLowerCase();
    const email = patient.email?.toLowerCase() || "";
    const phone = patient.phone || "";
    const nhsNumber = patient.nhsNumber || "";
    
    return (
      fullName.includes(query) ||
      patientId.includes(query) ||
      email.includes(query) ||
      phone.includes(query) ||
      nhsNumber.includes(query)
    );
  }) || [];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-neutral-600">
            Unable to load patient data. Please try again later.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>All Patients ({patients?.length || 0})</CardTitle>
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              placeholder="Search by name, ID, email, phone, or NHS number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredPatients.length === 0 ? (
          <div className="text-center py-12">
            {searchQuery ? (
              <>
                <Search className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
                <p className="text-neutral-600">No patients found matching "{searchQuery}"</p>
                <p className="text-sm text-neutral-500 mt-2">
                  Try adjusting your search terms or browse all patients.
                </p>
              </>
            ) : (
              <>
                <FileText className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
                <p className="text-neutral-600">No patients found.</p>
                <p className="text-sm text-neutral-500 mt-2">
                  Add your first patient to get started.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="medical-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Age</th>
                  <th>Contact</th>
                  <th>Primary Condition</th>
                  <th>Risk Level</th>
                  <th>Last Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((patient) => {
                  const age = calculateAge(patient.dateOfBirth);
                  const primaryCondition = patient.medicalHistory.chronicConditions?.[0];
                  
                  return (
                    <tr key={patient.id} className="hover:bg-neutral-50">
                      <td className="py-4">
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarContent className="bg-blue-100 text-medical-blue font-semibold">
                              {getPatientInitials(patient.firstName, patient.lastName)}
                            </AvatarContent>
                            <AvatarFallback>
                              {getPatientInitials(patient.firstName, patient.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-gray-900">
                              {patient.firstName} {patient.lastName}
                            </p>
                            <p className="text-sm text-neutral-600">
                              ID: {patient.patientId}
                            </p>
                            {patient.nhsNumber && (
                              <p className="text-xs text-neutral-500">
                                NHS: {patient.nhsNumber}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 text-sm text-neutral-600">
                        {age} years
                        <br />
                        <span className="text-xs text-neutral-500">
                          {formatDate(patient.dateOfBirth)}
                        </span>
                      </td>
                      <td className="py-4 text-sm text-neutral-600">
                        {patient.email && (
                          <div className="mb-1">{patient.email}</div>
                        )}
                        {patient.phone && (
                          <div className="text-xs">{patient.phone}</div>
                        )}
                        {!patient.email && !patient.phone && (
                          <span className="text-neutral-400">No contact info</span>
                        )}
                      </td>
                      <td className="py-4">
                        {primaryCondition ? (
                          <Badge 
                            variant="secondary" 
                            className={getConditionColor(primaryCondition)}
                          >
                            {primaryCondition}
                          </Badge>
                        ) : (
                          <span className="text-sm text-neutral-500">No conditions</span>
                        )}
                      </td>
                      <td className="py-4">
                        <Badge 
                          variant="secondary"
                          className={getRiskLevelColor(patient.riskLevel)}
                        >
                          {patient.riskLevel.charAt(0).toUpperCase() + patient.riskLevel.slice(1)}
                        </Badge>
                      </td>
                      <td className="py-4 text-sm text-neutral-600">
                        {formatDate(patient.updatedAt)}
                      </td>
                      <td className="py-4">
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-medical-blue hover:text-blue-700"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-medical-green hover:text-green-700"
                          >
                            <Calendar className="h-4 w-4 mr-1" />
                            Book
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
      
      {/* Consultation Dialog */}
      <ConsultationDialog
        open={showConsultation}
        onOpenChange={setShowConsultation}
        patient={selectedPatientForConsultation}
      />
    </Card>
  );
}
