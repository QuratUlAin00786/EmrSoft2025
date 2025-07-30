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

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { FileText, Plus, Calendar, User, Stethoscope, Pill, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import type { MedicalRecord } from "@/types";
import anatomicalDiagramImage from "@assets/image_1753778337429.png";

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
  })).optional()
});

interface ConsultationNotesProps {
  patientId: number;
  patientName?: string;
  patientNumber?: string;
}

export default function ConsultationNotes({ patientId, patientName, patientNumber }: ConsultationNotesProps) {
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [showAnatomicalViewer, setShowAnatomicalViewer] = useState(false);
  const [selectedFacialFeatures, setSelectedFacialFeatures] = useState<string[]>([]);
  const [showRightPanel, setShowRightPanel] = useState(false);

  const [activeTab, setActiveTab] = useState("basic");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [medicalRecords, setMedicalRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMedicalRecords = async () => {
      if (!patientId) return;
      
      try {
        setIsLoading(true);
        console.log(`Fetching medical records for patient ${patientId}...`);
        
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/patients/${patientId}/records`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Tenant-Subdomain': 'demo',
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        
        console.log("Medical records response status:", response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Fetched medical records data:", data);
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
      referrals: []
    }
  });

  // Reset form when editing a record
  useEffect(() => {
    if (editingRecord) {
      form.reset({
        type: editingRecord.type || "consultation",
        title: editingRecord.title || "",
        notes: editingRecord.notes || "",
        diagnosis: editingRecord.diagnosis || "",
        treatment: editingRecord.treatment || "",
        medications: editingRecord.prescription?.medications || [],
        followUpRequired: false,
        followUpDate: "",
        referrals: []
      });
    } else {
      form.reset({
        type: "consultation",
        title: "",
        notes: "",
        diagnosis: "",
        treatment: "",
        medications: [],
        followUpRequired: false,
        followUpDate: "",
        referrals: []
      });
    }
  }, [editingRecord, form]);

  const [isSavingRecord, setIsSavingRecord] = useState(false);

  const updateRecord = async (recordId: number, data: any) => {
    try {
      setIsSavingRecord(true);
      
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/patients/${patientId}/records/${recordId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Tenant-Subdomain': 'demo'
        },
        credentials: 'include',
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      toast({
        title: "Success",
        description: "Medical record updated successfully",
      });

      // Refresh the records list
      const refreshToken = localStorage.getItem('token');
      const fetchResponse = await fetch(`/api/patients/${patientId}/records`, {
        headers: {
          'Authorization': `Bearer ${refreshToken}`,
          'X-Tenant-Subdomain': 'demo',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (fetchResponse.ok) {
        const updatedRecords = await fetchResponse.json();
        setMedicalRecords(updatedRecords || []);
      }

      setIsAddingNote(false);
      setEditingRecord(null);
      form.reset();
    } catch (error) {
      console.error("Error updating record:", error);
      toast({
        title: "Error",
        description: "Failed to update medical record",
        variant: "destructive",
      });
    } finally {
      setIsSavingRecord(false);
    }
  };

  const saveRecord = async (data: any) => {
    try {
      setIsSavingRecord(true);
      
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/patients/${patientId}/records`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Tenant-Subdomain': 'demo'
        },
        credentials: 'include',
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const newRecord = await response.json();
      setMedicalRecords(prev => [newRecord, ...prev]);
      setIsAddingNote(false);
      form.reset();
      toast({
        title: "Record saved successfully",
        description: "The medical record has been saved to the patient's file.",
      });
    } catch (error: any) {
      toast({
        title: "Error saving record",
        description: error.message || "Failed to save the medical record. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingRecord(false);
    }
  };

  const onSubmit = async (data: any) => {
    if (editingRecord) {
      // Update existing record
      await updateRecord(editingRecord.id, {
        type: data.type,
        title: data.title,
        notes: data.notes,
        diagnosis: data.diagnosis,
        treatment: data.treatment,
        prescription: {
          medications: data.medications || []
        }
      });
    } else {
      // Create new record
      await saveRecord({
        type: data.type,
        title: data.title,
        notes: data.notes,
        diagnosis: data.diagnosis,
        treatment: data.treatment,
        prescription: {
          medications: data.medications || []
        }
      });
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
              <p className="text-sm text-muted-foreground mt-1">
                {patientName} • Patient ID: {patientNumber}
              </p>
            )}
          </div>
          <Dialog open={isAddingNote} onOpenChange={(open) => {
            console.log("🔥 MEDICAL RECORD DIALOG STATE CHANGE:", open);
            setIsAddingNote(open);
            if (!open) {
              console.log("🔥 CLEARING EDITING RECORD");
              setEditingRecord(null);
              setActiveTab("basic");
            }
          }} modal={true}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Record
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl h-[80vh] overflow-y-auto" id="medical-record-dialog">
              <DialogHeader>
                <DialogTitle>{editingRecord ? 'Edit Medical Record' : 'Add Medical Record'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-4 mb-6">
                    <TabsTrigger value="basic" className="bg-blue-100 font-semibold">Basic Info ⭐</TabsTrigger>
                    <TabsTrigger value="clinical">Clinical Notes</TabsTrigger>
                    <TabsTrigger value="medications">Medications</TabsTrigger>
                    <TabsTrigger value="followup">Follow-up</TabsTrigger>
                  </TabsList>

                  <TabsContent value="basic" className="space-y-6 p-4">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="type">Record Type</Label>
                        <Select
                          value={form.watch("type")}
                          onValueChange={(value) => form.setValue("type", value as any)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="consultation">Consultation</SelectItem>
                            <SelectItem value="prescription">Prescription</SelectItem>
                            <SelectItem value="lab_result">Lab Result</SelectItem>
                            <SelectItem value="imaging">Imaging</SelectItem>
                            <SelectItem value="procedure">Procedure</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="title">Title</Label>
                        <Input
                          {...form.register("title")}
                          placeholder="e.g., Annual Checkup, Blood Work Results"
                        />
                        {form.formState.errors.title && (
                          <p className="text-sm text-red-600 mt-1">
                            {form.formState.errors.title.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="clinical" className="space-y-4">
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mb-4">
                      <Label htmlFor="examination" className="text-blue-800 font-semibold">Examination</Label>
                      <Select
                        onValueChange={(value) => {
                          if (value === "anatomical") {
                            setShowAnatomicalViewer(true);
                          }
                        }}
                      >
                        <SelectTrigger className="mt-2 border-blue-300">
                          <SelectValue placeholder="Select examination type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General Examination</SelectItem>
                          <SelectItem value="cardiovascular">Cardiovascular</SelectItem>
                          <SelectItem value="respiratory">Respiratory</SelectItem>
                          <SelectItem value="neurological">Neurological</SelectItem>
                          <SelectItem value="anatomical">🔬 Anatomical (View Muscles)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="notes">Clinical Notes</Label>
                      <Textarea
                        {...form.register("notes")}
                        placeholder="Detailed consultation notes, observations, and findings..."
                        className="min-h-32"
                      />
                      {form.formState.errors.notes && (
                        <p className="text-sm text-red-600 mt-1">
                          {form.formState.errors.notes.message}
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="diagnosis">Diagnosis</Label>
                        <Textarea
                          {...form.register("diagnosis")}
                          placeholder="Primary and secondary diagnoses with ICD codes..."
                          className="min-h-24"
                        />
                      </div>
                      <div>
                        <Label htmlFor="treatment">Treatment Plan</Label>
                        <Textarea
                          {...form.register("treatment")}
                          placeholder="Treatment recommendations and care plan..."
                          className="min-h-24"
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="medications" className="space-y-4">
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-4">Prescribed Medications</h4>
                      <div className="space-y-4">
                        {(form.watch("medications") || []).map((_, index) => (
                          <div key={index} className="grid grid-cols-4 gap-3 p-3 border rounded">
                            <Input
                              {...form.register(`medications.${index}.name` as any)}
                              placeholder="Medication name"
                            />
                            <Input
                              {...form.register(`medications.${index}.dosage` as any)}
                              placeholder="Dosage (e.g., 10mg)"
                            />
                            <Input
                              {...form.register(`medications.${index}.frequency` as any)}
                              placeholder="Frequency (e.g., twice daily)"
                            />
                            <Input
                              {...form.register(`medications.${index}.duration` as any)}
                              placeholder="Duration (e.g., 30 days)"
                            />
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            const current = form.watch("medications") || [];
                            form.setValue("medications", [...current, { name: "", dosage: "", frequency: "", duration: "" }] as any);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Medication
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="followup" className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        {...form.register("followUpRequired")}
                        className="rounded border-gray-300"
                      />
                      <Label>Follow-up appointment required</Label>
                    </div>
                    {form.watch("followUpRequired") && (
                      <div>
                        <Label htmlFor="followUpDate">Follow-up Date</Label>
                        <Input
                          type="date"
                          {...form.register("followUpDate" as any)}
                        />
                      </div>
                    )}
                  </TabsContent>
                </Tabs>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsAddingNote(false);
                      setEditingRecord(null);
                      setActiveTab("basic");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSavingRecord}
                  >
                    {isSavingRecord ? "Saving..." : (editingRecord ? "Update Record" : "Save Record")}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {!Array.isArray(medicalRecords) || medicalRecords.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No medical records found</p>
            <p className="text-sm">Add the first consultation note or medical record</p>
          </div>
        ) : (
          <div className="space-y-4">
            {(medicalRecords as any[]).map((record: any) => (
              <div key={record.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {getRecordIcon(record.type)}
                      <h4 className="font-semibold">{record.title}</h4>
                    </div>
                    <Badge className={getRecordColor(record.type)}>
                      {record.type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-gray-500 flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(record.createdAt), "MMM d, yyyy 'at' h:mm a")}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log("🔥 MEDICAL RECORD EDIT BUTTON CLICKED:", record);
                        console.log("🔥 Setting editingRecord:", record);
                        console.log("🔥 Setting isAddingNote to true");
                        alert(`Editing medical record: ${record.title || 'Untitled'}`);
                        setEditingRecord(record);
                        setIsAddingNote(true);
                      }}
                    >
                      Edit Medical Record
                    </Button>
                  </div>
                </div>

                {record.notes && (
                  <div className="mb-3">
                    <p className="text-sm text-gray-700">{record.notes}</p>
                  </div>
                )}

                {record.diagnosis && (
                  <div className="mb-3">
                    <h5 className="font-medium text-sm mb-1">Diagnosis:</h5>
                    <p className="text-sm text-gray-700">{record.diagnosis}</p>
                  </div>
                )}

                {record.treatment && (
                  <div className="mb-3">
                    <h5 className="font-medium text-sm mb-1">Treatment:</h5>
                    <p className="text-sm text-gray-700">{record.treatment}</p>
                  </div>
                )}

                {record.prescription?.medications && record.prescription.medications.length > 0 && (
                  <div className="mb-3">
                    <h5 className="font-medium text-sm mb-2 flex items-center gap-1">
                      <Pill className="h-4 w-4" />
                      Prescribed Medications:
                    </h5>
                    <div className="space-y-2">
                      {record.prescription.medications.map((med: any, index: number) => (
                        <div key={index} className="bg-green-50 p-2 rounded text-sm">
                          <strong>{med.name}</strong> - {med.dosage}, {med.frequency}
                          {med.duration && <span> for {med.duration}</span>}
                        </div>
                      ))}
                    </div>
                    
                    {/* Real-time Prescription Safety Warnings */}
                    <PrescriptionWarnings 
                      patientId={patientId}
                      medications={record.prescription.medications}
                      recordId={record.id}
                    />
                  </div>
                )}

                {record.aiSuggestions?.recommendations && record.aiSuggestions.recommendations.length > 0 && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                    <h5 className="font-medium text-sm mb-2 flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4 text-blue-600" />
                      AI Recommendations:
                    </h5>
                    <ul className="text-sm text-blue-700 space-y-1">
                      {record.aiSuggestions.recommendations.map((rec: any, index: number) => (
                        <li key={index} className="flex items-start gap-1">
                          <span className="text-blue-600">•</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Professional Anatomical Viewer Dialog - Matching Your Reference Sketches */}
      <Dialog open={showAnatomicalViewer} onOpenChange={setShowAnatomicalViewer}>
        <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowAnatomicalViewer(false)}
                  className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full transition-all duration-200 shadow-lg hover:shadow-xl border-2 border-blue-500"
                >
                  <svg 
                    width="20" 
                    height="20" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="3"
                    className="text-white"
                  >
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <DialogTitle className="text-2xl font-bold text-blue-800 flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">🔬</span>
                  </div>
                  Professional Anatomical Examination Interface
                </DialogTitle>
              </div>
            </div>
            <p className="text-gray-600 text-sm">Advanced facial muscle analysis and clinical documentation system</p>
          </DialogHeader>
          
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            {/* Left Panel - Professional Muscle Selection */}
            <div className={`xl:col-span-1 bg-gradient-to-br from-gray-50 to-blue-50 p-5 rounded-xl border-2 border-blue-100 transition-transform duration-500 ${showRightPanel ? '-translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                <h3 className="text-lg font-semibold text-gray-800">Facial Muscle Analysis</h3>
              </div>
              
              <div className="space-y-4">
                {/* Muscle Selection Dropdown */}
                <Select 
                  onValueChange={(value) => {
                    if (value && value !== "select-muscle" && !selectedFacialFeatures.includes(value)) {
                      setSelectedFacialFeatures([...selectedFacialFeatures, value]);
                    }
                  }}
                >
                  <SelectTrigger className="w-full border-2 border-gray-300 focus:border-blue-500">
                    <SelectValue placeholder="Select facial muscle..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="select-muscle" disabled>Select a muscle to analyze</SelectItem>
                    <SelectItem value="frontalis">Frontalis - Forehead muscle</SelectItem>
                    <SelectItem value="temporalis">Temporalis - Temple area</SelectItem>
                    <SelectItem value="orbicularis_oculi">Orbicularis Oculi - Eye muscles</SelectItem>
                    <SelectItem value="procerus">Procerus - Nose bridge muscle</SelectItem>
                    <SelectItem value="corrugator_supercilii">Corrugator Supercilii - Eyebrow muscle</SelectItem>
                    <SelectItem value="levator_palpebrae_superioris">Levator Palpebrae Superioris - Upper eyelid</SelectItem>
                    <SelectItem value="levator_labii_superioris_alaeque_nasi">Levator Labii Superioris Alaeque Nasi - Nose and upper lip</SelectItem>
                    <SelectItem value="nasalis">Nasalis - Nose muscle</SelectItem>
                    <SelectItem value="zygomaticus_major">Zygomaticus Major - Main cheek muscle</SelectItem>
                    <SelectItem value="zygomaticus_minor">Zygomaticus Minor - Small cheek muscle</SelectItem>
                    <SelectItem value="masseter">Masseter - Jaw muscle</SelectItem>
                    <SelectItem value="risorius">Risorius - Smile muscle</SelectItem>
                    <SelectItem value="buccinator">Buccinator - Cheek muscle</SelectItem>
                    <SelectItem value="orbicularis_oris">Orbicularis Oris - Mouth muscle</SelectItem>
                    <SelectItem value="depressor_septi_nasi">Depressor Septi Nasi - Nose septum depressor</SelectItem>
                    <SelectItem value="depressor_anguli_oris">Depressor Anguli Oris - Mouth corner depressor</SelectItem>
                    <SelectItem value="depressor_labii_inferioris">Depressor Labii Inferioris - Lower lip depressor</SelectItem>
                    <SelectItem value="mentalis">Mentalis - Chin muscle</SelectItem>
                    <SelectItem value="platysma">Platysma - Neck muscle</SelectItem>
                  </SelectContent>
                </Select>

                {/* Selected Muscles Display */}
                {selectedFacialFeatures.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">Selected Muscles:</Label>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {selectedFacialFeatures.map((muscleId) => {
                        const muscle = [
                          { id: 'frontalis', label: 'Frontalis', desc: 'Forehead muscle' },
                          { id: 'temporalis', label: 'Temporalis', desc: 'Temple area' },
                          { id: 'orbicularis_oculi', label: 'Orbicularis Oculi', desc: 'Eye muscles' },
                          { id: 'procerus', label: 'Procerus', desc: 'Nose bridge muscle' },
                          { id: 'corrugator_supercilii', label: 'Corrugator Supercilii', desc: 'Eyebrow muscle' },
                          { id: 'levator_palpebrae_superioris', label: 'Levator Palpebrae Superioris', desc: 'Upper eyelid' },
                          { id: 'levator_labii_superioris_alaeque_nasi', label: 'Levator Labii Superioris Alaeque Nasi', desc: 'Nose and upper lip' },
                          { id: 'nasalis', label: 'Nasalis', desc: 'Nose muscle' },
                          { id: 'zygomaticus_major', label: 'Zygomaticus Major', desc: 'Main cheek muscle' },
                          { id: 'zygomaticus_minor', label: 'Zygomaticus Minor', desc: 'Small cheek muscle' },
                          { id: 'masseter', label: 'Masseter', desc: 'Jaw muscle' },
                          { id: 'risorius', label: 'Risorius', desc: 'Smile muscle' },
                          { id: 'buccinator', label: 'Buccinator', desc: 'Cheek muscle' },
                          { id: 'orbicularis_oris', label: 'Orbicularis Oris', desc: 'Mouth muscle' },
                          { id: 'depressor_septi_nasi', label: 'Depressor Septi Nasi', desc: 'Nose septum depressor' },
                          { id: 'depressor_anguli_oris', label: 'Depressor Anguli Oris', desc: 'Mouth corner depressor' },
                          { id: 'depressor_labii_inferioris', label: 'Depressor Labii Inferioris', desc: 'Lower lip depressor' },
                          { id: 'mentalis', label: 'Mentalis', desc: 'Chin muscle' },
                          { id: 'platysma', label: 'Platysma', desc: 'Neck muscle' }
                        ].find(m => m.id === muscleId);
                        
                        return (
                          <div key={muscleId} className="flex items-center justify-between bg-red-100 border border-red-300 rounded-lg p-2">
                            <div className="flex-1">
                              <div className="text-sm font-semibold text-gray-800">{muscle?.label}</div>
                              <div className="text-xs text-gray-600">{muscle?.desc}</div>
                            </div>
                            <button
                              onClick={() => setSelectedFacialFeatures(selectedFacialFeatures.filter(f => f !== muscleId))}
                              className="ml-2 text-red-600 hover:text-red-800 font-bold text-sm"
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-4 p-3 bg-blue-100 rounded-lg border border-blue-200">
                <div className="text-sm font-medium text-blue-800 mb-1">
                  Selected: {selectedFacialFeatures.length} muscle{selectedFacialFeatures.length !== 1 ? 's' : ''}
                </div>
                <div className="text-xs text-blue-600">
                  Click muscles to highlight on diagram
                </div>
              </div>


            </div>

            {/* Center Panel - Interactive Face Diagram */}
            <div className={`xl:col-span-2 relative transition-transform duration-500 ${showRightPanel ? '-translate-x-full' : 'translate-x-0'}`}>
              <div className="bg-white border-4 border-gray-300 rounded-xl p-6 shadow-lg">
                <div className="bg-gradient-to-b from-blue-50 to-white rounded-lg p-4 min-h-[600px] flex items-center justify-center relative">
                  
                  {/* Interactive Face SVG Diagram */}
                  <div className="relative w-full max-w-lg mx-auto">
                    <svg 
                      viewBox="0 0 300 400" 
                      className="w-full h-auto max-h-[500px]"
                      style={{ filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))' }}
                    >
                      {/* Face outline */}
                      <ellipse cx="150" cy="200" rx="100" ry="130" fill="#f8f9fa" stroke="#6366f1" strokeWidth="3" />
                      
                      {/* Forehead - Frontalis */}
                      <ellipse 
                        cx="150" cy="120" rx="80" ry="25" 
                        fill={selectedFacialFeatures.includes('frontalis') ? '#fef3c7' : 'transparent'}
                        stroke={selectedFacialFeatures.includes('frontalis') ? '#f59e0b' : 'transparent'}
                        strokeWidth="2"
                        className="cursor-pointer hover:fill-yellow-100 transition-all duration-200"
                        onClick={() => {
                          if (selectedFacialFeatures.includes('frontalis')) {
                            setSelectedFacialFeatures(selectedFacialFeatures.filter(f => f !== 'frontalis'));
                          } else {
                            setSelectedFacialFeatures([...selectedFacialFeatures, 'frontalis']);
                          }
                        }}
                      />
                      
                      {/* Eyes - Orbicularis Oculi */}
                      <ellipse 
                        cx="125" cy="160" rx="20" ry="12" 
                        fill={selectedFacialFeatures.includes('orbicularis_oculi') ? '#dcfce7' : 'white'}
                        stroke={selectedFacialFeatures.includes('orbicularis_oculi') ? '#22c55e' : '#6b7280'}
                        strokeWidth="2"
                        className="cursor-pointer hover:fill-green-100 transition-all duration-200"
                        onClick={() => {
                          if (selectedFacialFeatures.includes('orbicularis_oculi')) {
                            setSelectedFacialFeatures(selectedFacialFeatures.filter(f => f !== 'orbicularis_oculi'));
                          } else {
                            setSelectedFacialFeatures([...selectedFacialFeatures, 'orbicularis_oculi']);
                          }
                        }}
                      />
                      <ellipse 
                        cx="175" cy="160" rx="20" ry="12" 
                        fill={selectedFacialFeatures.includes('orbicularis_oculi') ? '#dcfce7' : 'white'}
                        stroke={selectedFacialFeatures.includes('orbicularis_oculi') ? '#22c55e' : '#6b7280'}
                        strokeWidth="2"
                        className="cursor-pointer hover:fill-green-100 transition-all duration-200"
                        onClick={() => {
                          if (selectedFacialFeatures.includes('orbicularis_oculi')) {
                            setSelectedFacialFeatures(selectedFacialFeatures.filter(f => f !== 'orbicularis_oculi'));
                          } else {
                            setSelectedFacialFeatures([...selectedFacialFeatures, 'orbicularis_oculi']);
                          }
                        }}
                      />
                      
                      {/* Pupils */}
                      <circle cx="125" cy="160" r="5" fill="#1f2937" />
                      <circle cx="175" cy="160" r="5" fill="#1f2937" />
                      
                      {/* Nose - Nasalis */}
                      <polygon 
                        points="150,180 140,200 150,210 160,200" 
                        fill={selectedFacialFeatures.includes('nasalis') ? '#fde68a' : '#f3f4f6'}
                        stroke={selectedFacialFeatures.includes('nasalis') ? '#f59e0b' : '#9ca3af'}
                        strokeWidth="2"
                        className="cursor-pointer hover:fill-yellow-200 transition-all duration-200"
                        onClick={() => {
                          if (selectedFacialFeatures.includes('nasalis')) {
                            setSelectedFacialFeatures(selectedFacialFeatures.filter(f => f !== 'nasalis'));
                          } else {
                            setSelectedFacialFeatures([...selectedFacialFeatures, 'nasalis']);
                          }
                        }}
                      />
                      
                      {/* Cheeks - Zygomaticus Major */}
                      <ellipse 
                        cx="110" cy="200" rx="25" ry="20" 
                        fill={selectedFacialFeatures.includes('zygomaticus_major') ? '#fecaca' : 'transparent'}
                        stroke={selectedFacialFeatures.includes('zygomaticus_major') ? '#ef4444' : 'transparent'}
                        strokeWidth="2"
                        className="cursor-pointer hover:fill-red-100 transition-all duration-200"
                        onClick={() => {
                          if (selectedFacialFeatures.includes('zygomaticus_major')) {
                            setSelectedFacialFeatures(selectedFacialFeatures.filter(f => f !== 'zygomaticus_major'));
                          } else {
                            setSelectedFacialFeatures([...selectedFacialFeatures, 'zygomaticus_major']);
                          }
                        }}
                      />
                      <ellipse 
                        cx="190" cy="200" rx="25" ry="20" 
                        fill={selectedFacialFeatures.includes('zygomaticus_major') ? '#fecaca' : 'transparent'}
                        stroke={selectedFacialFeatures.includes('zygomaticus_major') ? '#ef4444' : 'transparent'}
                        strokeWidth="2"
                        className="cursor-pointer hover:fill-red-100 transition-all duration-200"
                        onClick={() => {
                          if (selectedFacialFeatures.includes('zygomaticus_major')) {
                            setSelectedFacialFeatures(selectedFacialFeatures.filter(f => f !== 'zygomaticus_major'));
                          } else {
                            setSelectedFacialFeatures([...selectedFacialFeatures, 'zygomaticus_major']);
                          }
                        }}
                      />
                      
                      {/* Mouth - Orbicularis Oris */}
                      <ellipse 
                        cx="150" cy="240" rx="30" ry="12" 
                        fill={selectedFacialFeatures.includes('orbicularis_oris') ? '#e0e7ff' : '#fde68a'}
                        stroke={selectedFacialFeatures.includes('orbicularis_oris') ? '#6366f1' : '#f59e0b'}
                        strokeWidth="2"
                        className="cursor-pointer hover:fill-indigo-100 transition-all duration-200"
                        onClick={() => {
                          if (selectedFacialFeatures.includes('orbicularis_oris')) {
                            setSelectedFacialFeatures(selectedFacialFeatures.filter(f => f !== 'orbicularis_oris'));
                          } else {
                            setSelectedFacialFeatures([...selectedFacialFeatures, 'orbicularis_oris']);
                          }
                        }}
                      />
                      
                      {/* Jaw - Masseter */}
                      <ellipse 
                        cx="100" cy="250" rx="20" ry="30" 
                        fill={selectedFacialFeatures.includes('masseter') ? '#ddd6fe' : 'transparent'}
                        stroke={selectedFacialFeatures.includes('masseter') ? '#8b5cf6' : 'transparent'}
                        strokeWidth="2"
                        className="cursor-pointer hover:fill-purple-100 transition-all duration-200"
                        onClick={() => {
                          if (selectedFacialFeatures.includes('masseter')) {
                            setSelectedFacialFeatures(selectedFacialFeatures.filter(f => f !== 'masseter'));
                          } else {
                            setSelectedFacialFeatures([...selectedFacialFeatures, 'masseter']);
                          }
                        }}
                      />
                      <ellipse 
                        cx="200" cy="250" rx="20" ry="30" 
                        fill={selectedFacialFeatures.includes('masseter') ? '#ddd6fe' : 'transparent'}
                        stroke={selectedFacialFeatures.includes('masseter') ? '#8b5cf6' : 'transparent'}
                        strokeWidth="2"
                        className="cursor-pointer hover:fill-purple-100 transition-all duration-200"
                        onClick={() => {
                          if (selectedFacialFeatures.includes('masseter')) {
                            setSelectedFacialFeatures(selectedFacialFeatures.filter(f => f !== 'masseter'));
                          } else {
                            setSelectedFacialFeatures([...selectedFacialFeatures, 'masseter']);
                          }
                        }}
                      />
                      
                      {/* Chin - Mentalis */}
                      <ellipse 
                        cx="150" cy="290" rx="25" ry="15" 
                        fill={selectedFacialFeatures.includes('mentalis') ? '#fed7d7' : 'transparent'}
                        stroke={selectedFacialFeatures.includes('mentalis') ? '#f56565' : 'transparent'}
                        strokeWidth="2"
                        className="cursor-pointer hover:fill-red-100 transition-all duration-200"
                        onClick={() => {
                          if (selectedFacialFeatures.includes('mentalis')) {
                            setSelectedFacialFeatures(selectedFacialFeatures.filter(f => f !== 'mentalis'));
                          } else {
                            setSelectedFacialFeatures([...selectedFacialFeatures, 'mentalis']);
                          }
                        }}
                      />
                      
                      {/* Temple areas - Temporalis */}
                      <ellipse 
                        cx="80" cy="140" rx="15" ry="25" 
                        fill={selectedFacialFeatures.includes('temporalis') ? '#fef3c7' : 'transparent'}
                        stroke={selectedFacialFeatures.includes('temporalis') ? '#f59e0b' : 'transparent'}
                        strokeWidth="2"
                        className="cursor-pointer hover:fill-yellow-100 transition-all duration-200"
                        onClick={() => {
                          if (selectedFacialFeatures.includes('temporalis')) {
                            setSelectedFacialFeatures(selectedFacialFeatures.filter(f => f !== 'temporalis'));
                          } else {
                            setSelectedFacialFeatures([...selectedFacialFeatures, 'temporalis']);
                          }
                        }}
                      />
                      <ellipse 
                        cx="220" cy="140" rx="15" ry="25" 
                        fill={selectedFacialFeatures.includes('temporalis') ? '#fef3c7' : 'transparent'}
                        stroke={selectedFacialFeatures.includes('temporalis') ? '#f59e0b' : 'transparent'}
                        strokeWidth="2"
                        className="cursor-pointer hover:fill-yellow-100 transition-all duration-200"
                        onClick={() => {
                          if (selectedFacialFeatures.includes('temporalis')) {
                            setSelectedFacialFeatures(selectedFacialFeatures.filter(f => f !== 'temporalis'));
                          } else {
                            setSelectedFacialFeatures([...selectedFacialFeatures, 'temporalis']);
                          }
                        }}
                      />
                      
                      {/* Eyebrows */}
                      <path d="M 100 145 Q 125 140 145 145" stroke="#4b5563" strokeWidth="3" fill="none" strokeLinecap="round" />
                      <path d="M 155 145 Q 175 140 200 145" stroke="#4b5563" strokeWidth="3" fill="none" strokeLinecap="round" />
                    </svg>
                    
                    {/* Click instruction */}
                    <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                      Click facial areas to select muscles
                    </div>
                  </div>
                  
                  {/* Right Arrow Button - Slide to Right Panel */}
                  <button
                    onClick={() => setShowRightPanel(!showRightPanel)}
                    className="absolute right-2 top-2 bg-white border border-gray-300 rounded-full p-2 shadow-md hover:bg-gray-50 hover:shadow-lg transition-all duration-200"
                    title="Slide to anatomical reference panel"
                  >
                    <svg 
                      width="16" 
                      height="16" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2"
                      className={`text-gray-600 transition-transform duration-300 ${showRightPanel ? 'rotate-180' : ''}`}
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </button>
                </div>
                
                {/* Professional Medical Diagram Label */}
                <div className="mt-4 text-center">
                  <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-600 text-white text-sm font-semibold shadow-lg">
                    <div className="w-3 h-3 bg-white rounded-full mr-2 animate-pulse"></div>
                    Interactive Facial Muscle Anatomy
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel - Facial Muscle Options */}
            <div className={`xl:col-span-1 bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-xl border-2 border-blue-200 transition-transform duration-500 ${showRightPanel ? '-translate-x-full' : 'translate-x-0'}`}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                <h3 className="text-lg font-semibold text-gray-800">Face</h3>
              </div>
              
              {/* Anatomy Rating Scale */}
              <div className="mb-6 p-4 bg-blue-100 border border-blue-300 rounded-lg">
                <div className="text-sm font-semibold text-blue-800 mb-2">Anatomy</div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-gray-600">0</span>
                  <div className="flex-1 bg-gray-200 h-2 rounded-full">
                    <div className="bg-yellow-400 h-2 rounded-full" style={{ width: '60%' }}></div>
                  </div>
                  <span className="text-xs text-gray-600">5</span>
                </div>
                <div className="text-xs text-gray-600">Rating: 3/5</div>
              </div>
              
              {/* Facial Areas - Based on Second Image */}
              <div className="space-y-3 mb-6">
                <Label className="text-sm font-semibold text-gray-700">Add Facial Areas Before Treatment</Label>
                
                {/* Grid of facial area thumbnails */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Eye Area */}
                  <div 
                    className={`border-2 p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                      selectedFacialFeatures.includes('orbicularis_oculi') 
                        ? 'border-blue-500 bg-blue-100' 
                        : 'border-gray-300 bg-white hover:border-blue-300'
                    }`}
                    onClick={() => {
                      if (selectedFacialFeatures.includes('orbicularis_oculi')) {
                        setSelectedFacialFeatures(selectedFacialFeatures.filter(f => f !== 'orbicularis_oculi'));
                      } else {
                        setSelectedFacialFeatures([...selectedFacialFeatures, 'orbicularis_oculi']);
                      }
                    }}
                  >
                    <div className="w-full h-12 bg-gradient-to-b from-blue-200 to-blue-300 rounded mb-2 flex items-center justify-center">
                      <span className="text-xs font-medium">👁️ Eyes</span>
                    </div>
                    <div className="text-xs text-center text-gray-600">Orbicularis Oculi</div>
                  </div>
                  
                  {/* Forehead Area */}
                  <div 
                    className={`border-2 p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                      selectedFacialFeatures.includes('frontalis') 
                        ? 'border-yellow-500 bg-yellow-100' 
                        : 'border-gray-300 bg-white hover:border-yellow-300'
                    }`}
                    onClick={() => {
                      if (selectedFacialFeatures.includes('frontalis')) {
                        setSelectedFacialFeatures(selectedFacialFeatures.filter(f => f !== 'frontalis'));
                      } else {
                        setSelectedFacialFeatures([...selectedFacialFeatures, 'frontalis']);
                      }
                    }}
                  >
                    <div className="w-full h-12 bg-gradient-to-b from-yellow-200 to-yellow-300 rounded mb-2 flex items-center justify-center">
                      <span className="text-xs font-medium">Forehead</span>
                    </div>
                    <div className="text-xs text-center text-gray-600">Frontalis</div>
                  </div>
                  
                  {/* Cheek Area */}
                  <div 
                    className={`border-2 p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                      selectedFacialFeatures.includes('zygomaticus_major') 
                        ? 'border-red-500 bg-red-100' 
                        : 'border-gray-300 bg-white hover:border-red-300'
                    }`}
                    onClick={() => {
                      if (selectedFacialFeatures.includes('zygomaticus_major')) {
                        setSelectedFacialFeatures(selectedFacialFeatures.filter(f => f !== 'zygomaticus_major'));
                      } else {
                        setSelectedFacialFeatures([...selectedFacialFeatures, 'zygomaticus_major']);
                      }
                    }}
                  >
                    <div className="w-full h-12 bg-gradient-to-b from-red-200 to-red-300 rounded mb-2 flex items-center justify-center">
                      <span className="text-xs font-medium">Cheeks</span>
                    </div>
                    <div className="text-xs text-center text-gray-600">Zygomaticus</div>
                  </div>
                  
                  {/* Jaw Area */}
                  <div 
                    className={`border-2 p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                      selectedFacialFeatures.includes('masseter') 
                        ? 'border-purple-500 bg-purple-100' 
                        : 'border-gray-300 bg-white hover:border-purple-300'
                    }`}
                    onClick={() => {
                      if (selectedFacialFeatures.includes('masseter')) {
                        setSelectedFacialFeatures(selectedFacialFeatures.filter(f => f !== 'masseter'));
                      } else {
                        setSelectedFacialFeatures([...selectedFacialFeatures, 'masseter']);
                      }
                    }}
                  >
                    <div className="w-full h-12 bg-gradient-to-b from-purple-200 to-purple-300 rounded mb-2 flex items-center justify-center">
                      <span className="text-xs font-medium">Jaw</span>
                    </div>
                    <div className="text-xs text-center text-gray-600">Masseter</div>
                  </div>
                </div>
                
                {/* Add More Button */}
                <button className="w-full border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-lg p-4 flex items-center justify-center gap-2 transition-all duration-200 hover:bg-blue-50">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  <span className="text-sm text-gray-600 font-medium">Add More Areas</span>
                </button>
                
              </div>
              
              {/* Selected Areas Summary */}
              {selectedFacialFeatures.length > 0 && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="text-sm font-semibold text-green-800 mb-1">
                    Selected Areas ({selectedFacialFeatures.length})
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {selectedFacialFeatures.slice(0, 3).map((feature, index) => (
                      <span key={index} className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded">
                        {feature.replace(/_/g, ' ')}
                      </span>
                    ))}
                    {selectedFacialFeatures.length > 3 && (
                      <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded">
                        +{selectedFacialFeatures.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Anatomical Reference Panel - Slides in from right */}
            {showRightPanel && (
              <div className="xl:col-span-4 bg-gradient-to-br from-green-50 to-blue-50 p-5 rounded-xl border-2 border-green-200 transition-all duration-500 transform animate-in slide-in-from-right">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowRightPanel(false)}
                      className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full transition-all duration-200 shadow-lg hover:shadow-xl border-2 border-blue-500"
                    >
                      <svg 
                        width="20" 
                        height="20" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="3"
                        className="text-white"
                      >
                        <path d="M15 18l-6-6 6-6" />
                      </svg>
                    </button>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                      <h3 className="text-lg font-semibold text-gray-800">Anatomical Reference Window</h3>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowRightPanel(false)}
                    className="text-gray-500 hover:text-gray-700 font-bold text-xl"
                  >
                    ×
                  </button>
                </div>
                
                <div className="bg-white rounded-lg p-6 shadow-md">
                  <h4 className="text-xl font-bold text-blue-800 mb-4 text-center">
                    Additional Anatomical Reference Content
                  </h4>
                  <div className="text-center space-y-4">
                    <p className="text-gray-700">
                      This window can contain detailed medical diagrams, reference images, or supplementary anatomical information.
                    </p>
                    <p className="text-gray-700">
                      Perfect for displaying additional anatomical views, cross-references, or educational materials during clinical examination.
                    </p>
                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-blue-800 font-semibold">Professional Reference Tools</p>
                      <p className="text-sm text-blue-600 mt-1">
                        Access detailed muscle diagrams, nerve pathways, and vascular structures
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Professional Action Bar */}
          <div className="flex justify-between items-center pt-6 border-t-2 border-gray-200">
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full font-medium">
                Selected: <span className="font-bold text-red-600">{selectedFacialFeatures.length}</span> muscle{selectedFacialFeatures.length !== 1 ? 's' : ''}
              </div>
              {selectedFacialFeatures.length > 0 && (
                <div className="text-xs text-gray-500 bg-red-50 px-2 py-1 rounded border border-red-200">
                  Muscles highlighted in red on diagram
                </div>
              )}
            </div>
            
            <div className="flex space-x-4">
              <Button 
                variant="outline" 
                onClick={() => setSelectedFacialFeatures([])}
                className="border-2 border-gray-300 hover:bg-gray-50"
              >
                Clear All
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowAnatomicalViewer(false)}
                className="border-2 border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  const featuresText = selectedFacialFeatures.length > 0 
                    ? `Professional anatomical examination completed - Selected muscles: ${selectedFacialFeatures.join(', ')}`
                    : 'Professional anatomical examination completed';
                  
                  toast({
                    title: "Professional Analysis Saved",
                    description: featuresText,
                  });
                  
                  setShowAnatomicalViewer(false);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 shadow-lg"
              >
                Save Professional Analysis
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </Card>
  );
}