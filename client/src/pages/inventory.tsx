import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Plus, Package, AlertTriangle, TrendingUp, Search, Filter, BarChart3, 
  ShoppingCart, Edit, MoreVertical, Calendar, MapPin, Clock, CheckCircle,
  XCircle, AlertCircle, FileText, Truck, Pill, Stethoscope, Archive,
  Eye, Download, Upload, RefreshCw, Settings, Users, Building2
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import AddItemDialog from "@/components/inventory/add-item-dialog";
import StockAdjustmentDialog from "@/components/inventory/stock-adjustment-dialog";
import PurchaseOrderDialog from "@/components/inventory/purchase-order-dialog";
import GoodsReceiptDialog from "@/components/inventory/goods-receipt-dialog";

// 1. Item Master Interface
interface InventoryItem {
  id: number; // Unique identifier
  name: string; // Item Name
  description?: string;
  sku: string;
  barcode?: string;
  brandName?: string;
  manufacturer?: string;
  categoryId: number;
  categoryName?: string; // Category (Medicine/Equipment)
  unitOfMeasurement: string; // Unit of Measurement (Strip, Bottle, etc.)
  purchasePrice: string;
  salePrice: string;
  mrp?: string;
  currentStock: number;
  minimumStock: number;
  reorderPoint: number; // Reorder Level (To prevent stockouts)
  prescriptionRequired: boolean;
  isActive: boolean;
  stockValue: number;
  isLowStock: boolean;
  expiryDate?: string; // Expiry Date (Critical for medicines)
  createdAt: string;
  updatedAt: string;
}

// 2. Stock/Inventory Table Interface  
interface StockEntry {
  id: number;
  itemId: number; // Link to Item Master
  itemName: string;
  batchNumber: string; // Batch Number (For traceability)
  quantityAvailable: number; // Current stock
  location: string; // Location/Department (Pharmacy/Ward)
  expiryDate: string; // Expiry Date & Batch Number (For traceability)
  manufactureDate?: string;
  supplierId?: number;
  supplierName?: string;
  purchasePrice: string;
  receivedDate: string;
  isExpired: boolean;
}

interface InventoryCategory {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
}

// 3. Purchase Orders (POs) Interface
interface PurchaseOrder {
  id: number;
  poNumber: string; // PO Number
  supplierId: number; // Supplier ID
  supplierName: string;
  supplierEmail?: string;
  orderDate: string;
  expectedDeliveryDate?: string;
  status: string; // Status (Ordered/Received)
  totalAmount: string;
  itemsOrdered: PurchaseOrderItem[]; // Items Ordered (List with quantities)
  emailSent: boolean;
  emailSentAt?: string;
  createdAt: string;
  createdBy: number;
  approvedBy?: number;
  approvedAt?: string;
}

interface PurchaseOrderItem {
  id: number;
  itemId: number;
  itemName: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  receivedQuantity: number;
}

// 4. Goods Receipt Interface
interface GoodsReceipt {
  id: number;
  receiptNumber: string; // Receipt Number
  purchaseOrderId: number;
  poNumber: string;
  supplierName: string; // Supplier Name
  receivedDate: string;
  itemsReceived: GoodsReceiptItem[]; // Items Received (With batch/expiry)
  totalAmount: string;
  receivedBy: number;
  notes?: string;
}

interface GoodsReceiptItem {
  id: number;
  itemId: number;
  itemName: string;
  quantityReceived: number;
  batchNumber: string; // Batch Number
  expiryDate: string; // Expiry Date
  manufactureDate?: string;
  unitPrice: string;
  totalPrice: string;
}

// 5. Alerts Interface
interface StockAlert {
  id: number;
  alertType: string; // Low Stock / Expiry Alerts
  message: string;
  isRead: boolean;
  isResolved: boolean;
  createdAt: string;
  itemId: number;
  itemName: string;
  itemSku: string;
  currentStock?: number;
  minimumStock?: number;
  expiryDate?: string; // For expiry alerts
  batchNumber?: string; // For batch-specific alerts
}

interface InventoryValue {
  totalValue: string;
  totalItems: number;
  totalStock: number;
  lowStockItems: number;
  expiringItems: number;
  expiredItems: number;
}

export default function Inventory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>();
  const [showLowStock, setShowLowStock] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showStockDialog, setShowStockDialog] = useState(false);
  const [showPODialog, setShowPODialog] = useState(false);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [activeTab, setActiveTab] = useState("item-master");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 1. Item Master Data
  const { data: items = [], isLoading: itemsLoading, error: itemsError } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory/items"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/inventory/items");
      return response.json();
    },
    retry: 3,
  });

  // 2. Stock/Inventory Data
  const { data: stockEntries = [], isLoading: stockLoading } = useQuery<StockEntry[]>({
    queryKey: ["/api/inventory/batches"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/inventory/batches");
      return response.json();
    },
    retry: 3,
  });

  // 3. Purchase Orders Data
  const { data: purchaseOrders = [], isLoading: poLoading } = useQuery<PurchaseOrder[]>({
    queryKey: ["/api/inventory/purchase-orders"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/inventory/purchase-orders");
      return response.json();
    },
    retry: 3,
  });

  // 4. Goods Receipt Data
  const { data: goodsReceipts = [], isLoading: receiptLoading } = useQuery<GoodsReceipt[]>({
    queryKey: ["/api/inventory/goods-receipts"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/inventory/goods-receipts");
      return response.json();
    },
    retry: 3,
  });

  // 5. Alerts Data (Low Stock & Expiry)
  const { data: alerts = [] } = useQuery<StockAlert[]>({
    queryKey: ["/api/inventory/alerts"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/inventory/alerts");
      return response.json();
    },
    retry: 3,
  });

  const { data: categories = [], error: categoriesError } = useQuery<InventoryCategory[]>({
    queryKey: ["/api/inventory/categories"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/inventory/categories");
      return response.json();
    },
    retry: 3,
  });

  const { data: inventoryValue } = useQuery<InventoryValue>({
    queryKey: ["/api/inventory/reports/value"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/inventory/reports/value");
      return response.json();
    },
    retry: 3,
  });

  // Send purchase order email mutation
  const sendEmailMutation = useMutation({
    mutationFn: async (purchaseOrderId: number) => {
      await apiRequest("POST", `/api/inventory/purchase-orders/${purchaseOrderId}/send-email`);
    },
    onSuccess: () => {
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
      cancelled: "destructive",
      ordered: "secondary",
      delivered: "default"
    };
    return <Badge variant={variants[status] || "outline"}>{status.toUpperCase()}</Badge>;
  };

  const getAlertTypeBadge = (alertType: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      low_stock: "destructive",
      expired: "destructive",
      expiring_soon: "outline"
    };
    return <Badge variant={variants[alertType] || "outline"}>{alertType.replace('_', ' ').toUpperCase()}</Badge>;
  };

  // Filter items based on search and filters
  const filteredItems = items.filter(item => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      if (!item.name.toLowerCase().includes(searchLower) && 
          !item.sku.toLowerCase().includes(searchLower) &&
          !item.barcode?.toLowerCase().includes(searchLower)) {
        return false;
      }
    }
    
    if (selectedCategory && item.categoryId !== selectedCategory) {
      return false;
    }
    
    if (showLowStock && !item.isLowStock) {
      return false;
    }
    
    return true;
  });

  // Filter stock entries
  const filteredStockEntries = stockEntries.filter(entry => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      if (!entry.itemName.toLowerCase().includes(searchLower) && 
          !entry.batchNumber.toLowerCase().includes(searchLower)) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Comprehensive Inventory Management
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Complete healthcare inventory system with Item Master, Stock Tracking, Purchase Orders, Goods Receipt & Alerts
              </p>
            </div>
            <div className="flex space-x-3">
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
              <Button variant="outline" onClick={() => setShowPODialog(true)}>
                <ShoppingCart className="h-4 w-4 mr-2" />
                New Purchase Order
              </Button>
              <Button variant="outline" onClick={() => setShowReceiptDialog(true)}>
                <Truck className="h-4 w-4 mr-2" />
                Goods Receipt
              </Button>
            </div>
          </div>
        </div>

        {/* Critical Alerts Banner */}
        {alerts.length > 0 && (
          <div className="mb-6">
            <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
              <CardHeader>
                <CardTitle className="text-orange-800 dark:text-orange-200 flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Critical Inventory Alerts ({alerts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {alerts.slice(0, 3).map(alert => (
                    <div key={alert.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getAlertTypeBadge(alert.alertType)}
                        <span className="font-medium">{alert.itemName}</span>
                        <span className="text-sm text-gray-600">{alert.message}</span>
                      </div>
                      <span className="text-xs text-gray-500">{format(new Date(alert.createdAt), 'MMM dd, HH:mm')}</span>
                    </div>
                  ))}
                  {alerts.length > 3 && (
                    <p className="text-sm text-gray-600 text-center pt-2">
                      +{alerts.length - 3} more alerts - View all in Alerts tab
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                £{inventoryValue?.totalValue ? parseFloat(inventoryValue.totalValue).toFixed(2) : '0.00'}
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
              <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">
                {inventoryValue?.expiringItems || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Within 30 days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expired Items</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">
                {inventoryValue?.expiredItems || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Remove from stock
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="item-master" className="flex items-center space-x-2">
              <Package className="h-4 w-4" />
              <span>Item Master</span>
            </TabsTrigger>
            <TabsTrigger value="stock-inventory" className="flex items-center space-x-2">
              <Archive className="h-4 w-4" />
              <span>Stock/Inventory</span>
            </TabsTrigger>
            <TabsTrigger value="purchase-orders" className="flex items-center space-x-2">
              <ShoppingCart className="h-4 w-4" />
              <span>Purchase Orders</span>
            </TabsTrigger>
            <TabsTrigger value="goods-receipt" className="flex items-center space-x-2">
              <Truck className="h-4 w-4" />
              <span>Goods Receipt</span>
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4" />
              <span>Alerts</span>
            </TabsTrigger>
          </TabsList>

          {/* 1. Item Master Tab */}
          <TabsContent value="item-master" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="h-5 w-5 mr-2" />
                  Item Master - Complete Item Database
                </CardTitle>
                <CardDescription>
                  Manage item details including ID, Name & Category, Unit of Measurement, Expiry Date, and Reorder Level
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Search and Filters */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search by name, SKU, or barcode..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={selectedCategory?.toString() || "all"} onValueChange={(value) => setSelectedCategory(value === "all" ? undefined : parseInt(value))}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    onClick={() => setShowLowStock(!showLowStock)}
                    className={showLowStock ? "bg-orange-100 text-orange-800" : ""}
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Low Stock Only
                  </Button>
                </div>

                {/* Items Table */}
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item ID</TableHead>
                        <TableHead>Item Name & Category</TableHead>
                        <TableHead>Unit of Measurement</TableHead>
                        <TableHead>Current Stock</TableHead>
                        <TableHead>Reorder Level</TableHead>
                        <TableHead>Expiry Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itemsLoading ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8">
                            <div className="flex items-center justify-center">
                              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                              Loading items...
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filteredItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                            No items found matching your criteria
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredItems.map((item, index) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">#{index + 1}</TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{item.name}</div>
                                <div className="text-sm text-gray-500">{item.categoryName || 'Uncategorized'}</div>
                                <div className="text-xs text-gray-400">SKU: {item.sku}</div>
                              </div>
                            </TableCell>
                            <TableCell>{item.unitOfMeasurement}</TableCell>
                            <TableCell>
                              <div className={`font-medium ${item.isLowStock ? 'text-orange-600' : ''}`}>
                                {item.currentStock}
                                {item.isLowStock && (
                                  <AlertTriangle className="h-3 w-3 inline ml-1 text-orange-500" />
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{item.reorderPoint}</TableCell>
                            <TableCell>
                              {item.expiryDate ? (
                                <span className={new Date(item.expiryDate) < new Date() ? 'text-red-600' : ''}>
                                  {format(new Date(item.expiryDate), 'MMM dd, yyyy')}
                                </span>
                              ) : (
                                <span className="text-gray-400">No expiry</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {item.isLowStock ? (
                                <Badge variant="destructive">Low Stock</Badge>
                              ) : (
                                <Badge variant="default">In Stock</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => {
                                    setSelectedItem(item);
                                    setShowStockDialog(true);
                                  }}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Adjust Stock
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <FileText className="mr-2 h-4 w-4" />
                                    Generate Report
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 2. Stock/Inventory Tab */}
          <TabsContent value="stock-inventory" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Archive className="h-5 w-5 mr-2" />
                  Stock/Inventory Table - Batch & Location Tracking
                </CardTitle>
                <CardDescription>
                  Track stock by batch number, location/department, expiry dates for complete traceability
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Stock Search */}
                <div className="flex gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search by item name or batch number..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Stock Table */}
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item ID & Name</TableHead>
                        <TableHead>Batch Number</TableHead>
                        <TableHead>Quantity Available</TableHead>
                        <TableHead>Location/Department</TableHead>
                        <TableHead>Expiry Date</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stockLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            <div className="flex items-center justify-center">
                              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                              Loading stock entries...
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filteredStockEntries.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                            No stock entries found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredStockEntries.map((entry, index) => (
                          <TableRow key={entry.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">#{index + 1} - {entry.itemName}</div>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-sm">{entry.batchNumber}</TableCell>
                            <TableCell className="font-medium">{entry.quantityAvailable}</TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <MapPin className="h-3 w-3 mr-1 text-gray-400" />
                                {entry.location}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className={entry.isExpired ? 'text-red-600 font-medium' : new Date(entry.expiryDate) <= new Date(Date.now() + 30*24*60*60*1000) ? 'text-yellow-600' : ''}>
                                {format(new Date(entry.expiryDate), 'MMM dd, yyyy')}
                              </span>
                            </TableCell>
                            <TableCell>{entry.supplierName || 'Unknown'}</TableCell>
                            <TableCell>
                              {entry.isExpired ? (
                                <Badge variant="destructive">Expired</Badge>
                              ) : new Date(entry.expiryDate) <= new Date(Date.now() + 30*24*60*60*1000) ? (
                                <Badge variant="outline" className="text-yellow-600 border-yellow-600">Expiring Soon</Badge>
                              ) : (
                                <Badge variant="default">Valid</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 3. Purchase Orders Tab */}
          <TabsContent value="purchase-orders" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Purchase Orders (POs) - Supplier & Order Management
                </CardTitle>
                <CardDescription>
                  Manage PO Numbers, Supplier IDs, Order Status, and Items Ordered with quantities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>PO Number</TableHead>
                        <TableHead>Supplier ID & Name</TableHead>
                        <TableHead>Order Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Total Amount</TableHead>
                        <TableHead>Items Ordered</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {poLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            <div className="flex items-center justify-center">
                              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                              Loading purchase orders...
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : purchaseOrders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                            No purchase orders found
                          </TableCell>
                        </TableRow>
                      ) : (
                        purchaseOrders.map(po => (
                          <TableRow key={po.id}>
                            <TableCell className="font-mono font-medium">{po.poNumber}</TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">#{po.supplierId} - {po.supplierName}</div>
                                {po.supplierEmail && (
                                  <div className="text-sm text-gray-500">{po.supplierEmail}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{format(new Date(po.orderDate), 'MMM dd, yyyy')}</TableCell>
                            <TableCell>{getStatusBadge(po.status)}</TableCell>
                            <TableCell className="font-medium">£{parseFloat(po.totalAmount).toFixed(2)}</TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {po.itemsOrdered?.length || 0} items
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Button size="sm" variant="outline">
                                  <Eye className="h-3 w-3 mr-1" />
                                  View
                                </Button>
                                {!po.emailSent && (
                                  <Button 
                                    size="sm" 
                                    onClick={() => sendEmailMutation.mutate(po.id)}
                                    disabled={sendEmailMutation.isPending}
                                  >
                                    Send
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 4. Goods Receipt Tab */}
          <TabsContent value="goods-receipt" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Truck className="h-5 w-5 mr-2" />
                  Goods Receipt - Delivery & Batch Recording
                </CardTitle>
                <CardDescription>
                  Record Receipt Numbers, Items Received with batch/expiry information, and Supplier Names
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Receipt Number</TableHead>
                        <TableHead>PO Number</TableHead>
                        <TableHead>Supplier Name</TableHead>
                        <TableHead>Received Date</TableHead>
                        <TableHead>Items Received</TableHead>
                        <TableHead>Total Amount</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {receiptLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            <div className="flex items-center justify-center">
                              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                              Loading goods receipts...
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : goodsReceipts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                            No goods receipts found
                          </TableCell>
                        </TableRow>
                      ) : (
                        goodsReceipts.map(receipt => (
                          <TableRow key={receipt.id}>
                            <TableCell className="font-mono font-medium">{receipt.receiptNumber}</TableCell>
                            <TableCell className="font-mono">{receipt.poNumber}</TableCell>
                            <TableCell className="font-medium">{receipt.supplierName}</TableCell>
                            <TableCell>{format(new Date(receipt.receivedDate), 'MMM dd, yyyy')}</TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {receipt.itemsReceived?.length || 0} items
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">£{parseFloat(receipt.totalAmount).toFixed(2)}</TableCell>
                            <TableCell>
                              <Button size="sm" variant="outline">
                                <Eye className="h-3 w-3 mr-1" />
                                View Details
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 5. Alerts Tab */}
          <TabsContent value="alerts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Critical Alerts - Low Stock & Expiry Monitoring
                </CardTitle>
                <CardDescription>
                  Monitor Low Stock alerts based on reorder levels and Expiry Alerts for patient safety
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {alerts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                      <p className="text-lg font-medium">No Critical Alerts</p>
                      <p className="text-sm">All inventory levels and expiry dates are within safe limits</p>
                    </div>
                  ) : (
                    alerts.map(alert => (
                      <Card key={alert.id} className={`${
                        alert.alertType === 'expired' || alert.alertType === 'low_stock' 
                          ? 'border-red-200 bg-red-50 dark:bg-red-950' 
                          : 'border-yellow-200 bg-yellow-50 dark:bg-yellow-950'
                      }`}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <AlertTriangle className={`h-5 w-5 ${
                                alert.alertType === 'expired' || alert.alertType === 'low_stock' 
                                  ? 'text-red-500' 
                                  : 'text-yellow-500'
                              }`} />
                              {getAlertTypeBadge(alert.alertType)}
                              <div>
                                <div className="font-medium">{alert.itemName}</div>
                                <div className="text-sm text-gray-600">{alert.message}</div>
                                {alert.batchNumber && (
                                  <div className="text-xs text-gray-500">Batch: {alert.batchNumber}</div>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-gray-500">{format(new Date(alert.createdAt), 'MMM dd, HH:mm')}</div>
                              {alert.currentStock !== undefined && (
                                <div className="text-xs">Stock: {alert.currentStock}/{alert.minimumStock}</div>
                              )}
                              {alert.expiryDate && (
                                <div className="text-xs">Expires: {format(new Date(alert.expiryDate), 'MMM dd, yyyy')}</div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        {showAddDialog && (
          <AddItemDialog 
            open={showAddDialog} 
            onOpenChange={setShowAddDialog}
          />
        )}

        {showStockDialog && selectedItem && (
          <StockAdjustmentDialog
            open={showStockDialog}
            onOpenChange={setShowStockDialog}
            item={selectedItem}
          />
        )}

        {showPODialog && (
          <PurchaseOrderDialog
            open={showPODialog}
            onOpenChange={setShowPODialog}
            items={items}
          />
        )}

        {showReceiptDialog && (
          <GoodsReceiptDialog
            open={showReceiptDialog}
            onOpenChange={setShowReceiptDialog}
            items={items}
          />
        )}
      </div>
    </div>
  );
}