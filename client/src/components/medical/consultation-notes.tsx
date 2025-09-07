import React, { useState, useEffect } from "react";
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
import facialMuscleImage from "@assets/generated_images/Medical_facial_muscle_diagram_ae7b35b5.png";
import facialOutlineImage from "@assets/generated_images/Clean_facial_anatomy_outline_4b91e595.png";

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
  const [generatedTreatmentPlan, setGeneratedTreatmentPlan] = useState<string>("");
  const [isGeneratingPlan, setIsGeneratingPlan] = useState<boolean>(false);
  const [isSavingAnalysis, setIsSavingAnalysis] = useState<boolean>(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const anatomicalImages = [facialMuscleImage, facialOutlineImage];

  const [medicalRecords, setMedicalRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [patient, setPatient] = useState<any>(null);

  // Define muscle coordinates for interactive highlighting
  const muscleCoordinates = {
    frontalis: { x: 350, y: 120 },
    temporalis: { x: 180, y: 200 },
    corrugator_supercilii: { x: 300, y: 160 },
    procerus: { x: 350, y: 200 },
    orbicularis_oculi: { x: 280, y: 220 },
    levator_labii_superioris: { x: 320, y: 280 },
    zygomaticus_major: { x: 250, y: 320 },
    zygomaticus_minor: { x: 290, y: 300 },
    masseter: { x: 200, y: 380 },
    buccinator: { x: 240, y: 350 },
    orbicularis_oris: { x: 350, y: 400 },
    mentalis: { x: 350, y: 450 },
    depressor_anguli_oris: { x: 320, y: 420 },
    depressor_labii_inferioris: { x: 340, y: 430 }
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
          <Dialog open={isAddingNote} onOpenChange={(open) => {
            console.log("🔥 MEDICAL RECORD DIALOG STATE CHANGE:", open);
            setIsAddingNote(open);
            if (!open) {
              console.log("🔥 CLEARING EDITING RECORD");
              handleCancel();
            }
          }} modal={true}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Record
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-7xl h-[90vh] overflow-y-auto" id="medical-record-dialog">
              <DialogHeader className="pb-4">
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <Stethoscope className="h-6 w-6 text-blue-600" />
                  Full Consultation Interface
                  <Badge variant="secondary" className="ml-auto">
                    Patient: {patientName || 'Patient 165'}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="flex h-full gap-4 overflow-hidden">
                {/* Left Sidebar - Patient Information */}
                <div className="w-80 bg-gray-50 dark:bg-gray-800 rounded-lg p-4 overflow-y-auto">
                  <div className="space-y-6">
                    {/* Patient Information */}
                    <div>
                      <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Patient Information
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div>
                          <h4 className="font-semibold text-lg">{patientName || 'Patient 165'}</h4>
                          <p className="text-muted-foreground">Age: {patient?.dateOfBirth ? new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear() : '35'} years</p>
                          <p className="text-muted-foreground">DOB: {patient?.dateOfBirth ? format(new Date(patient.dateOfBirth), 'dd/MM/yyyy') : '01/01/1990'}</p>
                        </div>
                        <Separator className="my-3" />
                        <div>
                          <p className="text-muted-foreground">Contact: {patient?.phone || 'Not provided'}</p>
                          <p className="text-muted-foreground">Email: {patient?.email || 'Not provided'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div>
                      <h4 className="font-semibold mb-3">Quick Actions</h4>
                      <div className="space-y-2">
                        <Button variant="ghost" className="w-full justify-start" size="sm">
                          <History className="h-4 w-4 mr-2" />
                          Medical History
                        </Button>
                        <Button variant="ghost" className="w-full justify-start" size="sm">
                          <Calendar className="h-4 w-4 mr-2" />
                          Previous Visits
                        </Button>
                        <Button variant="ghost" className="w-full justify-start" size="sm">
                          <Pill className="h-4 w-4 mr-2" />
                          Current Medications
                        </Button>
                        <Button variant="ghost" className="w-full justify-start text-orange-600" size="sm">
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          Allergies & Alerts
                        </Button>
                      </div>
                    </div>

                    {/* Session Info */}
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Session Info
                      </h4>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p><strong>Started:</strong> {format(new Date(), 'HH:mm')}</p>
                        <p><strong>Date:</strong> {format(new Date(), 'dd/MM/yyyy')}</p>
                        <p><strong>Duration:</strong> 0 mins</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
                    <TabsList className="grid w-full grid-cols-6 mb-4">
                      <TabsTrigger value="vitals" className="flex items-center gap-1">
                        <Heart className="h-4 w-4" />
                        Vitals
                      </TabsTrigger>
                      <TabsTrigger value="history" className="flex items-center gap-1">
                        <History className="h-4 w-4" />
                        History
                      </TabsTrigger>
                      <TabsTrigger value="examination" className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        Examination
                      </TabsTrigger>
                      <TabsTrigger value="assessment" className="flex items-center gap-1">
                        <ClipboardCheck className="h-4 w-4" />
                        Assessment
                      </TabsTrigger>
                      <TabsTrigger value="plan" className="flex items-center gap-1">
                        <FileSpreadsheet className="h-4 w-4" />
                        Plan
                      </TabsTrigger>
                      <TabsTrigger value="summary" className="flex items-center gap-1">
                        <BookOpen className="h-4 w-4" />
                        Summary
                      </TabsTrigger>
                    </TabsList>

                    {/* Vitals Tab Content */}
                    <TabsContent value="vitals" className="flex-1 overflow-y-auto space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <Heart className="h-5 w-5 text-red-500" />
                            Vital Signs Recording
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-3 gap-4">
                            {/* Blood Pressure */}
                            <div className="space-y-2">
                              <Label className="flex items-center gap-2 text-sm font-medium">
                                <Heart className="h-4 w-4 text-red-500" />
                                Blood Pressure (mmHg)
                              </Label>
                              <div className="flex gap-1">
                                <Input
                                  placeholder="128"
                                  value={vitals.bloodPressureSystolic}
                                  onChange={(e) => setVitals(prev => ({ ...prev, bloodPressureSystolic: e.target.value }))}
                                  className="w-16"
                                />
                                <span className="flex items-center">/</span>
                                <Input
                                  placeholder="80"
                                  value={vitals.bloodPressureDiastolic}
                                  onChange={(e) => setVitals(prev => ({ ...prev, bloodPressureDiastolic: e.target.value }))}
                                  className="w-16"
                                />
                              </div>
                            </div>

                            {/* Heart Rate */}
                            <div className="space-y-2">
                              <Label className="flex items-center gap-2 text-sm font-medium">
                                <Activity className="h-4 w-4 text-green-500" />
                                Heart Rate (bpm)
                              </Label>
                              <Input
                                placeholder="72"
                                value={vitals.heartRate}
                                onChange={(e) => setVitals(prev => ({ ...prev, heartRate: e.target.value }))}
                              />
                            </div>

                            {/* Temperature */}
                            <div className="space-y-2">
                              <Label className="flex items-center gap-2 text-sm font-medium">
                                <Thermometer className="h-4 w-4 text-blue-500" />
                                Temperature (°C)
                              </Label>
                              <Input
                                placeholder="37.0"
                                value={vitals.temperature}
                                onChange={(e) => setVitals(prev => ({ ...prev, temperature: e.target.value }))}
                              />
                            </div>

                            {/* Respiratory Rate */}
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Respiratory Rate (/min)</Label>
                              <Input
                                placeholder="16"
                                value={vitals.respiratoryRate}
                                onChange={(e) => setVitals(prev => ({ ...prev, respiratoryRate: e.target.value }))}
                              />
                            </div>

                            {/* O2 Saturation */}
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">O2 Saturation (%)</Label>
                              <Input
                                placeholder="98"
                                value={vitals.oxygenSaturation}
                                onChange={(e) => setVitals(prev => ({ ...prev, oxygenSaturation: e.target.value }))}
                              />
                            </div>

                            {/* Weight */}
                            <div className="space-y-2">
                              <Label className="flex items-center gap-2 text-sm font-medium">
                                <Weight className="h-4 w-4 text-purple-500" />
                                Weight (kg)
                              </Label>
                              <Input
                                placeholder="70.0"
                                value={vitals.weight}
                                onChange={(e) => setVitals(prev => ({ ...prev, weight: e.target.value }))}
                              />
                            </div>

                            {/* Height */}
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Height (cm)</Label>
                              <Input
                                placeholder="175"
                                value={vitals.height}
                                onChange={(e) => setVitals(prev => ({ ...prev, height: e.target.value }))}
                              />
                            </div>

                            {/* BMI */}
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">BMI</Label>
                              <div className="flex gap-2">
                                <Input
                                  placeholder="Calculated"
                                  value={vitals.bmi}
                                  readOnly
                                  className="flex-1"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={calculateBMI}
                                  className="px-3"
                                >
                                  <Calculator className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* Other Tab Contents (Placeholder for now) */}
                    <TabsContent value="history" className="flex-1 overflow-y-auto">
                      <Card>
                        <CardHeader>
                          <CardTitle>Medical History</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-muted-foreground">Medical history content will be displayed here.</p>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="examination" className="flex-1 overflow-y-auto space-y-6">
                      {/* Examination Section */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Examination</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <Label htmlFor="examination-type">Select examination type</Label>
                            <Select
                              value={selectedExaminationType}
                              onValueChange={(value) => {
                                setSelectedExaminationType(value);
                                if (value === "anatomical") {
                                  setShowAnatomicalViewer(true);
                                }
                              }}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select examination type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="general">General Examination</SelectItem>
                                <SelectItem value="cardiovascular">Cardiovascular</SelectItem>
                                <SelectItem value="respiratory">Respiratory</SelectItem>
                                <SelectItem value="neurological">Neurological</SelectItem>
                                <SelectItem value="anatomical" className="flex items-center gap-2">
                                  <div className="flex items-center gap-2">
                                    🏋️ Anatomical (View Muscles)
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Clinical Notes Section */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between">
                            Clinical Notes
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={isRecording ? stopRecording : startRecording}
                              disabled={!isTranscriptionSupported}
                              className={`flex items-center gap-2 ${isRecording ? 'bg-red-50 border-red-200 text-red-700' : ''}`}
                            >
                              {isRecording ? (
                                <>
                                  <Square className="h-4 w-4" />
                                  Stop Recording
                                </>
                              ) : (
                                <>
                                  <Mic className="h-4 w-4" />
                                  Transcribe Audio
                                </>
                              )}
                            </Button>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <Label htmlFor="clinical-notes">Detailed consultation notes, observations, and findings. Click 'Transcribe Audio' to dictate your notes.</Label>
                            <Textarea
                              id="clinical-notes"
                              placeholder="Enter detailed clinical notes, observations, and examination findings..."
                              value={clinicalNotes}
                              onChange={(e) => setClinicalNotes(e.target.value)}
                              className="min-h-[120px] resize-y"
                            />
                          </div>
                        </CardContent>
                      </Card>

                      {/* Diagnosis and Treatment Plan Row */}
                      <div className="grid grid-cols-2 gap-6">
                        {/* Diagnosis */}
                        <Card>
                          <CardHeader>
                            <CardTitle>Diagnosis</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              <Label htmlFor="diagnosis">Primary and secondary diagnoses with ICD codes...</Label>
                              <Textarea
                                id="diagnosis"
                                placeholder="Enter primary and secondary diagnoses with ICD codes..."
                                value={diagnosis}
                                onChange={(e) => setDiagnosis(e.target.value)}
                                className="min-h-[120px] resize-y"
                              />
                            </div>
                          </CardContent>
                        </Card>

                        {/* Treatment Plan */}
                        <Card>
                          <CardHeader>
                            <CardTitle>Treatment Plan</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              <Label htmlFor="treatment-plan">Treatment recommendations and care plan...</Label>
                              <Textarea
                                id="treatment-plan"
                                placeholder="Enter treatment recommendations and care plan..."
                                value={treatmentPlan}
                                onChange={(e) => setTreatmentPlan(e.target.value)}
                                className="min-h-[120px] resize-y"
                              />
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>

                    <TabsContent value="assessment" className="flex-1 overflow-y-auto">
                      <Card>
                        <CardHeader>
                          <CardTitle>Clinical Assessment</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-muted-foreground">Clinical assessment and diagnosis will be documented here.</p>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="plan" className="flex-1 overflow-y-auto">
                      <Card>
                        <CardHeader>
                          <CardTitle>Treatment Plan</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-muted-foreground">Treatment plan and management will be outlined here.</p>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="summary" className="flex-1 overflow-y-auto">
                      <Card>
                        <CardHeader>
                          <CardTitle>Consultation Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-muted-foreground">Complete consultation summary will be generated here.</p>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>

                  {/* Professional Anatomical Analysis Dialog */}
                  {showAnatomicalViewer && (
                    <Dialog open={showAnatomicalViewer} onOpenChange={setShowAnatomicalViewer}>
                      <DialogContent className="max-w-7xl h-[95vh] overflow-y-auto">
                        <DialogHeader>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setShowAnatomicalViewer(false)}>
                              ←
                            </Button>
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm">
                                ℹ
                              </div>
                              <div>
                                <DialogTitle className="text-lg font-semibold text-blue-600">
                                  Professional Anatomical Analysis
                                </DialogTitle>
                                <p className="text-sm text-muted-foreground">
                                  Advanced facial muscle analysis with optimized container spacing
                                </p>
                              </div>
                            </div>
                          </div>
                        </DialogHeader>
                        
                        {/* Main Anatomical Interface */}
                        <div className="space-y-6">
                          {/* Anatomical Diagram Section */}
                          <div className="relative bg-gray-50 rounded-lg p-6">
                            <div className="flex items-center justify-center relative">
                              {/* Left Navigation Arrow */}
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="absolute left-4 z-10 bg-blue-600 text-white hover:bg-blue-700"
                                onClick={() => navigateImage('prev')}
                              >
                                ←
                              </Button>
                              
                              {/* Facial Diagram */}
                              <div className="relative mx-20">
                                <img 
                                  src={anatomicalImages[currentImageIndex]} 
                                  alt={currentImageIndex === 0 ? "Facial Muscle Diagram with Labels" : "Clean Facial Anatomy Outline"} 
                                  className="w-full max-w-lg border rounded-lg bg-white shadow-sm"
                                />
                                
                                {/* Interactive Muscle Points - Only show on muscle diagram */}
                                {currentImageIndex === 0 && Object.entries(muscleCoordinates).map(([muscleName, coords]) => (
                                  <button
                                    key={muscleName}
                                    className={`absolute w-4 h-4 rounded-full border-2 transform -translate-x-1/2 -translate-y-1/2 transition-all hover:scale-125 hover:z-10 ${
                                      selectedMuscleGroup === muscleName 
                                        ? 'bg-blue-600 border-blue-800 shadow-lg z-10' 
                                        : 'bg-red-500 border-red-700 hover:bg-red-600'
                                    }`}
                                    style={{ 
                                      left: `${(coords.x / 700) * 100}%`, 
                                      top: `${(coords.y / 500) * 100}%` 
                                    }}
                                    onClick={() => setSelectedMuscleGroup(muscleName)}
                                    title={muscleName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                  />
                                ))}
                              </div>
                              
                              {/* Right Navigation Arrow */}
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="absolute right-4 z-10 bg-blue-600 text-white hover:bg-blue-700"
                                onClick={() => navigateImage('next')}
                              >
                                →
                              </Button>
                            </div>
                            
                            {/* Reference View Button */}
                            <div className="flex justify-center mt-4">
                              <Button 
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => setCurrentImageIndex(currentImageIndex === 0 ? 1 : 0)}
                              >
                                ● {currentImageIndex === 0 ? 'Anatomical Reference View' : 'Professional Medical Anatomical Diagram'}
                              </Button>
                            </div>
                          </div>
                          
                          {/* Analysis Sections Grid */}
                          <div className="grid grid-cols-2 gap-6">
                            {/* Left Column - Facial Muscle Analysis */}
                            <div className="space-y-4">
                              <Card>
                                <CardHeader>
                                  <CardTitle className="text-blue-600">Facial Muscle Analysis</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                  {/* Target Muscle Group */}
                                  <div>
                                    <Label className="text-sm font-medium">Target Muscle Group</Label>
                                    <Select value={selectedMuscleGroup || ''} onValueChange={setSelectedMuscleGroup}>
                                      <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select muscle group" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="frontalis">Frontalis (Forehead)</SelectItem>
                                        <SelectItem value="temporalis">Temporalis</SelectItem>
                                        <SelectItem value="corrugator_supercilii">Corrugator Supercilii</SelectItem>
                                        <SelectItem value="procerus">Procerus</SelectItem>
                                        <SelectItem value="orbicularis_oculi">Orbicularis Oculi</SelectItem>
                                        <SelectItem value="levator_labii_superioris">Levator Labii Superioris</SelectItem>
                                        <SelectItem value="zygomaticus_major">Zygomaticus Major</SelectItem>
                                        <SelectItem value="zygomaticus_minor">Zygomaticus Minor</SelectItem>
                                        <SelectItem value="masseter">Masseter</SelectItem>
                                        <SelectItem value="buccinator">Buccinator</SelectItem>
                                        <SelectItem value="orbicularis_oris">Orbicularis Oris</SelectItem>
                                        <SelectItem value="mentalis">Mentalis</SelectItem>
                                        <SelectItem value="depressor_anguli_oris">Depressor Anguli Oris</SelectItem>
                                        <SelectItem value="depressor_labii_inferioris">Depressor Labii Inferioris</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  
                                  {/* Analysis Type */}
                                  <div>
                                    <Label className="text-sm font-medium">Analysis Type</Label>
                                    <Select value={selectedAnalysisType} onValueChange={setSelectedAnalysisType}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select analysis type" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="symmetry_assessment">Symmetry Assessment</SelectItem>
                                        <SelectItem value="function_evaluation">Function Evaluation</SelectItem>
                                        <SelectItem value="aesthetic_analysis">Aesthetic Analysis</SelectItem>
                                        <SelectItem value="treatment_planning">Treatment Planning</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                            
                            {/* Right Column - Treatment Options */}
                            <div className="space-y-4">
                              <Card>
                                <CardHeader>
                                  <CardTitle className="text-blue-600">Treatment Options</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                  {/* Primary Treatment */}
                                  <div>
                                    <Label className="text-sm font-medium">Primary Treatment</Label>
                                    <Select value={selectedTreatment} onValueChange={setSelectedTreatment}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select primary treatment" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="botulinum_toxin">Botulinum Toxin</SelectItem>
                                        <SelectItem value="dermal_fillers">Dermal Fillers</SelectItem>
                                        <SelectItem value="muscle_therapy">Muscle Therapy</SelectItem>
                                        <SelectItem value="surgical_intervention">Surgical Intervention</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  
                                  {/* Treatment Intensity */}
                                  <div>
                                    <Label className="text-sm font-medium">Treatment Intensity</Label>
                                    <Select>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select intensity level" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="light">Light</SelectItem>
                                        <SelectItem value="moderate">Moderate</SelectItem>
                                        <SelectItem value="intensive">Intensive</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  
                                  {/* Session Frequency */}
                                  <div>
                                    <Label className="text-sm font-medium">Session Frequency</Label>
                                    <Select>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select frequency" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="weekly">Weekly</SelectItem>
                                        <SelectItem value="biweekly">Bi-weekly</SelectItem>
                                        <SelectItem value="monthly">Monthly</SelectItem>
                                        <SelectItem value="quarterly">Quarterly</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          </div>
                          
                          {/* Bottom Analysis Sections */}
                          <div className="grid grid-cols-3 gap-4">
                            {/* Symptom Assessment */}
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-purple-600 text-base">Symptom Assessment</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <Textarea 
                                  placeholder="Primary symptoms"
                                  className="min-h-[100px] text-sm"
                                />
                              </CardContent>
                            </Card>
                            
                            {/* Severity Scale */}
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-orange-600 text-base">Severity Scale</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <Textarea 
                                  placeholder="Rate severity"
                                  className="min-h-[100px] text-sm"
                                />
                              </CardContent>
                            </Card>
                            
                            {/* Follow-up Plan */}
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-teal-600 text-base">Follow-up Plan</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <Textarea 
                                  placeholder="Follow-up timeline"
                                  className="min-h-[100px] text-sm"
                                />
                              </CardContent>
                            </Card>
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex justify-center gap-4 pt-4">
                            <Button 
                              onClick={generateTreatmentPlan}
                              disabled={!selectedMuscleGroup || !selectedAnalysisType || !selectedTreatment || isGeneratingPlan}
                              className="bg-green-600 hover:bg-green-700 text-white px-6"
                            >
                              {isGeneratingPlan ? 'Generating...' : 'Generate Treatment Plan'}
                            </Button>
                            <Button 
                              onClick={saveAnalysis}
                              disabled={!selectedMuscleGroup || !selectedAnalysisType || isSavingAnalysis}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                            >
                              {isSavingAnalysis ? 'Saving...' : 'Save Analysis'}
                            </Button>
                            <Button 
                              variant="outline" 
                              onClick={() => setShowAnatomicalViewer(false)}
                              className="px-6"
                            >
                              Close Analysis
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}

                  {/* Bottom Action Buttons */}
                  <div className="flex justify-between items-center pt-4 border-t bg-white dark:bg-gray-900">
                    <Button variant="outline" onClick={handleCancel} className="flex items-center gap-2">
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                    
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={handlePrintSummary} className="flex items-center gap-2">
                        <Printer className="h-4 w-4" />
                        Print Summary
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={handleSaveDraft}
                        disabled={isSavingRecord}
                        className="flex items-center gap-2"
                      >
                        <Save className="h-4 w-4" />
                        Save Draft
                      </Button>
                      <Button 
                        onClick={handleCompleteConsultation}
                        disabled={isSavingRecord}
                        className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Complete Consultation
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
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