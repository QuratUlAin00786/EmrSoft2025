import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { FlaskConical, Calendar, Users, Clock, CheckCircle, AlertCircle, Droplet, TestTube, FileText } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { getActiveSubdomain } from "@/lib/subdomain-utils";

interface LabRequest {
  id: number;
  patientId: number;
  testId: string;
  testType: string;
  priority: string;
  orderedAt: string;
  status: string;
  reportStatus: string;
  Lab_Request_Generated: boolean;
  Sample_Collected: boolean;
  notes?: string;
  doctorName?: string;
  patientName?: string;
  // Invoice fields from join
  invoice?: any;
  invoiceNumber?: string | null;
  invoiceStatus?: string | null;
  totalAmount?: string | null;
  invoiceDate?: string | null;
}

function getTenantSubdomain(): string {
  const storedSubdomain = localStorage.getItem('user_subdomain');
  if (storedSubdomain) {
    return storedSubdomain;
  }
  
  const urlParams = new URLSearchParams(window.location.search);
  const subdomainParam = urlParams.get('subdomain');
  if (subdomainParam) {
    return subdomainParam;
  }
  
  return 'demo';
}

export function SampleTakerDashboard() {
  const { toast } = useToast();
  const [selectedRequest, setSelectedRequest] = useState<LabRequest | null>(null);
  const [showCollectionDialog, setShowCollectionDialog] = useState(false);
  const [collectionNotes, setCollectionNotes] = useState("");

  // Fetch lab results with invoices (joined data)
  const { data: labRequests = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/lab-results/with-invoices"],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'X-Tenant-Subdomain': getTenantSubdomain(),
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/lab-results/with-invoices', {
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    retry: false,
    staleTime: 30000,
  });

  // Fetch patients to get patient names
  const { data: patients = [] } = useQuery({
    queryKey: ["/api/patients"],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'X-Tenant-Subdomain': getTenantSubdomain(),
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/patients', {
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return response.json();
    },
    retry: false,
  });

  // Helper function to get patient name
  const getPatientName = (patientId: number) => {
    const patient = Array.isArray(patients) 
      ? patients.find((p: any) => p.id === patientId) 
      : null;
    return patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown Patient';
  };

  // Filter lab requests based on status
  const pendingCollection = labRequests.filter((req: LabRequest) => 
    req.Lab_Request_Generated === true && req.Sample_Collected !== true
  );
  const collectedToday = labRequests.filter((req: LabRequest) => 
    req.Sample_Collected === true && 
    new Date(req.orderedAt).toDateString() === new Date().toDateString()
  );
  const urgentRequests = pendingCollection.filter((req: LabRequest) => 
    req.priority === 'urgent' || req.priority === 'stat'
  );

  // Mutation to mark sample as collected (using existing endpoint)
  const collectSampleMutation = useMutation({
    mutationFn: async (data: { id: number; notes: string }) => {
      return await apiRequest('POST', `/api/lab-results/${data.id}/collect-sample`, {
        body: JSON.stringify({ notes: data.notes }),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lab-results/with-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lab-results"] });
      toast({
        title: "Sample Collected",
        description: "Sample has been marked as collected and ready for testing.",
        variant: "default"
      });
      setShowCollectionDialog(false);
      setSelectedRequest(null);
      setCollectionNotes("");
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Collection Failed",
        description: error.message || "Failed to mark sample as collected.",
        variant: "destructive"
      });
    }
  });

  // Mutation to toggle Sample_Collected status
  const toggleSampleMutation = useMutation({
    mutationFn: async (data: { id: number; sampleCollected: boolean }) => {
      return await apiRequest('PATCH', `/api/lab-results/${data.id}/toggle-sample-collected`, {
        sampleCollected: data.sampleCollected
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/lab-results/with-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lab-results"] });
      toast({
        title: variables.sampleCollected ? "Sample Collected" : "Sample Uncollected",
        description: variables.sampleCollected 
          ? "Sample has been marked as collected." 
          : "Sample has been marked as not collected.",
        variant: "default"
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update sample collection status.",
        variant: "destructive"
      });
    }
  });

  const handleCollectSample = (request: LabRequest) => {
    setSelectedRequest(request);
    setShowCollectionDialog(true);
  };

  const handleConfirmCollection = () => {
    if (selectedRequest) {
      collectSampleMutation.mutate({
        id: selectedRequest.id,
        notes: collectionNotes
      });
    }
  };

  const handleToggleSampleCollected = (id: number, currentValue: boolean) => {
    toggleSampleMutation.mutate({
      id,
      sampleCollected: !currentValue
    });
  };

  const sampleTakerCards = [
    {
      title: "Pending Collection",
      value: pendingCollection.length.toString(),
      description: "Lab requests awaiting sample",
      icon: FlaskConical,
      color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
    },
    {
      title: "Urgent Requests",
      value: urgentRequests.length.toString(),
      description: "Priority collections needed",
      icon: AlertCircle,
      color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
    },
    {
      title: "Collected Today",
      value: collectedToday.length.toString(),
      description: "Samples processed today",
      icon: CheckCircle,
      color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
    },
    {
      title: "Total Requests",
      value: labRequests.length.toString(),
      description: "All lab requests",
      icon: TestTube,
      color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
    }
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Sample Taker Dashboard</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Manage laboratory sample collection and specimen processing
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {sampleTakerCards.map((card) => (
          <Card key={card.title} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <div className={`p-2 rounded-full ${card.color}`}>
                <card.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* All Lab Results with Invoice Data */}
      <Card>
        <CardHeader>
          <CardTitle>All Lab Results with Invoice Information</CardTitle>
          <CardDescription>Complete lab results data joined with invoice details</CardDescription>
        </CardHeader>
        <CardContent>
          {labRequests.length === 0 ? (
            <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
              <FlaskConical className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No lab results found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Test ID</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Patient</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Test Type</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Priority</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Invoice #</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Amount</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Invoice Status</th>
                    <th className="text-center p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Sample Collected</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {labRequests.map((request: LabRequest) => (
                    <tr 
                      key={request.id} 
                      className={`border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 ${
                        request.priority === 'urgent' || request.priority === 'stat' 
                          ? 'bg-red-50 dark:bg-red-950' 
                          : ''
                      }`}
                      data-testid={`lab-request-row-${request.id}`}
                    >
                      <td className="p-3 text-sm text-gray-900 dark:text-gray-100 font-medium">
                        {request.testId}
                      </td>
                      <td className="p-3 text-sm text-gray-900 dark:text-gray-100">
                        {getPatientName(request.patientId)}
                      </td>
                      <td className="p-3 text-sm text-gray-600 dark:text-gray-400">
                        {request.testType}
                      </td>
                      <td className="p-3">
                        <Badge 
                          variant={request.priority === 'urgent' || request.priority === 'stat' ? 'destructive' : 'default'}
                          className="text-xs"
                        >
                          {request.priority?.toUpperCase() || 'ROUTINE'}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm text-gray-600 dark:text-gray-400">
                        {request.status}
                      </td>
                      <td className="p-3 text-sm text-gray-600 dark:text-gray-400">
                        {request.invoiceNumber ? (
                          <div className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {request.invoiceNumber}
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-600">-</span>
                        )}
                      </td>
                      <td className="p-3 text-sm text-gray-900 dark:text-gray-100 font-medium">
                        {request.totalAmount ? `£${request.totalAmount}` : '-'}
                      </td>
                      <td className="p-3">
                        {request.invoiceStatus ? (
                          <Badge 
                            variant={request.invoiceStatus === 'paid' ? 'default' : 'outline'}
                            className="text-xs"
                          >
                            {request.invoiceStatus}
                          </Badge>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-600">-</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Switch
                            checked={request.Sample_Collected}
                            onCheckedChange={() => handleToggleSampleCollected(request.id, request.Sample_Collected)}
                            disabled={toggleSampleMutation.isPending}
                            data-testid={`toggle-sample-${request.id}`}
                          />
                          {request.Sample_Collected && (
                            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        {!request.Sample_Collected && (
                          <Button 
                            onClick={() => handleCollectSample(request)}
                            size="sm"
                            variant="outline"
                            data-testid={`collect-sample-${request.id}`}
                          >
                            Collect
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Lab Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Sample Collection</CardTitle>
          <CardDescription>Lab requests awaiting specimen collection</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingCollection.length === 0 ? (
            <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
              <FlaskConical className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No pending sample collections</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingCollection.map((request: LabRequest) => (
                <div 
                  key={request.id} 
                  className={`flex items-center justify-between p-4 border rounded-lg ${
                    request.priority === 'urgent' || request.priority === 'stat' 
                      ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950' 
                      : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
                  }`}
                  data-testid={`lab-request-${request.id}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Droplet className={`h-5 w-5 ${
                        request.priority === 'urgent' || request.priority === 'stat' 
                          ? 'text-red-600 dark:text-red-400' 
                          : 'text-blue-600 dark:text-blue-400'
                      }`} />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {getPatientName(request.patientId)}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Test ID: {request.testId} | Type: {request.testType}
                        </p>
                        {request.doctorName && (
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            Ordered by: {request.doctorName}
                          </p>
                        )}
                        {request.invoiceNumber && (
                          <p className="text-xs text-blue-600 dark:text-blue-400">
                            Invoice: {request.invoiceNumber} ({request.invoiceStatus})
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <Badge 
                        variant={request.priority === 'urgent' || request.priority === 'stat' ? 'destructive' : 'default'}
                        className="mb-1"
                      >
                        {request.priority?.toUpperCase() || 'ROUTINE'}
                      </Badge>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(request.orderedAt).toLocaleString()}
                      </p>
                    </div>
                    <Button 
                      onClick={() => handleCollectSample(request)}
                      size="sm"
                      className="ml-2"
                      data-testid={`collect-sample-${request.id}`}
                    >
                      Collect Sample
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recently Collected Samples */}
      <Card>
        <CardHeader>
          <CardTitle>Recently Collected Samples</CardTitle>
          <CardDescription>Samples collected today</CardDescription>
        </CardHeader>
        <CardContent>
          {collectedToday.length === 0 ? (
            <div className="text-center py-4 text-neutral-500 dark:text-neutral-400">
              <p>No samples collected today</p>
            </div>
          ) : (
            <div className="space-y-2">
              {collectedToday.map((request: LabRequest) => (
                <div 
                  key={request.id} 
                  className="flex items-center justify-between p-3 border rounded-lg border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {getPatientName(request.patientId)}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {request.testType} - {request.testId}
                      </p>
                      {request.invoiceNumber && (
                        <p className="text-xs text-gray-500">
                          Invoice: {request.invoiceNumber} - £{request.totalAmount}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    Collected
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sample Collection Dialog */}
      <Dialog open={showCollectionDialog} onOpenChange={setShowCollectionDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Collect Sample</DialogTitle>
            <DialogDescription>
              Mark this sample as collected and ready for testing
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">Patient</Label>
                  <p className="font-medium">{getPatientName(selectedRequest.patientId)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">Test ID</Label>
                  <p className="font-medium">{selectedRequest.testId}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">Test Type</Label>
                  <p className="font-medium">{selectedRequest.testType}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">Priority</Label>
                  <Badge variant={selectedRequest.priority === 'urgent' || selectedRequest.priority === 'stat' ? 'destructive' : 'default'}>
                    {selectedRequest.priority?.toUpperCase() || 'ROUTINE'}
                  </Badge>
                </div>
                {selectedRequest.invoiceNumber && (
                  <>
                    <div>
                      <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">Invoice Number</Label>
                      <p className="font-medium">{selectedRequest.invoiceNumber}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">Amount</Label>
                      <p className="font-medium">£{selectedRequest.totalAmount}</p>
                    </div>
                  </>
                )}
              </div>

              <div>
                <Label htmlFor="collection-notes">Collection Notes (Optional)</Label>
                <Textarea
                  id="collection-notes"
                  placeholder="Add any notes about the specimen collection (e.g., blood from left arm, fasting sample, etc.)"
                  value={collectionNotes}
                  onChange={(e) => setCollectionNotes(e.target.value)}
                  className="mt-1"
                  rows={4}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowCollectionDialog(false);
                setSelectedRequest(null);
                setCollectionNotes("");
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmCollection}
              disabled={collectSampleMutation.isPending}
              data-testid="confirm-collection-button"
            >
              {collectSampleMutation.isPending ? "Collecting..." : "Confirm Collection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
