import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  Bot, 
  User, 
  Send, 
  Calendar, 
  Pill, 
  X,
  MessageCircle,
  Loader2,
  Minimize2,
  Maximize2,
  Mic,
  MicOff
} from "lucide-react";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Simple type for our speech recognition usage
type CustomSpeechRecognition = any;

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

export function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
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
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<CustomSpeechRecognition | null>(null);
  const [transcriptBuffer, setTranscriptBuffer] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && ((window as any).webkitSpeechRecognition || (window as any).SpeechRecognition)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;
      
      recognition.onstart = () => {
        console.log('Speech recognition started successfully');
        setIsListening(true);
        setTranscriptBuffer("");
      };
      
      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        // Process all results to get current transcript
        for (let i = 0; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        // Combine final and interim transcripts
        const currentTranscript = (finalTranscript + ' ' + interimTranscript).trim();
        
        // Only update if we have new content and aren't duplicating
        if (currentTranscript && !input.includes(currentTranscript)) {
          if (interimTranscript) {
            // Show interim results with brackets
            setInput(prev => {
              const withoutBrackets = prev.replace(/\s*\[.*?\]\s*$/, '').trim();
              return withoutBrackets + (withoutBrackets ? ' ' : '') + '[' + currentTranscript + ']';
            });
          } else if (finalTranscript) {
            // Finalize the transcript without brackets
            setInput(prev => {
              const withoutBrackets = prev.replace(/\s*\[.*?\]\s*$/, '').trim();
              return withoutBrackets + (withoutBrackets ? ' ' : '') + currentTranscript;
            });
          }
        }
      };
      
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        
        // Handle different error types appropriately
        if (event.error === 'no-speech') {
          // Don't treat no-speech as a critical error, just stop gracefully
          console.log('No speech detected, stopping recognition');
        } else if (event.error === 'aborted') {
          // Recognition was manually stopped, don't log as error
          console.log('Speech recognition aborted');
        } else if (event.error === 'network') {
          toast({
            title: "Network Error",
            description: "Check your internet connection for voice recognition",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Voice Recognition Error",
            description: `Recognition failed: ${event.error}`,
            variant: "destructive",
          });
        }
        
        setIsListening(false);
      };
      
      recognition.onend = () => {
        console.log('Speech recognition ended');
        setIsListening(false);
      };
      
      setRecognition(recognition);
    }
  }, [toast, transcriptBuffer]);

  const handleSendMessage = async () => {
    // Get clean final message
    const finalMessage = input.trim();
    if (!finalMessage || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: finalMessage,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setTranscriptBuffer(""); // Clear transcript buffer

    try {
      const response = await apiRequest("POST", "/api/chatbot/chat", {
        messages: [...messages.slice(-5).map(msg => ({
          role: msg.type,
          content: msg.content
        })), { role: 'user', content: finalMessage }] // Send conversation history with current message
      });

      const responseData = await response.json();

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: responseData.response || responseData.message || "I apologize, but I didn't receive a proper response. Please try again.",
        timestamp: new Date(),
        data: responseData.data
      };

      setMessages(prev => [...prev, aiMessage]);

      // Show success toast for actions
      if (responseData.action) {
        toast({
          title: "Action Completed",
          description: responseData.actionDescription,
        });
      }

      // Invalidate caches if appointment was successfully created
      if ((responseData.response && responseData.response.includes('Appointment Successfully Booked')) ||
          (responseData.message && (responseData.message.includes("Appointment Successfully Booked") || 
           responseData.message.includes("✅") || responseData.message.includes("appointment has been created")))) {
        
        console.log("[AI Chat] Successful appointment detected - invalidating caches");
        
        // Complete cache reset and refetch with aggressive invalidation
        await Promise.all([
          queryClient.removeQueries({ queryKey: ['/api/appointments'] }),
          queryClient.removeQueries({ queryKey: ['/api/patients'] }),
          queryClient.removeQueries({ queryKey: ['/api/users'] }),
          queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] })
        ]);
        
        // Force immediate refetch of all dependencies
        await Promise.all([
          queryClient.refetchQueries({ queryKey: ['/api/appointments'] }),
          queryClient.refetchQueries({ queryKey: ['/api/patients'] }),
          queryClient.refetchQueries({ queryKey: ['/api/users'] }),
          queryClient.refetchQueries({ queryKey: ['/api/dashboard/stats'] })
        ]);
        
        console.log("[AI Chat] Complete cache invalidation and refetch completed");
      }

    } catch (error) {
      console.error("AI Chat error:", error);
      
      // More specific error handling
      let errorContent = "I apologize, but I'm having trouble processing your request right now. Please try again.";
      let errorTitle = "Connection Error";
      let errorDescription = "Unable to reach AI assistant. Please check your connection.";
      
      if (error instanceof Error) {
        if (error.message.includes('401')) {
          errorContent = "Please log in again to continue using the AI assistant.";
          errorTitle = "Authentication Required";
          errorDescription = "Your session may have expired.";
        } else if (error.message.includes('500')) {
          errorContent = "The AI service is temporarily unavailable. Please try again in a moment.";
          errorTitle = "Service Unavailable";
          errorDescription = "AI service is experiencing issues.";
        }
      }
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: errorContent,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: errorTitle,
        description: errorDescription,
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

  const startVoiceRecognition = () => {
    if (!recognition) {
      console.error("Speech recognition not available");
      return;
    }

    // Only start if not already listening
    if (isListening) {
      console.log("Speech recognition already active");
      return;
    }

    try {
      setTranscriptBuffer("");
      // Clear any existing input when starting voice recognition to prevent mixing
      setInput("");
      recognition.start();
    } catch (error: any) {
      console.error("Error starting voice recognition:", error);
      
      // Handle specific "already started" error
      if (error.message && error.message.includes('already started')) {
        // Force stop and reset state
        setIsListening(false);
        try {
          recognition.stop();
          // Wait longer before restarting
          setTimeout(() => {
            if (recognition && !isListening) {
              try {
                recognition.start();
              } catch (retryError) {
                console.error("Retry failed:", retryError);
              }
            }
          }, 500);
        } catch (stopError) {
          console.error("Failed to stop recognition:", stopError);
        }
      } else {
        toast({
          title: "Voice Recognition Error",
          description: "Unable to start voice recognition. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const stopVoiceRecognition = () => {
    if (!recognition) {
      console.error("Speech recognition not available");
      return;
    }

    try {
      if (isListening) {
        recognition.stop();
        console.log("Voice recognition stop requested");
      }
    } catch (error) {
      console.error("Error stopping voice recognition:", error);
    }
    
    // Always reset state regardless of current listening status
    setIsListening(false);
    
    // Clean up any interim text in brackets and finalize transcript
    setInput(prev => {
      // Remove interim text in brackets and clean up
      const cleanedText = prev.replace(/\s*\[.*?\]\s*$/, '').trim();
      // Combine with any accumulated transcript buffer
      const finalText = transcriptBuffer ? 
        (cleanedText + (cleanedText ? ' ' : '') + transcriptBuffer).trim() : 
        cleanedText;
      return finalText;
    });
    
    setTranscriptBuffer("");
  };

  const quickActions = [
    {
      label: "Book Appointment",
      icon: Calendar,
      message: "I need to book an appointment"
    },
    {
      label: "Find Prescriptions", 
      icon: Pill,
      message: "Show me prescription information"
    }
  ];

  const handleQuickAction = (message: string) => {
    setInput(message);
    handleSendMessage();
  };

  const renderPrescriptions = (prescriptions: Prescription[]) => (
    <div className="mt-4 space-y-3">
      <h4 className="font-semibold text-sm text-muted-foreground">Found Prescriptions:</h4>
      {prescriptions.slice(0, 3).map((prescription) => (
        <Card key={prescription.id} className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-2">
              <h5 className="font-semibold text-sm">{prescription.patientName}</h5>
              <Badge variant={prescription.status === 'active' ? 'default' : 'secondary'}>
                {prescription.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-2">{prescription.diagnosis}</p>
            <div className="space-y-1">
              {prescription.medications.slice(0, 2).map((med, idx) => (
                <div key={idx} className="text-sm">
                  <span className="font-medium">{med.name}</span> - {med.dosage} ({med.frequency})
                </div>
              ))}
              {prescription.medications.length > 2 && (
                <p className="text-xs text-muted-foreground">
                  +{prescription.medications.length - 2} more medications
                </p>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Prescribed: {format(new Date(prescription.prescribedAt), 'MMM dd, yyyy')}
            </p>
          </CardContent>
        </Card>
      ))}
      {prescriptions.length > 3 && (
        <p className="text-xs text-muted-foreground text-center">
          +{prescriptions.length - 3} more prescriptions found
        </p>
      )}
    </div>
  );

  const renderAppointments = (appointments: Appointment[]) => (
    <div className="mt-4 space-y-3">
      <h4 className="font-semibold text-sm text-muted-foreground">Scheduled Appointments:</h4>
      {appointments.slice(0, 3).map((appointment) => (
        <Card key={appointment.id} className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-2">
              <h5 className="font-semibold text-sm">{appointment.title}</h5>
              <Badge variant={appointment.status === 'scheduled' ? 'default' : 'secondary'}>
                {appointment.status}
              </Badge>
            </div>
            <p className="text-sm">{appointment.patientName}</p>
            <p className="text-sm text-muted-foreground">{appointment.providerName}</p>
            <p className="text-sm font-medium mt-2">
              {format(new Date(appointment.scheduledAt), 'MMM dd, yyyy - h:mm a')}
            </p>
            <p className="text-xs text-muted-foreground">Duration: {appointment.duration} minutes</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-[9999]">
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="rounded-full h-16 w-16 shadow-2xl hover:shadow-3xl transition-all duration-200 bg-primary hover:bg-primary/90 text-white"
          style={{ 
            backgroundColor: 'hsl(210, 100%, 46%)', 
            minHeight: '64px', 
            minWidth: '64px',
            position: 'relative',
            zIndex: 9999
          }}
        >
          <Bot className="h-7 w-7" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-[9999]" style={{ zIndex: 9999 }}>
      <Card className={`shadow-2xl transition-all duration-300 border-2 border-primary/20 ${
        isMinimized ? 'w-80 h-16' : 'w-96 h-[600px]'
      }`} style={{ position: 'relative', zIndex: 9999 }}>
        <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Cura AI Assistant</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
            >
              {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        {!isMinimized && (
          <CardContent className="p-4 pt-0 flex flex-col h-full">
            <ScrollArea className="flex-1 mb-4 max-h-[400px]">
              <div className="space-y-4 pr-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.type === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {message.type === 'assistant' && <Bot className="h-5 w-5 mt-0.5 flex-shrink-0" />}
                        {message.type === 'user' && <User className="h-5 w-5 mt-0.5 flex-shrink-0" />}
                        <div className="flex-1">
                          <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                          
                          {message.data?.prescriptions && renderPrescriptions(message.data.prescriptions)}
                          {message.data?.appointments && renderAppointments(message.data.appointments)}
                          
                          <div className="text-xs opacity-70 mt-2">
                            {format(message.timestamp, 'HH:mm')}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg p-3 flex items-center gap-2">
                      <Bot className="h-5 w-5" />
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {messages.length === 1 && (
              <div className="mb-4">
                <p className="text-sm text-muted-foreground mb-3">Quick actions:</p>
                <div className="flex flex-wrap gap-2">
                  {quickActions.map((action, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickAction(action.message)}
                      className="flex items-center gap-2"
                    >
                      <action.icon className="h-4 w-4" />
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything... (Press Enter to send, Shift+Enter for new line)"
                  disabled={isLoading || isListening}
                  className="pr-10 min-h-[40px] max-h-[120px] resize-none"
                  rows={1}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={isListening ? stopVoiceRecognition : startVoiceRecognition}
                  disabled={isLoading || !recognition}
                  className={`absolute right-1 top-1 h-8 w-8 p-0 ${
                    isListening ? 'text-red-500 animate-pulse' : 'text-muted-foreground hover:text-primary'
                  }`}
                  title={isListening ? 'Stop recording' : 'Start voice input'}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                size="sm"
                title="Send message"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}