import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Plus,
  Play,
  Pause,
  Edit,
  Trash2,
  Calendar,
  Clock,
  MessageSquare,
  Mail,
  Phone,
  Bell,
  Users,
  FileText,
  Zap,
  Activity,
  Settings,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Filter
} from "lucide-react";
import { format } from "date-fns";

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger: {
    type: 'appointment_scheduled' | 'appointment_completed' | 'form_submitted' | 'patient_registered' | 'lab_result_ready' | 'medication_due' | 'follow_up_due' | 'no_show' | 'time_based';
    conditions: {
      field: string;
      operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'starts_with';
      value: string;
    }[];
    timeDelay?: {
      value: number;
      unit: 'minutes' | 'hours' | 'days' | 'weeks';
    };
  };
  actions: {
    type: 'send_email' | 'send_sms' | 'create_task' | 'schedule_appointment' | 'update_patient' | 'send_notification' | 'generate_report';
    config: {
      template?: string;
      recipient?: string;
      subject?: string;
      message?: string;
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      assignTo?: string;
      dueDate?: string;
    };
  }[];
  status: 'active' | 'paused' | 'draft';
  category: 'appointment' | 'communication' | 'clinical' | 'administrative' | 'billing';
  createdAt: string;
  updatedAt: string;
  lastTriggered?: string;
  triggerCount: number;
  successRate: number;
}

interface AutomationStats {
  totalRules: number;
  activeRules: number;
  totalTriggers: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageResponseTime: number;
  topPerformingRules: Array<{
    id: string;
    name: string;
    triggerCount: number;
    successRate: number;
  }>;
  recentActivity: Array<{
    id: string;
    ruleName: string;
    trigger: string;
    action: string;
    status: 'success' | 'failed' | 'pending';
    timestamp: string;
    details?: string;
  }>;
}

const mockAutomationRules: AutomationRule[] = [
  {
    id: "rule_001",
    name: "Appointment Reminder - 24 Hours",
    description: "Send email reminder 24 hours before scheduled appointment",
    trigger: {
      type: "appointment_scheduled",
      conditions: [
        { field: "status", operator: "equals", value: "confirmed" }
      ],
      timeDelay: { value: 24, unit: "hours" }
    },
    actions: [
      {
        type: "send_email",
        config: {
          template: "appointment_reminder",
          subject: "Appointment Reminder - Tomorrow",
          message: "This is a friendly reminder of your appointment tomorrow at {appointment_time} with {provider_name}."
        }
      }
    ],
    status: "active",
    category: "appointment",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-15T10:30:00Z",
    lastTriggered: "2024-01-20T14:00:00Z",
    triggerCount: 156,
    successRate: 98.5
  },
  {
    id: "rule_002",
    name: "Post-Visit Follow-up Survey",
    description: "Send patient satisfaction survey 2 hours after appointment completion",
    trigger: {
      type: "appointment_completed",
      conditions: [
        { field: "type", operator: "not_equals", value: "emergency" }
      ],
      timeDelay: { value: 2, unit: "hours" }
    },
    actions: [
      {
        type: "send_email",
        config: {
          template: "satisfaction_survey",
          subject: "How was your visit today?",
          message: "We'd love to hear about your experience today. Please take a moment to complete our brief survey."
        }
      }
    ],
    status: "active",
    category: "communication",
    createdAt: "2024-01-05T00:00:00Z",
    updatedAt: "2024-01-15T10:30:00Z",
    lastTriggered: "2024-01-20T16:30:00Z",
    triggerCount: 89,
    successRate: 96.2
  },
  {
    id: "rule_003",
    name: "Lab Results Notification",
    description: "Notify patient and provider when lab results are ready",
    trigger: {
      type: "lab_result_ready",
      conditions: [
        { field: "status", operator: "equals", value: "completed" }
      ]
    },
    actions: [
      {
        type: "send_notification",
        config: {
          recipient: "patient",
          message: "Your lab results are ready for review.",
          priority: "medium"
        }
      },
      {
        type: "create_task",
        config: {
          assignTo: "ordering_provider",
          message: "Review and communicate lab results to patient",
          priority: "high",
          dueDate: "24_hours"
        }
      }
    ],
    status: "active",
    category: "clinical",
    createdAt: "2024-01-08T00:00:00Z",
    updatedAt: "2024-01-15T10:30:00Z",
    lastTriggered: "2024-01-20T12:15:00Z",
    triggerCount: 67,
    successRate: 100.0
  },
  {
    id: "rule_004",
    name: "Medication Refill Reminder",
    description: "Remind patients to refill medication 3 days before running out",
    trigger: {
      type: "medication_due",
      conditions: [
        { field: "refills_remaining", operator: "greater_than", value: "0" }
      ],
      timeDelay: { value: 3, unit: "days" }
    },
    actions: [
      {
        type: "send_sms",
        config: {
          message: "Your {medication_name} prescription is running low. Please contact us to refill.",
          priority: "medium"
        }
      }
    ],
    status: "active",
    category: "clinical",
    createdAt: "2024-01-10T00:00:00Z",
    updatedAt: "2024-01-15T10:30:00Z",
    lastTriggered: "2024-01-19T09:00:00Z",
    triggerCount: 23,
    successRate: 91.3
  },
  {
    id: "rule_005",
    name: "No-Show Follow-up",
    description: "Send follow-up message and reschedule option for no-show appointments",
    trigger: {
      type: "no_show",
      conditions: [
        { field: "status", operator: "equals", value: "no_show" }
      ],
      timeDelay: { value: 2, unit: "hours" }
    },
    actions: [
      {
        type: "send_email",
        config: {
          template: "no_show_followup",
          subject: "We missed you today - Let's reschedule",
          message: "We noticed you missed your appointment today. Please click here to reschedule at your convenience."
        }
      },
      {
        type: "create_task",
        config: {
          assignTo: "front_desk",
          message: "Follow up with patient who missed appointment - attempt to reschedule",
          priority: "medium"
        }
      }
    ],
    status: "active",
    category: "appointment",
    createdAt: "2024-01-12T00:00:00Z",
    updatedAt: "2024-01-15T10:30:00Z",
    lastTriggered: "2024-01-18T11:30:00Z",
    triggerCount: 12,
    successRate: 83.3
  }
];

const mockAutomationStats: AutomationStats = {
  totalRules: 5,
  activeRules: 5,
  totalTriggers: 347,
  successfulExecutions: 334,
  failedExecutions: 13,
  averageResponseTime: 2.4,
  topPerformingRules: [
    { id: "rule_003", name: "Lab Results Notification", triggerCount: 67, successRate: 100.0 },
    { id: "rule_001", name: "Appointment Reminder - 24 Hours", triggerCount: 156, successRate: 98.5 },
    { id: "rule_002", name: "Post-Visit Follow-up Survey", triggerCount: 89, successRate: 96.2 }
  ],
  recentActivity: [
    {
      id: "act_001",
      ruleName: "Appointment Reminder - 24 Hours",
      trigger: "appointment_scheduled",
      action: "send_email",
      status: "success",
      timestamp: "2024-01-20T14:00:00Z",
      details: "Email sent to sarah.johnson@email.com"
    },
    {
      id: "act_002",
      ruleName: "Post-Visit Follow-up Survey",
      trigger: "appointment_completed",
      action: "send_email",
      status: "success",
      timestamp: "2024-01-20T16:30:00Z",
      details: "Survey sent to patient after consultation"
    },
    {
      id: "act_003",
      ruleName: "Lab Results Notification",
      trigger: "lab_result_ready",
      action: "send_notification",
      status: "success",
      timestamp: "2024-01-20T12:15:00Z",
      details: "Patient and provider notified of completed CBC results"
    },
    {
      id: "act_004",
      ruleName: "Medication Refill Reminder",
      trigger: "medication_due",
      action: "send_sms",
      status: "failed",
      timestamp: "2024-01-19T09:00:00Z",
      details: "SMS delivery failed - invalid phone number"
    }
  ]
};

export default function AutomationPage() {
  const [selectedRule, setSelectedRule] = useState<AutomationRule | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const queryClient = useQueryClient();

  const { data: automationRules = mockAutomationRules } = useQuery({
    queryKey: ["/api/automation/rules"],
    enabled: true,
  });

  const { data: automationStats = mockAutomationStats } = useQuery({
    queryKey: ["/api/automation/stats"],
    enabled: true,
  });

  const toggleRuleMutation = useMutation({
    mutationFn: async ({ ruleId, status }: { ruleId: string; status: 'active' | 'paused' }) => {
      const response = await fetch(`/api/automation/rules/${ruleId}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automation/rules"] });
    }
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      const response = await fetch(`/api/automation/rules/${ruleId}`, {
        method: 'DELETE'
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automation/rules"] });
    }
  });

  const filteredRules = (automationRules as any || []).filter((rule: any) => {
    const matchesStatus = statusFilter === "all" || rule.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || rule.category === categoryFilter;
    return matchesStatus && matchesCategory;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'paused': return <Badge className="bg-yellow-100 text-yellow-800">Paused</Badge>;
      case 'draft': return <Badge className="bg-gray-100 text-gray-800">Draft</Badge>;
      case 'success': return <Badge className="bg-green-100 text-green-800">Success</Badge>;
      case 'failed': return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      case 'pending': return <Badge className="bg-blue-100 text-blue-800">Pending</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'appointment': return <Calendar className="h-4 w-4" />;
      case 'communication': return <MessageSquare className="h-4 w-4" />;
      case 'clinical': return <FileText className="h-4 w-4" />;
      case 'administrative': return <Settings className="h-4 w-4" />;
      case 'billing': return <TrendingUp className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getTriggerIcon = (triggerType: string) => {
    switch (triggerType) {
      case 'appointment_scheduled': return <Calendar className="h-4 w-4" />;
      case 'appointment_completed': return <CheckCircle className="h-4 w-4" />;
      case 'form_submitted': return <FileText className="h-4 w-4" />;
      case 'patient_registered': return <Users className="h-4 w-4" />;
      case 'lab_result_ready': return <Activity className="h-4 w-4" />;
      case 'medication_due': return <Bell className="h-4 w-4" />;
      case 'no_show': return <AlertTriangle className="h-4 w-4" />;
      case 'time_based': return <Clock className="h-4 w-4" />;
      default: return <Zap className="h-4 w-4" />;
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'send_email': return <Mail className="h-4 w-4" />;
      case 'send_sms': return <Phone className="h-4 w-4" />;
      case 'create_task': return <CheckCircle className="h-4 w-4" />;
      case 'send_notification': return <Bell className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <>
      <Header title="Automation & Workflows" />
      
      <div className="p-6 space-y-6">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="rules">Automation Rules</TabsTrigger>
            <TabsTrigger value="activity">Activity Log</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Rules</p>
                      <p className="text-2xl font-bold">{automationStats.totalRules}</p>
                      <p className="text-xs text-green-600 flex items-center mt-1">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {automationStats.activeRules} active
                      </p>
                    </div>
                    <Zap className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Triggers</p>
                      <p className="text-2xl font-bold">{automationStats.totalTriggers.toLocaleString()}</p>
                      <p className="text-xs text-gray-600 mt-1">This month</p>
                    </div>
                    <Activity className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Success Rate</p>
                      <p className="text-2xl font-bold">
                        {Math.round((automationStats.successfulExecutions / automationStats.totalTriggers) * 100)}%
                      </p>
                      <p className="text-xs text-green-600 flex items-center mt-1">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        {automationStats.successfulExecutions} successful
                      </p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Response Time</p>
                      <p className="text-2xl font-bold">{automationStats.averageResponseTime}s</p>
                      <p className="text-xs text-gray-600 mt-1">Average execution</p>
                    </div>
                    <Clock className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Performing Rules */}
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Rules</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {automationStats.topPerformingRules.map((rule, index) => (
                    <div key={rule.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                        </div>
                        <div>
                          <div className="font-medium">{rule.name}</div>
                          <div className="text-sm text-gray-600">{rule.triggerCount} triggers</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">{rule.successRate}%</div>
                        <div className="text-xs text-gray-600">Success rate</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {automationStats.recentActivity.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        {getTriggerIcon(activity.trigger)}
                        {getActionIcon(activity.action)}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{activity.ruleName}</div>
                        <div className="text-sm text-gray-600">{activity.details}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(activity.status)}
                        <span className="text-xs text-gray-500">
                          {format(new Date(activity.timestamp), 'MMM d, HH:mm')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rules" className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold">Automation Rules</h2>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="appointment">Appointment</SelectItem>
                      <SelectItem value="communication">Communication</SelectItem>
                      <SelectItem value="clinical">Clinical</SelectItem>
                      <SelectItem value="administrative">Administrative</SelectItem>
                      <SelectItem value="billing">Billing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Rule
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create New Automation Rule</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Rule Name</Label>
                      <Input placeholder="Enter rule name" />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea placeholder="Describe what this rule does" />
                    </div>
                    <div>
                      <Label>Trigger Event</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select trigger" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="appointment_scheduled">Appointment Scheduled</SelectItem>
                          <SelectItem value="appointment_completed">Appointment Completed</SelectItem>
                          <SelectItem value="form_submitted">Form Submitted</SelectItem>
                          <SelectItem value="patient_registered">Patient Registered</SelectItem>
                          <SelectItem value="lab_result_ready">Lab Result Ready</SelectItem>
                          <SelectItem value="medication_due">Medication Due</SelectItem>
                          <SelectItem value="no_show">No Show</SelectItem>
                          <SelectItem value="time_based">Time Based</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Action Type</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select action" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="send_email">Send Email</SelectItem>
                          <SelectItem value="send_sms">Send SMS</SelectItem>
                          <SelectItem value="create_task">Create Task</SelectItem>
                          <SelectItem value="send_notification">Send Notification</SelectItem>
                          <SelectItem value="update_patient">Update Patient</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={() => setShowCreateDialog(false)}>
                        Create Rule
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {filteredRules.map((rule) => (
                <Card key={rule.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex items-center gap-2">
                            {getCategoryIcon(rule.category)}
                            <h3 className="text-lg font-semibold">{rule.name}</h3>
                          </div>
                          {getStatusBadge(rule.status)}
                          <Badge variant="outline" className="capitalize">
                            {rule.category}
                          </Badge>
                        </div>
                        
                        <p className="text-gray-600 mb-4">{rule.description}</p>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                          <div>
                            <h4 className="font-medium text-sm text-gray-700 mb-2">Trigger</h4>
                            <div className="flex items-center gap-2 text-sm">
                              {getTriggerIcon(rule.trigger.type)}
                              <span className="capitalize">{rule.trigger.type.replace('_', ' ')}</span>
                              {rule.trigger.timeDelay && (
                                <span className="text-gray-500">
                                  (after {rule.trigger.timeDelay.value} {rule.trigger.timeDelay.unit})
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-medium text-sm text-gray-700 mb-2">Actions</h4>
                            <div className="space-y-1">
                              {rule.actions.map((action, index) => (
                                <div key={index} className="flex items-center gap-2 text-sm">
                                  {getActionIcon(action.type)}
                                  <span className="capitalize">{action.type.replace('_', ' ')}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-6 text-sm text-gray-600">
                          <span>Triggered: {rule.triggerCount} times</span>
                          <span>Success rate: {rule.successRate}%</span>
                          {rule.lastTriggered && (
                            <span>Last: {format(new Date(rule.lastTriggered), 'MMM d, yyyy')}</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleRuleMutation.mutate({
                            ruleId: rule.id,
                            status: rule.status === 'active' ? 'paused' : 'active'
                          })}
                        >
                          {rule.status === 'active' ? (
                            <>
                              <Pause className="h-4 w-4 mr-2" />
                              Pause
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-2" />
                              Activate
                            </>
                          )}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setSelectedRule(rule)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => deleteRuleMutation.mutate(rule.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Activity Log</h2>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {automationStats.recentActivity.map((activity) => (
                    <div key={activity.id} className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="flex items-center gap-1">
                            {getTriggerIcon(activity.trigger)}
                            {getActionIcon(activity.action)}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold">{activity.ruleName}</h3>
                            <p className="text-gray-600 mt-1">{activity.details}</p>
                            <div className="text-sm text-gray-500 mt-2">
                              Trigger: {activity.trigger} → Action: {activity.action}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(activity.status)}
                          <span className="text-sm text-gray-500">
                            {format(new Date(activity.timestamp), 'MMM d, yyyy HH:mm')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Message Templates</h2>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Email Templates</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { name: "Appointment Reminder", usage: 156 },
                    { name: "Post-Visit Survey", usage: 89 },
                    { name: "Lab Results Ready", usage: 67 },
                    { name: "No-Show Follow-up", usage: 12 }
                  ].map((template, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-blue-500" />
                        <span className="font-medium">{template.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">{template.usage} uses</span>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>SMS Templates</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { name: "Medication Reminder", usage: 23 },
                    { name: "Appointment Confirmation", usage: 45 },
                    { name: "Test Results Available", usage: 18 },
                    { name: "Emergency Alert", usage: 3 }
                  ].map((template, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-green-500" />
                        <span className="font-medium">{template.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">{template.usage} uses</span>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}