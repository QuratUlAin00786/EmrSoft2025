import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Header } from "@/components/layout/header";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Medical Specialties Data Structure
const medicalSpecialties = {
  "General & Primary Care": {
    "General Practitioner (GP) / Family Physician": ["Common illnesses", "Preventive care"],
    "Internal Medicine Specialist": ["Adult health", "Chronic diseases (diabetes, hypertension)"]
  },
  "Surgical Specialties": {
    "General Surgeon": [
      "Abdominal Surgery",
      "Hernia Repair", 
      "Gallbladder & Appendix Surgery",
      "Colorectal Surgery",
      "Breast Surgery",
      "Endocrine Surgery (thyroid, parathyroid, adrenal)",
      "Trauma & Emergency Surgery"
    ],
    "Orthopedic Surgeon": [
      "Joint Replacement (hip, knee, shoulder)",
      "Spine Surgery",
      "Sports Orthopedics (ACL tears, ligament reconstruction)",
      "Pediatric Orthopedics",
      "Arthroscopy (keyhole joint surgery)",
      "Trauma & Fracture Care"
    ],
    "Neurosurgeon": [
      "Brain Tumor Surgery",
      "Spinal Surgery", 
      "Cerebrovascular Surgery (stroke, aneurysm)",
      "Pediatric Neurosurgery",
      "Functional Neurosurgery (Parkinson's, epilepsy, DBS)",
      "Trauma Neurosurgery"
    ],
    "Cardiothoracic Surgeon": [
      "Cardiac Surgery – Bypass, valve replacement",
      "Thoracic Surgery – Lungs, esophagus, chest tumors", 
      "Congenital Heart Surgery – Pediatric heart defects",
      "Heart & Lung Transplants",
      "Minimally Invasive / Robotic Heart Surgery"
    ],
    "Plastic & Reconstructive Surgeon": [
      "Cosmetic Surgery (nose job, facelift, liposuction)",
      "Reconstructive Surgery (after cancer, trauma)",
      "Burn Surgery",
      "Craniofacial Surgery (cleft lip/palate, facial bones)",
      "Hand Surgery"
    ],
    "ENT Surgeon (Otolaryngologist)": [
      "Otology (ear surgeries, cochlear implants)",
      "Rhinology (sinus, deviated septum)",
      "Laryngology (voice box, throat)",
      "Head & Neck Surgery (thyroid, tumors)",
      "Pediatric ENT (tonsils, adenoids, ear tubes)",
      "Facial Plastic Surgery (nose/ear correction)"
    ],
    "Urologist": [
      "Endourology (kidney stones, minimally invasive)",
      "Uro-Oncology (prostate, bladder, kidney cancer)",
      "Pediatric Urology",
      "Male Infertility & Andrology",
      "Renal Transplant Surgery",
      "Neurourology (bladder control disorders)"
    ]
  },
  "Heart & Circulation": {
    "Cardiologist": ["Heart diseases", "ECG", "Angiography"],
    "Vascular Surgeon": ["Arteries", "Veins", "Blood vessels"]
  },
  "Women's Health": {
    "Gynecologist": ["Female reproductive system"],
    "Obstetrician": ["Pregnancy & childbirth"],
    "Fertility Specialist (IVF Expert)": ["Infertility treatment"]
  },
  "Children's Health": {
    "Pediatrician": ["General child health"],
    "Pediatric Surgeon": ["Infant & child surgeries"],
    "Neonatologist": ["Newborn intensive care"]
  },
  "Brain & Nervous System": {
    "Neurologist": ["Stroke", "Epilepsy", "Parkinson's"],
    "Psychiatrist": ["Mental health (depression, anxiety)"],
    "Psychologist (Clinical)": ["Therapy & counseling"]
  },
  "Skin, Hair & Appearance": {
    "Dermatologist": ["Skin", "Hair", "Nails"],
    "Cosmetologist": ["Non-surgical cosmetic treatments"],
    "Aesthetic / Cosmetic Surgeon": ["Surgical enhancements"]
  },
  "Eye & Vision": {
    "Ophthalmologist": ["Cataracts", "Glaucoma", "Surgeries"],
    "Optometrist": ["Vision correction (glasses, lenses)"]
  },
  "Teeth & Mouth": {
    "Dentist (General)": ["Oral health", "Fillings"],
    "Orthodontist": ["Braces", "Alignment"],
    "Oral & Maxillofacial Surgeon": ["Jaw surgery", "Implants"],
    "Periodontist": ["Gum disease specialist"],
    "Endodontist": ["Root canal specialist"]
  },
  "Digestive System": {
    "Gastroenterologist": ["Stomach", "Intestines"],
    "Hepatologist": ["Liver specialist"],
    "Colorectal Surgeon": ["Colon", "Rectum", "Anus"]
  },
  "Kidneys & Urinary Tract": {
    "Nephrologist": ["Kidney diseases", "Dialysis"],
    "Urologist": ["Surgical urological procedures"]
  },
  "Respiratory System": {
    "Pulmonologist": ["Asthma", "COPD", "Tuberculosis"],
    "Thoracic Surgeon": ["Lung surgeries"]
  },
  "Cancer": {
    "Oncologist": ["Medical cancer specialist"],
    "Radiation Oncologist": ["Radiation therapy"],
    "Surgical Oncologist": ["Cancer surgeries"]
  },
  "Endocrine & Hormones": {
    "Endocrinologist": ["Diabetes", "Thyroid", "Hormones"]
  },
  "Muscles & Joints": {
    "Rheumatologist": ["Arthritis", "Autoimmune"],
    "Sports Medicine Specialist": ["Athlete injuries"]
  },
  "Blood & Immunity": {
    "Hematologist": ["Blood diseases (anemia, leukemia)"],
    "Immunologist / Allergist": ["Immune & allergy disorders"]
  },
  "Others": {
    "Geriatrician": ["Elderly care"],
    "Pathologist": ["Lab & diagnostic testing"],
    "Radiologist": ["Imaging (X-ray, CT, MRI)"],
    "Anesthesiologist": ["Pain & anesthesia"],
    "Emergency Medicine Specialist": ["Accidents", "Trauma"],
    "Occupational Medicine Specialist": ["Workplace health"]
  }
};
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  Printer
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
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
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

// Database-driven lab results - no more mock data

export default function LabResultsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showPrescriptionDialog, setShowPrescriptionDialog] = useState(false);
  const [selectedResult, setSelectedResult] = useState<DatabaseLabResult | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});
  
  // Doctor specialty states for lab order
  const [selectedSpecialtyCategory, setSelectedSpecialtyCategory] = useState<string>("");
  const [selectedSubSpecialty, setSelectedSubSpecialty] = useState<string>("");
  const [selectedSpecificArea, setSelectedSpecificArea] = useState<string>("");
  const [shareFormData, setShareFormData] = useState({
    method: "",
    email: "",
    whatsapp: "",
    message: ""
  });
  const [orderFormData, setOrderFormData] = useState({
    patientId: "",
    patientName: "",
    testType: "",
    priority: "routine",
    notes: "",
    doctorId: "",
    doctorName: "",
    mainSpecialty: "",
    subSpecialty: ""
  });

  const { data: labResults = [], isLoading } = useQuery({
    queryKey: ["/api/lab-results"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/lab-results");
      return await response.json();
    }
  });

  // Real API data fetching for patients
  const { data: patients = [], isLoading: patientsLoading } = useQuery({
    queryKey: ["/api/patients"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/patients");
      const data = await response.json();
      return data;
    }
  });

  // Fetch medical staff for doctor selection
  const { data: medicalStaffData, isLoading: medicalStaffLoading } = useQuery({
    queryKey: ["/api/medical-staff"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/medical-staff");
      const data = await response.json();
      return data;
    }
  });

  // Fetch filtered doctors based on specialization
  const { data: filteredDoctorsData, isLoading: filteredDoctorsLoading } = useQuery({
    queryKey: ["/api/doctors/by-specialization", selectedSpecialtyCategory, selectedSubSpecialty],
    queryFn: async () => {
      if (!selectedSpecialtyCategory && !selectedSubSpecialty) {
        return { doctors: [], count: 0 };
      }
      
      const params = new URLSearchParams();
      if (selectedSpecialtyCategory) {
        params.append('mainSpecialty', selectedSpecialtyCategory);
      }
      if (selectedSubSpecialty) {
        params.append('subSpecialty', selectedSubSpecialty);
      }
      
      const response = await apiRequest("GET", `/api/doctors/by-specialization?${params.toString()}`);
      const data = await response.json();
      return data;
    },
    enabled: !!(selectedSpecialtyCategory || selectedSubSpecialty)
  });

  // Use filtered doctors when specializations are selected, otherwise use all doctors
  const doctors = (selectedSpecialtyCategory || selectedSubSpecialty) 
    ? (filteredDoctorsData?.doctors || [])
    : (medicalStaffData?.staff?.filter((staff: any) => staff.role === 'doctor') || []);


  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users");
      return res.json();
    }
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createLabOrderMutation = useMutation({
    mutationFn: async (labOrderData: any) => {
      return await apiRequest("POST", "/api/lab-results", labOrderData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Lab test ordered successfully",
      });
      setShowOrderDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/lab-results"] });
      setOrderFormData({
        patientId: "",
        patientName: "",
        testType: "",
        priority: "routine",
        notes: "",
        doctorId: "",
        doctorName: "",
        mainSpecialty: "",
        subSpecialty: ""
      });
      
      // Reset specialty states
      setSelectedSpecialtyCategory("");
      setSelectedSubSpecialty("");
      setSelectedSpecificArea("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create lab order",
        variant: "destructive",
      });
    },
  });

  const updateLabResultMutation = useMutation({
    mutationFn: async (updateData: { id: number; data: any }) => {
      return await apiRequest("PUT", `/api/lab-results/${updateData.id}`, updateData.data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Lab result updated successfully",
      });
      setIsEditMode(false);
      queryClient.invalidateQueries({ queryKey: ["/api/lab-results"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update lab result",
        variant: "destructive",
      });
    },
  });

  const deleteLabResultMutation = useMutation({
    mutationFn: async (resultId: number) => {
      return await apiRequest("DELETE", `/api/lab-results/${resultId.toString()}`);
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
    setShowOrderDialog(true);
  };

  const handleViewResult = (result: DatabaseLabResult) => {
    console.log("handleViewResult called with:", result);
    setSelectedResult(result);
    setShowViewDialog(true);
    console.log("showViewDialog set to true");
  };

  const handleDownloadResult = async (resultId: number | string) => {
    const result = Array.isArray(labResults) ? labResults.find((r: any) => r.id.toString() === resultId.toString()) : null;
    if (result) {
      const patientName = getPatientName(result.patientId);
      
      try {
        // Fetch prescriptions for this patient
        const response = await apiRequest("GET", `/api/prescriptions/patient/${result.patientId.toString()}`);
        const prescriptions = await response.json();
        
        toast({
          title: "Download Report",
          description: `Prescription report for ${patientName} downloaded successfully`,
        });
        
        // Create prescription document content
        let prescriptionsText = '';
        if (prescriptions && prescriptions.length > 0) {
          prescriptionsText = prescriptions.map((prescription: any) => {
            const medications = prescription.medications || [];
            const medicationsText = medications.length > 0 
              ? medications.map((med: any) => 
                  `  - ${med.name}: ${med.dosage}, ${med.frequency}, Duration: ${med.duration}\n    Instructions: ${med.instructions}\n    Quantity: ${med.quantity}, Refills: ${med.refills}`
                ).join('\n')
              : `  - ${prescription.medicationName}: ${prescription.dosage || 'N/A'}, ${prescription.frequency || 'N/A'}\n    Instructions: ${prescription.instructions || 'N/A'}`;
            
            return `Prescription #${prescription.prescriptionNumber || prescription.id}
Issued: ${new Date(prescription.issuedDate || prescription.createdAt).toLocaleDateString()}
Status: ${prescription.status}
Diagnosis: ${prescription.diagnosis || 'N/A'}

Medications:
${medicationsText}

Notes: ${prescription.notes || 'No additional notes'}
-------------------------------------------`;
          }).join('\n\n');
        } else {
          prescriptionsText = 'No prescriptions found for this patient.';
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
        
        const blob = new Blob([documentContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `prescriptions-${patientName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
      } catch (error) {
        console.error('Error fetching prescriptions:', error);
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
      doctorName: selectedResult.doctorName || "",
      mainSpecialty: selectedResult.mainSpecialty || "",
      subSpecialty: selectedResult.subSpecialty || ""
    });
    setIsEditMode(true);
  };

  const handleSaveEdit = () => {
    if (!selectedResult) return;
    
    updateLabResultMutation.mutate({
      id: selectedResult.id,
      data: editFormData
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
      const element = document.getElementById('prescription-print');
      if (!element) {
        toast({
          title: "Error",
          description: "Could not find prescription content to convert",
          variant: "destructive",
        });
        return;
      }

      console.log('PDF Generation: Found element', element);

      // Show loading state (don't show immediately to avoid interfering with capture)
      setTimeout(() => {
        toast({
          title: "Generating PDF",
          description: "Please wait while we create your prescription PDF...",
        });
      }, 50);

      // Wait a moment for any layout changes
      await new Promise(resolve => setTimeout(resolve, 200));

      console.log('PDF Generation: Starting canvas capture');

      // Create canvas from HTML element - simple approach
      const canvas = await html2canvas(element, {
        scale: 2, // Higher resolution for better quality
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: element.scrollWidth,
        height: element.scrollHeight
      });

      console.log('PDF Generation: Canvas created', canvas.width, 'x', canvas.height);

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');
      
      // A4 dimensions
      const pageWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const margin = 10; // 10mm margins
      
      // Calculate dimensions to fit content with margins
      const usableWidth = pageWidth - (2 * margin);
      const usableHeight = pageHeight - (2 * margin);
      
      // Scale image to fit width
      const imgWidth = usableWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Add content to PDF
      let yPosition = margin;
      let heightLeft = imgHeight;

      // First page
      pdf.addImage(imgData, 'PNG', margin, yPosition, imgWidth, Math.min(imgHeight, usableHeight));
      heightLeft -= usableHeight;

      // Add additional pages if needed
      while (heightLeft > 0) {
        pdf.addPage();
        yPosition = margin - (imgHeight - heightLeft);
        pdf.addImage(imgData, 'PNG', margin, yPosition, imgWidth, imgHeight);
        heightLeft -= usableHeight;
      }

      // Create filename from testId
      const filename = `${selectedResult.testId}.pdf`;
      
      console.log('PDF Generation: Saving as', filename);
      pdf.save(filename);

      // Success message
      setTimeout(() => {
        toast({
          title: "PDF Generated",
          description: `Prescription PDF downloaded as ${filename}`,
        });
      }, 100);

    } catch (error) {
      console.error('Error generating PDF:', error);
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
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Error",
        description: "Unable to open print window. Please allow popups and try again.",
        variant: "destructive",
      });
      return;
    }

    // Helper function to get status class based on result status
    const getStatusClass = (status: string) => {
      switch (status) {
        case 'normal': return 'status-normal';
        case 'abnormal_high':
        case 'abnormal_low': return 'status-abnormal';
        case 'critical': return 'status-critical';
        default: return 'status-normal';
      }
    };

    // Helper function to format status text
    const formatStatus = (status: string) => {
      return status.replace('_', ' ').toUpperCase();
    };

    // Create properly structured HTML for printing with complete styling
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
              line-height: 1.6;
              color: #333;
              background: white;
            }
            .prescription-content {
              max-width: 800px;
              margin: 0 auto;
              background: white;
            }
            
            /* Header Styles */
            .header {
              text-align: center;
              border-bottom: 3px solid #4A7DFF;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .clinic-name {
              font-size: 28px;
              font-weight: bold;
              color: #4A7DFF;
              margin-bottom: 5px;
            }
            .clinic-subtitle {
              font-size: 14px;
              color: #6b7280;
              font-weight: 500;
            }
            
            /* Patient Information Grid */
            .patient-info {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 30px;
              margin-bottom: 30px;
            }
            .info-section {
              border: 2px solid #e5e7eb;
              border-radius: 8px;
              padding: 20px;
              background: #f8f9fa;
            }
            .section-title {
              font-size: 16px;
              font-weight: 700;
              color: #374151;
              margin-bottom: 15px;
              padding-bottom: 8px;
              border-bottom: 2px solid #d1d5db;
            }
            .info-item {
              margin-bottom: 10px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .info-label {
              font-weight: 600;
              color: #4b5563;
              font-size: 13px;
            }
            .info-value {
              color: #1f2937;
              font-weight: 500;
              font-size: 13px;
            }
            
            /* Prescription Section */
            .prescription-section {
              margin: 30px 0;
            }
            .prescription-title {
              font-size: 20px;
              font-weight: 700;
              color: #374151;
              border-bottom: 2px solid #e5e7eb;
              padding-bottom: 10px;
              margin-bottom: 20px;
            }
            .prescription-symbol {
              font-size: 24px;
              color: #4A7DFF;
              margin-right: 10px;
            }
            
            /* Test Details Box */
            .test-details {
              background: #eff6ff;
              border: 2px solid #bfdbfe;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
            }
            .test-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 20px;
            }
            .test-item {
              background: white;
              padding: 15px;
              border-radius: 6px;
              border: 1px solid #cbd5e1;
            }
            .test-label {
              font-size: 12px;
              font-weight: 600;
              color: #64748b;
              margin-bottom: 5px;
              text-transform: uppercase;
            }
            .test-value {
              font-size: 14px;
              font-weight: 600;
              color: #1e293b;
            }
            .test-id {
              font-family: 'Courier New', monospace;
              background: #f1f5f9;
              padding: 2px 6px;
              border-radius: 4px;
            }
            
            /* Test Results */
            .test-results {
              margin: 20px 0;
            }
            .results-title {
              font-size: 14px;
              font-weight: 600;
              color: #4b5563;
              margin-bottom: 15px;
            }
            .result-item {
              background: white;
              border: 1px solid #cbd5e1;
              border-radius: 6px;
              padding: 15px;
              margin-bottom: 12px;
            }
            .result-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 10px;
            }
            .result-name {
              font-weight: 600;
              color: #1f2937;
              font-size: 14px;
            }
            .result-status {
              padding: 4px 10px;
              border-radius: 4px;
              font-size: 11px;
              font-weight: 600;
              text-transform: uppercase;
            }
            .status-normal {
              background: #dcfce7;
              color: #166534;
              border: 1px solid #bbf7d0;
            }
            .status-abnormal {
              background: #fee2e2;
              color: #dc2626;
              border: 1px solid #fecaca;
            }
            .status-critical {
              background: #fef2f2;
              color: #991b1b;
              border: 1px solid #fca5a5;
            }
            .result-details {
              font-size: 13px;
              color: #4b5563;
              line-height: 1.4;
            }
            .result-value {
              font-weight: 600;
              color: #1f2937;
            }
            
            /* Notes Section */
            .notes-section {
              background: #fffbeb;
              border: 2px solid #fcd34d;
              border-left: 6px solid #f59e0b;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
            }
            .notes-title {
              font-weight: 600;
              color: #92400e;
              margin-bottom: 10px;
              font-size: 14px;
            }
            .notes-content {
              color: #78350f;
              font-size: 13px;
              line-height: 1.5;
            }
            
            /* Critical Warning */
            .critical-warning {
              background: #fef2f2;
              border: 2px solid #fca5a5;
              border-left: 6px solid #dc2626;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
            }
            .critical-header {
              display: flex;
              align-items: center;
              gap: 8px;
              font-weight: 700;
              color: #dc2626;
              margin-bottom: 10px;
              font-size: 14px;
            }
            .critical-text {
              color: #991b1b;
              font-size: 13px;
              line-height: 1.5;
            }
            
            /* Footer */
            .footer {
              border-top: 2px solid #e5e7eb;
              padding-top: 20px;
              margin-top: 40px;
            }
            .footer-info {
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              color: #6b7280;
              margin-bottom: 25px;
            }
            .signature-section {
              text-align: center;
              margin-top: 30px;
            }
            .signature-line {
              border-top: 2px solid #374151;
              width: 250px;
              margin: 0 auto 15px;
            }
            .doctor-name {
              font-weight: 600;
              font-size: 14px;
              color: #1f2937;
              margin-bottom: 5px;
            }
            .doctor-specialty {
              font-size: 12px;
              color: #6b7280;
              font-style: italic;
            }
            
            /* Print Specific Styles */
            @media print {
              body {
                margin: 0;
                padding: 15px;
                font-size: 12px;
              }
              .prescription-content {
                max-width: none;
                width: 100%;
              }
              .patient-info {
                break-inside: avoid;
              }
              .test-details {
                break-inside: avoid;
              }
              .result-item {
                break-inside: avoid;
              }
              .footer {
                break-inside: avoid;
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="prescription-content">
            <!-- Header -->
            <div class="header">
              <h1 class="clinic-name">CURA EMR SYSTEM</h1>
              <p class="clinic-subtitle">Laboratory Test Prescription</p>
            </div>

            <!-- Patient and Doctor Information -->
            <div class="patient-info">
              <div class="info-section">
                <h3 class="section-title">Physician Information</h3>
                <div class="info-item">
                  <span class="info-label">Name:</span>
                  <span class="info-value">${selectedResult.doctorName || 'Doctor'}</span>
                </div>
                ${selectedResult.mainSpecialty ? `
                <div class="info-item">
                  <span class="info-label">Main Specialization:</span>
                  <span class="info-value">${selectedResult.mainSpecialty}</span>
                </div>
                ` : ''}
                ${selectedResult.subSpecialty ? `
                <div class="info-item">
                  <span class="info-label">Sub-Specialization:</span>
                  <span class="info-value">${selectedResult.subSpecialty}</span>
                </div>
                ` : ''}
                ${selectedResult.priority ? `
                <div class="info-item">
                  <span class="info-label">Priority:</span>
                  <span class="info-value">${selectedResult.priority.toUpperCase()}</span>
                </div>
                ` : ''}
              </div>

              <div class="info-section">
                <h3 class="section-title">Patient Information</h3>
                <div class="info-item">
                  <span class="info-label">Name:</span>
                  <span class="info-value">${getPatientName(selectedResult.patientId)}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Patient ID:</span>
                  <span class="info-value">${selectedResult.patientId}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Date:</span>
                  <span class="info-value">${format(new Date(), 'MMM dd, yyyy')}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Time:</span>
                  <span class="info-value">${format(new Date(), 'HH:mm')}</span>
                </div>
              </div>
            </div>

            <!-- Prescription Details -->
            <div class="prescription-section">
              <h2 class="prescription-title">
                <span class="prescription-symbol">℞</span>Laboratory Test Prescription
              </h2>
              
              <div class="test-details">
                <div class="test-grid">
                  <div class="test-item">
                    <div class="test-label">Test ID</div>
                    <div class="test-value test-id">${selectedResult.testId}</div>
                  </div>
                  <div class="test-item">
                    <div class="test-label">Test Type</div>
                    <div class="test-value">${selectedResult.testType}</div>
                  </div>
                  <div class="test-item">
                    <div class="test-label">Ordered Date</div>
                    <div class="test-value">${format(new Date(selectedResult.orderedAt), 'MMM dd, yyyy HH:mm')}</div>
                  </div>
                  <div class="test-item">
                    <div class="test-label">Status</div>
                    <div class="test-value">${selectedResult.status.toUpperCase()}</div>
                  </div>
                </div>

                ${selectedResult.results && selectedResult.results.length > 0 ? `
                <div class="test-results">
                  <div class="results-title">Test Results:</div>
                  ${selectedResult.results.map((testResult: any) => `
                    <div class="result-item">
                      <div class="result-header">
                        <span class="result-name">${testResult.name}</span>
                        <span class="result-status ${getStatusClass(testResult.status)}">
                          ${formatStatus(testResult.status)}
                        </span>
                      </div>
                      <div class="result-details">
                        <div><strong>Value:</strong> <span class="result-value">${testResult.value} ${testResult.unit}</span></div>
                        <div><strong>Reference Range:</strong> ${testResult.referenceRange}</div>
                        ${testResult.flag ? `<div><strong>Flag:</strong> ${testResult.flag}</div>` : ''}
                      </div>
                    </div>
                  `).join('')}
                </div>
                ` : ''}

                ${selectedResult.notes ? `
                <div class="notes-section">
                  <div class="notes-title">Clinical Notes:</div>
                  <div class="notes-content">${selectedResult.notes}</div>
                </div>
                ` : ''}
              </div>

              ${selectedResult.criticalValues ? `
              <div class="critical-warning">
                <div class="critical-header">
                  <span>⚠️ CRITICAL VALUES DETECTED</span>
                </div>
                <div class="critical-text">
                  This lab result contains critical values that require immediate attention.
                </div>
              </div>
              ` : ''}
            </div>

            <!-- Footer -->
            <div class="footer">
              <div class="footer-info">
                <span>Generated by Cura EMR System</span>
                <span>Date: ${format(new Date(), 'MMM dd, yyyy HH:mm')}</span>
              </div>
              <div class="signature-section">
                <div class="signature-line"></div>
                <div class="doctor-name">${selectedResult.doctorName || 'Doctor'}</div>
                ${selectedResult.mainSpecialty ? `<div class="doctor-specialty">${selectedResult.mainSpecialty}</div>` : ''}
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
      description: "Print dialog opened. Please select your printer and print options.",
    });
  };

  const handleFlagCritical = (resultId: string) => {
    const result = Array.isArray(labResults) ? labResults.find((r: any) => r.id === resultId) : null;
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
    const patient = Array.isArray(patients) && patients ? patients.find((p: any) => p?.id === patientId) : null;
    return patient && patient.firstName && patient.lastName ? `${patient.firstName} ${patient.lastName}` : `Patient #${patientId}`;
  };

  // Helper function to get user name from user ID  
  const getUserName = (userId: number) => {
    if (!Array.isArray(users) || !users) return `User #${userId}`;
    const user = users.find((u: any) => u && u.id === userId);
    if (!user) return `User #${userId}`;
    const firstName = user?.firstName ?? '';
    const lastName = user?.lastName ?? '';
    if (!firstName || !lastName) return `User #${userId}`;
    return `${firstName} ${lastName}`;
  };

  const filteredResults = Array.isArray(labResults) ? labResults.filter((result: DatabaseLabResult) => {
    const patientName = getPatientName(result.patientId);
    const matchesSearch = !searchQuery || 
      patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      result.testType.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || result.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) : [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'collected': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getResultStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'bg-green-100 text-green-800';
      case 'abnormal_high': return 'bg-orange-100 text-orange-800';
      case 'abnormal_low': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <>
        <Header title="Lab Results" subtitle="View and manage laboratory test results" />
        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
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
                    <p className="text-sm font-medium text-gray-600">Pending Results</p>
                    <p className="text-2xl font-bold">{filteredResults.filter(r => r.status === 'pending').length}</p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Critical Values</p>
                    <p className="text-2xl font-bold">{filteredResults.filter(r => r.notes?.toLowerCase().includes('critical') || r.value?.toLowerCase().includes('high')).length}</p>
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
                    <p className="text-2xl font-bold">
                      {filteredResults.filter(r => r.status === 'completed' && 
                        new Date(r.createdAt || '').toDateString() === new Date().toDateString()).length}
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
                    <p className="text-sm font-medium text-gray-600">Total Results</p>
                    <p className="text-2xl font-bold">{filteredResults.length}</p>
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
                
                <Button onClick={handleOrderTest} className="bg-medical-blue hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Order Lab Test
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Lab Results List */}
          <div className="space-y-4">
            {filteredResults.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">No lab results found</h3>
                  <p className="text-gray-600">Try adjusting your search terms or filters</p>
                </CardContent>
              </Card>
            ) : (
              filteredResults.map((result) => (
                <Card key={result.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6 relative">
                    {/* Doctor information - Top Right Position */}
                    <div className="absolute top-6 right-6 w-64">
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-3">
                          <User className="h-4 w-4 text-blue-600" />
                          <h4 className="font-semibold text-blue-900">
                            {result.doctorName || 'Dr. Sarah Williams'}
                          </h4>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="text-sm">
                            <span className="font-medium text-gray-800">Main Specialization:</span>
                            <div className="text-blue-600">{result.mainSpecialty || 'Diagnostic Specialties'}</div>
                          </div>
                          <div className="text-sm">
                            <span className="font-medium text-gray-800">Sub-Specialization:</span>
                            <div className="text-blue-600">{result.subSpecialty || 'Neurosurgeon'}</div>
                          </div>
                          <div className="text-sm">
                            <span className="font-medium text-gray-800">Priority:</span>
                            <div className="text-green-600">{result.priority || 'urgent'}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Header with patient name and status - with right margin for blue box */}
                    <div className="flex items-center gap-3 mb-4 mr-72">
                      <h3 className="text-lg font-semibold text-gray-900">{getPatientName(result.patientId)}</h3>
                      <Badge className={getStatusColor(result.status)}>
                        {result.status}
                      </Badge>
                      {result.criticalValues && (
                        <Badge variant="destructive" className="flex items-center gap-1">
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
                            <span className="font-medium">Ordered:</span> {format(new Date(result.orderedAt), 'MMM dd, yyyy HH:mm')}
                          </div>
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Test:</span> {result.testType}
                          </div>
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Test ID:</span> {result.testId}
                          </div>
                          {result.completedAt && (
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">Completed:</span> {format(new Date(result.completedAt), 'MMM dd, yyyy HH:mm')}
                            </div>
                          )}
                        </div>
                        
                        {/* Notes section */}
                        <div>
                          <h4 className="font-semibold text-gray-800 mb-2">Notes</h4>
                          <p className="text-sm text-gray-600">{result.notes || 'no no'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Test Results section (if available) - with right margin for blue box */}
                    {result.results && result.results.length > 0 && (
                      <div className="mt-6 mr-72">
                        <h4 className="font-medium mb-3">Test Results:</h4>
                        <div className="grid gap-3">
                          {result.results.map((testResult: any, index: number) => (
                            <div key={index} className="p-3 rounded-lg border bg-gray-50 border-gray-200">
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{testResult.name}</span>
                                <Badge className={getResultStatusColor(testResult.status)}>
                                  {testResult.status.replace('_', ' ').toUpperCase()}
                                </Badge>
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                <span className="font-medium">{testResult.value} {testResult.unit}</span>
                                <span className="ml-2">Ref: {testResult.referenceRange}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action buttons at bottom - with right margin for blue box */}
                    <div className="flex gap-2 mt-6 pt-4 border-t border-gray-200 mr-72">
                      <Button variant="outline" size="sm" onClick={() => handleViewResult(result)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => handleGeneratePrescription(result)}
                        className="bg-medical-blue hover:bg-blue-700 text-white"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Generate Prescription
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={async () => {
                          setSelectedResult(result);
                          // Temporarily open the prescription dialog to render content
                          setShowPrescriptionDialog(true);
                          // Wait for the content to render
                          await new Promise(resolve => setTimeout(resolve, 100));
                          // Generate the PDF
                          await handleGeneratePDF();
                          // Close the dialog
                          setShowPrescriptionDialog(false);
                        }}
                        className="bg-medical-blue hover:bg-blue-700 text-white"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download PDF
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleShareResult(result)}>
                        <User className="h-4 w-4 mr-2" />
                        Review
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => deleteLabResultMutation.mutate(result.id)}
                        disabled={deleteLabResultMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
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
              <Select 
                value={orderFormData.patientId} 
                onValueChange={(value) => {
                  const selectedPatient = Array.isArray(patients) ? patients.find((p: any) => p.id.toString() === value) : null;
                  setOrderFormData(prev => ({ 
                    ...prev, 
                    patientId: value,
                    patientName: selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : ''
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a patient" />
                </SelectTrigger>
                <SelectContent>
                  {patientsLoading ? (
                    <SelectItem value="loading" disabled>Loading patients...</SelectItem>
                  ) : patients && Array.isArray(patients) && patients.length > 0 ? (
                    patients.map((patient: any) => (
                      <SelectItem key={patient.id} value={patient.id.toString()}>
                        {`${patient.firstName} ${patient.lastName} (${patient.patientId})`}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>No patients available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="mainSpecialty">Medical Specialty Category</Label>
              <Select 
                value={selectedSpecialtyCategory}
                onValueChange={(value) => {
                  setSelectedSpecialtyCategory(value);
                  setSelectedSubSpecialty("");
                  setSelectedSpecificArea("");
                  setOrderFormData(prev => ({ ...prev, mainSpecialty: value, subSpecialty: "", doctorId: "", doctorName: "" }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select medical specialty category" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(medicalSpecialties).map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedSpecialtyCategory && (
              <div className="space-y-2">
                <Label htmlFor="subSpecialty">Sub-Specialty</Label>
                <Select 
                  value={selectedSubSpecialty}
                  onValueChange={(value) => {
                    setSelectedSubSpecialty(value);
                    setSelectedSpecificArea("");
                    setOrderFormData(prev => ({ ...prev, subSpecialty: value, doctorId: "", doctorName: "" }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select sub-specialty" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(medicalSpecialties[selectedSpecialtyCategory as keyof typeof medicalSpecialties] || {}).map((subSpecialty) => (
                      <SelectItem key={subSpecialty} value={subSpecialty}>
                        {subSpecialty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="doctor">Select Doctor</Label>
              <Select 
                value={orderFormData.doctorId} 
                onValueChange={(value) => {
                  const selectedDoctor = doctors.find((d: any) => d.id.toString() === value);
                  setOrderFormData(prev => ({ 
                    ...prev, 
                    doctorId: value,
                    doctorName: selectedDoctor ? `Dr. ${selectedDoctor.firstName} ${selectedDoctor.lastName}` : ''
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a doctor" />
                </SelectTrigger>
                <SelectContent>
                  {(medicalStaffLoading || filteredDoctorsLoading) ? (
                    <SelectItem value="loading" disabled>Loading doctors...</SelectItem>
                  ) : doctors.length > 0 ? (
                    doctors.map((doctor: any) => (
                      <SelectItem key={doctor.id} value={doctor.id.toString()}>
                        Dr. {doctor.firstName} {doctor.lastName}
                        {doctor.medicalSpecialtyCategory && ` - ${doctor.medicalSpecialtyCategory}`}
                        {doctor.subSpecialty && ` (${doctor.subSpecialty})`}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      {selectedSpecialtyCategory || selectedSubSpecialty 
                        ? `No doctors available for ${selectedSubSpecialty || selectedSpecialtyCategory}` 
                        : "No doctors available"
                      }
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="testType">Test Type</Label>
              <Select value={orderFormData.testType} onValueChange={(value) => setOrderFormData(prev => ({ ...prev, testType: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select test type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Complete Blood Count (CBC)">Complete Blood Count (CBC)</SelectItem>
                  <SelectItem value="Basic Metabolic Panel">Basic Metabolic Panel</SelectItem>
                  <SelectItem value="Comprehensive Metabolic Panel">Comprehensive Metabolic Panel</SelectItem>
                  <SelectItem value="Lipid Panel">Lipid Panel</SelectItem>
                  <SelectItem value="Liver Function Tests">Liver Function Tests</SelectItem>
                  <SelectItem value="Thyroid Function Tests">Thyroid Function Tests</SelectItem>
                  <SelectItem value="Hemoglobin A1C">Hemoglobin A1C</SelectItem>
                  <SelectItem value="Urinalysis">Urinalysis</SelectItem>
                  <SelectItem value="Vitamin D">Vitamin D</SelectItem>
                  <SelectItem value="Iron Studies">Iron Studies</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
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
            <div className="space-y-2">
              <Label htmlFor="notes">Clinical Notes</Label>
              <Textarea
                id="notes"
                placeholder="Enter clinical notes or special instructions"
                value={orderFormData.notes}
                onChange={(e) => setOrderFormData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowOrderDialog(false)} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  createLabOrderMutation.mutate({
                    patientId: parseInt(orderFormData.patientId),
                    testType: orderFormData.testType,
                    priority: orderFormData.priority,
                    notes: orderFormData.notes,
                    doctorId: orderFormData.doctorId ? parseInt(orderFormData.doctorId) : null,
                    doctorName: orderFormData.doctorName,
                    mainSpecialty: orderFormData.mainSpecialty,
                    subSpecialty: orderFormData.subSpecialty
                  });
                }}
                disabled={createLabOrderMutation.isPending || !orderFormData.patientId || !orderFormData.testType || !orderFormData.doctorId}
                className="flex-1 bg-medical-blue hover:bg-blue-700"
              >
                {createLabOrderMutation.isPending ? "Ordering..." : "Order Test"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Lab Result Dialog */}
      <Dialog open={showViewDialog} onOpenChange={(open) => {
        setShowViewDialog(open);
        if (!open) {
          setIsEditMode(false);
          setEditFormData({});
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DialogTitle className="text-xl font-bold">
                  Lab Result Details
                </DialogTitle>
                {selectedResult && (
                  <Badge 
                    variant={
                      selectedResult.status === 'completed' ? 'default' : 
                      selectedResult.status === 'pending' ? 'secondary' : 
                      selectedResult.status === 'processing' ? 'outline' : 'destructive'
                    }
                  >
                    {selectedResult.status}
                  </Badge>
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
                      <p className="text-sm text-gray-300">Test:</p>
                      {isEditMode ? (
                        <Select 
                          value={editFormData.testType || selectedResult.testType} 
                          onValueChange={(value) => setEditFormData((prev: any) => ({ ...prev, testType: value }))}
                        >
                          <SelectTrigger className="bg-white text-black">
                            <SelectValue placeholder="Select test type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Complete Blood Count (CBC)">Complete Blood Count (CBC)</SelectItem>
                            <SelectItem value="Basic Metabolic Panel">Basic Metabolic Panel</SelectItem>
                            <SelectItem value="Comprehensive Metabolic Panel">Comprehensive Metabolic Panel</SelectItem>
                            <SelectItem value="Lipid Panel">Lipid Panel</SelectItem>
                            <SelectItem value="Liver Function Tests">Liver Function Tests</SelectItem>
                            <SelectItem value="Thyroid Function Tests">Thyroid Function Tests</SelectItem>
                            <SelectItem value="Hemoglobin A1C">Hemoglobin A1C</SelectItem>
                            <SelectItem value="Urinalysis">Urinalysis</SelectItem>
                            <SelectItem value="Vitamin D">Vitamin D</SelectItem>
                            <SelectItem value="Iron Studies">Iron Studies</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="font-medium">{selectedResult.testType}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-gray-300">Test ID:</p>
                      <p className="font-medium">{selectedResult.testId}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-300">Ordered:</p>
                      <p className="font-medium">{format(new Date(selectedResult.orderedAt), "MMM dd, yyyy HH:mm")}</p>
                    </div>
                  </div>
                </div>

                {/* Notes Section */}
                <div className="bg-gray-100 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-600 mb-2">Notes</h3>
                  {isEditMode ? (
                    <Textarea
                      value={editFormData.notes !== undefined ? editFormData.notes : (selectedResult.notes || "")}
                      onChange={(e) => setEditFormData((prev: any) => ({ ...prev, notes: e.target.value }))}
                      placeholder="Enter clinical notes or special instructions"
                      rows={3}
                      className="w-full"
                    />
                  ) : (
                    <p className="text-sm">{selectedResult.notes || "No notes"}</p>
                  )}
                </div>

                {/* Test Results */}
                {selectedResult.results && selectedResult.results.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Test Results</h3>
                    <div className="space-y-3">
                      {selectedResult.results.map((result: any, index: number) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex justify-between items-center">
                            <div className="flex-1">
                              <p className="font-medium">{result.name}</p>
                              <p className="text-sm text-gray-600">Reference Range: {result.referenceRange}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-semibold">{result.value} {result.unit}</p>
                              <Badge 
                                variant={
                                  result.status === 'normal' ? 'default' : 
                                  result.status === 'abnormal_high' || result.status === 'abnormal_low' ? 'secondary' : 
                                  'destructive'
                                }
                                className="ml-2"
                              >
                                {result.status.replace('_', ' ')}
                              </Badge>
                            </div>
                          </div>
                          {result.flag && (
                            <p className="text-sm text-yellow-600 mt-2">⚠️ {result.flag}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Section - Doctor Information */}
              <div className="bg-blue-50 p-6 rounded-lg h-fit">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-blue-900">
                      {isEditMode && editFormData.doctorName ? editFormData.doctorName : (selectedResult.doctorName || "Dr. Usman Gardezi")}
                    </h3>
                    {isEditMode && (
                      <Select 
                        value={editFormData.doctorName || selectedResult.doctorName || ""} 
                        onValueChange={(value) => setEditFormData((prev: any) => ({ ...prev, doctorName: value }))}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Select doctor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Dr. Usman Gardezi">Dr. Usman Gardezi</SelectItem>
                          <SelectItem value="Dr. John Smith">Dr. John Smith</SelectItem>
                          <SelectItem value="Dr. Sarah Williams">Dr. Sarah Williams</SelectItem>
                          <SelectItem value="Dr. Ali Raza">Dr. Ali Raza</SelectItem>
                          <SelectItem value="Dr. Sarah Suleman">Dr. Sarah Suleman</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-600">Main Specialization:</p>
                    {isEditMode ? (
                      <Select 
                        value={editFormData.mainSpecialty || selectedResult.mainSpecialty || ""} 
                        onValueChange={(value) => setEditFormData((prev: any) => ({ ...prev, mainSpecialty: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select main specialization" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Surgical Specialties">Surgical Specialties</SelectItem>
                          <SelectItem value="Medical Specialties">Medical Specialties</SelectItem>
                          <SelectItem value="Diagnostic Specialties">Diagnostic Specialties</SelectItem>
                          <SelectItem value="Emergency Medicine">Emergency Medicine</SelectItem>
                          <SelectItem value="Primary Care">Primary Care</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-gray-600 font-medium">{selectedResult.mainSpecialty || "Surgical Specialties"}</p>
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-600">Sub-Specialization:</p>
                    {isEditMode ? (
                      <Select 
                        value={editFormData.subSpecialty || selectedResult.subSpecialty || ""} 
                        onValueChange={(value) => setEditFormData((prev: any) => ({ ...prev, subSpecialty: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select sub-specialization" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Orthopedic Surgeon">Orthopedic Surgeon</SelectItem>
                          <SelectItem value="Cardiovascular Surgeon">Cardiovascular Surgeon</SelectItem>
                          <SelectItem value="Neurosurgeon">Neurosurgeon</SelectItem>
                          <SelectItem value="General Surgeon">General Surgeon</SelectItem>
                          <SelectItem value="Plastic Surgeon">Plastic Surgeon</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-gray-600 font-medium">{selectedResult.subSpecialty || "Orthopedic Surgeon"}</p>
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-medium text-blue-600">Priority:</p>
                    {isEditMode ? (
                      <Select 
                        value={editFormData.priority || selectedResult.priority} 
                        onValueChange={(value) => setEditFormData((prev: any) => ({ ...prev, priority: value }))}
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
                      <p className="text-green-600 font-medium capitalize">{selectedResult.priority}</p>
                    )}
                  </div>

                  {selectedResult.criticalValues && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4">
                      <p className="text-red-800 font-medium text-sm">⚠️ Critical Values Alert</p>
                      <p className="text-red-600 text-xs">This result contains critical values that require immediate attention.</p>
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
                  {updateLabResultMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setShowViewDialog(false)}>
                  Close
                </Button>
                <Button variant="outline" onClick={handleStartEdit}>
                  Edit
                </Button>
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
                    <span className="text-white text-sm font-bold">{getPatientName(selectedResult.patientId).charAt(0)}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{getPatientName(selectedResult.patientId)}</h3>
                    <p className="text-sm text-gray-600">Patient ID: {selectedResult.patientId}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Test Information</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Test Type:</span>
                      <span className="font-medium">{selectedResult.testType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ordered By:</span>
                      <span className="font-medium">{selectedResult.orderedBy}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <Badge 
                        variant={
                          selectedResult.status === 'completed' ? 'default' : 
                          selectedResult.status === 'pending' ? 'secondary' : 'outline'
                        }
                      >
                        {selectedResult.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Completed:</span>
                      <span className="font-medium">
                        {selectedResult.completedAt ? format(new Date(selectedResult.completedAt), "PPP") : "Not completed"}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Clinical Review</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="reviewed" className="rounded" />
                      <Label htmlFor="reviewed" className="text-sm">Results reviewed by physician</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="interpreted" className="rounded" />
                      <Label htmlFor="interpreted" className="text-sm">Clinical interpretation complete</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="actions" className="rounded" />
                      <Label htmlFor="actions" className="text-sm">Follow-up actions identified</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="approved" className="rounded" />
                      <Label htmlFor="approved" className="text-sm">Approved for patient sharing</Label>
                    </div>
                  </div>
                </div>
              </div>

              {selectedResult.results && selectedResult.results.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Test Results Summary</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedResult.results.slice(0, 4).map((result: any, index: number) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-sm">{result.name}</span>
                          <Badge 
                            variant={result.status === 'normal' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {result.status}
                          </Badge>
                        </div>
                        <div className="text-lg font-semibold mt-1">{result.value} {result.unit}</div>
                        <div className="text-xs text-gray-600">Ref: {result.referenceRange}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="physicianNotes" className="text-sm font-medium">Physician Notes</Label>
                <Textarea
                  id="physicianNotes"
                  placeholder="Add clinical interpretation, recommendations, or follow-up instructions..."
                  className="mt-2"
                  rows={3}
                />
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
                    Cancel
                  </Button>
                  <Button variant="outline" onClick={() => handleDownloadResult(selectedResult.id)}>
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
                        message: `Lab results for ${selectedResult.testType} are now available for review.`
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
                Share results for <strong>{getPatientName(selectedResult.patientId)}</strong>
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
                      onChange={(e) => setShareFormData(prev => ({ ...prev, method: e.target.value }))}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="email" className="text-sm">Email</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="whatsapp"
                      name="method"
                      value="whatsapp"
                      checked={shareFormData.method === "whatsapp"}
                      onChange={(e) => setShareFormData(prev => ({ ...prev, method: e.target.value }))}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="whatsapp" className="text-sm">WhatsApp</Label>
                  </div>
                </div>
              </div>

              {shareFormData.method === "email" && (
                <div className="space-y-2">
                  <Label htmlFor="emailAddress" className="text-sm font-medium">Email Address</Label>
                  <Input
                    id="emailAddress"
                    type="email"
                    placeholder="patient@example.com"
                    value={shareFormData.email}
                    onChange={(e) => setShareFormData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
              )}

              {shareFormData.method === "whatsapp" && (
                <div className="space-y-2">
                  <Label htmlFor="whatsappNumber" className="text-sm font-medium">WhatsApp Number</Label>
                  <Input
                    id="whatsappNumber"
                    type="tel"
                    placeholder="+44 7XXX XXXXXX"
                    value={shareFormData.whatsapp}
                    onChange={(e) => setShareFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="shareMessage" className="text-sm font-medium">Message</Label>
                <Textarea
                  id="shareMessage"
                  placeholder="Add a personal message..."
                  value={shareFormData.message}
                  onChange={(e) => setShareFormData(prev => ({ ...prev, message: e.target.value }))}
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
                      title: "Results Shared",
                      description: `Lab results sent to ${getPatientName(selectedResult.patientId)} via ${method} (${contact})`,
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
                  Send Results
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Lab Result Prescription Dialog */}
      <Dialog open={showPrescriptionDialog} onOpenChange={setShowPrescriptionDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-xl font-bold">Lab Result Prescription</DialogTitle>
          </DialogHeader>
          
          {selectedResult && (
            <div className="prescription-content space-y-6 py-4" id="prescription-print">
              {/* Header */}
              <div className="text-center border-b pb-4">
                <h1 className="text-2xl font-bold text-medical-blue">CURA EMR SYSTEM</h1>
                <p className="text-sm text-gray-600">Laboratory Test Prescription</p>
              </div>

              {/* Doctor and Patient Information */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-800 border-b">Physician Information</h3>
                  <div className="space-y-1 text-sm">
                    <p><strong>Name:</strong> {selectedResult.doctorName || 'Doctor'}</p>
                    {selectedResult.mainSpecialty && (
                      <p><strong>Main Specialization:</strong> {selectedResult.mainSpecialty}</p>
                    )}
                    {selectedResult.subSpecialty && (
                      <p><strong>Sub-Specialization:</strong> {selectedResult.subSpecialty}</p>
                    )}
                    {selectedResult.priority && (
                      <p><strong>Priority:</strong> {selectedResult.priority}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-800 border-b">Patient Information</h3>
                  <div className="space-y-1 text-sm">
                    <p><strong>Name:</strong> {getPatientName(selectedResult.patientId)}</p>
                    <p><strong>Patient ID:</strong> {selectedResult.patientId}</p>
                    <p><strong>Date:</strong> {format(new Date(), 'MMM dd, yyyy')}</p>
                    <p><strong>Time:</strong> {format(new Date(), 'HH:mm')}</p>
                  </div>
                </div>
              </div>

              {/* Prescription Details */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-800 text-lg border-b pb-2">℞ Laboratory Test Prescription</h3>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Test ID:</p>
                      <p className="font-mono">{selectedResult.testId}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Test Type:</p>
                      <p className="font-semibold text-blue-800">{selectedResult.testType}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Ordered Date:</p>
                      <p>{format(new Date(selectedResult.orderedAt), 'MMM dd, yyyy HH:mm')}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Status:</p>
                      <Badge className={getStatusColor(selectedResult.status)}>
                        {selectedResult.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>

                  {selectedResult.results && selectedResult.results.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700 mb-3">Test Results:</p>
                      <div className="space-y-2">
                        {selectedResult.results.map((testResult: any, index: number) => (
                          <div key={index} className="bg-white border rounded p-3">
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-medium text-gray-900">{testResult.name}</span>
                              <Badge className={getResultStatusColor(testResult.status)}>
                                {testResult.status.replace('_', ' ').toUpperCase()}
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-700">
                              <p><strong>Value:</strong> {testResult.value} {testResult.unit}</p>
                              <p><strong>Reference Range:</strong> {testResult.referenceRange}</p>
                              {testResult.flag && (
                                <p><strong>Flag:</strong> {testResult.flag}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedResult.notes && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm font-medium text-gray-700 mb-2">Clinical Notes:</p>
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
                      <span className="font-semibold">CRITICAL VALUES DETECTED</span>
                    </div>
                    <p className="text-sm text-red-700 mt-2">
                      This lab result contains critical values that require immediate attention.
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t pt-4 mt-6">
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <p>Generated by Cura EMR System</p>
                  <p>Date: {format(new Date(), 'MMM dd, yyyy HH:mm')}</p>
                </div>
                <div className="mt-4 text-center">
                  <div className="border-t border-gray-300 w-64 mx-auto mb-2"></div>
                  <p className="text-sm font-medium">{selectedResult.doctorName || 'Doctor'}</p>
                  {selectedResult.mainSpecialty && (
                    <p className="text-xs text-gray-600">{selectedResult.mainSpecialty}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center pt-4 border-t">
            <Button variant="outline" onClick={() => setShowPrescriptionDialog(false)}>
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
    </>
  );
}