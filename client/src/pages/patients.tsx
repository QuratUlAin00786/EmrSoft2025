import { useState } from "react";
import { Header } from "@/components/layout/header";
import { PatientList } from "@/components/patients/patient-list";
import { PatientModal } from "@/components/patients/patient-modal";
import ConsultationNotes from "@/components/medical/consultation-notes";
import PatientFamilyHistory from "@/components/patients/patient-family-history";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";

export default function Patients() {
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);

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
            className="bg-medical-blue hover:bg-blue-700"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add Patient
          </Button>
        </div>

        <PatientList />
      </div>

      <PatientModal 
        open={showPatientModal}
        onOpenChange={setShowPatientModal}
      />
    </>
  );
}
