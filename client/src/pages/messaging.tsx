import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
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
  Star,
  Archive,
  Trash2
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

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
    id: string;
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
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessageContent, setNewMessageContent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [messageFilter, setMessageFilter] = useState("all");
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    type: "email" as "email" | "sms" | "both",
    subject: "",
    content: "",
    template: "default"
  });
  const [newMessage, setNewMessage] = useState({
    recipient: "",
    subject: "",
    content: "",
    priority: "normal" as "low" | "normal" | "high" | "urgent",
    type: "internal" as "internal" | "patient" | "broadcast"
  });
  const { toast } = useToast();

  const { data: conversations = [], isLoading: conversationsLoading } = useQuery({
    queryKey: ['/api/messaging/conversations'],
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['/api/messaging/messages', selectedConversation],
    enabled: !!selectedConversation,
  });

  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery({
    queryKey: ['/api/messaging/campaigns'],
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: any) => {
      const response = await fetch('/api/messaging/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messaging/messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/messaging/conversations'] });
      setNewMessageContent("");
      setShowNewMessage(false);
      resetNewMessage();
      toast({
        title: "Message Sent",
        description: "Your message has been sent successfully.",
      });
    }
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (campaignData: any) => {
      const response = await fetch('/api/messaging/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignData),
      });
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

  const handleSendNewMessage = () => {
    if (!newMessage.recipient.trim() || !newMessage.subject.trim() || !newMessage.content.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    sendMessageMutation.mutate({
      recipientId: newMessage.recipient,
      subject: newMessage.subject,
      content: newMessage.content,
      priority: newMessage.priority,
      type: newMessage.type
    });
  };

  const resetNewMessage = () => {
    setNewMessage({
      recipient: "",
      subject: "",
      content: "",
      priority: "normal",
      type: "internal"
    });
  };

  const filteredConversations = conversations.filter((conv: Conversation) => {
    if (messageFilter === "unread" && conv.unreadCount === 0) return false;
    if (messageFilter === "patients" && !conv.isPatientConversation) return false;
    if (messageFilter === "staff" && conv.isPatientConversation) return false;
    if (searchQuery && !conv.lastMessage.subject.toLowerCase().includes(searchQuery.toLowerCase())) return false;
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
      case 'sent': return 'bg-green-100 text-green-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (conversationsLoading || campaignsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Messaging Center</h1>
          <p className="text-gray-600 mt-1">Secure communication with patients and staff</p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm">
            <Video className="h-4 w-4 mr-2" />
            Video Call
          </Button>
          <Dialog open={showNewMessage} onOpenChange={setShowNewMessage}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Message
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Compose New Message</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="messageRecipient">Recipient *</Label>
                    <Input
                      id="messageRecipient"
                      placeholder="Enter recipient name or ID"
                      value={newMessage.recipient}
                      onChange={(e) => setNewMessage(prev => ({ ...prev, recipient: e.target.value }))}
                    />
                  </div>
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
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="conversations" className="space-y-6">
          <div className="grid grid-cols-12 gap-6 h-[700px]">
            {/* Conversations List */}
            <div className="col-span-4 border rounded-lg">
              <div className="p-4 border-b">
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
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

              <ScrollArea className="h-[580px]">
                <div className="p-2">
                  {filteredConversations.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No conversations found</p>
                    </div>
                  ) : (
                    filteredConversations.map((conversation: Conversation) => (
                      <div
                        key={conversation.id}
                        className={`p-3 rounded-lg cursor-pointer mb-2 transition-colors ${
                          selectedConversation === conversation.id
                            ? 'bg-blue-50 border-blue-200'
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedConversation(conversation.id)}
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>
                              {conversation.participants[0]?.name?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-medium text-sm truncate">
                                {conversation.participants[0]?.name}
                              </p>
                              <div className="flex items-center gap-1">
                                {conversation.isPatientConversation && (
                                  <Badge variant="outline" className="text-xs">Patient</Badge>
                                )}
                                {conversation.unreadCount > 0 && (
                                  <Badge className="text-xs bg-red-500">
                                    {conversation.unreadCount}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-gray-600 truncate">
                              {conversation.lastMessage.subject}
                            </p>
                            <p className="text-xs text-gray-500">
                              {format(new Date(conversation.lastMessage.timestamp), 'MMM d, HH:mm')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Message Thread */}
            <div className="col-span-8 border rounded-lg flex flex-col">
              {selectedConversation ? (
                <>
                  {/* Message Header */}
                  <div className="p-4 border-b flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {conversations.find((c: Conversation) => c.id === selectedConversation)
                            ?.participants[0]?.name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium">
                          {conversations.find((c: Conversation) => c.id === selectedConversation)
                            ?.participants[0]?.name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {conversations.find((c: Conversation) => c.id === selectedConversation)
                            ?.participants[0]?.role}
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
                      {messages.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No messages in this conversation</p>
                        </div>
                      ) : (
                        messages.map((message: Message) => (
                          <div key={message.id} className="flex gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {message.senderName.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">{message.senderName}</span>
                                <span className="text-xs text-gray-500">
                                  {format(new Date(message.timestamp), 'MMM d, HH:mm')}
                                </span>
                                <div className={`w-2 h-2 rounded-full ${getPriorityColor(message.priority)}`}></div>
                              </div>
                              <div className="bg-gray-50 rounded-lg p-3">
                                <p className="text-sm">{message.content}</p>
                                {message.attachments && message.attachments.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    {message.attachments.map((attachment) => (
                                      <div key={attachment.id} className="flex items-center gap-2 text-xs">
                                        <Paperclip className="h-3 w-3" />
                                        <span>{attachment.name}</span>
                                        <span className="text-gray-500">({(attachment.size / 1024).toFixed(1)} KB)</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>

                  {/* Message Composer */}
                  <div className="p-4 border-t">
                    <div className="flex gap-3">
                      <Textarea
                        placeholder="Type your message..."
                        value={newMessageContent}
                        onChange={(e) => setNewMessageContent(e.target.value)}
                        className="flex-1 min-h-[80px]"
                      />
                      <div className="flex flex-col gap-2">
                        <Button variant="outline" size="sm">
                          <Paperclip className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => sendMessageMutation.mutate({
                            conversationId: selectedConversation,
                            content: newMessageContent,
                            priority: 'normal'
                          })}
                          disabled={!newMessageContent.trim() || sendMessageMutation.isPending}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
                    <p className="text-sm">Choose a conversation from the list to start messaging</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Messaging Campaigns</h2>
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
            {campaigns.length === 0 ? (
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
          <Card>
            <CardHeader>
              <CardTitle>Message Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Message templates will be available here.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Messaging Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Messaging analytics will be displayed here.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}