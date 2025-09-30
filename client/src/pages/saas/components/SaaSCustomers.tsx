import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Settings,
  Trash2
} from 'lucide-react';

export default function SaaSCustomers() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    brandName: '',
    subdomain: '',
    adminEmail: '',
    adminFirstName: '',
    adminLastName: '',
    accessLevel: 'full', // full, limited
    billingPackageId: '',
    features: {
      maxUsers: 10,
      maxPatients: 100,
      aiEnabled: true,
      telemedicineEnabled: true,
      billingEnabled: true,
      analyticsEnabled: true,
    }
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all organizations/customers
  const { data: customers, isLoading } = useQuery({
    queryKey: ['/api/saas/customers', searchTerm, selectedStatus],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedStatus && selectedStatus !== 'all') params.append('status', selectedStatus);
      
      const response = await saasApiRequest('GET', `/api/saas/customers?${params.toString()}`);
      return response.json();
    },
  });

  // Fetch available billing packages
  const { data: billingPackages } = useQuery({
    queryKey: ['/api/saas/packages'],
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (customerData: any) => {
      const response = await saasApiRequest('POST', '/api/saas/customers', customerData);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/saas/customers'] });
      setIsAddDialogOpen(false);
      // Clear search filter to show new customer
      setSearchTerm('');
      setSelectedStatus('all');
      setNewCustomer({
        name: '', brandName: '', subdomain: '', adminEmail: '', 
        adminFirstName: '', adminLastName: '', accessLevel: 'full', billingPackageId: '',
        features: {
          maxUsers: 10, maxPatients: 100, aiEnabled: true, 
          telemedicineEnabled: true, billingEnabled: true, analyticsEnabled: true
        }
      });
      // Show success modal
      setIsSuccessModalOpen(true);
    },
    onError: (error: any) => {
      const errMsg = error.message || "Failed to create customer";
      setErrorMessage(errMsg);
      setIsErrorModalOpen(true);
    },
  });

  const updateCustomerMutation = useMutation({
    mutationFn: async (customerData: any) => {
      const response = await saasApiRequest('PATCH', `/api/saas/customers/${customerData.id}`, customerData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saas/customers'] });
      setEditingCustomer(null);
      toast({
        title: "Customer Updated",
        description: "Customer information updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update customer",
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ organizationId, status }: { organizationId: number; status: string }) => {
      console.log('Status mutation called with:', { organizationId, status });
      const response = await saasApiRequest('PATCH', '/api/saas/customers/status', { organizationId, status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saas/customers'] });
      toast({
        title: "Customer Status Updated",
        description: "Customer status changed successfully",
      });
    },
    onError: (error: any) => {
      console.error('Status update error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update customer status",
        variant: "destructive",
      });
    },
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: async (customerId: number) => {
      const response = await saasApiRequest('DELETE', `/api/saas/customers/${customerId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saas/customers'] });
      toast({
        title: "Customer Deleted",
        description: "Customer and all associated data have been permanently deleted",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete customer",
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
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="flex items-center space-x-2">
                    <Plus className="h-4 w-4" />
                    <span>Add Customer</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Customer Organization</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6">
                    {/* Organization Details */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-sm text-gray-700">Organization Details</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="name">Organization Name *</Label>
                          <Input 
                            id="name" 
                            placeholder="e.g., Metro Medical Center" 
                            value={newCustomer.name}
                            onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="brandName">Brand Name</Label>
                          <Input 
                            id="brandName" 
                            placeholder="e.g., Metro Health" 
                            value={newCustomer.brandName}
                            onChange={(e) => setNewCustomer({...newCustomer, brandName: e.target.value})}
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="subdomain">Subdomain *</Label>
                        <Input 
                          id="subdomain" 
                          placeholder="e.g., metro-medical" 
                          value={newCustomer.subdomain}
                          onChange={(e) => setNewCustomer({...newCustomer, subdomain: e.target.value})}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Will be: {newCustomer.subdomain || 'subdomain'}.cura.local
                        </p>
                        <p className="text-xs text-amber-600 mt-1">
                          Note: Subdomain must be unique across all customers
                        </p>
                      </div>
                      
                      <div>
                        <Label>Billing Package</Label>
                        <select 
                          className="w-full px-3 py-2 border rounded"
                          value={newCustomer.billingPackageId}
                          onChange={(e) => setNewCustomer({...newCustomer, billingPackageId: e.target.value})}
                        >
                          <option value="">Select a billing package (optional)</option>
                          {Array.isArray(billingPackages) && billingPackages.map((pkg: any) => (
                            <option key={pkg.id} value={pkg.id}>
                              {pkg.name} - £{pkg.price}/{pkg.billingCycle}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                          Leave empty for trial customers or manual billing setup
                        </p>
                      </div>
                    </div>

                    {/* Admin User Details */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-sm text-gray-700">Administrator Account</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="adminFirstName">First Name *</Label>
                          <Input 
                            id="adminFirstName" 
                            placeholder="John" 
                            value={newCustomer.adminFirstName}
                            onChange={(e) => setNewCustomer({...newCustomer, adminFirstName: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="adminLastName">Last Name *</Label>
                          <Input 
                            id="adminLastName" 
                            placeholder="Smith" 
                            value={newCustomer.adminLastName}
                            onChange={(e) => setNewCustomer({...newCustomer, adminLastName: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="adminEmail">Email *</Label>
                          <Input 
                            id="adminEmail" 
                            type="email" 
                            placeholder="admin@example.com" 
                            value={newCustomer.adminEmail}
                            onChange={(e) => setNewCustomer({...newCustomer, adminEmail: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Access Level */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-sm text-gray-700">Access Level</h3>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <input 
                            type="radio" 
                            id="full-access" 
                            name="accessLevel"
                            checked={newCustomer.accessLevel === 'full'}
                            onChange={() => setNewCustomer({...newCustomer, accessLevel: 'full'})}
                          />
                          <Label htmlFor="full-access" className="cursor-pointer">
                            <span className="font-medium">Full Access</span> - Complete access to all EMR features
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input 
                            type="radio" 
                            id="limited-access" 
                            name="accessLevel"
                            checked={newCustomer.accessLevel === 'limited'}
                            onChange={() => setNewCustomer({...newCustomer, accessLevel: 'limited'})}
                          />
                          <Label htmlFor="limited-access" className="cursor-pointer">
                            <span className="font-medium">Limited Access</span> - Restricted feature set with custom controls
                          </Label>
                        </div>
                      </div>
                    </div>

                    {/* Feature Controls */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-sm text-gray-700">Feature Configuration</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="maxUsers">Maximum Users</Label>
                          <Input 
                            id="maxUsers" 
                            type="number" 
                            min="1"
                            value={newCustomer.features.maxUsers}
                            onChange={(e) => setNewCustomer({
                              ...newCustomer, 
                              features: {...newCustomer.features, maxUsers: parseInt(e.target.value) || 1}
                            })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="maxPatients">Maximum Patients</Label>
                          <Input 
                            id="maxPatients" 
                            type="number" 
                            min="1"
                            value={newCustomer.features.maxPatients}
                            onChange={(e) => setNewCustomer({
                              ...newCustomer, 
                              features: {...newCustomer.features, maxPatients: parseInt(e.target.value) || 1}
                            })}
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="aiEnabled">AI Features</Label>
                          <input 
                            type="checkbox" 
                            id="aiEnabled"
                            checked={newCustomer.features.aiEnabled}
                            onChange={(e) => setNewCustomer({
                              ...newCustomer, 
                              features: {...newCustomer.features, aiEnabled: e.target.checked}
                            })}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="telemedicineEnabled">Telemedicine</Label>
                          <input 
                            type="checkbox" 
                            id="telemedicineEnabled"
                            checked={newCustomer.features.telemedicineEnabled}
                            onChange={(e) => setNewCustomer({
                              ...newCustomer, 
                              features: {...newCustomer.features, telemedicineEnabled: e.target.checked}
                            })}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="billingEnabled">Billing Module</Label>
                          <input 
                            type="checkbox" 
                            id="billingEnabled"
                            checked={newCustomer.features.billingEnabled}
                            onChange={(e) => setNewCustomer({
                              ...newCustomer, 
                              features: {...newCustomer.features, billingEnabled: e.target.checked}
                            })}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="analyticsEnabled">Analytics & Reports</Label>
                          <input 
                            type="checkbox" 
                            id="analyticsEnabled"
                            checked={newCustomer.features.analyticsEnabled}
                            onChange={(e) => setNewCustomer({
                              ...newCustomer, 
                              features: {...newCustomer.features, analyticsEnabled: e.target.checked}
                            })}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsAddDialogOpen(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={() => createCustomerMutation.mutate(newCustomer)}
                        disabled={createCustomerMutation.isPending || !newCustomer.name || !newCustomer.subdomain || !newCustomer.adminEmail || !newCustomer.adminFirstName || !newCustomer.adminLastName}
                        className="flex-1"
                      >
                        {createCustomerMutation.isPending ? 'Creating...' : 'Create Customer'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
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
                className="pl-10 pr-8"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600"
                  style={{ backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}
                >
                  ✕
                </button>
              )}
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
                        {/* View Details Button */}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Customer Details - {customer.name}</DialogTitle>
                            </DialogHeader>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div><strong>Name:</strong> {customer.name}</div>
                              <div><strong>Brand:</strong> {customer.brandName}</div>
                              <div><strong>Subdomain:</strong> {customer.subdomain}</div>
                              <div><strong>Status:</strong> {customer.subscriptionStatus}</div>
                              <div><strong>Users:</strong> {customer.userCount}</div>
                              <div><strong>Created:</strong> {formatDate(customer.createdAt)}</div>
                            </div>
                          </DialogContent>
                        </Dialog>

                        {/* Edit Customer Button */}
                        <Dialog open={editingCustomer?.id === customer.id} onOpenChange={(open) => !open && setEditingCustomer(null)}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" onClick={() => setEditingCustomer({
                              id: customer.id,
                              name: customer.name,
                              brandName: customer.brandName,
                              subdomain: customer.subdomain,
                              subscriptionStatus: customer.subscriptionStatus,
                              billingPackageId: customer.billingPackageId || '',
                              features: customer.features ? (typeof customer.features === 'string' ? JSON.parse(customer.features) : customer.features) : {
                                maxUsers: 10,
                                maxPatients: 100,
                                aiEnabled: true,
                                telemedicineEnabled: true,
                                billingEnabled: true,
                                analyticsEnabled: true,
                              }
                            })}>
                              <Settings className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Edit Customer - {customer.name}</DialogTitle>
                            </DialogHeader>
                            {editingCustomer && (
                              <div className="space-y-6">
                                {/* Basic Information */}
                                <div className="space-y-4">
                                  <h3 className="font-semibold text-sm text-gray-700">Organization Information</h3>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label>Organization Name</Label>
                                      <Input 
                                        value={editingCustomer.name}
                                        onChange={(e) => setEditingCustomer({...editingCustomer, name: e.target.value})}
                                      />
                                    </div>
                                    <div>
                                      <Label>Brand Name</Label>
                                      <Input 
                                        value={editingCustomer.brandName}
                                        onChange={(e) => setEditingCustomer({...editingCustomer, brandName: e.target.value})}
                                      />
                                    </div>
                                  </div>
                                  <div>
                                    <Label>Subdomain</Label>
                                    <Input 
                                      value={editingCustomer.subdomain}
                                      onChange={(e) => setEditingCustomer({...editingCustomer, subdomain: e.target.value})}
                                      disabled
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Subdomain cannot be changed after creation</p>
                                  </div>
                                </div>

                                {/* Subscription Status */}
                                <div className="space-y-4">
                                  <h3 className="font-semibold text-sm text-gray-700">Subscription</h3>
                                  <div>
                                    <Label>Status</Label>
                                    <select 
                                      className="w-full px-3 py-2 border rounded"
                                      value={editingCustomer.subscriptionStatus}
                                      onChange={(e) => setEditingCustomer({...editingCustomer, subscriptionStatus: e.target.value})}
                                    >
                                      <option value="trial">Trial</option>
                                      <option value="active">Active</option>
                                      <option value="suspended">Suspended</option>
                                      <option value="cancelled">Cancelled</option>
                                    </select>
                                  </div>
                                  <div>
                                    <Label>Billing Package</Label>
                                    <select 
                                      className="w-full px-3 py-2 border rounded"
                                      value={editingCustomer.billingPackageId || ''}
                                      onChange={(e) => setEditingCustomer({...editingCustomer, billingPackageId: e.target.value})}
                                    >
                                      <option value="">No Package (Manual Billing)</option>
                                      {Array.isArray(billingPackages) && billingPackages.map((pkg: any) => (
                                        <option key={pkg.id} value={pkg.id}>
                                          {pkg.name} - £{pkg.price}/{pkg.billingCycle}
                                        </option>
                                      ))}
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">
                                      Assign or change billing package for this customer
                                    </p>
                                  </div>
                                </div>

                                {/* Feature Controls */}
                                <div className="space-y-4">
                                  <h3 className="font-semibold text-sm text-gray-700">Feature Configuration</h3>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label>Maximum Users</Label>
                                      <Input 
                                        type="number" 
                                        min="1"
                                        value={editingCustomer.features.maxUsers}
                                        onChange={(e) => setEditingCustomer({
                                          ...editingCustomer, 
                                          features: {...editingCustomer.features, maxUsers: parseInt(e.target.value) || 1}
                                        })}
                                      />
                                    </div>
                                    <div>
                                      <Label>Maximum Patients</Label>
                                      <Input 
                                        type="number" 
                                        min="1"
                                        value={editingCustomer.features.maxPatients}
                                        onChange={(e) => setEditingCustomer({
                                          ...editingCustomer, 
                                          features: {...editingCustomer.features, maxPatients: parseInt(e.target.value) || 1}
                                        })}
                                      />
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center justify-between">
                                      <Label>AI Features</Label>
                                      <input 
                                        type="checkbox" 
                                        checked={editingCustomer.features.aiEnabled}
                                        onChange={(e) => setEditingCustomer({
                                          ...editingCustomer, 
                                          features: {...editingCustomer.features, aiEnabled: e.target.checked}
                                        })}
                                      />
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <Label>Telemedicine</Label>
                                      <input 
                                        type="checkbox" 
                                        checked={editingCustomer.features.telemedicineEnabled}
                                        onChange={(e) => setEditingCustomer({
                                          ...editingCustomer, 
                                          features: {...editingCustomer.features, telemedicineEnabled: e.target.checked}
                                        })}
                                      />
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <Label>Billing Module</Label>
                                      <input 
                                        type="checkbox" 
                                        checked={editingCustomer.features.billingEnabled}
                                        onChange={(e) => setEditingCustomer({
                                          ...editingCustomer, 
                                          features: {...editingCustomer.features, billingEnabled: e.target.checked}
                                        })}
                                      />
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <Label>Analytics & Reports</Label>
                                      <input 
                                        type="checkbox" 
                                        checked={editingCustomer.features.analyticsEnabled}
                                        onChange={(e) => setEditingCustomer({
                                          ...editingCustomer, 
                                          features: {...editingCustomer.features, analyticsEnabled: e.target.checked}
                                        })}
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div className="flex space-x-2">
                                  <Button 
                                    variant="outline" 
                                    onClick={() => setEditingCustomer(null)}
                                    className="flex-1"
                                  >
                                    Cancel
                                  </Button>
                                  <Button 
                                    onClick={() => updateCustomerMutation.mutate(editingCustomer)}
                                    disabled={updateCustomerMutation.isPending}
                                    className="flex-1"
                                  >
                                    {updateCustomerMutation.isPending ? 'Updating...' : 'Update Customer'}
                                  </Button>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>

                        <button
                          type="button"
                          onClick={() => {
                            console.log('🗑️ DELETE button clicked for customer:', customer.id, customer.name);
                            if (window.confirm(`Are you sure you want to delete ${customer.name}? This cannot be undone.`)) {
                              console.log('🗑️ User confirmed deletion, calling API...');
                              deleteCustomerMutation.mutate(customer.id);
                            }
                          }}
                          style={{
                            backgroundColor: '#dc2626',
                            color: '#ffffff',
                            border: '1px solid #dc2626',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            fontSize: '13px',
                            fontWeight: '600',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                            minWidth: '75px',
                            minHeight: '32px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#b91c1c';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#dc2626';
                          }}
                          className="production-delete-btn !bg-red-600 !text-white !border-red-600 hover:!bg-red-700"
                          data-testid="delete-customer-button"
                        >
                          <Trash2 className="h-4 w-4" style={{ width: '16px', height: '16px' }} />
                          DELETE
                        </button>
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

      {/* Success Modal */}
      <Dialog open={isSuccessModalOpen} onOpenChange={setIsSuccessModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Customer Created Successfully</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-center text-gray-700">
              The customer has been created successfully!
            </p>
          </div>
          <div className="flex justify-center">
            <Button onClick={() => setIsSuccessModalOpen(false)}>
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Error Modal */}
      <Dialog open={isErrorModalOpen} onOpenChange={setIsErrorModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Customer Creation Failed</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-center text-gray-700">
              {errorMessage}
            </p>
          </div>
          <div className="flex justify-center">
            <Button onClick={() => setIsErrorModalOpen(false)} variant="destructive">
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}