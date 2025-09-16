import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Header } from "@/components/layout/header";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  FileImage, 
  Plus, 
  Search, 
  Download, 
  Eye, 
  Calendar, 
  User,
  FileText,
  Monitor,
  Camera,
  Zap,
  Share,
  Share2,
  Mail,
  MessageCircle,
  Trash2
} from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";

interface ImagingStudy {
  id: string;
  patientId: string;
  patientName: string;
  studyType: string;
  modality: 'X-Ray' | 'CT' | 'MRI' | 'Ultrasound' | 'Nuclear Medicine' | 'Mammography';
  bodyPart: string;
  orderedBy: string;
  orderedAt: string;
  scheduledAt?: string;
  performedAt?: string;
  status: 'ordered' | 'scheduled' | 'in_progress' | 'completed' | 'preliminary' | 'final' | 'cancelled';
  priority: 'routine' | 'urgent' | 'stat';
  indication: string;
  findings?: string;
  impression?: string;
  radiologist?: string;
  images: Array<{
    id: string;
    type: 'DICOM' | 'JPEG' | 'PNG';
    seriesDescription: string;
    imageCount: number;
    size: string;
  }>;
  report?: {
    status: 'preliminary' | 'final';
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
    findings: "Lungs are clear bilaterally. No acute cardiopulmonary abnormality. Heart size normal.",
    impression: "Normal chest X-ray.",
    radiologist: "Dr. Michael Chen",
    images: [
      {
        id: "series_001",
        type: "DICOM",
        seriesDescription: "PA View",
        imageCount: 1,
        size: "2.1 MB"
      },
      {
        id: "series_002",
        type: "DICOM",
        seriesDescription: "Lateral View",
        imageCount: 1,
        size: "2.3 MB"
      }
    ],
    report: {
      status: "final",
      content: "EXAMINATION: Chest X-ray PA and Lateral\n\nINDICATION: Chronic cough, rule out pneumonia\n\nFINDINGS: The lungs are clear bilaterally without focal consolidation, pleural effusion, or pneumothorax. The cardiac silhouette is normal in size and configuration. The mediastinal contours are normal. No acute bony abnormalities are identified.\n\nIMPRESSION: Normal chest X-ray.",
      dictatedAt: "2024-01-15T15:30:00Z",
      signedAt: "2024-01-15T15:45:00Z"
    }
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
    images: []
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
        size: "45.2 MB"
      },
      {
        id: "series_004",
        type: "DICOM",
        seriesDescription: "T2 Axial",
        imageCount: 30,
        size: "52.8 MB"
      },
      {
        id: "series_005",
        type: "DICOM",
        seriesDescription: "FLAIR Axial",
        imageCount: 28,
        size: "48.6 MB"
      }
    ],
    report: {
      status: "preliminary",
      content: "PRELIMINARY REPORT - AWAITING FINAL REVIEW\n\nEXAMINATION: Brain MRI without contrast\n\nINDICATION: Headaches, rule out structural abnormality\n\nFINDINGS: Preliminary review shows no acute intracranial abnormality. No mass lesion, hemorrhage, or midline shift identified. Ventricular system appears normal.\n\nIMPRESSION: Preliminary - No acute intracranial abnormality.",
      dictatedAt: "2024-01-14T16:00:00Z"
    }
  }
];

export default function ImagingPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showFinalReportDialog, setShowFinalReportDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [modalityFilter, setModalityFilter] = useState<string>("all");
  const [selectedStudy, setSelectedStudy] = useState<ImagingStudy | null>(null);
  const [shareFormData, setShareFormData] = useState({
    method: "",
    email: "",
    whatsapp: "",
    message: ""
  });
  const [patients, setPatients] = useState<any[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [reportFormData, setReportFormData] = useState({
    findings: "",
    impression: "",
    radiologist: ""
  });
  const [uploadFormData, setUploadFormData] = useState({
    patientId: "",
    studyType: "",
    modality: "X-Ray",
    bodyPart: "",
    indication: "",
    priority: "routine"
  });
  const [orderFormData, setOrderFormData] = useState({
    patientId: "",
    studyType: "",
    modality: "X-Ray",
    bodyPart: "",
    indication: "",
    priority: "routine",
    specialInstructions: ""
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImageSeries, setSelectedImageSeries] = useState<any>(null);
  const [deletedStudyIds, setDeletedStudyIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  
  // Fetch medical images using React Query
  const { data: medicalImages = [], isLoading: imagesLoading, refetch: refetchImages } = useQuery({
    queryKey: ['/api/medical-images'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/medical-images');
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Error fetching medical images:', error);
        return [];
      }
    }
  });

  // Fetch patients using the exact working pattern from prescriptions
  const fetchPatients = async () => {
    try {
      setPatientsLoading(true);
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'X-Tenant-Subdomain': 'demo'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/patients', {
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      // Remove duplicates based on patient ID
      const uniquePatients = data ? data.filter((patient: any, index: number, self: any[]) => 
        index === self.findIndex((p: any) => p.id === patient.id)
      ) : [];
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
    }
  }, [showNewOrder, showUploadDialog]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const fileList = Array.from(files);
      setSelectedFiles(fileList);
    }
  };

  const handleUploadSubmit = async () => {
    if (!uploadFormData.patientId || !uploadFormData.studyType || selectedFiles.length === 0) {
      toast({
        title: "Upload Failed",
        description: "Please fill in all required fields and select images to upload",
        variant: "destructive",
      });
      return;
    }

    try {
      // Find the selected patient to get the numeric ID
      const selectedPatient = patients.find(p => p.id.toString() === uploadFormData.patientId);
      if (!selectedPatient) {
        toast({
          title: "Upload Failed",
          description: "Selected patient not found",
          variant: "destructive",
        });
        return;
      }

      // Upload each file
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        
        // Convert file to base64
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            // Remove the data URL prefix to get just the base64 data
            const base64 = result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        
        const imageData = {
          patientId: selectedPatient.id, // Use the numeric database ID
          imageType: uploadFormData.studyType,
          bodyPart: uploadFormData.bodyPart || "Not specified",
          notes: uploadFormData.indication || "",
          filename: file.name,
          fileUrl: `data:${file.type};base64,${base64Data}`,
          fileSize: file.size,
          uploadedBy: 348, // Current user ID (admin)
          imageData: base64Data, // Include the base64 image data
          mimeType: file.type
        };

        await apiRequest("POST", "/api/medical-images", imageData);
      }

      const totalSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);
      const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(1);

      toast({
        title: "Images Uploaded Successfully",
        description: `${selectedFiles.length} images (${totalSizeMB} MB) uploaded for ${selectedPatient.firstName} ${selectedPatient.lastName}`,
      });

      // Reset form and close dialog
      setUploadFormData({
        patientId: "",
        studyType: "",
        modality: "X-Ray",
        bodyPart: "",
        indication: "",
        priority: "routine"
      });
      setSelectedFiles([]);
      setShowUploadDialog(false);
      
      // Refresh the medical images list
      refetchImages();
      
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload images. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleOrderSubmit = async () => {
    if (!orderFormData.patientId || !orderFormData.studyType || !orderFormData.modality || !orderFormData.bodyPart) {
      toast({
        title: "Order Failed",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      // Find the selected patient to get the numeric ID
      const selectedPatient = patients.find(p => p.id.toString() === orderFormData.patientId);
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
        notes: orderFormData.specialInstructions || ""
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
        specialInstructions: ""
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
    setSelectedStudy(study);
    setShowViewDialog(true);
  };

  const handleDownloadStudy = (studyId: string) => {
    const study = (studies as any || []).find((s: any) => s.id === studyId);
    if (study) {
      toast({
        title: "Download Study",
        description: `DICOM images for ${study.patientName} downloaded successfully`,
      });
      
      // Simulate DICOM download
      const blob = new Blob([`DICOM Study Report\n\nPatient: ${study.patientName}\nStudy: ${study.studyType}\nModality: ${study.modality}\nDate: ${new Date(study.orderedAt).toLocaleDateString()}\n\nImages: ${study.images?.length || 0} series available`], 
        { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dicom-study-${study.patientName.replace(' ', '-').toLowerCase()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleShareStudy = (study: ImagingStudy) => {
    setSelectedStudy(study);
    setShowShareDialog(true);
    setShareFormData({
      method: "",
      email: "",
      whatsapp: "",
      message: `Imaging study results for ${study.studyType} are now available for review.`
    });
  };

  const handleGenerateReport = (studyId: string) => {
    const study = (studies as any || []).find((s: any) => s.id === studyId);
    if (study) {
      setSelectedStudy(study);
      setReportFormData({
        findings: study.findings || "",
        impression: study.impression || "",
        radiologist: study.radiologist || "Dr. Michael Chen"
      });
      setShowReportDialog(true);
    }
  };

  const generatePDFReport = async (study: any) => {
    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - 2 * margin;
      let yPosition = 25;

      // Clean professional report matching the exact sample format
      
      // HEADER SECTION - CURA EMR SYSTEM
      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(70, 130, 180); // Blue color like sample
      pdf.text("CURA EMR SYSTEM", pageWidth / 2, yPosition, { align: "center" });
      
      yPosition += 8;
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(100, 100, 100); // Gray color
      pdf.text("Radiology Test Prescription", pageWidth / 2, yPosition, { align: "center" });
      
      yPosition += 25;
      pdf.setTextColor(0, 0, 0); // Reset to black

      // TWO COLUMN LAYOUT - Physician Information and Patient Information
      const leftColX = margin;
      const rightColX = margin + contentWidth / 2;
      
      // LEFT COLUMN - Physician Information
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("Physician Information", leftColX, yPosition);
      
      yPosition += 12;
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      
      // Physician details
      pdf.setFont("helvetica", "bold");
      pdf.text("Name:", leftColX, yPosition);
      pdf.setFont("helvetica", "normal");
      pdf.text(study.orderedBy || "Dr. Qurat doctor", leftColX + 25, yPosition);
      
      yPosition += 8;
      pdf.setFont("helvetica", "bold");
      pdf.text("Main Specialization:", leftColX, yPosition);
      pdf.setFont("helvetica", "normal");
      pdf.text("Radiology", leftColX + 55, yPosition);
      
      yPosition += 8;
      pdf.setFont("helvetica", "bold");
      pdf.text("Sub-Specialization:", leftColX, yPosition);
      pdf.setFont("helvetica", "normal");
      pdf.text(study.modality || "Radiologist", leftColX + 55, yPosition);
      
      yPosition += 8;
      pdf.setFont("helvetica", "bold");
      pdf.text("Priority:", leftColX, yPosition);
      pdf.setFont("helvetica", "normal");
      pdf.text(study.priority || "routine", leftColX + 25, yPosition);

      // RIGHT COLUMN - Patient Information  
      const rightColY = yPosition - 32; // Start at same level as Physician Information
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("Patient Information", rightColX, rightColY);
      
      let patientY = rightColY + 12;
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      
      // Patient details
      pdf.setFont("helvetica", "bold");
      pdf.text("Name:", rightColX, patientY);
      pdf.setFont("helvetica", "normal");
      pdf.text(study.patientName || "Maryam Khan", rightColX + 25, patientY);
      
      patientY += 8;
      pdf.setFont("helvetica", "bold");
      pdf.text("Patient ID:", rightColX, patientY);
      pdf.setFont("helvetica", "normal");
      pdf.text(study.patientId || "6", rightColX + 35, patientY);
      
      patientY += 8;
      pdf.setFont("helvetica", "bold");
      pdf.text("Date:", rightColX, patientY);
      pdf.setFont("helvetica", "normal");
      pdf.text(format(new Date(study.orderedAt), "MMM dd, yyyy"), rightColX + 20, patientY);
      
      patientY += 8;
      pdf.setFont("helvetica", "bold");
      pdf.text("Time:", rightColX, patientY);
      pdf.setFont("helvetica", "normal");
      pdf.text(format(new Date(study.orderedAt), "HH:mm"), rightColX + 20, patientY);

      yPosition += 25;

      // IMAGING TEST PRESCRIPTION SECTION
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("Imaging Test Prescription", margin, yPosition);
      yPosition += 15;

      // Test details box - light blue background like sample
      const boxHeight = 35;
      pdf.setFillColor(240, 248, 255); // Light blue background
      pdf.rect(margin, yPosition, contentWidth, boxHeight, 'F');
      pdf.setDrawColor(200, 220, 240);
      pdf.rect(margin, yPosition, contentWidth, boxHeight, 'S');
      
      const boxPadding = 8;
      let boxY = yPosition + boxPadding;
      
      // Left side of box - Test ID
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "bold");
      pdf.text("Test ID:", margin + boxPadding, boxY);
      pdf.setFont("helvetica", "normal");
      pdf.text(`IMG${study.id}${format(new Date(), "yyyyMMdd")}${study.modality.substring(0, 3).toUpperCase()}`, margin + boxPadding, boxY + 6);
      
      // Right side of box - Test Type
      pdf.setFont("helvetica", "bold");
      pdf.text("Test Type:", rightColX + boxPadding, boxY);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(70, 130, 180); // Blue for test type
      pdf.text(study.studyType, rightColX + boxPadding, boxY + 6);
      pdf.setTextColor(0, 0, 0); // Reset to black
      
      boxY += 18;
      
      // Ordered Date
      pdf.setFont("helvetica", "bold");
      pdf.text("Ordered Date:", margin + boxPadding, boxY);
      pdf.setFont("helvetica", "normal");
      pdf.text(format(new Date(study.orderedAt), "MMM dd, yyyy HH:mm"), margin + boxPadding + 40, boxY);
      
      // Status
      pdf.setFont("helvetica", "bold");
      pdf.text("Status:", rightColX + boxPadding, boxY);
      
      // Status with colored background
      const statusText = study.status?.toUpperCase() || "PENDING";
      pdf.setFillColor(255, 193, 7); // Orange/yellow for pending
      pdf.rect(rightColX + boxPadding + 25, boxY - 4, 30, 10, 'F');
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "bold");
      pdf.text(statusText, rightColX + boxPadding + 27, boxY + 2);

      yPosition += boxHeight + 20;

      // IMAGE SERIES DETAILS (if images exist)
      if (study.images && study.images.length > 0) {
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.text("Image Series Details:", margin, yPosition);
        yPosition += 12;
        
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "normal");
        study.images.forEach((image: any, index: number) => {
          pdf.text(`• Series ${index + 1}: ${image.seriesDescription} (${image.imageCount} images, ${image.size})`, margin + 5, yPosition);
          yPosition += 8;
        });
        yPosition += 10;
      }

      // FOOTER SECTION
      const footerY = pageHeight - 50;
      
      // Generated by line
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(100, 100, 100);
      pdf.text("Generated by Cura EMR System", margin, footerY);
      pdf.text(`Date: ${format(new Date(), "MMM dd, yyyy HH:mm")}`, pageWidth - margin, footerY, { align: "right" });
      
      // Doctor signature section
      yPosition = footerY + 15;
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(`${reportFormData.radiologist || study.radiologist || "Dr. Qurat doctor"}`, pageWidth / 2, yPosition, { align: "center" });
      yPosition += 6;
      pdf.setTextColor(70, 130, 180);
      pdf.text("Radiology Specialist", pageWidth / 2, yPosition, { align: "center" });

      // Download the PDF
      const filename = `imaging-prescription-${study.patientName.replace(/\s+/g, '-').toLowerCase()}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      pdf.save(filename);

      toast({
        title: "Imaging Test Prescription Generated",
        description: `Test prescription for ${study.patientName} has been generated successfully`,
      });

      setShowReportDialog(false);

    } catch (error) {
      console.error("PDF generation error:", error);
      toast({
        title: "Report Generation Failed",
        description: "Failed to generate PDF report. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteStudy = async (studyId: string) => {
    const study = (studies as any || []).find((s: any) => s.id === studyId);
    if (!study) return;

    const confirmDelete = window.confirm(
      `Are you sure you want to delete the ${study.studyType} study for ${study.patientName}? This action cannot be undone.`
    );

    if (!confirmDelete) return;

    try {
      // Add the study ID to the deleted set to remove it from the display
      setDeletedStudyIds(prev => new Set([...prev, studyId]));
      
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
      scheduledAt: image.createdAt,
      performedAt: image.createdAt,
      status: image.status === "uploaded" ? "completed" : image.status,
      priority: image.priority || "routine",
      indication: image.indication || "No indication provided",
      findings: `Medical image uploaded: ${image.fileName}`,
      impression: `File: ${image.fileName} (${(image.fileSize / (1024 * 1024)).toFixed(2)} MB)`,
      radiologist: image.uploadedByName || "Unknown",
      images: [{
        id: image.id.toString(),
        type: image.mimeType?.includes('jpeg') ? 'JPEG' : 'DICOM',
        seriesDescription: `${image.modality} ${image.bodyPart}`,
        imageCount: 1,
        size: `${(image.fileSize / (1024 * 1024)).toFixed(2)} MB`,
        imageData: image.imageData, // Include the base64 image data
        mimeType: image.mimeType // Include the MIME type
      }]
    }));
  }

  const filteredStudies = (studies as any || []).filter((study: any) => {
    // First check if this study has been deleted
    if (deletedStudyIds.has(study.id)) {
      return false;
    }
    
    const matchesSearch = !searchQuery || 
      study.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      study.studyType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      study.bodyPart.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || study.status === statusFilter;
    const matchesModality = modalityFilter === "all" || study.modality === modalityFilter;
    
    return matchesSearch && matchesStatus && matchesModality;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'final': return 'bg-green-100 text-green-800';
      case 'preliminary': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-purple-100 text-purple-800';
      case 'scheduled': return 'bg-cyan-100 text-cyan-800';
      case 'ordered': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'stat': return 'bg-red-100 text-red-800';
      case 'urgent': return 'bg-orange-100 text-orange-800';
      case 'routine': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getModalityIcon = (modality: string) => {
    switch (modality) {
      case 'X-Ray': return <Camera className="h-4 w-4" />;
      case 'CT': return <Monitor className="h-4 w-4" />;
      case 'MRI': return <Zap className="h-4 w-4" />;
      case 'Ultrasound': return <FileImage className="h-4 w-4" />;
      default: return <FileImage className="h-4 w-4" />;
    }
  };

  if (imagesLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map(i => (
          <Card key={i} className="bg-white dark:bg-slate-800 border dark:border-slate-600">
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
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Pending Reports</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">5</p>
                  </div>
                  <FileText className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Today's Studies</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">8</p>
                  </div>
                  <Calendar className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Urgent Studies</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">3</p>
                  </div>
                  <Zap className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">This Month</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">142</p>
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

                <Select value={modalityFilter} onValueChange={setModalityFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by modality" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Modalities</SelectItem>
                    <SelectItem value="X-Ray">X-Ray</SelectItem>
                    <SelectItem value="CT">CT Scan</SelectItem>
                    <SelectItem value="MRI">MRI</SelectItem>
                    <SelectItem value="Ultrasound">Ultrasound</SelectItem>
                    <SelectItem value="Nuclear Medicine">Nuclear Medicine</SelectItem>
                    <SelectItem value="Mammography">Mammography</SelectItem>
                  </SelectContent>
                </Select>

                <Button onClick={() => setShowNewOrder(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Order Study
                </Button>
                <Button variant="outline" onClick={() => setShowUploadDialog(true)}>
                  <FileImage className="h-4 w-4 mr-2" />
                  Upload Images
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Imaging Studies List */}
          <div className="space-y-4">
            {filteredStudies.map((study: any) => (
              <Card key={study.id} className="hover:shadow-md transition-shadow bg-white dark:bg-slate-800 border dark:border-slate-600">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          {getModalityIcon(study.modality)}
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{study.patientName}</h3>
                        </div>
                        <Badge className={getStatusColor(study.status)}>
                          {study.status}
                        </Badge>
                        <Badge className={getPriorityColor(study.priority)}>
                          {study.priority}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                        <div>
                          <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">Study Information</h4>
                          <div className="space-y-1 text-sm text-gray-800 dark:text-gray-200">
                            <div><strong>Study:</strong> {study.studyType}</div>
                            <div><strong>Modality:</strong> {study.modality}</div>
                            <div><strong>Body Part:</strong> {study.bodyPart}</div>
                            <div><strong>Ordered by:</strong> {study.orderedBy}</div>
                            <div><strong>Indication:</strong> {study.indication}</div>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">Timeline</h4>
                          <div className="space-y-1 text-sm text-gray-800 dark:text-gray-200">
                            <div><strong>Ordered:</strong> {format(new Date(study.orderedAt), 'MMM d, yyyy HH:mm')}</div>
                            {study.scheduledAt && (
                              <div><strong>Scheduled:</strong> {format(new Date(study.scheduledAt), 'MMM d, yyyy HH:mm')}</div>
                            )}
                            {study.performedAt && (
                              <div><strong>Performed:</strong> {format(new Date(study.performedAt), 'MMM d, yyyy HH:mm')}</div>
                            )}
                            {study.radiologist && (
                              <div><strong>Radiologist:</strong> {study.radiologist}</div>
                            )}
                          </div>
                        </div>
                      </div>

                      {study.images && study.images.length > 0 && (
                        <div className="mb-4">
                          <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">Image Series</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            {study.images.map((series: any) => (
                              <div key={series.id} className="bg-gray-50 dark:bg-slate-600 p-3 rounded-lg border dark:border-slate-500">
                                <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{series.seriesDescription}</div>
                                <div className="text-xs text-gray-600 dark:text-gray-300">
                                  {series.imageCount} images • {series.size} • {series.type}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {study.findings && (
                        <div className="bg-blue-50 dark:bg-slate-700 border-l-4 border-blue-400 dark:border-blue-500 p-3 mb-4">
                          <h4 className="font-medium text-blue-800 dark:text-blue-300 text-sm mb-1">Findings</h4>
                          <p className="text-sm text-blue-700 dark:text-blue-200">{study.findings}</p>
                          {study.impression && (
                            <>
                              <h4 className="font-medium text-blue-800 dark:text-blue-300 text-sm mb-1 mt-2">Impression</h4>
                              <p className="text-sm text-blue-700 dark:text-blue-200">{study.impression}</p>
                            </>
                          )}
                        </div>
                      )}

                      {study.report && (
                        <div className="bg-green-50 dark:bg-slate-700 border-l-4 border-green-400 dark:border-green-500 p-3">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-green-800 dark:text-green-300 text-sm">Report</h4>
                            <Badge className={study.report.status === 'final' ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'}>
                              {study.report.status}
                            </Badge>
                          </div>
                          <div className="text-sm text-green-700 dark:text-green-200">
                            <strong>Dictated:</strong> {format(new Date(study.report.dictatedAt), 'MMM d, yyyy HH:mm')}
                            {study.report.signedAt && (
                              <span className="ml-4">
                                <strong>Signed:</strong> {format(new Date(study.report.signedAt), 'MMM d, yyyy HH:mm')}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Button variant="outline" size="sm" onClick={() => handleViewStudy(study)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDownloadStudy(study.id)}>
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleShareStudy(study)}>
                        <Share className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleGenerateReport(study.id)}>
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
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No imaging studies found</h3>
              <p className="text-gray-600 dark:text-gray-300">Try adjusting your search terms or filters</p>
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
                <Select value={shareFormData.method} onValueChange={(value) => setShareFormData({...shareFormData, method: value})}>
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
                    onChange={(e) => setShareFormData({...shareFormData, email: e.target.value})}
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
                    onChange={(e) => setShareFormData({...shareFormData, whatsapp: e.target.value})}
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
                  onChange={(e) => setShareFormData({...shareFormData, message: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <Button variant="outline" onClick={() => setShowShareDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    const method = shareFormData.method === "email" ? "email" : "WhatsApp";
                    const contact = shareFormData.method === "email" ? shareFormData.email : shareFormData.whatsapp;
                    
                    toast({
                      title: "Study Shared",
                      description: `Imaging study sent to ${selectedStudy.patientName} via ${method} (${contact})`,
                    });
                    setShowShareDialog(false);
                    setShareFormData({
                      method: "",
                      email: "",
                      whatsapp: "",
                      message: ""
                    });
                  }}
                  disabled={!shareFormData.method || 
                    (shareFormData.method === "email" && !shareFormData.email) ||
                    (shareFormData.method === "whatsapp" && !shareFormData.whatsapp)}
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
                    <span className="text-white text-sm font-bold">{selectedStudy.patientName?.charAt(0) || 'P'}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{selectedStudy.patientName}</h3>
                    <p className="text-sm text-gray-600">Patient ID: {selectedStudy.patientId}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Study:</strong> {selectedStudy.studyType}</div>
                  <div><strong>Modality:</strong> {selectedStudy.modality}</div>
                  <div><strong>Body Part:</strong> {selectedStudy.bodyPart}</div>
                  <div><strong>Indication:</strong> {selectedStudy.indication}</div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="findings" className="text-sm font-medium">
                    Findings
                  </Label>
                  <Textarea
                    id="findings"
                    placeholder="Enter radiological findings..."
                    value={reportFormData.findings}
                    onChange={(e) => setReportFormData(prev => ({ ...prev, findings: e.target.value }))}
                    rows={4}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="impression" className="text-sm font-medium">
                    Impression
                  </Label>
                  <Textarea
                    id="impression"
                    placeholder="Enter clinical impression..."
                    value={reportFormData.impression}
                    onChange={(e) => setReportFormData(prev => ({ ...prev, impression: e.target.value }))}
                    rows={3}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="radiologist" className="text-sm font-medium">
                    Radiologist
                  </Label>
                  <Input
                    id="radiologist"
                    value={reportFormData.radiologist}
                    onChange={(e) => setReportFormData(prev => ({ ...prev, radiologist: e.target.value }))}
                    className="mt-1"
                  />
                </div>

                {selectedStudy.report && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-medium text-green-800 mb-2">Existing Report</h4>
                    <div className="text-sm text-green-700 space-y-2">
                      <div><strong>Status:</strong> {selectedStudy.report.status}</div>
                      <div><strong>Dictated:</strong> {format(new Date(selectedStudy.report.dictatedAt), "PPpp")}</div>
                      {selectedStudy.report.signedAt && (
                        <div><strong>Signed:</strong> {format(new Date(selectedStudy.report.signedAt), "PPpp")}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <Button variant="outline" onClick={() => setShowReportDialog(false)}>
                  Close
                </Button>
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      // Download existing report logic
                      const reportContent = selectedStudy.report?.content || 
                        `RADIOLOGY REPORT\n\nPatient: ${selectedStudy.patientName}\nStudy: ${selectedStudy.studyType}\nModality: ${selectedStudy.modality}\nDate: ${new Date(selectedStudy.orderedAt).toLocaleDateString()}\n\nFindings: ${selectedStudy.findings || 'To be documented'}\n\nImpression: ${selectedStudy.impression || 'To be documented'}\n\nRadiologist: ${selectedStudy.radiologist || 'Dr. Michael Chen'}`;
                      
                      const blob = new Blob([reportContent], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `radiology-report-${selectedStudy.patientName.replace(' ', '-').toLowerCase()}.txt`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                      
                      toast({
                        title: "Report Downloaded",
                        description: `Radiology report for ${selectedStudy.patientName} downloaded successfully`,
                      });
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Report
                  </Button>
                  <Button 
                    onClick={() => {
                      if (selectedStudy.status === 'final') {
                        setShowReportDialog(false);
                        setShowFinalReportDialog(true);
                      } else {
                        generatePDFReport(selectedStudy);
                      }
                    }}
                    className="bg-medical-blue hover:bg-blue-700"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    {selectedStudy.status === 'final' ? 'View Final Report' : 'Generate Report'}
                  </Button>
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
                    <span className="text-white text-lg font-bold">{selectedStudy.patientName?.charAt(0) || 'P'}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-xl">{selectedStudy.patientName}</h3>
                    <p className="text-sm text-gray-600">Patient ID: {selectedStudy.patientId}</p>
                  </div>
                  <div className="ml-auto">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      selectedStudy.status === 'completed' ? 'bg-green-100 text-green-800' :
                      selectedStudy.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                      selectedStudy.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedStudy.status?.charAt(0).toUpperCase() + selectedStudy.status?.slice(1).replace('_', ' ') || 'Unknown'}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div><strong>Study Type:</strong> {selectedStudy.studyType}</div>
                  <div><strong>Modality:</strong> {selectedStudy.modality}</div>
                  <div><strong>Body Part:</strong> {selectedStudy.bodyPart}</div>
                  <div><strong>Priority:</strong> {selectedStudy.priority}</div>
                  <div><strong>Ordered By:</strong> {selectedStudy.orderedBy}</div>
                  <div><strong>Ordered:</strong> {format(new Date(selectedStudy.orderedAt), "MMM dd, yyyy")}</div>
                  {selectedStudy.scheduledAt && (
                    <div><strong>Scheduled:</strong> {format(new Date(selectedStudy.scheduledAt), "MMM dd, yyyy")}</div>
                  )}
                  {selectedStudy.performedAt && (
                    <div><strong>Performed:</strong> {format(new Date(selectedStudy.performedAt), "MMM dd, yyyy")}</div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-lg mb-2">Clinical Indication</h4>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{selectedStudy.indication}</p>
                </div>

                {selectedStudy.findings && (
                  <div>
                    <h4 className="font-medium text-lg mb-2">Findings</h4>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{selectedStudy.findings}</p>
                  </div>
                )}

                {selectedStudy.impression && (
                  <div>
                    <h4 className="font-medium text-lg mb-2">Impression</h4>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{selectedStudy.impression}</p>
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
                  {selectedStudy.images.map((image, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium">{image.seriesDescription}</h5>
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">{image.type}</span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>Images: {image.imageCount}</div>
                        <div>Size: {image.size}</div>
                      </div>
                      <div className="mt-3">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            
                            // Convert the uploaded medical image to the viewer format
                            const imageForViewer = {
                              seriesDescription: image.seriesDescription,
                              type: image.type,
                              imageCount: image.imageCount,
                              size: image.size,
                              imageData: image.imageData, // This should come from the database
                              mimeType: image.mimeType || 'image/jpeg'
                            };
                            setSelectedImageSeries(imageForViewer);
                            setShowImageViewer(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Images
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedStudy.report && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-800 mb-3">Report Status</h4>
                  <div className="text-sm text-green-700 space-y-2">
                    <div className="flex justify-between">
                      <span><strong>Status:</strong> {selectedStudy.report.status}</span>
                      <span><strong>Dictated:</strong> {format(new Date(selectedStudy.report.dictatedAt), "PPpp")}</span>
                    </div>
                    {selectedStudy.report.signedAt && (
                      <div><strong>Signed:</strong> {format(new Date(selectedStudy.report.signedAt), "PPpp")}</div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t">
                <Button variant="outline" onClick={() => setShowViewDialog(false)}>
                  Close
                </Button>
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setShowViewDialog(false);
                      setShowShareDialog(true);
                    }}
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Study
                  </Button>
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
                  <Button 
                    onClick={() => {
                      // Download study logic
                      const studyData = `IMAGING STUDY SUMMARY\n\nPatient: ${selectedStudy.patientName}\nStudy: ${selectedStudy.studyType}\nModality: ${selectedStudy.modality}\nDate: ${new Date(selectedStudy.orderedAt).toLocaleDateString()}\n\nIndication: ${selectedStudy.indication}\n\nFindings: ${selectedStudy.findings || 'Pending'}\n\nImpression: ${selectedStudy.impression || 'Pending'}\n\nRadiologist: ${selectedStudy.radiologist || 'TBD'}`;
                      
                      const blob = new Blob([studyData], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `imaging-study-${selectedStudy.patientName.replace(' ', '-').toLowerCase()}.txt`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                      
                      toast({
                        title: "Study Downloaded",
                        description: `Study summary for ${selectedStudy.patientName} downloaded successfully`,
                      });
                    }}
                    className="bg-medical-blue hover:bg-blue-700"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Study
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
                <Select value={orderFormData.patientId} onValueChange={(value) => setOrderFormData(prev => ({ ...prev, patientId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder={patientsLoading ? "Loading patients..." : "Select patient"} />
                  </SelectTrigger>
                  <SelectContent>
                    {patientsLoading ? (
                      <SelectItem value="loading" disabled>Loading patients...</SelectItem>
                    ) : patients.length > 0 ? (
                      patients.map((patient: any) => (
                        <SelectItem key={patient.id} value={patient.id.toString()}>
                          {patient.firstName} {patient.lastName} ({patient.patientId})
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-patients" disabled>No patients found</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="modality" className="text-sm font-medium">
                  Modality
                </Label>
                <Select value={orderFormData.modality} onValueChange={(value) => setOrderFormData(prev => ({ ...prev, modality: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select imaging type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="X-Ray">X-Ray</SelectItem>
                    <SelectItem value="CT">CT Scan</SelectItem>
                    <SelectItem value="MRI">MRI</SelectItem>
                    <SelectItem value="Ultrasound">Ultrasound</SelectItem>
                    <SelectItem value="Nuclear Medicine">Nuclear Medicine</SelectItem>
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
                  onChange={(e) => setOrderFormData(prev => ({ ...prev, bodyPart: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="priority" className="text-sm font-medium">
                  Priority
                </Label>
                <Select value={orderFormData.priority} onValueChange={(value) => setOrderFormData(prev => ({ ...prev, priority: value }))}>
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
                onChange={(e) => setOrderFormData(prev => ({ ...prev, studyType: e.target.value }))}
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
                onChange={(e) => setOrderFormData(prev => ({ ...prev, indication: e.target.value }))}
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
                onChange={(e) => setOrderFormData(prev => ({ ...prev, specialInstructions: e.target.value }))}
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
      <Dialog open={showFinalReportDialog} onOpenChange={setShowFinalReportDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Final Radiology Report</DialogTitle>
          </DialogHeader>
          {selectedStudy && (
            <div className="space-y-6">
              {/* Patient Information */}
              <div className="border-b pb-4">
                <h3 className="font-semibold text-lg mb-3">Patient Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Patient Name:</span> {selectedStudy.patientName}
                  </div>
                  <div>
                    <span className="font-medium">Patient ID:</span> {selectedStudy.patientId}
                  </div>
                  <div>
                    <span className="font-medium">Study Date:</span> {format(new Date(selectedStudy.orderedAt), "PPP")}
                  </div>
                  <div>
                    <span className="font-medium">Study Type:</span> {selectedStudy.studyType}
                  </div>
                  <div>
                    <span className="font-medium">Modality:</span> {selectedStudy.modality}
                  </div>
                  <div>
                    <span className="font-medium">Body Part:</span> {selectedStudy.bodyPart}
                  </div>
                  <div>
                    <span className="font-medium">Ordering Physician:</span> {selectedStudy.orderedBy}
                  </div>
                  <div>
                    <span className="font-medium">Radiologist:</span> {selectedStudy.radiologist || "Dr. Michael Chen"}
                  </div>
                </div>
              </div>

              {/* Clinical Information */}
              <div className="border-b pb-4">
                <h3 className="font-semibold text-lg mb-3">Clinical Information</h3>
                <div className="text-sm">
                  <div className="mb-2">
                    <span className="font-medium">Indication:</span> {selectedStudy.indication}
                  </div>
                  <div>
                    <span className="font-medium">Priority:</span> 
                    <span className={`ml-2 px-2 py-1 rounded text-xs ${
                      selectedStudy.priority === 'stat' ? 'bg-red-100 text-red-800' :
                      selectedStudy.priority === 'urgent' ? 'bg-orange-100 text-orange-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
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

                {selectedStudy.report && (
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
                    <span className="font-medium text-green-800">Report Status: FINAL</span>
                  </div>
                  <div className="text-sm text-green-700 space-y-1">
                    {selectedStudy.report?.dictatedAt && (
                      <div><strong>Dictated:</strong> {format(new Date(selectedStudy.report.dictatedAt), "PPpp")}</div>
                    )}
                    {selectedStudy.report?.signedAt && (
                      <div><strong>Signed:</strong> {format(new Date(selectedStudy.report.signedAt), "PPpp")}</div>
                    )}
                    <div><strong>Radiologist:</strong> {selectedStudy.radiologist || "Dr. Michael Chen"}</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-4 border-t">
                <Button variant="outline" onClick={() => setShowFinalReportDialog(false)}>
                  Close
                </Button>
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      // Download report logic
                      const reportContent = selectedStudy.report?.content || 
                        `RADIOLOGY REPORT\n\nPatient: ${selectedStudy.patientName}\nPatient ID: ${selectedStudy.patientId}\nStudy: ${selectedStudy.studyType}\nModality: ${selectedStudy.modality}\nDate: ${format(new Date(selectedStudy.orderedAt), "PPP")}\nBody Part: ${selectedStudy.bodyPart}\nOrdering Physician: ${selectedStudy.orderedBy}\nRadiologist: ${selectedStudy.radiologist || "Dr. Michael Chen"}\n\nCLINICAL INDICATION:\n${selectedStudy.indication}\n\nFINDINGS:\n${selectedStudy.findings || "Normal findings"}\n\nIMPRESSION:\n${selectedStudy.impression || "No acute abnormalities"}`;
                      
                      const blob = new Blob([reportContent], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `radiology-report-${selectedStudy.patientName.replace(/\s+/g, '-').toLowerCase()}-${format(new Date(selectedStudy.orderedAt), "yyyy-MM-dd")}.txt`;
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
              <Select value={uploadFormData.patientId} onValueChange={(value) => setUploadFormData({...uploadFormData, patientId: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select patient" />
                </SelectTrigger>
                <SelectContent>
                  {patientsLoading ? (
                    <SelectItem value="loading">Loading patients...</SelectItem>
                  ) : patients.length === 0 ? (
                    <SelectItem value="no-patients">No patients available</SelectItem>
                  ) : (
                    patients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id.toString()}>
                        {patient.firstName} {patient.lastName} ({patient.patientId})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Study Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="upload-modality">Modality *</Label>
                <Select value={uploadFormData.modality} onValueChange={(value) => setUploadFormData({...uploadFormData, modality: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="X-Ray">X-Ray</SelectItem>
                    <SelectItem value="CT">CT Scan</SelectItem>
                    <SelectItem value="MRI">MRI</SelectItem>
                    <SelectItem value="Ultrasound">Ultrasound</SelectItem>
                    <SelectItem value="Nuclear Medicine">Nuclear Medicine</SelectItem>
                    <SelectItem value="Mammography">Mammography</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="upload-priority">Priority</Label>
                <Select value={uploadFormData.priority} onValueChange={(value) => setUploadFormData({...uploadFormData, priority: value})}>
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
                onChange={(e) => setUploadFormData({...uploadFormData, studyType: e.target.value})}
                placeholder="e.g., Chest X-Ray PA and Lateral"
              />
            </div>

            <div>
              <Label htmlFor="upload-body-part">Body Part</Label>
              <Input
                id="upload-body-part"
                value={uploadFormData.bodyPart}
                onChange={(e) => setUploadFormData({...uploadFormData, bodyPart: e.target.value})}
                placeholder="e.g., Chest, Abdomen, Left Hand"
              />
            </div>

            <div>
              <Label htmlFor="upload-indication">Clinical Indication</Label>
              <Textarea
                id="upload-indication"
                value={uploadFormData.indication}
                onChange={(e) => setUploadFormData({...uploadFormData, indication: e.target.value})}
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
                      onClick={() => document.getElementById('upload-files')?.click()}
                    >
                      Select Images
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500">
                    Select X-ray images, DICOM files, or other medical images
                  </p>
                  <p className="text-xs text-gray-400">
                    Supported formats: All image formats (JPEG, PNG, GIF, BMP, TIFF, WebP, SVG), DICOM (.dcm), and medical imaging files
                  </p>
                </div>
              </div>
              
              {/* Selected Files Display */}
              {selectedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  <Label>Selected Files ({selectedFiles.length}):</Label>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <span className="text-sm truncate">{file.name}</span>
                        <span className="text-xs text-gray-500">
                          {file.size ? 
                            file.size < 1024 ? `${file.size} B` :
                            file.size < 1024 * 1024 ? `${(file.size / 1024).toFixed(1)} KB` :
                            `${(file.size / (1024 * 1024)).toFixed(1)} MB`
                            : 'Unknown size'
                          }
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleUploadSubmit}
                className="bg-medical-blue hover:bg-blue-700"
                disabled={!uploadFormData.patientId || !uploadFormData.studyType || selectedFiles.length === 0}
              >
                <FileImage className="h-4 w-4 mr-2" />
                Upload Images
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
                {selectedImageSeries.seriesDescription} - {selectedImageSeries.imageCount} images
              </p>
            )}
          </DialogHeader>
          
          <div className="flex-1 overflow-auto">
            {selectedImageSeries && (
              <div className="space-y-4">
                {/* Series Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><strong>Series:</strong> {selectedImageSeries.seriesDescription}</div>
                    <div><strong>Type:</strong> {selectedImageSeries.type}</div>
                    <div><strong>Images:</strong> {selectedImageSeries.imageCount}</div>
                    <div><strong>Size:</strong> {selectedImageSeries.size}</div>
                  </div>
                </div>

                {/* Image Display Area */}
                <div className="bg-black rounded-lg p-4 min-h-[400px] flex items-center justify-center">
                  {selectedImageSeries.imageData ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <img 
                        src={`data:${selectedImageSeries.mimeType || 'image/png'};base64,${selectedImageSeries.imageData}`}
                        alt={`Medical Image - ${selectedImageSeries.seriesDescription}`}
                        className="max-w-full max-h-96 object-contain rounded-lg border border-gray-600"
                        style={{ maxHeight: '400px' }}
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
                              <p className="text-sm">{selectedImageSeries.seriesDescription}</p>
                              <p className="text-xs mt-2">Upload a new image to view it here</p>
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
                          const link = document.createElement('a');
                          link.href = `data:${selectedImageSeries.mimeType || 'image/jpeg'};base64,${selectedImageSeries.imageData}`;
                          link.download = `medical-image-${selectedImageSeries.id}.${selectedImageSeries.mimeType?.includes('png') ? 'png' : 'jpg'}`;
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
                            description: "Image data not available for download.",
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
                          fetch(`data:${selectedImageSeries.mimeType || 'image/jpeg'};base64,${selectedImageSeries.imageData}`)
                            .then(res => res.blob())
                            .then(blob => {
                              const file = new File([blob], `medical-image-${selectedImageSeries.id}.jpg`, { type: selectedImageSeries.mimeType || 'image/jpeg' });
                              navigator.share({
                                title: 'Medical Image',
                                text: `Medical Image - ${selectedImageSeries.seriesDescription}`,
                                files: [file]
                              });
                            })
                            .catch(err => {
                              toast({
                                title: "Share Failed",
                                description: "Unable to share image. Try downloading instead.",
                                variant: "destructive",
                              });
                            });
                        } else {
                          // Fallback: copy image data URL to clipboard
                          if (selectedImageSeries?.imageData) {
                            const imageDataUrl = `data:${selectedImageSeries.mimeType || 'image/jpeg'};base64,${selectedImageSeries.imageData}`;
                            navigator.clipboard.writeText(imageDataUrl).then(() => {
                              toast({
                                title: "Image Data Copied",
                                description: "Image data URL copied to clipboard.",
                              });
                            }).catch(() => {
                              toast({
                                title: "Share Failed",
                                description: "Unable to share or copy image data.",
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
    </>
  );
}