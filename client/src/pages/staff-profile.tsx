import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarContent, AvatarFallback } from "@/components/ui/avatar";
import { Stethoscope, Mail, Phone, MapPin, Calendar, Clock, User, Building } from "lucide-react";
import type { User as StaffMember } from "@/types";

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

const departmentColors: Record<string, string> = {
  "Cardiology": "bg-red-100 text-red-800",
  "General Medicine": "bg-blue-100 text-blue-800",
  "Pediatrics": "bg-green-100 text-green-800",
  "Orthopedics": "bg-orange-100 text-orange-800",
  "Neurology": "bg-purple-100 text-purple-800",
  "Dermatology": "bg-pink-100 text-pink-800",
  "Psychiatry": "bg-indigo-100 text-indigo-800",
  "Surgery": "bg-gray-100 text-gray-800",
  "Emergency": "bg-yellow-100 text-yellow-800",
  "Administration": "bg-teal-100 text-teal-800",
};

const roleColors: Record<string, string> = {
  "doctor": "bg-blue-100 text-blue-800",
  "nurse": "bg-green-100 text-green-800",
  "admin": "bg-purple-100 text-purple-800",
  "receptionist": "bg-orange-100 text-orange-800",
};

export default function StaffProfile() {
  const [match, params] = useRoute("/staff/:id");
  const staffId = params?.id;

  const { data: staffMember, isLoading, error } = useQuery({
    queryKey: ["/api/medical-staff", staffId],
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
      console.log('Medical Staff Data:', data);
      console.log('Looking for Staff ID:', staffId);
      const foundStaff = data.find((staff: StaffMember) => staff.id.toString() === staffId);
      console.log('Found Staff Member:', foundStaff);
      return foundStaff;
    },
    enabled: !!staffId,
  });

  if (isLoading) {
    return (
      <>
        <Header title="Staff Profile" subtitle="Loading staff member details..." />
        <div className="flex-1 overflow-auto p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-32 bg-gray-200 rounded mb-6"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </>
    );
  }

  if (error || !staffMember) {
    return (
      <>
        <Header title="Staff Profile" subtitle="Staff member not found" />
        <div className="flex-1 overflow-auto p-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <User className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Staff member not found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  The requested staff member could not be found.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Header 
        title={`${staffMember.firstName} ${staffMember.lastName}`} 
        subtitle="Staff Profile & Information" 
      />
      
      <div className="flex-1 overflow-auto p-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Profile Overview */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <Avatar className="mx-auto h-24 w-24 mb-4">
                    <AvatarContent>
                      {staffMember.profileImageUrl ? (
                        <img src={staffMember.profileImageUrl} alt="Profile" className="object-cover" />
                      ) : (
                        <div className="flex items-center justify-center h-full w-full bg-gradient-to-br from-blue-500 to-purple-600 text-white text-lg font-semibold">
                          {getInitials(staffMember.firstName, staffMember.lastName)}
                        </div>
                      )}
                    </AvatarContent>
                    <AvatarFallback>
                      {getInitials(staffMember.firstName, staffMember.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <h2 className="text-xl font-semibold text-gray-900">
                    {staffMember.firstName} {staffMember.lastName}
                  </h2>
                  
                  <div className="flex justify-center gap-2 mt-2">
                    <Badge className={roleColors[staffMember.role] || "bg-gray-100 text-gray-800"}>
                      {staffMember.role.charAt(0).toUpperCase() + staffMember.role.slice(1)}
                    </Badge>
                  </div>

                  {staffMember.department && (
                    <div className="mt-3">
                      <Badge 
                        variant="outline" 
                        className={departmentColors[staffMember.department as keyof typeof departmentColors] || "bg-gray-100 text-gray-800"}
                      >
                        <MapPin className="h-3 w-3 mr-1" />
                        {staffMember.department}
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact Information & Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Email</p>
                    <p className="text-sm text-gray-600">{staffMember.email}</p>
                  </div>
                </div>
                
                {staffMember.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Phone</p>
                      <p className="text-sm text-gray-600">{staffMember.phone}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Professional Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Role</p>
                    <p className="text-sm text-gray-600 capitalize">{staffMember.role}</p>
                  </div>
                  
                  {staffMember.department && (
                    <div>
                      <p className="text-sm font-medium text-gray-900">Department</p>
                      <p className="text-sm text-gray-600">{staffMember.department}</p>
                    </div>
                  )}
                  
                  <div>
                    <p className="text-sm font-medium text-gray-900">Staff ID</p>
                    <p className="text-sm text-gray-600">ID-{staffMember.id}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-900">Status</p>
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {staffMember.role === 'doctor' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Stethoscope className="h-5 w-5" />
                    Medical Practice
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Specialization</p>
                      <p className="text-sm text-gray-600">{staffMember.department || 'General Medicine'}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-900">Experience</p>
                      <p className="text-sm text-gray-600">5+ years</p>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-900 mb-2">Clinical Interests</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">Patient Care</Badge>
                      <Badge variant="outline">Preventive Medicine</Badge>
                      <Badge variant="outline">Clinical Research</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
}