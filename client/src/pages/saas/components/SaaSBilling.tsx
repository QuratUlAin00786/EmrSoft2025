import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { 
  Search, 
  CreditCard, 
  TrendingUp,
  DollarSign,
  Calendar,
  Download,
  Eye,
  AlertTriangle
} from 'lucide-react';

export default function SaaSBilling() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('30');

  // Fetch billing data
  const { data: billingData, isLoading } = useQuery({
    queryKey: ['/api/saas/billing', searchTerm, dateRange],
  });

  const { data: billingStats } = useQuery({
    queryKey: ['/api/saas/billing/stats', dateRange],
  });

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Billing Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-3xl font-bold text-green-600">
                  {formatCurrency(billingStats?.totalRevenue || 0)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Monthly Recurring</p>
                <p className="text-3xl font-bold text-blue-600">
                  {formatCurrency(billingStats?.monthlyRecurring || 0)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overdue Amount</p>
                <p className="text-3xl font-bold text-red-600">
                  {formatCurrency(billingStats?.overdueAmount || 0)}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Subscriptions</p>
                <p className="text-3xl font-bold text-gray-900">
                  {billingStats?.activeSubscriptions || 0}
                </p>
              </div>
              <CreditCard className="h-8 w-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Billing Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-blue-600" />
              <span>Billing & Invoices</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button size="sm" variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by customer, invoice number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
          </div>

          {/* Billing Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billingData?.invoices?.map((invoice: any) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <div className="font-medium">#{invoice.invoiceNumber}</div>
                      <div className="text-sm text-gray-500">
                        {formatDate(invoice.createdAt)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{invoice.customerName}</div>
                        <div className="text-sm text-gray-500">{invoice.customerEmail}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {invoice.packageName}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(invoice.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeColor(invoice.status)}>
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(invoice.dueDate)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {billingData?.invoices?.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No billing records found for the selected period
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}