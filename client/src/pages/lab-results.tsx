import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FlaskConical, 
  Plus, 
  Search, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Download,
  Eye,
  Calendar,
  User,
  FileText
} from "lucide-react";
import { format } from "date-fns";

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

export default function LabResultsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showNewOrder, setShowNewOrder] = useState(false);

  const { data: labResults = [], isLoading, error } = useQuery<LabResult[]>({
    queryKey: ["/api/lab-results"],
  });

  const filteredResults = labResults.filter(result => {
    const matchesSearch = searchQuery === "" || 
      result.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      result.testType.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || result.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

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
        name: "Red Blood Cells",
        value: "4.8",
        unit: "×10⁶/µL",
        referenceRange: "4.2-5.4",
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
        name: "Hematocrit",
        value: "39.8",
        unit: "%",
        referenceRange: "36.0-46.0",
        status: "normal"
      },
      {
        name: "Platelets",
        value: "320",
        unit: "×10³/µL",
        referenceRange: "150-450",
        status: "normal"
      }
    ]
  },
  {
    id: "lab_002",
    patientId: "p_002",
    patientName: "Robert Davis",
    testType: "Comprehensive Metabolic Panel",
    orderedBy: "Dr. Sarah Smith",
    orderedAt: "2024-01-14T11:00:00Z",
    collectedAt: "2024-01-14T11:30:00Z",
    completedAt: "2024-01-14T16:20:00Z",
    status: "completed",
    criticalValues: true,
    results: [
      {
        name: "Glucose",
        value: "180",
        unit: "mg/dL",
        referenceRange: "70-99",
        status: "abnormal_high",
        flag: "H"
      },
      {
        name: "BUN",
        value: "25",
        unit: "mg/dL",
        referenceRange: "7-20",
        status: "abnormal_high",
        flag: "H"
      },
      {
        name: "Creatinine",
        value: "1.8",
        unit: "mg/dL",
        referenceRange: "0.7-1.3",
        status: "abnormal_high",
        flag: "H"
      },
      {
        name: "Sodium",
        value: "142",
        unit: "mEq/L",
        referenceRange: "136-145",
        status: "normal"
      },
      {
        name: "Potassium",
        value: "4.2",
        unit: "mEq/L",
        referenceRange: "3.5-5.1",
        status: "normal"
      }
    ],
    notes: "Patient shows signs of diabetes and possible kidney dysfunction. Recommend follow-up."
  },
  {
    id: "lab_003",
    patientId: "p_003",
    patientName: "Emma Wilson",
    testType: "Lipid Panel",
    orderedBy: "Dr. Michael Chen",
    orderedAt: "2024-01-13T08:00:00Z",
    collectedAt: "2024-01-13T08:15:00Z",
    status: "processing"
  }
];

const testCategories = [
  "All Tests",
  "Blood Chemistry",
  "Hematology",
  "Microbiology",
  "Immunology",
  "Endocrinology",
  "Cardiology",
  "Toxicology"
];

export default function LabResultsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("All Tests");
  const [selectedResult, setSelectedResult] = useState<LabResult | null>(null);

  const { data: labResults = mockLabResults, isLoading } = useQuery({
    queryKey: ["/api/lab-results", statusFilter, categoryFilter],
    enabled: true,
  });

  const filteredResults = labResults.filter(result => {
    const matchesSearch = !searchQuery || 
      result.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      result.testType.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || result.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'collected': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getResultStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'text-green-600';
      case 'abnormal_high': return 'text-red-600';
      case 'abnormal_low': return 'text-orange-600';
      case 'critical': return 'text-red-800 font-bold';
      default: return 'text-gray-600';
    }
  };

  const getResultIcon = (status: string) => {
    switch (status) {
      case 'abnormal_high': return <TrendingUp className="h-4 w-4 text-red-600" />;
      case 'abnormal_low': return <TrendingDown className="h-4 w-4 text-orange-600" />;
      case 'normal': return <Minus className="h-4 w-4 text-green-600" />;
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-800" />;
      default: return null;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
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
                    <p className="text-2xl font-bold">8</p>
                  </div>
                  <FlaskConical className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Critical Values</p>
                    <p className="text-2xl font-bold">2</p>
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
                    <p className="text-2xl font-bold">12</p>
                  </div>
                  <FileText className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">This Month</p>
                    <p className="text-2xl font-bold">284</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-600" />
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

                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    {testCategories.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Order Lab Test
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Lab Results List */}
          <div className="space-y-4">
            {filteredResults.map((result) => (
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
                          <Badge className="bg-red-100 text-red-800">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Critical Values
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                        <div>
                          <h4 className="font-medium text-sm text-gray-700 mb-2">Test Information</h4>
                          <div className="space-y-1 text-sm">
                            <div><strong>Test:</strong> {result.testType}</div>
                            <div><strong>Ordered by:</strong> {result.orderedBy}</div>
                            <div><strong>Ordered:</strong> {format(new Date(result.orderedAt), 'MMM d, yyyy HH:mm')}</div>
                            {result.collectedAt && (
                              <div><strong>Collected:</strong> {format(new Date(result.collectedAt), 'MMM d, yyyy HH:mm')}</div>
                            )}
                            {result.completedAt && (
                              <div><strong>Completed:</strong> {format(new Date(result.completedAt), 'MMM d, yyyy HH:mm')}</div>
                            )}
                          </div>
                        </div>
                        
                        {result.results && result.results.length > 0 && (
                          <div>
                            <h4 className="font-medium text-sm text-gray-700 mb-2">Key Results</h4>
                            <div className="space-y-2">
                              {result.results.slice(0, 3).map((test, index) => (
                                <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                                  <div className="flex items-center gap-2">
                                    {getResultIcon(test.status)}
                                    <span className="text-sm font-medium">{test.name}</span>
                                  </div>
                                  <div className="text-right">
                                    <div className={`text-sm font-medium ${getResultStatusColor(test.status)}`}>
                                      {test.value} {test.unit}
                                      {test.flag && <span className="ml-1 text-red-600">{test.flag}</span>}
                                    </div>
                                    <div className="text-xs text-gray-500">{test.referenceRange}</div>
                                  </div>
                                </div>
                              ))}
                              {result.results.length > 3 && (
                                <div className="text-sm text-gray-500 text-center">
                                  +{result.results.length - 3} more results
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {result.notes && (
                        <div className="bg-blue-50 border-l-4 border-blue-400 p-3 mb-4">
                          <h4 className="font-medium text-blue-800 text-sm mb-1">Clinical Notes</h4>
                          <p className="text-sm text-blue-700">{result.notes}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Button variant="outline" size="sm" onClick={() => setSelectedResult(result)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredResults.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <FlaskConical className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No lab results found</h3>
              <p className="text-gray-600">Try adjusting your search terms or filters</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}