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
                <Tabs value="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-4 mb-6">
                    <TabsTrigger value="basic" className="bg-blue-100 font-semibold">Basic Info ⭐</TabsTrigger>
                    <TabsTrigger value="clinical">Clinical Notes</TabsTrigger>
                    <TabsTrigger value="medications">Medications</TabsTrigger>
                    <TabsTrigger value="followup">Follow-up</TabsTrigger>
                  </TabsList>

                  <TabsContent value="basic" className="space-y-6 p-4">
                    <div className="grid grid-cols-3 gap-6">
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
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
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
                    </div>
                  </TabsContent>

                  <TabsContent value="clinical" className="space-y-4">
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
            <DialogTitle className="text-2xl font-bold text-blue-800 flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">🔬</span>
              </div>
              Professional Anatomical Examination Interface
            </DialogTitle>
            <p className="text-gray-600 text-sm">Advanced facial muscle analysis and clinical documentation system</p>
          </DialogHeader>
          
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            {/* Left Panel - Professional Muscle Selection */}
            <div className="xl:col-span-1 bg-gradient-to-br from-gray-50 to-blue-50 p-5 rounded-xl border-2 border-blue-100">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                <h3 className="text-lg font-semibold text-gray-800">Facial Muscle Analysis</h3>
              </div>
              
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {[
                  { id: 'frontalis', label: 'Frontalis', desc: 'Forehead muscle' },
                  { id: 'temporalis', label: 'Temporalis', desc: 'Temple area' },
                  { id: 'orbicularis_oculi', label: 'Orbicularis Oculi', desc: 'Eye muscles' },
                  { id: 'levator_labii_superioris', label: 'Levator Labii Superioris', desc: 'Upper lip elevator' },
                  { id: 'zygomaticus_major', label: 'Zygomaticus Major', desc: 'Cheek muscle' },
                  { id: 'zygomaticus_minor', label: 'Zygomaticus Minor', desc: 'Small cheek muscle' },
                  { id: 'masseter', label: 'Masseter', desc: 'Jaw muscle' },
                  { id: 'buccinator', label: 'Buccinator', desc: 'Cheek muscle' },
                  { id: 'orbicularis_oris', label: 'Orbicularis Oris', desc: 'Mouth muscle' },
                  { id: 'mentalis', label: 'Mentalis', desc: 'Chin muscle' },
                  { id: 'depressor_labii_inferioris', label: 'Depressor Labii Inferioris', desc: 'Lower lip depressor' },
                  { id: 'depressor_anguli_oris', label: 'Depressor Anguli Oris', desc: 'Mouth corner depressor' },
                  { id: 'platysma', label: 'Platysma', desc: 'Neck muscle' }
                ].map((muscle) => (
                  <div key={muscle.id} 
                       className={`flex items-start space-x-3 p-3 rounded-lg cursor-pointer transition-all ${
                         selectedFacialFeatures.includes(muscle.id) 
                           ? 'bg-red-100 border-2 border-red-300 shadow-md' 
                           : 'bg-white hover:bg-blue-50 border border-gray-200'
                       }`}
                       onClick={() => {
                         if (selectedFacialFeatures.includes(muscle.id)) {
                           setSelectedFacialFeatures(selectedFacialFeatures.filter(f => f !== muscle.id));
                         } else {
                           setSelectedFacialFeatures([...selectedFacialFeatures, muscle.id]);
                         }
                       }}>
                    <Checkbox
                      checked={selectedFacialFeatures.includes(muscle.id)}
                      className="mt-1 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-800">{muscle.label}</div>
                      <div className="text-xs text-gray-600">{muscle.desc}</div>
                    </div>
                  </div>
                ))}
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

            {/* Center Panel - Professional Medical Diagram (Matching Reference Sketch) */}
            <div className="xl:col-span-2 relative">
              <div className="bg-white border-4 border-gray-300 rounded-xl p-6 shadow-lg">
                <div className="bg-gradient-to-b from-blue-50 to-white rounded-lg p-4 min-h-[600px] flex items-center justify-center">
                  <svg viewBox="0 0 400 500" className="w-full h-full max-w-lg">
                    {/* White background */}
                    <rect width="400" height="500" fill="#ffffff"/>
                    
                    {/* Head outline - EXACT circle from reference */}
                    <circle cx="200" cy="200" r="90" fill="none" stroke="#333" strokeWidth="2"/>
                    
                    {/* Neck outline - rectangular as in reference */}
                    <rect x="180" y="290" width="40" height="80" fill="none" stroke="#333" strokeWidth="2"/>
                    
                    {/* LEFT EYE - blue iris with black pupil */}
                    <circle cx="175" cy="180" r="15" fill="#ffffff" stroke="#333" strokeWidth="2"/>
                    <circle cx="175" cy="180" r="10" fill="#4a90e2"/>
                    <circle cx="175" cy="180" r="4" fill="#000"/>
                    
                    {/* RIGHT EYE - blue iris with black pupil */}
                    <circle cx="225" cy="180" r="15" fill="#ffffff" stroke="#333" strokeWidth="2"/>
                    <circle cx="225" cy="180" r="10" fill="#4a90e2"/>
                    <circle cx="225" cy="180" r="4" fill="#000"/>
                    
                    {/* Nose - small triangular outline */}
                    <path d="M 200 190 L 195 210 Q 200 215 205 210 L 200 190" fill="none" stroke="#333" strokeWidth="2"/>
                    <ellipse cx="197" cy="212" rx="1.5" ry="1" fill="none" stroke="#333" strokeWidth="1"/>
                    <ellipse cx="203" cy="212" rx="1.5" ry="1" fill="none" stroke="#333" strokeWidth="1"/>
                    
                    {/* Mouth - curved line */}
                    <path d="M 185 230 Q 200 240 215 230" fill="none" stroke="#333" strokeWidth="2"/>
                    
                    {/* Ears */}
                    <ellipse cx="125" cy="185" rx="10" ry="20" fill="none" stroke="#333" strokeWidth="2"/>
                    <ellipse cx="275" cy="185" rx="10" ry="20" fill="none" stroke="#333" strokeWidth="2"/>
                    
                    {/* EXACT MUSCLE ANATOMY FROM SECOND REFERENCE IMAGE */}
                    
                    {/* LARGE FOREHEAD AREA - FRONTALIS (massive red block covering entire upper forehead) */}
                    <g>
                      <path d="M 140 120 Q 170 105 200 100 Q 230 105 260 120 Q 265 140 260 160 Q 240 165 200 160 Q 160 165 140 160 Q 135 140 140 120" 
                            fill="#b91c1c" stroke="#7f1d1d" strokeWidth="1" opacity="0.9"/>
                      {selectedFacialFeatures.includes('frontalis') && <text x="200" y="90" textAnchor="middle" className="text-xs font-bold fill-red-900">FRONTALIS</text>}
                    </g>
                    
                    {/* SIDE TEMPLE AREAS - TEMPORALIS (two side red blocks) */}
                    <g>
                      <path d="M 115 150 Q 130 140 145 145 Q 155 155 150 175 Q 145 195 130 190 Q 115 185 115 165 Q 110 155 115 150" 
                            fill="#b91c1c" stroke="#7f1d1d" strokeWidth="1" opacity="0.9"/>
                      <path d="M 285 150 Q 270 140 255 145 Q 245 155 250 175 Q 255 195 270 190 Q 285 185 285 165 Q 290 155 285 150" 
                            fill="#b91c1c" stroke="#7f1d1d" strokeWidth="1" opacity="0.9"/>
                      {selectedFacialFeatures.includes('temporalis') && <text x="80" y="170" className="text-xs font-bold fill-red-900">TEMPORALIS</text>}
                    </g>
                    
                    {/* EYE SOCKET AREAS - ORBICULARIS OCULI (red circles around eyes) */}
                    <g>
                      <circle cx="175" cy="180" r="25" fill="#b91c1c" stroke="#7f1d1d" strokeWidth="1" opacity="0.8"/>
                      <circle cx="225" cy="180" r="25" fill="#b91c1c" stroke="#7f1d1d" strokeWidth="1" opacity="0.8"/>
                      {selectedFacialFeatures.includes('orbicularis_oculi') && <text x="200" y="150" textAnchor="middle" className="text-xs font-bold fill-red-900">ORBICULARIS OCULI</text>}
                    </g>
                    
                    {/* DIAGONAL CHEEK STRIPES - ZYGOMATICUS MAJOR (thick diagonal red lines) */}
                    <g>
                      <path d="M 150 195 Q 165 210 175 235" stroke="#b91c1c" strokeWidth="15" fill="none" opacity="0.9"/>
                      <path d="M 250 195 Q 235 210 225 235" stroke="#b91c1c" strokeWidth="15" fill="none" opacity="0.9"/>
                      {selectedFacialFeatures.includes('zygomaticus_major') && <text x="110" y="250" className="text-xs font-bold fill-red-900">ZYGOMATICUS MAJOR</text>}
                    </g>
                    
                    {/* JAW AREAS - MASSETER (rectangular red blocks on sides) */}
                    <g>
                      <path d="M 140 210 Q 150 225 155 250 Q 150 270 140 265 Q 130 260 125 240 Q 130 220 140 210" 
                            fill="#b91c1c" stroke="#7f1d1d" strokeWidth="1" opacity="0.9"/>
                      <path d="M 260 210 Q 250 225 245 250 Q 250 270 260 265 Q 270 260 275 240 Q 270 220 260 210" 
                            fill="#b91c1c" stroke="#7f1d1d" strokeWidth="1" opacity="0.9"/>
                      {selectedFacialFeatures.includes('masseter') && <text x="95" y="285" className="text-xs font-bold fill-red-900">MASSETER</text>}
                    </g>
                    
                    {/* SIDE CHEEK AREAS - BUCCINATOR (oval red blocks beside mouth) */}
                    <g>
                      <ellipse cx="160" cy="220" rx="12" ry="20" fill="#b91c1c" stroke="#7f1d1d" strokeWidth="1" opacity="0.9"/>
                      <ellipse cx="240" cy="220" rx="12" ry="20" fill="#b91c1c" stroke="#7f1d1d" strokeWidth="1" opacity="0.9"/>
                      {selectedFacialFeatures.includes('buccinator') && <text x="280" y="285" className="text-xs font-bold fill-red-900">BUCCINATOR</text>}
                    </g>
                    
                    {/* MOUTH AREA - ORBICULARIS ORIS (red oval around mouth) */}
                    <g>
                      <ellipse cx="200" cy="230" rx="20" ry="10" fill="#b91c1c" stroke="#7f1d1d" strokeWidth="1" opacity="0.9"/>
                      {selectedFacialFeatures.includes('orbicularis_oris') && <text x="140" y="270" className="text-xs font-bold fill-red-900">ORBICULARIS ORIS</text>}
                    </g>
                    
                    {/* CHIN AREA - MENTALIS (small red area below mouth) */}
                    <g>
                      <ellipse cx="200" cy="255" rx="15" ry="8" fill="#b91c1c" stroke="#7f1d1d" strokeWidth="1" opacity="0.9"/>
                      {selectedFacialFeatures.includes('mentalis') && <text x="225" y="275" className="text-xs font-bold fill-red-900">MENTALIS</text>}
                    </g>
                    
                    {/* NECK AREA - PLATYSMA (large red rectangle in neck) */}
                    <g>
                      <path d="M 170 300 Q 200 310 230 300 Q 225 350 200 360 Q 175 350 170 300" 
                            fill="#b91c1c" stroke="#7f1d1d" strokeWidth="1" opacity="0.9"/>
                      {selectedFacialFeatures.includes('platysma') && <text x="160" y="390" className="text-xs font-bold fill-red-900">PLATYSMA</text>}
                    </g>
                    
                    {/* UPPER LIP - LEVATOR LABII SUPERIORIS (small red strip above mouth) */}
                    <g>
                      <path d="M 185 215 Q 200 220 215 215 Q 210 225 200 230 Q 190 225 185 215" 
                            fill="#b91c1c" stroke="#7f1d1d" strokeWidth="1" opacity="0.9"/>
                      {selectedFacialFeatures.includes('levator_labii_superioris') && <text x="110" y="310" className="text-xs font-bold fill-red-900">LEVATOR LABII</text>}
                    </g>
                    
                    {/* LOWER LIP - DEPRESSOR LABII INFERIORIS (small red strip below mouth) */}
                    <g>
                      <path d="M 185 240 Q 200 245 215 240 Q 210 250 200 255 Q 190 250 185 240" 
                            fill="#b91c1c" stroke="#7f1d1d" strokeWidth="1" opacity="0.9"/>
                      {selectedFacialFeatures.includes('depressor_labii_inferioris') && <text x="240" y="310" className="text-xs font-bold fill-red-900">DEPRESSOR LABII</text>}
                    </g>
                    
                    {/* MOUTH CORNERS - DEPRESSOR ANGULI ORIS (small red triangles at mouth corners) */}
                    <g>
                      <path d="M 170 235 Q 180 240 185 250 Q 175 255 165 250 Q 160 240 170 235" 
                            fill="#b91c1c" stroke="#7f1d1d" strokeWidth="1" opacity="0.9"/>
                      <path d="M 230 235 Q 220 240 215 250 Q 225 255 235 250 Q 240 240 230 235" 
                            fill="#b91c1c" stroke="#7f1d1d" strokeWidth="1" opacity="0.9"/>
                      {selectedFacialFeatures.includes('depressor_anguli_oris') && <text x="270" y="330" className="text-xs font-bold fill-red-900">DEPRESSOR ANGULI</text>}
                    </g>
                    
                    {/* White overlay for eyes to show through red areas */}
                    <circle cx="175" cy="180" r="15" fill="#ffffff" stroke="#333" strokeWidth="2"/>
                    <circle cx="225" cy="180" r="15" fill="#ffffff" stroke="#333" strokeWidth="2"/>
                    <circle cx="175" cy="180" r="10" fill="#4a90e2"/>
                    <circle cx="225" cy="180" r="10" fill="#4a90e2"/>
                    <circle cx="175" cy="180" r="4" fill="#000"/>
                    <circle cx="225" cy="180" r="4" fill="#000"/>
                  </svg>
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
            <div className="xl:col-span-1 bg-gradient-to-br from-yellow-50 to-orange-50 p-5 rounded-xl border-2 border-yellow-200">
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
              
              {/* Professional Photo Grid */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {[
                  { id: 1, label: "Frontal", angle: "0°", color: "bg-blue-100 border-blue-300" },
                  { id: 2, label: "Left Profile", angle: "90°L", color: "bg-green-100 border-green-300" },
                  { id: 3, label: "Right Profile", angle: "90°R", color: "bg-purple-100 border-purple-300" },
                  { id: 4, label: "Detail/Custom", angle: "Var", color: "bg-orange-100 border-orange-300" }
                ].map((photo) => (
                  <div key={photo.id} className={`${photo.color} border-2 border-dashed rounded-lg p-3 text-center hover:bg-opacity-75 transition-all cursor-pointer`}>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id={`clinical-photo-${photo.id}`}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          console.log(`Clinical photo ${photo.id} uploaded:`, file.name);
                        }
                      }}
                    />
                    <label htmlFor={`clinical-photo-${photo.id}`} className="cursor-pointer">
                      <div className="text-gray-500 mb-2">
                        <Plus className="h-8 w-8 mx-auto" />
                      </div>
                      <div className="text-xs text-gray-800 font-semibold">{photo.label}</div>
                      <div className="text-xs text-gray-600">{photo.angle}</div>
                    </label>
                  </div>
                ))}
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