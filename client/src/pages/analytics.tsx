import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
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
}

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AnalyticsPage() {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    dateRange: '30',
    department: 'all',
    provider: 'all',
    patientType: 'all'
  });

  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['/api/analytics'],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/analytics', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': 'demo'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }
      return response.json();
    }
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  const handleExport = () => {
    const exportData = {
      overview: analytics.overview,
      trends: analytics.trends,
      generatedAt: new Date().toISOString(),
      dateRange: `${filters.dateRange} days`,
      filters: filters
    };

    const csvContent = [
      ['Metric', 'Value'],
      ['Total Patients', analytics.overview.totalPatients],
      ['New Patients', analytics.overview.newPatients],
      ['Total Appointments', analytics.overview.totalAppointments],
      ['Completed Appointments', analytics.overview.completedAppointments],
      ['Revenue', formatCurrency(analytics.overview.revenue)],
      ['Average Wait Time', `${analytics.overview.averageWaitTime}min`],
      ['Patient Satisfaction', `${analytics.overview.patientSatisfaction}%`],
      ['No Show Rate', `${analytics.overview.noShowRate}%`]
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Safe data access with fallbacks
  const analytics = analyticsData as AnalyticsData || {
    overview: {
      totalPatients: 0,
      newPatients: 0,
      totalAppointments: 0,
      completedAppointments: 0,
      revenue: 0,
      averageWaitTime: 0,
      patientSatisfaction: 0,
      noShowRate: 0
    },
    trends: {
      patientGrowth: [],
      appointmentVolume: [],
      revenue: []
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto h-screen overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">Comprehensive insights into practice performance</p>
        </div>
        <div className="flex items-center gap-4">
          <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Filter Analytics</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="dateRange">Date Range</Label>
                  <Select value={filters.dateRange} onValueChange={(value) => setFilters({...filters, dateRange: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">Last 7 days</SelectItem>
                      <SelectItem value="30">Last 30 days</SelectItem>
                      <SelectItem value="90">Last 3 months</SelectItem>
                      <SelectItem value="180">Last 6 months</SelectItem>
                      <SelectItem value="365">Last year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Select value={filters.department} onValueChange={(value) => setFilters({...filters, department: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      <SelectItem value="cardiology">Cardiology</SelectItem>
                      <SelectItem value="general">General Practice</SelectItem>
                      <SelectItem value="orthopedics">Orthopedics</SelectItem>
                      <SelectItem value="pediatrics">Pediatrics</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="provider">Provider</Label>
                  <Select value={filters.provider} onValueChange={(value) => setFilters({...filters, provider: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Providers</SelectItem>
                      <SelectItem value="dr-smith">Dr. Smith</SelectItem>
                      <SelectItem value="dr-jones">Dr. Jones</SelectItem>
                      <SelectItem value="dr-williams">Dr. Williams</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="patientType">Patient Type</Label>
                  <Select value={filters.patientType} onValueChange={(value) => setFilters({...filters, patientType: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Patients</SelectItem>
                      <SelectItem value="new">New Patients</SelectItem>
                      <SelectItem value="returning">Returning Patients</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex justify-end gap-2 mt-6">
                  <Button variant="outline" onClick={() => setIsFilterOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setIsFilterOpen(false)}>
                    Apply Filters
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm" onClick={handleExport}>
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
                  {analytics.overview.totalAppointments > 0 ? 
                    Math.round((analytics.overview.completedAppointments / analytics.overview.totalAppointments) * 100) : 0}% completion rate
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="patients">Patients</TabsTrigger>
          <TabsTrigger value="clinical">Clinical</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
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
          <Card>
            <CardHeader>
              <CardTitle>Patient Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center text-gray-500 py-8">
                Patient analytics data will be displayed here once connected to the database.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clinical" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Clinical Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center text-gray-500 py-8">
                Clinical analytics data will be displayed here once connected to the database.
              </div>
            </CardContent>
          </Card>
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
      </Tabs>
    </div>
  );
}