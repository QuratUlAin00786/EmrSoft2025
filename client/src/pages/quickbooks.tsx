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
      // Simulate API call to create invoice
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast({
        title: "Invoice Created",
        description: "New patient invoice has been generated successfully.",
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
      // Simulate file import process
      await new Promise(resolve => setTimeout(resolve, 3000));
      toast({
        title: "Transactions Imported",
        description: "Bank statements have been imported successfully. 15 new transactions added.",
      });
    } catch (error) {
      toast({
        title: "Import Failed",
        description: "Failed to import transactions. Please check your file format.",
        variant: "destructive",
      });
    } finally {
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
      toast({
        title: "Payment Center Opened",
        description: "Payment management interface is now ready for processing.",
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