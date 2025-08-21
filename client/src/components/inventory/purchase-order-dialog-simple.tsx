import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface InventoryItem {
  id: number;
  name: string;
  purchasePrice: string;
  unitOfMeasurement: string;
}

interface PurchaseOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: InventoryItem[];
}

export default function PurchaseOrderDialogSimple({ open, onOpenChange, items }: PurchaseOrderDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedItemId, setSelectedItemId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState("");
  const [poItems, setPOItems] = useState<any[]>([]);

  const createPOMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/inventory/purchase-orders", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Purchase order created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/purchase-orders"] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create purchase order",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedItemId("");
    setQuantity(1);
    setUnitPrice("");
    setPOItems([]);
  };

  const handleAddItem = () => {
    console.log("SIMPLE: Add item button clicked!");
    console.log("SIMPLE: selectedItemId:", selectedItemId);
    console.log("SIMPLE: unitPrice:", unitPrice);
    console.log("SIMPLE: quantity:", quantity);
    
    if (!selectedItemId || !unitPrice) {
      toast({
        title: "Error",
        description: "Please select an item and enter unit price",
        variant: "destructive",
      });
      return;
    }

    const selectedItem = items.find(item => item.id === parseInt(selectedItemId));
    if (!selectedItem) {
      console.log("SIMPLE: Selected item not found");
      return;
    }

    const totalPrice = (quantity * parseFloat(unitPrice)).toFixed(2);
    const newItem = {
      itemId: parseInt(selectedItemId),
      itemName: selectedItem.name,
      quantity,
      unitPrice,
      totalPrice
    };

    console.log("SIMPLE: Adding item:", newItem);
    const updatedItems = [...poItems, newItem];
    setPOItems(updatedItems);
    console.log("SIMPLE: Updated poItems:", updatedItems);

    // Reset form
    setSelectedItemId("");
    setQuantity(1);
    setUnitPrice("");
  };

  const handleSubmit = () => {
    console.log("SIMPLE: Submit clicked, items count:", poItems.length);
    console.log("SIMPLE: Items:", poItems);
    
    if (poItems.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one item",
        variant: "destructive",
      });
      return;
    }

    const totalAmount = poItems.reduce((sum, item) => sum + parseFloat(item.totalPrice), 0).toFixed(2);

    createPOMutation.mutate({
      supplierId: 1,
      expectedDeliveryDate: new Date().toISOString().split('T')[0],
      notes: "Test purchase order",
      taxAmount: "0.00",
      discountAmount: "0.00",
      totalAmount,
      items: poItems
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Purchase Order (Simple)</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add Item Section */}
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-3">Add Item</h3>
            
            <div className="grid grid-cols-4 gap-3 items-end">
              <div>
                <Label>Item</Label>
                <Select value={selectedItemId} onValueChange={setSelectedItemId}>
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
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                />
              </div>
              
              <div>
                <Label>Unit Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              
              <Button onClick={handleAddItem} type="button">
                Add Item
              </Button>
            </div>
          </div>

          {/* Items List */}
          {poItems.length > 0 && (
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-3">Purchase Order Items ({poItems.length})</h3>
              <div className="space-y-2">
                {poItems.map((item, index) => (
                  <div key={index} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                    <span>{item.itemName}</span>
                    <span>Qty: {item.quantity}</span>
                    <span>Price: £{item.unitPrice}</span>
                    <span>Total: £{item.totalPrice}</span>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => setPOItems(poItems.filter((_, i) => i !== index))}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={createPOMutation.isPending}>
              {createPOMutation.isPending ? "Creating..." : "Create Purchase Order"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}