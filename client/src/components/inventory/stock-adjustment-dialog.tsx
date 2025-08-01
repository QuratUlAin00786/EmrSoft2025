import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface InventoryItem {
  id: number;
  name: string;
  sku: string;
  currentStock: number;
  unitOfMeasurement: string;
}

interface StockAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem | null;
}

export default function StockAdjustmentDialog({ open, onOpenChange, item }: StockAdjustmentDialogProps) {
  const [formData, setFormData] = useState({
    movementType: "",
    quantity: "",
    reason: "",
    notes: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const adjustStockMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!item) throw new Error("No item selected");
      
      await apiRequest("POST", "/api/inventory/stock-movements", {
        itemId: item.id,
        movementType: data.movementType,
        quantity: parseInt(data.quantity),
        reason: data.reason,
        notes: data.notes,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Stock adjustment has been recorded successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/reports/value"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/alerts"] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to adjust stock",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      movementType: "",
      quantity: "",
      reason: "",
      notes: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.movementType || !formData.quantity || !formData.reason) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const quantity = parseInt(formData.quantity);
    if (quantity <= 0) {
      toast({
        title: "Validation Error",
        description: "Quantity must be greater than 0.",
        variant: "destructive",
      });
      return;
    }

    // Check if we have enough stock for outbound movements
    if ((formData.movementType === "sale" || formData.movementType === "waste" || formData.movementType === "damaged") && 
        quantity > (item?.currentStock || 0)) {
      toast({
        title: "Insufficient Stock",
        description: `Cannot remove ${quantity} units. Only ${item?.currentStock || 0} units available.`,
        variant: "destructive",
      });
      return;
    }

    adjustStockMutation.mutate(formData);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getNewStockLevel = () => {
    if (!item || !formData.quantity || !formData.movementType) return item?.currentStock || 0;
    
    const quantity = parseInt(formData.quantity);
    const currentStock = item.currentStock;
    
    switch (formData.movementType) {
      case "purchase":
      case "return":
      case "adjustment_in":
        return currentStock + quantity;
      case "sale":
      case "waste":
      case "damaged":
      case "adjustment_out":
        return Math.max(0, currentStock - quantity);
      default:
        return currentStock;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Stock Level</DialogTitle>
          <DialogDescription>
            {item && (
              <>
                Update stock for <strong>{item.name}</strong> (SKU: {item.sku})
                <br />
                Current Stock: <strong>{item.currentStock} {item.unitOfMeasurement}</strong>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="movementType">Movement Type *</Label>
            <Select value={formData.movementType} onValueChange={(value) => handleInputChange("movementType", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select movement type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="purchase">Purchase (Stock In)</SelectItem>
                <SelectItem value="sale">Sale (Stock Out)</SelectItem>
                <SelectItem value="return">Return (Stock In)</SelectItem>
                <SelectItem value="waste">Waste/Expired (Stock Out)</SelectItem>
                <SelectItem value="damaged">Damaged (Stock Out)</SelectItem>
                <SelectItem value="adjustment_in">Manual Adjustment (In)</SelectItem>
                <SelectItem value="adjustment_out">Manual Adjustment (Out)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="quantity">Quantity *</Label>
            <Input
              id="quantity"
              type="number"
              value={formData.quantity}
              onChange={(e) => handleInputChange("quantity", e.target.value)}
              placeholder="Enter quantity"
              min="1"
              required
            />
          </div>

          <div>
            <Label htmlFor="reason">Reason *</Label>
            <Select value={formData.reason} onValueChange={(value) => handleInputChange("reason", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new_stock">New Stock Received</SelectItem>
                <SelectItem value="patient_sale">Sold to Patient</SelectItem>
                <SelectItem value="prescription_dispensed">Prescription Dispensed</SelectItem>
                <SelectItem value="expired">Expired Items</SelectItem>
                <SelectItem value="damaged_items">Damaged Items</SelectItem>
                <SelectItem value="stock_correction">Stock Count Correction</SelectItem>
                <SelectItem value="returned_by_patient">Returned by Patient</SelectItem>
                <SelectItem value="transferred_out">Transferred to Another Location</SelectItem>
                <SelectItem value="transferred_in">Transferred from Another Location</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              placeholder="Additional notes (optional)"
              rows={3}
            />
          </div>

          {formData.movementType && formData.quantity && (
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
              <p className="text-sm">
                <strong>New Stock Level:</strong> {getNewStockLevel()} {item?.unitOfMeasurement}
              </p>
              {formData.movementType.includes("out") || formData.movementType === "sale" || 
               formData.movementType === "waste" || formData.movementType === "damaged" ? (
                <p className="text-sm text-red-600 dark:text-red-400">
                  Stock will decrease by {formData.quantity}
                </p>
              ) : (
                <p className="text-sm text-green-600 dark:text-green-400">
                  Stock will increase by {formData.quantity}
                </p>
              )}
            </div>
          )}
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            onClick={handleSubmit}
            disabled={adjustStockMutation.isPending}
          >
            {adjustStockMutation.isPending ? "Adjusting..." : "Adjust Stock"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}