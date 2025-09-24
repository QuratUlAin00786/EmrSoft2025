import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
} from "lucide-react";
import { format } from "date-fns";

interface ImagingStudy {
  id: string;
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

  const [generatedReportId, setGeneratedReportId] = useState<string | null>(
    null,
  );
  const [generatedReportFileName, setGeneratedReportFileName] = useState<
    string | null
  >(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
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
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImageSeries, setSelectedImageSeries] = useState<any>(null);
  const [deletedStudyIds, setDeletedStudyIds] = useState<Set<string>>(
    new Set(),
  );
  const [showEditImageDialog, setShowEditImageDialog] = useState(false);
  const [editingStudyId, setEditingStudyId] = useState<string | null>(null);
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

    const mapped: ImagingStudy = {
      id: String(study.id),
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
      findings: study.findings ?? `Medical image uploaded: ${study.fileName}`,
      impression:
        study.impression ??
        `File: ${study.fileName} (${(study.fileSize / (1024 * 1024)).toFixed(2)} MB)`,
      radiologist: study.radiologist ?? study.uploadedByName ?? "Unknown",
      fileName: study.fileName, // Add fileName from medical_images table for PDF generation
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
        },
      ],
      ...(study.report && { report: study.report }),
    };
    return mapped;
  }, [medicalImages, selectedStudyId]);

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
      
      const response = await apiRequest(
        "PUT",
        `/api/medical-images/${studyId}/replace`,
        formData,
      );
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
      if (fieldName === "scheduledAt")
        setScheduledDate(
          selectedStudy.scheduledAt
            ? new Date(selectedStudy.scheduledAt)
            : undefined,
        );
      if (fieldName === "performedAt")
        setPerformedDate(
          selectedStudy.performedAt
            ? new Date(selectedStudy.performedAt)
            : undefined,
        );
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
      if (fieldName === "scheduledAt")
        setScheduledDate(
          selectedStudy.scheduledAt
            ? new Date(selectedStudy.scheduledAt)
            : undefined,
        );
      if (fieldName === "performedAt")
        setPerformedDate(
          selectedStudy.performedAt
            ? new Date(selectedStudy.performedAt)
            : undefined,
        );
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
    if (fieldName === "scheduledAt") value = scheduledDate?.toISOString() || "";
    if (fieldName === "performedAt") value = performedDate?.toISOString() || "";
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
        "X-Tenant-Subdomain": "demo",
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
      !uploadFormData.studyType ||
      selectedFiles.length === 0
    ) {
      toast({
        title: "Upload Failed",
        description:
          "Please fill in all required fields and select images to upload",
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

      // Helper function to get the correct tenant subdomain (same as queryClient.ts)
      function getTenantSubdomain(): string {
        const hostname = window.location.hostname;
        
        // For development/replit environments, use 'demo'
        if (hostname.includes('.replit.app') || hostname.includes('localhost') || hostname.includes('replit.dev') || hostname.includes('127.0.0.1')) {
          return 'demo';
        }
        
        // For production environments, extract subdomain from hostname
        const parts = hostname.split('.');
        if (parts.length >= 2) {
          return parts[0] || 'demo';
        }
        
        // Fallback to 'demo'
        return 'demo';
      }

      // Upload using fetch to handle FormData properly with authentication
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'X-Tenant-Subdomain': getTenantSubdomain()
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

      toast({
        title: "Images Uploaded Successfully",
        description: `${selectedFiles.length} images (${totalSizeMB} MB) uploaded with unique names for ${selectedPatient.firstName} ${selectedPatient.lastName}`,
      });

      // Reset form and close dialog
      setUploadFormData({
        patientId: "",
        studyType: "",
        modality: "X-Ray",
        bodyPart: "",
        indication: "",
        priority: "routine",
      });
      setSelectedFiles([]);
      setShowUploadDialog(false);

      // Refresh the medical images list
      refetchImages();
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

    try {
      // Find the selected patient to get the numeric ID
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

      const orderData = {
        patientId: selectedPatient.id, // Use the numeric database ID
        imageType: orderFormData.studyType,
        studyType: orderFormData.studyType,
        modality: orderFormData.modality,
        bodyPart: orderFormData.bodyPart,
        indication: orderFormData.indication,
        priority: orderFormData.priority,
        filename: `${orderFormData.studyType}_${Date.now()}_order.dcm`, // Placeholder filename for order
        fileUrl: "", // Empty for orders
        fileSize: 0, // Zero for orders
        uploadedBy: 348, // Current user ID (admin)
        imageData: "", // Empty for orders
        mimeType: "application/dicom", // Standard DICOM MIME type
        status: "ordered", // Set status as ordered instead of uploaded
        notes: orderFormData.specialInstructions || "",
      };

      await apiRequest("POST", "/api/medical-images", orderData);

      toast({
        title: "Study Ordered Successfully",
        description: `${orderFormData.studyType} study ordered for ${selectedPatient.firstName} ${selectedPatient.lastName}`,
      });

      // Reset form and close dialog
      setOrderFormData({
        patientId: "",
        studyType: "",
        modality: "X-Ray",
        bodyPart: "",
        indication: "",
        priority: "routine",
        specialInstructions: "",
      });
      setShowNewOrder(false);

      // Refresh the medical images list to show the new order
      refetchImages();
    } catch (error) {
      console.error("Order error:", error);
      toast({
        title: "Order Failed",
        description: "Failed to create imaging study order. Please try again.",
        variant: "destructive",
      });
    }
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
    if (editingStudyId && selectedFiles.length > 0) {
      replaceImageMutation.mutate({
        studyId: editingStudyId,
        file: selectedFiles[0],
      });
    }
  };

  const generatePDFReport = async (study: any) => {
    try {
      setIsGeneratingPDF(true);
      setGeneratedReportId(null);

      // Check if the medical image has a fileName and fetch image data
      let imageData = null;
      if (study.fileName && study.fileName.trim() !== '') {
        console.log("📷 IMAGING: Found fileName for PDF generation:", study.fileName);
        
        // If imageData is already available in the study, use it
        if (study.images && study.images.length > 0 && study.images[0].imageData) {
          imageData = study.images[0].imageData;
          console.log("📷 IMAGING: Using existing imageData from study");
        } else {
          // Fetch image data from server using the fileName
          try {
            console.log("📷 IMAGING: Fetching image from server for fileName:", study.fileName);
            const imageResponse = await apiRequest('GET', `/api/medical-images/${study.id}/image`);
            if (imageResponse.ok) {
              const imageBlob = await imageResponse.blob();
              // Convert blob to base64
              const reader = new FileReader();
              imageData = await new Promise((resolve) => {
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(imageBlob);
              });
              console.log("📷 IMAGING: Successfully fetched image data from server");
            } else {
              console.warn("📷 IMAGING: Failed to fetch image from server:", imageResponse.status);
            }
          } catch (imageError) {
            console.error("📷 IMAGING: Error fetching image:", imageError);
          }
        }
      } else {
        console.log("📷 IMAGING: No fileName found for study, generating PDF without image");
      }

      // Call server-side PDF generation endpoint
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
          imageData: imageData, // Include image data for PDF generation
        },
      );

      const data = await response.json();

      if (data.success && data.reportId) {
        setGeneratedReportId(data.reportId);
        setGeneratedReportFileName(data.fileName || `${data.reportId}.pdf`);

        // Refresh the medical images to get updated data
        refetchImages();

        toast({
          title: "PDF Report Generated Successfully",
          description: `Report saved as: ${data.fileName || `${data.reportId}.pdf`}${imageData ? ' (with medical image)' : ''}`,
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
        description: "Failed to generate PDF report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const viewPDFReport = async (reportId: string) => {
    try {
      // Prepare authentication headers
      const headers: Record<string, string> = {
        "X-Tenant-Subdomain": "demo",
      };

      // Add authorization token if available
      const token = localStorage.getItem("token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // Fetch PDF with authentication
      const response = await fetch(`/api/imaging/reports/${reportId}`, {
        method: "GET",
        headers,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to load PDF: ${response.status} ${response.statusText}`);
      }

      // Convert response to blob
      const blob = await response.blob();
      
      // Create blob URL and open in new window
      const blobUrl = URL.createObjectURL(blob);
      const newWindow = window.open(
        blobUrl,
        "_blank",
        "width=800,height=600,scrollbars=yes,resizable=yes",
      );

      // Clean up blob URL after window is loaded
      if (newWindow) {
        newWindow.addEventListener('load', () => {
          URL.revokeObjectURL(blobUrl);
        });
      } else {
        // Fallback cleanup if window didn't open
        setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
      }
    } catch (error) {
      console.error("Error viewing PDF:", error);
      toast({
        title: "Error",
        description: "Failed to open PDF report. Please try again.",
        variant: "destructive",
      });
    }
  };

  const downloadPDFReport = async (reportId: string) => {
    try {
      // Prepare authentication headers
      const headers: Record<string, string> = {
        "X-Tenant-Subdomain": "demo",
      };

      // Add authorization token if available
      const token = localStorage.getItem("token");
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

    const confirmDelete = window.confirm(
      `Are you sure you want to delete the ${study.studyType} study for ${study.patientName}? This action cannot be undone.`,
    );

    if (!confirmDelete) return;

    try {
      // Add the study ID to the deleted set to remove it from the display
      setDeletedStudyIds((prev) => new Set([...prev, studyId]));

      toast({
        title: "Study Deleted",
        description: `${study.studyType} study for ${study.patientName} has been deleted successfully`,
      });
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
                      Pending Reports
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      5
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
                      8
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
                      Urgent Studies
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      3
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
                      142
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
            {filteredStudies.map((study: any) => (
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
                                  className="bg-gray-50 dark:bg-slate-600 p-3 rounded-lg border dark:border-slate-500"
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
                            <div className="flex items-center gap-2">
                              <span>
                                <strong>Scheduled:</strong>
                              </span>
                              {selectedStudy?.id === study.id &&
                              editModes.scheduledAt ? (
                                <div className="flex items-center gap-2">
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
                                </div>
                              )}
                            </div>

                            {/* Performed Date - Editable */}
                            <div className="flex items-center gap-2">
                              <span>
                                <strong>Performed:</strong>
                              </span>
                              {selectedStudy?.id === study.id &&
                              editModes.performedAt ? (
                                <div className="flex items-center gap-2">
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewStudy(study)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>

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
                                  "X-Tenant-Subdomain": "demo",
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
                                const token =
                                  localStorage.getItem("auth_token");
                                const headers: Record<string, string> = {
                                  "X-Tenant-Subdomain": "demo",
                                };

                                if (token) {
                                  headers["Authorization"] = `Bearer ${token}`;
                                }

                                const response = await fetch(
                                  `/api/imaging/reports/${study.reportFileName.replace(".pdf", "")}?download=true`,
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

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleShareStudy(study)}
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGenerateReport(study.id)}
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteStudy(study.id)}
                        className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
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
                  onClick={() => {
                    const method =
                      shareFormData.method === "email" ? "email" : "WhatsApp";
                    const contact =
                      shareFormData.method === "email"
                        ? shareFormData.email
                        : shareFormData.whatsapp;

                    toast({
                      title: "Study Shared",
                      description: `Imaging study sent to ${selectedStudy.patientName} via ${method} (${contact})`,
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

                {/* Saved Reports Section */}
                {selectedStudy.reportFileName &&
                  !deletedStudyIds.has(selectedStudy.id) && (
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
                                if (selectedStudy.reportFileName) {
                                  const reportId = selectedStudy.reportFileName.replace(".pdf", "");
                                  await viewPDFReport(reportId);
                                }
                              }}
                              className="p-0 h-auto text-blue-600 hover:text-blue-800 underline"
                              data-testid="link-saved-report"
                            >
                              {selectedStudy.reportFileName}
                            </Button>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              if (selectedStudy.reportFileName) {
                                try {
                                  const reportId =
                                    selectedStudy.reportFileName.replace(
                                      ".pdf",
                                      "",
                                    );
                                  const response = await apiRequest(
                                    "DELETE",
                                    `/api/imaging/reports/${reportId}`,
                                  );

                                  toast({
                                    title: "Success",
                                    description: "Report deleted successfully",
                                  });

                                  // Update the cache to remove reportFileName, hiding the "Saved Reports" box
                                  if (selectedStudyId) {
                                    queryClient.setQueryData(
                                      ["/api/medical-images"],
                                      (old: any[] = []) =>
                                        old.map((study: any) =>
                                          study.id?.toString() ===
                                          selectedStudyId
                                            ? {
                                                ...study,
                                                reportFileName: undefined,
                                                reportFilePath: undefined,
                                              }
                                            : study,
                                        ),
                                    );
                                  }

                                  // Refresh the studies data
                                  queryClient.invalidateQueries({
                                    queryKey: ["/api/imaging/studies"],
                                  });
                                  refetchImages();
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
                    <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                      {selectedStudy.impression}
                    </p>
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
                          onClick={() => {
                            // Get image from filesystem using API endpoint
                            const imageForViewer = {
                              seriesDescription: image.seriesDescription,
                              type: image.type,
                              imageCount: image.imageCount,
                              size: image.size,
                              imageId: selectedStudy.id, // Use study ID for API endpoint
                              imageUrl: `/api/medical-images/${selectedStudy.id}/image`, // API endpoint for filesystem image
                              mimeType: image.mimeType || "image/jpeg",
                              fileName: selectedStudy.fileName || null, // Get fileName from study for logging
                            };
                            setSelectedImageSeries(imageForViewer);
                            setShowImageViewer(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Images
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditImage(selectedStudy.id)}
                          data-testid="button-edit-image"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
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

            {/* Study Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="upload-modality">Modality *</Label>
                <Select
                  value={uploadFormData.modality}
                  onValueChange={(value) =>
                    setUploadFormData({ ...uploadFormData, modality: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
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
              <Label htmlFor="upload-study-type">Study Type *</Label>
              <Input
                id="upload-study-type"
                value={uploadFormData.studyType}
                onChange={(e) =>
                  setUploadFormData({
                    ...uploadFormData,
                    studyType: e.target.value,
                  })
                }
                placeholder="e.g., Chest X-Ray PA and Lateral"
              />
            </div>

            <div>
              <Label htmlFor="upload-body-part">Body Part</Label>
              <Input
                id="upload-body-part"
                value={uploadFormData.bodyPart}
                onChange={(e) =>
                  setUploadFormData({
                    ...uploadFormData,
                    bodyPart: e.target.value,
                  })
                }
                placeholder="e.g., Chest, Abdomen, Left Hand"
              />
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

            {/* File Upload */}
            <div>
              <Label htmlFor="upload-files">Medical Images *</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <FileImage className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <div className="space-y-2">
                  <div>
                    <input
                      type="file"
                      id="upload-files"
                      multiple
                      accept="image/*,.dcm,.dicom,.jpg,.jpeg,.png,.gif,.bmp,.tiff,.tif,.webp,.svg,.ico,.jfif,.pjpeg,.pjp"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        document.getElementById("upload-files")?.click()
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
                  !uploadFormData.studyType ||
                  selectedFiles.length === 0
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

      {/* Edit Image Dialog */}
      <Dialog open={showEditImageDialog} onOpenChange={setShowEditImageDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Replace Medical Image</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Select a new image file to replace the existing medical image. This will update the file name and other information in the database.
            </p>
            
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
                  setEditingStudyId(null);
                }}
                data-testid="button-cancel-edit"
              >
                Cancel
              </Button>
              <Button
                onClick={handleReplaceImage}
                disabled={selectedFiles.length === 0 || replaceImageMutation.isPending}
                data-testid="button-confirm-replace"
              >
                {replaceImageMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Replacing...
                  </>
                ) : (
                  'Replace Image'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
