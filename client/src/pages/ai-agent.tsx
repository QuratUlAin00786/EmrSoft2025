import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  Bot, 
  User, 
  Send, 
  Calendar, 
  Pill, 
  Clock, 
  Stethoscope,
  FileText,
  Sparkles,
  MessageCircle,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  data?: any;
}

interface Prescription {
  id: string;
  patientName: string;
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
  }>;
  diagnosis: string;
  status: string;
  prescribedAt: string;
}

interface Appointment {
  id: string;
  patientName: string;
  providerName: string;
  title: string;
  scheduledAt: string;
  status: string;
  duration: number;
}

export default function AIAgentPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: "Hello! I'm your Cura AI Assistant. I can help you:\n\n📅 **Book appointments** - Schedule consultations with doctors\n💊 **Find prescriptions** - Search and view patient medications\n\nHow can I assist you today?",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Send to AI agent endpoint
      const response = await apiRequest("POST", "/api/ai-agent/chat", {
        message: input,
        conversationHistory: messages.slice(-5) // Send last 5 messages for context
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response.message,
        timestamp: new Date(),
        data: response.data
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Show success toast if action was performed
      if (response.action) {
        toast({
          title: "Action Completed",
          description: response.actionDescription,
        });
      }

    } catch (error) {
      console.error("AI Agent error:", error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: "I apologize, but I'm having trouble processing your request right now. Please try again or contact support if the issue persists.",
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);

      toast({
        title: "Error",
        description: "Failed to process your request",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessageContent = (content: string) => {
    // Simple markdown-like formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br />');
  };

  const renderPrescriptionCard = (prescription: Prescription) => (
    <Card key={prescription.id} className="mt-2 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/30">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <Pill className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            {prescription.patientName}
          </CardTitle>
          <Badge variant={prescription.status === 'signed' ? 'default' : 'secondary'}>
            {prescription.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
          <strong>Diagnosis:</strong> {prescription.diagnosis}
        </p>
        <div className="space-y-1">
          {prescription.medications.map((med, idx) => (
            <div key={idx} className="text-sm text-gray-900 dark:text-gray-100">
              <strong>{med.name}</strong> - {med.dosage} ({med.frequency})
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Prescribed: {format(new Date(prescription.prescribedAt), 'PPp')}
        </p>
      </CardContent>
    </Card>
  );

  const renderAppointmentCard = (appointment: Appointment) => (
    <Card key={appointment.id} className="mt-2 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/30">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />
            {appointment.title}
          </CardTitle>
          <Badge variant={appointment.status === 'scheduled' ? 'default' : 'secondary'}>
            {appointment.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          <strong>Patient:</strong> {appointment.patientName}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          <strong>Provider:</strong> {appointment.providerName}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {format(new Date(appointment.scheduledAt), 'PPp')} ({appointment.duration} mins)
        </p>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Cura AI Assistant</h1>
            <p className="text-gray-600 dark:text-gray-300">Intelligent appointment booking and prescription management</p>
          </div>
        </div>
      </div>

      <Card className="h-[600px] flex flex-col">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 border-b">
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <MessageCircle className="h-5 w-5" />
            Chat with AI Assistant
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.type === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`flex gap-3 max-w-[80%] ${
                      message.type === 'user' ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        message.type === 'user'
                          ? 'bg-blue-600'
                          : 'bg-gradient-to-r from-purple-500 to-blue-500'
                      }`}
                    >
                      {message.type === 'user' ? (
                        <User className="h-4 w-4 text-white" />
                      ) : (
                        <Bot className="h-4 w-4 text-white" />
                      )}
                    </div>

                    <div className="flex flex-col">
                      <div
                        className={`px-4 py-2 rounded-lg ${
                          message.type === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-gray-100'
                        }`}
                      >
                        <div
                          dangerouslySetInnerHTML={{
                            __html: formatMessageContent(message.content)
                          }}
                        />
                      </div>

                      {/* Render data cards if present */}
                      {message.data && (
                        <div className="mt-2">
                          {message.data.prescriptions && (
                            <div>
                              {message.data.prescriptions.map((prescription: Prescription) =>
                                renderPrescriptionCard(prescription)
                              )}
                            </div>
                          )}
                          {message.data.appointments && (
                            <div>
                              {message.data.appointments.map((appointment: Appointment) =>
                                renderAppointmentCard(appointment)
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {format(message.timestamp, 'HH:mm')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="bg-gray-100 dark:bg-slate-700 px-4 py-2 rounded-lg">
                    <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <Separator />

          <div className="p-4">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me to book an appointment, find prescriptions, or help with other tasks..."
                className="flex-1"
                disabled={isLoading}
              />
              <Button 
                onClick={handleSendMessage} 
                disabled={!input.trim() || isLoading}
                size="icon"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>

            <div className="flex gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Book appointments
              </div>
              <div className="flex items-center gap-1">
                <Pill className="h-3 w-3" />
                Find prescriptions
              </div>
              <div className="flex items-center gap-1">
                <Stethoscope className="h-3 w-3" />
                Medical queries
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}