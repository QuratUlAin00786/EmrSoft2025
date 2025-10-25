import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format, formatDistanceToNow } from "date-fns";
import { 
  Flag, Bell, Mail, MessageSquare, Phone, Clock, 
  AlertTriangle, CheckCircle, XCircle, Send, Calendar,
  History, Settings
} from "lucide-react";
import type { Patient, PatientCommunication } from "@shared/schema";

interface PatientCommunicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient | null;
  mode: "flag" | "reminder";
}

const COMMUNICATION_TYPES = {
  appointment_reminder: "Appointment Reminder",
  medication_reminder: "Medication Reminder", 
  follow_up_reminder: "Follow-up Reminder",
  billing_notice: "Billing Notice",
  health_check: "Health Check-in",
  emergency_alert: "Emergency Alert",
  preventive_care: "Preventive Care Reminder"
};

const COMMUNICATION_METHODS = {
  email: { label: "Email", icon: Mail },
  sms: { label: "SMS", icon: MessageSquare },
  phone: { label: "Phone Call", icon: Phone },
  whatsapp: { label: "WhatsApp", icon: MessageSquare }
};

const FLAG_TYPES = {
  medical_alert: "Medical Alert",
  allergy_warning: "Allergy Warning",
  medication_interaction: "Medication Interaction",
  high_risk: "High Risk Patient",
  special_needs: "Special Needs",
  insurance_issue: "Insurance Issue",
  payment_overdue: "Payment Overdue",
  follow_up_required: "Follow-up Required"
};

export function PatientCommunicationDialog({ open, onOpenChange, patient, mode }: PatientCommunicationDialogProps) {
  const [selectedType, setSelectedType] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("");
  const [message, setMessage] = useState("");
  const [flagType, setFlagType] = useState("");
  const [flagReason, setFlagReason] = useState("");
  const [flagSeverity, setFlagSeverity] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [scheduledFor, setScheduledFor] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch patient communications history
  const { data: communications = [], isLoading: communicationsLoading } = useQuery({
    queryKey: ['/api/patients', patient?.id, 'communications'],
    enabled: !!patient?.id && open,
  });

  // Type-safe access to communications - filter out any invalid/null entries
  const communicationsList = Array.isArray(communications) 
    ? (communications as any[]).filter(comm => comm && comm.id && comm.type && comm.message)
    : [];

  // Check for recent reminders to prevent spam
  const { data: lastReminder } = useQuery({
    queryKey: ['/api/patients', patient?.id, 'last-reminder', selectedType],
    enabled: false, // Disabled because endpoint doesn't exist yet
  });

  // Send reminder mutation
  const sendReminderMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', `/api/patients/${patient?.id}/send-reminder`, data);
    },
    onSuccess: () => {
      toast({
        title: "Reminder Sent",
        description: "Patient reminder has been sent successfully. Check Communication History below.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/patients', patient?.id, 'communications'] });
      resetForm();
      // Don't close the dialog so user can see the updated communication history
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send reminder",
        variant: "destructive",
      });
    }
  });

  // Create flag mutation
  const createFlagMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', `/api/patients/${patient?.id}/flags`, data);
    },
    onSuccess: () => {
      toast({
        title: "Flag Created",
        description: "Patient flag has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/patients'] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create flag",
        variant: "destructive",
      });
    }
  });

  const resetForm = () => {
    setSelectedType("");
    setSelectedMethod("");
    setMessage("");
    setFlagType("");
    setFlagReason("");
    setFlagSeverity("medium");
    setScheduledFor("");
  };

  const handleSendReminder = () => {
    if (!selectedType || !selectedMethod || !message.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Map phone to sms for backend compatibility
    const backendMethod = selectedMethod === "phone" ? "sms" : selectedMethod;
    
    sendReminderMutation.mutate({
      type: selectedType,
      method: backendMethod,
      message: message.trim(),
      scheduledFor: scheduledFor || null,
      metadata: {
        urgency: getUrgencyLevel(selectedType),
        reminderType: selectedType
      }
    });
  };

  const handleCreateFlag = () => {
    if (!flagType || !flagReason.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select flag type and provide reason",
        variant: "destructive",
      });
      return;
    }

    createFlagMutation.mutate({
      type: flagType,
      reason: flagReason.trim(),
      severity: flagSeverity,
      isActive: true
    });
  };

  const getUrgencyLevel = (type: string): "low" | "medium" | "high" => {
    const highUrgency = ["emergency_alert", "medication_reminder"];
    const mediumUrgency = ["appointment_reminder", "follow_up_reminder"];
    return highUrgency.includes(type) ? "high" : mediumUrgency.includes(type) ? "medium" : "low";
  };

  const getFlagSeverity = (type: string): "low" | "medium" | "high" | "critical" => {
    const critical = ["medical_alert", "allergy_warning"];
    const high = ["medication_interaction", "high_risk"];
    const medium = ["special_needs", "follow_up_required"];
    return critical.includes(type) ? "critical" : high.includes(type) ? "high" : medium.includes(type) ? "medium" : "low";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "delivered": return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "failed": return <XCircle className="h-4 w-4 text-red-500" />;
      case "pending": return <Clock className="h-4 w-4 text-yellow-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const canSendReminder = () => {
    // Always allow sending reminders (rate limiting disabled until backend endpoint is implemented)
    return true;
  };

  // Auto-set severity based on flag type, but allow user to override
  useEffect(() => {
    if (flagType) {
      setFlagSeverity(getFlagSeverity(flagType));
    }
  }, [flagType]);

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  if (!patient) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "flag" ? (
              <>
                <Flag className="h-5 w-5 text-red-500" />
                Flag Patient: {patient.firstName} {patient.lastName}
              </>
            ) : (
              <>
                <Bell className="h-5 w-5 text-blue-500" />
                Send Reminder: {patient.firstName} {patient.lastName}
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Main Form */}
          <div className="space-y-4">
            {mode === "reminder" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="reminder-type">Reminder Type</Label>
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select reminder type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(COMMUNICATION_TYPES).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="communication-method">Communication Method</Label>
                  <Select value={selectedMethod} onValueChange={setSelectedMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(COMMUNICATION_METHODS).map(([key, { label, icon: Icon }]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Enter your reminder message..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scheduled-for">Schedule For (Optional)</Label>
                  <input
                    type="datetime-local"
                    id="scheduled-for"
                    value={scheduledFor}
                    onChange={(e) => setScheduledFor(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>

                {/* Rate limiting alert removed - will be re-enabled when backend endpoint is implemented */}

                <Button 
                  onClick={handleSendReminder} 
                  disabled={sendReminderMutation.isPending || !canSendReminder()}
                  className="w-full"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {sendReminderMutation.isPending ? "Sending..." : "Send Reminder"}
                </Button>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="flag-type">Flag Type</Label>
                  <Select value={flagType} onValueChange={setFlagType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select flag type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(FLAG_TYPES).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="flag-reason">Reason for Flag</Label>
                  <Textarea
                    id="flag-reason"
                    value={flagReason}
                    onChange={(e) => setFlagReason(e.target.value)}
                    placeholder="Describe the reason for flagging this patient..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="flag-severity">Flag Severity</Label>
                  <Select value={flagSeverity} onValueChange={(value: "low" | "medium" | "high" | "critical") => setFlagSeverity(value)}>
                    <SelectTrigger data-testid="select-flag-severity">
                      <SelectValue placeholder="Select severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical" data-testid="option-critical">Critical</SelectItem>
                      <SelectItem value="high" data-testid="option-high">High</SelectItem>
                      <SelectItem value="medium" data-testid="option-medium">Medium</SelectItem>
                      <SelectItem value="low" data-testid="option-low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                  {flagSeverity && (
                    <div className="flex items-center gap-2">
                      <Badge variant={flagSeverity === "critical" || flagSeverity === "high" ? "destructive" : flagSeverity === "medium" ? "default" : "secondary"}>
                        {flagSeverity.toUpperCase()}
                      </Badge>
                      <span className="text-sm text-gray-500">Current selection</span>
                    </div>
                  )}
                </div>

                <Button 
                  onClick={handleCreateFlag} 
                  disabled={createFlagMutation.isPending}
                  className="w-full"
                  data-testid="button-create-flag"
                >
                  <Flag className="h-4 w-4 mr-2" />
                  {createFlagMutation.isPending ? "Creating..." : "Create Flag"}
                </Button>
              </>
            )}
          </div>

          {/* Communication History */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5" />
              <h3 className="text-lg font-medium">Communication History</h3>
            </div>

            {communicationsLoading ? (
              <div className="text-center py-4">Loading history...</div>
            ) : communicationsList.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                No communication history found
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {(communicationsList || []).map((comm: any) => {
                  const MethodIcon = COMMUNICATION_METHODS[comm.method as keyof typeof COMMUNICATION_METHODS]?.icon || MessageSquare;
                  
                  return (
                    <div key={comm.id} className="p-3 border rounded-md space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MethodIcon className="h-4 w-4" />
                          <span className="font-medium">
                            {COMMUNICATION_TYPES[comm.type as keyof typeof COMMUNICATION_TYPES] || comm.type}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(comm.status)}
                          <span className="text-sm text-gray-500">
                            {format(new Date(comm.createdAt), 'MMM dd, HH:mm')}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {comm.message}
                      </p>
                      
                      {comm.sentAt && (
                        <p className="text-xs text-gray-500">
                          Sent: {format(new Date(comm.sentAt), 'MMM dd, yyyy HH:mm')}
                        </p>
                      )}
                      
                      {comm.errorMessage && (
                        <p className="text-xs text-red-500">
                          Error: {comm.errorMessage}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Patient Contact Information */}
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
          <h4 className="font-medium mb-2">Patient Contact Information</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Email:</span> {patient.email || "Not provided"}
            </div>
            <div>
              <span className="font-medium">Phone:</span> {patient.phone || "Not provided"}
            </div>
            <div>
              <span className="font-medium">Mobile:</span> {patient.phone || "Not provided"}
            </div>
            <div>
              <span className="font-medium">Preferred Contact:</span> {"Email"}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}