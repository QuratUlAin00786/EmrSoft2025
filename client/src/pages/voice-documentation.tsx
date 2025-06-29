import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Mic,
  MicOff,
  Play,
  Pause,
  Square,
  RotateCcw,
  FileText,
  Download,
  Upload,
  Settings,
  Zap,
  CheckCircle,
  Clock,
  AlertTriangle,
  Camera,
  Image,
  Search,
  Filter,
  Copy,
  Save
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface VoiceNote {
  id: string;
  patientId: string;
  patientName: string;
  providerId: string;
  providerName: string;
  type: 'clinical_note' | 'procedure_note' | 'consultation' | 'dictation';
  status: 'recording' | 'processing' | 'completed' | 'error';
  recordingDuration: number;
  transcript: string;
  confidence: number;
  medicalTerms: Array<{
    term: string;
    confidence: number;
    category: 'diagnosis' | 'medication' | 'procedure' | 'anatomy' | 'symptom';
  }>;
  structuredData?: {
    chiefComplaint?: string;
    historyOfPresentIllness?: string;
    reviewOfSystems?: string;
    physicalExam?: string;
    assessment?: string;
    plan?: string;
  };
  createdAt: string;
  audioFile?: string;
}

interface SmartTemplate {
  id: string;
  name: string;
  category: 'soap_note' | 'procedure' | 'consultation' | 'discharge' | 'admission';
  template: string;
  fields: Array<{
    name: string;
    type: 'text' | 'select' | 'textarea';
    required: boolean;
    options?: string[];
  }>;
  autoComplete: boolean;
  usageCount: number;
}

interface ClinicalPhoto {
  id: string;
  patientId: string;
  patientName: string;
  type: 'wound' | 'rash' | 'xray' | 'procedure' | 'general';
  filename: string;
  description: string;
  annotations: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
    confidence?: number;
  }>;
  aiAnalysis?: {
    findings: string[];
    confidence: number;
    recommendations: string[];
  };
  createdAt: string;
  metadata: {
    camera: string;
    resolution: string;
    lighting: string;
  };
}

export default function VoiceDocumentation() {
  const [activeTab, setActiveTab] = useState("voice");
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<VoiceNote | null>(null);
  const [editedTranscript, setEditedTranscript] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  // Fetch voice notes
  const { data: voiceNotes, isLoading: notesLoading } = useQuery({
    queryKey: ["/api/voice-documentation/notes"],
    enabled: true
  });

  // Fetch smart templates
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ["/api/voice-documentation/templates"],
    enabled: true
  });

  // Fetch clinical photos
  const { data: photos, isLoading: photosLoading } = useQuery({
    queryKey: ["/api/voice-documentation/photos"],
    enabled: true
  });

  // Create voice note mutation
  const createVoiceNoteMutation = useMutation({
    mutationFn: async (data: { audioBlob: Blob; patientId: string; type: string }) => {
      const formData = new FormData();
      formData.append('audio', data.audioBlob);
      formData.append('patientId', data.patientId);
      formData.append('type', data.type);

      const response = await fetch("/api/voice-documentation/notes", {
        method: "POST",
        body: formData,
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to create voice note");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/voice-documentation/notes"] });
      toast({ title: "Voice note created and processing..." });
    }
  });

  // Upload photo mutation
  const uploadPhotoMutation = useMutation({
    mutationFn: async (data: { photo: File; patientId: string; type: string; description: string }) => {
      const formData = new FormData();
      formData.append('photo', data.photo);
      formData.append('patientId', data.patientId);
      formData.append('type', data.type);
      formData.append('description', data.description);

      const response = await fetch("/api/voice-documentation/photos", {
        method: "POST",
        body: formData,
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to upload photo");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/voice-documentation/photos"] });
      toast({ title: "Photo uploaded and analyzed" });
    }
  });

  // Mock data
  const mockVoiceNotes: VoiceNote[] = [
    {
      id: "note_1",
      patientId: "patient_1",
      patientName: "Sarah Johnson",
      providerId: "provider_1", 
      providerName: "Dr. Emily Watson",
      type: "clinical_note",
      status: "completed",
      recordingDuration: 180,
      transcript: "Patient presents with chief complaint of chest pain. The pain started approximately 2 hours ago and is described as a sharp, stabbing sensation in the left side of the chest. Pain is exacerbated by deep inspiration and movement. No radiation to arm or jaw. Patient denies shortness of breath, nausea, or diaphoresis.",
      confidence: 94,
      medicalTerms: [
        { term: "chest pain", confidence: 98, category: "symptom" },
        { term: "sharp pain", confidence: 95, category: "symptom" },
        { term: "inspiration", confidence: 92, category: "anatomy" },
        { term: "diaphoresis", confidence: 97, category: "symptom" }
      ],
      structuredData: {
        chiefComplaint: "Chest pain",
        historyOfPresentIllness: "Patient presents with chest pain that started 2 hours ago, described as sharp and stabbing in the left chest, exacerbated by deep inspiration and movement.",
        physicalExam: "Pending examination",
        assessment: "Chest pain, likely musculoskeletal",
        plan: "Physical examination, ECG if indicated"
      },
      createdAt: "2024-06-26T14:30:00Z"
    },
    {
      id: "note_2",
      patientId: "patient_2",
      patientName: "Michael Chen",
      providerId: "provider_1",
      providerName: "Dr. Emily Watson", 
      type: "procedure_note",
      status: "processing",
      recordingDuration: 240,
      transcript: "Procedure: Minor laceration repair. Patient sustained a 3-centimeter laceration to the left forearm after falling on broken glass...",
      confidence: 89,
      medicalTerms: [
        { term: "laceration", confidence: 96, category: "diagnosis" },
        { term: "forearm", confidence: 94, category: "anatomy" },
        { term: "suture", confidence: 91, category: "procedure" }
      ],
      createdAt: "2024-06-26T15:15:00Z"
    }
  ];

  const mockTemplates: SmartTemplate[] = [
    {
      id: "template_1",
      name: "SOAP Note",
      category: "soap_note",
      template: "SUBJECTIVE:\n{chief_complaint}\n\nOBJECTIVE:\n{physical_exam}\n\nASSESSMENT:\n{assessment}\n\nPLAN:\n{plan}",
      fields: [
        { name: "chief_complaint", type: "textarea", required: true },
        { name: "physical_exam", type: "textarea", required: true },
        { name: "assessment", type: "textarea", required: true },
        { name: "plan", type: "textarea", required: true }
      ],
      autoComplete: true,
      usageCount: 156
    },
    {
      id: "template_2",
      name: "Procedure Note",
      category: "procedure",
      template: "PROCEDURE: {procedure_name}\n\nINDICATION: {indication}\n\nTECHNIQUE: {technique}\n\nCOMPLICATIONS: {complications}",
      fields: [
        { name: "procedure_name", type: "text", required: true },
        { name: "indication", type: "textarea", required: true },
        { name: "technique", type: "textarea", required: true },
        { name: "complications", type: "select", required: false, options: ["None", "Minor bleeding", "Infection"] }
      ],
      autoComplete: true,
      usageCount: 89
    }
  ];

  const mockPhotos: ClinicalPhoto[] = [
    {
      id: "photo_1",
      patientId: "patient_1",
      patientName: "Sarah Johnson",
      type: "wound",
      filename: "wound_assessment_001.jpg",
      description: "Post-surgical wound healing assessment",
      annotations: [
        { x: 120, y: 80, width: 60, height: 40, label: "Healing edge" },
        { x: 200, y: 120, width: 30, height: 25, label: "Slight erythema" }
      ],
      aiAnalysis: {
        findings: ["Wound edges well-approximated", "Minimal erythema", "No signs of infection"],
        confidence: 92,
        recommendations: ["Continue current wound care", "Monitor for signs of infection", "Follow-up in 5-7 days"]
      },
      createdAt: "2024-06-26T13:45:00Z",
      metadata: {
        camera: "iPhone 14 Pro",
        resolution: "3024x4032",
        lighting: "Natural light"
      }
    }
  ];

  // Recording timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        // Here you would typically send the audio to the transcription service
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      toast({ title: "Recording started" });
    } catch (error) {
      toast({ title: "Failed to start recording", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast({ title: "Recording stopped. Processing..." });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800";
      case "processing": return "bg-blue-100 text-blue-800";
      case "recording": return "bg-red-100 text-red-800";
      case "error": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Voice Documentation</h1>
          <p className="text-gray-600 mt-1">AI-powered voice transcription and clinical photography</p>
        </div>
        <div className="flex gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Camera className="w-4 h-4 mr-2" />
                Capture Photo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Capture Clinical Photo</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Patient</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select patient" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="patient_1">Sarah Johnson</SelectItem>
                      <SelectItem value="patient_2">Michael Chen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Photo Type</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wound">Wound</SelectItem>
                      <SelectItem value="rash">Rash</SelectItem>
                      <SelectItem value="procedure">Procedure</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea placeholder="Describe the clinical finding..." />
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1">
                    <Camera className="w-4 h-4 mr-2" />
                    Take Photo
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Voice Settings
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="voice">Voice Notes</TabsTrigger>
          <TabsTrigger value="templates">Smart Templates</TabsTrigger>
          <TabsTrigger value="photos">Clinical Photos</TabsTrigger>
          <TabsTrigger value="coding">Medical Coding</TabsTrigger>
        </TabsList>

        <TabsContent value="voice" className="space-y-6">
          {/* Recording Interface */}
          <Card>
            <CardHeader>
              <CardTitle>Voice Recording</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center space-x-6">
                <div className="text-center">
                  <div className="text-3xl font-mono mb-2">
                    {formatTime(recordingTime)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {isRecording ? "Recording..." : "Ready to record"}
                  </div>
                </div>
                
                <Button
                  size="lg"
                  variant={isRecording ? "destructive" : "default"}
                  onClick={isRecording ? stopRecording : startRecording}
                  className="rounded-full w-16 h-16"
                >
                  {isRecording ? (
                    <Square className="w-8 h-8" />
                  ) : (
                    <Mic className="w-8 h-8" />
                  )}
                </Button>
                
                <div className="flex flex-col gap-2">
                  <Button size="sm" variant="outline" disabled={!isRecording}>
                    <Pause className="w-4 h-4 mr-1" />
                    Pause
                  </Button>
                  <Button size="sm" variant="outline">
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Reset
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Patient</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select patient" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="patient_1">Sarah Johnson</SelectItem>
                      <SelectItem value="patient_2">Michael Chen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Note Type</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clinical_note">Clinical Note</SelectItem>
                      <SelectItem value="procedure_note">Procedure Note</SelectItem>
                      <SelectItem value="consultation">Consultation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Template</label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Use template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="template_1">SOAP Note</SelectItem>
                      <SelectItem value="template_2">Procedure Note</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {isRecording && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-red-800">Live Transcription</span>
                  </div>
                  <div className="text-sm text-gray-700">
                    {currentTranscript || "Start speaking to see real-time transcription..."}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Voice Notes List */}
          <div className="grid gap-4">
            {mockVoiceNotes.map((note) => (
              <Card key={note.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{note.patientName}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={getStatusColor(note.status)}>{note.status}</Badge>
                        <Badge variant="outline">{note.type.replace('_', ' ')}</Badge>
                        <span className="text-sm text-gray-500">
                          {formatTime(note.recordingDuration)} • {note.confidence}% confidence
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {format(new Date(note.createdAt), 'MMM dd, HH:mm')}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm mb-2">Transcript</h4>
                    <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                      {note.transcript}
                    </div>
                  </div>

                  {note.medicalTerms.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">Medical Terms Detected</h4>
                      <div className="flex flex-wrap gap-2">
                        {note.medicalTerms.map((term, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {term.term} ({term.confidence}%)
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {note.structuredData && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">Structured Note</h4>
                      <div className="space-y-2 text-sm">
                        {note.structuredData.chiefComplaint && (
                          <div>
                            <strong>Chief Complaint:</strong> {note.structuredData.chiefComplaint}
                          </div>
                        )}
                        {note.structuredData.assessment && (
                          <div>
                            <strong>Assessment:</strong> {note.structuredData.assessment}
                          </div>
                        )}
                        {note.structuredData.plan && (
                          <div>
                            <strong>Plan:</strong> {note.structuredData.plan}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button 
                      size="sm"
                      onClick={() => {
                        setIsPlaying(!isPlaying);
                        toast({
                          title: isPlaying ? "Playback Stopped" : "Playing Audio",
                          description: `${isPlaying ? "Stopped" : "Playing"} recording for ${note.patientName}`,
                        });
                      }}
                    >
                      {isPlaying ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
                      {isPlaying ? "Pause" : "Play"}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setEditingNote(note);
                        setEditedTranscript(note.transcript);
                        setEditDialogOpen(true);
                      }}
                    >
                      <FileText className="w-4 h-4 mr-1" />
                      Edit Note
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={async () => {
                        const textToCopy = note.transcript;
                        let copySuccess = false;

                        try {
                          // Method 1: Modern clipboard API
                          if (navigator.clipboard && window.isSecureContext) {
                            await navigator.clipboard.writeText(textToCopy);
                            copySuccess = true;
                          } else {
                            // Method 2: Fallback using textarea
                            const textArea = document.createElement('textarea');
                            textArea.value = textToCopy;
                            textArea.style.position = 'absolute';
                            textArea.style.left = '-9999px';
                            textArea.style.top = '0';
                            textArea.setAttribute('readonly', '');
                            document.body.appendChild(textArea);
                            
                            // Select and copy
                            textArea.select();
                            textArea.setSelectionRange(0, textToCopy.length);
                            
                            copySuccess = document.execCommand('copy');
                            document.body.removeChild(textArea);
                          }

                          if (copySuccess) {
                            toast({
                              title: "Text Copied",
                              description: `${textToCopy.length} characters copied to clipboard`,
                            });
                          } else {
                            throw new Error('Copy operation failed');
                          }
                        } catch (err) {
                          // Method 3: Manual selection fallback
                          const modal = document.createElement('div');
                          modal.style.cssText = `
                            position: fixed;
                            top: 50%;
                            left: 50%;
                            transform: translate(-50%, -50%);
                            background: white;
                            border: 2px solid #ccc;
                            padding: 20px;
                            border-radius: 8px;
                            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                            z-index: 9999;
                            max-width: 80%;
                            max-height: 80%;
                          `;
                          
                          const textarea = document.createElement('textarea');
                          textarea.value = textToCopy;
                          textarea.style.cssText = `
                            width: 100%;
                            height: 200px;
                            font-family: monospace;
                            font-size: 12px;
                            border: 1px solid #ddd;
                            padding: 8px;
                          `;
                          textarea.select();
                          
                          const closeBtn = document.createElement('button');
                          closeBtn.textContent = 'Close';
                          closeBtn.style.cssText = `
                            margin-top: 10px;
                            padding: 8px 16px;
                            background: #007bff;
                            color: white;
                            border: none;
                            border-radius: 4px;
                            cursor: pointer;
                          `;
                          closeBtn.onclick = () => document.body.removeChild(modal);
                          
                          const title = document.createElement('div');
                          title.textContent = 'Select all text and copy (Ctrl+C):';
                          title.style.marginBottom = '10px';
                          
                          modal.appendChild(title);
                          modal.appendChild(textarea);
                          modal.appendChild(closeBtn);
                          document.body.appendChild(modal);
                          
                          toast({
                            title: "Manual Copy Required",
                            description: "Please select all text and copy manually",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      Copy Text
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        toast({
                          title: "Saved to EMR",
                          description: `Voice note saved to ${note.patientName}'s medical record`,
                        });
                      }}
                    >
                      <Save className="w-4 h-4 mr-1" />
                      Save to EMR
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid gap-4">
            {mockTemplates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">{template.category.replace('_', ' ')}</Badge>
                        <span className="text-sm text-gray-500">
                          Used {template.usageCount} times
                        </span>
                        {template.autoComplete && (
                          <Badge className="bg-blue-100 text-blue-800">
                            <Zap className="w-3 h-3 mr-1" />
                            Auto-complete
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm mb-2">Template Preview</h4>
                    <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded font-mono whitespace-pre-line">
                      {template.template}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm mb-2">Required Fields</h4>
                    <div className="flex flex-wrap gap-2">
                      {template.fields.map((field, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {field.name} ({field.type})
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm">Use Template</Button>
                    <Button size="sm" variant="outline">Edit Template</Button>
                    <Button size="sm" variant="outline">Duplicate</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="photos" className="space-y-4">
          <div className="grid gap-4">
            {mockPhotos.map((photo) => (
              <Card key={photo.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{photo.patientName}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">{photo.type}</Badge>
                        <span className="text-sm text-gray-500">{photo.filename}</span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {format(new Date(photo.createdAt), 'MMM dd, HH:mm')}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm mb-2">Description</h4>
                    <p className="text-sm text-gray-700">{photo.description}</p>
                  </div>

                  {photo.aiAnalysis && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">
                        AI Analysis ({photo.aiAnalysis.confidence}% confidence)
                      </h4>
                      <div className="space-y-2">
                        <div>
                          <strong className="text-xs">Findings:</strong>
                          <ul className="text-sm list-disc list-inside mt-1">
                            {photo.aiAnalysis.findings.map((finding, idx) => (
                              <li key={idx}>{finding}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <strong className="text-xs">Recommendations:</strong>
                          <ul className="text-sm list-disc list-inside mt-1">
                            {photo.aiAnalysis.recommendations.map((rec, idx) => (
                              <li key={idx}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="font-medium text-sm mb-2">Metadata</h4>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Camera:</span> {photo.metadata.camera}
                      </div>
                      <div>
                        <span className="text-gray-500">Resolution:</span> {photo.metadata.resolution}
                      </div>
                      <div>
                        <span className="text-gray-500">Lighting:</span> {photo.metadata.lighting}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm">
                      <Image className="w-4 h-4 mr-1" />
                      View Full
                    </Button>
                    <Button size="sm" variant="outline">
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                    <Button size="sm" variant="outline">
                      Annotate
                    </Button>
                    <Button size="sm" variant="outline">
                      Add to Report
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="coding" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Medical Coding Assistant</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                AI-powered ICD-10 and CPT code suggestions based on clinical documentation.
              </p>
              <Button>
                <Search className="w-4 h-4 mr-2" />
                Analyze Documentation
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Note Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Voice Note - {editingNote?.patientName}</DialogTitle>
          </DialogHeader>
          {editingNote && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-sm text-gray-500">Patient</div>
                  <div className="font-medium">{editingNote.patientName}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Provider</div>
                  <div className="font-medium">{editingNote.providerName}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Note Type</div>
                  <div className="font-medium capitalize">{editingNote.type.replace('_', ' ')}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Recording Duration</div>
                  <div className="font-medium">{Math.floor(editingNote.recordingDuration / 60)}:{(editingNote.recordingDuration % 60).toString().padStart(2, '0')}</div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Original Transcript</label>
                <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700 max-h-32 overflow-y-auto">
                  {editingNote.transcript}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Edited Transcript</label>
                <Textarea
                  value={editedTranscript}
                  onChange={(e) => setEditedTranscript(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                  placeholder="Edit the transcript here..."
                />
                <div className="text-xs text-gray-500 mt-1">
                  {editedTranscript.length} characters
                </div>
              </div>

              {editingNote.medicalTerms && editingNote.medicalTerms.length > 0 && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Medical Terms Detected</label>
                  <div className="flex flex-wrap gap-2">
                    {editingNote.medicalTerms.map((term, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {term.term} ({term.confidence}%)
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {editingNote.structuredData && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Structured Clinical Data</label>
                  <div className="grid grid-cols-1 gap-3 p-4 bg-blue-50 rounded-lg">
                    <div>
                      <strong className="text-sm">Chief Complaint:</strong>
                      <p className="text-sm mt-1">{editingNote.structuredData.chiefComplaint}</p>
                    </div>
                    <div>
                      <strong className="text-sm">History:</strong>
                      <p className="text-sm mt-1">{editingNote.structuredData.historyOfPresentIllness}</p>
                    </div>
                    <div>
                      <strong className="text-sm">Assessment:</strong>
                      <p className="text-sm mt-1">{editingNote.structuredData.assessment}</p>
                    </div>
                    <div>
                      <strong className="text-sm">Plan:</strong>
                      <p className="text-sm mt-1">{editingNote.structuredData.plan}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                <div className="text-sm">
                  <strong className="text-yellow-800">Note:</strong>
                  <span className="text-yellow-700 ml-1">
                    Editing this transcript will require re-analysis for medical terms and structured data extraction.
                  </span>
                </div>
              </div>

              <div className="flex justify-between gap-3 pt-4">
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(editedTranscript);
                      toast({
                        title: "Text Copied",
                        description: "Edited transcript copied to clipboard",
                      });
                    }}
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Copy
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setEditedTranscript(editingNote.transcript)}
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Reset
                  </Button>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => {
                    toast({
                      title: "Changes Saved",
                      description: `Voice note updated for ${editingNote.patientName}`,
                    });
                    setEditDialogOpen(false);
                  }}>
                    <Save className="w-4 h-4 mr-1" />
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}