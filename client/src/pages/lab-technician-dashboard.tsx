import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  Filter,
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
  "Sputum Culture": [
    { name: "Specimen Type", unit: "", referenceRange: "Sputum" },
    { name: "Culture Result", unit: "", referenceRange: "Normal Flora/No Growth" },
    { name: "Organism Isolated", unit: "", referenceRange: "None" },
    { name: "Colony Count", unit: "CFU/mL", referenceRange: "<10³" },
    { name: "Gram Stain", unit: "", referenceRange: "N/A" },
  ],
  "Blood Culture & Sensitivity": [
    { name: "Blood Culture Result", unit: "", referenceRange: "No Growth" },
    { name: "Organism Identified", unit: "", referenceRange: "None" },
    { name: "Time to Detection", unit: "hours", referenceRange: "N/A" },
    { name: "Antibiotic Sensitivity", unit: "", referenceRange: "N/A" },
    { name: "Resistance Pattern", unit: "", referenceRange: "None" },
  ],
  "Viral Panels / PCR Tests (e.g. COVID-19": [
    { name: "COVID-19 PCR", unit: "", referenceRange: "Negative" },
    { name: "Viral Load (Ct Value)", unit: "Ct", referenceRange: ">35" },
    { name: "Specimen Quality", unit: "", referenceRange: "Adequate" },
  ],
  "Influenza)": [
    { name: "Influenza A PCR", unit: "", referenceRange: "Negative" },
    { name: "Influenza B PCR", unit: "", referenceRange: "Negative" },
    { name: "RSV PCR", unit: "", referenceRange: "Negative" },
  ],
  "Tumor Markers (e.g. CA-125": [
    { name: "CA-125 (Ovarian)", unit: "U/mL", referenceRange: "<35" },
    { name: "CA 19-9 (Pancreatic)", unit: "U/mL", referenceRange: "<37" },
    { name: "CA 15-3 (Breast)", unit: "U/mL", referenceRange: "<30" },
  ],
  "CEA": [
    { name: "CEA (Carcinoembryonic Antigen)", unit: "ng/mL", referenceRange: "<3.0" },
    { name: "CEA Interpretation", unit: "", referenceRange: "Normal" },
  ],
  "AFP)": [
    { name: "AFP (Alpha-Fetoprotein)", unit: "ng/mL", referenceRange: "<10" },
    { name: "AFP Interpretation", unit: "", referenceRange: "Normal" },
  ],
  // Common Additional Tests
  "Lipid Panel": [
    { name: "Total Cholesterol", unit: "mg/dL", referenceRange: "<200" },
    { name: "HDL Cholesterol", unit: "mg/dL", referenceRange: ">40" },
    { name: "LDL Cholesterol", unit: "mg/dL", referenceRange: "<100" },
    { name: "Triglycerides", unit: "mg/dL", referenceRange: "<150" },
    { name: "VLDL Cholesterol", unit: "mg/dL", referenceRange: "<30" },
  ],
  "Liver Function Test (LFT)": [
    { name: "Total Bilirubin", unit: "mg/dL", referenceRange: "0.3 - 1.2" },
    { name: "Direct Bilirubin", unit: "mg/dL", referenceRange: "0.0 - 0.3" },
    { name: "SGOT/AST", unit: "U/L", referenceRange: "5 - 40" },
    { name: "SGPT/ALT", unit: "U/L", referenceRange: "7 - 56" },
    { name: "Alkaline Phosphatase (ALP)", unit: "U/L", referenceRange: "44 - 147" },
    { name: "Total Protein", unit: "g/dL", referenceRange: "6.0 - 8.3" },
    { name: "Albumin", unit: "g/dL", referenceRange: "3.5 - 5.5" },
    { name: "Globulin", unit: "g/dL", referenceRange: "2.0 - 3.5" },
  ],
  "Kidney Function Test (KFT)": [
    { name: "Blood Urea", unit: "mg/dL", referenceRange: "15 - 40" },
    { name: "Serum Creatinine", unit: "mg/dL", referenceRange: "0.7 - 1.3" },
    { name: "Blood Urea Nitrogen (BUN)", unit: "mg/dL", referenceRange: "7 - 20" },
    { name: "Uric Acid", unit: "mg/dL", referenceRange: "3.5 - 7.2" },
    { name: "Sodium (Na+)", unit: "mEq/L", referenceRange: "136 - 145" },
    { name: "Potassium (K+)", unit: "mEq/L", referenceRange: "3.5 - 5.0" },
    { name: "Chloride (Cl-)", unit: "mEq/L", referenceRange: "96 - 106" },
  ],
  "Thyroid Function Test": [
    { name: "TSH", unit: "μIU/mL", referenceRange: "0.4 - 4.0" },
    { name: "Free T3", unit: "pg/mL", referenceRange: "2.3 - 4.2" },
    { name: "Free T4", unit: "ng/dL", referenceRange: "0.8 - 1.8" },
    { name: "Total T3", unit: "ng/dL", referenceRange: "80 - 200" },
    { name: "Total T4", unit: "μg/dL", referenceRange: "5.0 - 12.0" },
  ],
  "HbA1c (Diabetes)": [
    { name: "HbA1c", unit: "%", referenceRange: "<5.7" },
    { name: "Average Blood Glucose", unit: "mg/dL", referenceRange: "<117" },
  ],
  "Urinalysis": [
    { name: "Color", unit: "", referenceRange: "Yellow" },
    { name: "Appearance", unit: "", referenceRange: "Clear" },
    { name: "pH", unit: "", referenceRange: "5.0 - 7.0" },
    { name: "Specific Gravity", unit: "", referenceRange: "1.010 - 1.030" },
    { name: "Protein", unit: "", referenceRange: "Negative" },
    { name: "Glucose", unit: "", referenceRange: "Negative" },
    { name: "Ketones", unit: "", referenceRange: "Negative" },
    { name: "Blood", unit: "", referenceRange: "Negative" },
    { name: "Bilirubin", unit: "", referenceRange: "Negative" },
    { name: "Leukocytes", unit: "", referenceRange: "Negative" },
  ],
  "Hormonal tests (Cortisol": [
    { name: "Morning Cortisol", unit: "μg/dL", referenceRange: "5.0 - 25.0" },
    { name: "Evening Cortisol", unit: "μg/dL", referenceRange: "3.0 - 16.0" },
    { name: "24-hour Urinary Cortisol", unit: "μg/24hr", referenceRange: "10 - 100" },
  ],
  "ACTH)": [
    { name: "ACTH Level", unit: "pg/mL", referenceRange: "10 - 60" },
    { name: "Sample Collection Time", unit: "", referenceRange: "8:00 AM" },
  ],
  "Stool Culture / Ova & Parasites": [
    { name: "Stool Consistency", unit: "", referenceRange: "Formed" },
    { name: "Culture Result", unit: "", referenceRange: "Normal Flora" },
    { name: "Pathogenic Bacteria", unit: "", referenceRange: "None Detected" },
    { name: "Ova/Cysts", unit: "", referenceRange: "Not Seen" },
    { name: "Parasites", unit: "", referenceRange: "Not Detected" },
    { name: "WBC in Stool", unit: "/HPF", referenceRange: "<5" },
  ],
  "Autoimmune Panels (ANA": [
    { name: "ANA Titer", unit: "", referenceRange: "<1:40" },
    { name: "ANA Pattern", unit: "", referenceRange: "Negative" },
    { name: "Anti-dsDNA", unit: "IU/mL", referenceRange: "<30" },
  ],
  "ENA": [
    { name: "Anti-Sm", unit: "", referenceRange: "Negative" },
    { name: "Anti-RNP", unit: "", referenceRange: "Negative" },
    { name: "Anti-SSA (Ro)", unit: "", referenceRange: "Negative" },
    { name: "Anti-SSB (La)", unit: "", referenceRange: "Negative" },
    { name: "Anti-Scl-70", unit: "", referenceRange: "Negative" },
  ],
  "Rheumatoid Factor)": [
    { name: "Rheumatoid Factor (RF)", unit: "IU/mL", referenceRange: "<20" },
    { name: "RF Interpretation", unit: "", referenceRange: "Negative" },
  ],
  "Blood Culture & Sensitivity | Tumor Markers (e.g. CA-125": [
    { name: "Blood Culture Result", unit: "", referenceRange: "No Growth" },
    { name: "Organism Identified", unit: "", referenceRange: "None" },
    { name: "CA-125 (Ovarian)", unit: "U/mL", referenceRange: "<35" },
  ],
  "AFP) | Autoimmune Panels (ANA": [
    { name: "AFP (Alpha-Fetoprotein)", unit: "ng/mL", referenceRange: "<10" },
    { name: "ANA Titer", unit: "", referenceRange: "<1:40" },
    { name: "ANA Pattern", unit: "", referenceRange: "Negative" },
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
  nhsNumber?: string;
  patientEmail?: string;
}

export default function LabTechnicianDashboard() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [selectedTest, setSelectedTest] = useState<LabTest | null>(null);
  const [generateFormData, setGenerateFormData] = useState<any>({});
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [showPaidOnly, setShowPaidOnly] = useState(false);
  const [showCollectedOnly, setShowCollectedOnly] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch lab tests for lab technician
  const { data: labTests = [], isLoading } = useQuery({
    queryKey: ["/api/lab-technician/tests"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/lab-technician/tests");
      return response.json();
    },
  });

  // Filter lab tests based on search query and filters
  const filteredTests = labTests.filter((test: LabTest) => {
    // Search filter
    const query = searchQuery.toLowerCase();
    const matchesSearch = !query || (
      test.testId.toLowerCase().includes(query) ||
      test.testType.toLowerCase().includes(query) ||
      test.patientName.toLowerCase().includes(query) ||
      test.doctorName.toLowerCase().includes(query) ||
      (test.invoiceNumber && test.invoiceNumber.toLowerCase().includes(query)) ||
      (test.nhsNumber && test.nhsNumber.toLowerCase().includes(query)) ||
      (test.patientEmail && test.patientEmail.toLowerCase().includes(query))
    );

    // Invoice status filter (toggle)
    const matchesInvoiceStatus = !showPaidOnly || test.invoiceStatus === "paid";

    // Sample collected filter (toggle)
    const matchesSampleCollected = !showCollectedOnly || test.sampleCollected === true;

    return matchesSearch && matchesInvoiceStatus && matchesSampleCollected;
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

  // Handle generate and save lab result
  const handleGenerateLabResult = async () => {
    if (!selectedTest) return;

    setIsSaving(true);
    try {
      const response = await apiRequest("POST", "/api/lab-results/generate", {
        body: JSON.stringify({
          labResultId: selectedTest.id,
          testId: selectedTest.testId,
          patientId: selectedTest.patientId,
          testData: generateFormData,
          testTypes: parseTestTypes(selectedTest.testType)
        })
      });

      if (response.ok) {
        const result = await response.json();
        setShowGenerateDialog(false);
        setGenerateFormData({});
        setSelectedTest(null);
        // Show success message or toast
        alert(`Lab result generated successfully! File saved at: ${result.filePath}`);
      } else {
        throw new Error("Failed to generate lab result");
      }
    } catch (error) {
      console.error("Error generating lab result:", error);
      alert("Failed to generate lab result. Please try again.");
    } finally {
      setIsSaving(false);
    }
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
              placeholder="Search by Test ID, Invoice No., Patient Name, NHS No., Email..."
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

        {/* Filter Toggles */}
        <div className="flex flex-wrap gap-6 items-center bg-muted/50 p-4 rounded-lg">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filters:</span>
          </div>
          
          {/* Invoice Status Toggle */}
          <div className="flex items-center gap-3">
            <Switch
              id="paid-toggle"
              checked={showPaidOnly}
              onCheckedChange={setShowPaidOnly}
              data-testid="toggle-paid-only"
            />
            <Label htmlFor="paid-toggle" className="cursor-pointer">
              Show Paid Invoices Only
            </Label>
          </div>

          {/* Sample Collection Toggle */}
          <div className="flex items-center gap-3">
            <Switch
              id="collected-toggle"
              checked={showCollectedOnly}
              onCheckedChange={setShowCollectedOnly}
              data-testid="toggle-collected-only"
            />
            <Label htmlFor="collected-toggle" className="cursor-pointer">
              Show Sample Collected Only
            </Label>
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

                    {/* Invoice Number Display */}
                    {test.invoiceNumber && (
                      <div className="bg-muted/50 px-3 py-2 rounded">
                        <p className="text-xs text-muted-foreground">Invoice</p>
                        <p className="font-medium text-sm">{test.invoiceNumber}</p>
                      </div>
                    )}

                    {/* Badges Row */}
                    <div className="flex flex-wrap gap-2">
                      {test.sampleCollected && (
                        <Badge className="bg-green-600 hover:bg-green-700">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Sample Collected
                        </Badge>
                      )}
                      {test.invoiceStatus === 'paid' ? (
                        <Badge className="bg-blue-600 hover:bg-blue-700">
                          Paid
                        </Badge>
                      ) : (
                        <Badge className="bg-orange-600 hover:bg-orange-700">
                          Unpaid
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
                  onClick={handleGenerateLabResult}
                  disabled={isSaving}
                  data-testid="button-generate-lab-result"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {isSaving ? "Generating..." : "Generate Lab Result"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
