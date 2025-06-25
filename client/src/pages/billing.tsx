import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { format } from "date-fns";

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

  const { data: invoices = mockInvoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ["/api/billing/invoices", statusFilter],
    enabled: true,
  });

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = !searchQuery || 
      invoice.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

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
    return invoices.reduce((sum, invoice) => sum + invoice.paidAmount, 0);
  };

  const getOutstandingAmount = () => {
    return invoices.reduce((sum, invoice) => sum + (invoice.totalAmount - invoice.paidAmount), 0);
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
                            {invoice.items.slice(0, 2).map((item, index) => (
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
                        <Button variant="outline" size="sm" onClick={() => setSelectedInvoice(invoice)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => console.log('Download invoice:', invoice.id)}>
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => console.log('Send invoice:', invoice.id)}>
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
    </>
  );
}