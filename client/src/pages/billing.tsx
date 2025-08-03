import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Receipt, 
  Plus, 
  Search, 
  DollarSign, 
  CreditCard, 
  FileText, 
  Calendar,
  User,
  Download,
  Eye,
  Send,
  AlertTriangle,
  CheckCircle,
  Clock,
  Trash2,
  BarChart3,
  TrendingUp,
  Filter,
  PieChart,
  FileBarChart,
  Target
} from "lucide-react";

interface Invoice {
  id: string;
  patientId: string;
  patientName: string;
  dateOfService: string;
  invoiceDate: string;
  dueDate: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  totalAmount: number;
  paidAmount: number;
  items: Array<{
    code: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  insurance?: {
    provider: string;
    claimNumber: string;
    status: 'pending' | 'approved' | 'denied' | 'partially_paid';
    paidAmount: number;
  };
  payments: Array<{
    id: string;
    amount: number;
    method: 'cash' | 'card' | 'bank_transfer' | 'insurance';
    date: string;
    reference?: string;
  }>;
}

const mockInvoices: Invoice[] = [
  {
    id: "inv_001",
    patientId: "p_001",
    patientName: "Sarah Johnson",
    dateOfService: "2024-01-15T10:30:00Z",
    invoiceDate: "2024-01-15T00:00:00Z",
    dueDate: "2024-02-14T00:00:00Z",
    status: "paid",
    totalAmount: 250.00,
    paidAmount: 250.00,
    items: [
      {
        code: "99213",
        description: "Office Visit - Established Patient (Level 3)",
        quantity: 1,
        unitPrice: 150.00,
        total: 150.00
      },
      {
        code: "85025",
        description: "Complete Blood Count",
        quantity: 1,
        unitPrice: 50.00,
        total: 50.00
      },
      {
        code: "80053",
        description: "Comprehensive Metabolic Panel",
        quantity: 1,
        unitPrice: 50.00,
        total: 50.00
      }
    ],
    insurance: {
      provider: "NHS",
      claimNumber: "CLM2024001",
      status: "approved",
      paidAmount: 200.00
    },
    payments: [
      {
        id: "pay_001",
        amount: 200.00,
        method: "insurance",
        date: "2024-01-20T00:00:00Z",
        reference: "NHS_PAY_001"
      },
      {
        id: "pay_002",
        amount: 50.00,
        method: "card",
        date: "2024-01-22T00:00:00Z",
        reference: "CC_****1234"
      }
    ]
  },
  {
    id: "inv_002",
    patientId: "p_002",
    patientName: "Robert Davis",
    dateOfService: "2024-01-14T14:15:00Z",
    invoiceDate: "2024-01-14T00:00:00Z",
    dueDate: "2024-02-13T00:00:00Z",
    status: "sent",
    totalAmount: 450.00,
    paidAmount: 0,
    items: [
      {
        code: "99214",
        description: "Office Visit - Established Patient (Level 4)",
        quantity: 1,
        unitPrice: 200.00,
        total: 200.00
      },
      {
        code: "71020",
        description: "Chest X-Ray (2 views)",
        quantity: 1,
        unitPrice: 150.00,
        total: 150.00
      },
      {
        code: "93000",
        description: "Electrocardiogram",
        quantity: 1,
        unitPrice: 100.00,
        total: 100.00
      }
    ],
    insurance: {
      provider: "Private Insurance",
      claimNumber: "CLM2024002",
      status: "pending",
      paidAmount: 0
    },
    payments: []
  },
  {
    id: "inv_003",
    patientId: "p_003",
    patientName: "Emma Wilson",
    dateOfService: "2024-01-10T09:00:00Z",
    invoiceDate: "2024-01-10T00:00:00Z",
    dueDate: "2024-01-25T00:00:00Z",
    status: "overdue",
    totalAmount: 180.00,
    paidAmount: 100.00,
    items: [
      {
        code: "99212",
        description: "Office Visit - Established Patient (Level 2)",
        quantity: 1,
        unitPrice: 120.00,
        total: 120.00
      },
      {
        code: "90471",
        description: "Immunization Administration",
        quantity: 1,
        unitPrice: 25.00,
        total: 25.00
      },
      {
        code: "90715",
        description: "Flu Vaccine",
        quantity: 1,
        unitPrice: 35.00,
        total: 35.00
      }
    ],
    payments: [
      {
        id: "pay_003",
        amount: 100.00,
        method: "cash",
        date: "2024-01-15T00:00:00Z"
      }
    ]
  }
];

export default function BillingPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showNewInvoice, setShowNewInvoice] = useState(false);
  const [selectedReport, setSelectedReport] = useState<string>("");

  const { data: billingData = [], isLoading, error } = useQuery({
    queryKey: ["/api/billing"],
  });
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [activeTab, setActiveTab] = useState("invoices");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
  };

  const handleDownloadInvoice = (invoiceId: string) => {
    const invoice = Array.isArray(invoices) ? invoices.find((inv: any) => inv.id === invoiceId) : null;
    if (invoice) {
      toast({
        title: "Download Invoice",
        description: `Invoice ${invoiceId} downloaded successfully`,
      });
      
      // Generate invoice PDF content
      const invoiceContent = `
INVOICE

Invoice ID: ${invoice.id}
Patient: ${invoice.patientName}
Date of Service: ${new Date(invoice.dateOfService).toLocaleDateString()}
Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}

SERVICES:
${invoice.items.map((item: any) => 
  `${item.code} - ${item.description}
  Quantity: ${item.quantity} × £${item.unitPrice.toFixed(2)} = £${item.total.toFixed(2)}`
).join('\n')}

TOTAL: £${invoice.totalAmount.toFixed(2)}
PAID: £${invoice.paidAmount.toFixed(2)}
BALANCE: £${(invoice.totalAmount - invoice.paidAmount).toFixed(2)}
`;
      
      const blob = new Blob([invoiceContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoice.id}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const [sendInvoiceDialog, setSendInvoiceDialog] = useState(false);
  const [invoiceToSend, setInvoiceToSend] = useState<Invoice | null>(null);
  const [sendMethod, setSendMethod] = useState("email");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [customMessage, setCustomMessage] = useState("");

  const handleSendInvoice = (invoiceId: string) => {
    const invoice = Array.isArray(invoices) ? invoices.find((inv: any) => inv.id === invoiceId) : null;
    if (invoice) {
      setInvoiceToSend(invoice);
      setRecipientEmail(`${invoice.patientName.toLowerCase().replace(' ', '.')}@email.com`);
      setRecipientPhone(`+44 7${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`);
      setRecipientName(invoice.patientName);
      setRecipientAddress(`${Math.floor(Math.random() * 999) + 1} High Street\nLondon\nSW1A 1AA`);
      setCustomMessage(`Dear ${invoice.patientName},\n\nPlease find attached your invoice for services rendered on ${format(new Date(invoice.dateOfService), 'MMM d, yyyy')}.\n\nTotal Amount: £${invoice.totalAmount.toFixed(2)}\nDue Date: ${format(new Date(invoice.dueDate), 'MMM d, yyyy')}\n\nThank you for choosing our healthcare services.`);
      setSendInvoiceDialog(true);
    }
  };

  const confirmSendInvoice = () => {
    if (invoiceToSend) {
      // Simulate sending the invoice
      setTimeout(() => {
        toast({
          title: "Invoice Sent Successfully",
          description: `Invoice ${invoiceToSend.id} sent to ${recipientEmail}`,
        });
        setSendInvoiceDialog(false);
        setInvoiceToSend(null);
        setRecipientEmail("");
        setCustomMessage("");
      }, 1000);
    }
  };

  const handleDeleteInvoice = (invoiceId: string) => {
    const invoice = Array.isArray(invoices) ? invoices.find((inv: any) => inv.id === invoiceId) : null;
    if (invoice) {
      if (confirm(`Are you sure you want to delete invoice ${invoiceId} for ${invoice.patientName}?`)) {
        // Update mockInvoices to persist the deletion
        const mockInvoicesIndex = mockInvoices.findIndex((inv: any) => inv.id === invoiceId);
        if (mockInvoicesIndex !== -1) {
          mockInvoices.splice(mockInvoicesIndex, 1);
        }
        
        // Update the query cache to immediately reflect the deletion
        queryClient.setQueryData(["/api/billing/invoices", statusFilter], (oldData: any) => {
          if (Array.isArray(oldData)) {
            return oldData.filter((inv: any) => inv.id !== invoiceId);
          }
          return oldData;
        });
        
        // Also invalidate the cache to ensure consistency
        queryClient.invalidateQueries({ queryKey: ["/api/billing/invoices"] });
        
        toast({
          title: "Invoice Deleted",
          description: `Invoice ${invoiceId} has been successfully deleted`,
          variant: "destructive",
        });
      }
    }
  };

  const { data: invoices = mockInvoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ["/api/billing/invoices", statusFilter],
    enabled: true,
  });

  // Fetch patients for new invoice dropdown
  const { data: patients, isLoading: patientsLoading } = useQuery({
    queryKey: ["/api/patients"],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/patients', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': 'demo'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch patients');
      return response.json();
    }
  });

  const filteredInvoices = Array.isArray(invoices) ? invoices.filter((invoice: any) => {
    const matchesSearch = !searchQuery || 
      invoice.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) : [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getInsuranceStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'denied': return 'bg-red-100 text-red-800';
      case 'partially_paid': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  const getTotalRevenue = () => {
    return Array.isArray(invoices) ? invoices.reduce((sum: number, invoice: any) => sum + invoice.paidAmount, 0) : 0;
  };

  const getOutstandingAmount = () => {
    return Array.isArray(invoices) ? invoices.reduce((sum: number, invoice: any) => sum + (invoice.totalAmount - invoice.paidAmount), 0) : 0;
  };

  if (invoicesLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <>
      <Header 
        title="Billing & Payments" 
        subtitle="Manage invoices, payments, and insurance claims"
      />
      
      <div className="flex-1 overflow-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="insurance">Insurance Claims</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="invoices" className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Revenue</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(getTotalRevenue())}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Outstanding</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(getOutstandingAmount())}</p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Overdue Invoices</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">2</p>
                    </div>
                    <Clock className="h-8 w-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">This Month</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">24</p>
                    </div>
                    <Receipt className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters and Actions */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search invoices..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 w-64"
                      />
                    </div>
                    
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button onClick={() => setShowNewInvoice(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Invoice
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Invoices List */}
            <div className="space-y-4">
              {filteredInvoices.map((invoice) => (
                <Card key={invoice.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{invoice.patientName}</h3>
                          <Badge className={getStatusColor(invoice.status)}>
                            {invoice.status}
                          </Badge>
                          {invoice.status === 'overdue' && (
                            <Badge className="bg-red-100 text-red-800">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Overdue
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                          <div>
                            <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">Invoice Details</h4>
                            <div className="space-y-1 text-sm text-gray-900 dark:text-gray-100">
                              <div><strong>Invoice:</strong> {invoice.id}</div>
                              <div><strong>Service Date:</strong> {format(new Date(invoice.dateOfService), 'MMM d, yyyy')}</div>
                              <div><strong>Due Date:</strong> {format(new Date(invoice.dueDate), 'MMM d, yyyy')}</div>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">Amount</h4>
                            <div className="space-y-1 text-sm text-gray-900 dark:text-gray-100">
                              <div><strong>Total:</strong> {formatCurrency(invoice.totalAmount)}</div>
                              <div><strong>Paid:</strong> {formatCurrency(invoice.paidAmount)}</div>
                              <div><strong>Outstanding:</strong> {formatCurrency(invoice.totalAmount - invoice.paidAmount)}</div>
                            </div>
                          </div>
                          
                          {invoice.insurance && (
                            <div>
                              <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">Insurance</h4>
                              <div className="space-y-1 text-sm text-gray-900 dark:text-gray-100">
                                <div><strong>Provider:</strong> {invoice.insurance.provider}</div>
                                <div><strong>Claim:</strong> {invoice.insurance.claimNumber}</div>
                                <div className="flex items-center gap-2">
                                  <strong>Status:</strong>
                                  <Badge className={getInsuranceStatusColor(invoice.insurance.status)}>
                                    {invoice.insurance.status}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-lg">
                          <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">Services</h4>
                          <div className="space-y-1">
                            {invoice.items.slice(0, 2).map((item: any, index: number) => (
                              <div key={index} className="flex justify-between text-sm text-gray-900 dark:text-gray-100">
                                <span>{item.description}</span>
                                <span>{formatCurrency(item.total)}</span>
                              </div>
                            ))}
                            {invoice.items.length > 2 && (
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                +{invoice.items.length - 2} more items
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Button variant="outline" size="sm" onClick={() => handleViewInvoice(invoice)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDownloadInvoice(invoice.id)}>
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleSendInvoice(invoice.id)}>
                          <Send className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleDeleteInvoice(invoice.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredInvoices.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Receipt className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
                <p className="text-gray-600">Try adjusting your search terms or filters</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Payment management interface coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insurance">
            <Card>
              <CardHeader>
                <CardTitle>Insurance Claims</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Insurance claims management interface coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            {/* Report Selection Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedReport('revenue')}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Revenue Report</h3>
                      <p className="text-sm text-gray-600">Monthly and yearly revenue analysis</p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="mt-3 text-sm text-gray-500">
                    Last updated: {format(new Date(), 'MMM d, yyyy')}
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedReport('outstanding')}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Outstanding Invoices</h3>
                      <p className="text-sm text-gray-600">Unpaid and overdue invoices</p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                  </div>
                  <div className="mt-3 text-sm text-gray-500">
                    Total: {formatCurrency(getOutstandingAmount())}
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedReport('insurance')}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Insurance Analytics</h3>
                      <p className="text-sm text-gray-600">Claims processing and reimbursements</p>
                    </div>
                    <PieChart className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="mt-3 text-sm text-gray-500">
                    Active claims: 12
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedReport('aging')}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Aging Report</h3>
                      <p className="text-sm text-gray-600">Accounts receivable by age</p>
                    </div>
                    <Clock className="h-8 w-8 text-orange-600" />
                  </div>
                  <div className="mt-3 text-sm text-gray-500">
                    30+ days: £1,250
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedReport('provider')}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Provider Performance</h3>
                      <p className="text-sm text-gray-600">Revenue by healthcare provider</p>
                    </div>
                    <User className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="mt-3 text-sm text-gray-500">
                    5 providers tracked
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedReport('procedures')}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Procedure Analysis</h3>
                      <p className="text-sm text-gray-600">Most profitable procedures and services</p>
                    </div>
                    <Target className="h-8 w-8 text-teal-600" />
                  </div>
                  <div className="mt-3 text-sm text-gray-500">
                    Top CPT: 99213
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Stats Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Quick Financial Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{formatCurrency(getTotalRevenue())}</div>
                    <div className="text-sm text-gray-600">Total Revenue</div>
                    <div className="text-xs text-green-600 mt-1">+12% vs last month</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{formatCurrency(getOutstandingAmount())}</div>
                    <div className="text-sm text-gray-600">Outstanding</div>
                    <div className="text-xs text-red-600 mt-1">2 overdue invoices</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">92%</div>
                    <div className="text-sm text-gray-600">Collection Rate</div>
                    <div className="text-xs text-green-600 mt-1">Above industry avg</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">18 days</div>
                    <div className="text-sm text-gray-600">Avg Collection Time</div>
                    <div className="text-xs text-orange-600 mt-1">Industry: 25 days</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Report Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Report Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Date Range</Label>
                    <Select defaultValue="this-month">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="this-week">This Week</SelectItem>
                        <SelectItem value="this-month">This Month</SelectItem>
                        <SelectItem value="last-month">Last Month</SelectItem>
                        <SelectItem value="this-quarter">This Quarter</SelectItem>
                        <SelectItem value="this-year">This Year</SelectItem>
                        <SelectItem value="custom">Custom Range</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Provider</Label>
                    <Select defaultValue="all">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Providers</SelectItem>
                        <SelectItem value="dr-smith">Dr. Smith</SelectItem>
                        <SelectItem value="dr-jones">Dr. Jones</SelectItem>
                        <SelectItem value="dr-brown">Dr. Brown</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Insurance Type</Label>
                    <Select defaultValue="all">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Insurance</SelectItem>
                        <SelectItem value="nhs">NHS</SelectItem>
                        <SelectItem value="private">Private</SelectItem>
                        <SelectItem value="self-pay">Self Pay</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button className="w-full">
                      <FileBarChart className="h-4 w-4 mr-2" />
                      Generate Report
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sample Report Table */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Breakdown - Current Month</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button variant="outline" size="sm">
                    <FileText className="h-4 w-4 mr-2" />
                    Export PDF
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-3">Service Type</th>
                        <th className="text-left p-3">Procedures</th>
                        <th className="text-left p-3">Revenue</th>
                        <th className="text-left p-3">Insurance</th>
                        <th className="text-left p-3">Self-Pay</th>
                        <th className="text-left p-3">Collection Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b hover:bg-gray-50">
                        <td className="p-3 font-medium">General Consultation</td>
                        <td className="p-3">24</td>
                        <td className="p-3 font-semibold">{formatCurrency(3600)}</td>
                        <td className="p-3">{formatCurrency(2800)}</td>
                        <td className="p-3">{formatCurrency(800)}</td>
                        <td className="p-3">
                          <Badge className="bg-green-100 text-green-800">95%</Badge>
                        </td>
                      </tr>
                      <tr className="border-b hover:bg-gray-50">
                        <td className="p-3 font-medium">Specialist Consultation</td>
                        <td className="p-3">12</td>
                        <td className="p-3 font-semibold">{formatCurrency(2400)}</td>
                        <td className="p-3">{formatCurrency(1900)}</td>
                        <td className="p-3">{formatCurrency(500)}</td>
                        <td className="p-3">
                          <Badge className="bg-green-100 text-green-800">92%</Badge>
                        </td>
                      </tr>
                      <tr className="border-b hover:bg-gray-50">
                        <td className="p-3 font-medium">Diagnostic Tests</td>
                        <td className="p-3">18</td>
                        <td className="p-3 font-semibold">{formatCurrency(1800)}</td>
                        <td className="p-3">{formatCurrency(1600)}</td>
                        <td className="p-3">{formatCurrency(200)}</td>
                        <td className="p-3">
                          <Badge className="bg-yellow-100 text-yellow-800">88%</Badge>
                        </td>
                      </tr>
                      <tr className="border-b hover:bg-gray-50">
                        <td className="p-3 font-medium">Minor Procedures</td>
                        <td className="p-3">8</td>
                        <td className="p-3 font-semibold">{formatCurrency(1200)}</td>
                        <td className="p-3">{formatCurrency(900)}</td>
                        <td className="p-3">{formatCurrency(300)}</td>
                        <td className="p-3">
                          <Badge className="bg-green-100 text-green-800">94%</Badge>
                        </td>
                      </tr>
                      <tr className="border-b bg-gray-50 font-semibold">
                        <td className="p-3">Total</td>
                        <td className="p-3">62</td>
                        <td className="p-3">{formatCurrency(9000)}</td>
                        <td className="p-3">{formatCurrency(7200)}</td>
                        <td className="p-3">{formatCurrency(1800)}</td>
                        <td className="p-3">
                          <Badge className="bg-green-100 text-green-800">92%</Badge>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* New Invoice Dialog */}
      <Dialog open={showNewInvoice} onOpenChange={setShowNewInvoice}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Invoice</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="patient">Patient</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder={patientsLoading ? "Loading patients..." : "Select patient"} />
                  </SelectTrigger>
                  <SelectContent>
                    {patientsLoading ? (
                      <SelectItem value="loading" disabled>Loading...</SelectItem>
                    ) : patients && patients.length > 0 ? (
                      (() => {
                        // Deduplicate patients by unique name combination
                        const uniquePatients = patients.filter((patient: any, index: number, array: any[]) => 
                          array.findIndex((p: any) => 
                            `${p.firstName} ${p.lastName}` === `${patient.firstName} ${patient.lastName}`
                          ) === index
                        );
                        return uniquePatients.map((patient: any) => (
                          <SelectItem key={patient.id} value={patient.id.toString()}>
                            {patient.firstName} {patient.lastName}
                          </SelectItem>
                        ));
                      })()
                    ) : (
                      <SelectItem value="no-patients" disabled>No patients found</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="service-date">Service Date</Label>
                <Input 
                  id="service-date" 
                  type="date" 
                  defaultValue={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invoice-date">Invoice Date</Label>
                <Input 
                  id="invoice-date" 
                  type="date" 
                  defaultValue={new Date().toISOString().split('T')[0]}
                />
              </div>
              
              <div>
                <Label htmlFor="due-date">Due Date</Label>
                <Input 
                  id="due-date" 
                  type="date" 
                  defaultValue={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                />
              </div>
            </div>

            <div>
              <Label>Services & Procedures</Label>
              <div className="border rounded-md p-4 space-y-3">
                <div className="grid grid-cols-4 gap-2 text-sm font-medium text-gray-600">
                  <span>Code</span>
                  <span>Description</span>
                  <span>Qty</span>
                  <span>Amount</span>
                </div>
                
                <div className="grid grid-cols-4 gap-2">
                  <Input placeholder="CPT Code" defaultValue="99213" />
                  <Input placeholder="Description" defaultValue="Office consultation" />
                  <Input placeholder="1" defaultValue="1" />
                  <Input placeholder="150.00" defaultValue="150.00" />
                </div>
                
                <div className="grid grid-cols-4 gap-2">
                  <Input placeholder="CPT Code" />
                  <Input placeholder="Description" />
                  <Input placeholder="1" />
                  <Input placeholder="0.00" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="insurance">Insurance Provider</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select insurance (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Insurance</SelectItem>
                    <SelectItem value="nhs">NHS</SelectItem>
                    <SelectItem value="bupa">BUPA</SelectItem>
                    <SelectItem value="axa">AXA Health</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="total">Total Amount</Label>
                <Input 
                  id="total" 
                  placeholder="150.00" 
                  defaultValue="150.00"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea 
                id="notes" 
                placeholder="Additional notes or instructions..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowNewInvoice(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              console.log('Creating new invoice...');
              alert('Invoice created successfully!\n\nInvoice #INV-' + Date.now().toString().slice(-6) + ' has been generated and sent to the patient.');
              setShowNewInvoice(false);
            }}>
              Create Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Invoice Dialog */}
      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Details - {selectedInvoice?.id}</DialogTitle>
          </DialogHeader>
          
          {selectedInvoice && (
            <div className="space-y-6">
              {/* Invoice Header */}
              <div className="grid grid-cols-2 gap-6 p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-semibold text-lg mb-3">Patient Information</h3>
                  <div className="space-y-1 text-sm">
                    <div><strong>Name:</strong> {selectedInvoice.patientName}</div>
                    <div><strong>Patient ID:</strong> {selectedInvoice.patientId}</div>
                    <div><strong>Service Date:</strong> {format(new Date(selectedInvoice.dateOfService), 'MMM d, yyyy')}</div>
                    <div><strong>Invoice Date:</strong> {format(new Date(selectedInvoice.invoiceDate), 'MMM d, yyyy')}</div>
                    <div><strong>Due Date:</strong> {format(new Date(selectedInvoice.dueDate), 'MMM d, yyyy')}</div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold text-lg mb-3">Billing Summary</h3>
                  <div className="space-y-1 text-sm">
                    <div><strong>Invoice ID:</strong> {selectedInvoice.id}</div>
                    <div><strong>Status:</strong> 
                      <Badge className={`ml-2 ${selectedInvoice.status === 'paid' ? 'bg-green-100 text-green-800' : 
                        selectedInvoice.status === 'overdue' ? 'bg-red-100 text-red-800' : 
                        selectedInvoice.status === 'sent' ? 'bg-blue-100 text-blue-800' : 
                        'bg-gray-100 text-gray-800'}`}>
                        {selectedInvoice.status}
                      </Badge>
                    </div>
                    <div><strong>Total Amount:</strong> £{selectedInvoice.totalAmount.toFixed(2)}</div>
                    <div><strong>Paid Amount:</strong> £{selectedInvoice.paidAmount.toFixed(2)}</div>
                    <div><strong>Outstanding:</strong> £{(selectedInvoice.totalAmount - selectedInvoice.paidAmount).toFixed(2)}</div>
                  </div>
                </div>
              </div>

              {/* Services & Procedures */}
              <div>
                <h3 className="font-semibold text-lg mb-3">Services & Procedures</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr className="border-b">
                        <th className="text-left p-3">Code</th>
                        <th className="text-left p-3">Description</th>
                        <th className="text-right p-3">Qty</th>
                        <th className="text-right p-3">Unit Price</th>
                        <th className="text-right p-3">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.items.map((item, index) => (
                        <tr key={index} className="border-b last:border-b-0">
                          <td className="p-3 font-mono">{item.code}</td>
                          <td className="p-3">{item.description}</td>
                          <td className="p-3 text-right">{item.quantity}</td>
                          <td className="p-3 text-right">£{item.unitPrice.toFixed(2)}</td>
                          <td className="p-3 text-right font-semibold">£{item.total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Insurance Information */}
              {selectedInvoice.insurance && (
                <div>
                  <h3 className="font-semibold text-lg mb-3">Insurance Information</h3>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div><strong>Provider:</strong> {selectedInvoice.insurance.provider}</div>
                        <div><strong>Claim Number:</strong> {selectedInvoice.insurance.claimNumber}</div>
                      </div>
                      <div>
                        <div><strong>Status:</strong> 
                          <Badge className={`ml-2 ${selectedInvoice.insurance.status === 'approved' ? 'bg-green-100 text-green-800' : 
                            selectedInvoice.insurance.status === 'denied' ? 'bg-red-100 text-red-800' : 
                            'bg-yellow-100 text-yellow-800'}`}>
                            {selectedInvoice.insurance.status}
                          </Badge>
                        </div>
                        <div><strong>Insurance Paid:</strong> £{selectedInvoice.insurance.paidAmount.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment History */}
              <div>
                <h3 className="font-semibold text-lg mb-3">Payment History</h3>
                <div className="text-sm text-gray-600">
                  {selectedInvoice.paidAmount > 0 ? (
                    <div className="p-3 bg-green-50 rounded-lg">
                      Payment of £{selectedInvoice.paidAmount.toFixed(2)} received on {format(new Date(selectedInvoice.invoiceDate), 'MMM d, yyyy')}
                    </div>
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      No payments received yet
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setSelectedInvoice(null)}>
              Close
            </Button>
            <Button onClick={() => {
              if (selectedInvoice) {
                console.log('Downloading invoice:', selectedInvoice.id);
                alert(`Invoice ${selectedInvoice.id} downloaded successfully`);
              }
            }}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Invoice Dialog */}
      <Dialog open={sendInvoiceDialog} onOpenChange={setSendInvoiceDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Invoice</DialogTitle>
          </DialogHeader>
          
          {invoiceToSend && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm">
                  <div><strong>Invoice:</strong> {invoiceToSend.id}</div>
                  <div><strong>Patient:</strong> {invoiceToSend.patientName}</div>
                  <div><strong>Amount:</strong> £{invoiceToSend.totalAmount.toFixed(2)}</div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="sendMethod">Send Method</Label>
                  <Select value={sendMethod} onValueChange={setSendMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="print">Print & Mail</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {sendMethod === "email" && (
                  <div>
                    <Label htmlFor="recipientEmail">Recipient Email</Label>
                    <Input
                      id="recipientEmail"
                      type="email"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      placeholder="patient@email.com"
                    />
                  </div>
                )}

                {sendMethod === "sms" && (
                  <div>
                    <Label htmlFor="recipientPhone">Recipient Phone</Label>
                    <Input
                      id="recipientPhone"
                      type="tel"
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                      placeholder="+44 7XXX XXXXXX"
                    />
                  </div>
                )}

                {sendMethod === "print" && (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="recipientName">Recipient Name</Label>
                      <Input
                        id="recipientName"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        placeholder="Full name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="recipientAddress">Mailing Address</Label>
                      <Textarea
                        id="recipientAddress"
                        value={recipientAddress}
                        onChange={(e) => setRecipientAddress(e.target.value)}
                        placeholder="Street address, City, Postal code"
                        rows={3}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="customMessage">Message (Optional)</Label>
                  <Textarea
                    id="customMessage"
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Add a personal message..."
                    rows={4}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSendInvoiceDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={confirmSendInvoice} 
              disabled={
                (sendMethod === "email" && !recipientEmail) ||
                (sendMethod === "sms" && !recipientPhone) ||
                (sendMethod === "print" && (!recipientName || !recipientAddress))
              }
            >
              <Send className="h-4 w-4 mr-2" />
              Send Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}