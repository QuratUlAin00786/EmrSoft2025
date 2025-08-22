import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { 
  Calculator, 
  FileText, 
  CreditCard, 
  TrendingUp, 
  Download, 
  Upload,
  DollarSign,
  Calendar,
  Users,
  Building,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Loader2
} from "lucide-react";

export default function QuickBooks() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  
  const accountingSummary = {
    totalRevenue: 125487.50,
    totalExpenses: 67234.25,
    netIncome: 58253.25,
    outstandingInvoices: 15750.00,
    lastSync: "2025-08-08 10:30 AM"
  };

  const recentTransactions = [
    {
      id: 1,
      date: "2025-08-08",
      description: "Patient Payment - John Doe",
      amount: 150.00,
      type: "income",
      category: "Medical Services"
    },
    {
      id: 2,
      date: "2025-08-07",
      description: "Medical Supplies Order",
      amount: -450.75,
      type: "expense",
      category: "Supplies"
    },
    {
      id: 3,
      date: "2025-08-07",
      description: "Insurance Reimbursement",
      amount: 2150.00,
      type: "income",
      category: "Insurance"
    },
    {
      id: 4,
      date: "2025-08-06",
      description: "Equipment Maintenance",
      amount: -275.00,
      type: "expense",
      category: "Maintenance"
    }
  ];

  // Handler functions for Quick Actions
  const handleCreateInvoice = async () => {
    setIsLoading("create-invoice");
    try {
      // Generate invoice data
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const invoiceNumber = `INV-${Date.now()}`;
      const invoiceData = {
        invoiceNumber,
        date: new Date().toLocaleDateString(),
        patientName: "John Doe",
        services: [
          { description: "General Consultation", quantity: 1, rate: 150.00, amount: 150.00 },
          { description: "Blood Test", quantity: 1, rate: 75.00, amount: 75.00 },
        ],
        subtotal: 225.00,
        tax: 22.50,
        total: 247.50
      };

      // Create professional HTML invoice
      const invoiceHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice ${invoiceData.invoiceNumber} - Cura Medical Practice</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
 
            background: #f8f9fa; 
            padding: 20px; 
            color: #333;
        }
        .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            color: white;
            padding: 40px;
            position: relative;
        }
        .logo-section {
            display: flex;
            align-items: center;
            margin-bottom: 20px;
        }
        .logo {
            width: 60px;
            height: 60px;
            background: white;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 20px;
            padding: 8px;
        }
        .logo img {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }
        .company-info {
            flex: 1;
        }
        .company-name {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .company-tagline {
            font-size: 14px;
            opacity: 0.9;
        }
        .invoice-title {
            font-size: 36px;
            font-weight: bold;
            text-align: right;
            margin-top: -60px;
        }
        .content {
            padding: 40px;
        }
        .invoice-meta {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-bottom: 40px;
        }
        .bill-to, .invoice-details {
            background: #f8f9fa;
            padding: 25px;
            border-radius: 8px;
        }
        .section-title {
            font-size: 14px;
            font-weight: bold;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 15px;
        }
        .patient-name {
            font-size: 20px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 5px;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 14px;
        }
        .detail-label {
            color: #6b7280;
            font-weight: 500;
        }
        .detail-value {
            font-weight: 600;
            color: #111827;
        }
        .services-table {
            width: 100%;
            border-collapse: collapse;
            margin: 30px 0;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        .services-table th {
            background: #2563eb;
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: 600;
            font-size: 14px;
        }
        .services-table td {
            padding: 15px;
            border-bottom: 1px solid #e5e7eb;
        }
        .services-table tr:hover {
            background: #f9fafb;
        }
        .amount-col {
            text-align: right;
            font-weight: 600;
        }
        .totals-section {
            margin-top: 30px;
            border-top: 2px solid #e5e7eb;
            padding-top: 20px;
        }
        .totals-grid {
            display: grid;
            grid-template-columns: 1fr 200px;
            gap: 20px;
        }
        .totals-table {
            margin-left: auto;
        }
        .total-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            font-size: 16px;
        }
        .total-row.final {
            border-top: 2px solid #2563eb;
            margin-top: 10px;
            padding-top: 15px;
            font-weight: bold;
            font-size: 20px;
            color: #2563eb;
        }
        .footer {
            background: #f8f9fa;
            padding: 30px 40px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        .thank-you {
            font-size: 18px;
            font-weight: 600;
            color: #2563eb;
            margin-bottom: 10px;
        }
        .contact-info {
            font-size: 14px;
            color: #6b7280;
            line-height: 1.6;
        }
        .payment-info {
            background: #dbeafe;
            border: 1px solid #bfdbfe;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
        }
        .payment-title {
            font-weight: 600;
            color: #1e40af;
            margin-bottom: 10px;
        }
        @media print {
            body { background: white; padding: 0; }
            .invoice-container { box-shadow: none; border-radius: 0; }
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <div class="header">
            <div class="logo-section">
                <div class="logo">
                    <img src="data:image/png;base64,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" alt="Cura Logo" style="width: 80px; height: 80px; object-fit: contain;" />
                </div>
                <div class="company-info">
                    <div class="company-name">Cura Medical Practice</div>
                    <div class="company-tagline">Excellence in Healthcare • Powered by Halo Group</div>
                </div>
            </div>
            <div class="invoice-title">INVOICE</div>
        </div>
        
        <div class="content">
            <div class="invoice-meta">
                <div class="bill-to">
                    <div class="section-title">Bill To</div>
                    <div class="patient-name">${invoiceData.patientName}</div>
                    <div style="color: #6b7280; font-size: 14px;">Patient ID: PAT-${Math.floor(Math.random() * 10000)}</div>
                </div>
                
                <div class="invoice-details">
                    <div class="section-title">Invoice Details</div>
                    <div class="detail-row">
                        <span class="detail-label">Invoice Number:</span>
                        <span class="detail-value">${invoiceData.invoiceNumber}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Invoice Date:</span>
                        <span class="detail-value">${invoiceData.date}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Due Date:</span>
                        <span class="detail-value">${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Payment Terms:</span>
                        <span class="detail-value">Net 30</span>
                    </div>
                </div>
            </div>

            <div class="payment-info">
                <div class="payment-title">Payment Information</div>
                <div style="font-size: 14px; color: #374151;">
                    Multiple payment options available: Credit Card, Bank Transfer, PayPal, or Cash
                </div>
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
                    ${invoiceData.services.map(service => `
                    <tr>
                        <td>
                            <div style="font-weight: 600; margin-bottom: 4px;">${service.description}</div>
                            <div style="font-size: 12px; color: #6b7280;">Professional medical consultation</div>
                        </td>
                        <td style="text-align: center;">${service.quantity}</td>
                        <td class="amount-col">$${service.rate.toFixed(2)}</td>
                        <td class="amount-col">$${service.amount.toFixed(2)}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="totals-section">
                <div class="totals-grid">
                    <div style="color: #6b7280; font-style: italic;">
                        All services provided in accordance with medical standards and regulations.
                    </div>
                    <div class="totals-table">
                        <div class="total-row">
                            <span>Subtotal:</span>
                            <span>$${invoiceData.subtotal.toFixed(2)}</span>
                        </div>
                        <div class="total-row">
                            <span>Tax (10%):</span>
                            <span>$${invoiceData.tax.toFixed(2)}</span>
                        </div>
                        <div class="total-row final">
                            <span>Total Amount:</span>
                            <span>$${invoiceData.total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="footer">
            <div class="thank-you">Thank You for Choosing Cura Medical Practice!</div>
            <div class="contact-info">
                🏥 Advanced Healthcare Solutions | 📞 +1 (555) 123-4567 | 📧 billing@cura.com<br>
                🌐 www.cura.com | 📍 123 Medical Center Drive, Healthcare City, HC 12345<br>
                <br>
                <strong>Cura by Halo Group</strong> - Excellence in Healthcare Technology
            </div>
        </div>
    </div>

    <script>
        // Auto-print functionality
        setTimeout(() => {
            if (confirm('Would you like to print this invoice?')) {
                window.print();
            }
        }, 500);
    </script>
</body>
</html>
      `;

      // Create and download the HTML invoice
      const blob = new Blob([invoiceHTML], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoiceNumber}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Also open the invoice in a new window for immediate viewing
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(invoiceHTML);
        newWindow.document.close();
      }

      toast({
        title: "Invoice Created & Downloaded",
        description: `Invoice ${invoiceNumber} for $${invoiceData.total} has been generated and downloaded.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create invoice. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(null);
    }
  };

  const handleImportTransactions = async () => {
    setIsLoading("import-transactions");
    try {
      // Create a file input to simulate file import
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.csv,.txt';
      
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          // Simulate processing the file
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Show success with file name
          toast({
            title: "Transactions Imported",
            description: `Successfully imported "${file.name}". 15 new transactions added to your records.`,
          });
        } else {
          toast({
            title: "No File Selected",
            description: "Please select a CSV or TXT file to import.",
            variant: "destructive",
          });
        }
        setIsLoading(null);
      };
      
      input.oncancel = () => {
        setIsLoading(null);
      };
      
      input.click();
    } catch (error) {
      toast({
        title: "Import Failed",
        description: "Failed to import transactions. Please check your file format.",
        variant: "destructive",
      });
      setIsLoading(null);
    }
  };

  const handleExportReports = async () => {
    setIsLoading("export-reports");
    try {
      // Simulate report generation and download
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      // Create and download a sample CSV file
      const csvContent = `Date,Description,Amount,Category,Type
2025-08-08,Patient Payment - John Doe,150.00,Medical Services,Income
2025-08-07,Medical Supplies Order,-450.75,Supplies,Expense
2025-08-07,Insurance Reimbursement,2150.00,Insurance,Income
2025-08-06,Equipment Maintenance,-275.00,Maintenance,Expense`;
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financial-report-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Report Exported",
        description: "Financial report has been downloaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export reports. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(null);
    }
  };

  const handleTaxCalculator = async () => {
    setIsLoading("tax-calculator");
    try {
      // Simulate tax calculation
      await new Promise(resolve => setTimeout(resolve, 1500));
      const taxAmount = (accountingSummary.netIncome * 0.25).toFixed(2);
      toast({
        title: "Tax Calculation Complete",
        description: `Estimated quarterly tax: $${taxAmount} (25% of net income)`,
      });
    } catch (error) {
      toast({
        title: "Calculation Failed",
        description: "Failed to calculate taxes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(null);
    }
  };

  const handleManagePayments = async () => {
    setIsLoading("manage-payments");
    try {
      // Simulate payment processing setup
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Open a payment management modal/window simulation
      const paymentWindow = window.open('', '_blank', 'width=800,height=600');
      if (paymentWindow) {
        paymentWindow.document.write(`
          <html>
            <head>
              <title>Cura Payment Management Center</title>
              <style>
                body { padding: 20px; background: #f5f5f5; }
                .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .header { text-align: center; color: #2563eb; margin-bottom: 30px; }
                .payment-option { padding: 15px; border: 1px solid #ddd; margin: 10px 0; border-radius: 5px; cursor: pointer; }
                .payment-option:hover { background: #f0f0f0; }
                .status { background: #d4edda; color: #155724; padding: 10px; border-radius: 5px; margin: 20px 0; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h2>Cura Payment Management Center</h2>
                  <p>Process patient payments and manage billing</p>
                </div>
                
                <div class="status">
                  ✅ Payment system connected and ready
                </div>
                
                <h3>Payment Options:</h3>
                <div class="payment-option">
                  💳 Credit Card Payments - Accept Visa, MasterCard, Amex
                </div>
                <div class="payment-option">
                  🏦 Bank Transfer - Direct bank account payments
                </div>
                <div class="payment-option">
                  📱 Digital Wallets - Apple Pay, Google Pay, PayPal
                </div>
                <div class="payment-option">
                  💰 Cash Payments - Record cash transactions
                </div>
                
                <h3>Recent Payment Activity:</h3>
                <p>• John Doe - $150.00 (Consultation) - Paid</p>
                <p>• Sarah Smith - $225.00 (Lab Tests) - Pending</p>
                <p>• Mike Johnson - $75.00 (Follow-up) - Paid</p>
                
                <p style="text-align: center; margin-top: 30px;">
                  <button onclick="window.close()" style="padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 5px; cursor: pointer;">Close</button>
                </p>
              </div>
            </body>
          </html>
        `);
      }
      
      toast({
        title: "Payment Center Opened",
        description: "Payment management interface is now ready for processing payments.",
      });
    } catch (error) {
      toast({
        title: "Access Failed",
        description: "Failed to access payment management. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(null);
    }
  };

  const handleSyncQuickBooks = async () => {
    setIsLoading("sync-quickbooks");
    try {
      // Simulate QuickBooks sync
      await new Promise(resolve => setTimeout(resolve, 4000));
      toast({
        title: "Sync Complete",
        description: "Successfully synchronized with QuickBooks Online. 8 new transactions synced.",
      });
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: "Failed to sync with QuickBooks. Please check your connection.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(null);
    }
  };

  const quickActions = [
    { 
      icon: FileText, 
      label: "Create Invoice", 
      description: "Generate new patient invoice",
      handler: handleCreateInvoice,
      loadingKey: "create-invoice"
    },
    { 
      icon: Upload, 
      label: "Import Transactions", 
      description: "Import bank statements",
      handler: handleImportTransactions,
      loadingKey: "import-transactions"
    },
    { 
      icon: Download, 
      label: "Export Reports", 
      description: "Download financial reports",
      handler: handleExportReports,
      loadingKey: "export-reports"
    },
    { 
      icon: Calculator, 
      label: "Tax Calculator", 
      description: "Calculate tax obligations",
      handler: handleTaxCalculator,
      loadingKey: "tax-calculator"
    },
    { 
      icon: CreditCard, 
      label: "Manage Payments", 
      description: "Process patient payments",
      handler: handleManagePayments,
      loadingKey: "manage-payments"
    },
    { 
      icon: RefreshCw, 
      label: "Sync QuickBooks", 
      description: "Synchronize with QuickBooks Online",
      handler: handleSyncQuickBooks,
      loadingKey: "sync-quickbooks"
    }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            QuickBooks Integration
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage your medical practice finances and accounting
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            Connected
          </Badge>
          <Button 
            size="sm" 
            variant="outline"
            onClick={handleSyncQuickBooks}
            disabled={isLoading === "sync-quickbooks"}
          >
            {isLoading === "sync-quickbooks" ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Sync Now
          </Button>
        </div>
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-green-600">
                ${accountingSummary.totalRevenue.toLocaleString()}
              </div>
              <ArrowUpRight className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-sm text-gray-500 mt-1">+12.5% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-red-600">
                ${accountingSummary.totalExpenses.toLocaleString()}
              </div>
              <ArrowDownRight className="h-5 w-5 text-red-600" />
            </div>
            <p className="text-sm text-gray-500 mt-1">+5.2% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Net Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-blue-600">
                ${accountingSummary.netIncome.toLocaleString()}
              </div>
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-sm text-gray-500 mt-1">+18.3% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Outstanding Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-orange-600">
                ${accountingSummary.outstandingInvoices.toLocaleString()}
              </div>
              <FileText className="h-5 w-5 text-orange-600" />
            </div>
            <p className="text-sm text-gray-500 mt-1">12 pending invoices</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Recent Transactions
            </CardTitle>
            <CardDescription>
              Latest financial activities synced from QuickBooks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {transaction.description}
                      </p>
                      <Badge 
                        variant="outline" 
                        className={transaction.type === 'income' ? 'text-green-700 border-green-200' : 'text-red-700 border-red-200'}
                      >
                        {transaction.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500">
                      {new Date(transaction.date).toLocaleDateString()} 
                    </p>
                  </div>
                  <div className={`text-lg font-semibold ${
                    transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.type === 'income' ? '+' : ''}${Math.abs(transaction.amount).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
            <Separator className="my-4" />
            <Button variant="outline" className="w-full">
              <FileText className="h-4 w-4 mr-2" />
              View All Transactions
            </Button>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Common accounting tasks and operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {quickActions.map((action, index) => (
                <Button 
                  key={index}
                  variant="outline" 
                  className="w-full justify-start h-auto p-3"
                  onClick={action.handler}
                  disabled={isLoading === action.loadingKey}
                >
                  {isLoading === action.loadingKey ? (
                    <Loader2 className="h-4 w-4 mr-3 flex-shrink-0 animate-spin" />
                  ) : (
                    <action.icon className="h-4 w-4 mr-3 flex-shrink-0" />
                  )}
                  <div className="text-left">
                    <div className="font-medium">{action.label}</div>
                    <div className="text-sm text-gray-500">{action.description}</div>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* QuickBooks Sync Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            QuickBooks Integration Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <RefreshCw className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium">Last Sync</p>
                <p className="text-sm text-gray-500">{accountingSummary.lastSync}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">Connected Users</p>
                <p className="text-sm text-gray-500">3 authorized users</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium">Sync Frequency</p>
                <p className="text-sm text-gray-500">Every 15 minutes</p>
              </div>
            </div>
          </div>
          
          <Separator className="my-4" />
          
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Connected to QuickBooks Online • Company: Cura Medical Practice
            </div>
            <Button variant="outline" size="sm">
              Manage Connection
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}