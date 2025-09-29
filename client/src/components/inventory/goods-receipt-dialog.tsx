import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
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

// Validation schema for goods receipt form
const goodsReceiptSchema = z.object({
  purchaseOrderId: z.number().min(1, "Purchase order is required"),
  receivedDate: z.string().min(1, "Received date is required"),
  notes: z.string().optional(),
});

// Validation schema for adding new items
const addItemSchema = z.object({
  itemId: z.string().min(1, "Item selection is required"),
  quantityReceived: z.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.string().min(1, "Unit price is required").regex(/^\d+(\.\d{1,2})?$/, "Invalid price format"),
  batchNumber: z.string().min(1, "Batch number is required"),
  expiryDate: z.string().optional(),
  manufacturingDate: z.string().optional(),
});

type GoodsReceiptFormData = z.infer<typeof goodsReceiptSchema>;
type AddItemFormData = z.infer<typeof addItemSchema>;

export default function GoodsReceiptDialog({ open, onOpenChange, items }: GoodsReceiptDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([]);
  
  // Main form for receipt details
  const form = useForm<GoodsReceiptFormData>({
    resolver: zodResolver(goodsReceiptSchema),
    defaultValues: {
      purchaseOrderId: 1,
      receivedDate: new Date().toISOString().split('T')[0],
      notes: "",
    },
  });
  
  // Form for adding new items
  const addItemForm = useForm<AddItemFormData>({
    resolver: zodResolver(addItemSchema),
    defaultValues: {
      itemId: "",
      quantityReceived: 1,
      unitPrice: "",
      batchNumber: "",
      expiryDate: "",
      manufacturingDate: ""
    },
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
    form.reset();
    addItemForm.reset();
    setReceiptItems([]);
  };

  const addItem = (data: AddItemFormData) => {
    const selectedItem = items.find(item => item.id === parseInt(data.itemId));
    if (!selectedItem) return;

    const receiptItem: ReceiptItem = {
      itemId: parseInt(data.itemId),
      itemName: selectedItem.name,
      quantityReceived: data.quantityReceived,
      unitPrice: data.unitPrice,
      batchNumber: data.batchNumber,
      expiryDate: data.expiryDate || "",
      manufacturingDate: data.manufacturingDate || ""
    };

    setReceiptItems([...receiptItems, receiptItem]);
    addItemForm.reset();
  };

  const removeItem = (index: number) => {
    setReceiptItems(receiptItems.filter((_, i) => i !== index));
  };

  const calculateTotalAmount = () => {
    return receiptItems.reduce((sum, item) => sum + (item.quantityReceived * parseFloat(item.unitPrice)), 0).toFixed(2);
  };

  const handleSubmit = (data: GoodsReceiptFormData) => {
    if (receiptItems.length === 0) {
      form.setError("root", {
        type: "manual",
        message: "Please add at least one item to the receipt"
      });
      return;
    }

    // Map receipt items to backend expected format
    const mappedItems = receiptItems.map(item => ({
      itemId: item.itemId,
      quantityReceived: item.quantityReceived,
      batchNumber: item.batchNumber || undefined,
      expiryDate: item.expiryDate || undefined
    }));

    createReceiptMutation.mutate({
      purchaseOrderId: data.purchaseOrderId,
      receivedDate: data.receivedDate,
      notes: data.notes,
      items: mappedItems
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Goods Receipt</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="purchaseOrderId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purchase Order</FormLabel>
                      <FormControl>
                        <Select value={field.value.toString()} onValueChange={(value) => field.onChange(parseInt(value))}>
                          <SelectTrigger data-testid="select-purchase-order">
                            <SelectValue placeholder="Select purchase order" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">PO-001</SelectItem>
                            <SelectItem value="2">PO-002</SelectItem>
                            <SelectItem value="3">PO-003</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="receivedDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Received Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          data-testid="input-received-date"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          data-testid="textarea-notes"
                          placeholder="Additional notes about this goods receipt..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Add Items Section */}
              <Form {...addItemForm}>
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-3">Add Received Items</h3>
                  <div className="grid grid-cols-7 gap-3 items-end">
                    <FormField
                      control={addItemForm.control}
                      name="itemId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Item</FormLabel>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger data-testid="select-item">
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
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addItemForm.control}
                      name="quantityReceived"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              data-testid="input-quantity"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addItemForm.control}
                      name="unitPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit Price</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              data-testid="input-unit-price"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addItemForm.control}
                      name="batchNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Batch Number</FormLabel>
                          <FormControl>
                            <Input
                              data-testid="input-batch-number"
                              placeholder="Batch #"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addItemForm.control}
                      name="expiryDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expiry Date</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              data-testid="input-expiry-date"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addItemForm.control}
                      name="manufacturingDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mfg Date</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              data-testid="input-manufacturing-date"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="button" 
                      onClick={addItemForm.handleSubmit(addItem)}
                      data-testid="button-add-item"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Form>

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
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        data-testid="textarea-notes"
                        placeholder="Additional notes about the delivery"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Form-level error message */}
              {form.formState.errors.root && (
                <div className="text-red-600 text-sm" data-testid="error-form-root">
                  {form.formState.errors.root.message}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createReceiptMutation.isPending}
                  data-testid="button-submit"
                >
                  {createReceiptMutation.isPending ? "Creating..." : "Create Goods Receipt"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}