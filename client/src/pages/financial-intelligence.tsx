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
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from "recharts";
import { 
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Receipt,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Target,
  FileText,
  Download,
  Filter,
  Search,
  Bell,
  Shield,
  Calculator,
  Banknote
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface RevenueData {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
  collections: number;
  target: number;
}

interface Claim {
  id: string;
  patientId: string;
  patientName: string;
  insuranceProvider: string;
  claimNumber: string;
  serviceDate: string;
  submissionDate: string;
  amount: number;
  status: 'submitted' | 'approved' | 'denied' | 'pending' | 'paid';
  denialReason?: string;
  paymentAmount?: number;
  paymentDate?: string;
  procedures: Array<{
    code: string;
    description: string;
    amount: number;
  }>;
}

interface Insurance {
  id: string;
  patientId: string;
  patientName: string;
  provider: string;
  policyNumber: string;
  groupNumber: string;
  status: 'active' | 'inactive' | 'pending' | 'expired';
  coverageType: 'primary' | 'secondary';
  eligibilityStatus: 'verified' | 'pending' | 'invalid';
  lastVerified: string;
  benefits: {
    deductible: number;
    deductibleMet: number;
    copay: number;
    coinsurance: number;
    outOfPocketMax: number;
    outOfPocketMet: number;
  };
}

interface FinancialForecast {
  category: string;
  currentMonth: number;
  projectedNext: number;
  variance: number;
  trend: 'up' | 'down' | 'stable';
  confidence: number;
  factors: string[];
}

export default function FinancialIntelligence() {
  const [activeTab, setActiveTab] = useState("overview");
  const [dateRange, setDateRange] = useState("last_3_months");
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const { toast } = useToast();

  // Fetch revenue data
  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ["/api/financial/revenue", dateRange],
    enabled: true
  });

  // Fetch claims
  const { data: claims, isLoading: claimsLoading } = useQuery({
    queryKey: ["/api/financial/claims"],
    enabled: true
  });

  // Fetch insurance verifications
  const { data: insurances, isLoading: insuranceLoading } = useQuery({
    queryKey: ["/api/financial/insurance"],
    enabled: true
  });

  // Fetch financial forecasts
  const { data: forecasts, isLoading: forecastsLoading } = useQuery({
    queryKey: ["/api/financial/forecasts"],
    enabled: true
  });

  // Submit claim mutation
  const submitClaimMutation = useMutation({
    mutationFn: async (claimData: Partial<Claim>) => {
      const response = await fetch("/api/financial/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(claimData),
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to submit claim");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/financial/claims"] });
      toast({ title: "Claim submitted successfully" });
    }
  });

  // Verify insurance mutation
  const verifyInsuranceMutation = useMutation({
    mutationFn: async (insuranceId: string) => {
      const response = await fetch(`/api/financial/insurance/${insuranceId}/verify`, {
        method: "POST",
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to verify insurance");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/financial/insurance"] });
      toast({ title: "Insurance verification completed" });
    }
  });

  // Mock data
  const mockRevenueData: RevenueData[] = [
    { month: "Jan", revenue: 125000, expenses: 85000, profit: 40000, collections: 118000, target: 130000 },
    { month: "Feb", revenue: 135000, expenses: 88000, profit: 47000, collections: 128000, target: 130000 },
    { month: "Mar", revenue: 142000, expenses: 92000, profit: 50000, collections: 135000, target: 135000 },
    { month: "Apr", revenue: 138000, expenses: 90000, profit: 48000, collections: 132000, target: 135000 },
    { month: "May", revenue: 155000, expenses: 95000, profit: 60000, collections: 148000, target: 140000 },
    { month: "Jun", revenue: 162000, expenses: 98000, profit: 64000, collections: 156000, target: 145000 }
  ];

  const mockClaims: Claim[] = [
    {
      id: "claim_1",
      patientId: "patient_1",
      patientName: "Sarah Johnson",
      insuranceProvider: "Aetna",
      claimNumber: "CLM-2024-001234",
      serviceDate: "2024-06-20",
      submissionDate: "2024-06-21",
      amount: 450.00,
      status: "approved",
      paymentAmount: 380.00,
      paymentDate: "2024-06-25",
      procedures: [
        { code: "99213", description: "Office visit, established patient", amount: 180.00 },
        { code: "85025", description: "Complete blood count", amount: 45.00 },
        { code: "80053", description: "Comprehensive metabolic panel", amount: 65.00 }
      ]
    },
    {
      id: "claim_2",
      patientId: "patient_2",
      patientName: "Michael Chen",
      insuranceProvider: "Blue Cross Blue Shield",
      claimNumber: "CLM-2024-001235",
      serviceDate: "2024-06-22",
      submissionDate: "2024-06-23",
      amount: 285.00,
      status: "denied",
      denialReason: "Prior authorization required",
      procedures: [
        { code: "99214", description: "Office visit, established patient", amount: 220.00 },
        { code: "85027", description: "Complete blood count with differential", amount: 65.00 }
      ]
    },
    {
      id: "claim_3",
      patientId: "patient_3",
      patientName: "Emma Davis",
      insuranceProvider: "United Healthcare",
      claimNumber: "CLM-2024-001236",
      serviceDate: "2024-06-24",
      submissionDate: "2024-06-25",
      amount: 320.00,
      status: "pending",
      procedures: [
        { code: "99215", description: "Office visit, established patient", amount: 280.00 },
        { code: "36415", description: "Venipuncture", amount: 40.00 }
      ]
    }
  ];

  const mockInsurances: Insurance[] = [
    {
      id: "ins_1",
      patientId: "patient_1",
      patientName: "Sarah Johnson",
      provider: "Aetna",
      policyNumber: "AET123456789",
      groupNumber: "GRP001",
      status: "active",
      coverageType: "primary",
      eligibilityStatus: "verified",
      lastVerified: "2024-06-25",
      benefits: {
        deductible: 1500,
        deductibleMet: 850,
        copay: 25,
        coinsurance: 20,
        outOfPocketMax: 5000,
        outOfPocketMet: 1200
      }
    },
    {
      id: "ins_2",
      patientId: "patient_2",
      patientName: "Michael Chen",
      provider: "Blue Cross Blue Shield",
      policyNumber: "BCBS987654321",
      groupNumber: "GRP002",
      status: "active",
      coverageType: "primary",
      eligibilityStatus: "pending",
      lastVerified: "2024-06-15",
      benefits: {
        deductible: 2000,
        deductibleMet: 450,
        copay: 30,
        coinsurance: 25,
        outOfPocketMax: 6000,
        outOfPocketMet: 780
      }
    }
  ];

  const mockForecasts: FinancialForecast[] = [
    {
      category: "Monthly Revenue",
      currentMonth: 162000,
      projectedNext: 168000,
      variance: 6000,
      trend: "up",
      confidence: 85,
      factors: ["Increased patient volume", "New insurance contracts", "Seasonal trend"]
    },
    {
      category: "Collection Rate",
      currentMonth: 94,
      projectedNext: 95,
      variance: 1,
      trend: "up",
      confidence: 78,
      factors: ["Improved prior authorization process", "Better claim submission timing"]
    },
    {
      category: "Operating Expenses",
      currentMonth: 98000,
      projectedNext: 102000,
      variance: 4000,
      trend: "up",
      confidence: 92,
      factors: ["Staff salary increases", "Equipment maintenance", "Inflation"]
    }
  ];

  const profitabilityData = [
    { service: "Primary Care", revenue: 45000, cost: 28000, profit: 17000, margin: 37.8 },
    { service: "Preventive Care", revenue: 32000, cost: 18000, profit: 14000, margin: 43.8 },
    { service: "Chronic Care Management", revenue: 28000, cost: 15000, profit: 13000, margin: 46.4 },
    { service: "Diagnostic Testing", revenue: 25000, cost: 12000, profit: 13000, margin: 52.0 },
    { service: "Procedures", revenue: 32000, cost: 25000, profit: 7000, margin: 21.9 }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": case "paid": case "active": case "verified": return "bg-green-100 text-green-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "denied": case "inactive": case "expired": return "bg-red-100 text-red-800";
      case "submitted": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "up": return "text-green-600";
      case "down": return "text-red-600";
      case "stable": return "text-gray-600";
      default: return "text-gray-600";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Financial Intelligence</h1>
          <p className="text-gray-600 mt-1">Revenue cycle management and financial analytics</p>
        </div>
        <div className="flex gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="last_3_months">Last 3 Months</SelectItem>
              <SelectItem value="last_6_months">Last 6 Months</SelectItem>
              <SelectItem value="last_year">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Button>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="claims">Claims Management</TabsTrigger>
          <TabsTrigger value="insurance">Insurance Verification</TabsTrigger>
          <TabsTrigger value="forecasting">Financial Forecasting</TabsTrigger>
          <TabsTrigger value="profitability">Profitability Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Financial KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                    <p className="text-2xl font-bold">{formatCurrency(162000)}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-500" />
                </div>
                <div className="flex items-center mt-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-green-600">+8.2% from last month</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Collection Rate</p>
                    <p className="text-2xl font-bold">94%</p>
                  </div>
                  <Target className="w-8 h-8 text-blue-500" />
                </div>
                <div className="flex items-center mt-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-green-600">+2.1% from last month</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Outstanding Claims</p>
                    <p className="text-2xl font-bold">23</p>
                  </div>
                  <FileText className="w-8 h-8 text-orange-500" />
                </div>
                <div className="flex items-center mt-2 text-sm">
                  <TrendingDown className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-green-600">-5 from last week</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Net Profit</p>
                    <p className="text-2xl font-bold">{formatCurrency(64000)}</p>
                  </div>
                  <Calculator className="w-8 h-8 text-purple-500" />
                </div>
                <div className="flex items-center mt-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-green-600">+12.5% from last month</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Trend Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={mockRevenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                    <Area type="monotone" dataKey="collections" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Profit Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={mockRevenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Bar dataKey="revenue" fill="#3b82f6" />
                    <Bar dataKey="expenses" fill="#ef4444" />
                    <Bar dataKey="profit" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="claims" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Claims Management</h3>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <FileText className="w-4 h-4 mr-2" />
                  Submit New Claim
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Submit Insurance Claim</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Patient</label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select patient" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="patient_1">Sarah Johnson</SelectItem>
                        <SelectItem value="patient_2">Michael Chen</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Service Date</label>
                    <Input type="date" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Total Amount</label>
                    <Input placeholder="0.00" />
                  </div>
                  <Button className="w-full">Submit Claim</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {mockClaims.map((claim) => (
              <Card key={claim.id} className={claim.status === 'denied' ? 'border-red-200' : ''}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{claim.patientName}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={getStatusColor(claim.status)}>{claim.status}</Badge>
                        <span className="text-sm text-gray-500">{claim.claimNumber}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">
                        {formatCurrency(claim.amount)}
                      </div>
                      {claim.paymentAmount && (
                        <div className="text-sm text-green-600">
                          Paid: {formatCurrency(claim.paymentAmount)}
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-gray-500">Insurance</div>
                      <div className="font-medium">{claim.insuranceProvider}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Service Date</div>
                      <div className="font-medium">
                        {format(new Date(claim.serviceDate), 'MMM dd, yyyy')}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Submitted</div>
                      <div className="font-medium">
                        {format(new Date(claim.submissionDate), 'MMM dd, yyyy')}
                      </div>
                    </div>
                    {claim.paymentDate && (
                      <div>
                        <div className="text-sm text-gray-500">Payment Date</div>
                        <div className="font-medium">
                          {format(new Date(claim.paymentDate), 'MMM dd, yyyy')}
                        </div>
                      </div>
                    )}
                  </div>

                  {claim.denialReason && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
                        <div>
                          <div className="font-medium text-red-800">Claim Denied</div>
                          <div className="text-sm text-red-700">{claim.denialReason}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="font-medium text-sm mb-2">Procedures</h4>
                    <div className="space-y-2">
                      {claim.procedures.map((procedure, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div>
                            <div className="font-medium text-sm">{procedure.code}</div>
                            <div className="text-xs text-gray-600">{procedure.description}</div>
                          </div>
                          <div className="font-medium">{formatCurrency(procedure.amount)}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => setSelectedClaim(claim)}>
                      View Details
                    </Button>
                    {claim.status === 'denied' && (
                      <Button size="sm" variant="outline">
                        Resubmit
                      </Button>
                    )}
                    <Button size="sm" variant="outline">
                      Track Status
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="insurance" className="space-y-4">
          <div className="grid gap-4">
            {mockInsurances.map((insurance) => (
              <Card key={insurance.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{insurance.patientName}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={getStatusColor(insurance.status)}>{insurance.status}</Badge>
                        <Badge className={getStatusColor(insurance.eligibilityStatus)}>
                          {insurance.eligibilityStatus}
                        </Badge>
                        <span className="text-sm text-gray-500">{insurance.provider}</span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      Last verified: {format(new Date(insurance.lastVerified), 'MMM dd, yyyy')}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-gray-500">Policy Number</div>
                      <div className="font-medium">{insurance.policyNumber}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Group Number</div>
                      <div className="font-medium">{insurance.groupNumber}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Coverage Type</div>
                      <div className="font-medium capitalize">{insurance.coverageType}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Copay</div>
                      <div className="font-medium">{formatCurrency(insurance.benefits.copay)}</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm mb-3">Benefits Summary</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-500 mb-1">
                          Deductible ({formatCurrency(insurance.benefits.deductibleMet)} met)
                        </div>
                        <Progress 
                          value={(insurance.benefits.deductibleMet / insurance.benefits.deductible) * 100} 
                          className="h-2" 
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          {formatCurrency(insurance.benefits.deductible - insurance.benefits.deductibleMet)} remaining
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 mb-1">
                          Out-of-Pocket Max ({formatCurrency(insurance.benefits.outOfPocketMet)} met)
                        </div>
                        <Progress 
                          value={(insurance.benefits.outOfPocketMet / insurance.benefits.outOfPocketMax) * 100} 
                          className="h-2" 
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          {formatCurrency(insurance.benefits.outOfPocketMax - insurance.benefits.outOfPocketMet)} remaining
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      size="sm"
                      onClick={() => verifyInsuranceMutation.mutate(insurance.id)}
                      disabled={verifyInsuranceMutation.isPending}
                    >
                      <Shield className="w-4 h-4 mr-1" />
                      Verify Eligibility
                    </Button>
                    <Button size="sm" variant="outline">
                      View Benefits
                    </Button>
                    <Button size="sm" variant="outline">
                      Prior Authorization
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="forecasting" className="space-y-4">
          <div className="grid gap-4">
            {mockForecasts.map((forecast, idx) => (
              <Card key={idx}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{forecast.category}</span>
                    <Badge className="bg-blue-100 text-blue-800">
                      {forecast.confidence}% confidence
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {forecast.category.includes('Rate') ? `${forecast.currentMonth}%` : formatCurrency(forecast.currentMonth)}
                      </div>
                      <div className="text-sm text-gray-500">Current</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {forecast.category.includes('Rate') ? `${forecast.projectedNext}%` : formatCurrency(forecast.projectedNext)}
                      </div>
                      <div className="text-sm text-gray-500">Projected</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${getTrendColor(forecast.trend)}`}>
                        {forecast.trend === 'up' ? '+' : forecast.trend === 'down' ? '-' : ''}
                        {forecast.category.includes('Rate') ? `${Math.abs(forecast.variance)}%` : formatCurrency(Math.abs(forecast.variance))}
                      </div>
                      <div className="text-sm text-gray-500">Variance</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm mb-2">Key Factors</h4>
                    <ul className="space-y-1">
                      {forecast.factors.map((factor, factorIdx) => (
                        <li key={factorIdx} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span>{factor}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="profitability" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Service Profitability Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={profitabilityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="service" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Bar dataKey="revenue" fill="#3b82f6" />
                  <Bar dataKey="cost" fill="#ef4444" />
                  <Bar dataKey="profit" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            {profitabilityData.map((service, idx) => (
              <Card key={idx}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">{service.service}</h3>
                      <div className="text-sm text-gray-600">
                        Revenue: {formatCurrency(service.revenue)} • 
                        Cost: {formatCurrency(service.cost)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">
                        {formatCurrency(service.profit)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {service.margin}% margin
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}