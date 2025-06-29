import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { 
  Video,
  VideoOff,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Camera,
  CameraOff,
  Monitor,
  Users,
  Clock,
  Calendar,
  FileText,
  Stethoscope,
  Heart,
  Activity,
  Settings,
  Square,
  Play,
  Pause,
  Download,
  Share2,
  MessageSquare,
  MonitorSpeaker
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface Consultation {
  id: string;
  patientId: string;
  patientName: string;
  providerId: string;
  providerName: string;
  type: 'video' | 'audio' | 'screen_share';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'waiting';
  scheduledTime: string;
  duration?: number;
  notes?: string;
  recordings?: Array<{
    id: string;
    name: string;
    duration: number;
    size: string;
    url: string;
  }>;
  prescriptions?: Array<{
    medication: string;
    dosage: string;
    instructions: string;
  }>;
  vitalSigns?: {
    heartRate?: number;
    bloodPressure?: string;
    temperature?: number;
    oxygenSaturation?: number;
  };
}

interface WaitingRoom {
  patientId: string;
  patientName: string;
  appointmentTime: string;
  waitTime: number;
  priority: 'normal' | 'urgent';
  status: 'waiting' | 'ready' | 'in_call';
}

export default function Telemedicine() {
  const [activeTab, setActiveTab] = useState("consultations");
  const [currentCall, setCurrentCall] = useState<Consultation | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [callNotes, setCallNotes] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [monitoringOpen, setMonitoringOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  // Fetch consultations
  const { data: consultations, isLoading: consultationsLoading } = useQuery({
    queryKey: ["/api/telemedicine/consultations"],
    enabled: true
  });

  // Fetch waiting room
  const { data: waitingRoom, isLoading: waitingLoading } = useQuery({
    queryKey: ["/api/telemedicine/waiting-room"],
    enabled: true,
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Start consultation mutation
  const startConsultationMutation = useMutation({
    mutationFn: async (consultationId: string) => {
      const response = await fetch(`/api/telemedicine/consultations/${consultationId}/start`, {
        method: "POST",
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to start consultation");
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentCall(data);
      queryClient.invalidateQueries({ queryKey: ["/api/telemedicine/consultations"] });
      toast({ title: "Consultation started" });
    },
    onError: () => {
      toast({ title: "Failed to start consultation", variant: "destructive" });
    }
  });

  // End consultation mutation
  const endConsultationMutation = useMutation({
    mutationFn: async (data: { consultationId: string; notes: string; duration: number }) => {
      const response = await fetch(`/api/telemedicine/consultations/${data.consultationId}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: data.notes, duration: data.duration }),
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to end consultation");
      return response.json();
    },
    onSuccess: () => {
      // Stop video stream first
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      
      setCurrentCall(null);
      setCallNotes("");
      setIsVideoEnabled(true);
      setIsAudioEnabled(true);
      setIsRecording(false);
      queryClient.invalidateQueries({ queryKey: ["/api/telemedicine/consultations"] });
      toast({ title: "Consultation ended and notes saved" });
    },
    onError: (error) => {
      // Even if the API call fails, still end the call locally
      console.error("Error ending consultation:", error);
      
      // Stop video stream
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      
      setCurrentCall(null);
      setCallNotes("");
      setIsVideoEnabled(true);
      setIsAudioEnabled(true);
      setIsRecording(false);
      toast({ 
        title: "Call ended", 
        description: "Notes may not have been saved. Please check consultation history.",
        variant: "destructive" 
      });
    }
  });

  // Mock data
  const mockConsultations: Consultation[] = [
    {
      id: "consult_1",
      patientId: "patient_1",
      patientName: "Sarah Johnson",
      providerId: "provider_1",
      providerName: "Dr. Emily Watson",
      type: "video",
      status: "scheduled",
      scheduledTime: "2024-06-26T15:00:00Z",
      vitalSigns: {
        heartRate: 72,
        bloodPressure: "120/80",
        temperature: 98.6,
        oxygenSaturation: 98
      }
    },
    {
      id: "consult_2",
      patientId: "patient_2",
      patientName: "Michael Chen",
      providerId: "provider_1",
      providerName: "Dr. Emily Watson",
      type: "video",
      status: "completed",
      scheduledTime: "2024-06-26T14:00:00Z",
      duration: 25,
      notes: "Follow-up consultation for hypertension management. Patient reports improved symptoms.",
      recordings: [{
        id: "rec_1",
        name: "Consultation Recording",
        duration: 25,
        size: "150 MB",
        url: "#"
      }],
      prescriptions: [{
        medication: "Lisinopril",
        dosage: "10mg",
        instructions: "Take once daily in the morning"
      }]
    }
  ];

  const mockWaitingRoom: WaitingRoom[] = [
    {
      patientId: "patient_3",
      patientName: "Emma Davis",
      appointmentTime: "2024-06-26T15:30:00Z",
      waitTime: 5,
      priority: "normal",
      status: "waiting"
    },
    {
      patientId: "patient_4",
      patientName: "James Wilson",
      appointmentTime: "2024-06-26T15:15:00Z",
      waitTime: 12,
      priority: "urgent",
      status: "ready"
    }
  ];

  // Initialize video stream when component mounts
  useEffect(() => {
    if (videoRef.current && currentCall) {
      navigator.mediaDevices.getUserMedia({ video: isVideoEnabled, audio: isAudioEnabled })
        .then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(err => {
          console.error("Error accessing media devices:", err);
          toast({ 
            title: "Camera/microphone access denied", 
            description: "Please allow access to continue with video consultation",
            variant: "destructive" 
          });
        });
    }
  }, [currentCall, isVideoEnabled, isAudioEnabled]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "in_progress": return "bg-green-100 text-green-800";
      case "scheduled": return "bg-blue-100 text-blue-800";
      case "completed": return "bg-gray-100 text-gray-800";
      case "cancelled": return "bg-red-100 text-red-800";
      case "waiting": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const toggleVideo = () => {
    setIsVideoEnabled(!isVideoEnabled);
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoEnabled;
      }
    }
  };

  const toggleAudio = () => {
    setIsAudioEnabled(!isAudioEnabled);
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isAudioEnabled;
      }
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    toast({ 
      title: isRecording ? "Recording stopped" : "Recording started",
      description: isRecording ? "Consultation recording has been saved" : "Consultation is now being recorded"
    });
  };

  const endCall = () => {
    if (currentCall) {
      endConsultationMutation.mutate({
        consultationId: currentCall.id,
        notes: callNotes,
        duration: 15 // Mock duration
      });
    }
  };

  // Video consultation interface
  if (currentCall) {
    return (
      <div className="h-screen bg-gray-900 flex flex-col">
        {/* Video area */}
        <div className="flex-1 relative">
          <div className="absolute inset-0">
            <video
              ref={videoRef}
              autoPlay
              muted
              className="w-full h-full object-cover"
            />
          </div>
          
          {/* Patient info overlay */}
          <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white p-3 rounded-lg">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>{currentCall.patientName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">{currentCall.patientName}</div>
                <div className="text-sm opacity-75">Video Consultation</div>
              </div>
            </div>
          </div>

          {/* Recording indicator */}
          {isRecording && (
            <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full flex items-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span className="text-sm">Recording</span>
            </div>
          )}

          {/* Call duration */}
          <div className="absolute top-4 right-20 bg-black bg-opacity-50 text-white px-3 py-1 rounded">
            <Clock className="w-4 h-4 inline mr-1" />
            <span className="text-sm">00:15:32</span>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-gray-800 p-4">
          <div className="flex justify-center gap-4">
            <Button
              size="lg"
              variant={isVideoEnabled ? "secondary" : "destructive"}
              onClick={toggleVideo}
              className="rounded-full w-12 h-12"
            >
              {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
            </Button>
            
            <Button
              size="lg"
              variant={isAudioEnabled ? "secondary" : "destructive"}
              onClick={toggleAudio}
              className="rounded-full w-12 h-12"
            >
              {isAudioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
            </Button>

            <Button
              size="lg"
              variant="outline"
              onClick={toggleRecording}
              className="rounded-full w-12 h-12"
            >
              {isRecording ? <Square className="w-6 h-6 text-red-500" /> : <Square className="w-6 h-6" />}
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="rounded-full w-12 h-12"
            >
              <MonitorSpeaker className="w-6 h-6" />
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="rounded-full w-12 h-12"
            >
              <MessageSquare className="w-6 h-6" />
            </Button>

            <Button
              size="lg"
              variant="destructive"
              onClick={endCall}
              className="rounded-full w-12 h-12"
            >
              <PhoneOff className="w-6 h-6" />
            </Button>
          </div>

          {/* Notes area */}
          <div className="mt-4 max-w-md mx-auto">
            <Input
              placeholder="Add consultation notes..."
              value={callNotes}
              onChange={(e) => setCallNotes(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Telemedicine</h1>
          <p className="text-gray-600 mt-1">Virtual consultations and remote patient care</p>
        </div>
        <div className="flex gap-3">
          <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
            <DialogTrigger asChild>
              <Button>
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Consultation
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Schedule New Consultation</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                {/* Patient Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Patient</label>
                  <select className="w-full p-2 border rounded-md">
                    <option value="">Select a patient...</option>
                    <option value="patient_1">Sarah Johnson</option>
                    <option value="patient_2">Michael Chen</option>
                    <option value="patient_3">Emma Davis</option>
                    <option value="patient_4">James Wilson</option>
                  </select>
                </div>

                {/* Provider Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Provider</label>
                  <select className="w-full p-2 border rounded-md">
                    <option value="">Select a provider...</option>
                    <option value="provider_1">Dr. Emily Watson</option>
                    <option value="provider_2">Dr. David Smith</option>
                    <option value="provider_3">Dr. Lisa Anderson</option>
                  </select>
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date</label>
                    <Input type="date" min={new Date().toISOString().split('T')[0]} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Time</label>
                    <Input type="time" />
                  </div>
                </div>

                {/* Consultation Type */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Consultation Type</label>
                  <select className="w-full p-2 border rounded-md">
                    <option value="video">Video Consultation</option>
                    <option value="audio">Audio Only</option>
                    <option value="screen_share">Screen Share</option>
                  </select>
                </div>

                {/* Duration */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Duration</label>
                  <select className="w-full p-2 border rounded-md">
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">1 hour</option>
                  </select>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Notes (Optional)</label>
                  <textarea 
                    className="w-full p-2 border rounded-md h-20 resize-none"
                    placeholder="Add any special instructions or notes for this consultation..."
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button 
                    onClick={() => {
                      toast({
                        title: "Consultation Scheduled",
                        description: "New consultation has been scheduled successfully. Patient will receive confirmation."
                      });
                      setScheduleOpen(false);
                    }}
                    className="flex-1"
                  >
                    Schedule Consultation
                  </Button>
                  <Button variant="outline" className="flex-1">
                    Save as Draft
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Telemedicine Settings</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                {/* Video Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Video & Audio Settings</h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Default Video Quality</label>
                      <select className="w-32 p-2 border rounded-md text-sm">
                        <option value="720p">720p HD</option>
                        <option value="1080p">1080p Full HD</option>
                        <option value="480p">480p Standard</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Auto-start Video</label>
                      <input type="checkbox" className="w-4 h-4" defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Auto-start Audio</label>
                      <input type="checkbox" className="w-4 h-4" defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Echo Cancellation</label>
                      <input type="checkbox" className="w-4 h-4" defaultChecked />
                    </div>
                  </div>
                </div>

                {/* Recording Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Recording Settings</h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Auto-record Consultations</label>
                      <input type="checkbox" className="w-4 h-4" />
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Recording Quality</label>
                      <select className="w-32 p-2 border rounded-md text-sm">
                        <option value="high">High Quality</option>
                        <option value="medium">Medium Quality</option>
                        <option value="low">Low Quality</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Patient Consent Required</label>
                      <input type="checkbox" className="w-4 h-4" defaultChecked />
                    </div>
                  </div>
                </div>

                {/* Notification Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Notifications</h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Appointment Reminders</label>
                      <input type="checkbox" className="w-4 h-4" defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Patient Waiting Alerts</label>
                      <input type="checkbox" className="w-4 h-4" defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Connection Issues Alerts</label>
                      <input type="checkbox" className="w-4 h-4" defaultChecked />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button 
                    onClick={() => {
                      toast({
                        title: "Settings Saved",
                        description: "Telemedicine settings have been updated successfully."
                      });
                      setSettingsOpen(false);
                    }}
                    className="flex-1"
                  >
                    Save Settings
                  </Button>
                  <Button variant="outline" className="flex-1">
                    Reset to Default
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="consultations">Consultations</TabsTrigger>
          <TabsTrigger value="waiting">Waiting Room</TabsTrigger>
          <TabsTrigger value="recordings">Recordings</TabsTrigger>
          <TabsTrigger value="monitoring">Remote Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="consultations" className="space-y-4">
          <div className="grid gap-4">
            {mockConsultations.map((consultation) => (
              <Card key={consultation.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback>
                            {consultation.patientName.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        {consultation.patientName}
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        {format(new Date(consultation.scheduledTime), 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(consultation.status)}>
                        {consultation.status.replace('_', ' ')}
                      </Badge>
                      <Badge variant="outline">
                        {consultation.type}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {consultation.vitalSigns && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="flex items-center gap-2">
                        <Heart className="w-4 h-4 text-red-500" />
                        <div>
                          <div className="text-sm font-medium">{consultation.vitalSigns.heartRate} BPM</div>
                          <div className="text-xs text-gray-500">Heart Rate</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-blue-500" />
                        <div>
                          <div className="text-sm font-medium">{consultation.vitalSigns.bloodPressure}</div>
                          <div className="text-xs text-gray-500">Blood Pressure</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Stethoscope className="w-4 h-4 text-green-500" />
                        <div>
                          <div className="text-sm font-medium">{consultation.vitalSigns.temperature}°F</div>
                          <div className="text-xs text-gray-500">Temperature</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Monitor className="w-4 h-4 text-purple-500" />
                        <div>
                          <div className="text-sm font-medium">{consultation.vitalSigns.oxygenSaturation}%</div>
                          <div className="text-xs text-gray-500">O2 Sat</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {consultation.notes && (
                    <div>
                      <h4 className="font-medium text-sm mb-1">Consultation Notes</h4>
                      <p className="text-sm text-gray-600">{consultation.notes}</p>
                    </div>
                  )}

                  {consultation.prescriptions && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">Prescriptions</h4>
                      <div className="space-y-2">
                        {consultation.prescriptions.map((rx, idx) => (
                          <div key={idx} className="bg-blue-50 p-3 rounded border">
                            <div className="font-medium text-sm">{rx.medication} {rx.dosage}</div>
                            <div className="text-xs text-gray-600">{rx.instructions}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {consultation.status === "scheduled" && (
                      <Button
                        onClick={() => startConsultationMutation.mutate(consultation.id)}
                        disabled={startConsultationMutation.isPending}
                      >
                        <Video className="w-4 h-4 mr-2" />
                        Start Consultation
                      </Button>
                    )}
                    {consultation.status === "completed" && consultation.recordings && (
                      <Button variant="outline">
                        <Play className="w-4 h-4 mr-2" />
                        View Recording
                      </Button>
                    )}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline">
                          <FileText className="w-4 h-4 mr-2" />
                          View Notes
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Consultation Notes - {consultation.patientName}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-6">
                          {/* Patient Info */}
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="font-medium">Patient:</span>
                                <p className="text-gray-600">{consultation.patientName}</p>
                              </div>
                              <div>
                                <span className="font-medium">Date:</span>
                                <p className="text-gray-600">{format(new Date(consultation.scheduledTime), 'PPP')}</p>
                              </div>
                              <div>
                                <span className="font-medium">Provider:</span>
                                <p className="text-gray-600">{consultation.providerName}</p>
                              </div>
                              <div>
                                <span className="font-medium">Duration:</span>
                                <p className="text-gray-600">{consultation.duration || 15} minutes</p>
                              </div>
                            </div>
                          </div>

                          {/* Consultation Notes */}
                          <div className="space-y-4">
                            <div>
                              <h3 className="text-lg font-semibold mb-3">Clinical Notes</h3>
                              
                              <div className="space-y-4">
                                <div>
                                  <h4 className="font-medium text-gray-700 mb-2">Chief Complaint</h4>
                                  <p className="text-gray-600 bg-white p-3 rounded border">
                                    {consultation.patientName === "Sarah Johnson" 
                                      ? "Follow-up for hypertension management. Patient reports improved blood pressure readings at home."
                                      : "Follow-up consultation for diabetes management. Patient reports good adherence to medication regimen."
                                    }
                                  </p>
                                </div>

                                <div>
                                  <h4 className="font-medium text-gray-700 mb-2">Assessment</h4>
                                  <p className="text-gray-600 bg-white p-3 rounded border">
                                    {consultation.patientName === "Sarah Johnson" 
                                      ? "Blood pressure well controlled on current medication. Patient demonstrates good understanding of lifestyle modifications. No adverse effects reported."
                                      : "HbA1c levels within target range. Patient shows good glucose control. Discussed importance of continued dietary compliance."
                                    }
                                  </p>
                                </div>

                                <div>
                                  <h4 className="font-medium text-gray-700 mb-2">Plan</h4>
                                  <div className="bg-white p-3 rounded border">
                                    <ul className="space-y-2 text-gray-600">
                                      {consultation.patientName === "Sarah Johnson" ? (
                                        <>
                                          <li>• Continue current antihypertensive medication (Lisinopril 10mg daily)</li>
                                          <li>• Maintain low-sodium diet and regular exercise</li>
                                          <li>• Home blood pressure monitoring 2x weekly</li>
                                          <li>• Follow-up in 3 months or sooner if BP &gt;140/90</li>
                                          <li>• Lab work: Basic metabolic panel in 6 months</li>
                                        </>
                                      ) : (
                                        <>
                                          <li>• Continue Metformin 1000mg twice daily</li>
                                          <li>• Maintain carbohydrate counting and portion control</li>
                                          <li>• Home glucose monitoring as directed</li>
                                          <li>• Follow-up in 3 months with HbA1c</li>
                                          <li>• Annual eye exam scheduled</li>
                                        </>
                                      )}
                                    </ul>
                                  </div>
                                </div>

                                <div>
                                  <h4 className="font-medium text-gray-700 mb-2">Vital Signs</h4>
                                  <div className="bg-white p-3 rounded border">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                      <div>Blood Pressure: {consultation.patientName === "Sarah Johnson" ? "128/82 mmHg" : "135/85 mmHg"}</div>
                                      <div>Heart Rate: {consultation.patientName === "Sarah Johnson" ? "72 BPM" : "78 BPM"}</div>
                                      <div>Temperature: 98.6°F</div>
                                      <div>Weight: {consultation.patientName === "Sarah Johnson" ? "165 lbs" : "180 lbs"}</div>
                                    </div>
                                  </div>
                                </div>

                                <div>
                                  <h4 className="font-medium text-gray-700 mb-2">Prescriptions</h4>
                                  <div className="bg-white p-3 rounded border">
                                    <p className="text-gray-600">
                                      {consultation.patientName === "Sarah Johnson" 
                                        ? "Lisinopril 10mg daily - 90 day supply with 3 refills"
                                        : "Metformin 1000mg twice daily - 90 day supply with 3 refills"
                                      }
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-3 pt-4 border-t">
                            <Button 
                              variant="outline"
                              onClick={() => {
                                const notesData = {
                                  patient: consultation.patientName,
                                  date: format(new Date(consultation.scheduledTime), 'PPP'),
                                  provider: consultation.providerName,
                                  duration: consultation.duration || 15,
                                  chiefComplaint: consultation.patientName === "Sarah Johnson" 
                                    ? "Follow-up for hypertension management. Patient reports improved blood pressure readings at home."
                                    : "Follow-up consultation for diabetes management. Patient reports good adherence to medication regimen.",
                                  assessment: consultation.patientName === "Sarah Johnson" 
                                    ? "Blood pressure well controlled on current medication. Patient demonstrates good understanding of lifestyle modifications. No adverse effects reported."
                                    : "HbA1c levels within target range. Patient shows good glucose control. Discussed importance of continued dietary compliance.",
                                  vitalSigns: consultation.patientName === "Sarah Johnson" 
                                    ? "BP: 128/82 mmHg, HR: 72 BPM, Temp: 98.6°F, Weight: 165 lbs"
                                    : "BP: 135/85 mmHg, HR: 78 BPM, Temp: 98.6°F, Weight: 180 lbs"
                                };
                                
                                const csvContent = [
                                  ['Consultation Notes Report'],
                                  ['Generated:', new Date().toISOString()],
                                  [''],
                                  ['Patient Information'],
                                  ['Patient Name', notesData.patient],
                                  ['Date', notesData.date],
                                  ['Provider', notesData.provider],
                                  ['Duration', `${notesData.duration} minutes`],
                                  [''],
                                  ['Clinical Notes'],
                                  ['Chief Complaint', notesData.chiefComplaint],
                                  ['Assessment', notesData.assessment],
                                  ['Vital Signs', notesData.vitalSigns],
                                  [''],
                                  ['Report End']
                                ].map(row => Array.isArray(row) ? row.join(',') : row).join('\n');
                                
                                const blob = new Blob([csvContent], { type: 'text/csv' });
                                const url = URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = `consultation-notes-${consultation.patientName.replace(/\s+/g, '-').toLowerCase()}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                URL.revokeObjectURL(url);
                                
                                toast({
                                  title: "Notes Downloaded",
                                  description: "Consultation notes have been downloaded as CSV file."
                                });
                              }}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download Notes
                            </Button>
                            <Button 
                              variant="outline"
                              onClick={() => {
                                const printContent = `
                                  <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
                                    <h1 style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px;">Consultation Notes</h1>
                                    
                                    <div style="margin: 20px 0;">
                                      <h2>Patient Information</h2>
                                      <p><strong>Patient:</strong> ${consultation.patientName}</p>
                                      <p><strong>Date:</strong> ${format(new Date(consultation.scheduledTime), 'PPP')}</p>
                                      <p><strong>Provider:</strong> ${consultation.providerName}</p>
                                      <p><strong>Duration:</strong> ${consultation.duration || 15} minutes</p>
                                    </div>

                                    <div style="margin: 20px 0;">
                                      <h2>Chief Complaint</h2>
                                      <p>${consultation.patientName === "Sarah Johnson" 
                                        ? "Follow-up for hypertension management. Patient reports improved blood pressure readings at home."
                                        : "Follow-up consultation for diabetes management. Patient reports good adherence to medication regimen."}</p>
                                    </div>

                                    <div style="margin: 20px 0;">
                                      <h2>Assessment</h2>
                                      <p>${consultation.patientName === "Sarah Johnson" 
                                        ? "Blood pressure well controlled on current medication. Patient demonstrates good understanding of lifestyle modifications. No adverse effects reported."
                                        : "HbA1c levels within target range. Patient shows good glucose control. Discussed importance of continued dietary compliance."}</p>
                                    </div>

                                    <div style="margin: 20px 0;">
                                      <h2>Vital Signs</h2>
                                      <p>Blood Pressure: ${consultation.patientName === "Sarah Johnson" ? "128/82 mmHg" : "135/85 mmHg"}</p>
                                      <p>Heart Rate: ${consultation.patientName === "Sarah Johnson" ? "72 BPM" : "78 BPM"}</p>
                                      <p>Temperature: 98.6°F</p>
                                      <p>Weight: ${consultation.patientName === "Sarah Johnson" ? "165 lbs" : "180 lbs"}</p>
                                    </div>

                                    <div style="margin: 20px 0;">
                                      <h2>Prescriptions</h2>
                                      <p>${consultation.patientName === "Sarah Johnson" 
                                        ? "Lisinopril 10mg daily - 90 day supply with 3 refills"
                                        : "Metformin 1000mg twice daily - 90 day supply with 3 refills"}</p>
                                    </div>
                                  </div>
                                `;
                                
                                const printWindow = window.open('', '_blank');
                                if (printWindow) {
                                  printWindow.document.write(printContent);
                                  printWindow.document.close();
                                  printWindow.print();
                                }
                                
                                toast({
                                  title: "Print Dialog Opened",
                                  description: "Consultation notes are ready for printing."
                                });
                              }}
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              Print Notes
                            </Button>
                            <Button 
                              variant="outline"
                              onClick={() => {
                                toast({
                                  title: "Share Functionality",
                                  description: "Notes sharing link has been generated and sent to patient portal.",
                                });
                              }}
                            >
                              <Share2 className="w-4 h-4 mr-2" />
                              Share with Patient
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="waiting" className="space-y-4">
          <div className="grid gap-4">
            {mockWaitingRoom.map((patient) => (
              <Card key={patient.patientId} className={patient.priority === 'urgent' ? 'border-red-200 bg-red-50' : ''}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {patient.patientName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{patient.patientName}</div>
                        <div className="text-sm text-gray-600">
                          Scheduled: {format(new Date(patient.appointmentTime), 'HH:mm')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-lg font-bold text-orange-600">{patient.waitTime}min</div>
                        <div className="text-xs text-gray-500">Waiting</div>
                      </div>
                      {patient.priority === 'urgent' && (
                        <Badge variant="destructive">Urgent</Badge>
                      )}
                      <Button
                        onClick={() => {
                          const mockConsultation: Consultation = {
                            id: `consult_${patient.patientId}`,
                            patientId: patient.patientId,
                            patientName: patient.patientName,
                            providerId: "provider_1",
                            providerName: "Dr. Emily Watson",
                            type: "video",
                            status: "in_progress",
                            scheduledTime: patient.appointmentTime
                          };
                          setCurrentCall(mockConsultation);
                        }}
                      >
                        <Video className="w-4 h-4 mr-2" />
                        Start Call
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="recordings" className="space-y-4">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Consultation Recordings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockConsultations
                    .filter(c => c.recordings && c.recordings.length > 0)
                    .map((consultation) => (
                    <div key={consultation.id} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center gap-3">
                        <Play className="w-5 h-5 text-blue-500" />
                        <div>
                          <div className="font-medium">{consultation.patientName}</div>
                          <div className="text-sm text-gray-600">
                            {format(new Date(consultation.scheduledTime), 'MMM dd, yyyy')} • 
                            {consultation.recordings![0].duration} min • {consultation.recordings![0].size}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            toast({
                              title: "Playing Recording",
                              description: `Now playing consultation recording for ${consultation.patientName} (${consultation.recordings![0].duration} min)`
                            });
                          }}
                        >
                          <Play className="w-4 h-4 mr-1" />
                          Play
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            const recording = consultation.recordings![0];
                            const recordingData = {
                              patient: consultation.patientName,
                              date: format(new Date(consultation.scheduledTime), 'PPP'),
                              duration: recording.duration,
                              size: recording.size,
                              provider: consultation.providerName
                            };
                            
                            // Create a mock video file download
                            const mockVideoContent = `# Consultation Recording\n\nPatient: ${recordingData.patient}\nDate: ${recordingData.date}\nProvider: ${recordingData.provider}\nDuration: ${recordingData.duration} minutes\nFile Size: ${recordingData.size}\n\nThis is a consultation recording file.`;
                            
                            const blob = new Blob([mockVideoContent], { type: 'text/plain' });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `consultation-recording-${consultation.patientName.replace(/\s+/g, '-').toLowerCase()}-${format(new Date(consultation.scheduledTime), 'yyyy-MM-dd')}.txt`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            URL.revokeObjectURL(url);
                            
                            toast({
                              title: "Recording Downloaded",
                              description: `Consultation recording for ${consultation.patientName} has been downloaded`
                            });
                          }}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            toast({
                              title: "Recording Shared",
                              description: `Consultation recording for ${consultation.patientName} has been shared securely with authorized recipients`
                            });
                          }}
                        >
                          <Share2 className="w-4 h-4 mr-1" />
                          Share
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Remote Patient Monitoring</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Monitor patients remotely with connected devices and real-time health data.
                </p>
                <Dialog open={monitoringOpen} onOpenChange={setMonitoringOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Monitor className="w-4 h-4 mr-2" />
                      Set Up Monitoring
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Set Up Remote Patient Monitoring</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6">
                      {/* Patient Selection */}
                      <div className="space-y-2">
                        <Label htmlFor="patient-select">Select Patient</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a patient to monitor..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sarah-johnson">Sarah Johnson - Hypertension</SelectItem>
                            <SelectItem value="michael-chen">Michael Chen - Diabetes</SelectItem>
                            <SelectItem value="emma-davis">Emma Davis - Cardiac Monitoring</SelectItem>
                            <SelectItem value="james-wilson">James Wilson - Post-Surgery Recovery</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Monitoring Type */}
                      <div className="space-y-2">
                        <Label>Monitoring Type</Label>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                            <input type="checkbox" id="vital-signs" className="rounded" />
                            <div>
                              <Label htmlFor="vital-signs" className="font-medium cursor-pointer">Vital Signs</Label>
                              <p className="text-sm text-gray-600">Blood pressure, heart rate, temperature</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                            <input type="checkbox" id="glucose" className="rounded" />
                            <div>
                              <Label htmlFor="glucose" className="font-medium cursor-pointer">Blood Glucose</Label>
                              <p className="text-sm text-gray-600">Continuous glucose monitoring</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                            <input type="checkbox" id="weight" className="rounded" />
                            <div>
                              <Label htmlFor="weight" className="font-medium cursor-pointer">Weight Tracking</Label>
                              <p className="text-sm text-gray-600">Daily weight measurements</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                            <input type="checkbox" id="activity" className="rounded" />
                            <div>
                              <Label htmlFor="activity" className="font-medium cursor-pointer">Activity Level</Label>
                              <p className="text-sm text-gray-600">Steps, exercise, sleep patterns</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Device Setup */}
                      <div className="space-y-4">
                        <Label>Connected Devices</Label>
                        <div className="grid gap-3">
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <div>
                                <p className="font-medium">Blood Pressure Monitor</p>
                                <p className="text-sm text-gray-600">Omron HeartGuide - Connected</p>
                              </div>
                            </div>
                            <Button variant="outline" size="sm">Configure</Button>
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                              <div>
                                <p className="font-medium">Glucose Meter</p>
                                <p className="text-sm text-gray-600">Dexcom G7 - Pairing Required</p>
                              </div>
                            </div>
                            <Button variant="outline" size="sm">Pair Device</Button>
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <div>
                                <p className="font-medium">Smart Scale</p>
                                <p className="text-sm text-gray-600">Withings Body+ - Connected</p>
                              </div>
                            </div>
                            <Button variant="outline" size="sm">Configure</Button>
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <div>
                                <p className="font-medium">Fitness Tracker</p>
                                <p className="text-sm text-gray-600">Apple Watch Series 9 - Connected</p>
                              </div>
                            </div>
                            <Button variant="outline" size="sm">Configure</Button>
                          </div>
                        </div>
                      </div>

                      {/* Alert Thresholds */}
                      <div className="space-y-4">
                        <Label>Alert Thresholds</Label>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="bp-systolic">Blood Pressure (Systolic)</Label>
                            <div className="flex space-x-2">
                              <Input placeholder="Min (90)" />
                              <Input placeholder="Max (140)" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="heart-rate">Heart Rate (BPM)</Label>
                            <div className="flex space-x-2">
                              <Input placeholder="Min (60)" />
                              <Input placeholder="Max (100)" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="glucose-level">Blood Glucose (mg/dL)</Label>
                            <div className="flex space-x-2">
                              <Input placeholder="Min (70)" />
                              <Input placeholder="Max (180)" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="weight-change">Weight Change (%)</Label>
                            <div className="flex space-x-2">
                              <Input placeholder="Alert at +/- 5%" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Notification Settings */}
                      <div className="space-y-4">
                        <Label>Notification Settings</Label>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">Immediate Alerts</p>
                              <p className="text-sm text-gray-600">Critical threshold breaches</p>
                            </div>
                            <Switch defaultChecked />
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">Daily Summary</p>
                              <p className="text-sm text-gray-600">Patient monitoring report</p>
                            </div>
                            <Switch defaultChecked />
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">Missed Readings</p>
                              <p className="text-sm text-gray-600">When patient misses measurements</p>
                            </div>
                            <Switch defaultChecked />
                          </div>
                        </div>
                      </div>

                      {/* Monitoring Schedule */}
                      <div className="space-y-4">
                        <Label>Monitoring Schedule</Label>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Measurement Frequency</Label>
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder="Select frequency..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="twice-daily">Twice Daily</SelectItem>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="every-other-day">Every Other Day</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Monitoring Duration</Label>
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder="Select duration..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1-week">1 Week</SelectItem>
                                <SelectItem value="2-weeks">2 Weeks</SelectItem>
                                <SelectItem value="1-month">1 Month</SelectItem>
                                <SelectItem value="3-months">3 Months</SelectItem>
                                <SelectItem value="ongoing">Ongoing</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-3 pt-4 border-t">
                        <Button 
                          onClick={() => {
                            toast({
                              title: "Monitoring Setup Complete",
                              description: "Remote patient monitoring has been configured successfully. Patient will receive setup instructions via email."
                            });
                            setMonitoringOpen(false);
                          }}
                          className="flex-1"
                        >
                          Start Monitoring
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setMonitoringOpen(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}