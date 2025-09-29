import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Building2,
  RefreshCw, 
  Settings,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  Users,
  FileText,
  CreditCard,
  DollarSign,
  Calendar,
  Activity,
  TrendingUp,
  Download,
  Upload,
  Link2,
  Unlink,
  Loader2,
  RotateCcw
} from "lucide-react";

// Types
interface QuickBooksConnection {
  id: number;
  organizationId: number;
  companyId: string;
  companyName: string;
  realmId: string;
  isActive: boolean;
  lastSyncAt?: string;
  syncSettings: {
    autoSync?: boolean;
    syncIntervalHours?: number;
    syncCustomers?: boolean;
    syncInvoices?: boolean;
    syncPayments?: boolean;
    syncItems?: boolean;
    syncAccounts?: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

interface SyncLog {
  id: number;
  syncType: string;
  operation: string;
  status: 'pending' | 'success' | 'failed' | 'partial';
  recordsProcessed: number;
  recordsSuccessful: number;
  recordsFailed: number;
  startTime: string;
  endTime?: string;
  errorMessage?: string;
  createdAt: string;
}

interface CustomerMapping {
  id: number;
  patientId: number;
  quickbooksCustomerId: string;
  quickbooksDisplayName?: string;
  syncStatus: 'synced' | 'pending' | 'failed';
  lastSyncAt?: string;
  errorMessage?: string;
}

interface InvoiceMapping {
  id: number;
  emrInvoiceId: string;
  quickbooksInvoiceId: string;
  quickbooksInvoiceNumber?: string;
  patientId: number;
  amount: string;
  status: string;
  syncStatus: 'synced' | 'pending' | 'failed';
  lastSyncAt?: string;
  errorMessage?: string;
}

export default function QuickBooks() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<QuickBooksConnection | null>(null);

  // Fetch QuickBooks connections
  const { data: connections = [], isLoading: connectionsLoading } = useQuery<QuickBooksConnection[]>({
    queryKey: ['/api/quickbooks/connections'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch active connection
  const { data: activeConnection, isLoading: activeConnectionLoading } = useQuery<QuickBooksConnection>({
    queryKey: ['/api/quickbooks/connection/active'],
    retry: false,
    refetchInterval: 30000,
  });

  // Fetch sync logs
  const { data: syncLogs = [], isLoading: syncLogsLoading } = useQuery<SyncLog[]>({
    queryKey: ['/api/quickbooks/sync-logs'],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Fetch customer mappings
  const { data: customerMappings = [] } = useQuery<CustomerMapping[]>({
    queryKey: ['/api/quickbooks/customer-mappings'],
    enabled: !!activeConnection,
  });

  // Fetch invoice mappings
  const { data: invoiceMappings = [] } = useQuery<InvoiceMapping[]>({
    queryKey: ['/api/quickbooks/invoice-mappings'],
    enabled: !!activeConnection,
  });

  // Connect to QuickBooks mutation
  const connectMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/quickbooks/auth/url');
      if (response.url) {
        window.open(response.url, '_blank', 'width=800,height=600');
      }
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Connecting to QuickBooks",
        description: "Please complete the authorization in the popup window.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to initiate QuickBooks connection",
        variant: "destructive",
      });
    },
  });

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: async (connectionId: number) => {
      return await apiRequest(`/api/quickbooks/connections/${connectionId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quickbooks/connections'] });
      queryClient.invalidateQueries({ queryKey: ['/api/quickbooks/connection/active'] });
      toast({
        title: "Disconnected",
        description: "Successfully disconnected from QuickBooks.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Disconnection Failed",
        description: error.message || "Failed to disconnect from QuickBooks",
        variant: "destructive",
      });
    },
  });

  // Update connection settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async ({ connectionId, settings }: { connectionId: number; settings: any }) => {
      return await apiRequest(`/api/quickbooks/connections/${connectionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ syncSettings: settings }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quickbooks/connections'] });
      queryClient.invalidateQueries({ queryKey: ['/api/quickbooks/connection/active'] });
      toast({
        title: "Settings Updated",
        description: "QuickBooks sync settings have been updated.",
      });
      setSettingsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  // Manual sync mutations
  const syncCustomersMutation = useMutation({
    mutationFn: () => apiRequest('/api/quickbooks/sync/customers', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quickbooks/sync-logs'] });
      toast({ title: "Customer Sync Initiated", description: "Customer synchronization has started." });
    },
  });

  const syncInvoicesMutation = useMutation({
    mutationFn: () => apiRequest('/api/quickbooks/sync/invoices', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quickbooks/sync-logs'] });
      toast({ title: "Invoice Sync Initiated", description: "Invoice synchronization has started." });
    },
  });

  const syncPaymentsMutation = useMutation({
    mutationFn: () => apiRequest('/api/quickbooks/sync/payments', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quickbooks/sync-logs'] });
      toast({ title: "Payment Sync Initiated", description: "Payment synchronization has started." });
    },
  });

  // Get status color and icon
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Success</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Pending</Badge>;
      case 'partial':
        return <Badge variant="outline" className="text-yellow-800 border-yellow-300"><AlertCircle className="w-3 h-3 mr-1" />Partial</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSyncStatusBadge = (status: string) => {
    switch (status) {
      case 'synced':
        return <Badge variant="default" className="bg-green-100 text-green-800">Synced</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Connection Status Component
  const ConnectionStatus = () => {
    if (activeConnectionLoading) {
      return (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Checking connection status...</span>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (!activeConnection) {
      return (
        <Card className="border-dashed border-2">
          <CardContent className="p-6 text-center">
            <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">Not Connected to QuickBooks</h3>
            <p className="text-gray-600 mb-4">
              Connect your QuickBooks account to sync financial data and automate your accounting workflow.
            </p>
            <Button 
              onClick={() => connectMutation.mutate()}
              disabled={connectMutation.isPending}
              data-testid="button-connect-quickbooks"
            >
              {connectMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4 mr-2" />
                  Connect to QuickBooks
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div>
                <h3 className="font-semibold text-green-900">Connected to QuickBooks</h3>
                <p className="text-sm text-green-700">
                  Company: {activeConnection.companyName} | 
                  Last Sync: {activeConnection.lastSyncAt ? new Date(activeConnection.lastSyncAt).toLocaleString() : 'Never'}
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedConnection(activeConnection);
                  setSettingsDialogOpen(true);
                }}
                data-testid="button-quickbooks-settings"
              >
                <Settings className="w-4 h-4 mr-1" />
                Settings
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => disconnectMutation.mutate(activeConnection.id)}
                disabled={disconnectMutation.isPending}
                data-testid="button-disconnect-quickbooks"
              >
                {disconnectMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Unlink className="w-4 h-4 mr-1" />
                )}
                Disconnect
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Sync Actions Component
  const SyncActions = () => {
    if (!activeConnection) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <RotateCcw className="w-5 h-5 mr-2" />
            Manual Synchronization
          </CardTitle>
          <CardDescription>
            Manually trigger synchronization between your EMR and QuickBooks data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              onClick={() => syncCustomersMutation.mutate()}
              disabled={syncCustomersMutation.isPending}
              data-testid="button-sync-customers"
            >
              {syncCustomersMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Users className="w-4 h-4 mr-2" />
              )}
              Sync Customers
            </Button>
            <Button
              variant="outline"
              onClick={() => syncInvoicesMutation.mutate()}
              disabled={syncInvoicesMutation.isPending}
              data-testid="button-sync-invoices"
            >
              {syncInvoicesMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 mr-2" />
              )}
              Sync Invoices
            </Button>
            <Button
              variant="outline"
              onClick={() => syncPaymentsMutation.mutate()}
              disabled={syncPaymentsMutation.isPending}
              data-testid="button-sync-payments"
            >
              {syncPaymentsMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CreditCard className="w-4 h-4 mr-2" />
              )}
              Sync Payments
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Sync Logs Component
  const SyncLogsTable = () => {
    if (syncLogsLoading) {
      return (
        <Card>
          <CardContent className="p-6 text-center">
            <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin" />
            Loading sync logs...
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            Recent Sync Activity
          </CardTitle>
          <CardDescription>
            Monitor synchronization status and results between EMR and QuickBooks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {syncLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No sync activity found. Start by running a manual sync above.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Records</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {syncLogs.slice(0, 10).map((log) => (
                  <TableRow key={log.id} data-testid={`sync-log-${log.id}`}>
                    <TableCell className="font-medium">{log.syncType}</TableCell>
                    <TableCell>{getStatusBadge(log.status)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>Processed: {log.recordsProcessed}</div>
                        {log.recordsSuccessful > 0 && (
                          <div className="text-green-600">Success: {log.recordsSuccessful}</div>
                        )}
                        {log.recordsFailed > 0 && (
                          <div className="text-red-600">Failed: {log.recordsFailed}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {log.endTime ? (
                        `${Math.round((new Date(log.endTime).getTime() - new Date(log.startTime).getTime()) / 1000)}s`
                      ) : (
                        'In progress'
                      )}
                    </TableCell>
                    <TableCell>{new Date(log.startTime).toLocaleString()}</TableCell>
                    <TableCell>
                      {log.errorMessage && (
                        <Button variant="ghost" size="sm" data-testid={`button-view-error-${log.id}`}>
                          View Error
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    );
  };

  // Data Mappings Overview
  const DataMappingsOverview = () => {
    if (!activeConnection) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Customer Mappings
            </CardTitle>
            <CardDescription>
              Patient to QuickBooks customer synchronization status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {customerMappings.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                No customer mappings found. Run customer sync to create mappings.
              </div>
            ) : (
              <div className="space-y-3">
                {customerMappings.slice(0, 5).map((mapping) => (
                  <div key={mapping.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <div className="font-medium">{mapping.quickbooksDisplayName || `Customer ${mapping.patientId}`}</div>
                      <div className="text-sm text-gray-600">Patient ID: {mapping.patientId}</div>
                    </div>
                    {getSyncStatusBadge(mapping.syncStatus)}
                  </div>
                ))}
                {customerMappings.length > 5 && (
                  <div className="text-center">
                    <Button variant="ghost" size="sm">
                      View All ({customerMappings.length} total)
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Invoice Mappings
            </CardTitle>
            <CardDescription>
              EMR invoice to QuickBooks invoice synchronization status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invoiceMappings.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                No invoice mappings found. Run invoice sync to create mappings.
              </div>
            ) : (
              <div className="space-y-3">
                {invoiceMappings.slice(0, 5).map((mapping) => (
                  <div key={mapping.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <div className="font-medium">{mapping.quickbooksInvoiceNumber || mapping.quickbooksInvoiceId}</div>
                      <div className="text-sm text-gray-600">
                        EMR: {mapping.emrInvoiceId} | Amount: ${mapping.amount}
                      </div>
                    </div>
                    {getSyncStatusBadge(mapping.syncStatus)}
                  </div>
                ))}
                {invoiceMappings.length > 5 && (
                  <div className="text-center">
                    <Button variant="ghost" size="sm">
                      View All ({invoiceMappings.length} total)
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // Settings Dialog Component
  const SettingsDialog = () => {
    const [settings, setSettings] = useState(selectedConnection?.syncSettings || {});

    useEffect(() => {
      if (selectedConnection) {
        setSettings(selectedConnection.syncSettings || {});
      }
    }, [selectedConnection]);

    const handleSaveSettings = () => {
      if (!selectedConnection) return;
      updateSettingsMutation.mutate({
        connectionId: selectedConnection.id,
        settings,
      });
    };

    return (
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>QuickBooks Sync Settings</DialogTitle>
            <DialogDescription>
              Configure how your EMR data synchronizes with QuickBooks.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-sync">Automatic Synchronization</Label>
              <Switch
                id="auto-sync"
                checked={settings.autoSync || false}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, autoSync: checked }))
                }
              />
            </div>
            
            <div className="space-y-4">
              <Label>Sync Data Types</Label>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="sync-customers">Customers/Patients</Label>
                <Switch
                  id="sync-customers"
                  checked={settings.syncCustomers !== false}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, syncCustomers: checked }))
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="sync-invoices">Invoices</Label>
                <Switch
                  id="sync-invoices"
                  checked={settings.syncInvoices !== false}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, syncInvoices: checked }))
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="sync-payments">Payments</Label>
                <Switch
                  id="sync-payments"
                  checked={settings.syncPayments !== false}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, syncPayments: checked }))
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="sync-items">Services/Items</Label>
                <Switch
                  id="sync-items"
                  checked={settings.syncItems !== false}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, syncItems: checked }))
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="sync-accounts">Chart of Accounts</Label>
                <Switch
                  id="sync-accounts"
                  checked={settings.syncAccounts !== false}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, syncAccounts: checked }))
                  }
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setSettingsDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSaveSettings}
                disabled={updateSettingsMutation.isPending}
                data-testid="button-save-settings"
              >
                {updateSettingsMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Settings'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">QuickBooks Integration</h1>
          <p className="text-gray-600">Manage your accounting synchronization and financial data integration</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['/api/quickbooks/connections'] });
              queryClient.invalidateQueries({ queryKey: ['/api/quickbooks/connection/active'] });
              queryClient.invalidateQueries({ queryKey: ['/api/quickbooks/sync-logs'] });
            }}
            data-testid="button-refresh-data"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      <ConnectionStatus />

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sync-activity">Sync Activity</TabsTrigger>
          <TabsTrigger value="data-mappings">Data Mappings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <SyncActions />
          
          {activeConnection && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Customer Mappings</p>
                      <p className="text-2xl font-bold" data-testid="text-customer-count">{customerMappings.length}</p>
                    </div>
                    <Users className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Invoice Mappings</p>
                      <p className="text-2xl font-bold" data-testid="text-invoice-count">{invoiceMappings.length}</p>
                    </div>
                    <FileText className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Recent Syncs</p>
                      <p className="text-2xl font-bold" data-testid="text-sync-count">{syncLogs.length}</p>
                    </div>
                    <Activity className="w-8 h-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="sync-activity" className="space-y-6">
          <SyncLogsTable />
        </TabsContent>

        <TabsContent value="data-mappings" className="space-y-6">
          <DataMappingsOverview />
        </TabsContent>
      </Tabs>

      <SettingsDialog />
    </div>
  );
}