import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  Settings, 
  Users, 
  Clock, 
  DollarSign, 
  FileText, 
  Calendar,
  UserCog,
  Pill,
  FlaskConical,
  Receipt,
  Video,
  MessageSquare,
  Shield,
  AlertCircle,
  CheckCircle
} from "lucide-react";

// Import screenshots
import roleScreenshot from "@assets/image_1762015428276.png";
import shiftsScreenshot from "@assets/image_1762015503569.png";
import billingScreenshot from "@assets/image_1762015541888.png";
import documentScreenshot1 from "@assets/image_1762015587315.png";
import documentScreenshot2 from "@assets/image_1762015622239.png";
import documentScreenshot3 from "@assets/image_1762015666990.png";

export default function UserManual() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <Header title="User Manual" />
      
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Hospital Management System - User Manual
            </h1>
          </div>
          <p className="text-muted-foreground">
            Version 1.0 • Comprehensive guide for hospital administration, IT staff, and clinical users
          </p>
        </div>

        <Tabs defaultValue="setup" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 mb-6">
            <TabsTrigger value="setup" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Initial Setup
            </TabsTrigger>
            <TabsTrigger value="roles" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Roles
            </TabsTrigger>
            <TabsTrigger value="shifts" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Shifts
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Billing
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="features" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Features
            </TabsTrigger>
          </TabsList>

          {/* Initial Setup Tab */}
          <TabsContent value="setup">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  System Overview & Initial Setup
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-6">
                    <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                        <div>
                          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Important - Complete Setup First</h3>
                          <p className="text-sm text-blue-800 dark:text-blue-200">
                            Before beginning patient registration, appointments, or billing, four key configurations must be completed:
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="bg-primary/10 p-2 rounded">
                            <Shield className="h-5 w-5 text-primary" />
                          </div>
                          <h4 className="font-semibold">1. Create Role Permissions</h4>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Define user roles and assign access levels for data security
                        </p>
                      </div>

                      <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="bg-primary/10 p-2 rounded">
                            <Clock className="h-5 w-5 text-primary" />
                          </div>
                          <h4 className="font-semibold">2. Create Shifts</h4>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Define default and custom work hours for staff
                        </p>
                      </div>

                      <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="bg-primary/10 p-2 rounded">
                            <DollarSign className="h-5 w-5 text-primary" />
                          </div>
                          <h4 className="font-semibold">3. Define Fees & Charges</h4>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Set doctors' fees and departmental charges
                        </p>
                      </div>

                      <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="bg-primary/10 p-2 rounded">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                          <h4 className="font-semibold">4. Create Header & Footer</h4>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Customize branding for PDF documents
                        </p>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        System Workflow Summary
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-border">
                          <thead>
                            <tr className="bg-muted">
                              <th className="border border-border p-3 text-left">Step</th>
                              <th className="border border-border p-3 text-left">Task</th>
                              <th className="border border-border p-3 text-left">Responsible Role</th>
                              <th className="border border-border p-3 text-left">Module</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="border border-border p-3">1</td>
                              <td className="border border-border p-3">Create roles and assign permissions</td>
                              <td className="border border-border p-3"><Badge>Administrator</Badge></td>
                              <td className="border border-border p-3">User Management</td>
                            </tr>
                            <tr>
                              <td className="border border-border p-3">2</td>
                              <td className="border border-border p-3">Create default/custom shifts</td>
                              <td className="border border-border p-3"><Badge variant="secondary">HR / Admin</Badge></td>
                              <td className="border border-border p-3">Shift Management</td>
                            </tr>
                            <tr>
                              <td className="border border-border p-3">3</td>
                              <td className="border border-border p-3">Set fees and service charges</td>
                              <td className="border border-border p-3"><Badge variant="outline">Finance / Admin</Badge></td>
                              <td className="border border-border p-3">Billing Setup</td>
                            </tr>
                            <tr>
                              <td className="border border-border p-3">4</td>
                              <td className="border border-border p-3">Create header and footer templates</td>
                              <td className="border border-border p-3"><Badge>Admin / IT</Badge></td>
                              <td className="border border-border p-3">Document Templates</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Roles Tab */}
          <TabsContent value="roles">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Create Role Permissions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-semibold mb-2">Objective</h3>
                      <p className="text-muted-foreground">
                        Define user roles and assign access levels to ensure data security and controlled access to features.
                      </p>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <UserCog className="h-5 w-5 text-primary" />
                        Steps to Create Roles
                      </h3>
                      <ol className="space-y-4 list-decimal list-inside">
                        <li className="text-sm">
                          <span className="font-semibold">Navigate:</span>
                          <div className="ml-6 mt-1 p-3 bg-muted rounded-lg font-mono text-xs">
                            Admin Dashboard → User Management → Roles & Permissions
                          </div>
                        </li>
                        
                        <li className="text-sm">
                          <span className="font-semibold">Create New Role:</span>
                          <ul className="ml-6 mt-2 space-y-2">
                            <li className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                              Click "Add Role"
                            </li>
                            <li className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                              Enter Role Name (e.g., Doctor, Nurse, Receptionist, Lab Technician, Administrator)
                            </li>
                            <li className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                              Add Description (optional)
                            </li>
                          </ul>
                        </li>

                        <li className="text-sm">
                          <span className="font-semibold">Assign Permissions:</span>
                          <ul className="ml-6 mt-2 space-y-2">
                            <li className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                              Select allowed modules (Patient Registration, Billing, Reports, Settings)
                            </li>
                            <li className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                              Choose Read / Write / Edit / Delete privileges for each module
                            </li>
                          </ul>
                        </li>

                        <li className="text-sm">
                          <span className="font-semibold">Save Role:</span>
                          <div className="ml-6 mt-1">
                            Click "Save" — The role will now appear in the list
                          </div>
                        </li>

                        <li className="text-sm">
                          <span className="font-semibold">Assign Role to Users:</span>
                          <div className="ml-6 mt-1 p-3 bg-muted rounded-lg font-mono text-xs">
                            User List → Select user → Choose role → Save
                          </div>
                        </li>
                      </ol>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="font-semibold mb-3">Example Roles</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-border">
                          <thead>
                            <tr className="bg-muted">
                              <th className="border border-border p-3 text-left">Role</th>
                              <th className="border border-border p-3 text-left">Access Modules</th>
                              <th className="border border-border p-3 text-left">Description</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="border border-border p-3"><Badge>Administrator</Badge></td>
                              <td className="border border-border p-3">All modules</td>
                              <td className="border border-border p-3">Full access & system configuration</td>
                            </tr>
                            <tr>
                              <td className="border border-border p-3"><Badge variant="secondary">Doctor</Badge></td>
                              <td className="border border-border p-3">Patients, Appointments, Prescriptions, Reports</td>
                              <td className="border border-border p-3">Clinical access only</td>
                            </tr>
                            <tr>
                              <td className="border border-border p-3"><Badge variant="outline">Receptionist</Badge></td>
                              <td className="border border-border p-3">Appointments, Billing, Patient Registration</td>
                              <td className="border border-border p-3">Front-desk operations</td>
                            </tr>
                            <tr>
                              <td className="border border-border p-3"><Badge variant="destructive">Lab Technician</Badge></td>
                              <td className="border border-border p-3">Lab Requests, Lab Results</td>
                              <td className="border border-border p-3">Diagnostic data entry</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="font-semibold mb-3">Screenshot: Create New Role Interface</h3>
                      <div className="border rounded-lg overflow-hidden shadow-lg">
                        <img 
                          src={roleScreenshot} 
                          alt="Create New Role Dialog showing role name, display name, description, and module permissions matrix" 
                          className="w-full h-auto"
                          data-testid="img-role-screenshot"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        Example: Creating an Administrator role with full system permissions including Dashboard, Patients, Appointments, Medical Records, Prescriptions, and more.
                      </p>
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Shifts Tab */}
          <TabsContent value="shifts">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Create Shifts (Default and Custom)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-semibold mb-2">Objective</h3>
                      <p className="text-muted-foreground">
                        Define work hours for doctors, nurses, and support staff.
                      </p>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="font-semibold mb-3">Steps to Create Shifts</h3>
                      <ol className="space-y-4 list-decimal list-inside">
                        <li className="text-sm">
                          <span className="font-semibold">Navigate:</span>
                          <div className="ml-6 mt-1 p-3 bg-muted rounded-lg font-mono text-xs">
                            Admin Dashboard → Human Resources → Shifts Management
                          </div>
                        </li>

                        <li className="text-sm">
                          <span className="font-semibold">Create Default Shifts:</span>
                          <div className="ml-6 mt-2 space-y-3">
                            <div className="p-3 border rounded-lg">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium">Morning Shift</span>
                                <Badge>08:00 AM - 02:00 PM</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">Mark as Default</p>
                            </div>
                            
                            <div className="p-3 border rounded-lg">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium">Evening Shift</span>
                                <Badge variant="secondary">02:00 PM - 08:00 PM</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">Mark as Default</p>
                            </div>
                            
                            <div className="p-3 border rounded-lg">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium">Night Shift</span>
                                <Badge variant="outline">08:00 PM - 08:00 AM</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">Mark as Default</p>
                            </div>
                          </div>
                        </li>

                        <li className="text-sm">
                          <span className="font-semibold">Create Custom Shifts (if needed):</span>
                          <ul className="ml-6 mt-2 space-y-2">
                            <li className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                              For specific departments (e.g., ICU, Emergency)
                            </li>
                            <li className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                              Click "Add Custom Shift"
                            </li>
                            <li className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                              Define time, assign to department or user group
                            </li>
                          </ul>
                        </li>

                        <li className="text-sm">
                          <span className="font-semibold">Save & Assign:</span>
                          <div className="ml-6 mt-1">
                            Assign shifts to users or departments
                          </div>
                        </li>
                      </ol>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                        <div>
                          <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-1">Note</h4>
                          <p className="text-sm text-amber-800 dark:text-amber-200">
                            Custom shifts override default shifts for assigned users.
                          </p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="font-semibold mb-3">Screenshot: Shifts Management Interface</h3>
                      <div className="border rounded-lg overflow-hidden shadow-lg">
                        <img 
                          src={shiftsScreenshot} 
                          alt="Shifts Management showing default shifts with staff members and their working hours across different days" 
                          className="w-full h-auto"
                          data-testid="img-shifts-screenshot"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        Example: Default shifts view showing multiple staff members (James Administrator, Paul Smith, Emma Johnson, etc.) with their assigned working hours and days of the week.
                      </p>
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Doctors' Fees, Lab, and Imaging Charges
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-semibold mb-2">Objective</h3>
                      <p className="text-muted-foreground">
                        Set standard fees for doctors and diagnostic services.
                      </p>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="font-semibold mb-3">Steps to Configure Billing</h3>
                      <ol className="space-y-4 list-decimal list-inside">
                        <li className="text-sm">
                          <span className="font-semibold">Navigate:</span>
                          <div className="ml-6 mt-1 p-3 bg-muted rounded-lg font-mono text-xs">
                            Finance / Billing → Service Charges Setup
                          </div>
                        </li>

                        <li className="text-sm">
                          <span className="font-semibold">Doctors' Fees:</span>
                          <ul className="ml-6 mt-2 space-y-2">
                            <li className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                              Click "Add New Doctor Fee"
                            </li>
                            <li className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                              Select Doctor from dropdown
                            </li>
                            <li className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                              Enter consultation fee (Initial Visit / Follow-Up)
                            </li>
                            <li className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                              Add notes (e.g., procedure charges, specializations)
                            </li>
                          </ul>
                        </li>

                        <li className="text-sm">
                          <span className="font-semibold">Lab Results Fees:</span>
                          <ul className="ml-6 mt-2 space-y-2">
                            <li className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                              Go to Lab Tests Setup
                            </li>
                            <li className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                              Select test (e.g., CBC, Lipid Profile, Liver Function Test)
                            </li>
                            <li className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                              Enter charge amount and sample type
                            </li>
                          </ul>
                        </li>

                        <li className="text-sm">
                          <span className="font-semibold">Imaging Charges:</span>
                          <ul className="ml-6 mt-2 space-y-2">
                            <li className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                              Go to Imaging / Radiology Setup
                            </li>
                            <li className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                              Select test (e.g., X-Ray, MRI, Ultrasound)
                            </li>
                            <li className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                              Enter standard charge
                            </li>
                          </ul>
                        </li>

                        <li className="text-sm">
                          <span className="font-semibold">Save & Review:</span>
                          <div className="ml-6 mt-1">
                            All charges appear in the billing module automatically
                          </div>
                        </li>
                      </ol>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="font-semibold mb-3">Screenshot: Billing & Pricing Management</h3>
                      <div className="border rounded-lg overflow-hidden shadow-lg">
                        <img 
                          src={billingScreenshot} 
                          alt="Billing & Payments interface showing pricing management for doctors' fees with service codes and pricing" 
                          className="w-full h-auto"
                          data-testid="img-billing-screenshot"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        Example: Pricing Management showing Doctors Fee Pricing with various consultation types (Procedure Consultation, Home Visit, Emergency Visit, Teleconsultation, Follow-up Visit, etc.) with their respective codes, categories, and prices in GBP.
                      </p>
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Create Header & Footer for PDF Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-semibold mb-2">Objective</h3>
                      <p className="text-muted-foreground">
                        Customize branding for all printed and digital documents.
                      </p>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="font-semibold mb-3">Steps to Configure Document Templates</h3>
                      <ol className="space-y-4 list-decimal list-inside">
                        <li className="text-sm">
                          <span className="font-semibold">Navigate:</span>
                          <div className="ml-6 mt-1 p-3 bg-muted rounded-lg font-mono text-xs">
                            Settings → Document Templates → Header & Footer Configuration
                          </div>
                        </li>

                        <li className="text-sm">
                          <span className="font-semibold">Header Setup:</span>
                          <ul className="ml-6 mt-2 space-y-2">
                            <li className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                              Upload hospital logo (PNG/JPG)
                            </li>
                            <li className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                              Enter hospital name, address, contact info
                            </li>
                            <li className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                              Add tagline (optional)
                            </li>
                          </ul>
                        </li>

                        <li className="text-sm">
                          <span className="font-semibold">Footer Setup:</span>
                          <ul className="ml-6 mt-2 space-y-2">
                            <li className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                              Add legal disclaimer, website, or additional contact info
                            </li>
                            <li className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                              Option to include page number, date/time, and digital signature field
                            </li>
                          </ul>
                        </li>

                        <li className="text-sm">
                          <span className="font-semibold">Apply to Documents:</span>
                          <div className="ml-6 mt-2">
                            <p className="mb-2">Select applicable templates:</p>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="flex items-center gap-2 p-2 border rounded">
                                <Pill className="h-4 w-4 text-primary" />
                                <span className="text-xs">Prescriptions</span>
                              </div>
                              <div className="flex items-center gap-2 p-2 border rounded">
                                <FlaskConical className="h-4 w-4 text-primary" />
                                <span className="text-xs">Lab Results</span>
                              </div>
                              <div className="flex items-center gap-2 p-2 border rounded">
                                <FileText className="h-4 w-4 text-primary" />
                                <span className="text-xs">Imaging Reports</span>
                              </div>
                              <div className="flex items-center gap-2 p-2 border rounded">
                                <Receipt className="h-4 w-4 text-primary" />
                                <span className="text-xs">Invoices</span>
                              </div>
                              <div className="flex items-center gap-2 p-2 border rounded col-span-2">
                                <FileText className="h-4 w-4 text-primary" />
                                <span className="text-xs">Discharge Summaries</span>
                              </div>
                            </div>
                          </div>
                        </li>

                        <li className="text-sm">
                          <span className="font-semibold">Save & Preview:</span>
                          <ul className="ml-6 mt-2 space-y-2">
                            <li className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                              Click "Preview PDF" to verify layout
                            </li>
                            <li className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                              Save final configuration
                            </li>
                          </ul>
                        </li>
                      </ol>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="font-semibold mb-3">Screenshot 1: Create Clinic Information</h3>
                      <div className="border rounded-lg overflow-hidden shadow-lg">
                        <img 
                          src={documentScreenshot1} 
                          alt="Create Clinic Information dialog showing header design, clinic logo upload, and header information fields" 
                          className="w-full h-auto"
                          data-testid="img-document-screenshot-1"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        Step 1: Upload clinic logo and configure header information including clinic name, address, phone, email, and website. Customize font family, font size, and text styling options.
                      </p>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="font-semibold mb-3">Screenshot 2: Saved Clinic Header & Footer</h3>
                      <div className="border rounded-lg overflow-hidden shadow-lg">
                        <img 
                          src={documentScreenshot2} 
                          alt="Saved Clinic Information showing preview of clinic header with logo and footer with copyright text" 
                          className="w-full h-auto"
                          data-testid="img-document-screenshot-2"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        Step 2: Preview of saved clinic header showing "Clinical Care Hospital" with contact details and saved footer displaying "© 2025 CuraCare Hospital — All Rights Reserved" for use in all PDF documents.
                      </p>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="font-semibold mb-3">Screenshot 3: Document Editor with Header/Footer Options</h3>
                      <div className="border rounded-lg overflow-hidden shadow-lg">
                        <img 
                          src={documentScreenshot3} 
                          alt="Forms interface showing document editor with options to create clinic information, view custom clinic information, and manage clinical headers" 
                          className="w-full h-auto"
                          data-testid="img-document-screenshot-3"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        Step 3: Document editor toolbar showing "Create Clinic Information", "View Custom Clinic Information", "Clinical Header", and "View Saved Templates" options for managing document templates and branding across all forms and reports.
                      </p>
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Features Tab */}
          <TabsContent value="features">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  System Features Guide
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-6">
                    <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                        <div>
                          <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">Post-Setup Checklist</h3>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <input type="checkbox" className="h-4 w-4" data-testid="checkbox-roles" />
                              <span className="text-sm text-green-800 dark:text-green-200">Roles & Permissions configured</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <input type="checkbox" className="h-4 w-4" data-testid="checkbox-shifts" />
                              <span className="text-sm text-green-800 dark:text-green-200">Shifts created & assigned</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <input type="checkbox" className="h-4 w-4" data-testid="checkbox-fees" />
                              <span className="text-sm text-green-800 dark:text-green-200">Fees and charges set</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <input type="checkbox" className="h-4 w-4" data-testid="checkbox-templates" />
                              <span className="text-sm text-green-800 dark:text-green-200">PDF templates customized</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-lg font-semibold mb-3">Next Steps - Using the System</h3>
                      <p className="text-muted-foreground mb-4">
                        After setup, users can proceed with:
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg">
                              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h4 className="font-semibold">Patient Registration</h4>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Register new patients, manage patient records, and update demographic information
                          </p>
                        </div>

                        <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="bg-purple-100 dark:bg-purple-900 p-2 rounded-lg">
                              <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <h4 className="font-semibold">Appointments Scheduling</h4>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Schedule, reschedule, and manage patient appointments with doctors
                          </p>
                        </div>

                        <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="bg-green-100 dark:bg-green-900 p-2 rounded-lg">
                              <Receipt className="h-5 w-5 text-green-600 dark:text-green-400" />
                            </div>
                            <h4 className="font-semibold">Billing and Payments</h4>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Process invoices, manage payments, and track billing records
                          </p>
                        </div>

                        <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="bg-orange-100 dark:bg-orange-900 p-2 rounded-lg">
                              <FlaskConical className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                            </div>
                            <h4 className="font-semibold">Lab / Imaging Orders</h4>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Create lab test orders, request imaging studies, and manage results
                          </p>
                        </div>

                        <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="bg-indigo-100 dark:bg-indigo-900 p-2 rounded-lg">
                              <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <h4 className="font-semibold">Report Generation</h4>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Generate comprehensive reports for analysis and compliance
                          </p>
                        </div>

                        <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="bg-pink-100 dark:bg-pink-900 p-2 rounded-lg">
                              <Pill className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                            </div>
                            <h4 className="font-semibold">Prescriptions</h4>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Create and manage electronic prescriptions with e-signature
                          </p>
                        </div>

                        <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="bg-teal-100 dark:bg-teal-900 p-2 rounded-lg">
                              <Video className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                            </div>
                            <h4 className="font-semibold">Telemedicine</h4>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Conduct virtual consultations with video conferencing
                          </p>
                        </div>

                        <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="bg-cyan-100 dark:bg-cyan-900 p-2 rounded-lg">
                              <MessageSquare className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                            </div>
                            <h4 className="font-semibold">Messaging</h4>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Send SMS and WhatsApp messages to patients for reminders
                          </p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Need Help?</h4>
                      <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                        For additional support, please contact your system administrator or IT support team.
                      </p>
                      <div className="text-sm text-blue-800 dark:text-blue-200">
                        <p>📧 Email: support@curaemr.ai</p>
                        <p>📞 Phone: +44 (0) 121 XXX XXXX</p>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
