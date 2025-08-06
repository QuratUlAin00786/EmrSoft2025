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
import { FileText, Plus, Calendar, User, Stethoscope, Pill, AlertTriangle, Mic, Square } from "lucide-react";
import { format } from "date-fns";
import type { MedicalRecord } from "@/types";
import anatomicalDiagramImage from "@assets/2_1754469563272.png";
import facialDiagramImage from "@assets/1_1754469776185.png";

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
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [symmetryRating, setSymmetryRating] = useState<number>(0);
  const [patientSignature, setPatientSignature] = useState<string>('');
  const [ratingType, setRatingType] = useState<string>('Face');

  const [activeTab, setActiveTab] = useState("basic");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [medicalRecords, setMedicalRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Audio transcription state
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = React.useRef<SpeechRecognition | null>(null);
  const [isTranscriptionSupported, setIsTranscriptionSupported] = useState(false);

  // Image upload handler for sculp images
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newImages: string[] = [];
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            newImages.push(e.target.result as string);
            if (newImages.length === files.length) {
              setUploadedImages(prev => [...prev, ...newImages]);
            }
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  // Remove uploaded image
  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

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
            const currentNotes = form.getValues("notes");
            form.setValue("notes", currentNotes + finalTranscript);
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
                    <TabsTrigger value="basic" className="bg-blue-100 dark:bg-blue-900/30 font-semibold data-[state=active]:bg-blue-100 data-[state=active]:dark:bg-blue-900/50">Basic Info ⭐</TabsTrigger>
                    <TabsTrigger value="clinical">Clinical Notes</TabsTrigger>
                    <TabsTrigger value="medications">Medications</TabsTrigger>
                    <TabsTrigger value="followup">Follow-up</TabsTrigger>
                  </TabsList>

                  <TabsContent value="basic" className="space-y-6 p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
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
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-700 mb-4">
                      <Label htmlFor="examination" className="text-blue-800 dark:text-blue-200 font-semibold">Examination</Label>
                      <Select
                        onValueChange={(value) => {
                          if (value === "anatomical") {
                            setShowAnatomicalViewer(true);
                          }
                        }}
                      >
                        <SelectTrigger className="mt-2 border-blue-300 dark:border-blue-600">
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
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="notes">Clinical Notes</Label>
                        <div className="flex items-center space-x-2">
                          <Button
                            type="button"
                            variant={isRecording ? "destructive" : "outline"}
                            size="sm"
                            onClick={isRecording ? stopRecording : startRecording}
                            className="flex items-center space-x-1"
                            disabled={!isTranscriptionSupported}
                            title={isTranscriptionSupported ? "Click to start dictating your notes" : "Speech recognition not supported in this browser"}
                          >
                            {isRecording ? (
                              <>
                                <Square className="h-3 w-3" />
                                <span>Stop Recording</span>
                              </>
                            ) : (
                              <>
                                <Mic className="h-3 w-3" />
                                <span>Transcribe Audio</span>
                              </>
                            )}
                          </Button>
                          {isRecording && (
                            <div className="flex items-center space-x-1 text-red-600 text-xs animate-pulse">
                              <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                              <span>Recording...</span>
                            </div>
                          )}
                          {!isTranscriptionSupported && (
                            <span className="text-xs text-gray-500">
                              (Try Chrome/Edge for audio transcription)
                            </span>
                          )}
                        </div>
                      </div>
                      <Textarea
                        {...form.register("notes")}
                        placeholder="Detailed consultation notes, observations, and findings. Click 'Transcribe Audio' to dictate your notes."
                        className="min-h-32 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                      />
                      {transcript && (
                        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                          <span className="text-blue-700 font-medium">Live Transcription: </span>
                          <span className="text-blue-800">{transcript}</span>
                        </div>
                      )}
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
                          className="min-h-24 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                        />
                      </div>
                      <div>
                        <Label htmlFor="treatment">Treatment Plan</Label>
                        <Textarea
                          {...form.register("treatment")}
                          placeholder="Treatment recommendations and care plan..."
                          className="min-h-24 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
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
              <div key={record.id} className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
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

                {record.prescription?.medications && record.prescription.medications.length > 0 && (
                  <div className="mb-3">
                    <h5 className="font-medium text-sm mb-2 flex items-center gap-1 dark:text-white">
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
          
          {/* Single Image with Sliding Navigation - Preserves All Labels */}
          <div className="mb-6">
            <div className="bg-white border-4 border-gray-300 rounded-xl p-6 shadow-lg max-w-4xl mx-auto">
              <div className="bg-white rounded-lg p-4 min-h-[900px] flex items-center justify-center relative overflow-visible">
                <div className="relative bg-white p-4 rounded-lg" style={{ width: '700px', height: '800px' }}>
                  <img 
                    key={currentImageIndex}
                    src={currentImageIndex === 0 ? anatomicalDiagramImage : facialDiagramImage}
                    alt={currentImageIndex === 0 ? "Facial muscle anatomy diagram with detailed muscle labels" : "Facial Anatomy Reference Diagram"}
                    className="mx-auto rounded-lg transition-opacity duration-300"
                    style={{
                      height: '800px',
                      width: '700px',
                      objectFit: 'contain',
                      objectPosition: 'center',
                      backgroundColor: 'white',
                      display: 'block',
                      margin: '0 auto',
                      ...(currentImageIndex === 0 ? {
                        filter: 'contrast(1.05) brightness(1.02) saturate(1.05)',
                        imageRendering: 'crisp-edges'
                      } : {})
                    }}
                  />
                  

                  
                  {/* Muscle Highlight Overlays - Show on both images */}
                  {selectedFacialFeatures.map((muscleId) => {
                    // Define muscle positions for first image (anatomical diagram with red muscles)
                    const anatomicalPositions: Record<string, {top: string, left: string}> = {
                      'frontalis': { top: '28%', left: '50%' },
                      'temporalis': { top: '40%', left: '20%' },
                      'orbicularis_oculi': { top: '38%', left: '50%' },
                      'procerus': { top: '46%', left: '50%' },
                      'corrugator_supercilii': { top: '42%', left: '40%' },
                      'levator_palpebrae_superioris': { top: '43%', left: '42%' },
                      'levator_labii_superioris_alaeque_nasi': { top: '50%', left: '42%' },
                      'nasalis': { top: '52%', left: '50%' },
                      'zygomaticus_major': { top: '58%', left: '32%' },
                      'zygomaticus_minor': { top: '54%', left: '38%' },
                      'masseter': { top: '68%', left: '25%' },
                      'risorius': { top: '62%', left: '40%' },
                      'buccinator': { top: '64%', left: '68%' },
                      'orbicularis_oris': { top: '64%', left: '50%' },
                      'depressor_septi_nasi': { top: '58%', left: '65%' },
                      'depressor_anguli_oris': { top: '70%', left: '68%' },
                      'depressor_labii_inferioris': { top: '74%', left: '32%' },
                      'mentalis': { top: '78%', left: '32%' },
                      'platysma': { top: '85%', left: '32%' }
                    };

                    // Define muscle positions for second image (line drawing) - Same anatomical locations
                    const referencePositions: Record<string, {top: string, left: string}> = {
                      'frontalis': { top: '28%', left: '50%' },
                      'temporalis': { top: '40%', left: '20%' },
                      'orbicularis_oculi': { top: '38%', left: '50%' },
                      'procerus': { top: '46%', left: '50%' },
                      'corrugator_supercilii': { top: '42%', left: '40%' },
                      'levator_palpebrae_superioris': { top: '43%', left: '42%' },
                      'levator_labii_superioris_alaeque_nasi': { top: '50%', left: '42%' },
                      'nasalis': { top: '52%', left: '50%' },
                      'zygomaticus_major': { top: '58%', left: '32%' },
                      'zygomaticus_minor': { top: '54%', left: '38%' },
                      'masseter': { top: '68%', left: '25%' },
                      'risorius': { top: '62%', left: '40%' },
                      'buccinator': { top: '64%', left: '68%' },
                      'orbicularis_oris': { top: '64%', left: '50%' },
                      'depressor_septi_nasi': { top: '58%', left: '65%' },
                      'depressor_anguli_oris': { top: '70%', left: '68%' },
                      'depressor_labii_inferioris': { top: '74%', left: '32%' },
                      'mentalis': { top: '78%', left: '32%' },
                      'platysma': { top: '85%', left: '32%' }
                    };
                    
                    const positions = currentImageIndex === 0 ? anatomicalPositions : referencePositions;
                    const position = positions[muscleId];
                    if (!position) return null;
                    
                    return (
                      <div
                        key={muscleId}
                        className="absolute w-3 h-3 bg-yellow-300 border-2 border-yellow-500 rounded-full shadow-md animate-pulse"
                        style={{
                          top: position.top,
                          left: position.left,
                          transform: 'translate(-50%, -50%)',
                          zIndex: 10
                        }}
                        title={muscleId.replace(/_/g, ' ').toUpperCase()}
                      />
                    );
                  })}
                </div>
                
                {/* Left Arrow Button */}
                <button
                  onClick={() => {
                    console.log("Left arrow clicked, currentImageIndex:", currentImageIndex);
                    setCurrentImageIndex(prev => {
                      const newIndex = prev === 0 ? 1 : 0;
                      console.log("Setting new index:", newIndex);
                      return newIndex;
                    });
                  }}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white border border-gray-300 rounded-full p-3 shadow-md hover:bg-gray-50 hover:shadow-lg transition-all duration-200"
                  title="Previous image"
                >
                  <svg 
                    width="20" 
                    height="20" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2"
                    className="text-gray-600"
                  >
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>

                {/* Right Arrow Button */}
                <button
                  onClick={() => {
                    console.log("Right arrow clicked, currentImageIndex:", currentImageIndex);
                    setCurrentImageIndex(prev => {
                      const newIndex = prev === 0 ? 1 : 0;
                      console.log("Setting new index:", newIndex);
                      return newIndex;
                    });
                  }}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white border border-gray-300 rounded-full p-3 shadow-md hover:bg-gray-50 hover:shadow-lg transition-all duration-200"
                  title="Next image"
                >
                  <svg 
                    width="20" 
                    height="20" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2"
                    className="text-gray-600"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>

                {/* Image Indicator Dots */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                  <div className={`w-3 h-3 rounded-full transition-all duration-200 ${currentImageIndex === 0 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                  <div className={`w-3 h-3 rounded-full transition-all duration-200 ${currentImageIndex === 1 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                </div>
              </div>
              
              {/* Dynamic Label based on current image */}
              <div className="mt-4 text-center">
                <div className={`inline-flex items-center px-4 py-2 rounded-full text-white text-sm font-semibold shadow-lg transition-all duration-200 ${
                  currentImageIndex === 0 ? 'bg-blue-600' : 'bg-green-600'
                }`}>
                  <div className="w-3 h-3 bg-white rounded-full mr-2 animate-pulse"></div>
                  {currentImageIndex === 0 ? 'Professional Medical Anatomical Diagram with Labels' : 'Anatomical Reference Window'}
                </div>
              </div>
            </div>
          </div>

          {/* Facial Muscle Analysis Section */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
            <div className="bg-gradient-to-br from-gray-50 to-blue-50 p-5 rounded-xl border-2 border-blue-100">
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


          </div>

          {/* Clinical Documentation Section - Moved to Bottom */}
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-6 rounded-xl border-2 border-yellow-200">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-3 h-3 bg-yellow-600 rounded-full"></div>
              <h3 className="text-xl font-semibold text-gray-800">Clinical Documentation</h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <div className="flex flex-col space-y-6 h-full">
                {/* Treatment Phase */}
                <div className="p-4 bg-yellow-100 border-l-4 border-yellow-500 rounded-r-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">!</span>
                    </div>
                    <div className="text-yellow-800 font-semibold text-sm">Before Treatment Phase</div>
                  </div>
                  <div className="text-yellow-700 text-xs">Baseline documentation required</div>
                </div>
                
                {/* Clinical Notes */}
                <div className="flex flex-col space-y-3 flex-1">
                  <Label className="text-base font-semibold text-gray-700">Clinical Examination Notes</Label>
                  <Textarea
                    placeholder="Document muscle condition, asymmetries, treatment areas, contraindications..."
                    className="text-sm border-2 border-gray-300 focus:border-blue-500 flex-1 resize-none"
                    rows={8}
                  />
                </div>
              </div>
              
              <div className="flex flex-col space-y-6 h-full">
                <div className="flex flex-col space-y-3 flex-1">
                  <Label className="text-base font-semibold text-gray-700">Treatment Recommendations</Label>
                  <Textarea
                    placeholder="Recommended procedures, dosage, injection sites, follow-up schedule..."
                    className="text-sm border-2 border-gray-300 focus:border-blue-500 flex-1 resize-none"
                    rows={5}
                  />
                </div>
                
                <div className="flex flex-col space-y-3 flex-1">
                  <Label className="text-base font-semibold text-gray-700">Follow-up Actions</Label>
                  <Textarea
                    placeholder="Next appointment scheduling, monitoring requirements, patient instructions..."
                    className="text-sm border-2 border-gray-300 focus:border-blue-500 flex-1 resize-none"
                    rows={5}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-300">
            <div className="text-sm text-gray-600">
              Professional Anatomical Assessment Complete
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
        </DialogContent>
      </Dialog>

    </Card>
  );
}
