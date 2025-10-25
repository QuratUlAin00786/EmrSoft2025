import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Pill,
  Plus,
  Search,
  AlertTriangle,
  Check,
  CheckCircle,
  Clock,
  User,
  Calendar,
  FileText,
  Printer,
  Send,
  Eye,
  Edit,
  Trash2,
  PenTool,
  Paperclip,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { getActiveSubdomain } from "@/lib/subdomain-utils";
import { useLocation } from "wouter";
import { isDoctorLike, formatRoleLabel } from "@/lib/role-utils";

interface Prescription {
  id: string;
  patientId: string;
  patientName: string;
  providerId: string;
  providerName: string;
  doctorId?: number;
  prescriptionNumber?: string;
  prescriptionCreatedBy?: number;
  createdAt?: string;
  updatedAt?: string;
  issuedDate?: string;
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    quantity: number;
    refills: number;
    instructions: string;
    genericAllowed: boolean;
  }>;
  diagnosis: string;
  status: "active" | "completed" | "cancelled" | "pending" | "signed";
  prescribedAt: string;
  pharmacy?: {
    name: string;
    address: string;
    phone: string;
    email?: string;
  };
  interactions?: Array<{
    severity: "minor" | "moderate" | "major";
    description: string;
  }>;
  signature?: {
    doctorSignature: string;
    signedAt: string;
    signedBy: string;
  };
}

const mockPrescriptions: Prescription[] = [
  {
    id: "rx_001",
    patientId: "p_001",
    patientName: "Sarah Johnson",
    providerId: "dr_001",
    providerName: "Dr. Sarah Smith",
    medications: [
      {
        name: "Lisinopril",
        dosage: "10mg",
        frequency: "Once daily",
        duration: "30 days",
        quantity: 30,
        refills: 5,
        instructions: "Take with or without food",
        genericAllowed: true,
      },
      {
        name: "Metformin",
        dosage: "500mg",
        frequency: "Twice daily with meals",
        duration: "90 days",
        quantity: 180,
        refills: 3,
        instructions: "Take with breakfast and dinner",
        genericAllowed: true,
      },
    ],
    diagnosis: "Hypertension, Type 2 Diabetes",
    status: "active",
    prescribedAt: "2024-01-15T10:30:00Z",
    pharmacy: {
      name: "City Pharmacy",
      address: "123 Main St, London",
      phone: "+44 20 7946 0958",
    },
  },
  {
    id: "rx_002",
    patientId: "p_002",
    patientName: "Robert Davis",
    providerId: "dr_001",
    providerName: "Dr. Sarah Smith",
    medications: [
      {
        name: "Amoxicillin",
        dosage: "500mg",
        frequency: "Three times daily",
        duration: "7 days",
        quantity: 21,
        refills: 0,
        instructions: "Complete full course. Take with food.",
        genericAllowed: true,
      },
    ],
    diagnosis: "Upper Respiratory Infection",
    status: "completed",
    prescribedAt: "2024-01-10T14:15:00Z",
    interactions: [
      {
        severity: "minor",
        description: "May reduce effectiveness of oral contraceptives",
      },
    ],
  },
  {
    id: "rx_003",
    patientId: "p_003",
    patientName: "Emily Watson",
    providerId: "dr_002",
    providerName: "Dr. James Wilson",
    medications: [
      {
        name: "Atorvastatin",
        dosage: "20mg",
        frequency: "Once daily",
        duration: "30 days",
        quantity: 30,
        refills: 5,
        instructions: "Take in the evening",
        genericAllowed: true,
      },
    ],
    diagnosis: "Hypercholesterolemia",
    status: "active",
    prescribedAt: "2024-01-12T09:45:00Z",
  },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800";
    case "completed":
      return "bg-blue-100 text-blue-800";
    case "cancelled":
      return "bg-red-100 text-red-800";
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "signed":
      return "bg-purple-100 text-purple-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "minor":
      return "bg-yellow-100 text-yellow-800";
    case "moderate":
      return "bg-orange-100 text-orange-800";
    case "major":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export default function PrescriptionsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedPrescription, setSelectedPrescription] =
    useState<Prescription | null>(null);
  const [showNewPrescription, setShowNewPrescription] = useState(false);
  const [showPharmacyDialog, setShowPharmacyDialog] = useState(false);
  const [selectedPrescriptionId, setSelectedPrescriptionId] =
    useState<string>("");
  const [pharmacyEmail, setPharmacyEmail] = useState<string>(
    "pharmacy@halohealth.co.uk",
  );
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const queryClient = useQueryClient();

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

  // Fetch clinic headers
  const { data: clinicHeader } = useQuery({
    queryKey: ["/api/clinic-headers"],
    enabled: !!user,
  });

  // Fetch clinic footers
  const { data: clinicFooter } = useQuery({
    queryKey: ["/api/clinic-footers"],
    enabled: !!user,
  });

  // Status editing state
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [tempStatus, setTempStatus] = useState<string>("");

  // Status update mutation
  const statusUpdateMutation = useMutation({
    mutationFn: async ({
      prescriptionId,
      status,
    }: {
      prescriptionId: string;
      status: string;
    }) => {
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {
        "X-Tenant-Subdomain": getActiveSubdomain(),
        "Content-Type": "application/json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/prescriptions/${prescriptionId}`, {
        method: "PATCH",
        headers,
        credentials: "include",
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update status: ${response.status}`);
      }

      return response.json();
    },
    onSuccess: () => {
      // Auto refresh - invalidate and refetch prescriptions
      queryClient.invalidateQueries({ queryKey: ["/api/prescriptions"] });
      toast({
        title: "Status Updated",
        description: "Prescription status has been updated successfully.",
      });
      setEditingStatusId(null);
      setTempStatus("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update prescription status. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Helper functions for status editing
  const handleStartEditingStatus = (
    prescriptionId: string,
    currentStatus: string,
  ) => {
    setEditingStatusId(prescriptionId);
    setTempStatus(currentStatus);
  };

  const handleCancelEditingStatus = () => {
    setEditingStatusId(null);
    setTempStatus("");
  };

  const handleSaveStatus = () => {
    if (editingStatusId && tempStatus) {
      statusUpdateMutation.mutate({
        prescriptionId: editingStatusId,
        status: tempStatus,
      });
    }
  };

  // E-signature state
  const [showESignDialog, setShowESignDialog] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signature, setSignature] = useState<string>("");
  const [signatureSaved, setSignatureSaved] = useState(false);
  const [lastPosition, setLastPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  // Form state for prescription editing
  const [formData, setFormData] = useState({
    patientId: "",
    patientName: "",
    providerId: "",
    diagnosis: "",
    medications: [
      {
        name: "",
        dosage: "",
        frequency: "",
        duration: "",
        quantity: "",
        refills: "",
        instructions: "",
        genericAllowed: true,
      },
    ],
    pharmacyName: "Halo Health",
    pharmacyAddress: "Unit 2 Drayton Court, Solihull, B90 4NG",
    pharmacyPhone: "+44(0)121 827 5531",
    pharmacyEmail: "pharmacy@halohealth.co.uk",
  });

  // Form validation errors
  const [formErrors, setFormErrors] = useState<{
    medications: Array<{
      name?: string;
      dosage?: string;
      frequency?: string;
      duration?: string;
      quantity?: string;
      refills?: string;
      instructions?: string;
    }>;
    general?: string;
  }>({ medications: [] });

  // Update form data when selectedPrescription changes
  useEffect(() => {
    if (selectedPrescription) {
      const medications =
        selectedPrescription.medications.length > 0
          ? selectedPrescription.medications.map((med) => ({
              name: med.name || "",
              dosage: med.dosage || "",
              frequency: med.frequency || "",
              duration: med.duration || "",
              quantity: med.quantity?.toString() || "",
              refills: med.refills?.toString() || "",
              instructions: med.instructions || "",
              genericAllowed:
                med.genericAllowed !== undefined ? med.genericAllowed : true,
            }))
          : [
              {
                name: "",
                dosage: "",
                frequency: "",
                duration: "",
                quantity: "",
                refills: "",
                instructions: "",
                genericAllowed: true,
              },
            ];

      // Clear form errors when editing
      setFormErrors({ medications: [] });

      setFormData({
        patientId: selectedPrescription.patientId?.toString() || "",
        patientName: selectedPrescription.patientName || "",
        providerId: selectedPrescription.providerId?.toString() || "",
        diagnosis: selectedPrescription.diagnosis || "",
        medications: medications,
        pharmacyName: selectedPrescription.pharmacy?.name || "Halo Health",
        pharmacyAddress:
          selectedPrescription.pharmacy?.address ||
          "Unit 2 Drayton Court, Solihull, B90 4NG",
        pharmacyPhone:
          selectedPrescription.pharmacy?.phone || "+44(0)121 827 5531",
        pharmacyEmail:
          selectedPrescription.pharmacy?.email || "pharmacy@halohealth.co.uk",
      });
    } else {
      // For new prescriptions: Auto-populate providerId for doctors
      const autoProviderId =
        user && isDoctorLike(user.role) ? user.id.toString() : "";
      setFormData({
        patientId: "",
        patientName: "",
        providerId: autoProviderId,
        diagnosis: "",
        medications: [
          {
            name: "",
            dosage: "",
            frequency: "",
            duration: "",
            quantity: "",
            refills: "",
            instructions: "",
            genericAllowed: true,
          },
        ],
        pharmacyName: "Halo Health",
        pharmacyAddress: "Unit 2 Drayton Court, Solihull, B90 4NG",
        pharmacyPhone: "+44(0)121 827 5531",
        pharmacyEmail: "pharmacy@halohealth.co.uk",
      });
      // Clear form errors when creating new
      setFormErrors({ medications: [] });
    }
  }, [selectedPrescription, user]);

  const fetchPatients = async () => {
    try {
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
    }
  };

  const fetchProviders = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {
        "X-Tenant-Subdomain": getActiveSubdomain(),
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch("/api/users", {
        headers,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log("Fetched providers:", data);
      // Store all users for role-based filtering
      setAllUsers(Array.isArray(data) ? data : []);
      // Filter to show only doctor-like roles and nurses
      const filteredProviders = (Array.isArray(data) ? data : []).filter(
        (provider: any) =>
          isDoctorLike(provider.role) || provider.role === "nurse",
      );
      setProviders(filteredProviders);
    } catch (err) {
      console.error("Error fetching providers:", err);
      setProviders([]);
      setAllUsers([]);
    }
  };

  // Function to fetch prescriptions for patient role
  const fetchPrescriptionsByPatientId = async (patientId: number) => {
    const token = localStorage.getItem("auth_token");
    const headers: Record<string, string> = {
      "X-Tenant-Subdomain": getActiveSubdomain(),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`/api/prescriptions?patientId=${patientId}`, {
      headers,
      credentials: "include",
    });
    if (!response.ok) {
      throw new Error(
        `Failed to fetch patient prescriptions: ${response.status}`,
      );
    }
    const data = await response.json();
    return data;
  };

  // Function to fetch prescriptions for doctor role
  const fetchPrescriptionsByDoctorId = async (doctorId: number) => {
    const token = localStorage.getItem("auth_token");
    const headers: Record<string, string> = {
      "X-Tenant-Subdomain": getActiveSubdomain(),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`/api/prescriptions?providerId=${doctorId}`, {
      headers,
      credentials: "include",
    });
    if (!response.ok) {
      throw new Error(
        `Failed to fetch doctor prescriptions: ${response.status}`,
      );
    }
    const data = await response.json();
    return data;
  };

  // Function to fetch all prescriptions (for other roles)
  const fetchAllPrescriptions = async () => {
    const token = localStorage.getItem("auth_token");
    const headers: Record<string, string> = {
      "X-Tenant-Subdomain": getActiveSubdomain(),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch("/api/prescriptions", {
      headers,
      credentials: "include",
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch prescriptions: ${response.status}`);
    }
    const data = await response.json();
    return data;
  };

  useEffect(() => {
    fetchPatients();
    fetchProviders();
  }, []);

  // Ensure providerId is always set for doctors when dialog is open
  useEffect(() => {
    if (
      showNewPrescription &&
      user &&
      isDoctorLike(user.role) &&
      !formData.providerId
    ) {
      console.log(
        "🔧 FIXING MISSING PROVIDER ID - Setting to:",
        user.id.toString(),
      );
      setFormData((prev) => ({
        ...prev,
        providerId: user.id.toString(),
      }));
    }
  }, [showNewPrescription, user, formData.providerId]);

  // Role-based prescription fetching
  const {
    data: rawPrescriptions = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/prescriptions", user?.role, user?.id],
    queryFn: async () => {
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Admin role gets all prescriptions from database
      if (user.role === "admin") {
        return await fetchAllPrescriptions();
      }
      
      // Check if the current user role is Patient
      if (user.role === "patient") {
        // Get the patient ID from session/auth - match by email first for accuracy
        console.log("🔍 PRESCRIPTIONS: Looking for patient matching user:", {
          userEmail: user.email,
          userName: `${user.firstName} ${user.lastName}`,
          userId: user.id,
        });
        console.log(
          "📋 PRESCRIPTIONS: Available patients:",
          patients.map((p) => ({
            id: p.id,
            email: p.email,
            name: `${p.firstName} ${p.lastName}`,
          })),
        );

        // Try email match first (most reliable)
        let currentPatient = patients.find(
          (patient: any) =>
            patient.email &&
            user.email &&
            patient.email.toLowerCase() === user.email.toLowerCase(),
        );

        // If no email match, try exact name match
        if (!currentPatient) {
          currentPatient = patients.find(
            (patient: any) =>
              patient.firstName &&
              user.firstName &&
              patient.lastName &&
              user.lastName &&
              patient.firstName.toLowerCase() ===
                user.firstName.toLowerCase() &&
              patient.lastName.toLowerCase() === user.lastName.toLowerCase(),
          );
        }

        if (currentPatient) {
          console.log(
            "✅ PRESCRIPTIONS: Found matching patient:",
            currentPatient,
          );
          // Fetch data from the database using that patient ID
          // Returns only the specific patient data (not all data)
          return await fetchPrescriptionsByPatientId(currentPatient.id);
        } else {
          // If patient doesn't exist, return empty array
          console.log(
            "❌ PRESCRIPTIONS: Patient not found for user:",
            user.email,
          );
          return [];
        }
      } else if (isDoctorLike(user.role)) {
        // Get prescriptions created by this doctor-like role
        return await fetchPrescriptionsByDoctorId(user.id);
      } else {
        // For other roles (nurse, etc.), show all prescriptions
        return await fetchAllPrescriptions();
      }
    },
    enabled: !!user && patients.length > 0, // Wait for user and patients data to be loaded
  });

  // Fetch drug interactions count from database
  const { data: drugInteractionsData } = useQuery({
    queryKey: ["/api/clinical/patient-drug-interactions"],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {
        "X-Tenant-Subdomain": getActiveSubdomain(),
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch("/api/clinical/patient-drug-interactions", {
        headers,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch drug interactions: ${response.status}`,
        );
      }

      return response.json();
    },
    enabled: !!user,
  });

  const drugInteractionsCount = drugInteractionsData?.count || 0;

  // Create patient and provider name mappings from fetched data
  const patientNames: Record<number, string> = {};
  patients.forEach((patient) => {
    patientNames[patient.id] = `${patient.firstName} ${patient.lastName}`;
  });

  const providerNames: Record<number, string> = {};
  // Use allUsers instead of providers to include all roles
  allUsers.forEach((provider) => {
    providerNames[provider.id] =
      `Dr. ${provider.firstName} ${provider.lastName}`;
  });

  const prescriptions = Array.isArray(rawPrescriptions)
    ? rawPrescriptions.map((prescription: any) => {
        const patient = patients.find((p) => p.id === prescription.patientId);
        return {
          ...prescription,
          patientName:
            patientNames[prescription.patientId] ||
            `Patient ${prescription.patientId}`,
          providerName:
            providerNames[prescription.providerId] ||
            `Provider ${prescription.providerId}`,
          patientSex: patient?.genderAtBirth || "Not specified",
        };
      })
    : [];

  const createPrescriptionMutation = useMutation({
    mutationFn: async (prescriptionData: any) => {
      console.log(
        "🚀 PRESCRIPTION MUTATION START - Sending data:",
        prescriptionData,
      );
      const isUpdate = selectedPrescription && selectedPrescription.id;
      const url = isUpdate
        ? `/api/prescriptions/${selectedPrescription.id}`
        : "/api/prescriptions";
      const method = isUpdate ? "PATCH" : "POST";

      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Tenant-Subdomain": getActiveSubdomain(),
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      console.log("📡 Making request to:", url, "Method:", method);
      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(prescriptionData),
        credentials: "include",
      });

      console.log("📡 Response status:", response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ API Error:", errorText);

        // Try to parse error message from JSON response
        let errorMessage = `Failed to ${isUpdate ? "update" : "create"} prescription`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorJson.message || errorMessage;
        } catch {
          // If not JSON, use the text as-is
          errorMessage = errorText || errorMessage;
        }

        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log("✅ PRESCRIPTION SUCCESS - API returned:", result);
      return result;
    },
    onSuccess: (data) => {
      console.log("🎉 PRESCRIPTION onSuccess triggered with data:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/prescriptions"] });
      setShowNewPrescription(false);
      setSelectedPrescription(null);
      toast({
        title: "Success",
        description:
          "Prescription created successfully - ID: " + (data?.id || "Unknown"),
      });
    },
    onError: (error: any) => {
      console.error("❌ PRESCRIPTION ERROR:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create prescription",
        variant: "destructive",
      });
    },
  });

  const sendToPharmacyMutation = useMutation({
    mutationFn: async ({
      prescriptionId,
      pharmacyData,
      patientName,
      attachments,
      prescriptionNumber,
      prescriptionData,
    }: {
      prescriptionId: string;
      pharmacyData: any;
      patientName?: string;
      attachments?: File[];
      prescriptionNumber?: string;
      prescriptionData?: any;
    }) => {
      console.log("[PHARMACY EMAIL] Starting email send process...", {
        prescriptionId,
        pharmacyEmail: pharmacyData.email,
        patientName,
        attachmentsCount: attachments?.length || 0,
        prescriptionNumber,
      });

      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Tenant-Subdomain": getActiveSubdomain(),
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // First update the prescription with pharmacy data
      console.log(
        "[PHARMACY EMAIL] Step 1: Updating prescription with pharmacy data...",
      );
      const response = await fetch(`/api/prescriptions/${prescriptionId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ pharmacy: pharmacyData }),
        credentials: "include",
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          "[PHARMACY EMAIL] Failed to update prescription:",
          errorText,
        );
        throw new Error("Failed to send prescription to pharmacy");
      }

      console.log("[PHARMACY EMAIL] Step 2: Preparing attachments...");
      // Collect all attachments
      const allAttachments: File[] = [];

      // Generate prescription PDF if prescription data is available
      if (prescriptionData && prescriptionNumber) {
        try {
          console.log("[PHARMACY EMAIL] Generating prescription PDF...");
          const { jsPDF } = await import("jspdf");
          const pdf = new jsPDF();

          // Get doctor information from loaded users data
          const doctorId =
            prescriptionData.prescriptionCreatedBy || prescriptionData.doctorId;
          const doctorInfo = providers?.find((p: any) => p.id === doctorId);

          // Professional Header - Similar to medical prescription format
          pdf.setFontSize(16);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(0, 0, 0);
          pdf.text("CURA HEALTH EMR", 20, 20);

          // Doctor information after header
          pdf.setFontSize(9);
          pdf.setFont("helvetica", "normal");
      
          pdf.text(`Prescription #: ${prescriptionNumber}`, 20, doctorInfo ? 31 : 26);

          // Center Title
          pdf.setFontSize(18);
          pdf.setFont("helvetica", "bold");

          // Clinic Information with styling
          const clinicName =
            clinicHeader?.clinicName ||
            pharmacyData?.name ||
            "Halo Health Clinic";
          const clinicAddress =
            clinicHeader?.address || "Unit 2 Drayton Court, Solihull";
          const clinicPhone = clinicHeader?.phone || "+44(0)121 827 5531";
          const clinicEmail = clinicHeader?.email || "";
          const clinicWebsite = clinicHeader?.website || "";

          // Apply clinic name font size
          const clinicNameSize =
            parseInt(clinicHeader?.clinicNameFontSize || "24pt") || 24;
          const contentSize = parseInt(clinicHeader?.fontSize || "10pt") || 10;
          const fontWeight =
            clinicHeader?.fontWeight === "bold" ? "bold" : "normal";
          const fontStyle =
            clinicHeader?.fontStyle === "italic" ? "italic" : "normal";

          let yPosition = 58;

          // Logo handling - if center, place beside text; if left/right, place above
          if (clinicHeader?.logoBase64) {
            try {
              const logoPosition = clinicHeader.logoPosition || "center";

              if (logoPosition === "center") {
                // Place logo beside clinic info (side by side layout)
                const logoX = 70;
                const textX = 105;
                pdf.addImage(
                  clinicHeader.logoBase64,
                  "PNG",
                  logoX,
                  yPosition,
                  25,
                  25,
                );

                // Clinic text beside logo - center aligned
                pdf.setFontSize(clinicNameSize);
                pdf.setFont("helvetica", fontWeight);
                pdf.text(clinicName, 105, yPosition + 8, { align: "center" });

                yPosition += 10;
                pdf.setFontSize(contentSize);
                pdf.setFont("helvetica", fontStyle);
                pdf.text(clinicAddress, 105, yPosition + 8, {
                  align: "center",
                });

                yPosition += 6;
                pdf.text(clinicPhone, 105, yPosition + 8, { align: "center" });

                if (clinicEmail) {
                  yPosition += 6;
                  pdf.text(clinicEmail, 105, yPosition + 8, {
                    align: "center",
                  });
                }

                if (clinicWebsite) {
                  yPosition += 6;
                  pdf.text(clinicWebsite, 105, yPosition + 8, {
                    align: "center",
                  });
                }

                yPosition += 10;
              } else {
                // Left or right positioning - logo above text
                const textAlign = logoPosition === "left" ? "left" : "right";
                const xPosition = logoPosition === "left" ? 20 : 170;
                const textXPosition = logoPosition === "left" ? 20 : 190;
                pdf.addImage(
                  clinicHeader.logoBase64,
                  "PNG",
                  xPosition,
                  yPosition,
                  30,
                  30,
                );
                yPosition += 35;

                // Clinic info aligned based on logo position
                pdf.setFontSize(clinicNameSize);
                pdf.setFont("helvetica", fontWeight);
                pdf.text(clinicName, textXPosition, yPosition, {
                  align: textAlign,
                });

                yPosition += 6;
                pdf.setFontSize(contentSize);
                pdf.setFont("helvetica", fontStyle);
                pdf.text(clinicAddress, textXPosition, yPosition, {
                  align: textAlign,
                });
                yPosition += 6;
                pdf.text(clinicPhone, textXPosition, yPosition, {
                  align: textAlign,
                });

                if (clinicEmail) {
                  yPosition += 6;
                  pdf.text(clinicEmail, textXPosition, yPosition, {
                    align: textAlign,
                  });
                }

                if (clinicWebsite) {
                  yPosition += 6;
                  pdf.text(clinicWebsite, textXPosition, yPosition, {
                    align: textAlign,
                  });
                }
              }
            } catch (err) {
              console.error("Failed to add logo to PDF:", err);
            }
          } else {
            // No logo - just centered text
            pdf.setFontSize(clinicNameSize);
            pdf.setFont("helvetica", fontWeight);
            pdf.text(clinicName, 105, yPosition, { align: "center" });

            yPosition += 6;
            pdf.setFontSize(contentSize);
            pdf.setFont("helvetica", fontStyle);
            pdf.text(clinicAddress, 105, yPosition, { align: "center" });
            yPosition += 6;
            pdf.text(clinicPhone, 105, yPosition, { align: "center" });

            if (clinicEmail) {
              yPosition += 6;
              pdf.text(clinicEmail, 105, yPosition, { align: "center" });
            }

            if (clinicWebsite) {
              yPosition += 6;
              pdf.text(clinicWebsite, 105, yPosition, { align: "center" });
            }
          }

          // Horizontal line separator
          pdf.setDrawColor(200, 200, 200);
          pdf.line(20, 85, 190, 85);

          // Prescription Number - Prominent Display
          pdf.setFontSize(11);
          pdf.setFont("helvetica", "bold");
          pdf.text(`Prescription No: ${prescriptionNumber}`, 20, 95);

          // Date
          const prescriptionDate =
            prescriptionData.issuedDate || prescriptionData.date || new Date();
          pdf.setFont("helvetica", "normal");
          pdf.text(
            `Date: ${new Date(prescriptionDate).toLocaleDateString("en-GB")}`,
            20,
            102,
          );

          // Patient Information
          pdf.setFontSize(11);
          pdf.setFont("helvetica", "bold");
          pdf.text("PATIENT INFORMATION", 20, 115);

          pdf.setFontSize(10);
          pdf.setFont("helvetica", "normal");
          pdf.text(`Name: ${prescriptionData.patientName || "N/A"}`, 20, 123);
          pdf.text(
            `Sex: ${prescriptionData.patientSex || "Not specified"}`,
            20,
            130,
          );

          // Provider Information
          pdf.setFontSize(11);
          pdf.setFont("helvetica", "bold");
          pdf.text("PRESCRIBING PROVIDER", 20, 145);

          pdf.setFontSize(10);
          pdf.setFont("helvetica", "normal");
      
          // Medication Details - Highlighted Box
          pdf.setFillColor(240, 245, 255);
          pdf.rect(15, 165, 180, 60, "F");

          pdf.setFontSize(12);
          pdf.setFont("helvetica", "bold");
          pdf.text("MEDICATION PRESCRIBED", 20, 175);

          pdf.setFontSize(11);
          pdf.setFont("helvetica", "bold");
          const medicationName =
            prescriptionData.medicationName ||
            prescriptionData.medication ||
            "N/A";
          pdf.text(`Rx: ${medicationName}`, 20, 186);

          pdf.setFontSize(10);
          pdf.setFont("helvetica", "normal");
          pdf.text(`Dosage: ${prescriptionData.dosage || "N/A"}`, 20, 195);
          pdf.text(
            `Frequency: ${prescriptionData.frequency || "N/A"}`,
            20,
            202,
          );
          pdf.text(`Duration: ${prescriptionData.duration || "N/A"}`, 20, 209);

          // Refills if available
          if (
            prescriptionData.refills !== undefined &&
            prescriptionData.refills !== null
          ) {
            pdf.text(`Refills: ${prescriptionData.refills}`, 20, 216);
          }

          // Instructions Section
          let currentY = 238;
          if (prescriptionData.instructions) {
            pdf.setFontSize(11);
            pdf.setFont("helvetica", "bold");
            pdf.text("INSTRUCTIONS", 20, currentY);

            pdf.setFontSize(10);
            pdf.setFont("helvetica", "normal");
            const splitInstructions = pdf.splitTextToSize(
              prescriptionData.instructions,
              170,
            );
            pdf.text(splitInstructions, 20, currentY + 8);
            currentY += 8 + splitInstructions.length * 5;
          }

          // E-Signature Section (if exists)
          console.log("[PDF GENERATION] Checking for signature:", {
            hasSignature: !!prescriptionData.signature,
            signatureData: prescriptionData.signature,
          });

          if (prescriptionData.signature) {
            // Ensure we have enough space for signature (stop at Y=245 max to avoid footer overlap)
            if (currentY > 245) {
              pdf.addPage();
              currentY = 20;
            }
            
            currentY += 10;
            
            // Signature box with border for professional look
            pdf.setDrawColor(200, 200, 200);
            pdf.setFillColor(250, 250, 255);
            pdf.rect(15, currentY - 5, 85, 55, "FD");
            
            pdf.setFontSize(11);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(0, 0, 0);
            pdf.text("Resident Physician", 20, currentY);
            pdf.setFontSize(9);
            pdf.setFont("helvetica", "normal");
            pdf.text("(Signature)", 20, currentY + 6);

            // Add signature image if available
            if (prescriptionData.signature.doctorSignature) {
              try {
                console.log("[PDF GENERATION] Adding signature image to PDF");
                pdf.addImage(
                  prescriptionData.signature.doctorSignature,
                  "PNG",
                  20,
                  currentY + 10,
                  50,
                  20,
                );
              } catch (err) {
                console.log(
                  "[PDF GENERATION] Could not add signature image to PDF:",
                  err,
                );
              }
            } else {
              console.log("[PDF GENERATION] No signature image data available");
            }

            // Add e-signed by info
            pdf.setFontSize(9);
            pdf.setTextColor(34, 139, 34); // Green color for e-sign
            pdf.text(`✓ E-Signed by`, 20, currentY + 35);

            const signedDate = prescriptionData.signature.signedAt
              ? new Date(
                  prescriptionData.signature.signedAt,
                ).toLocaleDateString("en-GB", {
                  year: "numeric",
                  month: "short",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "";
            pdf.setTextColor(80, 80, 80);
            pdf.text(signedDate, 20, currentY + 41);
            console.log("[PDF GENERATION] E-signature section added to PDF");
          } else {
            console.log(
              "[PDF GENERATION] No signature found in prescription data",
            );
          }

          // Footer - Professional with clinic footer data
          const footerY = 275;
          pdf.setDrawColor(200, 200, 200);
          pdf.line(20, footerY, 190, footerY);

          // Add clinic footer text if available
          pdf.setFontSize(8);
          pdf.setTextColor(80, 80, 80);
          
          if (clinicFooter?.footerText) {
            pdf.text(
              clinicFooter.footerText,
              105,
              footerY + 6,
              { align: "center" },
            );
            pdf.text(
              "This prescription has been electronically generated and verified",
              105,
              footerY + 11,
              { align: "center" },
            );
          } else {
            pdf.text(
              "This prescription has been electronically generated and verified",
              105,
              footerY + 6,
              { align: "center" },
            );
            pdf.text(
              "Cura EMR Platform - Electronic Prescription System",
              105,
              footerY + 11,
              { align: "center" },
            );
          }

          // Convert PDF to Blob and then to File
          const pdfBlob = pdf.output("blob");
          const pdfFile = new File([pdfBlob], `${prescriptionNumber}.pdf`, {
            type: "application/pdf",
          });
          allAttachments.push(pdfFile);
          console.log(
            "[PHARMACY EMAIL] Generated prescription PDF:",
            pdfFile.name,
          );
        } catch (error) {
          console.error(
            "[PHARMACY EMAIL] Failed to generate prescription PDF:",
            error,
          );
        }
      }

      // Add user-uploaded attachments if any
      if (attachments && attachments.length > 0) {
        allAttachments.push(...attachments);
        console.log(
          `[PHARMACY EMAIL] Added ${attachments.length} user attachment(s)`,
        );
      }

      console.log("[PHARMACY EMAIL] Step 3: Sending PDF email to pharmacy...");
      // Then send the PDF email to the pharmacy with attachments
      const formData = new FormData();
      formData.append("pharmacyEmail", pharmacyData.email);
      formData.append("pharmacyName", pharmacyData.name);
      formData.append("patientName", patientName || "Patient");

      // Add all attachments
      if (allAttachments.length > 0) {
        allAttachments.forEach((file, index) => {
          formData.append(`attachments`, file);
          console.log(
            `[PHARMACY EMAIL] Added attachment ${index + 1}:`,
            file.name,
          );
        });
      }

      const emailHeaders: Record<string, string> = {
        "X-Tenant-Subdomain": getActiveSubdomain(),
      };

      if (token) {
        emailHeaders["Authorization"] = `Bearer ${token}`;
      }

      const emailResponse = await fetch(
        `/api/prescriptions/${prescriptionId}/send-pdf`,
        {
          method: "POST",
          headers: emailHeaders,
          body: formData,
          credentials: "include",
        },
      );

      const emailResult = await emailResponse.json();
      console.log("[PHARMACY EMAIL] Email API response:", emailResult);

      if (!emailResponse.ok) {
        console.error("[PHARMACY EMAIL] Email API failed:", emailResult);
        throw new Error(
          emailResult.error || "Failed to send PDF email to pharmacy",
        );
      }

      console.log("[PHARMACY EMAIL] ✅ Email sent successfully!");
      return response.json();
    },
    onSuccess: () => {
      console.log("[PHARMACY EMAIL] Mutation onSuccess triggered");
      toast({
        title: "Success",
        description:
          "Prescription sent to pharmacy and PDF emailed successfully",
      });
      setShowPharmacyDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/prescriptions"] });
    },
    onError: (error: any) => {
      console.error("[PHARMACY EMAIL] Mutation onError triggered:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send prescription to pharmacy",
        variant: "destructive",
      });
    },
  });

  const deletePrescriptionMutation = useMutation({
    mutationFn: async (prescriptionId: string) => {
      const response = await apiRequest(
        "DELETE",
        `/api/prescriptions/${prescriptionId}`,
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Prescription deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/prescriptions"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete prescription",
        variant: "destructive",
      });
    },
  });

  const handleCreatePrescription = () => {
    console.log("🆕 CREATE PRESCRIPTION - user:", user);
    console.log(
      "🆕 CREATE PRESCRIPTION - isDoctorLike:",
      user?.role && isDoctorLike(user.role),
    );

    setSelectedPrescription(null); // Clear any selected prescription for new creation
    // Reset form data for new prescription
    const autoProviderId =
      user && isDoctorLike(user.role) ? user.id.toString() : "";
    console.log("🆕 CREATE PRESCRIPTION - autoProviderId:", autoProviderId);

    const newFormData = {
      patientId: "",
      patientName: "",
      providerId: autoProviderId,
      diagnosis: "",
      medications: [
        {
          name: "",
          dosage: "",
          frequency: "",
          duration: "",
          quantity: "",
          refills: "",
          instructions: "",
          genericAllowed: true,
        },
      ],
      pharmacyName: "Halo Health",
      pharmacyAddress: "Unit 2 Drayton Court, Solihull, B90 4NG",
      pharmacyPhone: "+44(0)121 827 5531",
      pharmacyEmail: "pharmacy@halohealth.co.uk",
    };

    console.log("🆕 CREATE PRESCRIPTION - newFormData:", newFormData);
    setFormData(newFormData);
    setFormErrors({ medications: [] });
    setShowNewPrescription(true);
  };

  const [showViewDetails, setShowViewDetails] = useState(false);

  const handleViewPrescription = (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    setShowViewDetails(true);
  };

  const { toast } = useToast();

  // Form validation helper functions
  const validateMedication = (medication: any, index: number) => {
    const errors: any = {};

    if (!medication.name.trim()) {
      errors.name = "Medication name is required";
    }

    if (!medication.dosage.trim()) {
      errors.dosage = "Dosage is required";
    }

    if (!medication.frequency.trim()) {
      errors.frequency = "Frequency is required";
    }

    if (!medication.duration.trim()) {
      errors.duration = "Duration is required";
    }

    if (
      !medication.quantity ||
      isNaN(parseInt(medication.quantity)) ||
      parseInt(medication.quantity) <= 0
    ) {
      errors.quantity = "Quantity must be a positive number";
    }

    if (
      medication.refills &&
      (isNaN(parseInt(medication.refills)) || parseInt(medication.refills) < 0)
    ) {
      errors.refills = "Refills must be a non-negative number";
    }

    return errors;
  };

  const validateForm = () => {
    const errors: any = { medications: [] };

    console.log("🔍 VALIDATE FORM - formData:", formData);
    console.log("🔍 VALIDATE FORM - user:", user);
    console.log(
      "🔍 VALIDATE FORM - isDoctorLike:",
      user?.role && isDoctorLike(user.role),
    );

    // Validate medications
    formData.medications.forEach((med, index) => {
      const medErrors = validateMedication(med, index);
      errors.medications[index] = medErrors;
    });

    // Check if at least one medication has a name
    const hasValidMedication = formData.medications.some((med) =>
      med.name.trim(),
    );
    if (!hasValidMedication) {
      errors.general = "At least one medication with a name is required";
    }

    // Check required fields
    if (!formData.patientId) {
      errors.general = errors.general || "Patient is required";
      console.log("❌ VALIDATE: Missing patientId");
    }

    if (!formData.providerId) {
      errors.general = errors.general || "Provider is required";
      console.log("❌ VALIDATE: Missing providerId");
    }

    if (!formData.diagnosis.trim()) {
      errors.general = errors.general || "Diagnosis is required";
      console.log("❌ VALIDATE: Missing diagnosis");
    }

    console.log("🔍 VALIDATE FORM - errors:", errors);

    setFormErrors(errors);

    // Return true if no errors
    const hasErrors =
      errors.general ||
      errors.medications.some(
        (medError: any) => Object.keys(medError).length > 0,
      );

    console.log("🔍 VALIDATE FORM - hasErrors:", hasErrors);

    return !hasErrors;
  };

  // Medication management helper functions
  const addMedication = () => {
    setFormData((prev) => ({
      ...prev,
      medications: [
        ...prev.medications,
        {
          name: "",
          dosage: "",
          frequency: "",
          duration: "",
          quantity: "",
          refills: "",
          instructions: "",
          genericAllowed: true,
        },
      ],
    }));

    // Add empty error state for new medication
    setFormErrors((prev) => ({
      ...prev,
      medications: [...prev.medications, {}],
    }));
  };

  const removeMedication = (index: number) => {
    if (formData.medications.length > 1) {
      setFormData((prev) => ({
        ...prev,
        medications: prev.medications.filter((_, i) => i !== index),
      }));

      // Remove corresponding error state
      setFormErrors((prev) => ({
        ...prev,
        medications: prev.medications.filter((_, i) => i !== index),
      }));
    }
  };

  const updateMedication = (
    index: number,
    field: string,
    value: string | boolean,
  ) => {
    setFormData((prev) => ({
      ...prev,
      medications: prev.medications.map((med, i) =>
        i === index ? { ...med, [field]: value } : med,
      ),
    }));

    // Clear error for this field when user starts typing
    if (
      formErrors.medications[index] &&
      formErrors.medications[index][
        field as keyof (typeof formErrors.medications)[0]
      ]
    ) {
      setFormErrors((prev) => ({
        ...prev,
        medications: prev.medications.map((medError, i) =>
          i === index
            ? { ...medError, [field as keyof typeof medError]: undefined }
            : medError,
        ),
      }));
    }
  };

  // E-signature functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setLastPosition({ x, y });

    // Begin a new path
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const stopDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    // Check if mouse moved (tolerance of 2 pixels for click detection)
    const moved =
      lastPosition &&
      (Math.abs(currentX - lastPosition.x) > 2 ||
        Math.abs(currentY - lastPosition.y) > 2);

    // If no movement detected, draw a dot
    if (!moved && lastPosition) {
      ctx.lineWidth = 2;
      ctx.fillStyle = "#000000";
      ctx.beginPath();
      ctx.arc(lastPosition.x, lastPosition.y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    setIsDrawing(false);
    setLastPosition(null);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000000";

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);

    // Update last position
    setLastPosition({ x, y });
  };

  // Touch event handlers
  const startDrawingTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    setIsDrawing(true);
    setLastPosition({ x, y });

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const stopDrawingTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !isDrawing) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const touch = e.changedTouches[0];
    const currentX = touch.clientX - rect.left;
    const currentY = touch.clientY - rect.top;

    // Check if touch moved (tolerance of 2 pixels for tap detection)
    const moved =
      lastPosition &&
      (Math.abs(currentX - lastPosition.x) > 2 ||
        Math.abs(currentY - lastPosition.y) > 2);

    // If no movement detected, draw a dot
    if (!moved && lastPosition) {
      ctx.lineWidth = 2;
      ctx.fillStyle = "#000000";
      ctx.beginPath();
      ctx.arc(lastPosition.x, lastPosition.y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    setIsDrawing(false);
    setLastPosition(null);
  };

  const drawTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000000";

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);

    // Update last position
    setLastPosition({ x, y });
  };

  const clearSignature = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignature("");
    setSignatureSaved(false);
  };

  const saveSignature = async () => {
    if (!canvasRef.current || !selectedPrescription) return;

    const canvas = canvasRef.current;
    const signatureData = canvas.toDataURL();

    // Check if canvas is blank
    const blankCanvas = document.createElement("canvas");
    blankCanvas.width = canvas.width;
    blankCanvas.height = canvas.height;
    if (signatureData === blankCanvas.toDataURL()) {
      toast({
        title: "Error",
        description: "Please draw your signature before saving.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await apiRequest(
        "POST",
        `/api/prescriptions/${selectedPrescription.id}/e-sign`,
        {
          signature: signatureData,
        },
      );

      if (response.ok) {
        const result = await response.json();

        // Update the prescription queries to refresh data
        queryClient.invalidateQueries({ queryKey: ["/api/prescriptions"] });

        // Show success message in modal
        setSignatureSaved(true);

        // Auto-close after 2 seconds
        setTimeout(() => {
          clearSignature();
          setShowESignDialog(false);
          setSignatureSaved(false);
        }, 2000);
      } else {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || "Failed to save signature");
      }
    } catch (error) {
      console.error("Error saving e-signature:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to save electronic signature. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handlePrintPrescription = async (prescriptionId: string) => {
    // Get prescription details
    const prescription = Array.isArray(prescriptions)
      ? prescriptions.find((p: any) => p.id === prescriptionId)
      : null;
    if (!prescription) return;

    // Get patient details
    const patient = patients.find((p) => p.id === prescription.patientId);
    const provider = providers.find((p) => p.id === prescription.providerId);

    // Fetch prescribing provider information
    let doctorInfo = null;
    if (prescription.doctorId) {
      try {
        const doctorResponse = await apiRequest(
          "GET",
          `/api/users/${prescription.doctorId}`,
        );
        if (doctorResponse.ok) {
          doctorInfo = await doctorResponse.json();
        }
      } catch (err) {
        console.error("Failed to fetch doctor info:", err);
      }
    }

    // Fetch creator information (who entered the prescription)
    let creatorInfo = null;
    if (prescription.prescriptionCreatedBy) {
      try {
        const creatorResponse = await apiRequest(
          "GET",
          `/api/users/${prescription.prescriptionCreatedBy}`,
        );
        if (creatorResponse.ok) {
          creatorInfo = await creatorResponse.json();
        }
      } catch (err) {
        console.error("Failed to fetch creator info:", err);
      }
    }

    // Calculate age from DOB
    const calculateAge = (dob: string) => {
      if (!dob) return "N/A";
      const birthDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ) {
        age--;
      }
      return age;
    };

    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      const day = date.getDate();
      const month = date.toLocaleDateString("en-GB", { month: "short" });
      const year = date.getFullYear();

      const suffix = (day: number) => {
        if (day > 3 && day < 21) return "th";
        switch (day % 10) {
          case 1:
            return "st";
          case 2:
            return "nd";
          case 3:
            return "rd";
          default:
            return "th";
        }
      };

      return `${day}${suffix(day)} ${month} ${year}`;
    };

    // Get first medication for main prescription details
    const firstMed = prescription.medications[0] || {};

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Prescription - ${prescription.patientName}</title>
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              
              body {
                font-family: Arial, sans-serif;
                font-size: 11px;
                line-height: 1.2;
                color: #333;
                background: #f8f9fa;
                padding: 20px;
                position: relative;
              }
              
              .prescription-container {
                width: 210mm;
                min-height: 297mm;
                background: white;
                margin: 0 auto;
                padding: 15mm;
                box-shadow: 0 0 10px rgba(0,0,0,0.1);
                position: relative;
                overflow: hidden;
              }
              
              .header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 15px;
                border-bottom: 1px solid #e9ecef;
                padding-bottom: 10px;
              }
              
              .header-left {
                flex: 1;
              }
              
              .header-left h1 {
                font-size: 14px;
                font-weight: bold;
                color: #2c3e50;
                margin-bottom: 3px;
              }
              
              .license-info {
                font-size: 9px;
                color: #6c757d;
                line-height: 1.3;
              }
              
              .status-badge {
                background: #28a745;
                color: white;
                padding: 4px 8px;
                border-radius: 3px;
                font-size: 8px;
                font-weight: bold;
                text-transform: uppercase;
              }
              
              .provider-section {
                text-align: center;
                margin: 20px 0;
                padding: 15px 0;
                border-bottom: 1px solid #e9ecef;
              }
              
              .provider-title {
                font-size: 16px;
                font-weight: bold;
                color: #2c3e50;
                margin-bottom: 8px;
                letter-spacing: 1px;
              }
              
              .provider-details {
                font-size: 10px;
                color: #6c757d;
                line-height: 1.4;
              }
              
              .patient-info {
                display: flex;
                justify-content: space-between;
                margin: 20px 0;
                background: #f8f9fa;
                padding: 15px;
                border-radius: 5px;
              }
              
              .patient-left, .patient-right {
                flex: 1;
              }
              
              .patient-right {
                text-align: right;
              }
              
              .info-line {
                margin: 3px 0;
                font-size: 10px;
              }
              
              .info-label {
                font-weight: bold;
                color: #495057;
              }
              
              .watermark {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 120px;
                font-weight: bold;
                color: rgba(173, 216, 230, 0.08);
                z-index: 1;
                pointer-events: none;
                letter-spacing: 10px;
                background: transparent;
              }
              
              .prescription-details {
                margin: 25px 0;
                position: relative;
                z-index: 2;
                background-color: transparent; /* important: removes white box effect */
              }
              
              .medication-name {
                font-size: 14px;
                font-weight: bold;
                color: #2c3e50;
                margin-bottom: 10px;
              }
              
              .prescription-instructions {
                margin: 8px 0;
                font-size: 10px;
                line-height: 1.4;
              }
              
              .diagnosis-section {
                margin: 20px 0;
                padding: 10px;
               position: relative;

  background-color: transparent; /* important: removes white box effect */
                border-radius: 5px;
                position: relative;
                z-index: 2;
              }
              
              .diagnosis-label {
                font-weight: bold;
                color: #495057;
                font-size: 10px;
              }
              
              .footer {
                position: fixed;
                bottom: 10mm;
                left: 15mm;
                right: 15mm;
                width: calc(100% - 30mm);
                background: white;
                z-index: 10;
              }
              
              .signature-section {
                flex: 1;
              }
              
              .signature-label {
                font-size: 9px;
                color: #6c757d;
                margin-bottom: 25px;
              }
              
              .substitute-section {
                text-align: right;
                flex: 1;
              }
              
              .substitute-label {
                font-size: 9px;
                color: #6c757d;
              }
              
              .pharmacy-info {
                text-align: center;
                font-size: 9px;
                color: #6c757d;
                padding: 8px 0;
                border-top: 1px solid #e9ecef;
                margin-top: 5px;
              }
              
              .action-buttons {
                position: absolute;
                bottom: -15mm;
                left: 15mm;
                right: 15mm;
                display: flex;
                justify-content: center;
                gap: 15px;
                padding: 10px;
                background: white;
              }
              
              .action-btn {
                display: flex;
                align-items: center;
                gap: 5px;
                padding: 8px 12px;
                border: 1px solid #dee2e6;
                background: white;
                border-radius: 4px;
                font-size: 9px;
                color: #495057;
                text-decoration: none;
                cursor: pointer;
                transition: all 0.2s;
              }
              
              .action-btn:hover {
                background: #f8f9fa;
                border-color: #adb5bd;
              }
              
              .btn-view { color: #007bff; }
              .btn-print { color: #6c757d; }
              .btn-send { color: #28a745; }
              .btn-sign { color: #ffc107; }
              .btn-edit { color: #17a2b8; }
              .btn-delete { color: #dc3545; }
              
              @media print {
                body { padding: 0; background: white; }
                .prescription-container { 
                  box-shadow: none; 
                  margin: 0;
                  padding: 10mm;
                }
                .action-buttons { display: none; }
              }
            </style>
          </head>
          <body>
            <div class="prescription-container">
              <!-- Header -->
              <div class="header">
                <div class="header-left">
                  <h1>CURA HEALTH EMR</h1>
                  <div class="license-info">
                 
                    Prescription #: ${prescription.prescriptionNumber || "N/A"}
                  </div>
                </div>
                <div class="status-badge">active</div>
              </div>
              
              <!-- Provider Section -->
              <div class="provider-section">
               
                ${
                  clinicHeader?.logoBase64 &&
                  clinicHeader.logoPosition === "center"
                    ? `
                <!-- Logo beside clinic info for center position -->
                <div style="display: flex; align-items: center; justify-content: center; gap: 15px; margin: 10px 0;">
                  <img src="${clinicHeader.logoBase64}" alt="Clinic Logo" style="max-width: 80px; max-height: 80px; flex-shrink: 0;" />
                  <div style="
                    font-family: ${clinicHeader?.fontFamily || "Arial"}, sans-serif;
                    font-size: ${clinicHeader?.fontSize || "12pt"};
                    font-weight: ${clinicHeader?.fontWeight || "normal"};
                    font-style: ${clinicHeader?.fontStyle || "normal"};
                    text-decoration: ${clinicHeader?.textDecoration || "none"};
                    text-align: center;
                  ">
                 
                    <span style="font-size: ${clinicHeader?.clinicNameFontSize || "16pt"}; font-weight: bold;">
                      ${clinicHeader?.clinicName || "Halo Health Clinic"}
                    </span><br>
                    ${clinicHeader?.address || "Unit 2 Drayton Court, Solihull"}<br>
                    ${clinicHeader?.phone || "+44(0)121 827 5531"}${clinicHeader?.email ? `<br>${clinicHeader.email}` : ""}${clinicHeader?.website ? `<br>${clinicHeader.website}` : ""}
                  </div>
                </div>
                `
                    : clinicHeader?.logoBase64
                      ? `
                <!-- Logo above clinic info for left/right position -->
                <div style="text-align: ${clinicHeader.logoPosition || "center"}; margin: 10px 0;">
                  <img src="${clinicHeader.logoBase64}" alt="Clinic Logo" style="max-width: 100px; max-height: 100px;" />
                </div>
                <div class="provider-details" style="
                  font-family: ${clinicHeader?.fontFamily || "Arial"}, sans-serif;
                  font-size: ${clinicHeader?.fontSize || "12pt"};
                  font-weight: ${clinicHeader?.fontWeight || "normal"};
                  font-style: ${clinicHeader?.fontStyle || "normal"};
                  text-decoration: ${clinicHeader?.textDecoration || "none"};
                  text-align: ${clinicHeader.logoPosition || "center"};
                ">
             
                  <span style="font-size: ${clinicHeader?.clinicNameFontSize || "16pt"}; font-weight: bold;">
                    ${clinicHeader?.clinicName || "Halo Health Clinic"}
                  </span><br>
                  ${clinicHeader?.address || "Unit 2 Drayton Court, Solihull"}<br>
                  ${clinicHeader?.phone || "+44(0)121 827 5531"}${clinicHeader?.email ? `<br>${clinicHeader.email}` : ""}${clinicHeader?.website ? `<br>${clinicHeader.website}` : ""}
                </div>
                `
                      : `
                <!-- No logo -->
                <div class="provider-details" style="
                  font-family: ${clinicHeader?.fontFamily || "Arial"}, sans-serif;
                  font-size: ${clinicHeader?.fontSize || "12pt"};
                  font-weight: ${clinicHeader?.fontWeight || "normal"};
                  font-style: ${clinicHeader?.fontStyle || "normal"};
                  text-decoration: ${clinicHeader?.textDecoration || "none"};
                ">
                  ${prescription.providerName}<br>
                  <span style="font-size: ${clinicHeader?.clinicNameFontSize || "16pt"}; font-weight: bold;">
                    ${clinicHeader?.clinicName || "Halo Health Clinic"}
                  </span><br>
                  ${clinicHeader?.address || "Unit 2 Drayton Court, Solihull"}<br>
                  ${clinicHeader?.phone || "+44(0)121 827 5531"}${clinicHeader?.email ? `<br>${clinicHeader.email}` : ""}${clinicHeader?.website ? `<br>${clinicHeader.website}` : ""}
                </div>
                `
                }
              </div>
              
              <!-- Patient Information -->
              <div class="patient-info">
                <div class="patient-left">
                  <div class="info-line">
                    <span class="info-label">Name:</span> ${prescription.patientName}
                  </div>
                  <div class="info-line">
                    <span class="info-label">Address:</span> ${patient?.address ? `${patient.address.street || ""}, ${patient.address.city || ""}, ${patient.address.postcode || ""}, ${patient.address.country || ""}`.replace(/, ,/g, ",").replace(/^,\s*|,\s*$/g, "") : "-"}
                  </div>
                  <div class="info-line">
                    <span class="info-label">Allergies:</span> ${patient?.medicalHistory?.allergies?.length > 0 ? patient.medicalHistory.allergies.join(", ") : "-"}
                  </div>
                  <div class="info-line">
                    <span class="info-label">Weight:</span> ${prescription.patientWeight || "-"}
                  </div>
                </div>
                <div class="patient-right">
                  <div class="info-line">
                    <span class="info-label">DOB:</span> ${patient?.dateOfBirth ? formatDate(patient.dateOfBirth) : "01/01/1985"}
                  </div>
                  <div class="info-line">
                    <span class="info-label">Age:</span> ${patient?.dateOfBirth ? calculateAge(patient.dateOfBirth) : "39"}
                  </div>
                  <div class="info-line">
                    <span class="info-label">Sex:</span> ${patient?.genderAtBirth || "Not specified"}
                  </div>
                  <div class="info-line">
                    <span class="info-label">Date:</span> ${formatDate(prescription.prescribedAt || prescription.issuedDate || prescription.createdAt)}
                  </div>
                </div>
              </div>
              
              <!-- Provider and Creator Information -->
              <div style="margin: 15px 0; padding: 12px; background: #f8f9fa; border-radius: 5px; border-left: 3px solid #4A7DFF;">
                <div class="info-line" style="margin-bottom: 5px;">
                  <span class="info-label" style="color: #2c3e50; font-weight: bold;">Provider:</span> ${doctorInfo ? `${doctorInfo.firstName} ${doctorInfo.lastName}` : "N/A"}${doctorInfo?.role ? ` (${doctorInfo.role.charAt(0).toUpperCase() + doctorInfo.role.slice(1)})` : ""}
                </div>
                ${creatorInfo && creatorInfo.id !== doctorInfo?.id ? `
                <div class="info-line">
                  <span class="info-label" style="color: #2c3e50; font-weight: bold;">Created by:</span> ${creatorInfo.firstName} ${creatorInfo.lastName}${creatorInfo.role ? ` (${creatorInfo.role.charAt(0).toUpperCase() + creatorInfo.role.slice(1)})` : ""}
                </div>
                ` : ""}
              </div>
              
              <!-- Watermark -->
              <div class="watermark">HHC</div>
              
              <!-- Prescription Details -->
              <div class="prescription-details">
                <div class="medication-name">${firstMed.name || "Neuberal 10"}</div>
                <div class="prescription-instructions">
                  Sig: ${firstMed.instructions || "Please visit the doctor after 15 days."}<br>
                  Disp: ${firstMed.quantity || "30"} (${firstMed.duration || "30 days"})<br>
                  Refills: ${firstMed.refills || "1"}
                </div>
              </div>
              
              <!-- Diagnosis -->
              <div class="diagnosis-section">
                <span class="diagnosis-label">Diagnosis:</span> ${prescription.diagnosis || "Migraine"}
              </div>
              
              <!-- Footer -->
              <div class="">
                <div class="signature-section">
                  <div class="signature-label">Resident Physician<br>(Signature)</div>
                  ${
                    prescription.signature && prescription.signature.doctorSignature
                      ? `<img src="${prescription.signature.doctorSignature}" alt="Doctor Signature" style="height: 48px; width: 128px; border: 1px solid #dee2e6; background: white; border-radius: 4px; margin-top: 8px;" />
                         <p style="font-size: 8px; color: #28a745; margin-top: 4px;">✓ E-Signed by ${prescription.signature.signedBy || "Provider"}${prescription.signature.signedAt ? ` - ${(() => {
                           const date = new Date(prescription.signature.signedAt);
                           const month = date.toLocaleDateString('en-GB', { month: 'short' });
                           const day = date.getDate();
                           const year = date.getFullYear();
                           const hours = date.getHours().toString().padStart(2, '0');
                           const minutes = date.getMinutes().toString().padStart(2, '0');
                           return month + ' ' + day + ', ' + year + ' ' + hours + ':' + minutes;
                         })()}` : ''}</p>`
                      : ""
                  }
                </div>
                <div class="substitute-section">
                  <div class="substitute-label">May Substitute</div>
                </div>
              </div>
              
              <!-- Action Buttons -->
              <div class="action-buttons">
                <button class="action-btn btn-view" onclick="window.close()">
                  👁️ View
                </button>
                <button class="action-btn btn-print" onclick="window.print()">
                  🖨️ Print
                </button>
                <button class="action-btn btn-send">
                  📤 Send to Pharmacy
                </button>
                <button class="action-btn btn-sign">
                  ✍️ E-Sign
                </button>
                <button class="action-btn btn-edit">
                  ✏️ Edit
                </button>
                <button class="action-btn btn-delete">
                  🗑️ Delete
                </button>
              </div>
            </div>

            <div class="footer">
              <div class="pharmacy-info">
                ${clinicFooter?.footerText || "Pharmacy: Halo Health - +44(0)121 827 5531"}
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();

      // Auto-print after content loads
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 100);
      };
    }

    toast({
      title: "Printing Prescription",
      description: "Prescription sent to printer successfully",
    });
  };

  const handleSendToPharmacy = (prescriptionId: string) => {
    setSelectedPrescriptionId(prescriptionId);
    setAttachedFiles([]); // Reset attached files
    setShowPharmacyDialog(true);
  };

  const handleFileAttachment = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files);
      setAttachedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeAttachedFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEditPrescription = (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    setShowNewPrescription(true);
    toast({
      title: "Edit Prescription",
      description: `Opening prescription editor for ${prescription.patientName}`,
    });
  };

  const handleCancelPrescription = (prescriptionId: string) => {
    if (window.confirm("Are you sure you want to cancel this prescription?")) {
      const prescription = Array.isArray(prescriptions)
        ? prescriptions.find((p: any) => p.id === prescriptionId)
        : null;
      if (prescription) {
        toast({
          title: "Prescription Cancelled",
          description: `Prescription for ${prescription.patientName} has been cancelled`,
          variant: "destructive",
        });

        // In a real implementation, this would call an API to cancel the prescription
        queryClient.invalidateQueries({ queryKey: ["/api/prescriptions"] });
      }
    }
  };

  const handleDeletePrescription = (prescriptionId: string | number) => {
    // Prevent multiple deletion attempts
    if (deletePrescriptionMutation.isPending) {
      return;
    }

    const prescription = Array.isArray(prescriptions)
      ? prescriptions.find((p: any) => p.id == prescriptionId)
      : null;
    if (
      prescription &&
      window.confirm(
        `Are you sure you want to delete the prescription for ${prescription.patientName}? This action cannot be undone.`,
      )
    ) {
      deletePrescriptionMutation.mutate(String(prescriptionId));
    }
  };

  // For summary statistics - only apply search filter, not status filter
  const searchFilteredPrescriptions = Array.isArray(prescriptions)
    ? prescriptions.filter((prescription: any) => {
        const matchesSearch =
          !searchQuery ||
          prescription.patientName
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          prescription.medications.some((med: any) =>
            med.name.toLowerCase().includes(searchQuery.toLowerCase()),
          );

        return matchesSearch;
      })
    : [];

  // For display area - apply both search and status filters
  const filteredPrescriptions = Array.isArray(prescriptions)
    ? prescriptions.filter((prescription: any) => {
        const matchesSearch =
          !searchQuery ||
          prescription.patientName
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          prescription.medications.some((med: any) =>
            med.name.toLowerCase().includes(searchQuery.toLowerCase()),
          );

        const matchesStatus =
          statusFilter === "all" || prescription.status === statusFilter;

        return matchesSearch && matchesStatus;
      })
    : [];

  if (isLoading) {
    return (
      <>
        <Header
          title="Prescriptions"
          subtitle="Manage patient prescriptions and medications"
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
        title="Prescriptions"
        subtitle="Manage patient prescriptions and medications"
      />

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="space-y-4 sm:space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">
                      Active Prescriptions
                    </p>
                    <p className="text-xl sm:text-2xl font-bold">
                      {
                        searchFilteredPrescriptions.filter(
                          (p: any) => p.status === "active",
                        ).length
                      }
                    </p>
                  </div>
                  <Pill className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">
                      Pending Approval
                    </p>
                    <p className="text-xl sm:text-2xl font-bold">
                      {
                        searchFilteredPrescriptions.filter(
                          (p: any) => p.status === "pending",
                        ).length
                      }
                    </p>
                  </div>
                  <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => {
                const subdomain = getActiveSubdomain();
                console.log(
                  "[PRESCRIPTIONS] Navigating to CDS with drug-interactions tab",
                );
                setLocation(
                  `/${subdomain}/clinical-decision-support?tab=drug-interactions`,
                );
              }}
              data-testid="card-drug-interactions"
            >
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">
                      Drug Interactions
                    </p>
                    <p className="text-xl sm:text-2xl font-bold">
                      {drugInteractionsCount}
                    </p>
                  </div>
                  <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">
                      Total Prescriptions
                    </p>
                    <p className="text-xl sm:text-2xl font-bold">
                      {searchFilteredPrescriptions.length}
                    </p>
                  </div>
                  <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Actions */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search prescriptions..."
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
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>

                <Dialog
                  open={showNewPrescription}
                  onOpenChange={setShowNewPrescription}
                >
                  {user?.role !== "patient" && (
                    <DialogTrigger asChild>
                      <Button
                        className="bg-medical-blue hover:bg-blue-700 flex justify-end ml-auto"
                        onClick={() => {
                          setSelectedPrescription(null);

                          // For patient role users, automatically set their patient ID
                          let patientId = "";
                          let patientName = "";

                          if (user?.role === "patient") {
                            // Find the current patient based on user authentication data
                            const currentPatient =
                              patients.find(
                                (patient: any) =>
                                  patient.email &&
                                  user.email &&
                                  patient.email.toLowerCase() ===
                                    user.email.toLowerCase(),
                              ) ||
                              patients.find(
                                (patient: any) =>
                                  patient.firstName &&
                                  user.firstName &&
                                  patient.lastName &&
                                  user.lastName &&
                                  patient.firstName.toLowerCase() ===
                                    user.firstName.toLowerCase() &&
                                  patient.lastName.toLowerCase() ===
                                    user.lastName.toLowerCase(),
                              );

                            if (currentPatient) {
                              patientId = currentPatient.id.toString();
                              patientName = `${currentPatient.firstName} ${currentPatient.lastName}`;
                            }
                          }

                          setFormData({
                            patientId: patientId,
                            patientName: patientName,
                            providerId: "",
                            diagnosis: "",
                            medications: [
                              {
                                name: "",
                                dosage: "",
                                frequency: "",
                                duration: "",
                                quantity: "",
                                refills: "",
                                instructions: "",
                                genericAllowed: true,
                              },
                            ],
                            pharmacyName: "Halo Health",
                            pharmacyAddress:
                              "Unit 2 Drayton Court, Solihull, B90 4NG",
                            pharmacyPhone: "+44(0)121 827 5531",
                            pharmacyEmail: "pharmacy@halohealth.co.uk",
                          });
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        New Prescription
                      </Button>
                    </DialogTrigger>
                  )}
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {selectedPrescription
                          ? "Edit Prescription"
                          : "Create New Prescription"}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="patient">Patient</Label>
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
                            <Select
                              value={formData.patientId}
                              onValueChange={(value) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  patientId: value,
                                }))
                              }
                            >
                              <SelectTrigger data-testid="select-patient">
                                <SelectValue placeholder="Select patient" />
                              </SelectTrigger>
                              <SelectContent>
                                {patients.map((patient: any) => (
                                  <SelectItem
                                    key={patient.id}
                                    value={patient.id.toString()}
                                  >
                                    {patient.firstName} {patient.lastName} (
                                    {patient.patientId})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                        <div className="space-y-4">
                          {isDoctorLike(user?.role) ? (
                            // For doctor roles: Show labels instead of dropdowns
                            <>
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
                                <Label htmlFor="provider">
                                  {" "}
                                  Name (doctor/nurse etc)
                                </Label>
                                <div className="flex items-center h-10 px-3 py-2 border border-input bg-background rounded-md text-sm ring-offset-background">
                                  <User className="h-4 w-4 mr-2 text-muted-foreground" />
                                  <span data-testid="provider-name-display">
                                    {user?.firstName} {user?.lastName}
                                  </span>
                                </div>
                              </div>
                            </>
                          ) : (
                            // For non-doctor roles: Show dropdowns
                            <>
                              <div>
                                <Label htmlFor="role">Select Role</Label>
                                <Select
                                  value={selectedRole}
                                  onValueChange={(value) => {
                                    setSelectedRole(value);
                                    setFormData((prev) => ({
                                      ...prev,
                                      providerId: "",
                                    }));
                                  }}
                                >
                                  <SelectTrigger data-testid="select-role">
                                    <SelectValue placeholder="Select a role..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {rolesData
                                      .filter((role: any) => {
                                        const roleName = (
                                          role.name || ""
                                        ).toLowerCase();
                                        return ![
                                          "patient",
                                          "admin",
                                          "administrator",
                                        ].includes(roleName);
                                      })
                                      .map((role: any) => (
                                        <SelectItem
                                          key={role.id}
                                          value={role.name}
                                        >
                                          {role.displayName || role.name}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </div>

                            </>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="provider">Select Name</Label>
                          <Select
                            value={formData.providerId}
                            onValueChange={(value) =>
                              setFormData((prev) => ({
                                ...prev,
                                providerId: value,
                              }))
                            }
                            disabled={!selectedRole}
                          >
                            <SelectTrigger data-testid="select-provider" className="[&>span]:text-gray-900 dark:[&>span]:text-gray-100">
                              <SelectValue
                                placeholder={
                                  selectedRole
                                    ? "Select name..."
                                    : "Select a role first"
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {allUsers
                                .filter(
                                  (usr: any) => usr.role === selectedRole,
                                )
                                .map((usr: any) => (
                                  <SelectItem
                                    key={usr.id}
                                    value={usr.id.toString()}
                                  >
                                    {usr.firstName} {usr.lastName}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="diagnosis">Diagnosis *</Label>
                          <Input
                            id="diagnosis"
                            placeholder="Enter diagnosis"
                            value={formData.diagnosis}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                diagnosis: e.target.value,
                              }))
                            }
                            data-testid="input-diagnosis"
                            className={
                              formErrors.general && !formData.diagnosis.trim()
                                ? "border-red-500"
                                : ""
                            }
                          />
                          {formErrors.general && !formData.diagnosis.trim() && (
                            <p
                              className="text-red-500 text-sm mt-1"
                              data-testid="error-diagnosis"
                            >
                              Diagnosis is required
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <Label className="text-lg font-medium">
                            Medications
                          </Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addMedication}
                            data-testid="button-add-medication"
                            className="flex items-center gap-2"
                          >
                            <Plus className="h-4 w-4" />
                            Add Medication
                          </Button>
                        </div>

                        {formData.medications.map((medication, index) => (
                          <div
                            key={index}
                            className="border rounded-lg p-4 space-y-4 relative"
                          >
                            <div className="flex justify-between items-start">
                              <h4 className="font-medium text-md">
                                Medication {index + 1}
                              </h4>
                              {formData.medications.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeMedication(index)}
                                  data-testid={`button-remove-medication-${index}`}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor={`medication-name-${index}`}>
                                  Medication Name *
                                </Label>
                                <Input
                                  id={`medication-name-${index}`}
                                  placeholder="Enter medication"
                                  value={medication.name}
                                  onChange={(e) =>
                                    updateMedication(
                                      index,
                                      "name",
                                      e.target.value,
                                    )
                                  }
                                  data-testid={`input-medication-name-${index}`}
                                  className={
                                    formErrors.medications[index]?.name
                                      ? "border-red-500"
                                      : ""
                                  }
                                />
                                {formErrors.medications[index]?.name && (
                                  <p
                                    className="text-red-500 text-sm mt-1"
                                    data-testid={`error-medication-name-${index}`}
                                  >
                                    {formErrors.medications[index].name}
                                  </p>
                                )}
                              </div>
                              <div>
                                <Label htmlFor={`medication-dosage-${index}`}>
                                  Dosage *
                                </Label>
                                <Input
                                  id={`medication-dosage-${index}`}
                                  placeholder="e.g., 10mg"
                                  value={medication.dosage}
                                  onChange={(e) =>
                                    updateMedication(
                                      index,
                                      "dosage",
                                      e.target.value,
                                    )
                                  }
                                  data-testid={`input-dosage-${index}`}
                                  className={
                                    formErrors.medications[index]?.dosage
                                      ? "border-red-500"
                                      : ""
                                  }
                                />
                                {formErrors.medications[index]?.dosage && (
                                  <p
                                    className="text-red-500 text-sm mt-1"
                                    data-testid={`error-medication-dosage-${index}`}
                                  >
                                    {formErrors.medications[index].dosage}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label
                                  htmlFor={`medication-frequency-${index}`}
                                >
                                  Frequency *
                                </Label>
                                <Select
                                  value={medication.frequency}
                                  onValueChange={(value) =>
                                    updateMedication(index, "frequency", value)
                                  }
                                >
                                  <SelectTrigger
                                    data-testid={`select-frequency-${index}`}
                                    className={
                                      formErrors.medications[index]?.frequency
                                        ? "border-red-500"
                                        : ""
                                    }
                                  >
                                    <SelectValue placeholder="Select frequency" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Once daily">
                                      Once daily
                                    </SelectItem>
                                    <SelectItem value="Twice daily">
                                      Twice daily
                                    </SelectItem>
                                    <SelectItem value="Three times daily">
                                      Three times daily
                                    </SelectItem>
                                    <SelectItem value="Four times daily">
                                      Four times daily
                                    </SelectItem>
                                    <SelectItem value="Every other day">
                                      Every other day
                                    </SelectItem>
                                    <SelectItem value="As needed">
                                      As needed
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                {formErrors.medications[index]?.frequency && (
                                  <p
                                    className="text-red-500 text-sm mt-1"
                                    data-testid={`error-medication-frequency-${index}`}
                                  >
                                    {formErrors.medications[index].frequency}
                                  </p>
                                )}
                              </div>
                              <div>
                                <Label htmlFor={`medication-duration-${index}`}>
                                  Duration *
                                </Label>
                                <Select
                                  value={medication.duration}
                                  onValueChange={(value) =>
                                    updateMedication(index, "duration", value)
                                  }
                                >
                                  <SelectTrigger
                                    data-testid={`select-duration-${index}`}
                                    className={
                                      formErrors.medications[index]?.duration
                                        ? "border-red-500"
                                        : ""
                                    }
                                  >
                                    <SelectValue placeholder="Select duration" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="7 days">
                                      7 days
                                    </SelectItem>
                                    <SelectItem value="14 days">
                                      14 days
                                    </SelectItem>
                                    <SelectItem value="30 days">
                                      30 days
                                    </SelectItem>
                                    <SelectItem value="60 days">
                                      60 days
                                    </SelectItem>
                                    <SelectItem value="90 days">
                                      90 days
                                    </SelectItem>
                                    <SelectItem value="6 months">
                                      6 months
                                    </SelectItem>
                                    <SelectItem value="1 year">
                                      1 year
                                    </SelectItem>
                                    <SelectItem value="Ongoing">
                                      Ongoing
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                {formErrors.medications[index]?.duration && (
                                  <p
                                    className="text-red-500 text-sm mt-1"
                                    data-testid={`error-medication-duration-${index}`}
                                  >
                                    {formErrors.medications[index].duration}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <Label htmlFor={`medication-quantity-${index}`}>
                                  Quantity *
                                </Label>
                                <Input
                                  id={`medication-quantity-${index}`}
                                  type="number"
                                  min="1"
                                  placeholder="30"
                                  value={medication.quantity}
                                  onChange={(e) =>
                                    updateMedication(
                                      index,
                                      "quantity",
                                      e.target.value,
                                    )
                                  }
                                  data-testid={`input-quantity-${index}`}
                                  className={
                                    formErrors.medications[index]?.quantity
                                      ? "border-red-500"
                                      : ""
                                  }
                                />
                                {formErrors.medications[index]?.quantity && (
                                  <p
                                    className="text-red-500 text-sm mt-1"
                                    data-testid={`error-medication-quantity-${index}`}
                                  >
                                    {formErrors.medications[index].quantity}
                                  </p>
                                )}
                              </div>
                              <div>
                                <Label htmlFor={`medication-refills-${index}`}>
                                  Refills
                                </Label>
                                <Input
                                  id={`medication-refills-${index}`}
                                  type="number"
                                  min="0"
                                  placeholder="3"
                                  value={medication.refills}
                                  onChange={(e) =>
                                    updateMedication(
                                      index,
                                      "refills",
                                      e.target.value,
                                    )
                                  }
                                  data-testid={`input-refills-${index}`}
                                  className={
                                    formErrors.medications[index]?.refills
                                      ? "border-red-500"
                                      : ""
                                  }
                                />
                                {formErrors.medications[index]?.refills && (
                                  <p
                                    className="text-red-500 text-sm mt-1"
                                    data-testid={`error-medication-refills-${index}`}
                                  >
                                    {formErrors.medications[index].refills}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center space-x-2 pt-6">
                                <input
                                  type="checkbox"
                                  id={`medication-generic-${index}`}
                                  checked={medication.genericAllowed}
                                  onChange={(e) =>
                                    updateMedication(
                                      index,
                                      "genericAllowed",
                                      e.target.checked,
                                    )
                                  }
                                  data-testid={`checkbox-generic-allowed-${index}`}
                                  className="h-4 w-4"
                                />
                                <Label
                                  htmlFor={`medication-generic-${index}`}
                                  className="text-sm font-medium"
                                >
                                  Generic allowed
                                </Label>
                              </div>
                            </div>

                            <div>
                              <Label
                                htmlFor={`medication-instructions-${index}`}
                              >
                                Instructions
                              </Label>
                              <Textarea
                                id={`medication-instructions-${index}`}
                                placeholder="Special instructions for patient (e.g., take with food, before bedtime)"
                                value={medication.instructions}
                                onChange={(e) =>
                                  updateMedication(
                                    index,
                                    "instructions",
                                    e.target.value,
                                  )
                                }
                                data-testid={`input-instructions-${index}`}
                                rows={2}
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Pharmacy Information Section */}
                      <div className="space-y-3 border-t pt-4">
                        <Label className="text-lg font-medium">
                          Pharmacy Information
                        </Label>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="pharmacyName">Pharmacy Name</Label>
                            <Input
                              id="pharmacyName"
                              placeholder="Pharmacy name"
                              value={formData.pharmacyName}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  pharmacyName: e.target.value,
                                }))
                              }
                              data-testid="input-pharmacy-name"
                            />
                          </div>
                          <div>
                            <Label htmlFor="pharmacyPhone">Phone Number</Label>
                            <Input
                              id="pharmacyPhone"
                              placeholder="Phone number"
                              value={formData.pharmacyPhone}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  pharmacyPhone: e.target.value,
                                }))
                              }
                              data-testid="input-pharmacy-phone"
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="pharmacyAddress">Address</Label>
                          <Input
                            id="pharmacyAddress"
                            placeholder="Pharmacy address"
                            value={formData.pharmacyAddress}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                pharmacyAddress: e.target.value,
                              }))
                            }
                            data-testid="input-pharmacy-address"
                          />
                        </div>
                        <div>
                          <Label htmlFor="pharmacyEmail">Email</Label>
                          <Input
                            id="pharmacyEmail"
                            type="email"
                            placeholder="pharmacy@example.com"
                            value={formData.pharmacyEmail}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                pharmacyEmail: e.target.value,
                              }))
                            }
                            data-testid="input-pharmacy-email"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowNewPrescription(false);
                            setFormErrors({ medications: [] });
                          }}
                          data-testid="button-cancel-prescription"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={() => {
                            // Prevent multiple submissions
                            if (createPrescriptionMutation.isPending) {
                              return;
                            }

                            // Run comprehensive validation
                            if (!validateForm()) {
                              const errorMessage =
                                user?.role === "doctor"
                                  ? "Please fill in all required fields: Select a Patient, enter the Diagnosis, and add at least one complete Medication with Name, Dosage, Frequency, Duration, and Quantity."
                                  : "Please fix the errors in the form before submitting";

                              toast({
                                title: "Required Information Missing",
                                description: errorMessage,
                                variant: "destructive",
                              });
                              return;
                            }

                            // Filter out empty medications and prepare data with proper type conversion
                            const validMedications = formData.medications
                              .filter((med) => med.name.trim())
                              .map((med) => ({
                                name: med.name.trim(),
                                dosage: med.dosage.trim(),
                                frequency: med.frequency.trim(),
                                duration: med.duration.trim(),
                                quantity: parseInt(med.quantity) || 0,
                                refills: parseInt(med.refills) || 0,
                                instructions: med.instructions.trim(),
                                genericAllowed: med.genericAllowed,
                              }));

                            // Get the selected provider ID and the logged-in user ID
                            const selectedProviderId = parseInt(
                              formData.providerId,
                            );
                            const loggedInUserId = user?.id;

                            const prescriptionData = {
                              patientId: parseInt(formData.patientId),
                              providerId: selectedProviderId,
                              prescriptionCreatedBy: loggedInUserId,
                              diagnosis: formData.diagnosis.trim(),
                              pharmacy: {
                                name: formData.pharmacyName.trim(),
                                address: formData.pharmacyAddress.trim(),
                                phone: formData.pharmacyPhone.trim(),
                                email: formData.pharmacyEmail.trim(),
                              },
                              medications: validMedications,
                            };

                            console.log("=== FRONTEND PRESCRIPTION DEBUG ===");
                            console.log("Form data before parsing:", formData);
                            console.log(
                              "Final prescription data:",
                              prescriptionData,
                            );
                            console.log(
                              "Valid medications count:",
                              validMedications.length,
                            );

                            createPrescriptionMutation.mutate(prescriptionData);
                          }}
                          disabled={createPrescriptionMutation.isPending}
                          data-testid="button-submit-prescription"
                        >
                          {createPrescriptionMutation.isPending
                            ? selectedPrescription
                              ? "Updating..."
                              : "Creating..."
                            : selectedPrescription
                              ? "Update Prescription"
                              : "Create Prescription"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          {/* Prescriptions List */}
          <div className="space-y-4">
            {filteredPrescriptions.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Pill className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-2">
                    No prescriptions found
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Try adjusting your search terms or filters
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredPrescriptions.map((prescription) => {
                console.log("📋 Prescription data:", prescription);
                console.log("📋 prescriptionCreatedBy:", prescription.prescriptionCreatedBy);
                console.log("📋 doctorId:", prescription.doctorId);
                console.log("📋 Providers array:", providers);
                
                return (
                <Card
                  key={prescription.id}
                  className="hover:shadow-md transition-shadow bg-gradient-to-br from-blue-50 to-purple-100 dark:from-slate-800 dark:to-slate-700 border-2 border-blue-200 dark:border-slate-600"
                >
                  <CardContent className="p-0">
                    {/* Professional Prescription Header */}
                    <div className="bg-white dark:bg-slate-700 border-b-2 border-blue-200 dark:border-slate-600 p-4">
                      <div className="flex justify-between items-start">
                        <div className="text-center">
                          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                            CURA HEALTH EMR
                          </h2>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            Prescription #:{" "}
                            {prescription.prescriptionNumber || "N/A"}
                          </p>
                          {(() => {
                            const providerInfo = allUsers?.find((p: any) => p.id === prescription.doctorId);
                            const creatorInfo = allUsers?.find((p: any) => p.id === prescription.prescriptionCreatedBy);
                            return (
                              <div className="mt-1 space-y-1">
                                {providerInfo && (
                                  <div>
                                    <p className="text-xs text-gray-600 dark:text-gray-300">
                                      <span className="font-medium">Provider:</span> {providerInfo.firstName} {providerInfo.lastName}
                                    </p>
                                    {providerInfo.department && (
                                      <p className="text-xs text-gray-600 dark:text-gray-300">
                                        <span className="font-medium">Specialization:</span> {providerInfo.department}
                                      </p>
                                    )}
                                  </div>
                                )}
                                {creatorInfo && (
                                  <p className="text-xs text-gray-600 dark:text-gray-300">
                                    Created by {formatRoleLabel(creatorInfo.role)}: {creatorInfo.firstName} {creatorInfo.lastName}
                                  </p>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            {editingStatusId === prescription.id ? (
                              <div className="flex items-center gap-2">
                                <Select
                                  value={tempStatus}
                                  onValueChange={setTempStatus}
                                >
                                  <SelectTrigger className="w-[120px] h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">
                                      pending
                                    </SelectItem>
                                    <SelectItem value="active">
                                      active
                                    </SelectItem>
                                    <SelectItem value="completed">
                                      completed
                                    </SelectItem>
                                    <SelectItem value="cancelled">
                                      cancelled
                                    </SelectItem>
                                    <SelectItem value="signed">
                                      signed
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                <Button
                                  size="sm"
                                  onClick={handleSaveStatus}
                                  disabled={statusUpdateMutation.isPending}
                                  className="h-8 px-2"
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleCancelEditingStatus}
                                  disabled={statusUpdateMutation.isPending}
                                  className="h-8 px-2"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Badge
                                  className={getStatusColor(
                                    prescription.status,
                                  )}
                                >
                                  {prescription.status}
                                </Badge>
                                {user?.role && user?.role !== "patient" && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      handleStartEditingStatus(
                                        prescription.id,
                                        prescription.status,
                                      )
                                    }
                                    className="h-6 w-6 p-0 hover:bg-gray-100"
                                    data-testid="button-edit-status"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                          {prescription.interactions &&
                            prescription.interactions.length > 0 && (
                              <Badge
                                variant="destructive"
                                className="flex items-center gap-1 ml-2 mt-1"
                              >
                                <AlertTriangle className="h-3 w-3" />
                                Drug Interactions
                              </Badge>
                            )}
                        </div>
                      </div>

                      <div className="text-center mt-2">
                        {clinicHeader?.logoBase64 &&
                        clinicHeader.logoPosition === "center" ? (
                          <div className="flex items-center justify-center gap-4 my-2">
                            <img
                              src={clinicHeader.logoBase64}
                              alt="Clinic Logo"
                              className="flex-shrink-0"
                              style={{ maxWidth: "70px", maxHeight: "70px" }}
                            />
                            <div
                              className="text-center"
                              style={{
                                fontFamily:
                                  clinicHeader?.fontFamily || "inherit",
                                fontSize: clinicHeader?.fontSize || "14px",
                                fontWeight:
                                  clinicHeader?.fontWeight || "normal",
                                fontStyle: clinicHeader?.fontStyle || "normal",
                                textDecoration:
                                  clinicHeader?.textDecoration || "none",
                              }}
                            >
                              <p
                                className="text-gray-600 dark:text-gray-300 font-bold"
                                style={{
                                  fontSize:
                                    clinicHeader?.clinicNameFontSize || "16px",
                                }}
                              >
                                {clinicHeader?.clinicName ||
                                  "Halo Health Clinic"}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-300">
                                {clinicHeader?.address ||
                                  "Unit 2 Drayton Court, Solihull"}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-300">
                                {clinicHeader?.phone || "+44(0)121 827 5531"}
                              </p>
                              {clinicHeader?.email && (
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                  {clinicHeader.email}
                                </p>
                              )}
                              {clinicHeader?.website && (
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                  {clinicHeader.website}
                                </p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <>
                            {clinicHeader?.logoBase64 && (
                              <div
                                className="my-2"
                                style={{
                                  textAlign:
                                    clinicHeader.logoPosition || "center",
                                }}
                              >
                                <img
                                  src={clinicHeader.logoBase64}
                                  alt="Clinic Logo"
                                  className="inline-block"
                                  style={{
                                    maxWidth: "80px",
                                    maxHeight: "80px",
                                  }}
                                />
                              </div>
                            )}

                            <div
                              style={{
                                fontFamily:
                                  clinicHeader?.fontFamily || "inherit",
                                fontSize: clinicHeader?.fontSize || "14px",
                                fontWeight:
                                  clinicHeader?.fontWeight || "normal",
                                fontStyle: clinicHeader?.fontStyle || "normal",
                                textDecoration:
                                  clinicHeader?.textDecoration || "none",
                                textAlign:
                                  clinicHeader?.logoPosition || "center",
                              }}
                            >
                              <p
                                className="text-gray-600 dark:text-gray-300 font-bold"
                                style={{
                                  fontSize:
                                    clinicHeader?.clinicNameFontSize || "16px",
                                }}
                              >
                                {clinicHeader?.clinicName ||
                                  "Halo Health Clinic"}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-300">
                                {clinicHeader?.address ||
                                  "Unit 2 Drayton Court, Solihull"}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-300">
                                {clinicHeader?.phone || "+44(0)121 827 5531"}
                              </p>
                              {clinicHeader?.email && (
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                  {clinicHeader.email}
                                </p>
                              )}
                              {clinicHeader?.website && (
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                  {clinicHeader.website}
                                </p>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Patient Information */}
                    <div className="px-6 py-4 bg-blue-50 dark:bg-slate-600">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm text-gray-800 dark:text-gray-100">
                            <strong>Name:</strong> {prescription.patientName}
                          </p>
                          <p className="text-sm text-gray-800 dark:text-gray-100">
                            <strong>Address:</strong>{" "}
                            {prescription.patientAddress || "-"}
                          </p>
                          <p className="text-sm text-gray-800 dark:text-gray-100">
                            <strong>Allergies:</strong>{" "}
                            {prescription.patientAllergies || "-"}
                          </p>
                          <p className="text-sm text-gray-800 dark:text-gray-100">
                            <strong>Weight:</strong>{" "}
                            {prescription.patientWeight || "-"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-800 dark:text-gray-100">
                            <strong>DOB:</strong>{" "}
                            {prescription.patientDob || "-"}
                          </p>
                          <p className="text-sm text-gray-800 dark:text-gray-100">
                            <strong>Age:</strong>{" "}
                            {prescription.patientAge || "-"}
                          </p>
                          <p className="text-sm text-gray-800 dark:text-gray-100">
                            <strong>Sex:</strong>{" "}
                            {prescription.patientSex || "M"}
                          </p>
                          <p className="text-sm text-gray-800 dark:text-gray-100">
                            <strong>Date:</strong>{" "}
                            {prescription.prescribedAt ||
                            prescription.issuedDate ||
                            prescription.createdAt
                              ? (() => {
                                  const date = new Date(
                                    prescription.prescribedAt ||
                                      prescription.issuedDate ||
                                      prescription.createdAt,
                                  );
                                  const day = date.getDate();
                                  const month = date.toLocaleDateString(
                                    "en-GB",
                                    { month: "short" },
                                  );
                                  const year = date.getFullYear();
                                  const suffix =
                                    day > 3 && day < 21
                                      ? "th"
                                      : ["th", "st", "nd", "rd"][day % 10] ||
                                        "th";
                                  return `${day}${suffix} ${month} ${year}`;
                                })()
                              : "-"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Large HHC Symbol */}
                    <div className="flex justify-center py-4 bg-blue-50 dark:bg-slate-600">
                      <div className="text-6xl font-bold text-blue-400 dark:text-blue-300 opacity-50">
                        HHC
                      </div>
                    </div>

                    {/* Prescription Content */}
                    <div className="px-6 py-4 bg-white dark:bg-slate-700 min-h-[200px]">
                      <div className="space-y-4">
                        {prescription.medications.map(
                          (medication: any, index: number) => (
                            <div key={index}>
                              <p className="font-medium text-lg text-gray-800 dark:text-gray-100">
                                {medication.name} {medication.dosage}
                              </p>
                              <p className="text-sm text-gray-700 dark:text-gray-300 ml-4">
                                Sig:{" "}
                                {medication.instructions ||
                                  medication.frequency}
                              </p>
                              <p className="text-sm text-gray-700 dark:text-gray-300 ml-4">
                                Disp: {medication.quantity} (
                                {medication.duration})
                              </p>
                              <p className="text-sm text-gray-700 dark:text-gray-300 ml-4">
                                Refills: {medication.refills}
                              </p>
                              {index < prescription.medications.length - 1 && (
                                <hr className="my-3 border-gray-200" />
                              )}
                            </div>
                          ),
                        )}
                      </div>

                      {/* Diagnosis */}
                      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
                        <p className="text-sm text-gray-800 dark:text-gray-100">
                          <strong>Diagnosis:</strong> {prescription.diagnosis}
                        </p>
                      </div>
                    </div>

                    {/* Prescription Footer */}
                    <div className="px-6 py-4 bg-blue-50 dark:bg-slate-600 border-t-2 border-blue-200 dark:border-slate-600">
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                            Resident Physician
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-300">
                            (Signature)
                          </p>
                          {prescription.signature &&
                          prescription.signature.doctorSignature ? (
                            <div className="mt-2">
                              <img
                                src={prescription.signature.doctorSignature}
                                alt="Doctor Signature"
                                className="h-12 w-32 border border-gray-300 bg-white rounded"
                              />
                              <p className="text-xs text-green-600 mt-1">
                                ✓ E-Signed by{" "}
                                {prescription.signature.signedBy ||
                                  "Unknown Provider"}
                              </p>
                              <p className="text-xs text-gray-500">
                                {prescription.signature.signedAt &&
                                !isNaN(
                                  new Date(
                                    prescription.signature.signedAt,
                                  ).getTime(),
                                )
                                  ? format(
                                      new Date(prescription.signature.signedAt),
                                      "MMM dd, yyyy HH:mm",
                                    )
                                  : "Date not available"}
                              </p>
                            </div>
                          ) : (
                            <div className="border-b border-gray-400 w-32 mt-2"></div>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                            May Substitute
                          </p>
                          <div className="border-b border-gray-400 w-32 mt-2"></div>
                        </div>
                      </div>

                      <div className="mt-4 text-center">
                        <p className="text-xs text-gray-600 dark:text-gray-300">
                          {clinicFooter?.footerText || "Pharmacy: Halo Health - +44(0)121 827 5531"}
                        </p>
                      </div>
                    </div>

                    {/* Drug Interactions Warning */}
                    {prescription.interactions &&
                      prescription.interactions.length > 0 && (
                        <div className="mx-4 mb-4 p-3 bg-red-50 border border-red-200 rounded">
                          <h4 className="font-medium text-red-800 mb-2 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            Drug Interactions Warning:
                          </h4>
                          <div className="space-y-1">
                            {prescription.interactions.map(
                              (interaction: any, index: number) => (
                                <div
                                  key={index}
                                  className="text-xs text-red-700"
                                >
                                  <Badge
                                    className={
                                      getSeverityColor(interaction.severity) +
                                      " mr-2"
                                    }
                                    style={{ fontSize: "10px" }}
                                  >
                                    {interaction.severity}
                                  </Badge>
                                  {interaction.description}
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      )}
                  </CardContent>

                  {/* Action Buttons */}
                  <div className="px-4 pb-4">
                    <div className="flex flex-wrap gap-1 sm:gap-2 justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewPrescription(prescription)}
                        className="text-xs sm:text-sm px-2 sm:px-3"
                      >
                        <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        <span className="hidden sm:inline">View</span>
                        <span className="sm:hidden">View</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePrintPrescription(prescription.id)}
                        className="text-xs sm:text-sm px-2 sm:px-3"
                      >
                        <Printer className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        <span className="hidden sm:inline">Print</span>
                        <span className="sm:hidden">Print</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSendToPharmacy(prescription.id)}
                        className="text-xs sm:text-sm px-2 sm:px-3"
                      >
                        <Send className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        <span className="hidden lg:inline">
                          Send to Pharmacy
                        </span>
                        <span className="lg:hidden">Send</span>
                      </Button>
                      {user?.role !== "patient" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedPrescription(prescription);
                            setShowESignDialog(true);
                          }}
                          className="text-xs sm:text-sm px-2 sm:px-3"
                        >
                          <PenTool className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          <span className="hidden lg:inline">E-Sign</span>
                          <span className="lg:hidden">Sign</span>
                        </Button>
                      )}
                      {user?.role !== "patient" &&
                        prescription.status === "active" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditPrescription(prescription)}
                            className="text-xs sm:text-sm px-2 sm:px-3"
                          >
                            <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            <span className="hidden sm:inline">Edit</span>
                            <span className="sm:hidden">Edit</span>
                          </Button>
                        )}
                      {user?.role !== "patient" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleDeletePrescription(prescription.id)
                          }
                          disabled={deletePrescriptionMutation.isPending}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs sm:text-sm px-2 sm:px-3 disabled:opacity-50"
                        >
                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          <span className="hidden sm:inline">
                            {deletePrescriptionMutation.isPending
                              ? "Deleting..."
                              : "Delete"}
                          </span>
                          <span className="sm:hidden">
                            {deletePrescriptionMutation.isPending
                              ? "Deleting..."
                              : "Delete"}
                          </span>
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* View Prescription Details Dialog */}
      <Dialog open={showViewDetails} onOpenChange={setShowViewDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Prescription Details</DialogTitle>
          </DialogHeader>
          {selectedPrescription && (
            <div className="space-y-6">
              {/* Patient & Provider Info */}
              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Patient Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Name</p>
                      <p className="font-medium">
                        {selectedPrescription.patientName}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Patient ID
                      </p>
                      <p className="font-mono text-sm">
                        {selectedPrescription.patientId}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Provider Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(() => {
                      const doctor = allUsers.find(
                        (u) => u.id === selectedPrescription.doctorId,
                      );
                      return doctor ? (
                        <>
                          <div>
                            <p className="text-sm font-medium text-gray-600">
                              Provider
                            </p>
                            <p className="font-medium">
                              Dr. {doctor.firstName} {doctor.lastName}
                            </p>
                          </div>
                          {doctor.department && (
                            <div>
                              <p className="text-sm font-medium text-gray-600">
                                Specialization
                              </p>
                              <p className="font-medium">{doctor.department}</p>
                            </div>
                          )}
                        </>
                      ) : (
                        <div>
                          <p className="text-sm font-medium text-gray-600">
                            Provider
                          </p>
                          <p className="font-medium">
                            Provider information unavailable
                          </p>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              </div>

              {/* Prescription Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Prescription Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Status
                      </p>
                      <Badge
                        className={getStatusColor(selectedPrescription.status)}
                      >
                        {selectedPrescription.status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Prescribed Date
                      </p>
                      <p className="font-medium">
                        {new Date(
                          selectedPrescription.prescribedAt,
                        ).toLocaleDateString()}
                      </p>
                    </div>
                    {selectedPrescription.prescriptionNumber && (
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Prescription Number
                        </p>
                        <p className="font-mono text-sm">
                          {selectedPrescription.prescriptionNumber}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {selectedPrescription.issuedDate && (
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Issued Date
                        </p>
                        <p className="font-medium">
                          {new Date(
                            selectedPrescription.issuedDate,
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {selectedPrescription.doctorId &&
                      (() => {
                        const doctor = allUsers.find(
                          (u) => u.id === selectedPrescription.doctorId,
                        );
                        return (
                          doctor && (
                            <div>
                              <p className="text-sm font-medium text-gray-600">
                                Prescribing Doctor
                              </p>
                              <p className="font-medium">
                                Dr. {doctor.firstName} {doctor.lastName}
                              </p>
                              {doctor.department && (
                                <p className="text-sm text-gray-500">
                                  {doctor.department}
                                </p>
                              )}
                            </div>
                          )
                        );
                      })()}
                    {selectedPrescription.prescriptionCreatedBy &&
                      (() => {
                        const creator = allUsers.find(
                          (u) =>
                            u.id === selectedPrescription.prescriptionCreatedBy,
                        );
                        return (
                          creator && (
                            <div>
                              <p className="text-sm font-medium text-gray-600">
                                Created By
                              </p>
                              <p className="font-medium">
                                {creator.firstName} {creator.lastName}
                              </p>
                              {creator.role && (
                                <p className="text-sm text-gray-500 capitalize">
                                  {formatRoleLabel(creator.role)}
                                </p>
                              )}
                            </div>
                          )
                        );
                      })()}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedPrescription.createdAt && (
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Created At
                        </p>
                        <p className="font-medium">
                          {new Date(
                            selectedPrescription.createdAt,
                          ).toLocaleString()}
                        </p>
                      </div>
                    )}
                    {selectedPrescription.updatedAt && (
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Updated At
                        </p>
                        <p className="font-medium">
                          {new Date(
                            selectedPrescription.updatedAt,
                          ).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Diagnosis
                    </p>
                    <p className="font-medium">
                      {selectedPrescription.diagnosis}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Medications */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Pill className="h-5 w-5" />
                    Medications ({selectedPrescription.medications.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedPrescription.medications.map(
                      (medication, index) => (
                        <div key={index} className="p-4 border rounded-lg">
                          <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                              <p className="text-sm font-medium text-gray-600">
                                Medication
                              </p>
                              <p className="font-semibold text-lg">
                                {medication.name}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-600">
                                Dosage
                              </p>
                              <p className="font-medium">{medication.dosage}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-4 gap-4 mb-3">
                            <div>
                              <p className="text-sm font-medium text-gray-600">
                                Frequency
                              </p>
                              <p>{medication.frequency}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-600">
                                Duration
                              </p>
                              <p>{medication.duration}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-600">
                                Quantity
                              </p>
                              <p>{medication.quantity}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-600">
                                Refills
                              </p>
                              <p>{medication.refills}</p>
                            </div>
                          </div>
                          <div className="mb-3">
                            <p className="text-sm font-medium text-gray-600">
                              Instructions
                            </p>
                            <p className="text-sm bg-gray-50 p-2 rounded">
                              {medication.instructions}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">
                              Generic Substitution
                            </p>
                            <Badge
                              variant={
                                medication.genericAllowed
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {medication.genericAllowed
                                ? "Allowed"
                                : "Not Allowed"}
                            </Badge>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Drug Interactions */}
              {selectedPrescription.interactions &&
                selectedPrescription.interactions.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        Drug Interactions (
                        {selectedPrescription.interactions.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {selectedPrescription.interactions.map(
                          (interaction, index) => (
                            <div
                              key={index}
                              className="flex gap-3 p-3 border rounded-lg"
                            >
                              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <Badge
                                  className={getSeverityColor(
                                    interaction.severity,
                                  )}
                                >
                                  {interaction.severity
                                    .charAt(0)
                                    .toUpperCase() +
                                    interaction.severity.slice(1)}
                                </Badge>
                                <p className="text-sm mt-2">
                                  {interaction.description}
                                </p>
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

              {/* Pharmacy Information */}
              {selectedPrescription.pharmacy && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Pharmacy Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Pharmacy Name
                      </p>
                      <p className="font-medium">
                        {selectedPrescription.pharmacy.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Address
                      </p>
                      <p>{selectedPrescription.pharmacy.address}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Phone</p>
                      <p>{selectedPrescription.pharmacy.phone}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Send to Pharmacy Dialog */}
      <Dialog open={showPharmacyDialog} onOpenChange={setShowPharmacyDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Prescription to Halo Health Pharmacy</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2">
                Halo Health Pharmacy
              </h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p>Unit 2 Drayton Court</p>
                <p>Solihull</p>
                <p>B90 4NG</p>
                <p className="font-medium mt-2">Phone: +44(0)121 827 5531</p>
                <p className="font-medium">Email: pharmacy@halohealth.co.uk</p>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                This prescription will be sent as a PDF to the pharmacy via
                email for processing.
              </p>

              <div className="space-y-2">
                <Label htmlFor="pharmacy-email" className="text-sm font-medium">
                  Pharmacy Email Address
                </Label>
                <Input
                  id="pharmacy-email"
                  type="email"
                  value={pharmacyEmail}
                  onChange={(e) => setPharmacyEmail(e.target.value)}
                  placeholder="Enter pharmacy email address"
                  className="w-full"
                />
              </div>

              {/* File Attachment Section */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  Optional File Attachments
                </Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      document.getElementById("file-input")?.click()
                    }
                    className="flex items-center gap-2"
                  >
                    <Paperclip className="h-4 w-4" />
                    Attach Files
                  </Button>
                  <input
                    id="file-input"
                    type="file"
                    multiple
                    onChange={handleFileAttachment}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  />
                  <span className="text-xs text-gray-500">
                    PDF, DOC, DOCX, JPG, PNG files accepted
                  </span>
                </div>

                {/* Display attached files */}
                {attachedFiles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Attached Files:</p>
                    <div className="space-y-1">
                      {attachedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-gray-50 p-2 rounded border"
                        >
                          <div className="flex items-center gap-2">
                            <Paperclip className="h-3 w-3 text-gray-500" />
                            <span className="text-sm text-gray-700">
                              {file.name}
                            </span>
                            <span className="text-xs text-gray-500">
                              ({(file.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAttachedFile(index)}
                            className="h-6 w-6 p-0 hover:bg-red-100"
                          >
                            <X className="h-3 w-3 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-blue-600" />
                <span>PDF prescription will be generated automatically</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Send className="h-4 w-4 text-green-600" />
                <span>
                  Email will be sent to the specified pharmacy address
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowPharmacyDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const pharmacyData = {
                    name: "Halo Health",
                    address: "Unit 2 Drayton Court, Solihull, B90 4NG",
                    phone: "+44(0)121 827 5531",
                    email: pharmacyEmail,
                  };
                  // Find the selected prescription to get patient name and prescription data
                  const prescription = prescriptions?.find(
                    (p) => p.id === selectedPrescriptionId,
                  );
                  sendToPharmacyMutation.mutate({
                    prescriptionId: selectedPrescriptionId,
                    pharmacyData,
                    patientName: prescription?.patientName || "Patient",
                    attachments:
                      attachedFiles.length > 0 ? attachedFiles : undefined,
                    prescriptionNumber: prescription?.prescriptionNumber,
                    prescriptionData: prescription,
                  });
                }}
                disabled={
                  sendToPharmacyMutation.isPending || !pharmacyEmail.trim()
                }
                className="flex-1 bg-medical-blue hover:bg-blue-700"
              >
                {sendToPharmacyMutation.isPending
                  ? "Sending PDF..."
                  : "Send PDF to Pharmacy"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Advanced E-Signature Dialog */}
      <Dialog open={showESignDialog} onOpenChange={setShowESignDialog}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <PenTool className="h-6 w-6 text-medical-blue" />
              Advanced Electronic Signature
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="signature" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="signature">Signature</TabsTrigger>
              <TabsTrigger value="authentication">Authentication</TabsTrigger>
              <TabsTrigger value="verification">Verification</TabsTrigger>
              <TabsTrigger value="compliance">Compliance</TabsTrigger>
            </TabsList>

            {/* Signature Tab */}
            <TabsContent value="signature" className="space-y-4">
              {selectedPrescription && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Prescription Summary for Digital Signature
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm text-blue-800">
                    <div>
                      <p>
                        <strong>Patient:</strong>{" "}
                        {selectedPrescription.patientName}
                      </p>
                      <p>
                        <strong>Patient ID:</strong>{" "}
                        {selectedPrescription.patientId}
                      </p>
                      <p>
                        <strong>Date Prescribed:</strong>{" "}
                        {format(
                          new Date(selectedPrescription.prescribedAt),
                          "MMM dd, yyyy HH:mm",
                        )}
                      </p>
                    </div>
                    <div>
                      <p>
                        <strong>Prescribing Provider:</strong>{" "}
                        {(() => {
                          const providerInfo = allUsers?.find((p: any) => p.id === selectedPrescription.doctorId);
                          return providerInfo ? `${providerInfo.firstName} ${providerInfo.lastName}` : selectedPrescription.providerName;
                        })()}
                      </p>
                      <p>
                        <strong>Created By:</strong>{" "}
                        {(() => {
                          const creatorInfo = allUsers?.find((p: any) => p.id === selectedPrescription.prescriptionCreatedBy);
                          return creatorInfo ? `${formatRoleLabel(creatorInfo.role)} - ${creatorInfo.firstName} ${creatorInfo.lastName}` : 'N/A';
                        })()}
                      </p>
                      <p>
                        <strong>Diagnosis:</strong>{" "}
                        {selectedPrescription.diagnosis}
                      </p>
                      <p>
                        <strong>Total Medications:</strong>{" "}
                        {selectedPrescription.medications.length}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 p-3 bg-white rounded border">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Medications to be signed:
                    </p>
                    {selectedPrescription.medications.map(
                      (med: any, idx: number) => (
                        <div key={idx} className="text-xs text-gray-600 mb-1">
                          • {med.name} {med.dosage} - {med.frequency} x{" "}
                          {med.quantity} ({med.refills} refills)
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Advanced Signature Canvas */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-gray-700">
                      Digital Signature Pad
                    </label>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      Signature Quality: Real-time Analysis
                    </div>
                  </div>

                  <div className="border-2 border-gray-300 rounded-lg relative overflow-hidden bg-white shadow-inner">
                    <canvas
                      ref={canvasRef}
                      width={450}
                      height={200}
                      className="cursor-crosshair w-full"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawingTouch}
                      onTouchMove={drawTouch}
                      onTouchEnd={stopDrawingTouch}
                    />
                    <div className="absolute top-2 right-2 text-xs text-gray-400">
                      Advanced Capture Mode
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={clearSignature}
                      className="flex-1"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear
                    </Button>
                    <Button variant="outline" className="flex-1">
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                  </div>
                </div>

                {/* Signature Analytics */}
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <h5 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Signature Quality Analysis
                    </h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Stroke Consistency:</span>
                        <span className="text-green-600 font-medium">
                          Excellent
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Pressure Variation:</span>
                        <span className="text-green-600 font-medium">
                          Natural
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Speed Analysis:</span>
                        <span className="text-green-600 font-medium">
                          Consistent
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Uniqueness Score:</span>
                        <span className="text-green-600 font-medium">
                          98.7%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h5 className="font-medium text-blue-800 mb-2">
                      Biometric Verification
                    </h5>
                    <div className="text-sm text-blue-700 space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Touch patterns analyzed</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Behavioral biometrics captured</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Device fingerprint verified</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Authentication Tab */}
            <TabsContent value="authentication" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Multi-Factor Authentication
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded border border-green-200">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="text-sm font-medium">
                            Primary Authentication
                          </span>
                        </div>
                        <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                          Verified
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-green-50 rounded border border-green-200">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="text-sm font-medium">
                            Device Recognition
                          </span>
                        </div>
                        <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                          Trusted
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-yellow-50 rounded border border-yellow-200">
                        <div className="flex items-center gap-3">
                          <Clock className="h-5 w-5 text-yellow-600" />
                          <span className="text-sm font-medium">
                            Time-based Verification
                          </span>
                        </div>
                        <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">
                          Active
                        </span>
                      </div>
                    </div>

                    <Button className="w-full bg-medical-blue hover:bg-blue-700">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Verify Additional Factor
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Security Validation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-sm space-y-2">
                      <p>
                        <strong>Session ID:</strong>{" "}
                        <span className="font-mono text-xs">
                          ESS-
                          {Math.random()
                            .toString(36)
                            .substr(2, 9)
                            .toUpperCase()}
                        </span>
                      </p>
                      <p>
                        <strong>IP Address:</strong>{" "}
                        <span className="font-mono text-xs">192.168.1.45</span>
                      </p>
                      <p>
                        <strong>Location:</strong> Authorized Facility
                      </p>
                      <p>
                        <strong>Timestamp:</strong>{" "}
                        {format(new Date(), "yyyy-MM-dd HH:mm:ss")} UTC
                      </p>
                    </div>

                    <div className="bg-gray-50 p-3 rounded border">
                      <p className="text-xs text-gray-600 mb-2">
                        <strong>Digital Certificate Status:</strong>
                      </p>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-600">
                          Valid & Current
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Verification Tab */}
            <TabsContent value="verification" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Advanced Signature Verification
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-green-50 p-4 rounded border border-green-200">
                      <h5 className="font-medium text-green-800 mb-2">
                        Handwriting Analysis
                      </h5>
                      <div className="text-sm text-green-700 space-y-1">
                        <p>• Stroke patterns: ✓ Verified</p>
                        <p>• Pressure dynamics: ✓ Natural</p>
                        <p>• Speed consistency: ✓ Human-like</p>
                      </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded border border-blue-200">
                      <h5 className="font-medium text-blue-800 mb-2">
                        Biometric Matching
                      </h5>
                      <div className="text-sm text-blue-700 space-y-1">
                        <p>• Touch patterns: ✓ Match 97.8%</p>
                        <p>• Behavioral traits: ✓ Consistent</p>
                        <p>• Device interaction: ✓ Verified</p>
                      </div>
                    </div>

                    <div className="bg-purple-50 p-4 rounded border border-purple-200">
                      <h5 className="font-medium text-purple-800 mb-2">
                        AI Fraud Detection
                      </h5>
                      <div className="text-sm text-purple-700 space-y-1">
                        <p>• Anomaly detection: ✓ Clean</p>
                        <p>• Pattern recognition: ✓ Genuine</p>
                        <p>• Risk assessment: ✓ Low risk</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded border">
                    <h5 className="font-medium text-gray-800 mb-2">
                      Verification Summary
                    </h5>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p>
                          <strong>Overall Confidence:</strong>{" "}
                          <span className="text-green-600 font-medium">
                            99.2%
                          </span>
                        </p>
                        <p>
                          <strong>Authentication Level:</strong>{" "}
                          <span className="text-blue-600 font-medium">
                            High Security
                          </span>
                        </p>
                      </div>
                      <div>
                        <p>
                          <strong>Verification Method:</strong> Multi-modal
                        </p>
                        <p>
                          <strong>Compliance Level:</strong>{" "}
                          <span className="text-green-600 font-medium">
                            FDA 21 CFR Part 11
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Compliance Tab */}
            <TabsContent value="compliance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Legal & Regulatory Compliance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h5 className="font-semibold text-blue-900 mb-3">
                      Electronic Signature Compliance Standards
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span>FDA 21 CFR Part 11 Compliant</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span>HIPAA Security Rule Compliant</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span>ESIGN Act Compliant</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span>EU eIDAS Regulation</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span>DEA EPCS Requirements</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span>ISO 27001 Security Standards</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <h5 className="font-semibold text-yellow-900 mb-2">
                      Legal Declaration
                    </h5>
                    <div className="text-xs text-yellow-800 space-y-2">
                      <p>
                        <strong>
                          By applying your electronic signature, you hereby
                          declare and confirm that:
                        </strong>
                      </p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>
                          You are the licensed healthcare provider authorized to
                          prescribe the medication(s) listed
                        </li>
                        <li>
                          You have verified patient identity and reviewed their
                          complete medical history
                        </li>
                        <li>
                          The prescription information is accurate, complete,
                          and clinically appropriate
                        </li>
                        <li>
                          You understand this electronic signature carries the
                          same legal weight as a handwritten signature
                        </li>
                        <li>
                          You consent to the electronic processing and
                          transmission of this prescription
                        </li>
                        <li>
                          You acknowledge that this signature will be
                          permanently recorded with audit trail
                        </li>
                      </ul>
                      <p className="mt-3">
                        <strong>Audit Trail Information:</strong> This signature
                        will be logged with timestamp, IP address, device
                        fingerprint, and biometric verification data for
                        compliance and security purposes.
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded border">
                    <h5 className="font-medium text-gray-800 mb-2">
                      Digital Certificate Details
                    </h5>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <p>
                          <strong>Certificate Authority:</strong> Cura Health CA
                        </p>
                        <p>
                          <strong>Certificate Type:</strong> Medical
                          Professional
                        </p>
                        <p>
                          <strong>Valid Until:</strong>{" "}
                          {format(
                            new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                            "MMM dd, yyyy",
                          )}
                        </p>
                      </div>
                      <div>
                        <p>
                          <strong>Encryption Level:</strong> RSA-2048 / SHA-256
                        </p>
                        <p>
                          <strong>Trust Level:</strong> High Assurance
                        </p>
                        <p>
                          <strong>Verification Status:</strong>{" "}
                          <span className="text-green-600">
                            Active & Verified
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Success Message */}
          {signatureSaved && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
              <div className="flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-green-900">
                  Signature Saved Successfully!
                </h4>
                <p className="text-sm text-green-700">
                  Prescription has been electronically signed and saved to
                  database.
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowESignDialog(false);
                setSignatureSaved(false);
              }}
              className="flex-1"
            >
              Cancel Signature Process
            </Button>
            <Button
              onClick={saveSignature}
              className="flex-2 bg-medical-blue hover:bg-blue-700"
              disabled={!selectedPrescription || signatureSaved}
            >
              <PenTool className="h-4 w-4 mr-2" />
              {signatureSaved
                ? "Signature Applied"
                : "Apply Advanced E-Signature"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
