import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";

interface InventoryItem {
  id: number;
  name: string;
  purchasePrice: string;
  unitOfMeasurement: string;
}

interface GoodsReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: InventoryItem[];
}

interface ReceiptItem {
  itemId: number;
  itemName: string;
  quantityReceived: number;
  unitPrice: string;
  batchNumber: string;
  expiryDate: string;
  manufacturingDate: string;
}

export default function GoodsReceiptDialog({ open, onOpenChange, items }: GoodsReceiptDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    supplierId: 1,
    deliveryDate: new Date().toISOString().split('T')[0],
    receivedBy: "",
    notes: "",
    invoiceNumber: "",
    totalAmount: "0.00"
  });
  
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([]);
  const [newItem, setNewItem] = useState({
    itemId: "",
    quantityReceived: 1,
    unitPrice: "",
    batchNumber: "",
    expiryDate: "",
    manufacturingDate: ""
  });

  const createReceiptMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/inventory/goods-receipts", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Goods receipt created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/goods-receipts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/items"] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create goods receipt",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      supplierId: 1,
      deliveryDate: new Date().toISOString().split('T')[0],
      receivedBy: "",
      notes: "",
      invoiceNumber: "",
      totalAmount: "0.00"
    });
    setReceiptItems([]);
    setNewItem({
      itemId: "",
      quantityReceived: 1,
      unitPrice: "",
      batchNumber: "",
      expiryDate: "",
      manufacturingDate: ""
    });
  };

  const addItem = () => {
    if (!newItem.itemId || !newItem.unitPrice || !newItem.batchNumber) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const selectedItem = items.find(item => item.id === parseInt(newItem.itemId));
    if (!selectedItem) return;

    const receiptItem: ReceiptItem = {
      itemId: parseInt(newItem.itemId),
      itemName: selectedItem.name,
      quantityReceived: newItem.quantityReceived,
      unitPrice: newItem.unitPrice,
      batchNumber: newItem.batchNumber,
      expiryDate: newItem.expiryDate,
      manufacturingDate: newItem.manufacturingDate
    };

    setReceiptItems([...receiptItems, receiptItem]);
    setNewItem({
      itemId: "",
      quantityReceived: 1,
      unitPrice: "",
      batchNumber: "",
      expiryDate: "",
      manufacturingDate: ""
    });
  };

  const removeItem = (index: number) => {
    setReceiptItems(receiptItems.filter((_, i) => i !== index));
  };

  const calculateTotalAmount = () => {
    return receiptItems.reduce((sum, item) => sum + (item.quantityReceived * parseFloat(item.unitPrice)), 0).toFixed(2);
  };

  const handleSubmit = () => {
    if (receiptItems.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one item",
        variant: "destructive",
      });
      return;
    }

    if (!formData.receivedBy) {
      toast({
        title: "Error",
        description: "Please specify who received the goods",
        variant: "destructive",
      });
      return;
    }

    const totalAmount = calculateTotalAmount();

    createReceiptMutation.mutate({
      ...formData,
      totalAmount,
      items: receiptItems
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Goods Receipt</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="supplier">Supplier</Label>
              <Select value={formData.supplierId.toString()} onValueChange={(value) => setFormData({...formData, supplierId: parseInt(value)})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Halo Pharmacy</SelectItem>
                  <SelectItem value="2">MedSupply Co.</SelectItem>
                  <SelectItem value="3">Healthcare Solutions</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="deliveryDate">Delivery Date</Label>
              <Input
                type="date"
                value={formData.deliveryDate}
                onChange={(e) => setFormData({...formData, deliveryDate: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="receivedBy">Received By</Label>
              <Input
                value={formData.receivedBy}
                onChange={(e) => setFormData({...formData, receivedBy: e.target.value})}
                placeholder="Name of person who received"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="invoiceNumber">Invoice Number</Label>
              <Input
                value={formData.invoiceNumber}
                onChange={(e) => setFormData({...formData, invoiceNumber: e.target.value})}
                placeholder="Supplier invoice number"
              />
            </div>
            <div>
              <Label>Total Amount</Label>
              <Input value={`£${calculateTotalAmount()}`} disabled />
            </div>
          </div>

          {/* Add Items Section */}
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-3">Add Received Items</h3>
            <div className="grid grid-cols-7 gap-3 items-end">
              <div>
                <Label>Item</Label>
                <Select value={newItem.itemId} onValueChange={(value) => setNewItem({...newItem, itemId: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select item" />
                  </SelectTrigger>
                  <SelectContent>
                    {items.map(item => (
                      <SelectItem key={item.id} value={item.id.toString()}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={newItem.quantityReceived}
                  onChange={(e) => setNewItem({...newItem, quantityReceived: parseInt(e.target.value) || 1})}
                />
              </div>
              <div>
                <Label>Unit Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newItem.unitPrice}
                  onChange={(e) => setNewItem({...newItem, unitPrice: e.target.value})}
                />
              </div>
              <div>
                <Label>Batch Number</Label>
                <Input
                  value={newItem.batchNumber}
                  onChange={(e) => setNewItem({...newItem, batchNumber: e.target.value})}
                  placeholder="Batch #"
                />
              </div>
              <div>
                <Label>Expiry Date</Label>
                <Input
                  type="date"
                  value={newItem.expiryDate}
                  onChange={(e) => setNewItem({...newItem, expiryDate: e.target.value})}
                />
              </div>
              <div>
                <Label>Mfg Date</Label>
                <Input
                  type="date"
                  value={newItem.manufacturingDate}
                  onChange={(e) => setNewItem({...newItem, manufacturingDate: e.target.value})}
                />
              </div>
              <Button onClick={addItem}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Items Table */}
          {receiptItems.length > 0 && (
            <div>
              <h3 className="font-medium mb-3">Received Items</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Batch #</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receiptItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.itemName}</TableCell>
                      <TableCell>{item.quantityReceived}</TableCell>
                      <TableCell>£{item.unitPrice}</TableCell>
                      <TableCell>{item.batchNumber}</TableCell>
                      <TableCell>{item.expiryDate}</TableCell>
                      <TableCell>£{(item.quantityReceived * parseFloat(item.unitPrice)).toFixed(2)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => removeItem(index)}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Notes */}
          <div>
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="Additional notes about the delivery"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={createReceiptMutation.isPending}>
              {createReceiptMutation.isPending ? "Creating..." : "Create Goods Receipt"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}