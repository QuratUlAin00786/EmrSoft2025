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
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { saasApiRequest } from '@/lib/saasQueryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, 
  Building2, 
  Plus, 
  Edit, 
  Eye,
  Users,
  Calendar,
  CreditCard,
  Settings
} from 'lucide-react';

export default function SaaSCustomers() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all organizations/customers
  const { data: customers, isLoading } = useQuery({
    queryKey: ['/api/saas/customers', searchTerm, selectedStatus],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ organizationId, status }: { organizationId: number; status: string }) => {
      const response = await apiRequest('PATCH', '/api/saas/customers/status', { organizationId, status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saas/customers'] });
      toast({
        title: "Customer Status Updated",
        description: "Customer status changed successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update customer status",
        variant: "destructive",
      });
    },
  });

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'trial': return 'bg-blue-100 text-blue-800';
      case 'suspended': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              <span>Customer Management</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">
                {customers?.length || 0} Total Customers
              </Badge>
              <Button size="sm" className="flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Add Customer</span>
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
                placeholder="Search customers by name, domain, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="trial">Trial</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Customers Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Subdomain</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers?.map((customer: any) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{customer.name}</div>
                        <div className="text-sm text-gray-500">{customer.brandName}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                        {customer.subdomain}.cura.local
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span>{customer.userCount || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeColor(customer.subscriptionStatus)}>
                        {customer.subscriptionStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {customer.packageName || 'No Package'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(customer.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Settings className="h-4 w-4" />
                        </Button>
                        <select
                          value={customer.subscriptionStatus}
                          onChange={(e) => updateStatusMutation.mutate({
                            organizationId: customer.id,
                            status: e.target.value
                          })}
                          className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          disabled={updateStatusMutation.isPending}
                        >
                          <option value="trial">Trial</option>
                          <option value="active">Active</option>
                          <option value="suspended">Suspended</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {customers?.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No customers found matching your criteria
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}