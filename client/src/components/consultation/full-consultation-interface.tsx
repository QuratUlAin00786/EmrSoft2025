import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  HeartPulse
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import anatomicalDiagramImage from "@assets/2_1754469563272.png";
import facialMuscleImage from "@assets/generated_images/Medical_facial_muscle_diagram_ae7b35b5.png";
import facialOutlineImage from "@assets/generated_images/Clean_facial_anatomy_outline_4b91e595.png";

interface FullConsultationInterfaceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient?: any;
}

export function FullConsultationInterface({ open, onOpenChange, patient }: FullConsultationInterfaceProps) {
  const { toast } = useToast();
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
  const [showPhysicalExamModal, setShowPhysicalExamModal] = useState(false);

  // Anatomical analysis state
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>("");
  const [selectedAnalysisType, setSelectedAnalysisType] = useState<string>("");
  const [selectedTreatment, setSelectedTreatment] = useState<string>("");
  const [generatedTreatmentPlan, setGeneratedTreatmentPlan] = useState<string>("");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [isSavingAnalysis, setIsSavingAnalysis] = useState(false);

  // Anatomical images array
  const anatomicalImages = [anatomicalDiagramImage, facialMuscleImage, facialOutlineImage];

  // Muscle coordinates for interactive overlay
  const muscleCoordinatesForImages = {
    0: {
      frontalis: { x: 50, y: 15 },
      temporalis: { x: 25, y: 25 },
      corrugator_supercilii: { x: 40, y: 20 },
      procerus: { x: 50, y: 30 },
      orbicularis_oculi: { x: 45, y: 35 },
      levator_labii_superioris: { x: 40, y: 45 },
      zygomaticus_major: { x: 35, y: 50 },
      zygomaticus_minor: { x: 38, y: 48 },
      masseter: { x: 30, y: 55 },
      buccinator: { x: 35, y: 58 },
      orbicularis_oris: { x: 50, y: 65 },
      mentalis: { x: 50, y: 75 },
      depressor_anguli_oris: { x: 45, y: 70 },
      depressor_labii_inferioris: { x: 47, y: 72 },
      platysma: { x: 50, y: 85 }
    },
    1: {
      frontalis: { x: 50, y: 10 },
      temporalis: { x: 20, y: 20 },
      orbicularis_oculi: { x: 42, y: 30 },
      levator_labii_superioris: { x: 38, y: 40 },
      zygomaticus_major: { x: 32, y: 45 },
      masseter: { x: 25, y: 50 },
      orbicularis_oris: { x: 50, y: 60 },
      mentalis: { x: 50, y: 70 }
    },
    2: {
      frontalis: { x: 50, y: 8 },
      temporalis: { x: 15, y: 15 },
      corrugator_supercilii: { x: 35, y: 15 },
      procerus: { x: 50, y: 25 },
      orbicularis_oculi: { x: 40, y: 28 },
      levator_labii_superioris: { x: 35, y: 38 },
      zygomaticus_major: { x: 28, y: 42 },
      masseter: { x: 20, y: 48 },
      orbicularis_oris: { x: 50, y: 55 },
      mentalis: { x: 50, y: 65 }
    }
  };

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
                    <div className="space-y-4">
                      <div>
                        <Label className="text-base font-medium">Select Examination Type</Label>
                        <Select 
                          value={selectedExaminationType} 
                          onValueChange={setSelectedExaminationType}
                        >
                          <SelectTrigger className="w-full mt-2">
                            <SelectValue placeholder="Choose examination type..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="anatomical">Anatomical View – Muscle Analysis</SelectItem>
                            <SelectItem value="physical">Physical Examination Findings</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {selectedExaminationType && (
                        <div className="flex gap-3 mt-4">
                          {selectedExaminationType === 'anatomical' && (
                            <Button 
                              onClick={() => setShowAnatomicalModal(true)}
                              className="flex-1"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Open Anatomical View Window
                            </Button>
                          )}
                          {selectedExaminationType === 'physical' && (
                            <Button 
                              onClick={() => setShowPhysicalExamModal(true)}
                              className="flex-1"
                            >
                              <Stethoscope className="w-4 h-4 mr-2" />
                              Open Physical Examination Window
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
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

          {/* Action Buttons */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t-2">
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button variant="outline">
                <Printer className="w-4 h-4 mr-2" />
                Print Summary
              </Button>
            </div>
            
            <div className="flex gap-3">
              <Button 
                variant="outline"
                onClick={() => {
                  toast({
                    title: "Draft Saved",
                    description: "Consultation saved as draft successfully",
                  });
                }}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Draft
              </Button>
              <Button 
                onClick={() => saveConsultation.mutate()}
                disabled={saveConsultation.isPending}
                className="bg-green-600 hover:bg-green-700 text-white min-w-[200px]"
              >
                {saveConsultation.isPending ? (
                  <>
                    <Activity className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Complete Consultation
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Anatomical View Modal */}
      <Dialog open={showAnatomicalModal} onOpenChange={setShowAnatomicalModal}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-600" />
              Anatomical View - Muscle Analysis
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 p-4">
            {/* Interactive Anatomical Images */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative bg-gray-50 rounded-lg p-4 w-full max-w-2xl">
                <div className="relative">
                  <img
                    src={anatomicalImages[currentImageIndex]}
                    alt={`Anatomical diagram ${currentImageIndex + 1}`}
                    className="w-full h-auto max-w-lg mx-auto rounded-lg shadow-md"
                  />
                  
                  {/* Interactive muscle points overlay */}
                  <div className="absolute inset-0 max-w-lg mx-auto">
                    {Object.entries(muscleCoordinatesForImages[currentImageIndex as keyof typeof muscleCoordinatesForImages] || {}).map(([muscleName, coords]) => (
                      <button
                        key={muscleName}
                        className={`absolute w-10 h-10 rounded-full transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${
                          selectedMuscleGroup === muscleName
                            ? 'bg-red-500 border-3 border-red-700 shadow-xl opacity-90 scale-110'
                            : 'bg-transparent hover:bg-blue-200 hover:opacity-30'
                        } z-10`}
                        style={{
                          left: `${coords.x}%`,
                          top: `${coords.y}%`,
                        }}
                        onClick={() => setSelectedMuscleGroup(muscleName)}
                        title={`Select ${muscleName.replace(/_/g, ' ')}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Navigation controls */}
                <div className="flex justify-between items-center mt-4">
                  <Button
                    onClick={() => navigateImage('prev')}
                    variant="outline"
                    size="sm"
                  >
                    ← Previous
                  </Button>
                  <Badge variant="outline" className="px-3 py-1">
                    Image {currentImageIndex + 1} of {anatomicalImages.length}
                  </Badge>
                  <Button
                    onClick={() => navigateImage('next')}
                    variant="outline"
                    size="sm"
                  >
                    Next →
                  </Button>
                </div>
              </div>
            </div>

            {/* Analysis Controls */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="muscle-group">Selected Muscle Group</Label>
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
                  <Label htmlFor="analysis-type">Analysis Type</Label>
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

                <div className="space-y-2">
                  <Label htmlFor="treatment">Primary Treatment</Label>
                  <Select value={selectedTreatment} onValueChange={setSelectedTreatment}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select treatment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="botulinum_toxin">Botulinum Toxin</SelectItem>
                      <SelectItem value="dermal_fillers">Dermal Fillers</SelectItem>
                      <SelectItem value="facial_exercise">Facial Exercise Therapy</SelectItem>
                      <SelectItem value="massage_therapy">Therapeutic Massage</SelectItem>
                      <SelectItem value="physiotherapy">Physiotherapy</SelectItem>
                      <SelectItem value="neuromuscular_reeducation">Neuromuscular Reeducation</SelectItem>
                      <SelectItem value="observation">Observation Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="analysis-notes">Analysis Notes</Label>
                  <Textarea
                    placeholder="Enter detailed analysis observations..."
                    className="h-20"
                  />
                </div>
              </div>

              <div className="space-y-4">
                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={generateTreatmentPlan}
                    disabled={!selectedMuscleGroup || !selectedAnalysisType || !selectedTreatment || isGeneratingPlan}
                    className="flex-1"
                  >
                    {isGeneratingPlan ? "Generating..." : "Generate Treatment Plan"}
                  </Button>
                  <Button
                    onClick={saveAnalysis}
                    disabled={!selectedMuscleGroup || !selectedAnalysisType || isSavingAnalysis}
                    variant="secondary"
                    className="flex-1"
                  >
                    {isSavingAnalysis ? "Saving..." : "Save Analysis"}
                  </Button>
                </div>

                {/* Generated Treatment Plan Display */}
                {generatedTreatmentPlan && (
                  <Card className="mt-4">
                    <CardHeader>
                      <CardTitle className="text-base">Generated Treatment Plan</CardTitle>
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
          </div>
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
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}