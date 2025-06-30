import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarContent, AvatarFallback } from "@/components/ui/avatar";
import { Stethoscope, User, Calendar, Clock, MapPin } from "lucide-react";
import { useLocation } from "wouter";
import type { User as Doctor } from "@/types";

interface DoctorListProps {
  onSelectDoctor?: (doctor: Doctor) => void;
  showAppointmentButton?: boolean;
}

const departmentColors = {
  "Cardiology": "bg-red-100 text-red-800",
  "General Medicine": "bg-blue-100 text-blue-800",
  "Pediatrics": "bg-green-100 text-green-800",
  "Orthopedics": "bg-purple-100 text-purple-800",
  "Neurology": "bg-indigo-100 text-indigo-800",
  "Dermatology": "bg-yellow-100 text-yellow-800",
  "Psychiatry": "bg-pink-100 text-pink-800",
  "Surgery": "bg-gray-100 text-gray-800",
  "Emergency": "bg-orange-100 text-orange-800",
  "Administration": "bg-slate-100 text-slate-800"
};

const roleColors = {
  "doctor": "bg-blue-100 text-blue-800",
  "nurse": "bg-green-100 text-green-800",
  "admin": "bg-purple-100 text-purple-800",
  "receptionist": "bg-orange-100 text-orange-800"
};

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function DoctorList({ onSelectDoctor, showAppointmentButton = false }: DoctorListProps) {
  const [, setLocation] = useLocation();
  
  const { data: medicalStaff = [], isLoading, error } = useQuery({
    queryKey: ["/api/medical-staff"],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'X-Tenant-Subdomain': 'demo'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch("/api/medical-staff", {
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    },
    enabled: true,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (medicalStaff.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Medical Staff
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No medical staff found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Stethoscope className="h-5 w-5" />
          Medical Staff ({medicalStaff.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {medicalStaff.map((doctor: Doctor) => (
            <div 
              key={doctor.id} 
              className="flex items-start justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => onSelectDoctor?.(doctor)}
            >
              <div className="flex items-start gap-3 flex-1">
                <Avatar>
                  <AvatarFallback className="bg-blue-100 text-blue-700">
                    {getInitials(doctor.firstName, doctor.lastName)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900">
                      Dr. {doctor.firstName} {doctor.lastName}
                    </h4>
                    <Badge className={roleColors[doctor.role] || "bg-gray-100 text-gray-800"}>
                      {doctor.role}
                    </Badge>
                  </div>
                  
                  {doctor.department && (
                    <div className="flex items-center gap-1 mb-2">
                      <MapPin className="h-3 w-3 text-gray-400" />
                      <Badge 
                        variant="outline" 
                        className={departmentColors[doctor.department as keyof typeof departmentColors] || "bg-gray-100 text-gray-800"}
                      >
                        {doctor.department}
                      </Badge>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      ID: {doctor.id}
                    </span>
                    {doctor.lastLoginAt && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Last active: {new Date(doctor.lastLoginAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                {showAppointmentButton && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log("Book appointment with", doctor.firstName, doctor.lastName);
                      if (onSelectDoctor) {
                        onSelectDoctor(doctor);
                      }
                    }}
                  >
                    <Calendar className="h-3 w-3 mr-1" />
                    Book
                  </Button>
                )}
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLocation(`/staff/${doctor.id}`);
                  }}
                >
                  View Profile
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}