import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { isDoctorLike } from "@/lib/role-utils";
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
import { Switch } from "@/components/ui/switch";
import jsPDF from "jspdf";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
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
  Target,
  Edit,
  LayoutGrid,
  List
} from "lucide-react";

interface Invoice {
  id: string;
  organizationId: number;
  invoiceNumber?: string;
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

export default function BillingPage() {
  const { user } = useAuth();
  const isDoctor = isDoctorLike(user?.role);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showNewInvoice, setShowNewInvoice] = useState(false);
  const [selectedReport, setSelectedReport] = useState<string>("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdInvoiceNumber, setCreatedInvoiceNumber] = useState("");
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadedInvoiceNumber, setDownloadedInvoiceNumber] = useState("");
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [editedStatus, setEditedStatus] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [showSendSuccessModal, setShowSendSuccessModal] = useState(false);
  const [sentInvoiceInfo, setSentInvoiceInfo] = useState({ invoiceNumber: "", recipient: "" });
  const [showDeleteSuccessModal, setShowDeleteSuccessModal] = useState(false);
  const [deletedInvoiceNumber, setDeletedInvoiceNumber] = useState("");
  const [showStatusUpdateModal, setShowStatusUpdateModal] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [invoiceToPay, setInvoiceToPay] = useState<Invoice | null>(null);
  const [isListView, setIsListView] = useState(false);
  
  // Date filter states
  const [serviceDateFrom, setServiceDateFrom] = useState("");
  const [serviceDateTo, setServiceDateTo] = useState("");
  const [dueDateFrom, setDueDateFrom] = useState("");
  const [dueDateTo, setDueDateTo] = useState("");

  const { data: billingData = [], isLoading, error } = useQuery({
    queryKey: ["/api/billing"],
  });
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [activeTab, setActiveTab] = useState("invoices");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Check if user is admin
  const isAdmin = user?.role === 'admin';

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setEditedStatus(invoice.status);
    setIsEditingStatus(false);
  };

  const handleUpdateStatus = async () => {
    if (!selectedInvoice || !editedStatus) return;
    
    try {
      await apiRequest('PATCH', `/api/billing/invoices/${selectedInvoice.id}`, {
        status: editedStatus
      });
      
      // If status is changed to "paid", create a payment record
      if (editedStatus === 'paid' && selectedInvoice.status !== 'paid') {
        await apiRequest('POST', '/api/billing/payments', {
          organizationId: selectedInvoice.organizationId,
          invoiceId: selectedInvoice.id,
          patientId: selectedInvoice.patientId,
          amount: typeof selectedInvoice.totalAmount === 'string' ? parseFloat(selectedInvoice.totalAmount) : selectedInvoice.totalAmount,
          currency: 'GBP',
          paymentMethod: 'manual',
          paymentProvider: 'manual',
          paymentStatus: 'completed',
          paymentDate: new Date().toISOString(),
          transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        });
        
        // Refresh payments list
        queryClient.invalidateQueries({ queryKey: ["/api/billing/payments"] });
      }
      
      // Update the local state
      setSelectedInvoice({ ...selectedInvoice, status: editedStatus as any });
      setIsEditingStatus(false);
      
      // Refresh the invoices list
      queryClient.invalidateQueries({ queryKey: ["/api/billing/invoices"] });
      queryClient.refetchQueries({ queryKey: ["/api/billing/invoices"] });
      
      toast({
        title: "Status Updated",
        description: `Invoice status updated to ${editedStatus}`,
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update invoice status",
        variant: "destructive"
      });
    }
  };

  const handleInlineStatusUpdate = async (invoiceId: string, newStatus: string) => {
    setUpdatingStatusId(invoiceId);
    
    try {
      await apiRequest('PATCH', `/api/billing/invoices/${invoiceId}`, {
        status: newStatus
      });
      
      // Show success modal
      setShowStatusUpdateModal(true);
      
      // Refresh the invoices list
      await queryClient.invalidateQueries({ queryKey: ["/api/billing/invoices"] });
      await queryClient.refetchQueries({ queryKey: ["/api/billing/invoices"] });
      
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update invoice status",
        variant: "destructive"
      });
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handlePayNow = (invoice: Invoice) => {
    setInvoiceToPay(invoice);
    setShowPaymentModal(true);
  };

  const handleDownloadInvoice = (invoiceId: string) => {
    const invoice = Array.isArray(invoices) ? invoices.find((inv: any) => inv.id === invoiceId) : null;
    if (!invoice) return;

    // Show download success modal
    setDownloadedInvoiceNumber(invoice.invoiceNumber || invoiceId);
    setShowDownloadModal(true);

    // Helper to safely convert to number and format
    const toNum = (val: any) => typeof val === 'string' ? parseFloat(val) : val;

    // Create new PDF document
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - 2 * margin;

    // Function to add header to page
    const addHeader = () => {
      // Header background with gradient effect (simulated with rectangle)
      doc.setFillColor(79, 70, 229);
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      // Hospital name
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Cura Medical Practice', margin, 15);
      
      // Subtitle
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Excellence in Healthcare', margin, 25);
      
      // INVOICE title on right
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('INVOICE', pageWidth - margin - 45, 25);
    };

    // Function to add footer to page
    const addFooter = (pageNum: number) => {
      const footerY = pageHeight - 20;
      
      // Footer background
      doc.setFillColor(248, 250, 252);
      doc.rect(0, footerY - 5, pageWidth, 25, 'F');
      
      // Footer line
      doc.setDrawColor(229, 231, 235);
      doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
      
      // Footer text
      doc.setTextColor(107, 114, 128);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('Thank you for choosing Cura Medical Practice for your healthcare needs.', pageWidth / 2, footerY + 2, { align: 'center' });
      doc.text('© 2025 Cura Software Limited - Powered by Halo Group & Averox Technologies', pageWidth / 2, footerY + 8, { align: 'center' });
      
      // Page number
      doc.text(`Page ${pageNum}`, pageWidth - margin, footerY + 2, { align: 'right' });
    };

    // Start PDF content
    addHeader();
    
    let yPosition = 50;

    // Bill To and Invoice Details section
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('BILL TO', margin, yPosition);
    doc.text('INVOICE DETAILS', pageWidth / 2 + 10, yPosition);
    
    yPosition += 7;
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.patientName, margin, yPosition);
    doc.text(`Invoice Number: ${invoice.id}`, pageWidth / 2 + 10, yPosition);
    
    yPosition += 5;
    doc.setFontSize(9);
    doc.text(`Patient ID: ${invoice.patientId}`, margin, yPosition);
    doc.text(`Invoice Date: ${format(new Date(invoice.invoiceDate), 'dd/MM/yyyy')}`, pageWidth / 2 + 10, yPosition);
    
    yPosition += 5;
    doc.text(`Due Date: ${format(new Date(invoice.dueDate), 'dd/MM/yyyy')}`, pageWidth / 2 + 10, yPosition);
    
    yPosition += 5;
    doc.text(`Payment Terms: Net 30`, pageWidth / 2 + 10, yPosition);

    yPosition += 10;

    // Payment Information box
    doc.setFillColor(219, 234, 254);
    doc.roundedRect(margin, yPosition, contentWidth, 12, 2, 2, 'F');
    doc.setTextColor(30, 64, 175);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    yPosition += 5;
    doc.text('Payment Information', margin + 3, yPosition);
    yPosition += 4;
    doc.setFont('helvetica', 'normal');
    doc.text('Multiple payment options available: Credit Card, Bank Transfer, PayPal, or Cash', margin + 3, yPosition);

    yPosition += 12;

    // Services table header
    doc.setFillColor(79, 70, 229);
    doc.rect(margin, yPosition, contentWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    yPosition += 6;
    doc.text('Service Description', margin + 2, yPosition);
    doc.text('Qty', pageWidth - margin - 80, yPosition, { align: 'right' });
    doc.text('Rate', pageWidth - margin - 50, yPosition, { align: 'right' });
    doc.text('Amount', pageWidth - margin - 2, yPosition, { align: 'right' });

    yPosition += 5;

    // Services table rows
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    let rowCount = 0;
    invoice.items.forEach((item: any) => {
      if (yPosition > pageHeight - 50) {
        addFooter(1);
        doc.addPage();
        addHeader();
        yPosition = 50;
      }

      // Alternate row background
      if (rowCount % 2 === 0) {
        doc.setFillColor(249, 250, 251);
        doc.rect(margin, yPosition - 4, contentWidth, 10, 'F');
      }

      doc.setFont('helvetica', 'bold');
      doc.text(item.description, margin + 2, yPosition);
      yPosition += 4;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(107, 114, 128);
      doc.text('Professional medical consultation', margin + 2, yPosition);
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      yPosition -= 2;
      doc.text(item.quantity.toString(), pageWidth - margin - 80, yPosition, { align: 'right' });
      doc.text(`£${toNum(item.unitPrice).toFixed(2)}`, pageWidth - margin - 50, yPosition, { align: 'right' });
      doc.text(`£${toNum(item.total).toFixed(2)}`, pageWidth - margin - 2, yPosition, { align: 'right' });
      
      yPosition += 8;
      rowCount++;
    });

    yPosition += 5;

    // Totals section
    const totalsX = pageWidth - margin - 60;
    doc.setFont('helvetica', 'normal');
    doc.text('Subtotal:', totalsX, yPosition);
    doc.text(`£${toNum(invoice.totalAmount).toFixed(2)}`, pageWidth - margin - 2, yPosition, { align: 'right' });
    
    yPosition += 6;
    doc.text('VAT (0%):', totalsX, yPosition);
    doc.text('£0.00', pageWidth - margin - 2, yPosition, { align: 'right' });
    
    yPosition += 8;
    doc.setDrawColor(79, 70, 229);
    doc.line(totalsX - 5, yPosition - 2, pageWidth - margin, yPosition - 2);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Total Amount:', totalsX, yPosition);
    doc.text(`£${toNum(invoice.totalAmount).toFixed(2)}`, pageWidth - margin - 2, yPosition, { align: 'right' });

    if (toNum(invoice.paidAmount) > 0) {
      yPosition += 8;
      doc.setFontSize(9);
      doc.setTextColor(5, 150, 105);
      doc.text('Amount Paid:', totalsX, yPosition);
      doc.text(`-£${toNum(invoice.paidAmount).toFixed(2)}`, pageWidth - margin - 2, yPosition, { align: 'right' });
      
      yPosition += 8;
      const balanceDue = toNum(invoice.totalAmount) - toNum(invoice.paidAmount);
      doc.setTextColor(balanceDue === 0 ? 5 : 220, balanceDue === 0 ? 150 : 38, balanceDue === 0 ? 105 : 38);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Balance Due:', totalsX, yPosition);
      doc.text(`£${balanceDue.toFixed(2)}`, pageWidth - margin - 2, yPosition, { align: 'right' });
    }

    // Add footer to first (and possibly only) page
    addFooter(1);

    // Save the PDF
    doc.save(`invoice-${invoice.id}.pdf`);
  };

  const [sendInvoiceDialog, setSendInvoiceDialog] = useState(false);
  const [invoiceToSend, setInvoiceToSend] = useState<Invoice | null>(null);
  const [sendMethod, setSendMethod] = useState("email");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [customMessage, setCustomMessage] = useState("");

  // New invoice form state
  const [selectedPatient, setSelectedPatient] = useState("");
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [totalAmount, setTotalAmount] = useState("");
  const [insuranceProvider, setInsuranceProvider] = useState("");
  const [firstServiceCode, setFirstServiceCode] = useState("");
  const [firstServiceDesc, setFirstServiceDesc] = useState("");
  const [firstServiceQty, setFirstServiceQty] = useState("");
  const [firstServiceAmount, setFirstServiceAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [nhsNumber, setNhsNumber] = useState("");
  
  // Validation error states
  const [patientError, setPatientError] = useState("");
  const [serviceError, setServiceError] = useState("");
  const [totalAmountError, setTotalAmountError] = useState("");
  const [nhsNumberError, setNhsNumberError] = useState("");

  const handleSendInvoice = (invoiceId: string) => {
    const invoice = Array.isArray(invoices) ? invoices.find((inv: any) => inv.id === invoiceId) : null;
    if (invoice) {
      setInvoiceToSend(invoice);
      setRecipientEmail(`${invoice.patientName.toLowerCase().replace(' ', '.')}@email.com`);
      setRecipientPhone(`+44 7${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`);
      setRecipientName(invoice.patientName);
      setRecipientAddress(`${Math.floor(Math.random() * 999) + 1} High Street\nLondon\nSW1A 1AA`);
      const totalAmt = typeof invoice.totalAmount === 'string' ? parseFloat(invoice.totalAmount) : invoice.totalAmount;
      setCustomMessage(`Dear ${invoice.patientName},\n\nPlease find your invoice for services rendered on ${format(new Date(invoice.dateOfService), 'MMM d, yyyy')}.\n\nTotal Amount: £${totalAmt.toFixed(2)}\nDue Date: ${format(new Date(invoice.dueDate), 'MMM d, yyyy')}\n\nThank you for choosing our healthcare services.`);
      setSendInvoiceDialog(true);
    }
  };

  const confirmSendInvoice = async () => {
    if (!invoiceToSend) return;
    
    try {
      await apiRequest('POST', '/api/billing/send-invoice', {
        invoiceId: invoiceToSend.id,
        sendMethod,
        recipientEmail: sendMethod === 'email' ? recipientEmail : undefined,
        recipientPhone: sendMethod === 'sms' ? recipientPhone : undefined,
        recipientName: sendMethod === 'print' ? recipientName : undefined,
        recipientAddress: sendMethod === 'print' ? recipientAddress : undefined,
        customMessage
      });
      
      // Set the success modal info
      setSentInvoiceInfo({
        invoiceNumber: invoiceToSend.invoiceNumber || invoiceToSend.id,
        recipient: sendMethod === 'email' ? recipientEmail : sendMethod === 'sms' ? recipientPhone : recipientName
      });
      
      // Close send dialog and show success modal
      setSendInvoiceDialog(false);
      setShowSendSuccessModal(true);
      
      // Clear all form fields
      setInvoiceToSend(null);
      setRecipientEmail("");
      setRecipientPhone("");
      setRecipientName("");
      setRecipientAddress("");
      setCustomMessage("");
    } catch (error) {
      toast({
        title: "Failed to Send Invoice",
        description: "There was an error sending the invoice. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteInvoice = (invoiceId: string) => {
    const invoice = Array.isArray(invoices) ? invoices.find((inv: any) => inv.id === invoiceId) : null;
    if (invoice) {
      setInvoiceToDelete(invoice);
      setShowDeleteModal(true);
    }
  };

  const confirmDeleteInvoice = async () => {
    if (!invoiceToDelete) return;
    
    try {
      // Call API to delete the invoice
      await apiRequest('DELETE', `/api/billing/invoices/${invoiceToDelete.id}`, {});
      
      // Set deleted invoice info for success modal
      setDeletedInvoiceNumber(invoiceToDelete.invoiceNumber || invoiceToDelete.id);
      
      // Close delete confirmation modal
      setShowDeleteModal(false);
      
      // Show success modal
      setShowDeleteSuccessModal(true);
      
      // Clear the invoice to delete
      setInvoiceToDelete(null);
      
      // Refresh invoices list - use correct query keys
      queryClient.invalidateQueries({ queryKey: ["/api/billing/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/billing"] });
      queryClient.refetchQueries({ queryKey: ["/api/billing/invoices"] });
      queryClient.refetchQueries({ queryKey: ["/api/billing"] });
    } catch (error) {
      toast({
        title: "Failed to Delete Invoice",
        description: "There was an error deleting the invoice. Please try again.",
        variant: "destructive"
      });
      setShowDeleteModal(false);
      setInvoiceToDelete(null);
    }
  };

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ["/api/billing/invoices", statusFilter],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const subdomain = localStorage.getItem('user_subdomain') || 'demo';
      const url = statusFilter && statusFilter !== 'all' 
        ? `/api/billing/invoices?status=${statusFilter}`
        : '/api/billing/invoices';
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': subdomain
        }
      });
      if (!response.ok) throw new Error('Failed to fetch invoices');
      return response.json();
    },
    enabled: true,
  });

  // Fetch patients for new invoice dropdown
  const { data: patients, isLoading: patientsLoading } = useQuery({
    queryKey: ["/api/patients"],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const subdomain = localStorage.getItem('user_subdomain') || 'demo';
      const response = await fetch('/api/patients', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': subdomain
        }
      });
      if (!response.ok) throw new Error('Failed to fetch patients');
      return response.json();
    }
  });

  // Fetch payments for Payment History tab
  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ["/api/billing/payments"],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const subdomain = localStorage.getItem('user_subdomain') || 'demo';
      const response = await fetch('/api/billing/payments', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': subdomain
        }
      });
      if (!response.ok) throw new Error('Failed to fetch payments');
      return response.json();
    },
    enabled: isAdmin,
  });

  // Auto-populate NHS number when patient is selected
  useEffect(() => {
    if (selectedPatient && patients && patients.length > 0) {
      const selected = patients.find((p: any) => p.patientId === selectedPatient);
      if (selected && selected.nhsNumber) {
        setNhsNumber(selected.nhsNumber);
      } else {
        // Clear NHS number if patient has none or selection is invalid
        setNhsNumber("");
      }
    } else {
      // Clear NHS number when selection is cleared
      setNhsNumber("");
    }
  }, [selectedPatient, patients]);

  const filteredInvoices = Array.isArray(invoices) ? invoices.filter((invoice: any) => {
    // Unified search: Search by Invoice ID, Patient ID, or Patient Name
    const matchesSearch = !searchQuery || 
      invoice.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(invoice.id).toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(invoice.patientId).toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    
    // Filter by Service Date range
    const invoiceServiceDate = new Date(invoice.dateOfService);
    const matchesServiceDateFrom = !serviceDateFrom || invoiceServiceDate >= new Date(serviceDateFrom);
    const matchesServiceDateTo = !serviceDateTo || invoiceServiceDate <= new Date(serviceDateTo);
    
    // Filter by Due Date range
    const invoiceDueDate = new Date(invoice.dueDate);
    const matchesDueDateFrom = !dueDateFrom || invoiceDueDate >= new Date(dueDateFrom);
    const matchesDueDateTo = !dueDateTo || invoiceDueDate <= new Date(dueDateTo);
    
    return matchesSearch && matchesStatus && 
           matchesServiceDateFrom && matchesServiceDateTo && matchesDueDateFrom && matchesDueDateTo;
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
    return Array.isArray(payments) ? payments.reduce((sum: number, payment: any) => {
      const amount = typeof payment.amount === 'string' ? parseFloat(payment.amount) : payment.amount;
      return sum + amount;
    }, 0) : 0;
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
        <div className="space-y-6">
            {/* Quick Stats - Admin Only */}
            {isAdmin && (
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
            )}

            {/* Patient View: Direct Invoice List */}
            {!isAdmin ? (
              <div className="space-y-4">
                {/* Filters and Actions */}
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              placeholder="Search by Invoice ID, Patient ID or Name..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="pl-9 w-80"
                              data-testid="input-search-invoices"
                            />
                          </div>
                          
                          <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-40" data-testid="select-status-filter">
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

                        <div className="flex items-center gap-2">
                          <Label htmlFor="list-view-toggle" className="text-sm font-medium text-gray-700 dark:text-gray-300">List View</Label>
                          <Switch 
                            id="list-view-toggle"
                            checked={isListView} 
                            onCheckedChange={setIsListView}
                            data-testid="switch-list-view"
                          />
                        </div>
                      </div>

                      {/* Date Filters */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <div>
                          <Label htmlFor="service-date-from" className="text-xs text-gray-600 dark:text-gray-400 mb-1">Service Date From</Label>
                          <Input
                            id="service-date-from"
                            type="date"
                            value={serviceDateFrom}
                            onChange={(e) => setServiceDateFrom(e.target.value)}
                            className="h-9 text-sm"
                            data-testid="input-service-date-from"
                          />
                        </div>

                        <div>
                          <Label htmlFor="service-date-to" className="text-xs text-gray-600 dark:text-gray-400 mb-1">Service Date To</Label>
                          <Input
                            id="service-date-to"
                            type="date"
                            value={serviceDateTo}
                            onChange={(e) => setServiceDateTo(e.target.value)}
                            className="h-9 text-sm"
                            data-testid="input-service-date-to"
                          />
                        </div>

                        <div>
                          <Label htmlFor="due-date-from" className="text-xs text-gray-600 dark:text-gray-400 mb-1">Due Date From</Label>
                          <Input
                            id="due-date-from"
                            type="date"
                            value={dueDateFrom}
                            onChange={(e) => setDueDateFrom(e.target.value)}
                            className="h-9 text-sm"
                            data-testid="input-due-date-from"
                          />
                        </div>

                        <div>
                          <Label htmlFor="due-date-to" className="text-xs text-gray-600 dark:text-gray-400 mb-1">Due Date To</Label>
                          <Input
                            id="due-date-to"
                            type="date"
                            value={dueDateTo}
                            onChange={(e) => setDueDateTo(e.target.value)}
                            className="h-9 text-sm"
                            data-testid="input-due-date-to"
                          />
                        </div>
                      </div>

                      {/* Clear Filters Button */}
                      {(serviceDateFrom || serviceDateTo || dueDateFrom || dueDateTo) && (
                        <div className="flex justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setServiceDateFrom("");
                              setServiceDateTo("");
                              setDueDateFrom("");
                              setDueDateTo("");
                            }}
                            data-testid="button-clear-filters"
                          >
                            <Filter className="h-4 w-4 mr-2" />
                            Clear Date Filters
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Invoices List */}
                {isListView ? (
                  /* List View - Table Format */
                  <Card>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Invoice No.</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Patient Name</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Service Date</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Due Date</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Total</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Outstanding</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Status</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredInvoices.map((invoice) => (
                              <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-slate-800" data-testid={`invoice-row-${invoice.id}`}>
                                <td className="px-4 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">{invoice.id}</td>
                                <td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100">{invoice.patientName}</td>
                                <td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100">{format(new Date(invoice.dateOfService), 'MMM d, yyyy')}</td>
                                <td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100">{format(new Date(invoice.dueDate), 'MMM d, yyyy')}</td>
                                <td className="px-4 py-4 text-sm font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(invoice.totalAmount)}</td>
                                <td className="px-4 py-4 text-sm font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(invoice.totalAmount - invoice.paidAmount)}</td>
                                <td className="px-4 py-4 text-sm">
                                  {user?.role === 'patient' ? (
                                    <Badge className={`${getStatusColor(invoice.status)}`}>
                                      {invoice.status}
                                    </Badge>
                                  ) : (
                                    <Select 
                                      value={invoice.status} 
                                      onValueChange={(value) => handleInlineStatusUpdate(invoice.id, value)}
                                      disabled={updatingStatusId === invoice.id}
                                    >
                                      <SelectTrigger className={`w-32 h-8 text-xs ${getStatusColor(invoice.status)}`}>
                                        <SelectValue>{invoice.status}</SelectValue>
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="draft">Draft</SelectItem>
                                        <SelectItem value="sent">Sent</SelectItem>
                                        <SelectItem value="paid">Paid</SelectItem>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="overdue">Overdue</SelectItem>
                                        <SelectItem value="cancelled">Cancelled</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  )}
                                </td>
                                <td className="px-4 py-4 text-sm">
                                  <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => handleViewInvoice(invoice)} data-testid="button-view-invoice" title="View">
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleDownloadInvoice(invoice.id)} data-testid="button-download-invoice" title="Download">
                                      <Download className="h-4 w-4" />
                                    </Button>
                                    {!isAdmin && invoice.status !== 'draft' && invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                                      <Button 
                                        variant="default" 
                                        size="sm" 
                                        onClick={() => handlePayNow(invoice)}
                                        data-testid="button-pay-now"
                                        style={{ 
                                          backgroundColor: '#4A7DFF',
                                          color: 'white'
                                        }}
                                        title="Pay Now"
                                      >
                                        <CreditCard className="h-4 w-4 mr-1" />
                                        Pay
                                      </Button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  /* Grid View - Card Format */
                  <div className="space-y-4">
                    {filteredInvoices.map((invoice) => (
                      <Card key={invoice.id} className="hover:shadow-md transition-shadow" data-testid={`invoice-card-${invoice.id}`}>
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{invoice.patientName}</h3>
                                {user?.role === 'patient' ? (
                                  <Badge className={`${getStatusColor(invoice.status)} px-3 py-1`}>
                                    {invoice.status}
                                  </Badge>
                                ) : (
                                  <Select 
                                    value={invoice.status} 
                                    onValueChange={(value) => handleInlineStatusUpdate(invoice.id, value)}
                                    disabled={updatingStatusId === invoice.id}
                                  >
                                    <SelectTrigger className={`w-32 h-7 text-xs ${getStatusColor(invoice.status)}`}>
                                      <SelectValue>{invoice.status}</SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="draft">Draft</SelectItem>
                                      <SelectItem value="sent">Sent</SelectItem>
                                      <SelectItem value="paid">Paid</SelectItem>
                                      <SelectItem value="pending">Pending</SelectItem>
                                      <SelectItem value="overdue">Overdue</SelectItem>
                                      <SelectItem value="cancelled">Cancelled</SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}
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
                              <Button variant="outline" size="sm" onClick={() => handleViewInvoice(invoice)} data-testid="button-view-invoice">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleDownloadInvoice(invoice.id)} data-testid="button-download-invoice">
                                <Download className="h-4 w-4" />
                              </Button>
                              {!isAdmin && invoice.status !== 'draft' && invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                                <Button 
                                  variant="default" 
                                  size="sm" 
                                  onClick={() => handlePayNow(invoice)}
                                  data-testid="button-pay-now"
                                  style={{ 
                                    backgroundColor: '#4A7DFF',
                                    color: 'white',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    padding: '0.5rem 1rem',
                                    minWidth: '100px'
                                  }}
                                >
                                  <CreditCard className="h-4 w-4 mr-1" />
                                  Pay Now
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {filteredInvoices.length === 0 && (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400" data-testid="no-invoices-message">
                    <Receipt className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No invoices found</h3>
                    <p className="text-gray-600 dark:text-gray-300">Try adjusting your search terms or filters</p>
                  </div>
                )}
              </div>
            ) : (
              /* Admin View: Tabs Navigation */
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 md:grid-cols-5 lg:grid-cols-5 gap-1">
                  <TabsTrigger value="invoices">Invoices</TabsTrigger>
                  <TabsTrigger value="payment-history">Payment History</TabsTrigger>
                  <TabsTrigger value="insurance-claims">Insurance Claims</TabsTrigger>
                  <TabsTrigger value="revenue">Revenue</TabsTrigger>
                  <TabsTrigger value="custom-reports">Custom Reports</TabsTrigger>
                </TabsList>

                <TabsContent value="invoices" className="space-y-4 mt-6">
                  {/* Filters and Actions */}
                  <Card>
                    <CardContent className="p-4">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                              <Input
                                placeholder="Search by Invoice ID, Patient ID or Name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 w-80"
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
                          
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Label htmlFor="admin-list-view-toggle" className="text-sm font-medium text-gray-700 dark:text-gray-300">List View</Label>
                              <Switch 
                                id="admin-list-view-toggle"
                                checked={isListView} 
                                onCheckedChange={setIsListView}
                                data-testid="switch-admin-list-view"
                              />
                            </div>
                            <Button onClick={() => setShowNewInvoice(true)}>
                              <Plus className="h-4 w-4 mr-2" />
                              New Invoice
                            </Button>
                          </div>
                        </div>

                        {/* Date Filters */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                          <div>
                            <Label htmlFor="admin-service-date-from" className="text-xs text-gray-600 dark:text-gray-400 mb-1">Service Date From</Label>
                            <Input
                              id="admin-service-date-from"
                              type="date"
                              value={serviceDateFrom}
                              onChange={(e) => setServiceDateFrom(e.target.value)}
                              className="h-9 text-sm"
                              data-testid="input-admin-service-date-from"
                            />
                          </div>

                          <div>
                            <Label htmlFor="admin-service-date-to" className="text-xs text-gray-600 dark:text-gray-400 mb-1">Service Date To</Label>
                            <Input
                              id="admin-service-date-to"
                              type="date"
                              value={serviceDateTo}
                              onChange={(e) => setServiceDateTo(e.target.value)}
                              className="h-9 text-sm"
                              data-testid="input-admin-service-date-to"
                            />
                          </div>

                          <div>
                            <Label htmlFor="admin-due-date-from" className="text-xs text-gray-600 dark:text-gray-400 mb-1">Due Date From</Label>
                            <Input
                              id="admin-due-date-from"
                              type="date"
                              value={dueDateFrom}
                              onChange={(e) => setDueDateFrom(e.target.value)}
                              className="h-9 text-sm"
                              data-testid="input-admin-due-date-from"
                            />
                          </div>

                          <div>
                            <Label htmlFor="admin-due-date-to" className="text-xs text-gray-600 dark:text-gray-400 mb-1">Due Date To</Label>
                            <Input
                              id="admin-due-date-to"
                              type="date"
                              value={dueDateTo}
                              onChange={(e) => setDueDateTo(e.target.value)}
                              className="h-9 text-sm"
                              data-testid="input-admin-due-date-to"
                            />
                          </div>
                        </div>

                        {/* Clear Filters Button */}
                        {(serviceDateFrom || serviceDateTo || dueDateFrom || dueDateTo) && (
                          <div className="flex justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setServiceDateFrom("");
                                setServiceDateTo("");
                                setDueDateFrom("");
                                setDueDateTo("");
                              }}
                              data-testid="button-admin-clear-filters"
                            >
                              <Filter className="h-4 w-4 mr-2" />
                              Clear Date Filters
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Invoices List */}
                  {isListView ? (
                    /* List View - Table Format */
                    <Card>
                      <CardContent className="p-0">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Invoice No.</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Patient Name</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Service Date</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Due Date</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Total</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Outstanding</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-gray-700">
                              {filteredInvoices.map((invoice) => (
                                <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-slate-800" data-testid={`invoice-row-${invoice.id}`}>
                                  <td className="px-4 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">{invoice.id}</td>
                                  <td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100">{invoice.patientName}</td>
                                  <td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100">{format(new Date(invoice.dateOfService), 'MMM d, yyyy')}</td>
                                  <td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100">{format(new Date(invoice.dueDate), 'MMM d, yyyy')}</td>
                                  <td className="px-4 py-4 text-sm font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(invoice.totalAmount)}</td>
                                  <td className="px-4 py-4 text-sm font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(invoice.totalAmount - invoice.paidAmount)}</td>
                                  <td className="px-4 py-4 text-sm">
                                    {isAdmin ? (
                                      <Select 
                                        value={invoice.status} 
                                        onValueChange={(value) => handleInlineStatusUpdate(invoice.id, value)}
                                        disabled={updatingStatusId === invoice.id}
                                      >
                                        <SelectTrigger className={`w-32 h-8 text-xs ${getStatusColor(invoice.status)}`}>
                                          <SelectValue>{invoice.status}</SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="draft">Draft</SelectItem>
                                          <SelectItem value="sent">Sent</SelectItem>
                                          <SelectItem value="paid">Paid</SelectItem>
                                          <SelectItem value="pending">Pending</SelectItem>
                                          <SelectItem value="overdue">Overdue</SelectItem>
                                          <SelectItem value="cancelled">Cancelled</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    ) : (
                                      <Badge className={`${getStatusColor(invoice.status)}`}>
                                        {invoice.status}
                                      </Badge>
                                    )}
                                  </td>
                                  <td className="px-4 py-4 text-sm">
                                    <div className="flex items-center gap-2">
                                      <Button variant="ghost" size="sm" onClick={() => handleViewInvoice(invoice)} title="View">
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                      <Button variant="ghost" size="sm" onClick={() => handleDownloadInvoice(invoice.id)} title="Download">
                                        <Download className="h-4 w-4" />
                                      </Button>
                                      {isAdmin && (
                                        <>
                                          <Button variant="ghost" size="sm" onClick={() => handleSendInvoice(invoice.id)} title="Send">
                                            <Send className="h-4 w-4" />
                                          </Button>
                                          <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => handleDeleteInvoice(invoice.id)}
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                            title="Delete"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    /* Grid View - Card Format */
                    <div className="space-y-4">
                      {filteredInvoices.map((invoice) => (
                        <Card key={invoice.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{invoice.patientName}</h3>
                                  {isAdmin ? (
                                    <Select 
                                      value={invoice.status} 
                                      onValueChange={(value) => handleInlineStatusUpdate(invoice.id, value)}
                                      disabled={updatingStatusId === invoice.id}
                                    >
                                      <SelectTrigger className={`w-32 h-7 text-xs ${getStatusColor(invoice.status)}`}>
                                        <SelectValue>{invoice.status}</SelectValue>
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="draft">Draft</SelectItem>
                                        <SelectItem value="sent">Sent</SelectItem>
                                        <SelectItem value="paid">Paid</SelectItem>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="overdue">Overdue</SelectItem>
                                        <SelectItem value="cancelled">Cancelled</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <Badge className={getStatusColor(invoice.status)}>
                                      {invoice.status}
                                    </Badge>
                                  )}
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
                                {isAdmin && (
                                  <>
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
                                  </>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

            {filteredInvoices.length === 0 && (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Receipt className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
                <p className="text-gray-600 dark:text-gray-300">Try adjusting your search terms or filters</p>
              </div>
            )}
              </TabsContent>

              {isAdmin && (
                <TabsContent value="payment-history" className="space-y-4 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Payment History</CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      A summary of all payments made — whether from patients or insurance — across all invoices
                    </p>
                  </CardHeader>
                  <CardContent>
                    {paymentsLoading ? (
                      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                        <p className="text-sm">Loading payments...</p>
                      </div>
                    ) : (
                      <div className="rounded-md border">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b bg-gray-50 dark:bg-gray-800">
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Invoice</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Payer</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Date</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Method</th>
                              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">Amount</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Array.isArray(payments) && payments.length > 0 ? (
                              payments.map((payment: any) => {
                                // Find the patient by patientId
                                const patient = patients?.find((p: any) => p.patientId === payment.patientId);
                                const patientName = patient ? `${patient.firstName} ${patient.lastName}` : payment.patientId;
                                
                                // Find the invoice by invoiceId
                                const invoice = invoices?.find((inv: any) => inv.id === payment.invoiceId);
                                const invoiceNumber = invoice?.invoiceNumber || payment.invoiceId;
                                
                                return (
                                  <tr key={payment.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                      {invoiceNumber}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                      {patientName}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                                      {format(new Date(payment.paymentDate), 'MMM d, yyyy')}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 capitalize">
                                      {payment.paymentMethod === 'cash' ? 'Cash' : payment.paymentMethod === 'debit_card' ? 'Debit Card' : payment.paymentMethod.replace('_', ' ')}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 text-right font-medium">
                                      £{(typeof payment.amount === 'string' ? parseFloat(payment.amount) : payment.amount).toFixed(2)}
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                      <span className={`inline-flex items-center gap-1 ${
                                        payment.paymentStatus === 'completed' ? 'text-green-700 dark:text-green-400' : 
                                        payment.paymentStatus === 'pending' ? 'text-yellow-700 dark:text-yellow-400' : 
                                        'text-red-700 dark:text-red-400'
                                      }`}>
                                        <span className={payment.paymentStatus === 'completed' ? 'text-green-600' : payment.paymentStatus === 'pending' ? 'text-yellow-600' : 'text-red-600'}>
                                          {payment.paymentStatus === 'completed' ? '✓' : payment.paymentStatus === 'pending' ? '⏱' : '✗'}
                                        </span> 
                                        {payment.paymentStatus === 'completed' ? 'Successful' : payment.paymentStatus === 'pending' ? 'Pending' : 'Failed'}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td colSpan={6} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                                  <Receipt className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                  <p className="text-sm">No payment history available</p>
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
              )}

              {isAdmin && (
                <TabsContent value="insurance-claims" className="space-y-4 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      🛡️ Insurance Claims
                    </CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Track insurance-related invoices, claims submitted, their status, and amounts covered by insurers
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-gray-50 dark:bg-gray-800">
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Invoice</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Provider</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Claim Ref</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">Coverage</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Status</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Submitted</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Approved</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.isArray(invoices) && invoices
                            .filter((invoice: any) => invoice.invoiceType === 'insurance_claim' && invoice.insurance)
                            .map((invoice: any) => (
                              <tr key={invoice.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                                <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {invoice.invoiceNumber || invoice.id}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                  {invoice.insurance?.provider || 'N/A'}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                                  {invoice.insurance?.claimNumber || 'N/A'}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 text-right font-medium">
                                  £{invoice.insurance?.paidAmount 
                                    ? (typeof invoice.insurance.paidAmount === 'string' ? parseFloat(invoice.insurance.paidAmount) : invoice.insurance.paidAmount).toFixed(2)
                                    : (typeof invoice.totalAmount === 'string' ? parseFloat(invoice.totalAmount) : invoice.totalAmount).toFixed(2)}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  {invoice.insurance?.status === 'approved' ? (
                                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                                      ✅ Approved
                                    </Badge>
                                  ) : invoice.insurance?.status === 'denied' ? (
                                    <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                                      ❌ Denied
                                    </Badge>
                                  ) : invoice.insurance?.status === 'partially_paid' ? (
                                    <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                                      ⚠️ Partial
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                                      ⏱ Pending
                                    </Badge>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                                  {invoice.invoiceDate ? format(new Date(invoice.invoiceDate), 'MMM d') : '—'}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                                  {invoice.insurance?.status === 'approved' && invoice.dueDate 
                                    ? format(new Date(invoice.dueDate), 'MMM d')
                                    : '—'}
                                </td>
                              </tr>
                            ))}
                          {(!Array.isArray(invoices) || invoices.filter((inv: any) => inv.invoiceType === 'insurance_claim' && inv.insurance).length === 0) && (
                            <tr>
                              <td colSpan={7} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                <p className="text-sm font-medium">No insurance claims found</p>
                                <p className="text-xs mt-1">Insurance claims will appear here when invoices are billed to insurance providers</p>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              )}

              {/* Revenue Tab with nested sub-tabs */}
              <TabsContent value="revenue" className="space-y-4 mt-6">
                <Tabs defaultValue="revenue-report" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 lg:grid-cols-6 gap-1">
                    <TabsTrigger value="revenue-report">Revenue Report</TabsTrigger>
                    <TabsTrigger value="outstanding-invoices">Outstanding Invoices</TabsTrigger>
                    <TabsTrigger value="insurance-analytics">Insurance Analytics</TabsTrigger>
                    <TabsTrigger value="aging-report">Aging Report</TabsTrigger>
                    <TabsTrigger value="provider-performance">Provider Performance</TabsTrigger>
                    <TabsTrigger value="procedure-analysis">Procedure Analysis</TabsTrigger>
                  </TabsList>

              {/* Revenue Report Tab */}
              {isAdmin && (
                <TabsContent value="revenue-report" className="space-y-4 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Revenue Report
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Quick Financial Overview */}
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Quick Financial Overview</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Card className="bg-blue-50 dark:bg-blue-900/20">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</p>
                                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">£45,230</p>
                                </div>
                                <DollarSign className="h-8 w-8 text-blue-600" />
                              </div>
                            </CardContent>
                          </Card>
                          <Card className="bg-green-50 dark:bg-green-900/20">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">Collected</p>
                                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">£38,920</p>
                                </div>
                                <CheckCircle className="h-8 w-8 text-green-600" />
                              </div>
                            </CardContent>
                          </Card>
                          <Card className="bg-orange-50 dark:bg-orange-900/20">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
                                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">£6,310</p>
                                </div>
                                <Clock className="h-8 w-8 text-orange-600" />
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>

                      {/* Revenue Breakdown - Current Month */}
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Revenue Breakdown - Current Month</h3>
                        <div className="rounded-md border">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b bg-gray-50 dark:bg-gray-800">
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Category</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">Revenue</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">Percentage</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">Consultations</td>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 text-right font-medium">£18,500</td>
                                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 text-right">40.9%</td>
                              </tr>
                              <tr className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">Procedures</td>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 text-right font-medium">£15,230</td>
                                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 text-right">33.7%</td>
                              </tr>
                              <tr className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">Lab Tests</td>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 text-right font-medium">£8,000</td>
                                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 text-right">17.7%</td>
                              </tr>
                              <tr className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">Medications</td>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 text-right font-medium">£3,500</td>
                                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 text-right">7.7%</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Report Filters */}
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Report Filters</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="revenue-date-from">Date From</Label>
                            <Input id="revenue-date-from" type="date" />
                          </div>
                          <div>
                            <Label htmlFor="revenue-date-to">Date To</Label>
                            <Input id="revenue-date-to" type="date" />
                          </div>
                          <div>
                            <Label htmlFor="revenue-category">Category</Label>
                            <Select>
                              <SelectTrigger id="revenue-category">
                                <SelectValue placeholder="All Categories" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                <SelectItem value="consultations">Consultations</SelectItem>
                                <SelectItem value="procedures">Procedures</SelectItem>
                                <SelectItem value="lab-tests">Lab Tests</SelectItem>
                                <SelectItem value="medications">Medications</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="flex justify-end mt-4">
                          <Button>
                            <Filter className="h-4 w-4 mr-2" />
                            Apply Filters
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* Outstanding Invoices Tab */}
              {isAdmin && (
                <TabsContent value="outstanding-invoices" className="space-y-4 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        Outstanding Invoices
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Quick Financial Overview */}
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Quick Financial Overview</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Card className="bg-red-50 dark:bg-red-900/20">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Outstanding</p>
                                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">£12,450</p>
                                </div>
                                <AlertTriangle className="h-8 w-8 text-red-600" />
                              </div>
                            </CardContent>
                          </Card>
                          <Card className="bg-orange-50 dark:bg-orange-900/20">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">Overdue (&gt;30 days)</p>
                                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">£4,230</p>
                                </div>
                                <Clock className="h-8 w-8 text-orange-600" />
                              </div>
                            </CardContent>
                          </Card>
                          <Card className="bg-yellow-50 dark:bg-yellow-900/20">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">Pending (&lt;30 days)</p>
                                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">£8,220</p>
                                </div>
                                <FileText className="h-8 w-8 text-yellow-600" />
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>

                      {/* Revenue Breakdown - Current Month */}
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Outstanding Invoices List</h3>
                        <div className="rounded-md border">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b bg-gray-50 dark:bg-gray-800">
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Invoice #</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Patient</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">Amount</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Days Overdue</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                                <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">INV-2024-001</td>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">John Smith</td>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 text-right font-medium">£2,450</td>
                                <td className="px-4 py-3 text-sm text-red-600 dark:text-red-400">45 days</td>
                                <td className="px-4 py-3 text-sm">
                                  <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">Overdue</Badge>
                                </td>
                              </tr>
                              <tr className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                                <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">INV-2024-002</td>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">Jane Doe</td>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 text-right font-medium">£1,780</td>
                                <td className="px-4 py-3 text-sm text-orange-600 dark:text-orange-400">35 days</td>
                                <td className="px-4 py-3 text-sm">
                                  <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400">Overdue</Badge>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Report Filters */}
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Report Filters</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="outstanding-days">Days Overdue</Label>
                            <Select>
                              <SelectTrigger id="outstanding-days">
                                <SelectValue placeholder="All" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="0-30">0-30 days</SelectItem>
                                <SelectItem value="30-60">30-60 days</SelectItem>
                                <SelectItem value="60-90">60-90 days</SelectItem>
                                <SelectItem value="90+">90+ days</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="outstanding-amount">Amount Range</Label>
                            <Select>
                              <SelectTrigger id="outstanding-amount">
                                <SelectValue placeholder="All Amounts" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Amounts</SelectItem>
                                <SelectItem value="0-500">£0 - £500</SelectItem>
                                <SelectItem value="500-1000">£500 - £1,000</SelectItem>
                                <SelectItem value="1000+">£1,000+</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="outstanding-patient">Patient</Label>
                            <Input id="outstanding-patient" placeholder="Search patient..." />
                          </div>
                        </div>
                        <div className="flex justify-end mt-4">
                          <Button>
                            <Filter className="h-4 w-4 mr-2" />
                            Apply Filters
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* Insurance Analytics Tab */}
              {isAdmin && (
                <TabsContent value="insurance-analytics" className="space-y-4 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <PieChart className="h-5 w-5" />
                        Insurance Analytics
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Quick Financial Overview */}
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Quick Financial Overview</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Card className="bg-green-50 dark:bg-green-900/20">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">Claims Approved</p>
                                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">£28,500</p>
                                </div>
                                <CheckCircle className="h-8 w-8 text-green-600" />
                              </div>
                            </CardContent>
                          </Card>
                          <Card className="bg-yellow-50 dark:bg-yellow-900/20">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">Claims Pending</p>
                                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">£12,300</p>
                                </div>
                                <Clock className="h-8 w-8 text-yellow-600" />
                              </div>
                            </CardContent>
                          </Card>
                          <Card className="bg-red-50 dark:bg-red-900/20">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">Claims Denied</p>
                                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">£3,200</p>
                                </div>
                                <AlertTriangle className="h-8 w-8 text-red-600" />
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>

                      {/* Revenue Breakdown - Current Month */}
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Claims by Insurance Provider</h3>
                        <div className="rounded-md border">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b bg-gray-50 dark:bg-gray-800">
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Provider</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">Total Claims</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">Approved</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">Approval Rate</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">NHS</td>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 text-right">45</td>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 text-right font-medium">£18,500</td>
                                <td className="px-4 py-3 text-sm text-green-600 dark:text-green-400 text-right">92%</td>
                              </tr>
                              <tr className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">Bupa</td>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 text-right">28</td>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 text-right font-medium">£10,000</td>
                                <td className="px-4 py-3 text-sm text-green-600 dark:text-green-400 text-right">85%</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Report Filters */}
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Report Filters</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="insurance-provider">Insurance Provider</Label>
                            <Select>
                              <SelectTrigger id="insurance-provider">
                                <SelectValue placeholder="All Providers" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Providers</SelectItem>
                                <SelectItem value="nhs">NHS</SelectItem>
                                <SelectItem value="bupa">Bupa</SelectItem>
                                <SelectItem value="axa">AXA</SelectItem>
                                <SelectItem value="aviva">Aviva</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="insurance-status">Claim Status</Label>
                            <Select>
                              <SelectTrigger id="insurance-status">
                                <SelectValue placeholder="All Statuses" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="approved">Approved</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="denied">Denied</SelectItem>
                                <SelectItem value="partially_paid">Partially Paid</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="insurance-date-range">Date Range</Label>
                            <Select>
                              <SelectTrigger id="insurance-date-range">
                                <SelectValue placeholder="Last 30 Days" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="7">Last 7 Days</SelectItem>
                                <SelectItem value="30">Last 30 Days</SelectItem>
                                <SelectItem value="90">Last 90 Days</SelectItem>
                                <SelectItem value="custom">Custom Range</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="flex justify-end mt-4">
                          <Button>
                            <Filter className="h-4 w-4 mr-2" />
                            Apply Filters
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* Aging Report Tab */}
              {isAdmin && (
                <TabsContent value="aging-report" className="space-y-4 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Aging Report
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Quick Financial Overview */}
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Quick Financial Overview</h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <Card className="bg-green-50 dark:bg-green-900/20">
                            <CardContent className="p-4">
                              <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Current (0-30)</p>
                                <p className="text-2xl font-bold text-green-600 dark:text-green-400">£8,220</p>
                              </div>
                            </CardContent>
                          </Card>
                          <Card className="bg-yellow-50 dark:bg-yellow-900/20">
                            <CardContent className="p-4">
                              <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">30-60 Days</p>
                                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">£3,150</p>
                              </div>
                            </CardContent>
                          </Card>
                          <Card className="bg-orange-50 dark:bg-orange-900/20">
                            <CardContent className="p-4">
                              <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">60-90 Days</p>
                                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">£1,080</p>
                              </div>
                            </CardContent>
                          </Card>
                          <Card className="bg-red-50 dark:bg-red-900/20">
                            <CardContent className="p-4">
                              <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">90+ Days</p>
                                <p className="text-2xl font-bold text-red-600 dark:text-red-400">£1,200</p>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>

                      {/* Revenue Breakdown - Current Month */}
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Aging Breakdown by Patient</h3>
                        <div className="rounded-md border">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b bg-gray-50 dark:bg-gray-800">
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Patient</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">Current</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">30-60</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">60-90</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">90+</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">John Smith</td>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 text-right">£500</td>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 text-right">£750</td>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 text-right">£300</td>
                                <td className="px-4 py-3 text-sm text-red-600 dark:text-red-400 text-right font-medium">£450</td>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 text-right font-bold">£2,000</td>
                              </tr>
                              <tr className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">Jane Doe</td>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 text-right">£1,200</td>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 text-right">£400</td>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 text-right">£180</td>
                                <td className="px-4 py-3 text-sm text-red-600 dark:text-red-400 text-right font-medium">£0</td>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 text-right font-bold">£1,780</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Report Filters */}
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Report Filters</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="aging-range">Age Range</Label>
                            <Select>
                              <SelectTrigger id="aging-range">
                                <SelectValue placeholder="All Ranges" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Ranges</SelectItem>
                                <SelectItem value="current">Current (0-30)</SelectItem>
                                <SelectItem value="30-60">30-60 Days</SelectItem>
                                <SelectItem value="60-90">60-90 Days</SelectItem>
                                <SelectItem value="90+">90+ Days</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="aging-patient">Patient</Label>
                            <Input id="aging-patient" placeholder="Search patient..." />
                          </div>
                          <div>
                            <Label htmlFor="aging-min-amount">Min Amount</Label>
                            <Input id="aging-min-amount" type="number" placeholder="£0" />
                          </div>
                        </div>
                        <div className="flex justify-end mt-4">
                          <Button>
                            <Filter className="h-4 w-4 mr-2" />
                            Apply Filters
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* Provider Performance Tab */}
              {isAdmin && (
                <TabsContent value="provider-performance" className="space-y-4 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5" />
                        Provider Performance
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Quick Financial Overview */}
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Quick Financial Overview</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Card className="bg-blue-50 dark:bg-blue-900/20">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Providers</p>
                                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">12</p>
                                </div>
                                <User className="h-8 w-8 text-blue-600" />
                              </div>
                            </CardContent>
                          </Card>
                          <Card className="bg-green-50 dark:bg-green-900/20">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">Avg Revenue/Provider</p>
                                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">£3,769</p>
                                </div>
                                <DollarSign className="h-8 w-8 text-green-600" />
                              </div>
                            </CardContent>
                          </Card>
                          <Card className="bg-purple-50 dark:bg-purple-900/20">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">Top Performer</p>
                                  <p className="text-lg font-bold text-purple-600 dark:text-purple-400">Dr. Smith</p>
                                </div>
                                <TrendingUp className="h-8 w-8 text-purple-600" />
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>

                      {/* Revenue Breakdown - Current Month */}
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Provider Performance Metrics</h3>
                        <div className="rounded-md border">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b bg-gray-50 dark:bg-gray-800">
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Provider</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">Patients</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">Procedures</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">Revenue</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">Avg/Patient</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">Dr. Sarah Smith</td>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 text-right">45</td>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 text-right">82</td>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 text-right font-medium">£12,500</td>
                                <td className="px-4 py-3 text-sm text-green-600 dark:text-green-400 text-right">£278</td>
                              </tr>
                              <tr className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">Dr. Michael Johnson</td>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 text-right">38</td>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 text-right">65</td>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 text-right font-medium">£9,800</td>
                                <td className="px-4 py-3 text-sm text-green-600 dark:text-green-400 text-right">£258</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Report Filters */}
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Report Filters</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="provider-name">Provider</Label>
                            <Select>
                              <SelectTrigger id="provider-name">
                                <SelectValue placeholder="All Providers" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Providers</SelectItem>
                                <SelectItem value="dr-smith">Dr. Sarah Smith</SelectItem>
                                <SelectItem value="dr-johnson">Dr. Michael Johnson</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="provider-specialty">Specialty</Label>
                            <Select>
                              <SelectTrigger id="provider-specialty">
                                <SelectValue placeholder="All Specialties" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Specialties</SelectItem>
                                <SelectItem value="cardiology">Cardiology</SelectItem>
                                <SelectItem value="neurology">Neurology</SelectItem>
                                <SelectItem value="pediatrics">Pediatrics</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="provider-period">Time Period</Label>
                            <Select>
                              <SelectTrigger id="provider-period">
                                <SelectValue placeholder="Current Month" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="current">Current Month</SelectItem>
                                <SelectItem value="last">Last Month</SelectItem>
                                <SelectItem value="quarter">This Quarter</SelectItem>
                                <SelectItem value="year">This Year</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="flex justify-end mt-4">
                          <Button>
                            <Filter className="h-4 w-4 mr-2" />
                            Apply Filters
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* Procedure Analysis Tab */}
              {isAdmin && (
                <TabsContent value="procedure-analysis" className="space-y-4 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileBarChart className="h-5 w-5" />
                        Procedure Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Quick Financial Overview */}
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Quick Financial Overview</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Card className="bg-blue-50 dark:bg-blue-900/20">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Procedures</p>
                                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">147</p>
                                </div>
                                <FileText className="h-8 w-8 text-blue-600" />
                              </div>
                            </CardContent>
                          </Card>
                          <Card className="bg-green-50 dark:bg-green-900/20">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">Procedure Revenue</p>
                                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">£32,450</p>
                                </div>
                                <DollarSign className="h-8 w-8 text-green-600" />
                              </div>
                            </CardContent>
                          </Card>
                          <Card className="bg-purple-50 dark:bg-purple-900/20">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">Avg Per Procedure</p>
                                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">£221</p>
                                </div>
                                <BarChart3 className="h-8 w-8 text-purple-600" />
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>

                      {/* Revenue Breakdown - Current Month */}
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Top Procedures by Revenue</h3>
                        <div className="rounded-md border">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b bg-gray-50 dark:bg-gray-800">
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Procedure</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">Count</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">Revenue</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">Avg Cost</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">% of Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">General Consultation</td>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 text-right">45</td>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 text-right font-medium">£9,000</td>
                                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 text-right">£200</td>
                                <td className="px-4 py-3 text-sm text-green-600 dark:text-green-400 text-right">27.7%</td>
                              </tr>
                              <tr className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">Blood Test Panel</td>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 text-right">32</td>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 text-right font-medium">£4,800</td>
                                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 text-right">£150</td>
                                <td className="px-4 py-3 text-sm text-green-600 dark:text-green-400 text-right">14.8%</td>
                              </tr>
                              <tr className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">X-Ray Examination</td>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 text-right">25</td>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 text-right font-medium">£6,250</td>
                                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 text-right">£250</td>
                                <td className="px-4 py-3 text-sm text-green-600 dark:text-green-400 text-right">19.3%</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Report Filters */}
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Report Filters</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="procedure-category">Category</Label>
                            <Select>
                              <SelectTrigger id="procedure-category">
                                <SelectValue placeholder="All Categories" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                <SelectItem value="consultation">Consultation</SelectItem>
                                <SelectItem value="diagnostic">Diagnostic</SelectItem>
                                <SelectItem value="surgical">Surgical</SelectItem>
                                <SelectItem value="therapy">Therapy</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="procedure-provider">Provider</Label>
                            <Select>
                              <SelectTrigger id="procedure-provider">
                                <SelectValue placeholder="All Providers" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Providers</SelectItem>
                                <SelectItem value="dr-smith">Dr. Sarah Smith</SelectItem>
                                <SelectItem value="dr-johnson">Dr. Michael Johnson</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="procedure-date-range">Date Range</Label>
                            <Select>
                              <SelectTrigger id="procedure-date-range">
                                <SelectValue placeholder="Current Month" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="current">Current Month</SelectItem>
                                <SelectItem value="last">Last Month</SelectItem>
                                <SelectItem value="quarter">This Quarter</SelectItem>
                                <SelectItem value="year">This Year</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="flex justify-end mt-4">
                          <Button>
                            <Filter className="h-4 w-4 mr-2" />
                            Apply Filters
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

                </Tabs>
              </TabsContent>

              {/* Custom Reports Tab */}
              {isAdmin && (
                <TabsContent value="custom-reports" className="space-y-4 mt-6">
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

                  {/* Revenue Breakdown - Current Month */}
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
                            <tr className="border-b bg-gray-50 dark:bg-gray-800">
                              <th className="text-left p-3">Service Type</th>
                              <th className="text-left p-3">Procedures</th>
                              <th className="text-left p-3">Revenue</th>
                              <th className="text-left p-3">Insurance</th>
                              <th className="text-left p-3">Self-Pay</th>
                              <th className="text-left p-3">Collection Rate</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                              <td className="p-3 font-medium">General Consultation</td>
                              <td className="p-3">24</td>
                              <td className="p-3 font-semibold">{formatCurrency(3600)}</td>
                              <td className="p-3">{formatCurrency(2800)}</td>
                              <td className="p-3">{formatCurrency(800)}</td>
                              <td className="p-3">
                                <Badge className="bg-green-100 text-green-800">95%</Badge>
                              </td>
                            </tr>
                            <tr className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                              <td className="p-3 font-medium">Specialist Consultation</td>
                              <td className="p-3">12</td>
                              <td className="p-3 font-semibold">{formatCurrency(2400)}</td>
                              <td className="p-3">{formatCurrency(1900)}</td>
                              <td className="p-3">{formatCurrency(500)}</td>
                              <td className="p-3">
                                <Badge className="bg-green-100 text-green-800">92%</Badge>
                              </td>
                            </tr>
                            <tr className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                              <td className="p-3 font-medium">Diagnostic Tests</td>
                              <td className="p-3">18</td>
                              <td className="p-3 font-semibold">{formatCurrency(1800)}</td>
                              <td className="p-3">{formatCurrency(1600)}</td>
                              <td className="p-3">{formatCurrency(200)}</td>
                              <td className="p-3">
                                <Badge className="bg-yellow-100 text-yellow-800">88%</Badge>
                              </td>
                            </tr>
                            <tr className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                              <td className="p-3 font-medium">Minor Procedures</td>
                              <td className="p-3">8</td>
                              <td className="p-3 font-semibold">{formatCurrency(1200)}</td>
                              <td className="p-3">{formatCurrency(900)}</td>
                              <td className="p-3">{formatCurrency(300)}</td>
                              <td className="p-3">
                                <Badge className="bg-green-100 text-green-800">94%</Badge>
                              </td>
                            </tr>
                            <tr className="border-b bg-gray-50 dark:bg-gray-800 font-semibold">
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
              )}
            </Tabs>
            )}

          {false && isAdmin && (
            <div className="space-y-6">
              {/* Report Selection Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedReport('revenue')}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Revenue Report</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Monthly and yearly revenue analysis</p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                    Last updated: {format(new Date(), 'MMM d, yyyy')}
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedReport('outstanding')}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Outstanding Invoices</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Unpaid and overdue invoices</p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                  </div>
                  <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                    Total: {formatCurrency(getOutstandingAmount())}
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedReport('insurance')}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Insurance Analytics</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Claims processing and reimbursements</p>
                    </div>
                    <PieChart className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                    Active claims: 12
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedReport('aging')}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Aging Report</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Accounts receivable by age</p>
                    </div>
                    <Clock className="h-8 w-8 text-orange-600" />
                  </div>
                  <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                    30+ days: £1,250
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedReport('provider')}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Provider Performance</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Revenue by healthcare provider</p>
                    </div>
                    <User className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                    5 providers tracked
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedReport('procedures')}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Procedure Analysis</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Most profitable procedures and services</p>
                    </div>
                    <Target className="h-8 w-8 text-teal-600" />
                  </div>
                  <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
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
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{formatCurrency(getTotalRevenue())}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">Total Revenue</div>
                    <div className="text-xs text-green-600 mt-1">+12% vs last month</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{formatCurrency(getOutstandingAmount())}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">Outstanding</div>
                    <div className="text-xs text-red-600 mt-1">2 overdue invoices</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">92%</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">Collection Rate</div>
                    <div className="text-xs text-green-600 mt-1">Above industry avg</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">18 days</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">Avg Collection Time</div>
                    <div className="text-xs text-orange-600 mt-1">Industry: 25 days</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
            )}
        </div>
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
                <Select value={selectedPatient} onValueChange={setSelectedPatient}>
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
                          <SelectItem key={patient.id} value={patient.patientId}>
                            {patient.firstName} {patient.lastName}
                          </SelectItem>
                        ));
                      })()
                    ) : (
                      <SelectItem value="no-patients" disabled>No patients found</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {patientError && (
                  <p className="text-sm text-red-600 mt-1">{patientError}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="service-date">Service Date</Label>
                <Input 
                  id="service-date" 
                  type="date" 
                  value={serviceDate}
                  onChange={(e) => setServiceDate(e.target.value)}
                />
              </div>
            </div>

            {/* Doctor Name Field */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="doctor-name">Doctor</Label>
                {isDoctor ? (
                  <div className="h-10 px-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-800 flex items-center text-sm">
                    {user?.firstName} {user?.lastName}
                  </div>
                ) : (
                  <div className="h-10 px-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-800 flex items-center text-sm">
                    {user?.firstName} {user?.lastName}
                  </div>
                )}
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
                <div className="grid grid-cols-4 gap-2 text-sm font-medium text-gray-600 dark:text-gray-300">
                  <span>Code</span>
                  <span>Description</span>
                  <span>Qty</span>
                  <span>Amount</span>
                </div>
                
                <div className="grid grid-cols-4 gap-2">
                  <Input placeholder="Enter CPT Code" value={firstServiceCode} onChange={(e) => setFirstServiceCode(e.target.value)} />
                  <Input placeholder="Enter Description" value={firstServiceDesc} onChange={(e) => setFirstServiceDesc(e.target.value)} />
                  <Input placeholder="Qty" value={firstServiceQty} onChange={(e) => setFirstServiceQty(e.target.value)} />
                  <Input placeholder="Amount" value={firstServiceAmount} onChange={(e) => setFirstServiceAmount(e.target.value)} />
                </div>
                
                <div className="grid grid-cols-4 gap-2">
                  <Input placeholder="CPT Code" />
                  <Input placeholder="Description" />
                  <Input placeholder="1" />
                  <Input placeholder="0.00" />
                </div>
              </div>
              {serviceError && (
                <p className="text-sm text-red-600 mt-1">{serviceError}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="insurance">Insurance Provider</Label>
                <Select value={insuranceProvider} onValueChange={setInsuranceProvider}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select insurance provider..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Patient Self-Pay)</SelectItem>
                    <SelectItem value="nhs">NHS (National Health Service)</SelectItem>
                    <SelectItem value="bupa">Bupa</SelectItem>
                    <SelectItem value="axa">AXA PPP Healthcare</SelectItem>
                    <SelectItem value="vitality">Vitality Health</SelectItem>
                    <SelectItem value="aviva">Aviva Health</SelectItem>
                    <SelectItem value="simply">Simply Health</SelectItem>
                    <SelectItem value="wpa">WPA</SelectItem>
                    <SelectItem value="benenden">Benenden Health</SelectItem>
                    <SelectItem value="healix">Healix Health Services</SelectItem>
                    <SelectItem value="sovereign">Sovereign Health Care</SelectItem>
                    <SelectItem value="exeter">Exeter Friendly Society</SelectItem>
                    <SelectItem value="selfpay">Self-Pay</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {insuranceProvider && insuranceProvider !== '' && insuranceProvider !== 'none' && (
                <div>
                  <Label htmlFor="nhs-number">NHS Number</Label>
                  <Input 
                    id="nhs-number" 
                    placeholder="123 456 7890 (10 digits)" 
                    value={nhsNumber}
                    onChange={(e) => {
                      const value = e.target.value;
                      setNhsNumber(value);
                      const digitsOnly = value.replace(/\s+/g, '');
                      if (digitsOnly.length > 0 && digitsOnly.length !== 10) {
                        setNhsNumberError("NHS number must be exactly 10 digits");
                      } else if (digitsOnly.length > 0 && !/^\d+$/.test(digitsOnly)) {
                        setNhsNumberError("NHS number must contain only digits");
                      } else {
                        setNhsNumberError("");
                      }
                    }}
                    maxLength={12}
                  />
                  {nhsNumberError && (
                    <p className="text-sm text-red-600 mt-1">{nhsNumberError}</p>
                  )}
                </div>
              )}
              
              <div>
                <Label htmlFor="total">Total Amount</Label>
                <Input 
                  id="total" 
                  placeholder="Enter amount (e.g., 150.00)" 
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                />
                {totalAmountError && (
                  <p className="text-sm text-red-600 mt-1">{totalAmountError}</p>
                )}
              </div>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center gap-2">
                <Label className="font-semibold">Invoice Type:</Label>
                <Badge 
                  className={
                    insuranceProvider && insuranceProvider !== '' && insuranceProvider !== 'none' 
                      ? "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400" 
                      : "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                  }
                >
                  {insuranceProvider && insuranceProvider !== '' && insuranceProvider !== 'none' 
                    ? "Insurance Claim" 
                    : "Payment (Self-Pay)"}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {insuranceProvider && insuranceProvider !== '' && insuranceProvider !== 'none' 
                  ? "This invoice will be billed to the insurance provider" 
                  : "This invoice will be paid directly by the patient"}
              </p>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea 
                id="notes" 
                placeholder="Additional notes or instructions..."
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowNewInvoice(false)}>
              Cancel
            </Button>
            <Button onClick={async () => {
              console.log('Creating new invoice...');
              
              // Clear previous validation errors
              setPatientError("");
              setServiceError("");
              setTotalAmountError("");
              setNhsNumberError("");
              
              let hasValidationError = false;
              
              // Validate patient selection
              if (!selectedPatient || selectedPatient === '' || selectedPatient === 'loading' || selectedPatient === 'no-patients') {
                setPatientError('Please select a patient');
                hasValidationError = true;
              }
              
              // Validate service data - ALL fields are required per backend validation
              if (!firstServiceCode.trim()) {
                setServiceError('Please enter a service code');
                hasValidationError = true;
              } else if (!firstServiceDesc.trim()) {
                setServiceError('Please enter a service description');
                hasValidationError = true;
              } else if (!firstServiceQty.trim() || isNaN(parseInt(firstServiceQty)) || parseInt(firstServiceQty) <= 0) {
                setServiceError('Please enter a valid service quantity');
                hasValidationError = true;
              } else if (!firstServiceAmount.trim() || isNaN(parseFloat(firstServiceAmount)) || parseFloat(firstServiceAmount) <= 0) {
                setServiceError('Please enter a valid service amount');
                hasValidationError = true;
              }
              
              // Validate total amount
              const total = parseFloat(totalAmount || '0');
              if (isNaN(total) || total <= 0) {
                setTotalAmountError('Please enter a valid total amount greater than 0');
                hasValidationError = true;
              }
              
              // Validate NHS Number if insurance provider is selected
              if (insuranceProvider && insuranceProvider !== '' && insuranceProvider !== 'none') {
                const digitsOnly = nhsNumber.replace(/\s+/g, '');
                if (!nhsNumber.trim()) {
                  setNhsNumberError('NHS number is required for insurance claims');
                  hasValidationError = true;
                } else if (digitsOnly.length !== 10) {
                  setNhsNumberError('NHS number must be exactly 10 digits');
                  hasValidationError = true;
                } else if (!/^\d+$/.test(digitsOnly)) {
                  setNhsNumberError('NHS number must contain only digits');
                  hasValidationError = true;
                }
              }
              
              // Stop if there are validation errors
              if (hasValidationError) {
                return;
              }
              
              try {
                // Create invoice via API
                const invoiceData = {
                  patientId: selectedPatient,
                  serviceDate,
                  invoiceDate,
                  dueDate,
                  totalAmount,
                  insuranceProvider,
                  nhsNumber: nhsNumber.trim() || undefined,
                  firstServiceCode,
                  firstServiceDesc,
                  firstServiceQty,
                  firstServiceAmount,
                  notes
                };

                const response = await apiRequest('POST', '/api/billing/invoices', invoiceData);
                
                // Check if response is successful
                if (!response.ok) {
                  const errorData = await response.json();
                  throw new Error(errorData.error || 'Failed to create invoice');
                }
                
                const newInvoice = await response.json();
                
                // Close the create invoice dialog
                setShowNewInvoice(false);
                
                // Reset form state
                setSelectedPatient("");
                setServiceDate(new Date().toISOString().split('T')[0]);
                setInvoiceDate(new Date().toISOString().split('T')[0]);
                setDueDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
                setTotalAmount("");
                setInsuranceProvider("");
                setNhsNumber("");
                setFirstServiceCode("");
                setFirstServiceDesc("");
                setFirstServiceQty("");
                setFirstServiceAmount("");
                setNotes("");
                
                // Show success modal
                setCreatedInvoiceNumber(newInvoice.invoiceNumber);
                setShowSuccessModal(true);
                
                // Automatically refresh billing data - invalidate all invoice queries
                queryClient.invalidateQueries({ queryKey: ["/api/billing/invoices"] });
                queryClient.invalidateQueries({ queryKey: ["/api/billing"] });
                queryClient.refetchQueries({ queryKey: ["/api/billing/invoices"] });
                queryClient.refetchQueries({ queryKey: ["/api/billing"] });
              } catch (error) {
                console.error('Invoice creation failed:', error);
                const errorMessage = error instanceof Error ? error.message : 'Failed to create invoice. Please try again.';
                toast({
                  title: "Invoice Creation Failed",
                  description: errorMessage,
                  variant: "destructive"
                });
              }
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
                    <div><strong>Invoice ID:</strong> {selectedInvoice.invoiceNumber || selectedInvoice.id}</div>
                    <div className="flex items-center gap-2">
                      <strong>Status:</strong> 
                      {isEditingStatus ? (
                        <div className="flex items-center gap-2">
                          <Select value={editedStatus} onValueChange={setEditedStatus}>
                            <SelectTrigger className="w-[150px] h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="paid">Paid</SelectItem>
                              <SelectItem value="sent">Sent</SelectItem>
                              <SelectItem value="overdue">Overdue</SelectItem>
                              <SelectItem value="draft">Pending</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button size="sm" onClick={handleUpdateStatus}>Save</Button>
                          <Button size="sm" variant="outline" onClick={() => setIsEditingStatus(false)}>Cancel</Button>
                        </div>
                      ) : (
                        <Badge className={`${selectedInvoice.status === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 
                          selectedInvoice.status === 'overdue' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' : 
                          selectedInvoice.status === 'sent' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' : 
                          'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'}`}>
                          {selectedInvoice.status}
                        </Badge>
                      )}
                    </div>
                    <div><strong>Total Amount:</strong> £{parseFloat(selectedInvoice.totalAmount.toString()).toFixed(2)}</div>
                    <div><strong>Paid Amount:</strong> £{parseFloat(selectedInvoice.paidAmount.toString()).toFixed(2)}</div>
                    <div><strong>Outstanding:</strong> £{(parseFloat(selectedInvoice.totalAmount.toString()) - parseFloat(selectedInvoice.paidAmount.toString())).toFixed(2)}</div>
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
                <div className="text-sm text-gray-600 dark:text-gray-300">
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
                handleDownloadInvoice(selectedInvoice.id.toString());
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
                  <div><strong>Amount:</strong> £{(typeof invoiceToSend.totalAmount === 'string' ? parseFloat(invoiceToSend.totalAmount) : invoiceToSend.totalAmount).toFixed(2)}</div>
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

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="h-16 w-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-500" />
              </div>
            </div>
            <DialogTitle className="text-center text-xl">Invoice Created Successfully!</DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <p className="text-muted-foreground">
              Invoice <span className="font-semibold text-foreground">{createdInvoiceNumber}</span> has been created successfully!
            </p>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button onClick={() => setShowSuccessModal(false)} className="w-full sm:w-auto">
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Download Success Modal */}
      <Dialog open={showDownloadModal} onOpenChange={setShowDownloadModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="h-16 w-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                <Download className="h-10 w-10 text-blue-600 dark:text-blue-500" />
              </div>
            </div>
            <DialogTitle className="text-center text-xl">Invoice Downloaded Successfully!</DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <p className="text-muted-foreground">
              Invoice <span className="font-semibold text-foreground">{downloadedInvoiceNumber}</span> downloaded successfully!
            </p>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button onClick={() => setShowDownloadModal(false)} className="w-full sm:w-auto">
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Invoice</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              Are you sure you want to delete invoice {invoiceToDelete?.id} for {invoiceToDelete?.patientName}?
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteInvoice}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Invoice Success Modal */}
      <Dialog open={showSendSuccessModal} onOpenChange={setShowSendSuccessModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="h-16 w-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                <Send className="h-10 w-10 text-blue-600 dark:text-blue-500" />
              </div>
            </div>
            <DialogTitle className="text-center text-xl">Invoice Sent Successfully!</DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <p className="text-muted-foreground">
              Invoice <span className="font-semibold text-foreground">{sentInvoiceInfo.invoiceNumber}</span> sent to <span className="font-semibold text-foreground">{sentInvoiceInfo.recipient}</span>
            </p>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button onClick={() => setShowSendSuccessModal(false)} className="w-full sm:w-auto">
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Invoice Success Modal */}
      <Dialog open={showDeleteSuccessModal} onOpenChange={setShowDeleteSuccessModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="h-16 w-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-500" />
              </div>
            </div>
            <DialogTitle className="text-center text-xl">Invoice Deleted Successfully!</DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <p className="text-muted-foreground">
              Invoice <span className="font-semibold text-foreground">{deletedInvoiceNumber}</span> has been successfully deleted
            </p>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button onClick={() => setShowDeleteSuccessModal(false)} className="w-full sm:w-auto">
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Update Success Modal */}
      <Dialog open={showStatusUpdateModal} onOpenChange={setShowStatusUpdateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="h-16 w-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-500" />
              </div>
            </div>
            <DialogTitle className="text-center text-xl">Status Updated Successfully!</DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <p className="text-muted-foreground">
              Invoice status updated successfully!
            </p>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button onClick={() => setShowStatusUpdateModal(false)} className="w-full sm:w-auto">
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      {invoiceToPay && (
        <PaymentModal
          invoice={invoiceToPay}
          open={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setInvoiceToPay(null);
          }}
          onSuccess={() => {
            setShowPaymentModal(false);
            setInvoiceToPay(null);
            queryClient.invalidateQueries({ queryKey: ["/api/billing/invoices"] });
            queryClient.refetchQueries({ queryKey: ["/api/billing/invoices"] });
          }}
        />
      )}
    </>
  );
}

// Payment Modal Component with Stripe
function PaymentModal({ invoice, open, onClose, onSuccess }: {
  invoice: Invoice;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pay Invoice {invoice.patientId}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Patient:</span>
              <span className="font-medium">{invoice.patientName}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Amount:</span>
              <span className="font-bold text-lg">${typeof invoice.totalAmount === 'string' ? parseFloat(invoice.totalAmount).toFixed(2) : invoice.totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Due Date:</span>
              <span className="text-sm">{format(new Date(invoice.dueDate), 'MMM dd, yyyy')}</span>
            </div>
          </div>

          <StripePaymentForm invoice={invoice} onSuccess={onSuccess} onCancel={onClose} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Initialize Stripe only if public key is available
const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY 
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
  : null;

// Stripe Payment Form Component
function StripePaymentForm({ invoice, onSuccess, onCancel }: {
  invoice: Invoice;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Create payment intent when component mounts
  useEffect(() => {
    const createPaymentIntent = async () => {
      try {
        setLoading(true);
        const res = await apiRequest('POST', '/api/billing/create-payment-intent', {
          invoiceId: invoice.id
        });
        
        // Ensure response is JSON
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Invalid response format from server');
        }
        
        const data = await res.json();
        
        if (data?.clientSecret) {
          setClientSecret(data.clientSecret);
        } else if (data?.error) {
          setError(data.error);
          toast({
            title: "Payment Error",
            description: data.error,
            variant: "destructive"
          });
        } else {
          setError('Failed to initialize payment');
          toast({
            title: "Payment Error",
            description: "Failed to initialize payment. Please try again.",
            variant: "destructive"
          });
        }
      } catch (err: any) {
        console.error('Error creating payment intent:', err);
        
        // Extract user-friendly error message
        let errorMessage = 'Failed to initialize payment. Please try again.';
        
        if (err?.message) {
          // Check if error message is JSON string
          try {
            const parsed = JSON.parse(err.message);
            if (parsed?.error) {
              errorMessage = parsed.error;
            } else {
              errorMessage = err.message;
            }
          } catch {
            // Not JSON, use message as is
            errorMessage = err.message;
          }
        } else if (typeof err === 'string') {
          errorMessage = err;
        }
        
        // Make error messages more user-friendly
        if (errorMessage.includes('stripe is not defined')) {
          errorMessage = 'Payment system is not configured. Please contact support.';
        } else if (errorMessage.includes('STRIPE_SECRET_KEY')) {
          errorMessage = 'Payment system is not configured. Please contact support.';
        } else if (errorMessage.includes('500')) {
          errorMessage = 'Server error occurred. Please try again or contact support.';
        }
        
        setError(errorMessage);
        toast({
          title: "Payment Error",
          description: errorMessage,
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    createPaymentIntent();
  }, [invoice.id, invoice.totalAmount, toast]);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bluewave mx-auto mb-4"></div>
        <p className="text-sm text-gray-600 dark:text-gray-400">Initializing payment...</p>
      </div>
    );
  }

  if (error || !clientSecret) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-sm text-red-600 dark:text-red-400">{error || 'Failed to initialize payment'}</p>
        <Button variant="outline" onClick={onCancel} className="mt-4">Close</Button>
      </div>
    );
  }

  if (!stripePromise) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <p className="text-sm text-gray-600 dark:text-gray-400">Payment processing is not configured. Please contact support.</p>
        <Button variant="outline" onClick={onCancel} className="mt-4">Close</Button>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <PaymentForm invoice={invoice} onSuccess={onSuccess} onCancel={onCancel} />
    </Elements>
  );
}

// Payment Form Component (inside Elements)
function PaymentForm({ invoice, onSuccess, onCancel }: {
  invoice: Invoice;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message || "An error occurred during payment",
          variant: "destructive"
        });
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Process the payment on our backend
        const res = await apiRequest('POST', '/api/billing/process-payment', {
          invoiceId: invoice.id,
          paymentIntentId: paymentIntent.id
        });

        // Ensure response is JSON
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Invalid response format from server');
        }

        const result = await res.json();
        
        if (result.success) {
          toast({
            title: "Payment Successful",
            description: "Your payment has been processed successfully!",
          });
          
          onSuccess();
        } else {
          const errorMessage = result.error || 'Payment processing failed';
          toast({
            title: "Payment Failed",
            description: errorMessage,
            variant: "destructive"
          });
          throw new Error(errorMessage);
        }
      }
    } catch (err) {
      console.error('Payment error:', err);
      toast({
        title: "Payment Failed",
        description: "An error occurred while processing your payment",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <PaymentElement />
      </div>
      
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-1 bg-black hover:bg-black/90 text-white"
        >
          {isProcessing ? 'Processing...' : `Pay $${typeof invoice.totalAmount === 'string' ? parseFloat(invoice.totalAmount).toFixed(2) : invoice.totalAmount.toFixed(2)}`}
        </Button>
      </div>
    </form>
  );
}