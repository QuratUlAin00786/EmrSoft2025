import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from "recharts";
import { 
  Users,
  TrendingUp,
  TrendingDown,
  Shield,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Heart,
  Activity,
  Thermometer,
  Eye,
  Stethoscope,
  Filter,
  Download,
  Bell,
  MapPin,
  Target
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface Cohort {
  id: string;
  name: string;
  description: string;
  criteria: {
    ageRange?: { min: number; max: number };
    conditions?: string[];
    riskFactors?: string[];
    geography?: string;
  };
  patientCount: number;
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  lastUpdated: string;
  interventions: Array<{
    id: string;
    name: string;
    type: 'preventive' | 'screening' | 'treatment';
    status: 'active' | 'completed' | 'scheduled';
    completionRate: number;
  }>;
}

interface PublicHealthMetric {
  category: string;
  metric: string;
  current: number;
  target: number;
  trend: 'up' | 'down' | 'stable';
  timeframe: string;
  description: string;
}

interface PreventiveCare {
  id: string;
  patientId: string;
  patientName: string;
  careType: 'vaccination' | 'screening' | 'wellness_check' | 'chronic_disease_management';
  dueDate: string;
  status: 'due' | 'overdue' | 'completed' | 'scheduled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  description: string;
  lastCompleted?: string;
}

export default function PopulationHealth() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedCohort, setSelectedCohort] = useState<string>("all");
  const [filterRisk, setFilterRisk] = useState<string>("all");
  const { toast } = useToast();

  // Fetch population health data
  const { data: populationData, isLoading: populationLoading } = useQuery({
    queryKey: ["/api/population-health/overview"],
    enabled: true
  });

  // Fetch cohorts
  const { data: cohorts, isLoading: cohortsLoading } = useQuery({
    queryKey: ["/api/population-health/cohorts"],
    enabled: true
  });

  // Fetch preventive care reminders
  const { data: preventiveCare, isLoading: preventiveLoading } = useQuery({
    queryKey: ["/api/population-health/preventive-care"],
    enabled: true
  });

  // Create cohort mutation
  const createCohortMutation = useMutation({
    mutationFn: async (cohortData: Partial<Cohort>) => {
      const response = await fetch("/api/population-health/cohorts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cohortData),
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to create cohort");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/population-health/cohorts"] });
      toast({ title: "Cohort created successfully" });
    }
  });

  // Mock data
  const mockCohorts: Cohort[] = [
    {
      id: "cohort_1",
      name: "Diabetes Management",
      description: "Patients with Type 2 diabetes requiring active management",
      criteria: {
        conditions: ["Type 2 Diabetes"],
        ageRange: { min: 35, max: 75 }
      },
      patientCount: 247,
      riskLevel: "high",
      lastUpdated: "2024-06-26T10:00:00Z",
      interventions: [
        {
          id: "int_1",
          name: "Quarterly HbA1c Testing",
          type: "screening",
          status: "active",
          completionRate: 78
        },
        {
          id: "int_2",
          name: "Annual Eye Exam",
          type: "screening",
          status: "active",
          completionRate: 65
        },
        {
          id: "int_3",
          name: "Diabetes Education Program",
          type: "preventive",
          status: "active",
          completionRate: 82
        }
      ]
    },
    {
      id: "cohort_2",
      name: "Cardiovascular Risk",
      description: "Patients at high risk for cardiovascular disease",
      criteria: {
        riskFactors: ["Hypertension", "High Cholesterol", "Smoking"],
        ageRange: { min: 40, max: 80 }
      },
      patientCount: 189,
      riskLevel: "high",
      lastUpdated: "2024-06-26T09:30:00Z",
      interventions: [
        {
          id: "int_4",
          name: "Statin Therapy",
          type: "treatment",
          status: "active",
          completionRate: 85
        },
        {
          id: "int_5",
          name: "Blood Pressure Monitoring",
          type: "screening",
          status: "active",
          completionRate: 92
        }
      ]
    },
    {
      id: "cohort_3",
      name: "Preventive Care",
      description: "Patients due for routine preventive care",
      criteria: {
        ageRange: { min: 18, max: 100 }
      },
      patientCount: 456,
      riskLevel: "moderate",
      lastUpdated: "2024-06-26T11:00:00Z",
      interventions: [
        {
          id: "int_6",
          name: "Annual Physical Exam",
          type: "preventive",
          status: "active",
          completionRate: 71
        },
        {
          id: "int_7",
          name: "Cancer Screening",
          type: "screening",
          status: "active",
          completionRate: 68
        }
      ]
    }
  ];

  const mockPublicHealthMetrics: PublicHealthMetric[] = [
    {
      category: "Vaccination",
      metric: "Flu Vaccination Rate",
      current: 73,
      target: 80,
      trend: "up",
      timeframe: "2024 Season",
      description: "Percentage of eligible patients who received flu vaccine"
    },
    {
      category: "Screening",
      metric: "Mammography Screening",
      current: 82,
      target: 85,
      trend: "up",
      timeframe: "Last 2 Years",
      description: "Women 50-74 who received mammogram"
    },
    {
      category: "Chronic Disease",
      metric: "Diabetes Control (HbA1c <7%)",
      current: 68,
      target: 75,
      trend: "stable",
      timeframe: "Last 6 Months",
      description: "Diabetic patients with controlled blood sugar"
    },
    {
      category: "Mental Health",
      metric: "Depression Screening",
      current: 45,
      target: 60,
      trend: "down",
      timeframe: "Last Year",
      description: "Adult patients screened for depression"
    }
  ];

  const mockPreventiveCare: PreventiveCare[] = [
    {
      id: "prev_1",
      patientId: "patient_1",
      patientName: "Sarah Johnson",
      careType: "screening",
      dueDate: "2024-07-15",
      status: "overdue",
      priority: "high",
      description: "Mammography screening",
      lastCompleted: "2022-07-20"
    },
    {
      id: "prev_2",
      patientId: "patient_2",
      patientName: "Michael Chen",
      careType: "vaccination",
      dueDate: "2024-07-01",
      status: "due",
      priority: "medium",
      description: "Annual flu vaccination",
      lastCompleted: "2023-09-15"
    },
    {
      id: "prev_3",
      patientId: "patient_3",
      patientName: "Emma Davis",
      careType: "chronic_disease_management",
      dueDate: "2024-06-30",
      status: "due",
      priority: "high",
      description: "Diabetes follow-up and HbA1c test",
      lastCompleted: "2024-03-28"
    }
  ];

  const populationTrendData = [
    { month: "Jan", diabetes: 240, hypertension: 320, total: 1200 },
    { month: "Feb", diabetes: 245, hypertension: 315, total: 1215 },
    { month: "Mar", diabetes: 247, hypertension: 318, total: 1230 },
    { month: "Apr", diabetes: 250, hypertension: 322, total: 1245 },
    { month: "May", diabetes: 248, hypertension: 325, total: 1260 },
    { month: "Jun", diabetes: 247, hypertension: 328, total: 1275 }
  ];

  const riskDistributionData = [
    { name: "Low Risk", value: 45, count: 574, color: "#22c55e" },
    { name: "Moderate Risk", value: 30, count: 383, color: "#eab308" },
    { name: "High Risk", value: 20, count: 255, color: "#f97316" },
    { name: "Critical Risk", value: 5, count: 64, color: "#ef4444" }
  ];

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "critical": return "bg-red-100 text-red-800 border-red-200";
      case "high": return "bg-orange-100 text-orange-800 border-orange-200";
      case "moderate": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low": return "bg-green-100 text-green-800 border-green-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "overdue": return "bg-red-100 text-red-800";
      case "due": return "bg-yellow-100 text-yellow-800";
      case "scheduled": return "bg-blue-100 text-blue-800";
      case "completed": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-100 text-red-800";
      case "high": return "bg-orange-100 text-orange-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "low": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Population Health</h1>
          <p className="text-gray-600 mt-1">Manage patient cohorts and community health initiatives</p>
        </div>
        <div className="flex gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Users className="w-4 h-4 mr-2" />
                Create Cohort
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Patient Cohort</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Cohort Name</label>
                  <Input placeholder="Enter cohort name" className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">Age Range</label>
                  <div className="flex gap-2 mt-1">
                    <Input placeholder="Min age" type="number" />
                    <Input placeholder="Max age" type="number" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Conditions</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select conditions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="diabetes">Diabetes</SelectItem>
                      <SelectItem value="hypertension">Hypertension</SelectItem>
                      <SelectItem value="copd">COPD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full">Create Cohort</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="cohorts">Cohorts</TabsTrigger>
          <TabsTrigger value="preventive">Preventive Care</TabsTrigger>
          <TabsTrigger value="metrics">Public Health</TabsTrigger>
          <TabsTrigger value="interventions">Interventions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Patients</p>
                    <p className="text-2xl font-bold">1,276</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-500" />
                </div>
                <div className="flex items-center mt-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-green-600">+5.2% from last month</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">High Risk</p>
                    <p className="text-2xl font-bold">319</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-orange-500" />
                </div>
                <div className="flex items-center mt-2 text-sm">
                  <TrendingDown className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-green-600">-2.1% from last month</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Prevention Rate</p>
                    <p className="text-2xl font-bold">78%</p>
                  </div>
                  <Shield className="w-8 h-8 text-green-500" />
                </div>
                <div className="flex items-center mt-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-green-600">+3.4% from last month</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Cohorts</p>
                    <p className="text-2xl font-bold">12</p>
                  </div>
                  <Target className="w-8 h-8 text-purple-500" />
                </div>
                <div className="flex items-center mt-2 text-sm">
                  <span className="text-gray-600">3 new this month</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Population Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Population Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={populationTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} />
                    <Line type="monotone" dataKey="diabetes" stroke="#ef4444" strokeWidth={2} />
                    <Line type="monotone" dataKey="hypertension" stroke="#f97316" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={riskDistributionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {riskDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cohorts" className="space-y-4">
          <div className="flex gap-4 items-center">
            <Select value={filterRisk} onValueChange={setFilterRisk}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by risk level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risk Levels</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4">
            {mockCohorts.map((cohort) => (
              <Card key={cohort.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {cohort.name}
                        <Badge className={getRiskColor(cohort.riskLevel)}>
                          {cohort.riskLevel} risk
                        </Badge>
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1">{cohort.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">{cohort.patientCount}</div>
                      <div className="text-sm text-gray-500">patients</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm mb-2">Criteria</h4>
                    <div className="flex flex-wrap gap-2">
                      {cohort.criteria.ageRange && (
                        <Badge variant="outline">
                          Age {cohort.criteria.ageRange.min}-{cohort.criteria.ageRange.max}
                        </Badge>
                      )}
                      {cohort.criteria.conditions?.map((condition) => (
                        <Badge key={condition} variant="outline">{condition}</Badge>
                      ))}
                      {cohort.criteria.riskFactors?.map((factor) => (
                        <Badge key={factor} variant="outline">{factor}</Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm mb-3">Active Interventions</h4>
                    <div className="space-y-3">
                      {cohort.interventions.map((intervention) => (
                        <div key={intervention.id} className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{intervention.name}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {intervention.type}
                              </Badge>
                              <Badge 
                                className={`text-xs ${
                                  intervention.status === 'active' ? 'bg-green-100 text-green-800' : 
                                  'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {intervention.status}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="text-sm font-medium">{intervention.completionRate}%</div>
                              <div className="text-xs text-gray-500">completion</div>
                            </div>
                            <Progress value={intervention.completionRate} className="w-16" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button size="sm">View Details</Button>
                    <Button size="sm" variant="outline">Edit Cohort</Button>
                    <Button size="sm" variant="outline">
                      <Bell className="w-4 h-4 mr-1" />
                      Set Alerts
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="preventive" className="space-y-4">
          <div className="grid gap-4">
            {mockPreventiveCare.map((care) => (
              <Card key={care.id} className={care.status === 'overdue' ? 'border-red-200 bg-red-50' : ''}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium">{care.patientName}</h3>
                        <Badge className={getStatusColor(care.status)}>{care.status}</Badge>
                        <Badge className={getPriorityColor(care.priority)}>{care.priority}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{care.description}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>Due: {format(new Date(care.dueDate), 'MMM dd, yyyy')}</span>
                        {care.lastCompleted && (
                          <span>Last: {format(new Date(care.lastCompleted), 'MMM dd, yyyy')}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm">Schedule</Button>
                      <Button size="sm" variant="outline">Contact</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid gap-4">
            {mockPublicHealthMetrics.map((metric, idx) => (
              <Card key={idx}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{metric.metric}</h3>
                      <p className="text-sm text-gray-600">{metric.description}</p>
                      <Badge variant="outline" className="mt-1">{metric.timeframe}</Badge>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-blue-600">{metric.current}%</div>
                      <div className="text-sm text-gray-500">Target: {metric.target}%</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress to Target</span>
                      <span>{Math.round((metric.current / metric.target) * 100)}%</span>
                    </div>
                    <Progress value={(metric.current / metric.target) * 100} />
                  </div>

                  <div className="flex items-center mt-3 text-sm">
                    {metric.trend === 'up' ? (
                      <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                    ) : metric.trend === 'down' ? (
                      <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                    ) : (
                      <Activity className="w-4 h-4 text-gray-500 mr-1" />
                    )}
                    <span className={
                      metric.trend === 'up' ? 'text-green-600' :
                      metric.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                    }>
                      {metric.trend === 'up' ? 'Improving' : 
                       metric.trend === 'down' ? 'Declining' : 'Stable'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="interventions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Population Health Interventions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Design and implement targeted interventions for specific patient populations.
              </p>
              <Button>
                <Target className="w-4 h-4 mr-2" />
                Create Intervention
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}