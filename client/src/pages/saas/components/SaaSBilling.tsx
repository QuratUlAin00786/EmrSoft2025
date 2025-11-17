import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Loader2, CreditCard, DollarSign, PoundSterling, AlertTriangle, TrendingUp, Plus, Filter, Download, Eye, Edit, Trash2, FileText, Printer } from "lucide-react";
import { queryClient, saasApiRequest } from "@/lib/saasQueryClient";
import { useToast } from "@/hooks/use-toast";
import InvoiceTemplate from "./InvoiceTemplate";

// Payment status colors and icons
const getPaymentStatusBadge = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed':
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">Completed</Badge>;
    case 'pending':
      return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">Pending</Badge>;
    case 'failed':
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">Failed</Badge>;
    case 'cancelled':
      return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100">Cancelled</Badge>;
    case 'refunded':
      return <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100">Refunded</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

const getPaymentMethodIcon = (method: string) => {
  switch (method.toLowerCase()) {
    case 'stripe':
      return <CreditCard className="w-4 h-4" />;
    case 'paypal':
      return <PoundSterling className="w-4 h-4" />;
    case 'bank_transfer':
      return <TrendingUp className="w-4 h-4" />;
    case 'cash':
      return <PoundSterling className="w-4 h-4" />;
    default:
      return <CreditCard className="w-4 h-4" />;
  }
};

interface BillingStats {
  totalRevenue: number;
  monthlyRecurring: number;
  activeSubscriptions: number;
  pendingPayments: number;
  overduePayments: number;
  paymentMethods: {
    stripe: number;
    paypal: number;
    bankTransfer: number;
    cash: number;
  };
}

export default function SaaSBilling() {
  const [dateRange, setDateRange] = useState("30");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [showCreatePayment, setShowCreatePayment] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const { toast } = useToast();
  const invoiceRef = useRef<HTMLDivElement>(null);

  // Fetch billing statistics
  const { data: billingStats, isLoading: statsLoading, refetch: refetchStats } = useQuery<BillingStats>({
    queryKey: ['/api/saas/billing/stats', dateRange],
    queryFn: async () => {
      const response = await saasApiRequest('GET', `/api/saas/billing/stats?dateRange=${dateRange}`);
      if (!response.ok) throw new Error('Failed to fetch billing stats');
      return response.json();
    },
  });

  // Fetch billing data (invoices/payments)
  const { data: billingData, isLoading: dataLoading, refetch: refetchData } = useQuery({
    queryKey: ['/api/saas/billing/data', searchTerm, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (dateRange) params.append('dateRange', dateRange);
      
      const response = await saasApiRequest('GET', `/api/saas/billing/data?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch billing data');
      return response.json();
    },
  });

  // Fetch overdue invoices
  const { data: overdueInvoices, isLoading: overdueLoading } = useQuery({
    queryKey: ['/api/saas/billing/overdue'],
    queryFn: async () => {
      const response = await saasApiRequest('GET', '/api/saas/billing/overdue');
      if (!response.ok) throw new Error('Failed to fetch overdue invoices');
      return response.json();
    },
  });

  // Create payment mutation
  const createPaymentMutation = useMutation({
    mutationFn: async (paymentData: any) => {
      const response = await saasApiRequest('POST', '/api/saas/billing/payments', paymentData);
      if (!response.ok) throw new Error('Failed to create payment');
      return response.json();
    },
    onSuccess: () => {
      refetchData();
      refetchStats();
      setShowCreatePayment(false);
      setModalMessage("Payment created successfully");
      setIsSuccessModalOpen(true);
    },
    onError: (error: Error) => {
      setModalMessage(error.message || "Failed to create payment");
      setIsErrorModalOpen(true);
    },
  });

  // Update payment status mutation
  const updatePaymentStatusMutation = useMutation({
    mutationFn: async ({ paymentId, status, transactionId }: { paymentId: number; status: string; transactionId?: string }) => {
      const response = await saasApiRequest('PUT', `/api/saas/billing/payments/${paymentId}/status`, {
        status,
        transactionId
      });
      if (!response.ok) throw new Error('Failed to update payment status');
      return response.json();
    },
    onSuccess: () => {
      setModalMessage("Payment status updated successfully");
      setIsSuccessModalOpen(true);
      refetchData();
      refetchStats();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Suspend unpaid subscriptions mutation
  const suspendUnpaidMutation = useMutation({
    mutationFn: async () => {
      const response = await saasApiRequest('POST', '/api/saas/billing/suspend-unpaid');
      if (!response.ok) throw new Error('Failed to suspend unpaid subscriptions');
      return response.json();
    },
    onSuccess: () => {
      setModalMessage("Unpaid subscriptions suspended successfully");
      setIsSuccessModalOpen(true);
      refetchData();
      refetchStats();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Handle invoice viewing and printing
  const handleViewInvoice = (payment: any) => {
    setSelectedInvoice({
      ...payment,
      organizationAddress: `${payment.organizationName}\nHealthcare Organization\nUnited Kingdom`, // Default address format
      lineItems: [
        {
          description: payment.description || 'EMRSoft Software Subscription',
          quantity: 1,
          unitPrice: parseFloat(payment.amount),
          total: parseFloat(payment.amount)
        }
      ]
    });
    setShowInvoiceDialog(true);
  };

  const handlePrintInvoice = () => {
    if (invoiceRef.current) {
      const printContent = invoiceRef.current.innerHTML;
      const originalContent = document.body.innerHTML;
      document.body.innerHTML = printContent;
      window.print();
      document.body.innerHTML = originalContent;
      window.location.reload();
    }
  };

  const formatCurrency = (amount: number, currency: string = 'GBP') => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleExportPayments = () => {
    if (!billingData?.invoices || billingData.invoices.length === 0) {
      toast({
        title: "No Data to Export",
        description: "There are no payments to export.",
        variant: "destructive",
      });
      return;
    }

    // Prepare CSV data
    const csvHeaders = ['Invoice', 'Customer', 'Amount', 'Currency', 'Method', 'Status', 'Date'];
    
    const csvData = billingData.invoices.map((payment: any) => [
      payment.invoiceNumber,
      payment.organizationName || 'Unknown',
      parseFloat(payment.amount).toFixed(2),
      payment.currency || 'GBP',
      payment.paymentMethod.replace('_', ' '),
      payment.paymentStatus,
      formatDate(payment.createdAt)
    ]);

    // Create CSV content
    const csvContent = [
      csvHeaders.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `payments-export-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setModalMessage(`Exported ${billingData.invoices.length} payments to CSV file.`);
    setIsSuccessModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Billing & Payments</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Comprehensive billing system with multi-payment method support
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => suspendUnpaidMutation.mutate()} variant="outline" className="gap-2">
            <AlertTriangle className="w-4 h-4" />
            Suspend Unpaid
          </Button>
          <Dialog open={showCreatePayment} onOpenChange={setShowCreatePayment}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Create Payment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Payment</DialogTitle>
              </DialogHeader>
              <CreatePaymentForm 
                onSubmit={(data) => createPaymentMutation.mutate(data)}
                isLoading={createPaymentMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Invoice Viewer Dialog */}
      <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex justify-between items-center">
              <DialogTitle>Invoice #{selectedInvoice?.invoiceNumber}</DialogTitle>
              <div className="flex gap-2">
                <Button onClick={handlePrintInvoice} variant="outline" size="sm" className="gap-2">
                  <Printer className="w-4 h-4" />
                  Print
                </Button>
                <Button onClick={() => setShowInvoiceDialog(false)} variant="outline" size="sm">
                  Close
                </Button>
              </div>
            </div>
          </DialogHeader>
          {selectedInvoice && (
            <InvoiceTemplate ref={invoiceRef} invoice={selectedInvoice} />
          )}
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={isSuccessModalOpen} onOpenChange={setIsSuccessModalOpen}>
        <DialogContent className="sm:max-w-md z-[9999]">
          <DialogHeader>
            <DialogTitle className="text-green-600 dark:text-green-400">Success</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-700 dark:text-gray-300">{modalMessage}</p>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setIsSuccessModalOpen(false)}>OK</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Error Modal */}
      <Dialog open={isErrorModalOpen} onOpenChange={setIsErrorModalOpen}>
        <DialogContent className="sm:max-w-md z-[9999]">
          <DialogHeader>
            <DialogTitle className="text-red-600 dark:text-red-400">Error</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-700 dark:text-gray-300">{modalMessage}</p>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setIsErrorModalOpen(false)} variant="destructive">OK</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="overdue">Overdue</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <PoundSterling className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    formatCurrency(billingStats?.totalRevenue || 0)
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Last {dateRange} days</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Recurring</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    formatCurrency(billingStats?.monthlyRecurring || 0)
                  )}
                </div>
                <p className="text-xs text-muted-foreground">MRR estimate</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    formatCurrency(billingStats?.pendingPayments || 0)
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Awaiting payment</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    formatCurrency(billingStats?.overduePayments || 0)
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Past due</p>
              </CardContent>
            </Card>
          </div>

          {/* Payment Methods Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {billingStats?.paymentMethods?.stripe || 0}
                  </div>
                  <p className="text-sm text-gray-600">Stripe</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {billingStats?.paymentMethods?.paypal || 0}
                  </div>
                  <p className="text-sm text-gray-600">PayPal</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {billingStats?.paymentMethods?.bankTransfer || 0}
                  </div>
                  <p className="text-sm text-gray-600">Bank Transfer</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">
                    {billingStats?.paymentMethods?.cash || 0}
                  </div>
                  <p className="text-sm text-gray-600">Cash</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search Payments</Label>
              <Input
                id="search"
                placeholder="Search by customer, invoice, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="w-full sm:w-48">
              <Label htmlFor="dateRange">Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Payments Table */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>All Payments</CardTitle>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2"
                  onClick={handleExportPayments}
                  disabled={dataLoading || !billingData?.invoices?.length}
                >
                  <Download className="w-4 h-4" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {dataLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3">Invoice</th>
                        <th className="text-left py-2 px-3">Customer</th>
                        <th className="text-left py-2 px-3">Amount</th>
                        <th className="text-left py-2 px-3">Method</th>
                        <th className="text-left py-2 px-3">Status</th>
                        <th className="text-left py-2 px-3">Date</th>
                        <th className="text-left py-2 px-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {billingData?.invoices?.length > 0 ? (
                        billingData.invoices.map((payment: any) => (
                          <tr key={payment.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="py-3 px-3">
                              <span className="font-mono text-sm">{payment.invoiceNumber}</span>
                            </td>
                            <td className="py-3 px-3">{payment.organizationName || 'Unknown'}</td>
                            <td className="py-3 px-3 font-semibold">
                              {formatCurrency(parseFloat(payment.amount), payment.currency)}
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                {getPaymentMethodIcon(payment.paymentMethod)}
                                <span className="capitalize">{payment.paymentMethod.replace('_', ' ')}</span>
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              {getPaymentStatusBadge(payment.paymentStatus)}
                            </td>
                            <td className="py-3 px-3 text-sm text-gray-600">
                              {formatDate(payment.createdAt)}
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleViewInvoice(payment)}
                                  title="View Invoice"
                                >
                                  <FileText className="w-4 h-4" />
                                </Button>
                                {payment.paymentStatus === 'pending' && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => updatePaymentStatusMutation.mutate({
                                      paymentId: payment.id,
                                      status: 'completed'
                                    })}
                                    title="Mark as Completed"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="text-center py-8 text-gray-500">
                            No payments found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overdue" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Overdue Invoices
              </CardTitle>
            </CardHeader>
            <CardContent>
              {overdueLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3">Invoice</th>
                        <th className="text-left py-2 px-3">Customer</th>
                        <th className="text-left py-2 px-3">Amount</th>
                        <th className="text-left py-2 px-3">Due Date</th>
                        <th className="text-left py-2 px-3">Days Overdue</th>
                        <th className="text-left py-2 px-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overdueInvoices?.length > 0 ? (
                        overdueInvoices.map((invoice: any) => (
                          <tr key={invoice.id} className="border-b hover:bg-red-50 dark:hover:bg-red-900/10">
                            <td className="py-3 px-3">
                              <span className="font-mono text-sm">{invoice.invoiceNumber}</span>
                            </td>
                            <td className="py-3 px-3">{invoice.organizationName}</td>
                            <td className="py-3 px-3 font-semibold text-red-600">
                              {formatCurrency(parseFloat(invoice.amount))}
                            </td>
                            <td className="py-3 px-3 text-sm">{formatDate(invoice.dueDate)}</td>
                            <td className="py-3 px-3">
                              <Badge variant="destructive">{invoice.daysPastDue} days</Badge>
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm">
                                  Send Reminder
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-gray-500">
                            No overdue invoices
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  Revenue chart will be implemented with a charting library
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Payment Methods Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  Payment method pie chart will be implemented
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Create Payment Form Component
interface CreatePaymentFormProps {
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

function CreatePaymentForm({ onSubmit, isLoading }: CreatePaymentFormProps) {
  const [formData, setFormData] = useState({
    organizationId: '',
    organizationName: '',
    amount: '',
    currency: 'GBP',
    paymentMethod: 'stripe',
    description: '',
    dueDate: '',
  });

  // Fetch organizations for dropdown
  const { data: organizations } = useQuery({
    queryKey: ['/api/saas/organizations'],
    queryFn: async () => {
      const response = await saasApiRequest('GET', '/api/saas/organizations');
      if (!response.ok) throw new Error('Failed to fetch organizations');
      return response.json();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedOrg = organizations?.find((org: any) => org.id.toString() === formData.organizationId);
    onSubmit({
      organizationId: parseInt(formData.organizationId),
      organizationName: selectedOrg?.name || '',
      amount: parseFloat(formData.amount).toString(),
      currency: formData.currency,
      paymentMethod: formData.paymentMethod,
      description: formData.description,
      dueDate: formData.dueDate,
      paymentStatus: 'pending'
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="organizationId">Organization</Label>
        <Select 
          value={formData.organizationId} 
          onValueChange={(value) => setFormData({ ...formData, organizationId: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select organization..." />
          </SelectTrigger>
          <SelectContent>
            {organizations?.map((org: any) => (
              <SelectItem key={org.id} value={org.id.toString()}>
                {org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="currency">Currency</Label>
          <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GBP">GBP (£)</SelectItem>
              <SelectItem value="USD">USD ($)</SelectItem>
              <SelectItem value="EUR">EUR (€)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="paymentMethod">Payment Method</Label>
        <Select value={formData.paymentMethod} onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="stripe">Stripe</SelectItem>
            <SelectItem value="paypal">PayPal</SelectItem>
            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="dueDate">Due Date</Label>
        <Input
          id="dueDate"
          type="date"
          value={formData.dueDate}
          onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Payment description..."
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Create Payment
        </Button>
      </div>
    </form>
  );
}