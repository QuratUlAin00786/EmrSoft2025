import { useState } from "react";
import { useQuery, useMutation, queryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Activity,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Settings,
  Filter
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

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
    id: "1",
    name: "Appointment Reminder",
    description: "Send SMS reminder 24 hours before appointment",
    trigger: {
      type: "appointment_scheduled",
      conditions: [],
      timeDelay: { value: 24, unit: "hours" }
    },
    actions: [{
      type: "send_sms",
      config: {
        template: "appointment_reminder",
        message: "Hello {{patient_name}}, you have an appointment tomorrow at {{appointment_time}} with {{provider_name}}."
      }
    }],
    status: "active",
    category: "appointment",
    createdAt: "2024-06-01T10:00:00Z",
    updatedAt: "2024-06-25T15:30:00Z",
    lastTriggered: "2024-06-26T14:00:00Z",
    triggerCount: 145,
    successRate: 98.6
  },
  {
    id: "2",
    name: "Post-Visit Follow-up",
    description: "Send follow-up email after completed appointment",
    trigger: {
      type: "appointment_completed",
      conditions: [],
      timeDelay: { value: 2, unit: "hours" }
    },
    actions: [{
      type: "send_email",
      config: {
        template: "post_visit_followup",
        subject: "Thank you for your visit",
        message: "Thank you for visiting us today. Please don't hesitate to contact us if you have any questions."
      }
    }],
    status: "active",
    category: "communication",
    createdAt: "2024-06-02T10:00:00Z",
    updatedAt: "2024-06-24T12:00:00Z",
    lastTriggered: "2024-06-26T16:30:00Z",
    triggerCount: 89,
    successRate: 96.6
  },
  {
    id: "3",
    name: "Lab Results Notification",
    description: "Notify patient when lab results are ready",
    trigger: {
      type: "lab_result_ready",
      conditions: []
    },
    actions: [
      {
        type: "send_email",
        config: {
          template: "lab_results_ready",
          subject: "Your lab results are ready",
          message: "Your lab results are now available in your patient portal."
        }
      },
      {
        type: "send_notification",
        config: {
          message: "New lab results available for {{patient_name}}",
          priority: "medium"
        }
      }
    ],
    status: "active",
    category: "clinical",
    createdAt: "2024-06-03T10:00:00Z",
    updatedAt: "2024-06-20T09:15:00Z",
    lastTriggered: "2024-06-26T11:45:00Z",
    triggerCount: 67,
    successRate: 100.0
  }
];

const mockAutomationStats: AutomationStats = {
  totalRules: 12,
  activeRules: 9,
  totalTriggers: 1847,
  successfulExecutions: 1782,
  failedExecutions: 65,
  averageResponseTime: 2.3,
  topPerformingRules: [
    { id: "3", name: "Lab Results Notification", triggerCount: 67, successRate: 100.0 },
    { id: "1", name: "Appointment Reminder", triggerCount: 145, successRate: 98.6 },
    { id: "2", name: "Post-Visit Follow-up", triggerCount: 89, successRate: 96.6 }
  ],
  recentActivity: [
    {
      id: "act_1",
      ruleName: "Appointment Reminder",
      trigger: "appointment_scheduled",
      action: "send_sms",
      status: "success",
      timestamp: "2024-06-26T16:45:00Z",
      details: "SMS sent to +44 7700 900123"
    },
    {
      id: "act_2",
      ruleName: "Lab Results Notification",
      trigger: "lab_result_ready",
      action: "send_email",
      status: "success",
      timestamp: "2024-06-26T16:30:00Z",
      details: "Email sent to patient@example.com"
    },
    {
      id: "act_3",
      ruleName: "Post-Visit Follow-up",
      trigger: "appointment_completed",
      action: "send_email",
      status: "failed",
      timestamp: "2024-06-26T16:15:00Z",
      details: "Invalid email address"
    }
  ]
};

export default function AutomationPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: automationRules = mockAutomationRules, isLoading: rulesLoading } = useQuery({
    queryKey: ['/api/automation/rules'],
  });

  const { data: automationStats = mockAutomationStats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/automation/stats'],
  });

  // Type-safe data access
  const rules = automationRules as AutomationRule[];
  const stats = automationStats as AutomationStats;

  const toggleRuleMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      const response = await fetch(`/api/automation/rules/${ruleId}/toggle`, {
        method: 'POST',
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automation/rules"] });
    }
  });

  const filteredRules = rules.filter((rule: AutomationRule) => {
    const matchesStatus = statusFilter === "all" || rule.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || rule.category === categoryFilter;
    return matchesStatus && matchesCategory;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'paused':
        return <Badge variant="secondary">Paused</Badge>;
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'appointment':
        return <Calendar className="h-4 w-4" />;
      case 'communication':
        return <MessageSquare className="h-4 w-4" />;
      case 'clinical':
        return <Activity className="h-4 w-4" />;
      case 'administrative':
        return <Settings className="h-4 w-4" />;
      case 'billing':
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  if (rulesLoading || statsLoading) {
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
          <h1 className="text-3xl font-bold text-gray-900">Automation</h1>
          <p className="text-gray-600 mt-1">Streamline workflows with intelligent automation</p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Rule
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Automation Rule</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Rule Name</label>
                  <Input placeholder="Enter rule name" />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Input placeholder="Describe what this rule does" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Trigger</label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select trigger" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="appointment_scheduled">Appointment Scheduled</SelectItem>
                        <SelectItem value="appointment_completed">Appointment Completed</SelectItem>
                        <SelectItem value="lab_result_ready">Lab Result Ready</SelectItem>
                        <SelectItem value="patient_registered">Patient Registered</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Category</label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="appointment">Appointment</SelectItem>
                        <SelectItem value="communication">Communication</SelectItem>
                        <SelectItem value="clinical">Clinical</SelectItem>
                        <SelectItem value="administrative">Administrative</SelectItem>
                        <SelectItem value="billing">Billing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setIsCreateDialogOpen(false)}>
                    Create Rule
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Rules</p>
                <p className="text-2xl font-bold">{stats.totalRules}</p>
              </div>
              <Settings className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Rules</p>
                <p className="text-2xl font-bold">{stats.activeRules}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold">
                  {Math.round((stats.successfulExecutions / stats.totalTriggers) * 100)}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Response</p>
                <p className="text-2xl font-bold">{stats.averageResponseTime}s</p>
              </div>
              <Clock className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="rules" className="w-full">
        <TabsList>
          <TabsTrigger value="rules">Automation Rules</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-6">
          {/* Filters */}
          <div className="flex items-center gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
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
                <SelectValue placeholder="Category" />
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

          {/* Rules List */}
          <div className="space-y-4">
            {filteredRules.map((rule: AutomationRule) => (
              <Card key={rule.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        {getCategoryIcon(rule.category)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{rule.name}</h3>
                          {getStatusBadge(rule.status)}
                          <Badge variant="outline" className="text-xs">
                            {rule.category}
                          </Badge>
                        </div>
                        <p className="text-gray-600 mb-3">{rule.description}</p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Triggered:</span>
                            <span className="ml-2 font-medium">{rule.triggerCount} times</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Success Rate:</span>
                            <span className="ml-2 font-medium">{rule.successRate}%</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Last Run:</span>
                            <span className="ml-2 font-medium">
                              {rule.lastTriggered ? format(new Date(rule.lastTriggered), 'MMM d, HH:mm') : 'Never'}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Actions:</span>
                            <span className="ml-2 font-medium">{rule.actions.length}</span>
                          </div>
                        </div>

                        {rule.actions.length > 0 && (
                          <div className="mt-4">
                            <div className="text-sm text-gray-600 mb-2">Actions:</div>
                            <div className="flex flex-wrap gap-2">
                              {rule.actions.map((action: any, index: number) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {action.type.replace('_', ' ')}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={rule.status === 'active'}
                        onCheckedChange={() => toggleRuleMutation.mutate(rule.id)}
                        disabled={toggleRuleMutation.isPending}
                      />
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Performing Rules */}
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Rules</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.topPerformingRules.map((rule: any, index: number) => (
                    <div key={rule.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                        </div>
                        <div>
                          <div className="font-medium">{rule.name}</div>
                          <div className="text-sm text-gray-600">{rule.triggerCount} executions</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-green-600">{rule.successRate}%</div>
                        <div className="text-xs text-gray-500">success rate</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Execution Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Execution Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      {Math.round((stats.successfulExecutions / stats.totalTriggers) * 100)}%
                    </div>
                    <div className="text-sm text-gray-600">Overall Success Rate</div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Successful</span>
                      <span className="text-green-600 font-semibold">{stats.successfulExecutions}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Failed</span>
                      <span className="text-red-600 font-semibold">{stats.failedExecutions}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total Triggers</span>
                      <span className="font-semibold">{stats.totalTriggers}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.recentActivity.map((activity: any) => (
                  <div key={activity.id} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className={`w-3 h-3 rounded-full ${
                      activity.status === 'success' ? 'bg-green-500' : 
                      activity.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
                    }`}></div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{activity.ruleName}</span>
                        <Badge variant="outline" className="text-xs">
                          {activity.trigger}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {activity.action}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600">
                        {activity.details}
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      {format(new Date(activity.timestamp), 'MMM d, HH:mm')}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}