import React, { useState, useEffect, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PrescriptionWarnings from "./prescription-warnings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { FileText, Plus, Calendar, User, Stethoscope, Pill, AlertTriangle, Mic, Square, Heart, Thermometer, Activity, Weight, Ruler, Calculator, History, Eye, ClipboardCheck, FileSpreadsheet, BookOpen, X, Printer, Save, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import type { MedicalRecord } from "@/types";
import anatomicalDiagramImage from "@assets/2_1754469563272.png";
import facialMuscleImage from "@assets/generated_images/Updated_facial_muscle_diagram.png";
import facialOutlineImage from "@assets/generated_images/Clean_facial_outline_v2.png";
const FullConsultationInterface = React.lazy(() => 
  import("@/components/consultation/full-consultation-interface").then(module => ({
    default: module.FullConsultationInterface
  }))
);

const consultationSchema = z.object({
  type: z.enum(["consultation", "prescription", "lab_result", "imaging", "procedure"]),
  title: z.string().min(1, "Title is required"),
  notes: z.string().min(10, "Notes must be at least 10 characters"),
  diagnosis: z.string().optional(),
  treatment: z.string().optional(),
  medications: z.array(z.object({
    name: z.string(),
    dosage: z.string(),
    frequency: z.string(),
    duration: z.string(),
    instructions: z.string().optional()
  })).optional(),
  followUpRequired: z.boolean().optional(),
  followUpDate: z.string().optional(),
  referrals: z.array(z.object({
    specialist: z.string(),
    reason: z.string(),
    urgency: z.enum(["routine", "urgent", "emergency"])
  })).optional(),
  // New vital signs fields
  bloodPressureSystolic: z.string().optional(),
  bloodPressureDiastolic: z.string().optional(),
  heartRate: z.string().optional(),
  temperature: z.string().optional(),
  respiratoryRate: z.string().optional(),
  oxygenSaturation: z.string().optional(),
  weight: z.string().optional(),
  height: z.string().optional(),
  bmi: z.string().optional()
});

interface ConsultationNotesProps {
  patientId: number;
  patientName?: string;
  patientNumber?: string;
}

export default function ConsultationNotes({ patientId, patientName, patientNumber }: ConsultationNotesProps) {
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("vitals");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Vital signs state
  const [vitals, setVitals] = useState({
    bloodPressureSystolic: "",
    bloodPressureDiastolic: "",
    heartRate: "",
    temperature: "",
    respiratoryRate: "",
    oxygenSaturation: "",
    weight: "",
    height: "",
    bmi: ""
  });

  // Clinical notes state
  const [selectedExaminationType, setSelectedExaminationType] = useState<string>("");
  const [clinicalNotes, setClinicalNotes] = useState<string>("");
  const [diagnosis, setDiagnosis] = useState<string>("");
  const [treatmentPlan, setTreatmentPlan] = useState<string>("");
  const [showAnatomicalViewer, setShowAnatomicalViewer] = useState(false);
  
  // Audio transcription state
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = React.useRef<SpeechRecognition | null>(null);
  const [isTranscriptionSupported, setIsTranscriptionSupported] = useState(false);

  // Anatomical analysis state
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>("");
  const [selectedAnalysisType, setSelectedAnalysisType] = useState<string>("");
  const [selectedTreatment, setSelectedTreatment] = useState<string>("");
  const [selectedTreatmentIntensity, setSelectedTreatmentIntensity] = useState<string>("");
  const [selectedSessionFrequency, setSelectedSessionFrequency] = useState<string>("");
  const [selectedSymptom, setSelectedSymptom] = useState<string>("");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("");
  const [selectedFollowUp, setSelectedFollowUp] = useState<string>("");
  const [generatedTreatmentPlan, setGeneratedTreatmentPlan] = useState<string>("");
  const [isGeneratingPlan, setIsGeneratingPlan] = useState<boolean>(false);
  const [isSavingAnalysis, setIsSavingAnalysis] = useState<boolean>(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const anatomicalImages = [facialMuscleImage, facialOutlineImage];

  const [medicalRecords, setMedicalRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [patient, setPatient] = useState<any>(null);

  // Define muscle coordinates for each anatomical image separately
  const muscleCoordinatesForImages = {
    // Image 0: Labeled muscle diagram (horizontal layout, includes neck)
    0: {
      frontalis: { x: 50, y: 18 },        // Top center forehead
      temporalis: { x: 28, y: 25 },       // Left side temple area
      corrugator_supercilii: { x: 43, y: 23 }, // Between eyebrows
      procerus: { x: 50, y: 28 },         // Center between eyebrows
      orbicularis_oculi: { x: 38, y: 32 }, // Around eye area
      levator_labii_superioris: { x: 46, y: 42 }, // Upper lip elevator
      zygomaticus_major: { x: 32, y: 48 }, // Cheek muscle (major)
      zygomaticus_minor: { x: 42, y: 45 }, // Cheek muscle (minor)
      masseter: { x: 28, y: 58 },         // Jaw muscle
      buccinator: { x: 38, y: 52 },       // Cheek muscle
      orbicularis_oris: { x: 50, y: 58 }, // Around mouth
      mentalis: { x: 50, y: 68 },         // Chin muscle
      depressor_anguli_oris: { x: 46, y: 62 }, // Lower mouth corner
      depressor_labii_inferioris: { x: 48, y: 65 }, // Lower lip depressor
      platysma: { x: 42, y: 75 }          // Neck muscle
    },
    // Image 1: Clean outline (vertical layout, more focused on face)
    1: {
      frontalis: { x: 50, y: 12 },        // Top center forehead
      temporalis: { x: 22, y: 28 },       // Left side temple area
      corrugator_supercilii: { x: 42, y: 22 }, // Between eyebrows
      procerus: { x: 50, y: 26 },         // Center between eyebrows
      orbicularis_oculi: { x: 35, y: 30 }, // Around eye area
      levator_labii_superioris: { x: 45, y: 45 }, // Upper lip elevator
      zygomaticus_major: { x: 28, y: 52 }, // Cheek muscle (major)
      zygomaticus_minor: { x: 38, y: 48 }, // Cheek muscle (minor)
      masseter: { x: 22, y: 62 },         // Jaw muscle
      buccinator: { x: 32, y: 55 },       // Cheek muscle
      orbicularis_oris: { x: 50, y: 62 }, // Around mouth
      mentalis: { x: 50, y: 75 },         // Chin muscle
      depressor_anguli_oris: { x: 45, y: 68 }, // Lower mouth corner
      depressor_labii_inferioris: { x: 42, y: 72 }, // Lower lip depressor
      platysma: { x: 38, y: 82 }          // Neck muscle
    }
  };

  const navigateImage = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentImageIndex(prev => prev === 0 ? anatomicalImages.length - 1 : prev - 1);
    } else {
      setCurrentImageIndex(prev => (prev + 1) % anatomicalImages.length);
    }
  };

  // Generate comprehensive treatment plan
  const generateTreatmentPlan = async () => {
    if (!selectedMuscleGroup || !selectedAnalysisType || !selectedTreatment) {
      toast({
        title: "Missing Information",
        description: "Please select muscle group, analysis type, and treatment before generating plan.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingPlan(true);
    
    const treatmentPlan = `
COMPREHENSIVE FACIAL MUSCLE TREATMENT PLAN

Patient: ${patientName || 'Patient'}
Date: ${format(new Date(), 'MMMM dd, yyyy')}

TARGET ANALYSIS:
• Muscle Group: ${selectedMuscleGroup.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
• Analysis Type: ${selectedAnalysisType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
• Primary Treatment: ${selectedTreatment.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}

TREATMENT PROTOCOL:
1. Initial Assessment & Baseline Documentation
2. Pre-treatment Preparation & Patient Consultation
3. ${selectedTreatment.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Implementation
4. Post-treatment Monitoring & Assessment
5. Follow-up Care & Progress Evaluation

EXPECTED OUTCOMES:
• Improved muscle function and symmetry
• Reduced symptoms and enhanced patient comfort
• Optimized aesthetic and functional results
• Long-term maintenance planning

NEXT STEPS:
• Schedule follow-up appointment in 1-2 weeks
• Monitor patient response and adjust treatment as needed
• Document progress with photographic evidence
• Review treatment effectiveness and make modifications if required

Generated on: ${format(new Date(), 'PPpp')}
`;

    setGeneratedTreatmentPlan(treatmentPlan);
    setIsGeneratingPlan(false);
    
    toast({
      title: "Treatment Plan Generated",
      description: "Comprehensive treatment plan has been created successfully.",
    });
  };

  // Save anatomical analysis as medical record
  const saveAnalysis = async () => {
    if (!selectedMuscleGroup || !selectedAnalysisType) {
      toast({
        title: "Missing Information",
        description: "Please select at least muscle group and analysis type before saving.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingAnalysis(true);
    
    try {
      const analysisData = {
        type: "consultation",
        title: `Anatomical Analysis - ${selectedMuscleGroup.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
        notes: `FACIAL MUSCLE ANALYSIS REPORT

Patient: ${patientName || 'Patient'}
Date: ${format(new Date(), 'MMMM dd, yyyy')}

ANALYSIS DETAILS:
• Target Muscle Group: ${selectedMuscleGroup.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
• Analysis Type: ${selectedAnalysisType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
${selectedTreatment ? `• Primary Treatment: ${selectedTreatment.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}` : ''}

CLINICAL OBSERVATIONS:
- Comprehensive anatomical assessment completed
- Interactive muscle group identification performed
- Professional analysis methodology applied

${generatedTreatmentPlan ? `\nTREATMENT PLAN:\n${generatedTreatmentPlan}` : ''}

Analysis completed on: ${format(new Date(), 'PPpp')}`,
        diagnosis: `Anatomical analysis of ${selectedMuscleGroup.replace(/_/g, ' ')} - ${selectedAnalysisType.replace(/_/g, ' ')}`,
        treatment: selectedTreatment ? selectedTreatment.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : undefined
      };

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/patients/${patientId}/records`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': 'demo',
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(analysisData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Refresh medical records by re-fetching them
      const refreshResponse = await fetch(`/api/patients/${patientId}/records`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': 'demo',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (refreshResponse.ok) {
        const refreshedData = await refreshResponse.json();
        setMedicalRecords(refreshedData || []);
      }
      
      toast({
        title: "Analysis Saved",
        description: "Anatomical analysis has been saved to medical records successfully.",
      });

      // Reset the form
      setSelectedMuscleGroup("");
      setSelectedAnalysisType("");
      setSelectedTreatment("");
      setGeneratedTreatmentPlan("");
      setShowAnatomicalViewer(false);
      
    } catch (error) {
      console.error('Error saving analysis:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save anatomical analysis. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingAnalysis(false);
    }
  };

  // Calculate BMI
  const calculateBMI = () => {
    const heightInCm = parseFloat(vitals.height);
    const weightInKg = parseFloat(vitals.weight);
    
    if (heightInCm > 0 && weightInKg > 0) {
      const heightInM = heightInCm / 100;
      const bmiValue = (weightInKg / (heightInM * heightInM)).toFixed(1);
      setVitals(prev => ({ ...prev, bmi: bmiValue }));
    }
  };

  // Fetch patient data
  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        setIsTranscriptionSupported(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript + ' ';
            }
          }
          if (finalTranscript) {
            setTranscript(prev => prev + finalTranscript);
            setClinicalNotes(prev => prev + finalTranscript);
          }
        };

        recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          toast({
            title: "Transcription Error",
            description: "Unable to transcribe audio. Please try again.",
            variant: "destructive",
          });
          setIsRecording(false);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [toast]);

  const startRecording = () => {
    if (recognitionRef.current && !isRecording) {
      setTranscript("");
      recognitionRef.current.start();
      setIsRecording(true);
      toast({
        title: "Recording Started",
        description: "Speak clearly to transcribe your clinical notes",
      });
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      toast({
        title: "Recording Stopped",
        description: "Transcription has been added to your clinical notes",
      });
    }
  };

  useEffect(() => {
    const fetchPatientData = async () => {
      if (!patientId) return;
      
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/patients/${patientId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Tenant-Subdomain': 'demo',
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        
        if (response.ok) {
          const patientData = await response.json();
          setPatient(patientData);
        }
      } catch (error) {
        console.error("Error fetching patient data:", error);
      }
    };

    fetchPatientData();
  }, [patientId]);

  useEffect(() => {
    const fetchMedicalRecords = async () => {
      if (!patientId) return;
      
      try {
        setIsLoading(true);
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/patients/${patientId}/records`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Tenant-Subdomain': 'demo',
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        setMedicalRecords(data || []);
      } catch (err) {
        console.error("Error fetching medical records:", err);
        setMedicalRecords([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMedicalRecords();
  }, [patientId]);

  const form = useForm({
    defaultValues: {
      type: "consultation",
      title: "",
      notes: "",
      diagnosis: "",
      treatment: "",
      medications: [],
      followUpRequired: false,
      followUpDate: "",
      referrals: [],
      ...vitals
    }
  });

  const [isSavingRecord, setIsSavingRecord] = useState(false);

  const saveRecord = async (data: any, isDraft: boolean = false) => {
    try {
      setIsSavingRecord(true);
      
      const recordData = {
        type: "consultation",
        title: isDraft ? "Draft Consultation" : "Full Consultation",
        notes: `CONSULTATION RECORD\n\nPatient: ${patientName}\nDate: ${format(new Date(), 'MMMM dd, yyyy')}\nStatus: ${isDraft ? 'Draft' : 'Completed'}\n\nVITAL SIGNS:\n- Blood Pressure: ${vitals.bloodPressureSystolic}/${vitals.bloodPressureDiastolic} mmHg\n- Heart Rate: ${vitals.heartRate} bpm\n- Temperature: ${vitals.temperature}°C\n- Respiratory Rate: ${vitals.respiratoryRate} /min\n- O2 Saturation: ${vitals.oxygenSaturation}%\n- Weight: ${vitals.weight} kg\n- Height: ${vitals.height} cm\n- BMI: ${vitals.bmi}`,
        diagnosis: data.diagnosis || "",
        treatment: data.treatment || "",
        metadata: {
          vitals: vitals,
          isDraft: isDraft,
          consultationType: "full_consultation",
          sessionInfo: {
            startTime: new Date().toISOString(),
            duration: 0
          }
        }
      };
      
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/patients/${patientId}/records`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Tenant-Subdomain': 'demo'
        },
        credentials: 'include',
        body: JSON.stringify(recordData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const newRecord = await response.json();
      setMedicalRecords(prev => [newRecord, ...prev]);
      
      if (!isDraft) {
        setIsAddingNote(false);
        // Reset form and vitals
        setVitals({
          bloodPressureSystolic: "",
          bloodPressureDiastolic: "",
          heartRate: "",
          temperature: "",
          respiratoryRate: "",
          oxygenSaturation: "",
          weight: "",
          height: "",
          bmi: ""
        });
        form.reset();
      }
      
      toast({
        title: isDraft ? "Draft saved successfully" : "Consultation completed successfully",
        description: isDraft ? "The consultation draft has been saved." : "The consultation record has been saved to the patient's file.",
      });
    } catch (error: any) {
      toast({
        title: "Error saving record",
        description: error.message || "Failed to save the consultation record. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingRecord(false);
    }
  };

  const handleSaveDraft = () => {
    saveRecord(form.getValues(), true);
  };

  const handleCompleteConsultation = () => {
    saveRecord(form.getValues(), false);
  };

  const handleCancel = () => {
    setIsAddingNote(false);
    setEditingRecord(null);
    setActiveTab("vitals");
    setVitals({
      bloodPressureSystolic: "",
      bloodPressureDiastolic: "",
      heartRate: "",
      temperature: "",
      respiratoryRate: "",
      oxygenSaturation: "",
      weight: "",
      height: "",
      bmi: ""
    });
    form.reset();
  };

  const handlePrintSummary = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Consultation Summary</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              h1, h2 { color: #333; }
              .vitals { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 20px 0; }
              .vital-item { padding: 10px; border: 1px solid #ddd; }
            </style>
          </head>
          <body>
            <h1>Consultation Summary</h1>
            <p><strong>Patient:</strong> ${patientName || 'Unknown'}</p>
            <p><strong>Date:</strong> ${format(new Date(), 'MMMM dd, yyyy')}</p>
            <h2>Vital Signs</h2>
            <div class="vitals">
              <div class="vital-item"><strong>Blood Pressure:</strong> ${vitals.bloodPressureSystolic}/${vitals.bloodPressureDiastolic} mmHg</div>
              <div class="vital-item"><strong>Heart Rate:</strong> ${vitals.heartRate} bpm</div>
              <div class="vital-item"><strong>Temperature:</strong> ${vitals.temperature}°C</div>
              <div class="vital-item"><strong>Respiratory Rate:</strong> ${vitals.respiratoryRate} /min</div>
              <div class="vital-item"><strong>O2 Saturation:</strong> ${vitals.oxygenSaturation}%</div>
              <div class="vital-item"><strong>Weight:</strong> ${vitals.weight} kg</div>
              <div class="vital-item"><strong>Height:</strong> ${vitals.height} cm</div>
              <div class="vital-item"><strong>BMI:</strong> ${vitals.bmi}</div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const getRecordIcon = (type: string) => {
    switch (type) {
      case "consultation": return <Stethoscope className="h-4 w-4" />;
      case "prescription": return <Pill className="h-4 w-4" />;
      case "lab_result": return <FileText className="h-4 w-4" />;
      case "imaging": return <FileText className="h-4 w-4" />;
      case "procedure": return <FileText className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getRecordColor = (type: string) => {
    switch (type) {
      case "consultation": return "bg-blue-100 text-blue-800";
      case "prescription": return "bg-green-100 text-green-800";
      case "lab_result": return "bg-yellow-100 text-yellow-800";
      case "imaging": return "bg-purple-100 text-purple-800";
      case "procedure": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Medical Records & Consultation Notes
            </CardTitle>
            {patientName && (
              <p className="text-sm text-muted-foreground dark:text-neutral-300 mt-1">
                {patientName} • Patient ID: {patientNumber}
              </p>
            )}
          </div>
          <Button onClick={() => setIsAddingNote(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Record
          </Button>
          
          <Suspense fallback={<div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
            <FullConsultationInterface 
              open={isAddingNote} 
              onOpenChange={setIsAddingNote} 
              patient={patient}
              patientName={patientName}
            />
          </Suspense>




        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {medicalRecords.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-neutral-400">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No medical records found</p>
              <p className="text-sm">Click "Add Record" to create the first medical record.</p>
            </div>
          ) : (
            medicalRecords.map((record: any) => (
              <Card key={record.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getRecordIcon(record.type)}
                      <h4 className="font-semibold">{record.title}</h4>
                    </div>
                    <Badge className={getRecordColor(record.type)}>
                      {record.type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-gray-500 dark:text-neutral-400 flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(record.createdAt), "MMM d, yyyy 'at' h:mm a")}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setEditingRecord(record);
                        setIsAddingNote(true);
                      }}
                    >
                      Edit Medical Record
                    </Button>
                  </div>

                  {record.notes && (
                    <div className="mb-3">
                      <p className="text-sm text-gray-700 dark:text-neutral-300">{record.notes}</p>
                    </div>
                  )}

                  {record.diagnosis && (
                    <div className="mb-3">
                      <h5 className="font-medium text-sm mb-1 dark:text-white">Diagnosis:</h5>
                      <p className="text-sm text-gray-700 dark:text-neutral-300">{record.diagnosis}</p>
                    </div>
                  )}

                  {record.treatment && (
                    <div className="mb-3">
                      <h5 className="font-medium text-sm mb-1 dark:text-white">Treatment:</h5>
                      <p className="text-sm text-gray-700 dark:text-neutral-300">{record.treatment}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}