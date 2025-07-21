import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/layout/header";
import { Shield, Check, X, Eye, Plus, Edit, Trash2 } from "lucide-react";

const ROLE_PERMISSIONS = {
  admin: {
    name: "Administrator",
    description: "Full system access including user management, settings, and all clinical modules",
    color: "bg-red-500",
    modules: {
      patients: { view: true, create: true, edit: true, delete: true },
      appointments: { view: true, create: true, edit: true, delete: true },
      medicalRecords: { view: true, create: true, edit: true, delete: true },
      prescriptions: { view: true, create: true, edit: true, delete: true },
      labResults: { view: true, create: true, edit: true, delete: true },
      medicalImaging: { view: true, create: true, edit: true, delete: true },
      billing: { view: true, create: true, edit: true, delete: true },
      analytics: { view: true, create: true, edit: true, delete: true },
      userManagement: { view: true, create: true, edit: true, delete: true },
      settings: { view: true, create: true, edit: true, delete: true },
      aiInsights: { view: true, create: true, edit: true, delete: true },
      messaging: { view: true, create: true, edit: true, delete: true },
      telemedicine: { view: true, create: true, edit: true, delete: true },
      populationHealth: { view: true, create: true, edit: true, delete: true },
      clinicalDecision: { view: true, create: true, edit: true, delete: true },
      voiceDocumentation: { view: true, create: true, edit: true, delete: true },
      forms: { view: true, create: true, edit: true, delete: true },
      integrations: { view: true, create: true, edit: true, delete: true },
      automation: { view: true, create: true, edit: true, delete: true },
      mobileHealth: { view: true, create: true, edit: true, delete: true }
    },
    fields: {
      patientSensitiveInfo: true,
      financialData: true,
      medicalHistory: true,
      prescriptionDetails: true,
      labResults: true,
      imagingResults: true,
      billingInformation: true,
      insuranceDetails: true
    }
  },
  doctor: {
    name: "Doctor",
    description: "Clinical access to patient records, appointments, prescriptions, and medical documentation",
    color: "bg-blue-500",
    modules: {
      patients: { view: true, create: true, edit: true, delete: false },
      appointments: { view: true, create: true, edit: true, delete: true },
      medicalRecords: { view: true, create: true, edit: true, delete: false },
      prescriptions: { view: true, create: true, edit: true, delete: true },
      labResults: { view: true, create: true, edit: true, delete: false },
      medicalImaging: { view: true, create: true, edit: true, delete: false },
      billing: { view: true, create: false, edit: false, delete: false },
      analytics: { view: true, create: false, edit: false, delete: false },
      userManagement: { view: false, create: false, edit: false, delete: false },
      settings: { view: false, create: false, edit: false, delete: false },
      aiInsights: { view: true, create: true, edit: true, delete: false },
      messaging: { view: true, create: true, edit: true, delete: false },
      telemedicine: { view: true, create: true, edit: true, delete: false },
      populationHealth: { view: true, create: false, edit: false, delete: false },
      clinicalDecision: { view: true, create: true, edit: true, delete: false },
      voiceDocumentation: { view: true, create: true, edit: true, delete: true },
      forms: { view: true, create: true, edit: true, delete: false },
      integrations: { view: false, create: false, edit: false, delete: false },
      automation: { view: true, create: false, edit: false, delete: false },
      mobileHealth: { view: true, create: false, edit: false, delete: false }
    },
    fields: {
      patientSensitiveInfo: true,
      financialData: false,
      medicalHistory: true,
      prescriptionDetails: true,
      labResults: true,
      imagingResults: true,
      billingInformation: false,
      insuranceDetails: false
    }
  },
  nurse: {
    name: "Nurse",
    description: "Patient care access including medical records, medications, and care coordination",
    color: "bg-green-500",
    modules: {
      patients: { view: true, create: false, edit: true, delete: false },
      appointments: { view: true, create: true, edit: true, delete: false },
      medicalRecords: { view: true, create: true, edit: true, delete: false },
      prescriptions: { view: true, create: false, edit: true, delete: false },
      labResults: { view: true, create: true, edit: true, delete: false },
      medicalImaging: { view: true, create: false, edit: false, delete: false },
      billing: { view: false, create: false, edit: false, delete: false },
      analytics: { view: true, create: false, edit: false, delete: false },
      userManagement: { view: false, create: false, edit: false, delete: false },
      settings: { view: false, create: false, edit: false, delete: false },
      aiInsights: { view: true, create: false, edit: false, delete: false },
      messaging: { view: true, create: true, edit: true, delete: false },
      telemedicine: { view: true, create: true, edit: true, delete: false },
      populationHealth: { view: true, create: false, edit: false, delete: false },
      clinicalDecision: { view: true, create: false, edit: false, delete: false },
      voiceDocumentation: { view: true, create: true, edit: true, delete: false },
      forms: { view: true, create: true, edit: true, delete: false },
      integrations: { view: false, create: false, edit: false, delete: false },
      automation: { view: false, create: false, edit: false, delete: false },
      mobileHealth: { view: true, create: false, edit: false, delete: false }
    },
    fields: {
      patientSensitiveInfo: true,
      financialData: false,
      medicalHistory: true,
      prescriptionDetails: true,
      labResults: true,
      imagingResults: true,
      billingInformation: false,
      insuranceDetails: false
    }
  },
  receptionist: {
    name: "Receptionist",
    description: "Limited access to patient information, appointments, and billing functions",
    color: "bg-purple-500",
    modules: {
      patients: { view: true, create: true, edit: true, delete: false },
      appointments: { view: true, create: true, edit: true, delete: false },
      medicalRecords: { view: false, create: false, edit: false, delete: false },
      prescriptions: { view: false, create: false, edit: false, delete: false },
      labResults: { view: false, create: false, edit: false, delete: false },
      medicalImaging: { view: false, create: false, edit: false, delete: false },
      billing: { view: true, create: true, edit: true, delete: false },
      analytics: { view: false, create: false, edit: false, delete: false },
      userManagement: { view: false, create: false, edit: false, delete: false },
      settings: { view: false, create: false, edit: false, delete: false },
      aiInsights: { view: false, create: false, edit: false, delete: false },
      messaging: { view: true, create: true, edit: true, delete: false },
      telemedicine: { view: false, create: false, edit: false, delete: false },
      populationHealth: { view: false, create: false, edit: false, delete: false },
      clinicalDecision: { view: false, create: false, edit: false, delete: false },
      voiceDocumentation: { view: false, create: false, edit: false, delete: false },
      forms: { view: true, create: true, edit: true, delete: false },
      integrations: { view: false, create: false, edit: false, delete: false },
      automation: { view: false, create: false, edit: false, delete: false },
      mobileHealth: { view: false, create: false, edit: false, delete: false }
    },
    fields: {
      patientSensitiveInfo: false,
      financialData: true,
      medicalHistory: false,
      prescriptionDetails: false,
      labResults: false,
      imagingResults: false,
      billingInformation: true,
      insuranceDetails: true
    }
  },
  patient: {
    name: "Patient",
    description: "Personal health record access including appointments, prescriptions, and medical history",
    color: "bg-orange-500",
    modules: {
      patients: { view: true, create: false, edit: true, delete: false },
      appointments: { view: true, create: true, edit: false, delete: false },
      medicalRecords: { view: true, create: false, edit: false, delete: false },
      prescriptions: { view: true, create: false, edit: false, delete: false },
      labResults: { view: true, create: false, edit: false, delete: false },
      medicalImaging: { view: true, create: false, edit: false, delete: false },
      billing: { view: true, create: false, edit: false, delete: false },
      analytics: { view: false, create: false, edit: false, delete: false },
      userManagement: { view: false, create: false, edit: false, delete: false },
      settings: { view: false, create: false, edit: false, delete: false },
      aiInsights: { view: true, create: false, edit: false, delete: false },
      messaging: { view: true, create: true, edit: false, delete: false },
      telemedicine: { view: true, create: true, edit: false, delete: false },
      populationHealth: { view: false, create: false, edit: false, delete: false },
      clinicalDecision: { view: false, create: false, edit: false, delete: false },
      voiceDocumentation: { view: true, create: true, edit: true, delete: true },
      forms: { view: true, create: false, edit: false, delete: false },
      integrations: { view: false, create: false, edit: false, delete: false },
      automation: { view: false, create: false, edit: false, delete: false },
      mobileHealth: { view: true, create: false, edit: false, delete: false }
    },
    fields: {
      patientSensitiveInfo: true,
      financialData: false,
      medicalHistory: true,
      prescriptionDetails: true,
      labResults: true,
      imagingResults: true,
      billingInformation: false,
      insuranceDetails: false
    }
  },
  sample_taker: {
    name: "Lab Technician",
    description: "Lab-focused access for sample collection, lab results, and basic patient information",
    color: "bg-teal-500",
    modules: {
      patients: { view: true, create: false, edit: false, delete: false },
      appointments: { view: true, create: false, edit: false, delete: false },
      medicalRecords: { view: false, create: false, edit: false, delete: false },
      prescriptions: { view: false, create: false, edit: false, delete: false },
      labResults: { view: true, create: true, edit: true, delete: false },
      medicalImaging: { view: false, create: false, edit: false, delete: false },
      billing: { view: false, create: false, edit: false, delete: false },
      analytics: { view: false, create: false, edit: false, delete: false },
      userManagement: { view: false, create: false, edit: false, delete: false },
      settings: { view: false, create: false, edit: false, delete: false },
      aiInsights: { view: false, create: false, edit: false, delete: false },
      messaging: { view: true, create: false, edit: false, delete: false },
      telemedicine: { view: false, create: false, edit: false, delete: false },
      populationHealth: { view: false, create: false, edit: false, delete: false },
      clinicalDecision: { view: false, create: false, edit: false, delete: false },
      voiceDocumentation: { view: false, create: false, edit: false, delete: false },
      forms: { view: false, create: false, edit: false, delete: false },
      integrations: { view: false, create: false, edit: false, delete: false },
      automation: { view: false, create: false, edit: false, delete: false },
      mobileHealth: { view: false, create: false, edit: false, delete: false }
    },
    fields: {
      patientSensitiveInfo: false,
      financialData: false,
      medicalHistory: false,
      prescriptionDetails: false,
      labResults: true,
      imagingResults: false,
      billingInformation: false,
      insuranceDetails: false
    }
  }
};

const ACTION_ICONS = {
  view: Eye,
  create: Plus,
  edit: Edit,
  delete: Trash2
};

export default function PermissionsReference() {
  const renderPermissionIcon = (hasPermission: boolean) => {
    return hasPermission ? (
      <Check className="h-4 w-4 text-green-600" />
    ) : (
      <X className="h-4 w-4 text-red-400" />
    );
  };

  return (
    <div className="space-y-6">
      <Header 
        title="Role Permissions Reference" 
        subtitle="Complete overview of access levels and permissions for each user role"
        icon={Shield}
      />

      <div className="grid gap-6">
        {Object.entries(ROLE_PERMISSIONS).map(([roleKey, role]) => (
          <Card key={roleKey} className="overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full ${role.color}`} />
                <div>
                  <CardTitle className="text-xl">{role.name}</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">{role.description}</p>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Module Permissions */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Module Access</h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {Object.entries(role.modules).map(([module, permissions]) => (
                    <div key={module} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm capitalize">
                          {module.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                      </div>
                      <div className="flex gap-4">
                        {Object.entries(permissions).map(([action, allowed]) => {
                          const Icon = ACTION_ICONS[action as keyof typeof ACTION_ICONS];
                          return (
                            <div key={action} className="flex items-center gap-1">
                              <Icon className="h-3 w-3 text-gray-500" />
                              <span className="text-xs text-gray-600 capitalize">{action}</span>
                              {renderPermissionIcon(allowed)}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Field Access Permissions */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Data Field Access</h4>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {Object.entries(role.fields).map(([field, allowed]) => (
                    <div key={field} className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm capitalize">
                        {field.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      {renderPermissionIcon(allowed)}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Permission Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-gray-500" />
              <span className="text-sm">View - Can see the data</span>
            </div>
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-gray-500" />
              <span className="text-sm">Create - Can add new items</span>
            </div>
            <div className="flex items-center gap-2">
              <Edit className="h-4 w-4 text-gray-500" />
              <span className="text-sm">Edit - Can modify existing items</span>
            </div>
            <div className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-gray-500" />
              <span className="text-sm">Delete - Can remove items</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}