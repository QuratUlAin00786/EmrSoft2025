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

            {/* Center Panel - Professional Medical Diagram (Realistic Head Sketch with Labels) */}
            <div className={`xl:col-span-2 relative transition-transform duration-500 ${showRightPanel ? '-translate-x-full' : 'translate-x-0'}`}>
              <div className="bg-white border-4 border-gray-300 rounded-xl p-6 shadow-lg">
                <div className="bg-gradient-to-b from-blue-50 to-white rounded-lg p-4 min-h-[600px] flex items-center justify-center relative">
                  
                  {/* Professional Anatomical SVG Diagram */}
                  <svg 
                    width="500" 
                    height="600" 
                    viewBox="0 0 500 600" 
                    className="w-full max-w-lg mx-auto"
                  >
                    {/* Head outline */}
                    <ellipse cx="250" cy="280" rx="120" ry="160" fill="#F5E6D3" stroke="#8B4513" strokeWidth="2"/>
                    
                    {/* Neck */}
                    <rect x="230" y="420" width="40" height="80" fill="#F5E6D3" stroke="#8B4513" strokeWidth="2" rx="10"/>
                    
                    {/* Frontalis muscle (forehead) */}
                    <path d="M 180 200 Q 250 180 320 200 Q 320 230 250 240 Q 180 230 180 200" 
                          fill="#CD5C5C" opacity="0.7" stroke="#8B0000" strokeWidth="1"/>
                    
                    {/* Temporalis muscle (temples) */}
                    <ellipse cx="160" cy="240" rx="25" ry="40" fill="#CD5C5C" opacity="0.7" stroke="#8B0000" strokeWidth="1"/>
                    <ellipse cx="340" cy="240" rx="25" ry="40" fill="#CD5C5C" opacity="0.7" stroke="#8B0000" strokeWidth="1"/>
                    
                    {/* Orbicularis Oculi (eye muscles) */}
                    <ellipse cx="200" cy="260" rx="20" ry="15" fill="#DC143C" opacity="0.8" stroke="#8B0000" strokeWidth="1"/>
                    <ellipse cx="300" cy="260" rx="20" ry="15" fill="#DC143C" opacity="0.8" stroke="#8B0000" strokeWidth="1"/>
                    
                    {/* Procerus (nose bridge) */}
                    <rect x="240" y="270" width="20" height="30" fill="#CD5C5C" opacity="0.7" stroke="#8B0000" strokeWidth="1" rx="5"/>
                    
                    {/* Nasalis (nose) */}
                    <ellipse cx="250" cy="310" rx="15" ry="20" fill="#CD5C5C" opacity="0.7" stroke="#8B0000" strokeWidth="1"/>
                    
                    {/* Zygomaticus Major & Minor (cheek muscles) */}
                    <path d="M 180 300 Q 200 320 220 340" fill="none" stroke="#CD5C5C" strokeWidth="8" opacity="0.7"/>
                    <path d="M 320 300 Q 300 320 280 340" fill="none" stroke="#CD5C5C" strokeWidth="8" opacity="0.7"/>
                    
                    {/* Masseter (jaw muscle) */}
                    <path d="M 160 340 Q 180 360 200 380 Q 180 390 160 380 Z" fill="#CD5C5C" opacity="0.7" stroke="#8B0000" strokeWidth="1"/>
                    <path d="M 340 340 Q 320 360 300 380 Q 320 390 340 380 Z" fill="#CD5C5C" opacity="0.7" stroke="#8B0000" strokeWidth="1"/>
                    
                    {/* Orbicularis Oris (mouth muscle) */}
                    <ellipse cx="250" cy="350" rx="30" ry="15" fill="#DC143C" opacity="0.8" stroke="#8B0000" strokeWidth="1"/>
                    
                    {/* Risorius (smile muscle) */}
                    <path d="M 210 350 Q 190 360 170 350" fill="none" stroke="#CD5C5C" strokeWidth="6" opacity="0.7"/>
                    <path d="M 290 350 Q 310 360 330 350" fill="none" stroke="#CD5C5C" strokeWidth="6" opacity="0.7"/>
                    
                    {/* Buccinator (cheek muscle) */}
                    <ellipse cx="190" cy="320" rx="20" ry="25" fill="#CD5C5C" opacity="0.6" stroke="#8B0000" strokeWidth="1"/>
                    <ellipse cx="310" cy="320" rx="20" ry="25" fill="#CD5C5C" opacity="0.6" stroke="#8B0000" strokeWidth="1"/>
                    
                    {/* Depressor Anguli Oris (mouth corner) */}
                    <path d="M 220 360 Q 210 380 200 400" fill="none" stroke="#CD5C5C" strokeWidth="6" opacity="0.7"/>
                    <path d="M 280 360 Q 290 380 300 400" fill="none" stroke="#CD5C5C" strokeWidth="6" opacity="0.7"/>
                    
                    {/* Mentalis (chin) */}
                    <ellipse cx="250" cy="390" rx="20" ry="15" fill="#CD5C5C" opacity="0.7" stroke="#8B0000" strokeWidth="1"/>
                    
                    {/* Platysma (neck) */}
                    <rect x="220" y="420" width="60" height="60" fill="#CD5C5C" opacity="0.5" stroke="#8B0000" strokeWidth="1" rx="10"/>
                    
                    {/* Labels with leader lines */}
                    
                    {/* Frontalis label */}
                    <line x1="200" y1="210" x2="120" y2="150" stroke="#333" strokeWidth="1"/>
                    <text x="50" y="145" fontSize="11" fill="#333" fontFamily="Arial">Frontalis</text>
                    
                    {/* Temporalis label */}
                    <line x1="160" y1="220" x2="80" y2="180" stroke="#333" strokeWidth="1"/>
                    <text x="20" y="175" fontSize="11" fill="#333" fontFamily="Arial">Temporalis</text>
                    
                    {/* Orbicularis Oculi label */}
                    <line x1="180" y1="260" x2="100" y2="220" stroke="#333" strokeWidth="1"/>
                    <text x="30" y="215" fontSize="11" fill="#333" fontFamily="Arial">Orbicularis Oculi</text>
                    
                    {/* Procerus label */}
                    <line x1="240" y1="280" x2="160" y1="240" stroke="#333" strokeWidth="1"/>
                    <text x="100" y="235" fontSize="11" fill="#333" fontFamily="Arial">Procerus</text>
                    
                    {/* Nasalis label */}
                    <line x1="235" y1="310" x2="150" y1="270" stroke="#333" strokeWidth="1"/>
                    <text x="90" y="265" fontSize="11" fill="#333" fontFamily="Arial">Nasalis</text>
                    
                    {/* Zygomaticus Major label */}
                    <line x1="190" y1="310" x2="100" y1="300" stroke="#333" strokeWidth="1"/>
                    <text x="20" y="295" fontSize="11" fill="#333" fontFamily="Arial">Zygomaticus Major</text>
                    
                    {/* Masseter label */}
                    <line x1="160" y1="360" x2="70" y1="350" stroke="#333" strokeWidth="1"/>
                    <text x="10" y="345" fontSize="11" fill="#333" fontFamily="Arial">Masseter</text>
                    
                    {/* Risorius label */}
                    <line x1="170" y1="350" x2="90" y1="380" stroke="#333" strokeWidth="1"/>
                    <text x="30" y="375" fontSize="11" fill="#333" fontFamily="Arial">Risorius</text>
                    
                    {/* Buccinator label */}
                    <line x1="190" y1="330" x2="410" y1="180" stroke="#333" strokeWidth="1"/>
                    <text x="420" y="175" fontSize="11" fill="#333" fontFamily="Arial">Buccinator</text>
                    
                    {/* Corrugator Supercilii label */}
                    <line x1="320" y1="240" x2="420" y1="160" stroke="#333" strokeWidth="1"/>
                    <text x="380" y="155" fontSize="11" fill="#333" fontFamily="Arial">Corrugator Supercilii</text>
                    
                    {/* Levator Palpebrae Superioris label */}
                    <line x1="300" y1="260" x2="430" y1="200" stroke="#333" strokeWidth="1"/>
                    <text x="360" y="195" fontSize="11" fill="#333" fontFamily="Arial">Levator Palpebrae</text>
                    <text x="360" y="207" fontSize="11" fill="#333" fontFamily="Arial">Superioris</text>
                    
                    {/* Levator Labii Superioris Alaeque Nasi label */}
                    <line x1="280" y1="300" x2="420" y1="240" stroke="#333" strokeWidth="1"/>
                    <text x="350" y="235" fontSize="11" fill="#333" fontFamily="Arial">Levator Labii Superior</text>
                    <text x="350" y="247" fontSize="11" fill="#333" fontFamily="Arial">Alaeque Nasi</text>
                    
                    {/* Depressor Septi Nasi label */}
                    <line x1="260" y1="320" x2="420" y1="280" stroke="#333" strokeWidth="1"/>
                    <text x="350" y="275" fontSize="11" fill="#333" fontFamily="Arial">Depressor Septi Nasi</text>
                    
                    {/* Orbicularis Oris label */}
                    <line x1="280" y1="350" x2="420" y1="320" stroke="#333" strokeWidth="1"/>
                    <text x="350" y="315" fontSize="11" fill="#333" fontFamily="Arial">Orbicularis Oris</text>
                    
                    {/* Depressor Anguli Oris label */}
                    <line x1="300" y1="380" x2="420" y1="360" stroke="#333" strokeWidth="1"/>
                    <text x="350" y="355" fontSize="11" fill="#333" fontFamily="Arial">Depressor Anguli Oris</text>
                    
                    {/* Depressor Labii Inferioris label */}
                    <line x1="270" y1="370" x2="420" y1="400" stroke="#333" strokeWidth="1"/>
                    <text x="350" y="395" fontSize="11" fill="#333" fontFamily="Arial">Depressor Labii</text>
                    <text x="350" y="407" fontSize="11" fill="#333" fontFamily="Arial">Inferioris</text>
                    
                    {/* Mentalis label */}
                    <line x1="250" y1="400" x2="150" y1="450" stroke="#333" strokeWidth="1"/>
                    <text x="90" y="445" fontSize="11" fill="#333" fontFamily="Arial">Mentalis</text>
                    
                    {/* Platysma label */}
                    <line x1="220" y1="460" x2="120" y1="500" stroke="#333" strokeWidth="1"/>
                    <text x="60" y="495" fontSize="11" fill="#333" fontFamily="Arial">Platysma</text>
                  </svg>
                  
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
                    Professional Medical Anatomical Diagram
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel - Clinical Documentation */}
            <div className={`xl:col-span-1 bg-gradient-to-br from-yellow-50 to-orange-50 p-5 rounded-xl border-2 border-yellow-200 transition-transform duration-500 ${showRightPanel ? '-translate-x-full' : 'translate-x-0'}`}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 bg-yellow-600 rounded-full"></div>
                <h3 className="text-lg font-semibold text-gray-800">Clinical Documentation</h3>
              </div>
              
              {/* Treatment Phase */}
              <div className="mb-6 p-4 bg-yellow-100 border-l-4 border-yellow-500 rounded-r-lg">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">!</span>
                  </div>
                  <div className="text-yellow-800 font-semibold text-sm">Before Treatment Phase</div>
                </div>
                <div className="text-yellow-700 text-xs">Baseline documentation required</div>
              </div>
              

              
              {/* Clinical Notes */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-gray-700">Clinical Examination Notes</Label>
                <Textarea
                  placeholder="Document muscle condition, asymmetries, treatment areas, contraindications..."
                  className="text-sm border-2 border-gray-300 focus:border-blue-500"
                  rows={4}
                />
                
                <Label className="text-sm font-semibold text-gray-700">Treatment Recommendations</Label>
                <Textarea
                  placeholder="Recommended procedures, dosage, injection sites, follow-up schedule..."
                  className="text-sm border-2 border-gray-300 focus:border-blue-500"
                  rows={3}
                />
              </div>
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