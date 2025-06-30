import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Search, 
  Plus, 
  Eye, 
  Download, 
  User, 
  Clock, 
  AlertTriangle, 
  Check, 
  FileText,
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react";

interface LabResult {
  id: string;
  patientId: string;
  patientName: string;
  testType: string;
  orderedBy: string;
  orderedAt: string;
  collectedAt?: string;
  completedAt?: string;
  status: 'pending' | 'collected' | 'processing' | 'completed' | 'cancelled';
  results: Array<{
    name: string;
    value: string;
    unit: string;
    referenceRange: string;
    status: 'normal' | 'abnormal_high' | 'abnormal_low' | 'critical';
    flag?: string;
  }>;
  notes?: string;
  criticalValues?: boolean;
}

const mockLabResults: LabResult[] = [
  {
    id: "lab_001",
    patientId: "p_001",
    patientName: "Sarah Johnson",
    testType: "Complete Blood Count (CBC)",
    orderedBy: "Dr. Sarah Smith",
    orderedAt: "2024-01-15T09:00:00Z",
    collectedAt: "2024-01-15T10:30:00Z",
    completedAt: "2024-01-15T14:45:00Z",
    status: "completed",
    results: [
      {
        name: "White Blood Cells",
        value: "7.2",
        unit: "×10³/µL",
        referenceRange: "4.0-11.0",
        status: "normal"
      },
      {
        name: "Hemoglobin",
        value: "13.5",
        unit: "g/dL",
        referenceRange: "12.0-15.5",
        status: "normal"
      },
      {
        name: "Platelets",
        value: "350",
        unit: "×10³/µL",
        referenceRange: "150-450",
        status: "normal"
      }
    ],
    criticalValues: false,
    notes: "All values within normal limits"
  },
  {
    id: "lab_002",
    patientId: "p_002",
    patientName: "Michael Chen",
    testType: "Basic Metabolic Panel",
    orderedBy: "Dr. James Wilson",
    orderedAt: "2024-01-14T08:30:00Z",
    collectedAt: "2024-01-14T09:15:00Z",
    completedAt: "2024-01-14T16:20:00Z",
    status: "completed",
    results: [
      {
        name: "Glucose",
        value: "245",
        unit: "mg/dL",
        referenceRange: "70-99",
        status: "abnormal_high",
        flag: "H"
      },
      {
        name: "Creatinine",
        value: "1.1",
        unit: "mg/dL",
        referenceRange: "0.7-1.3",
        status: "normal"
      },
      {
        name: "Sodium",
        value: "142",
        unit: "mEq/L",
        referenceRange: "136-145",
        status: "normal"
      }
    ],
    criticalValues: true,
    notes: "High glucose levels - follow up required"
  },
  {
    id: "lab_003",
    patientId: "p_003",
    patientName: "Emily Davis",
    testType: "Lipid Panel",
    orderedBy: "Dr. Sarah Smith",
    orderedAt: "2024-01-13T07:45:00Z",
    collectedAt: "2024-01-13T08:30:00Z",
    status: "processing",
    results: [],
    criticalValues: false
  }
];

export default function LabResultsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [selectedResult, setSelectedResult] = useState<LabResult | null>(null);
  const [shareFormData, setShareFormData] = useState({
    method: "",
    email: "",
    whatsapp: "",
    message: ""
  });
  const [orderFormData, setOrderFormData] = useState({
    patientId: "",
    patientName: "",
    testType: "",
    priority: "routine",
    notes: ""
  });

  const { data: labResults = [], isLoading } = useQuery({
    queryKey: ["/api/lab-results", statusFilter],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      console.log("Lab Results - Token available:", !!token);
      
      const headers: Record<string, string> = {
        'X-Tenant-Subdomain': 'demo'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      console.log("Lab Results - Making API call with headers:", headers);
      
      const response = await fetch("/api/lab-results", {
        headers,
        credentials: "include",
      });
      
      console.log("Lab Results - API response status:", response.status);
      
      if (!response.ok) {
        console.error("Lab Results - API failed:", response.status, response.statusText);
        throw new Error(`Failed to fetch lab results: ${response.status}`);
      }
      const data = await response.json();
      console.log("Lab Results - Fetched data:", data);
      return data;
    },
    enabled: true,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createLabOrderMutation = useMutation({
    mutationFn: async (labOrderData: any) => {
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Tenant-Subdomain': 'demo'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch("/api/lab-results", {
        method: "POST",
        headers,
        body: JSON.stringify(labOrderData),
        credentials: "include",
      });
      if (!response.ok) throw new Error('Failed to create lab order');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Lab test ordered successfully",
      });
      setShowOrderDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/lab-results"] });
      setOrderFormData({
        patientId: "",
        patientName: "",
        testType: "",
        priority: "routine",
        notes: ""
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create lab order",
        variant: "destructive",
      });
    },
  });

  const handleOrderTest = () => {
    setShowOrderDialog(true);
  };

  const handleViewResult = (result: LabResult) => {
    console.log("handleViewResult called with:", result);
    setSelectedResult(result);
    setShowViewDialog(true);
    console.log("showViewDialog set to true");
  };

  const handleDownloadResult = (resultId: string) => {
    const result = Array.isArray(labResults) ? labResults.find((r: any) => r.id === resultId) : null;
    if (result) {
      toast({
        title: "Download Report",
        description: `Lab report for ${result.patientName} downloaded successfully`,
      });
      
      // Simulate PDF download
      const blob = new Blob([`Lab Results Report\n\nPatient: ${result.patientName}\nTest: ${result.testType}\nDate: ${new Date(result.orderedAt).toLocaleDateString()}\n\nResults:\n${result.results.map((r: any) => `${r.name}: ${r.value} ${r.unit} (${r.referenceRange})`).join('\n')}`], 
        { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lab-report-${result.patientName.replace(' ', '-').toLowerCase()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleShareResult = (result: LabResult) => {
    setSelectedResult(result);
    setShowReviewDialog(true);
  };

  const handleFlagCritical = (resultId: string) => {
    const result = Array.isArray(labResults) ? labResults.find((r: any) => r.id === resultId) : null;
    if (result) {
      toast({
        title: "Critical Value Flagged",
        description: `Critical alert created for ${result.patientName}`,
        variant: "destructive",
      });
      // In a real implementation, this would create alerts and notifications
    }
  };

  const filteredResults = Array.isArray(labResults) ? labResults.filter((result: any) => {
    const matchesSearch = !searchQuery || 
      result.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      result.testType.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || result.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) : [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'collected': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getResultStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'bg-green-100 text-green-800';
      case 'abnormal_high': return 'bg-orange-100 text-orange-800';
      case 'abnormal_low': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <>
        <Header title="Lab Results" subtitle="View and manage laboratory test results" />
        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header 
        title="Lab Results" 
        subtitle="View and manage laboratory test results"
      />
      
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending Results</p>
                    <p className="text-2xl font-bold">{filteredResults.filter(r => r.status === 'pending').length}</p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Critical Values</p>
                    <p className="text-2xl font-bold">{filteredResults.filter(r => r.criticalValues).length}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Completed Today</p>
                    <p className="text-2xl font-bold">
                      {filteredResults.filter(r => r.status === 'completed' && 
                        new Date(r.completedAt || '').toDateString() === new Date().toDateString()).length}
                    </p>
                  </div>
                  <Check className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Results</p>
                    <p className="text-2xl font-bold">{filteredResults.length}</p>
                  </div>
                  <FileText className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search lab results..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="collected">Collected</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button onClick={handleOrderTest} className="bg-medical-blue hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Order Lab Test
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Lab Results List */}
          <div className="space-y-4">
            {filteredResults.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">No lab results found</h3>
                  <p className="text-gray-600">Try adjusting your search terms or filters</p>
                </CardContent>
              </Card>
            ) : (
              filteredResults.map((result) => (
                <Card key={result.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-lg font-semibold">{result.patientName}</h3>
                          <Badge className={getStatusColor(result.status)}>
                            {result.status}
                          </Badge>
                          {result.criticalValues && (
                            <Badge variant="destructive" className="flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Critical
                            </Badge>
                          )}
                        </div>
                        
                        <div className="space-y-2 mb-4">
                          <p className="text-sm text-gray-600">
                            <strong>Test:</strong> {result.testType}
                          </p>
                          <p className="text-sm text-gray-600">
                            <strong>Ordered by:</strong> {result.orderedBy}
                          </p>
                          <p className="text-sm text-gray-600">
                            <strong>Ordered:</strong> {format(new Date(result.orderedAt), 'MMM dd, yyyy HH:mm')}
                          </p>
                          {result.collectedAt && (
                            <p className="text-sm text-gray-600">
                              <strong>Collected:</strong> {format(new Date(result.collectedAt), 'MMM dd, yyyy HH:mm')}
                            </p>
                          )}
                          {result.completedAt && (
                            <p className="text-sm text-gray-600">
                              <strong>Completed:</strong> {format(new Date(result.completedAt), 'MMM dd, yyyy HH:mm')}
                            </p>
                          )}
                        </div>
                        
                        {result.results && result.results.length > 0 && (
                          <div className="mt-4">
                            <h4 className="font-medium mb-2">Results:</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {result.results.map((res: any, index: number) => (
                                <div key={index} className={`p-3 rounded-lg border ${
                                  res.status === 'normal' ? 'bg-green-50 border-green-200' :
                                  res.status === 'critical' ? 'bg-red-50 border-red-200' :
                                  'bg-yellow-50 border-yellow-200'
                                }`}>
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium">{res.name}</span>
                                    <Badge className={getResultStatusColor(res.status)}>
                                      {res.status.replace('_', ' ')}
                                    </Badge>
                                  </div>
                                  <div className="text-sm text-gray-600 mt-1">
                                    <span className="font-medium">{res.value} {res.unit}</span>
                                    <span className="ml-2">Ref: {res.referenceRange}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {result.notes && (
                          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <h4 className="font-medium text-blue-800 mb-1">Notes</h4>
                            <p className="text-sm text-blue-700">{result.notes}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <Button variant="outline" size="sm" onClick={() => handleViewResult(result)}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDownloadResult(result.id)}>
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                        {result.status === 'completed' && (
                          <Button variant="outline" size="sm" onClick={() => handleShareResult(result)}>
                            <User className="h-4 w-4 mr-1" />
                            Review
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Order Lab Test Dialog */}
      <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Order Lab Test</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="patientId">Patient ID</Label>
              <Input
                id="patientId"
                placeholder="Enter patient ID"
                value={orderFormData.patientId}
                onChange={(e) => setOrderFormData(prev => ({ ...prev, patientId: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="patientName">Patient Name</Label>
              <Input
                id="patientName"
                placeholder="Enter patient name"
                value={orderFormData.patientName}
                onChange={(e) => setOrderFormData(prev => ({ ...prev, patientName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="testType">Test Type</Label>
              <Select value={orderFormData.testType} onValueChange={(value) => setOrderFormData(prev => ({ ...prev, testType: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select test type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Complete Blood Count (CBC)">Complete Blood Count (CBC)</SelectItem>
                  <SelectItem value="Basic Metabolic Panel">Basic Metabolic Panel</SelectItem>
                  <SelectItem value="Comprehensive Metabolic Panel">Comprehensive Metabolic Panel</SelectItem>
                  <SelectItem value="Lipid Panel">Lipid Panel</SelectItem>
                  <SelectItem value="Liver Function Tests">Liver Function Tests</SelectItem>
                  <SelectItem value="Thyroid Function Tests">Thyroid Function Tests</SelectItem>
                  <SelectItem value="Hemoglobin A1C">Hemoglobin A1C</SelectItem>
                  <SelectItem value="Urinalysis">Urinalysis</SelectItem>
                  <SelectItem value="Vitamin D">Vitamin D</SelectItem>
                  <SelectItem value="Iron Studies">Iron Studies</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={orderFormData.priority} onValueChange={(value) => setOrderFormData(prev => ({ ...prev, priority: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="routine">Routine</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="stat">STAT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Clinical Notes</Label>
              <Textarea
                id="notes"
                placeholder="Enter clinical notes or special instructions"
                value={orderFormData.notes}
                onChange={(e) => setOrderFormData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowOrderDialog(false)} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  createLabOrderMutation.mutate({
                    patientId: orderFormData.patientId,
                    patientName: orderFormData.patientName,
                    testType: orderFormData.testType,
                    priority: orderFormData.priority,
                    notes: orderFormData.notes
                  });
                }}
                disabled={createLabOrderMutation.isPending || !orderFormData.patientId || !orderFormData.testType}
                className="flex-1 bg-medical-blue hover:bg-blue-700"
              >
                {createLabOrderMutation.isPending ? "Ordering..." : "Order Test"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Lab Result Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lab Result Details</DialogTitle>
          </DialogHeader>
          {selectedResult && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Patient</Label>
                  <p className="text-lg font-semibold">{selectedResult.patientName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Patient ID</Label>
                  <p className="text-lg">{selectedResult.patientId}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Test Type</Label>
                  <p className="text-lg">{selectedResult.testType}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Status</Label>
                  <Badge 
                    variant={
                      selectedResult.status === 'completed' ? 'default' : 
                      selectedResult.status === 'pending' ? 'secondary' : 
                      selectedResult.status === 'processing' ? 'outline' : 'destructive'
                    }
                  >
                    {selectedResult.status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Ordered By</Label>
                  <p className="text-lg">{selectedResult.orderedBy}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Ordered Date</Label>
                  <p className="text-lg">{format(new Date(selectedResult.orderedAt), "PPP")}</p>
                </div>
                {selectedResult.collectedAt && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Collected Date</Label>
                    <p className="text-lg">{format(new Date(selectedResult.collectedAt), "PPP")}</p>
                  </div>
                )}
                {selectedResult.completedAt && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Completed Date</Label>
                    <p className="text-lg">{format(new Date(selectedResult.completedAt), "PPP")}</p>
                  </div>
                )}
              </div>

              {selectedResult.results && selectedResult.results.length > 0 && (
                <div>
                  <Label className="text-lg font-semibold mb-4 block">Test Results</Label>
                  <div className="space-y-3">
                    {selectedResult.results.map((result: any, index: number) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <p className="font-medium">{result.name}</p>
                            <p className="text-sm text-gray-600">Reference Range: {result.referenceRange}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-semibold">{result.value} {result.unit}</p>
                            <Badge 
                              variant={
                                result.status === 'normal' ? 'default' : 
                                result.status === 'abnormal_high' || result.status === 'abnormal_low' ? 'secondary' : 
                                'destructive'
                              }
                              className="ml-2"
                            >
                              {result.status.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                        {result.flag && (
                          <p className="text-sm text-yellow-600 mt-2">⚠️ {result.flag}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedResult.notes && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Clinical Notes</Label>
                  <p className="text-sm mt-1 p-3 bg-gray-50 rounded-md">{selectedResult.notes}</p>
                </div>
              )}

              {selectedResult.criticalValues && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 font-medium">⚠️ Critical Values Alert</p>
                  <p className="text-red-600 text-sm">This result contains critical values that require immediate attention.</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowViewDialog(false)}>
                  Close
                </Button>
                <Button onClick={() => handleDownloadResult(selectedResult.id)} className="bg-medical-blue hover:bg-blue-700">
                  Download Report
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Review Lab Result Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review & Share Lab Results</DialogTitle>
          </DialogHeader>
          {selectedResult && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">{selectedResult.patientName.charAt(0)}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{selectedResult.patientName}</h3>
                    <p className="text-sm text-gray-600">Patient ID: {selectedResult.patientId}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Test Information</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Test Type:</span>
                      <span className="font-medium">{selectedResult.testType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ordered By:</span>
                      <span className="font-medium">{selectedResult.orderedBy}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <Badge 
                        variant={
                          selectedResult.status === 'completed' ? 'default' : 
                          selectedResult.status === 'pending' ? 'secondary' : 'outline'
                        }
                      >
                        {selectedResult.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Completed:</span>
                      <span className="font-medium">
                        {selectedResult.completedAt ? format(new Date(selectedResult.completedAt), "PPP") : "Not completed"}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Clinical Review</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="reviewed" className="rounded" />
                      <Label htmlFor="reviewed" className="text-sm">Results reviewed by physician</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="interpreted" className="rounded" />
                      <Label htmlFor="interpreted" className="text-sm">Clinical interpretation complete</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="actions" className="rounded" />
                      <Label htmlFor="actions" className="text-sm">Follow-up actions identified</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="approved" className="rounded" />
                      <Label htmlFor="approved" className="text-sm">Approved for patient sharing</Label>
                    </div>
                  </div>
                </div>
              </div>

              {selectedResult.results && selectedResult.results.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Test Results Summary</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedResult.results.slice(0, 4).map((result: any, index: number) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-sm">{result.name}</span>
                          <Badge 
                            variant={result.status === 'normal' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {result.status}
                          </Badge>
                        </div>
                        <div className="text-lg font-semibold mt-1">{result.value} {result.unit}</div>
                        <div className="text-xs text-gray-600">Ref: {result.referenceRange}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="physicianNotes" className="text-sm font-medium">Physician Notes</Label>
                <Textarea
                  id="physicianNotes"
                  placeholder="Add clinical interpretation, recommendations, or follow-up instructions..."
                  className="mt-2"
                  rows={3}
                />
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
                    Cancel
                  </Button>
                  <Button variant="outline" onClick={() => handleDownloadResult(selectedResult.id)}>
                    Download Report
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => {
                      setShowReviewDialog(false);
                      setShowShareDialog(true);
                      setShareFormData({
                        method: "",
                        email: "",
                        whatsapp: "",
                        message: `Lab results for ${selectedResult.testType} are now available for review.`
                      });
                    }}
                    className="bg-medical-blue hover:bg-blue-700"
                  >
                    Share with Patient
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Share with Patient Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share Lab Results</DialogTitle>
          </DialogHeader>
          {selectedResult && (
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                Share results for <strong>{selectedResult.patientName}</strong>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">Contact Method</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="email"
                      name="method"
                      value="email"
                      checked={shareFormData.method === "email"}
                      onChange={(e) => setShareFormData(prev => ({ ...prev, method: e.target.value }))}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="email" className="text-sm">Email</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="whatsapp"
                      name="method"
                      value="whatsapp"
                      checked={shareFormData.method === "whatsapp"}
                      onChange={(e) => setShareFormData(prev => ({ ...prev, method: e.target.value }))}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="whatsapp" className="text-sm">WhatsApp</Label>
                  </div>
                </div>
              </div>

              {shareFormData.method === "email" && (
                <div className="space-y-2">
                  <Label htmlFor="emailAddress" className="text-sm font-medium">Email Address</Label>
                  <Input
                    id="emailAddress"
                    type="email"
                    placeholder="patient@example.com"
                    value={shareFormData.email}
                    onChange={(e) => setShareFormData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
              )}

              {shareFormData.method === "whatsapp" && (
                <div className="space-y-2">
                  <Label htmlFor="whatsappNumber" className="text-sm font-medium">WhatsApp Number</Label>
                  <Input
                    id="whatsappNumber"
                    type="tel"
                    placeholder="+44 7XXX XXXXXX"
                    value={shareFormData.whatsapp}
                    onChange={(e) => setShareFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="shareMessage" className="text-sm font-medium">Message</Label>
                <Textarea
                  id="shareMessage"
                  placeholder="Add a personal message..."
                  value={shareFormData.message}
                  onChange={(e) => setShareFormData(prev => ({ ...prev, message: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <Button variant="outline" onClick={() => setShowShareDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    const method = shareFormData.method === "email" ? "email" : "WhatsApp";
                    const contact = shareFormData.method === "email" ? shareFormData.email : shareFormData.whatsapp;
                    
                    toast({
                      title: "Results Shared",
                      description: `Lab results sent to ${selectedResult.patientName} via ${method} (${contact})`,
                    });
                    setShowShareDialog(false);
                    setShareFormData({
                      method: "",
                      email: "",
                      whatsapp: "",
                      message: ""
                    });
                  }}
                  disabled={!shareFormData.method || 
                    (shareFormData.method === "email" && !shareFormData.email) ||
                    (shareFormData.method === "whatsapp" && !shareFormData.whatsapp)}
                  className="bg-medical-blue hover:bg-blue-700"
                >
                  Send Results
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}