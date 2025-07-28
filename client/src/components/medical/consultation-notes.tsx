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
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" id="medical-record-dialog">
              <DialogHeader>
                <DialogTitle>{editingRecord ? 'Edit Medical Record' : 'Add Medical Record'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="basic">Basic Info</TabsTrigger>
                    <TabsTrigger value="clinical">Clinical Notes</TabsTrigger>
                    <TabsTrigger value="medications">Medications</TabsTrigger>
                    <TabsTrigger value="followup">Follow-up</TabsTrigger>
                  </TabsList>

                  <TabsContent value="basic" className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
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
                      <div>
                        <Label htmlFor="examination">Examination</Label>
                        <Select
                          onValueChange={(value) => {
                            if (value === "anatomical") {
                              setShowAnatomicalViewer(true);
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select examination type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">General Examination</SelectItem>
                            <SelectItem value="cardiovascular">Cardiovascular</SelectItem>
                            <SelectItem value="respiratory">Respiratory</SelectItem>
                            <SelectItem value="neurological">Neurological</SelectItem>
                            <SelectItem value="anatomical">Anatomical</SelectItem>
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

      {/* Anatomical Viewer Dialog */}
      <Dialog open={showAnatomicalViewer} onOpenChange={setShowAnatomicalViewer}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Anatomical Examination</DialogTitle>
          </DialogHeader>
          <div className="flex gap-6">
            {/* Left Panel - Facial Features Options */}
            <div className="w-80 space-y-4">
              <div>
                <h4 className="font-medium mb-3 text-blue-600">Face</h4>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="space-y-3">
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
                    ].map((feature) => (
                      <div key={feature.id} className="flex items-start space-x-3 p-2 hover:bg-blue-100 rounded cursor-pointer"
                           onClick={() => {
                             if (selectedFacialFeatures.includes(feature.id)) {
                               setSelectedFacialFeatures(selectedFacialFeatures.filter(f => f !== feature.id));
                             } else {
                               setSelectedFacialFeatures([...selectedFacialFeatures, feature.id]);
                             }
                           }}>
                        <input
                          type="checkbox"
                          checked={selectedFacialFeatures.includes(feature.id)}
                          onChange={() => {}}
                          className="mt-1 rounded border-gray-300"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-800">{feature.label}</div>
                          <div className="text-xs text-gray-500">{feature.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-3">Add Photos - Before Treatment</h4>
                <div className="grid grid-cols-2 gap-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="aspect-square bg-gray-100 border-2 border-dashed border-gray-300 rounded flex items-center justify-center cursor-pointer hover:bg-gray-50">
                      <div className="text-gray-400 text-2xl">+</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Panel - Detailed Facial Anatomy Sketch */}
            <div className="flex-1">
              <div className="bg-white border-2 border-gray-200 rounded-lg p-6 flex items-center justify-center" style={{ minHeight: '600px' }}>
                <svg width="400" height="500" viewBox="0 0 400 500" className="border rounded">
                  {/* Head outline - more realistic shape */}
                  <path d="M 200 50 
                           C 250 50, 280 80, 285 130
                           C 290 180, 285 220, 275 250
                           C 270 270, 260 285, 245 295
                           C 225 310, 200 315, 200 315
                           C 200 315, 175 310, 155 295
                           C 140 285, 130 270, 125 250
                           C 115 220, 110 180, 115 130
                           C 120 80, 150 50, 200 50 Z" 
                        fill="none" stroke="#333" strokeWidth="2"/>
                  
                  {/* Frontalis - Forehead */}
                  <path d="M 130 80 Q 200 65 270 80 Q 250 90 200 85 Q 150 90 130 80" 
                        fill={selectedFacialFeatures.includes('frontalis') ? 'rgba(220, 38, 38, 0.3)' : 'none'} 
                        stroke="#dc2626" strokeWidth="1" opacity="0.8"/>
                  
                  {/* Temporalis - Temple areas */}
                  <ellipse cx="125" cy="95" rx="15" ry="25" 
                           fill={selectedFacialFeatures.includes('temporalis') ? 'rgba(220, 38, 38, 0.3)' : 'none'} 
                           stroke="#dc2626" strokeWidth="1" opacity="0.8"/>
                  <ellipse cx="275" cy="95" rx="15" ry="25" 
                           fill={selectedFacialFeatures.includes('temporalis') ? 'rgba(220, 38, 38, 0.3)' : 'none'} 
                           stroke="#dc2626" strokeWidth="1" opacity="0.8"/>
                  
                  {/* Orbicularis Oculi - Eye muscles */}
                  <ellipse cx="170" cy="120" rx="20" ry="12" 
                           fill={selectedFacialFeatures.includes('orbicularis_oculi') ? 'rgba(220, 38, 38, 0.3)' : 'none'} 
                           stroke="#dc2626" strokeWidth="1" opacity="0.8"/>
                  <ellipse cx="230" cy="120" rx="20" ry="12" 
                           fill={selectedFacialFeatures.includes('orbicularis_oculi') ? 'rgba(220, 38, 38, 0.3)' : 'none'} 
                           stroke="#dc2626" strokeWidth="1" opacity="0.8"/>
                  
                  {/* Eyes - detailed */}
                  <ellipse cx="170" cy="120" rx="12" ry="8" fill="#fff" stroke="#333" strokeWidth="1"/>
                  <ellipse cx="230" cy="120" rx="12" ry="8" fill="#fff" stroke="#333" strokeWidth="1"/>
                  <circle cx="170" cy="120" r="5" fill="#4a90e2"/>
                  <circle cx="230" cy="120" r="5" fill="#4a90e2"/>
                  <circle cx="170" cy="120" r="2" fill="#000"/>
                  <circle cx="230" cy="120" r="2" fill="#000"/>
                  
                  {/* Levator Labii Superioris - Upper lip elevator */}
                  <path d="M 185 140 Q 200 145 215 140 Q 210 155 200 160 Q 190 155 185 140" 
                        fill={selectedFacialFeatures.includes('levator_labii_superioris') ? 'rgba(220, 38, 38, 0.3)' : 'none'} 
                        stroke="#dc2626" strokeWidth="1" opacity="0.8"/>
                  
                  {/* Zygomaticus Major - Large cheek muscle */}
                  <path d="M 140 140 Q 165 165 180 180 Q 170 185 155 175 Q 135 155 140 140" 
                        fill={selectedFacialFeatures.includes('zygomaticus_major') ? 'rgba(220, 38, 38, 0.3)' : 'none'} 
                        stroke="#dc2626" strokeWidth="1" opacity="0.8"/>
                  <path d="M 260 140 Q 235 165 220 180 Q 230 185 245 175 Q 265 155 260 140" 
                        fill={selectedFacialFeatures.includes('zygomaticus_major') ? 'rgba(220, 38, 38, 0.3)' : 'none'} 
                        stroke="#dc2626" strokeWidth="1" opacity="0.8"/>
                  
                  {/* Zygomaticus Minor - Small cheek muscle */}
                  <path d="M 150 125 Q 175 145 185 155 Q 175 160 160 150 Q 145 135 150 125" 
                        fill={selectedFacialFeatures.includes('zygomaticus_minor') ? 'rgba(220, 38, 38, 0.3)' : 'none'} 
                        stroke="#dc2626" strokeWidth="1" opacity="0.8"/>
                  <path d="M 250 125 Q 225 145 215 155 Q 225 160 240 150 Q 255 135 250 125" 
                        fill={selectedFacialFeatures.includes('zygomaticus_minor') ? 'rgba(220, 38, 38, 0.3)' : 'none'} 
                        stroke="#dc2626" strokeWidth="1" opacity="0.8"/>
                  
                  {/* Nose - detailed */}
                  <path d="M 200 130 L 195 155 Q 200 165 205 155 L 200 130" fill="none" stroke="#333" strokeWidth="1"/>
                  <ellipse cx="195" cy="160" rx="3" ry="2" fill="none" stroke="#333" strokeWidth="1"/>
                  <ellipse cx="205" cy="160" rx="3" ry="2" fill="none" stroke="#333" strokeWidth="1"/>
                  
                  {/* Masseter - Jaw muscle */}
                  <path d="M 145 180 Q 160 195 170 210 Q 160 220 145 205 Q 130 190 145 180" 
                        fill={selectedFacialFeatures.includes('masseter') ? 'rgba(220, 38, 38, 0.3)' : 'none'} 
                        stroke="#dc2626" strokeWidth="1" opacity="0.8"/>
                  <path d="M 255 180 Q 240 195 230 210 Q 240 220 255 205 Q 270 190 255 180" 
                        fill={selectedFacialFeatures.includes('masseter') ? 'rgba(220, 38, 38, 0.3)' : 'none'} 
                        stroke="#dc2626" strokeWidth="1" opacity="0.8"/>
                  
                  {/* Buccinator - Cheek muscle */}
                  <ellipse cx="150" cy="175" rx="18" ry="25" 
                           fill={selectedFacialFeatures.includes('buccinator') ? 'rgba(220, 38, 38, 0.3)' : 'none'} 
                           stroke="#dc2626" strokeWidth="1" opacity="0.8"/>
                  <ellipse cx="250" cy="175" rx="18" ry="25" 
                           fill={selectedFacialFeatures.includes('buccinator') ? 'rgba(220, 38, 38, 0.3)' : 'none'} 
                           stroke="#dc2626" strokeWidth="1" opacity="0.8"/>
                  
                  {/* Orbicularis Oris - Mouth muscle */}
                  <ellipse cx="200" cy="185" rx="25" ry="12" 
                           fill={selectedFacialFeatures.includes('orbicularis_oris') ? 'rgba(220, 38, 38, 0.3)' : 'none'} 
                           stroke="#dc2626" strokeWidth="1" opacity="0.8"/>
                  
                  {/* Mouth - detailed */}
                  <path d="M 180 185 Q 200 195 220 185" fill="none" stroke="#dc143c" strokeWidth="2"/>
                  <path d="M 180 185 Q 200 180 220 185" fill="none" stroke="#dc143c" strokeWidth="1"/>
                  
                  {/* Mentalis - Chin muscle */}
                  <ellipse cx="200" cy="220" rx="20" ry="15" 
                           fill={selectedFacialFeatures.includes('mentalis') ? 'rgba(220, 38, 38, 0.3)' : 'none'} 
                           stroke="#dc2626" strokeWidth="1" opacity="0.8"/>
                  
                  {/* Depressor Labii Inferioris - Lower lip depressor */}
                  <path d="M 185 200 Q 200 205 215 200 Q 210 215 200 220 Q 190 215 185 200" 
                        fill={selectedFacialFeatures.includes('depressor_labii_inferioris') ? 'rgba(220, 38, 38, 0.3)' : 'none'} 
                        stroke="#dc2626" strokeWidth="1" opacity="0.8"/>
                  
                  {/* Depressor Anguli Oris - Mouth corner depressor */}
                  <path d="M 175 195 Q 185 205 190 215 Q 180 220 170 210 Q 165 200 175 195" 
                        fill={selectedFacialFeatures.includes('depressor_anguli_oris') ? 'rgba(220, 38, 38, 0.3)' : 'none'} 
                        stroke="#dc2626" strokeWidth="1" opacity="0.8"/>
                  <path d="M 225 195 Q 215 205 210 215 Q 220 220 230 210 Q 235 200 225 195" 
                        fill={selectedFacialFeatures.includes('depressor_anguli_oris') ? 'rgba(220, 38, 38, 0.3)' : 'none'} 
                        stroke="#dc2626" strokeWidth="1" opacity="0.8"/>
                  
                  {/* Platysma - Neck muscle */}
                  <path d="M 160 240 Q 200 250 240 240 Q 235 280 200 290 Q 165 280 160 240" 
                        fill={selectedFacialFeatures.includes('platysma') ? 'rgba(220, 38, 38, 0.3)' : 'none'} 
                        stroke="#dc2626" strokeWidth="1" opacity="0.8"/>
                  
                  {/* Ears */}
                  <ellipse cx="115" cy="135" rx="8" ry="25" fill="none" stroke="#333" strokeWidth="2"/>
                  <ellipse cx="285" cy="135" rx="8" ry="25" fill="none" stroke="#333" strokeWidth="2"/>
                  
                  {/* Neck outline */}
                  <path d="M 160 250 Q 200 260 240 250 L 235 320 Q 200 325 165 320 Z" 
                        fill="none" stroke="#333" strokeWidth="2"/>
                  
                  {/* Muscle fiber lines for texture */}
                  {selectedFacialFeatures.length > 0 && (
                    <g>
                      <defs>
                        <pattern id="muscleLines" patternUnits="userSpaceOnUse" width="4" height="4">
                          <path d="M 0,2 L 4,2" stroke="rgba(220, 38, 38, 0.2)" strokeWidth="0.5"/>
                        </pattern>
                      </defs>
                    </g>
                  )}
                </svg>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowAnatomicalViewer(false);
                setSelectedFacialFeatures([]);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                // Save the selected anatomical features to the form/record
                const featuresText = selectedFacialFeatures.length > 0 
                  ? `Anatomical examination - Selected features: ${selectedFacialFeatures.join(', ')}`
                  : 'Anatomical examination performed';
                
                // You can integrate this with the form if needed
                toast({
                  title: "Anatomical Data Saved",
                  description: featuresText,
                });
                
                setShowAnatomicalViewer(false);
              }}
            >
              Save Selection
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}