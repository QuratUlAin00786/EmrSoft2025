import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarContent, AvatarFallback } from "@/components/ui/avatar";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import type { Patient } from "@/types";

function getPatientInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return "1 week ago";
  return date.toLocaleDateString();
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
  if (lowerCondition.includes("hypertension")) return "bg-green-100 text-green-800";
  if (lowerCondition.includes("pain")) return "bg-blue-100 text-blue-800";
  return "bg-gray-100 text-gray-800";
}

export function RecentPatients() {
  const { data: patients, isLoading, error } = useQuery<Patient[]>({
    queryKey: ["/api/patients", { limit: 10 }],
  });

  if (isLoading) {
    return (
      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Recent Patients
            <Button variant="link" size="sm">View All</Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Recent Patients
            <Button variant="link" size="sm">View All</Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-neutral-600 text-center py-8">
            Unable to load patient data. Please try again later.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!patients || patients.length === 0) {
    return (
      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Recent Patients
            <Button variant="link" size="sm">View All</Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-neutral-600 text-center py-8">
            No patients found.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="dashboard-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Recent Patients
          <Button variant="link" size="sm" className="text-medical-blue hover:text-blue-700">
            View All
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="medical-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Last Visit</th>
                <th>Condition</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {patients.slice(0, 5).map((patient) => {
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
                            ID: #{patient.patientId}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 text-sm text-neutral-600">
                      {formatDate(patient.updatedAt)}
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
                        {patient.riskLevel.charAt(0).toUpperCase() + patient.riskLevel.slice(1)} Risk
                      </Badge>
                    </td>
                    <td className="py-4">
                      <Button 
                        variant="link" 
                        size="sm"
                        className="p-0 h-auto text-medical-blue hover:text-blue-700"
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
