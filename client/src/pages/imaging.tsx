import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getActiveSubdomain } from "@/lib/subdomain-utils";
import { Header } from "@/components/layout/header";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  FileImage,
  Plus,
  Search,
  Download,
  Eye,
  User,
  FileText,
  Monitor,
  Camera,
  Zap,
  Share,
  Share2,
  Mail,
  MessageCircle,
  Trash2,
  Edit,
  Check,
  X,
  Loader2,
  AlertCircle,
  ChevronsUpDown,
  Check as CheckIcon,
  Grid,
  List,
} from "lucide-react";
import { format } from "date-fns";
import { isDoctorLike, formatRoleLabel } from "@/lib/role-utils";

// Modality to Body Part mapping
const MODALITY_BODY_PARTS: Record<string, string[]> = {
  "X-Ray": [
    "Chest X-Ray (PA / Lateral)",
    "Abdomen X-Ray",
    "Spine X-Ray (Cervical / Lumbar)",
    "Skull X-Ray",
    "Pelvis X-Ray",
    "Hand / Foot / Arm / Leg X-Ray"
  ],
  "CT": [
    "CT Brain",
    "CT Chest",
    "CT Abdomen & Pelvis",
    "CT Spine",
    "CT Angiogram (Coronary, Pulmonary, Cerebral)"
  ],
  "MRI": [
    "MRI Brain",
    "MRI Spine (Cervical / Lumbar)",
    "MRI Knee",
    "MRI Abdomen / Pelvis",
    "MRI Shoulder",
    "MRI Angiography"
  ],
  "Ultrasound": [
    "Abdomen Ultrasound",
    "Pelvic Ultrasound",
    "Thyroid Ultrasound",
    "Obstetric (OB) Ultrasound",
    "Doppler Ultrasound (Carotid / Venous / Arterial)"
  ],
  "Mammography": [
    "Screening Mammogram (Bilateral)",
    "Diagnostic Mammogram"
  ],
  "Nuclear Medicine": [
    "Bone Scan",
    "Thyroid Scan",
    "Renal Scan",
    "Cardiac Perfusion Scan"
  ]
};

interface ImagingStudy {
  id: string;
  imageId?: string; // Unique image ID from medical_images table (e.g., IMG1760636902921I2ONC)
  patientId: string;
  patientName: string;
  studyType: string;
  modality:
    | "X-Ray"
    | "CT"
    | "MRI"
    | "Ultrasound"
    | "Nuclear Medicine"
    | "Mammography";
  bodyPart: string;
  orderedBy: string;
  orderedAt: string;
  scheduledAt?: string;
  performedAt?: string;
  status:
    | "ordered"
    | "scheduled"
    | "in_progress"
    | "completed"
    | "preliminary"
    | "final"
    | "cancelled";
  priority: "routine" | "urgent" | "stat";
  indication: string;
  findings?: string;
  impression?: string;
  radiologist?: string;
  reportFileName?: string;
  reportFilePath?: string;
  images: Array<{
    id: string;
    type: "DICOM" | "JPEG" | "PNG";
    seriesDescription: string;
    imageCount: number;
    size: string;
    imageData?: string;
    mimeType?: string;
    fileName?: string;
  }>;
  report?: {
    status: "preliminary" | "final";
    content: string;
    dictatedAt: string;
    signedAt?: string;
  };
}

const mockImagingStudies: ImagingStudy[] = [
  {
    id: "img_001",
    patientId: "p_001",
    patientName: "Sarah Johnson",
    studyType: "Chest X-Ray PA and Lateral",
    modality: "X-Ray",
    bodyPart: "Chest",
    orderedBy: "Dr. Sarah Smith",
    orderedAt: "2024-01-15T09:00:00Z",
    scheduledAt: "2024-01-15T14:00:00Z",
    performedAt: "2024-01-15T14:15:00Z",
    status: "final",
    priority: "routine",
    indication: "Chronic cough, rule out pneumonia",
    findings:
      "Lungs are clear bilaterally. No acute cardiopulmonary abnormality. Heart size normal.",
    impression: "Normal chest X-ray.",
    radiologist: "Dr. Michael Chen",
    images: [
      {
        id: "series_001",
        type: "DICOM",
        seriesDescription: "PA View",
        imageCount: 1,
        size: "2.1 MB",
      },
      {
        id: "series_002",
        type: "DICOM",
        seriesDescription: "Lateral View",
        imageCount: 1,
        size: "2.3 MB",
      },
    ],
    report: {
      status: "final",
      content:
        "EXAMINATION: Chest X-ray PA and Lateral\n\nINDICATION: Chronic cough, rule out pneumonia\n\nFINDINGS: The lungs are clear bilaterally without focal consolidation, pleural effusion, or pneumothorax. The cardiac silhouette is normal in size and configuration. The mediastinal contours are normal. No acute bony abnormalities are identified.\n\nIMPRESSION: Normal chest X-ray.",
      dictatedAt: "2024-01-15T15:30:00Z",
      signedAt: "2024-01-15T15:45:00Z",
    },
  },
  {
    id: "img_002",
    patientId: "p_002",
    patientName: "Robert Davis",
    studyType: "CT Abdomen and Pelvis with Contrast",
    modality: "CT",
    bodyPart: "Abdomen/Pelvis",
    orderedBy: "Dr. Sarah Smith",
    orderedAt: "2024-01-14T10:00:00Z",
    scheduledAt: "2024-01-16T09:00:00Z",
    status: "scheduled",
    priority: "urgent",
    indication: "Abdominal pain, rule out appendicitis",
    images: [],
  },
  {
    id: "img_003",
    patientId: "p_003",
    patientName: "Emma Wilson",
    studyType: "Brain MRI without Contrast",
    modality: "MRI",
    bodyPart: "Brain",
    orderedBy: "Dr. Michael Chen",
    orderedAt: "2024-01-13T11:00:00Z",
    performedAt: "2024-01-14T10:30:00Z",
    status: "preliminary",
    priority: "routine",
    indication: "Headaches, rule out structural abnormality",
    radiologist: "Dr. Lisa Park",
    images: [
      {
        id: "series_003",
        type: "DICOM",
        seriesDescription: "T1 Sagittal",
        imageCount: 25,
        size: "45.2 MB",
      },
      {
        id: "series_004",
        type: "DICOM",
        seriesDescription: "T2 Axial",
        imageCount: 30,
        size: "52.8 MB",
      },
      {
        id: "series_005",
        type: "DICOM",
        seriesDescription: "FLAIR Axial",
        imageCount: 28,
        size: "48.6 MB",
      },
    ],
    report: {
      status: "preliminary",
      content:
        "PRELIMINARY REPORT - AWAITING FINAL REVIEW\n\nEXAMINATION: Brain MRI without contrast\n\nINDICATION: Headaches, rule out structural abnormality\n\nFINDINGS: Preliminary review shows no acute intracranial abnormality. No mass lesion, hemorrhage, or midline shift identified. Ventricular system appears normal.\n\nIMPRESSION: Preliminary - No acute intracranial abnormality.",
      dictatedAt: "2024-01-14T16:00:00Z",
    },
  },
];

export default function ImagingPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showFinalReportDialog, setShowFinalReportDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showFileNotAvailableDialog, setShowFileNotAvailableDialog] =
    useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [studyToDelete, setStudyToDelete] = useState<any>(null);
  const [modalityFilter, setModalityFilter] = useState<string>("all");
  const [selectedStudyId, setSelectedStudyId] = useState<string | null>(null);
  const [shareFormData, setShareFormData] = useState({
    method: "",
    email: "",
    whatsapp: "",
    message: "",
  });
  const [patients, setPatients] = useState<any[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [reportFindings, setReportFindings] = useState("");
  const [reportImpression, setReportImpression] = useState("");
  const [reportRadiologist, setReportRadiologist] = useState("");

  // Edit mode states for individual fields
  const [editModes, setEditModes] = useState({
    findings: false,
    impression: false,
    radiologist: false,
    scheduledAt: false,
    performedAt: false,
    status: false,
    priority: false,
  });

  // Saving states for individual fields
  const [saving, setSaving] = useState({
    findings: false,
    impression: false,
    radiologist: false,
    scheduledAt: false,
    performedAt: false,
    status: false,
    priority: false,
  });

  // Editing status state for dropdown
  const [editingStatus, setEditingStatus] = useState<string>("");

  // Editing priority state for dropdown
  const [editingPriority, setEditingPriority] = useState<string>("");

  // Date states for editing
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(
    undefined,
  );
  const [performedDate, setPerformedDate] = useState<Date | undefined>(
    undefined,
  );
  const [scheduledTime, setScheduledTime] = useState<string>("");
  const [performedTime, setPerformedTime] = useState<string>("");

  const [generatedReportId, setGeneratedReportId] = useState<string | null>(
    null,
  );
  const [generatedReportFileName, setGeneratedReportFileName] = useState<
    string | null
  >(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showPaymentSuccessDialog, setShowPaymentSuccessDialog] = useState(false);
  const [showPDFViewerDialog, setShowPDFViewerDialog] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [pdfViewerUrl, setPdfViewerUrl] = useState<string | null>(null);
  const [paymentSuccessData, setPaymentSuccessData] = useState<{
    invoiceId: string;
    patientName: string;
    amount: number;
  } | null>(null);
  const [uploadFormData, setUploadFormData] = useState({
    patientId: "",
    studyType: "",
    modality: "X-Ray",
    bodyPart: "",
    indication: "",
    priority: "routine",
  });
  const [orderFormData, setOrderFormData] = useState({
    patientId: "",
    studyType: "",
    modality: "X-Ray",
    bodyPart: "",
    indication: "",
    priority: "routine",
    specialInstructions: "",
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImageSeries, setSelectedImageSeries] = useState<any>(null);
  const [deletedStudyIds, setDeletedStudyIds] = useState<Set<string>>(
    new Set(),
  );
  const [nonExistentReports, setNonExistentReports] = useState<Set<string>>(
    new Set(),
  );
  const [showEditImageDialog, setShowEditImageDialog] = useState(false);
  const [editingStudyId, setEditingStudyId] = useState<string | null>(null);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);
  const [invoiceFormData, setInvoiceFormData] = useState({
    paymentMethod: "",
    subtotal: 0,
    tax: 0,
    discount: 0,
    totalAmount: 0,
  });
  const [summaryData, setSummaryData] = useState<any>(null);
  const [uploadedImageData, setUploadedImageData] = useState<any>(null);
  
  // Invoice form fields
  const [invoicePatient, setInvoicePatient] = useState("");
  const [invoiceServiceDate, setInvoiceServiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceDueDate, setInvoiceDueDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [invoiceServiceCode, setInvoiceServiceCode] = useState("");
  const [invoiceServiceDesc, setInvoiceServiceDesc] = useState("");
  const [invoiceServiceQty, setInvoiceServiceQty] = useState("");
  const [invoiceServiceAmount, setInvoiceServiceAmount] = useState("");
  const [invoiceInsuranceProvider, setInvoiceInsuranceProvider] = useState("none");
  const [invoiceNhsNumber, setInvoiceNhsNumber] = useState("");
  const [invoiceTotalAmount, setInvoiceTotalAmount] = useState("");
  const [invoiceNotes, setInvoiceNotes] = useState("");
  
  // Validation errors
  const [invoicePatientError, setInvoicePatientError] = useState("");
  const [invoiceServiceError, setInvoiceServiceError] = useState("");
  const [invoiceNhsError, setInvoiceNhsError] = useState("");
  const [invoiceTotalError, setInvoiceTotalError] = useState("");
  const [invoicePaymentMethodError, setInvoicePaymentMethodError] = useState("");
  
  // Combobox open states
  const [modalityOpen, setModalityOpen] = useState(false);
  const [bodyPartOpen, setBodyPartOpen] = useState(false);
  const [studyTypeOpen, setStudyTypeOpen] = useState(false);
  
  const { toast } = useToast();

  // Fetch patients to find the current user's patient record
  const { data: patientsData, isLoading: patientsQueryLoading } = useQuery({
    queryKey: ["/api/patients"],
    staleTime: 60000,
    retry: false,
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/patients');
      const data = await response.json();
      return data;
    },
  });

  // Fetch imaging pricing data for study types
  const { data: imagingPricing = [], isLoading: pricingLoading } = useQuery({
    queryKey: ["/api/pricing/imaging"],
    staleTime: 60000,
    retry: false,
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/pricing/imaging');
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });

  // Find the patient record for the logged-in user
  const currentPatient = useMemo(() => {
    if (!user || user.role !== 'patient' || !patientsData || !Array.isArray(patientsData)) {
      console.log("🔍 IMAGING: Patient lookup failed", {
        hasUser: !!user,
        userRole: user?.role,
        hasPatientsData: !!patientsData,
        patientsDataType: Array.isArray(patientsData) ? 'array' : typeof patientsData
      });
      return null;
    }
    
    console.log("🔍 IMAGING: Looking for patient matching user:", { 
      userEmail: user.email, 
      userName: `${user.firstName} ${user.lastName}`,
      userId: user.id 
    });
    console.log("📋 IMAGING: Available patients:", patientsData.map(p => ({ 
      id: p.id, 
      email: p.email, 
      name: `${p.firstName} ${p.lastName}` 
    })));
    
    // Try multiple matching strategies
    const foundPatient = 
      // 1. Match by exact email
      patientsData.find((patient: any) => 
        patient.email && user.email && patient.email.toLowerCase() === user.email.toLowerCase()
      ) ||
      // 2. Match by exact name
      patientsData.find((patient: any) => 
        patient.firstName && user.firstName && patient.lastName && user.lastName &&
        patient.firstName.toLowerCase() === user.firstName.toLowerCase() && 
        patient.lastName.toLowerCase() === user.lastName.toLowerCase()
      ) ||
      // 3. Match by partial name (first name only)
      patientsData.find((patient: any) => 
        patient.firstName && user.firstName &&
        patient.firstName.toLowerCase() === user.firstName.toLowerCase()
      ) ||
      // 4. If user role is patient, take the first patient (fallback for demo)
      (user.role === 'patient' && patientsData.length > 0 ? patientsData[0] : null);
    
    if (foundPatient) {
      console.log("✅ IMAGING: Found matching patient:", foundPatient);
    } else {
      console.log("❌ IMAGING: No matching patient found");
    }
    
    return foundPatient;
  }, [user, patientsData]);

  // Fetch medical images using React Query
  const {
    data: medicalImagesRaw = [],
    isLoading: imagesLoading,
    refetch: refetchImages,
  } = useQuery({
    queryKey: ["/api/medical-images", user?.role === "patient" ? "patient-filtered" : "all"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/medical-images");
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Error fetching medical images:", error);
        return [];
      }
    },
    enabled: !!user, // Only fetch when user is authenticated
  });

  // Filter medical images for patient users to show only their own imaging
  const medicalImages = useMemo(() => {
    if (!medicalImagesRaw) return [];
    
    // For patient users, filter by patient ID
    if (user?.role === "patient" && currentPatient) {
      return medicalImagesRaw.filter((image: any) => {
        // Use currentPatient.patientId to match with image.patientId
        return String(image.patientId) === String(currentPatient.patientId);
      });
    }
    
    // For non-patient users, show all images
    return medicalImagesRaw;
  }, [medicalImagesRaw, user?.role, currentPatient]);

  // Derive selectedStudy from React Query cache (single source of truth)
  const selectedStudy = useMemo<ImagingStudy | null>(() => {
    if (!selectedStudyId) return null;
    const study = medicalImages.find(
      (img: any) => img.id?.toString() === selectedStudyId,
    );
    if (!study) return null;

    console.log('📷 FRONTEND: Raw study data from API:', { id: study.id, imageId: study.imageId, fileName: study.fileName, file_name: study.file_name });
    const mapped: ImagingStudy = {
      id: String(study.id),
      imageId: study.imageId, // Include imageId from medical_images table for PDF naming
      patientId: String(study.patientId),
      patientName: study.patientName ?? "Unknown",
      studyType: study.studyType ?? study.imageType ?? "Unknown",
      modality: (study.modality ?? "X-Ray") as ImagingStudy["modality"],
      bodyPart: study.bodyPart ?? "Not specified",
      orderedBy: study.uploadedByName ?? "Unknown",
      orderedAt: study.createdAt,
      scheduledAt: study.scheduledAt,
      performedAt: study.performedAt,
      status: study.status === "uploaded" ? "completed" : (study.status as ImagingStudy["status"]),
      priority: (study.priority ?? "routine") as ImagingStudy["priority"],
      indication: study.indication ?? "No indication provided",
      findings: study.findings ?? `Medical image uploaded: ${study.fileName || study.file_name}`,
      impression:
        study.impression ??
        `File: ${study.fileName || study.file_name} (${(study.fileSize / (1024 * 1024)).toFixed(2)} MB)`,
      radiologist: study.radiologist ?? study.uploadedByName ?? "Unknown",
      fileName: study.fileName || study.file_name, // Add fileName from medical_images table for PDF generation
      reportFileName: study.reportFileName,
      reportFilePath: study.reportFilePath,
      images: [
        {
          id: String(study.id),
          type: study.mimeType?.includes("jpeg") ? "JPEG" : "DICOM",
          seriesDescription: `${study.modality} ${study.bodyPart}`,
          imageCount: 1,
          size: `${(study.fileSize / (1024 * 1024)).toFixed(2)} MB`,
          imageData: study.imageData,
          mimeType: study.mimeType,
          fileName: study.fileName || study.file_name,
        },
      ],
      ...(study.report && { report: study.report }),
    };
    return mapped;
  }, [medicalImages, selectedStudyId]);

  // Check if report file exists on the server
  useEffect(() => {
    const checkReportFileExists = async () => {
      if (selectedStudy?.reportFilePath) {
        const fileName = selectedStudy.reportFilePath.split('/').pop() || '';
        const reportId = fileName.replace(".pdf", "");
        try {
          const response = await fetch(`/api/imaging/reports/${reportId}`, {
            method: "HEAD",
            headers: {
              "X-Tenant-Subdomain": getActiveSubdomain() || "demo",
            },
          });
          
          if (response.status === 404) {
            setNonExistentReports(prev => new Set(prev).add(selectedStudy.id));
          } else if (response.ok) {
            setNonExistentReports(prev => {
              const newSet = new Set(prev);
              newSet.delete(selectedStudy.id);
              return newSet;
            });
          }
        } catch (error) {
          console.error("Error checking report file:", error);
        }
      } else if (selectedStudy?.id) {
        // If reportFilePath is null/undefined, clear from nonExistentReports
        setNonExistentReports(prev => {
          const newSet = new Set(prev);
          newSet.delete(selectedStudy.id);
          return newSet;
        });
      }
    };
    
    checkReportFileExists();
  }, [selectedStudy?.id, selectedStudy?.reportFilePath, toast]);

  // Individual field update mutations
  const updateFieldMutation = useMutation({
    mutationFn: async ({
      studyId,
      fieldName,
      value,
    }: {
      studyId: string;
      fieldName: string;
      value: string;
    }) => {
      const response = await apiRequest(
        "PATCH",
        `/api/medical-images/${studyId}`,
        {
          [fieldName]: value,
        },
      );
      return response.json();
    },
    onMutate: async (variables) => {
      // Set saving state
      setSaving((prev) => ({
        ...prev,
        [variables.fieldName]: true,
      }));
    },
    onError: (error, variables) => {
      toast({
        title: "Error updating record",
        description:
          error.message || "Failed to update record. Please try again.",
        variant: "destructive",
      });
    },
    onSuccess: async (data, variables) => {
      // ✨ KEY: Update local form state immediately (patients.tsx pattern)
      if (variables.fieldName === "findings")
        setReportFindings(variables.value);
      if (variables.fieldName === "impression")
        setReportImpression(variables.value);
      if (variables.fieldName === "radiologist")
        setReportRadiologist(variables.value);

      // Exit edit mode immediately
      setEditModes((prev) => ({
        ...prev,
        [variables.fieldName]: false,
      }));

      // Force refresh medical images data immediately
      await refetchImages();

      // Invalidate all related queries to refresh data across the app
      await queryClient.invalidateQueries({
        queryKey: ["/api/medical-images"],
      });

      // Auto-refresh patient records when medical images are updated
      if (selectedStudy?.patientId) {
        await queryClient.invalidateQueries({
          queryKey: ["/api/patients", selectedStudy.patientId, "records"],
        });
        await queryClient.invalidateQueries({ queryKey: ["/api/patients"] }); // Main patient list
        await queryClient.invalidateQueries({
          queryKey: ["/api/patients", selectedStudy.patientId, "history"],
        });
      }

      toast({
        title: "Record Updated",
        description: `${variables.fieldName.charAt(0).toUpperCase() + variables.fieldName.slice(1)} has been successfully updated.`,
      });
    },
    onSettled: (data, error, variables) => {
      // Clear saving state
      setSaving((prev) => ({
        ...prev,
        [variables.fieldName]: false,
      }));
    },
  });

  // Date field update mutations with optimistic updates
  const updateDateMutation = useMutation({
    mutationFn: async ({
      studyId,
      fieldName,
      value,
    }: {
      studyId: string;
      fieldName: string;
      value: string;
    }) => {
      const response = await apiRequest(
        "PATCH",
        `/api/medical-images/${studyId}`,
        {
          [fieldName]: value,
        },
      );
      return response.json();
    },
    onMutate: async (variables) => {
      // Set saving state
      setSaving((prev) => ({
        ...prev,
        [variables.fieldName]: true,
      }));
    },
    onError: (error, variables) => {
      toast({
        title: "Error updating record",
        description:
          error.message || "Failed to update record. Please try again.",
        variant: "destructive",
      });
    },
    onSuccess: async (data, variables) => {
      // ✨ KEY: Exit edit mode immediately (patients.tsx pattern)
      setEditModes((prev) => ({
        ...prev,
        [variables.fieldName]: false,
      }));

      // Force refresh medical images data immediately
      await refetchImages();

      // Invalidate all related queries to refresh data across the app
      await queryClient.invalidateQueries({
        queryKey: ["/api/medical-images"],
      });

      // Auto-refresh patient records when medical images are updated
      if (selectedStudy?.patientId) {
        await queryClient.invalidateQueries({
          queryKey: ["/api/patients", selectedStudy.patientId, "records"],
        });
        await queryClient.invalidateQueries({ queryKey: ["/api/patients"] }); // Main patient list
        await queryClient.invalidateQueries({
          queryKey: ["/api/patients", selectedStudy.patientId, "history"],
        });
      }

      // Create appropriate success message based on field type
      let title = "Record Updated";
      let description = "";

      if (variables.fieldName === "scheduledAt") {
        title = "Scheduled Date Updated";
        description = "Scheduled date has been successfully updated.";
      } else if (variables.fieldName === "performedAt") {
        title = "Performed Date Updated";
        description = "Performed date has been successfully updated.";
      } else if (variables.fieldName === "status") {
        title = "Status Updated";
        description = "Status has been successfully updated.";
      } else if (variables.fieldName === "priority") {
        title = "Priority Updated";
        description = "Priority has been successfully updated.";
      } else {
        description = `${variables.fieldName.charAt(0).toUpperCase() + variables.fieldName.slice(1)} has been successfully updated.`;
      }

      toast({
        title,
        description,
      });
    },
    onSettled: (data, error, variables) => {
      // Clear saving state
      setSaving((prev) => ({
        ...prev,
        [variables.fieldName]: false,
      }));
    },
  });

  // File replacement mutation for editing images
  const replaceImageMutation = useMutation({
    mutationFn: async ({ studyId, file }: { studyId: string; file: File }) => {
      const formData = new FormData();
      formData.append('file', file);
      
      // Manual fetch to handle FormData properly (apiRequest doesn't work with FormData)
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'X-Tenant-Subdomain': getActiveSubdomain()
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`/api/medical-images/${studyId}/replace`, {
        method: 'PUT',
        headers,
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.status}: ${errorText}`);
      }
      
      return response.json();
    },
    onSuccess: async () => {
      // Refresh the medical images to get updated data
      await refetchImages();
      
      // Invalidate all related queries to refresh data across the app
      await queryClient.invalidateQueries({
        queryKey: ["/api/medical-images"],
      });
      
      setShowEditImageDialog(false);
      setSelectedFiles([]);
      setUploadedFile(null);
      setEditingStudyId(null);
      
      toast({
        title: "Image Updated Successfully",
        description: "The medical image has been replaced with the new file.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Updating Image",
        description: error.message || "Failed to replace the image. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Helper functions for individual field editing
  const handleFieldEdit = (
    fieldName:
      | "findings"
      | "impression"
      | "radiologist"
      | "scheduledAt"
      | "performedAt"
      | "status"
      | "priority",
  ) => {
    setEditModes((prev) => ({
      ...prev,
      [fieldName]: true,
    }));

    // Initialize date states when entering edit mode
    if (selectedStudy) {
      if (fieldName === "scheduledAt") {
        const date = selectedStudy.scheduledAt
          ? new Date(selectedStudy.scheduledAt)
          : undefined;
        setScheduledDate(date);
        if (date) {
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          setScheduledTime(`${hours}:${minutes}`);
        } else {
          setScheduledTime("");
        }
      }
      if (fieldName === "performedAt") {
        const date = selectedStudy.performedAt
          ? new Date(selectedStudy.performedAt)
          : undefined;
        setPerformedDate(date);
        if (date) {
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          setPerformedTime(`${hours}:${minutes}`);
        } else {
          setPerformedTime("");
        }
      }
      if (fieldName === "status")
        setEditingStatus(selectedStudy.status || "ordered");
      if (fieldName === "priority")
        setEditingPriority(selectedStudy.priority || "routine");
    }
  };

  const handleFieldCancel = (
    fieldName:
      | "findings"
      | "impression"
      | "radiologist"
      | "scheduledAt"
      | "performedAt"
      | "status"
      | "priority",
  ) => {
    setEditModes((prev) => ({
      ...prev,
      [fieldName]: false,
    }));

    // Reset field to original value
    if (selectedStudy) {
      if (fieldName === "findings")
        setReportFindings(selectedStudy.findings || "");
      if (fieldName === "impression")
        setReportImpression(selectedStudy.impression || "");
      if (fieldName === "radiologist")
        setReportRadiologist(selectedStudy.radiologist || "Dr. Michael Chen");
      if (fieldName === "scheduledAt") {
        const date = selectedStudy.scheduledAt
          ? new Date(selectedStudy.scheduledAt)
          : undefined;
        setScheduledDate(date);
        if (date) {
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          setScheduledTime(`${hours}:${minutes}`);
        } else {
          setScheduledTime("");
        }
      }
      if (fieldName === "performedAt") {
        const date = selectedStudy.performedAt
          ? new Date(selectedStudy.performedAt)
          : undefined;
        setPerformedDate(date);
        if (date) {
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          setPerformedTime(`${hours}:${minutes}`);
        } else {
          setPerformedTime("");
        }
      }
      if (fieldName === "status")
        setEditingStatus(selectedStudy.status || "ordered");
      if (fieldName === "priority")
        setEditingPriority(selectedStudy.priority || "routine");
    }
  };

  const handleFieldSave = (
    fieldName:
      | "findings"
      | "impression"
      | "radiologist"
      | "scheduledAt"
      | "performedAt"
      | "status"
      | "priority",
  ) => {
    if (!selectedStudy) return;

    let value = "";
    if (fieldName === "findings") value = reportFindings;
    if (fieldName === "impression") value = reportImpression;
    if (fieldName === "radiologist") value = reportRadiologist;
    if (fieldName === "scheduledAt") {
      if (scheduledDate) {
        const combinedDate = new Date(scheduledDate);
        if (scheduledTime) {
          const [hours, minutes] = scheduledTime.split(':');
          combinedDate.setHours(parseInt(hours), parseInt(minutes));
        }
        value = combinedDate.toISOString();
      } else {
        value = "";
      }
    }
    if (fieldName === "performedAt") {
      if (performedDate) {
        const combinedDate = new Date(performedDate);
        if (performedTime) {
          const [hours, minutes] = performedTime.split(':');
          combinedDate.setHours(parseInt(hours), parseInt(minutes));
        }
        value = combinedDate.toISOString();
      } else {
        value = "";
      }
    }
    if (fieldName === "status") value = editingStatus;
    if (fieldName === "priority") value = editingPriority;

    if (
      fieldName === "scheduledAt" ||
      fieldName === "performedAt" ||
      fieldName === "status" ||
      fieldName === "priority"
    ) {
      updateDateMutation.mutate({
        studyId: selectedStudy.id,
        fieldName,
        value,
      });
    } else {
      updateFieldMutation.mutate({
        studyId: selectedStudy.id,
        fieldName,
        value,
      });
    }
  };

  // Fetch patients using the exact working pattern from prescriptions
  const fetchPatients = async () => {
    try {
      setPatientsLoading(true);
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {
        "X-Tenant-Subdomain": getActiveSubdomain(),
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch("/api/patients", {
        headers,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      // Remove duplicates based on patient ID
      const uniquePatients = data
        ? data.filter(
            (patient: any, index: number, self: any[]) =>
              index === self.findIndex((p: any) => p.id === patient.id),
          )
        : [];
      setPatients(uniquePatients);
    } catch (err) {
      console.error("Error fetching patients:", err);
      setPatients([]);
    } finally {
      setPatientsLoading(false);
    }
  };

  useEffect(() => {
    if (showNewOrder || showUploadDialog) {
      fetchPatients();
      
      // Pre-populate patient ID for patient users
      if (user?.role === "patient" && currentPatient) {
        setOrderFormData(prev => ({
          ...prev,
          patientId: currentPatient.id.toString()
        }));
        setUploadFormData(prev => ({
          ...prev,
          patientId: currentPatient.id.toString()
        }));
      }
    }
  }, [showNewOrder, showUploadDialog, user?.role, currentPatient]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const fileList = Array.from(files);
      setSelectedFiles(fileList);
    }
  };

  const handleUploadSubmit = async () => {
    if (
      !uploadFormData.patientId ||
      !uploadFormData.studyType
    ) {
      toast({
        title: "Upload Failed",
        description:
          "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      // Find the selected patient to get the numeric ID and patientId (string)
      const selectedPatient = patients.find(
        (p) => p.id.toString() === uploadFormData.patientId,
      );
      if (!selectedPatient) {
        toast({
          title: "Upload Failed",
          description: "Selected patient not found",
          variant: "destructive",
        });
        return;
      }

      console.log('📷 CLIENT: Selected patient for unique naming:', {
        id: selectedPatient.id,
        patientId: selectedPatient.patientId,
        name: `${selectedPatient.firstName} ${selectedPatient.lastName}`
      });

      // Upload files OR create order record
      if (selectedFiles.length > 0) {
        // Create FormData for multipart upload
        const formData = new FormData();
        
        // Add form data fields
        formData.append('patientId', selectedPatient.id.toString()); // Use numeric ID for database
        formData.append('imageType', uploadFormData.studyType);
        formData.append('bodyPart', uploadFormData.bodyPart || "Not specified");
        formData.append('notes', uploadFormData.indication || "");
        formData.append('modality', uploadFormData.modality);
        formData.append('priority', uploadFormData.priority);
        formData.append('studyType', uploadFormData.studyType);
        formData.append('indication', uploadFormData.indication || "");

        // Add all files to FormData
        selectedFiles.forEach((file, index) => {
          formData.append('images', file);
          console.log(`📷 CLIENT: Adding file ${index + 1}:`, {
            originalName: file.name,
            size: file.size,
            type: file.type,
            patientForUniqueName: selectedPatient.patientId
          });
        });

        console.log('📷 CLIENT: Uploading to /api/medical-images/upload with unique naming');

        // Upload using fetch to handle FormData properly with authentication
        const token = localStorage.getItem('auth_token');
        const headers: Record<string, string> = {
          'X-Tenant-Subdomain': getActiveSubdomain()
        };
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch('/api/medical-images/upload', {
          method: 'POST',
          body: formData,
          headers,
          credentials: "include",
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Upload failed');
        }

        const result = await response.json();
        console.log('📷 CLIENT: Upload successful:', result);

        const totalSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);
        const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(1);

        // Store uploaded image data for invoice
        setUploadedImageData({
          ...uploadFormData,
          selectedPatient,
          uploadedFiles: selectedFiles,
          totalSizeMB,
          uploadResult: result,
        });
      } else {
        // No files selected - create order record without files
        console.log('📷 CLIENT: Creating medical image order without files');
        
        const imageData = {
          patientId: selectedPatient.id,
          imageType: uploadFormData.studyType,
          studyType: uploadFormData.studyType,
          modality: uploadFormData.modality,
          bodyPart: uploadFormData.bodyPart || "Not specified",
          indication: uploadFormData.indication || "",
          priority: uploadFormData.priority,
          notes: uploadFormData.indication || "",
          filename: `ORDER-${Date.now()}.pending`,
          fileUrl: null,
          fileSize: 0,
          uploadedBy: user?.id || 0,
          status: "ordered"
        };

        const response = await apiRequest("POST", "/api/medical-images", imageData);
        const result = await response.json();
        console.log('📷 CLIENT: Medical image order created:', result);

        // Store order data for invoice
        setUploadedImageData({
          ...uploadFormData,
          selectedPatient,
          uploadedFiles: [],
          totalSizeMB: '0',
          uploadResult: result,
        });
      }

      // Close upload dialog and open invoice dialog
      setShowUploadDialog(false);
      
      // Fetch pricing from imaging_pricing table based on selected study type
      const pricingData = imagingPricing.find((p: any) => 
        p.imagingType === uploadFormData.studyType
      );
      
      const unitPrice = pricingData ? parseFloat(pricingData.basePrice) : 50.00;
      const subtotal = unitPrice; // Single study
      const tax = subtotal * 0.2; // 20% VAT
      const totalAmount = subtotal + tax;
      
      // Pre-populate invoice fields
      setInvoicePatient(selectedPatient.patientId || "");
      setInvoiceServiceDate(new Date().toISOString().split('T')[0]);
      setInvoiceServiceCode(pricingData?.imagingCode || "IMG-001");
      setInvoiceServiceDesc("Medical Imaging - " + uploadFormData.studyType);
      setInvoiceServiceQty("1");
      setInvoiceServiceAmount(unitPrice.toFixed(2));
      setInvoiceTotalAmount(totalAmount.toFixed(2));
      setInvoiceNotes(`Imaging study: ${uploadFormData.studyType}, Modality: ${uploadFormData.modality}, Body Part: ${uploadFormData.bodyPart}`);
      
      setInvoiceFormData({
        paymentMethod: "",
        subtotal,
        tax,
        discount: 0,
        totalAmount,
      });
      
      setShowInvoiceDialog(true);
    } catch (error) {
      console.error("📷 CLIENT: Upload error:", error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload images. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleOrderSubmit = async () => {
    if (
      !orderFormData.patientId ||
      !orderFormData.studyType ||
      !orderFormData.modality ||
      !orderFormData.bodyPart
    ) {
      toast({
        title: "Order Failed",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Store data and open upload dialog instead
    const selectedPatient = patients.find(
      (p) => p.id.toString() === orderFormData.patientId,
    );
    
    if (!selectedPatient) {
      toast({
        title: "Order Failed",
        description: "Selected patient not found",
        variant: "destructive",
      });
      return;
    }

    // Transfer data to upload form
    setUploadFormData({
      patientId: orderFormData.patientId,
      studyType: orderFormData.studyType,
      modality: orderFormData.modality,
      bodyPart: orderFormData.bodyPart,
      indication: orderFormData.indication,
      priority: orderFormData.priority,
    });

    // Close order dialog and open upload dialog
    setShowNewOrder(false);
    setShowUploadDialog(true);
  };

  const handleViewStudy = (study: ImagingStudy) => {
    setSelectedStudyId(study.id);
    setShowViewDialog(true);
  };

  const handleDownloadStudy = (studyId: string) => {
    const study = ((studies as any) || []).find((s: any) => s.id === studyId);
    if (study) {
      toast({
        title: "Download Study",
        description: `DICOM images for ${study.patientName} downloaded successfully`,
      });

      // Simulate DICOM download
      const blob = new Blob(
        [
          `DICOM Study Report\n\nPatient: ${study.patientName}\nStudy: ${study.studyType}\nModality: ${study.modality}\nDate: ${new Date(study.orderedAt).toLocaleDateString()}\n\nImages: ${study.images?.length || 0} series available`,
        ],
        { type: "text/plain" },
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dicom-study-${study.patientName.replace(" ", "-").toLowerCase()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleShareStudy = (study: ImagingStudy) => {
    setSelectedStudyId(study.id);
    setShowShareDialog(true);
    setShareFormData({
      method: "",
      email: "",
      whatsapp: "",
      message: `Imaging study results for ${study.studyType} are now available for review.`,
    });
  };

  const handleGenerateReport = (studyId: string) => {
    const study = ((studies as any) || []).find((s: any) => s.id === studyId);
    if (study) {
      setSelectedStudyId(study.id);
      setReportFindings(study.findings || "");
      setReportImpression(study.impression || "");
      setReportRadiologist(study.radiologist || "Dr. Michael Chen");
      setShowReportDialog(true);
    }
  };

  const handleEditImage = (studyId: string) => {
    setEditingStudyId(studyId);
    setSelectedFiles([]);
    setShowEditImageDialog(true);
  };

  const handleReplaceImage = () => {
    if (selectedFiles.length > 0) {
      // Just upload/preview the file, don't save yet
      setUploadedFile(selectedFiles[0]);
    }
  };

  const handleSaveImage = () => {
    if (editingStudyId && uploadedFile) {
      replaceImageMutation.mutate({
        studyId: editingStudyId,
        file: uploadedFile,
      });
    }
  };

  const generatePDFReport = async (study: any) => {
    try {
      setIsGeneratingPDF(true);
      setGeneratedReportId(null);

      console.log("📷 IMAGING: Generating PDF with fileName:", study.fileName);

      // Upload selected images first if any
      if (selectedFiles.length > 0) {
        try {
          const formData = new FormData();
          
          // Add patient and study information
          formData.append('patientId', study.patientId);
          formData.append('studyType', study.studyType);
          formData.append('modality', study.modality || '');
          formData.append('bodyPart', study.bodyPart || '');
          formData.append('indication', study.indication || '');

          // Add all files to FormData
          selectedFiles.forEach((file, index) => {
            formData.append('images', file);
            console.log(`📷 CLIENT: Adding file ${index + 1}:`, {
              originalName: file.name,
              type: file.type,
              size: file.size
            });
          });

          console.log(`📷 CLIENT: Uploading ${selectedFiles.length} file(s) for report generation`);

          // Upload images to server
          const uploadResponse = await fetch('/api/medical-images/upload', {
            method: 'POST',
            body: formData,
            headers: {
              'X-Tenant-Subdomain': getActiveSubdomain(),
            },
            credentials: 'include',
          });

          if (!uploadResponse.ok) {
            throw new Error('Failed to upload images');
          }

          const uploadResult = await uploadResponse.json();
          console.log('📷 CLIENT: Images uploaded successfully:', uploadResult);

          toast({
            title: "Images Uploaded",
            description: `${selectedFiles.length} image(s) uploaded successfully`,
          });

          // Clear selected files after successful upload
          setSelectedFiles([]);
        } catch (uploadError) {
          console.error('Error uploading images:', uploadError);
          toast({
            title: "Image Upload Failed",
            description: "Failed to upload images. Continuing with report generation.",
            variant: "destructive",
          });
        }
      }

      // Call server-side PDF generation endpoint with fileName
      const response = await apiRequest(
        "POST",
        "/api/imaging/generate-report",
        {
          study,
          reportFormData: {
            findings: reportFindings,
            impression: reportImpression,
            radiologist: reportRadiologist,
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to generate PDF report");
      }

      const data = await response.json();

      if (data.success && data.reportId) {
        setGeneratedReportId(data.reportId);
        setGeneratedReportFileName(data.fileName || `${data.reportId}.pdf`);

        // Refresh the medical images to get updated data
        refetchImages();

        toast({
          title: "PDF Report Generated Successfully",
          description: `Report saved as: ${data.fileName || `${data.reportId}.pdf`}`,
        });

        // Reset the button state after a brief delay to show "Generate Report" button again
        setTimeout(() => {
          setGeneratedReportId(null);
          setGeneratedReportFileName(null);
        }, 2000);
      } else {
        throw new Error("Failed to generate PDF report");
      }
    } catch (error) {
      console.error("PDF generation error:", error);
      toast({
        title: "Report Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate PDF report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const viewPDFReport = async (reportId: string) => {
    try {
      // Request a temporary signed URL from the backend
      const response = await apiRequest("GET", `/api/imaging-files/${reportId}/signed-url`);
      
      if (!response.ok) {
        let errorMessage = "Failed to generate signed URL";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const { signedUrl } = await response.json();
      
      console.log("📄 Signed URL received for imaging report:", reportId);
      
      // Open PDF in new tab using the signed URL
      window.open(signedUrl, '_blank');
      
      toast({
        title: "Opening Report",
        description: "PDF report is opening in a new tab",
      });
    } catch (error) {
      console.error("Error viewing PDF:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to open PDF report. Please try again.",
        variant: "destructive",
      });
    }
  };

  const downloadPDFReport = async (reportId: string) => {
    try {
      // Prepare authentication headers
      const headers: Record<string, string> = {
        "X-Tenant-Subdomain": getActiveSubdomain(),
      };

      // Add authorization token if available
      const token = localStorage.getItem("auth_token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // Fetch PDF with authentication
      const response = await fetch(`/api/imaging/reports/${reportId}?download=true`, {
        method: "GET", 
        headers,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to download PDF: ${response.status} ${response.statusText}`);
      }

      // Convert response to blob
      const blob = await response.blob();
      
      // Create download link
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `radiology-report-${reportId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Clean up blob URL
      URL.revokeObjectURL(blobUrl);

      toast({
        title: "PDF Report Downloaded",
        description: "Radiology report PDF has been downloaded successfully",
      });
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast({
        title: "Error",
        description: "Failed to download PDF report. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteStudy = async (studyId: string) => {
    const study = ((studies as any) || []).find((s: any) => s.id === studyId);
    if (!study) return;

    // Show confirmation modal instead of window.confirm
    setStudyToDelete(study);
    setShowDeleteDialog(true);
  };

  const confirmDeleteStudy = async () => {
    if (!studyToDelete) return;

    try {
      // Call API to delete the study with files
      const response = await apiRequest('DELETE', `/api/medical-images/${studyToDelete.id}`);
      
      if (!response.ok) {
        throw new Error('Failed to delete study');
      }

      // Add the study ID to the deleted set to remove it from the display
      setDeletedStudyIds((prev) => new Set([...prev, studyToDelete.id]));

      // Refresh the medical images list
      refetchImages();

      toast({
        title: "Study Deleted",
        description: `${studyToDelete.studyType} study for ${studyToDelete.patientName} has been deleted successfully`,
      });

      // Close modal
      setShowDeleteDialog(false);
      setStudyToDelete(null);
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete the imaging study. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Transform medical images data to match ImagingStudy format
  let studies: any[] = [];

  if (medicalImages && Array.isArray(medicalImages)) {
    studies = medicalImages.map((image: any) => ({
      id: image.id.toString(),
      patientId: image.patientId,
      patientName: image.patientName,
      studyType: image.studyType,
      modality: image.modality,
      bodyPart: image.bodyPart || "Not specified",
      orderedBy: image.uploadedByName || "Unknown",
      orderedAt: image.createdAt,
      scheduledAt: image.scheduledAt,
      performedAt: image.performedAt,
      status: image.status === "uploaded" ? "completed" : image.status,
      priority: image.priority || "routine",
      indication: image.indication || "No indication provided",
      findings: image.findings || `Medical image uploaded: ${image.fileName}`,
      impression:
        image.impression ||
        `File: ${image.fileName} (${(image.fileSize / (1024 * 1024)).toFixed(2)} MB)`,
      radiologist: image.radiologist || image.uploadedByName || "Unknown",
      fileName: image.fileName, // Include image file name for PDF generation
      reportFileName: image.reportFileName, // Include PDF report file name
      reportFilePath: image.reportFilePath, // Include PDF report file path
      images: [
        {
          id: image.id.toString(),
          type: image.mimeType?.includes("jpeg") ? "JPEG" : "DICOM",
          seriesDescription: `${image.modality} ${image.bodyPart}`,
          imageCount: 1,
          size: `${(image.fileSize / (1024 * 1024)).toFixed(2)} MB`,
          imageData: image.imageData, // Include the base64 image data
          mimeType: image.mimeType, // Include the MIME type
        },
      ],
    }));
  }

  const filteredStudies = ((studies as any) || []).filter((study: any) => {
    // First check if this study has been deleted
    if (deletedStudyIds.has(study.id)) {
      return false;
    }

    const matchesSearch =
      !searchQuery ||
      study.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      study.studyType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      study.bodyPart.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || study.status === statusFilter;
    const matchesModality =
      modalityFilter === "all" || study.modality === modalityFilter;

    return matchesSearch && matchesStatus && matchesModality;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "final":
        return "bg-green-100 text-green-800";
      case "preliminary":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "in_progress":
        return "bg-purple-100 text-purple-800";
      case "scheduled":
        return "bg-cyan-100 text-cyan-800";
      case "ordered":
        return "bg-gray-100 text-gray-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "stat":
        return "bg-red-100 text-red-800";
      case "urgent":
        return "bg-orange-100 text-orange-800";
      case "routine":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getModalityIcon = (modality: string) => {
    switch (modality) {
      case "X-Ray":
        return <Camera className="h-4 w-4" />;
      case "CT":
        return <Monitor className="h-4 w-4" />;
      case "MRI":
        return <Zap className="h-4 w-4" />;
      case "Ultrasound":
        return <FileImage className="h-4 w-4" />;
      default:
        return <FileImage className="h-4 w-4" />;
    }
  };

  if (imagesLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <Card
            key={i}
            className="bg-white dark:bg-slate-800 border dark:border-slate-600"
          >
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 dark:bg-slate-600 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 dark:bg-slate-600 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 dark:bg-slate-600 rounded w-1/2"></div>
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
        title="Medical Imaging"
        subtitle="View and manage radiology studies and reports"
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      In Process Reports
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {studies.filter((study: any) => study.status === "in_progress").length}
                    </p>
                  </div>
                  <FileText className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      Today's Studies
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {medicalImages.filter((image: any) => {
                        const createdDate = new Date(image.createdAt);
                        const today = new Date();
                        return createdDate.toDateString() === today.toDateString();
                      }).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      Completed Studies
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {studies.filter((study: any) => study.status === "completed").length}
                    </p>
                  </div>
                  <Zap className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      This Month
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {medicalImages.filter((image: any) => {
                        const createdDate = new Date(image.createdAt);
                        const today = new Date();
                        return createdDate.getMonth() === today.getMonth() && 
                               createdDate.getFullYear() === today.getFullYear();
                      }).length}
                    </p>
                  </div>
                  <FileImage className="h-8 w-8 text-green-600" />
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
                    placeholder="Search imaging studies..."
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
                    <SelectItem value="ordered">Ordered</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="preliminary">Preliminary</SelectItem>
                    <SelectItem value="final">Final</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={modalityFilter}
                  onValueChange={setModalityFilter}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by modality" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Modalities</SelectItem>
                    <SelectItem value="X-Ray">X-Ray</SelectItem>
                    <SelectItem value="CT">CT Scan</SelectItem>
                    <SelectItem value="MRI">MRI</SelectItem>
                    <SelectItem value="Ultrasound">Ultrasound</SelectItem>
                    <SelectItem value="Nuclear Medicine">
                      Nuclear Medicine
                    </SelectItem>
                    <SelectItem value="Mammography">Mammography</SelectItem>
                  </SelectContent>
                </Select>

                {/* View Mode Toggle */}
                <div className="flex gap-1 border rounded-lg p-1">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    className="h-8 w-8 p-0"
                    data-testid="button-view-grid"
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                    className="h-8 w-8 p-0"
                    data-testid="button-view-list"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>

                <div className="">
                  {user?.role !== "patient" && (
                    <Button
                      onClick={() => setShowUploadDialog(true)}
                      className="bg-medical-blue hover:bg-blue-700 text-white ml-auto"
                    >
                      <Share className="h-4 w-4 mr-2" />
                      Order Study
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Imaging Studies List */}
          <div className="space-y-4">
            {viewMode === "list" ? (
              /* List View - Table Format */
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Image ID
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Patient Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Study Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Modality
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Body Part
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Indication
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            File Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            File Size
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Radiologist
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Scheduled
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Performed
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Created
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Priority
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-card divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredStudies.map((study: any) => (
                          <tr
                            key={study.id}
                            className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            data-testid={`row-imaging-${study.id}`}
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                              {study.imageId || study.id}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                              {study.patientName}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                              {study.studyType || "N/A"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                              <div className="flex items-center gap-2">
                                {getModalityIcon(study.modality)}
                                {study.modality}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                              {study.bodyPart || "N/A"}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                              {study.indication || "N/A"}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                              {study.fileName || "N/A"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {study.fileSize ? `${(study.fileSize / 1024).toFixed(2)} KB` : "N/A"}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                              {study.radiologist || "N/A"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {study.scheduledAt ? format(new Date(study.scheduledAt), "MMM dd, yyyy") : "N/A"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {study.performedAt ? format(new Date(study.performedAt), "MMM dd, yyyy") : "N/A"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {study.createdAt ? format(new Date(study.createdAt), "MMM dd, yyyy") : "N/A"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <Badge
                                variant={study.priority === "stat" || study.priority === "urgent" ? "destructive" : "secondary"}
                                className="text-xs"
                              >
                                {study.priority || "routine"}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {selectedStudyId === study.id && editModes.status ? (
                                <div className="flex items-center gap-2">
                                  <Select
                                    value={editingStatus}
                                    onValueChange={setEditingStatus}
                                  >
                                    <SelectTrigger className="w-32 h-8">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="ordered">Ordered</SelectItem>
                                      <SelectItem value="scheduled">Scheduled</SelectItem>
                                      <SelectItem value="in_progress">In Progress</SelectItem>
                                      <SelectItem value="completed">Completed</SelectItem>
                                      <SelectItem value="final">Final</SelectItem>
                                      <SelectItem value="preliminary">Preliminary</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleFieldSave("status")}
                                    disabled={saving.status}
                                    className="h-8 px-2 text-xs"
                                    data-testid="button-save-status"
                                  >
                                    {saving.status ? "..." : "Save"}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleFieldCancel("status")}
                                    disabled={saving.status}
                                    className="h-8 px-2 text-xs"
                                    data-testid="button-cancel-status"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <Badge className={getStatusColor(study.status)}>
                                    {study.status}
                                  </Badge>
                                  {user?.role !== 'patient' && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedStudyId(study.id);
                                        handleFieldEdit("status");
                                      }}
                                      className="h-6 w-6 p-0"
                                      data-testid={`button-edit-status-${study.id}`}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewStudy(study)}
                                  className="h-8 w-8 p-0"
                                  data-testid={`button-view-${study.id}`}
                                >
                                  <Eye className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                </Button>
                                {user?.role !== 'patient' && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleViewStudy(study)}
                                      className="h-8 w-8 p-0"
                                      data-testid={`button-edit-${study.id}`}
                                    >
                                      <Edit className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setStudyToDelete(study);
                                        setShowDeleteDialog(true);
                                      }}
                                      className="h-8 w-8 p-0"
                                      data-testid={`button-delete-${study.id}`}
                                    >
                                      <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                                    </Button>
                                  </>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDownloadStudy(study.id)}
                                  className="h-8 w-8 p-0"
                                  data-testid={`button-download-${study.id}`}
                                >
                                  <Download className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                </Button>
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
              filteredStudies.map((study: any) => (
              <Card
                key={study.id}
                className="hover:shadow-md transition-shadow bg-white dark:bg-slate-800 border dark:border-slate-600"
              >
                <CardContent className="p-6">
                  <div className="">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          {getModalityIcon(study.modality)}
                          <h3 className="text-md font-semibold text-gray-900 dark:text-gray-100">
                            {study.patientName}
                          </h3>
                        </div>
                        {/* Status Badge - Editable */}
                        {selectedStudyId === study.id && editModes.status ? (
                          <div className="flex items-center gap-2">
                            <Select
                              value={editingStatus}
                              onValueChange={setEditingStatus}
                            >
                              <SelectTrigger className="w-32 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ordered">Ordered</SelectItem>
                                <SelectItem value="scheduled">
                                  Scheduled
                                </SelectItem>
                                <SelectItem value="in_progress">
                                  In Progress
                                </SelectItem>
                                <SelectItem value="completed">
                                  Completed
                                </SelectItem>
                                <SelectItem value="final">Final</SelectItem>
                                <SelectItem value="preliminary">
                                  Preliminary
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleFieldSave("status")}
                              disabled={saving.status}
                              className="h-8 px-2 text-xs"
                              data-testid="button-save-status-header"
                            >
                              {saving.status ? "..." : "Save"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleFieldCancel("status")}
                              disabled={saving.status}
                              className="h-8 px-2 text-xs"
                              data-testid="button-cancel-status-header"
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(study.status)}>
                              {study.status}
                            </Badge>
                            {/* Hide Status Edit icon for patient role */}
                            {user?.role !== 'patient' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedStudyId(study.id);
                                  handleFieldEdit("status");
                                }}
                                className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-slate-600"
                                data-testid="button-edit-status-header"
                              >
                                <Edit className="h-3 w-3 text-gray-400" />
                              </Button>
                            )}
                          </div>
                        )}
                        {/* Priority Badge - Editable */}
                        {selectedStudyId === study.id && editModes.priority ? (
                          <div className="flex items-center gap-2">
                            <Select
                              value={editingPriority}
                              onValueChange={setEditingPriority}
                            >
                              <SelectTrigger className="w-32 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="routine">Routine</SelectItem>
                                <SelectItem value="urgent">Urgent</SelectItem>
                                <SelectItem value="stat">Stat</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleFieldSave("priority")}
                              disabled={saving.priority}
                              className="h-8 px-2 text-xs"
                              data-testid="button-save-priority-header"
                            >
                              {saving.priority ? "..." : "Save"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleFieldCancel("priority")}
                              disabled={saving.priority}
                              className="h-8 px-2 text-xs"
                              data-testid="button-cancel-priority-header"
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Badge className={getPriorityColor(study.priority)}>
                              {study.priority}
                            </Badge>
                            {/* Hide Priority Edit icon for patient role */}
                            {user?.role !== 'patient' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedStudyId(study.id);
                                  handleFieldEdit("priority");
                                }}
                                className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-slate-600"
                                data-testid="button-edit-priority-header"
                              >
                                <Edit className="h-3 w-3 text-gray-400" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                        <div>
                          <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">
                            Study Information
                          </h4>
                          <div className="space-y-1 text-sm text-gray-800 dark:text-gray-200">
                            <div>
                              <strong>Study:</strong> {study.studyType}
                            </div>
                            <div>
                              <strong>Modality:</strong> {study.modality}
                            </div>
                            <div>
                              <strong>Body Part:</strong> {study.bodyPart}
                            </div>
                            <div>
                              <strong>Ordered by:</strong> {study.orderedBy}
                            </div>
                            <div>
                              <strong>Indication:</strong> {study.indication}
                            </div>
                          </div>
                        </div>

                        {study.images && study.images.length > 0 && (
                          <div>
                            <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">
                              Image Series
                            </h4>
                            <div className="grid grid-cols-1 gap-2">
                              {study.images.map((series: any) => (
                                <div
                                  key={series.id}
                                  className="bg-gray-50 dark:bg-slate-600 p-3 rounded-lg border dark:border-slate-500 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-500 transition-colors"
                                  onClick={() => {
                                    // Use study.fileName since series.fileName might be null
                                    const fileName = series.fileName || study.fileName;
                                    const imageUrl = `/uploads/Imaging_Images/${fileName}`;
                                    console.log("📷 IMAGE SERIES: Viewing image from file_name:", fileName, "study.fileName:", study.fileName);
                                    setSelectedImageSeries({
                                      ...series,
                                      imageUrl: imageUrl,
                                      fileName: fileName
                                    });
                                    setShowImageViewer(true);
                                  }}
                                >
                                  <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                    {series.seriesDescription}
                                  </div>
                                  <div className="text-xs text-gray-600 dark:text-gray-300">
                                    {series.imageCount} images • {series.size} •{" "}
                                    {series.type}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <h4 className="font-semibold text-blue-900">
                            Timeline
                          </h4>
                          <div className="space-y-1 text-sm text-gray-800 dark:text-gray-200">
                            <div>
                              <strong>Ordered:</strong>{" "}
                              {format(
                                new Date(study.orderedAt),
                                "MMM d, yyyy HH:mm",
                              )}
                            </div>

                            {/* Scheduled Date - Editable */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span>
                                <strong>Scheduled:</strong>
                              </span>
                              {selectedStudy?.id === study.id &&
                              editModes.scheduledAt ? (
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className={`w-auto justify-start text-left font-normal ${
                                          !scheduledDate &&
                                          "text-muted-foreground"
                                        }`}
                                      >
                                        {scheduledDate ? (
                                          format(scheduledDate, "MMM d, yyyy")
                                        ) : (
                                          <span>Pick a date</span>
                                        )}
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                      <Calendar
                                        mode="single"
                                        selected={scheduledDate}
                                        onSelect={setScheduledDate}
                                        initialFocus
                                      />
                                    </PopoverContent>
                                  </Popover>
                                  <Input
                                    type="time"
                                    value={scheduledTime}
                                    onChange={(e) => setScheduledTime(e.target.value)}
                                    className="w-32 h-8"
                                    data-testid="input-scheduled-time"
                                  />
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      handleFieldSave("scheduledAt")
                                    }
                                    disabled={saving.scheduledAt}
                                    data-testid="button-save-scheduled-date"
                                  >
                                    {saving.scheduledAt ? "Saving..." : "Save"}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      handleFieldCancel("scheduledAt")
                                    }
                                    disabled={saving.scheduledAt}
                                    data-testid="button-cancel-scheduled-date"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span>
                                    {study.scheduledAt
                                      ? format(
                                          new Date(study.scheduledAt),
                                          "MMM d, yyyy HH:mm",
                                        )
                                      : "Not scheduled"}
                                  </span>
                                  {/* Hide Scheduled Date Edit icon for patient role */}
                                  {user?.role !== 'patient' && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedStudyId(study.id);
                                        handleFieldEdit("scheduledAt");
                                      }}
                                      className="h-6 w-6 p-0"
                                      data-testid="button-edit-scheduled-date"
                                    >
                                      <Edit className="h-3 w-3 text-gray-400" />
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Performed Date - Editable */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span>
                                <strong>Performed:</strong>
                              </span>
                              {selectedStudy?.id === study.id &&
                              editModes.performedAt ? (
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className={`w-auto justify-start text-left font-normal ${
                                          !performedDate &&
                                          "text-muted-foreground"
                                        }`}
                                      >
                                        {performedDate ? (
                                          format(performedDate, "MMM d, yyyy")
                                        ) : (
                                          <span>Pick a date</span>
                                        )}
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                      <Calendar
                                        mode="single"
                                        selected={performedDate}
                                        onSelect={setPerformedDate}
                                        initialFocus
                                      />
                                    </PopoverContent>
                                  </Popover>
                                  <Input
                                    type="time"
                                    value={performedTime}
                                    onChange={(e) => setPerformedTime(e.target.value)}
                                    className="w-32 h-8"
                                    data-testid="input-performed-time"
                                  />
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      handleFieldSave("performedAt")
                                    }
                                    disabled={saving.performedAt}
                                    data-testid="button-save-performed-date"
                                  >
                                    {saving.performedAt ? "Saving..." : "Save"}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      handleFieldCancel("performedAt")
                                    }
                                    disabled={saving.performedAt}
                                    data-testid="button-cancel-performed-date"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span>
                                    {study.performedAt
                                      ? format(
                                          new Date(study.performedAt),
                                          "MMM d, yyyy HH:mm",
                                        )
                                      : "Not performed"}
                                  </span>
                                  {/* Hide inline Edit icon for patient role */}
                                  {user?.role !== 'patient' && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedStudyId(study.id);
                                        handleFieldEdit("performedAt");
                                      }}
                                      className="h-6 w-6 p-0"
                                      data-testid="button-edit-performed-date"
                                    >
                                      <Edit className="h-3 w-3 text-gray-400" />
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>

                            {study.radiologist && (
                              <div>
                                <strong>Radiologist:</strong>{" "}
                                {study.radiologist}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {study.findings && (
                        <div className="bg-blue-50 dark:bg-slate-700 border-l-4 border-blue-400 dark:border-blue-500 p-5 pr-5 mb-4">
                          <h4 className="font-medium text-blue-700 dark:text-blue-300 text-md mb-1">
                            Findings
                          </h4>
                          <p className="text-sm text-blue-700 dark:text-blue-200">
                            {study.findings}
                          </p>
                          {study.impression && (
                            <>
                              <h4 className="font-medium text-blue-00 dark:text-blue-300 text-md mb-1 mt-2">
                                Impression
                              </h4>
                              <p className="text-sm text-blue-700 dark:text-blue-200">
                                {study.impression}
                              </p>
                            </>
                          )}
                        </div>
                      )}

                      {/* Patient-Specific Information Section */}
                      {user?.role === 'patient' && (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-600 border-l-4 border-indigo-400 dark:border-indigo-500 p-5 mb-4 rounded-r-lg">
                          <div className="flex items-center gap-2 mb-3">
                            <FileImage className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                            <h4 className="font-semibold text-indigo-800 dark:text-indigo-300 text-lg">
                              Your Medical Imaging Report
                            </h4>
                          </div>
                          
                          <div className="space-y-3 text-sm">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border">
                                  <h5 className="font-medium text-indigo-700 dark:text-indigo-300 mb-1">Study Details</h5>
                                  <div className="text-gray-700 dark:text-gray-300 space-y-1">
                                    <div><strong>Type:</strong> {study.studyType}</div>
                                    <div><strong>Area Examined:</strong> {study.bodyPart}</div>
                                    <div><strong>Method:</strong> {study.modality}</div>
                                  </div>
                                </div>
                                
                                <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border">
                                  <h5 className="font-medium text-indigo-700 dark:text-indigo-300 mb-1">Status</h5>
                                  <div className="flex items-center gap-2">
                                    <Badge className={getStatusColor(study.status)}>
                                      {study.status}
                                    </Badge>
                                    <span className="text-xs text-gray-600 dark:text-gray-400">
                                      {study.status === 'completed' ? 'Your scan is complete' : 
                                       study.status === 'final' ? 'Report is finalized' :
                                       study.status === 'preliminary' ? 'Initial report available' :
                                       'Scan in progress'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border">
                                  <h5 className="font-medium text-indigo-700 dark:text-indigo-300 mb-1">Timeline</h5>
                                  <div className="text-gray-700 dark:text-gray-300 space-y-1 text-xs">
                                    <div><strong>Ordered:</strong> {format(new Date(study.orderedAt), "MMM d, yyyy")}</div>
                                    {study.scheduledAt && (
                                      <div><strong>Scheduled:</strong> {format(new Date(study.scheduledAt), "MMM d, yyyy")}</div>
                                    )}
                                    {study.performedAt && (
                                      <div><strong>Performed:</strong> {format(new Date(study.performedAt), "MMM d, yyyy")}</div>
                                    )}
                                  </div>
                                </div>
                                
                                {study.radiologist && (
                                  <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border">
                                    <h5 className="font-medium text-indigo-700 dark:text-indigo-300 mb-1">Radiologist</h5>
                                    <div className="text-gray-700 dark:text-gray-300 text-xs">
                                      {study.radiologist}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {study.reportFileName && (
                              <div className="bg-green-50 dark:bg-slate-800 border border-green-200 dark:border-green-600 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <FileText className="h-4 w-4 text-green-600 dark:text-green-400" />
                                  <h5 className="font-medium text-green-800 dark:text-green-300">Report Available</h5>
                                </div>
                                <p className="text-green-700 dark:text-green-200 text-xs mb-3">
                                  Your detailed imaging report is ready. You can view it online or download a copy for your records.
                                </p>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={async () => {
                                      const reportId = study.reportFileName.replace(/\.pdf$/i, "");
                                      await viewPDFReport(reportId);
                                    }}
                                    className="text-green-700 border-green-300 hover:bg-green-100 dark:text-green-300 dark:border-green-600 dark:hover:bg-green-800"
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    View Report
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={async () => {
                                      try {
                                        const token = localStorage.getItem("auth_token");
                                        const headers: Record<string, string> = {
                                          "X-Tenant-Subdomain": getActiveSubdomain(),
                                        };
                                        if (token) {
                                          headers["Authorization"] = `Bearer ${token}`;
                                        }
                                        const response = await fetch(
                                          `/api/imaging/reports/${study.reportFileName.replace(".pdf", "")}?download=true`,
                                          { headers, credentials: "include" }
                                        );
                                        if (response.ok) {
                                          const blob = await response.blob();
                                          const url = URL.createObjectURL(blob);
                                          const a = document.createElement("a");
                                          a.href = url;
                                          a.download = study.reportFileName;
                                          document.body.appendChild(a);
                                          a.click();
                                          document.body.removeChild(a);
                                          URL.revokeObjectURL(url);
                                        }
                                      } catch (error) {
                                        console.error("Download failed:", error);
                                      }
                                    }}
                                    className="text-green-700 border-green-300 hover:bg-green-100 dark:text-green-300 dark:border-green-600 dark:hover:bg-green-800"
                                  >
                                    <Download className="h-4 w-4 mr-1" />
                                    Download Report
                                  </Button>
                                </div>
                              </div>
                            )}
                            
                            <div className="bg-amber-50 dark:bg-slate-800 border border-amber-200 dark:border-amber-600 rounded-lg p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                <h5 className="font-medium text-amber-800 dark:text-amber-300">Important Information</h5>
                              </div>
                              <ul className="text-amber-700 dark:text-amber-200 text-xs space-y-1">
                                <li>• Discuss these results with your doctor during your next appointment</li>
                                <li>• Keep a copy of your report for your personal medical records</li>
                                <li>• Contact your healthcare provider if you have questions about your results</li>
                                <li>• This report was reviewed by: {study.radiologist || 'Medical professional'}</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}

                      {study.report && (
                        <div className="bg-green-50 dark:bg-slate-700 border-l-4 border-green-400 dark:border-green-500 p-3">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-green-800 dark:text-green-300 text-sm">
                              Report
                            </h4>
                            <Badge
                              className={
                                study.report.status === "final"
                                  ? "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100"
                                  : "bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100"
                              }
                            >
                              {study.report.status}
                            </Badge>
                          </div>
                          <div className="text-sm text-green-700 dark:text-green-200">
                            <strong>Dictated:</strong>{" "}
                            {format(
                              new Date(study.report.dictatedAt),
                              "MMM d, yyyy HH:mm",
                            )}
                            {study.report.signedAt && (
                              <span className="ml-4">
                                <strong>Signed:</strong>{" "}
                                {format(
                                  new Date(study.report.signedAt),
                                  "MMM d, yyyy HH:mm",
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 justify-center">
                      {/* Hide Edit icon for patient role */}
                      {user?.role !== 'patient' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewStudy(study)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}

                      {/* PDF Report Download and View Icons */}
                      {study.reportFileName && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              try {
                                // Check if report file name exists
                                if (!study.reportFileName) {
                                  toast({
                                    title: "No Report Available",
                                    description:
                                      "No report is available for this study yet.",
                                    variant: "destructive",
                                  });
                                  return;
                                }

                                // Safely extract report ID with case-insensitive PDF removal
                                const reportId = study.reportFileName.replace(
                                  /\.pdf$/i,
                                  "",
                                );

                                const token =
                                  localStorage.getItem("auth_token");
                                const headers: Record<string, string> = {
                                  "X-Tenant-Subdomain": getActiveSubdomain(),
                                };

                                if (token) {
                                  headers["Authorization"] = `Bearer ${token}`;
                                }

                                // First, check if file exists with HEAD request
                                const checkResponse = await fetch(
                                  `/api/imaging/reports/${reportId}`,
                                  {
                                    method: "HEAD",
                                    headers,
                                    credentials: "include",
                                  },
                                );

                                if (checkResponse.status === 404) {
                                  // File not found - show modal popup
                                  setShowFileNotAvailableDialog(true);
                                  return;
                                } else if (!checkResponse.ok) {
                                  // Other errors during check
                                  console.error(
                                    `Report check failed: Status ${checkResponse.status} for study ${study.id}`,
                                  );
                                  throw new Error(
                                    "Failed to check PDF report availability",
                                  );
                                }

                                // File exists, now open it with authentication
                                await viewPDFReport(reportId);
                              } catch (error) {
                                console.error(
                                  `Failed to view PDF for study ${study.id}:`,
                                  error,
                                );
                                toast({
                                  title: "View Failed",
                                  description:
                                    "Failed to view PDF report. Please try again.",
                                  variant: "destructive",
                                });
                              }
                            }}
                            title="View PDF Report"
                            data-testid="button-view-pdf-report"
                            className="border-gray-200 text-black hover:bg-gray-50 hover:border-gray-300"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              try {
                                const token = localStorage.getItem("auth_token");
                                const reportId = study.reportFileName.replace(/\.pdf$/i, "");
                                const headers: Record<string, string> = {
                                  "X-Tenant-Subdomain": getActiveSubdomain(),
                                };

                                if (token) {
                                  headers["Authorization"] = `Bearer ${token}`;
                                }

                                const response = await fetch(
                                  `/api/imaging/reports/${reportId}?download=true&token=${encodeURIComponent(token || '')}`,
                                  {
                                    headers,
                                    credentials: "include",
                                  },
                                );

                                if (response.ok) {
                                  const blob = await response.blob();
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement("a");
                                  a.href = url;
                                  a.download = study.reportFileName;
                                  document.body.appendChild(a);
                                  a.click();
                                  document.body.removeChild(a);
                                  URL.revokeObjectURL(url);

                                  toast({
                                    title: "PDF Report Downloaded",
                                    description:
                                      "Radiology report PDF has been downloaded successfully",
                                  });
                                } else {
                                  throw new Error("Download failed");
                                }
                              } catch (error) {
                                toast({
                                  title: "Download Failed",
                                  description:
                                    "Failed to download PDF report. Please try again.",
                                  variant: "destructive",
                                });
                              }
                            }}
                            title="Download PDF Report"
                            data-testid="button-download-pdf-report"
                            className="border-gray-200 text-black hover:bg-gray-50 hover:border-gray-300"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </>
                      )}

                      {/* Hide Share icon for patient role */}
                      {user?.role !== 'patient' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleShareStudy(study)}
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {/* Hide File (Generate Report) icon for patient role */}
                      {user?.role !== 'patient' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGenerateReport(study.id)}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {/* Hide Delete icon for patient role */}
                      {user?.role !== 'patient' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteStudy(study.id)}
                          className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              ))
            )}
          </div>

          {filteredStudies.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <FileImage className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-500" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No imaging studies found
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Try adjusting your search terms or filters
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Share Study Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share Imaging Study</DialogTitle>
          </DialogHeader>
          {selectedStudy && (
            <div className="space-y-4">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Share study for <strong>{selectedStudy.patientName}</strong>
              </div>

              <div>
                <Label htmlFor="method" className="text-sm font-medium">
                  Contact Method
                </Label>
                <Select
                  value={shareFormData.method}
                  onValueChange={(value) =>
                    setShareFormData({ ...shareFormData, method: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select contact method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {shareFormData.method === "email" && (
                <div>
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter email address"
                    value={shareFormData.email}
                    onChange={(e) =>
                      setShareFormData({
                        ...shareFormData,
                        email: e.target.value,
                      })
                    }
                  />
                </div>
              )}

              {shareFormData.method === "whatsapp" && (
                <div>
                  <Label htmlFor="whatsapp" className="text-sm font-medium">
                    WhatsApp Number
                  </Label>
                  <Input
                    id="whatsapp"
                    type="tel"
                    placeholder="Enter WhatsApp number"
                    value={shareFormData.whatsapp}
                    onChange={(e) =>
                      setShareFormData({
                        ...shareFormData,
                        whatsapp: e.target.value,
                      })
                    }
                  />
                </div>
              )}

              <div>
                <Label htmlFor="message" className="text-sm font-medium">
                  Message
                </Label>
                <Textarea
                  id="message"
                  placeholder="Add a custom message..."
                  value={shareFormData.message}
                  onChange={(e) =>
                    setShareFormData({
                      ...shareFormData,
                      message: e.target.value,
                    })
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
                  onClick={async () => {
                    if (shareFormData.method === "email") {
                      try {
                        // Prepare authentication headers
                        const token = localStorage.getItem("auth_token");
                        const headers: Record<string, string> = {
                          "Content-Type": "application/json",
                          "X-Tenant-Subdomain": getActiveSubdomain(),
                        };
                        
                        if (token) {
                          headers["Authorization"] = `Bearer ${token}`;
                        }
                        
                        const response = await fetch("/api/imaging/share-study", {
                          method: "POST",
                          headers,
                          credentials: "include",
                          body: JSON.stringify({
                            studyId: selectedStudy.id,
                            recipientEmail: shareFormData.email,
                            customMessage: shareFormData.message,
                          }),
                        });

                        const result = await response.json();

                        if (response.ok) {
                          toast({
                            title: "Study Shared",
                            description: `Imaging study sent to ${shareFormData.email} successfully`,
                          });
                        } else {
                          toast({
                            title: "Sharing Failed",
                            description: result.error || "Failed to send email. Please try again.",
                            variant: "destructive",
                          });
                        }
                      } catch (error) {
                        console.error("Email sharing error:", error);
                        toast({
                          title: "Sharing Failed",
                          description: "Network error. Please check your connection and try again.",
                          variant: "destructive",
                        });
                      }
                    } else {
                      // WhatsApp sharing - not implemented yet, show info message
                      toast({
                        title: "WhatsApp Sharing",
                        description: "WhatsApp sharing is not yet implemented. Please use email sharing.",
                        variant: "destructive",
                      });
                    }

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
                  <Share className="h-4 w-4 mr-2" />
                  Share Study
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Generate Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate Radiology Report</DialogTitle>
          </DialogHeader>
          {selectedStudy && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">
                      {selectedStudy.patientName?.charAt(0) || "P"}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">
                      {selectedStudy.patientName}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Patient ID: {selectedStudy.patientId}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Study:</strong> {selectedStudy.studyType}
                  </div>
                  <div>
                    <strong>Modality:</strong> {selectedStudy.modality}
                  </div>
                  <div>
                    <strong>Body Part:</strong> {selectedStudy.bodyPart}
                  </div>
                  <div>
                    <strong>Indication:</strong> {selectedStudy.indication}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="findings" className="text-sm font-medium">
                      Findings
                    </Label>
                    {!editModes.findings ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFieldEdit("findings")}
                        className="h-6 w-6 p-0"
                        data-testid="button-edit-findings"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    ) : (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFieldSave("findings")}
                          disabled={saving.findings}
                          className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
                          data-testid="button-save-findings"
                        >
                          {saving.findings ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFieldCancel("findings")}
                          disabled={saving.findings}
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                          data-testid="button-cancel-findings"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  {editModes.findings ? (
                    <Textarea
                      id="findings"
                      placeholder="Enter radiological findings..."
                      value={reportFindings}
                      onChange={(e) => setReportFindings(e.target.value)}
                      rows={4}
                      className="mt-1"
                      autoFocus
                      data-testid="textarea-findings"
                    />
                  ) : (
                    <div
                      className="mt-1 min-h-[100px] p-3 bg-gray-50 dark:bg-gray-800 rounded-md border text-sm"
                      data-testid="display-findings"
                    >
                      {reportFindings || "Click edit to add findings..."}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="impression" className="text-sm font-medium">
                      Impression
                    </Label>
                    {!editModes.impression ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFieldEdit("impression")}
                        className="h-6 w-6 p-0"
                        data-testid="button-edit-impression"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    ) : (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFieldSave("impression")}
                          disabled={saving.impression}
                          className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
                          data-testid="button-save-impression"
                        >
                          {saving.impression ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFieldCancel("impression")}
                          disabled={saving.impression}
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                          data-testid="button-cancel-impression"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  {editModes.impression ? (
                    <Textarea
                      id="impression"
                      placeholder="Enter clinical impression..."
                      value={reportImpression}
                      onChange={(e) => setReportImpression(e.target.value)}
                      rows={3}
                      className="mt-1"
                      autoFocus
                      data-testid="textarea-impression"
                    />
                  ) : (
                    <div
                      className="mt-1 min-h-[75px] p-3 bg-gray-50 dark:bg-gray-800 rounded-md border text-sm"
                      data-testid="display-impression"
                    >
                      {reportImpression || "Click edit to add impression..."}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label
                      htmlFor="radiologist"
                      className="text-sm font-medium"
                    >
                      Radiologist
                    </Label>
                    {!editModes.radiologist ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFieldEdit("radiologist")}
                        className="h-6 w-6 p-0"
                        data-testid="button-edit-radiologist"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    ) : (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFieldSave("radiologist")}
                          disabled={saving.radiologist}
                          className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
                          data-testid="button-save-radiologist"
                        >
                          {saving.radiologist ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFieldCancel("radiologist")}
                          disabled={saving.radiologist}
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                          data-testid="button-cancel-radiologist"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  {editModes.radiologist ? (
                    <Input
                      id="radiologist"
                      value={reportRadiologist}
                      onChange={(e) => setReportRadiologist(e.target.value)}
                      className="mt-1"
                      autoFocus
                      data-testid="input-radiologist"
                    />
                  ) : (
                    <div
                      className="mt-1 min-h-[40px] p-3 bg-gray-50 dark:bg-gray-800 rounded-md border text-sm flex items-center"
                      data-testid="display-radiologist"
                    >
                      {reportRadiologist || "Click edit to add radiologist..."}
                    </div>
                  )}
                </div>

                {/* File Upload - Medical Images */}
                <div>
                  <Label htmlFor="report-upload-files">Medical Images *</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <FileImage className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <div className="space-y-2">
                      <div>
                        <input
                          type="file"
                          id="report-upload-files"
                          multiple
                          accept="image/*,.dcm,.dicom,.jpg,.jpeg,.png,.gif,.bmp,.tiff,.tif,.webp,.svg,.ico,.jfif,.pjpeg,.pjp"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            document.getElementById("report-upload-files")?.click()
                          }
                        >
                          Select Images
                        </Button>
                      </div>
                      <p className="text-sm text-gray-500">
                        Select X-ray images, DICOM files, or other medical images
                      </p>
                      <p className="text-xs text-gray-400">
                        Supported formats: All image formats (JPEG, PNG, GIF, BMP,
                        TIFF, WebP, SVG), DICOM (.dcm), and medical imaging files
                      </p>
                    </div>
                  </div>

                  {/* Selected Files Display */}
                  {selectedFiles.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <Label>Selected Files ({selectedFiles.length}):</Label>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {selectedFiles.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between bg-gray-50 p-2 rounded"
                          >
                            <span className="text-sm truncate">{file.name}</span>
                            <span className="text-xs text-gray-500">
                              {file.size
                                ? file.size < 1024
                                  ? `${file.size} B`
                                  : file.size < 1024 * 1024
                                    ? `${(file.size / 1024).toFixed(1)} KB`
                                    : `${(file.size / (1024 * 1024)).toFixed(1)} MB`
                                : "Unknown size"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Saved Reports Section */}
                {selectedStudy.reportFilePath &&
                  !nonExistentReports.has(selectedStudy.id) && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <h4 className="font-medium text-purple-800 mb-2">
                        Saved Reports
                      </h4>
                      <div className="text-sm text-purple-700">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <strong>Report File:</strong>
                            <Button
                              variant="link"
                              onClick={async () => {
                                if (selectedStudy.reportFilePath) {
                                  const fileName = selectedStudy.reportFilePath.split('/').pop() || '';
                                  const reportId = fileName.replace(".pdf", "");
                                  await viewPDFReport(reportId);
                                }
                              }}
                              className="p-0 h-auto text-blue-600 hover:text-blue-800 underline"
                              data-testid="link-saved-report"
                            >
                              {selectedStudy.reportFilePath.split('/').pop()}
                            </Button>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              if (selectedStudy.reportFilePath) {
                                try {
                                  const fileName = selectedStudy.reportFilePath.split('/').pop() || '';
                                  const reportId = fileName.replace(".pdf", "");
                                  const response = await apiRequest(
                                    "DELETE",
                                    `/api/imaging/reports/${reportId}`,
                                  );

                                  toast({
                                    title: "Success",
                                    description: "Report deleted successfully",
                                  });

                                  // Invalidate and refetch queries to get fresh data from database
                                  await queryClient.invalidateQueries({
                                    queryKey: ["/api/medical-images"],
                                  });
                                  await queryClient.invalidateQueries({
                                    queryKey: ["/api/imaging/studies"],
                                  });
                                  await refetchImages();
                                } catch (error: any) {
                                  console.error(
                                    "Error deleting report:",
                                    error,
                                  );

                                  // Check if the error is due to file not existing
                                  if (
                                    error?.message?.includes("404") ||
                                    error?.response?.status === 404
                                  ) {
                                    toast({
                                      title: "Error",
                                      description:
                                        "File not existing on server",
                                      variant: "destructive",
                                    });
                                  } else {
                                    toast({
                                      title: "Error",
                                      description: "Failed to delete report",
                                      variant: "destructive",
                                    });
                                  }
                                }
                              }
                            }}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50 h-8 w-8 p-0"
                            data-testid="button-delete-report"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-purple-600 mt-1">
                          Click the file name to view the PDF report
                        </p>
                      </div>
                    </div>
                  )}

                {/* No file found message */}
                {selectedStudy.reportFilePath &&
                  nonExistentReports.has(selectedStudy.id) && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <h4 className="font-medium text-orange-800 mb-2">
                        No File Found
                      </h4>
                      <p className="text-sm text-orange-700">
                        No file found, please generate new
                      </p>
                    </div>
                  )}

                {selectedStudy?.report && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-medium text-green-800 mb-2">
                      Existing Report
                    </h4>
                    <div className="text-sm text-green-700 space-y-2">
                      <div>
                        <strong>Status:</strong> {selectedStudy.report.status}
                      </div>
                      <div>
                        <strong>Dictated:</strong>{" "}
                        {format(
                          new Date(selectedStudy.report.dictatedAt),
                          "PPpp",
                        )}
                      </div>
                      {selectedStudy.report.signedAt && (
                        <div>
                          <strong>Signed:</strong>{" "}
                          {format(
                            new Date(selectedStudy.report.signedAt),
                            "PPpp",
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowReportDialog(false)}
                >
                  Close
                </Button>
                <div className="flex gap-2">
                  {/* Hide both button and green box during PDF generation */}
                  {!isGeneratingPDF ? (
                    generatedReportId ? (
                      <div className="space-y-3">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-green-700 font-medium">
                              Report Generated Successfully!
                            </span>
                          </div>
                          <div className="text-sm text-green-600">
                            <strong>Report File:</strong>
                            <Button
                              variant="link"
                              onClick={() => viewPDFReport(generatedReportId)}
                              className="p-0 h-auto ml-2 text-blue-600 hover:text-blue-800 underline"
                              data-testid="link-report-view"
                            >
                              {generatedReportFileName ||
                                `${generatedReportId.slice(0, 8)}...`}
                            </Button>
                          </div>
                          <p className="text-xs text-green-600 mt-1">
                            Click the file name to view the PDF
                          </p>
                        </div>
                      </div>
                    ) : (
                      <Button
                        onClick={() => {
                          if (selectedStudy.status === "final") {
                            setShowReportDialog(false);
                            setShowFinalReportDialog(true);
                          } else {
                            generatePDFReport(selectedStudy);
                          }
                        }}
                        disabled={isGeneratingPDF}
                        className="bg-medical-blue hover:bg-blue-700 disabled:opacity-50"
                        data-testid="button-generate-report"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        {isGeneratingPDF
                          ? "Generating..."
                          : selectedStudy.status === "final"
                            ? "View Final Report"
                            : "Generate Report"}
                      </Button>
                    )
                  ) : (
                    <div className="flex items-center justify-center py-8">
                      <div className="flex items-center gap-3 text-blue-600">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="text-sm font-medium">
                          Generating PDF Report...
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Study Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>View Imaging Study</DialogTitle>
          </DialogHeader>
          {selectedStudy && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-lg font-bold">
                      {selectedStudy.patientName?.charAt(0) || "P"}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-xl">
                      {selectedStudy.patientName}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Patient ID: {selectedStudy.patientId}
                    </p>
                  </div>
                  <div className="ml-auto">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        selectedStudy.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : selectedStudy.status === "in_progress"
                            ? "bg-yellow-100 text-yellow-800"
                            : selectedStudy.status === "scheduled"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {selectedStudy.status?.charAt(0).toUpperCase() +
                        selectedStudy.status?.slice(1).replace("_", " ") ||
                        "Unknown"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div>
                    <strong>Study Type:</strong> {selectedStudy.studyType}
                  </div>
                  <div>
                    <strong>Modality:</strong> {selectedStudy.modality}
                  </div>
                  <div>
                    <strong>Body Part:</strong> {selectedStudy.bodyPart}
                  </div>
                  <div>
                    <strong>Priority:</strong> {selectedStudy.priority}
                  </div>
                  <div>
                    <strong>Ordered By:</strong> {selectedStudy.orderedBy}
                  </div>
                  <div>
                    <strong>Ordered:</strong>{" "}
                    {format(new Date(selectedStudy.orderedAt), "MMM dd, yyyy")}
                  </div>
                  {selectedStudy.scheduledAt && (
                    <div>
                      <strong>Scheduled:</strong>{" "}
                      {format(
                        new Date(selectedStudy.scheduledAt),
                        "MMM dd, yyyy",
                      )}
                    </div>
                  )}
                  {selectedStudy.performedAt && (
                    <div>
                      <strong>Performed:</strong>{" "}
                      {format(
                        new Date(selectedStudy.performedAt),
                        "MMM dd, yyyy",
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-lg mb-2">
                    Clinical Indication
                  </h4>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                    {selectedStudy.indication}
                  </p>
                </div>

                {selectedStudy.findings && (
                  <div>
                    <h4 className="font-medium text-lg mb-2">Findings</h4>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                      {selectedStudy.findings}
                    </p>
                  </div>
                )}

                {selectedStudy.impression && (
                  <div>
                    <h4 className="font-medium text-lg mb-2">Impression</h4>
                    <div className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                      {user?.role === 'patient' && selectedStudy.impression.includes('File:') ? (
                        // For patient users, make filename clickable
                        <div>
                          {selectedStudy.impression.split(/(File:\s*[^\s]+\s*\([^)]+\))/).map((part, idx) => {
                            const fileMatch = part.match(/File:\s*([^\s]+)\s*\(([^)]+)\)/);
                            if (fileMatch) {
                              const [fullMatch, fileName, fileSize] = fileMatch;
                              return (
                                <button
                                  key={idx}
                                  onClick={async () => {
                                    try {
                                      const token = localStorage.getItem("auth_token");
                                      const headers: Record<string, string> = {
                                        "X-Tenant-Subdomain": getActiveSubdomain(),
                                      };
                                      
                                      if (token) {
                                        headers["Authorization"] = `Bearer ${token}`;
                                      }
                                      
                                      const response = await fetch(`/api/medical-images/${selectedStudy.id}/image?t=${Date.now()}`, {
                                        method: "GET",
                                        headers,
                                        credentials: "include",
                                      });
                                      
                                      if (!response.ok) {
                                        throw new Error(`Failed to load image: ${response.status}`);
                                      }
                                      
                                      const blob = await response.blob();
                                      const blobUrl = URL.createObjectURL(blob);
                                      
                                      const imageForViewer = {
                                        seriesDescription: `${selectedStudy.modality} ${selectedStudy.bodyPart}`,
                                        type: "JPEG" as const,
                                        imageCount: 1,
                                        size: fileSize,
                                        imageId: selectedStudy.id,
                                        imageUrl: blobUrl,
                                        mimeType: "image/jpeg",
                                        fileName: fileName,
                                      };
                                      setSelectedImageSeries(imageForViewer);
                                      setShowImageViewer(true);
                                    } catch (error) {
                                      console.error("Error loading image:", error);
                                      toast({
                                        title: "Error",
                                        description: "Failed to load medical image. Please try again.",
                                        variant: "destructive",
                                      });
                                    }
                                  }}
                                  className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                                >
                                  {fullMatch}
                                </button>
                              );
                            }
                            return <span key={idx}>{part}</span>;
                          })}
                        </div>
                      ) : (
                        // For non-patient users, display normally
                        <p>{selectedStudy.impression}</p>
                      )}
                    </div>
                  </div>
                )}

                {selectedStudy.radiologist && (
                  <div>
                    <h4 className="font-medium text-lg mb-2">Radiologist</h4>
                    <p className="text-gray-700">{selectedStudy.radiologist}</p>
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-medium text-lg mb-3">Image Series</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedStudy.images.map((image: any, index: number) => (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium">
                          {image.seriesDescription}
                        </h5>
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {image.type}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>Images: {image.imageCount}</div>
                        <div>Size: {image.size}</div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              // Fetch image with authentication headers
                              const token = localStorage.getItem("auth_token");
                              const headers: Record<string, string> = {
                                "X-Tenant-Subdomain": getActiveSubdomain(),
                              };
                              
                              if (token) {
                                headers["Authorization"] = `Bearer ${token}`;
                              }
                              
                              const response = await fetch(`/api/medical-images/${selectedStudy.id}/image?t=${Date.now()}`, {
                                method: "GET",
                                headers,
                                credentials: "include",
                              });
                              
                              if (!response.ok) {
                                throw new Error(`Failed to load image: ${response.status}`);
                              }
                              
                              // Convert response to blob and create blob URL
                              const blob = await response.blob();
                              const blobUrl = URL.createObjectURL(blob);
                              
                              const imageForViewer = {
                                seriesDescription: image.seriesDescription,
                                type: image.type,
                                imageCount: image.imageCount,
                                size: image.size,
                                imageId: selectedStudy.id,
                                imageUrl: blobUrl, // Use blob URL instead of direct API endpoint
                                mimeType: image.mimeType || "image/jpeg",
                                fileName: (selectedStudy as any).fileName || null,
                              };
                              setSelectedImageSeries(imageForViewer);
                              setShowImageViewer(true);
                            } catch (error) {
                              console.error("Error loading image:", error);
                              toast({
                                title: "Error",
                                description: "Failed to load medical image. Please try again.",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Images
                        </Button>
                        {/* Hide Edit Image button for patient role */}
                        {user?.role !== 'patient' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditImage(selectedStudy.id)}
                            data-testid="button-edit-image"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedStudy?.report && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-800 mb-3">
                    Report Status
                  </h4>
                  <div className="text-sm text-green-700 space-y-2">
                    <div className="flex justify-between">
                      <span>
                        <strong>Status:</strong> {selectedStudy.report.status}
                      </span>
                      <span>
                        <strong>Dictated:</strong>{" "}
                        {format(
                          new Date(selectedStudy.report.dictatedAt),
                          "PPpp",
                        )}
                      </span>
                    </div>
                    {selectedStudy.report.signedAt && (
                      <div>
                        <strong>Signed:</strong>{" "}
                        {format(
                          new Date(selectedStudy.report.signedAt),
                          "PPpp",
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowViewDialog(false)}
                >
                  Close
                </Button>
                <div className="flex gap-2">
                  {/* Hide Generate Report button for patient role */}
                  {user?.role !== 'patient' && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowViewDialog(false);
                        setShowReportDialog(true);
                      }}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Generate Report
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Order Study Dialog */}
      <Dialog open={showNewOrder} onOpenChange={setShowNewOrder}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Imaging Study</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="patient" className="text-sm font-medium">
                  Patient
                </Label>
                {user?.role === "patient" && currentPatient ? (
                  <div className="flex items-center gap-3 px-3 py-2 border rounded-md bg-gray-50 dark:bg-slate-700">
                    <User className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {currentPatient.firstName} {currentPatient.lastName}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      ({currentPatient.patientId})
                    </span>
                  </div>
                ) : (
                  <Select
                    value={orderFormData.patientId}
                    onValueChange={(value) =>
                      setOrderFormData((prev) => ({ ...prev, patientId: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          patientsLoading
                            ? "Loading patients..."
                            : "Select patient"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {patientsLoading ? (
                        <SelectItem value="loading" disabled>
                          Loading patients...
                        </SelectItem>
                      ) : patients.length > 0 ? (
                        patients.map((patient: any) => (
                          <SelectItem
                            key={patient.id}
                            value={patient.id.toString()}
                          >
                            {patient.firstName} {patient.lastName} (
                            {patient.patientId})
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-patients" disabled>
                          No patients found
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div>
                <Label htmlFor="modality" className="text-sm font-medium">
                  Modality
                </Label>
                <Select
                  value={orderFormData.modality}
                  onValueChange={(value) =>
                    setOrderFormData((prev) => ({ ...prev, modality: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select imaging type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="X-Ray">X-Ray</SelectItem>
                    <SelectItem value="CT">CT Scan</SelectItem>
                    <SelectItem value="MRI">MRI</SelectItem>
                    <SelectItem value="Ultrasound">Ultrasound</SelectItem>
                    <SelectItem value="Nuclear Medicine">
                      Nuclear Medicine
                    </SelectItem>
                    <SelectItem value="Mammography">Mammography</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bodyPart" className="text-sm font-medium">
                  Body Part
                </Label>
                <Input
                  id="bodyPart"
                  placeholder="e.g., Chest, Abdomen, Head"
                  value={orderFormData.bodyPart}
                  onChange={(e) =>
                    setOrderFormData((prev) => ({
                      ...prev,
                      bodyPart: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <Label htmlFor="priority" className="text-sm font-medium">
                  Priority
                </Label>
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
            </div>

            <div>
              <Label htmlFor="studyType" className="text-sm font-medium">
                Study Description
              </Label>
              <Input
                id="studyType"
                placeholder="e.g., Chest X-Ray PA and Lateral"
                value={orderFormData.studyType}
                onChange={(e) =>
                  setOrderFormData((prev) => ({
                    ...prev,
                    studyType: e.target.value,
                  }))
                }
              />
            </div>

            <div>
              <Label htmlFor="indication" className="text-sm font-medium">
                Clinical Indication
              </Label>
              <Textarea
                id="indication"
                placeholder="Reason for imaging study..."
                rows={3}
                value={orderFormData.indication}
                onChange={(e) =>
                  setOrderFormData((prev) => ({
                    ...prev,
                    indication: e.target.value,
                  }))
                }
              />
            </div>

            <div>
              <Label htmlFor="notes" className="text-sm font-medium">
                Special Instructions (Optional)
              </Label>
              <Textarea
                id="notes"
                placeholder="Any special instructions for the imaging technologist..."
                rows={2}
                value={orderFormData.specialInstructions}
                onChange={(e) =>
                  setOrderFormData((prev) => ({
                    ...prev,
                    specialInstructions: e.target.value,
                  }))
                }
              />
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <Button variant="outline" onClick={() => setShowNewOrder(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleOrderSubmit}
                className="bg-medical-blue hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Order Study
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Final Report Viewer Dialog */}
      <Dialog
        open={showFinalReportDialog}
        onOpenChange={setShowFinalReportDialog}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Final Radiology Report</DialogTitle>
          </DialogHeader>
          {selectedStudy && (
            <div className="space-y-6">
              {/* Patient Information */}
              <div className="border-b pb-4">
                <h3 className="font-semibold text-lg mb-3">
                  Patient Information
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Patient Name:</span>{" "}
                    {selectedStudy.patientName}
                  </div>
                  <div>
                    <span className="font-medium">Patient ID:</span>{" "}
                    {selectedStudy.patientId}
                  </div>
                  <div>
                    <span className="font-medium">Study Date:</span>{" "}
                    {format(new Date(selectedStudy.orderedAt), "PPP")}
                  </div>
                  <div>
                    <span className="font-medium">Study Type:</span>{" "}
                    {selectedStudy.studyType}
                  </div>
                  <div>
                    <span className="font-medium">Modality:</span>{" "}
                    {selectedStudy.modality}
                  </div>
                  <div>
                    <span className="font-medium">Body Part:</span>{" "}
                    {selectedStudy.bodyPart}
                  </div>
                  <div>
                    <span className="font-medium">Ordering Physician:</span>{" "}
                    {selectedStudy.orderedBy}
                  </div>
                  <div>
                    <span className="font-medium">Radiologist:</span>{" "}
                    {selectedStudy.radiologist || "Dr. Michael Chen"}
                  </div>
                </div>
              </div>

              {/* Clinical Information */}
              <div className="border-b pb-4">
                <h3 className="font-semibold text-lg mb-3">
                  Clinical Information
                </h3>
                <div className="text-sm">
                  <div className="mb-2">
                    <span className="font-medium">Indication:</span>{" "}
                    {selectedStudy.indication}
                  </div>
                  <div>
                    <span className="font-medium">Priority:</span>
                    <span
                      className={`ml-2 px-2 py-1 rounded text-xs ${
                        selectedStudy.priority === "stat"
                          ? "bg-red-100 text-red-800"
                          : selectedStudy.priority === "urgent"
                            ? "bg-orange-100 text-orange-800"
                            : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {selectedStudy.priority.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Report Content */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Report</h3>

                {selectedStudy.findings && (
                  <div>
                    <h4 className="font-medium mb-2">FINDINGS:</h4>
                    <div className="bg-gray-50 p-4 rounded border text-sm whitespace-pre-wrap">
                      {selectedStudy.findings}
                    </div>
                  </div>
                )}

                {selectedStudy.impression && (
                  <div>
                    <h4 className="font-medium mb-2">IMPRESSION:</h4>
                    <div className="bg-gray-50 p-4 rounded border text-sm whitespace-pre-wrap">
                      {selectedStudy.impression}
                    </div>
                  </div>
                )}

                {selectedStudy?.report && (
                  <div>
                    <h4 className="font-medium mb-2">FULL REPORT:</h4>
                    <div className="bg-gray-50 p-4 rounded border text-sm whitespace-pre-wrap">
                      {selectedStudy.report.content}
                    </div>
                  </div>
                )}

                {/* Report Status */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="font-medium text-green-800">
                      Report Status: FINAL
                    </span>
                  </div>
                  <div className="text-sm text-green-700 space-y-1">
                    {selectedStudy.report?.dictatedAt && (
                      <div>
                        <strong>Dictated:</strong>{" "}
                        {format(
                          new Date(selectedStudy.report.dictatedAt),
                          "PPpp",
                        )}
                      </div>
                    )}
                    {selectedStudy.report?.signedAt && (
                      <div>
                        <strong>Signed:</strong>{" "}
                        {format(
                          new Date(selectedStudy.report.signedAt),
                          "PPpp",
                        )}
                      </div>
                    )}
                    <div>
                      <strong>Radiologist:</strong>{" "}
                      {selectedStudy.radiologist || "Dr. Michael Chen"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowFinalReportDialog(false)}
                >
                  Close
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Download report logic
                      const reportContent =
                        selectedStudy.report?.content ||
                        `RADIOLOGY REPORT\n\nPatient: ${selectedStudy.patientName}\nPatient ID: ${selectedStudy.patientId}\nStudy: ${selectedStudy.studyType}\nModality: ${selectedStudy.modality}\nDate: ${format(new Date(selectedStudy.orderedAt), "PPP")}\nBody Part: ${selectedStudy.bodyPart}\nOrdering Physician: ${selectedStudy.orderedBy}\nRadiologist: ${selectedStudy.radiologist || "Dr. Michael Chen"}\n\nCLINICAL INDICATION:\n${selectedStudy.indication}\n\nFINDINGS:\n${selectedStudy.findings || "Normal findings"}\n\nIMPRESSION:\n${selectedStudy.impression || "No acute abnormalities"}`;

                      const blob = new Blob([reportContent], {
                        type: "text/plain",
                      });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `radiology-report-${selectedStudy.patientName.replace(/\s+/g, "-").toLowerCase()}-${format(new Date(selectedStudy.orderedAt), "yyyy-MM-dd")}.txt`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);

                      toast({
                        title: "Report Downloaded",
                        description: `Final report for ${selectedStudy.patientName} downloaded successfully`,
                      });
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Report
                  </Button>
                  <Button
                    onClick={() => {
                      setShowFinalReportDialog(false);
                      setShowShareDialog(true);
                    }}
                    className="bg-medical-blue hover:bg-blue-700"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Report
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Upload Images Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload Medical Images</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Patient Selection */}
            <div>
              <Label htmlFor="upload-patient">Patient *</Label>
              {user?.role === "patient" && currentPatient ? (
                <div className="flex items-center gap-3 px-3 py-2 border rounded-md bg-gray-50 dark:bg-slate-700">
                  <User className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {currentPatient.firstName} {currentPatient.lastName}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    ({currentPatient.patientId})
                  </span>
                </div>
              ) : (
                <Select
                  value={uploadFormData.patientId}
                  onValueChange={(value) =>
                    setUploadFormData({ ...uploadFormData, patientId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patientsLoading ? (
                      <SelectItem value="loading">Loading patients...</SelectItem>
                    ) : patients.length === 0 ? (
                      <SelectItem value="no-patients">
                        No patients available
                      </SelectItem>
                    ) : (
                      patients.map((patient) => (
                        <SelectItem
                          key={patient.id}
                          value={patient.id.toString()}
                        >
                          {patient.firstName} {patient.lastName} (
                          {patient.patientId})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Study Type */}
            <div>
              <Label htmlFor="upload-study-type">Study Type *</Label>
              <Popover open={studyTypeOpen} onOpenChange={setStudyTypeOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={studyTypeOpen}
                    className="w-full justify-between"
                  >
                    {uploadFormData.studyType || "Select study type..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Search study type..." />
                    <CommandEmpty>No study type found.</CommandEmpty>
                    <CommandGroup>
                      {pricingLoading ? (
                        <CommandItem disabled>Loading study types...</CommandItem>
                      ) : imagingPricing.length === 0 ? (
                        <CommandItem disabled>No study types available</CommandItem>
                      ) : (
                        imagingPricing.map((pricing: any) => (
                          <CommandItem
                            key={pricing.id}
                            value={pricing.imagingType}
                            onSelect={(currentValue) => {
                              setUploadFormData({ ...uploadFormData, studyType: currentValue });
                              setStudyTypeOpen(false);
                            }}
                          >
                            <CheckIcon
                              className={`mr-2 h-4 w-4 ${
                                uploadFormData.studyType === pricing.imagingType ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            {pricing.imagingType}
                          </CommandItem>
                        ))
                      )}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Provider Information - Show only for doctor roles */}
            {isDoctorLike(user?.role) && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="role">Role</Label>
                  <div className="flex items-center h-10 px-3 py-2 border border-input bg-background rounded-md text-sm ring-offset-background">
                    <User className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span data-testid="provider-role-display">
                      {formatRoleLabel(user?.role)}
                    </span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="provider">Provider Name</Label>
                  <div className="flex items-center h-10 px-3 py-2 border border-input bg-background rounded-md text-sm ring-offset-background">
                    <User className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span data-testid="provider-name-display">
                      {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : ''}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Study Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="upload-modality">Modality *</Label>
                <Popover open={modalityOpen} onOpenChange={setModalityOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={modalityOpen}
                      className="w-full justify-between"
                    >
                      {uploadFormData.modality || "Select modality..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search modality..." />
                      <CommandEmpty>No modality found.</CommandEmpty>
                      <CommandGroup>
                        {Object.keys(MODALITY_BODY_PARTS).map((modality) => (
                          <CommandItem
                            key={modality}
                            value={modality}
                            onSelect={(currentValue) => {
                              setUploadFormData({ 
                                ...uploadFormData, 
                                modality: currentValue,
                                bodyPart: "" // Reset body part when modality changes
                              });
                              setModalityOpen(false);
                            }}
                          >
                            <CheckIcon
                              className={`mr-2 h-4 w-4 ${
                                uploadFormData.modality === modality ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            {modality}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label htmlFor="upload-priority">Priority</Label>
                <Select
                  value={uploadFormData.priority}
                  onValueChange={(value) =>
                    setUploadFormData({ ...uploadFormData, priority: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routine">Routine</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="stat">STAT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="upload-body-part">Body Part *</Label>
              <Popover open={bodyPartOpen} onOpenChange={setBodyPartOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={bodyPartOpen}
                    className="w-full justify-between"
                    disabled={!uploadFormData.modality}
                  >
                    {uploadFormData.bodyPart || "Select body part..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Search body part..." />
                    <CommandEmpty>No body part found.</CommandEmpty>
                    <CommandGroup>
                      {(MODALITY_BODY_PARTS[uploadFormData.modality] || []).map((bodyPart) => (
                        <CommandItem
                          key={bodyPart}
                          value={bodyPart}
                          onSelect={(currentValue) => {
                            setUploadFormData({ ...uploadFormData, bodyPart: currentValue });
                            setBodyPartOpen(false);
                          }}
                        >
                          <CheckIcon
                            className={`mr-2 h-4 w-4 ${
                              uploadFormData.bodyPart === bodyPart ? "opacity-100" : "opacity-0"
                            }`}
                          />
                          {bodyPart}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label htmlFor="upload-indication">Clinical Indication</Label>
              <Textarea
                id="upload-indication"
                value={uploadFormData.indication}
                onChange={(e) =>
                  setUploadFormData({
                    ...uploadFormData,
                    indication: e.target.value,
                  })
                }
                placeholder="Reason for imaging study..."
                rows={2}
              />
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowUploadDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUploadSubmit}
                className="bg-medical-blue hover:bg-blue-700"
                disabled={
                  !uploadFormData.patientId ||
                  !uploadFormData.studyType
                }
              >
                <FileImage className="h-4 w-4 mr-2" />
                Save Images
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Viewer Dialog */}
      <Dialog open={showImageViewer} onOpenChange={setShowImageViewer}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Medical Image Viewer</DialogTitle>
            {selectedImageSeries && (
              <p className="text-sm text-gray-600">
                {selectedImageSeries.seriesDescription} -{" "}
                {selectedImageSeries.imageCount} images
              </p>
            )}
          </DialogHeader>

          <div className="flex-1 overflow-auto">
            {selectedImageSeries && (
              <div className="space-y-4">
                {/* Series Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Series:</strong>{" "}
                      {selectedImageSeries.seriesDescription}
                    </div>
                    <div>
                      <strong>Type:</strong> {selectedImageSeries.type}
                    </div>
                    <div>
                      <strong>Images:</strong> {selectedImageSeries.imageCount}
                    </div>
                    <div>
                      <strong>Size:</strong> {selectedImageSeries.size}
                    </div>
                  </div>
                </div>

                {/* Image Display Area */}
                <div className="bg-black rounded-lg p-4 min-h-[400px] flex items-center justify-center">
                  {selectedImageSeries.imageUrl ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <img
                        src={selectedImageSeries.imageUrl}
                        alt={`Medical Image - ${selectedImageSeries.seriesDescription}`}
                        className="max-w-full max-h-96 object-contain rounded-lg border border-gray-600"
                        onLoad={() => console.log(`📷 CLIENT: Image loaded from filesystem: ${selectedImageSeries.fileName || 'Unknown'}`)}
                        onError={(e) => {
                          console.error(`📷 CLIENT: Failed to load image from filesystem: ${selectedImageSeries.fileName || 'Unknown'}`);
                          // You could add fallback logic here if needed
                        }}
                        style={{ maxHeight: "400px" }}
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center text-white space-y-4">
                        <div className="w-72 h-72 bg-gray-800 rounded-lg flex items-center justify-center border-2 border-gray-600">
                          <div className="text-center">
                            <div className="w-24 h-24 mx-auto mb-4 border-2 border-gray-500 rounded-lg flex items-center justify-center">
                              <FileImage className="h-12 w-12 text-gray-500" />
                            </div>
                            <div className="text-gray-400">
                              <p className="font-medium">Medical Image</p>
                              <p className="text-sm">
                                {selectedImageSeries.seriesDescription}
                              </p>
                              <p className="text-xs mt-2">
                                Upload a new image to view it here
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Image Tools */}
                <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg">
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (selectedImageSeries?.imageData) {
                          // Create download link for base64 image
                          const link = document.createElement("a");
                          link.href = `data:${selectedImageSeries.mimeType || "image/jpeg"};base64,${selectedImageSeries.imageData}`;
                          link.download = `medical-image-${selectedImageSeries.id}.${selectedImageSeries.mimeType?.includes("png") ? "png" : "jpg"}`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);

                          toast({
                            title: "Download Started",
                            description: "Medical image download has begun.",
                          });
                        } else {
                          toast({
                            title: "Download Failed",
                            description:
                              "Image data not available for download.",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (navigator.share && selectedImageSeries?.imageData) {
                          // Use Web Share API if available
                          fetch(
                            `data:${selectedImageSeries.mimeType || "image/jpeg"};base64,${selectedImageSeries.imageData}`,
                          )
                            .then((res) => res.blob())
                            .then((blob) => {
                              const file = new File(
                                [blob],
                                `medical-image-${selectedImageSeries.id}.jpg`,
                                {
                                  type:
                                    selectedImageSeries.mimeType ||
                                    "image/jpeg",
                                },
                              );
                              navigator.share({
                                title: "Medical Image",
                                text: `Medical Image - ${selectedImageSeries.seriesDescription}`,
                                files: [file],
                              });
                            })
                            .catch((err) => {
                              toast({
                                title: "Share Failed",
                                description:
                                  "Unable to share image. Try downloading instead.",
                                variant: "destructive",
                              });
                            });
                        } else {
                          // Fallback: copy image URL to clipboard
                          if (selectedImageSeries?.imageUrl) {
                            const fullImageUrl = `${window.location.origin}${selectedImageSeries.imageUrl}`;
                            navigator.clipboard
                              .writeText(fullImageUrl)
                              .then(() => {
                                toast({
                                  title: "Image URL Copied",
                                  description:
                                    "Image URL copied to clipboard.",
                                });
                              })
                              .catch(() => {
                                toast({
                                  title: "Share Failed",
                                  description:
                                    "Unable to share or copy image URL.",
                                  variant: "destructive",
                                });
                              });
                          }
                        }
                      }}
                    >
                      <Share className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                  </div>
                  <div className="text-sm text-gray-600">
                    Image 1 of {selectedImageSeries.imageCount}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setShowImageViewer(false)}>
              Close Viewer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* File Not Available Dialog */}
      <Dialog
        open={showFileNotAvailableDialog}
        onOpenChange={setShowFileNotAvailableDialog}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>File Not Available</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              File is not available on the server — it may have been deleted or
              not yet created.
            </p>
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => setShowFileNotAvailableDialog(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {studyToDelete ? (
                `Are you sure you want to delete the ${studyToDelete.studyType} study for ${studyToDelete.patientName}? This action cannot be undone.`
              ) : (
                "Are you sure you want to delete this study? This action cannot be undone."
              )}
            </p>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteDialog(false);
                  setStudyToDelete(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmDeleteStudy}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                OK
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invoice Dialog - Comprehensive Billing Format */}
      <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invoice-patient">Patient</Label>
                <Select value={invoicePatient} onValueChange={setInvoicePatient}>
                  <SelectTrigger id="invoice-patient">
                    <SelectValue placeholder="Select patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients && patients.length > 0 ? (
                      patients.map((patient: any) => (
                        <SelectItem key={patient.id} value={patient.patientId}>
                          {patient.firstName} {patient.lastName}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-patients" disabled>No patients found</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {invoicePatientError && (
                  <p className="text-sm text-red-600 mt-1">{invoicePatientError}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="invoice-service-date">Service Date</Label>
                <Input 
                  id="invoice-service-date" 
                  type="date" 
                  value={invoiceServiceDate}
                  onChange={(e) => setInvoiceServiceDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invoice-doctor">Doctor</Label>
                <div className="h-10 px-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-800 flex items-center text-sm">
                  {user?.firstName} {user?.lastName}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invoice-invoice-date">Invoice Date</Label>
                <Input 
                  id="invoice-invoice-date" 
                  type="date" 
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="invoice-due-date">Due Date</Label>
                <Input 
                  id="invoice-due-date" 
                  type="date" 
                  value={invoiceDueDate}
                  onChange={(e) => setInvoiceDueDate(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label>Services & Procedures</Label>
              <div className="border rounded-md p-4 space-y-3">
                <div className="grid grid-cols-3 gap-2 text-sm font-medium text-gray-600 dark:text-gray-300">
                  <span>Code</span>
                  <span>Description</span>
                  <span>Amount</span>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <Input placeholder="Enter CPT Code" value={invoiceServiceCode} onChange={(e) => setInvoiceServiceCode(e.target.value)} />
                  <Input placeholder="Enter Description" value={invoiceServiceDesc} onChange={(e) => setInvoiceServiceDesc(e.target.value)} />
                  <Input 
                    placeholder="Amount" 
                    value={invoiceServiceAmount} 
                    onChange={(e) => {
                      setInvoiceServiceAmount(e.target.value);
                      // Auto-calculate total when amount changes
                      const amount = parseFloat(e.target.value) || 0;
                      const subtotal = amount;
                      const tax = subtotal * 0.2; // 20% VAT
                      const total = subtotal + tax;
                      setInvoiceTotalAmount(total.toFixed(2));
                    }}
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <Input placeholder="CPT Code" disabled />
                  <Input placeholder="Description" disabled />
                  <Input placeholder="0.00" disabled />
                </div>
              </div>
              {invoiceServiceError && (
                <p className="text-sm text-red-600 mt-1">{invoiceServiceError}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invoice-insurance">Insurance Provider</Label>
                <Select value={invoiceInsuranceProvider} onValueChange={setInvoiceInsuranceProvider}>
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
              
              {invoiceInsuranceProvider && invoiceInsuranceProvider !== '' && invoiceInsuranceProvider !== 'none' && (
                <div>
                  <Label htmlFor="invoice-nhs-number">NHS Number</Label>
                  <Input 
                    id="invoice-nhs-number" 
                    placeholder="123 456 7890 (10 digits)" 
                    value={invoiceNhsNumber}
                    onChange={(e) => {
                      const value = e.target.value;
                      setInvoiceNhsNumber(value);
                      const digitsOnly = value.replace(/\s+/g, '');
                      if (digitsOnly.length > 0 && digitsOnly.length !== 10) {
                        setInvoiceNhsError("NHS number must be exactly 10 digits");
                      } else if (digitsOnly.length > 0 && !/^\d+$/.test(digitsOnly)) {
                        setInvoiceNhsError("NHS number must contain only digits");
                      } else {
                        setInvoiceNhsError("");
                      }
                    }}
                    maxLength={12}
                  />
                  {invoiceNhsError && (
                    <p className="text-sm text-red-600 mt-1">{invoiceNhsError}</p>
                  )}
                </div>
              )}
              
              <div>
                <Label htmlFor="invoice-total">Total Amount</Label>
                <Input 
                  id="invoice-total" 
                  placeholder="Enter amount (e.g., 150.00)" 
                  value={invoiceTotalAmount}
                  onChange={(e) => setInvoiceTotalAmount(e.target.value)}
                />
                {invoiceTotalError && (
                  <p className="text-sm text-red-600 mt-1">{invoiceTotalError}</p>
                )}
              </div>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center gap-2">
                <Label className="font-semibold">Invoice Type:</Label>
                <Badge 
                  className={
                    invoiceInsuranceProvider && invoiceInsuranceProvider !== '' && invoiceInsuranceProvider !== 'none' 
                      ? "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400" 
                      : "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                  }
                >
                  {invoiceInsuranceProvider && invoiceInsuranceProvider !== '' && invoiceInsuranceProvider !== 'none' 
                    ? "Insurance Claim" 
                    : "Payment (Self-Pay)"}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {invoiceInsuranceProvider && invoiceInsuranceProvider !== '' && invoiceInsuranceProvider !== 'none' 
                  ? "This invoice will be billed to the insurance provider" 
                  : "This invoice will be paid directly by the patient"}
              </p>
            </div>

            <div>
              <Label htmlFor="invoice-notes">Notes</Label>
              <Textarea 
                id="invoice-notes" 
                placeholder="Additional notes or instructions..."
                rows={3}
                value={invoiceNotes}
                onChange={(e) => setInvoiceNotes(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="payment-method">Payment Method</Label>
              <Select
                value={invoiceFormData.paymentMethod}
                onValueChange={(value) =>
                  setInvoiceFormData((prev) => ({ ...prev, paymentMethod: value }))
                }
              >
                <SelectTrigger id="payment-method">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="debit_card">Debit Card</SelectItem>
                </SelectContent>
              </Select>
              {invoicePaymentMethodError && (
                <p className="text-sm text-red-600 mt-1">{invoicePaymentMethodError}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowInvoiceDialog(false);
                  setShowUploadDialog(true);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  // Clear validation errors
                  setInvoicePatientError("");
                  setInvoiceServiceError("");
                  setInvoiceNhsError("");
                  setInvoiceTotalError("");
                  setInvoicePaymentMethodError("");
                  
                  let hasError = false;
                  
                  // Validate patient
                  if (!invoicePatient || invoicePatient === '' || invoicePatient === 'no-patients') {
                    setInvoicePatientError('Please select a patient');
                    hasError = true;
                  }
                  
                  // Validate service
                  if (!invoiceServiceCode.trim()) {
                    setInvoiceServiceError('Please enter a service code');
                    hasError = true;
                  } else if (!invoiceServiceDesc.trim()) {
                    setInvoiceServiceError('Please enter a service description');
                    hasError = true;
                  } else if (!invoiceServiceAmount.trim() || isNaN(parseFloat(invoiceServiceAmount)) || parseFloat(invoiceServiceAmount) <= 0) {
                    setInvoiceServiceError('Please enter a valid service amount');
                    hasError = true;
                  }
                  
                  // Validate total
                  const total = parseFloat(invoiceTotalAmount || '0');
                  if (isNaN(total) || total <= 0) {
                    setInvoiceTotalError('Please enter a valid total amount greater than 0');
                    hasError = true;
                  }
                  
                  // Validate NHS number if insurance selected
                  if (invoiceInsuranceProvider && invoiceInsuranceProvider !== '' && invoiceInsuranceProvider !== 'none') {
                    const digitsOnly = invoiceNhsNumber.replace(/\s+/g, '');
                    if (!invoiceNhsNumber.trim()) {
                      setInvoiceNhsError('NHS number is required for insurance claims');
                      hasError = true;
                    } else if (digitsOnly.length !== 10) {
                      setInvoiceNhsError('NHS number must be exactly 10 digits');
                      hasError = true;
                    } else if (!/^\d+$/.test(digitsOnly)) {
                      setInvoiceNhsError('NHS number must contain only digits');
                      hasError = true;
                    }
                  }
                  
                  // Validate payment method
                  if (!invoiceFormData.paymentMethod) {
                    setInvoicePaymentMethodError("Please select a payment method");
                    hasError = true;
                  }
                  
                  if (hasError) {
                    return;
                  }

                  if (invoiceFormData.paymentMethod === "debit_card") {
                    try {
                      // Create Stripe payment intent
                      const response = await apiRequest("POST", "/api/create-payment-intent", {
                        amount: invoiceFormData.totalAmount,
                      });
                      
                      const { clientSecret } = response as any;
                      
                      toast({
                        title: "Payment Processing",
                        description: "Stripe payment initialized successfully",
                      });
                      
                      // Proceed to summary with all invoice data
                      setSummaryData({
                        ...uploadedImageData,
                        invoice: {
                          ...invoiceFormData,
                          patient: invoicePatient,
                          serviceDate: invoiceServiceDate,
                          invoiceDate: invoiceDate,
                          dueDate: invoiceDueDate,
                          serviceCode: invoiceServiceCode,
                          serviceDesc: invoiceServiceDesc,
                          serviceQty: invoiceServiceQty,
                          serviceAmount: invoiceServiceAmount,
                          insuranceProvider: invoiceInsuranceProvider,
                          nhsNumber: invoiceNhsNumber,
                          totalAmount: parseFloat(invoiceTotalAmount),
                          notes: invoiceNotes,
                        },
                        paymentClientSecret: clientSecret,
                      });
                      
                      setShowInvoiceDialog(false);
                      setShowSummaryDialog(true);
                    } catch (error) {
                      toast({
                        title: "Payment Failed",
                        description: "Could not initialize Stripe payment",
                        variant: "destructive",
                      });
                    }
                  } else {
                    // Cash payment - proceed directly to summary with all invoice data
                    setSummaryData({
                      ...uploadedImageData,
                      invoice: {
                        ...invoiceFormData,
                        patient: invoicePatient,
                        serviceDate: invoiceServiceDate,
                        invoiceDate: invoiceDate,
                        dueDate: invoiceDueDate,
                        serviceCode: invoiceServiceCode,
                        serviceDesc: invoiceServiceDesc,
                        serviceQty: invoiceServiceQty,
                        serviceAmount: invoiceServiceAmount,
                        insuranceProvider: invoiceInsuranceProvider,
                        nhsNumber: invoiceNhsNumber,
                        totalAmount: parseFloat(invoiceTotalAmount),
                        notes: invoiceNotes,
                      },
                    });
                    
                    setShowInvoiceDialog(false);
                    setShowSummaryDialog(true);
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Create Invoice
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Summary Dialog */}
      <Dialog open={showSummaryDialog} onOpenChange={setShowSummaryDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Summary</DialogTitle>
          </DialogHeader>
          {summaryData && (
            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <h5 className="font-semibold mb-3">Imaging Details</h5>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Patient:</span>
                    <p className="font-medium">{summaryData.selectedPatient?.firstName} {summaryData.selectedPatient?.lastName}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Study Type:</span>
                    <p className="font-medium">{summaryData.studyType}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Modality:</span>
                    <p className="font-medium">{summaryData.modality}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Images Uploaded:</span>
                    <p className="font-medium">{summaryData.uploadedFiles?.length} ({summaryData.totalSizeMB} MB)</p>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h5 className="font-semibold mb-3">Invoice Details</h5>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Patient:</span>
                    <p className="font-medium">{summaryData.invoice?.patient}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Service Date:</span>
                    <p className="font-medium">{summaryData.invoice?.serviceDate}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Invoice Date:</span>
                    <p className="font-medium">{summaryData.invoice?.invoiceDate}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Due Date:</span>
                    <p className="font-medium">{summaryData.invoice?.dueDate}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">Service:</span>
                    <p className="font-medium">{summaryData.invoice?.serviceDesc} (Code: {summaryData.invoice?.serviceCode})</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Quantity:</span>
                    <p className="font-medium">{summaryData.invoice?.serviceQty}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Amount:</span>
                    <p className="font-medium">£{summaryData.invoice?.serviceAmount}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Insurance Provider:</span>
                    <p className="font-medium capitalize">{summaryData.invoice?.insuranceProvider === 'none' ? 'Self-Pay' : summaryData.invoice?.insuranceProvider}</p>
                  </div>
                  {summaryData.invoice?.nhsNumber && (
                    <div>
                      <span className="text-gray-600">NHS Number:</span>
                      <p className="font-medium">{summaryData.invoice?.nhsNumber}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-600">Payment Method:</span>
                    <p className="font-medium capitalize">{summaryData.invoice?.paymentMethod.replace('_', ' ')}</p>
                  </div>
                  <div className="col-span-2 pt-2 border-t mt-2">
                    <div className="flex justify-between font-bold">
                      <span>Total Amount:</span>
                      <span className="text-blue-600">£{summaryData.invoice?.totalAmount?.toFixed(2)}</span>
                    </div>
                  </div>
                  {summaryData.invoice?.notes && (
                    <div className="col-span-2">
                      <span className="text-gray-600">Notes:</span>
                      <p className="font-medium text-sm mt-1">{summaryData.invoice?.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowSummaryDialog(false);
                    setShowInvoiceDialog(true);
                  }}
                >
                  Back
                </Button>
                <Button
                  onClick={async () => {
                    try {
                      if (summaryData.invoice.paymentMethod === 'cash') {
                        // For Cash payment: Create invoice with payment record
                        // Get the image ID (e.g., IMG1761380377679I37ONC) from uploadResult for service_id
                        const imageId = summaryData.uploadResult?.images?.[0]?.imageId || summaryData.invoice.serviceCode;
                        
                        const invoiceData = {
                          patientId: summaryData.invoice.patient,
                          serviceDate: summaryData.invoice.serviceDate,
                          invoiceDate: summaryData.invoice.invoiceDate,
                          dueDate: summaryData.invoice.dueDate,
                          totalAmount: summaryData.invoice.totalAmount.toString(),
                          firstServiceCode: summaryData.invoice.serviceCode,
                          firstServiceDesc: summaryData.invoice.serviceDesc,
                          firstServiceQty: summaryData.invoice.serviceQty,
                          firstServiceAmount: summaryData.invoice.serviceAmount,
                          insuranceProvider: summaryData.invoice.insuranceProvider,
                          nhsNumber: summaryData.invoice.nhsNumber || '',
                          notes: summaryData.invoice.notes || '',
                          serviceId: imageId,
                          serviceType: 'medical_images',
                        };

                        // Create invoice
                        const invoiceResponse = await apiRequest("POST", "/api/billing/invoices", invoiceData);
                        const createdInvoice = await invoiceResponse.json();

                        // Create payment record
                        const paymentData = {
                          organizationId: createdInvoice.organizationId,
                          invoiceId: createdInvoice.id,
                          patientId: summaryData.invoice.patient,
                          transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                          amount: summaryData.invoice.totalAmount,
                          currency: 'GBP',
                          paymentMethod: 'cash',
                          paymentProvider: 'cash',
                          paymentStatus: 'completed',
                          paymentDate: new Date().toISOString(),
                          reference: `CASH-${Date.now().toString().slice(-8)}`,
                          notes: 'Cash payment for imaging services',
                        };

                        await apiRequest("POST", "/api/billing/payments", paymentData);

                        // Update invoice status to paid and paidAmount
                        await apiRequest("PATCH", `/api/billing/invoices/${createdInvoice.id}`, {
                          status: 'paid',
                          paidAmount: summaryData.invoice.totalAmount.toString(),
                        });

                        // Show success modal with invoice details
                        setPaymentSuccessData({
                          invoiceId: createdInvoice.invoiceNumber,
                          patientName: createdInvoice.patientName,
                          amount: summaryData.invoice.totalAmount,
                        });
                        setShowPaymentSuccessDialog(true);

                        // Reset all state
                        setUploadFormData({
                          patientId: "",
                          studyType: "",
                          modality: "X-Ray",
                          bodyPart: "",
                          indication: "",
                          priority: "routine",
                        });
                        setSelectedFiles([]);
                        setUploadedImageData(null);
                        setSummaryData(null);
                        setShowSummaryDialog(false);

                        // Refresh the medical images list
                        refetchImages();
                      } else {
                        // For Debit Card payment - handle Stripe flow
                        toast({
                          title: "Payment Processing",
                          description: "Please complete Stripe payment",
                        });
                      }
                    } catch (error) {
                      toast({
                        title: "Error",
                        description: "Failed to process payment",
                        variant: "destructive",
                      });
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {summaryData.invoice?.paymentMethod === 'cash' ? 'Confirm Pay' : 'Confirm'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Image Dialog */}
      <Dialog open={showEditImageDialog} onOpenChange={setShowEditImageDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Replace Medical Image</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!uploadedFile ? (
              <p className="text-sm text-gray-600">
                Select a new image file to replace the existing medical image. This will update the file name and other information in the database.
              </p>
            ) : (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800">
                  ✓ File ready to replace: <strong>{uploadedFile.name}</strong> 
                  <br />
                  Click "Save Image" to confirm the replacement.
                </p>
              </div>
            )}
            
            <div>
              <Label htmlFor="replacement-file">Select New Image File</Label>
              <Input
                id="replacement-file"
                type="file"
                accept="image/*,.dcm"
                onChange={(e) => {
                  const files = e.target.files;
                  if (files) {
                    setSelectedFiles(Array.from(files));
                  }
                }}
                data-testid="input-replacement-file"
              />
              {selectedFiles.length > 0 && (
                <p className="text-sm text-green-600 mt-2">
                  Selected: {selectedFiles[0].name} ({(selectedFiles[0].size / (1024 * 1024)).toFixed(2)} MB)
                </p>
              )}
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditImageDialog(false);
                  setSelectedFiles([]);
                  setUploadedFile(null);
                  setEditingStudyId(null);
                }}
                data-testid="button-cancel-edit"
              >
                Cancel
              </Button>
              
              {!uploadedFile ? (
                <Button
                  onClick={handleReplaceImage}
                  disabled={selectedFiles.length === 0}
                  data-testid="button-confirm-replace"
                >
                  Replace Image
                </Button>
              ) : (
                <Button
                  onClick={handleSaveImage}
                  disabled={replaceImageMutation.isPending}
                  data-testid="button-save-image"
                >
                  {replaceImageMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Image'
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Success Dialog */}
      <Dialog open={showPaymentSuccessDialog} onOpenChange={setShowPaymentSuccessDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <span>Payment Successful</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Cash payment recorded and invoice marked as paid
            </p>
            
            {paymentSuccessData && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Invoice ID:</span>
                  <span className="text-sm font-semibold">{paymentSuccessData.invoiceId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Patient Name:</span>
                  <span className="text-sm font-semibold">{paymentSuccessData.patientName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Amount:</span>
                  <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                    £{paymentSuccessData.amount.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button
                onClick={() => {
                  setShowPaymentSuccessDialog(false);
                  setPaymentSuccessData(null);
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* PDF Viewer Dialog */}
      <Dialog open={showPDFViewerDialog} onOpenChange={(open) => {
        setShowPDFViewerDialog(open);
        if (!open && pdfViewerUrl) {
          URL.revokeObjectURL(pdfViewerUrl);
          setPdfViewerUrl(null);
        }
      }}>
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Radiology Report</DialogTitle>
          </DialogHeader>
          <div className="flex-1 w-full overflow-hidden">
            {pdfViewerUrl && (
              <iframe
                src={pdfViewerUrl}
                className="w-full h-full border-0"
                title="PDF Report Viewer"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
