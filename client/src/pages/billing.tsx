import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { isDoctorLike } from "@/lib/role-utils";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import jsPDF from "jspdf";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { 
  Receipt, 
  Plus, 
  Search, 
  DollarSign, 
  CreditCard, 
  FileText, 
  Calendar,
  User,
  Download,
  Eye,
  Send,
  AlertTriangle,
  CheckCircle,
  Clock,
  Trash2,
  BarChart3,
  TrendingUp,
  Filter,
  PieChart,
  FileBarChart,
  Target,
  Edit,
  LayoutGrid,
  List
} from "lucide-react";

interface Invoice {
  id: number;
  organizationId: number;
  invoiceNumber?: string;
  patientId: string;
  patientName: string;
  dateOfService: string;
  invoiceDate: string;
  dueDate: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  totalAmount: number;
  paidAmount: number;
  items: Array<{
    code: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  insurance?: {
    provider: string;
    claimNumber: string;
    status: 'pending' | 'approved' | 'denied' | 'partially_paid';
    paidAmount: number;
  };
  payments: Array<{
    id: string;
    amount: number;
    method: 'cash' | 'card' | 'bank_transfer' | 'insurance';
    date: string;
    reference?: string;
  }>;
}

const DOCTOR_SERVICE_OPTIONS = [
  { value: "General Consultation", description: "Standard visit for diagnosis or follow-up" },
  { value: "Specialist Consultation", description: "Visit with a specialist doctor (e.g., Cardiologist)" },
  { value: "Follow-up Visit", description: "Follow-up within a certain time period" },
  { value: "Teleconsultation", description: "Online or phone consultation" },
  { value: "Emergency Visit", description: "Immediate or off-hours consultation" },
  { value: "Home Visit", description: "Doctor visits patient's home" },
  { value: "Procedure Consultation", description: "Pre- or post-surgery consultation" }
];

const ROLE_OPTIONS = [
  { value: "admin", label: "Administrator" },
  { value: "doctor", label: "Doctor" },
  { value: "nurse", label: "Nurse" },
  { value: "receptionist", label: "Receptionist" }
];

const LAB_TEST_OPTIONS = [
  "Complete Blood Count (CBC)",
  "Basic Metabolic Panel (BMP) / Chem-7",
  "Comprehensive Metabolic Panel (CMP)",
  "Lipid Profile (Cholesterol, LDL, HDL, Triglycerides)",
  "Thyroid Function Tests (TSH, Free T4, Free T3)",
  "Liver Function Tests (AST, ALT, ALP, Bilirubin)",
  "Kidney Function Tests (Creatinine, BUN, eGFR)",
  "Electrolytes (Sodium, Potassium, Chloride, Bicarbonate)",
  "Blood Glucose (Fasting / Random / Postprandial)",
  "Hemoglobin A1C (HbA1c)",
  "C-Reactive Protein (CRP)",
  "Erythrocyte Sedimentation Rate (ESR)",
  "Coagulation Tests (PT, PTT, INR)",
  "Urinalysis (UA)",
  "Albumin / Total Protein",
  "Iron Studies (Serum Iron, TIBC, Ferritin)",
  "Vitamin D",
  "Vitamin B12 / Folate",
  "Hormone Panels (e.g., LH, FSH, Testosterone, Estrogen)",
  "Prostate-Specific Antigen (PSA)",
  "Thyroid Antibodies (e.g. Anti-TPO, Anti-TG)",
  "Creatine Kinase (CK)",
  "Cardiac Biomarkers (Troponin, CK-MB, BNP)",
  "Electrolyte Panel",
  "Uric Acid",
  "Lipase / Amylase (Pancreatic enzymes)",
  "Hepatitis B / C Serologies",
  "HIV Antibody / Viral Load",
  "HCG (Pregnancy / Quantitative)",
  "Autoimmune Panels (ANA, ENA, Rheumatoid Factor)",
  "Tumor Markers (e.g. CA-125, CEA, AFP)",
  "Blood Culture & Sensitivity",
  "Stool Culture / Ova & Parasites",
  "Sputum Culture",
  "Viral Panels / PCR Tests (e.g. COVID-19, Influenza)",
  "Hormonal tests (Cortisol, ACTH)"
];

const IMAGING_TYPE_OPTIONS = [
  "X-ray (Radiography)",
  "CT (Computed Tomography)",
  "MRI (Magnetic Resonance Imaging)",
  "Ultrasound (Sonography)",
  "Mammography",
  "Fluoroscopy",
  "PET (Positron Emission Tomography)",
  "SPECT (Single Photon Emission CT)",
  "Nuclear Medicine Scans",
  "DEXA (Bone Densitometry)",
  "Angiography",
  "Interventional Radiology (IR)"
];

function PricingManagementDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pricingTab, setPricingTab] = useState("doctors");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [multipleServices, setMultipleServices] = useState<any[]>([
    { serviceName: "", serviceCode: "", category: "", basePrice: "" }
  ]);
  const [showServiceSuggestions, setShowServiceSuggestions] = useState(false);
  const [showRoleSuggestions, setShowRoleSuggestions] = useState(false);
  const [showDoctorSuggestions, setShowDoctorSuggestions] = useState(false);
  const [showLabTestSuggestions, setShowLabTestSuggestions] = useState(false);
  const [showLabRoleSuggestions, setShowLabRoleSuggestions] = useState(false);
  const [showLabDoctorSuggestions, setShowLabDoctorSuggestions] = useState(false);
  const [showImagingTypeSuggestions, setShowImagingTypeSuggestions] = useState(false);
  const [labTestFilter, setLabTestFilter] = useState("");
  const [labDoctorFilter, setLabDoctorFilter] = useState("");
  const [doctorFeeServiceFilter, setDoctorFeeServiceFilter] = useState("");
  const [doctorFeeDoctorFilter, setDoctorFeeDoctorFilter] = useState("");

  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    select: (data: any) => data || []
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["/api/roles"],
    select: (data: any) => data || []
  });

  const filteredUsers = users.filter((user: any) => {
    if (!formData.doctorRole) return true;
    return user.role === formData.doctorRole;
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('#serviceName') && !target.closest('.service-suggestions')) {
        setShowServiceSuggestions(false);
      }
      if (!target.closest('#doctorRole') && !target.closest('.role-suggestions')) {
        setShowRoleSuggestions(false);
      }
      if (!target.closest('#doctorName') && !target.closest('.doctor-suggestions')) {
        setShowDoctorSuggestions(false);
      }
      if (!target.closest('#testName') && !target.closest('.lab-test-suggestions')) {
        setShowLabTestSuggestions(false);
      }
      if (!target.closest('#labDoctorRole') && !target.closest('.lab-role-suggestions')) {
        setShowLabRoleSuggestions(false);
      }
      if (!target.closest('#labDoctorName') && !target.closest('.lab-doctor-suggestions')) {
        setShowLabDoctorSuggestions(false);
      }
      if (!target.closest('#imagingType') && !target.closest('.imaging-type-suggestions')) {
        setShowImagingTypeSuggestions(false);
      }
    };
    
    if (showServiceSuggestions || showRoleSuggestions || showDoctorSuggestions || 
        showLabTestSuggestions || showLabRoleSuggestions || showLabDoctorSuggestions || showImagingTypeSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showServiceSuggestions, showRoleSuggestions, showDoctorSuggestions, showLabTestSuggestions, showLabRoleSuggestions, showLabDoctorSuggestions, showImagingTypeSuggestions]);

  const getApiPath = (tab: string) => {
    const pathMap: Record<string, string> = {
      "doctors": "doctors-fees",
      "lab-tests": "lab-tests",
      "imaging": "imaging"
    };
    return pathMap[tab] || tab;
  };

  const { data: doctorsFees = [], isLoading: loadingDoctors } = useQuery({
    queryKey: ["/api/pricing/doctors-fees"],
    enabled: pricingTab === "doctors"
  });

  const { data: labTests = [], isLoading: loadingLabs } = useQuery({
    queryKey: ["/api/pricing/lab-tests"],
    enabled: pricingTab === "lab-tests"
  });

  const { data: imaging = [], isLoading: loadingImaging } = useQuery({
    queryKey: ["/api/pricing/imaging"],
    enabled: pricingTab === "imaging"
  });

  const generateImagingCode = (imagingType: string) => {
    const codeMap: Record<string, string> = {
      "X-ray (Radiography)": "XRAY",
      "CT (Computed Tomography)": "CT",
      "MRI (Magnetic Resonance Imaging)": "MRI",
      "Ultrasound (Sonography)": "US",
      "Mammography": "MAMMO",
      "Fluoroscopy": "FLUORO",
      "PET (Positron Emission Tomography)": "PET",
      "SPECT (Single Photon Emission CT)": "SPECT",
      "Nuclear Medicine Scans": "NM",
      "DEXA (Bone Densitometry)": "DEXA",
      "Angiography": "ANGIO",
      "Interventional Radiology (IR)": "IR"
    };
    
    const prefix = codeMap[imagingType] || "IMG";
    const timestamp = Date.now().toString().slice(-4);
    return `${prefix}${timestamp}`;
  };

  const handleDelete = async (type: string, id: number) => {
    try {
      const apiPath = getApiPath(type);
      await apiRequest('DELETE', `/api/pricing/${apiPath}/${id}`, {});
      queryClient.invalidateQueries({ queryKey: [`/api/pricing/${apiPath}`] });
      toast({ title: "Success", description: "Pricing entry deleted successfully" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete pricing entry", variant: "destructive" });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const apiPath = getApiPath(pricingTab);
      
      // Handle multiple services for doctors fees, lab tests, and imaging when not editing
      if ((pricingTab === "doctors" || pricingTab === "lab-tests" || pricingTab === "imaging") && !editingItem) {
        // Validation for doctors fees
        if (pricingTab === "doctors") {
          if (!formData.doctorRole || !formData.doctorName) {
            toast({
              title: "Validation Error",
              description: "Please select both Role and Name",
              variant: "destructive"
            });
            setIsSaving(false);
            return;
          }
          
          // Check for duplicate (doctorRole + doctorId combination)
          if (formData.doctorId) {
            try {
              const checkResponse = await apiRequest('GET', `/api/pricing/doctors-fees/check-duplicate?doctorRole=${encodeURIComponent(formData.doctorRole)}&doctorId=${formData.doctorId}`, undefined);
              const checkData = await checkResponse.json();
              
              if (checkData.exists) {
                toast({
                  title: "Duplicate Entry",
                  description: "Price already exists in the database",
                  variant: "destructive"
                });
                setIsSaving(false);
                return;
              }
            } catch (error: any) {
              console.error("Error checking for duplicate:", error);
            }
          }
        }
        
        const validServices = multipleServices.filter(
          service => service.serviceName && service.basePrice
        );
        
        if (validServices.length === 0) {
          toast({
            title: "Error",
            description: pricingTab === "doctors" 
              ? "Please add at least one service with name and price"
              : pricingTab === "lab-tests"
              ? "Please add at least one test with name and price"
              : "Please add at least one imaging service with name and price",
            variant: "destructive"
          });
          setIsSaving(false);
          return;
        }
        
        // Create all services/tests/imaging
        for (const service of validServices) {
          let payload: any = {};
          
          if (pricingTab === "doctors") {
            payload = {
              serviceName: service.serviceName,
              serviceCode: service.serviceCode,
              category: service.category,
              doctorId: formData.doctorId,
              doctorName: formData.doctorName,
              doctorRole: formData.doctorRole,
              basePrice: parseFloat(service.basePrice) || 0,
              isActive: true,
              currency: "GBP",
              version: 1
            };
          } else if (pricingTab === "lab-tests") {
            payload = {
              testName: service.serviceName,
              testCode: service.serviceCode,
              category: service.category,
              basePrice: parseFloat(service.basePrice) || 0,
              isActive: true,
              currency: "GBP",
              version: 1
            };
          } else if (pricingTab === "imaging") {
            payload = {
              imagingType: service.serviceName,
              imagingCode: service.serviceCode,
              modality: service.category,
              basePrice: parseFloat(service.basePrice) || 0,
              isActive: true,
              currency: "GBP",
              version: 1
            };
          }
          
          await apiRequest('POST', `/api/pricing/${apiPath}`, payload);
        }
        
        queryClient.invalidateQueries({ queryKey: [`/api/pricing/${apiPath}`] });
        toast({
          title: pricingTab === "doctors" 
            ? "Doctor Fee Added"
            : pricingTab === "lab-tests"
            ? "Lab Test Added"
            : "Imaging Service Added",
          description: pricingTab === "doctors" 
            ? `${validServices.length} service(s) created successfully`
            : pricingTab === "lab-tests"
            ? `${validServices.length} test(s) created successfully`
            : `${validServices.length} imaging service(s) created successfully`
        });
        setShowAddDialog(false);
        setMultipleServices([{ serviceName: "", serviceCode: "", category: "", basePrice: "" }]);
        setFormData({});
      } else {
        // Original single save logic for editing or other tabs
        const endpoint = editingItem 
          ? `/api/pricing/${apiPath}/${editingItem.id}`
          : `/api/pricing/${apiPath}`;
        const method = editingItem ? 'PATCH' : 'POST';
        
        // Build payload based on pricing tab
        let payload: any = {};
        
        if (pricingTab === "doctors") {
          payload = {
            serviceName: formData.serviceName,
            serviceCode: formData.serviceCode,
            category: formData.category,
            doctorId: formData.doctorId,
            doctorName: formData.doctorName,
            doctorRole: formData.doctorRole,
            basePrice: parseFloat(formData.basePrice) || 0,
            currency: formData.currency || "GBP",
            isActive: formData.isActive !== undefined ? formData.isActive : true
          };
        } else if (pricingTab === "lab-tests") {
          payload = {
            testName: formData.testName,
            testCode: formData.testCode,
            category: formData.category,
            basePrice: parseFloat(formData.basePrice) || 0,
            currency: formData.currency || "USD",
            isActive: formData.isActive !== undefined ? formData.isActive : true
          };
        } else if (pricingTab === "imaging") {
          payload = {
            imagingType: formData.imagingType,
            imagingCode: formData.imagingCode,
            modality: formData.modality,
            bodyPart: formData.bodyPart,
            basePrice: parseFloat(formData.basePrice) || 0,
            currency: formData.currency || "USD",
            isActive: formData.isActive !== undefined ? formData.isActive : true
          };
        } else {
          payload = {
            ...formData,
            basePrice: parseFloat(formData.basePrice) || 0
          };
        }
        
        await apiRequest(method, endpoint, payload);

        queryClient.invalidateQueries({ queryKey: [`/api/pricing/${apiPath}`] });
        toast({ 
          title: "Success", 
          description: editingItem ? "Pricing updated successfully" : "Pricing created successfully" 
        });
        setShowAddDialog(false);
        setEditingItem(null);
        setFormData({});
      }
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to save pricing", 
        variant: "destructive" 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const openAddDialog = () => {
    setFormData({
      isActive: true,
      currency: "GBP",
      version: 1
    });
    
    // Pre-populate with predefined services for doctors fees
    if (pricingTab === "doctors") {
      const predefinedServices = [
        { serviceName: "General Consultation", serviceCode: "GC001", category: "Standard visit for diagnosis or follow-up", basePrice: "50" },
        { serviceName: "Specialist Consultation", serviceCode: "SC001", category: "Visit with a specialist doctor (e.g., Cardiologist)", basePrice: "120" },
        { serviceName: "Follow-up Visit", serviceCode: "FV001", category: "Follow-up within a certain time period", basePrice: "30" },
        { serviceName: "Teleconsultation", serviceCode: "TC001", category: "Online or phone consultation", basePrice: "40" },
        { serviceName: "Emergency Visit", serviceCode: "EV001", category: "Immediate or off-hours consultation", basePrice: "150" },
        { serviceName: "Home Visit", serviceCode: "HV001", category: "Doctor visits patient's home", basePrice: "100" },
        { serviceName: "Procedure Consultation", serviceCode: "PC001", category: "Pre- or post-surgery consultation", basePrice: "" }
      ];
      setMultipleServices(predefinedServices);
    } else if (pricingTab === "imaging") {
      // Pre-populate with all imaging types and auto-generated codes
      const predefinedImagingServices = IMAGING_TYPE_OPTIONS.map((imagingType) => ({
        serviceName: imagingType,
        serviceCode: generateImagingCode(imagingType),
        category: "",
        basePrice: ""
      }));
      setMultipleServices(predefinedImagingServices);
    } else if (pricingTab === "lab-tests") {
      const predefinedLabTests = [
        { serviceName: "Complete Blood Count (CBC)", serviceCode: "CBC001", category: "Hematology", basePrice: "" },
        { serviceName: "Basic Metabolic Panel (BMP) / Chem-7", serviceCode: "BMP001", category: "Chemistry", basePrice: "" },
        { serviceName: "Comprehensive Metabolic Panel (CMP)", serviceCode: "CMP001", category: "Chemistry", basePrice: "" },
        { serviceName: "Lipid Profile (Cholesterol, LDL, HDL, Triglycerides)", serviceCode: "LP001", category: "Chemistry", basePrice: "" },
        { serviceName: "Thyroid Function Tests (TSH, Free T4, Free T3)", serviceCode: "TFT001", category: "Endocrinology", basePrice: "" },
        { serviceName: "Liver Function Tests (AST, ALT, ALP, Bilirubin)", serviceCode: "LFT001", category: "Chemistry", basePrice: "" },
        { serviceName: "Kidney Function Tests (Creatinine, BUN, eGFR)", serviceCode: "KFT001", category: "Chemistry", basePrice: "" },
        { serviceName: "Electrolytes (Sodium, Potassium, Chloride, Bicarbonate)", serviceCode: "E001", category: "Chemistry", basePrice: "" },
        { serviceName: "Blood Glucose (Fasting / Random / Postprandial)", serviceCode: "BG001", category: "Chemistry", basePrice: "" },
        { serviceName: "Hemoglobin A1C (HbA1c)", serviceCode: "HA001", category: "Chemistry", basePrice: "" },
        { serviceName: "C-Reactive Protein (CRP)", serviceCode: "CRP001", category: "Immunology", basePrice: "" },
        { serviceName: "Erythrocyte Sedimentation Rate (ESR)", serviceCode: "ESR001", category: "Hematology", basePrice: "" },
        { serviceName: "Coagulation Tests (PT, PTT, INR)", serviceCode: "CT001", category: "Hematology", basePrice: "" },
        { serviceName: "Urinalysis (UA)", serviceCode: "UA001", category: "Urinalysis", basePrice: "" },
        { serviceName: "Albumin / Total Protein", serviceCode: "ATP001", category: "Chemistry", basePrice: "" },
        { serviceName: "Iron Studies (Serum Iron, TIBC, Ferritin)", serviceCode: "IS001", category: "Hematology", basePrice: "" },
        { serviceName: "Vitamin D", serviceCode: "VD001", category: "Chemistry", basePrice: "" },
        { serviceName: "Vitamin B12 / Folate", serviceCode: "VBF001", category: "Chemistry", basePrice: "" },
        { serviceName: "Hormone Panels (e.g., LH, FSH, Testosterone, Estrogen)", serviceCode: "HP001", category: "Endocrinology", basePrice: "" },
        { serviceName: "Prostate-Specific Antigen (PSA)", serviceCode: "PSA001", category: "Oncology", basePrice: "" },
        { serviceName: "Thyroid Antibodies (e.g. Anti-TPO, Anti-TG)", serviceCode: "TA001", category: "Immunology", basePrice: "" },
        { serviceName: "Creatine Kinase (CK)", serviceCode: "CK001", category: "Chemistry", basePrice: "" },
        { serviceName: "Cardiac Biomarkers (Troponin, CK-MB, BNP)", serviceCode: "CB001", category: "Cardiology", basePrice: "" },
        { serviceName: "Electrolyte Panel", serviceCode: "EP001", category: "Chemistry", basePrice: "" },
        { serviceName: "Uric Acid", serviceCode: "UA002", category: "Chemistry", basePrice: "" },
        { serviceName: "Lipase / Amylase (Pancreatic enzymes)", serviceCode: "LA001", category: "Chemistry", basePrice: "" },
        { serviceName: "Hepatitis B / C Serologies", serviceCode: "HBC001", category: "Serology", basePrice: "" },
        { serviceName: "HIV Antibody / Viral Load", serviceCode: "HIV001", category: "Serology", basePrice: "" },
        { serviceName: "HCG (Pregnancy / Quantitative)", serviceCode: "HCG001", category: "Endocrinology", basePrice: "" },
        { serviceName: "Autoimmune Panels (ANA, ENA, Rheumatoid Factor)", serviceCode: "AP001", category: "Immunology", basePrice: "" },
        { serviceName: "Tumor Markers (e.g. CA-125, CEA, AFP)", serviceCode: "TM001", category: "Oncology", basePrice: "" },
        { serviceName: "Blood Culture & Sensitivity", serviceCode: "BCS001", category: "Microbiology", basePrice: "" },
        { serviceName: "Stool Culture / Ova & Parasites", serviceCode: "SCOP001", category: "Microbiology", basePrice: "" },
        { serviceName: "Sputum Culture", serviceCode: "SC001", category: "Microbiology", basePrice: "" },
        { serviceName: "Viral Panels / PCR Tests (e.g. COVID-19, Influenza)", serviceCode: "VP001", category: "Microbiology", basePrice: "" },
        { serviceName: "Hormonal tests (Cortisol, ACTH)", serviceCode: "HT001", category: "Endocrinology", basePrice: "" }
      ];
      setMultipleServices(predefinedLabTests);
    } else {
      setMultipleServices([{ serviceName: "", serviceCode: "", category: "", basePrice: "" }]);
    }
    
    setEditingItem(null);
    setShowAddDialog(true);
  };

  const openEditDialog = (item: any) => {
    setFormData(item);
    setEditingItem(item);
    setShowAddDialog(true);
  };

  return (
    <Tabs value={pricingTab} onValueChange={setPricingTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="doctors" data-testid="tab-doctors-pricing">Doctors Fees</TabsTrigger>
        <TabsTrigger value="lab-tests" data-testid="tab-lab-tests-pricing">Lab Tests</TabsTrigger>
        <TabsTrigger value="imaging" data-testid="tab-imaging-pricing">Imaging</TabsTrigger>
      </TabsList>

      <TabsContent value="doctors" className="space-y-4 mt-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Doctors Fee Pricing</h3>
          <Button size="sm" onClick={openAddDialog} data-testid="button-add-doctor-fee">
            <Plus className="h-4 w-4 mr-2" />
            Add Doctor Fee
          </Button>
        </div>
        
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <Label htmlFor="filter-service-name">Filter by Service Name</Label>
            <Input
              id="filter-service-name"
              placeholder="Search service name..."
              value={doctorFeeServiceFilter}
              onChange={(e) => setDoctorFeeServiceFilter(e.target.value)}
              data-testid="input-filter-service-name"
            />
          </div>
          <div className="flex-1">
            <Label htmlFor="filter-fee-doctor-name">Filter by Doctor Name</Label>
            <Input
              id="filter-fee-doctor-name"
              placeholder="Search doctor name..."
              value={doctorFeeDoctorFilter}
              onChange={(e) => setDoctorFeeDoctorFilter(e.target.value)}
              data-testid="input-filter-fee-doctor-name"
            />
          </div>
          {(doctorFeeServiceFilter || doctorFeeDoctorFilter) && (
            <div className="flex items-end">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setDoctorFeeServiceFilter("");
                  setDoctorFeeDoctorFilter("");
                }}
                data-testid="button-clear-fee-filters"
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>
        
        {loadingDoctors ? (
          <div className="text-center py-8">Loading...</div>
        ) : doctorsFees.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No doctor fees configured yet. Click "Add Doctor Fee" to get started.</p>
          </div>
        ) : (() => {
          const filteredFees = doctorsFees.filter((fee: any) => {
            const matchServiceName = !doctorFeeServiceFilter || 
              fee.serviceName?.toLowerCase().includes(doctorFeeServiceFilter.toLowerCase());
            const matchDoctorName = !doctorFeeDoctorFilter || 
              fee.doctorName?.toLowerCase().includes(doctorFeeDoctorFilter.toLowerCase());
            return matchServiceName && matchDoctorName;
          });

          return filteredFees.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No doctor fees match your filters. Try adjusting your search criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 dark:bg-gray-800">
                    <th className="text-left p-3">Service Name</th>
                    <th className="text-left p-3">Doctor Name</th>
                    <th className="text-left p-3">Code</th>
                    <th className="text-left p-3">Category</th>
                    <th className="text-left p-3">Price</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Version</th>
                    <th className="text-left p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFees.map((fee: any) => (
                    <tr key={fee.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800" data-testid={`row-doctor-fee-${fee.id}`}>
                      <td className="p-3 font-medium">{fee.serviceName}</td>
                      <td className="p-3">{fee.doctorName || '-'}</td>
                      <td className="p-3">{fee.serviceCode || '-'}</td>
                      <td className="p-3">{fee.category || '-'}</td>
                      <td className="p-3 font-semibold">{fee.currency} {fee.basePrice}</td>
                      <td className="p-3">
                        <Badge variant={fee.isActive ? "default" : "secondary"}>
                          {fee.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="p-3">v{fee.version}</td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEditDialog(fee)} data-testid={`button-edit-${fee.id}`}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleDelete("doctors-fees", fee.id)} data-testid={`button-delete-${fee.id}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}
      </TabsContent>

      <TabsContent value="lab-tests" className="space-y-4 mt-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Lab Test Pricing</h3>
          <Button size="sm" onClick={openAddDialog} data-testid="button-add-lab-test">
            <Plus className="h-4 w-4 mr-2" />
            Add Lab Test
          </Button>
        </div>
        
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <Label htmlFor="filter-test-name">Filter by Test Name</Label>
            <Input
              id="filter-test-name"
              placeholder="Search test name..."
              value={labTestFilter}
              onChange={(e) => setLabTestFilter(e.target.value)}
              data-testid="input-filter-test-name"
            />
          </div>
          <div className="flex-1">
            <Label htmlFor="filter-doctor-name">Filter by Doctor Name</Label>
            <Input
              id="filter-doctor-name"
              placeholder="Search doctor name..."
              value={labDoctorFilter}
              onChange={(e) => setLabDoctorFilter(e.target.value)}
              data-testid="input-filter-doctor-name"
            />
          </div>
          {(labTestFilter || labDoctorFilter) && (
            <div className="flex items-end">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setLabTestFilter("");
                  setLabDoctorFilter("");
                }}
                data-testid="button-clear-filters"
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>
        
        {loadingLabs ? (
          <div className="text-center py-8">Loading...</div>
        ) : labTests.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No lab test pricing configured yet. Click "Add Lab Test" to get started.</p>
          </div>
        ) : (() => {
          const filteredTests = labTests.filter((test: any) => {
            const matchTestName = !labTestFilter || 
              test.testName?.toLowerCase().includes(labTestFilter.toLowerCase());
            const matchDoctorName = !labDoctorFilter || 
              test.doctorName?.toLowerCase().includes(labDoctorFilter.toLowerCase());
            return matchTestName && matchDoctorName;
          });

          return filteredTests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No lab tests match your filters. Try adjusting your search criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 dark:bg-gray-800">
                    <th className="text-left p-3">Test Name</th>
                    <th className="text-left p-3">Code</th>
                    <th className="text-left p-3">Category</th>
                    <th className="text-left p-3">Price</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Version</th>
                    <th className="text-left p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTests.map((test: any) => (
                    <tr key={test.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800" data-testid={`row-lab-test-${test.id}`}>
                      <td className="p-3 font-medium">{test.testName}</td>
                      <td className="p-3">{test.testCode || '-'}</td>
                      <td className="p-3">{test.category || '-'}</td>
                      <td className="p-3 font-semibold">{test.currency} {test.basePrice}</td>
                      <td className="p-3">
                        <Badge variant={test.isActive ? "default" : "secondary"}>
                          {test.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="p-3">v{test.version}</td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEditDialog(test)} data-testid={`button-edit-${test.id}`}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleDelete("lab-tests", test.id)} data-testid={`button-delete-${test.id}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}
      </TabsContent>

      <TabsContent value="imaging" className="space-y-4 mt-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Imaging Pricing</h3>
          <Button size="sm" onClick={openAddDialog} data-testid="button-add-imaging">
            <Plus className="h-4 w-4 mr-2" />
            Add Imaging Service
          </Button>
        </div>
        
        {loadingImaging ? (
          <div className="text-center py-8">Loading...</div>
        ) : imaging.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No imaging pricing configured yet. Click "Add Imaging Service" to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 dark:bg-gray-800">
                  <th className="text-left p-3">Imaging Type</th>
                  <th className="text-left p-3">Code</th>
                  <th className="text-left p-3">Modality</th>
                  <th className="text-left p-3">Body Part</th>
                  <th className="text-left p-3">Price</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Version</th>
                  <th className="text-left p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {imaging.map((img: any) => (
                  <tr key={img.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800" data-testid={`row-imaging-${img.id}`}>
                    <td className="p-3 font-medium">{img.imagingType}</td>
                    <td className="p-3">{img.imagingCode || '-'}</td>
                    <td className="p-3">{img.modality || '-'}</td>
                    <td className="p-3">{img.bodyPart || '-'}</td>
                    <td className="p-3 font-semibold">{img.currency} {img.basePrice}</td>
                    <td className="p-3">
                      <Badge variant={img.isActive ? "default" : "secondary"}>
                        {img.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="p-3">v{img.version}</td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEditDialog(img)} data-testid={`button-edit-${img.id}`}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDelete("imaging", img.id)} data-testid={`button-delete-${img.id}`}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TabsContent>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit" : "Add"} {pricingTab === "doctors" ? "Doctor Fee" : pricingTab === "lab-tests" ? "Lab Test" : "Imaging Service"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {pricingTab === "doctors" && !editingItem && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2 relative">
                    <Label htmlFor="bulkDoctorRole">Role <span className="text-red-500">*</span></Label>
                    <Input
                      id="bulkDoctorRole"
                      value={formData.doctorRole || ""}
                      onChange={(e) => {
                        setFormData({ ...formData, doctorRole: e.target.value, doctorName: "", doctorId: null });
                        setShowRoleSuggestions(true);
                      }}
                      onFocus={() => setShowRoleSuggestions(true)}
                      placeholder="Select role"
                      autoComplete="off"
                      required
                      data-testid="input-bulk-role"
                    />
                    {showRoleSuggestions && (
                      <div className="role-suggestions absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto top-full">
                        {roles
                          .filter((role: any) => 
                            role.name !== 'patient' && 
                            role.name !== 'admin' &&
                            (!formData.doctorRole || 
                            role.displayName.toLowerCase().includes(formData.doctorRole.toLowerCase()) ||
                            role.name.toLowerCase().includes(formData.doctorRole.toLowerCase()))
                          )
                          .map((role: any, index: number) => (
                            <div
                              key={index}
                              className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                              onClick={() => {
                                setFormData({ ...formData, doctorRole: role.name, doctorName: "", doctorId: null });
                                setShowRoleSuggestions(false);
                              }}
                            >
                              <div className="font-medium text-sm">{role.displayName}</div>
                            </div>
                          ))}
                        {roles.filter((role: any) => 
                          role.name !== 'patient' && 
                          role.name !== 'admin' &&
                          (!formData.doctorRole || 
                          role.displayName.toLowerCase().includes(formData.doctorRole.toLowerCase()) ||
                          role.name.toLowerCase().includes(formData.doctorRole.toLowerCase()))
                        ).length === 0 && formData.doctorRole && (
                          <div className="px-4 py-3 text-sm text-gray-500">
                            No roles found. You can enter a custom role name.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid gap-2 relative">
                    <Label htmlFor="bulkDoctorName">Select Name <span className="text-red-500">*</span></Label>
                    <Input
                      id="bulkDoctorName"
                      value={formData.doctorName || ""}
                      onChange={(e) => {
                        setFormData({ ...formData, doctorName: e.target.value });
                        setShowDoctorSuggestions(true);
                      }}
                      onFocus={() => setShowDoctorSuggestions(true)}
                      placeholder="Select or enter name"
                      autoComplete="off"
                      required
                      data-testid="input-bulk-name"
                    />
                    {showDoctorSuggestions && (
                      <div className="doctor-suggestions absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto top-full">
                        {filteredUsers
                          .filter((user: any) => {
                            const fullName = `${user.firstName} ${user.lastName}`;
                            return !formData.doctorName || 
                              fullName.toLowerCase().includes(formData.doctorName.toLowerCase());
                          })
                          .map((user: any, index: number) => (
                            <div
                              key={index}
                              className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                              onClick={() => {
                                const fullName = `${user.firstName} ${user.lastName}`;
                                setFormData({ 
                                  ...formData, 
                                  doctorName: fullName,
                                  doctorId: user.id,
                                  doctorRole: formData.doctorRole || user.role
                                });
                                setShowDoctorSuggestions(false);
                              }}
                            >
                              <div className="font-medium text-sm">{user.firstName} {user.lastName}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{user.role}</div>
                            </div>
                          ))}
                        {filteredUsers.filter((user: any) => {
                          const fullName = `${user.firstName} ${user.lastName}`;
                          return !formData.doctorName || 
                            fullName.toLowerCase().includes(formData.doctorName.toLowerCase());
                        }).length === 0 && (
                          <div className="px-4 py-3 text-sm text-gray-500">
                            No users found. {formData.doctorRole && `Try changing the role filter.`}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Services</Label>
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th className="text-left p-2 text-sm font-medium">Service Name *</th>
                          <th className="text-left p-2 text-sm font-medium">Service Code</th>
                          <th className="text-left p-2 text-sm font-medium">Category</th>
                          <th className="text-left p-2 text-sm font-medium">Base Price (£) *</th>
                          <th className="w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {multipleServices.map((service, index) => (
                          <tr key={index} className="border-t">
                            <td className="p-2">
                              <Input
                                value={service.serviceName}
                                onChange={(e) => {
                                  const updated = [...multipleServices];
                                  updated[index].serviceName = e.target.value;
                                  
                                  // Auto-generate service code from service name
                                  const words = e.target.value.trim().split(/\s+/);
                                  const initials = words.map(word => word.charAt(0).toUpperCase()).join('');
                                  if (initials) {
                                    updated[index].serviceCode = `${initials}001`;
                                  }
                                  
                                  setMultipleServices(updated);
                                }}
                                placeholder="e.g., General Consultation"
                                data-testid={`input-service-name-${index}`}
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                value={service.serviceCode}
                                onChange={(e) => {
                                  const updated = [...multipleServices];
                                  updated[index].serviceCode = e.target.value;
                                  setMultipleServices(updated);
                                }}
                                placeholder="e.g., GC001"
                                data-testid={`input-service-code-${index}`}
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                value={service.category}
                                onChange={(e) => {
                                  const updated = [...multipleServices];
                                  updated[index].category = e.target.value;
                                  setMultipleServices(updated);
                                }}
                                placeholder="e.g., Diagnostic"
                                data-testid={`input-category-${index}`}
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                step="0.01"
                                value={service.basePrice}
                                onChange={(e) => {
                                  const updated = [...multipleServices];
                                  updated[index].basePrice = e.target.value;
                                  setMultipleServices(updated);
                                }}
                                placeholder="0.00"
                                data-testid={`input-base-price-${index}`}
                              />
                            </td>
                            <td className="p-2">
                              {multipleServices.length > 1 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const updated = multipleServices.filter((_, i) => i !== index);
                                    setMultipleServices(updated);
                                  }}
                                  data-testid={`button-remove-service-${index}`}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMultipleServices([
                        ...multipleServices,
                        { serviceName: "", serviceCode: "", category: "", basePrice: "" }
                      ]);
                    }}
                    className="w-full"
                    data-testid="button-add-more-service"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add More Service
                  </Button>
                </div>
              </>
            )}

            {pricingTab === "doctors" && editingItem && (
              <>
                <div className="grid gap-2 relative">
                  <Label htmlFor="serviceName">Service Name *</Label>
                  <Input
                    id="serviceName"
                    value={formData.serviceName || ""}
                    onChange={(e) => {
                      setFormData({ ...formData, serviceName: e.target.value });
                      setShowServiceSuggestions(true);
                    }}
                    onFocus={() => setShowServiceSuggestions(true)}
                    placeholder="e.g., General Consultation"
                    autoComplete="off"
                  />
                  {showServiceSuggestions && (
                    <div className="service-suggestions absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto top-full">
                      {DOCTOR_SERVICE_OPTIONS
                        .filter(option => 
                          !formData.serviceName || 
                          option.value.toLowerCase().includes(formData.serviceName.toLowerCase()) ||
                          option.description.toLowerCase().includes(formData.serviceName.toLowerCase())
                        )
                        .map((option, index) => (
                          <div
                            key={index}
                            className="px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                            onClick={() => {
                              setFormData({ ...formData, serviceName: option.value });
                              setShowServiceSuggestions(false);
                            }}
                          >
                            <div className="font-medium text-sm">{option.value}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{option.description}</div>
                          </div>
                        ))}
                      {DOCTOR_SERVICE_OPTIONS.filter(option => 
                        !formData.serviceName || 
                        option.value.toLowerCase().includes(formData.serviceName.toLowerCase()) ||
                        option.description.toLowerCase().includes(formData.serviceName.toLowerCase())
                      ).length === 0 && formData.serviceName && (
                        <div className="px-4 py-3 text-sm text-gray-500">
                          No matches found. You can enter a custom service name.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid gap-2 relative">
                  <Label htmlFor="doctorRole">Role</Label>
                  <Input
                    id="doctorRole"
                    value={formData.doctorRole || ""}
                    onChange={(e) => {
                      setFormData({ ...formData, doctorRole: e.target.value, doctorName: "", doctorId: null });
                      setShowRoleSuggestions(true);
                    }}
                    onFocus={() => setShowRoleSuggestions(true)}
                    placeholder="Select role (optional)"
                    autoComplete="off"
                  />
                  {showRoleSuggestions && (
                    <div className="role-suggestions absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto top-full">
                      {roles
                        .filter((role: any) => 
                          role.name !== 'patient' && 
                          role.name !== 'admin' &&
                          (!formData.doctorRole || 
                          role.displayName.toLowerCase().includes(formData.doctorRole.toLowerCase()) ||
                          role.name.toLowerCase().includes(formData.doctorRole.toLowerCase()))
                        )
                        .map((role: any, index: number) => (
                          <div
                            key={index}
                            className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                            onClick={() => {
                              setFormData({ ...formData, doctorRole: role.name, doctorName: "", doctorId: null });
                              setShowRoleSuggestions(false);
                            }}
                          >
                            <div className="font-medium text-sm">{role.displayName}</div>
                          </div>
                        ))}
                      {roles.filter((role: any) => 
                        role.name !== 'patient' && 
                        role.name !== 'admin' &&
                        (!formData.doctorRole || 
                        role.displayName.toLowerCase().includes(formData.doctorRole.toLowerCase()) ||
                        role.name.toLowerCase().includes(formData.doctorRole.toLowerCase()))
                      ).length === 0 && formData.doctorRole && (
                        <div className="px-4 py-3 text-sm text-gray-500">
                          No roles found. You can enter a custom role name.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid gap-2 relative">
                  <Label htmlFor="doctorName">Select Name</Label>
                  <Input
                    id="doctorName"
                    value={formData.doctorName || ""}
                    onChange={(e) => {
                      setFormData({ ...formData, doctorName: e.target.value });
                      setShowDoctorSuggestions(true);
                    }}
                    onFocus={() => setShowDoctorSuggestions(true)}
                    placeholder="Select or enter name (optional)"
                    autoComplete="off"
                  />
                  {showDoctorSuggestions && (
                    <div className="doctor-suggestions absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto top-full">
                      {filteredUsers
                        .filter((user: any) => {
                          const fullName = `${user.firstName} ${user.lastName}`;
                          return !formData.doctorName || 
                            fullName.toLowerCase().includes(formData.doctorName.toLowerCase());
                        })
                        .map((user: any, index: number) => (
                          <div
                            key={index}
                            className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                            onClick={() => {
                              const fullName = `${user.firstName} ${user.lastName}`;
                              setFormData({ 
                                ...formData, 
                                doctorName: fullName,
                                doctorId: user.id,
                                doctorRole: formData.doctorRole || user.role
                              });
                              setShowDoctorSuggestions(false);
                            }}
                          >
                            <div className="font-medium text-sm">{user.firstName} {user.lastName}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{user.role}</div>
                          </div>
                        ))}
                      {filteredUsers.filter((user: any) => {
                        const fullName = `${user.firstName} ${user.lastName}`;
                        return !formData.doctorName || 
                          fullName.toLowerCase().includes(formData.doctorName.toLowerCase());
                      }).length === 0 && (
                        <div className="px-4 py-3 text-sm text-gray-500">
                          No users found. {formData.doctorRole && `Try changing the role filter.`}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="serviceCode">Service Code</Label>
                  <Input
                    id="serviceCode"
                    value={formData.serviceCode || ""}
                    onChange={(e) => setFormData({ ...formData, serviceCode: e.target.value })}
                    placeholder="e.g., GC001"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={formData.category || ""}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g., Consultation"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Input
                      id="currency"
                      value={formData.currency || "GBP"}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      placeholder="GBP"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="basePrice">Price *</Label>
                    <Input
                      id="basePrice"
                      type="number"
                      step="0.01"
                      value={formData.basePrice || ""}
                      onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </>
            )}

            {pricingTab === "lab-tests" && !editingItem && (
              <>
                <div className="space-y-2">
                  <Label>Lab Tests</Label>
                  <div className="border rounded-md overflow-hidden max-h-96 overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                        <tr>
                          <th className="text-left p-2 text-sm font-medium">Test Type *</th>
                          <th className="text-left p-2 text-sm font-medium">Code</th>
                          <th className="text-left p-2 text-sm font-medium">Category</th>
                          <th className="text-left p-2 text-sm font-medium">Price (£) *</th>
                          <th className="w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {multipleServices.map((service, index) => (
                          <tr key={index} className="border-t">
                            <td className="p-2">
                              <Input
                                value={service.serviceName}
                                onChange={(e) => {
                                  const updated = [...multipleServices];
                                  updated[index].serviceName = e.target.value;
                                  
                                  const words = e.target.value.trim().split(/\s+/);
                                  const initials = words.map(word => word.charAt(0).toUpperCase()).join('');
                                  if (initials) {
                                    updated[index].serviceCode = `${initials}001`;
                                  }
                                  
                                  setMultipleServices(updated);
                                }}
                                placeholder="e.g., Complete Blood Count"
                                data-testid={`input-test-name-${index}`}
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                value={service.serviceCode}
                                onChange={(e) => {
                                  const updated = [...multipleServices];
                                  updated[index].serviceCode = e.target.value;
                                  setMultipleServices(updated);
                                }}
                                placeholder="e.g., CBC001"
                                data-testid={`input-test-code-${index}`}
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                value={service.category}
                                onChange={(e) => {
                                  const updated = [...multipleServices];
                                  updated[index].category = e.target.value;
                                  setMultipleServices(updated);
                                }}
                                placeholder="e.g., Hematology"
                                data-testid={`input-test-category-${index}`}
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                step="0.01"
                                value={service.basePrice}
                                onChange={(e) => {
                                  const updated = [...multipleServices];
                                  updated[index].basePrice = e.target.value;
                                  setMultipleServices(updated);
                                }}
                                placeholder="0.00"
                                data-testid={`input-test-price-${index}`}
                              />
                            </td>
                            <td className="p-2">
                              {multipleServices.length > 1 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const updated = multipleServices.filter((_, i) => i !== index);
                                    setMultipleServices(updated);
                                  }}
                                  data-testid={`button-remove-test-${index}`}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMultipleServices([
                        ...multipleServices,
                        { serviceName: "", serviceCode: "", category: "", basePrice: "" }
                      ]);
                    }}
                    className="w-full"
                    data-testid="button-add-more-test"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add More Test
                  </Button>
                </div>
              </>
            )}

            {pricingTab === "lab-tests" && editingItem && (
              <>
                <div className="grid gap-2 relative">
                  <Label htmlFor="testName">Test Name *</Label>
                  <Input
                    id="testName"
                    value={formData.testName || ""}
                    onChange={(e) => {
                      setFormData({ ...formData, testName: e.target.value });
                      setShowLabTestSuggestions(true);
                    }}
                    onFocus={() => setShowLabTestSuggestions(true)}
                    placeholder="e.g., Complete Blood Count"
                    autoComplete="off"
                  />
                  {showLabTestSuggestions && (
                    <div className="lab-test-suggestions absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto top-full">
                      {LAB_TEST_OPTIONS
                        .filter(option => 
                          !formData.testName || 
                          option.toLowerCase().includes(formData.testName.toLowerCase())
                        )
                        .map((option, index) => (
                          <div
                            key={index}
                            className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                            onClick={() => {
                              setFormData({ ...formData, testName: option });
                              setShowLabTestSuggestions(false);
                            }}
                          >
                            <div className="font-medium text-sm">{option}</div>
                          </div>
                        ))}
                      {LAB_TEST_OPTIONS.filter(option => 
                        !formData.testName || 
                        option.toLowerCase().includes(formData.testName.toLowerCase())
                      ).length === 0 && formData.testName && (
                        <div className="px-4 py-3 text-sm text-gray-500">
                          No matches found. You can enter a custom test name.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="testCode">Test Code</Label>
                  <Input
                    id="testCode"
                    value={formData.testCode || ""}
                    onChange={(e) => setFormData({ ...formData, testCode: e.target.value })}
                    placeholder="e.g., CBC001"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={formData.category || ""}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g., Hematology"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Input
                      id="currency"
                      value={formData.currency || "USD"}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      placeholder="USD"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="basePrice">Price *</Label>
                    <Input
                      id="basePrice"
                      type="number"
                      step="0.01"
                      value={formData.basePrice || ""}
                      onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </>
            )}

            {pricingTab === "imaging" && !editingItem && (
              <>
                <div className="space-y-2">
                  <Label>Imaging Services</Label>
                  <div className="border rounded-md overflow-hidden max-h-96 overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                        <tr>
                          <th className="text-left p-2 text-sm font-medium">Imaging Type</th>
                          <th className="text-left p-2 text-sm font-medium">Code</th>
                          <th className="text-left p-2 text-sm font-medium">Price (GBP)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {multipleServices.map((service, index) => (
                          <tr key={index} className="border-t">
                            <td className="p-2">
                              <div className="font-medium text-sm">{service.serviceName}</div>
                            </td>
                            <td className="p-2">
                              <div className="text-sm text-gray-600 dark:text-gray-400">{service.serviceCode}</div>
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                step="0.01"
                                value={service.basePrice}
                                onChange={(e) => {
                                  const updated = [...multipleServices];
                                  updated[index].basePrice = e.target.value;
                                  setMultipleServices(updated);
                                }}
                                placeholder="0.00"
                                className="w-full"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {pricingTab === "imaging" && editingItem && (
              <>
                <div className="grid gap-2 relative">
                  <Label htmlFor="imagingType">Imaging Type *</Label>
                  <Input
                    id="imagingType"
                    value={formData.imagingType || ""}
                    onChange={(e) => {
                      setFormData({ ...formData, imagingType: e.target.value });
                      setShowImagingTypeSuggestions(true);
                    }}
                    onFocus={() => setShowImagingTypeSuggestions(true)}
                    placeholder="Select or type imaging type"
                    autoComplete="off"
                  />
                  {showImagingTypeSuggestions && (
                    <div className="imaging-type-suggestions absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto top-full">
                      {IMAGING_TYPE_OPTIONS
                        .filter(option => 
                          !formData.imagingType || 
                          option.toLowerCase().includes(formData.imagingType.toLowerCase())
                        )
                        .map((option, index) => (
                          <div
                            key={index}
                            className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                            onClick={() => {
                              const generatedCode = generateImagingCode(option);
                              setFormData({ 
                                ...formData, 
                                imagingType: option,
                                imagingCode: generatedCode
                              });
                              setShowImagingTypeSuggestions(false);
                            }}
                          >
                            <div className="font-medium text-sm">{option}</div>
                          </div>
                        ))}
                      {IMAGING_TYPE_OPTIONS.filter(option => 
                        !formData.imagingType || 
                        option.toLowerCase().includes(formData.imagingType.toLowerCase())
                      ).length === 0 && formData.imagingType && (
                        <div className="px-4 py-3 text-sm text-gray-500">
                          No matches found. You can enter a custom imaging type.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="imagingCode">Imaging Code (Auto-generated)</Label>
                  <Input
                    id="imagingCode"
                    value={formData.imagingCode || ""}
                    onChange={(e) => setFormData({ ...formData, imagingCode: e.target.value })}
                    placeholder="Auto-generated when selecting type"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="modality">Modality</Label>
                    <Input
                      id="modality"
                      value={formData.modality || ""}
                      onChange={(e) => setFormData({ ...formData, modality: e.target.value })}
                      placeholder="e.g., CT"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="bodyPart">Body Part</Label>
                    <Input
                      id="bodyPart"
                      value={formData.bodyPart || ""}
                      onChange={(e) => setFormData({ ...formData, bodyPart: e.target.value })}
                      placeholder="e.g., Head"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Input
                      id="currency"
                      value={formData.currency || "USD"}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      placeholder="USD"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="basePrice">Price *</Label>
                    <Input
                      id="basePrice"
                      type="number"
                      step="0.01"
                      value={formData.basePrice || ""}
                      onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </>
            )}

         

            <div className="flex items-center gap-2">
              <Switch
                id="isActive"
                checked={formData.isActive || false}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : editingItem ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}

export default function BillingPage() {
  const { user } = useAuth();
  const isDoctor = isDoctorLike(user?.role);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showNewInvoice, setShowNewInvoice] = useState(false);
  const [selectedReport, setSelectedReport] = useState<string>("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdInvoiceNumber, setCreatedInvoiceNumber] = useState("");
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadedInvoiceNumber, setDownloadedInvoiceNumber] = useState("");
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [editedStatus, setEditedStatus] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [showSendSuccessModal, setShowSendSuccessModal] = useState(false);
  const [sentInvoiceInfo, setSentInvoiceInfo] = useState({ invoiceNumber: "", recipient: "" });
  const [showDeleteSuccessModal, setShowDeleteSuccessModal] = useState(false);
  const [deletedInvoiceNumber, setDeletedInvoiceNumber] = useState("");
  const [showStatusUpdateModal, setShowStatusUpdateModal] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [invoiceToPay, setInvoiceToPay] = useState<Invoice | null>(null);
  const [isListView, setIsListView] = useState(false);
  
  // Date filter states
  const [serviceDateFrom, setServiceDateFrom] = useState("");

  const { data: billingData = [], isLoading, error } = useQuery({
    queryKey: ["/api/billing"],
  });
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [activeTab, setActiveTab] = useState("invoices");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isInvoiceSaved, setIsInvoiceSaved] = useState(false);
  const [clinicHeader, setClinicHeader] = useState<any>(null);
  const [clinicFooter, setClinicFooter] = useState<any>(null);
  const [savedInvoiceIds, setSavedInvoiceIds] = useState<Set<number>>(new Set());
  
  // Check if user is admin
  const isAdmin = user?.role === 'admin';

  // Fetch clinic headers and footers
  useEffect(() => {
    const fetchClinicBranding = async () => {
      try {
        const [headerResponse, footerResponse] = await Promise.all([
          apiRequest('GET', '/api/clinic-headers', undefined),
          apiRequest('GET', '/api/clinic-footers', undefined)
        ]);
        
        const headerData = await headerResponse.json();
        const footerData = await footerResponse.json();
        
        console.log('📋 Clinic Header Data:', headerData);
        console.log('📋 Clinic Footer Data:', footerData);
        
        setClinicHeader(headerData);
        setClinicFooter(footerData);
      } catch (error) {
        console.error('Failed to fetch clinic branding:', error);
      }
    };
    
    fetchClinicBranding();
  }, []);

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setEditedStatus(invoice.status);
    setIsEditingStatus(false);
    setIsInvoiceSaved(false);
  };

  const handleUpdateStatus = async () => {
    if (!selectedInvoice || !editedStatus) return;
    
    try {
      await apiRequest('PATCH', `/api/billing/invoices/${selectedInvoice.id}`, {
        status: editedStatus
      });
      
      // If status is changed to "paid", create a payment record
      if (editedStatus === 'paid' && selectedInvoice.status !== 'paid') {
        await apiRequest('POST', '/api/billing/payments', {
          organizationId: selectedInvoice.organizationId,
          invoiceId: selectedInvoice.id,
          patientId: selectedInvoice.patientId,
          amount: typeof selectedInvoice.totalAmount === 'string' ? parseFloat(selectedInvoice.totalAmount) : selectedInvoice.totalAmount,
          currency: 'GBP',
          paymentMethod: 'manual',
          paymentProvider: 'manual',
          paymentStatus: 'completed',
          paymentDate: new Date().toISOString(),
          transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        });
        
        // Refresh payments list
        queryClient.invalidateQueries({ queryKey: ["/api/billing/payments"] });
      }
      
      // Update the local state
      setSelectedInvoice({ ...selectedInvoice, status: editedStatus as any });
      setIsEditingStatus(false);
      
      // Refresh the invoices list
      queryClient.invalidateQueries({ queryKey: ["/api/billing/invoices"] });
      queryClient.refetchQueries({ queryKey: ["/api/billing/invoices"] });
      
      toast({
        title: "Status Updated",
        description: `Invoice status updated to ${editedStatus}`,
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update invoice status",
        variant: "destructive"
      });
    }
  };

  const handleInlineStatusUpdate = async (invoiceId: string, newStatus: string) => {
    setUpdatingStatusId(invoiceId);
    
    try {
      await apiRequest('PATCH', `/api/billing/invoices/${invoiceId}`, {
        status: newStatus
      });
      
      // Show success modal
      setShowStatusUpdateModal(true);
      
      // Refresh the invoices list
      await queryClient.invalidateQueries({ queryKey: ["/api/billing/invoices"] });
      await queryClient.refetchQueries({ queryKey: ["/api/billing/invoices"] });
      
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update invoice status",
        variant: "destructive"
      });
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handlePayNow = (invoice: Invoice) => {
    setInvoiceToPay(invoice);
    setShowPaymentModal(true);
  };

  const handleSaveInvoice = async (invoiceId: string) => {
    console.log('💾 Save Invoice button clicked for invoice:', invoiceId);
    
    const invoice = Array.isArray(invoices) ? invoices.find((inv: any) => inv.id === Number(invoiceId)) : null;
    
    if (!invoice) {
      console.error('❌ Invoice not found:', invoiceId);
      toast({
        title: "Error",
        description: "Invoice not found",
        variant: "destructive"
      });
      return;
    }

    try {
      // Helper to safely convert to number and format
      const toNum = (val: any) => typeof val === 'string' ? parseFloat(val) : val;

      // Create PDF document
      console.log('📄 Creating PDF document for save...');
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - 2 * margin;

      // Function to add header to page
      const addHeader = () => {
        // Purple header background
        doc.setFillColor(79, 70, 229);
        doc.rect(0, 0, pageWidth, 40, 'F');
        
        // Clinic name
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text(clinicHeader?.clinicName || 'nhjn', margin, 18);
        
        // Tagline
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(clinicHeader?.tagline || 'Excellence in Healthcare', margin, 28);
        
        // INVOICE text on right
        doc.setFontSize(32);
        doc.setFont('helvetica', 'bold');
        doc.text('INVOICE', pageWidth - margin - 55, 28);
      };

      // Function to add footer to page
      const addFooter = (pageNum: number) => {
        const footerY = pageHeight - 20;
        doc.setFillColor(248, 250, 252);
        doc.rect(0, footerY - 5, pageWidth, 25, 'F');
        doc.setDrawColor(229, 231, 235);
        doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
        doc.setTextColor(107, 114, 128);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        const footerText = clinicFooter?.footerText || 'Thank you for choosing Cura Medical Practice for your healthcare needs.';
        doc.text(footerText, pageWidth / 2, footerY + 2, { align: 'center' });
        doc.text('© 2025 Cura Software Limited - Powered by Halo Group & Averox Technologies', pageWidth / 2, footerY + 8, { align: 'center' });
        doc.text(`Page ${pageNum}`, pageWidth - margin, footerY + 2, { align: 'right' });
      };

      // Start PDF content
      addHeader();
      
      let yPosition = 50;

      // Bill To and Invoice Details section
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('BILL TO', margin, yPosition);
      doc.text('INVOICE DETAILS', pageWidth / 2 + 10, yPosition);
      
      yPosition += 7;
      doc.setFont('helvetica', 'normal');
      doc.text(invoice.patientName, margin, yPosition);
      doc.text(`Invoice Number: ${invoice.invoiceNumber || invoice.id}`, pageWidth / 2 + 10, yPosition);
      
      yPosition += 5;
      doc.setFontSize(9);
      doc.text(`Patient ID: ${invoice.patientId}`, margin, yPosition);
      doc.text(`Invoice Date: ${format(new Date(invoice.invoiceDate), 'dd/MM/yyyy')}`, pageWidth / 2 + 10, yPosition);
      
      yPosition += 5;
      doc.text(`Due Date: ${format(new Date(invoice.dueDate), 'dd/MM/yyyy')}`, pageWidth / 2 + 10, yPosition);

      yPosition += 10;

      // Services table header
      doc.setFillColor(79, 70, 229);
      doc.rect(margin, yPosition, contentWidth, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      yPosition += 6;
      doc.text('Service Description', margin + 2, yPosition);
      doc.text('Qty', pageWidth - margin - 80, yPosition, { align: 'right' });
      doc.text('Rate', pageWidth - margin - 50, yPosition, { align: 'right' });
      doc.text('Amount', pageWidth - margin - 2, yPosition, { align: 'right' });

      yPosition += 5;

      // Services table rows
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      let rowCount = 0;
      invoice.items.forEach((item: any) => {
        if (yPosition > pageHeight - 50) {
          addFooter(1);
          doc.addPage();
          addHeader();
          yPosition = 50;
        }

        if (rowCount % 2 === 0) {
          doc.setFillColor(249, 250, 251);
          doc.rect(margin, yPosition - 4, contentWidth, 10, 'F');
        }

        doc.setFont('helvetica', 'bold');
        doc.text(item.description, margin + 2, yPosition);
        yPosition += 4;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(107, 114, 128);
        doc.text('Professional medical consultation', margin + 2, yPosition);
        
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        yPosition -= 2;
        doc.text(item.quantity.toString(), pageWidth - margin - 80, yPosition, { align: 'right' });
        doc.text(`£${toNum(item.unitPrice).toFixed(2)}`, pageWidth - margin - 50, yPosition, { align: 'right' });
        doc.text(`£${toNum(item.total).toFixed(2)}`, pageWidth - margin - 2, yPosition, { align: 'right' });
        
        yPosition += 8;
        rowCount++;
      });

      yPosition += 5;

      // Totals section
      const totalsX = pageWidth - margin - 60;
      doc.setFont('helvetica', 'normal');
      doc.text('Subtotal:', totalsX, yPosition);
      doc.text(`£${toNum(invoice.totalAmount).toFixed(2)}`, pageWidth - margin - 2, yPosition, { align: 'right' });
      
      yPosition += 6;
      doc.text('VAT (0%):', totalsX, yPosition);
      doc.text('£0.00', pageWidth - margin - 2, yPosition, { align: 'right' });
      
      yPosition += 6;
      doc.setDrawColor(79, 70, 229);
      doc.setLineWidth(0.5);
      doc.line(totalsX - 5, yPosition, pageWidth - margin, yPosition);
      
      yPosition += 6;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Total Amount:', totalsX, yPosition);
      doc.text(`£${toNum(invoice.totalAmount).toFixed(2)}`, pageWidth - margin - 2, yPosition, { align: 'right' });

      if (toNum(invoice.paidAmount) > 0) {
        yPosition += 8;
        doc.setFontSize(9);
        doc.setTextColor(5, 150, 105);
        doc.text('Amount Paid:', totalsX, yPosition);
        doc.text(`-£${toNum(invoice.paidAmount).toFixed(2)}`, pageWidth - margin - 2, yPosition, { align: 'right' });
        
        yPosition += 8;
        const balanceDue = toNum(invoice.totalAmount) - toNum(invoice.paidAmount);
        doc.setTextColor(balanceDue === 0 ? 5 : 220, balanceDue === 0 ? 150 : 38, balanceDue === 0 ? 105 : 38);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('Balance Due:', totalsX, yPosition);
        doc.text(`£${balanceDue.toFixed(2)}`, pageWidth - margin - 2, yPosition, { align: 'right' });
      }

      addFooter(1);

      // Get PDF as base64
      console.log('📤 Converting PDF to base64...');
      const pdfData = doc.output('datauristring').split(',')[1];
      
      // Send to backend
      console.log('📡 Sending PDF to server...');
      const response = await apiRequest('POST', '/api/billing/save-invoice-pdf', {
        invoiceNumber: invoice.invoiceNumber || invoice.id.toString(),
        patientId: invoice.patientId,
        pdfData
      });

      if (!response.ok) {
        throw new Error('Failed to save invoice');
      }

      const result = await response.json();
      console.log('✅ Invoice saved successfully:', result);

      setIsInvoiceSaved(true);
      setSavedInvoiceIds(prev => new Set(prev).add(Number(invoiceId)));

      toast({
        title: "Success",
        description: `Invoice saved successfully`,
      });

    } catch (error) {
      console.error('❌ Failed to save invoice:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save invoice. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDownloadInvoice = (invoiceId: string) => {
    console.log('🔽 Download button clicked for invoice:', invoiceId);
    
    const invoice = Array.isArray(invoices) ? invoices.find((inv: any) => inv.id === Number(invoiceId)) : null;
    
    if (!invoice) {
      console.error('❌ Invoice not found:', invoiceId);
      toast({
        title: "Error",
        description: "Invoice not found",
        variant: "destructive"
      });
      return;
    }

    console.log('✅ Invoice found:', invoice);

    try {
      // Helper to safely convert to number and format
      const toNum = (val: any) => typeof val === 'string' ? parseFloat(val) : val;

      // Create new PDF document
      console.log('📄 Creating PDF document...');
      const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - 2 * margin;

    // Function to add header to page
    const addHeader = () => {
      // Purple header background
      doc.setFillColor(79, 70, 229);
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      // Clinic name
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text(clinicHeader?.clinicName || 'nhjn', margin, 18);
      
      // Tagline
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(clinicHeader?.tagline || 'Excellence in Healthcare', margin, 28);
      
      // INVOICE text on right
      doc.setFontSize(32);
      doc.setFont('helvetica', 'bold');
      doc.text('INVOICE', pageWidth - margin - 55, 28);
    };

    // Function to add footer to page
    const addFooter = (pageNum: number) => {
      const footerY = pageHeight - 20;
      
      // Footer background
      doc.setFillColor(248, 250, 252);
      doc.rect(0, footerY - 5, pageWidth, 25, 'F');
      
      // Footer line
      doc.setDrawColor(229, 231, 235);
      doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
      
      // Footer text
      doc.setTextColor(107, 114, 128);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      const footerText = clinicFooter?.footerText || 'Thank you for choosing Cura Medical Practice for your healthcare needs.';
      doc.text(footerText, pageWidth / 2, footerY + 2, { align: 'center' });
      doc.text('© 2025 Cura Software Limited - Powered by Halo Group & Averox Technologies', pageWidth / 2, footerY + 8, { align: 'center' });
      
      // Page number
      doc.text(`Page ${pageNum}`, pageWidth - margin, footerY + 2, { align: 'right' });
    };

    // Start PDF content
    addHeader();
    
    let yPosition = 50;

    // Bill To and Invoice Details section
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('BILL TO', margin, yPosition);
    doc.text('INVOICE DETAILS', pageWidth / 2 + 10, yPosition);
    
    yPosition += 7;
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.patientName, margin, yPosition);
    doc.text(`Invoice Number: ${invoice.id}`, pageWidth / 2 + 10, yPosition);
    
    yPosition += 5;
    doc.setFontSize(9);
    doc.text(`Patient ID: ${invoice.patientId}`, margin, yPosition);
    doc.text(`Invoice Date: ${format(new Date(invoice.invoiceDate), 'dd/MM/yyyy')}`, pageWidth / 2 + 10, yPosition);
    
    yPosition += 5;
    doc.text(`Due Date: ${format(new Date(invoice.dueDate), 'dd/MM/yyyy')}`, pageWidth / 2 + 10, yPosition);
    
    yPosition += 5;
    doc.text(`Payment Terms: Net 30`, pageWidth / 2 + 10, yPosition);

    yPosition += 10;

    // Payment Information box
    doc.setFillColor(219, 234, 254);
    doc.roundedRect(margin, yPosition, contentWidth, 12, 2, 2, 'F');
    doc.setTextColor(30, 64, 175);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    yPosition += 5;
    doc.text('Payment Information', margin + 3, yPosition);
    yPosition += 4;
    doc.setFont('helvetica', 'normal');
    doc.text('Multiple payment options available: Credit Card, Bank Transfer, PayPal, or Cash', margin + 3, yPosition);

    yPosition += 12;

    // Services table header
    doc.setFillColor(79, 70, 229);
    doc.rect(margin, yPosition, contentWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    yPosition += 6;
    doc.text('Service Description', margin + 2, yPosition);
    doc.text('Qty', pageWidth - margin - 80, yPosition, { align: 'right' });
    doc.text('Rate', pageWidth - margin - 50, yPosition, { align: 'right' });
    doc.text('Amount', pageWidth - margin - 2, yPosition, { align: 'right' });

    yPosition += 5;

    // Services table rows
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    let rowCount = 0;
    invoice.items.forEach((item: any) => {
      if (yPosition > pageHeight - 50) {
        addFooter(1);
        doc.addPage();
        addHeader();
        yPosition = 50;
      }

      // Alternate row background
      if (rowCount % 2 === 0) {
        doc.setFillColor(249, 250, 251);
        doc.rect(margin, yPosition - 4, contentWidth, 10, 'F');
      }

      doc.setFont('helvetica', 'bold');
      doc.text(item.description, margin + 2, yPosition);
      yPosition += 4;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(107, 114, 128);
      doc.text('Professional medical consultation', margin + 2, yPosition);
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      yPosition -= 2;
      doc.text(item.quantity.toString(), pageWidth - margin - 80, yPosition, { align: 'right' });
      doc.text(`£${toNum(item.unitPrice).toFixed(2)}`, pageWidth - margin - 50, yPosition, { align: 'right' });
      doc.text(`£${toNum(item.total).toFixed(2)}`, pageWidth - margin - 2, yPosition, { align: 'right' });
      
      yPosition += 8;
      rowCount++;
    });

    yPosition += 5;

    // Totals section
    const totalsX = pageWidth - margin - 60;
    doc.setFont('helvetica', 'normal');
    doc.text('Subtotal:', totalsX, yPosition);
    doc.text(`£${toNum(invoice.totalAmount).toFixed(2)}`, pageWidth - margin - 2, yPosition, { align: 'right' });
    
    yPosition += 6;
    doc.text('VAT (0%):', totalsX, yPosition);
    doc.text('£0.00', pageWidth - margin - 2, yPosition, { align: 'right' });
    
    yPosition += 6;
    doc.setDrawColor(79, 70, 229);
    doc.setLineWidth(0.5);
    doc.line(totalsX - 5, yPosition, pageWidth - margin, yPosition);
    
    yPosition += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Total Amount:', totalsX, yPosition);
    doc.text(`£${toNum(invoice.totalAmount).toFixed(2)}`, pageWidth - margin - 2, yPosition, { align: 'right' });

    if (toNum(invoice.paidAmount) > 0) {
      yPosition += 8;
      doc.setFontSize(9);
      doc.setTextColor(5, 150, 105);
      doc.text('Amount Paid:', totalsX, yPosition);
      doc.text(`-£${toNum(invoice.paidAmount).toFixed(2)}`, pageWidth - margin - 2, yPosition, { align: 'right' });
      
      yPosition += 8;
      const balanceDue = toNum(invoice.totalAmount) - toNum(invoice.paidAmount);
      doc.setTextColor(balanceDue === 0 ? 5 : 220, balanceDue === 0 ? 150 : 38, balanceDue === 0 ? 105 : 38);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Balance Due:', totalsX, yPosition);
      doc.text(`£${balanceDue.toFixed(2)}`, pageWidth - margin - 2, yPosition, { align: 'right' });
    }

      // Add footer to first (and possibly only) page
      addFooter(1);

      // Save the PDF
      console.log('💾 Saving PDF...');
      doc.save(`invoice-${invoice.invoiceNumber || invoice.id}.pdf`);
      
      console.log('✅ PDF download triggered successfully');
      
      // Show download success modal
      setDownloadedInvoiceNumber(invoice.invoiceNumber || invoiceId);
      setShowDownloadModal(true);
      
    } catch (error) {
      console.error('❌ PDF generation failed:', error);
      toast({
        title: "Download Failed",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive"
      });
    }
  };

  const [sendInvoiceDialog, setSendInvoiceDialog] = useState(false);
  const [invoiceToSend, setInvoiceToSend] = useState<Invoice | null>(null);
  const [sendMethod, setSendMethod] = useState("email");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [customMessage, setCustomMessage] = useState("");

  // New invoice form state
  const [selectedPatient, setSelectedPatient] = useState("");
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [totalAmount, setTotalAmount] = useState("");
  const [insuranceProvider, setInsuranceProvider] = useState("");
  const [firstServiceCode, setFirstServiceCode] = useState("");
  const [firstServiceDesc, setFirstServiceDesc] = useState("");
  const [firstServiceQty, setFirstServiceQty] = useState("");
  const [firstServiceAmount, setFirstServiceAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [nhsNumber, setNhsNumber] = useState("");
  
  // Validation error states
  const [patientError, setPatientError] = useState("");
  const [serviceError, setServiceError] = useState("");
  const [totalAmountError, setTotalAmountError] = useState("");
  const [nhsNumberError, setNhsNumberError] = useState("");

  const handleSendInvoice = (invoiceId: string) => {
    const invoice = Array.isArray(invoices) ? invoices.find((inv: any) => inv.id === invoiceId) : null;
    if (invoice) {
      setInvoiceToSend(invoice);
      setRecipientEmail(`${invoice.patientName.toLowerCase().replace(' ', '.')}@email.com`);
      setRecipientPhone(`+44 7${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`);
      setRecipientName(invoice.patientName);
      setRecipientAddress(`${Math.floor(Math.random() * 999) + 1} High Street\nLondon\nSW1A 1AA`);
      const totalAmt = typeof invoice.totalAmount === 'string' ? parseFloat(invoice.totalAmount) : invoice.totalAmount;
      setCustomMessage(`Dear ${invoice.patientName},\n\nPlease find your invoice for services rendered on ${format(new Date(invoice.dateOfService), 'MMM d, yyyy')}.\n\nTotal Amount: £${totalAmt.toFixed(2)}\nDue Date: ${format(new Date(invoice.dueDate), 'MMM d, yyyy')}\n\nThank you for choosing our healthcare services.`);
      setSendInvoiceDialog(true);
    }
  };

  const confirmSendInvoice = async () => {
    if (!invoiceToSend) return;
    
    try {
      // First, save the PDF if sending via email (so we can attach it)
      if (sendMethod === 'email') {
        console.log('📄 Generating PDF for email attachment...');
        await handleSaveInvoice(invoiceToSend.id.toString());
      }
      
      // Now send the invoice (PDF will be attached automatically by backend)
      await apiRequest('POST', '/api/billing/send-invoice', {
        invoiceId: invoiceToSend.id,
        sendMethod,
        recipientEmail: sendMethod === 'email' ? recipientEmail : undefined,
        recipientPhone: sendMethod === 'sms' ? recipientPhone : undefined,
        recipientName: sendMethod === 'print' ? recipientName : undefined,
        recipientAddress: sendMethod === 'print' ? recipientAddress : undefined,
        customMessage
      });
      
      // Set the success modal info
      setSentInvoiceInfo({
        invoiceNumber: invoiceToSend.invoiceNumber || invoiceToSend.id.toString(),
        recipient: sendMethod === 'email' ? recipientEmail : sendMethod === 'sms' ? recipientPhone : recipientName
      });
      
      // Close send dialog and show success modal
      setSendInvoiceDialog(false);
      setShowSendSuccessModal(true);
      
      // Clear all form fields
      setInvoiceToSend(null);
      setRecipientEmail("");
      setRecipientPhone("");
      setRecipientName("");
      setRecipientAddress("");
      setCustomMessage("");
    } catch (error) {
      toast({
        title: "Failed to Send Invoice",
        description: "There was an error sending the invoice. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteInvoice = (invoiceId: string) => {
    const invoice = Array.isArray(invoices) ? invoices.find((inv: any) => inv.id === invoiceId) : null;
    if (invoice) {
      setInvoiceToDelete(invoice);
      setShowDeleteModal(true);
    }
  };

  const confirmDeleteInvoice = async () => {
    if (!invoiceToDelete) return;
    
    try {
      // Call API to delete the invoice
      await apiRequest('DELETE', `/api/billing/invoices/${invoiceToDelete.id}`, {});
      
      // Set deleted invoice info for success modal
      setDeletedInvoiceNumber(invoiceToDelete.invoiceNumber || invoiceToDelete.id.toString());
      
      // Close delete confirmation modal
      setShowDeleteModal(false);
      
      // Show success modal
      setShowDeleteSuccessModal(true);
      
      // Clear the invoice to delete
      setInvoiceToDelete(null);
      
      // Refresh invoices list - use correct query keys
      queryClient.invalidateQueries({ queryKey: ["/api/billing/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/billing"] });
      queryClient.refetchQueries({ queryKey: ["/api/billing/invoices"] });
      queryClient.refetchQueries({ queryKey: ["/api/billing"] });
    } catch (error) {
      toast({
        title: "Failed to Delete Invoice",
        description: "There was an error deleting the invoice. Please try again.",
        variant: "destructive"
      });
      setShowDeleteModal(false);
      setInvoiceToDelete(null);
    }
  };

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ["/api/billing/invoices", statusFilter],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const subdomain = localStorage.getItem('user_subdomain') || 'demo';
      const url = statusFilter && statusFilter !== 'all' 
        ? `/api/billing/invoices?status=${statusFilter}`
        : '/api/billing/invoices';
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': subdomain
        }
      });
      if (!response.ok) throw new Error('Failed to fetch invoices');
      return response.json();
    },
    enabled: true,
  });

  // Fetch patients for new invoice dropdown
  const { data: patients, isLoading: patientsLoading } = useQuery({
    queryKey: ["/api/patients"],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const subdomain = localStorage.getItem('user_subdomain') || 'demo';
      const response = await fetch('/api/patients', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': subdomain
        }
      });
      if (!response.ok) throw new Error('Failed to fetch patients');
      return response.json();
    }
  });

  // Fetch payments for Payment History tab
  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ["/api/billing/payments"],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const subdomain = localStorage.getItem('user_subdomain') || 'demo';
      const response = await fetch('/api/billing/payments', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': subdomain
        }
      });
      if (!response.ok) throw new Error('Failed to fetch payments');
      return response.json();
    },
    enabled: isAdmin,
  });

  // Auto-populate NHS number when patient is selected
  useEffect(() => {
    if (selectedPatient && patients && patients.length > 0) {
      const selected = patients.find((p: any) => p.patientId === selectedPatient);
      if (selected && selected.nhsNumber) {
        setNhsNumber(selected.nhsNumber);
      } else {
        // Clear NHS number if patient has none or selection is invalid
        setNhsNumber("");
      }
    } else {
      // Clear NHS number when selection is cleared
      setNhsNumber("");
    }
  }, [selectedPatient, patients]);

  const filteredInvoices = Array.isArray(invoices) ? invoices.filter((invoice: any) => {
    // Unified search: Search by Invoice ID, Patient ID, or Patient Name
    const matchesSearch = !searchQuery || 
      invoice.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(invoice.id).toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(invoice.patientId).toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    
    // Filter by Service Date range - compare date only (ignore time)
    const invoiceServiceDate = new Date(invoice.dateOfService);
    const invoiceDateStr = invoiceServiceDate.toISOString().split('T')[0]; // Get YYYY-MM-DD
    const matchesServiceDateFrom = !serviceDateFrom || invoiceDateStr >= serviceDateFrom;
    
    return matchesSearch && matchesStatus && matchesServiceDateFrom;
  }) : [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getInsuranceStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'denied': return 'bg-red-100 text-red-800';
      case 'partially_paid': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  const getTotalRevenue = () => {
    return Array.isArray(payments) ? payments.reduce((sum: number, payment: any) => {
      const amount = typeof payment.amount === 'string' ? parseFloat(payment.amount) : payment.amount;
      return sum + amount;
    }, 0) : 0;
  };

  const getOutstandingAmount = () => {
    return Array.isArray(invoices) ? invoices.reduce((sum: number, invoice: any) => sum + (invoice.totalAmount - invoice.paidAmount), 0) : 0;
  };

  if (invoicesLoading) {
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
        title="Billing & Payments" 
        subtitle="Manage invoices, payments, and insurance claims"
      />
      
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
            {/* Quick Stats - Admin Only */}
            {isAdmin && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Revenue</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(getTotalRevenue())}</p>
                      </div>
                      <DollarSign className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Outstanding</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(getOutstandingAmount())}</p>
                      </div>
                      <AlertTriangle className="h-8 w-8 text-red-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Overdue Invoices</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">2</p>
                      </div>
                      <Clock className="h-8 w-8 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">This Month</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">24</p>
                      </div>
                      <Receipt className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Patient View: Direct Invoice List */}
            {!isAdmin ? (
              <div className="space-y-4">
                {/* Filters and Actions */}
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              placeholder="Search by Invoice ID, Patient ID or Name..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="pl-9 w-80"
                              data-testid="input-search-invoices"
                            />
                          </div>
                          
                          <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-40" data-testid="select-status-filter">
                              <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Status</SelectItem>
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="sent">Sent</SelectItem>
                              <SelectItem value="paid">Paid</SelectItem>
                              <SelectItem value="overdue">Overdue</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>

                          <div className="flex flex-col gap-1">
                            <Label htmlFor="service-date-from" className="text-xs text-gray-600 dark:text-gray-400">Service Date From</Label>
                            <Input
                              id="service-date-from"
                              type="date"
                              value={serviceDateFrom}
                              onChange={(e) => setServiceDateFrom(e.target.value)}
                              className="h-9 text-sm w-44"
                              data-testid="input-service-date-from"
                            />
                          </div>

                          {serviceDateFrom && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setServiceDateFrom("")}
                              data-testid="button-clear-filters"
                              className="mt-5"
                            >
                              <Filter className="h-4 w-4 mr-2" />
                              Clear
                            </Button>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Label htmlFor="list-view-toggle" className="text-sm font-medium text-gray-700 dark:text-gray-300">List View</Label>
                          <Switch 
                            id="list-view-toggle"
                            checked={isListView} 
                            onCheckedChange={setIsListView}
                            data-testid="switch-list-view"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Invoices List */}
                {isListView ? (
                  /* List View - Table Format */
                  <Card>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Invoice No.</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Patient Name</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Service Type</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Service ID</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Service Date</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Due Date</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Total</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Outstanding</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Status</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredInvoices.map((invoice) => (
                              <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-slate-800" data-testid={`invoice-row-${invoice.id}`}>
                                <td className="px-4 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">{invoice.id}</td>
                                <td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100">{invoice.patientName}</td>
                                <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">{invoice.serviceType || '-'}</td>
                                <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">{invoice.serviceId || '-'}</td>
                                <td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100">{format(new Date(invoice.dateOfService), 'MMM d, yyyy')}</td>
                                <td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100">{format(new Date(invoice.dueDate), 'MMM d, yyyy')}</td>
                                <td className="px-4 py-4 text-sm font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(invoice.totalAmount)}</td>
                                <td className="px-4 py-4 text-sm font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(invoice.totalAmount - invoice.paidAmount)}</td>
                                <td className="px-4 py-4 text-sm">
                                  {user?.role === 'patient' ? (
                                    <Badge className={`${getStatusColor(invoice.status)}`}>
                                      {invoice.status}
                                    </Badge>
                                  ) : (
                                    <Select 
                                      value={invoice.status} 
                                      onValueChange={(value) => handleInlineStatusUpdate(invoice.id, value)}
                                      disabled={updatingStatusId === invoice.id}
                                    >
                                      <SelectTrigger className={`w-32 h-8 text-xs ${getStatusColor(invoice.status)}`}>
                                        <SelectValue>{invoice.status}</SelectValue>
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="draft">Draft</SelectItem>
                                        <SelectItem value="sent">Sent</SelectItem>
                                        <SelectItem value="paid">Paid</SelectItem>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="overdue">Overdue</SelectItem>
                                        <SelectItem value="cancelled">Cancelled</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  )}
                                </td>
                                <td className="px-4 py-4 text-sm">
                                  <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => handleViewInvoice(invoice)} data-testid="button-view-invoice" title="View">
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    {savedInvoiceIds.has(invoice.id) && (
                                      <Button variant="ghost" size="sm" onClick={() => handleDownloadInvoice(invoice.id.toString())} data-testid="button-download-invoice" title="Download">
                                        <Download className="h-4 w-4" />
                                      </Button>
                                    )}
                                    {!isAdmin && invoice.status !== 'draft' && invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                                      <Button 
                                        variant="default" 
                                        size="sm" 
                                        onClick={() => handlePayNow(invoice)}
                                        data-testid="button-pay-now"
                                        style={{ 
                                          backgroundColor: '#4A7DFF',
                                          color: 'white'
                                        }}
                                        title="Pay Now"
                                      >
                                        <CreditCard className="h-4 w-4 mr-1" />
                                        Pay
                                      </Button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  /* Grid View - Card Format */
                  <div className="space-y-4">
                    {filteredInvoices.map((invoice) => (
                      <Card key={invoice.id} className="hover:shadow-md transition-shadow" data-testid={`invoice-card-${invoice.id}`}>
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{invoice.patientName}</h3>
                                {user?.role === 'patient' ? (
                                  <Badge className={`${getStatusColor(invoice.status)} px-3 py-1`}>
                                    {invoice.status}
                                  </Badge>
                                ) : (
                                  <Select 
                                    value={invoice.status} 
                                    onValueChange={(value) => handleInlineStatusUpdate(invoice.id, value)}
                                    disabled={updatingStatusId === invoice.id}
                                  >
                                    <SelectTrigger className={`w-32 h-7 text-xs ${getStatusColor(invoice.status)}`}>
                                      <SelectValue>{invoice.status}</SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="draft">Draft</SelectItem>
                                      <SelectItem value="sent">Sent</SelectItem>
                                      <SelectItem value="paid">Paid</SelectItem>
                                      <SelectItem value="pending">Pending</SelectItem>
                                      <SelectItem value="overdue">Overdue</SelectItem>
                                      <SelectItem value="cancelled">Cancelled</SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}
                                {invoice.status === 'overdue' && (
                                  <Badge className="bg-red-100 text-red-800">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    Overdue
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                                <div>
                                  <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">Invoice Details</h4>
                                  <div className="space-y-1 text-sm text-gray-900 dark:text-gray-100">
                                    <div><strong>Invoice:</strong> {invoice.id}</div>
                                    <div><strong>Service Date:</strong> {format(new Date(invoice.dateOfService), 'MMM d, yyyy')}</div>
                                    <div><strong>Due Date:</strong> {format(new Date(invoice.dueDate), 'MMM d, yyyy')}</div>
                                  </div>
                                </div>
                                
                                <div>
                                  <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">Amount</h4>
                                  <div className="space-y-1 text-sm text-gray-900 dark:text-gray-100">
                                    <div><strong>Total:</strong> {formatCurrency(invoice.totalAmount)}</div>
                                    <div><strong>Paid:</strong> {formatCurrency(invoice.paidAmount)}</div>
                                    <div><strong>Outstanding:</strong> {formatCurrency(invoice.totalAmount - invoice.paidAmount)}</div>
                                  </div>
                                </div>
                                
                                {invoice.insurance && (
                                  <div>
                                    <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">Insurance</h4>
                                    <div className="space-y-1 text-sm text-gray-900 dark:text-gray-100">
                                      <div><strong>Provider:</strong> {invoice.insurance.provider}</div>
                                      <div><strong>Claim:</strong> {invoice.insurance.claimNumber}</div>
                                      <div className="flex items-center gap-2">
                                        <strong>Status:</strong>
                                        <Badge className={getInsuranceStatusColor(invoice.insurance.status)}>
                                          {invoice.insurance.status}
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-lg">
                                <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">Services</h4>
                                <div className="space-y-1">
                                  {invoice.items.slice(0, 2).map((item: any, index: number) => (
                                    <div key={index} className="flex justify-between text-sm text-gray-900 dark:text-gray-100">
                                      <span>{item.description}</span>
                                      <span>{formatCurrency(item.total)}</span>
                                    </div>
                                  ))}
                                  {invoice.items.length > 2 && (
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                      +{invoice.items.length - 2} more items
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 ml-4">
                              <Button variant="outline" size="sm" onClick={() => handleViewInvoice(invoice)} data-testid="button-view-invoice">
                                <Eye className="h-4 w-4" />
                              </Button>
                              {savedInvoiceIds.has(invoice.id) && (
                                <Button variant="outline" size="sm" onClick={() => handleDownloadInvoice(invoice.id.toString())} data-testid="button-download-invoice">
                                  <Download className="h-4 w-4" />
                                </Button>
                              )}
                              {!isAdmin && invoice.status !== 'draft' && invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                                <Button 
                                  variant="default" 
                                  size="sm" 
                                  onClick={() => handlePayNow(invoice)}
                                  data-testid="button-pay-now"
                                  style={{ 
                                    backgroundColor: '#4A7DFF',
                                    color: 'white',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    padding: '0.5rem 1rem',
                                    minWidth: '100px'
                                  }}
                                >
                                  <CreditCard className="h-4 w-4 mr-1" />
                                  Pay Now
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {filteredInvoices.length === 0 && (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400" data-testid="no-invoices-message">
                    <Receipt className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No invoices found</h3>
                    <p className="text-gray-600 dark:text-gray-300">Try adjusting your search terms or filters</p>
                  </div>
                )}
              </div>
            ) : (
              /* Admin View: Tabs Navigation */
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 md:grid-cols-5 lg:grid-cols-5 gap-1">
                  <TabsTrigger value="invoices">Invoices</TabsTrigger>
                  <TabsTrigger value="payment-history">Payment History</TabsTrigger>
                  <TabsTrigger value="insurance-claims">Insurance Claims</TabsTrigger>
                  <TabsTrigger value="custom-reports">Custom Reports</TabsTrigger>
                  {isAdmin && <TabsTrigger value="pricing-management">Pricing Management</TabsTrigger>}
                </TabsList>

                <TabsContent value="invoices" className="space-y-4 mt-6">
                  {/* Filters and Actions */}
                  <Card>
                    <CardContent className="p-4">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                              <Input
                                placeholder="Search by Invoice ID, Patient ID or Name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 w-80"
                              />
                            </div>
                            
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                              <SelectTrigger className="w-40">
                                <SelectValue placeholder="Filter by status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="draft">Draft</SelectItem>
                                <SelectItem value="sent">Sent</SelectItem>
                                <SelectItem value="paid">Paid</SelectItem>
                                <SelectItem value="overdue">Overdue</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>

                            <div className="flex flex-col gap-1">
                              <Label htmlFor="admin-service-date-from" className="text-xs text-gray-600 dark:text-gray-400">Service Date From</Label>
                              <Input
                                id="admin-service-date-from"
                                type="date"
                                value={serviceDateFrom}
                                onChange={(e) => setServiceDateFrom(e.target.value)}
                                className="h-9 text-sm w-44"
                                data-testid="input-admin-service-date-from"
                              />
                            </div>

                            {serviceDateFrom && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setServiceDateFrom("")}
                                data-testid="button-admin-clear-filters"
                                className="mt-5"
                              >
                                <Filter className="h-4 w-4 mr-2" />
                                Clear
                              </Button>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Label htmlFor="admin-list-view-toggle" className="text-sm font-medium text-gray-700 dark:text-gray-300">List View</Label>
                              <Switch 
                                id="admin-list-view-toggle"
                                checked={isListView} 
                                onCheckedChange={setIsListView}
                                data-testid="switch-admin-list-view"
                              />
                            </div>
                            <Button onClick={() => setShowNewInvoice(true)}>
                              <Plus className="h-4 w-4 mr-2" />
                              New Invoice
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Invoices List */}
                  {isListView ? (
                    /* List View - Table Format */
                    <Card>
                      <CardContent className="p-0">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Invoice No.</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Patient Name</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Service Date</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Due Date</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Total</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Outstanding</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-gray-700">
                              {filteredInvoices.map((invoice) => (
                                <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-slate-800" data-testid={`invoice-row-${invoice.id}`}>
                                  <td className="px-4 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">{invoice.id}</td>
                                  <td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100">{invoice.patientName}</td>
                                  <td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100">{format(new Date(invoice.dateOfService), 'MMM d, yyyy')}</td>
                                  <td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100">{format(new Date(invoice.dueDate), 'MMM d, yyyy')}</td>
                                  <td className="px-4 py-4 text-sm font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(invoice.totalAmount)}</td>
                                  <td className="px-4 py-4 text-sm font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(invoice.totalAmount - invoice.paidAmount)}</td>
                                  <td className="px-4 py-4 text-sm">
                                    {isAdmin ? (
                                      <Select 
                                        value={invoice.status} 
                                        onValueChange={(value) => handleInlineStatusUpdate(invoice.id, value)}
                                        disabled={updatingStatusId === invoice.id}
                                      >
                                        <SelectTrigger className={`w-32 h-8 text-xs ${getStatusColor(invoice.status)}`}>
                                          <SelectValue>{invoice.status}</SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="draft">Draft</SelectItem>
                                          <SelectItem value="sent">Sent</SelectItem>
                                          <SelectItem value="paid">Paid</SelectItem>
                                          <SelectItem value="pending">Pending</SelectItem>
                                          <SelectItem value="overdue">Overdue</SelectItem>
                                          <SelectItem value="cancelled">Cancelled</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    ) : (
                                      <Badge className={`${getStatusColor(invoice.status)}`}>
                                        {invoice.status}
                                      </Badge>
                                    )}
                                  </td>
                                  <td className="px-4 py-4 text-sm">
                                    <div className="flex items-center gap-2">
                                      <Button variant="ghost" size="sm" onClick={() => handleViewInvoice(invoice)} title="View">
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                      <Button variant="ghost" size="sm" onClick={() => handleDownloadInvoice(invoice.id.toString())} title="Download">
                                        <Download className="h-4 w-4" />
                                      </Button>
                                      {isAdmin && (
                                        <>
                                          <Button variant="ghost" size="sm" onClick={() => handleSendInvoice(invoice.id)} title="Send">
                                            <Send className="h-4 w-4" />
                                          </Button>
                                          <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => handleDeleteInvoice(invoice.id)}
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                            title="Delete"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    /* Grid View - Card Format */
                    <div className="space-y-4">
                      {filteredInvoices.map((invoice) => (
                        <Card key={invoice.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{invoice.patientName}</h3>
                                  {isAdmin ? (
                                    <Select 
                                      value={invoice.status} 
                                      onValueChange={(value) => handleInlineStatusUpdate(invoice.id, value)}
                                      disabled={updatingStatusId === invoice.id}
                                    >
                                      <SelectTrigger className={`w-32 h-7 text-xs ${getStatusColor(invoice.status)}`}>
                                        <SelectValue>{invoice.status}</SelectValue>
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="draft">Draft</SelectItem>
                                        <SelectItem value="sent">Sent</SelectItem>
                                        <SelectItem value="paid">Paid</SelectItem>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="overdue">Overdue</SelectItem>
                                        <SelectItem value="cancelled">Cancelled</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <Badge className={getStatusColor(invoice.status)}>
                                      {invoice.status}
                                    </Badge>
                                  )}
                                  {invoice.status === 'overdue' && (
                                    <Badge className="bg-red-100 text-red-800">
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                      Overdue
                                    </Badge>
                                  )}
                                </div>
                                
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                                  <div>
                                    <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">Invoice Details</h4>
                                    <div className="space-y-1 text-sm text-gray-900 dark:text-gray-100">
                                      <div><strong>Invoice:</strong> {invoice.id}</div>
                                      <div><strong>Service Date:</strong> {format(new Date(invoice.dateOfService), 'MMM d, yyyy')}</div>
                                      <div><strong>Due Date:</strong> {format(new Date(invoice.dueDate), 'MMM d, yyyy')}</div>
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">Amount</h4>
                                    <div className="space-y-1 text-sm text-gray-900 dark:text-gray-100">
                                      <div><strong>Total:</strong> {formatCurrency(invoice.totalAmount)}</div>
                                      <div><strong>Paid:</strong> {formatCurrency(invoice.paidAmount)}</div>
                                      <div><strong>Outstanding:</strong> {formatCurrency(invoice.totalAmount - invoice.paidAmount)}</div>
                                    </div>
                                  </div>
                                  
                                  {invoice.insurance && (
                                    <div>
                                      <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">Insurance</h4>
                                      <div className="space-y-1 text-sm text-gray-900 dark:text-gray-100">
                                        <div><strong>Provider:</strong> {invoice.insurance.provider}</div>
                                        <div><strong>Claim:</strong> {invoice.insurance.claimNumber}</div>
                                        <div className="flex items-center gap-2">
                                          <strong>Status:</strong>
                                          <Badge className={getInsuranceStatusColor(invoice.insurance.status)}>
                                            {invoice.insurance.status}
                                          </Badge>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-lg">
                                  <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">Services</h4>
                                  <div className="space-y-1">
                                    {invoice.items.slice(0, 2).map((item: any, index: number) => (
                                      <div key={index} className="flex justify-between text-sm text-gray-900 dark:text-gray-100">
                                        <span>{item.description}</span>
                                        <span>{formatCurrency(item.total)}</span>
                                      </div>
                                    ))}
                                    {invoice.items.length > 2 && (
                                      <div className="text-sm text-gray-500 dark:text-gray-400">
                                        +{invoice.items.length - 2} more items
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 ml-4">
                                <Button variant="outline" size="sm" onClick={() => handleViewInvoice(invoice)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleDownloadInvoice(invoice.id.toString())}>
                                  <Download className="h-4 w-4" />
                                </Button>
                                {isAdmin && (
                                  <>
                                    <Button variant="outline" size="sm" onClick={() => handleSendInvoice(invoice.id)}>
                                      <Send className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      onClick={() => handleDeleteInvoice(invoice.id)}
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

            {filteredInvoices.length === 0 && (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Receipt className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
                <p className="text-gray-600 dark:text-gray-300">Try adjusting your search terms or filters</p>
              </div>
            )}
              </TabsContent>

              {isAdmin && (
                <TabsContent value="payment-history" className="space-y-4 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Payment History</CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      A summary of all payments made — whether from patients or insurance — across all invoices
                    </p>
                  </CardHeader>
                  <CardContent>
                    {paymentsLoading ? (
                      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                        <p className="text-sm">Loading payments...</p>
                      </div>
                    ) : (
                      <div className="rounded-md border">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b bg-gray-50 dark:bg-gray-800">
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Invoice</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Payer</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Date</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Method</th>
                              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">Amount</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Status</th>
                              <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Array.isArray(payments) && payments.length > 0 ? (
                              payments.map((payment: any) => {
                                // Get patient name from metadata first, then fall back to looking up patient
                                let patientName = payment.metadata?.patientName;
                                
                                if (!patientName) {
                                  const patient = patients?.find((p: any) => p.patientId === payment.patientId);
                                  patientName = patient ? `${patient.firstName} ${patient.lastName}` : payment.patientId;
                                }
                                
                                // Find the invoice by invoiceId
                                const invoice = invoices?.find((inv: any) => inv.id === payment.invoiceId);
                                const invoiceNumber = invoice?.invoiceNumber || payment.invoiceId;
                                
                                return (
                                  <tr key={payment.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                      {invoiceNumber}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                      {patientName}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                                      {format(new Date(payment.paymentDate), 'MMM d, yyyy')}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 capitalize">
                                      {payment.paymentMethod === 'cash' ? 'Cash' : payment.paymentMethod === 'debit_card' ? 'Debit Card' : payment.paymentMethod.replace('_', ' ')}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 text-right font-medium">
                                      £{(typeof payment.amount === 'string' ? parseFloat(payment.amount) : payment.amount).toFixed(2)}
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                      <span className={`inline-flex items-center gap-1 ${
                                        payment.paymentStatus === 'completed' ? 'text-green-700 dark:text-green-400' : 
                                        payment.paymentStatus === 'pending' ? 'text-yellow-700 dark:text-yellow-400' : 
                                        'text-red-700 dark:text-red-400'
                                      }`}>
                                        <span className={payment.paymentStatus === 'completed' ? 'text-green-600' : payment.paymentStatus === 'pending' ? 'text-yellow-600' : 'text-red-600'}>
                                          {payment.paymentStatus === 'completed' ? '✓' : payment.paymentStatus === 'pending' ? '⏱' : '✗'}
                                        </span> 
                                        {payment.paymentStatus === 'completed' ? 'Successful' : payment.paymentStatus === 'pending' ? 'Pending' : 'Failed'}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      {invoice ? (
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          onClick={() => handleViewInvoice(invoice)} 
                                          data-testid="button-view-invoice-from-payment"
                                          title="View Invoice"
                                        >
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                      ) : (
                                        <span className="text-xs text-gray-400">N/A</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td colSpan={7} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                                  <Receipt className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                  <p className="text-sm">No payment history available</p>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Invoices</CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Self-Pay Invoices (None or Patient Self-Pay)
                    </p>
                  </CardHeader>
                  <CardContent>
                    {invoicesLoading ? (
                      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                        <p className="text-sm">Loading invoices...</p>
                      </div>
                    ) : (
                      <div className="rounded-md border">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b bg-gray-50 dark:bg-gray-800">
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Invoice #</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Patient</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Service Date</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Due Date</th>
                              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">Total Amount</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Status</th>
                              <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              const selfPayInvoices = Array.isArray(invoices) ? invoices.filter((inv: any) => {
                                if (!inv.insurance || inv.insurance === null || inv.insurance === '' || inv.insurance === 'none') {
                                  return true;
                                }
                                
                                const provider = typeof inv.insurance === 'object' ? inv.insurance.provider : inv.insurance;
                                const providerLower = String(provider).toLowerCase();
                                
                                return providerLower === 'none' || providerLower === 'self-pay';
                              }) : [];
                              
                              return selfPayInvoices.length > 0 ? (
                                selfPayInvoices.map((invoice: any) => {
                                  const totalAmount = typeof invoice.totalAmount === 'string' ? parseFloat(invoice.totalAmount) : invoice.totalAmount;
                                  
                                  return (
                                    <tr key={invoice.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {invoice.invoiceNumber || invoice.id}
                                      </td>
                                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                        {invoice.patientName || invoice.patientId}
                                      </td>
                                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                                        {format(new Date(invoice.dateOfService), 'MMM d, yyyy')}
                                      </td>
                                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                                        {format(new Date(invoice.dueDate), 'MMM d, yyyy')}
                                      </td>
                                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 text-right font-medium">
                                        £{totalAmount.toFixed(2)}
                                      </td>
                                      <td className="px-4 py-3 text-sm">
                                        <Badge className={`${getStatusColor(invoice.status)}`}>
                                          {invoice.status}
                                        </Badge>
                                      </td>
                                      <td className="px-4 py-3 text-center">
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          onClick={() => handleViewInvoice(invoice)} 
                                          data-testid={`button-view-invoice-${invoice.id}`}
                                          title="View Invoice"
                                        >
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                      </td>
                                    </tr>
                                  );
                                })
                              ) : (
                                <tr>
                                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                                    <Receipt className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                    <p className="text-sm">No self-pay invoices available</p>
                                  </td>
                                </tr>
                              );
                            })()}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              )}

              {isAdmin && (
                <TabsContent value="insurance-claims" className="space-y-4 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      🛡️ Insurance Claims
                    </CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Track insurance-related invoices, claims submitted, their status, and amounts covered by insurers
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-gray-50 dark:bg-gray-800">
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Invoice</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Provider</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Claim Ref</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">Coverage</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Status</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Submitted</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Approved</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.isArray(invoices) && invoices
                            .filter((invoice: any) => invoice.invoiceType === 'insurance_claim' && invoice.insurance)
                            .map((invoice: any) => (
                              <tr key={invoice.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                                <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {invoice.invoiceNumber || invoice.id}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                  {invoice.insurance?.provider || 'N/A'}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                                  {invoice.insurance?.claimNumber || 'N/A'}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 text-right font-medium">
                                  £{invoice.insurance?.paidAmount 
                                    ? (typeof invoice.insurance.paidAmount === 'string' ? parseFloat(invoice.insurance.paidAmount) : invoice.insurance.paidAmount).toFixed(2)
                                    : (typeof invoice.totalAmount === 'string' ? parseFloat(invoice.totalAmount) : invoice.totalAmount).toFixed(2)}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  {invoice.insurance?.status === 'approved' ? (
                                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                                      ✅ Approved
                                    </Badge>
                                  ) : invoice.insurance?.status === 'denied' ? (
                                    <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                                      ❌ Denied
                                    </Badge>
                                  ) : invoice.insurance?.status === 'partially_paid' ? (
                                    <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                                      ⚠️ Partial
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                                      ⏱ Pending
                                    </Badge>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                                  {invoice.invoiceDate ? format(new Date(invoice.invoiceDate), 'MMM d') : '—'}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                                  {invoice.insurance?.status === 'approved' && invoice.dueDate 
                                    ? format(new Date(invoice.dueDate), 'MMM d')
                                    : '—'}
                                </td>
                              </tr>
                            ))}
                          {(!Array.isArray(invoices) || invoices.filter((inv: any) => inv.invoiceType === 'insurance_claim' && inv.insurance).length === 0) && (
                            <tr>
                              <td colSpan={7} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                <p className="text-sm font-medium">No insurance claims found</p>
                                <p className="text-xs mt-1">Insurance claims will appear here when invoices are billed to insurance providers</p>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              )}


              {/* Custom Reports Tab */}
              {isAdmin && (
                <TabsContent value="custom-reports" className="space-y-4 mt-6">
                  {/* Report Filters */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        Report Filters
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <Label>Date Range</Label>
                          <Select defaultValue="this-month">
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="today">Today</SelectItem>
                              <SelectItem value="this-week">This Week</SelectItem>
                              <SelectItem value="this-month">This Month</SelectItem>
                              <SelectItem value="last-month">Last Month</SelectItem>
                              <SelectItem value="this-quarter">This Quarter</SelectItem>
                              <SelectItem value="this-year">This Year</SelectItem>
                              <SelectItem value="custom">Custom Range</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Provider</Label>
                          <Select defaultValue="all">
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Providers</SelectItem>
                              <SelectItem value="dr-smith">Dr. Smith</SelectItem>
                              <SelectItem value="dr-jones">Dr. Jones</SelectItem>
                              <SelectItem value="dr-brown">Dr. Brown</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Insurance Type</Label>
                          <Select defaultValue="all">
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Insurance</SelectItem>
                              <SelectItem value="nhs">NHS</SelectItem>
                              <SelectItem value="private">Private</SelectItem>
                              <SelectItem value="self-pay">Self Pay</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-end">
                          <Button className="w-full">
                            <FileBarChart className="h-4 w-4 mr-2" />
                            Generate Report
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Revenue Breakdown - Current Month */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Revenue Breakdown - Current Month</CardTitle>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Export CSV
                        </Button>
                        <Button variant="outline" size="sm">
                          <FileText className="h-4 w-4 mr-2" />
                          Export PDF
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-gray-50 dark:bg-gray-800">
                              <th className="text-left p-3">Service Type</th>
                              <th className="text-left p-3">Procedures</th>
                              <th className="text-left p-3">Revenue</th>
                              <th className="text-left p-3">Insurance</th>
                              <th className="text-left p-3">Self-Pay</th>
                              <th className="text-left p-3">Collection Rate</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                              <td className="p-3 font-medium">General Consultation</td>
                              <td className="p-3">24</td>
                              <td className="p-3 font-semibold">{formatCurrency(3600)}</td>
                              <td className="p-3">{formatCurrency(2800)}</td>
                              <td className="p-3">{formatCurrency(800)}</td>
                              <td className="p-3">
                                <Badge className="bg-green-100 text-green-800">95%</Badge>
                              </td>
                            </tr>
                            <tr className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                              <td className="p-3 font-medium">Specialist Consultation</td>
                              <td className="p-3">12</td>
                              <td className="p-3 font-semibold">{formatCurrency(2400)}</td>
                              <td className="p-3">{formatCurrency(1900)}</td>
                              <td className="p-3">{formatCurrency(500)}</td>
                              <td className="p-3">
                                <Badge className="bg-green-100 text-green-800">92%</Badge>
                              </td>
                            </tr>
                            <tr className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                              <td className="p-3 font-medium">Diagnostic Tests</td>
                              <td className="p-3">18</td>
                              <td className="p-3 font-semibold">{formatCurrency(1800)}</td>
                              <td className="p-3">{formatCurrency(1600)}</td>
                              <td className="p-3">{formatCurrency(200)}</td>
                              <td className="p-3">
                                <Badge className="bg-yellow-100 text-yellow-800">88%</Badge>
                              </td>
                            </tr>
                            <tr className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                              <td className="p-3 font-medium">Minor Procedures</td>
                              <td className="p-3">8</td>
                              <td className="p-3 font-semibold">{formatCurrency(1200)}</td>
                              <td className="p-3">{formatCurrency(900)}</td>
                              <td className="p-3">{formatCurrency(300)}</td>
                              <td className="p-3">
                                <Badge className="bg-green-100 text-green-800">94%</Badge>
                              </td>
                            </tr>
                            <tr className="border-b bg-gray-50 dark:bg-gray-800 font-semibold">
                              <td className="p-3">Total</td>
                              <td className="p-3">62</td>
                              <td className="p-3">{formatCurrency(9000)}</td>
                              <td className="p-3">{formatCurrency(7200)}</td>
                              <td className="p-3">{formatCurrency(1800)}</td>
                              <td className="p-3">
                                <Badge className="bg-green-100 text-green-800">92%</Badge>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* Pricing Management Tab */}
              {isAdmin && (
                <TabsContent value="pricing-management" className="space-y-4 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Pricing Management
                      </CardTitle>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Manage pricing for doctors, lab tests, and imaging services with version history tracking
                      </p>
                    </CardHeader>
                    <CardContent>
                      <PricingManagementDashboard />
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
            </Tabs>
            )}

          {false && isAdmin && (
            <div className="space-y-6">
              {/* Report Selection Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedReport('revenue')}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Revenue Report</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Monthly and yearly revenue analysis</p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                    Last updated: {format(new Date(), 'MMM d, yyyy')}
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedReport('outstanding')}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Outstanding Invoices</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Unpaid and overdue invoices</p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                  </div>
                  <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                    Total: {formatCurrency(getOutstandingAmount())}
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedReport('insurance')}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Insurance Analytics</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Claims processing and reimbursements</p>
                    </div>
                    <PieChart className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                    Active claims: 12
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedReport('aging')}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Aging Report</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Accounts receivable by age</p>
                    </div>
                    <Clock className="h-8 w-8 text-orange-600" />
                  </div>
                  <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                    30+ days: £1,250
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedReport('provider')}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Provider Performance</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Revenue by healthcare provider</p>
                    </div>
                    <User className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                    5 providers tracked
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedReport('procedures')}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Procedure Analysis</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Most profitable procedures and services</p>
                    </div>
                    <Target className="h-8 w-8 text-teal-600" />
                  </div>
                  <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                    Top CPT: 99213
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Stats Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Quick Financial Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{formatCurrency(getTotalRevenue())}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">Total Revenue</div>
                    <div className="text-xs text-green-600 mt-1">+12% vs last month</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{formatCurrency(getOutstandingAmount())}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">Outstanding</div>
                    <div className="text-xs text-red-600 mt-1">2 overdue invoices</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">92%</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">Collection Rate</div>
                    <div className="text-xs text-green-600 mt-1">Above industry avg</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">18 days</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">Avg Collection Time</div>
                    <div className="text-xs text-orange-600 mt-1">Industry: 25 days</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
            )}
        </div>
      </div>

      {/* New Invoice Dialog */}
      <Dialog open={showNewInvoice} onOpenChange={setShowNewInvoice}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Invoice</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="patient">Patient</Label>
                <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                  <SelectTrigger>
                    <SelectValue placeholder={patientsLoading ? "Loading patients..." : "Select patient"} />
                  </SelectTrigger>
                  <SelectContent>
                    {patientsLoading ? (
                      <SelectItem value="loading" disabled>Loading...</SelectItem>
                    ) : patients && patients.length > 0 ? (
                      (() => {
                        // Deduplicate patients by unique name combination
                        const uniquePatients = patients.filter((patient: any, index: number, array: any[]) => 
                          array.findIndex((p: any) => 
                            `${p.firstName} ${p.lastName}` === `${patient.firstName} ${patient.lastName}`
                          ) === index
                        );
                        return uniquePatients.map((patient: any) => (
                          <SelectItem key={patient.id} value={patient.patientId}>
                            {patient.firstName} {patient.lastName}
                          </SelectItem>
                        ));
                      })()
                    ) : (
                      <SelectItem value="no-patients" disabled>No patients found</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {patientError && (
                  <p className="text-sm text-red-600 mt-1">{patientError}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="service-date">Service Date</Label>
                <Input 
                  id="service-date" 
                  type="date" 
                  value={serviceDate}
                  onChange={(e) => setServiceDate(e.target.value)}
                />
              </div>
            </div>

            {/* Doctor Name Field */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="doctor-name">Doctor</Label>
                {isDoctor ? (
                  <div className="h-10 px-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-800 flex items-center text-sm">
                    {user?.firstName} {user?.lastName}
                  </div>
                ) : (
                  <div className="h-10 px-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-800 flex items-center text-sm">
                    {user?.firstName} {user?.lastName}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invoice-date">Invoice Date</Label>
                <Input 
                  id="invoice-date" 
                  type="date" 
                  defaultValue={new Date().toISOString().split('T')[0]}
                />
              </div>
              
              <div>
                <Label htmlFor="due-date">Due Date</Label>
                <Input 
                  id="due-date" 
                  type="date" 
                  defaultValue={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                />
              </div>
            </div>

            <div>
              <Label>Services & Procedures</Label>
              <div className="border rounded-md p-4 space-y-3">
                <div className="grid grid-cols-4 gap-2 text-sm font-medium text-gray-600 dark:text-gray-300">
                  <span>Code</span>
                  <span>Description</span>
                  <span>Qty</span>
                  <span>Amount</span>
                </div>
                
                <div className="grid grid-cols-4 gap-2">
                  <Input placeholder="Enter CPT Code" value={firstServiceCode} onChange={(e) => setFirstServiceCode(e.target.value)} />
                  <Input placeholder="Enter Description" value={firstServiceDesc} onChange={(e) => setFirstServiceDesc(e.target.value)} />
                  <Input placeholder="Qty" value={firstServiceQty} onChange={(e) => setFirstServiceQty(e.target.value)} />
                  <Input placeholder="Amount" value={firstServiceAmount} onChange={(e) => setFirstServiceAmount(e.target.value)} />
                </div>
                
                <div className="grid grid-cols-4 gap-2">
                  <Input placeholder="CPT Code" />
                  <Input placeholder="Description" />
                  <Input placeholder="1" />
                  <Input placeholder="0.00" />
                </div>
              </div>
              {serviceError && (
                <p className="text-sm text-red-600 mt-1">{serviceError}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="insurance">Insurance Provider</Label>
                <Select value={insuranceProvider} onValueChange={setInsuranceProvider}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select insurance provider..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Patient Self-Pay)</SelectItem>
                    <SelectItem value="nhs">NHS (National Health Service)</SelectItem>
                    <SelectItem value="bupa">Bupa</SelectItem>
                    <SelectItem value="axa">AXA PPP Healthcare</SelectItem>
                    <SelectItem value="vitality">Vitality Health</SelectItem>
                    <SelectItem value="aviva">Aviva Health</SelectItem>
                    <SelectItem value="simply">Simply Health</SelectItem>
                    <SelectItem value="wpa">WPA</SelectItem>
                    <SelectItem value="benenden">Benenden Health</SelectItem>
                    <SelectItem value="healix">Healix Health Services</SelectItem>
                    <SelectItem value="sovereign">Sovereign Health Care</SelectItem>
                    <SelectItem value="exeter">Exeter Friendly Society</SelectItem>
                    <SelectItem value="selfpay">Self-Pay</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {insuranceProvider && insuranceProvider !== '' && insuranceProvider !== 'none' && (
                <div>
                  <Label htmlFor="nhs-number">NHS Number</Label>
                  <Input 
                    id="nhs-number" 
                    placeholder="123 456 7890 (10 digits)" 
                    value={nhsNumber}
                    onChange={(e) => {
                      const value = e.target.value;
                      setNhsNumber(value);
                      const digitsOnly = value.replace(/\s+/g, '');
                      if (digitsOnly.length > 0 && digitsOnly.length !== 10) {
                        setNhsNumberError("NHS number must be exactly 10 digits");
                      } else if (digitsOnly.length > 0 && !/^\d+$/.test(digitsOnly)) {
                        setNhsNumberError("NHS number must contain only digits");
                      } else {
                        setNhsNumberError("");
                      }
                    }}
                    maxLength={12}
                  />
                  {nhsNumberError && (
                    <p className="text-sm text-red-600 mt-1">{nhsNumberError}</p>
                  )}
                </div>
              )}
              
              <div>
                <Label htmlFor="total">Total Amount</Label>
                <Input 
                  id="total" 
                  placeholder="Enter amount (e.g., 150.00)" 
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                />
                {totalAmountError && (
                  <p className="text-sm text-red-600 mt-1">{totalAmountError}</p>
                )}
              </div>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center gap-2">
                <Label className="font-semibold">Invoice Type:</Label>
                <Badge 
                  className={
                    insuranceProvider && insuranceProvider !== '' && insuranceProvider !== 'none' 
                      ? "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400" 
                      : "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                  }
                >
                  {insuranceProvider && insuranceProvider !== '' && insuranceProvider !== 'none' 
                    ? "Insurance Claim" 
                    : "Payment (Self-Pay)"}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {insuranceProvider && insuranceProvider !== '' && insuranceProvider !== 'none' 
                  ? "This invoice will be billed to the insurance provider" 
                  : "This invoice will be paid directly by the patient"}
              </p>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea 
                id="notes" 
                placeholder="Additional notes or instructions..."
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowNewInvoice(false)}>
              Cancel
            </Button>
            <Button onClick={async () => {
              console.log('Creating new invoice...');
              
              // Clear previous validation errors
              setPatientError("");
              setServiceError("");
              setTotalAmountError("");
              setNhsNumberError("");
              
              let hasValidationError = false;
              
              // Validate patient selection
              if (!selectedPatient || selectedPatient === '' || selectedPatient === 'loading' || selectedPatient === 'no-patients') {
                setPatientError('Please select a patient');
                hasValidationError = true;
              }
              
              // Validate service data - ALL fields are required per backend validation
              if (!firstServiceCode.trim()) {
                setServiceError('Please enter a service code');
                hasValidationError = true;
              } else if (!firstServiceDesc.trim()) {
                setServiceError('Please enter a service description');
                hasValidationError = true;
              } else if (!firstServiceQty.trim() || isNaN(parseInt(firstServiceQty)) || parseInt(firstServiceQty) <= 0) {
                setServiceError('Please enter a valid service quantity');
                hasValidationError = true;
              } else if (!firstServiceAmount.trim() || isNaN(parseFloat(firstServiceAmount)) || parseFloat(firstServiceAmount) <= 0) {
                setServiceError('Please enter a valid service amount');
                hasValidationError = true;
              }
              
              // Validate total amount
              const total = parseFloat(totalAmount || '0');
              if (isNaN(total) || total <= 0) {
                setTotalAmountError('Please enter a valid total amount greater than 0');
                hasValidationError = true;
              }
              
              // Validate NHS Number if insurance provider is selected
              if (insuranceProvider && insuranceProvider !== '' && insuranceProvider !== 'none') {
                const digitsOnly = nhsNumber.replace(/\s+/g, '');
                if (!nhsNumber.trim()) {
                  setNhsNumberError('NHS number is required for insurance claims');
                  hasValidationError = true;
                } else if (digitsOnly.length !== 10) {
                  setNhsNumberError('NHS number must be exactly 10 digits');
                  hasValidationError = true;
                } else if (!/^\d+$/.test(digitsOnly)) {
                  setNhsNumberError('NHS number must contain only digits');
                  hasValidationError = true;
                }
              }
              
              // Stop if there are validation errors
              if (hasValidationError) {
                return;
              }
              
              try {
                // Create invoice via API
                const invoiceData = {
                  patientId: selectedPatient,
                  serviceDate,
                  invoiceDate,
                  dueDate,
                  totalAmount,
                  insuranceProvider,
                  nhsNumber: nhsNumber.trim() || undefined,
                  firstServiceCode,
                  firstServiceDesc,
                  firstServiceQty,
                  firstServiceAmount,
                  notes
                };

                const response = await apiRequest('POST', '/api/billing/invoices', invoiceData);
                
                // Check if response is successful
                if (!response.ok) {
                  const errorData = await response.json();
                  throw new Error(errorData.error || 'Failed to create invoice');
                }
                
                const newInvoice = await response.json();
                
                // Close the create invoice dialog
                setShowNewInvoice(false);
                
                // Reset form state
                setSelectedPatient("");
                setServiceDate(new Date().toISOString().split('T')[0]);
                setInvoiceDate(new Date().toISOString().split('T')[0]);
                setDueDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
                setTotalAmount("");
                setInsuranceProvider("");
                setNhsNumber("");
                setFirstServiceCode("");
                setFirstServiceDesc("");
                setFirstServiceQty("");
                setFirstServiceAmount("");
                setNotes("");
                
                // Show success modal
                setCreatedInvoiceNumber(newInvoice.invoiceNumber);
                setShowSuccessModal(true);
                
                // Automatically refresh billing data - invalidate all invoice queries
                queryClient.invalidateQueries({ queryKey: ["/api/billing/invoices"] });
                queryClient.invalidateQueries({ queryKey: ["/api/billing"] });
                queryClient.refetchQueries({ queryKey: ["/api/billing/invoices"] });
                queryClient.refetchQueries({ queryKey: ["/api/billing"] });
              } catch (error) {
                console.error('Invoice creation failed:', error);
                const errorMessage = error instanceof Error ? error.message : 'Failed to create invoice. Please try again.';
                toast({
                  title: "Invoice Creation Failed",
                  description: errorMessage,
                  variant: "destructive"
                });
              }
            }}>
              Create Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Invoice Dialog */}
      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Details - {selectedInvoice?.id}</DialogTitle>
          </DialogHeader>
          
          {selectedInvoice && (
            <div className="space-y-6">
              {/* Invoice Header */}
              <div className="grid grid-cols-2 gap-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <h3 className="font-semibold text-lg mb-3 text-gray-900 dark:text-gray-100">Patient Information</h3>
                  <div className="space-y-1 text-sm text-gray-900 dark:text-gray-100">
                    <div><strong>Name:</strong> {selectedInvoice.patientName}</div>
                    <div><strong>Patient ID:</strong> {selectedInvoice.patientId}</div>
                    <div><strong>Service Date:</strong> {format(new Date(selectedInvoice.dateOfService), 'MMM d, yyyy')}</div>
                    <div><strong>Invoice Date:</strong> {format(new Date(selectedInvoice.invoiceDate), 'MMM d, yyyy')}</div>
                    <div><strong>Due Date:</strong> {format(new Date(selectedInvoice.dueDate), 'MMM d, yyyy')}</div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold text-lg mb-3 text-gray-900 dark:text-gray-100">Billing Summary</h3>
                  <div className="space-y-1 text-sm text-gray-900 dark:text-gray-100">
                    <div><strong>Invoice ID:</strong> {selectedInvoice.invoiceNumber || selectedInvoice.id}</div>
                    <div className="flex items-center gap-2">
                      <strong>Status:</strong> 
                      {isEditingStatus ? (
                        <div className="flex items-center gap-2">
                          <Select value={editedStatus} onValueChange={setEditedStatus}>
                            <SelectTrigger className="w-[150px] h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="paid">Paid</SelectItem>
                              <SelectItem value="sent">Sent</SelectItem>
                              <SelectItem value="overdue">Overdue</SelectItem>
                              <SelectItem value="draft">Pending</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button size="sm" onClick={handleUpdateStatus}>Save</Button>
                          <Button size="sm" variant="outline" onClick={() => setIsEditingStatus(false)}>Cancel</Button>
                        </div>
                      ) : (
                        <Badge className={`${selectedInvoice.status === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 
                          selectedInvoice.status === 'overdue' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' : 
                          selectedInvoice.status === 'sent' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' : 
                          'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'}`}>
                          {selectedInvoice.status}
                        </Badge>
                      )}
                    </div>
                    <div><strong>Total Amount:</strong> £{parseFloat(selectedInvoice.totalAmount.toString()).toFixed(2)}</div>
                    <div><strong>Paid Amount:</strong> £{parseFloat(selectedInvoice.paidAmount.toString()).toFixed(2)}</div>
                    <div><strong>Outstanding:</strong> £{(parseFloat(selectedInvoice.totalAmount.toString()) - parseFloat(selectedInvoice.paidAmount.toString())).toFixed(2)}</div>
                  </div>
                </div>
              </div>

              {/* Services & Procedures */}
              <div>
                <h3 className="font-semibold text-lg mb-3 text-gray-900 dark:text-gray-100">Services & Procedures</h3>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left p-3 text-gray-900 dark:text-gray-100">Code</th>
                        <th className="text-left p-3 text-gray-900 dark:text-gray-100">Description</th>
                        <th className="text-right p-3 text-gray-900 dark:text-gray-100">Qty</th>
                        <th className="text-right p-3 text-gray-900 dark:text-gray-100">Unit Price</th>
                        <th className="text-right p-3 text-gray-900 dark:text-gray-100">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.items.map((item, index) => (
                        <tr key={index} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                          <td className="p-3 font-mono text-gray-900 dark:text-gray-100">{item.code}</td>
                          <td className="p-3 text-gray-900 dark:text-gray-100">{item.description}</td>
                          <td className="p-3 text-right text-gray-900 dark:text-gray-100">{item.quantity}</td>
                          <td className="p-3 text-right text-gray-900 dark:text-gray-100">£{Number(item.unitPrice).toFixed(2)}</td>
                          <td className="p-3 text-right font-semibold text-gray-900 dark:text-gray-100">£{Number(item.total).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Insurance Information */}
              {selectedInvoice.insurance && (
                <div>
                  <h3 className="font-semibold text-lg mb-3 text-gray-900 dark:text-gray-100">Insurance Information</h3>
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-900 dark:text-gray-100">
                      <div>
                        <div><strong>Provider:</strong> {selectedInvoice.insurance.provider}</div>
                        <div><strong>Claim Number:</strong> {selectedInvoice.insurance.claimNumber}</div>
                      </div>
                      <div>
                        <div><strong>Status:</strong> 
                          <Badge className={`ml-2 ${selectedInvoice.insurance.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 
                            selectedInvoice.insurance.status === 'denied' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' : 
                            'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'}`}>
                            {selectedInvoice.insurance.status}
                          </Badge>
                        </div>
                        <div><strong>Insurance Paid:</strong> £{(typeof selectedInvoice.insurance.paidAmount === 'string' ? parseFloat(selectedInvoice.insurance.paidAmount) : selectedInvoice.insurance.paidAmount).toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment History */}
              <div>
                <h3 className="font-semibold text-lg mb-3 text-gray-900 dark:text-gray-100">Payment History</h3>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {(typeof selectedInvoice.paidAmount === 'string' ? parseFloat(selectedInvoice.paidAmount) : selectedInvoice.paidAmount) > 0 ? (
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-gray-900 dark:text-gray-100">
                      Payment of £{(typeof selectedInvoice.paidAmount === 'string' ? parseFloat(selectedInvoice.paidAmount) : selectedInvoice.paidAmount).toFixed(2)} received on {format(new Date(selectedInvoice.invoiceDate), 'MMM d, yyyy')}
                    </div>
                  ) : (
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-gray-900 dark:text-gray-100">
                      No payments received yet
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setSelectedInvoice(null)}>
              Close
            </Button>
            <Button variant="default" onClick={() => {
              if (selectedInvoice) {
                handleSaveInvoice(selectedInvoice.id.toString());
              }
            }} data-testid="button-save-invoice">
              <Download className="h-4 w-4 mr-2" />
              Save Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Invoice Dialog */}
      <Dialog open={sendInvoiceDialog} onOpenChange={setSendInvoiceDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Invoice</DialogTitle>
          </DialogHeader>
          
          {invoiceToSend && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm">
                  <div><strong>Invoice:</strong> {invoiceToSend.id}</div>
                  <div><strong>Patient:</strong> {invoiceToSend.patientName}</div>
                  <div><strong>Amount:</strong> £{(typeof invoiceToSend.totalAmount === 'string' ? parseFloat(invoiceToSend.totalAmount) : invoiceToSend.totalAmount).toFixed(2)}</div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="sendMethod">Send Method</Label>
                  <Select value={sendMethod} onValueChange={setSendMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="print">Print & Mail</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {sendMethod === "email" && (
                  <div>
                    <Label htmlFor="recipientEmail">Recipient Email</Label>
                    <Input
                      id="recipientEmail"
                      type="email"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      placeholder="patient@email.com"
                    />
                  </div>
                )}

                {sendMethod === "sms" && (
                  <div>
                    <Label htmlFor="recipientPhone">Recipient Phone</Label>
                    <Input
                      id="recipientPhone"
                      type="tel"
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                      placeholder="+44 7XXX XXXXXX"
                    />
                  </div>
                )}

                {sendMethod === "print" && (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="recipientName">Recipient Name</Label>
                      <Input
                        id="recipientName"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        placeholder="Full name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="recipientAddress">Mailing Address</Label>
                      <Textarea
                        id="recipientAddress"
                        value={recipientAddress}
                        onChange={(e) => setRecipientAddress(e.target.value)}
                        placeholder="Street address, City, Postal code"
                        rows={3}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="customMessage">Message (Optional)</Label>
                  <Textarea
                    id="customMessage"
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Add a personal message..."
                    rows={4}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSendInvoiceDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={confirmSendInvoice} 
              disabled={
                (sendMethod === "email" && !recipientEmail) ||
                (sendMethod === "sms" && !recipientPhone) ||
                (sendMethod === "print" && (!recipientName || !recipientAddress))
              }
            >
              <Send className="h-4 w-4 mr-2" />
              Send Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="h-16 w-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-500" />
              </div>
            </div>
            <DialogTitle className="text-center text-xl">Invoice Created Successfully!</DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <p className="text-muted-foreground">
              Invoice <span className="font-semibold text-foreground">{createdInvoiceNumber}</span> has been created successfully!
            </p>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button onClick={() => setShowSuccessModal(false)} className="w-full sm:w-auto">
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Download Success Modal */}
      <Dialog open={showDownloadModal} onOpenChange={setShowDownloadModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="h-16 w-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                <Download className="h-10 w-10 text-blue-600 dark:text-blue-500" />
              </div>
            </div>
            <DialogTitle className="text-center text-xl">Invoice Downloaded Successfully!</DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <p className="text-muted-foreground">
              Invoice <span className="font-semibold text-foreground">{downloadedInvoiceNumber}</span> downloaded successfully!
            </p>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button onClick={() => setShowDownloadModal(false)} className="w-full sm:w-auto">
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Invoice</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              Are you sure you want to delete invoice {invoiceToDelete?.id} for {invoiceToDelete?.patientName}?
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteInvoice}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Invoice Success Modal */}
      <Dialog open={showSendSuccessModal} onOpenChange={setShowSendSuccessModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="h-16 w-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                <Send className="h-10 w-10 text-blue-600 dark:text-blue-500" />
              </div>
            </div>
            <DialogTitle className="text-center text-xl">Invoice Sent Successfully!</DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <p className="text-muted-foreground">
              Invoice <span className="font-semibold text-foreground">{sentInvoiceInfo.invoiceNumber}</span> sent to <span className="font-semibold text-foreground">{sentInvoiceInfo.recipient}</span>
            </p>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button onClick={() => setShowSendSuccessModal(false)} className="w-full sm:w-auto">
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Invoice Success Modal */}
      <Dialog open={showDeleteSuccessModal} onOpenChange={setShowDeleteSuccessModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="h-16 w-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-500" />
              </div>
            </div>
            <DialogTitle className="text-center text-xl">Invoice Deleted Successfully!</DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <p className="text-muted-foreground">
              Invoice <span className="font-semibold text-foreground">{deletedInvoiceNumber}</span> has been successfully deleted
            </p>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button onClick={() => setShowDeleteSuccessModal(false)} className="w-full sm:w-auto">
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Update Success Modal */}
      <Dialog open={showStatusUpdateModal} onOpenChange={setShowStatusUpdateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="h-16 w-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-500" />
              </div>
            </div>
            <DialogTitle className="text-center text-xl">Status Updated Successfully!</DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <p className="text-muted-foreground">
              Invoice status updated successfully!
            </p>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button onClick={() => setShowStatusUpdateModal(false)} className="w-full sm:w-auto">
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      {invoiceToPay && (
        <PaymentModal
          invoice={invoiceToPay}
          open={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setInvoiceToPay(null);
          }}
          onSuccess={() => {
            setShowPaymentModal(false);
            setInvoiceToPay(null);
            queryClient.invalidateQueries({ queryKey: ["/api/billing/invoices"] });
            queryClient.refetchQueries({ queryKey: ["/api/billing/invoices"] });
          }}
        />
      )}
    </>
  );
}

// Payment Modal Component with Stripe
function PaymentModal({ invoice, open, onClose, onSuccess }: {
  invoice: Invoice;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pay Invoice {invoice.patientId}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Patient:</span>
              <span className="font-medium">{invoice.patientName}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Amount:</span>
              <span className="font-bold text-lg">${typeof invoice.totalAmount === 'string' ? parseFloat(invoice.totalAmount).toFixed(2) : invoice.totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Due Date:</span>
              <span className="text-sm">{format(new Date(invoice.dueDate), 'MMM dd, yyyy')}</span>
            </div>
          </div>

          <StripePaymentForm invoice={invoice} onSuccess={onSuccess} onCancel={onClose} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Initialize Stripe only if public key is available
const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY 
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
  : null;

// Stripe Payment Form Component
function StripePaymentForm({ invoice, onSuccess, onCancel }: {
  invoice: Invoice;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Create payment intent when component mounts
  useEffect(() => {
    const createPaymentIntent = async () => {
      try {
        setLoading(true);
        const res = await apiRequest('POST', '/api/billing/create-payment-intent', {
          invoiceId: invoice.id
        });
        
        // Ensure response is JSON
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Invalid response format from server');
        }
        
        const data = await res.json();
        
        if (data?.clientSecret) {
          setClientSecret(data.clientSecret);
        } else if (data?.error) {
          setError(data.error);
          toast({
            title: "Payment Error",
            description: data.error,
            variant: "destructive"
          });
        } else {
          setError('Failed to initialize payment');
          toast({
            title: "Payment Error",
            description: "Failed to initialize payment. Please try again.",
            variant: "destructive"
          });
        }
      } catch (err: any) {
        console.error('Error creating payment intent:', err);
        
        // Extract user-friendly error message
        let errorMessage = 'Failed to initialize payment. Please try again.';
        
        if (err?.message) {
          // Check if error message is JSON string
          try {
            const parsed = JSON.parse(err.message);
            if (parsed?.error) {
              errorMessage = parsed.error;
            } else {
              errorMessage = err.message;
            }
          } catch {
            // Not JSON, use message as is
            errorMessage = err.message;
          }
        } else if (typeof err === 'string') {
          errorMessage = err;
        }
        
        // Make error messages more user-friendly
        if (errorMessage.includes('stripe is not defined')) {
          errorMessage = 'Payment system is not configured. Please contact support.';
        } else if (errorMessage.includes('STRIPE_SECRET_KEY')) {
          errorMessage = 'Payment system is not configured. Please contact support.';
        } else if (errorMessage.includes('500')) {
          errorMessage = 'Server error occurred. Please try again or contact support.';
        }
        
        setError(errorMessage);
        toast({
          title: "Payment Error",
          description: errorMessage,
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    createPaymentIntent();
  }, [invoice.id, invoice.totalAmount, toast]);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bluewave mx-auto mb-4"></div>
        <p className="text-sm text-gray-600 dark:text-gray-400">Initializing payment...</p>
      </div>
    );
  }

  if (error || !clientSecret) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-sm text-red-600 dark:text-red-400">{error || 'Failed to initialize payment'}</p>
        <Button variant="outline" onClick={onCancel} className="mt-4">Close</Button>
      </div>
    );
  }

  if (!stripePromise) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <p className="text-sm text-gray-600 dark:text-gray-400">Payment processing is not configured. Please contact support.</p>
        <Button variant="outline" onClick={onCancel} className="mt-4">Close</Button>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <PaymentForm invoice={invoice} onSuccess={onSuccess} onCancel={onCancel} />
    </Elements>
  );
}

// Payment Form Component (inside Elements)
function PaymentForm({ invoice, onSuccess, onCancel }: {
  invoice: Invoice;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message || "An error occurred during payment",
          variant: "destructive"
        });
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Process the payment on our backend
        const res = await apiRequest('POST', '/api/billing/process-payment', {
          invoiceId: invoice.id,
          paymentIntentId: paymentIntent.id
        });

        // Ensure response is JSON
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Invalid response format from server');
        }

        const result = await res.json();
        
        if (result.success) {
          toast({
            title: "Payment Successful",
            description: "Your payment has been processed successfully!",
          });
          
          onSuccess();
        } else {
          const errorMessage = result.error || 'Payment processing failed';
          toast({
            title: "Payment Failed",
            description: errorMessage,
            variant: "destructive"
          });
          throw new Error(errorMessage);
        }
      }
    } catch (err) {
      console.error('Payment error:', err);
      toast({
        title: "Payment Failed",
        description: "An error occurred while processing your payment",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <PaymentElement />
      </div>
      
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-1 bg-black hover:bg-black/90 text-white"
        >
          {isProcessing ? 'Processing...' : `Pay $${typeof invoice.totalAmount === 'string' ? parseFloat(invoice.totalAmount).toFixed(2) : invoice.totalAmount.toFixed(2)}`}
        </Button>
      </div>
    </form>
  );
}