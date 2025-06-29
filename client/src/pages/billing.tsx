import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Clock
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

  const { data: billingData = [], isLoading, error } = useQuery({
    queryKey: ["/api/billing"],
  });
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [activeTab, setActiveTab] = useState("invoices");
  const { toast } = useToast();

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

  const handleSendInvoice = (invoiceId: string) => {
    const invoice = Array.isArray(invoices) ? invoices.find((inv: any) => inv.id === invoiceId) : null;
    if (invoice) {
      toast({
        title: "Send Invoice",
        description: `Invoice sent to ${invoice.patientName} via email`,
      });
    }
  };

  const { data: invoices = mockInvoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ["/api/billing/invoices", statusFilter],
    enabled: true,
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
                      <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                      <p className="text-2xl font-bold">{formatCurrency(getTotalRevenue())}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Outstanding</p>
                      <p className="text-2xl font-bold">{formatCurrency(getOutstandingAmount())}</p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Overdue Invoices</p>
                      <p className="text-2xl font-bold">2</p>
                    </div>
                    <Clock className="h-8 w-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">This Month</p>
                      <p className="text-2xl font-bold">24</p>
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
                          <h3 className="text-lg font-semibold">{invoice.patientName}</h3>
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
                            <h4 className="font-medium text-sm text-gray-700 mb-2">Invoice Details</h4>
                            <div className="space-y-1 text-sm">
                              <div><strong>Invoice:</strong> {invoice.id}</div>
                              <div><strong>Service Date:</strong> {format(new Date(invoice.dateOfService), 'MMM d, yyyy')}</div>
                              <div><strong>Due Date:</strong> {format(new Date(invoice.dueDate), 'MMM d, yyyy')}</div>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-medium text-sm text-gray-700 mb-2">Amount</h4>
                            <div className="space-y-1 text-sm">
                              <div><strong>Total:</strong> {formatCurrency(invoice.totalAmount)}</div>
                              <div><strong>Paid:</strong> {formatCurrency(invoice.paidAmount)}</div>
                              <div><strong>Outstanding:</strong> {formatCurrency(invoice.totalAmount - invoice.paidAmount)}</div>
                            </div>
                          </div>
                          
                          {invoice.insurance && (
                            <div>
                              <h4 className="font-medium text-sm text-gray-700 mb-2">Insurance</h4>
                              <div className="space-y-1 text-sm">
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

                        <div className="bg-gray-50 p-3 rounded-lg">
                          <h4 className="font-medium text-sm text-gray-700 mb-2">Services</h4>
                          <div className="space-y-1">
                            {invoice.items.slice(0, 2).map((item: any, index: number) => (
                              <div key={index} className="flex justify-between text-sm">
                                <span>{item.description}</span>
                                <span>{formatCurrency(item.total)}</span>
                              </div>
                            ))}
                            {invoice.items.length > 2 && (
                              <div className="text-sm text-gray-500">
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

          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle>Financial Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Financial reporting interface coming soon...</p>
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
                    <SelectValue placeholder="Select patient" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="patient_1">Sarah Johnson</SelectItem>
                    <SelectItem value="patient_2">Michael Chen</SelectItem>
                    <SelectItem value="patient_3">Emma Wilson</SelectItem>
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
    </>
  );
}