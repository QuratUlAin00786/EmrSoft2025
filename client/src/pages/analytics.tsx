import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Clock,
  Activity,
  AlertTriangle,
  CheckCircle,
  Download,
  Filter
} from "lucide-react";
import { format } from "date-fns";

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
    totalPatients: 1247,
    newPatients: 89,
    totalAppointments: 456,
    completedAppointments: 398,
    revenue: 125800,
    averageWaitTime: 18,
    patientSatisfaction: 4.6,
    noShowRate: 8.2
  },
  trends: {
    patientGrowth: [
      { month: "Jan", total: 1050, new: 67 },
      { month: "Feb", total: 1089, new: 72 },
      { month: "Mar", total: 1134, new: 81 },
      { month: "Apr", total: 1178, new: 79 },
      { month: "May", total: 1208, new: 85 },
      { month: "Jun", total: 1247, new: 89 }
    ],
    appointmentVolume: [
      { date: "2024-06-10", scheduled: 45, completed: 42, cancelled: 2, noShow: 1 },
      { date: "2024-06-11", scheduled: 52, completed: 47, cancelled: 3, noShow: 2 },
      { date: "2024-06-12", scheduled: 48, completed: 44, cancelled: 2, noShow: 2 },
      { date: "2024-06-13", scheduled: 51, completed: 46, cancelled: 3, noShow: 2 },
      { date: "2024-06-14", scheduled: 49, completed: 45, cancelled: 2, noShow: 2 }
    ],
    revenue: [
      { month: "Jan", amount: 98500, target: 100000 },
      { month: "Feb", amount: 102300, target: 105000 },
      { month: "Mar", amount: 118900, target: 115000 },
      { month: "Apr", amount: 121500, target: 120000 },
      { month: "May", amount: 119800, target: 122000 },
      { month: "Jun", amount: 125800, target: 125000 }
    ]
  },
  demographics: {
    ageGroups: [
      { range: "0-18", count: 187, percentage: 15 },
      { range: "19-35", count: 312, percentage: 25 },
      { range: "36-50", count: 374, percentage: 30 },
      { range: "51-65", count: 249, percentage: 20 },
      { range: "65+", count: 125, percentage: 10 }
    ],
    gender: [
      { type: "Female", count: 673, percentage: 54 },
      { type: "Male", count: 574, percentage: 46 }
    ],
    insuranceTypes: [
      { type: "NHS", count: 748, percentage: 60 },
      { type: "Private", count: 374, percentage: 30 },
      { type: "Self-Pay", count: 125, percentage: 10 }
    ]
  },
  clinical: {
    topDiagnoses: [
      { diagnosis: "Hypertension", count: 145, percentage: 18.2 },
      { diagnosis: "Type 2 Diabetes", count: 128, percentage: 16.1 },
      { diagnosis: "Anxiety Disorders", count: 98, percentage: 12.3 },
      { diagnosis: "Depression", count: 87, percentage: 10.9 },
      { diagnosis: "Asthma", count: 76, percentage: 9.5 }
    ],
    topProcedures: [
      { procedure: "Annual Physical Exam", count: 234, revenue: 23400 },
      { procedure: "Blood Pressure Monitoring", count: 189, revenue: 9450 },
      { procedure: "Diabetes Management", count: 156, revenue: 18720 },
      { procedure: "Mental Health Consultation", count: 98, revenue: 14700 },
      { procedure: "Respiratory Assessment", count: 87, revenue: 8700 }
    ],
    medicationUsage: [
      { medication: "Lisinopril", prescriptions: 145, trend: 8.5 },
      { medication: "Metformin", prescriptions: 128, trend: 12.3 },
      { medication: "Sertraline", prescriptions: 98, trend: -2.1 },
      { medication: "Albuterol", prescriptions: 76, trend: 5.7 },
      { medication: "Atorvastatin", prescriptions: 67, trend: 3.2 }
    ]
  },
  performance: {
    providerStats: [
      { provider: "Dr. Sarah Johnson", appointments: 145, avgDuration: 22, patientSatisfaction: 4.8, revenue: 21750 },
      { provider: "Dr. Michael Chen", appointments: 132, avgDuration: 19, patientSatisfaction: 4.7, revenue: 19800 },
      { provider: "Dr. Emily Davis", appointments: 128, avgDuration: 25, patientSatisfaction: 4.6, revenue: 19200 },
      { provider: "Dr. James Wilson", appointments: 119, avgDuration: 21, patientSatisfaction: 4.5, revenue: 17850 },
      { provider: "Dr. Lisa Anderson", appointments: 98, avgDuration: 24, patientSatisfaction: 4.7, revenue: 14700 }
    ],
    departmentMetrics: [
      { department: "Primary Care", utilization: 87, waitTime: 15, satisfaction: 4.6 },
      { department: "Cardiology", utilization: 92, waitTime: 22, satisfaction: 4.7 },
      { department: "Mental Health", utilization: 78, waitTime: 12, satisfaction: 4.8 },
      { department: "Endocrinology", utilization: 85, waitTime: 18, satisfaction: 4.5 },
      { department: "Pulmonology", utilization: 73, waitTime: 16, satisfaction: 4.4 }
    ]
  },
  quality: {
    qualityMetrics: [
      { metric: "Patient Safety Score", value: 95, target: 90, status: "good" },
      { metric: "Readmission Rate", value: 8.2, target: 10, status: "good" },
      { metric: "Medication Adherence", value: 78, target: 85, status: "warning" },
      { metric: "Preventive Care Completion", value: 82, target: 80, status: "good" },
      { metric: "Clinical Quality Score", value: 88, target: 90, status: "warning" }
    ],
    patientOutcomes: [
      { outcome: "Diabetes Control (HbA1c <7%)", rate: 76, benchmark: 70 },
      { outcome: "Hypertension Control", rate: 83, benchmark: 80 },
      { outcome: "Depression Remission", rate: 68, benchmark: 65 },
      { outcome: "Asthma Control", rate: 81, benchmark: 75 }
    ]
  }
};

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AnalyticsPage() {
  const { data: analyticsData = mockAnalyticsData, isLoading } = useQuery({
    queryKey: ['/api/analytics'],
  });

  // Type-safe data access
  const analytics = analyticsData as AnalyticsData;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  if (isLoading) {
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
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">Comprehensive insights into practice performance</p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Patients</p>
                <p className="text-2xl font-bold">{analytics.overview.totalPatients.toLocaleString()}</p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +{analytics.overview.newPatients} this month
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
                <p className="text-2xl font-bold">{analytics.overview.totalAppointments.toLocaleString()}</p>
                <p className="text-xs text-blue-600 flex items-center mt-1">
                  {Math.round((analytics.overview.completedAppointments / analytics.overview.totalAppointments) * 100)}% completion rate
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
                <p className="text-2xl font-bold">{formatCurrency(analytics.overview.revenue)}</p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +5.2% vs last month
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Wait Time</p>
                <p className="text-2xl font-bold">{analytics.overview.averageWaitTime}min</p>
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

      {/* Analytics Tabs */}
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Patient Growth */}
            <Card>
              <CardHeader>
                <CardTitle>Patient Growth Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analytics.trends.patientGrowth}>
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

            {/* Appointment Volume */}
            <Card>
              <CardHeader>
                <CardTitle>Appointment Volume</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.trends.appointmentVolume}>
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

          {/* Patient Satisfaction */}
          <Card>
            <CardHeader>
              <CardTitle>Patient Satisfaction</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center p-8">
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-600 mb-2">
                    {analytics.overview.patientSatisfaction}/5.0
                  </div>
                  <div className="text-sm text-gray-600">Average Rating</div>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="w-16">No Shows:</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div className="bg-red-500 h-2 rounded-full" style={{ width: `${analytics.overview.noShowRate}%` }}></div>
                      </div>
                      <span className="text-sm text-red-600">{analytics.overview.noShowRate}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patients" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Age Demographics */}
            <Card>
              <CardHeader>
                <CardTitle>Age Demographics</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.demographics.ageGroups}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ range, percentage }) => `${range}: ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {analytics.demographics.ageGroups.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Insurance Types */}
            <Card>
              <CardHeader>
                <CardTitle>Insurance Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.demographics.insuranceTypes}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ type, percentage }) => `${type}: ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {analytics.demographics.insuranceTypes.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="clinical" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Diagnoses */}
            <Card>
              <CardHeader>
                <CardTitle>Top Diagnoses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.clinical.topDiagnoses.map((diagnosis: any, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                        </div>
                        <div>
                          <div className="font-medium">{diagnosis.diagnosis}</div>
                          <div className="text-sm text-gray-600">{diagnosis.count} cases</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{diagnosis.percentage}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Medication Usage */}
            <Card>
              <CardHeader>
                <CardTitle>Top Medications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.clinical.medicationUsage.map((med: any, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-green-600">#{index + 1}</span>
                        </div>
                        <div>
                          <div className="font-medium">{med.medication}</div>
                          <div className="text-sm text-gray-600">{med.prescriptions} prescriptions</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-semibold ${med.trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {med.trend > 0 ? '+' : ''}{med.trend}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={analytics.trends.revenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Line type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={3} />
                  <Line type="monotone" dataKey="target" stroke="#94a3b8" strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Department Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Department Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.performance.departmentMetrics.map((dept: any, index: number) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{dept.department}</h4>
                        <Badge variant={dept.utilization > 85 ? 'default' : 'secondary'}>
                          {dept.utilization}% utilized
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Wait Time:</span>
                          <span className="ml-2 font-medium">{dept.waitTime} min</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Satisfaction:</span>
                          <span className="ml-2 font-medium">{dept.satisfaction}/5.0</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Provider Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Top Providers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.performance.providerStats.map((provider: any, index: number) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{provider.provider}</h4>
                        <Badge variant="outline">{provider.appointments} appointments</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <span className="text-gray-600">Duration:</span>
                          <span className="ml-1 font-medium">{provider.avgDuration}min</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Rating:</span>
                          <span className="ml-1 font-medium">{provider.patientSatisfaction}/5.0</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Revenue:</span>
                          <span className="ml-1 font-medium">{formatCurrency(provider.revenue)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="quality" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quality Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Quality Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.quality.qualityMetrics.map((metric: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          metric.status === 'good' ? 'bg-green-500' : 
                          metric.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}></div>
                        <div>
                          <div className="font-medium">{metric.metric}</div>
                          <div className="text-sm text-gray-600">Target: {metric.target}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{metric.value}</div>
                        <Badge variant={metric.status === 'good' ? 'default' : metric.status === 'warning' ? 'secondary' : 'destructive'}>
                          {metric.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Patient Outcomes */}
            <Card>
              <CardHeader>
                <CardTitle>Patient Outcomes</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.quality.patientOutcomes}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="outcome" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="rate" fill="#10b981" />
                    <Bar dataKey="benchmark" fill="#94a3b8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}