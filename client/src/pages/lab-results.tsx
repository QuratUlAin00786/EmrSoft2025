import { useState, useEffect } from "react";
import curaIcon from "@/assets/cura-icon.png";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Header } from "@/components/layout/header";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { isDoctorLike, formatRoleLabel } from "@/lib/role-utils";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

// Load Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

// Medical Specialties Data Structure
const medicalSpecialties = {
  "General & Primary Care": {
    "General Practitioner (GP) / Family Physician": [
      "Common illnesses",
      "Preventive care",
    ],
    "Internal Medicine Specialist": [
      "Adult health",
      "Chronic diseases (diabetes, hypertension)",
    ],
  },
  "Surgical Specialties": {
    "General Surgeon": [
      "Abdominal Surgery",
      "Hernia Repair",
      "Gallbladder & Appendix Surgery",
      "Colorectal Surgery",
      "Breast Surgery",
      "Endocrine Surgery (thyroid, parathyroid, adrenal)",
      "Trauma & Emergency Surgery",
    ],
    "Orthopedic Surgeon": [
      "Joint Replacement (hip, knee, shoulder)",
      "Spine Surgery",
      "Sports Orthopedics (ACL tears, ligament reconstruction)",
      "Pediatric Orthopedics",
      "Arthroscopy (keyhole joint surgery)",
      "Trauma & Fracture Care",
    ],
    Neurosurgeon: [
      "Brain Tumor Surgery",
      "Spinal Surgery",
      "Cerebrovascular Surgery (stroke, aneurysm)",
      "Pediatric Neurosurgery",
      "Functional Neurosurgery (Parkinson's, epilepsy, DBS)",
      "Trauma Neurosurgery",
    ],
    "Cardiothoracic Surgeon": [
      "Cardiac Surgery – Bypass, valve replacement",
      "Thoracic Surgery – Lungs, esophagus, chest tumors",
      "Congenital Heart Surgery – Pediatric heart defects",
      "Heart & Lung Transplants",
      "Minimally Invasive / Robotic Heart Surgery",
    ],
    "Plastic & Reconstructive Surgeon": [
      "Cosmetic Surgery (nose job, facelift, liposuction)",
      "Reconstructive Surgery (after cancer, trauma)",
      "Burn Surgery",
      "Craniofacial Surgery (cleft lip/palate, facial bones)",
      "Hand Surgery",
    ],
    "ENT Surgeon (Otolaryngologist)": [
      "Otology (ear surgeries, cochlear implants)",
      "Rhinology (sinus, deviated septum)",
      "Laryngology (voice box, throat)",
      "Head & Neck Surgery (thyroid, tumors)",
      "Pediatric ENT (tonsils, adenoids, ear tubes)",
      "Facial Plastic Surgery (nose/ear correction)",
    ],
    "Urological Surgeon": [
      "Endourology (kidney stones, minimally invasive)",
      "Uro-Oncology (prostate, bladder, kidney cancer)",
      "Pediatric Urology",
      "Male Infertility & Andrology",
      "Renal Transplant Surgery",
      "Neurourology (bladder control disorders)",
    ],
  },
  "Heart & Circulation": {
    Cardiologist: ["Heart diseases", "ECG", "Angiography"],
    "Vascular Surgeon": ["Arteries", "Veins", "Blood vessels"],
  },
  "Women's Health": {
    Gynecologist: ["Female reproductive system"],
    Obstetrician: ["Pregnancy & childbirth"],
    "Fertility Specialist (IVF Expert)": ["Infertility treatment"],
  },
  "Children's Health": {
    Pediatrician: ["General child health"],
    "Pediatric Surgeon": ["Infant & child surgeries"],
    Neonatologist: ["Newborn intensive care"],
  },
  "Brain & Nervous System": {
    Neurologist: ["Stroke", "Epilepsy", "Parkinson's"],
    Psychiatrist: ["Mental health (depression, anxiety)"],
    "Psychologist (Clinical)": ["Therapy & counseling"],
  },
  "Skin, Hair & Appearance": {
    Dermatologist: ["Skin", "Hair", "Nails"],
    Cosmetologist: ["Non-surgical cosmetic treatments"],
    "Aesthetic / Cosmetic Surgeon": ["Surgical enhancements"],
  },
  "Eye & Vision": {
    Ophthalmologist: ["Cataracts", "Glaucoma", "Surgeries"],
    Optometrist: ["Vision correction (glasses, lenses)"],
  },
  "Teeth & Mouth": {
    "Dentist (General)": ["Oral health", "Fillings"],
    Orthodontist: ["Braces", "Alignment"],
    "Oral & Maxillofacial Surgeon": ["Jaw surgery", "Implants"],
    Periodontist: ["Gum disease specialist"],
    Endodontist: ["Root canal specialist"],
  },
  "Digestive System": {
    Gastroenterologist: ["Stomach", "Intestines"],
    Hepatologist: ["Liver specialist"],
    "Colorectal Surgeon": ["Colon", "Rectum", "Anus"],
  },
  "Kidneys & Urinary Tract": {
    Nephrologist: ["Kidney diseases", "Dialysis"],
    "Urological Surgeon": ["Surgical urological procedures"],
  },
  "Respiratory System": {
    Pulmonologist: ["Asthma", "COPD", "Tuberculosis"],
    "Thoracic Surgeon": ["Lung surgeries"],
  },
  Cancer: {
    Oncologist: ["Medical cancer specialist"],
    "Radiation Oncologist": ["Radiation therapy"],
    "Surgical Oncologist": ["Cancer surgeries"],
  },
  "Endocrine & Hormones": {
    Endocrinologist: ["Diabetes", "Thyroid", "Hormones"],
  },
  "Muscles & Joints": {
    Rheumatologist: ["Arthritis", "Autoimmune"],
    "Sports Medicine Specialist": ["Athlete injuries"],
  },
  "Blood & Immunity": {
    Hematologist: ["Blood diseases (anemia, leukemia)"],
    "Immunologist / Allergist": ["Immune & allergy disorders"],
  },
  Others: {
    Geriatrician: ["Elderly care"],
    Pathologist: ["Lab & diagnostic testing"],
    Radiologist: ["Imaging (X-ray, CT, MRI)"],
    Anesthesiologist: ["Pain & anesthesia"],
    "Emergency Medicine Specialist": ["Accidents", "Trauma"],
    "Occupational Medicine Specialist": ["Workplace health"],
  },
};
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
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
  Minus,
  Trash2,
  FileText as Prescription,
  Printer,
  ChevronsUpDown,
  X,
  Edit,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface DatabaseLabResult {
  id: number;
  organizationId: number;
  patientId: number;
  testId: string;
  testType: string;
  orderedBy: number;
  doctorName?: string;
  mainSpecialty?: string;
  subSpecialty?: string;
  priority?: string;
  orderedAt: string;
  collectedAt?: string;
  completedAt?: string;
  status: "pending" | "processing" | "completed" | "cancelled";
  results: Array<{
    name: string;
    value: string;
    unit: string;
    referenceRange: string;
    status: "normal" | "abnormal_high" | "abnormal_low" | "critical";
    flag?: string;
  }>;
  criticalValues: boolean;
  notes?: string;
  createdAt: string;
}

interface User {
  id: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
}

// Test types for lab orders
const TEST_TYPES = [
  "Complete Blood Count (CBC)",
  "Basic Metabolic Panel",
  "Comprehensive Metabolic Panel",
  "Lipid Panel",
  "Liver Function Tests",
  "Thyroid Function Tests",
  "Hemoglobin A1C",
  "Urinalysis",
  "Vitamin D",
  "Iron Studies",
];

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
  "Basic Metabolic Panel": [
    { name: "Glucose", unit: "mg/dL", referenceRange: "70 - 100" },
    { name: "Calcium", unit: "mg/dL", referenceRange: "8.5 - 10.5" },
    { name: "Sodium", unit: "mmol/L", referenceRange: "136 - 145" },
    { name: "Potassium", unit: "mmol/L", referenceRange: "3.5 - 5.0" },
    { name: "Chloride", unit: "mmol/L", referenceRange: "98 - 107" },
    { name: "CO2", unit: "mmol/L", referenceRange: "23 - 29" },
    { name: "BUN", unit: "mg/dL", referenceRange: "7 - 20" },
    { name: "Creatinine", unit: "mg/dL", referenceRange: "0.6 - 1.2" },
  ],
  "Liver Function Tests": [
    { name: "ALT (SGPT)", unit: "U/L", referenceRange: "7 - 56" },
    { name: "AST (SGOT)", unit: "U/L", referenceRange: "10 - 40" },
    { name: "ALP", unit: "U/L", referenceRange: "44 - 147" },
    { name: "Total Bilirubin", unit: "mg/dL", referenceRange: "0.1 - 1.2" },
    { name: "Direct Bilirubin", unit: "mg/dL", referenceRange: "0.0 - 0.3" },
    { name: "Total Protein", unit: "g/dL", referenceRange: "6.0 - 8.3" },
    { name: "Albumin", unit: "g/dL", referenceRange: "3.5 - 5.5" },
    { name: "Globulin", unit: "g/dL", referenceRange: "2.0 - 3.5" },
  ],
  "Lipid Panel": [
    { name: "Total Cholesterol", unit: "mg/dL", referenceRange: "<200" },
    { name: "LDL Cholesterol", unit: "mg/dL", referenceRange: "<100" },
    { name: "HDL Cholesterol", unit: "mg/dL", referenceRange: ">40" },
    { name: "Triglycerides", unit: "mg/dL", referenceRange: "<150" },
    { name: "VLDL Cholesterol", unit: "mg/dL", referenceRange: "5 - 40" },
  ],
  "Thyroid Function Tests": [
    { name: "TSH", unit: "mIU/L", referenceRange: "0.4 - 4.0" },
    { name: "Free T4", unit: "ng/dL", referenceRange: "0.8 - 1.8" },
    { name: "Free T3", unit: "pg/mL", referenceRange: "2.3 - 4.2" },
    { name: "Total T4", unit: "μg/dL", referenceRange: "5.0 - 12.0" },
    { name: "Total T3", unit: "ng/dL", referenceRange: "80 - 200" },
  ],
  "Hemoglobin A1C": [
    { name: "Hemoglobin A1C (HbA1c)", unit: "%", referenceRange: "4.0 - 5.6" },
    { name: "Estimated Average Glucose (eAG)", unit: "mg/dL", referenceRange: "< 117" },
  ],
  "Comprehensive Metabolic Panel": [
    { name: "Glucose", unit: "mg/dL", referenceRange: "70 - 100" },
    { name: "Calcium", unit: "mg/dL", referenceRange: "8.5 - 10.5" },
    { name: "Sodium", unit: "mmol/L", referenceRange: "136 - 145" },
    { name: "Potassium", unit: "mmol/L", referenceRange: "3.5 - 5.0" },
    { name: "Chloride", unit: "mmol/L", referenceRange: "98 - 107" },
    { name: "CO2", unit: "mmol/L", referenceRange: "23 - 29" },
    { name: "BUN", unit: "mg/dL", referenceRange: "7 - 20" },
    { name: "Creatinine", unit: "mg/dL", referenceRange: "0.6 - 1.2" },
    { name: "ALT (SGPT)", unit: "U/L", referenceRange: "7 - 56" },
    { name: "AST (SGOT)", unit: "U/L", referenceRange: "10 - 40" },
    { name: "ALP", unit: "U/L", referenceRange: "44 - 147" },
    { name: "Total Bilirubin", unit: "mg/dL", referenceRange: "0.1 - 1.2" },
    { name: "Total Protein", unit: "g/dL", referenceRange: "6.0 - 8.3" },
    { name: "Albumin", unit: "g/dL", referenceRange: "3.5 - 5.5" },
  ],
  "Urinalysis": [
    { name: "Color", unit: "", referenceRange: "Yellow to Amber" },
    { name: "Appearance", unit: "", referenceRange: "Clear" },
    { name: "Specific Gravity", unit: "", referenceRange: "1.005 - 1.030" },
    { name: "pH", unit: "", referenceRange: "4.5 - 8.0" },
    { name: "Protein", unit: "mg/dL", referenceRange: "Negative" },
    { name: "Glucose", unit: "mg/dL", referenceRange: "Negative" },
    { name: "Ketones", unit: "", referenceRange: "Negative" },
    { name: "Blood", unit: "", referenceRange: "Negative" },
    { name: "Bilirubin", unit: "", referenceRange: "Negative" },
    { name: "Urobilinogen", unit: "mg/dL", referenceRange: "0.1 - 1.0" },
    { name: "Nitrites", unit: "", referenceRange: "Negative" },
    { name: "Leukocyte Esterase", unit: "", referenceRange: "Negative" },
    { name: "WBC", unit: "/hpf", referenceRange: "0 - 5" },
    { name: "RBC", unit: "/hpf", referenceRange: "0 - 2" },
    { name: "Epithelial Cells", unit: "/hpf", referenceRange: "Few" },
    { name: "Bacteria", unit: "", referenceRange: "None to Few" },
    { name: "Casts", unit: "/lpf", referenceRange: "0 - 2" },
    { name: "Crystals", unit: "", referenceRange: "None to Few" },
  ],
  "Vitamin D": [
    { name: "25-Hydroxyvitamin D", unit: "ng/mL", referenceRange: "30 - 100" },
    { name: "Vitamin D2 (Ergocalciferol)", unit: "ng/mL", referenceRange: "Variable" },
    { name: "Vitamin D3 (Cholecalciferol)", unit: "ng/mL", referenceRange: "Variable" },
    { name: "Total Vitamin D", unit: "ng/mL", referenceRange: "30 - 100" },
  ],
  "Iron Studies": [
    { name: "Serum Iron", unit: "μg/dL", referenceRange: "60 - 170" },
    { name: "TIBC (Total Iron Binding Capacity)", unit: "μg/dL", referenceRange: "240 - 450" },
    { name: "UIBC (Unsaturated Iron Binding Capacity)", unit: "μg/dL", referenceRange: "111 - 343" },
    { name: "Transferrin Saturation", unit: "%", referenceRange: "20 - 50" },
    { name: "Ferritin", unit: "ng/mL", referenceRange: "12 - 300" },
    { name: "Transferrin", unit: "mg/dL", referenceRange: "200 - 360" },
  ],
};

// Database-driven lab results - no more mock data

export default function LabResultsPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showPrescriptionDialog, setShowPrescriptionDialog] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showFillResultDialog, setShowFillResultDialog] = useState(false);
  const [selectedLabOrder, setSelectedLabOrder] = useState<any>(null);
  const [selectedResult, setSelectedResult] =
    useState<DatabaseLabResult | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});
  const [selectedEditRole, setSelectedEditRole] = useState<string>("");
  const [selectedTestTypes, setSelectedTestTypes] = useState<string[]>([]);
  const [testTypePopoverOpen, setTestTypePopoverOpen] = useState(false);
  const [generateFormData, setGenerateFormData] = useState<any>({});
  const [fillResultFormData, setFillResultFormData] = useState<any>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [expandedResults, setExpandedResults] = useState<Set<number>>(new Set());
  
  // Invoice workflow states
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false);
  const [pendingOrderData, setPendingOrderData] = useState<any>(null);
  const [invoiceData, setInvoiceData] = useState<any>({
    serviceDate: new Date().toISOString().split('T')[0],
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    items: [] as any[],
    totalAmount: 0,
    paymentMethod: '',
    insuranceProvider: ''
  });
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [stripeClientSecret, setStripeClientSecret] = useState<string>("");

  // Fetch roles from the roles table filtered by organization_id
  const { data: rolesData = [] } = useQuery({
    queryKey: ["/api/roles"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/roles");
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Roles fetch error:", error);
        return [];
      }
    },
  });

  // Doctor specialty states for lab order
  const [selectedSpecialtyCategory, setSelectedSpecialtyCategory] =
    useState<string>("");
  const [selectedSubSpecialty, setSelectedSubSpecialty] = useState<string>("");
  const [selectedSpecificArea, setSelectedSpecificArea] = useState<string>("");
  const [shareFormData, setShareFormData] = useState({
    method: "",
    email: "",
    whatsapp: "",
    message: "",
  });
  const [orderFormData, setOrderFormData] = useState({
    patientId: "",
    patientName: "",
    testType: [] as string[],
    priority: "routine",
    notes: "",
    selectedRole: "",
    selectedUserId: "",
    selectedUserName: "",
  });
  const [patientSearchOpen, setPatientSearchOpen] = useState(false);
  const [testTypeOpen, setTestTypeOpen] = useState(false);
  const [editingStatusId, setEditingStatusId] = useState<number | null>(null);

  // Real API data fetching for patients - MUST come first before lab results query
  const { data: patients = [], isLoading: patientsLoading } = useQuery({
    queryKey: ["/api/patients"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/patients");
      const data = await response.json();
      return data;
    },
  });

  // Role-based lab results fetching - comes after patients query
  const { data: labResults = [], isLoading } = useQuery({
    queryKey: ["/api/lab-results", user?.role, user?.id],
    queryFn: async () => {
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Check if the current user role is Patient
      if (user.role === "patient") {
        // Get the patient ID from session/auth - match by email first for accuracy
        console.log("🔍 LAB RESULTS: Looking for patient matching user:", { 
          userEmail: user.email, 
          userName: `${user.firstName} ${user.lastName}`,
          userId: user.id 
        });
        console.log("📋 LAB RESULTS: Available patients:", patients.map((p: any) => ({ 
          id: p.id, 
          email: p.email, 
          name: `${p.firstName} ${p.lastName}` 
        })));
        
        // Try email match first (most reliable)
        let currentPatient = patients.find((patient: any) => 
          patient.email && user.email && patient.email.toLowerCase() === user.email.toLowerCase()
        );
        
        // If no email match, try exact name match
        if (!currentPatient) {
          currentPatient = patients.find((patient: any) => 
            patient.firstName && user.firstName && patient.lastName && user.lastName &&
            patient.firstName.toLowerCase() === user.firstName.toLowerCase() && 
            patient.lastName.toLowerCase() === user.lastName.toLowerCase()
          );
        }
        
        if (currentPatient) {
          console.log("✅ LAB RESULTS: Found matching patient:", currentPatient);
          // Fetch lab results filtered by patient ID
          const response = await apiRequest("GET", `/api/lab-results?patientId=${currentPatient.id}`);
          return await response.json();
        } else {
          // If patient doesn't exist, return empty array
          console.log("❌ LAB RESULTS: Patient not found for user:", user.email);
          return [];
        }
      } else {
        // For other roles (admin, doctor, nurse, etc.), show all lab results
        const response = await apiRequest("GET", "/api/lab-results");
        return await response.json();
      }
    },
    enabled: !!user && patients.length > 0, // Wait for user and patients data to be loaded
  });

  // Fetch medical staff for doctor selection
  const { data: medicalStaffData, isLoading: medicalStaffLoading } = useQuery({
    queryKey: ["/api/medical-staff"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/medical-staff");
      const data = await response.json();
      return data;
    },
  });

  // Fetch filtered doctors based on specialization
  const { data: filteredDoctorsData, isLoading: filteredDoctorsLoading } =
    useQuery({
      queryKey: [
        "/api/doctors/by-specialization",
        selectedSpecialtyCategory,
        selectedSubSpecialty,
      ],
      queryFn: async () => {
        if (!selectedSpecialtyCategory && !selectedSubSpecialty) {
          return { doctors: [], count: 0 };
        }

        const params = new URLSearchParams();
        if (selectedSpecialtyCategory) {
          params.append("mainSpecialty", selectedSpecialtyCategory);
        }
        if (selectedSubSpecialty) {
          params.append("subSpecialty", selectedSubSpecialty);
        }

        const response = await apiRequest(
          "GET",
          `/api/doctors/by-specialization?${params.toString()}`,
        );
        const data = await response.json();
        return data;
      },
      enabled: !!(selectedSpecialtyCategory || selectedSubSpecialty),
    });

  // Use filtered doctors when specializations are selected, otherwise use all doctors
  const doctors =
    selectedSpecialtyCategory || selectedSubSpecialty
      ? filteredDoctorsData?.doctors || []
      : medicalStaffData?.staff?.filter(
          (staff: any) => isDoctorLike(staff.role),
        ) || [];

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users");
      return res.json();
    },
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createLabOrderMutation = useMutation({
    mutationFn: async (labOrderData: any) => {
      return await apiRequest("POST", "/api/lab-results", labOrderData);
    },
    onSuccess: (response, variables) => {
      // Store pending order data for invoice
      setPendingOrderData({
        ...variables,
        patientName: orderFormData.patientName,
        testTypes: orderFormData.testType
      });
      
      // Prepare invoice items from test types
      const testTypes = orderFormData.testType;
      const invoiceItems = testTypes.map((testType: string, index: number) => ({
        code: `LAB-${(index + 1).toString().padStart(3, '0')}`,
        description: testType,
        quantity: 1,
        unitPrice: 50.00, // Default price per test
        total: 50.00
      }));
      
      const totalAmount = invoiceItems.reduce((sum, item) => sum + item.total, 0);
      
      setInvoiceData({
        ...invoiceData,
        items: invoiceItems,
        totalAmount: totalAmount
      });
      
      // Close order dialog and open invoice dialog
      setShowOrderDialog(false);
      setShowInvoiceDialog(true);
      
      queryClient.invalidateQueries({ queryKey: ["/api/lab-results"] });
      
      // Don't reset form data yet - we'll need it for the invoice
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create lab order",
        variant: "destructive",
      });
    },
  });

  const [showPermissionErrorDialog, setShowPermissionErrorDialog] = useState(false);
  const [permissionErrorMessage, setPermissionErrorMessage] = useState("");

  const updateLabResultMutation = useMutation({
    mutationFn: async (updateData: { id: number; data: any }) => {
      const response = await apiRequest(
        "PUT",
        `/api/lab-results/${updateData.id}`,
        updateData.data,
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        const error: any = new Error(errorData.error || "Failed to update lab result");
        error.status = response.status;
        error.data = errorData;
        throw error;
      }
      
      const updatedData = await response.json();
      return { updateData, updatedData };
    },
    onSuccess: (result) => {
      toast({
        title: "Success",
        description: "Lab result updated successfully",
      });
      setIsEditMode(false);
      setEditingStatusId(null);
      
      // Update selectedResult with the new data
      if (selectedResult && result.updateData.id === selectedResult.id) {
        setSelectedResult({
          ...selectedResult,
          ...result.updateData.data
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/lab-results"] });
    },
    onError: (error: any) => {
      if (error.status === 403) {
        setPermissionErrorMessage(error.data?.error || "Insufficient permissions");
        setShowPermissionErrorDialog(true);
        setEditingStatusId(null);
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to update lab result",
          variant: "destructive",
        });
      }
    },
  });

  const deleteLabResultMutation = useMutation({
    mutationFn: async (resultId: number) => {
      return await apiRequest(
        "DELETE",
        `/api/lab-results/${resultId.toString()}`,
      );
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Lab result deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/lab-results"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete lab result",
        variant: "destructive",
      });
    },
  });

  const handleOrderTest = () => {
    // For patient role users, automatically set their patient ID
    if (user?.role === "patient") {
      // Find the current patient based on user authentication data
      const currentPatient = patients.find((patient: any) => 
        patient.email && user.email && patient.email.toLowerCase() === user.email.toLowerCase()
      ) || patients.find((patient: any) => 
        patient.firstName && user.firstName && patient.lastName && user.lastName &&
        patient.firstName.toLowerCase() === user.firstName.toLowerCase() && 
        patient.lastName.toLowerCase() === user.lastName.toLowerCase()
      );
      
      if (currentPatient) {
        setOrderFormData((prev) => ({
          ...prev,
          patientId: currentPatient.id.toString(),
          patientName: `${currentPatient.firstName} ${currentPatient.lastName}`,
        }));
      }
    }
    // For doctor roles: Auto-populate role and user ID
    else if (user && isDoctorLike(user.role)) {
      setOrderFormData((prev) => ({
        ...prev,
        selectedRole: user.role,
        selectedUserId: user.id.toString(),
        selectedUserName: `${user.firstName} ${user.lastName}`,
      }));
    }
    
    setShowOrderDialog(true);
  };

  const handleViewResult = (result: DatabaseLabResult) => {
    console.log("handleViewResult called with:", result);
    setSelectedResult(result);
    setShowViewDialog(true);
    console.log("showViewDialog set to true");
  };

  const handleDownloadResult = async (resultId: number | string) => {
    const result = Array.isArray(labResults)
      ? labResults.find((r: any) => r.id.toString() === resultId.toString())
      : null;
    if (result) {
      const patientName = getPatientName(result.patientId);

      try {
        // Fetch prescriptions for this patient
        const response = await apiRequest(
          "GET",
          `/api/prescriptions/patient/${result.patientId.toString()}`,
        );
        const prescriptions = await response.json();

        toast({
          title: "Download Report",
          description: `Prescription report for ${patientName} downloaded successfully`,
        });

        // Create prescription document content
        let prescriptionsText = "";
        if (prescriptions && prescriptions.length > 0) {
          prescriptionsText = prescriptions
            .map((prescription: any) => {
              const medications = prescription.medications || [];
              const medicationsText =
                medications.length > 0
                  ? medications
                      .map(
                        (med: any) =>
                          `  - ${med.name}: ${med.dosage}, ${med.frequency}, Duration: ${med.duration}\n    Instructions: ${med.instructions}\n    Quantity: ${med.quantity}, Refills: ${med.refills}`,
                      )
                      .join("\n")
                  : `  - ${prescription.medicationName}: ${prescription.dosage || "N/A"}, ${prescription.frequency || "N/A"}\n    Instructions: ${prescription.instructions || "N/A"}`;

              return `Prescription #${prescription.prescriptionNumber || prescription.id}
Issued: ${new Date(prescription.issuedDate || prescription.createdAt).toLocaleDateString()}
Status: ${prescription.status}
Diagnosis: ${prescription.diagnosis || "N/A"}

Medications:
${medicationsText}

Notes: ${prescription.notes || "No additional notes"}
-------------------------------------------`;
            })
            .join("\n\n");
        } else {
          prescriptionsText = "No prescriptions found for this patient.";
        }

        // Create and download the prescription document
        const documentContent = `PRESCRIPTION REPORT

Patient: ${patientName}
Patient ID: ${result.patientId}
Report Date: ${new Date().toLocaleDateString()}

===========================================

${prescriptionsText}

===========================================
Report generated from Cura EMR System`;

        const blob = new Blob([documentContent], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `prescriptions-${patientName.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Error fetching prescriptions:", error);
        toast({
          title: "Error",
          description: "Failed to fetch prescriptions for this patient",
          variant: "destructive",
        });
      }
    }
  };

  const handleShareResult = (result: DatabaseLabResult) => {
    setSelectedResult(result);
    setShowReviewDialog(true);
  };

  const handleGeneratePrescription = (result: DatabaseLabResult) => {
    setSelectedResult(result);
    setShowPrescriptionDialog(true);
  };

  const handleStartEdit = () => {
    if (!selectedResult) return;

    // Initialize edit form data with current result data
    setEditFormData({
      testType: selectedResult.testType,
      priority: selectedResult.priority,
      notes: selectedResult.notes || "",
      status: selectedResult.status,
      doctorName: "",
      mainSpecialty: selectedResult.mainSpecialty || "",
      subSpecialty: selectedResult.subSpecialty || "",
    });
    setSelectedEditRole("");
    setSelectedTestTypes(selectedResult.testType ? [selectedResult.testType] : []);
    setIsEditMode(true);
  };

  const handleSaveEdit = () => {
    if (!selectedResult) return;

    updateLabResultMutation.mutate({
      id: selectedResult.id,
      data: editFormData,
    });
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditFormData({});
  };

  const handleDeleteResult = (resultId: number) => {
    deleteLabResultMutation.mutate(resultId);
  };

  const handleGeneratePDF = async () => {
    if (!selectedResult) return;

    try {
      // Find the prescription content element
      const element = document.getElementById("prescription-print");
      if (!element) {
        toast({
          title: "Error",
          description: "Could not find prescription content to convert",
          variant: "destructive",
        });
        return;
      }

      console.log("PDF Generation: Found element", element);

      // Show loading state (don't show immediately to avoid interfering with capture)
      setTimeout(() => {
        toast({
          title: "Generating PDF",
          description: "Please wait while we create your prescription PDF...",
        });
      }, 50);

      // Wait a moment for any layout changes
      await new Promise((resolve) => setTimeout(resolve, 200));

      console.log("PDF Generation: Starting canvas capture");

      // Create canvas from HTML element - simple approach
      const canvas = await html2canvas(element, {
        scale: 2, // Higher resolution for better quality
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: element.scrollWidth,
        height: element.scrollHeight,
      });

      console.log(
        "PDF Generation: Canvas created",
        canvas.width,
        "x",
        canvas.height,
      );

      // Create PDF
      const pdf = new jsPDF("p", "mm", "a4");
      const imgData = canvas.toDataURL("image/png");

      // A4 dimensions
      const pageWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const margin = 10; // 10mm margins

      // Calculate dimensions to fit content with margins
      const usableWidth = pageWidth - 2 * margin;
      const usableHeight = pageHeight - 2 * margin;

      // Scale image to fit width
      const imgWidth = usableWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Add content to PDF
      let yPosition = margin;
      let heightLeft = imgHeight;

      // First page
      pdf.addImage(
        imgData,
        "PNG",
        margin,
        yPosition,
        imgWidth,
        Math.min(imgHeight, usableHeight),
      );
      heightLeft -= usableHeight;

      // Add additional pages if needed
      while (heightLeft > 0) {
        pdf.addPage();
        yPosition = margin - (imgHeight - heightLeft);
        pdf.addImage(imgData, "PNG", margin, yPosition, imgWidth, imgHeight);
        heightLeft -= usableHeight;
      }

      // Create filename from testId
      const filename = `${selectedResult.testId}.pdf`;

      console.log("PDF Generation: Saving as", filename);
      pdf.save(filename);

      // Success message
      setTimeout(() => {
        toast({
          title: "PDF Generated",
          description: `Prescription PDF downloaded as ${filename}`,
        });
      }, 100);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePrint = () => {
    if (!selectedResult) return;

    // Create a new window for printing
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast({
        title: "Error",
        description:
          "Unable to open print window. Please allow popups and try again.",
        variant: "destructive",
      });
      return;
    }

    // Create HTML following the specified format
    const printHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Lab Result Prescription - ${selectedResult.testId}</title>
          <style>
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: 'Arial', sans-serif;
              margin: 0;
              padding: 20px;
              line-height: 1.5;
              color: #333;
              background: white;
              font-size: 14px;
            }
            .prescription-content {
              max-width: 800px;
              margin: 0 auto;
              background: white;
              padding: 20px;
            }
            
            /* Print Header Styles */
            .print-header {
              text-align: center;
              margin-bottom: 40px;
              padding-bottom: 20px;
              border-bottom: 2px solid #333;
            }
            .print-header h1 {
              font-size: 28px;
              font-weight: bold;
              color: #333;
              margin-bottom: 8px;
              letter-spacing: 1px;
            }
            .print-header h2 {
              font-size: 16px;
              color: #666;
              font-weight: normal;
              margin: 0;
            }

            /* Header Styles */
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .header-logo {
              width: 60px;
              height: 60px;
              background: #4A90E2;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: bold;
              font-size: 24px;
              margin-bottom: 15px;
            }
            .header h1 {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 5px;
              color: #333;
            }
            .header p {
              font-size: 16px;
              color: #666;
            }

            /* Information Sections */
            .info-section {
              margin-bottom: 30px;
            }
            .section-title {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 15px;
              color: #333;
              border-bottom: 1px solid #ddd;
              padding-bottom: 5px;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 30px;
              margin-bottom: 20px;
            }
            .info-item {
              margin-bottom: 8px;
              display: flex;
              align-items: center;
            }
            .info-label {
              font-weight: bold;
              margin-right: 10px;
              min-width: 150px;
            }
            .info-value {
              color: #333;
            }

            /* Laboratory Test Prescription Section */
            .lab-prescription-section {
              margin: 30px 0;
              padding: 20px;
              border-radius: 8px;
              background: #f0f8ff;
            }
            .lab-prescription-title {
              font-size: 20px;
              font-weight: bold;
              margin-bottom: 20px;
              color: #333;
              text-align: center;
            }
            .test-details {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
            }
            .test-item {
              margin-bottom: 15px;
            }
            .test-label {
              font-size: 12px;
              font-weight: bold;
              color: #666;
              text-transform: uppercase;
              margin-bottom: 5px;
            }
            .test-value {
              font-size: 16px;
              font-weight: 600;
              color: #333;
            }

            /* Test Results Section */
            .test-results {
              margin-top: 30px;
            }
            .results-title {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 15px;
              color: #333;
            }
            .result-item {
              margin-bottom: 10px;
              padding: 10px;
              border: 1px solid #ddd;
              border-radius: 4px;
              background: white;
            }

            /* Notes Section */
            .notes-section {
              margin-top: 30px;
              padding: 15px;
              border: 1px solid #ddd;
              border-radius: 4px;
              background: #fffbeb;
            }

            @media print {
              body {
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
              }
              .prescription-content {
                box-shadow: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="prescription-content">
            <!-- Print Header -->
      <div style="display: grid; grid-template-columns: auto 1fr auto; align-items: center; border-bottom: 1px solid #ccc; padding: 1rem 0; position: relative;">
  
  <!-- Left Icon -->

  <!-- Centered Text Content -->
  <div style="grid-column: 2 / 3; text-align: center;margin-left:-100;">
    <span style="font-size: 25px; color: darkblue; font-weight: 700;">CURA EMR SYSTEM</span>
    <h2 style="margin: 4px 0;">Laboratory Test Prescription</h2>
    <p>Halo Health Clinic</p>
    <p>Unit 2 Drayton Court, Solihull</p>
    <p>B90 4NG, UK</p>
    <p>+44(0)121 827 5531</p>
  </div>

  <!-- Placeholder Right Column (empty for spacing symmetry) -->
  <div></div>
</div>

            <div style="display: flex; justify-content: space-between; gap: 2rem; margin-top: 1rem;">
              <!-- Physician Information -->
              <div style="flex: 1;">
                <h5 style="font-size: 16px; font-weight: bold; margin-bottom: 0.5rem;">Physician Information</h5>

                <div style="margin-bottom: 0.25rem;">
                  <strong>Name:</strong>
                  <span style="margin-left: 0.5rem;">${selectedResult.doctorName || "Doctor"}</span>
                </div>

                ${
                  selectedResult.mainSpecialty
                    ? `
                <div style="margin-bottom: 0.25rem;">
                  <strong>Main Specialization:</strong>
                  <span style="margin-left: 0.5rem;">${selectedResult.mainSpecialty}</span>
                </div>
                `
                    : ""
                }

                ${
                  selectedResult.subSpecialty
                    ? `
                <div style="margin-bottom: 0.25rem;">
                  <strong>Sub-Specialization:</strong>
                  <span style="margin-left: 0.5rem;">${selectedResult.subSpecialty}</span>
                </div>
                `
                    : ""
                }

                ${
                  selectedResult.priority
                    ? `
                <div style="margin-bottom: 0.25rem;">
                  <strong>Priority:</strong>
                  <span style="margin-left: 0.5rem;">${selectedResult.priority.toUpperCase()}</span>
                </div>
                `
                    : ""
                }
              </div>

              <!-- Patient Information -->
              <div style="flex: 1;">
                <h5 style="font-size: 16px; font-weight: bold; margin-bottom: 0.5rem;">Patient Information</h5>

                <div style="margin-bottom: 0.25rem;">
                  <strong>Name:</strong>
                  <span style="margin-left: 0.5rem;">${getPatientName(selectedResult.patientId)}</span>
                </div>

                <div style="margin-bottom: 0.25rem;">
                  <strong>Patient ID:</strong>
                  <span style="margin-left: 0.5rem;">${selectedResult.patientId}</span>
                </div>

                <div style="margin-bottom: 0.25rem;">
                  <strong>Date:</strong>
                  <span style="margin-left: 0.5rem;">${format(new Date(), "MMM dd, yyyy")}</span>
                </div>

                <div style="margin-bottom: 0.25rem;">
                  <strong>Time:</strong>
                  <span style="margin-left: 0.5rem;">${format(new Date(), "HH:mm")}</span>
                </div>
              </div>
            </div>

            <!-- Laboratory Test Prescription -->
            <div class="lab-prescription-section" style="background-color:#FAF8F8 !important;">
              <h2 class="lab-prescription-title">Laboratory Test Prescription</h2>
              
              <div class="test-details">
                <div class="test-item">
                  <div class="test-label">TEST ID</div>
                  <div class="test-value">${selectedResult.testId}</div>
                </div>
                <div class="test-item">
                  <div class="test-label">TEST TYPE</div>
                  <div class="test-value">${selectedResult.testType}</div>
                </div>
                <div class="test-item">
                  <div class="test-label">ORDERED DATE</div>
                  <div class="test-value">${format(new Date(selectedResult.orderedAt), "MMM dd, yyyy HH:mm")}</div>
                </div>
                <div class="test-item">
                  <div class="test-label">STATUS</div>
                  <div class="test-value">${selectedResult.status.toUpperCase()}</div>
                </div>
              </div>
</div>
              ${
                selectedResult.results && selectedResult.results.length > 0
                  ? `
              <div class="test-results">
                <div class="results-title">Test Results:</div>
                ${selectedResult.results
                  .map(
                    (testResult: any) => `
                  <div class="result-item">
                    <strong>${testResult.name}:</strong> ${testResult.value} ${testResult.unit} 
                    (Reference: ${testResult.referenceRange}) - Status: ${testResult.status.replace("_", " ").toUpperCase()}
                  </div>
                `,
                  )
                  .join("")}
              </div>
              `
                  : ""
              }

              ${
                selectedResult.notes
                  ? `
              <div class="notes-section">
                <strong>Clinical Notes:</strong><br>
                ${selectedResult.notes}
              </div>
              `
                  : ""
              }
            </div>

            ${
              selectedResult.criticalValues
                ? `
            <div style="margin-top: 20px; padding: 15px; background: #fef2f2; border: 2px solid #dc2626; border-radius: 8px;">
              <strong style="color: #dc2626;">⚠️ CRITICAL VALUES DETECTED</strong><br>
              <span style="color: #991b1b;">This lab result contains critical values that require immediate attention.</span>
            </div>
            `
                : ""
            }

            <!-- Footer -->
            <div style="margin-top: 50px; text-align: center; border-top: 1px solid #ddd; padding-top: 20px;">
              <div style="margin-bottom: 30px;">
                <div style="border-top: 2px solid #333; width: 300px; margin: 0 auto 10px;"></div>
                <div style="font-weight: bold;">${selectedResult.doctorName || "Doctor"}</div>
                ${selectedResult.mainSpecialty ? `<div style="font-size: 12px; color: #666;">${selectedResult.mainSpecialty}</div>` : ""}
              </div>
              <div style="font-size: 12px; color: #666;">
                Generated by Cura EMR System - ${format(new Date(), "MMM dd, yyyy HH:mm")}
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Write the HTML to the print window
    printWindow.document.write(printHTML);
    printWindow.document.close();

    // Wait for content to load, then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    };

    toast({
      title: "Printing",
      description:
        "Print dialog opened. Please select your printer and print options.",
    });
  };

  const handleFlagCritical = (resultId: string) => {
    const result = Array.isArray(labResults)
      ? labResults.find((r: any) => r.id === resultId)
      : null;
    if (result) {
      toast({
        title: "Critical Value Flagged",
        description: `Critical alert created for ${getPatientName(result.patientId)}`,
        variant: "destructive",
      });
      // In a real implementation, this would create alerts and notifications
    }
  };

  // Helper function to get patient name from patient ID
  const getPatientName = (patientId: number) => {
    const patient =
      Array.isArray(patients) && patients
        ? patients.find((p: any) => p?.id === patientId)
        : null;
    return patient && patient.firstName && patient.lastName
      ? `${patient.firstName} ${patient.lastName}`
      : `Patient #${patientId}`;
  };

  // Helper function to get user name from user ID
  const getUserName = (userId: number) => {
    if (!Array.isArray(users) || !users) return `User #${userId}`;
    const user = users.find((u: any) => u && u.id === userId);
    if (!user) return `User #${userId}`;
    const firstName = user?.firstName ?? "";
    const lastName = user?.lastName ?? "";
    if (!firstName || !lastName) return `User #${userId}`;
    return `${firstName} ${lastName}`;
  };

  // For summary statistics - only apply search filter, not status filter
  const searchFilteredResults = Array.isArray(labResults)
    ? labResults.filter((result: DatabaseLabResult) => {
        const patientName = getPatientName(result.patientId);
        const matchesSearch =
          !searchQuery ||
          patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          result.testType.toLowerCase().includes(searchQuery.toLowerCase());

        return matchesSearch;
      })
    : [];

  // For display area - apply both search and status filters
  const filteredResults = Array.isArray(labResults)
    ? labResults.filter((result: DatabaseLabResult) => {
        const patientName = getPatientName(result.patientId);
        const matchesSearch =
          !searchQuery ||
          patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          result.testType.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus =
          statusFilter === "all" || result.status === statusFilter;

        return matchesSearch && matchesStatus;
      })
    : [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "collected":
        return "bg-blue-100 text-blue-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getResultStatusColor = (status: string) => {
    switch (status) {
      case "normal":
        return "bg-green-100 text-green-800";
      case "abnormal_high":
        return "bg-orange-100 text-orange-800";
      case "abnormal_low":
        return "bg-orange-100 text-orange-800";
      case "critical":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <>
        <Header
          title="Lab Results"
          subtitle="View and manage laboratory test results"
        />
        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
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
                    <p className="text-sm font-medium text-gray-600">
                      Pending Results
                    </p>
                    <p className="text-2xl font-bold">
                      {
                        searchFilteredResults.filter((r) => r.status === "pending")
                          .length
                      }
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Critical Values
                    </p>
                    <p className="text-2xl font-bold">
                      {
                        searchFilteredResults.filter(
                          (r) => r.criticalValues === true
                        ).length
                      }
                    </p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Completed Today
                    </p>
                    <p className="text-2xl font-bold">
                      {
                        searchFilteredResults.filter(
                          (r) =>
                            r.status === "completed" &&
                            r.completedAt &&
                            new Date(r.completedAt).toDateString() ===
                              new Date().toDateString(),
                        ).length
                      }
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
                    <p className="text-sm font-medium text-gray-600">
                      Total Results
                    </p>
                    <p className="text-2xl font-bold">
                      {searchFilteredResults.length}
                    </p>
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
                {/* Right Side: Buttons */}
                {user?.role !== "patient" && (
                  <div className="flex gap-3 ml-auto">
                    <Button
                      onClick={handleOrderTest}
                      className="bg-medical-blue hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Order Lab Test
                    </Button>
                    <Button
                      onClick={() => setShowGenerateDialog(true)}
                      className="bg-green-600 hover:bg-green-700"
                      data-testid="button-generate-lab-result"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Generate Lab Test Result
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Lab Results List */}
          <div className="space-y-4">
            {filteredResults.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">
                    No lab results found
                  </h3>
                  <p className="text-gray-600">
                    Try adjusting your search terms or filters
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredResults.map((result) => (
                <Card
                  key={result.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-6 relative">
                    {/* Doctor information - Top Right Position */}
                    <div className="absolute top-6 right-6 w-70">
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-3">
                          <User className="h-4 w-4 text-blue-600" />
                          <h4 className="font-semibold text-blue-900">
                            {result.doctorName || "Dr. Sarah Williams"}
                          </h4>
                        </div>

                        <div className="space-y-2">
                          <div className="text-sm">
                            <span className="font-medium text-gray-800">
                              Main Specialization:
                            </span>
                            <div className="text-blue-600">
                              {result.mainSpecialty || "Diagnostic Specialties"}
                            </div>
                          </div>
                          <div className="text-sm">
                            <span className="font-medium text-gray-800">
                              Sub-Specialization:
                            </span>
                            <div className="text-blue-600">
                              {result.subSpecialty || "Neurosurgeon"}
                            </div>
                          </div>
                          <div className="text-sm">
                            <span className="font-medium text-gray-800">
                              Priority:
                            </span>
                            <div className="text-green-600">
                              {result.priority || "urgent"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Header with patient name and status - with right margin for blue box */}
                    <div className="flex items-center gap-3 mb-4 mr-72">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {getPatientName(result.patientId)}
                      </h3>
                      <div className="flex items-center gap-2">
                        {editingStatusId === result.id ? (
                          <Select
                            value={result.status}
                            onValueChange={(newStatus) => {
                              updateLabResultMutation.mutate({
                                id: result.id,
                                data: { status: newStatus },
                              });
                              setEditingStatusId(null);
                            }}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">pending</SelectItem>
                              <SelectItem value="collected">
                                collected
                              </SelectItem>
                              <SelectItem value="processing">
                                processing
                              </SelectItem>
                              <SelectItem value="completed">
                                completed
                              </SelectItem>
                              <SelectItem value="cancelled">
                                cancelled
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <>
                            <Badge className={getStatusColor(result.status)}>
                              {result.status}
                            </Badge>
                            {user?.role !== 'patient' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingStatusId(result.id)}
                                className="h-6 w-6 p-0"
                                data-testid="button-edit-status-list"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                      {result.criticalValues && (
                        <Badge
                          variant="destructive"
                          className="flex items-center gap-1"
                        >
                          <AlertTriangle className="h-3 w-3" />
                          Critical
                        </Badge>
                      )}
                    </div>

                    {/* Main content area - with right margin for blue box */}
                    <div className="mr-72">
                      {/* Test details and Notes */}
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Ordered:</span>{" "}
                            {format(
                              new Date(result.orderedAt),
                              "MMM dd, yyyy HH:mm",
                            )}
                          </div>
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Test:</span>{" "}
                            {result.testType}
                          </div>
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Test ID:</span>{" "}
                            {result.testId}
                          </div>
                          {result.completedAt && (
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">Completed:</span>{" "}
                              {format(
                                new Date(result.completedAt),
                                "MMM dd, yyyy HH:mm",
                              )}
                            </div>
                          )}
                        </div>

                        {/* Notes section */}
                        <div>
                          <h4 className="font-semibold text-gray-800 mb-2">
                            Notes
                          </h4>
                          <p className="text-sm text-gray-600">
                            {result.notes || "no no"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Test Results section (if available) - with right margin for blue box */}
                    {result.results && result.results.length > 0 && (
                      <div className="mt-6 mr-72">
                        <button
                          onClick={() => {
                            setExpandedResults((prev) => {
                              const newSet = new Set(prev);
                              if (newSet.has(result.id)) {
                                newSet.delete(result.id);
                              } else {
                                newSet.add(result.id);
                              }
                              return newSet;
                            });
                          }}
                          className="flex items-center gap-2 font-medium mb-3 hover:text-blue-600 transition-colors"
                          data-testid="button-toggle-test-results"
                        >
                          {expandedResults.has(result.id) ? (
                            <ChevronDown className="h-5 w-5" />
                          ) : (
                            <ChevronRight className="h-5 w-5" />
                          )}
                          <span>Test Results:</span>
                        </button>
                        
                        {expandedResults.has(result.id) && (
                          <div className="grid gap-3">
                            {result.results.map(
                              (testResult: any, index: number) => (
                                <div
                                  key={index}
                                  className="p-3 rounded-lg border bg-gray-50 border-gray-200"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium">
                                      {testResult.name}
                                    </span>
                                    <Badge
                                      className={getResultStatusColor(
                                        testResult.status,
                                      )}
                                    >
                                      {testResult.status
                                        .replace("_", " ")
                                        .toUpperCase()}
                                    </Badge>
                                  </div>
                                  <div className="text-sm text-gray-600 mt-1">
                                    <span className="font-medium">
                                      {testResult.value} {testResult.unit}
                                    </span>
                                    <span className="ml-2">
                                      Ref: {testResult.referenceRange}
                                    </span>
                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action buttons at bottom - with right margin for blue box */}
                      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-200">
    {user?.role !== 'patient' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewResult(result)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGeneratePrescription(result)}
                        className="bg-white hover:bg-gray-50 text-gray-900 border-gray-300"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        {user?.role === 'patient' ? 'View Prescription' : 'Generate Prescription'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          setSelectedResult(result);
                          // Temporarily open the prescription dialog to render content
                          setShowPrescriptionDialog(true);
                          // Wait for the content to render
                          await new Promise((resolve) =>
                            setTimeout(resolve, 100),
                          );
                          // Generate the PDF
                          await handleGeneratePDF();
                          // Close the dialog
                          setShowPrescriptionDialog(false);
                        }}
                        className="bg-white hover:bg-gray-50 text-gray-900 border-gray-300"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download PDF
                      </Button>
                      {user?.role !== 'patient' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleShareResult(result)}
                        >
                          <User className="h-4 w-4 mr-2" />
                          Review
                        </Button>
                      )}
                      {user?.role !== 'patient' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedLabOrder(result);
                            setShowFillResultDialog(true);
                          }}
                          className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                          data-testid="button-generate-lab-result"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Generate Test Result
                        </Button>
                      )}
                      {user?.role !== 'patient' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            deleteLabResultMutation.mutate(result.id)
                          }
                          disabled={deleteLabResultMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      )}
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Order Lab Test</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="patient">Select Patient</Label>
              {user?.role === "patient" ? (
                // For patient role: Show logged-in patient name and hide dropdown
                <div className="flex items-center h-10 px-3 py-2 border border-input bg-background rounded-md text-sm ring-offset-background">
                  <User className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span data-testid="patient-name-display">
                    {user.firstName} {user.lastName}
                  </span>
                </div>
              ) : (
                // For other roles: Show patient dropdown
                <Popover
                  open={patientSearchOpen}
                  onOpenChange={setPatientSearchOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={patientSearchOpen}
                      className="w-full justify-between"
                    >
                      {orderFormData.patientId
                        ? orderFormData.patientName
                        : "Select a patient..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search patients..." />
                      <CommandEmpty>No patient found.</CommandEmpty>
                      <CommandGroup>
                        {patientsLoading ? (
                          <CommandItem disabled>Loading patients...</CommandItem>
                        ) : patients &&
                          Array.isArray(patients) &&
                          patients.length > 0 ? (
                          patients.map((patient: any) => (
                            <CommandItem
                              key={patient.id}
                              value={`${patient.firstName} ${patient.lastName} ${patient.patientId}`}
                              onSelect={() => {
                                setOrderFormData((prev) => ({
                                  ...prev,
                                  patientId: patient.id.toString(),
                                  patientName: `${patient.firstName} ${patient.lastName}`,
                                }));
                                setPatientSearchOpen(false);
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  orderFormData.patientId ===
                                  patient.id.toString()
                                    ? "opacity-100"
                                    : "opacity-0"
                                }`}
                              />
                              {`${patient.firstName} ${patient.lastName} (${patient.patientId})`}
                            </CommandItem>
                          ))
                        ) : (
                          <CommandItem disabled>
                            No patients available
                          </CommandItem>
                        )}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            </div>

            {user?.role !== "patient" && (
              <>
                {isDoctorLike(user?.role) ? (
                  // For doctor roles: Show labels instead of dropdowns
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <div className="flex items-center h-10 px-3 py-2 border border-input bg-background rounded-md text-sm ring-offset-background">
                        <User className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span data-testid="provider-role-display">
                          {formatRoleLabel(user?.role)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="provider">Provider Name</Label>
                      <div className="flex items-center h-10 px-3 py-2 border border-input bg-background rounded-md text-sm ring-offset-background">
                        <User className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span data-testid="provider-name-display">
                          {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : ''}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  // For non-doctor roles: Show original dropdown behavior
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="role">Select Role</Label>
                      <Select
                        value={orderFormData.selectedRole}
                        onValueChange={(value) => {
                          setOrderFormData((prev) => ({
                            ...prev,
                            selectedRole: value,
                            selectedUserId: "",
                            selectedUserName: "",
                          }));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                          {rolesData
                            .filter((role: any) => {
                              const roleName = (role.name || '').toLowerCase();
                              return !['patient', 'admin', 'administrator'].includes(roleName);
                            })
                            .map((role: any) => (
                              <SelectItem key={role.id} value={role.name}>
                                {role.displayName || role.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {orderFormData.selectedRole && (
                      <div className="space-y-2">
                        <Label htmlFor="user">Select Name</Label>
                        <Select
                          value={orderFormData.selectedUserId}
                          onValueChange={(value) => {
                            const selectedUser = users.find(
                              (u: any) => u.id.toString() === value,
                            );
                            setOrderFormData((prev) => ({
                              ...prev,
                              selectedUserId: value,
                              selectedUserName: selectedUser
                                ? `${selectedUser.firstName} ${selectedUser.lastName}`
                                : "",
                            }));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a user" />
                          </SelectTrigger>
                          <SelectContent>
                            {users
                              .filter((u: any) => u.role === orderFormData.selectedRole)
                              .map((u: any) => (
                                <SelectItem key={u.id} value={u.id.toString()}>
                                  {u.firstName} {u.lastName} ({u.email})
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="testType">Test Type</Label>
              <Popover open={testTypeOpen} onOpenChange={setTestTypeOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={testTypeOpen}
                    className="w-full justify-between min-h-[40px] h-auto"
                  >
                    <div className="flex flex-wrap gap-1">
                      {orderFormData.testType.length === 0 ? (
                        <span className="text-muted-foreground">
                          Select test types...
                        </span>
                      ) : orderFormData.testType.length === 1 ? (
                        <span>{orderFormData.testType[0]}</span>
                      ) : (
                        <span>
                          {orderFormData.testType.length} test types selected
                        </span>
                      )}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Search test types..." />
                    <CommandEmpty>No test type found.</CommandEmpty>
                    <CommandGroup>
                      {TEST_TYPES.map((testType) => (
                        <CommandItem
                          key={testType}
                          value={testType}
                          onSelect={() => {
                            setOrderFormData((prev) => ({
                              ...prev,
                              testType: prev.testType.includes(testType)
                                ? prev.testType.filter((t) => t !== testType)
                                : [...prev.testType, testType],
                            }));
                          }}
                        >
                          <Checkbox
                            checked={orderFormData.testType.includes(testType)}
                            className="mr-2"
                          />
                          {testType}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                  {orderFormData.testType.length > 0 && (
                    <div className="p-2 border-t">
                      <div className="flex flex-wrap gap-1 mb-2">
                        {orderFormData.testType.map((testType) => (
                          <Badge
                            key={testType}
                            variant="secondary"
                            className="text-xs"
                          >
                            {testType}
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                setOrderFormData((prev) => ({
                                  ...prev,
                                  testType: prev.testType.filter(
                                    (t) => t !== testType,
                                  ),
                                }));
                              }}
                              className="ml-1 hover:text-red-500"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setOrderFormData((prev) => ({
                            ...prev,
                            testType: [],
                          }));
                        }}
                        className="w-full text-xs"
                      >
                        Clear All
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={orderFormData.priority}
                onValueChange={(value) =>
                  setOrderFormData((prev) => ({ ...prev, priority: value }))
                }
              >
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
                onChange={(e) =>
                  setOrderFormData((prev) => ({
                    ...prev,
                    notes: e.target.value,
                  }))
                }
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowOrderDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  createLabOrderMutation.mutate({
                    patientId: parseInt(orderFormData.patientId),
                    testType: orderFormData.testType.join(", "),
                    priority: orderFormData.priority,
                    notes: orderFormData.notes,
                    selectedUserId: orderFormData.selectedUserId
                      ? parseInt(orderFormData.selectedUserId)
                      : null,
                    selectedUserName: orderFormData.selectedUserName,
                    orderedBy: user?.id,
                  });
                }}
                disabled={
                  createLabOrderMutation.isPending ||
                  !orderFormData.patientId ||
                  orderFormData.testType.length === 0 ||
                  (user?.role !== "patient" && !orderFormData.selectedUserId)
                }
                className="flex-1 bg-medical-blue hover:bg-blue-700"
              >
                {createLabOrderMutation.isPending
                  ? "Ordering..."
                  : "Order Test"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invoice Dialog */}
      <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-medical-blue">Invoice Details</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Patient & Service Info */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <Label className="text-sm text-gray-600 dark:text-gray-400">Patient Name</Label>
                <p className="font-semibold">{pendingOrderData?.patientName}</p>
              </div>
              <div>
                <Label className="text-sm text-gray-600 dark:text-gray-400">Service Date</Label>
                <p className="font-semibold">{invoiceData.serviceDate}</p>
              </div>
              <div>
                <Label className="text-sm text-gray-600 dark:text-gray-400">Invoice Date</Label>
                <p className="font-semibold">{invoiceData.invoiceDate}</p>
              </div>
              <div>
                <Label className="text-sm text-gray-600 dark:text-gray-400">Due Date</Label>
                <p className="font-semibold">{invoiceData.dueDate}</p>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-medical-blue text-white">
                  <tr>
                    <th className="text-left p-3">Code</th>
                    <th className="text-left p-3">Description</th>
                    <th className="text-center p-3">Qty</th>
                    <th className="text-right p-3">Unit Price</th>
                    <th className="text-right p-3">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceData.items.map((item: any, index: number) => (
                    <tr key={index} className="border-t">
                      <td className="p-3">{item.code}</td>
                      <td className="p-3">{item.description}</td>
                      <td className="text-center p-3">{item.quantity}</td>
                      <td className="text-right p-3">${item.unitPrice.toFixed(2)}</td>
                      <td className="text-right p-3">${item.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <td colSpan={4} className="text-right p-3 font-bold">Total Amount:</td>
                    <td className="text-right p-3 font-bold text-xl text-medical-blue">
                      ${invoiceData.totalAmount.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Insurance Provider */}
            <div>
              <Label>Insurance Provider (Optional)</Label>
              <Input
                placeholder="Enter insurance provider name"
                value={invoiceData.insuranceProvider}
                onChange={(e) => setInvoiceData({ ...invoiceData, insuranceProvider: e.target.value })}
                className="mt-1"
              />
            </div>

            {/* Payment Method Selection */}
            <div>
              <Label>Payment Method *</Label>
              <Select
                value={invoiceData.paymentMethod}
                onValueChange={(value) => setInvoiceData({ ...invoiceData, paymentMethod: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="debit_card">Debit Card</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowInvoiceDialog(false);
                  setInvoiceData({
                    ...invoiceData,
                    paymentMethod: '',
                    insuranceProvider: ''
                  });
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setShowInvoiceDialog(false);
                  setShowSummaryDialog(true);
                }}
                disabled={!invoiceData.paymentMethod}
                className="flex-1 bg-medical-blue hover:bg-blue-700"
              >
                Proceed to Summary
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Lab Result Dialog */}
      <Dialog
        open={showViewDialog}
        onOpenChange={(open) => {
          setShowViewDialog(open);
          if (!open) {
            setIsEditMode(false);
            setEditFormData({});
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DialogTitle className="text-xl font-bold">
                  Lab Result Details
                </DialogTitle>
                {selectedResult && (
                  <div className="flex items-center gap-2">
                    {editingStatusId === selectedResult.id ? (
                      <Select
                        value={selectedResult.status}
                        onValueChange={(value) => {
                          updateLabResultMutation.mutate({
                            id: selectedResult.id,
                            data: { status: value },
                          });
                          setEditingStatusId(null);
                        }}
                      >
                        <SelectTrigger className="w-32 h-6">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">pending</SelectItem>
                          <SelectItem value="collected">collected</SelectItem>
                          <SelectItem value="processing">processing</SelectItem>
                          <SelectItem value="completed">completed</SelectItem>
                          <SelectItem value="cancelled">cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <>
                        <Badge
                          variant={
                            selectedResult.status === "completed"
                              ? "default"
                              : selectedResult.status === "pending"
                                ? "secondary"
                                : selectedResult.status === "processing"
                                  ? "outline"
                                  : "destructive"
                          }
                        >
                          {selectedResult.status}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingStatusId(selectedResult.id)}
                          className="h-6 w-6 p-0"
                          data-testid="button-edit-status"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </DialogHeader>
          {selectedResult && (
            <div className="grid grid-cols-2 gap-6 pt-4">
              {/* Left Section - Test Details */}
              <div className="space-y-4">
                <div className="p-4 rounded-lg border">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-black font-bold">Test:</p>
                      {isEditMode ? (
                        <Popover open={testTypePopoverOpen} onOpenChange={setTestTypePopoverOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              className="w-full justify-between bg-white text-black"
                            >
                              {selectedTestTypes.length > 0
                                ? `${selectedTestTypes.length} selected`
                                : "Select test types"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search test types..." />
                              <CommandEmpty>No test type found.</CommandEmpty>
                              <CommandGroup className="max-h-64 overflow-auto">
                                {TEST_TYPES.map((testType) => (
                                  <CommandItem
                                    key={testType}
                                    onSelect={() => {
                                      const newSelection = selectedTestTypes.includes(testType)
                                        ? selectedTestTypes.filter((t) => t !== testType)
                                        : [...selectedTestTypes, testType];
                                      setSelectedTestTypes(newSelection);
                                      setEditFormData((prev: any) => ({
                                        ...prev,
                                        testType: newSelection.join(", "),
                                      }));
                                    }}
                                  >
                                    <Checkbox
                                      checked={selectedTestTypes.includes(testType)}
                                      className="mr-2"
                                    />
                                    {testType}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <p className="font-medium">{selectedResult.testType}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-black font-bold">Test ID:</p>
                      <p className="font-medium">{selectedResult.testId}</p>
                    </div>
                    <div>
                      <p className="text-sm text-black font-bold">Ordered:</p>
                      <p className="font-medium">
                        {format(
                          new Date(selectedResult.orderedAt),
                          "MMM dd, yyyy HH:mm",
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Notes Section */}
                <div className="bg-gray-100 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-600 mb-2">Notes</h3>
                  {isEditMode ? (
                    <Textarea
                      value={
                        editFormData.notes !== undefined
                          ? editFormData.notes
                          : selectedResult.notes || ""
                      }
                      onChange={(e) =>
                        setEditFormData((prev: any) => ({
                          ...prev,
                          notes: e.target.value,
                        }))
                      }
                      placeholder="Enter clinical notes or special instructions"
                      rows={3}
                      className="w-full"
                    />
                  ) : (
                    <p className="text-sm">
                      {selectedResult.notes || "No notes"}
                    </p>
                  )}
                </div>

                {/* Test Results */}
                {selectedResult.results &&
                  selectedResult.results.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3">Test Results</h3>
                      <div className="space-y-3">
                        {selectedResult.results.map(
                          (result: any, index: number) => (
                            <div key={index} className="border rounded-lg p-4">
                              <div className="flex justify-between items-center">
                                <div className="flex-1">
                                  <p className="font-medium">{result.name}</p>
                                  <p className="text-sm text-gray-600">
                                    Reference Range: {result.referenceRange}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-lg font-semibold">
                                    {result.value} {result.unit}
                                  </p>
                                  <Badge
                                    variant={
                                      result.status === "normal"
                                        ? "default"
                                        : result.status === "abnormal_high" ||
                                            result.status === "abnormal_low"
                                          ? "secondary"
                                          : "destructive"
                                    }
                                    className="ml-2"
                                  >
                                    {result.status.replace("_", " ")}
                                  </Badge>
                                </div>
                              </div>
                              {result.flag && (
                                <p className="text-sm text-yellow-600 mt-2">
                                  ⚠️ {result.flag}
                                </p>
                              )}
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}
              </div>

              {/* Right Section - Doctor Information */}
              <div className="bg-blue-50 p-6 rounded-lg h-fit">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-blue-900">
                      {isEditMode && editFormData.doctorName
                        ? editFormData.doctorName
                        : selectedResult.doctorName || "Dr. Usman Gardezi"}
                    </h3>
                    {isEditMode && (
                      <div className="space-y-2 mt-2">
                        <Select
                          value={selectedEditRole}
                          onValueChange={(value) => {
                            setSelectedEditRole(value);
                            setEditFormData((prev: any) => ({
                              ...prev,
                              doctorName: "",
                            }));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Role" />
                          </SelectTrigger>
                          <SelectContent>
                            {rolesData.map((role: any) => (
                              <SelectItem key={role.id} value={role.name}>
                                {formatRoleLabel(role.name)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {selectedEditRole && (
                          <Select
                            value={editFormData.doctorName || ""}
                            onValueChange={(value) =>
                              setEditFormData((prev: any) => ({
                                ...prev,
                                doctorName: value,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select Name" />
                            </SelectTrigger>
                            <SelectContent>
                              {users
                                .filter((u: User) => u.role === selectedEditRole)
                                .map((u: User) => (
                                  <SelectItem 
                                    key={u.id} 
                                    value={`${u.firstName} ${u.lastName}`}
                                  >
                                    {u.firstName} {u.lastName}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    )}
                  </div>

                  {!isEditMode && (
                    <>
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Main Specialization:
                        </p>
                        <p className="text-gray-600 font-medium">
                          {selectedResult.mainSpecialty || "Surgical Specialties"}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Sub-Specialization:
                        </p>
                        <p className="text-gray-600 font-medium">
                          {selectedResult.subSpecialty || "Orthopedic Surgeon"}
                        </p>
                      </div>
                    </>
                  )}

                  <div>
                    <p className="text-sm font-medium text-blue-600">
                      Priority:
                    </p>
                    {isEditMode ? (
                      <Select
                        value={editFormData.priority || selectedResult.priority}
                        onValueChange={(value) =>
                          setEditFormData((prev: any) => ({
                            ...prev,
                            priority: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="routine">Routine</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                          <SelectItem value="stat">STAT</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-green-600 font-medium capitalize">
                        {selectedResult.priority}
                      </p>
                    )}
                  </div>

                  {selectedResult.criticalValues && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4">
                      <p className="text-red-800 font-medium text-sm">
                        ⚠️ Critical Values Alert
                      </p>
                      <p className="text-red-600 text-xs">
                        This result contains critical values that require
                        immediate attention.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-6 border-t">
            {isEditMode ? (
              <>
                <Button variant="outline" onClick={handleCancelEdit}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={updateLabResultMutation.isPending}
                  className="bg-medical-blue hover:bg-blue-700"
                >
                  {updateLabResultMutation.isPending
                    ? "Saving..."
                    : "Save Changes"}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowViewDialog(false)}
                >
                  Close
                </Button>
                {user?.role !== 'patient' && (
                  <Button variant="outline" onClick={handleStartEdit}>
                    Edit
                  </Button>
                )}
              </>
            )}
          </div>
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
                    <span className="text-white text-sm font-bold">
                      {getPatientName(selectedResult.patientId).charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">
                      {getPatientName(selectedResult.patientId)}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Patient ID: {selectedResult.patientId}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Test Information</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Test Type:</span>
                      <span className="font-medium">
                        {selectedResult.testType}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ordered By:</span>
                      <span className="font-medium">
                        {selectedResult.orderedBy}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <Badge
                        variant={
                          selectedResult.status === "completed"
                            ? "default"
                            : selectedResult.status === "pending"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {selectedResult.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Completed:</span>
                      <span className="font-medium">
                        {selectedResult.completedAt
                          ? format(new Date(selectedResult.completedAt), "PPP")
                          : "Not completed"}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Clinical Review</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="reviewed"
                        className="rounded"
                      />
                      <Label htmlFor="reviewed" className="text-sm">
                        Results reviewed by physician
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="interpreted"
                        className="rounded"
                      />
                      <Label htmlFor="interpreted" className="text-sm">
                        Clinical interpretation complete
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="actions" className="rounded" />
                      <Label htmlFor="actions" className="text-sm">
                        Follow-up actions identified
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="approved"
                        className="rounded"
                      />
                      <Label htmlFor="approved" className="text-sm">
                        Approved for patient sharing
                      </Label>
                    </div>
                  </div>
                </div>
              </div>

              {selectedResult.results && selectedResult.results.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Test Results Summary</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedResult.results
                      .slice(0, 4)
                      .map((result: any, index: number) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-sm">
                              {result.name}
                            </span>
                            <Badge
                              variant={
                                result.status === "normal"
                                  ? "default"
                                  : "secondary"
                              }
                              className="text-xs"
                            >
                              {result.status}
                            </Badge>
                          </div>
                          <div className="text-lg font-semibold mt-1">
                            {result.value} {result.unit}
                          </div>
                          <div className="text-xs text-gray-600">
                            Ref: {result.referenceRange}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="physicianNotes" className="text-sm font-medium">
                  Physician Notes
                </Label>
                <Textarea
                  id="physicianNotes"
                  placeholder="Add clinical interpretation, recommendations, or follow-up instructions..."
                  className="mt-2"
                  rows={3}
                />
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowReviewDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleDownloadResult(selectedResult.id)}
                  >
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
                        message: `Lab results for ${selectedResult.testType} are now available for review.`,
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
                Share results for{" "}
                <strong>{getPatientName(selectedResult.patientId)}</strong>
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
                      onChange={(e) =>
                        setShareFormData((prev) => ({
                          ...prev,
                          method: e.target.value,
                        }))
                      }
                      className="w-4 h-4"
                    />
                    <Label htmlFor="email" className="text-sm">
                      Email
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="whatsapp"
                      name="method"
                      value="whatsapp"
                      checked={shareFormData.method === "whatsapp"}
                      onChange={(e) =>
                        setShareFormData((prev) => ({
                          ...prev,
                          method: e.target.value,
                        }))
                      }
                      className="w-4 h-4"
                    />
                    <Label htmlFor="whatsapp" className="text-sm">
                      WhatsApp
                    </Label>
                  </div>
                </div>
              </div>

              {shareFormData.method === "email" && (
                <div className="space-y-2">
                  <Label htmlFor="emailAddress" className="text-sm font-medium">
                    Email Address
                  </Label>
                  <Input
                    id="emailAddress"
                    type="email"
                    placeholder="patient@example.com"
                    value={shareFormData.email}
                    onChange={(e) =>
                      setShareFormData((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                  />
                </div>
              )}

              {shareFormData.method === "whatsapp" && (
                <div className="space-y-2">
                  <Label
                    htmlFor="whatsappNumber"
                    className="text-sm font-medium"
                  >
                    WhatsApp Number
                  </Label>
                  <Input
                    id="whatsappNumber"
                    type="tel"
                    placeholder="+44 7XXX XXXXXX"
                    value={shareFormData.whatsapp}
                    onChange={(e) =>
                      setShareFormData((prev) => ({
                        ...prev,
                        whatsapp: e.target.value,
                      }))
                    }
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="shareMessage" className="text-sm font-medium">
                  Message
                </Label>
                <Textarea
                  id="shareMessage"
                  placeholder="Add a personal message..."
                  value={shareFormData.message}
                  onChange={(e) =>
                    setShareFormData((prev) => ({
                      ...prev,
                      message: e.target.value,
                    }))
                  }
                  rows={3}
                />
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowShareDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    const method =
                      shareFormData.method === "email" ? "email" : "WhatsApp";
                    const contact =
                      shareFormData.method === "email"
                        ? shareFormData.email
                        : shareFormData.whatsapp;

                    toast({
                      title: "Results Shared",
                      description: `Lab results sent to ${getPatientName(selectedResult.patientId)} via ${method} (${contact})`,
                    });
                    setShowShareDialog(false);
                    setShareFormData({
                      method: "",
                      email: "",
                      whatsapp: "",
                      message: "",
                    });
                  }}
                  disabled={
                    !shareFormData.method ||
                    (shareFormData.method === "email" &&
                      !shareFormData.email) ||
                    (shareFormData.method === "whatsapp" &&
                      !shareFormData.whatsapp)
                  }
                  className="bg-medical-blue hover:bg-blue-700"
                >
                  Send Results
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Lab Result Prescription Dialog */}
      <Dialog
        open={showPrescriptionDialog}
        onOpenChange={setShowPrescriptionDialog}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-xl font-bold">
              Lab Result Prescription
            </DialogTitle>
          </DialogHeader>

          {selectedResult && (
            <div
              className="prescription-content space-y-6 py-4"
              id="prescription-print"
            >
              {/* Header */}
              <div className="border-b pb-4 pt-6">
                <div className="flex items-center">
                  {/* Left Side: Image */}
                  <img
                    src={curaIcon}
                    alt="icon"
                    style={{
                      height: "100px",
                      width: "100px",
                      marginRight: "1.5rem",
                      marginLeft: "1rem",
                    }}
                  />

                  {/* Right Side: Text Content */}
                  <div
                    className="flex-1 text-center"
                    style={{ marginLeft: "-120px" }}
                  >
                    <h1 className="text-3xl font-bold text-medical-blue mb-2">
                      CURA EMR SYSTEM
                    </h1>
                    <p className="text-sm text-gray-600 font-medium">
                      Laboratory Test Prescription (RESIDENT PHYSICIAN M.D)
                    </p>

                    <div className="text-sm text-gray-700 mt-2 leading-5">
                      <p>Halo Health Clinic</p>
                      <p>Unit 2 Drayton Court, Solihull</p>
                      <p>B90 4NG, UK</p>
                      <p>+44(0)121 827 5531</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Doctor and Patient Information */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-800 border-b fs-6">
                    Physician Information
                  </h4>
                  <div className="space-y-1 text-sm">
                    <p>
                      <strong>Name:</strong>{" "}
                      {selectedResult.doctorName || "Doctor"}
                    </p>
                    {selectedResult.mainSpecialty && (
                      <p>
                        <strong>Main Specialization:</strong>{" "}
                        {selectedResult.mainSpecialty}
                      </p>
                    )}
                    {selectedResult.subSpecialty && (
                      <p>
                        <strong>Sub-Specialization:</strong>{" "}
                        {selectedResult.subSpecialty}
                      </p>
                    )}
                    {selectedResult.priority && (
                      <p>
                        <strong>Priority:</strong> {selectedResult.priority}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-800 border-b fs-6">
                    Patient Information
                  </h4>
                  <div className="space-y-1 text-sm">
                    <p>
                      <strong>Name:</strong>{" "}
                      {getPatientName(selectedResult.patientId)}
                    </p>
                    <p>
                      <strong>Patient ID:</strong> {selectedResult.patientId}
                    </p>
                    <p>
                      <strong>Date:</strong>{" "}
                      {format(new Date(), "MMM dd, yyyy")}
                    </p>
                    <p>
                      <strong>Time:</strong> {format(new Date(), "HH:mm")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Prescription Details */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-800 text-lg border-b pb-2">
                  ℞ Laboratory Test Prescription
                </h3>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        Test ID:
                      </p>
                      <p className="font-mono">{selectedResult.testId}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        Test Type:
                      </p>
                      <p className="font-semibold text-blue-800">
                        {selectedResult.testType}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        Ordered Date:
                      </p>
                      <p>
                        {format(
                          new Date(selectedResult.orderedAt),
                          "MMM dd, yyyy HH:mm",
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        Status:
                      </p>
                      <Badge className={getStatusColor(selectedResult.status)}>
                        {selectedResult.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>

                  {selectedResult.results &&
                    selectedResult.results.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-700 mb-3">
                          Test Results:
                        </p>
                        <div className="space-y-2">
                          {selectedResult.results.map(
                            (testResult: any, index: number) => (
                              <div
                                key={index}
                                className="bg-white border rounded p-3"
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <span className="font-medium text-gray-900">
                                    {testResult.name}
                                  </span>
                                  <Badge
                                    className={getResultStatusColor(
                                      testResult.status,
                                    )}
                                  >
                                    {testResult.status
                                      .replace("_", " ")
                                      .toUpperCase()}
                                  </Badge>
                                </div>
                                <div className="text-sm text-gray-700">
                                  <p>
                                    <strong>Value:</strong> {testResult.value}{" "}
                                    {testResult.unit}
                                  </p>
                                  <p>
                                    <strong>Reference Range:</strong>{" "}
                                    {testResult.referenceRange}
                                  </p>
                                  {testResult.flag && (
                                    <p>
                                      <strong>Flag:</strong> {testResult.flag}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    )}

                  {selectedResult.notes && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Clinical Notes:
                      </p>
                      <p className="text-sm text-gray-800 bg-yellow-50 border-l-4 border-yellow-400 p-3">
                        {selectedResult.notes}
                      </p>
                    </div>
                  )}
                </div>

                {selectedResult.criticalValues && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                    <div className="flex items-center gap-2 text-red-800">
                      <AlertTriangle className="h-5 w-5" />
                      <span className="font-semibold">
                        CRITICAL VALUES DETECTED
                      </span>
                    </div>
                    <p className="text-sm text-red-700 mt-2">
                      This lab result contains critical values that require
                      immediate attention.
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t pt-4 mt-6">
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <p>Generated by Cura EMR System</p>
                  <p>Date: {format(new Date(), "MMM dd, yyyy HH:mm")}</p>
                </div>
                <div className="mt-4 text-center">
                  <div className="border-t border-gray-300 w-64 mx-auto mb-2"></div>
                  <p className="text-sm font-medium">
                    {selectedResult.doctorName || "Doctor"}
                  </p>
                  {selectedResult.mainSpecialty && (
                    <p className="text-xs text-gray-600">
                      {selectedResult.mainSpecialty}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setShowPrescriptionDialog(false)}
            >
              Close
            </Button>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handlePrint}
                className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button
                onClick={handleGeneratePDF}
                className="bg-medical-blue hover:bg-blue-700"
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Generate Lab Test Result Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Generate Lab Test Result
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Patient Selection */}
            <div className="space-y-2">
              <Label htmlFor="generate-patient">Select Patient *</Label>
              <Popover open={patientSearchOpen} onOpenChange={setPatientSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                    data-testid="button-select-patient-generate"
                  >
                    {generateFormData.patientId
                      ? patients.find((p: any) => p.id.toString() === generateFormData.patientId.toString())
                          ? `${patients.find((p: any) => p.id.toString() === generateFormData.patientId.toString()).firstName} ${patients.find((p: any) => p.id.toString() === generateFormData.patientId.toString()).lastName}`
                          : "Select patient..."
                      : "Select patient..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search patients..." />
                    <CommandEmpty>No patient found.</CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-auto">
                      {patients.map((patient: any) => (
                        <CommandItem
                          key={patient.id}
                          value={`${patient.firstName} ${patient.lastName}`}
                          onSelect={() => {
                            setGenerateFormData((prev: any) => ({
                              ...prev,
                              patientId: patient.id,
                              patientName: `${patient.firstName} ${patient.lastName}`,
                            }));
                            setPatientSearchOpen(false);
                          }}
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${
                              generateFormData.patientId === patient.id
                                ? "opacity-100"
                                : "opacity-0"
                            }`}
                          />
                          {patient.firstName} {patient.lastName} ({patient.patientId})
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Test ID Field */}
            <div className="space-y-2">
              <Label htmlFor="generate-test-id">Test ID</Label>
              <Input
                id="generate-test-id"
                type="text"
                placeholder="Auto-generated Test ID"
                value={
                  generateFormData.testId ||
                  `LAB${Date.now()}${Math.random().toString(36).substring(2, 9).toUpperCase()}`
                }
                onChange={(e) =>
                  setGenerateFormData((prev: any) => ({
                    ...prev,
                    testId: e.target.value,
                  }))
                }
                data-testid="input-test-id"
                className="font-mono"
              />
              <p className="text-xs text-gray-500">
                Auto-generated unique test identifier (can be customized)
              </p>
            </div>

            {/* Test Type Multi-Selection */}
            <div className="space-y-2">
              <Label>Select Test Types *</Label>
              <Popover open={testTypeOpen} onOpenChange={setTestTypeOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                    data-testid="button-select-test-types"
                  >
                    {generateFormData.selectedTests && generateFormData.selectedTests.length > 0
                      ? `${generateFormData.selectedTests.length} test(s) selected`
                      : "Select test types..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search test types..." />
                    <CommandEmpty>No test type found.</CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-auto">
                      {TEST_TYPES.map((testType) => (
                        <CommandItem
                          key={testType}
                          value={testType}
                          onSelect={() => {
                            setGenerateFormData((prev: any) => {
                              const currentTests = prev.selectedTests || [];
                              const isSelected = currentTests.includes(testType);
                              const newTests = isSelected
                                ? currentTests.filter((t: string) => t !== testType)
                                : [...currentTests, testType];
                              return {
                                ...prev,
                                selectedTests: newTests,
                              };
                            });
                          }}
                        >
                          <Checkbox
                            checked={generateFormData.selectedTests?.includes(testType) || false}
                            className="mr-2"
                          />
                          {testType}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
              
              {/* Display selected tests */}
              {generateFormData.selectedTests && generateFormData.selectedTests.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {generateFormData.selectedTests.map((test: string) => (
                    <Badge
                      key={test}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => {
                        setGenerateFormData((prev: any) => ({
                          ...prev,
                          selectedTests: prev.selectedTests.filter((t: string) => t !== test),
                        }));
                      }}
                    >
                      {test}
                      <X className="ml-2 h-3 w-3" />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Dynamic Test Fields - Show fields for each selected test */}
            {generateFormData.selectedTests && generateFormData.selectedTests.length > 0 && (
              <div className="space-y-6">
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-4">Test Result Values</h3>
                  
                  {generateFormData.selectedTests.map((testType: string) => {
                    const testFields = TEST_FIELD_DEFINITIONS[testType];
                    if (!testFields) return null;

                    return (
                      <div key={testType} className="mb-6 p-4 bg-gray-50 rounded-lg border">
                        <h4 className="font-semibold text-blue-700 mb-4">{testType}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {testFields.map((field) => (
                            <div key={field.name} className="space-y-1">
                              <Label htmlFor={`${testType}-${field.name}`} className="text-sm">
                                {field.name}
                                <span className="text-gray-500 text-xs ml-2">
                                  ({field.unit}) - Ref: {field.referenceRange}
                                </span>
                              </Label>
                              <Input
                                id={`${testType}-${field.name}`}
                                type="text"
                                placeholder={`Enter ${field.name} value`}
                                value={generateFormData.testValues?.[testType]?.[field.name] || ""}
                                onChange={(e) => {
                                  setGenerateFormData((prev: any) => ({
                                    ...prev,
                                    testValues: {
                                      ...prev.testValues,
                                      [testType]: {
                                        ...prev.testValues?.[testType],
                                        [field.name]: e.target.value,
                                      },
                                    },
                                  }));
                                }}
                                data-testid={`input-${testType.toLowerCase().replace(/\s+/g, '-')}-${field.name.toLowerCase().replace(/\s+/g, '-')}`}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="generate-notes">Clinical Notes (Optional)</Label>
              <Textarea
                id="generate-notes"
                placeholder="Add any clinical notes or observations..."
                value={generateFormData.notes || ""}
                onChange={(e) =>
                  setGenerateFormData((prev: any) => ({
                    ...prev,
                    notes: e.target.value,
                  }))
                }
                rows={3}
                data-testid="textarea-clinical-notes"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowGenerateDialog(false);
                  setGenerateFormData({});
                }}
                data-testid="button-cancel-generate"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  // Validate required fields
                  if (!generateFormData.patientId) {
                    toast({
                      title: "Validation Error",
                      description: "Please select a patient",
                      variant: "destructive",
                    });
                    return;
                  }

                  if (!generateFormData.selectedTests || generateFormData.selectedTests.length === 0) {
                    toast({
                      title: "Validation Error",
                      description: "Please select at least one test type",
                      variant: "destructive",
                    });
                    return;
                  }

                  // Build results array from test values
                  const results: any[] = [];
                  generateFormData.selectedTests.forEach((testType: string) => {
                    const testFields = TEST_FIELD_DEFINITIONS[testType];
                    const testValues = generateFormData.testValues?.[testType];
                    
                    if (testFields && testValues) {
                      testFields.forEach((field) => {
                        const value = testValues[field.name];
                        if (value && value.trim() !== "") {
                          // Determine status based on reference range (simplified)
                          const numValue = parseFloat(value);
                          let status = "normal";
                          
                          results.push({
                            name: field.name,
                            value: value,
                            unit: field.unit,
                            referenceRange: field.referenceRange,
                            status: status,
                          });
                        }
                      });
                    }
                  });

                  if (results.length === 0) {
                    toast({
                      title: "Validation Error",
                      description: "Please enter at least one test result value",
                      variant: "destructive",
                    });
                    return;
                  }

                  // Generate or use provided test ID
                  const baseTestId = generateFormData.testId || 
                    `LAB${Date.now()}${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

                  // Create lab result for each selected test
                  generateFormData.selectedTests.forEach((testType: string, index: number) => {
                    const testResults = results.filter((r) => {
                      const fields = TEST_FIELD_DEFINITIONS[testType];
                      return fields?.some((f) => f.name === r.name);
                    });

                    if (testResults.length > 0) {
                      // For multiple tests, append index to test ID
                      const testId = generateFormData.selectedTests.length > 1 
                        ? `${baseTestId}-${index + 1}`
                        : baseTestId;

                      const labResultData = {
                        patientId: generateFormData.patientId,
                        testId: testId,
                        testType: testType,
                        orderedBy: user?.id,
                        priority: "routine",
                        status: "completed",
                        results: testResults,
                        notes: generateFormData.notes || "",
                        criticalValues: false,
                      };

                      createLabOrderMutation.mutate(labResultData);
                    }
                  });

                  toast({
                    title: "Success",
                    description: `Lab result${generateFormData.selectedTests.length > 1 ? 's' : ''} generated successfully`,
                  });
                  
                  setShowGenerateDialog(false);
                  setGenerateFormData({});
                }}
                disabled={
                  !generateFormData.patientId ||
                  !generateFormData.selectedTests ||
                  generateFormData.selectedTests.length === 0
                }
                className="bg-green-600 hover:bg-green-700"
                data-testid="button-submit-generate"
              >
                <FileText className="h-4 w-4 mr-2" />
                Generate Lab Result
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fill Lab Test Result Dialog (for existing lab orders) */}
      <Dialog open={showFillResultDialog} onOpenChange={setShowFillResultDialog}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              Generate Lab Test Result
            </DialogTitle>
          </DialogHeader>
          
          {selectedLabOrder && (
            <div className="space-y-6 py-4">
              {/* Lab Order Details - Read Only */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-blue-900 mb-2">Lab Order Details</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-sm text-gray-600">Patient Name:</span>
                    <p className="font-medium text-gray-900">
                      {getPatientName(selectedLabOrder.patientId)}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Test Name:</span>
                    <p className="font-medium text-gray-900">{selectedLabOrder.testType}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Test ID:</span>
                    <p className="font-medium text-gray-900">{selectedLabOrder.testId || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Ordered Date:</span>
                    <p className="font-medium text-gray-900">
                      {selectedLabOrder.orderedDate
                        ? format(new Date(selectedLabOrder.orderedDate), "PPp")
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Ordered By:</span>
                    <p className="font-medium text-gray-900">
                      {getUserName(selectedLabOrder.orderedBy)}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Priority:</span>
                    <p className="font-medium text-gray-900 capitalize">{selectedLabOrder.priority}</p>
                  </div>
                </div>
                {selectedLabOrder.notes && (
                  <div>
                    <span className="text-sm text-gray-600">Notes:</span>
                    <p className="font-medium text-gray-900">{selectedLabOrder.notes}</p>
                  </div>
                )}
              </div>

              {/* Test Result Fields Based on Test Type(s) - Multiple tests support */}
              {(() => {
                // Parse test types - may be comma-separated for multiple tests
                const testTypes = selectedLabOrder.testType
                  .split(',')
                  .map((t: string) => t.trim())
                  .filter((t: string) => TEST_FIELD_DEFINITIONS[t]);

                if (testTypes.length === 0) return null;

                // Validation function for field values
                const validateField = (fieldKey: string, value: string): string => {
                  if (!value || value.trim() === "") return "";
                  
                  // Check if value is numeric (allows decimals and negative values)
                  const numericPattern = /^-?\d*\.?\d+$/;
                  if (!numericPattern.test(value.trim())) {
                    return "Must be a numeric value";
                  }
                  
                  return "";
                };

                // Handle field change with validation
                const handleFieldChange = (fieldKey: string, value: string) => {
                  setFillResultFormData((prev: any) => ({
                    ...prev,
                    [fieldKey]: value,
                  }));

                  // Validate the field
                  const error = validateField(fieldKey, value);
                  setValidationErrors((prev) => {
                    if (error) {
                      return { ...prev, [fieldKey]: error };
                    } else {
                      const newErrors = { ...prev };
                      delete newErrors[fieldKey];
                      return newErrors;
                    }
                  });
                };

                return (
                  <div className="space-y-6">
                    {testTypes.map((testType: string, testIndex: number) => (
                      <div key={testType} className="space-y-4">
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-600 p-3 rounded">
                          <h4 className="font-semibold text-blue-900 text-lg">
                            {testIndex + 1}. {testType}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {TEST_FIELD_DEFINITIONS[testType].length} parameters
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pl-2">
                          {TEST_FIELD_DEFINITIONS[testType].map((field) => {
                            const fieldKey = `${testType}::${field.name}`;
                            const hasError = validationErrors[fieldKey];
                            
                            return (
                              <div key={`${testType}-${field.name}`} className="space-y-1">
                                <Label htmlFor={`fill-${testType}-${field.name}`}>
                                  {field.name}
                                  <span className="text-xs text-gray-500 ml-2">
                                    (Ref: {field.referenceRange} {field.unit})
                                  </span>
                                </Label>
                                <Input
                                  id={`fill-${testType}-${field.name}`}
                                  type="text"
                                  placeholder={`Enter ${field.name}`}
                                  value={fillResultFormData[fieldKey] || ""}
                                  onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
                                  className={hasError ? "border-red-500 focus:ring-red-500" : ""}
                                  data-testid={`input-fill-${testType}-${field.name}`}
                                />
                                {hasError && (
                                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    {hasError}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Clinical Notes */}
              <div className="space-y-2">
                <Label htmlFor="fill-clinical-notes">Clinical Notes (Optional)</Label>
                <textarea
                  id="fill-clinical-notes"
                  className="w-full min-h-[100px] p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter any clinical observations or notes..."
                  value={fillResultFormData.notes || ""}
                  onChange={(e) =>
                    setFillResultFormData((prev: any) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                  data-testid="textarea-fill-clinical-notes"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowFillResultDialog(false);
                    setFillResultFormData({});
                    setValidationErrors({});
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    // Check for validation errors
                    if (Object.keys(validationErrors).length > 0) {
                      toast({
                        title: "Validation Error",
                        description: "Please fix all validation errors before downloading",
                        variant: "destructive",
                      });
                      return;
                    }

                    // Build results array from filled values - supports multiple tests
                    const results: any[] = [];
                    const testTypes = selectedLabOrder.testType
                      .split(',')
                      .map((t: string) => t.trim())
                      .filter((t: string) => TEST_FIELD_DEFINITIONS[t]);
                    
                    // Process all test types
                    testTypes.forEach((testType: string) => {
                      const testFields = TEST_FIELD_DEFINITIONS[testType];
                      if (testFields) {
                        testFields.forEach((field) => {
                          const fieldKey = `${testType}::${field.name}`;
                          const value = fillResultFormData[fieldKey];
                          if (value && value.trim() !== "") {
                            results.push({
                              name: `${testType} - ${field.name}`,
                              value: value,
                              unit: field.unit,
                              referenceRange: field.referenceRange,
                              status: "normal",
                            });
                          }
                        });
                      }
                    });

                    if (results.length === 0) {
                      toast({
                        title: "Validation Error",
                        description: "Please enter at least one test result value to download",
                        variant: "destructive",
                      });
                      return;
                    }

                    // Generate PDF with lab test results
                    const pdf = new jsPDF();
                    const pageWidth = pdf.internal.pageSize.getWidth();
                    let yPos = 20;

                    // Header
                    pdf.setFontSize(20);
                    pdf.setFont("helvetica", "bold");
                    pdf.text("Lab Test Result Report", pageWidth / 2, yPos, { align: "center" });
                    yPos += 15;

                    // Lab Order Details Section
                    pdf.setFontSize(14);
                    pdf.setFont("helvetica", "bold");
                    pdf.text("Lab Order Information", 20, yPos);
                    yPos += 10;

                    pdf.setFontSize(11);
                    pdf.setFont("helvetica", "normal");
                    
                    // Patient Name
                    pdf.text("Patient Name:", 20, yPos);
                    pdf.text(getPatientName(selectedLabOrder.patientId), 70, yPos);
                    yPos += 7;

                    // Test Name
                    pdf.text("Test Name:", 20, yPos);
                    pdf.text(selectedLabOrder.testType, 70, yPos);
                    yPos += 7;

                    // Test ID
                    pdf.text("Test ID:", 20, yPos);
                    pdf.text(selectedLabOrder.testId || 'N/A', 70, yPos);
                    yPos += 7;

                    // Ordered Date
                    pdf.text("Ordered Date:", 20, yPos);
                    pdf.text(
                      selectedLabOrder.orderedDate
                        ? format(new Date(selectedLabOrder.orderedDate), "PPp")
                        : "N/A",
                      70,
                      yPos
                    );
                    yPos += 7;

                    // Ordered By
                    pdf.text("Ordered By:", 20, yPos);
                    pdf.text(getUserName(selectedLabOrder.orderedBy), 70, yPos);
                    yPos += 7;

                    // Priority
                    pdf.text("Priority:", 20, yPos);
                    pdf.text(selectedLabOrder.priority || 'routine', 70, yPos);
                    yPos += 15;

                    // Test Results Section
                    pdf.setFontSize(14);
                    pdf.setFont("helvetica", "bold");
                    pdf.text("Test Results", 20, yPos);
                    yPos += 10;

                    // Results Table Header
                    pdf.setFillColor(240, 240, 240);
                    pdf.rect(20, yPos - 5, pageWidth - 40, 8, "F");
                    pdf.setFontSize(10);
                    pdf.setFont("helvetica", "bold");
                    pdf.text("Parameter", 25, yPos);
                    pdf.text("Value", 80, yPos);
                    pdf.text("Unit", 120, yPos);
                    pdf.text("Reference Range", 150, yPos);
                    yPos += 10;

                    // Results Data
                    pdf.setFont("helvetica", "normal");
                    results.forEach((result, index) => {
                      if (yPos > 270) {
                        pdf.addPage();
                        yPos = 20;
                      }

                      // Alternate row background
                      if (index % 2 === 0) {
                        pdf.setFillColor(250, 250, 250);
                        pdf.rect(20, yPos - 5, pageWidth - 40, 8, "F");
                      }

                      pdf.text(result.name, 25, yPos);
                      pdf.text(result.value, 80, yPos);
                      pdf.text(result.unit, 120, yPos);
                      pdf.text(result.referenceRange, 150, yPos);
                      yPos += 8;
                    });

                    // Clinical Notes Section
                    if (fillResultFormData.notes || selectedLabOrder.notes) {
                      yPos += 10;
                      if (yPos > 250) {
                        pdf.addPage();
                        yPos = 20;
                      }

                      pdf.setFontSize(14);
                      pdf.setFont("helvetica", "bold");
                      pdf.text("Clinical Notes", 20, yPos);
                      yPos += 10;

                      pdf.setFontSize(11);
                      pdf.setFont("helvetica", "normal");
                      const notes = fillResultFormData.notes || selectedLabOrder.notes || "";
                      const splitNotes = pdf.splitTextToSize(notes, pageWidth - 40);
                      pdf.text(splitNotes, 20, yPos);
                    }

                    // Footer
                    const pageCount = pdf.getNumberOfPages();
                    for (let i = 1; i <= pageCount; i++) {
                      pdf.setPage(i);
                      pdf.setFontSize(9);
                      pdf.setFont("helvetica", "italic");
                      pdf.text(
                        `Generated on ${format(new Date(), "PPp")}`,
                        20,
                        pdf.internal.pageSize.getHeight() - 10
                      );
                      pdf.text(
                        `Page ${i} of ${pageCount}`,
                        pageWidth - 40,
                        pdf.internal.pageSize.getHeight() - 10
                      );
                    }

                    // Download PDF
                    const fileName = `Lab_Result_${selectedLabOrder.testType.replace(/\s+/g, '_')}_${selectedLabOrder.testId || Date.now()}.pdf`;
                    pdf.save(fileName);

                    toast({
                      title: "Success",
                      description: "Lab test result PDF downloaded successfully",
                    });
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  data-testid="button-download-fill-result"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Lab Test Result
                </Button>
                <Button
                  onClick={() => {
                    // Check for validation errors
                    if (Object.keys(validationErrors).length > 0) {
                      toast({
                        title: "Validation Error",
                        description: "Please fix all validation errors before generating results",
                        variant: "destructive",
                      });
                      return;
                    }

                    // Build results array from filled values - supports multiple tests
                    const results: any[] = [];
                    const testTypes = selectedLabOrder.testType
                      .split(',')
                      .map((t: string) => t.trim())
                      .filter((t: string) => TEST_FIELD_DEFINITIONS[t]);
                    
                    // Process all test types
                    testTypes.forEach((testType: string) => {
                      const testFields = TEST_FIELD_DEFINITIONS[testType];
                      if (testFields) {
                        testFields.forEach((field) => {
                          const fieldKey = `${testType}::${field.name}`;
                          const value = fillResultFormData[fieldKey];
                          if (value && value.trim() !== "") {
                            results.push({
                              name: `${testType} - ${field.name}`,
                              value: value,
                              unit: field.unit,
                              referenceRange: field.referenceRange,
                              status: "normal",
                            });
                          }
                        });
                      }
                    });

                    if (results.length === 0) {
                      toast({
                        title: "Validation Error",
                        description: "Please enter at least one test result value",
                        variant: "destructive",
                      });
                      return;
                    }

                    // Update the existing lab order with results
                    updateLabResultMutation.mutate({
                      id: selectedLabOrder.id,
                      data: {
                        status: "completed",
                        results: results,
                        notes: fillResultFormData.notes || selectedLabOrder.notes || "",
                        criticalValues: false,
                      },
                    });

                    toast({
                      title: "Success",
                      description: "Lab test results generated successfully",
                    });
                    
                    setShowFillResultDialog(false);
                    setFillResultFormData({});
                    setValidationErrors({});
                  }}
                  className="bg-green-600 hover:bg-green-700"
                  data-testid="button-submit-fill-result"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Lab Result
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Permission Error Dialog */}
      <Dialog open={showPermissionErrorDialog} onOpenChange={setShowPermissionErrorDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Permission Denied
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-700">{permissionErrorMessage}</p>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() => setShowPermissionErrorDialog(false)}
              variant="outline"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
