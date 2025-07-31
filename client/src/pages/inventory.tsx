import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Minus, Package2 } from "lucide-react";

interface InventoryItem {
  id: string;
  name: string;
  stockLevel: number;
  minLevel: number;
}

export default function Inventory() {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([
    { id: "1", name: "Insert Name", stockLevel: 0, minLevel: 0 },
    { id: "2", name: "Example Drug", stockLevel: 5, minLevel: 2 }
  ]);

  const updateStockLevel = (id: string, change: number) => {
    setInventoryItems(items =>
      items.map(item =>
        item.id === id
          ? { ...item, stockLevel: Math.max(0, item.stockLevel + change) }
          : item
      )
    );
  };

  const updateMinLevel = (id: string, value: number) => {
    setInventoryItems(items =>
      items.map(item =>
        item.id === id
          ? { ...item, minLevel: Math.max(0, value) }
          : item
      )
    );
  };

  const updateItemName = (id: string, name: string) => {
    setInventoryItems(items =>
      items.map(item =>
        item.id === id ? { ...item, name } : item
      )
    );
  };

  const addNewItem = () => {
    const newItem: InventoryItem = {
      id: Date.now().toString(),
      name: "Insert Name",
      stockLevel: 0,
      minLevel: 0
    };
    setInventoryItems([...inventoryItems, newItem]);
  };

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Package2 className="h-8 w-8 text-blue-600" />
        <h1 className="text-3xl font-bold text-gray-900">Inventory</h1>
      </div>

      {/* Inventory Table */}
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Stock Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-black rounded-lg overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-3 bg-white border-b-2 border-black">
              <div className="p-4 border-r-2 border-black font-semibold text-center">Item</div>
              <div className="p-4 border-r-2 border-black font-semibold text-center">Stock Level</div>
              <div className="p-4 font-semibold text-center">Min Level</div>
            </div>

            {/* Table Rows */}
            {inventoryItems.map((item) => (
              <div key={item.id} className="grid grid-cols-3 border-b-2 border-black last:border-b-0">
                {/* Item Name */}
                <div className="p-4 border-r-2 border-black">
                  <Input
                    value={item.name}
                    onChange={(e) => updateItemName(item.id, e.target.value)}
                    className="border-0 text-center bg-transparent focus:ring-0 focus:border-0"
                    placeholder="Insert Name"
                  />
                </div>

                {/* Stock Level */}
                <div className="p-4 border-r-2 border-black flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateStockLevel(item.id, -1)}
                    className="h-8 w-8 p-0"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="min-w-[3rem] text-center font-medium">{item.stockLevel}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateStockLevel(item.id, 1)}
                    className="h-8 w-8 p-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Min Level */}
                <div className="p-4 flex items-center justify-center">
                  <Input
                    type="number"
                    value={item.minLevel}
                    onChange={(e) => updateMinLevel(item.id, parseInt(e.target.value) || 0)}
                    className="w-20 text-center border-gray-300"
                    min="0"
                  />
                </div>
              </div>
            ))}

            {/* Add More Row */}
            <div className="grid grid-cols-3">
              <div className="p-4 border-r-2 border-black flex items-center justify-center">
                <Button
                  onClick={addNewItem}
                  variant="ghost"
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                >
                  <Plus className="h-4 w-4" />
                  Add More
                </Button>
              </div>
              <div className="p-4 border-r-2 border-black"></div>
              <div className="p-4"></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Stock Section */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900">Order Stock</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Halo IV Supplier */}
          <Card className="border-2 border-gray-300 rounded-lg">
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <div className="text-2xl font-bold text-blue-600">halo IV</div>
                <div className="space-y-2 text-sm text-gray-700">
                  <div>• Prescription only medication</div>
                  <div>• IV / IM Vitamins</div>
                  <div>• Consumables</div>
                </div>
                <div className="pt-4">
                  <div className="text-sm text-gray-600">Hyperlink: www.haloiv.com</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SkinOnYou Supplier */}
          <Card className="border-2 border-gray-300 rounded-lg">
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <div className="text-2xl font-bold text-blue-600">skinONYOU</div>
                <div className="space-y-2 text-sm text-gray-700">
                  <div>• Botox</div>
                  <div>• Dermal Fillers</div>
                  <div>• Microneedling</div>
                  <div>• Exosomes</div>
                </div>
                <div className="pt-4">
                  <div className="text-sm text-gray-600">Hyperlink: www.skinonyou.com</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}