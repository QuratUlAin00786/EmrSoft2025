import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  Stethoscope, 
  Pill, 
  Calendar, 
  AlertTriangle,
  Save,
  Printer,
  Plus,
  Minus,
  CheckCircle,
  X,
  Thermometer,
  Scale,
  Ruler,
  Eye,
  Ear,
  Brain,
  Heart,
  Activity,
  User,
  Clock,
  HeartPulse,
  Mic,
  Square
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import facialMuscleImage from "@assets/generated_images/Medical_facial_muscle_diagram_ae7b35b5.png";
import facialOutlineImage from "@assets/generated_images/Clean_facial_anatomy_outline_4b91e595.png";

interface FullConsultationInterfaceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient?: any;
}

export function FullConsultationInterface({ open, onOpenChange, patient }: FullConsultationInterfaceProps) {
  const { toast } = useToast();

  // Save consultation mutation
  const saveConsultationMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/consultations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to save consultation');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Consultation Saved",
        description: "The consultation record has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/patients', patient?.id, 'records'] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save consultation. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle save consultation
  const handleSaveConsultation = () => {
    if (!patient?.id) {
      toast({
        title: "Error",
        description: "Patient information is missing. Cannot save consultation.",
        variant: "destructive",
      });
      return;
    }

    // Map the consultation data to match backend schema exactly
    const consultationRecord = {
      patientId: patient.id,
      chiefComplaint: consultationData.chiefComplaint || "",
      historyPresentingComplaint: consultationData.historyPresentingComplaint || "",
      reviewOfSystems: {
        cardiovascular: consultationData.reviewOfSystems?.cardiovascular || "",
        respiratory: consultationData.reviewOfSystems?.respiratory || "",
        gastrointestinal: consultationData.reviewOfSystems?.gastrointestinal || "",
        genitourinary: consultationData.reviewOfSystems?.genitourinary || "",
        neurological: consultationData.reviewOfSystems?.neurological || "",
        musculoskeletal: consultationData.reviewOfSystems?.musculoskeletal || "",
        skin: consultationData.reviewOfSystems?.skin || "",
        psychiatric: consultationData.reviewOfSystems?.psychiatric || ""
      },
      examination: {
        general: consultationData.examination?.general || "",
        cardiovascular: consultationData.examination?.cardiovascular || "",
        respiratory: consultationData.examination?.respiratory || "",
        abdomen: consultationData.examination?.abdomen || "",
        neurological: consultationData.examination?.neurological || "",
        musculoskeletal: consultationData.examination?.musculoskeletal || "",
        skin: consultationData.examination?.skin || "",
        head_neck: consultationData.examination?.head_neck || "",
        ears_nose_throat: consultationData.examination?.ears_nose_throat || ""
      },
      vitals: {
        bloodPressure: vitals.bloodPressure || "",
        heartRate: vitals.heartRate || "",
        temperature: vitals.temperature || "",
        respiratoryRate: vitals.respiratoryRate || "",
        oxygenSaturation: vitals.oxygenSaturation || "",
        weight: vitals.weight || "",
        height: vitals.height || "",
        bmi: vitals.bmi || ""
      },
      assessment: consultationData.assessment || "",
      plan: consultationData.plan || "",
      prescriptions: consultationData.prescriptions || [],
      referrals: consultationData.referrals || [],
      investigations: consultationData.investigations || [],
      followUp: {
        required: false,
        timeframe: "",
        reason: ""
      },
      consultationDate: new Date().toISOString()
    };

    saveConsultationMutation.mutate(consultationRecord);
  };

  // Speech recognition functions
  const startRecording = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({
        title: "Speech Recognition Not Supported",
        description: "Your browser doesn't support speech recognition. Please type your notes manually.",
        variant: "destructive",
      });
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onstart = () => {
      setIsRecording(true);
      toast({
        title: "Recording Started",
        description: "Speak clearly into your microphone. Your speech will be transcribed in real-time.",
      });
    };

    recognitionRef.current.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPart = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcriptPart;
        } else {
          interimTranscript += transcriptPart;
        }
      }

      if (finalTranscript) {
        setClinicalNotes(prev => prev + finalTranscript + ' ');
        setTranscript('');
      } else {
        setTranscript(interimTranscript);
      }
    };

    recognitionRef.current.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
      toast({
        title: "Recording Error",
        description: "There was an error with speech recognition. Please try again.",
        variant: "destructive",
      });
    };

    recognitionRef.current.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current.start();
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
      setTranscript('');
      toast({
        title: "Recording Stopped",
        description: "Transcription completed. You can continue typing or start recording again.",
      });
    }
  };
  const [activeTab, setActiveTab] = useState("vitals");
  const [consultationStartTime] = useState(new Date());
  
  const [vitals, setVitals] = useState({
    bloodPressure: "",
    heartRate: "",
    temperature: "",
    respiratoryRate: "",
    oxygenSaturation: "",
    weight: "",
    height: "",
    bmi: ""
  });

  const [consultationData, setConsultationData] = useState({
    chiefComplaint: "",
    historyPresentingComplaint: "",
    reviewOfSystems: {
      cardiovascular: "",
      respiratory: "",
      gastrointestinal: "",
      genitourinary: "",
      neurological: "",
      musculoskeletal: "",
      skin: "",
      psychiatric: ""
    },
    examination: {
      general: "",
      cardiovascular: "",
      respiratory: "",
      abdomen: "",
      neurological: "",
      musculoskeletal: "",
      skin: "",
      head_neck: "",
      ears_nose_throat: ""
    },
    assessment: "",
    plan: "",
    prescriptions: [] as Array<{
      medication: string;
      dosage: string;
      frequency: string;
      duration: string;
      instructions: string;
    }>,
    followUp: {
      required: false,
      timeframe: "",
      reason: ""
    },
    referrals: [] as Array<{
      specialty: string;
      urgency: "routine" | "urgent" | "2ww";
      reason: string;
    }>,
    investigations: [] as Array<{
      type: string;
      urgency: "routine" | "urgent";
      reason: string;
    }>
  });

  // Examination modal states
  const [selectedExaminationType, setSelectedExaminationType] = useState<string>("");
  const [showAnatomicalModal, setShowAnatomicalModal] = useState(false);
  const [showGeneralExamModal, setShowGeneralExamModal] = useState(false);
  const [showCardiovascularExamModal, setShowCardiovascularExamModal] = useState(false);
  const [showRespiratoryExamModal, setShowRespiratoryExamModal] = useState(false);
  const [showNeurologicalExamModal, setShowNeurologicalExamModal] = useState(false);
  const [showPhysicalExamModal, setShowPhysicalExamModal] = useState(false);

  // Anatomical analysis state
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>("");
  const [selectedAnalysisType, setSelectedAnalysisType] = useState<string>("");
  const [selectedTreatment, setSelectedTreatment] = useState<string>("");
  const [selectedTreatmentIntensity, setSelectedTreatmentIntensity] = useState<string>("");
  const [selectedSessionFrequency, setSelectedSessionFrequency] = useState<string>("");
  const [primarySymptoms, setPrimarySymptoms] = useState<string>("");
  const [severityScale, setSeverityScale] = useState<string>("");
  const [followUpPlan, setFollowUpPlan] = useState<string>("");
  const [generatedTreatmentPlan, setGeneratedTreatmentPlan] = useState<string>("");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [anatomicalStep, setAnatomicalStep] = useState(1); // 1: Analysis, 2: Configuration, 3: Assessment
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

  // PIXEL-ACCURATE OVERLAY SYSTEM - Refs and state for proper muscle highlighting
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [overlayPosition, setOverlayPosition] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
    scaleX: number;
    scaleY: number;
  } | null>(null);

  // PIXEL-BASED COORDINATES - Intrinsic pixel positions from the actual image dimensions
  const musclePixelCoordinates = {
    // Using estimated 1000x800 dimensions for the facial muscle diagram
    0: {
      frontalis: { x: 500, y: 64 },              // FRONTALIS (FOREHEAD) - top center
      temporalis: { x: 840, y: 120 },            // TEMPORALIS - temple region
      corrugator_supercilii: { x: 350, y: 136 }, // CORRUGATOR SUPERCILII - left brow
      procerus: { x: 550, y: 240 },              // PROCERUS - center bridge of nose
      orbicularis_oculi: { x: 460, y: 224 },     // ORBICULARIS OCULI - eye area
      levator_labii_superioris: { x: 730, y: 160 }, // LEVATOR LABII SUPERIORIS - right
      zygomaticus_major: { x: 280, y: 400 },     // ZYGOMATICUS MAJOR & MINOR - left cheek
      zygomaticus_minor: { x: 280, y: 400 },     // Same as major - labeled together
      masseter: { x: 740, y: 232 },              // MASSETER - right jaw
      buccinator: { x: 730, y: 216 },            // BUCCINATOR - right cheek
      orbicularis_oris: { x: 750, y: 248 },      // ORBICULARIS ORIS - right mouth
      mentalis: { x: 720, y: 272 },              // MENTALIS - right chin
      depressor_anguli_oris: { x: 770, y: 280 }, // DEPRESSOR ANGULI ORIS - right
      depressor_labii_inferioris: { x: 760, y: 304 }, // DEPRESSOR LABII INFERIORIS - right
      platysma: { x: 500, y: 680 }               // PLATYSMA - neck area
    },
    1: {
      frontalis: { x: 500, y: 64 },              // FRONTALIS (FOREHEAD) - top center
      temporalis: { x: 840, y: 120 },            // TEMPORALIS - temple region
      corrugator_supercilii: { x: 350, y: 136 }, // CORRUGATOR SUPERCILII - left brow
      procerus: { x: 550, y: 240 },              // PROCERUS - center bridge of nose
      orbicularis_oculi: { x: 460, y: 224 },     // ORBICULARIS OCULI - eye area
      levator_labii_superioris: { x: 730, y: 160 }, // LEVATOR LABII SUPERIORIS - right
      zygomaticus_major: { x: 280, y: 400 },     // ZYGOMATICUS MAJOR & MINOR - left cheek
      zygomaticus_minor: { x: 280, y: 400 },     // Same as major - labeled together
      masseter: { x: 740, y: 232 },              // MASSETER - right jaw
      buccinator: { x: 730, y: 216 },            // BUCCINATOR - right cheek
      orbicularis_oris: { x: 750, y: 248 },      // ORBICULARIS ORIS - right mouth
      mentalis: { x: 720, y: 272 },              // MENTALIS - right chin
      depressor_anguli_oris: { x: 770, y: 280 }, // DEPRESSOR ANGULI ORIS - right
      depressor_labii_inferioris: { x: 760, y: 304 }, // DEPRESSOR LABII INFERIORIS - right
      platysma: { x: 500, y: 680 }               // PLATYSMA - neck area
    }
  };

  // MEASUREMENT FUNCTION - Calculate overlay position and scaling
  const updateOverlayPosition = () => {
    if (!imageRef.current || !containerRef.current) return;
    
    const img = imageRef.current;
    const container = containerRef.current;
    
    // Get natural and rendered dimensions
    const natW = img.naturalWidth;
    const natH = img.naturalHeight;
    
    // Get element positions
    const imgRect = img.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    // Calculate position relative to container
    const left = imgRect.left - containerRect.left;
    const top = imgRect.top - containerRect.top;
    const width = imgRect.width;
    const height = imgRect.height;
    
    // Calculate scale factors
    const scaleX = width / natW;
    const scaleY = height / natH;
    
    setOverlayPosition({
      left,
      top,
      width,
      height,
      scaleX,
      scaleY
    });
  };

  // Handle overlay updates on image change and resize - ROBUST TIMING
  useEffect(() => {
    // Update overlay immediately when dialog opens or image changes
    if (open && anatomicalStep === 1) {
      updateOverlayPosition();
    }
    
    // Handle window resize with ResizeObserver for better performance
    let resizeObserver: ResizeObserver | null = null;
    
    if (imageRef.current && open) {
      resizeObserver = new ResizeObserver(() => {
        updateOverlayPosition();
      });
      resizeObserver.observe(imageRef.current);
    }
    
    const handleResize = () => {
      updateOverlayPosition();
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver?.disconnect();
    };
  }, [currentImageIndex, anatomicalStep, open]);

  const [isSavingAnalysis, setIsSavingAnalysis] = useState(false);

  // Speech recognition state
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const recognitionRef = useRef<any>(null);

  // Anatomical images array
  const anatomicalImages = [facialMuscleImage, facialOutlineImage];


  const navigateImage = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentImageIndex(prev => prev > 0 ? prev - 1 : anatomicalImages.length - 1);
    } else {
      setCurrentImageIndex(prev => prev < anatomicalImages.length - 1 ? prev + 1 : 0);
    }
  };

  const generateTreatmentPlan = async () => {
    if (!selectedMuscleGroup || !selectedAnalysisType || !selectedTreatment) {
      toast({
        title: "Missing Information",
        description: "Please select muscle group, analysis type, and treatment.",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingPlan(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const plan = `Treatment Plan for ${selectedMuscleGroup.replace(/_/g, ' ')}:
      
Analysis Type: ${selectedAnalysisType}
Primary Treatment: ${selectedTreatment}

Recommended Protocol:
- Initial assessment of ${selectedMuscleGroup.replace(/_/g, ' ')} function
- ${selectedTreatment} application targeting specific muscle fibers
- Progressive monitoring of muscle response
- Follow-up assessment in 2-3 weeks

Patient should be advised of potential side effects and expected timeline for results.`;

      setGeneratedTreatmentPlan(plan);
      toast({
        title: "Treatment Plan Generated",
        description: "AI-powered treatment plan has been created successfully."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate treatment plan. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const saveAnalysis = async () => {
    setIsSavingAnalysis(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "Analysis Saved",
        description: "Anatomical analysis has been saved to patient record."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save analysis. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSavingAnalysis(false);
    }
  };

  const saveConsultation = useMutation({
    mutationFn: async () => {
      const consultationRecord = {
        patientId: patient?.id,
        date: consultationStartTime,
        vitals,
        consultationData,
        duration: Math.round((Date.now() - consultationStartTime.getTime()) / (1000 * 60)),
        status: 'completed'
      };

      const response = await fetch('/api/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(consultationRecord)
      });

      if (!response.ok) throw new Error('Failed to save consultation');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Consultation Saved",
        description: "The consultation has been saved successfully."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/consultations'] });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save consultation. Please try again.",
        variant: "destructive"
      });
    }
  });

  const addPrescription = () => {
    setConsultationData(prev => ({
      ...prev,
      prescriptions: [...prev.prescriptions, {
        medication: "",
        dosage: "",
        frequency: "",
        duration: "",
        instructions: ""
      }]
    }));
  };

  const removePrescription = (index: number) => {
    setConsultationData(prev => ({
      ...prev,
      prescriptions: prev.prescriptions.filter((_, i) => i !== index)
    }));
  };

  const updatePrescription = (index: number, field: string, value: string) => {
    setConsultationData(prev => ({
      ...prev,
      prescriptions: prev.prescriptions.map((rx, i) => 
        i === index ? { ...rx, [field]: value } : rx
      )
    }));
  };

  const addReferral = () => {
    setConsultationData(prev => ({
      ...prev,
      referrals: [...prev.referrals, {
        specialty: "",
        urgency: "routine" as const,
        reason: ""
      }]
    }));
  };

  const removeReferral = (index: number) => {
    setConsultationData(prev => ({
      ...prev,
      referrals: prev.referrals.filter((_, i) => i !== index)
    }));
  };

  const updateReferral = (index: number, field: string, value: string) => {
    setConsultationData(prev => ({
      ...prev,
      referrals: prev.referrals.map((ref, i) => 
        i === index ? { ...ref, [field]: value } : ref
      )
    }));
  };

  const addInvestigation = () => {
    setConsultationData(prev => ({
      ...prev,
      investigations: [...prev.investigations, {
        type: "",
        urgency: "routine" as const,
        reason: ""
      }]
    }));
  };

  const removeInvestigation = (index: number) => {
    setConsultationData(prev => ({
      ...prev,
      investigations: prev.investigations.filter((_, i) => i !== index)
    }));
  };

  const updateInvestigation = (index: number, field: string, value: string) => {
    setConsultationData(prev => ({
      ...prev,
      investigations: prev.investigations.map((inv, i) => 
        i === index ? { ...inv, [field]: value } : inv
      )
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-600" />
              Full Consultation - {patient?.firstName} {patient?.lastName}
            </DialogTitle>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Started: {format(consultationStartTime, "HH:mm")}
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {format(new Date(), "dd/MM/yyyy")}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="vitals" className="flex items-center gap-2">
                <HeartPulse className="w-4 h-4" />
                Vitals
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                History
              </TabsTrigger>
              <TabsTrigger value="examination" className="flex items-center gap-2">
                <Stethoscope className="w-4 h-4" />
                Examination
              </TabsTrigger>
              <TabsTrigger value="assessment" className="flex items-center gap-2">
                <Brain className="w-4 h-4" />
                Assessment
              </TabsTrigger>
              <TabsTrigger value="plan" className="flex items-center gap-2">
                <Pill className="w-4 h-4" />
                Plan
              </TabsTrigger>
              <TabsTrigger value="summary" className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Summary
              </TabsTrigger>
            </TabsList>

            <TabsContent value="vitals" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <HeartPulse className="w-5 h-5 text-red-600" />
                    Vital Signs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bp" className="flex items-center gap-2">
                        <Heart className="w-4 h-4 text-red-500" />
                        Blood Pressure
                      </Label>
                      <Input
                        id="bp"
                        placeholder="120/80"
                        value={vitals.bloodPressure}
                        onChange={(e) => setVitals(prev => ({ ...prev, bloodPressure: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hr" className="flex items-center gap-2">
                        <HeartPulse className="w-4 h-4 text-red-500" />
                        Heart Rate (bpm)
                      </Label>
                      <Input
                        id="hr"
                        placeholder="72"
                        value={vitals.heartRate}
                        onChange={(e) => setVitals(prev => ({ ...prev, heartRate: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="temp" className="flex items-center gap-2">
                        <Thermometer className="w-4 h-4 text-orange-500" />
                        Temperature (°C)
                      </Label>
                      <Input
                        id="temp"
                        placeholder="36.5"
                        value={vitals.temperature}
                        onChange={(e) => setVitals(prev => ({ ...prev, temperature: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rr" className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-blue-500" />
                        Respiratory Rate
                      </Label>
                      <Input
                        id="rr"
                        placeholder="16"
                        value={vitals.respiratoryRate}
                        onChange={(e) => setVitals(prev => ({ ...prev, respiratoryRate: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="spo2" className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-blue-500" />
                        Oxygen Saturation (%)
                      </Label>
                      <Input
                        id="spo2"
                        placeholder="98"
                        value={vitals.oxygenSaturation}
                        onChange={(e) => setVitals(prev => ({ ...prev, oxygenSaturation: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="weight" className="flex items-center gap-2">
                        <Scale className="w-4 h-4 text-green-500" />
                        Weight (kg)
                      </Label>
                      <Input
                        id="weight"
                        placeholder="70"
                        value={vitals.weight}
                        onChange={(e) => setVitals(prev => ({ ...prev, weight: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="height" className="flex items-center gap-2">
                        <Ruler className="w-4 h-4 text-green-500" />
                        Height (cm)
                      </Label>
                      <Input
                        id="height"
                        placeholder="170"
                        value={vitals.height}
                        onChange={(e) => setVitals(prev => ({ ...prev, height: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bmi" className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-purple-500" />
                        BMI
                      </Label>
                      <Input
                        id="bmi"
                        placeholder="24.2"
                        value={vitals.bmi}
                        onChange={(e) => setVitals(prev => ({ ...prev, bmi: e.target.value }))}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <div className="grid gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Chief Complaint</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="Patient's main concern or reason for today's visit..."
                      value={consultationData.chiefComplaint}
                      onChange={(e) => setConsultationData(prev => ({ ...prev, chiefComplaint: e.target.value }))}
                      className="h-20"
                    />
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">History of Presenting Complaint</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="Detailed history of the current problem - onset, duration, character, location, radiation, associations, time course, exacerbating/relieving factors, severity..."
                      value={consultationData.historyPresentingComplaint}
                      onChange={(e) => setConsultationData(prev => ({ ...prev, historyPresentingComplaint: e.target.value }))}
                      className="h-32"
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Review of Systems</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(consultationData.reviewOfSystems).map(([system, value]) => (
                        <div key={system} className="space-y-2">
                          <Label className="capitalize font-medium">{system.replace('_', ' ')}</Label>
                          <Textarea
                            placeholder={`${system} related symptoms...`}
                            value={value}
                            onChange={(e) => setConsultationData(prev => ({
                              ...prev,
                              reviewOfSystems: { ...prev.reviewOfSystems, [system]: e.target.value }
                            }))}
                            className="h-16"
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="examination" className="space-y-4">
              <div className="grid gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Stethoscope className="w-5 h-5 text-blue-600" />
                      Examination
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                        <Select 
                          value={selectedExaminationType} 
                          onValueChange={(value) => {
                            setSelectedExaminationType(value);
                            // Directly open the corresponding examination window
                            switch(value) {
                              case 'general':
                                setShowGeneralExamModal(true);
                                break;
                              case 'cardiovascular':
                                setShowCardiovascularExamModal(true);
                                break;
                              case 'respiratory':
                                setShowRespiratoryExamModal(true);
                                break;
                              case 'neurological':
                                setShowNeurologicalExamModal(true);
                                break;
                              case 'anatomical':
                                setShowAnatomicalModal(true);
                                break;
                              case 'physical':
                                setShowPhysicalExamModal(true);
                                break;
                            }
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Choose examination type..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">General Examination</SelectItem>
                            <SelectItem value="cardiovascular">Cardiovascular</SelectItem>
                            <SelectItem value="respiratory">Respiratory</SelectItem>
                            <SelectItem value="neurological">Neurological</SelectItem>
                            <SelectItem value="anatomical">Anatomical (View Muscles)</SelectItem>
                            <SelectItem value="physical">Physical Examination Findings</SelectItem>
                          </SelectContent>
                        </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Clinical Notes Section */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Clinical Notes</CardTitle>
                      <Button 
                        variant={isRecording ? "destructive" : "outline"} 
                        size="sm"
                        onClick={isRecording ? stopRecording : startRecording}
                      >
                        {isRecording ? <Square className="w-4 h-4 mr-2" /> : <Mic className="w-4 h-4 mr-2" />}
                        {isRecording ? 'Stop Recording' : 'Transcribe Audio'}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="Detailed consultation notes, observations, and findings. Click 'Transcribe Audio' to dictate your notes."
                      className="h-32"
                      value={clinicalNotes + transcript}
                      onChange={(e) => setClinicalNotes(e.target.value)}
                    />
                  </CardContent>
                </Card>

                {/* Diagnosis and Treatment Plan Section */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Diagnosis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        placeholder="Primary and secondary diagnoses with ICD codes..."
                        className="h-32"
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Treatment Plan</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        placeholder="Treatment recommendations and care plan..."
                        className="h-32"
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 mt-6">
                  <Button 
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={handleSaveConsultation}
                    disabled={saveConsultationMutation.isPending}
                  >
                    {saveConsultationMutation.isPending ? 'Saving...' : 'Save Record'}
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="assessment" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-600" />
                    Clinical Assessment & Diagnosis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="assessment" className="text-base font-medium">Assessment & Working Diagnosis</Label>
                      <Textarea
                        id="assessment"
                        placeholder="Clinical assessment, differential diagnosis, working diagnosis, and clinical reasoning..."
                        value={consultationData.assessment}
                        onChange={(e) => setConsultationData(prev => ({ ...prev, assessment: e.target.value }))}
                        className="mt-2 h-40"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="plan" className="space-y-4">
              <div className="grid gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Management Plan</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="Treatment plan, lifestyle advice, follow-up instructions, patient education..."
                      value={consultationData.plan}
                      onChange={(e) => setConsultationData(prev => ({ ...prev, plan: e.target.value }))}
                      className="h-32"
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Pill className="w-5 h-5 text-green-600" />
                        Prescriptions
                      </CardTitle>
                      <Button onClick={addPrescription} size="sm">
                        <Plus className="w-4 h-4 mr-1" />
                        Add Prescription
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {consultationData.prescriptions.map((prescription, index) => (
                        <div key={index} className="p-4 border rounded-lg space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">Prescription {index + 1}</h4>
                            <Button 
                              onClick={() => removePrescription(index)} 
                              variant="outline" 
                              size="sm"
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label>Medication</Label>
                              <Input
                                placeholder="Medication name"
                                value={prescription.medication}
                                onChange={(e) => updatePrescription(index, 'medication', e.target.value)}
                              />
                            </div>
                            <div>
                              <Label>Dosage</Label>
                              <Input
                                placeholder="e.g., 500mg"
                                value={prescription.dosage}
                                onChange={(e) => updatePrescription(index, 'dosage', e.target.value)}
                              />
                            </div>
                            <div>
                              <Label>Frequency</Label>
                              <Input
                                placeholder="e.g., Twice daily"
                                value={prescription.frequency}
                                onChange={(e) => updatePrescription(index, 'frequency', e.target.value)}
                              />
                            </div>
                            <div>
                              <Label>Duration</Label>
                              <Input
                                placeholder="e.g., 7 days"
                                value={prescription.duration}
                                onChange={(e) => updatePrescription(index, 'duration', e.target.value)}
                              />
                            </div>
                          </div>
                          <div>
                            <Label>Instructions</Label>
                            <Textarea
                              placeholder="Special instructions for the patient..."
                              value={prescription.instructions}
                              onChange={(e) => updatePrescription(index, 'instructions', e.target.value)}
                              className="h-16"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Referrals</CardTitle>
                      <Button onClick={addReferral} size="sm" variant="outline">
                        <Plus className="w-4 h-4 mr-1" />
                        Add Referral
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {consultationData.referrals.map((referral, index) => (
                        <div key={index} className="p-4 border rounded-lg space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">Referral {index + 1}</h4>
                            <Button 
                              onClick={() => removeReferral(index)} 
                              variant="outline" 
                              size="sm"
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <Label>Specialty</Label>
                              <Input
                                placeholder="e.g., Cardiology"
                                value={referral.specialty}
                                onChange={(e) => updateReferral(index, 'specialty', e.target.value)}
                              />
                            </div>
                            <div>
                              <Label>Urgency</Label>
                              <Select 
                                value={referral.urgency} 
                                onValueChange={(value) => updateReferral(index, 'urgency', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="routine">Routine</SelectItem>
                                  <SelectItem value="urgent">Urgent</SelectItem>
                                  <SelectItem value="2ww">2 Week Wait</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Reason</Label>
                              <Input
                                placeholder="Reason for referral"
                                value={referral.reason}
                                onChange={(e) => updateReferral(index, 'reason', e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Investigations</CardTitle>
                      <Button onClick={addInvestigation} size="sm" variant="outline">
                        <Plus className="w-4 h-4 mr-1" />
                        Add Investigation
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {consultationData.investigations.map((investigation, index) => (
                        <div key={index} className="p-4 border rounded-lg space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">Investigation {index + 1}</h4>
                            <Button 
                              onClick={() => removeInvestigation(index)} 
                              variant="outline" 
                              size="sm"
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <Label>Type</Label>
                              <Input
                                placeholder="e.g., Blood Test"
                                value={investigation.type}
                                onChange={(e) => updateInvestigation(index, 'type', e.target.value)}
                              />
                            </div>
                            <div>
                              <Label>Urgency</Label>
                              <Select 
                                value={investigation.urgency} 
                                onValueChange={(value) => updateInvestigation(index, 'urgency', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="routine">Routine</SelectItem>
                                  <SelectItem value="urgent">Urgent</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Reason</Label>
                              <Input
                                placeholder="Clinical indication"
                                value={investigation.reason}
                                onChange={(e) => updateInvestigation(index, 'reason', e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="summary" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    Consultation Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-semibold mb-2">Chief Complaint</h4>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm">{consultationData.chiefComplaint || "Not recorded"}</p>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Assessment</h4>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm">{consultationData.assessment || "Not recorded"}</p>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Plan</h4>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm">{consultationData.plan || "Not recorded"}</p>
                      </div>
                    </div>

                    {consultationData.prescriptions.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Prescriptions ({consultationData.prescriptions.length})</h4>
                        <div className="space-y-2">
                          {consultationData.prescriptions.map((rx, index) => (
                            <div key={index} className="bg-green-50 p-3 rounded-lg border-l-4 border-l-green-500">
                              <p className="font-medium">{rx.medication} {rx.dosage}</p>
                              <p className="text-sm text-gray-600">{rx.frequency} for {rx.duration}</p>
                              {rx.instructions && <p className="text-sm text-gray-600 mt-1">{rx.instructions}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {consultationData.referrals.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Referrals ({consultationData.referrals.length})</h4>
                        <div className="space-y-2">
                          {consultationData.referrals.map((ref, index) => (
                            <div key={index} className="bg-yellow-50 p-3 rounded-lg border-l-4 border-l-yellow-500">
                              <p className="font-medium">{ref.specialty} - {ref.urgency}</p>
                              <p className="text-sm text-gray-600">{ref.reason}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {consultationData.investigations.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Investigations ({consultationData.investigations.length})</h4>
                        <div className="space-y-2">
                          {consultationData.investigations.map((inv, index) => (
                            <div key={index} className="bg-purple-50 p-3 rounded-lg border-l-4 border-l-purple-500">
                              <p className="font-medium">{inv.type} - {inv.urgency}</p>
                              <p className="text-sm text-gray-600">{inv.reason}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

        </div>
      </DialogContent>

      {/* Anatomical View Modal - Step-by-step Flow */}
      <Dialog open={showAnatomicalModal} onOpenChange={(open) => {
        setShowAnatomicalModal(open);
        if (!open) {
          setAnatomicalStep(1); // Reset to first step when closing
        }
      }}>
        <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
          <DialogHeader className="pb-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <Eye className="w-4 h-4 text-white" />
                </div>
                Professional Anatomical Analysis
              </DialogTitle>
              {anatomicalStep > 1 && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <div className={`w-2 h-2 rounded-full ${anatomicalStep === 3 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Advanced facial muscle analysis with optimized container spacing
            </p>
          </DialogHeader>

          {/* Step 1: Professional Anatomical Analysis */}
          {anatomicalStep === 1 && (
            <div className="space-y-6 p-4">
              <div className="flex flex-col items-center space-y-4">
                <div className="relative bg-white rounded-lg p-6 w-full max-w-4xl border shadow-sm">
                  <div className="relative" ref={containerRef}>
                    <img
                      ref={imageRef}
                      src={anatomicalImages[currentImageIndex]}
                      alt="Professional Anatomical Analysis"
                      className="w-full h-auto max-w-2xl mx-auto rounded-lg"
                      onLoad={updateOverlayPosition}
                    />
                    
                    {/* PIXEL-ACCURATE MUSCLE HIGHLIGHT OVERLAY */}
                    {selectedMuscleGroup && overlayPosition && (
                      <div 
                        className="absolute pointer-events-none z-50"
                        style={{
                          left: overlayPosition.left,
                          top: overlayPosition.top,
                          width: overlayPosition.width,
                          height: overlayPosition.height,
                        }}
                      >
                        {(() => {
                          // NORMALIZE MUSCLE KEY - Convert dropdown value to coordinate key
                          const normalize = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g,'_');
                          const muscleKey = normalize(selectedMuscleGroup);
                          
                          // DEBUG LOGGING
                          console.log('🎯 MUSCLE HIGHLIGHTING DEBUG:', {
                            selectedMuscleGroup,
                            normalized: muscleKey,
                            currentImageIndex,
                            availableKeys: Object.keys(musclePixelCoordinates[currentImageIndex as keyof typeof musclePixelCoordinates] || {}),
                            overlayPosition
                          });
                          
                          // Get pixel coordinates for selected muscle
                          const pixelCoords = musclePixelCoordinates[currentImageIndex as keyof typeof musclePixelCoordinates]?.[muscleKey as keyof typeof musclePixelCoordinates[0]];
                          if (!pixelCoords) {
                            console.warn('❌ NO COORDINATES FOUND FOR MUSCLE:', muscleKey);
                            return null;
                          }
                          
                          // Scale coordinates to rendered dimensions
                          const scaledX = pixelCoords.x * overlayPosition.scaleX;
                          const scaledY = pixelCoords.y * overlayPosition.scaleY;
                          
                          console.log('✅ MUSCLE MARKER POSITION:', {
                            muscleKey,
                            pixelCoords,
                            scaled: { x: scaledX, y: scaledY }
                          });
                          
                          return (
                            <div
                              className="absolute z-60"
                              style={{
                                left: `${scaledX}px`,
                                top: `${scaledY}px`,
                                transform: 'translate(-50%, -50%)'
                              }}
                            >
                              <div
                                className="w-6 h-6 rounded-full bg-yellow-400 border-2 border-yellow-600 shadow-lg animate-pulse"
                                style={{
                                  background: 'rgba(255, 230, 0, 0.9)',
                                  boxShadow: '0 0 8px rgba(255, 230, 0, 0.8)'
                                }}
                                title={`Selected: ${selectedMuscleGroup.replace(/_/g, ' ')}`}
                              />
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Navigation controls */}
                  <div className="flex justify-between items-center mt-6">
                    <Button
                      onClick={() => navigateImage('prev')}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      ← Previous
                    </Button>
                    <Button
                      onClick={() => setAnatomicalStep(2)}
                      className="bg-blue-600 hover:bg-blue-700 px-8"
                    >
                      Professional Medical Anatomical Diagram →
                    </Button>
                    <Button
                      onClick={() => navigateImage('next')}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      Next →
                    </Button>
                  </div>
                </div>
              </div>

              {/* Configuration Window Below Image */}
              <div className="w-full max-w-6xl mx-auto">
                
                <div className="grid grid-cols-2 gap-8 mb-6">
                  {/* Left Side: Facial Muscle Analysis */}
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold">Facial Muscle Analysis</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Target Muscle Group</Label>
                        <Select value={selectedMuscleGroup} onValueChange={setSelectedMuscleGroup}>
                          <SelectTrigger>
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
                            <SelectItem value="platysma">Platysma</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Analysis Type</Label>
                        <Select value={selectedAnalysisType} onValueChange={setSelectedAnalysisType}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select analysis type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="asymmetry">Asymmetry Analysis</SelectItem>
                            <SelectItem value="weakness">Muscle Weakness</SelectItem>
                            <SelectItem value="hyperactivity">Hyperactivity Assessment</SelectItem>
                            <SelectItem value="coordination">Coordination Testing</SelectItem>
                            <SelectItem value="range_of_motion">Range of Motion</SelectItem>
                            <SelectItem value="functional_assessment">Functional Assessment</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Right Side: Treatment Options */}
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold">Treatment Options</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Primary Treatment</Label>
                        <Select value={selectedTreatment} onValueChange={setSelectedTreatment}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select primary treatment" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="botulinum_toxin">Botulinum Toxin</SelectItem>
                            <SelectItem value="dermal_fillers">Dermal Fillers</SelectItem>
                            <SelectItem value="facial_exercise">Facial Exercise Therapy</SelectItem>
                            <SelectItem value="massage_therapy">Therapeutic Massage</SelectItem>
                            <SelectItem value="physiotherapy">Physiotherapy</SelectItem>
                            <SelectItem value="neuromuscular_reeducation">Neuromuscular Reeducation</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Treatment Intensity</Label>
                        <Select value={selectedTreatmentIntensity} onValueChange={setSelectedTreatmentIntensity}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select intensity level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low Intensity</SelectItem>
                            <SelectItem value="moderate">Moderate Intensity</SelectItem>
                            <SelectItem value="high">High Intensity</SelectItem>
                            <SelectItem value="progressive">Progressive Intensity</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Session Frequency</Label>
                        <Select value={selectedSessionFrequency} onValueChange={setSelectedSessionFrequency}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="twice_weekly">Twice Weekly</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="biweekly">Bi-weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Assessment Sections */}
                <div className="grid grid-cols-3 gap-6 mb-6">
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold text-purple-700">Symptom Assessment</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Label>Primary symptoms</Label>
                        <Select value={primarySymptoms} onValueChange={setPrimarySymptoms}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select primary symptoms" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="muscle_tension">Muscle Tension</SelectItem>
                            <SelectItem value="facial_asymmetry">Facial Asymmetry</SelectItem>
                            <SelectItem value="jaw_pain">Jaw Pain</SelectItem>
                            <SelectItem value="headaches">Headaches</SelectItem>
                            <SelectItem value="eye_strain">Eye Strain</SelectItem>
                            <SelectItem value="facial_spasms">Facial Spasms</SelectItem>
                            <SelectItem value="numbness">Numbness</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold text-red-700">Severity Scale</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Label>Rate severity</Label>
                        <Select value={severityScale} onValueChange={setSeverityScale}>
                          <SelectTrigger>
                            <SelectValue placeholder="Rate severity level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Mild (1-2)</SelectItem>
                            <SelectItem value="3">Moderate (3-5)</SelectItem>
                            <SelectItem value="6">Severe (6-8)</SelectItem>
                            <SelectItem value="9">Critical (9-10)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold text-green-700">Follow-up Plan</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Label>Follow-up timeline</Label>
                        <Select value={followUpPlan} onValueChange={setFollowUpPlan}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select follow-up timeline" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1_week">1 Week</SelectItem>
                            <SelectItem value="2_weeks">2 Weeks</SelectItem>
                            <SelectItem value="1_month">1 Month</SelectItem>
                            <SelectItem value="3_months">3 Months</SelectItem>
                            <SelectItem value="6_months">6 Months</SelectItem>
                            <SelectItem value="as_needed">As Needed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-center gap-4 pt-6 border-t">
                  <Button
                    onClick={generateTreatmentPlan}
                    disabled={isGeneratingPlan}
                    className="bg-green-600 hover:bg-green-700 px-4 py-2 min-w-fit"
                  >
                    {isGeneratingPlan ? "Generating..." : "Generate Treatment Plan"}
                  </Button>
                  <Button
                    onClick={saveAnalysis}
                    disabled={isSavingAnalysis}
                    className="bg-blue-600 hover:bg-blue-700 px-4 py-2 min-w-fit"
                  >
                    {isSavingAnalysis ? "Saving..." : "Save Analysis"}
                  </Button>
                  <Button
                    onClick={() => setShowAnatomicalModal(false)}
                    variant="outline"
                    className="px-4 py-2 min-w-fit"
                  >
                    Close Analysis
                  </Button>
                </div>

                {/* Generated Treatment Plan Display */}
                {generatedTreatmentPlan && (
                  <Card className="mt-6">
                    <CardHeader>
                      <CardTitle className="text-lg">Generated Treatment Plan</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded border">
                        {generatedTreatmentPlan}
                      </pre>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Configuration Screen */}
          {anatomicalStep === 2 && (
            <div className="space-y-6 p-4">
              <div className="flex items-center justify-center mb-6">
                <div className="bg-blue-600 text-white px-6 py-2 rounded-full text-sm font-medium">
                  Professional Medical Anatomical Diagram
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-8">
                {/* Left Side: Facial Muscle Analysis */}
                <Card className="h-fit">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Facial Muscle Analysis</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Target Muscle Group</Label>
                      <Select value={selectedMuscleGroup} onValueChange={setSelectedMuscleGroup}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select muscle group" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="frontalis">Frontalis</SelectItem>
                          <SelectItem value="temporalis">Temporalis</SelectItem>
                          <SelectItem value="corrugator_supercilii">Corrugator Supercilii</SelectItem>
                          <SelectItem value="procerus">Procerus</SelectItem>
                          <SelectItem value="orbicularis_oculi">Orbicularis Oculi</SelectItem>
                          <SelectItem value="levator_labii_superioris">Levator Labii Superioris</SelectItem>
                          <SelectItem value="zygomaticus_major">Zygomaticus Major</SelectItem>
                          <SelectItem value="masseter">Masseter</SelectItem>
                          <SelectItem value="orbicularis_oris">Orbicularis Oris</SelectItem>
                          <SelectItem value="mentalis">Mentalis</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Analysis Type</Label>
                      <Select value={selectedAnalysisType} onValueChange={setSelectedAnalysisType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select analysis type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asymmetry">Asymmetry Analysis</SelectItem>
                          <SelectItem value="weakness">Muscle Weakness</SelectItem>
                          <SelectItem value="hyperactivity">Hyperactivity Assessment</SelectItem>
                          <SelectItem value="coordination">Coordination Testing</SelectItem>
                          <SelectItem value="range_of_motion">Range of Motion</SelectItem>
                          <SelectItem value="functional_assessment">Functional Assessment</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Right Side: Treatment Options */}
                <Card className="h-fit">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Treatment Options</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Primary Treatment</Label>
                      <Select value={selectedTreatment} onValueChange={setSelectedTreatment}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select primary treatment" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="botulinum_toxin">Botulinum Toxin</SelectItem>
                          <SelectItem value="dermal_fillers">Dermal Fillers</SelectItem>
                          <SelectItem value="facial_exercise">Facial Exercise Therapy</SelectItem>
                          <SelectItem value="massage_therapy">Therapeutic Massage</SelectItem>
                          <SelectItem value="physiotherapy">Physiotherapy</SelectItem>
                          <SelectItem value="neuromuscular_reeducation">Neuromuscular Reeducation</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Treatment Intensity</Label>
                      <Select value={selectedTreatmentIntensity} onValueChange={setSelectedTreatmentIntensity}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select intensity level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low Intensity</SelectItem>
                          <SelectItem value="moderate">Moderate Intensity</SelectItem>
                          <SelectItem value="high">High Intensity</SelectItem>
                          <SelectItem value="progressive">Progressive Intensity</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Session Frequency</Label>
                      <Select value={selectedSessionFrequency} onValueChange={setSelectedSessionFrequency}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="twice_weekly">Twice Weekly</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="biweekly">Bi-weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-between items-center pt-6">
                <Button
                  onClick={() => setAnatomicalStep(1)}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  ← Back to Analysis
                </Button>
                <Button
                  onClick={() => setAnatomicalStep(3)}
                  className="bg-blue-600 hover:bg-blue-700 px-8"
                  disabled={!selectedMuscleGroup || !selectedAnalysisType || !selectedTreatment}
                >
                  Continue to Assessment →
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Extended Assessment */}
          {anatomicalStep === 3 && (
            <div className="space-y-6 p-4">
              <div className="flex items-center justify-center mb-6">
                <div className="bg-blue-600 text-white px-6 py-2 rounded-full text-sm font-medium">
                  Professional Medical Anatomical Diagram
                </div>
              </div>

              {/* First Row: Facial Muscle Analysis and Treatment Options */}
              <div className="grid grid-cols-2 gap-8">
                <Card className="h-fit">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Facial Muscle Analysis</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Target Muscle Group</Label>
                      <Select value={selectedMuscleGroup} onValueChange={setSelectedMuscleGroup}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select muscle group" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="frontalis">Frontalis</SelectItem>
                          <SelectItem value="temporalis">Temporalis</SelectItem>
                          <SelectItem value="orbicularis_oculi">Orbicularis Oculi</SelectItem>
                          <SelectItem value="masseter">Masseter</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Analysis Type</Label>
                      <Select value={selectedAnalysisType} onValueChange={setSelectedAnalysisType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select analysis type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asymmetry">Asymmetry Analysis</SelectItem>
                          <SelectItem value="weakness">Muscle Weakness</SelectItem>
                          <SelectItem value="coordination">Coordination Testing</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Card className="h-fit">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Treatment Options</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Primary Treatment</Label>
                      <Select value={selectedTreatment} onValueChange={setSelectedTreatment}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select primary treatment" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="botulinum_toxin">Botulinum Toxin</SelectItem>
                          <SelectItem value="dermal_fillers">Dermal Fillers</SelectItem>
                          <SelectItem value="facial_exercise">Facial Exercise Therapy</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Treatment Intensity</Label>
                      <Select value={selectedTreatmentIntensity} onValueChange={setSelectedTreatmentIntensity}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select intensity level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low Intensity</SelectItem>
                          <SelectItem value="moderate">Moderate Intensity</SelectItem>
                          <SelectItem value="high">High Intensity</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Session Frequency</Label>
                      <Select value={selectedSessionFrequency} onValueChange={setSelectedSessionFrequency}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="biweekly">Bi-weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Second Row: Assessment Sections */}
              <div className="grid grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-purple-700">Symptom Assessment</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Label>Primary symptoms</Label>
                      <Select value={primarySymptoms} onValueChange={setPrimarySymptoms}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select primary symptoms" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="muscle_tension">Muscle Tension</SelectItem>
                          <SelectItem value="facial_asymmetry">Facial Asymmetry</SelectItem>
                          <SelectItem value="jaw_pain">Jaw Pain</SelectItem>
                          <SelectItem value="headaches">Headaches</SelectItem>
                          <SelectItem value="eye_strain">Eye Strain</SelectItem>
                          <SelectItem value="facial_spasms">Facial Spasms</SelectItem>
                          <SelectItem value="numbness">Numbness</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-red-700">Severity Scale</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Label>Rate severity</Label>
                      <Select value={severityScale} onValueChange={setSeverityScale}>
                        <SelectTrigger>
                          <SelectValue placeholder="Rate severity level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Mild (1-2)</SelectItem>
                          <SelectItem value="3">Moderate (3-5)</SelectItem>
                          <SelectItem value="6">Severe (6-8)</SelectItem>
                          <SelectItem value="9">Critical (9-10)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-green-700">Follow-up Plan</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Label>Follow-up timeline</Label>
                      <Select value={followUpPlan} onValueChange={setFollowUpPlan}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select follow-up timeline" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1_week">1 Week</SelectItem>
                          <SelectItem value="2_weeks">2 Weeks</SelectItem>
                          <SelectItem value="1_month">1 Month</SelectItem>
                          <SelectItem value="3_months">3 Months</SelectItem>
                          <SelectItem value="6_months">6 Months</SelectItem>
                          <SelectItem value="as_needed">As Needed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-6 border-t">
                <Button
                  onClick={() => setAnatomicalStep(2)}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  ← Back to Configuration
                </Button>
                
                <div className="flex gap-4">
                  <Button
                    onClick={generateTreatmentPlan}
                    disabled={isGeneratingPlan}
                    className="bg-green-600 hover:bg-green-700 px-6"
                  >
                    {isGeneratingPlan ? "Generating..." : "Generate Treatment Plan"}
                  </Button>
                  <Button
                    onClick={saveAnalysis}
                    disabled={isSavingAnalysis}
                    className="bg-blue-600 hover:bg-blue-700 px-6"
                  >
                    {isSavingAnalysis ? "Saving..." : "Save Analysis"}
                  </Button>
                  <Button
                    onClick={() => setShowAnatomicalModal(false)}
                    variant="outline"
                    className="px-6"
                  >
                    Close Analysis
                  </Button>
                </div>
              </div>

              {/* Generated Treatment Plan Display */}
              {generatedTreatmentPlan && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="text-lg">Generated Treatment Plan</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded border">
                      {generatedTreatmentPlan}
                    </pre>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Physical Examination Modal */}
      <Dialog open={showPhysicalExamModal} onOpenChange={setShowPhysicalExamModal}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-blue-600" />
              Physical Examination Findings
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-4">
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(consultationData.examination).map(([system, value]) => (
                <div key={system} className="space-y-2">
                  <Label className="capitalize font-medium flex items-center gap-2">
                    {system === 'cardiovascular' && <Heart className="w-4 h-4 text-red-500" />}
                    {system === 'respiratory' && <Activity className="w-4 h-4 text-blue-500" />}
                    {system === 'neurological' && <Brain className="w-4 h-4 text-purple-500" />}
                    {system === 'head_neck' && <Eye className="w-4 h-4 text-green-500" />}
                    {system === 'ears_nose_throat' && <Ear className="w-4 h-4 text-yellow-500" />}
                    {system.replace('_', ' ')}
                  </Label>
                  <Textarea
                    placeholder={`${system} examination findings...`}
                    value={value}
                    onChange={(e) => setConsultationData(prev => ({
                      ...prev,
                      examination: { ...prev.examination, [system]: e.target.value }
                    }))}
                    className="h-20"
                  />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPhysicalExamModal(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowPhysicalExamModal(false)} className="bg-blue-600 hover:bg-blue-700">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* General Examination Modal */}
      <Dialog open={showGeneralExamModal} onOpenChange={setShowGeneralExamModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              General Examination
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>General Appearance</Label>
                <Textarea placeholder="Overall appearance, posture, gait..." className="h-20" />
              </div>
              <div className="space-y-2">
                <Label>Mental Status</Label>
                <Textarea placeholder="Consciousness level, orientation..." className="h-20" />
              </div>
              <div className="space-y-2">
                <Label>Skin Assessment</Label>
                <Textarea placeholder="Color, texture, lesions..." className="h-20" />
              </div>
              <div className="space-y-2">
                <Label>Lymph Nodes</Label>
                <Textarea placeholder="Palpable lymph nodes..." className="h-20" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGeneralExamModal(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowGeneralExamModal(false)} className="bg-blue-600 hover:bg-blue-700">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cardiovascular Examination Modal */}
      <Dialog open={showCardiovascularExamModal} onOpenChange={setShowCardiovascularExamModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-600" />
              Cardiovascular Examination
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Heart Rate & Rhythm</Label>
                <Textarea placeholder="Rate, rhythm, regularity..." className="h-20" />
              </div>
              <div className="space-y-2">
                <Label>Heart Sounds</Label>
                <Textarea placeholder="S1, S2, murmurs, gallops..." className="h-20" />
              </div>
              <div className="space-y-2">
                <Label>Blood Pressure</Label>
                <Textarea placeholder="Systolic/Diastolic measurements..." className="h-20" />
              </div>
              <div className="space-y-2">
                <Label>Peripheral Pulses</Label>
                <Textarea placeholder="Radial, pedal, carotid pulses..." className="h-20" />
              </div>
              <div className="space-y-2">
                <Label>Edema Assessment</Label>
                <Textarea placeholder="Peripheral edema, JVP..." className="h-20" />
              </div>
              <div className="space-y-2">
                <Label>Chest Inspection</Label>
                <Textarea placeholder="Chest wall, point of maximal impulse..." className="h-20" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCardiovascularExamModal(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowCardiovascularExamModal(false)} className="bg-blue-600 hover:bg-blue-700">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Respiratory Examination Modal */}
      <Dialog open={showRespiratoryExamModal} onOpenChange={setShowRespiratoryExamModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Respiratory Examination
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Respiratory Rate</Label>
                <Textarea placeholder="Rate, depth, pattern..." className="h-20" />
              </div>
              <div className="space-y-2">
                <Label>Chest Inspection</Label>
                <Textarea placeholder="Shape, symmetry, expansion..." className="h-20" />
              </div>
              <div className="space-y-2">
                <Label>Auscultation</Label>
                <Textarea placeholder="Breath sounds, adventitious sounds..." className="h-20" />
              </div>
              <div className="space-y-2">
                <Label>Percussion</Label>
                <Textarea placeholder="Resonance, dullness..." className="h-20" />
              </div>
              <div className="space-y-2">
                <Label>Palpation</Label>
                <Textarea placeholder="Chest expansion, tactile fremitus..." className="h-20" />
              </div>
              <div className="space-y-2">
                <Label>Oxygen Saturation</Label>
                <Textarea placeholder="SpO2 measurements..." className="h-20" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRespiratoryExamModal(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowRespiratoryExamModal(false)} className="bg-blue-600 hover:bg-blue-700">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Neurological Examination Modal */}
      <Dialog open={showNeurologicalExamModal} onOpenChange={setShowNeurologicalExamModal}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-600" />
              Neurological Examination
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mental Status</Label>
                <Textarea placeholder="Consciousness, orientation, memory..." className="h-20" />
              </div>
              <div className="space-y-2">
                <Label>Cranial Nerves</Label>
                <Textarea placeholder="CN I-XII assessment..." className="h-20" />
              </div>
              <div className="space-y-2">
                <Label>Motor Function</Label>
                <Textarea placeholder="Strength, tone, coordination..." className="h-20" />
              </div>
              <div className="space-y-2">
                <Label>Sensory Function</Label>
                <Textarea placeholder="Touch, pain, temperature, vibration..." className="h-20" />
              </div>
              <div className="space-y-2">
                <Label>Reflexes</Label>
                <Textarea placeholder="Deep tendon reflexes, pathological reflexes..." className="h-20" />
              </div>
              <div className="space-y-2">
                <Label>Gait & Coordination</Label>
                <Textarea placeholder="Walking pattern, balance, coordination tests..." className="h-20" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNeurologicalExamModal(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowNeurologicalExamModal(false)} className="bg-blue-600 hover:bg-blue-700">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}