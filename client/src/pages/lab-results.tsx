import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

  const { data: labResults = mockLabResults, isLoading } = useQuery({
    queryKey: ["/api/lab-results", statusFilter],
    enabled: true,
  });

  const { toast } = useToast();

  const handleOrderTest = () => {
    toast({
      title: "Order New Test",
      description: "Opening test ordering interface",
    });
    // In a real implementation, this would open a modal or navigate to test ordering
  };

  const handleViewResult = (result: LabResult) => {
    toast({
      title: "View Lab Result",
      description: `Opening detailed results for ${result.patientName}`,
    });
    // In a real implementation, this would open a detailed view modal
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
    toast({
      title: "Share with Patient",
      description: `Lab results shared with ${result.patientName} via patient portal`,
    });
    // In a real implementation, this would share via patient portal or email
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
    </>
  );
}