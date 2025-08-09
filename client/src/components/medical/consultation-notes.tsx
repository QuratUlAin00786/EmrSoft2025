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

      {/* Anatomical Viewer Dialog - Container Space Optimized */}
      <Dialog open={showAnatomicalViewer} onOpenChange={setShowAnatomicalViewer}>
        <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-blue-800 flex items-center gap-3">
              <button
                onClick={() => setShowAnatomicalViewer(false)}
                className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full transition-all duration-200 shadow-lg"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">🔬</span>
              </div>
              Professional Anatomical Analysis
            </DialogTitle>
            <p className="text-gray-600 text-sm">Advanced facial muscle analysis with optimized container spacing</p>
          </DialogHeader>

          <div className="space-y-6">
            {/* Optimized Image Container - Fits Snugly Around Content */}
            <div className="bg-white border-2 border-gray-300 rounded-lg shadow-lg" style={{ width: 'fit-content', margin: '0 auto' }}>
              <div className="relative" style={{ width: '700px', height: '800px' }}>
                <img 
                  key={currentImageIndex}
                  src={currentImageIndex === 0 ? anatomicalDiagramImage : facialDiagramImage}
                  alt={currentImageIndex === 0 ? "Facial muscle anatomy diagram with detailed muscle labels" : "Facial Anatomy Reference Diagram"}
                  className="rounded-lg transition-opacity duration-300"
                  style={{
                    height: '800px',
                    width: '700px',
                    objectFit: 'contain',
                    objectPosition: 'center',
                    backgroundColor: 'white',
                    display: 'block'
                  }}
                />
                
                {/* Navigation Controls */}
                <button
                  onClick={() => setCurrentImageIndex(currentImageIndex === 0 ? 1 : 0)}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full transition-all duration-200 shadow-lg"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>

                <button
                  onClick={() => setCurrentImageIndex(currentImageIndex === 0 ? 1 : 0)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full transition-all duration-200 shadow-lg"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>

                {/* Image Indicators */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                  <div className={`w-3 h-3 rounded-full transition-all duration-200 ${currentImageIndex === 0 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                  <div className={`w-3 h-3 rounded-full transition-all duration-200 ${currentImageIndex === 1 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                </div>
              </div>
              
              {/* Image Label */}
              <div className="mt-4 text-center">
                <div className={`inline-flex items-center px-4 py-2 rounded-full text-white text-sm font-semibold shadow-lg ${
                  currentImageIndex === 0 ? 'bg-blue-600' : 'bg-green-600'
                }`}>
                  <div className="w-3 h-3 bg-white rounded-full mr-2 animate-pulse"></div>
                  {currentImageIndex === 0 ? 'Professional Medical Anatomical Diagram' : 'Anatomical Reference View'}
                </div>
              </div>
            </div>

            {/* Comprehensive Treatment Analysis Controls */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              {/* Muscle Analysis Section */}
              <Card className="border-2 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-blue-800">Facial Muscle Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">Target Muscle Group</Label>
                    <Select>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select muscle group" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="frontalis">Frontalis (Forehead)</SelectItem>
                        <SelectItem value="temporalis">Temporalis</SelectItem>
                        <SelectItem value="corrugator">Corrugator Supercilii</SelectItem>
                        <SelectItem value="procerus">Procerus</SelectItem>
                        <SelectItem value="orbicularis_oculi">Orbicularis Oculi</SelectItem>
                        <SelectItem value="levator_labii">Levator Labii Superioris</SelectItem>
                        <SelectItem value="zygomaticus_major">Zygomaticus Major</SelectItem>
                        <SelectItem value="zygomaticus_minor">Zygomaticus Minor</SelectItem>
                        <SelectItem value="masseter">Masseter</SelectItem>
                        <SelectItem value="buccinator">Buccinator</SelectItem>
                        <SelectItem value="orbicularis_oris">Orbicularis Oris</SelectItem>
                        <SelectItem value="mentalis">Mentalis</SelectItem>
                        <SelectItem value="depressor_anguli">Depressor Anguli Oris</SelectItem>
                        <SelectItem value="platysma">Platysma</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">Analysis Type</Label>
                    <Select>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select analysis type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="muscle_tone">Muscle Tone Assessment</SelectItem>
                        <SelectItem value="asymmetry">Asymmetry Analysis</SelectItem>
                        <SelectItem value="movement_range">Range of Movement</SelectItem>
                        <SelectItem value="tension_points">Tension Point Mapping</SelectItem>
                        <SelectItem value="nerve_function">Nerve Function Test</SelectItem>
                        <SelectItem value="weakness_assessment">Weakness Assessment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Treatment Options Section */}
              <Card className="border-2 border-green-200">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-green-800">Treatment Options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">Primary Treatment</Label>
                    <Select>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select primary treatment" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="botox_injection">Botox Injection Therapy</SelectItem>
                        <SelectItem value="dermal_fillers">Dermal Filler Treatment</SelectItem>
                        <SelectItem value="muscle_relaxants">Muscle Relaxant Medication</SelectItem>
                        <SelectItem value="physical_therapy">Physical Therapy</SelectItem>
                        <SelectItem value="facial_massage">Therapeutic Facial Massage</SelectItem>
                        <SelectItem value="nerve_blocks">Nerve Block Procedures</SelectItem>
                        <SelectItem value="laser_therapy">Laser Therapy</SelectItem>
                        <SelectItem value="microcurrent">Microcurrent Therapy</SelectItem>
                        <SelectItem value="ultrasound">Ultrasound Treatment</SelectItem>
                        <SelectItem value="surgical_intervention">Surgical Intervention</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">Treatment Intensity</Label>
                    <Select>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select intensity level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minimal">Minimal (Conservative approach)</SelectItem>
                        <SelectItem value="moderate">Moderate (Standard treatment)</SelectItem>
                        <SelectItem value="intensive">Intensive (Aggressive treatment)</SelectItem>
                        <SelectItem value="maintenance">Maintenance (Follow-up care)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">Session Frequency</Label>
                    <Select>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly Sessions</SelectItem>
                        <SelectItem value="biweekly">Bi-weekly Sessions</SelectItem>
                        <SelectItem value="monthly">Monthly Sessions</SelectItem>
                        <SelectItem value="quarterly">Quarterly Sessions</SelectItem>
                        <SelectItem value="single">Single Session</SelectItem>
                        <SelectItem value="emergency">Emergency/As Needed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Additional Analysis Tools */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
              <Card className="border border-purple-200">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-purple-800 mb-2">Symptom Assessment</h4>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Primary symptoms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="facial_pain">Facial Pain</SelectItem>
                      <SelectItem value="muscle_spasms">Muscle Spasms</SelectItem>
                      <SelectItem value="asymmetry">Facial Asymmetry</SelectItem>
                      <SelectItem value="weakness">Muscle Weakness</SelectItem>
                      <SelectItem value="tension">Chronic Tension</SelectItem>
                      <SelectItem value="twitching">Muscle Twitching</SelectItem>
                      <SelectItem value="stiffness">Joint Stiffness</SelectItem>
                      <SelectItem value="numbness">Numbness/Tingling</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              <Card className="border border-orange-200">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-orange-800 mb-2">Severity Scale</h4>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Rate severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Minimal (Barely noticeable)</SelectItem>
                      <SelectItem value="2">2 - Mild (Minor discomfort)</SelectItem>
                      <SelectItem value="3">3 - Moderate (Noticeable symptoms)</SelectItem>
                      <SelectItem value="4">4 - Severe (Significant impact)</SelectItem>
                      <SelectItem value="5">5 - Critical (Immediate attention)</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              <Card className="border border-teal-200">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-teal-800 mb-2">Follow-up Plan</h4>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Follow-up timeline" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1_week">1 Week Follow-up</SelectItem>
                      <SelectItem value="2_weeks">2 Weeks Follow-up</SelectItem>
                      <SelectItem value="1_month">1 Month Follow-up</SelectItem>
                      <SelectItem value="3_months">3 Months Follow-up</SelectItem>
                      <SelectItem value="6_months">6 Months Follow-up</SelectItem>
                      <SelectItem value="annual">Annual Review</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center space-x-4 mt-6">
              <Button 
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 font-semibold shadow-lg"
              >
                Generate Treatment Plan
              </Button>
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 font-semibold shadow-lg"
              >
                Save Analysis
              </Button>
              <Button 
                onClick={() => setShowAnatomicalViewer(false)}
                variant="outline"
                className="px-6 py-3 font-semibold shadow-lg"
              >
                Close Analysis
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
