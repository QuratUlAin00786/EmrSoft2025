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
  intent?: string;
  entities?: any[];
  confidence?: number;
  medicalAdviceLevel?: 'none' | 'educational' | 'guidance' | 'referral';
  disclaimers?: string[];
  followUpQuestions?: string[];
  educationalContent?: string[];
  urgencyLevel?: 'low' | 'medium' | 'high' | 'critical';
  recommendedSpecialty?: string;
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
  
  // Debug useEffect to track input changes
  useEffect(() => {
    console.log('INPUT VALUE CHANGED TO:', `"${input}"`);
  }, [input]);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<CustomSpeechRecognition | null>(null);
  const [transcriptBuffer, setTranscriptBuffer] = useState("");
  const transcriptBufferRef = useRef("");
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
    if (typeof window !== 'undefined') {
      // Check for both webkit and standard versions
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        console.warn('Speech recognition not supported in this browser');
        return;
      }

      const recognition = new SpeechRecognition();
      
      // Configure recognition settings
      recognition.continuous = false; // Changed to false for better control
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;
      
      recognition.onstart = () => {
        console.log('Speech recognition started successfully');
        setIsListening(true);
        setTranscriptBuffer("");
        transcriptBufferRef.current = "";
      };
      
      recognition.onresult = (event: any) => {
        console.log('Speech recognition result received');
        let finalTranscript = '';
        let interimTranscript = '';
        
        // Process all results to get the complete transcript
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript.trim();
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
            console.log('Final transcript segment:', transcript);
          } else {
            interimTranscript += transcript + ' ';
            console.log('Interim transcript segment:', transcript);
          }
        }
        
        // Update input field with complete transcript
        if (finalTranscript) {
          // Final result: accumulate in buffer and set to input
          const newBuffer = (transcriptBufferRef.current + finalTranscript).trim();
          console.log('=== FINAL TRANSCRIPT ===');
          console.log('Previous buffer:', transcriptBufferRef.current);
          console.log('New final transcript:', finalTranscript);
          console.log('New buffer:', newBuffer);
          transcriptBufferRef.current = newBuffer;
          setTranscriptBuffer(newBuffer);
          setInput(newBuffer);
          console.log('Input state updated to:', newBuffer);
          console.log('========================');
        } else if (interimTranscript) {
          // Interim result: show current transcript buffer + interim in brackets for preview
          const currentBuffer = transcriptBufferRef.current.trim();
          const preview = currentBuffer + (currentBuffer ? ' ' : '') + '[' + interimTranscript.trim() + ']';
          console.log('Setting interim preview:', preview);
          setInput(preview);
        }
      };
      
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        
        // Handle different error types appropriately
        switch (event.error) {
          case 'no-speech':
            console.log('No speech detected, stopping gracefully');
            // Don't show error for no speech - this is normal
            break;
          case 'aborted':
            console.log('Speech recognition was stopped by user');
            break;
          case 'audio-capture':
            toast({
              title: "Microphone Error",
              description: "Unable to access microphone. Please check your settings.",
              variant: "destructive",
            });
            break;
          case 'not-allowed':
            toast({
              title: "Permission Denied",
              description: "Please allow microphone access to use voice recognition.",
              variant: "destructive",
            });
            break;
          case 'network':
            toast({
              title: "Network Error",
              description: "Check your internet connection for voice recognition.",
              variant: "destructive",
            });
            break;
          case 'service-not-allowed':
            toast({
              title: "Service Unavailable",
              description: "Speech recognition service is not available.",
              variant: "destructive",
            });
            break;
          default:
            toast({
              title: "Voice Recognition Error",
              description: `Recognition failed: ${event.error}`,
              variant: "destructive",
            });
        }
        
        setIsListening(false);
      };
      
      recognition.onend = () => {
        console.log('Speech recognition ended naturally');
        setIsListening(false);
        
        // Ensure final transcript is preserved in the input field  
        if (transcriptBufferRef.current.trim()) {
          setInput(transcriptBufferRef.current.trim());
          console.log('Final transcript preserved on end:', transcriptBufferRef.current.trim());
        }
      };
      
      setRecognition(recognition);
    }
  }, [toast]); // Removed transcriptBuffer dependency to prevent re-initialization

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
      const response = await apiRequest("POST", "/api/ai-agent/chat", {
        message: finalMessage,
        conversationHistory: messages.slice(-5).map(msg => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content
        }))
      });

      const responseData = await response.json();

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: responseData.response || responseData.message || "I apologize, but I didn't receive a proper response. Please try again.",
        timestamp: new Date(),
        data: responseData.data,
        intent: responseData.intent,
        entities: responseData.entities,
        confidence: responseData.confidence,
        medicalAdviceLevel: responseData.medicalAdviceLevel,
        disclaimers: responseData.disclaimers,
        followUpQuestions: responseData.followUpQuestions,
        educationalContent: responseData.educationalContent,
        urgencyLevel: responseData.urgencyLevel,
        recommendedSpecialty: responseData.recommendedSpecialty
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
      toast({
        title: "Voice Recognition Not Supported",
        description: "Your browser doesn't support voice recognition. Please type your message instead.",
        variant: "destructive",
      });
      return;
    }

    // Only start if not already listening
    if (isListening) {
      console.log("Speech recognition already active, skipping start request");
      return;
    }

    try {
      // Request microphone permissions explicitly
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => {
          console.log('Microphone access granted, starting speech recognition');
          setTranscriptBuffer("");
          setInput("");
          recognition.start();
        })
        .catch((permissionError) => {
          console.error('Microphone permission denied:', permissionError);
          toast({
            title: "Microphone Access Required",
            description: "Please allow microphone access to use voice recognition.",
            variant: "destructive",
          });
        });
    } catch (error: any) {
      console.error("Error starting voice recognition:", error);
      
      if (error.name === 'InvalidStateError') {
        // Recognition already started, stop and restart
        setIsListening(false);
        try {
          recognition.stop();
          setTimeout(() => {
            if (!isListening) {
              try {
                recognition.start();
              } catch (retryError) {
                console.error("Retry failed:", retryError);
                toast({
                  title: "Voice Recognition Error",
                  description: "Unable to restart voice recognition.",
                  variant: "destructive",
                });
              }
            }
          }, 1000);
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
    
    // DON'T clear the transcript buffer or modify input here
    // Let the onend handler preserve the final transcript
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
              {new Date(appointment.scheduledAt).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric',
                timeZone: 'UTC'
              })} - {new Date(appointment.scheduledAt).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
                timeZone: 'UTC'
              })}
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
                          
                          {/* Enhanced Medical Insights Display */}
                          {message.type === 'assistant' && (
                            <>
                              {/* Urgency Level Indicator */}
                              {message.urgencyLevel && message.urgencyLevel !== 'low' && (
                                <div className={`mt-2 p-2 rounded-md text-xs font-medium ${
                                  message.urgencyLevel === 'critical' ? 'bg-red-100 text-red-800 border border-red-200' :
                                  message.urgencyLevel === 'high' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                                  'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                }`}>
                                  🚨 Urgency Level: {message.urgencyLevel.toUpperCase()}
                                </div>
                              )}

                              {/* Medical Advice Level */}
                              {message.medicalAdviceLevel && message.medicalAdviceLevel !== 'none' && (
                                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                                  <div className="text-xs font-medium text-blue-800 mb-1">
                                    Medical Information Level: {message.medicalAdviceLevel}
                                  </div>
                                </div>
                              )}

                              {/* Recommended Specialty */}
                              {message.recommendedSpecialty && (
                                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                                  <div className="text-xs font-medium text-green-800">
                                    💡 Recommended Specialty: {message.recommendedSpecialty}
                                  </div>
                                </div>
                              )}

                              {/* Educational Content */}
                              {message.educationalContent && message.educationalContent.length > 0 && (
                                <div className="mt-2 p-2 bg-purple-50 border border-purple-200 rounded-md">
                                  <div className="text-xs font-medium text-purple-800 mb-1">📚 Educational Information:</div>
                                  {message.educationalContent.map((content, idx) => (
                                    <div key={idx} className="text-xs text-purple-700">• {content}</div>
                                  ))}
                                </div>
                              )}

                              {/* Follow-up Questions */}
                              {message.followUpQuestions && message.followUpQuestions.length > 0 && (
                                <div className="mt-2 p-2 bg-cyan-50 border border-cyan-200 rounded-md">
                                  <div className="text-xs font-medium text-cyan-800 mb-1">🤔 Follow-up Questions:</div>
                                  {message.followUpQuestions.map((question, idx) => (
                                    <div key={idx} className="text-xs text-cyan-700">• {question}</div>
                                  ))}
                                </div>
                              )}

                              {/* Medical Disclaimers */}
                              {message.disclaimers && message.disclaimers.length > 0 && (
                                <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded-md">
                                  <div className="text-xs font-medium text-gray-700 mb-1">⚠️ Important Disclaimers:</div>
                                  {message.disclaimers.map((disclaimer, idx) => (
                                    <div key={idx} className="text-xs text-gray-600">• {disclaimer}</div>
                                  ))}
                                </div>
                              )}


                            </>
                          )}
                          
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
                  disabled={isLoading}
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