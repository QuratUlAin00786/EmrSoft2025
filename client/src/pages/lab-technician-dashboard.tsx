import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  FileText,
  User,
  Calendar,
  Sparkles,
  Grid3x3,
  List,
  CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";

// Test field definitions for dynamic lab result generation
const TEST_FIELD_DEFINITIONS: Record<string, Array<{
  name: string;
  unit: string;
  referenceRange: string;
}>> = {
  "Complete Blood Count (CBC)": [
    { name: "Hemoglobin (Hb)", unit: "g/dL", referenceRange: "13.0 - 17.0" },
    { name: "Total WBC Count", unit: "x10³/L", referenceRange: "4.0 - 10.0" },
    { name: "RBC Count", unit: "x10¹²/L", referenceRange: "4.5 - 5.9" },
    { name: "Hematocrit (HCT/PCV)", unit: "%", referenceRange: "40 - 50" },
    { name: "MCV", unit: "fL", referenceRange: "80 - 96" },
    { name: "MCH", unit: "pg", referenceRange: "27 - 32" },
    { name: "MCHC", unit: "g/dL", referenceRange: "32 - 36" },
    { name: "Platelet Count", unit: "x10³/L", referenceRange: "150 - 450" },
    { name: "Neutrophils", unit: "%", referenceRange: "40 - 75" },
    { name: "Lymphocytes", unit: "%", referenceRange: "20 - 45" },
    { name: "Monocytes", unit: "%", referenceRange: "2 - 10" },
    { name: "Eosinophils", unit: "%", referenceRange: "1 - 6" },
    { name: "Basophils", unit: "%", referenceRange: "<2" },
  ],
  "Viral Panels / PCR Tests (e.g. COVID-19, Influenza)": [
    { name: "COVID-19 PCR", unit: "", referenceRange: "Negative" },
    { name: "Influenza A PCR", unit: "", referenceRange: "Negative" },
    { name: "Influenza B PCR", unit: "", referenceRange: "Negative" },
    { name: "RSV PCR", unit: "", referenceRange: "Negative" },
    { name: "Viral Load (Ct Value)", unit: "Ct", referenceRange: ">35" },
  ],
  "Tumor Markers (e.g. CA-125, CEA, AFP)": [
    { name: "CA-125 (Ovarian)", unit: "U/mL", referenceRange: "<35" },
    { name: "CEA (Carcinoembryonic Antigen)", unit: "ng/mL", referenceRange: "<3.0" },
    { name: "AFP (Alpha-Fetoprotein)", unit: "ng/mL", referenceRange: "<10" },
    { name: "CA 19-9 (Pancreatic)", unit: "U/mL", referenceRange: "<37" },
    { name: "CA 15-3 (Breast)", unit: "U/mL", referenceRange: "<30" },
  ],
};

interface LabTest {
  id: number;
  testId: string;
  testType: string;
  patientName: string;
  orderedBy: number;
  doctorName: string;
  priority: string;
  orderedAt: string;
  status: string;
  patientId: number;
  sampleCollected?: boolean;
  invoiceStatus?: string;
  invoiceNumber?: string;
}

export default function LabTechnicianDashboard() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [selectedTest, setSelectedTest] = useState<LabTest | null>(null);
  const [generateFormData, setGenerateFormData] = useState<any>({});
  const [viewMode, setViewMode] = useState<"card" | "list">("card");

  // Fetch lab tests for lab technician
  const { data: labTests = [], isLoading } = useQuery({
    queryKey: ["/api/lab-technician/tests"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/lab-technician/tests");
      return response.json();
    },
  });

  // Filter lab tests based on search query
  const filteredTests = labTests.filter((test: LabTest) => {
    const query = searchQuery.toLowerCase();
    return (
      test.testId.toLowerCase().includes(query) ||
      test.testType.toLowerCase().includes(query) ||
      test.patientName.toLowerCase().includes(query) ||
      test.doctorName.toLowerCase().includes(query)
    );
  });

  // Parse test types from testType string (could be comma-separated or array)
  const parseTestTypes = (testType: string): string[] => {
    try {
      const parsed = JSON.parse(testType);
      return Array.isArray(parsed) ? parsed : [testType];
    } catch {
      return testType.split(',').map(t => t.trim());
    }
  };

  // Group test types into their respective categories
  const groupTestTypes = (testTypes: string[]) => {
    const grouped: Record<string, string[]> = {};
    
    testTypes.forEach(testType => {
      // Check if this test type exists in TEST_FIELD_DEFINITIONS
      if (TEST_FIELD_DEFINITIONS[testType]) {
        grouped[testType] = TEST_FIELD_DEFINITIONS[testType].map(field => field.name);
      } else {
        // If not found, create a generic entry
        grouped[testType] = [];
      }
    });
    
    return grouped;
  };

  // Initialize form data when dialog opens
  const handleGenerateClick = (test: LabTest) => {
    setSelectedTest(test);
    
    // Parse test types
    const testTypes = parseTestTypes(test.testType);
    const groupedTests = groupTestTypes(testTypes);
    
    // Initialize form data with empty values
    const initialFormData: any = {
      clinicalNotes: ''
    };
    
    // Initialize each test type's parameters
    testTypes.forEach(testType => {
      if (TEST_FIELD_DEFINITIONS[testType]) {
        TEST_FIELD_DEFINITIONS[testType].forEach(field => {
          const key = `${testType}_${field.name}`;
          initialFormData[key] = '';
        });
      }
    });
    
    setGenerateFormData(initialFormData);
    setShowGenerateDialog(true);
  };

  // Handle form input change
  const handleInputChange = (key: string, value: string) => {
    setGenerateFormData((prev: any) => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground dark:text-white">
              Lab Technician Dashboard
            </h1>
            <p className="text-muted-foreground dark:text-gray-400 mt-1">
              Tests ready for result generation
            </p>
          </div>
        </div>

        {/* Search and View Toggle */}
        <div className="flex gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by Test ID, Patient Name, Test Type, or Doctor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-lab-tests"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === "card" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("card")}
              data-testid="button-view-card"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("list")}
              data-testid="button-view-list"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Lab Tests Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading tests...</p>
          </div>
        ) : filteredTests.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchQuery ? "No tests found matching your search" : "No tests ready for result generation"}
            </p>
          </div>
        ) : viewMode === "card" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTests.map((test: LabTest) => (
              <Card key={test.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Test ID and Priority */}
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-muted-foreground">Test ID</p>
                        <p className="font-semibold text-medical-blue">{test.testId}</p>
                      </div>
                      <Badge variant={
                        test.priority === 'urgent' ? 'destructive' :
                        test.priority === 'stat' ? 'destructive' :
                        'secondary'
                      }>
                        {test.priority || 'routine'}
                      </Badge>
                    </div>

                    {/* Badges Row */}
                    <div className="flex flex-wrap gap-2">
                      {test.sampleCollected && (
                        <Badge className="bg-green-600 hover:bg-green-700">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Sample Collected
                        </Badge>
                      )}
                      {test.invoiceStatus === 'paid' && (
                        <Badge className="bg-blue-600 hover:bg-blue-700">
                          Paid
                        </Badge>
                      )}
                      {test.invoiceNumber && (
                        <Badge variant="outline">
                          {test.invoiceNumber}
                        </Badge>
                      )}
                    </div>

                    {/* Patient Info */}
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Patient</p>
                        <p className="font-medium">{test.patientName}</p>
                      </div>
                    </div>

                    {/* Test Type */}
                    <div>
                      <p className="text-sm text-muted-foreground">Test Type</p>
                      <p className="font-medium text-sm">
                        {parseTestTypes(test.testType).join(', ')}
                      </p>
                    </div>

                    {/* Ordered By */}
                    <div>
                      <p className="text-sm text-muted-foreground">Ordered By</p>
                      <p className="font-medium text-sm">{test.doctorName}</p>
                    </div>

                    {/* Ordered Date */}
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Ordered Date</p>
                        <p className="text-sm">
                          {test.orderedAt ? format(new Date(test.orderedAt), 'PPP') : 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* Generate Button */}
                    <Button
                      onClick={() => handleGenerateClick(test)}
                      className="w-full bg-green-600 hover:bg-green-700"
                      data-testid={`button-generate-result-${test.id}`}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Test Result
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTests.map((test: LabTest) => (
              <Card key={test.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    {/* Test ID and Badges */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="font-semibold text-medical-blue">{test.testId}</p>
                        <Badge variant={
                          test.priority === 'urgent' ? 'destructive' :
                          test.priority === 'stat' ? 'destructive' :
                          'secondary'
                        }>
                          {test.priority || 'routine'}
                        </Badge>
                        {test.sampleCollected && (
                          <Badge className="bg-green-600 hover:bg-green-700">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Sample Collected
                          </Badge>
                        )}
                        {test.invoiceStatus === 'paid' && (
                          <Badge className="bg-blue-600 hover:bg-blue-700">
                            Paid
                          </Badge>
                        )}
                        {test.invoiceNumber && (
                          <Badge variant="outline">
                            {test.invoiceNumber}
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Patient</p>
                          <p className="font-medium">{test.patientName}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Test Type</p>
                          <p className="font-medium truncate">{parseTestTypes(test.testType)[0]}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Ordered By</p>
                          <p className="font-medium">{test.doctorName}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Ordered Date</p>
                          <p className="font-medium">
                            {test.orderedAt ? format(new Date(test.orderedAt), 'PP') : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                    {/* Generate Button */}
                    <Button
                      onClick={() => handleGenerateClick(test)}
                      className="bg-green-600 hover:bg-green-700"
                      data-testid={`button-generate-result-${test.id}`}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Result
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Generate Test Result Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate Lab Test Result</DialogTitle>
          </DialogHeader>

          {selectedTest && (
            <div className="space-y-6">
              {/* Lab Order Details */}
              <div className="bg-blue-50 dark:bg-blue-950/30 p-6 rounded-lg space-y-4">
                <h3 className="font-semibold text-lg">Lab Order Details</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Patient Name:</p>
                    <p className="font-medium">{selectedTest.patientName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Test Name:</p>
                    <p className="font-medium">{parseTestTypes(selectedTest.testType).join(' | ')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Test ID:</p>
                    <p className="font-medium">{selectedTest.testId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ordered Date:</p>
                    <p className="font-medium">
                      {selectedTest.orderedAt ? format(new Date(selectedTest.orderedAt), 'PPP') : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ordered By:</p>
                    <p className="font-medium">{selectedTest.doctorName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Priority:</p>
                    <p className="font-medium capitalize">{selectedTest.priority || 'Routine'}</p>
                  </div>
                </div>
              </div>

              {/* Test Parameters */}
              {parseTestTypes(selectedTest.testType).map((testType, idx) => {
                const fields = TEST_FIELD_DEFINITIONS[testType] || [];
                
                if (fields.length === 0) {
                  return (
                    <div key={idx} className="border-l-4 border-medical-blue pl-4">
                      <h4 className="font-semibold text-base mb-2">
                        {idx + 1}. {testType}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        No predefined parameters for this test type. Please add results manually.
                      </p>
                    </div>
                  );
                }

                return (
                  <div key={idx} className="border-l-4 border-medical-blue pl-4">
                    <h4 className="font-semibold text-base mb-4">
                      {idx + 1}. {testType}
                    </h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      {fields.length} parameters
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {fields.map((field, fieldIdx) => (
                        <div key={fieldIdx} className="space-y-2">
                          <Label htmlFor={`${testType}_${field.name}`}>
                            {field.name} 
                            <span className="text-xs text-muted-foreground ml-2">
                              (Ref: {field.referenceRange})
                            </span>
                          </Label>
                          <Input
                            id={`${testType}_${field.name}`}
                            placeholder={`Enter ${field.name}`}
                            value={generateFormData[`${testType}_${field.name}`] || ''}
                            onChange={(e) => handleInputChange(`${testType}_${field.name}`, e.target.value)}
                            data-testid={`input-${testType}-${field.name}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Clinical Notes */}
              <div className="space-y-2">
                <Label htmlFor="clinicalNotes">Clinical Notes (Optional)</Label>
                <Textarea
                  id="clinicalNotes"
                  placeholder="Enter any clinical observations or notes..."
                  value={generateFormData.clinicalNotes || ''}
                  onChange={(e) => handleInputChange('clinicalNotes', e.target.value)}
                  rows={4}
                  data-testid="textarea-clinical-notes"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowGenerateDialog(false)}
                  className="flex-1"
                  data-testid="button-cancel-generate"
                >
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  data-testid="button-preview-result"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Preview
                </Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  data-testid="button-generate-lab-result"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Lab Result
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
