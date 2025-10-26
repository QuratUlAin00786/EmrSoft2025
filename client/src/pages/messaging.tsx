import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { 
  Send, 
  Plus, 
  Search, 
  Phone, 
  Video, 
  Paperclip, 
  MessageSquare,
  Users,
  Mail,
  Smartphone,
  Clock,
  CheckCheck,
  RefreshCw,
  Star,
  Archive,
  Trash2,
  Edit,
  Copy,
  ArrowLeft,
  MoreVertical,
  Forward,
  Tag
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { isDoctorLike, formatRoleLabel } from "@/lib/role-utils";
import { Header } from "@/components/layout/header";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  recipientId: string;
  recipientName: string;
  subject: string;
  content: string;
  timestamp: string;
  isRead: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  type: 'internal' | 'patient' | 'broadcast';
  attachments?: Array<{
    id: string;
    name: string;
    size: number;
    type: string;
    url: string;
  }>;
  isStarred: boolean;
  threadId?: string;
}

interface Conversation {
  id: string;
  participants: Array<{
    id: string | number;
    name: string;
    role: string;
    avatar?: string;
  }>;
  lastMessage: Message;
  unreadCount: number;
  isPatientConversation: boolean;
}

interface Campaign {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'both';
  status: 'draft' | 'scheduled' | 'sent' | 'paused';
  subject: string;
  content: string;
  recipientCount: number;
  sentCount: number;
  openRate: number;
  clickRate: number;
  scheduledAt?: string;
  createdAt: string;
  template: string;
}

export default function MessagingPage() {
  const [, setLocation] = useLocation();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessageContent, setNewMessageContent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [messageFilter, setMessageFilter] = useState("all");
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [activeVideoCall, setActiveVideoCall] = useState(false);
  const [callParticipant, setCallParticipant] = useState("");
  const [callDuration, setCallDuration] = useState(0);
  const [meetingInfo, setMeetingInfo] = useState<{meetingID: string, moderatorPassword: string} | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [callTimer, setCallTimer] = useState<NodeJS.Timeout | null>(null);
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    type: "email" as "email" | "sms" | "both",
    subject: "",
    content: "",
    template: "default"
  });
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    category: "general" as "general" | "medical" | "preventive" | "urgent" | "onboarding",
    subject: "",
    content: ""
  });
  const [showUseTemplate, setShowUseTemplate] = useState(false);
  const [showEditTemplate, setShowEditTemplate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [editingTemplate, setEditingTemplate] = useState({
    name: "",
    category: "general" as "general" | "medical" | "preventive" | "urgent" | "onboarding",
    subject: "",
    content: ""
  });
  const [newMessage, setNewMessage] = useState({
    recipient: "",
    subject: "",
    content: "",
    priority: "normal" as "low" | "normal" | "high" | "urgent",
    type: "internal" as "internal" | "patient" | "broadcast",
    phoneNumber: "",
    messageType: "sms" as "sms" | "whatsapp" | "email"
  });
  const [videoCall, setVideoCall] = useState({
    participant: "",
    type: "consultation" as "consultation" | "team_meeting" | "emergency",
    duration: "30" as "15" | "30" | "60" | "90",
    scheduled: false,
    scheduledTime: ""
  });
  const [selectedVideoCallPatient, setSelectedVideoCallPatient] = useState<string>("");
  const [videoCallPatientSearch, setVideoCallPatientSearch] = useState<string>("");
  const [selectedMessagePatient, setSelectedMessagePatient] = useState<string>("");
  const [messagePatientSearch, setMessagePatientSearch] = useState<string>("");
  const [selectedRecipientRole, setSelectedRecipientRole] = useState<string>("");
  const [selectedRecipientUser, setSelectedRecipientUser] = useState<string>("");
  const { toast } = useToast();

  // Authentication token and headers
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    setAuthToken(token);
  }, []);

  // Fetch current user information
  const { data: user } = useQuery({
    queryKey: ['/api/auth/validate'],
    queryFn: async () => {
      console.log('🔐 FETCHING USER AUTH DATA for WebSocket connection');
      const response = await apiRequest('GET', '/api/auth/validate');
      const data = await response.json();
      console.log('🔐 USER AUTH DATA RECEIVED:', data.user);
      return data.user;
    }
  });

  // Check if user is a doctor role
  const isDoctor = isDoctorLike(user?.role);

  // Fetch patients for searchable dropdown
  const { data: patientsData, isLoading: patientsLoading, error: patientsError } = useQuery({
    queryKey: ['/api/patients'],
    queryFn: async () => {
      console.log('📋 MESSAGING: Fetching patients data...');
      const response = await apiRequest('GET', '/api/patients');
      const data = await response.json();
      console.log('📋 MESSAGING: Patients data received:', data?.length || 0, 'patients');
      return data;
    },
    enabled: true // Always fetch patients data
  });

  // Fetch users for admin and patient role-based filtering
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/users');
      const data = await response.json();
      return data;
    },
    enabled: user?.role === 'admin' || user?.role === 'patient' // Fetch when user is admin or patient
  });

  // Fetch roles from the roles table filtered by organization_id
  const { data: rolesData = [] } = useQuery({
    queryKey: ["/api/roles"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/roles");
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Roles fetch error:", error);
        return [];
      }
    },
  });

  // Update current user when user data changes
  useEffect(() => {
    if (user) {
      console.log('🔐 SETTING CURRENT USER for WebSocket:', user);
      setCurrentUser(user);
    } else {
      console.log('🔐 NO USER DATA - WebSocket cannot connect');
    }
  }, [user]);

  // Filter patients based on search
  const filteredVideoCallPatients = (patientsData || []).filter((patient: any) =>
    `${patient.firstName} ${patient.lastName}`.toLowerCase().includes(videoCallPatientSearch.toLowerCase()) ||
    patient.email?.toLowerCase().includes(videoCallPatientSearch.toLowerCase()) ||
    patient.patientId?.toLowerCase().includes(videoCallPatientSearch.toLowerCase())
  );

  const filteredMessagePatients = (patientsData || []).filter((patient: any) =>
    `${patient.firstName} ${patient.lastName}`.toLowerCase().includes(messagePatientSearch.toLowerCase()) ||
    patient.email?.toLowerCase().includes(messagePatientSearch.toLowerCase()) ||
    patient.patientId?.toLowerCase().includes(messagePatientSearch.toLowerCase())
  );

  // Filter users/patients based on selected role for admin
  const filteredRecipients = selectedRecipientRole === 'patient' 
    ? (patientsData || [])
    : selectedRecipientRole 
      ? (usersData || []).filter((u: any) => u.role === selectedRecipientRole)
      : [];

  // Helper function to get the other participant (not the current user)
  const getOtherParticipant = (conversation: Conversation) => {
    console.log('🔍 GET OTHER PARTICIPANT - Conversation:', conversation.id);
    console.log('🔍 PARTICIPANTS:', conversation.participants);
    console.log('🔍 CURRENT USER:', currentUser?.id);
    
    if (!currentUser) {
      // Return first participant with a valid name, or first participant
      const validParticipant = conversation.participants.find(p => p.name && p.name !== 'undefined' && p.id);
      console.log('🔍 NO CURRENT USER - Valid participant:', validParticipant);
      return validParticipant || conversation.participants[0];
    }
    
    // Find the participant that is NOT the current user (simple ID comparison)
    const otherParticipant = conversation.participants.find(p => 
      p.id && String(p.id) !== String(currentUser.id)
    );
    
    console.log('🔍 OTHER PARTICIPANT FOUND:', otherParticipant);
    return otherParticipant || conversation.participants[0];
  };

  // Clear message content when conversation changes
  useEffect(() => {
    setNewMessageContent("");
  }, [selectedConversation]);

  const { data: conversations = [], isLoading: conversationsLoading, error: conversationsError, refetch: refetchConversations } = useQuery({
    queryKey: ['/api/messaging/conversations'],
    enabled: true, // Enable automatic execution to load conversations
    staleTime: 300000, // Consider data fresh for 5 minutes
    gcTime: 600000, // Keep in cache for 10 minutes
    refetchOnMount: false, // Don't auto-refetch on mount
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchInterval: false, // Don't poll
    retry: 1, // Only retry once on failure
    queryFn: async () => {
      console.log('🔄 FETCHING CONVERSATIONS');
      const response = await apiRequest('GET', '/api/messaging/conversations');
      const data = await response.json();
      console.log('📨 CONVERSATIONS DATA RECEIVED:', JSON.stringify(data, null, 2));
      return data;
    }
  });

  // Auto-select first conversation when conversations load
  useEffect(() => {
    if (conversations && conversations.length > 0 && !selectedConversation) {
      console.log('🔥 AUTO-SELECTING FIRST CONVERSATION:', conversations[0].id);
      setSelectedConversation(conversations[0].id);
    }
  }, [conversations, selectedConversation]);

  // Bypass React Query completely for messages to avoid cache issues
  const [messages, setMessages] = useState<any[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  
  const fetchMessages = useCallback(async (conversationId: string) => {
    if (!conversationId) return;
    
    setMessagesLoading(true);
    try {
      console.log('🔥 DIRECT FETCH MESSAGES for conversation:', conversationId);
      console.log('🔥 FETCH TIMESTAMP:', new Date().toISOString());
      const response = await apiRequest('GET', `/api/messaging/messages/${conversationId}`);
      const data = await response.json();
      console.log('🔥 DIRECT FETCH COMPLETED:', data.length, 'messages');
      console.log('🔥 MESSAGE IDS:', data.map((m: any) => m.id));
      setMessages(data);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  }, []);
  
  // Fetch messages when conversation changes
  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation);
    } else {
      setMessages([]);
    }
  }, [selectedConversation, fetchMessages]);

  const { data: campaigns = [], isLoading: campaignsLoading, error: campaignsError } = useQuery({
    queryKey: ['/api/messaging/campaigns'],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      console.log('Fetching campaigns with token:', token ? 'present' : 'missing');
      const response = await fetch('/api/messaging/campaigns', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': localStorage.getItem('user_subdomain') || 'demo',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      console.log('Campaigns response status:', response.status);
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      const data = await response.json();
      console.log('Campaigns data received:', data);
      return data;
    }
  });

  const { data: templates = [], isLoading: templatesLoading, error: templatesError } = useQuery({
    queryKey: ['/api/messaging/templates'],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      console.log('Fetching templates with token:', token ? 'present' : 'missing');
      const response = await fetch('/api/messaging/templates', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': localStorage.getItem('user_subdomain') || 'demo',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      console.log('Templates response status:', response.status);
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      const data = await response.json();
      console.log('Templates data received:', data);
      return data;
    }
  });

  const { data: analytics = {}, isLoading: analyticsLoading } = useQuery({
    queryKey: ['/api/messaging/analytics'],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/messaging/analytics', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': localStorage.getItem('user_subdomain') || 'demo',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    }
  });

  const resetNewMessage = () => {
    setNewMessage({
      recipient: "",
      subject: "",
      content: "",
      priority: "normal",
      type: "internal",
      phoneNumber: "",
      messageType: "email"
    });
  };



  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: any) => {
      const token = localStorage.getItem('auth_token');
      const subdomain = localStorage.getItem('user_subdomain') || 'demo';
      const response = await fetch('/api/messaging/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': subdomain,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(messageData),
      });
      
      if (!response.ok) {
        // Parse error response for SMS/WhatsApp delivery failures
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      console.log('🎯 MESSAGE SENT SUCCESS - updating conversations cache immediately');
      
      // Force immediate UI update for conversations list
      const currentConversations = queryClient.getQueryData(['/api/messaging/conversations']) as any[] || [];
      
      // Check if this creates a new conversation or updates existing
      const existingConversation = currentConversations.find(conv => conv.id === data.conversationId);
      
      if (!existingConversation) {
        // New conversation created - force complete cache refresh
        console.log('🔄 NEW CONVERSATION DETECTED - forcing complete refresh');
        queryClient.removeQueries({ queryKey: ['/api/messaging/conversations'] });
        queryClient.invalidateQueries({ queryKey: ['/api/messaging/conversations'] });
        // Force immediate refetch
        // setTimeout(() => {
        //   refetchConversations();
        // }, 100);
      } else {
        // Existing conversation - update the last message info immediately
        const updatedConversations = currentConversations.map(conv => {
          if (conv.id === data.conversationId) {
            return {
              ...conv,
              lastMessage: {
                id: data.id,
                content: data.content,
                subject: data.subject || "",
                priority: data.priority || "normal",
                timestamp: data.timestamp || new Date().toISOString(),
                senderId: data.senderId
              },
              updatedAt: new Date().toISOString()
            };
          }
          return conv;
        });
        
        // Update the cache immediately
        queryClient.setQueryData(['/api/messaging/conversations'], updatedConversations);
        
        // Force invalidation and refetch to ensure consistency
        queryClient.invalidateQueries({ queryKey: ['/api/messaging/conversations'] });
        // setTimeout(() => {
        //   console.log('🔄 EXISTING CONVERSATION UPDATED - forcing refetch');
        //   refetchConversations();
        // }, 50);
      }
      
      // Only handle new message dialog closing here
      if (!variables.conversationId) {
        // It's a new message, so close the dialog and reset the form
        setShowNewMessage(false);
        resetNewMessage();
        
        // Show different success message based on communication method
        let description = "Your message has been sent successfully.";
        if (variables.messageType === 'sms') {
          description = `SMS delivered successfully to ${variables.phoneNumber} via Twilio. The recipient will receive it on their phone.`;
        } else if (variables.messageType === 'whatsapp') {
          description = `WhatsApp message delivered successfully to ${variables.phoneNumber} via Twilio. The recipient will receive it on WhatsApp.`;
        }
        
        toast({
          title: "Message Sent",
          description: description,
        });
      }
      // Conversation message success is handled in handleSendConversationMessage
    },
    onError: (error: any) => {
      console.error('Message sending failed:', error);
      toast({
        title: "Message Failed",
        description: error.message || "Failed to send message. Please check your configuration and try again.",
        variant: "destructive"
      });
    }
  });

  const deleteConversationMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/messaging/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': localStorage.getItem('user_subdomain') || 'demo',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    onMutate: async (conversationId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/messaging/conversations'] });

      // Snapshot the previous value
      const previousConversations = queryClient.getQueryData(['/api/messaging/conversations']);

      // Optimistically update to remove the conversation
      const currentConversations = (previousConversations as any[]) || [];
      const updatedConversations = currentConversations.filter(conv => conv.id !== conversationId);
      queryClient.setQueryData(['/api/messaging/conversations'], updatedConversations);

      // If we're currently viewing this conversation, go back to conversations list
      if (selectedConversation === conversationId) {
        setSelectedConversation(null);
      }

      return { previousConversations };
    },
    onSuccess: (data, conversationId) => {
      console.log('🗑️ CONVERSATION DELETED SUCCESS:', conversationId);
      
      toast({
        title: "Conversation Deleted",
        description: "The conversation has been permanently deleted.",
      });
    },
    onError: (err, conversationId, context) => {
      // Rollback on error
      if (context?.previousConversations) {
        queryClient.setQueryData(['/api/messaging/conversations'], context.previousConversations);
      }
      
      console.error('Conversation deletion failed:', err);
      toast({
        title: "Delete Failed",
        description: err.message || "Failed to delete conversation. Please try again.",
        variant: "destructive"
      });
    },
    onSettled: () => {
      // Always refetch after mutation settles - force complete refresh
      queryClient.removeQueries({ queryKey: ['/api/messaging/conversations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/messaging/conversations'] });
      // setTimeout(() => {
      //   refetchConversations();
      // }, 50);
    }
  });

  const updateDeliveryStatusMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/messaging/update-delivery-status', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': localStorage.getItem('user_subdomain') || 'demo',
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({})
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: (data) => {
      console.log('🔄 DELIVERY STATUS UPDATE SUCCESS:', data);
      
      // Refresh messages and conversations to show updated delivery statuses
      if (selectedConversation) {
        fetchMessages(selectedConversation);
      }
      // refetchConversations();
      
      toast({
        title: "Delivery Status Updated",
        description: `Updated delivery status for ${data.updatedCount || 0} pending messages.`,
      });
    },
    onError: (error: any) => {
      console.error('Delivery status update failed:', error);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update delivery status. Please try again.",
        variant: "destructive"
      });
    }
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (campaignData: any) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/messaging/campaigns', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': localStorage.getItem('user_subdomain') || 'demo',
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(campaignData),
      });
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messaging/campaigns'] });
      setShowCreateCampaign(false);
      setNewCampaign({
        name: "",
        type: "email",
        subject: "",
        content: "",
        template: "default"
      });
      toast({
        title: "Campaign Created",
        description: "Your messaging campaign has been created successfully.",
      });
    }
  });

  const handleCreateCampaign = () => {
    if (!newCampaign.name.trim() || !newCampaign.subject.trim() || !newCampaign.content.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    createCampaignMutation.mutate({
      ...newCampaign,
      status: "draft",
      recipientCount: 0,
      sentCount: 0,
      openRate: 0,
      clickRate: 0
    });
  };

  const createTemplateMutation = useMutation({
    mutationFn: async (templateData: any) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/messaging/templates', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': localStorage.getItem('user_subdomain') || 'demo',
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(templateData),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messaging/templates'] });
      setShowCreateTemplate(false);
      setNewTemplate({
        name: "",
        category: "general",
        subject: "",
        content: ""
      });
      toast({
        title: "Template Created",
        description: "Your message template has been created successfully.",
      });
    },
    onError: (error: any) => {
      console.error("Error creating template:", error);
      toast({
        title: "Failed to Create Template",
        description: error.message || "An error occurred while creating the template. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleCreateTemplate = () => {
    if (!newTemplate.name.trim() || !newTemplate.subject.trim() || !newTemplate.content.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    createTemplateMutation.mutate(newTemplate);
  };

  // Fetch all users for Use Template dialog
  const { data: allUsers } = useQuery({
    queryKey: ['/api/users'],
    enabled: showUseTemplate,
  });

  const useTemplateMutation = useMutation({
    mutationFn: async (templateId: number) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/messaging/templates/${templateId}/send-to-all`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': localStorage.getItem('user_subdomain') || 'demo',
          'Content-Type': 'application/json'
        },
        credentials: 'include',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/messaging/templates'] });
      setShowUseTemplate(false);
      setSelectedTemplate(null);
      toast({
        title: "Template Sent",
        description: data.message || `Email sent successfully to ${data.successCount} users.`,
      });
    },
    onError: (error: any) => {
      console.error("Error sending template:", error);
      toast({
        title: "Failed to Send Template",
        description: error.message || "An error occurred while sending the template. Please try again.",
        variant: "destructive"
      });
    }
  });

  const editTemplateMutation = useMutation({
    mutationFn: async ({ templateId, templateData }: { templateId: number, templateData: any }) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/messaging/templates/${templateId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': localStorage.getItem('user_subdomain') || 'demo',
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(templateData),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messaging/templates'] });
      setShowEditTemplate(false);
      setSelectedTemplate(null);
      setEditingTemplate({
        name: "",
        category: "general",
        subject: "",
        content: ""
      });
      toast({
        title: "Template Updated",
        description: "Your message template has been updated successfully.",
      });
    },
    onError: (error: any) => {
      console.error("Error updating template:", error);
      toast({
        title: "Failed to Update Template",
        description: error.message || "An error occurred while updating the template. Please try again.",
        variant: "destructive"
      });
    }
  });

  const copyTemplateMutation = useMutation({
    mutationFn: async (template: any) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/messaging/templates', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': localStorage.getItem('user_subdomain') || 'demo',
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          name: `${template.name} (Copy)`,
          category: template.category,
          subject: template.subject,
          content: template.content
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messaging/templates'] });
      toast({
        title: "Template Copied",
        description: "Template has been copied successfully.",
      });
    },
    onError: (error: any) => {
      console.error("Error copying template:", error);
      toast({
        title: "Failed to Copy Template",
        description: error.message || "An error occurred while copying the template. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleUseTemplate = (template: any) => {
    setSelectedTemplate(template);
    setShowUseTemplate(true);
  };

  const handleEditTemplate = (template: any) => {
    setSelectedTemplate(template);
    setEditingTemplate({
      name: template.name,
      category: template.category,
      subject: template.subject,
      content: template.content
    });
    setShowEditTemplate(true);
  };

  const handleCopyTemplate = (template: any) => {
    copyTemplateMutation.mutate(template);
  };

  const handleConfirmUseTemplate = () => {
    if (selectedTemplate) {
      useTemplateMutation.mutate(selectedTemplate.id);
    }
  };

  const handleConfirmEditTemplate = () => {
    if (!editingTemplate.name.trim() || !editingTemplate.subject.trim() || !editingTemplate.content.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    if (selectedTemplate) {
      editTemplateMutation.mutate({
        templateId: selectedTemplate.id,
        templateData: editingTemplate
      });
    }
  };

  // Polling-based real-time messaging as WebSocket fallback
  useEffect(() => {
    if (!currentUser) {
      console.log('🔗 Real-time: No currentUser, skipping connection');
      return;
    }

    console.log('🔗 Setting up polling-based real-time messaging for user:', currentUser.id);
    
    // Reduced polling interval to prevent UI blinking
    const messagePollingInterval = setInterval(() => {
      // Only poll if user is on messaging page and WebSocket is not connected
      if (selectedConversation && fetchMessages) {
        fetchMessages(selectedConversation);
      }
      
      // Less frequent conversation refresh to reduce API calls
      refetchConversations();
    }, 5000); // Check every 5 seconds instead of 2
    
    // Also attempt WebSocket as primary method with robust URL construction
    const url = new URL('/ws', window.location.href);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = url.toString();
    console.log('🔗 WebSocket: URL:', wsUrl);
    
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log('🔗 WebSocket connected successfully');
      try {
        // Authenticate with the server
        const authMessage = {
          type: 'auth',
          userId: currentUser.id
        };
        console.log('🔗 WebSocket: Sending authentication:', authMessage);
        socket.send(JSON.stringify(authMessage));
      } catch (error) {
        console.error('❌ WebSocket authentication error:', error);
      }
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📨 WebSocket message received:', data);
        
        if (data.type === 'new_message') {
          console.log('📨 WebSocket message received:', data);
          console.log('🔄 New message received via WebSocket, refreshing UI immediately');
          
          // Extract conversationId from different possible locations
          const messageConversationId = data.data?.conversationId || data.message?.conversationId || data.conversationId;
          console.log('🔍 Extracted conversationId for WebSocket:', messageConversationId);
          
          // Force immediate refresh of current conversation if it matches
          if (selectedConversation && messageConversationId === selectedConversation && fetchMessages) {
            console.log('🔥 IMMEDIATE REFETCH - Current conversation matches WebSocket message');
            fetchMessages(selectedConversation);
          }
          
          // Always refresh conversations to update sidebar
          console.log('🔥 FORCE REFETCH ALL CONVERSATIONS - WebSocket triggered');
          refetchConversations();
          
          // Show toast notification
          toast({
            title: "New Message",
            description: `New message received`,
          });
        }
      } catch (error) {
        console.error('❌ Error parsing WebSocket message:', error);
      }
    };

    socket.onclose = (event) => {
      console.log('🔗 WebSocket disconnected:', event.code, event.reason);
      // Log disconnection but don't force reload - polling will handle real-time updates
      if (event.code === 1006) {
        console.log('🔄 Abnormal WebSocket closure detected - polling system will maintain real-time updates');
      }
    };

    socket.onerror = (error) => {
      console.error('❌ WebSocket connection error:', error);
      // Prevent unhandled promise rejections
      if (error instanceof Error) {
        return Promise.resolve();
      }
    };

    // Cleanup on unmount
    return () => {
      console.log('🔗 Real-time: Cleaning up polling and WebSocket connection');
      clearInterval(messagePollingInterval);
      socket.close();
    };
  }, [currentUser, toast, selectedConversation, fetchMessages]);

  const handleSendNewMessage = () => {
    // Validate required fields
    const missingFields = [];
    if (!newMessage.recipient.trim()) missingFields.push("Recipient");
    if (!newMessage.subject.trim()) missingFields.push("Subject");  
    if (!newMessage.content.trim()) missingFields.push("Message Content");
    
    if (missingFields.length > 0) {
      toast({
        title: "Validation Error",
        description: `Please fill in: ${missingFields.join(", ")}`,
        variant: "destructive"
      });
      return;
    }

    // Additional validation for SMS/WhatsApp - allow empty phone number for testing
    if ((newMessage.messageType === 'sms' || newMessage.messageType === 'whatsapp') && !newMessage.phoneNumber.trim()) {
      // Show warning but allow message to proceed for testing purposes
      toast({
        title: "Phone Number Missing",
        description: "SMS/WhatsApp message will be saved but delivery requires proper Twilio credentials.",
        variant: "default"
      });
    }

    sendMessageMutation.mutate({
      recipientId: newMessage.recipient,
      subject: newMessage.subject,
      content: newMessage.content,
      priority: newMessage.priority,
      type: newMessage.type,
      phoneNumber: newMessage.phoneNumber,
      messageType: newMessage.messageType
    });
  };

  const handleSendConversationMessage = async () => {
    if (!newMessageContent.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a message.",
        variant: "destructive"
      });
      return;
    }

    if (!selectedConversation) {
      toast({
        title: "Error",
        description: "Please select a conversation first.",
        variant: "destructive"
      });
      return;
    }

    const messageContent = newMessageContent.trim();
    console.log('Sending message to conversation:', selectedConversation);
    console.log('Message content:', messageContent);
    setNewMessageContent(""); // Clear immediately
    
    try {
      // Find the other participant (patient) in the conversation
      const currentConversation = conversations.find((c: Conversation) => c.id === selectedConversation);
      const otherParticipant = currentConversation?.participants?.find((p: any) => 
        p.id !== currentUser?.id
      );
      
      // For patient conversations, get phone from stored messages or participant
      const phoneNumber = messages?.[0]?.phoneNumber || otherParticipant?.phone;
      const messageType = 'sms'; // Default to SMS for external messages
      
      // Determine if this should be sent as external SMS (only for patients with phone numbers)
      const isExternalMessage = phoneNumber && messageType && otherParticipant?.role === 'patient';
      
      // Debug logging
      console.log('🔍 SMS DETECTION DEBUG:');
      console.log('  Other participant:', otherParticipant);
      console.log('  Phone number:', phoneNumber);
      console.log('  Message type:', messageType);
      console.log('  Is external:', isExternalMessage);
      
      const messageData = {
        conversationId: selectedConversation,
        content: messageContent,
        priority: 'normal',
        type: isExternalMessage ? 'patient' : 'internal',
        phoneNumber: isExternalMessage ? phoneNumber : undefined,
        messageType: isExternalMessage ? messageType : undefined
      };
      console.log('🔥 CONVERSATION MESSAGE DATA:', messageData);
      console.log('🔥 Selected conversation ID:', selectedConversation);
      
      // Use direct API call with proper error handling (avoids false error notifications)
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/messaging/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': localStorage.getItem('user_subdomain') || 'demo',
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(messageData),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `Failed to send message: ${response.status} ${response.statusText}`);
      }
      
      const responseData = await response.json();
      console.log('🔥 CONVERSATION MESSAGE RESPONSE:', responseData);
      
      // Update conversations cache for persistence
      const currentConversations = queryClient.getQueryData(['/api/messaging/conversations']) as any[] || [];
      const existingConversation = currentConversations.find(conv => conv.id === responseData.conversationId);
      
      if (!existingConversation) {
        // New conversation created - force complete cache refresh
        console.log('🔄 NEW CONVERSATION DETECTED - forcing complete refresh');
        queryClient.removeQueries({ queryKey: ['/api/messaging/conversations'] });
        queryClient.invalidateQueries({ queryKey: ['/api/messaging/conversations'] });
      } else {
        // Update existing conversation cache
        const updatedConversations = currentConversations.map(conv => {
          if (conv.id === responseData.conversationId) {
            return {
              ...conv,
              lastMessage: {
                id: responseData.id,
                content: responseData.content,
                priority: responseData.priority || "normal",
                timestamp: responseData.timestamp || new Date().toISOString(),
                senderId: responseData.senderId
              },
              updatedAt: new Date().toISOString()
            };
          }
          return conv;
        });
        queryClient.setQueryData(['/api/messaging/conversations'], updatedConversations);
        queryClient.invalidateQueries({ queryKey: ['/api/messaging/conversations'] });
      }
      
      // Force immediate UI update using direct fetch to ensure message appears
      console.log('🔥 FORCE IMMEDIATE UI UPDATE: Triggering direct fetch after send');
      if (selectedConversation && fetchMessages) {
        console.log('🔥 Using direct fetch for immediate message visibility');
        await fetchMessages(selectedConversation);
        console.log('🔥 DIRECT FETCH COMPLETED after message send');
      }
      
      // Show success notification
      toast({
        title: "Message Sent",
        description: "Your message has been sent successfully.",
      });
      
    } catch (error: any) {
      // Restore the message content if send failed
      setNewMessageContent(messageContent);
      console.error('🔥 CONVERSATION MESSAGE ERROR:', error);
      
      // Show error notification only on actual failure
      toast({
        title: "Error", 
        description: error.message || "Failed to send message. Please try again.",
        variant: "destructive"
      });
    }
  };



  const handleStartVideoCall = async () => {
    if (!videoCall.participant.trim()) {
      toast({
        title: "Validation Error",
        description: "Please select a participant for the video call.",
        variant: "destructive"
      });
      return;
    }

    const participantName = videoCall.participant;
    
    try {
      // Create BigBlueButton meeting
      const response = await fetch('/api/video-conference/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meetingName: `Consultation with ${participantName}`,
          participantName: participantName,
          duration: parseInt(videoCall.duration),
          maxParticipants: videoCall.type === 'team_meeting' ? 20 : 2
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create video conference');
      }

      const meetingData = await response.json();

      // Open BigBlueButton meeting in new window
      const meetingWindow = window.open(
        meetingData.moderatorJoinUrl,
        'bbb-meeting',
        'width=1200,height=800,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no'
      );

      if (!meetingWindow) {
        toast({
          title: "Popup Blocked",
          description: "Please allow popups for video conferencing and try again.",
          variant: "destructive"
        });
        return;
      }

      // Close dialog and start call interface
      setShowVideoCall(false);
      setCallParticipant(participantName);
      setActiveVideoCall(true);
      setCallDuration(0);
      
      // Store meeting info for ending later
      setMeetingInfo({
        meetingID: meetingData.meetingID,
        moderatorPassword: meetingData.moderatorPassword
      });
      
      toast({
        title: "Video Conference Started",
        description: `BigBlueButton meeting created for ${participantName}`,
      });

      // Start call timer
      const timer = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
      setCallTimer(timer);

      // Monitor window closure
      const checkClosed = setInterval(() => {
        if (meetingWindow.closed) {
          clearInterval(checkClosed);
          handleEndVideoCall();
        }
      }, 1000);

      // Show connection success after delay
      setTimeout(() => {
        toast({
          title: "Meeting Ready",
          description: `Video conference with ${participantName} is now accessible in the new window`,
        });
      }, 2000);

    } catch (error) {
      console.error('Error creating video conference:', error);
      toast({
        title: "Connection Failed",
        description: "Unable to create video conference. Please try again.",
        variant: "destructive"
      });
    }

    // Reset form
    setVideoCall({
      participant: "",
      type: "consultation",
      duration: "30",
      scheduled: false,
      scheduledTime: ""
    });
  };

  const handleEndVideoCall = async () => {
    // End BigBlueButton meeting if we have meeting info
    if (meetingInfo) {
      try {
        const response = await fetch(`/api/video-conference/end/${meetingInfo.meetingID}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            moderatorPassword: meetingInfo.moderatorPassword
          })
        });

        if (response.ok) {
          toast({
            title: "Meeting Ended",
            description: "BigBlueButton meeting has been terminated.",
          });
        }
      } catch (error) {
        console.error('Error ending meeting:', error);
      }
    }

    // Stop all media tracks
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    
    // Clear timer
    if (callTimer) {
      clearInterval(callTimer);
      setCallTimer(null);
    }
    
    setActiveVideoCall(false);
    setCallParticipant("");
    setCallDuration(0);
    setIsMuted(false);
    setIsVideoOn(true);
    setMeetingInfo(null);
    
    toast({
      title: "Call Ended",
      description: "Video call has been terminated.",
    });
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    toast({
      title: isMuted ? "Microphone On" : "Microphone Muted",
      description: isMuted ? "You are now unmuted" : "You are now muted",
    });
  };

  const toggleVideo = () => {
    setIsVideoOn(!isVideoOn);
    toast({
      title: isVideoOn ? "Camera Off" : "Camera On",
      description: isVideoOn ? "Your video is now off" : "Your video is now on",
    });
  };

  const formatCallDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Delete conversation function
  const handleDeleteConversation = (conversationId: string) => {
    deleteConversationMutation.mutate(conversationId);
  };

  const filteredConversations = (conversations || []).filter((conv: Conversation) => {
    if (messageFilter === "unread" && conv.unreadCount === 0) return false;
    if (messageFilter === "patients" && !conv.isPatientConversation) return false;
    if (messageFilter === "staff" && conv.isPatientConversation) return false;
    if (searchQuery && conv.lastMessage && !conv.lastMessage.subject?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });



  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'normal': return 'bg-blue-500';
      case 'low': return 'bg-gray-500';
      default: return 'bg-blue-500';
    }
  };

  const getCampaignStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case 'scheduled': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
      case 'paused': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
      case 'draft': return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300';
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300';
    }
  };

  if (conversationsLoading || campaignsLoading || templatesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }



  return (
    <div>
      {/* Top row: Header + Theme Toggle */}
      <div className="flex items-center justify-between mr-6 bg-white px-2 py-1 rounded">
        <Header
          title="Messaging Center"
          subtitle="Secure communication with patients and staff"
        />

        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-600">Theme:</span>
          <ThemeToggle />
        </div>
      </div>

      {/* Messaging Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Healthcare Quick Actions */}
        <div className="flex items-center gap-4 mb-8">
          <div className="flex gap-2 mr-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setNewMessage({
                  recipient: "",
                  subject: "Appointment Reminder",
                  content: "Hi {{patientName}},\n\nThis is a reminder that you have an appointment scheduled on {{appointmentDate}} with {{doctorName}} at {{clinicName}}.\n\nPlease arrive 15 minutes early for check-in.\n\nIf you need to reschedule, please call us.\n\nThank you,\n{{clinicName}}",
                  priority: "normal",
                  type: "patient",
                  phoneNumber: "",
                  messageType: "sms"
                });
                setShowNewMessage(true);
              }}
            >
              📅 Appointment Reminder
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setNewMessage({
                  recipient: "",
                  subject: "Lab Results Available",
                  content: "Hi {{patientName}},\n\nYour lab results are now available for review.\n\nPlease call us at {{clinicPhone}} or visit your patient portal to discuss the results with your provider.\n\nBest regards,\n{{clinicName}}",
                  priority: "normal",
                  type: "patient",
                  phoneNumber: "",
                  messageType: "sms"
                });
                setShowNewMessage(true);
              }}
            >
              🧪 Lab Results
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setNewMessage({
                  recipient: "",
                  subject: "Prescription Ready",
                  content: "Hi {{patientName}},\n\nYour prescription is ready for pickup at:\n{{pharmacyName}}\n{{pharmacyAddress}}\n\nPlease bring a valid ID when collecting your medication.\n\nThank you!",
                  priority: "normal",
                  type: "patient",
                  phoneNumber: "",
                  messageType: "sms"
                });
                setShowNewMessage(true);
              }}
            >
              💊 Prescription Ready
            </Button>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => updateDeliveryStatusMutation.mutate()}
            disabled={updateDeliveryStatusMutation.isPending}
            title="Update delivery status for pending messages"
          >
            {updateDeliveryStatusMutation.isPending ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Update Delivery Status
          </Button>
          <Dialog open={showVideoCall} onOpenChange={setShowVideoCall}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Video className="h-4 w-4 mr-2" />
                Video Call
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Start Video Call</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
{(user?.role === 'admin' || user?.role === 'patient') ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="selectCallRole">Select Role *</Label>
                      <Select 
                        value={selectedRecipientRole} 
                        onValueChange={(value) => {
                          setSelectedRecipientRole(value);
                          setSelectedRecipientUser("");
                          setVideoCall(prev => ({ ...prev, participant: "" }));
                        }}
                      >
                        <SelectTrigger data-testid="select-call-recipient-role">
                          <SelectValue placeholder="Select a role..." />
                        </SelectTrigger>
                        <SelectContent>
                          {rolesData.map((role: any) => (
                            <SelectItem key={role.id} value={role.name}>
                              {role.displayName || role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="selectCallName">Select Name *</Label>
                      <Select 
                        value={selectedRecipientUser} 
                        onValueChange={(value) => {
                          setSelectedRecipientUser(value);
                          setVideoCall(prev => ({ ...prev, participant: value }));
                        }}
                        disabled={!selectedRecipientRole}
                      >
                        <SelectTrigger data-testid="select-call-recipient-name">
                          <SelectValue placeholder={selectedRecipientRole ? "Select a name..." : "Select role first..."} />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredRecipients.map((recipient: any) => (
                            <SelectItem 
                              key={recipient.id} 
                              value={`${recipient.firstName} ${recipient.lastName}`}
                              data-testid={`call-recipient-option-${recipient.id}`}
                            >
                              <div className="flex flex-col">
                                <span className="font-medium">{recipient.firstName} {recipient.lastName}</span>
                                <span className="text-sm text-gray-500">{recipient.email}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="callParticipant">Recipient *</Label>
                    <div className="relative">
                      <Input
                        id="callParticipant"
                        placeholder="Search patients..."
                        value={videoCallPatientSearch}
                        onChange={(e) => setVideoCallPatientSearch(e.target.value)}
                      />
                      {videoCallPatientSearch && filteredVideoCallPatients.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-md shadow-lg max-h-60 overflow-auto">
                          {filteredVideoCallPatients.map((patient: any) => (
                            <div
                              key={patient.id}
                              className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer"
                              onClick={() => {
                                setSelectedVideoCallPatient(`${patient.firstName} ${patient.lastName}`);
                                setVideoCallPatientSearch(`${patient.firstName} ${patient.lastName}`);
                                setVideoCall(prev => ({ ...prev, participant: `${patient.firstName} ${patient.lastName}` }));
                              }}
                            >
                              <div className="font-medium">{patient.firstName} {patient.lastName}</div>
                              <div className="text-sm text-gray-500">{patient.email} • {patient.patientId}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="callType">Call Type</Label>
                    <Select 
                      value={videoCall.type} 
                      onValueChange={(value: "consultation" | "team_meeting" | "emergency") => 
                        setVideoCall(prev => ({ ...prev, type: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="consultation">Patient Consultation</SelectItem>
                        <SelectItem value="team_meeting">Team Meeting</SelectItem>
                        <SelectItem value="emergency">Emergency Call</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="callDuration">Expected Duration</Label>
                    <Select 
                      value={videoCall.duration} 
                      onValueChange={(value: "15" | "30" | "60" | "90") => 
                        setVideoCall(prev => ({ ...prev, duration: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="90">1.5 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="scheduleCall"
                      checked={videoCall.scheduled}
                      onChange={(e) => setVideoCall(prev => ({ ...prev, scheduled: e.target.checked }))}
                      className="rounded"
                    />
                    <Label htmlFor="scheduleCall">Schedule for later</Label>
                  </div>
                  
                  {videoCall.scheduled && (
                    <div className="space-y-2">
                      <Label htmlFor="scheduledTime">Scheduled Time</Label>
                      <Input
                        id="scheduledTime"
                        type="datetime-local"
                        value={videoCall.scheduledTime}
                        onChange={(e) => setVideoCall(prev => ({ ...prev, scheduledTime: e.target.value }))}
                      />
                    </div>
                  )}
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Video className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-900">Video Call Features</span>
                  </div>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• HD video and audio quality</li>
                    <li>• Screen sharing capability</li>
                    <li>• Recording option for consultations</li>
                    <li>• Secure end-to-end encryption</li>
                  </ul>
                </div>

                <div className="flex justify-end gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowVideoCall(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleStartVideoCall}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {videoCall.scheduled ? "Schedule Call" : "Start Call"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={showNewMessage} onOpenChange={setShowNewMessage}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Message
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Compose New Message</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                {/* From/Sender Field */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="message-sender">From</Label>
                    {isDoctor ? (
                      <div className="h-10 px-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-800 flex items-center text-sm">
                        {formatRoleLabel(user?.role)} {user?.firstName} {user?.lastName}
                      </div>
                    ) : (
                      <div className="h-10 px-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-800 flex items-center text-sm">
                        {user?.firstName} {user?.lastName}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {(user?.role === 'admin' || user?.role === 'patient') ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="selectRole">Select Role *</Label>
                        <Select 
                          value={selectedRecipientRole} 
                          onValueChange={(value) => {
                            setSelectedRecipientRole(value);
                            setSelectedRecipientUser("");
                            setNewMessage(prev => ({ ...prev, recipient: "" }));
                          }}
                        >
                          <SelectTrigger data-testid="select-recipient-role">
                            <SelectValue placeholder="Select a role..." />
                          </SelectTrigger>
                          <SelectContent>
                            {rolesData.map((role: any) => (
                              <SelectItem key={role.id} value={role.name}>
                                {role.displayName || role.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="selectName">Select Name *</Label>
                        <Select 
                          value={selectedRecipientUser} 
                          onValueChange={(value) => {
                            setSelectedRecipientUser(value);
                            setNewMessage(prev => ({ ...prev, recipient: value }));
                          }}
                          disabled={!selectedRecipientRole}
                        >
                          <SelectTrigger data-testid="select-recipient-name">
                            <SelectValue placeholder={selectedRecipientRole ? "Select a name..." : "Select role first..."} />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredRecipients.map((recipient: any) => (
                              <SelectItem 
                                key={recipient.id} 
                                value={`${recipient.firstName} ${recipient.lastName}`}
                                data-testid={`recipient-option-${recipient.id}`}
                              >
                                <div className="flex flex-col">
                                  <span className="font-medium">{recipient.firstName} {recipient.lastName}</span>
                                  <span className="text-sm text-gray-500">{recipient.email}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="messageRecipient">Recipient *</Label>
                      <Select 
                        value={selectedMessagePatient} 
                        onValueChange={(value) => {
                          const patient = (patientsData || []).find((p: any) => `${p.firstName} ${p.lastName}` === value);
                          if (patient) {
                            setSelectedMessagePatient(value);
                            setNewMessage(prev => ({ ...prev, recipient: value }));
                          }
                        }}
                      >
                        <SelectTrigger data-testid="select-patient-recipient">
                          <SelectValue placeholder="Select a patient..." />
                        </SelectTrigger>
                        <SelectContent>
                          {(patientsData || []).map((patient: any) => (
                            <SelectItem 
                              key={patient.id} 
                              value={`${patient.firstName} ${patient.lastName}`}
                              data-testid={`patient-option-${patient.id}`}
                            >
                              <div className="flex flex-col">
                                <span className="font-medium">{patient.firstName} {patient.lastName}</span>
                                <span className="text-sm text-gray-500">{patient.email} • {patient.patientId}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="messageType">Message Type</Label>
                    <Select 
                      value={newMessage.type} 
                      onValueChange={(value: "internal" | "patient" | "broadcast") => 
                        setNewMessage(prev => ({ ...prev, type: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="internal">Internal</SelectItem>
                        <SelectItem value="patient">Patient</SelectItem>
                        <SelectItem value="broadcast">Broadcast</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="messageSubject">Subject *</Label>
                    <Input
                      id="messageSubject"
                      placeholder="Enter message subject"
                      value={newMessage.subject}
                      onChange={(e) => setNewMessage(prev => ({ ...prev, subject: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="messagePriority">Priority</Label>
                    <Select 
                      value={newMessage.priority} 
                      onValueChange={(value: "low" | "normal" | "high" | "urgent") => 
                        setNewMessage(prev => ({ ...prev, priority: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="communicationMethod">Communication Method</Label>
                    <Select 
                      value={newMessage.messageType} 
                      onValueChange={(value: "sms" | "whatsapp" | "email") => 
                        setNewMessage(prev => ({ ...prev, messageType: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">📧 Email</SelectItem>
                        <SelectItem value="sms">📱 SMS</SelectItem>
                        <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {(newMessage.messageType === 'sms' || newMessage.messageType === 'whatsapp') && (
                    <div className="space-y-2">
                      <Label htmlFor="phoneNumber">Phone Number</Label>
                      <Input 
                        id="phoneNumber"
                        placeholder="Enter phone number (e.g., +44 123 456 7890)"
                        value={newMessage.phoneNumber}
                        onChange={(e) => setNewMessage(prev => ({ ...prev, phoneNumber: e.target.value }))}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="messageContent">Message Content *</Label>
                  <Textarea
                    id="messageContent"
                    placeholder="Enter your message content..."
                    rows={8}
                    value={newMessage.content}
                    onChange={(e) => setNewMessage(prev => ({ ...prev, content: e.target.value }))}
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowNewMessage(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSendNewMessage}
                    disabled={sendMessageMutation.isPending}
                  >
                    {sendMessageMutation.isPending ? "Sending..." : "Send Message"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="conversations" className="w-full">
        <TabsList>
          <TabsTrigger value="conversations">Conversations</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>
        <TabsContent value="conversations" className="space-y-6">
          <div className="grid grid-cols-12 gap-6 h-[700px]">
            {/* Conversations List */}
            <div className="col-span-4 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-lg">
              <div className="p-4 border-b border-gray-200 dark:border-slate-600">
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
                    <Input
                      placeholder="Search conversations..."
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                <Select value={messageFilter} onValueChange={setMessageFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter messages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Messages</SelectItem>
                    <SelectItem value="unread">Unread</SelectItem>
                    <SelectItem value="patients">Patients</SelectItem>
                    <SelectItem value="staff">Staff Only</SelectItem>
                    <SelectItem value="starred">Starred</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <ScrollArea className="h-[550px]">
                <div className="p-2">
                  {/* New Conversation Option */}
                  {/* Show existing conversations first */}
                  {filteredConversations && filteredConversations.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2 px-1">📩 Click conversation below to send messages:</h3>
                      {filteredConversations.map((conversation: Conversation) => (
                        <div
                          key={conversation.id}
                          className={`p-4 rounded-xl cursor-pointer mb-3 transition-all duration-200 border-2 shadow-sm ${
                            selectedConversation === conversation.id
                              ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800 shadow-md'
                              : 'hover:bg-green-50 dark:hover:bg-green-900/30 border-green-300 dark:border-green-700 hover:border-green-500 dark:hover:border-green-500 bg-white dark:bg-slate-700 hover:shadow-md'
                          }`}
                          onClick={() => {
                            console.log('🔥 CONVERSATION SELECTED:', conversation.id);
                            console.log('🔥 Setting selectedConversation to:', conversation.id);
                            setSelectedConversation(conversation.id);
                          }}
                        >
                          <div className="flex items-start gap-4 relative">
                            <div className="relative flex-shrink-0">
                              <Avatar className="h-12 w-12 border-2 border-white dark:border-slate-600 shadow-sm">
                                <AvatarFallback className="bg-green-500 text-white text-lg font-semibold">
                                  {getOtherParticipant(conversation)?.name?.charAt(0)?.toUpperCase() || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              {conversation.unreadCount > 0 && (
                                <Badge variant="destructive" className="absolute -top-2 -right-2 text-xs min-w-[22px] h-6 flex items-center justify-center p-1 shadow-sm">
                                  {conversation.unreadCount}
                                </Badge>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-base text-gray-900 dark:text-gray-100 truncate leading-tight">
                                    {(() => {
                                      const otherParticipant = getOtherParticipant(conversation);
                                      if (otherParticipant?.name && otherParticipant.name !== 'undefined') {
                                        return otherParticipant.name;
                                      }
                                      if (otherParticipant?.id && otherParticipant.id !== 'undefined') {
                                        return `User ${otherParticipant.id}`;
                                      }
                                      return 'Unknown User';
                                    })()}
                                  </h4>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="secondary" className="text-xs px-2 py-1">
                                      {getOtherParticipant(conversation)?.role || 'user'}
                                    </Badge>
                                    <span className="text-xs text-gray-400 dark:text-gray-500">
                                      {conversation.lastMessage?.timestamp ? new Date(conversation.lastMessage.timestamp).toLocaleDateString() : ''}
                                    </span>
                                  </div>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0 ml-3 text-red-600 border-red-300 hover:text-white hover:bg-red-600 hover:border-red-600 dark:text-red-400 dark:border-red-600 dark:hover:bg-red-700 dark:hover:text-white flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm(`Delete conversation with ${getOtherParticipant(conversation)?.name || 'Unknown User'}? This action cannot be undone.`)) {
                                      handleDeleteConversation(conversation.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
                                {conversation.lastMessage?.content || "No messages yet"}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-600">
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-2 px-1">Or create new conversation:</p>
                    <div
                      className="p-2 rounded-lg cursor-pointer transition-colors border border-dashed border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500 hover:bg-gray-25 dark:hover:bg-slate-700"
                      onClick={() => setShowNewMessage(true)}
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-gray-100 dark:bg-slate-600 flex items-center justify-center">
                          <Plus className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-300">New Message</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {(!filteredConversations || filteredConversations.length === 0) && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No existing conversations found</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Message Thread */}
            <div className="col-span-8 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-lg flex flex-col">
              {selectedConversation ? (
                <>
                  {/* Message Header */}
                  <div className="p-4 border-b border-gray-200 dark:border-slate-600 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {(() => {
                            const conv = conversations.find((c: Conversation) => c.id === selectedConversation);
                            return conv ? getOtherParticipant(conv)?.name?.charAt(0) || 'U' : 'U';
                          })()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">
                          {(() => {
                            const conv = conversations.find((c: Conversation) => c.id === selectedConversation);
                            return conv ? getOtherParticipant(conv)?.name : '';
                          })()}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {(() => {
                            const conv = conversations.find((c: Conversation) => c.id === selectedConversation);
                            return conv ? getOtherParticipant(conv)?.role : '';
                          })()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <Phone className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Video className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Star className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {(() => {
                        console.log('🔥 RENDERING MESSAGES - Count:', messages.length);
                        console.log('🔥 RENDERING MESSAGES - Data:', JSON.stringify(messages, null, 2));
                        return null;
                      })()}
                      {messages.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No messages in this conversation</p>
                        </div>
                      ) : (
                        messages.map((message: Message, index: number) => {
                          console.log(`🔥 RENDERING MESSAGE ${index}:`, message.id, message.content);
                          return (
                            <div key={message.id} className="flex gap-3 border-l-4 border-blue-200 pl-2 py-2" style={{ backgroundColor: '#f8f9fa', minHeight: '60px' }}>
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs bg-blue-500 text-white">
                                  {message.senderName?.charAt(0) || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{message.senderName}</span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {format(new Date(message.timestamp), 'MMM d, HH:mm')}
                                  </span>
                                  <div className={`w-2 h-2 rounded-full ${getPriorityColor(message.priority)}`}></div>
                                </div>
                                <div className="bg-blue-50 dark:bg-slate-700 rounded-lg p-3 border border-blue-200">
                                  <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">{message.content}</p>
                                  {message.attachments && message.attachments.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                      {message.attachments.map((attachment) => (
                                        <div key={attachment.id} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                                          <Paperclip className="h-3 w-3" />
                                          <span>{attachment.name}</span>
                                          <span className="text-gray-500 dark:text-gray-400">({(attachment.size / 1024).toFixed(1)} KB)</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex-shrink-0">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => {
                                      toast({ title: "Forward", description: `Forwarding message: ${message.content.substring(0, 30)}...` });
                                    }}>
                                      <Forward className="mr-2 h-4 w-4" />
                                      Forward
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => {
                                      toast({ title: "Tag", description: `Tagging message: ${message.content.substring(0, 30)}...` });
                                    }}>
                                      <Tag className="mr-2 h-4 w-4" />
                                      Tag
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={async () => {
                                        try {
                                          console.log('🗑️ DELETING MESSAGE:', message.id);
                                          
                                          const token = localStorage.getItem('auth_token');
                                          const response = await fetch(`/api/messaging/messages/${message.id}`, {
                                            method: 'DELETE',
                                            headers: {
                                              'Authorization': `Bearer ${token}`,
                                              'X-Tenant-Subdomain': localStorage.getItem('user_subdomain') || 'demo',
                                              'Content-Type': 'application/json'
                                            },
                                            credentials: 'include'
                                          });
                                          
                                          if (!response.ok) {
                                            if (response.status === 404) {
                                              console.log('🗑️ Message already deleted or not found');
                                              toast({ 
                                                title: "Message Already Deleted", 
                                                description: "This message has already been deleted" 
                                              });
                                              // Still trigger UI refresh to clean up any stale UI state
                                              if (selectedConversation && fetchMessages) {
                                                await fetchMessages(selectedConversation);
                                              }
                                              return;
                                            }
                                            throw new Error(`${response.status}: ${response.statusText}`);
                                          }
                                          
                                          console.log('🗑️ DELETE SUCCESS - updating UI immediately');
                                          
                                          // Get current messages BEFORE clearing cache
                                          const currentMessages = messages as any[] || [];
                                          const updatedMessages = currentMessages.filter(msg => msg.id !== message.id);
                                          
                                          console.log('🗑️ MESSAGES BEFORE DELETE:', currentMessages.length);
                                          console.log('🗑️ MESSAGES AFTER DELETE:', updatedMessages.length);
                                          
                                          // CRITICAL FIX: Force immediate UI update using direct fetch bypass
                                          console.log('🗑️ FORCE RE-RENDER: Triggering direct fetch after delete');
                                          
                                          // Use direct fetch approach to bypass React Query cache completely
                                          if (selectedConversation && fetchMessages) {
                                            console.log('🗑️ Using direct fetch for immediate UI update');
                                            await fetchMessages(selectedConversation);
                                          }
                                          
                                          // Also force refetch conversations 
                                          // await refetchConversations();
                                          
                                          console.log('🗑️ REFETCH COMPLETED - deleted message should disappear immediately');
                                          
                                          toast({ 
                                            title: "Message Deleted", 
                                            description: "Message has been deleted successfully" 
                                          });
                                        } catch (error) {
                                          console.error('Delete error:', error);
                                          toast({ 
                                            title: "Error", 
                                            description: "Failed to delete message", 
                                            variant: "destructive" 
                                          });
                                        }
                                      }}
                                      className="text-red-600 dark:text-red-400"
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </ScrollArea>

                  {/* Message Composer */}
                  <div className="p-4 border-t border-gray-200 dark:border-slate-600 bg-blue-50 dark:bg-slate-700">
                    <div className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                      💬 Reply to this conversation
                    </div>
                    <div className="flex gap-3">
                      <Textarea
                        key={`message-input-${selectedConversation}`}
                        placeholder="Type your reply here..."
                        value={newMessageContent}
                        onChange={(e) => setNewMessageContent(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            if (newMessageContent.trim()) {
                              handleSendConversationMessage();
                            }
                          }
                        }}
                        className="flex-1 min-h-[80px] bg-white dark:bg-slate-600"
                      />
                      <div className="flex flex-col gap-2">
                        <Button variant="outline" size="sm">
                          <Paperclip className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm"
                          onClick={handleSendConversationMessage}
                          disabled={!newMessageContent.trim()}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
                  <div className="text-center">
                    <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-gray-100">Select a conversation</h3>
                    <p className="text-sm">Choose a conversation from the list to start messaging</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-6 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Messaging Campaigns</h2>
            <Dialog open={showCreateCampaign} onOpenChange={setShowCreateCampaign}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Campaign
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Campaign</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="campaignName">Campaign Name *</Label>
                      <Input
                        id="campaignName"
                        placeholder="Enter campaign name"
                        value={newCampaign.name}
                        onChange={(e) => setNewCampaign(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="campaignType">Campaign Type</Label>
                      <Select 
                        value={newCampaign.type} 
                        onValueChange={(value: "email" | "sms" | "both") => 
                          setNewCampaign(prev => ({ ...prev, type: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="sms">SMS</SelectItem>
                          <SelectItem value="both">Email & SMS</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="campaignSubject">Subject Line *</Label>
                    <Input
                      id="campaignSubject"
                      placeholder="Enter subject line"
                      value={newCampaign.subject}
                      onChange={(e) => setNewCampaign(prev => ({ ...prev, subject: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="campaignContent">Message Content *</Label>
                    <Textarea
                      id="campaignContent"
                      placeholder="Enter your campaign message content..."
                      rows={6}
                      value={newCampaign.content}
                      onChange={(e) => setNewCampaign(prev => ({ ...prev, content: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="campaignTemplate">Template</Label>
                    <Select 
                      value={newCampaign.template} 
                      onValueChange={(value) => 
                        setNewCampaign(prev => ({ ...prev, template: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="appointment_reminder">Appointment Reminder</SelectItem>
                        <SelectItem value="health_tip">Health Tip</SelectItem>
                        <SelectItem value="vaccination_reminder">Vaccination Reminder</SelectItem>
                        <SelectItem value="follow_up">Follow-up Care</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowCreateCampaign(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleCreateCampaign}
                      disabled={createCampaignMutation.isPending}
                    >
                      {createCampaignMutation.isPending ? "Creating..." : "Create Campaign"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {!campaigns || campaigns.length === 0 ? (
              <Card className="col-span-2">
                <CardContent className="p-8 text-center">
                  <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No campaigns yet</h3>
                  <p className="text-sm text-gray-600">Create your first messaging campaign to engage patients and staff.</p>
                </CardContent>
              </Card>
            ) : (
              campaigns.map((campaign: Campaign) => (
                <Card key={campaign.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{campaign.name}</CardTitle>
                      <Badge className={getCampaignStatusColor(campaign.status)}>
                        {campaign.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        {campaign.type === 'email' ? <Mail className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
                        <span className="text-sm font-medium">{campaign.subject}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Recipients:</span>
                          <span className="ml-2 font-medium">{campaign.recipientCount}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Sent:</span>
                          <span className="ml-2 font-medium">{campaign.sentCount}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Open Rate:</span>
                          <span className="ml-2 font-medium">{campaign.openRate}%</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Click Rate:</span>
                          <span className="ml-2 font-medium">{campaign.clickRate}%</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-3 border-t">
                        <Button variant="outline" size="sm">Edit</Button>
                        <Button variant="outline" size="sm">Duplicate</Button>
                        <Button variant="outline" size="sm">
                          <Archive className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Message Templates</h2>
            <Dialog open={showCreateTemplate} onOpenChange={setShowCreateTemplate}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Template</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="templateName">Template Name *</Label>
                      <Input
                        id="templateName"
                        placeholder="Enter template name"
                        value={newTemplate.name}
                        onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category">Category *</Label>
                      <Select
                        value={newTemplate.category}
                        onValueChange={(value) => setNewTemplate({ ...newTemplate, category: value as any })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="medical">Medical</SelectItem>
                          <SelectItem value="preventive">Preventive</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                          <SelectItem value="onboarding">Onboarding</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject *</Label>
                    <Input
                      id="subject"
                      placeholder="Enter subject line"
                      value={newTemplate.subject}
                      onChange={(e) => setNewTemplate({ ...newTemplate, subject: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="content">Message Content *</Label>
                    <Textarea
                      id="content"
                      placeholder="Enter message content. Use {{variableName}} for dynamic content."
                      rows={8}
                      value={newTemplate.content}
                      onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                    />
                    <p className="text-xs text-gray-500">Tip: Use placeholders like {'{{patientName}}'}, {'{{date}}'}, {'{{doctorName}}'} for dynamic content</p>
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowCreateTemplate(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleCreateTemplate}
                      disabled={createTemplateMutation.isPending}
                    >
                      {createTemplateMutation.isPending ? "Creating..." : "Create Template"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {templatesLoading ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center py-8 text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p>Loading templates...</p>
                </div>
              </CardContent>
            </Card>
          ) : !templates || templates.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center py-8 text-gray-500">
                  <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No Templates Yet</h3>
                  <p className="mb-4">Create your first message template to get started.</p>
                  <Button onClick={() => setShowCreateTemplate(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((template: any) => (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                      </div>
                      <Badge variant={template.category === 'urgent' ? 'destructive' : 'secondary'}>
                        {template.category}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Subject:</p>
                      <p className="text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100 p-2 rounded">{template.subject}</p>
                    </div>
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Preview:</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">
                        {template.content.substring(0, 100)}...
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>Used {template.usageCount || 0} times</span>
                      <span>Updated {new Date(template.updatedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 pt-3 border-t mt-3">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleUseTemplate(template)}
                        data-testid={`button-use-template-${template.id}`}
                      >
                        Use Template
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditTemplate(template)}
                        data-testid={`button-edit-template-${template.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleCopyTemplate(template)}
                        disabled={copyTemplateMutation.isPending}
                        data-testid={`button-copy-template-${template.id}`}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Use Template Dialog */}
          <Dialog open={showUseTemplate} onOpenChange={setShowUseTemplate}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Send Template to All Users</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Template Details</h4>
                  {selectedTemplate && (
                    <>
                      <p className="text-sm text-blue-800 dark:text-blue-200"><strong>Name:</strong> {selectedTemplate.name}</p>
                      <p className="text-sm text-blue-800 dark:text-blue-200"><strong>Subject:</strong> {selectedTemplate.subject}</p>
                      <p className="text-sm text-blue-800 dark:text-blue-200 mt-2"><strong>Content Preview:</strong></p>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">{selectedTemplate.content.substring(0, 200)}...</p>
                    </>
                  )}
                </div>
                
                <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-md">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Email Recipients ({allUsers?.length || 0} users)</h4>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {allUsers && allUsers.length > 0 ? (
                      allUsers.map((user: any) => (
                        <div key={user.id} className="flex items-center justify-between text-sm py-1 px-2 bg-white dark:bg-slate-700 rounded">
                          <span className="text-gray-700 dark:text-gray-200">{user.firstName} {user.lastName}</span>
                          <span className="text-gray-500 dark:text-gray-400 text-xs">{user.email}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">Loading users...</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowUseTemplate(false)}
                    data-testid="button-cancel-use-template"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleConfirmUseTemplate}
                    disabled={useTemplateMutation.isPending}
                    data-testid="button-send-template"
                  >
                    {useTemplateMutation.isPending ? "Sending..." : "Send to All Users"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Edit Template Dialog */}
          <Dialog open={showEditTemplate} onOpenChange={setShowEditTemplate}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Template</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="editTemplateName">Template Name *</Label>
                    <Input
                      id="editTemplateName"
                      placeholder="Enter template name"
                      value={editingTemplate.name}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                      data-testid="input-edit-template-name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="editCategory">Category *</Label>
                    <Select
                      value={editingTemplate.category}
                      onValueChange={(value) => setEditingTemplate({ ...editingTemplate, category: value as any })}
                    >
                      <SelectTrigger data-testid="select-edit-category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="medical">Medical</SelectItem>
                        <SelectItem value="preventive">Preventive</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="onboarding">Onboarding</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editSubject">Subject *</Label>
                  <Input
                    id="editSubject"
                    placeholder="Enter subject line"
                    value={editingTemplate.subject}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                    data-testid="input-edit-template-subject"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editContent">Message Content *</Label>
                  <Textarea
                    id="editContent"
                    placeholder="Enter message content. Use {{variableName}} for dynamic content."
                    rows={8}
                    value={editingTemplate.content}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, content: e.target.value })}
                    data-testid="textarea-edit-template-content"
                  />
                  <p className="text-xs text-gray-500">Tip: Use placeholders like {'{{patientName}}'}, {'{{date}}'}, {'{{doctorName}}'} for dynamic content</p>
                </div>

                <div className="flex justify-end gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowEditTemplate(false)}
                    data-testid="button-cancel-edit-template"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleConfirmEditTemplate}
                    disabled={editTemplateMutation.isPending}
                    data-testid="button-save-edit-template"
                  >
                    {editTemplateMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Messaging Analytics</h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Search className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <Button variant="outline" size="sm">
                Export Report
              </Button>
            </div>
          </div>

          {analyticsLoading ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center py-8 text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p>Loading analytics...</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Key Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Messages</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{analytics.totalMessages || 2847}</p>
                      </div>
                      <div className="h-8 w-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                        <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                    <div className="mt-2 flex items-center text-xs">
                      <span className="text-green-600 dark:text-green-400 font-medium">+12.5%</span>
                      <span className="text-gray-500 dark:text-gray-400 ml-1">from last month</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Response Rate</p>
                        <p className="text-2xl font-bold">{analytics.responseRate || '94.2%'}</p>
                      </div>
                      <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCheck className="h-4 w-4 text-green-600" />
                      </div>
                    </div>
                    <div className="mt-2 flex items-center text-xs">
                      <span className="text-green-600 font-medium">+2.1%</span>
                      <span className="text-gray-500 ml-1">from last month</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
                        <p className="text-2xl font-bold">{analytics.avgResponseTime || '4.2h'}</p>
                      </div>
                      <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
                        <Clock className="h-4 w-4 text-orange-600" />
                      </div>
                    </div>
                    <div className="mt-2 flex items-center text-xs">
                      <span className="text-red-600 font-medium">+0.3h</span>
                      <span className="text-gray-500 ml-1">from last month</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Campaign Reach</p>
                        <p className="text-2xl font-bold">{analytics.campaignReach || '18.5K'}</p>
                      </div>
                      <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <Users className="h-4 w-4 text-purple-600" />
                      </div>
                    </div>
                    <div className="mt-2 flex items-center text-xs">
                      <span className="text-green-600 font-medium">+18.7%</span>
                      <span className="text-gray-500 ml-1">from last month</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts and Details */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Message Volume Trends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Internal Messages</span>
                        <span className="font-medium">1,254</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: '65%' }}></div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Patient Messages</span>
                        <span className="font-medium">892</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-green-600 h-2 rounded-full" style={{ width: '45%' }}></div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Broadcast Messages</span>
                        <span className="font-medium">701</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-purple-600 h-2 rounded-full" style={{ width: '35%' }}></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Template Usage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {templates.slice(0, 4).map((template: any, index: number) => (
                        <div key={template.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                            <span className="text-sm text-gray-700 dark:text-gray-300">{template.name}</span>
                          </div>
                          <span className="text-sm font-medium">{template.usageCount}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Messaging Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <Mail className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Campaign "Flu Vaccination Reminder" sent</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Reached 1,240 patients • 2 hours ago</p>
                      </div>
                      <Badge variant="outline">Completed</Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <MessageSquare className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Template "Lab Results Available" used 12 times</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">High engagement rate • 4 hours ago</p>
                      </div>
                      <Badge variant="secondary">Active</Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                        <Users className="h-4 w-4 text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Bulk message sent to Cardiology department</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">45 recipients • 6 hours ago</p>
                      </div>
                      <Badge variant="outline">Delivered</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Active Video Call Interface */}
      {activeVideoCall && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg w-full max-w-4xl h-3/4 flex flex-col">
            {/* Video Call Header */}
            <div className="bg-gray-900 text-white p-4 rounded-t-lg flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Video className="h-5 w-5" />
                <div>
                  <h3 className="font-semibold">Video Call with {callParticipant}</h3>
                  <p className="text-sm text-gray-300">Duration: {formatCallDuration(callDuration)} • Powered by BigBlueButton</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-green-400 text-sm">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  Live Meeting
                </span>
              </div>
            </div>

            {/* Video Call Main Area */}
            <div className="flex-1 bg-gray-100 relative flex items-center justify-center">
              {/* Enhanced video feed with realistic effects */}
              <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 relative overflow-hidden">
                {/* Video simulation with movement */}
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 via-purple-500 to-indigo-600 animate-pulse"></div>
                
                {/* Connection quality overlay */}
                <div className="absolute top-4 left-4 bg-black bg-opacity-60 rounded-lg px-3 py-2 z-10">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-1 h-3 bg-green-400 rounded animate-pulse"></div>
                      <div className="w-1 h-4 bg-green-400 rounded animate-pulse delay-75"></div>
                      <div className="w-1 h-5 bg-green-400 rounded animate-pulse delay-150"></div>
                      <div className="w-1 h-4 bg-green-400 rounded animate-pulse delay-200"></div>
                    </div>
                    <span className="text-white text-xs font-medium">HD • Secure</span>
                  </div>
                </div>

                {/* Participant info */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className="w-32 h-32 bg-white bg-opacity-25 rounded-full flex items-center justify-center mb-6 mx-auto shadow-2xl animate-bounce">
                      <span className="text-4xl font-bold">{callParticipant.charAt(0).toUpperCase()}</span>
                    </div>
                    <h3 className="text-3xl font-bold mb-2 drop-shadow-lg">{callParticipant}</h3>
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                      <p className="text-lg font-medium">Connected • Speaking</p>
                    </div>
                    <p className="text-sm opacity-90 bg-black bg-opacity-30 px-3 py-1 rounded-full mb-3">Patient Consultation Session</p>
                    <div className="bg-blue-600 bg-opacity-80 px-4 py-2 rounded-lg">
                      <p className="text-sm font-medium">✓ BigBlueButton meeting is active in new window</p>
                      <p className="text-xs opacity-90">Switch to the meeting window for full video conference</p>
                    </div>
                  </div>
                </div>

                {/* Audio visualization bars */}
                <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 flex space-x-1">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-green-400 rounded-full animate-pulse"
                      style={{
                        height: `${Math.random() * 20 + 10}px`,
                        animationDelay: `${i * 0.1}s`,
                        animationDuration: '0.8s'
                      }}
                    ></div>
                  ))}
                </div>
                
                {/* Enhanced self video (small corner) */}
                <div className="absolute bottom-4 right-4 w-52 h-40 rounded-lg border-2 border-white overflow-hidden shadow-2xl z-20">
                  {isVideoOn ? (
                    <div className="w-full h-full bg-gradient-to-br from-green-500 to-emerald-600 relative">
                      {/* Simulated camera feed */}
                      <div className="absolute inset-0 bg-gradient-to-tl from-green-600 to-blue-500 animate-pulse opacity-75"></div>
                      <div className="absolute inset-0 flex items-center justify-center text-white">
                        <div className="text-center">
                          <div className="w-16 h-16 bg-white bg-opacity-40 rounded-full flex items-center justify-center mb-2 mx-auto animate-pulse">
                            <span className="text-xl font-bold">YOU</span>
                          </div>
                          <p className="text-xs font-medium bg-black bg-opacity-30 px-2 py-1 rounded">Camera Active</p>
                        </div>
                      </div>
                      {/* Microphone indicator */}
                      {!isMuted && (
                        <div className="absolute top-2 left-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
                          <span className="text-xs">🎤</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-full bg-gray-700 flex items-center justify-center text-white text-center relative">
                      <div>
                        <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mb-2 mx-auto">
                          <span className="text-xl">📹</span>
                        </div>
                        <p className="text-xs">Camera Off</p>
                      </div>
                      {/* Microphone indicator when video is off */}
                      {!isMuted && (
                        <div className="absolute top-2 left-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
                          <span className="text-xs">🎤</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Video Call Controls */}
            <div className="bg-gray-800 p-4 rounded-b-lg flex justify-center items-center gap-4">
              <Button 
                onClick={toggleMute}
                variant="outline" 
                size="sm" 
                className={`text-white border-gray-600 hover:bg-gray-600 ${isMuted ? 'bg-red-600' : 'bg-gray-700'}`}
              >
                {isMuted ? '🔇' : '🎤'}
              </Button>
              <Button 
                onClick={toggleVideo}
                variant="outline" 
                size="sm" 
                className={`text-white border-gray-600 hover:bg-gray-600 ${!isVideoOn ? 'bg-red-600' : 'bg-gray-700'}`}
              >
                {isVideoOn ? '📹' : '📵'}
              </Button>
              <Button variant="outline" size="sm" className="bg-gray-700 text-white border-gray-600 hover:bg-gray-600">
                🖥️
              </Button>
              <Button variant="outline" size="sm" className="bg-gray-700 text-white border-gray-600 hover:bg-gray-600">
                💬
              </Button>
              <Button 
                onClick={handleEndVideoCall}
                className="bg-red-600 hover:bg-red-700 text-white px-6"
              >
                End Call
              </Button>
              <Button variant="outline" size="sm" className="bg-gray-700 text-white border-gray-600 hover:bg-gray-600">
                ⚙️
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}