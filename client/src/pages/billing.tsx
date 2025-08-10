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
      
      // Generate professional HTML invoice content with authentic Cura logo
      const timestamp = new Date().getTime();
      const invoiceContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoice.id} - ${timestamp}</title>
  <style>
    body {
      font-family: 'Arial', sans-serif;
      margin: 0;
      padding: 20px;
      background-color: #f5f5f5;
      color: #333;
    }
    .invoice-container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
      color: white;
      padding: 30px;
      display: flex;
      align-items: center;
      gap: 20px;
    }
    .logo-container {
      width: 80px;
      height: 80px;
      background: white;
      border-radius: 8px;
      padding: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .logo {
      width: 60px;
      height: 60px;
    }
    .header-info {
      flex: 1;
    }
    .header h1 {
      margin: 0 0 8px 0;
      font-size: 28px;
      font-weight: 600;
    }
    .header .subtitle {
      margin: 0;
      font-size: 14px;
      opacity: 0.9;
      font-weight: 300;
    }
    .invoice-title {
      font-size: 32px;
      font-weight: bold;
      margin-left: auto;
    }
    .content {
      padding: 30px;
    }
    .billing-details {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-bottom: 30px;
    }
    .section-title {
      font-weight: 600;
      color: #374151;
      margin-bottom: 10px;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .invoice-details {
      background: #f8fafc;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .payment-info {
      background: #dbeafe;
      padding: 15px;
      border-radius: 6px;
      margin-bottom: 30px;
      font-size: 14px;
      color: #1e40af;
    }
    .services-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    .services-table th {
      background: #4F46E5;
      color: white;
      padding: 12px;
      text-align: left;
      font-weight: 600;
    }
    .services-table td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
    }
    .services-table tr:nth-child(even) {
      background: #f9fafb;
    }
    .total-section {
      text-align: right;
      margin-top: 20px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
    }
    .total-row.final {
      font-weight: bold;
      font-size: 18px;
      border-top: 2px solid #4F46E5;
      padding-top: 15px;
      margin-top: 15px;
    }
    .footer {
      background: #f8fafc;
      padding: 20px 30px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="header">
      <div class="logo-container">
        <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAH8AAAB1CAYAAABnJj51AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAAEnQAABJ0Ad5mH3gAABqASURBVHhe7Z2JdxTZdcbz98WO7cSOk9hxTpw4seM4nrFnACEJBhCIHQQaIdZhH/Z9EwIkBAiEJBgQ+87ADIvEYvZFSAghJCSQEEIgJBAIBBJqtdRaVeqlWv3eV9Vq9as/9O/d916rW1VdXd3dUmswZ+bM6Vdv+bXe+773vnffq1ZJ/0f/j/4F0b8A+hdA/wLojwR/7969mjhxoryPRET/AuivBH/v3r2aOnWq5s+fr8OHD/f7wUP/AuivAj8S+EmTJmn//v09vnL3/2P3D74f/QugvwJ8J/DCwkLNnDlT9913n4LBoA4fPqzPP/9czc3Namlp0UsvvaS7775bq1ev7rZFQP8C6M8Cv6ioSIsWLdLUqVN13333acKECbrrrrskSdu3b9e9996rUaNG6aGHHtKf//xnrV69WvPmzess4LfcckuPrwxE/wLozwA/GAzq0Ucf1ZNPPqm5c+fqrrvukiTNmTNHJ06c0A8++KAHO3bs0Msvv6y7775b3333nfbu3Sspmm2Ceb169WqNGzdOy5cv7/GVg+hfAP0Z4F+5ckWrVq3SW2+9pSlTpigQCOjRRx/Vnj17evzy8nJdunRJX331lSTp4MGDXV7/ySef6Nq1a3rqqae0atWqHl85iP4F0H8Z+CdPntSKFSu0ZMkSDRs2TA8//LBaW1u7vf748eP68ccf9fnnn0uSjh071uX1b775Rj/++KMeeOABffHFFz2+chD9C6D/CvAzmYxOnTqlFStWaOnSpRo+fLgefvhhNTc3d3v9iRMnumh+Fve///3v2rVrl6ZNm6aNGzf2+MpB9C+A/j3wg8GgTp8+rQ8++EB33nmnRo8erZkzZ6qpqanb60+ePClJ2rJliyTp+PHjXV6/fft2tbe368knn9T69et7fOUg+hdA/xb47e3tOnfunFavXq2HHnpI//mf/6np06erpqaG20TQd999p9dee03PPfecHnvsMY0ePVozZsxQfX19l9cfO3asA/4dO3b0+MpB9C+A/i3wa2tr9eGHH+qFF17Q2LFjdfvtt2vatGmqqKjo8fqzZ8/q4sWLuv322zVhwgS98MILOnLkSJfXnzhxQpL09ttva9GiRfrud7/b4ysH0b8A+jfAP378uD7++GPNmzdPd9xxh8aMGaNnn31Wly9f7vH6c+fOqaamRn/7299055136umnn9bXX3/d5fUnT57U1atXNXPmTH300Uc9vnIQ/QugfwN8tP7777/XggULNGLECD388MOaM2eOzp8/3+P1ly5d0rVr1/Tmm2/qlltu0fPPP69vv/22y+uPHz+ulpYWPffcc1q4cGGPrxxE/wLoXwa/paVFFy5c0IIFC/Tkk09q1KhReuaZZ7R+/foerz937pzq6ur01ltv6eabb9bLL7+s7777rsvra2tr9cMPP2jChAlavHhxj68cRP8C6N8An8x+z549mjNnjsaMGaNRo0bp8ccf14YNG3q8/sKFC6qvr9ebb76p73znO3rppZe0devWLq+vrq7WDz/8oAkTJmjJkiU9vnIQ/Qugfxn8lpYWXbx4Ue+//77mzp2rUaNG6YEHHtD777+vPXv29Hj9+fPn1dTUpPfee0+33Xabfvazn2nLli1dXl9VVaWtW7dq8uTJWrZsWY+vHET/AuhfBr+trU2XLl3Sp59+qvnz52vMmDEaNWqU7r//fn300Ufas2dPj9efP39eTU1Nmjdvnm699Va9/PLLKisr6/L6yspKbd68WZMnT9by5ct7fOUg+hdA/zL47e3tunz5sj799FMtWLBAt99+u/7+7/9e06ZN06pVq7R3794erz9//ryampq0YMECjRgxQj/5yU9UXl7e5fVVVVXatGmTpkyZopUrV/b4ykH0L4D+JfDb29t15coVrV27VgsXLuwAf9q0aVq9enWP11+4cEGNjY364IMPdMstt+iVV15RRUVFl9dXVlZq48aNmjp1qlatWtXjKwfRvwD6l8BnxUY/+/jjjzVv3rzO3n7llau8r7q3tgJBVVdXa8OGDZo6dapWr17d4ysH0b8A+pfAZ9HGl19+qY8++kjz5s3T7bffrjFjxmjs2LEaN26cxo8frwkTJmjSpEmaOHGiJk+erClTpmjatGmaPn26ZsyYoVmzZmnOnDmaP3++Fi5cqCVLlmjp0qVavny5VqxYoVWrVmnVqlVauXKlVq1apZUrV2rFihVatmyZli5dqiVLlmjx4sVauHCh5s+fr7lz52r27NmaNWuWZs6cqenTp2vatGmaMmWKJk+erEmTJmnChAka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=" 
             class="logo" 
             alt="Cura Logo" 
             style="width: 60px; height: 60px;" />
      </div>
      <div class="header-info">
        <h1>Cura Medical Practice</h1>
        <p class="subtitle">Excellence in Healthcare • Powered by Halo Group</p>
      </div>
      <div class="invoice-title">INVOICE</div>
    </div>

    <div class="content">
      <div class="billing-details">
        <div>
          <div class="section-title">Bill To</div>
          <div>
            <strong>${invoice.patientName}</strong><br>
            Patient ID: ${invoice.patientId}
          </div>
        </div>
        
        <div>
          <div class="section-title">Invoice Details</div>
          <div>
            <strong>Invoice Number:</strong> ${invoice.id}<br>
            <strong>Invoice Date:</strong> ${format(new Date(invoice.invoiceDate), 'dd/MM/yyyy')}<br>
            <strong>Due Date:</strong> ${format(new Date(invoice.dueDate), 'dd/MM/yyyy')}<br>
            <strong>Payment Terms:</strong> Net 30
          </div>
        </div>
      </div>

      <div class="payment-info">
        <strong>Payment Information</strong><br>
        Multiple payment options available: Credit Card, Bank Transfer, PayPal, or Cash
      </div>

      <table class="services-table">
        <thead>
          <tr>
            <th>Service Description</th>
            <th style="text-align: center;">Quantity</th>
            <th style="text-align: right;">Rate</th>
            <th style="text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${invoice.items.map((item: any) => `
            <tr>
              <td>
                <strong>${item.description}</strong><br>
                <small style="color: #6b7280;">Professional medical consultation</small>
              </td>
              <td style="text-align: center;">${item.quantity}</td>
              <td style="text-align: right;">£${item.unitPrice.toFixed(2)}</td>
              <td style="text-align: right;">£${item.total.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="total-section">
        <div class="total-row">
          <span>Subtotal:</span>
          <span>£${invoice.totalAmount.toFixed(2)}</span>
        </div>
        <div class="total-row">
          <span>VAT (0%):</span>
          <span>£0.00</span>
        </div>
        <div class="total-row final">
          <span>Total Amount:</span>
          <span>£${invoice.totalAmount.toFixed(2)}</span>
        </div>
        ${invoice.paidAmount > 0 ? `
        <div class="total-row" style="color: #059669;">
          <span>Amount Paid:</span>
          <span>-£${invoice.paidAmount.toFixed(2)}</span>
        </div>
        <div class="total-row final" style="color: ${(invoice.totalAmount - invoice.paidAmount) === 0 ? '#059669' : '#dc2626'};">
          <span>Balance Due:</span>
          <span>£${(invoice.totalAmount - invoice.paidAmount).toFixed(2)}</span>
        </div>
        ` : ''}
      </div>
    </div>

    <div class="footer">
      <p>Thank you for choosing Cura Medical Practice for your healthcare needs.</p>
      <p>© 2025 Cura Medical Practice. Powered by Halo Group & Averox Technologies.</p>
    </div>
  </div>
</body>
</html>`;
      
      const blob = new Blob([invoiceContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoice.id}.html`;
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