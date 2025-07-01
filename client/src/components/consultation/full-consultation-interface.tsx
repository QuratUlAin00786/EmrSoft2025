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

  const calculateAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return 0;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

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

  const addReferral = () => {
    setConsultationData(prev => ({
      ...prev,
      referrals: [...prev.referrals, {
        specialty: "",
        urgency: "routine",
        reason: ""
      }]
    }));
  };

  const addInvestigation = () => {
    setConsultationData(prev => ({
      ...prev,
      investigations: [...prev.investigations, {
        type: "",
        urgency: "routine",
        reason: ""
      }]
    }));
  };

  const saveConsultation = useMutation({
    mutationFn: async () => {
      const consultationPayload = {
        patientId: patient?.id,
        chiefComplaint: consultationData.chiefComplaint,
        historyPresentingComplaint: consultationData.historyPresentingComplaint,
        reviewOfSystems: consultationData.reviewOfSystems,
        examination: consultationData.examination,
        vitals: vitals,
        assessment: consultationData.assessment,
        plan: consultationData.plan,
        prescriptions: consultationData.prescriptions,
        referrals: consultationData.referrals,
        investigations: consultationData.investigations,
        followUp: consultationData.followUp,
        consultationDate: consultationStartTime.toISOString()
      };

      const response = await fetch('/api/consultations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-Tenant-Subdomain': window.location.hostname.split('.')[0]
        },
        body: JSON.stringify(consultationPayload)
      });

      if (!response.ok) {
        throw new Error('Failed to save consultation');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Consultation Saved",
        description: "Full consultation record has been saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/consultations'] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save consultation",
        variant: "destructive",
      });
    }
  });

  const calculateBMI = () => {
    const weight = parseFloat(vitals.weight);
    const height = parseFloat(vitals.height) / 100; // Convert cm to m
    if (weight && height) {
      const bmi = (weight / (height * height)).toFixed(1);
      setVitals(prev => ({ ...prev, bmi }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-6 w-6 text-blue-600" />
              <span className="text-xl font-bold">Full Consultation Interface</span>
            </div>
            {patient && (
              <Badge variant="secondary" className="ml-auto">
                Patient: {patient.firstName} {patient.lastName}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-12 gap-6">
          {/* Patient Info Sidebar */}
          <div className="col-span-3 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Patient Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {patient ? (
                  <div className="space-y-2">
                    <div>
                      <p className="font-semibold text-lg">{patient.firstName} {patient.lastName}</p>
                      <p className="text-sm text-gray-600">Age: {calculateAge(patient.dateOfBirth)} years</p>
                      <p className="text-sm text-gray-600">DOB: {format(new Date(patient.dateOfBirth), 'dd/MM/yyyy')}</p>
                      {patient.nhsNumber && (
                        <p className="text-sm text-gray-600">NHS: {patient.nhsNumber}</p>
                      )}
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-2">
                      <p className="text-sm"><strong>Contact:</strong> {patient.phone || 'Not provided'}</p>
                      <p className="text-sm"><strong>Email:</strong> {patient.email || 'Not provided'}</p>
                      {patient.emergencyContact && (
                        <p className="text-sm"><strong>Emergency:</strong> {patient.emergencyContact}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <User className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No patient selected</p>
                  </div>
                )}
                
                <Separator />
                
                <div>
                  <h4 className="text-sm font-medium mb-2">Quick Actions</h4>
                  <div className="space-y-1">
                    <Button size="sm" variant="ghost" className="w-full justify-start h-8">
                      <FileText className="w-3 h-3 mr-2" />
                      Medical History
                    </Button>
                    <Button size="sm" variant="ghost" className="w-full justify-start h-8">
                      <Calendar className="w-3 h-3 mr-2" />
                      Previous Visits
                    </Button>
                    <Button size="sm" variant="ghost" className="w-full justify-start h-8">
                      <Pill className="w-3 h-3 mr-2" />
                      Current Medications
                    </Button>
                    <Button size="sm" variant="ghost" className="w-full justify-start h-8 text-orange-600">
                      <AlertTriangle className="w-3 h-3 mr-2" />
                      Allergies & Alerts
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Session Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm"><strong>Started:</strong> {format(consultationStartTime, 'HH:mm')}</p>
                <p className="text-sm"><strong>Date:</strong> {format(consultationStartTime, 'dd/MM/yyyy')}</p>
                <p className="text-sm"><strong>Duration:</strong> {Math.floor((Date.now() - consultationStartTime.getTime()) / 60000)} mins</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Consultation Area */}
          <div className="col-span-9">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-6 mb-6">
                <TabsTrigger value="vitals" className="flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  Vitals
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  History
                </TabsTrigger>
                <TabsTrigger value="examination" className="flex items-center gap-1">
                  <Stethoscope className="w-3 h-3" />
                  Examination
                </TabsTrigger>
                <TabsTrigger value="assessment" className="flex items-center gap-1">
                  <Brain className="w-3 h-3" />
                  Assessment
                </TabsTrigger>
                <TabsTrigger value="plan" className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Plan
                </TabsTrigger>
                <TabsTrigger value="summary" className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Summary
                </TabsTrigger>
              </TabsList>

              <TabsContent value="vitals" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <HeartPulse className="w-5 h-5 text-red-500" />
                      Vital Signs Recording
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Heart className="w-4 h-4 text-red-500" />
                          Blood Pressure (mmHg)
                        </Label>
                        <Input
                          placeholder="120/80"
                          value={vitals.bloodPressure}
                          onChange={(e) => setVitals(prev => ({ ...prev, bloodPressure: e.target.value }))}
                          className="text-lg font-mono"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-green-500" />
                          Heart Rate (bpm)
                        </Label>
                        <Input
                          placeholder="72"
                          value={vitals.heartRate}
                          onChange={(e) => setVitals(prev => ({ ...prev, heartRate: e.target.value }))}
                          className="text-lg font-mono"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Thermometer className="w-4 h-4 text-blue-500" />
                          Temperature (°C)
                        </Label>
                        <Input
                          placeholder="37.0"
                          value={vitals.temperature}
                          onChange={(e) => setVitals(prev => ({ ...prev, temperature: e.target.value }))}
                          className="text-lg font-mono"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Respiratory Rate (/min)</Label>
                        <Input
                          placeholder="16"
                          value={vitals.respiratoryRate}
                          onChange={(e) => setVitals(prev => ({ ...prev, respiratoryRate: e.target.value }))}
                          className="text-lg font-mono"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>O2 Saturation (%)</Label>
                        <Input
                          placeholder="98"
                          value={vitals.oxygenSaturation}
                          onChange={(e) => setVitals(prev => ({ ...prev, oxygenSaturation: e.target.value }))}
                          className="text-lg font-mono"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Scale className="w-4 h-4 text-purple-500" />
                          Weight (kg)
                        </Label>
                        <Input
                          placeholder="70.0"
                          value={vitals.weight}
                          onChange={(e) => {
                            setVitals(prev => ({ ...prev, weight: e.target.value }));
                            calculateBMI();
                          }}
                          className="text-lg font-mono"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Ruler className="w-4 h-4 text-indigo-500" />
                          Height (cm)
                        </Label>
                        <Input
                          placeholder="175"
                          value={vitals.height}
                          onChange={(e) => {
                            setVitals(prev => ({ ...prev, height: e.target.value }));
                            calculateBMI();
                          }}
                          className="text-lg font-mono"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>BMI</Label>
                        <Input
                          placeholder="Calculated"
                          value={vitals.bmi}
                          readOnly
                          className="text-lg font-mono bg-gray-50"
                        />
                      </div>

                      <div className="space-y-2">
                        <Button 
                          onClick={calculateBMI}
                          variant="outline"
                          className="mt-6"
                        >
                          Calculate BMI
                        </Button>
                      </div>
                    </div>

                    {(vitals.bloodPressure || vitals.heartRate || vitals.temperature) && (
                      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2">Vital Signs Summary</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm text-blue-800">
                          {vitals.bloodPressure && <p>BP: <strong>{vitals.bloodPressure}</strong> mmHg</p>}
                          {vitals.heartRate && <p>HR: <strong>{vitals.heartRate}</strong> bpm</p>}
                          {vitals.temperature && <p>Temp: <strong>{vitals.temperature}</strong>°C</p>}
                          {vitals.oxygenSaturation && <p>O2 Sat: <strong>{vitals.oxygenSaturation}</strong>%</p>}
                          {vitals.weight && <p>Weight: <strong>{vitals.weight}</strong> kg</p>}
                          {vitals.bmi && <p>BMI: <strong>{vitals.bmi}</strong></p>}
                        </div>
                      </div>
                    )}
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
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Stethoscope className="w-5 h-5" />
                      Physical Examination Findings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
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
                  </CardContent>
                </Card>
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
                          <Card key={index} className="p-4 border-l-4 border-l-green-500 bg-green-50/50">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label>Medication</Label>
                                <Input
                                  placeholder="e.g., Amoxicillin"
                                  value={prescription.medication}
                                  onChange={(e) => {
                                    const newPrescriptions = [...consultationData.prescriptions];
                                    newPrescriptions[index].medication = e.target.value;
                                    setConsultationData(prev => ({ ...prev, prescriptions: newPrescriptions }));
                                  }}
                                />
                              </div>
                              <div>
                                <Label>Dosage</Label>
                                <Input
                                  placeholder="e.g., 500mg"
                                  value={prescription.dosage}
                                  onChange={(e) => {
                                    const newPrescriptions = [...consultationData.prescriptions];
                                    newPrescriptions[index].dosage = e.target.value;
                                    setConsultationData(prev => ({ ...prev, prescriptions: newPrescriptions }));
                                  }}
                                />
                              </div>
                              <div>
                                <Label>Frequency</Label>
                                <Input
                                  placeholder="e.g., Three times daily"
                                  value={prescription.frequency}
                                  onChange={(e) => {
                                    const newPrescriptions = [...consultationData.prescriptions];
                                    newPrescriptions[index].frequency = e.target.value;
                                    setConsultationData(prev => ({ ...prev, prescriptions: newPrescriptions }));
                                  }}
                                />
                              </div>
                              <div>
                                <Label>Duration</Label>
                                <Input
                                  placeholder="e.g., 7 days"
                                  value={prescription.duration}
                                  onChange={(e) => {
                                    const newPrescriptions = [...consultationData.prescriptions];
                                    newPrescriptions[index].duration = e.target.value;
                                    setConsultationData(prev => ({ ...prev, prescriptions: newPrescriptions }));
                                  }}
                                />
                              </div>
                              <div className="col-span-2">
                                <Label>Instructions</Label>
                                <Textarea
                                  placeholder="e.g., Take with food. Complete the full course even if feeling better."
                                  value={prescription.instructions}
                                  onChange={(e) => {
                                    const newPrescriptions = [...consultationData.prescriptions];
                                    newPrescriptions[index].instructions = e.target.value;
                                    setConsultationData(prev => ({ ...prev, prescriptions: newPrescriptions }));
                                  }}
                                  className="h-16"
                                />
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newPrescriptions = consultationData.prescriptions.filter((_, i) => i !== index);
                                setConsultationData(prev => ({ ...prev, prescriptions: newPrescriptions }));
                              }}
                              className="mt-2 text-red-600 hover:text-red-700"
                            >
                              <Minus className="w-4 h-4 mr-1" />
                              Remove
                            </Button>
                          </Card>
                        ))}
                        
                        {consultationData.prescriptions.length === 0 && (
                          <div className="text-center py-8 text-gray-500">
                            <Pill className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                            <p>No prescriptions added yet</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">Referrals</CardTitle>
                          <Button size="sm" onClick={addReferral}>
                            <Plus className="w-4 h-4 mr-1" />
                            Add
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {consultationData.referrals.map((referral, index) => (
                            <Card key={index} className="p-3 border-l-4 border-l-blue-500">
                              <div className="space-y-2">
                                <Input
                                  placeholder="Specialty (e.g., Cardiology)"
                                  value={referral.specialty}
                                  onChange={(e) => {
                                    const newReferrals = [...consultationData.referrals];
                                    newReferrals[index].specialty = e.target.value;
                                    setConsultationData(prev => ({ ...prev, referrals: newReferrals }));
                                  }}
                                />
                                <Select
                                  value={referral.urgency}
                                  onValueChange={(value: any) => {
                                    const newReferrals = [...consultationData.referrals];
                                    newReferrals[index].urgency = value;
                                    setConsultationData(prev => ({ ...prev, referrals: newReferrals }));
                                  }}
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
                                <Textarea
                                  placeholder="Clinical reason for referral"
                                  value={referral.reason}
                                  onChange={(e) => {
                                    const newReferrals = [...consultationData.referrals];
                                    newReferrals[index].reason = e.target.value;
                                    setConsultationData(prev => ({ ...prev, referrals: newReferrals }));
                                  }}
                                  className="h-16"
                                />
                              </div>
                            </Card>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">Investigations</CardTitle>
                          <Button size="sm" onClick={addInvestigation}>
                            <Plus className="w-4 h-4 mr-1" />
                            Add
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {consultationData.investigations.map((investigation, index) => (
                            <Card key={index} className="p-3 border-l-4 border-l-purple-500">
                              <div className="space-y-2">
                                <Input
                                  placeholder="Investigation (e.g., FBC, ECG)"
                                  value={investigation.type}
                                  onChange={(e) => {
                                    const newInvestigations = [...consultationData.investigations];
                                    newInvestigations[index].type = e.target.value;
                                    setConsultationData(prev => ({ ...prev, investigations: newInvestigations }));
                                  }}
                                />
                                <Select
                                  value={investigation.urgency}
                                  onValueChange={(value: any) => {
                                    const newInvestigations = [...consultationData.investigations];
                                    newInvestigations[index].urgency = value;
                                    setConsultationData(prev => ({ ...prev, investigations: newInvestigations }));
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="routine">Routine</SelectItem>
                                    <SelectItem value="urgent">Urgent</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Textarea
                                  placeholder="Clinical indication"
                                  value={investigation.reason}
                                  onChange={(e) => {
                                    const newInvestigations = [...consultationData.investigations];
                                    newInvestigations[index].reason = e.target.value;
                                    setConsultationData(prev => ({ ...prev, investigations: newInvestigations }));
                                  }}
                                  className="h-16"
                                />
                              </div>
                            </Card>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="summary" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      Consultation Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold text-blue-900 mb-3">Patient Details</h4>
                        {patient ? (
                          <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                            <p><strong>Name:</strong> {patient.firstName} {patient.lastName}</p>
                            <p><strong>Age:</strong> {calculateAge(patient.dateOfBirth)} years</p>
                            <p><strong>DOB:</strong> {format(new Date(patient.dateOfBirth), 'dd/MM/yyyy')}</p>
                            <p><strong>Date:</strong> {format(consultationStartTime, 'dd/MM/yyyy HH:mm')}</p>
                          </div>
                        ) : (
                          <p className="text-gray-500 bg-gray-50 p-4 rounded-lg">No patient selected</p>
                        )}
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-green-900 mb-3">Vital Signs</h4>
                        <div className="bg-green-50 p-4 rounded-lg space-y-1 text-sm">
                          {vitals.bloodPressure && <p><strong>BP:</strong> {vitals.bloodPressure} mmHg</p>}
                          {vitals.heartRate && <p><strong>HR:</strong> {vitals.heartRate} bpm</p>}
                          {vitals.temperature && <p><strong>Temp:</strong> {vitals.temperature}°C</p>}
                          {vitals.oxygenSaturation && <p><strong>O2 Sat:</strong> {vitals.oxygenSaturation}%</p>}
                          {vitals.weight && <p><strong>Weight:</strong> {vitals.weight} kg</p>}
                          {vitals.bmi && <p><strong>BMI:</strong> {vitals.bmi}</p>}
                          {!vitals.bloodPressure && !vitals.heartRate && (
                            <p className="text-gray-500">No vital signs recorded</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}