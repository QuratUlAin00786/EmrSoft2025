import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Shield, FileText, Download, Trash2, AlertTriangle, CheckCircle, Clock, XCircle, Users, BarChart3, Eye, UserX } from "lucide-react";

// Form schemas
const consentSchema = z.object({
  patientId: z.number(),
  consentType: z.string().min(1, "Consent type is required"),
  legalBasis: z.string().min(1, "Legal basis is required"),
  purpose: z.string().min(1, "Purpose is required"),
  dataCategories: z.array(z.string()).optional(),
  processingDetails: z.string().optional(),
});

const dataRequestSchema = z.object({
  patientId: z.number(),
  requestType: z.enum(["access", "portability", "erasure", "rectification"]),
  description: z.string().min(1, "Description is required"),
  contactMethod: z.enum(["email", "postal", "phone"]),
  contactDetails: z.string().min(1, "Contact details are required"),
});

type ConsentForm = z.infer<typeof consentSchema>;
type DataRequestForm = z.infer<typeof dataRequestSchema>;

interface ConsentStatus {
  id: number;
  patientId: number;
  consentType: string;
  status: "granted" | "withdrawn" | "pending" | "expired";
  grantedAt?: Date;
  withdrawnAt?: Date;
  expiresAt?: Date;
  legalBasis: string;
  purpose: string;
}

interface ComplianceMetrics {
  totalDataRequests: number;
  pendingRequests: number;
  completedRequests: number;
  averageResponseTime: number;
  consentWithdrawalRate: number;
  dataBreachCount: number;
  complianceScore: number;
  lastAuditDate: Date;
  nextAuditDue: Date;
}

export default function GDPRCompliance() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedPatient, setSelectedPatient] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch patients
  const { data: patients = [] } = useQuery({
    queryKey: ["/api/patients"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/patients");
      return response.json();
    },
  });

  // Fetch compliance metrics
  const { data: metrics } = useQuery<ComplianceMetrics>({
    queryKey: ["/api/gdpr/compliance-report"],
    queryFn: () => apiRequest("GET", "/api/gdpr/compliance-report?period=monthly"),
  });

  // Forms
  const consentForm = useForm<ConsentForm>({
    resolver: zodResolver(consentSchema),
    defaultValues: {
      consentType: "",
      legalBasis: "",
      purpose: "",
      dataCategories: [],
      processingDetails: "",
    },
  });

  const dataRequestForm = useForm<DataRequestForm>({
    resolver: zodResolver(dataRequestSchema),
    defaultValues: {
      requestType: "access",
      description: "",
      contactMethod: "email",
      contactDetails: "",
    },
  });

  // Mutations
  const recordConsentMutation = useMutation({
    mutationFn: (data: ConsentForm) => apiRequest("POST", "/api/gdpr/consent", data),
    onSuccess: () => {
      toast({
        title: "Consent Recorded",
        description: "Patient consent has been successfully recorded.",
      });
      consentForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/gdpr"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to record consent. Please try again.",
        variant: "destructive",
      });
    },
  });

  const submitDataRequestMutation = useMutation({
    mutationFn: (data: DataRequestForm) => apiRequest("POST", "/api/gdpr/data-request", data),
    onSuccess: () => {
      toast({
        title: "Data Request Submitted",
        description: "GDPR data request has been successfully submitted.",
      });
      dataRequestForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/gdpr"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to submit data request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const withdrawConsentMutation = useMutation({
    mutationFn: ({ consentId, reason }: { consentId: number; reason: string }) =>
      apiRequest("PATCH", `/api/gdpr/consent/${consentId}/withdraw`, { reason }),
    onSuccess: () => {
      toast({
        title: "Consent Withdrawn",
        description: "Patient consent has been successfully withdrawn.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/gdpr"] });
    },
  });

  // Consent status query
  const { data: consentStatuses = [] } = useQuery<ConsentStatus[]>({
    queryKey: ["/api/gdpr/consent-status", selectedPatient],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/gdpr/patient/${selectedPatient}/consent-status`);
      return response.json();
    },
    enabled: !!selectedPatient,
  });

  const getStatusBadge = (status: string) => {
    const statusMap = {
      granted: { color: "bg-green-100 text-green-800", icon: CheckCircle },
      withdrawn: { color: "bg-red-100 text-red-800", icon: XCircle },
      pending: { color: "bg-yellow-100 text-yellow-800", icon: Clock },
      expired: { color: "bg-gray-100 text-gray-800", icon: AlertTriangle },
    };
    
    const config = statusMap[status as keyof typeof statusMap] || statusMap.pending;
    const Icon = config.icon;
    
    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const handleExportPatientData = async (patientId: number) => {
    try {
      const exportData = await apiRequest("GET", `/api/gdpr/patient/${patientId}/data-export?requestId=1`);
      
      // Create downloadable file
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement("a");
      link.href = url;
      link.download = `patient-data-export-${patientId}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Data Exported",
        description: "Patient data has been exported successfully.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export patient data.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">GDPR Compliance</h1>
          <p className="text-muted-foreground">
            Manage patient data compliance, consent, and data subject rights
          </p>
        </div>
        <Shield className="h-8 w-8 text-blue-600" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="consent">Consent Management</TabsTrigger>
          <TabsTrigger value="data-requests">Data Requests</TabsTrigger>
          <TabsTrigger value="patient-data">Patient Data</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.complianceScore || 0}%</div>
                <p className="text-xs text-muted-foreground">Overall GDPR compliance</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Data Requests</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.totalDataRequests || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {metrics?.pendingRequests || 0} pending
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Response Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.averageResponseTime || 0} days</div>
                <p className="text-xs text-muted-foreground">Average processing time</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Data Breaches</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.dataBreachCount || 0}</div>
                <p className="text-xs text-muted-foreground">This period</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent GDPR Activity</CardTitle>
              <CardDescription>Latest compliance actions and data requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Patient consent recorded</p>
                    <p className="text-xs text-muted-foreground">Data processing consent for John Doe</p>
                  </div>
                  <span className="text-xs text-muted-foreground">2 hours ago</span>
                </div>
                <div className="flex items-center space-x-4">
                  <FileText className="h-5 w-5 text-blue-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Data access request</p>
                    <p className="text-xs text-muted-foreground">Patient requested personal data export</p>
                  </div>
                  <span className="text-xs text-muted-foreground">1 day ago</span>
                </div>
                <div className="flex items-center space-x-4">
                  <XCircle className="h-5 w-5 text-red-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Consent withdrawn</p>
                    <p className="text-xs text-muted-foreground">Marketing consent revoked by patient</p>
                  </div>
                  <span className="text-xs text-muted-foreground">3 days ago</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consent" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Record New Consent</CardTitle>
                <CardDescription>Record patient consent for data processing</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...consentForm}>
                  <form onSubmit={consentForm.handleSubmit((data) => recordConsentMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={consentForm.control}
                      name="patientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Patient</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select patient" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {patients.map((patient: any) => (
                                <SelectItem key={patient.id} value={patient.id.toString()}>
                                  {patient.firstName} {patient.lastName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={consentForm.control}
                      name="consentType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Consent Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select consent type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="data_processing">Data Processing</SelectItem>
                              <SelectItem value="marketing">Marketing Communications</SelectItem>
                              <SelectItem value="research">Medical Research</SelectItem>
                              <SelectItem value="data_sharing">Data Sharing</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={consentForm.control}
                      name="legalBasis"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Legal Basis</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select legal basis" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="consent">Consent</SelectItem>
                              <SelectItem value="contract">Contract</SelectItem>
                              <SelectItem value="legal_obligation">Legal Obligation</SelectItem>
                              <SelectItem value="vital_interests">Vital Interests</SelectItem>
                              <SelectItem value="public_task">Public Task</SelectItem>
                              <SelectItem value="legitimate_interests">Legitimate Interests</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={consentForm.control}
                      name="purpose"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Purpose</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Describe the purpose of data processing" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" disabled={recordConsentMutation.isPending}>
                      {recordConsentMutation.isPending ? "Recording..." : "Record Consent"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Patient Consent Status</CardTitle>
                <CardDescription>View and manage existing consent records</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Select onValueChange={(value) => setSelectedPatient(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select patient to view consent status" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map((patient: any) => (
                        <SelectItem key={patient.id} value={patient.id.toString()}>
                          {patient.firstName} {patient.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedPatient && (
                    <div className="space-y-3">
                      {(!Array.isArray(consentStatuses) || consentStatuses.length === 0) ? (
                        <p className="text-sm text-muted-foreground">No consent records found for this patient.</p>
                      ) : (
                        consentStatuses.map((consent) => (
                          <div key={consent.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">{consent.consentType.replace('_', ' ')}</span>
                                {getStatusBadge(consent.status)}
                              </div>
                              <p className="text-xs text-muted-foreground">{consent.purpose}</p>
                              {consent.grantedAt && (
                                <p className="text-xs text-muted-foreground">
                                  Granted: {new Date(consent.grantedAt).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                            {consent.status === "granted" && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Withdraw
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Withdraw Consent</DialogTitle>
                                    <DialogDescription>
                                      Are you sure you want to withdraw this consent? This action cannot be undone.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <Textarea placeholder="Reason for withdrawal (optional)" />
                                    <div className="flex justify-end space-x-2">
                                      <Button variant="outline">Cancel</Button>
                                      <Button 
                                        variant="destructive"
                                        onClick={() => withdrawConsentMutation.mutate({ 
                                          consentId: consent.id, 
                                          reason: "Patient request" 
                                        })}
                                      >
                                        Withdraw Consent
                                      </Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="data-requests" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Submit Data Subject Request</CardTitle>
              <CardDescription>Handle patient data requests under GDPR</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...dataRequestForm}>
                <form onSubmit={dataRequestForm.handleSubmit((data) => submitDataRequestMutation.mutate(data))} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={dataRequestForm.control}
                      name="patientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Patient</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select patient" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {patients.map((patient: any) => (
                                <SelectItem key={patient.id} value={patient.id.toString()}>
                                  {patient.firstName} {patient.lastName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={dataRequestForm.control}
                      name="requestType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Request Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select request type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="access">Right to Access</SelectItem>
                              <SelectItem value="portability">Data Portability</SelectItem>
                              <SelectItem value="erasure">Right to Erasure</SelectItem>
                              <SelectItem value="rectification">Right to Rectification</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={dataRequestForm.control}
                      name="contactMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Method</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select contact method" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="postal">Postal Mail</SelectItem>
                              <SelectItem value="phone">Phone</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={dataRequestForm.control}
                      name="contactDetails"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Details</FormLabel>
                          <FormControl>
                            <Input placeholder="Email address or phone number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={dataRequestForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Describe the data request in detail" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" disabled={submitDataRequestMutation.isPending}>
                    {submitDataRequestMutation.isPending ? "Submitting..." : "Submit Request"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patient-data" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Patient Data Management</CardTitle>
              <CardDescription>Export and manage patient data for GDPR compliance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {patients.map((patient: any) => (
                  <div key={patient.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <h4 className="font-medium">{patient.firstName} {patient.lastName}</h4>
                      <p className="text-sm text-muted-foreground">{patient.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Patient ID: {patient.patientId} • DOB: {new Date(patient.dateOfBirth).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExportPatientData(patient.id)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Export Data
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedPatient(patient.id)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Consent
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                            <UserX className="h-4 w-4 mr-1" />
                            Request Erasure
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Request Data Erasure</DialogTitle>
                            <DialogDescription>
                              This will initiate the right to be forgotten process for this patient. Medical records may be retained as required by law.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <Textarea placeholder="Reason for data erasure request" />
                            <div className="flex justify-end space-x-2">
                              <Button variant="outline">Cancel</Button>
                              <Button variant="destructive">
                                Request Erasure
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>GDPR Compliance Reports</CardTitle>
              <CardDescription>Generate compliance reports for auditing and monitoring</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Button variant="outline" className="h-24 flex-col space-y-2">
                  <FileText className="h-6 w-6" />
                  <span>Monthly Report</span>
                  <span className="text-xs text-muted-foreground">Last 30 days</span>
                </Button>
                <Button variant="outline" className="h-24 flex-col space-y-2">
                  <BarChart3 className="h-6 w-6" />
                  <span>Quarterly Report</span>
                  <span className="text-xs text-muted-foreground">Last 3 months</span>
                </Button>
                <Button variant="outline" className="h-24 flex-col space-y-2">
                  <Users className="h-6 w-6" />
                  <span>Annual Report</span>
                  <span className="text-xs text-muted-foreground">Last 12 months</span>
                </Button>
              </div>
              
              {metrics && (
                <div className="mt-6 p-4 border rounded-lg">
                  <h4 className="font-medium mb-3">Current Compliance Status</h4>
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span>Compliance Score:</span>
                      <span className="font-medium">{metrics.complianceScore}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average Response Time:</span>
                      <span className="font-medium">{metrics.averageResponseTime} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Consent Withdrawal Rate:</span>
                      <span className="font-medium">{metrics.consentWithdrawalRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Next Audit Due:</span>
                      <span className="font-medium">
                        {new Date(metrics.nextAuditDue).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}