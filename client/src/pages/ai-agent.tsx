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
  Loader2,
  ChevronRight,
  CheckCircle
} from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";

// Medical Specialties Data Structure
const medicalSpecialties = {
  "General & Primary Care": {
    "General Practitioner (GP) / Family Physician": ["Common illnesses", "Preventive care"],
    "Internal Medicine Specialist": ["Adult health", "Chronic diseases (diabetes, hypertension)"]
  },
  "Surgical Specialties": {
    "General Surgeon": [
      "Abdominal Surgery",
      "Hernia Repair", 
      "Gallbladder & Appendix Surgery",
      "Colorectal Surgery",
      "Breast Surgery"
    ],
    "Orthopedic Surgeon": [
      "Joint Replacement (hip, knee, shoulder)",
      "Spine Surgery",
      "Sports Orthopedics (ACL tears, ligament reconstruction)",
      "Pediatric Orthopedics",
      "Arthroscopy (keyhole joint surgery)"
    ],
    "Neurosurgeon": [
      "Brain Tumor Surgery",
      "Spinal Surgery", 
      "Cerebrovascular Surgery (stroke, aneurysm)",
      "Pediatric Neurosurgery"
    ]
  },
  "Heart & Circulation": {
    "Cardiologist": ["Heart diseases", "ECG", "Angiography"],
    "Vascular Surgeon": ["Arteries", "Veins", "Blood vessels"]
  },
  "Women's Health": {
    "Gynecologist": ["Female reproductive system"],
    "Obstetrician": ["Pregnancy & childbirth"],
    "Fertility Specialist (IVF Expert)": ["Infertility treatment"]
  },
  "Children's Health": {
    "Pediatrician": ["General child health"],
    "Pediatric Surgeon": ["Infant & child surgeries"],
    "Neonatologist": ["Newborn intensive care"]
  },
  "Brain & Nervous System": {
    "Neurologist": ["Stroke", "Epilepsy", "Parkinson's"],
    "Psychiatrist": ["Mental health (depression, anxiety)"],
    "Psychologist (Clinical)": ["Therapy & counseling"]
  },
  "Skin, Hair & Appearance": {
    "Dermatologist": ["Skin", "Hair", "Nails"],
    "Cosmetologist": ["Non-surgical cosmetic treatments"],
    "Aesthetic / Cosmetic Surgeon": ["Surgical enhancements"]
  },
  "Eye & Vision": {
    "Ophthalmologist": ["Cataracts", "Glaucoma", "Surgeries"],
    "Optometrist": ["Vision correction (glasses, lenses)"]
  },
  "Teeth & Mouth": {
    "Dentist (General)": ["Oral health", "Fillings"],
    "Orthodontist": ["Braces", "Alignment"],
    "Oral & Maxillofacial Surgeon": ["Jaw surgery", "Implants"]
  }
} as const;

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  data?: any;
  showSpecialtySelector?: boolean;
  showSubSpecialtySelector?: boolean;
  showDoctorSelector?: boolean;
  showTimeSlotSelector?: boolean;
  selectedCategory?: string;
  selectedSubSpecialty?: string;
  selectedDoctor?: any;
  availableDoctors?: any[];
  availableTimeSlots?: any[];
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
  const [bookingState, setBookingState] = useState({
    step: 'idle', // idle, category, subspecialty, doctor, timeslot, confirmation
    selectedCategory: '',
    selectedSubSpecialty: '',
    selectedDoctor: null as any,
    selectedTimeSlot: null as any,
    availableDoctors: [] as any[],
    availableTimeSlots: [] as any[]
  });
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

  // Helper function to generate time slots
  const generateAvailableTimeSlots = (doctor: any) => {
    const slots = [];
    const today = new Date();
    
    // Generate slots for the next 7 days
    for (let day = 1; day <= 7; day++) {
      const date = new Date(today);
      date.setDate(today.getDate() + day);
      
      // Skip weekends if doctor doesn't work weekends
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      if (doctor.workingDays && doctor.workingDays.length > 0 && !doctor.workingDays.includes(dayName)) {
        continue;
      }
      
      // Generate hourly slots during working hours
      const startHour = doctor.workingHours?.start ? parseInt(doctor.workingHours.start.split(':')[0]) : 9;
      const endHour = doctor.workingHours?.end ? parseInt(doctor.workingHours.end.split(':')[0]) : 17;
      
      for (let hour = startHour; hour < endHour; hour++) {
        const slotTime = new Date(date);
        slotTime.setHours(hour, 0, 0, 0);
        
        slots.push({
          datetime: slotTime.toISOString(),
          display: format(slotTime, 'EEE, MMM d - h:mm a'),
          available: true
        });
      }
    }
    
    return slots;
  };

  // Handler functions for appointment booking flow
  const handleCategorySelection = async (category: string) => {
    setBookingState(prev => ({ ...prev, selectedCategory: category, step: 'subspecialty' }));
    
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: `Selected category: ${category}`,
      timestamp: new Date(),
    };

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: 'assistant',
      content: `Great! You selected "${category}". Now please select a sub-specialty:`,
      timestamp: new Date(),
      showSubSpecialtySelector: true,
      selectedCategory: category
    };

    setMessages(prev => [...prev, userMessage, assistantMessage]);
  };

  const handleSubSpecialtySelection = async (subSpecialty: string) => {
    setBookingState(prev => ({ ...prev, selectedSubSpecialty: subSpecialty, step: 'doctor' }));
    
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: `Selected sub-specialty: ${subSpecialty}`,
      timestamp: new Date(),
    };

    setIsLoading(true);

    try {
      // Fetch doctors with the selected specialty
      const response = await apiRequest("GET", `/api/medical-staff?specialty=${encodeURIComponent(bookingState.selectedCategory)}&subSpecialty=${encodeURIComponent(subSpecialty)}`);
      const data = await response.json();
      const doctors = data?.staff || [];
      
      // Filter for doctors only
      const filteredDoctors = doctors.filter((doctor: any) => doctor.role === 'doctor');
      
      setBookingState(prev => ({ ...prev, availableDoctors: filteredDoctors }));

      const assistantMessage: Message = {
        id: (Date.now() + 2).toString(),
        type: 'assistant',
        content: filteredDoctors.length > 0 
          ? `Perfect! I found ${filteredDoctors.length} available doctor(s) for "${subSpecialty}". Please select a doctor:`
          : `I'm sorry, there are no doctors available for "${subSpecialty}" at the moment. Please try a different specialty.`,
        timestamp: new Date(),
        showDoctorSelector: filteredDoctors.length > 0,
        availableDoctors: filteredDoctors
      };

      setMessages(prev => [...prev, userMessage, assistantMessage]);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        type: 'assistant',
        content: 'I encountered an error while fetching available doctors. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMessage, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDoctorSelection = async (doctor: any) => {
    setBookingState(prev => ({ ...prev, selectedDoctor: doctor, step: 'timeslot' }));
    
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: `Selected doctor: Dr. ${doctor.firstName} ${doctor.lastName}`,
      timestamp: new Date(),
    };

    setIsLoading(true);

    try {
      // Generate time slots for the next 7 days
      const timeSlots = generateAvailableTimeSlots(doctor);
      setBookingState(prev => ({ ...prev, availableTimeSlots: timeSlots }));

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `Excellent choice! Dr. ${doctor.firstName} ${doctor.lastName} is available. Please select a date and time:`,
        timestamp: new Date(),
        showTimeSlotSelector: true,
        availableTimeSlots: timeSlots
      };

      setMessages(prev => [...prev, userMessage, assistantMessage]);
    } catch (error) {
      console.error('Error generating time slots:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'I encountered an error while fetching available time slots. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMessage, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTimeSlotSelection = async (timeSlot: any) => {
    setBookingState(prev => ({ ...prev, selectedTimeSlot: timeSlot, step: 'confirmation' }));
    
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: `Selected time: ${format(new Date(timeSlot.datetime), 'PPp')}`,
      timestamp: new Date(),
    };

    setIsLoading(true);

    try {
      // Check for conflicts first
      const conflictCheckResponse = await apiRequest("GET", `/api/appointments/check-availability?doctorId=${bookingState.selectedDoctor.id}&datetime=${timeSlot.datetime}`);
      const conflictData = await conflictCheckResponse.json();
      
      if (!conflictData.available) {
        const conflictMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: `❌ I'm sorry, that time slot is already booked. Please select another available time slot.`,
          timestamp: new Date(),
          showTimeSlotSelector: true,
          availableTimeSlots: bookingState.availableTimeSlots.filter(slot => slot.datetime !== timeSlot.datetime)
        };
        setMessages(prev => [...prev, userMessage, conflictMessage]);
        return;
      }

      // Book the appointment
      const appointmentData = {
        patientId: "12", // Using a known patient ID from the database
        providerId: bookingState.selectedDoctor.id,
        title: `${bookingState.selectedSubSpecialty} Consultation`,
        description: `Appointment with Dr. ${bookingState.selectedDoctor.firstName} ${bookingState.selectedDoctor.lastName}`,
        date: format(new Date(timeSlot.datetime), 'yyyy-MM-dd'),
        time: format(new Date(timeSlot.datetime), 'HH:mm'),
        duration: "30",
        type: "consultation",
        department: bookingState.selectedCategory,
        isVirtual: false
      };

      const bookingResponse = await apiRequest("POST", "/api/appointments", appointmentData);
      const bookingResult = await bookingResponse.json();

      const successMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `✅ **Appointment Successfully Booked!**\n\n**Doctor:** Dr. ${bookingState.selectedDoctor.firstName} ${bookingState.selectedDoctor.lastName}\n**Specialty:** ${bookingState.selectedSubSpecialty}\n**Date & Time:** ${format(new Date(timeSlot.datetime), 'PPp')}\n**Department:** ${bookingState.selectedCategory}\n\nYour appointment has been confirmed. You will receive a confirmation message shortly.`,
        timestamp: new Date(),
        data: bookingResult
      };

      setMessages(prev => [...prev, userMessage, successMessage]);
      
      // Reset booking state
      setBookingState({
        step: 'idle',
        selectedCategory: '',
        selectedSubSpecialty: '',
        selectedDoctor: null,
        selectedTimeSlot: null,
        availableDoctors: [],
        availableTimeSlots: []
      });

      toast({
        title: "Appointment Booked",
        description: `Successfully booked with Dr. ${bookingState.selectedDoctor.firstName} ${bookingState.selectedDoctor.lastName}`,
      });

    } catch (error) {
      console.error('Error booking appointment:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'I encountered an error while booking your appointment. Please try again or contact support.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMessage, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

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
      // Check if user is requesting appointment booking
      const lowerInput = input.toLowerCase();
      if ((lowerInput.includes('book') && lowerInput.includes('appointment')) || 
          (lowerInput.includes('schedule') && lowerInput.includes('appointment')) ||
          lowerInput.includes('book appointment') ||
          lowerInput.includes('schedule appointment')) {
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: "I'll help you book an appointment. Let's start by selecting the medical specialty category.",
          timestamp: new Date(),
          showSpecialtySelector: true
        };

        setMessages(prev => [...prev, assistantMessage]);
        setBookingState(prev => ({ ...prev, step: 'category' }));
        return;
      }

      // Send to AI agent endpoint for other requests
      const response = await apiRequest("POST", "/api/ai-agent/chat", {
        message: input,
        conversationHistory: messages.slice(-5) // Send last 5 messages for context
      });

      const responseData = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: responseData.message || "I apologize, but I couldn't process your request properly.",
        timestamp: new Date(),
        data: responseData.data
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Show success toast if action was performed
      if (responseData.action) {
        toast({
          title: "Action Completed",
          description: responseData.actionDescription || "Action completed successfully",
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

  const renderSpecialtySelector = (message: Message) => {
    const categories = Object.keys(medicalSpecialties);
    
    return (
      <div className="mt-3 space-y-2">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select a Medical Specialty Category:</p>
        <div className="grid grid-cols-1 gap-2">
          {categories.map((category) => (
            <Button
              key={category}
              variant="outline"
              onClick={() => handleCategorySelection(category)}
              className="justify-start text-left h-auto py-3 px-4 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              data-testid={`category-${category.replace(/\s+/g, '-').toLowerCase()}`}
            >
              <div className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>{category}</span>
                <ChevronRight className="h-4 w-4 ml-auto" />
              </div>
            </Button>
          ))}
        </div>
      </div>
    );
  };

  const renderSubSpecialtySelector = (message: Message) => {
    const category = message.selectedCategory;
    if (!category || !medicalSpecialties[category as keyof typeof medicalSpecialties]) return null;
    
    const subSpecialties = Object.keys(medicalSpecialties[category as keyof typeof medicalSpecialties]);
    
    return (
      <div className="mt-3 space-y-2">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select a Sub-Specialty in {category}:</p>
        <div className="grid grid-cols-1 gap-2">
          {subSpecialties.map((subSpecialty) => (
            <Button
              key={subSpecialty}
              variant="outline"
              onClick={() => handleSubSpecialtySelection(subSpecialty)}
              className="justify-start text-left h-auto py-3 px-4 hover:bg-green-50 dark:hover:bg-green-900/20"
              data-testid={`subspecialty-${subSpecialty.replace(/\s+/g, '-').toLowerCase()}`}
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span>{subSpecialty}</span>
                <ChevronRight className="h-4 w-4 ml-auto" />
              </div>
            </Button>
          ))}
        </div>
      </div>
    );
  };

  const renderDoctorSelector = (message: Message) => {
    const doctors = message.availableDoctors || [];
    
    if (doctors.length === 0) {
      return (
        <div className="mt-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">No doctors available for this specialty.</p>
        </div>
      );
    }
    
    return (
      <div className="mt-3 space-y-2">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select a Doctor:</p>
        <div className="grid grid-cols-1 gap-2">
          {doctors.map((doctor: any) => (
            <Button
              key={doctor.id}
              variant="outline"
              onClick={() => handleDoctorSelection(doctor)}
              className="justify-start text-left h-auto py-3 px-4 hover:bg-purple-50 dark:hover:bg-purple-900/20"
              data-testid={`doctor-${doctor.id}`}
            >
              <div className="flex items-center gap-2 w-full">
                <User className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <div className="flex-1">
                  <div className="font-medium">Dr. {doctor.firstName} {doctor.lastName}</div>
                  {doctor.department && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">{doctor.department}</div>
                  )}
                  {doctor.workingHours?.start && doctor.workingHours?.end && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Available: {doctor.workingHours.start} - {doctor.workingHours.end}
                    </div>
                  )}
                </div>
                <ChevronRight className="h-4 w-4" />
              </div>
            </Button>
          ))}
        </div>
      </div>
    );
  };

  const renderTimeSlotSelector = (message: Message) => {
    const timeSlots = message.availableTimeSlots || [];
    
    if (timeSlots.length === 0) {
      return (
        <div className="mt-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">No available time slots found.</p>
        </div>
      );
    }
    
    return (
      <div className="mt-3 space-y-2">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select a Date & Time:</p>
        <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
          {timeSlots.map((slot: any, index: number) => (
            <Button
              key={index}
              variant="outline"
              onClick={() => handleTimeSlotSelection(slot)}
              className="justify-start text-left h-auto py-2 px-3 hover:bg-orange-50 dark:hover:bg-orange-900/20 text-sm"
              data-testid={`timeslot-${index}`}
            >
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                <span>{slot.display}</span>
              </div>
            </Button>
          ))}
        </div>
      </div>
    );
  };

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

                      {/* Render specialty selector */}
                      {message.showSpecialtySelector && (
                        <div className="mt-2">
                          {renderSpecialtySelector(message)}
                        </div>
                      )}
                      
                      {/* Render sub-specialty selector */}
                      {message.showSubSpecialtySelector && (
                        <div className="mt-2">
                          {renderSubSpecialtySelector(message)}
                        </div>
                      )}
                      
                      {/* Render doctor selector */}
                      {message.showDoctorSelector && (
                        <div className="mt-2">
                          {renderDoctorSelector(message)}
                        </div>
                      )}
                      
                      {/* Render time slot selector */}
                      {message.showTimeSlotSelector && (
                        <div className="mt-2">
                          {renderTimeSlotSelector(message)}
                        </div>
                      )}

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