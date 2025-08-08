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
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
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
                    <img src="data:image/png;base64,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" alt="Cura Logo" style="width: 100%; height: 100%; object-fit: contain;" />
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
                body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
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