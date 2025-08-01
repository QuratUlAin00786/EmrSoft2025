import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Package, AlertTriangle, TrendingUp, Search, Filter, BarChart3, ShoppingCart } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface InventoryItem {
  id: number;
  name: string;
  description?: string;
  sku: string;
  barcode?: string;
  brandName?: string;
  manufacturer?: string;
  unitOfMeasurement: string;
  purchasePrice: string;
  salePrice: string;
  mrp?: string;
  currentStock: number;
  minimumStock: number;
  reorderPoint: number;
  prescriptionRequired: boolean;
  isActive: boolean;
  categoryName?: string;
  stockValue: number;
  isLowStock: boolean;
  createdAt: string;
  updatedAt: string;
}

interface InventoryCategory {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
}

interface StockAlert {
  id: number;
  alertType: string;
  message: string;
  isRead: boolean;
  isResolved: boolean;
  createdAt: string;
  itemName: string;
  itemSku: string;
  currentStock: number;
  minimumStock: number;
}

interface InventoryValue {
  totalValue: number;
  totalItems: number;
  totalStock: number;
  lowStockItems: number;
}

interface PurchaseOrder {
  id: number;
  poNumber: string;
  orderDate: string;
  expectedDeliveryDate?: string;
  status: string;
  totalAmount: string;
  supplierName: string;
  supplierEmail?: string;
  emailSent: boolean;
  emailSentAt?: string;
  createdAt: string;
}

export default function Inventory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>();
  const [showLowStock, setShowLowStock] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch inventory data
  const { data: items = [], isLoading: itemsLoading } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory/items", { 
      search: searchTerm, 
      categoryId: selectedCategory, 
      lowStock: showLowStock 
    }],
  });

  const { data: categories = [] } = useQuery<InventoryCategory[]>({
    queryKey: ["/api/inventory/categories"],
  });

  const { data: alerts = [] } = useQuery<StockAlert[]>({
    queryKey: ["/api/inventory/alerts", { unreadOnly: true }],
  });

  const { data: inventoryValue } = useQuery<InventoryValue>({
    queryKey: ["/api/inventory/reports/value"],
  });

  const { data: purchaseOrders = [] } = useQuery<PurchaseOrder[]>({
    queryKey: ["/api/inventory/purchase-orders"],
  });

  // Send purchase order email mutation
  const sendEmailMutation = useMutation({
    mutationFn: async (purchaseOrderId: number) => {
      await apiRequest("POST", `/api/inventory/purchase-orders/${purchaseOrderId}/send-email`);
    },
    onSuccess: (_, purchaseOrderId) => {
      toast({
        title: "Email Sent",
        description: "Purchase order has been sent to Halo Pharmacy successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/purchase-orders"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send purchase order email",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      sent: "secondary",
      received: "default",
      cancelled: "destructive"
    };
    return <Badge variant={variants[status] || "outline"}>{status.toUpperCase()}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Inventory Management
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Manage healthcare supplies, stock levels, and purchase orders
              </p>
            </div>
            <div className="flex space-x-3">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
              <Button variant="outline">
                <ShoppingCart className="h-4 w-4 mr-2" />
                New Purchase Order
              </Button>
            </div>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                £{inventoryValue?.totalValue?.toFixed(2) || '0.00'}
              </div>
              <p className="text-xs text-muted-foreground">
                Across {inventoryValue?.totalItems || 0} items
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Stock</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {inventoryValue?.totalStock?.toLocaleString() || '0'}
              </div>
              <p className="text-xs text-muted-foreground">
                Units in stock
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">
                {inventoryValue?.lowStockItems || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Need restocking
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {purchaseOrders.filter(po => po.status === 'pending').length}
              </div>
              <p className="text-xs text-muted-foreground">
                Awaiting approval
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <Card className="mb-8 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20">
            <CardHeader>
              <CardTitle className="text-orange-800 dark:text-orange-200 text-lg">
                <AlertTriangle className="h-5 w-5 inline mr-2" />
                Stock Alerts ({alerts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {alerts.slice(0, 3).map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-md">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{alert.itemName}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{alert.message}</p>
                    </div>
                    <Badge variant="outline" className="text-orange-700 border-orange-300">
                      {alert.currentStock}/{alert.minimumStock}
                    </Badge>
                  </div>
                ))}
                {alerts.length > 3 && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center pt-2">
                    And {alerts.length - 3} more alerts...
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="items" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="items">Items</TabsTrigger>
            <TabsTrigger value="orders">Purchase Orders</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          {/* Items Tab */}
          <TabsContent value="items" className="space-y-6">
            {/* Search and Filters */}
            <Card>
              <CardHeader>
                <CardTitle>Search & Filter</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search items by name, SKU, or barcode..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <select
                    value={selectedCategory || ''}
                    onChange={(e) => setSelectedCategory(e.target.value ? parseInt(e.target.value) : undefined)}
                    className="px-3 py-2 border rounded-md bg-white dark:bg-gray-800"
                  >
                    <option value="">All Categories</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant={showLowStock ? "default" : "outline"}
                    onClick={() => setShowLowStock(!showLowStock)}
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Low Stock Only
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {itemsLoading ? (
                <div className="col-span-full text-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">Loading inventory items...</p>
                </div>
              ) : items.length === 0 ? (
                <div className="col-span-full text-center py-8">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No items found</p>
                </div>
              ) : (
                items.map((item) => (
                  <Card key={item.id} className={item.isLowStock ? "border-orange-200" : ""}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{item.name}</CardTitle>
                          <CardDescription>{item.brandName || item.manufacturer}</CardDescription>
                        </div>
                        {item.isLowStock && (
                          <Badge variant="outline" className="text-orange-700 border-orange-300">
                            Low Stock
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">SKU:</span>
                          <span className="font-mono">{item.sku}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Stock:</span>
                          <span className={item.isLowStock ? "text-orange-600 font-medium" : ""}>
                            {item.currentStock} {item.unitOfMeasurement}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Min Stock:</span>
                          <span>{item.minimumStock}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Sale Price:</span>
                          <span className="font-medium">£{item.salePrice}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Value:</span>
                          <span className="font-medium">£{item.stockValue.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Category:</span>
                          <Badge variant="secondary" className="text-xs">
                            {item.categoryName}
                          </Badge>
                        </div>
                        {item.prescriptionRequired && (
                          <Badge variant="outline" className="text-xs">
                            Prescription Required
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Purchase Orders Tab */}
          <TabsContent value="orders" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Purchase Orders</CardTitle>
                    <CardDescription>Manage purchase orders to Halo Pharmacy and other suppliers</CardDescription>
                  </div>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Purchase Order
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {purchaseOrders.length === 0 ? (
                    <div className="text-center py-8">
                      <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">No purchase orders found</p>
                    </div>
                  ) : (
                    purchaseOrders.map((order) => (
                      <div key={order.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">{order.poNumber}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {order.supplierName}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(order.status)}
                            {order.status === 'pending' && (
                              <Button
                                size="sm"
                                onClick={() => sendEmailMutation.mutate(order.id)}
                                disabled={sendEmailMutation.isPending}
                              >
                                Send to Halo Pharmacy
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Order Date:</span>
                            <p>{new Date(order.orderDate).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Total Amount:</span>
                            <p className="font-medium">£{order.totalAmount}</p>
                          </div>
                          {order.expectedDeliveryDate && (
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Expected Delivery:</span>  
                              <p>{new Date(order.expectedDeliveryDate).toLocaleDateString()}</p>
                            </div>
                          )}
                          {order.emailSent && (
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Email Sent:</span>
                              <p>{order.emailSentAt ? new Date(order.emailSentAt).toLocaleDateString() : 'Yes'}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Stock Alerts</CardTitle>
                <CardDescription>Monitor inventory levels and receive notifications</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {alerts.length === 0 ? (
                    <div className="text-center py-8">
                      <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">No active alerts</p>
                    </div>
                  ) : (
                    alerts.map((alert) => (
                      <div key={alert.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-medium text-orange-800 dark:text-orange-200">
                              {alert.itemName} ({alert.itemSku})
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {alert.message}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                              {new Date(alert.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex flex-col items-end space-y-2">
                            <Badge variant="outline" className="text-orange-700 border-orange-300">
                              {alert.alertType.replace('_', ' ').toUpperCase()}
                            </Badge>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              Stock: {alert.currentStock}/{alert.minimumStock}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Inventory Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Total Items:</span>
                      <span className="font-medium">{inventoryValue?.totalItems || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Stock Units:</span>
                      <span className="font-medium">{inventoryValue?.totalStock?.toLocaleString() || '0'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Value:</span>
                      <span className="font-medium">£{inventoryValue?.totalValue?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between text-orange-600">
                      <span>Low Stock Items:</span>
                      <span className="font-medium">{inventoryValue?.lowStockItems || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button className="w-full justify-start">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Generate Stock Report
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <Package className="h-4 w-4 mr-2" />
                      Export Inventory List
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      View Low Stock Report
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Purchase Order History
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}