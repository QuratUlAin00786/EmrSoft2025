import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { getActiveSubdomain } from "@/lib/subdomain-utils";
import { useAuth } from "@/hooks/use-auth";
import { AveroxAudioCallManager } from "@/lib/averox-audio-call";
import { createRemoteLiveKitRoom } from "@/lib/livekit-room-service";
import { buildSocketUserIdentifier } from "@/lib/socket-manager";
import { LiveKitVideoCall } from "@/components/telemedicine/livekit-video-call";
import { LiveKitAudioCall } from "@/components/telemedicine/livekit-audio-call";
import { IncomingCallModal, type IncomingCallData } from "@/components/telemedicine/incoming-call-modal";
import { useIncomingCall } from "@/hooks/use-incoming-call";
import { useSocket } from "@/hooks/use-socket";
import { isUserOnline } from "@/lib/socket-user-utils";
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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  MonitorSpeaker,
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Trash2,
  ChevronsUpDown,
  Check
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

// Patient List Component for selecting patients for telemedicine consultations
function PatientList() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [audioCallManager, setAudioCallManager] = useState<AveroxAudioCallManager | null>(null);
  const [isAudioCallActive, setIsAudioCallActive] = useState(false);
  const [audioCallPatient, setAudioCallPatient] = useState<any>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // LiveKit call state
const [liveKitVideoCall, setLiveKitVideoCall] = useState<{ roomName: string; patient: any; token?: string; serverUrl?: string; e2eeKey?: string } | null>(null);
const [liveKitAudioCall, setLiveKitAudioCall] = useState<{ roomName: string; patient: any; token?: string; serverUrl?: string; e2eeKey?: string } | null>(null);

  // Incoming call handling
  const { incomingCall, acceptCall, declineCall, clearIncomingCall } = useIncomingCall();

  // Socket.IO online users
  const { onlineUsers } = useSocket();

  // Fetch users for telemedicine - filtered based on role
  // Admin users see all users, non-admin users see only non-patient users
  const { data: patients, isLoading: patientsLoading } = useQuery({
    queryKey: ["/api/telemedicine/users"],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/telemedicine/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': getActiveSubdomain()
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch telemedicine users');
      }
      return response.json();
    },
    enabled: true
  });

  // BigBlueButton video call function
  const startBigBlueButtonCall = async (patient: any) => {
    try {
      const response = await fetch("/api/video-conference/create", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('auth_token')}`,
          "X-Tenant-Subdomain": getActiveSubdomain()
        },
        body: JSON.stringify({
          meetingName: `Consultation with ${patient.firstName} ${patient.lastName}`,
          participantName: `${patient.firstName} ${patient.lastName}`,
          duration: 30,
          maxParticipants: 10
        }),
        credentials: "include"
      });
      
      if (!response.ok) {
        console.error("BigBlueButton API failed, using fallback");
        // Fallback: Show message about video consultation
        toast({
          title: "Video Call Initiated",
          description: `Starting video consultation with ${patient.firstName} ${patient.lastName}. Please use your preferred video platform or call ${patient.phone || 'phone number not available'}`,
          variant: "default",
        });
        return;
      }
      
      const meetingData = await response.json();
      
      // Open BigBlueButton meeting in new window - use moderator URL for doctor
      const meetingWindow = window.open(
        meetingData.moderatorJoinUrl,
        '_blank',
        'width=1200,height=800,scrollbars=yes,resizable=yes'
      );
      
      if (!meetingWindow || meetingWindow.closed || typeof meetingWindow.closed == 'undefined') {
        // Popup was blocked - provide fallback
        toast({
          title: "Popup Blocked",
          description: "Your browser blocked the meeting popup. Please allow popups and try again, or copy the meeting URL from the browser console.",
          variant: "default",
        });
        
        // Log the meeting URL for users to manually open
        console.log("BigBlueButton Meeting URL:", meetingData.moderatorJoinUrl);
        
        // Also try to open in the same tab as fallback
        window.location.href = meetingData.moderatorJoinUrl;
        return; // Don't throw error, just redirect
      }
      
      toast({
        title: "Video Call Started",
        description: `Opening BigBlueButton meeting with ${patient.firstName} ${patient.lastName}`
      });
      
      // Create consultation record
      await fetch("/api/telemedicine/consultations", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('auth_token')}`,
          "X-Tenant-Subdomain": getActiveSubdomain()
        },
        body: JSON.stringify({
          patientId: patient.id,
          type: "video",
          scheduledTime: new Date().toISOString(),
          duration: 30,
          meetingId: meetingData.meetingID
        }),
        credentials: "include"
      });
      
    } catch (error) {
      // Fallback: Show message about video consultation
      toast({
        title: "Video Call Initiated",
        description: `Starting video consultation with ${patient.firstName} ${patient.lastName}. Please use your preferred video platform or call ${patient.phone || 'phone number not available'}`,
        variant: "default",
      });
    }
  };

  // Averox audio call function
  const startAveroxAudioCall = async (patient: any) => {
    try {
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to start an audio call",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Connecting...",
        description: `Initializing audio call with ${patient.firstName} ${patient.lastName}`,
      });

      // Create Averox call manager instance
      const callManager = new AveroxAudioCallManager({
        onConnected: () => {
          console.log('✅ Audio call connected');
          setIsAudioCallActive(true);
          setAudioCallPatient(patient);
          
          // Start call duration timer
          setCallDuration(0);
          callTimerRef.current = setInterval(() => {
            setCallDuration(prev => prev + 1);
          }, 1000);

          toast({
            title: "Call Connected",
            description: `Audio call with ${patient.firstName} ${patient.lastName} is now active`,
          });
        },
        onDisconnected: () => {
          console.log('📵 Audio call disconnected');
          handleEndAudioCall();
        },
        onError: (error) => {
          console.error('❌ Audio call error:', error);
          toast({
            title: "Call Error",
            description: error,
            variant: "destructive",
          });
          handleEndAudioCall();
        },
        onCallEnded: () => {
          console.log('📵 Call ended by remote user');
          handleEndAudioCall();
        }
      });

      // Connect to Averox signaling server
      await callManager.connect({
        userId: user.id.toString(),
        userName: `${user.firstName} ${user.lastName}`,
        targetUserId: patient.id.toString(),
        targetUserName: `${patient.firstName} ${patient.lastName}`
      });

      // Create room
      await callManager.createRoom();

      // Start the audio call
      await callManager.startCall();

      // Store call manager in state
      setAudioCallManager(callManager);

      // Create consultation record
      await fetch("/api/telemedicine/consultations", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('auth_token')}`,
          "X-Tenant-Subdomain": getActiveSubdomain()
        },
        body: JSON.stringify({
          patientId: patient.id,
          type: "audio",
          scheduledTime: new Date().toISOString(),
          duration: 30,
          meetingId: `averox-${Date.now()}`
        }),
        credentials: "include"
      });

    } catch (error: any) {
      console.error('💥 Averox audio call failed:', error);
      toast({
        title: "Call Failed",
        description: error.message || "Unable to start audio call. Please check microphone permissions and try again.",
        variant: "destructive",
      });
    }
  };

  // Handle ending audio call
  const handleEndAudioCall = () => {
    if (audioCallManager) {
      audioCallManager.endCall();
      setAudioCallManager(null);
    }
    
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    
    setIsAudioCallActive(false);
    setAudioCallPatient(null);
    setIsAudioMuted(false);
    setCallDuration(0);
    
    toast({
      title: "Call Ended",
      description: "Audio call has been terminated",
    });
  };

  // Toggle mute
  const toggleAudioMute = () => {
    if (audioCallManager) {
      const muted = audioCallManager.toggleMute();
      setIsAudioMuted(muted);
      toast({
        title: muted ? "Microphone Muted" : "Microphone Unmuted",
        description: muted ? "Your microphone is now muted" : "Your microphone is now active",
      });
    }
  };

  // LiveKit Video Call
  const buildParticipantIdentifier = (entity: any, defaultRole = "participant") => {
    return buildSocketUserIdentifier({
      id: entity?.id,
      firstName: entity?.firstName,
      lastName: entity?.lastName,
      email: entity?.email,
      role: entity?.role || defaultRole,
    });
  };

  const getDisplayName = (entity: any) => {
    const name = [entity?.firstName, entity?.lastName].filter(Boolean).join(" ").trim();
    return name || entity?.email || `user-${entity?.id}`;
  };

  const startLiveKitVideoCall = async (patient: any) => {
    try {
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to start a video call",
          variant: "destructive",
        });
        return;
      }

      const fromIdentifier = buildParticipantIdentifier(user, user.role);
      const toIdentifier = buildParticipantIdentifier(patient, patient.role);

      if (!fromIdentifier || !toIdentifier) {
        toast({
          title: "Call Failed",
          description: "Unable to determine participant identifiers",
          variant: "destructive",
        });
        return;
      }

      const roomName = `telemedicine-video-${user.id}-${patient.id}-${Date.now()}`;

      toast({
        title: "Video Call Starting",
        description: `Connecting to video call with ${patient.firstName} ${patient.lastName}`,
      });

      const liveKitRoom = await createRemoteLiveKitRoom({
        roomId: roomName,
        fromUsername: fromIdentifier,
        toUsers: [
          {
            identifier: toIdentifier,
            displayName: getDisplayName(patient),
          },
        ],
        isVideo: true,
        groupName: "Telemedicine Video Consultation",
      });

      const finalRoomId = liveKitRoom.roomId || roomName;

      setLiveKitVideoCall({
        roomName: finalRoomId,
        patient,
        token: liveKitRoom.token,
        serverUrl: liveKitRoom.serverUrl,
        e2eeKey: liveKitRoom.e2eeKey,
      });

      // Create consultation record
      await fetch("/api/telemedicine/consultations", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('auth_token')}`,
          "X-Tenant-Subdomain": getActiveSubdomain()
        },
        body: JSON.stringify({
          patientId: patient.id,
          type: "video",
          scheduledTime: new Date().toISOString(),
          duration: 30,
          meetingId: finalRoomId
        }),
        credentials: "include"
      });
    } catch (error: any) {
      console.error('LiveKit video call failed:', error);
      toast({
        title: "Call Failed",
        description: error.message || "Unable to start video call",
        variant: "destructive",
      });
    }
  };

  // LiveKit Audio Call
  const startLiveKitAudioCall = async (patient: any) => {
    try {
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to start an audio call",
          variant: "destructive",
        });
        return;
      }

      const fromIdentifier = buildParticipantIdentifier(user, user.role);
      const toIdentifier = buildParticipantIdentifier(patient, patient.role);

      if (!fromIdentifier || !toIdentifier) {
        toast({
          title: "Call Failed",
          description: "Unable to determine participant identifiers",
          variant: "destructive",
        });
        return;
      }

      const roomName = `telemedicine-audio-${user.id}-${patient.id}-${Date.now()}`;

      toast({
        title: "Audio Call Starting",
        description: `Connecting to audio call with ${patient.firstName} ${patient.lastName}`,
      });

      const liveKitRoom = await createRemoteLiveKitRoom({
        roomId: roomName,
        fromUsername: fromIdentifier,
        toUsers: [
          {
            identifier: toIdentifier,
            displayName: getDisplayName(patient),
          },
        ],
        isVideo: false,
        groupName: "Telemedicine Audio Consultation",
      });

      const finalRoomId = liveKitRoom.roomId || roomName;

      setLiveKitAudioCall({
        roomName: finalRoomId,
        patient,
        token: liveKitRoom.token,
        serverUrl: liveKitRoom.serverUrl,
        e2eeKey: liveKitRoom.e2eeKey,
      });

      // Create consultation record
      await fetch("/api/telemedicine/consultations", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('auth_token')}`,
          "X-Tenant-Subdomain": getActiveSubdomain()
        },
        body: JSON.stringify({
          patientId: patient.id,
          type: "audio",
          scheduledTime: new Date().toISOString(),
          duration: 30,
          meetingId: finalRoomId
        }),
        credentials: "include"
      });
    } catch (error: any) {
      console.error('LiveKit audio call failed:', error);
      toast({
        title: "Call Failed",
        description: error.message || "Unable to start audio call",
        variant: "destructive",
      });
    }
  };

  const handleLiveKitVideoCallEnd = () => {
    setLiveKitVideoCall(null);
    toast({
      title: "Call Ended",
      description: "Video call has been terminated",
    });
  };

  const handleLiveKitAudioCallEnd = () => {
    setLiveKitAudioCall(null);
    toast({
      title: "Call Ended",
      description: "Audio call has been terminated",
    });
  };

  // Handle incoming call accept
  const handleAcceptIncomingCall = (callData: IncomingCallData) => {
    console.log('✅ Accepting incoming call:', callData);
    
    // Create a patient-like object from call data for compatibility
    const patientData = {
      id: callData.fromUserId,
      firstName: callData.fromUsername.split('_')[1] || callData.fromUsername,
      lastName: '',
      email: '',
    };

    if (callData.isVideo) {
      setLiveKitVideoCall({
        roomName: callData.roomId,
        patient: patientData,
        token: callData.token,
        serverUrl: callData.serverUrl,
        e2eeKey: callData.e2eeKey,
      });
    } else {
      setLiveKitAudioCall({
        roomName: callData.roomId,
        patient: patientData,
        token: callData.token,
        serverUrl: callData.serverUrl,
        e2eeKey: callData.e2eeKey,
      });
    }

    acceptCall(callData);
  };

  // Handle incoming call decline
  const handleDeclineIncomingCall = () => {
    console.log('❌ Declining incoming call');
    declineCall();
  };

  // Handle incoming call timeout
  const handleIncomingCallTimeout = () => {
    console.log('⏰ Incoming call timed out');
    clearIncomingCall();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioCallManager) {
        audioCallManager.endCall();
      }
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [audioCallManager]);

  // Format call duration
  const formatCallDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // BigBlueButton audio call function
  const startBigBlueButtonAudioCall = async (patient: any) => {
    try {
      const response = await fetch("/api/video-conference/create", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('auth_token')}`,
          "X-Tenant-Subdomain": getActiveSubdomain()
        },
        body: JSON.stringify({
          meetingName: `Audio Consultation with ${patient.firstName} ${patient.lastName}`,
          participantName: `${patient.firstName} ${patient.lastName}`,
          duration: 30,
          maxParticipants: 10,
          disableVideo: true, // Audio-only mode
          webcamsOnlyForModerator: false
        }),
        credentials: "include"
      });
      
      if (!response.ok) {
        console.error("BigBlueButton API failed, using fallback");
        // Fallback: Show phone number for direct call
        toast({
          title: "Audio Call Initiated",
          description: `Please call ${patient.firstName} ${patient.lastName} at ${patient.phone || 'phone number not available'}`,
          variant: "default",
        });
        return;
      }
      
      const meetingData = await response.json();
      
      // Open BigBlueButton audio meeting in new window - use moderator URL for doctor
      const meetingWindow = window.open(
        meetingData.moderatorJoinUrl,
        '_blank',
        'width=800,height=600,scrollbars=yes,resizable=yes'
      );
      
      if (!meetingWindow || meetingWindow.closed || typeof meetingWindow.closed == 'undefined') {
        // Popup was blocked - provide fallback
        toast({
          title: "Popup Blocked",
          description: "Your browser blocked the meeting popup. Please allow popups and try again, or copy the meeting URL from the browser console.",
          variant: "default",
        });
        
        // Log the meeting URL for users to manually open
        console.log("BigBlueButton Audio Meeting URL:", meetingData.moderatorJoinUrl);
        
        // Also try to open in the same tab as fallback
        window.location.href = meetingData.moderatorJoinUrl;
        return; // Don't throw error, just redirect
      }
      
      toast({
        title: "Audio Call Started",
        description: `Opening audio consultation with ${patient.firstName} ${patient.lastName}`
      });
      
      // Create consultation record
      await fetch("/api/telemedicine/consultations", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('auth_token')}`,
          "X-Tenant-Subdomain": getActiveSubdomain()
        },
        body: JSON.stringify({
          patientId: patient.id,
          type: "audio",
          scheduledTime: new Date().toISOString(),
          duration: 30,
          meetingId: meetingData.meetingID
        }),
        credentials: "include"
      });
      
    } catch (error) {
      // Fallback: Show phone number for direct call
      toast({
        title: "Audio Call Initiated",
        description: `Please call ${patient.firstName} ${patient.lastName} at ${patient.phone || 'phone number not available'}`,
        variant: "default",
      });
    }
  };

  if (patientsLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 border rounded-lg animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!patients || !Array.isArray(patients) || patients.length === 0) {
    return (
      <div className="text-center py-8">
        <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-300">
          {user?.role === 'admin' 
            ? 'No users available for consultation' 
            : 'No staff members available for consultation'}
        </p>
      </div>
    );
  }

  return (
    <>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {patients.map((patient: any) => (
        <Card key={patient.id} className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="relative">
                <Avatar className="w-12 h-12">
                  <AvatarFallback>
                    {patient.firstName?.[0] || patient.email?.[0]}{patient.lastName?.[0] || patient.email?.[1]}
                  </AvatarFallback>
                </Avatar>
                {/* Online Status Indicator */}
                {isUserOnline(patient.id, onlineUsers) && (
                  <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-lg text-gray-900 dark:text-gray-100">
                  {patient.firstName && patient.lastName 
                    ? `${patient.firstName} ${patient.lastName}` 
                    : patient.email}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                  <span>{patient.role ? patient.role.charAt(0).toUpperCase() + patient.role.slice(1) : 'User'} • ID: {patient.id}</span>
                  {isUserOnline(patient.id, onlineUsers) && (
                    <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      Online
                    </span>
                  )}
                </p>
              </div>
            </div>
            
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300 mb-4">
              <div className="flex justify-between">
                <span>Email:</span>
                <span className="truncate">{patient.email || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span>Phone:</span>
                <span>{patient.phone || 'N/A'}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Button
                  onClick={() => startLiveKitVideoCall(patient)}
                  className="flex-1"
                  size="sm"
                  variant="default"
                  data-testid={`button-livekit-video-call-${patient.id}`}
                >
                  <Video className="w-4 h-4 mr-2" />
                  LiveKit Video
                </Button>
                {/* <Button
                  onClick={() => startBigBlueButtonCall(patient)}
                  variant="outline"
                  size="sm"
                  data-testid={`button-video-call-${patient.id}`}
                >
                  <Video className="w-4 h-4 mr-2" />
                  BBB Video
                </Button> */}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => startLiveKitAudioCall(patient)}
                  data-testid={`button-livekit-audio-call-${patient.id}`}
                  disabled={isAudioCallActive || liveKitAudioCall !== null}
                >
                  <Phone className="w-4 h-4 mr-2" />
                  LiveKit Audio
                </Button>
                {/* <Button
                  variant="outline"
                  size="sm"
                  onClick={() => startAveroxAudioCall(patient)}
                  data-testid={`button-audio-call-${patient.id}`}
                  disabled={isAudioCallActive || liveKitAudioCall !== null}
                >
                  <Phone className="w-4 h-4" />
                </Button> */}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>

    {/* Active Audio Call UI Controls */}
    {isAudioCallActive && audioCallPatient && (
      <Card className="fixed bottom-4 right-4 w-96 shadow-2xl border-2 border-primary z-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                <div className="w-3 h-3 bg-green-500 rounded-full animate-ping absolute top-0 left-0" />
              </div>
              <div>
                <p className="font-semibold text-lg">Audio Call Active</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {audioCallPatient.firstName} {audioCallPatient.lastName}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-mono font-bold text-primary">
                {formatCallDuration(callDuration)}
              </p>
              <p className="text-xs text-gray-500">Duration</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant={isAudioMuted ? "destructive" : "outline"}
              size="lg"
              onClick={toggleAudioMute}
              className="flex-1"
              data-testid="button-toggle-mute"
            >
              {isAudioMuted ? (
                <>
                  <MicOff className="w-5 h-5 mr-2" />
                  Unmute
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5 mr-2" />
                  Mute
                </>
              )}
            </Button>

            <Button
              variant="destructive"
              size="lg"
              onClick={handleEndAudioCall}
              className="flex-1"
              data-testid="button-end-call"
            >
              <PhoneOff className="w-5 h-5 mr-2" />
              End Call
            </Button>
          </div>

          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
              <Activity className="w-4 h-4" />
              <span>WebRTC Audio Call via Averox</span>
            </div>
          </div>
        </CardContent>
      </Card>
    )}

    {/* LiveKit Video Call Modal */}
    {liveKitVideoCall && (
      <Dialog open={!!liveKitVideoCall} onOpenChange={() => setLiveKitVideoCall(null)}>
        <DialogContent className="max-w-6xl w-full h-[90vh] p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>
              Video Call - {liveKitVideoCall.patient.firstName} {liveKitVideoCall.patient.lastName}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 p-4">
            <LiveKitVideoCall
              roomName={liveKitVideoCall.roomName}
              participantName={user ? `${user.firstName} ${user.lastName}` : 'Provider'}
              token={liveKitVideoCall.token}
              serverUrl={liveKitVideoCall.serverUrl}
              onDisconnect={handleLiveKitVideoCallEnd}
            />
          </div>
        </DialogContent>
      </Dialog>
    )}

    {/* LiveKit Audio Call Modal */}
    {liveKitAudioCall && (
      <Dialog open={!!liveKitAudioCall} onOpenChange={() => setLiveKitAudioCall(null)}>
        <DialogContent className="max-w-2xl w-full">
          <DialogHeader>
            <DialogTitle>
              Audio Call - {liveKitAudioCall.patient.firstName} {liveKitAudioCall.patient.lastName}
            </DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <LiveKitAudioCall
              roomName={liveKitAudioCall.roomName}
              participantName={user ? `${user.firstName} ${user.lastName}` : 'Provider'}
              token={liveKitAudioCall.token}
              serverUrl={liveKitAudioCall.serverUrl}
              onDisconnect={handleLiveKitAudioCallEnd}
            />
          </div>
        </DialogContent>
      </Dialog>
    )}

    {/* Incoming Call Modal */}
    <IncomingCallModal
      callData={incomingCall}
      onAccept={handleAcceptIncomingCall}
      onDecline={handleDeclineIncomingCall}
      onTimeout={handleIncomingCallTimeout}
    />
    </>
  );
}

export default function Telemedicine() {
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("consultations");
  const [currentCall, setCurrentCall] = useState<Consultation | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [callNotes, setCallNotes] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [monitoringOpen, setMonitoringOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [patientSearchOpen, setPatientSearchOpen] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
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

  // Fetch users for scheduling - filtered based on role
  const { data: patients, isLoading: patientsLoading } = useQuery({
    queryKey: ["/api/telemedicine/users"],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/telemedicine/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': getActiveSubdomain()
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch telemedicine users');
      }
      return response.json();
    },
    enabled: true
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
      setSuccessMessage("Consultation started");
      setShowSuccessModal(true);
    },
    onError: () => {
      toast({ title: "Failed to start consultation", variant: "destructive" });
    }
  });

  // Delete patient mutation
  const deletePatientMutation = useMutation({
    mutationFn: async (patientId: number) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/patients/${patientId}`, {
        method: "DELETE",
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': getActiveSubdomain()
        }
      });
      if (!response.ok) throw new Error("Failed to delete patient");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Patient Deleted",
        description: "Patient has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      setSelectedPatient(null);
    },
    onError: () => {
      toast({
        title: "Delete Failed",
        description: "Failed to delete patient. Please try again.",
        variant: "destructive",
      });
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
      setSuccessMessage("Consultation ended and notes saved");
      setShowSuccessModal(true);
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
    setSuccessMessage(isRecording ? "Consultation recording has been saved" : "Consultation is now being recorded");
    setShowSuccessModal(true);
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
                <AvatarFallback>{currentCall.patientName?.split(' ').map(n => n[0]).join('') || 'P'}</AvatarFallback>
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
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/")}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Telemedicine</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">Virtual consultations and remote patient care</p>
          </div>
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
                  <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Patient</label>
                  <Popover open={patientSearchOpen} onOpenChange={setPatientSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={patientSearchOpen}
                        className="w-full justify-between"
                      >
                        {selectedPatient
                          ? `${selectedPatient.firstName} ${selectedPatient.lastName}`
                          : "Select a patient..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Search patients..." />
                        <CommandEmpty>No patients found.</CommandEmpty>
                        <CommandGroup>
                          <CommandList className="max-h-[200px]">
                            {patientsLoading ? (
                              <CommandItem disabled>Loading patients...</CommandItem>
                            ) : (
                              patients?.map((patient: any) => (
                                <CommandItem
                                  key={patient.id}
                                  value={`${patient.firstName} ${patient.lastName}`}
                                  onSelect={() => {
                                    setSelectedPatient(patient);
                                    setPatientSearchOpen(false);
                                  }}
                                  className="flex items-center"
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${
                                      selectedPatient?.id === patient.id ? "opacity-100" : "opacity-0"
                                    }`}
                                  />
                                  <div>
                                    <div>{patient.firstName} {patient.lastName}</div>
                                    <div className="text-xs text-gray-500">ID: {patient.patientId || patient.id}</div>
                                  </div>
                                </CommandItem>
                              ))
                            )}
                          </CommandList>
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Provider Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Provider</label>
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
                    <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Date</label>
                    <Input type="date" min={new Date().toISOString().split('T')[0]} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Time</label>
                    <Input type="time" />
                  </div>
                </div>

                {/* Consultation Type */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Consultation Type</label>
                  <select className="w-full p-2 border rounded-md">
                    <option value="video">Video Consultation</option>
                    <option value="audio">Audio Only</option>
                    <option value="screen_share">Screen Share</option>
                  </select>
                </div>

                {/* Duration */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Duration</label>
                  <select className="w-full p-2 border rounded-md">
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">1 hour</option>
                  </select>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Notes (Optional)</label>
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
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Video & Audio Settings</h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Default Video Quality</label>
                      <select className="w-32 p-2 border rounded-md text-sm">
                        <option value="720p">720p HD</option>
                        <option value="1080p">1080p Full HD</option>
                        <option value="480p">480p Standard</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Auto-start Video</label>
                      <input type="checkbox" className="w-4 h-4" defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Auto-start Audio</label>
                      <input type="checkbox" className="w-4 h-4" defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Echo Cancellation</label>
                      <input type="checkbox" className="w-4 h-4" defaultChecked />
                    </div>
                  </div>
                </div>

                {/* Recording Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recording Settings</h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Auto-record Consultations</label>
                      <input type="checkbox" className="w-4 h-4" />
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Recording Quality</label>
                      <select className="w-32 p-2 border rounded-md text-sm">
                        <option value="high">High Quality</option>
                        <option value="medium">Medium Quality</option>
                        <option value="low">Low Quality</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Patient Consent Required</label>
                      <input type="checkbox" className="w-4 h-4" defaultChecked />
                    </div>
                  </div>
                </div>

                {/* Notification Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Notifications</h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Appointment Reminders</label>
                      <input type="checkbox" className="w-4 h-4" defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Patient Waiting Alerts</label>
                      <input type="checkbox" className="w-4 h-4" defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Connection Issues Alerts</label>
                      <input type="checkbox" className="w-4 h-4" defaultChecked />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button 
                    onClick={() => {
                      setSuccessMessage("Telemedicine settings have been updated successfully.");
                      setShowSuccessModal(true);
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
          {/* Patient Selection for New Consultation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Select Patient for Consultation
              </CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-300">Choose a patient to start a new telemedicine consultation</p>
            </CardHeader>
            <CardContent>
              <PatientList />
            </CardContent>
          </Card>

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
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
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
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{consultation.vitalSigns.heartRate} BPM</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Heart Rate</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-blue-500" />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{consultation.vitalSigns.bloodPressure}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Blood Pressure</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Stethoscope className="w-4 h-4 text-green-500" />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{consultation.vitalSigns.temperature}°F</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Temperature</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Monitor className="w-4 h-4 text-purple-500" />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{consultation.vitalSigns.oxygenSaturation}%</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">O2 Sat</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {consultation.notes && (
                    <div>
                      <h4 className="font-medium text-sm mb-1 text-gray-900 dark:text-gray-100">Consultation Notes</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{consultation.notes}</p>
                    </div>
                  )}

                  {consultation.prescriptions && (
                    <div>
                      <h4 className="font-medium text-sm mb-2 text-gray-900 dark:text-gray-100">Prescriptions</h4>
                      <div className="space-y-2">
                        {consultation.prescriptions.map((rx, idx) => (
                          <div key={idx} className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded border dark:border-slate-600">
                            <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{rx.medication} {rx.dosage}</div>
                            <div className="text-xs text-gray-600 dark:text-gray-300">{rx.instructions}</div>
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
                          <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="font-medium text-gray-900 dark:text-gray-100">Patient:</span>
                                <p className="text-gray-600 dark:text-gray-300">{consultation.patientName}</p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-900 dark:text-gray-100">Date:</span>
                                <p className="text-gray-600 dark:text-gray-300">{format(new Date(consultation.scheduledTime), 'PPP')}</p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-900 dark:text-gray-100">Provider:</span>
                                <p className="text-gray-600 dark:text-gray-300">{consultation.providerName}</p>
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
                                
                                setSuccessMessage("Consultation notes have been downloaded as CSV file.");
                                setShowSuccessModal(true);
                              }}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download Notes
                            </Button>
                            <Button 
                              variant="outline"
                              onClick={() => {
                                const printContent = `
                                  <div style="max-width: 800px; margin: 0 auto; padding: 20px;">
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
                            <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
                              <DialogTrigger asChild>
                                <Button variant="outline">
                                  <Share2 className="w-4 h-4 mr-2" />
                                  Share with Patient
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                  <DialogTitle>Share Consultation Notes</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <p className="text-sm text-gray-600">
                                    Choose how you'd like to share the consultation notes with the patient:
                                  </p>
                                  
                                  <div className="grid gap-3">
                                    <Button
                                      variant="outline"
                                      className="justify-start h-12"
                                      onClick={() => {
                                        toast({
                                          title: "Email sent",
                                          description: "Consultation notes have been sent to the patient's email address.",
                                        });
                                        setShareDialogOpen(false);
                                      }}
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                          <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                                          </svg>
                                        </div>
                                        <div className="text-left">
                                          <p className="font-medium">Email</p>
                                          <p className="text-sm text-gray-500">Send via email</p>
                                        </div>
                                      </div>
                                    </Button>

                                    <Button
                                      variant="outline"
                                      className="justify-start h-12"
                                      onClick={() => {
                                        toast({
                                          title: "WhatsApp message sent",
                                          description: "Consultation notes have been shared via WhatsApp.",
                                        });
                                        setShareDialogOpen(false);
                                      }}
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                          <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.893 3.688"/>
                                          </svg>
                                        </div>
                                        <div className="text-left">
                                          <p className="font-medium">WhatsApp</p>
                                          <p className="text-sm text-gray-500">Send via WhatsApp</p>
                                        </div>
                                      </div>
                                    </Button>

                                    <Button
                                      variant="outline"
                                      className="justify-start h-12"
                                      onClick={() => {
                                        toast({
                                          title: "SMS sent",
                                          description: "Consultation notes have been sent via text message.",
                                        });
                                        setShareDialogOpen(false);
                                      }}
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                          <svg className="w-4 h-4 text-purple-600" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 9h-2v-2h2v2zm0-4h-2V5h2v2z"/>
                                          </svg>
                                        </div>
                                        <div className="text-left">
                                          <p className="font-medium">Text Message</p>
                                          <p className="text-sm text-gray-500">Send via SMS</p>
                                        </div>
                                      </div>
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
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
              <Card key={patient.patientId} className={patient.priority === 'urgent' ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20' : ''}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {patient.patientName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">{patient.patientName}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          Scheduled: {format(new Date(patient.appointmentTime), 'HH:mm')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-lg font-bold text-orange-600">{patient.waitTime}min</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Waiting</div>
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
                <CardTitle className="text-gray-900 dark:text-gray-100">Remote Patient Monitoring</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
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
                          <div className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700">
                            <input type="checkbox" id="vital-signs" className="rounded" />
                            <div>
                              <Label htmlFor="vital-signs" className="font-medium cursor-pointer text-gray-900 dark:text-gray-100">Vital Signs</Label>
                              <p className="text-sm text-gray-600 dark:text-gray-300">Blood pressure, heart rate, temperature</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700">
                            <input type="checkbox" id="glucose" className="rounded" />
                            <div>
                              <Label htmlFor="glucose" className="font-medium cursor-pointer text-gray-900 dark:text-gray-100">Blood Glucose</Label>
                              <p className="text-sm text-gray-600 dark:text-gray-300">Continuous glucose monitoring</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700">
                            <input type="checkbox" id="weight" className="rounded" />
                            <div>
                              <Label htmlFor="weight" className="font-medium cursor-pointer text-gray-900 dark:text-gray-100">Weight Tracking</Label>
                              <p className="text-sm text-gray-600 dark:text-gray-300">Daily weight measurements</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700">
                            <input type="checkbox" id="activity" className="rounded" />
                            <div>
                              <Label htmlFor="activity" className="font-medium cursor-pointer text-gray-900 dark:text-gray-100">Activity Level</Label>
                              <p className="text-sm text-gray-600 dark:text-gray-300">Steps, exercise, sleep patterns</p>
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
                                <p className="font-medium text-gray-900 dark:text-gray-100">Blood Pressure Monitor</p>
                                <p className="text-sm text-gray-600 dark:text-gray-300">Omron HeartGuide - Connected</p>
                              </div>
                            </div>
                            <Button variant="outline" size="sm">Configure</Button>
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                              <div>
                                <p className="font-medium text-gray-900 dark:text-gray-100">Glucose Meter</p>
                                <p className="text-sm text-gray-600 dark:text-gray-300">Dexcom G7 - Pairing Required</p>
                              </div>
                            </div>
                            <Button variant="outline" size="sm">Pair Device</Button>
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <div>
                                <p className="font-medium text-gray-900 dark:text-gray-100">Smart Scale</p>
                                <p className="text-sm text-gray-600 dark:text-gray-300">Withings Body+ - Connected</p>
                              </div>
                            </div>
                            <Button variant="outline" size="sm">Configure</Button>
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <div>
                                <p className="font-medium text-gray-900 dark:text-gray-100">Fitness Tracker</p>
                                <p className="text-sm text-gray-600 dark:text-gray-300">Apple Watch Series 9 - Connected</p>
                              </div>
                            </div>
                            <Button variant="outline" size="sm">Configure</Button>
                          </div>
                          
                          {/* IoT Cardiac Monitoring Devices */}
                          <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
                            <div className="flex items-center space-x-2">
                              <Heart className="w-5 h-5 text-red-600" />
                              <h4 className="font-semibold text-red-900">Cardiac Monitoring Devices</h4>
                            </div>
                            
                            <div className="space-y-3">
                              <div className="flex items-center justify-between p-3 bg-white border rounded-lg">
                                <div className="flex items-center space-x-3">
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                  <div>
                                    <p className="font-medium">Holter Monitor</p>
                                    <p className="text-sm text-gray-600">CardioNet MCOT - 24/7 ECG Monitoring</p>
                                  </div>
                                </div>
                                <div className="flex space-x-2">
                                  <Badge variant="outline" className="text-green-600">Active</Badge>
                                  <Button variant="outline" size="sm">View Data</Button>
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between p-3 bg-white border rounded-lg">
                                <div className="flex items-center space-x-3">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                  <div>
                                    <p className="font-medium">Implantable Cardiac Monitor</p>
                                    <p className="text-sm text-gray-600">Medtronic LINQ II - Long-term Arrhythmia Detection</p>
                                  </div>
                                </div>
                                <div className="flex space-x-2">
                                  <Badge variant="outline" className="text-blue-600">Transmitting</Badge>
                                  <Button variant="outline" size="sm">Remote Access</Button>
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between p-3 bg-white border rounded-lg">
                                <div className="flex items-center space-x-3">
                                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                  <div>
                                    <p className="font-medium">Pacemaker</p>
                                    <p className="text-sm text-gray-600">Boston Scientific CRT-D - Remote Monitoring Enabled</p>
                                  </div>
                                </div>
                                <div className="flex space-x-2">
                                  <Badge variant="outline" className="text-orange-600">Monitoring</Badge>
                                  <Button variant="outline" size="sm">Device Status</Button>
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between p-3 bg-white border rounded-lg">
                                <div className="flex items-center space-x-3">
                                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                  <div>
                                    <p className="font-medium">Wearable ECG Patch</p>
                                    <p className="text-sm text-gray-600">Zio XT Patch - 14-day Continuous ECG</p>
                                  </div>
                                </div>
                                <div className="flex space-x-2">
                                  <Badge variant="outline" className="text-purple-600">Recording</Badge>
                                  <Button variant="outline" size="sm">Sync Data</Button>
                                </div>
                              </div>
                            </div>
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
                            setSuccessMessage("Remote patient monitoring has been configured successfully. Patient will receive setup instructions via email.");
                            setShowSuccessModal(true);
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

            {/* IoT Cardiac Device Monitoring Dashboard */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-gray-900 dark:text-gray-100">
                  <Heart className="w-5 h-5 text-red-600" />
                  <span>IoT Cardiac Device Monitoring</span>
                </CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-300">Real-time monitoring of connected cardiac devices</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Real-time ECG Monitoring */}
                  <Card className="border-red-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center space-x-2">
                        <Activity className="w-4 h-4 text-red-600" />
                        <span>Live ECG Monitor</span>
                        <Badge variant="outline" className="text-green-600 border-green-600">Live</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="bg-black p-4 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-green-400 text-sm font-mono">ECG - Lead II</span>
                            <span className="text-green-400 text-sm font-mono">Heart Rate: 72 BPM</span>
                          </div>
                          <div className="h-24 bg-black relative overflow-hidden">
                            <svg className="w-full h-full" viewBox="0 0 400 100">
                              <path
                                d="M0,50 L30,50 L32,30 L35,70 L38,10 L42,90 L45,50 L75,50 L77,30 L80,70 L83,10 L87,90 L90,50 L120,50 L122,30 L125,70 L128,10 L132,90 L135,50 L165,50 L167,30 L170,70 L173,10 L177,90 L180,50 L210,50 L212,30 L215,70 L218,10 L222,90 L225,50 L255,50 L257,30 L260,70 L263,10 L267,90 L270,50 L300,50 L302,30 L305,70 L308,10 L312,90 L315,50 L345,50 L347,30 L350,70 L353,10 L357,90 L360,50 L400,50"
                                stroke="#10b981"
                                strokeWidth="2"
                                fill="none"
                                className="animate-pulse"
                              />
                            </svg>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-gray-50 dark:bg-slate-700 p-3 rounded">
                            <div className="text-sm text-gray-600 dark:text-gray-300">Rhythm</div>
                            <div className="font-semibold text-gray-900 dark:text-gray-100">Normal Sinus</div>
                          </div>
                          <div className="bg-gray-50 dark:bg-slate-700 p-3 rounded">
                            <div className="text-sm text-gray-600 dark:text-gray-300">QT Interval</div>
                            <div className="font-semibold text-gray-900 dark:text-gray-100">420ms</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Device Status Overview */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-gray-900 dark:text-gray-100">Device Status Overview</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-gray-100">Holter Monitor</p>
                              <p className="text-sm text-gray-600 dark:text-gray-300">Last transmission: 2 min ago</p>
                            </div>
                          </div>
                          <Badge className="bg-green-100 text-green-800">Active</Badge>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-gray-100">Pacemaker</p>
                              <p className="text-sm text-gray-600 dark:text-gray-300">Battery: 89% | Last check: 1 hour ago</p>
                            </div>
                          </div>
                          <Badge className="bg-blue-100 text-blue-800">Normal</Badge>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-gray-100">ECG Patch</p>
                              <p className="text-sm text-gray-600 dark:text-gray-300">Recording day 3 of 14</p>
                            </div>
                          </div>
                          <Badge className="bg-purple-100 text-purple-800">Recording</Badge>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-gray-100">Cardiac Monitor</p>
                              <p className="text-sm text-gray-600 dark:text-gray-300">Sync pending</p>
                            </div>
                          </div>
                          <Badge className="bg-orange-100 text-orange-800">Syncing</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Vital Signs Monitoring */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-gray-900 dark:text-gray-100">Current Vital Signs</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                          <Heart className="w-8 h-8 text-red-600 mx-auto mb-2" />
                          <div className="text-2xl font-bold text-red-600">72</div>
                          <div className="text-sm text-gray-600 dark:text-gray-300">Heart Rate (BPM)</div>
                          <Badge className="mt-1 bg-green-100 text-green-800">Normal</Badge>
                        </div>
                        
                        <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <Activity className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                          <div className="text-2xl font-bold text-blue-600">118/76</div>
                          <div className="text-sm text-gray-600 dark:text-gray-300">Blood Pressure</div>
                          <Badge className="mt-1 bg-green-100 text-green-800">Normal</Badge>
                        </div>
                        
                        <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                          <Monitor className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                          <div className="text-2xl font-bold text-purple-600">98%</div>
                          <div className="text-sm text-gray-600 dark:text-gray-300">O2 Saturation</div>
                          <Badge className="mt-1 bg-green-100 text-green-800">Normal</Badge>
                        </div>
                        
                        <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <Stethoscope className="w-8 h-8 text-green-600 mx-auto mb-2" />
                          <div className="text-2xl font-bold text-green-600">16</div>
                          <div className="text-sm text-gray-600 dark:text-gray-300">Resp. Rate</div>
                          <Badge className="mt-1 bg-green-100 text-green-800">Normal</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Alerts and Notifications */}
                  <Card className="border-yellow-200 dark:border-yellow-800">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center space-x-2 text-gray-900 dark:text-gray-100">
                        <AlertTriangle className="w-4 h-4 text-yellow-600" />
                        <span>Active Alerts</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-start space-x-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                          <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                          <div className="flex-1">
                            <div className="font-medium text-yellow-900 dark:text-yellow-100">Irregular Heart Rhythm Detected</div>
                            <div className="text-sm text-yellow-700 dark:text-yellow-200">Possible atrial fibrillation episode at 2:34 PM</div>
                            <div className="text-xs text-yellow-600 dark:text-yellow-300 mt-1">5 minutes ago</div>
                          </div>
                          <Button size="sm" variant="outline">Review</Button>
                        </div>
                        
                        <div className="flex items-start space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
                          <div className="flex-1">
                            <div className="font-medium text-blue-900 dark:text-blue-100">Medication Reminder</div>
                            <div className="text-sm text-blue-700 dark:text-blue-200">Patient should take Metoprolol 25mg</div>
                            <div className="text-xs text-blue-600 dark:text-blue-300 mt-1">Due in 30 minutes</div>
                          </div>
                          <Button size="sm" variant="outline">Send</Button>
                        </div>
                        
                        <div className="flex items-start space-x-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                          <div className="flex-1">
                            <div className="font-medium text-green-900 dark:text-green-100">Device Sync Completed</div>
                            <div className="text-sm text-green-700 dark:text-green-200">All monitoring data successfully uploaded</div>
                            <div className="text-xs text-green-600 dark:text-green-300 mt-1">2 hours ago</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                </div>

                {/* Action Buttons */}
                <div className="flex space-x-4 mt-6">
                  <Button className="flex-1" onClick={() => {
                    setSuccessMessage("Cardiac monitoring report is being generated for the selected time period.");
                    setShowSuccessModal(true);
                  }}>
                    <FileText className="w-4 h-4 mr-2" />
                    Generate Report
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => {
                    setSuccessMessage("Cardiac monitoring alert thresholds have been configured.");
                    setShowSuccessModal(true);
                  }}>
                    <Settings className="w-4 h-4 mr-2" />
                    Configure Alerts
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => {
                    setSuccessMessage("Emergency contact has been notified of critical cardiac event.");
                    setShowSuccessModal(true);
                  }}>
                    <Phone className="w-4 h-4 mr-2" />
                    Emergency Contact
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-green-600">Success</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-gray-700">{successMessage}</p>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => {
                setShowSuccessModal(false);
                setSuccessMessage("");
              }}
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}