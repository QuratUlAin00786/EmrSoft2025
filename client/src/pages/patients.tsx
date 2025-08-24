import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Header } from "@/components/layout/header";
import { PatientList } from "@/components/patients/patient-list";
import { PatientModal } from "@/components/patients/patient-modal";
import ConsultationNotes from "@/components/medical/consultation-notes";
import PatientFamilyHistory from "@/components/patients/patient-family-history";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserPlus, ArrowLeft, FileText, Calendar, User } from "lucide-react";

export default function Patients() {
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const params = useParams();
  const [, setLocation] = useLocation();
  const patientId = params.id ? parseInt(params.id) : null;
  
  // State for patient data
  const [patient, setPatient] = useState<any>(null);
  const [patientLoading, setPatientLoading] = useState(false);

  // Fetch specific patient data if viewing records
  useEffect(() => {
    const fetchPatient = async () => {
      if (!patientId) return;
      
      try {
        setPatientLoading(true);
        console.log(`Fetching patient ${patientId} data...`);
        
        const token = localStorage.getItem('auth_token');
        const headers: Record<string, string> = {
          'X-Tenant-Subdomain': 'demo'
        };
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`/api/patients/${patientId}`, {
          headers,
          credentials: 'include'
        });
        
        console.log("Patient response status:", response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Fetched patient data:", data);
        setPatient(data);
      } catch (err) {
        console.error("Error fetching patient:", err);
        setPatient(null);
      } finally {
        setPatientLoading(false);
      }
    };

    fetchPatient();
  }, [patientId]);

  useEffect(() => {
    if (patient) {
      setSelectedPatient(patient);
    }
  }, [patient]);

  // Show loading state while fetching patient data
  if (patientId && patientLoading) {
    return (
      <>
        <Header 
          title="Loading Patient Records..." 
          subtitle="Please wait while we fetch the patient information."
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-medical-blue mx-auto mb-4"></div>
            <p className="text-gray-600">Loading patient data...</p>
          </div>
        </div>
      </>
    );
  }

  // If viewing specific patient records
  if (patientId && patient) {
    return (
      <>
        <Header 
          title={`Medical Records - ${patient.firstName} ${patient.lastName}`} 
          subtitle="Complete medical history and consultation notes."
        />
        
        <div className="flex-1 overflow-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={() => setLocation('/patients')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Patients
              </Button>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {patient.firstName} {patient.lastName} - Medical Records
                </h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-300">
                  Patient ID: {patient.patientId} • Age: {new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Patient Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Patient Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-white">Contact Information</p>
                  <p className="text-sm text-gray-600 dark:text-neutral-300">{patient.phone}</p>
                  <p className="text-sm text-gray-600 dark:text-neutral-300">{patient.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-white">Address</p>
                  <p className="text-sm text-gray-600 dark:text-neutral-300">
                    {patient.address?.street}, {patient.address?.city} {patient.address?.postcode}
                  </p>
                </div>
                {patient.medicalHistory?.chronicConditions && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-white">Chronic Conditions</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {patient.medicalHistory.chronicConditions.map((condition: string, index: number) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {condition}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {/* Display patient flags for quick reference */}
                {patient.flags && patient.flags.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-white">Patient Alerts</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {patient.flags.map((flag: string, index: number) => {
                        const [category, priority, description] = flag.split(':');
                        const priorityColor = priority === 'urgent' ? 'destructive' : 
                                            priority === 'high' ? 'default' : 'secondary';
                        return (
                          <Badge key={index} variant={priorityColor} className="text-xs">
                            {priority?.toUpperCase()}: {description || flag}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Medical Records */}
            <div className="lg:col-span-2">
              <ConsultationNotes 
                key={patient.id}
                patientId={patient.id} 
                patientName={`${patient.firstName} ${patient.lastName}`}
                patientNumber={patient.patientId}
              />
            </div>
          </div>

          <div className="mt-6">
            <PatientFamilyHistory 
              key={patient.id}
              patient={patient} 
              onUpdate={(updates) => {
                setSelectedPatient({ ...selectedPatient, ...updates });
              }} 
            />
          </div>
        </div>
      </>
    );
  }

  // Default patients list view
  return (
    <>
      <Header 
        title="Patients" 
        subtitle="Manage patient records and medical information."
      />
      
      <div className="flex-1 overflow-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Patient Records</h3>
            <p className="text-sm text-neutral-600">
              View and manage all patient information securely.
            </p>
          </div>
          <Button 
            onClick={() => setShowPatientModal(true)}
            className="text-white"
            style={{ backgroundColor: '#4A7DFF' }}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add Patient
          </Button>
        </div>

        <PatientList />
        
        {selectedPatient && (
          <div className="grid gap-6 lg:grid-cols-2 mt-6">
            <ConsultationNotes patientId={selectedPatient.id} />
            <PatientFamilyHistory 
              patient={selectedPatient} 
              onUpdate={(updates) => {
                setSelectedPatient({ ...selectedPatient, ...updates });
              }} 
            />
          </div>
        )}
      </div>

      <PatientModal 
        open={showPatientModal}
        onOpenChange={setShowPatientModal}
      />
    </>
  );
}
