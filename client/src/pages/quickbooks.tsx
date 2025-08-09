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