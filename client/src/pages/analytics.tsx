import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button as DateButton } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from "recharts";
import { 
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  DollarSign,
  Activity,
  Clock,
  FileText,
  AlertTriangle,
  CheckCircle,
  Download,
  Filter,
  Share,
  RefreshCw
} from "lucide-react";
import { format, subDays, subMonths } from "date-fns";

interface AnalyticsData {
  overview: {
    totalPatients: number;
    newPatients: number;
    totalAppointments: number;
    completedAppointments: number;
    revenue: number;
    averageWaitTime: number;
    patientSatisfaction: number;
    noShowRate: number;
  };
  trends: {
    patientGrowth: Array<{
      month: string;
      total: number;
      new: number;
    }>;
    appointmentVolume: Array<{
      date: string;
      scheduled: number;
      completed: number;
      cancelled: number;
      noShow: number;
    }>;
    revenue: Array<{
      month: string;
      amount: number;
      target: number;
    }>;
  };
  demographics: {
    ageGroups: Array<{
      range: string;
      count: number;
      percentage: number;
    }>;
    gender: Array<{
      type: string;
      count: number;
      percentage: number;
    }>;
    insuranceTypes: Array<{
      type: string;
      count: number;
      percentage: number;
    }>;
  };
  clinical: {
    topDiagnoses: Array<{
      diagnosis: string;
      count: number;
      percentage: number;
    }>;
    topProcedures: Array<{
      procedure: string;
      count: number;
      revenue: number;
    }>;
    medicationUsage: Array<{
      medication: string;
      prescriptions: number;
      trend: number;
    }>;
  };
  performance: {
    providerStats: Array<{
      provider: string;
      appointments: number;
      avgDuration: number;
      patientSatisfaction: number;
      revenue: number;
    }>;
    departmentMetrics: Array<{
      department: string;
      utilization: number;
      waitTime: number;
      satisfaction: number;
    }>;
  };
  quality: {
    qualityMetrics: Array<{
      metric: string;
      value: number;
      target: number;
      status: 'good' | 'warning' | 'critical';
    }>;
    patientOutcomes: Array<{
      outcome: string;
      rate: number;
      benchmark: number;
    }>;
  };
}

const mockAnalyticsData: AnalyticsData = {
  overview: {
    totalPatients: 2847,
    newPatients: 156,
    totalAppointments: 1234,
    completedAppointments: 1089,
    revenue: 145670,
    averageWaitTime: 12,
    patientSatisfaction: 4.6,
    noShowRate: 8.2
  },
  trends: {
    patientGrowth: [
      { month: 'Jan', total: 2650, new: 120 },
      { month: 'Feb', total: 2720, new: 135 },
      { month: 'Mar', total: 2780, new: 142 },
      { month: 'Apr', total: 2825, new: 148 },
      { month: 'May', total: 2847, new: 156 }
    ],
    appointmentVolume: [
      { date: '2024-01-15', scheduled: 45, completed: 42, cancelled: 2, noShow: 1 },
      { date: '2024-01-16', scheduled: 52, completed: 48, cancelled: 3, noShow: 1 },
      { date: '2024-01-17', scheduled: 38, completed: 35, cancelled: 1, noShow: 2 },
      { date: '2024-01-18', scheduled: 41, completed: 38, cancelled: 2, noShow: 1 },
      { date: '2024-01-19', scheduled: 47, completed: 43, cancelled: 2, noShow: 2 }
    ],
    revenue: [
      { month: 'Jan', amount: 142500, target: 140000 },
      { month: 'Feb', amount: 138200, target: 140000 },
      { month: 'Mar', amount: 145600, target: 140000 },
      { month: 'Apr', amount: 148900, target: 140000 },
      { month: 'May', amount: 145670, target: 140000 }
    ]
  },
  demographics: {
    ageGroups: [
      { range: '0-18', count: 485, percentage: 17.0 },
      { range: '19-35', count: 712, percentage: 25.0 },
      { range: '36-50', count: 825, percentage: 29.0 },
      { range: '51-65', count: 540, percentage: 19.0 },
      { range: '65+', count: 285, percentage: 10.0 }
    ],
    gender: [
      { type: 'Female', count: 1482, percentage: 52.1 },
      { type: 'Male', count: 1298, percentage: 45.6 },
      { type: 'Other', count: 67, percentage: 2.3 }
    ],
    insuranceTypes: [
      { type: 'NHS', count: 1986, percentage: 69.8 },
      { type: 'Private', count: 542, percentage: 19.0 },
      { type: 'Self-Pay', count: 319, percentage: 11.2 }
    ]
  },
  clinical: {
    topDiagnoses: [
      { diagnosis: 'Hypertension', count: 285, percentage: 12.5 },
      { diagnosis: 'Type 2 Diabetes', count: 198, percentage: 8.7 },
      { diagnosis: 'Anxiety Disorders', count: 167, percentage: 7.3 },
      { diagnosis: 'Upper Respiratory Infection', count: 145, percentage: 6.4 },
      { diagnosis: 'Depression', count: 132, percentage: 5.8 }
    ],
    topProcedures: [
      { procedure: 'Annual Physical Exam', count: 425, revenue: 42500 },
      { procedure: 'Blood Work Panel', count: 312, revenue: 18720 },
      { procedure: 'ECG', count: 198, revenue: 11880 },
      { procedure: 'Vaccination', count: 156, revenue: 4680 },
      { procedure: 'Wound Care', count: 98, revenue: 7840 }
    ],
    medicationUsage: [
      { medication: 'Lisinopril', prescriptions: 185, trend: 5.2 },
      { medication: 'Metformin', prescriptions: 142, trend: 3.1 },
      { medication: 'Sertraline', prescriptions: 98, trend: -2.4 },
      { medication: 'Amoxicillin', prescriptions: 87, trend: 12.5 },
      { medication: 'Simvastatin', prescriptions: 76, trend: 1.8 }
    ]
  },
  performance: {
    providerStats: [
      { provider: 'Dr. Sarah Smith', appointments: 312, avgDuration: 18, patientSatisfaction: 4.8, revenue: 31200 },
      { provider: 'Dr. Michael Chen', appointments: 287, avgDuration: 22, patientSatisfaction: 4.6, revenue: 28700 },
      { provider: 'Dr. Emma Wilson', appointments: 245, avgDuration: 19, patientSatisfaction: 4.7, revenue: 24500 },
      { provider: 'Dr. James Brown', appointments: 198, avgDuration: 25, patientSatisfaction: 4.5, revenue: 19800 }
    ],
    departmentMetrics: [
      { department: 'General Practice', utilization: 85, waitTime: 12, satisfaction: 4.6 },
      { department: 'Cardiology', utilization: 78, waitTime: 18, satisfaction: 4.4 },
      { department: 'Dermatology', utilization: 92, waitTime: 25, satisfaction: 4.2 },
      { department: 'Mental Health', utilization: 73, waitTime: 8, satisfaction: 4.8 }
    ]
  },
  quality: {
    qualityMetrics: [
      { metric: 'Patient Safety Score', value: 95, target: 90, status: 'good' },
      { metric: 'Infection Control Rate', value: 98, target: 95, status: 'good' },
      { metric: 'Medication Error Rate', value: 0.3, target: 0.5, status: 'good' },
      { metric: 'Readmission Rate', value: 12, target: 10, status: 'warning' },
      { metric: 'Mortality Rate', value: 2.1, target: 2.0, status: 'warning' }
    ],
    patientOutcomes: [
      { outcome: 'Treatment Success Rate', rate: 94.2, benchmark: 92.0 },
      { outcome: 'Patient Compliance', rate: 87.5, benchmark: 85.0 },
      { outcome: 'Recovery Time', rate: 89.3, benchmark: 88.0 },
      { outcome: 'Quality of Life Score', rate: 8.2, benchmark: 7.8 }
    ]
  }
};

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState({
    from: subMonths(new Date(), 1),
    to: new Date()
  });
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedProvider, setSelectedProvider] = useState("all");

  const { data: analyticsData = mockAnalyticsData, isLoading } = useQuery({
    queryKey: ["/api/analytics", dateRange, selectedDepartment, selectedProvider],
    enabled: true,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return null;
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading analytics...</div>;
  }

  return (
    <>
      <Header title="Analytics & Reporting" />
      
      <div className="p-6 space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span className="text-sm font-medium">Filters:</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">Date Range:</span>
                <select className="border rounded px-2 py-1 text-sm">
                  <option>Last 30 Days</option>
                  <option>Last 90 Days</option>
                  <option>Last Year</option>
                </select>
              </div>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  <SelectItem value="general">General Practice</SelectItem>
                  <SelectItem value="cardiology">Cardiology</SelectItem>
                  <SelectItem value="dermatology">Dermatology</SelectItem>
                  <SelectItem value="mental-health">Mental Health</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Providers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Providers</SelectItem>
                  <SelectItem value="dr-smith">Dr. Sarah Smith</SelectItem>
                  <SelectItem value="dr-chen">Dr. Michael Chen</SelectItem>
                  <SelectItem value="dr-wilson">Dr. Emma Wilson</SelectItem>
                  <SelectItem value="dr-brown">Dr. James Brown</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2 ml-auto">
                <Button variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button variant="outline" size="sm">
                  <Share className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="patients">Patients</TabsTrigger>
            <TabsTrigger value="clinical">Clinical</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="quality">Quality</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Patients</p>
                      <p className="text-2xl font-bold">{(analyticsData as any)?.overview?.totalPatients?.toLocaleString() || '0'}</p>
                      <p className="text-xs text-green-600 flex items-center mt-1">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        +{(analyticsData as any)?.overview?.newPatients || 0} this month
                      </p>
                    </div>
                    <Users className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Appointments</p>
                      <p className="text-2xl font-bold">{(analyticsData as any)?.overview?.totalAppointments?.toLocaleString() || '0'}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {Math.round(((analyticsData as any)?.overview?.completedAppointments || 0) / ((analyticsData as any)?.overview?.totalAppointments || 1) * 100)}% completion rate
                      </p>
                    </div>
                    <Calendar className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Revenue</p>
                      <p className="text-2xl font-bold">{formatCurrency((analyticsData as any)?.overview?.revenue || 0)}</p>
                      <p className="text-xs text-green-600 flex items-center mt-1">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        +5.2% vs last month
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Avg Wait Time</p>
                      <p className="text-2xl font-bold">{analyticsData.overview.averageWaitTime}min</p>
                      <p className="text-xs text-green-600 flex items-center mt-1">
                        <TrendingDown className="h-3 w-3 mr-1" />
                        -2min vs last month
                      </p>
                    </div>
                    <Clock className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Patient Growth Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={analyticsData.trends.patientGrowth}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Area type="monotone" dataKey="total" stackId="1" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.8} />
                      <Area type="monotone" dataKey="new" stackId="2" stroke="#10b981" fill="#10b981" fillOpacity={0.8} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Appointment Volume</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analyticsData.trends.appointmentVolume}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tickFormatter={(value) => format(new Date(value), 'MMM d')} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="completed" stackId="a" fill="#10b981" />
                      <Bar dataKey="cancelled" stackId="a" fill="#f59e0b" />
                      <Bar dataKey="noShow" stackId="a" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Patient Satisfaction & Quality Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Patient Satisfaction</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-green-600 mb-2">
                      {analyticsData.overview.patientSatisfaction}/5.0
                    </div>
                    <div className="text-sm text-gray-600">Average Rating</div>
                    <div className="mt-4 space-y-2">
                      {[5, 4, 3, 2, 1].map((star) => (
                        <div key={star} className="flex items-center gap-2">
                          <span className="text-sm w-4">{star}</span>
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-yellow-400 h-2 rounded-full" 
                              style={{ width: `${Math.random() * 80 + 20}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Demographics</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={analyticsData.demographics.ageGroups}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        dataKey="count"
                        label={({ range, percentage }) => `${range}: ${percentage}%`}
                      >
                        {analyticsData.demographics.ageGroups.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Key Performance Indicators</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">No-Show Rate</span>
                    <span className="text-sm text-red-600">{analyticsData.overview.noShowRate}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Avg Wait Time</span>
                    <span className="text-sm text-green-600">{analyticsData.overview.averageWaitTime} min</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Completion Rate</span>
                    <span className="text-sm text-green-600">
                      {Math.round((analyticsData.overview.completedAppointments / analyticsData.overview.totalAppointments) * 100)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Patient Satisfaction</span>
                    <span className="text-sm text-green-600">{analyticsData.overview.patientSatisfaction}/5.0</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="patients" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Patient Demographics by Age</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analyticsData.demographics.ageGroups}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="range" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#0ea5e9" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Insurance Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analyticsData.demographics.insuranceTypes}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="count"
                        label={({ type, percentage }) => `${type}: ${percentage}%`}
                      >
                        {analyticsData.demographics.insuranceTypes.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Patient Registration Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={analyticsData.trends.patientGrowth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="total" stroke="#0ea5e9" strokeWidth={3} />
                    <Line type="monotone" dataKey="new" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clinical" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top Diagnoses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analyticsData.clinical.topDiagnoses.map((diagnosis, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium">{diagnosis.diagnosis}</div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                            <div 
                              className="bg-blue-500 h-2 rounded-full" 
                              style={{ width: `${diagnosis.percentage * 8}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="font-semibold">{diagnosis.count}</div>
                          <div className="text-xs text-gray-600">{diagnosis.percentage}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Medication Usage Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analyticsData.clinical.medicationUsage.map((med, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium">{med.medication}</div>
                          <div className="text-sm text-gray-600">{med.prescriptions} prescriptions</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getTrendIcon(med.trend)}
                          <span className={`text-sm font-medium ${med.trend > 0 ? 'text-green-600' : med.trend < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                            {med.trend > 0 ? '+' : ''}{med.trend}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Procedure Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={analyticsData.clinical.topProcedures}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="procedure" angle={-45} textAnchor="end" height={100} />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Bar yAxisId="left" dataKey="count" fill="#0ea5e9" name="Count" />
                    <Bar yAxisId="right" dataKey="revenue" fill="#10b981" name="Revenue (£)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financial" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue vs Target</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={analyticsData.trends.revenue}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => `£${(value / 1000)}k`} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Bar dataKey="amount" fill="#0ea5e9" name="Actual Revenue" />
                    <Bar dataKey="target" fill="#e5e7eb" name="Target Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue by Department</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analyticsData.performance.departmentMetrics.map((dept, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="font-medium">{dept.department}</span>
                        <span className="text-green-600 font-semibold">
                          {formatCurrency(dept.utilization * 1000)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Provider Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={analyticsData.performance.providerStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="provider" angle={-45} textAnchor="end" height={60} />
                      <YAxis tickFormatter={(value) => `£${(value / 1000)}k`} />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Bar dataKey="revenue" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Provider Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Provider</th>
                        <th className="text-left p-2">Appointments</th>
                        <th className="text-left p-2">Avg Duration</th>
                        <th className="text-left p-2">Satisfaction</th>
                        <th className="text-left p-2">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsData.performance.providerStats.map((provider, index) => (
                        <tr key={index} className="border-b">
                          <td className="p-2 font-medium">{provider.provider}</td>
                          <td className="p-2">{provider.appointments}</td>
                          <td className="p-2">{provider.avgDuration} min</td>
                          <td className="p-2">
                            <div className="flex items-center gap-1">
                              <span>{provider.patientSatisfaction}</span>
                              <Activity className="h-4 w-4 text-yellow-500" />
                            </div>
                          </td>
                          <td className="p-2 text-green-600 font-semibold">
                            {formatCurrency(provider.revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Department Utilization</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.performance.departmentMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="department" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="utilization" fill="#0ea5e9" name="Utilization %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quality" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Quality Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {analyticsData.quality.qualityMetrics.map((metric, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{metric.metric}</span>
                        <Badge className={getStatusColor(metric.status)}>
                          {metric.status}
                        </Badge>
                      </div>
                      <div className="text-2xl font-bold mb-1">{metric.value}%</div>
                      <div className="text-xs text-gray-600">Target: {metric.target}%</div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div 
                          className={`h-2 rounded-full ${
                            metric.status === 'good' ? 'bg-green-500' :
                            metric.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min((metric.value / metric.target) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Patient Outcomes</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.quality.patientOutcomes}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="outcome" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="rate" fill="#0ea5e9" name="Actual Rate" />
                    <Bar dataKey="benchmark" fill="#e5e7eb" name="Benchmark" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}