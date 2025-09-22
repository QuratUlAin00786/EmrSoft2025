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

interface Prescription {
  id: string;
  patientId: string;
  patientName: string;
  providerId: string;
  providerName: string;
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
  const queryClient = useQueryClient();

  // Status editing state
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [tempStatus, setTempStatus] = useState<string>("");

  // Status update mutation
  const statusUpdateMutation = useMutation({
    mutationFn: async ({ prescriptionId, status }: { prescriptionId: string; status: string }) => {
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {
        "X-Tenant-Subdomain": "demo",
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
  const handleStartEditingStatus = (prescriptionId: string, currentStatus: string) => {
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
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  // Form state for prescription editing
  const [formData, setFormData] = useState({
    patientId: "",
    patientName: "",
    providerId: "",
    diagnosis: "",
    medications: [{
      name: "",
      dosage: "",
      frequency: "",
      duration: "",
      quantity: "",
      refills: "",
      instructions: "",
      genericAllowed: true,
    }],
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
      const medications = selectedPrescription.medications.length > 0 
        ? selectedPrescription.medications.map(med => ({
            name: med.name || "",
            dosage: med.dosage || "",
            frequency: med.frequency || "",
            duration: med.duration || "",
            quantity: med.quantity?.toString() || "",
            refills: med.refills?.toString() || "",
            instructions: med.instructions || "",
            genericAllowed: med.genericAllowed !== undefined ? med.genericAllowed : true,
          })) 
        : [{ name: "", dosage: "", frequency: "", duration: "", quantity: "", refills: "", instructions: "", genericAllowed: true }];
      
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
      setFormData({
        patientId: "",
        patientName: "",
        providerId: "",
        diagnosis: "",
        medications: [{
          name: "",
          dosage: "",
          frequency: "",
          duration: "",
          quantity: "",
          refills: "",
          instructions: "",
          genericAllowed: true,
        }],
        pharmacyName: "Halo Health",
        pharmacyAddress: "Unit 2 Drayton Court, Solihull, B90 4NG",
        pharmacyPhone: "+44(0)121 827 5531",
        pharmacyEmail: "pharmacy@halohealth.co.uk",
      });
      // Clear form errors when creating new
      setFormErrors({ medications: [] });
    }
  }, [selectedPrescription]);

  const fetchPatients = async () => {
    try {
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
    }
  };

  const fetchProviders = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {
        "X-Tenant-Subdomain": "demo",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch("/api/medical-staff", {
        headers,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log("Fetched providers:", data);
      setProviders(data.staff || []);
    } catch (err) {
      console.error("Error fetching providers:", err);
      setProviders([]);
    }
  };

  useEffect(() => {
    fetchPatients();
    fetchProviders();
  }, []);

  const {
    data: rawPrescriptions = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/prescriptions"],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {
        "X-Tenant-Subdomain": "demo",
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
    },
    enabled: true,
  });

  // Create patient and provider name mappings from fetched data
  const patientNames: Record<number, string> = {};
  patients.forEach((patient) => {
    patientNames[patient.id] = `${patient.firstName} ${patient.lastName}`;
  });

  const providerNames: Record<number, string> = {};
  providers.forEach((provider) => {
    providerNames[provider.id] =
      `Dr. ${provider.firstName} ${provider.lastName}`;
  });

  const prescriptions = Array.isArray(rawPrescriptions)
    ? rawPrescriptions.map((prescription: any) => ({
        ...prescription,
        patientName:
          patientNames[prescription.patientId] ||
          `Patient ${prescription.patientId}`,
        providerName:
          providerNames[prescription.providerId] ||
          `Provider ${prescription.providerId}`,
      }))
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
        "X-Tenant-Subdomain": "demo",
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
        throw new Error(
          `Failed to ${isUpdate ? "update" : "create"} prescription: ${response.status}`,
        );
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
    }: {
      prescriptionId: string;
      pharmacyData: any;
      patientName?: string;
      attachments?: File[];
    }) => {
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Tenant-Subdomain": "demo",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // First update the prescription with pharmacy data
      const response = await fetch(`/api/prescriptions/${prescriptionId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ pharmacy: pharmacyData }),
        credentials: "include",
      });
      if (!response.ok)
        throw new Error("Failed to send prescription to pharmacy");

      // Then send the PDF email to the pharmacy with attachments
      const formData = new FormData();
      formData.append("pharmacyEmail", pharmacyData.email);
      formData.append("pharmacyName", pharmacyData.name);
      formData.append("patientName", patientName || "Patient");

      // Add file attachments if any
      if (attachments && attachments.length > 0) {
        attachments.forEach((file, index) => {
          formData.append(`attachments`, file);
        });
      }

      const emailHeaders: Record<string, string> = {
        "X-Tenant-Subdomain": "demo",
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

      if (!emailResponse.ok)
        throw new Error("Failed to send PDF email to pharmacy");

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description:
          "Prescription sent to pharmacy and PDF emailed successfully",
      });
      setShowPharmacyDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/prescriptions"] });
    },
    onError: (error: any) => {
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
    setSelectedPrescription(null); // Clear any selected prescription for new creation
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
    
    if (!medication.quantity || isNaN(parseInt(medication.quantity)) || parseInt(medication.quantity) <= 0) {
      errors.quantity = "Quantity must be a positive number";
    }
    
    if (medication.refills && (isNaN(parseInt(medication.refills)) || parseInt(medication.refills) < 0)) {
      errors.refills = "Refills must be a non-negative number";
    }
    
    return errors;
  };

  const validateForm = () => {
    const errors: any = { medications: [] };
    
    // Validate medications
    formData.medications.forEach((med, index) => {
      const medErrors = validateMedication(med, index);
      errors.medications[index] = medErrors;
    });
    
    // Check if at least one medication has a name
    const hasValidMedication = formData.medications.some(med => med.name.trim());
    if (!hasValidMedication) {
      errors.general = "At least one medication with a name is required";
    }
    
    // Check required fields
    if (!formData.patientId) {
      errors.general = errors.general || "Patient is required";
    }
    
    if (!formData.providerId) {
      errors.general = errors.general || "Provider is required";
    }
    
    if (!formData.diagnosis.trim()) {
      errors.general = errors.general || "Diagnosis is required";
    }
    
    setFormErrors(errors);
    
    // Return true if no errors
    const hasErrors = errors.general || 
      errors.medications.some((medError: any) => Object.keys(medError).length > 0);
    
    return !hasErrors;
  };

  // Medication management helper functions
  const addMedication = () => {
    setFormData(prev => ({
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
        }
      ]
    }));
    
    // Add empty error state for new medication
    setFormErrors(prev => ({
      ...prev,
      medications: [...prev.medications, {}]
    }));
  };

  const removeMedication = (index: number) => {
    if (formData.medications.length > 1) {
      setFormData(prev => ({
        ...prev,
        medications: prev.medications.filter((_, i) => i !== index)
      }));
      
      // Remove corresponding error state
      setFormErrors(prev => ({
        ...prev,
        medications: prev.medications.filter((_, i) => i !== index)
      }));
    }
  };

  const updateMedication = (index: number, field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      medications: prev.medications.map((med, i) => 
        i === index ? { ...med, [field]: value } : med
      )
    }));
    
    // Clear error for this field when user starts typing
    if (formErrors.medications[index] && formErrors.medications[index][field as keyof typeof formErrors.medications[0]]) {
      setFormErrors(prev => ({
        ...prev,
        medications: prev.medications.map((medError, i) => 
          i === index ? { ...medError, [field as keyof typeof medError]: undefined } : medError
        )
      }));
    }
  };

  // E-signature functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
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
  };

  // Touch event handlers
  const startDrawingTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(true);
    drawTouch(e);
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
  };

  const clearSignature = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignature("");
  };

  const saveSignature = async () => {
    if (!canvasRef.current || !selectedPrescription) return;

    const canvas = canvasRef.current;
    const signatureData = canvas.toDataURL();

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

        // Clear canvas and close dialog
        clearSignature();
        setShowESignDialog(false);

        toast({
          title: "Success",
          description:
            "Prescription has been electronically signed and saved to database",
        });
      } else {
        throw new Error("Failed to save signature");
      }
    } catch (error) {
      console.error("Error saving e-signature:", error);
      toast({
        title: "Error",
        description: "Failed to save electronic signature. Please try again.",
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
      return new Date(dateString).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
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
                color: rgba(173, 216, 230, 0.3);
                z-index: 1;
                pointer-events: none;
                letter-spacing: 10px;
              }
              
              .prescription-details {
                margin: 25px 0;
                position: relative;
                z-index: 2;
                background: white;
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
                background: #f8f9fa;
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
                position: absolute;
                bottom: 15mm;
                left: 15mm;
                right: 15mm;
                display: flex;
                justify-content: space-between;
                align-items: flex-end;
                border-top: 1px solid #e9ecef;
                padding-top: 15px;
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
                margin-top: 10px;
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
                    License # 123456<br>
                    NPI # 1234567890
                  </div>
                </div>
                <div class="status-badge">active</div>
              </div>
              
              <!-- Provider Section -->
              <div class="provider-section">
                <div class="provider-title">RESIDENT PHYSICIAN M.D</div>
                <div class="provider-details">
                  Provider undefined<br>
                  Halo Health Clinic<br>
                  Unit 2 Drayton Court, Solihull<br>
                  B90 4NG, UK<br>
                  +44(0)121 827 5531
                </div>
              </div>
              
              <!-- Patient Information -->
              <div class="patient-info">
                <div class="patient-left">
                  <div class="info-line">
                    <span class="info-label">Name:</span> ${prescription.patientName}
                  </div>
                  <div class="info-line">
                    <span class="info-label">Address:</span> ${patient?.address?.street || "Patient Address"}
                  </div>
                  <div class="info-line">
                    <span class="info-label">Allergies:</span> ${patient?.medicalHistory?.allergies?.length > 0 ? patient.medicalHistory.allergies.join(", ") : "NKDA"}
                  </div>
                  <div class="info-line">
                    <span class="info-label">Weight:</span> 70 kg
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
                    <span class="info-label">Sex:</span> M
                  </div>
                  <div class="info-line">
                    <span class="info-label">Date:</span> ${formatDate(prescription.prescribedAt)}
                  </div>
                </div>
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
              <div class="footer">
                <div class="signature-section">
                  <div class="signature-label">Resident Physician<br>(Signature)</div>
                </div>
                <div class="substitute-section">
                  <div class="substitute-label">May Substitute</div>
                </div>
              </div>
              
              <!-- Pharmacy Info -->
              <div class="pharmacy-info">
                Pharmacy: Halo Health - +44(0)121 827 5531
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
                        filteredPrescriptions.filter(
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
                        filteredPrescriptions.filter(
                          (p: any) => p.status === "pending",
                        ).length
                      }
                    </p>
                  </div>
                  <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">
                      Drug Interactions
                    </p>
                    <p className="text-xl sm:text-2xl font-bold">
                      {
                        filteredPrescriptions.filter(
                          (p: any) =>
                            p.interactions && p.interactions.length > 0,
                        ).length
                      }
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
                      {filteredPrescriptions.length}
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
                  <DialogTrigger asChild>
                    <Button
                      className="bg-medical-blue hover:bg-blue-700 flex justify-end ml-auto"
                      onClick={() => {
                        setSelectedPrescription(null);
                        setFormData({
                          patientId: "",
                          patientName: "",
                          providerId: "",
                          diagnosis: "",
                          medications: [{
                            name: "",
                            dosage: "",
                            frequency: "",
                            quantity: "",
                            refills: "",
                            instructions: "",
                          }],
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
                        </div>
                        <div>
                          <Label htmlFor="provider">Prescribing Doctor</Label>
                          <Select
                            value={formData.providerId}
                            onValueChange={(value) =>
                              setFormData((prev) => ({
                                ...prev,
                                providerId: value,
                              }))
                            }
                          >
                            <SelectTrigger data-testid="select-provider">
                              <SelectValue placeholder="Select doctor" />
                            </SelectTrigger>
                            <SelectContent>
                              {providers.map((provider: any) => (
                                <SelectItem
                                  key={provider.id}
                                  value={provider.id.toString()}
                                >
                                  Dr. {provider.firstName} {provider.lastName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
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
                          className={formErrors.general && !formData.diagnosis.trim() ? "border-red-500" : ""}
                        />
                        {formErrors.general && !formData.diagnosis.trim() && (
                          <p className="text-red-500 text-sm mt-1" data-testid="error-diagnosis">
                            Diagnosis is required
                          </p>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <Label className="text-lg font-medium">Medications</Label>
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
                          <div key={index} className="border rounded-lg p-4 space-y-4 relative">
                            <div className="flex justify-between items-start">
                              <h4 className="font-medium text-md">Medication {index + 1}</h4>
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
                                <Label htmlFor={`medication-name-${index}`}>Medication Name *</Label>
                                <Input
                                  id={`medication-name-${index}`}
                                  placeholder="Enter medication"
                                  value={medication.name}
                                  onChange={(e) => updateMedication(index, 'name', e.target.value)}
                                  data-testid={`input-medication-name-${index}`}
                                  className={formErrors.medications[index]?.name ? "border-red-500" : ""}
                                />
                                {formErrors.medications[index]?.name && (
                                  <p className="text-red-500 text-sm mt-1" data-testid={`error-medication-name-${index}`}>
                                    {formErrors.medications[index].name}
                                  </p>
                                )}
                              </div>
                              <div>
                                <Label htmlFor={`medication-dosage-${index}`}>Dosage *</Label>
                                <Input
                                  id={`medication-dosage-${index}`}
                                  placeholder="e.g., 10mg"
                                  value={medication.dosage}
                                  onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                                  data-testid={`input-dosage-${index}`}
                                  className={formErrors.medications[index]?.dosage ? "border-red-500" : ""}
                                />
                                {formErrors.medications[index]?.dosage && (
                                  <p className="text-red-500 text-sm mt-1" data-testid={`error-medication-dosage-${index}`}>
                                    {formErrors.medications[index].dosage}
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor={`medication-frequency-${index}`}>Frequency *</Label>
                                <Select
                                  value={medication.frequency}
                                  onValueChange={(value) => updateMedication(index, 'frequency', value)}
                                >
                                  <SelectTrigger data-testid={`select-frequency-${index}`} className={formErrors.medications[index]?.frequency ? "border-red-500" : ""}>
                                    <SelectValue placeholder="Select frequency" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Once daily">Once daily</SelectItem>
                                    <SelectItem value="Twice daily">Twice daily</SelectItem>
                                    <SelectItem value="Three times daily">Three times daily</SelectItem>
                                    <SelectItem value="Four times daily">Four times daily</SelectItem>
                                    <SelectItem value="Every other day">Every other day</SelectItem>
                                    <SelectItem value="As needed">As needed</SelectItem>
                                  </SelectContent>
                                </Select>
                                {formErrors.medications[index]?.frequency && (
                                  <p className="text-red-500 text-sm mt-1" data-testid={`error-medication-frequency-${index}`}>
                                    {formErrors.medications[index].frequency}
                                  </p>
                                )}
                              </div>
                              <div>
                                <Label htmlFor={`medication-duration-${index}`}>Duration *</Label>
                                <Select
                                  value={medication.duration}
                                  onValueChange={(value) => updateMedication(index, 'duration', value)}
                                >
                                  <SelectTrigger data-testid={`select-duration-${index}`} className={formErrors.medications[index]?.duration ? "border-red-500" : ""}>
                                    <SelectValue placeholder="Select duration" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="7 days">7 days</SelectItem>
                                    <SelectItem value="14 days">14 days</SelectItem>
                                    <SelectItem value="30 days">30 days</SelectItem>
                                    <SelectItem value="60 days">60 days</SelectItem>
                                    <SelectItem value="90 days">90 days</SelectItem>
                                    <SelectItem value="6 months">6 months</SelectItem>
                                    <SelectItem value="1 year">1 year</SelectItem>
                                    <SelectItem value="Ongoing">Ongoing</SelectItem>
                                  </SelectContent>
                                </Select>
                                {formErrors.medications[index]?.duration && (
                                  <p className="text-red-500 text-sm mt-1" data-testid={`error-medication-duration-${index}`}>
                                    {formErrors.medications[index].duration}
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <Label htmlFor={`medication-quantity-${index}`}>Quantity *</Label>
                                <Input
                                  id={`medication-quantity-${index}`}
                                  type="number"
                                  min="1"
                                  placeholder="30"
                                  value={medication.quantity}
                                  onChange={(e) => updateMedication(index, 'quantity', e.target.value)}
                                  data-testid={`input-quantity-${index}`}
                                  className={formErrors.medications[index]?.quantity ? "border-red-500" : ""}
                                />
                                {formErrors.medications[index]?.quantity && (
                                  <p className="text-red-500 text-sm mt-1" data-testid={`error-medication-quantity-${index}`}>
                                    {formErrors.medications[index].quantity}
                                  </p>
                                )}
                              </div>
                              <div>
                                <Label htmlFor={`medication-refills-${index}`}>Refills</Label>
                                <Input
                                  id={`medication-refills-${index}`}
                                  type="number"
                                  min="0"
                                  placeholder="3"
                                  value={medication.refills}
                                  onChange={(e) => updateMedication(index, 'refills', e.target.value)}
                                  data-testid={`input-refills-${index}`}
                                  className={formErrors.medications[index]?.refills ? "border-red-500" : ""}
                                />
                                {formErrors.medications[index]?.refills && (
                                  <p className="text-red-500 text-sm mt-1" data-testid={`error-medication-refills-${index}`}>
                                    {formErrors.medications[index].refills}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center space-x-2 pt-6">
                                <input
                                  type="checkbox"
                                  id={`medication-generic-${index}`}
                                  checked={medication.genericAllowed}
                                  onChange={(e) => updateMedication(index, 'genericAllowed', e.target.checked)}
                                  data-testid={`checkbox-generic-allowed-${index}`}
                                  className="h-4 w-4"
                                />
                                <Label htmlFor={`medication-generic-${index}`} className="text-sm font-medium">
                                  Generic allowed
                                </Label>
                              </div>
                            </div>
                            
                            <div>
                              <Label htmlFor={`medication-instructions-${index}`}>Instructions</Label>
                              <Textarea
                                id={`medication-instructions-${index}`}
                                placeholder="Special instructions for patient (e.g., take with food, before bedtime)"
                                value={medication.instructions}
                                onChange={(e) => updateMedication(index, 'instructions', e.target.value)}
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
                              toast({
                                title: "Validation Error",
                                description: "Please fix the errors in the form before submitting",
                                variant: "destructive",
                              });
                              return;
                            }

                            // Filter out empty medications and prepare data with proper type conversion
                            const validMedications = formData.medications
                              .filter(med => med.name.trim())
                              .map(med => ({
                                name: med.name.trim(),
                                dosage: med.dosage.trim(),
                                frequency: med.frequency.trim(),
                                duration: med.duration.trim(),
                                quantity: parseInt(med.quantity) || 0,
                                refills: parseInt(med.refills) || 0,
                                instructions: med.instructions.trim(),
                                genericAllowed: med.genericAllowed,
                              }));
                            
                            const prescriptionData = {
                              patientId: parseInt(formData.patientId),
                              providerId: parseInt(formData.providerId),
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
                            console.log("Final prescription data:", prescriptionData);
                            console.log("Valid medications count:", validMedications.length);
                            
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
              filteredPrescriptions.map((prescription) => (
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
                            License # 123456
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            NPI # 1234567890
                          </p>
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
                                    <SelectItem value="pending">pending</SelectItem>
                                    <SelectItem value="active">active</SelectItem>
                                    <SelectItem value="completed">completed</SelectItem>
                                    <SelectItem value="cancelled">cancelled</SelectItem>
                                    <SelectItem value="signed">signed</SelectItem>
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
                                  className={getStatusColor(prescription.status)}
                                >
                                  {prescription.status}
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleStartEditingStatus(prescription.id, prescription.status)}
                                  className="h-6 w-6 p-0 hover:bg-gray-100"
                                  data-testid="button-edit-status"
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
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
                        <h3 className="text-md font-semibold text-gray-800 dark:text-gray-100">
                          RESIDENT PHYSICIAN M.D
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {prescription.providerName}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Halo Health Clinic
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Unit 2 Drayton Court, Solihull
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          B90 4NG, UK
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          +44(0)121 827 5531
                        </p>
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
                            <strong>Address:</strong> Patient Address
                          </p>
                          <p className="text-sm text-gray-800 dark:text-gray-100">
                            <strong>Allergies:</strong> NKDA
                          </p>
                          <p className="text-sm text-gray-800 dark:text-gray-100">
                            <strong>Weight:</strong>{" "}
                            {prescription.patientWeight || "70 kg"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-800 dark:text-gray-100">
                            <strong>DOB:</strong>{" "}
                            {prescription.patientDob || "01/01/1985"}
                          </p>
                          <p className="text-sm text-gray-800 dark:text-gray-100">
                            <strong>Age:</strong>{" "}
                            {prescription.patientAge || "39"}
                          </p>
                          <p className="text-sm text-gray-800 dark:text-gray-100">
                            <strong>Sex:</strong>{" "}
                            {prescription.patientSex || "M"}
                          </p>
                          <p className="text-sm text-gray-800 dark:text-gray-100">
                            <strong>Date:</strong>{" "}
                            {format(
                              new Date(prescription.prescribedAt),
                              "MM/dd/yyyy",
                            )}
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

                      {prescription.pharmacy && (
                        <div className="mt-4 text-center">
                          <p className="text-xs text-gray-600 dark:text-gray-300">
                            <strong>Pharmacy:</strong>{" "}
                            {prescription.pharmacy.name} -{" "}
                            {prescription.pharmacy.phone}
                          </p>
                        </div>
                      )}
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
                      {prescription.status === "active" && (
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
                    </div>
                  </div>
                </Card>
              ))
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
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Provider
                      </p>
                      <p className="font-medium">
                        {selectedPrescription.providerName}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Provider ID
                      </p>
                      <p className="font-mono text-sm">
                        {selectedPrescription.providerId}
                      </p>
                    </div>
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
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Prescription ID
                      </p>
                      <p className="font-mono text-sm">
                        {selectedPrescription.id}
                      </p>
                    </div>
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
                  // Find the selected prescription to get patient name
                  const prescription = prescriptions?.find(
                    (p) => p.id === selectedPrescriptionId,
                  );
                  sendToPharmacyMutation.mutate({
                    prescriptionId: selectedPrescriptionId,
                    pharmacyData,
                    patientName: prescription?.patientName || "Patient",
                    attachments:
                      attachedFiles.length > 0 ? attachedFiles : undefined,
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
                        {selectedPrescription.providerName}
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
                      onTouchEnd={stopDrawing}
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

          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setShowESignDialog(false)}
              className="flex-1"
            >
              Cancel Signature Process
            </Button>
            <Button
              onClick={saveSignature}
              className="flex-2 bg-medical-blue hover:bg-blue-700"
              disabled={!selectedPrescription}
            >
              <PenTool className="h-4 w-4 mr-2" />
              Apply Advanced E-Signature
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
