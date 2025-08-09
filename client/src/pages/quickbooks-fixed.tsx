import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, FileText, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface InvoiceData {
  invoiceNumber: string;
  patientName: string;
  date: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
}

export default function QuickBooks() {
  const { toast } = useToast();
  
  const [invoice, setInvoice] = useState<InvoiceData>({
    invoiceNumber: `INV-${Date.now()}`,
    patientName: "",
    date: new Date().toISOString().split('T')[0],
    items: [{
      id: "1",
      description: "General Consultation",
      quantity: 1,
      rate: 150,
      amount: 150
    }],
    subtotal: 150,
    tax: 0,
    total: 150
  });

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      description: "",
      quantity: 1,
      rate: 0,
      amount: 0
    };
    setInvoice(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setInvoice(prev => {
      const updatedItems = prev.items.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          if (field === 'quantity' || field === 'rate') {
            updatedItem.amount = updatedItem.quantity * updatedItem.rate;
          }
          return updatedItem;
        }
        return item;
      });

      const subtotal = updatedItems.reduce((sum, item) => sum + item.amount, 0);
      const total = subtotal + prev.tax;

      return {
        ...prev,
        items: updatedItems,
        subtotal,
        total
      };
    });
  };

  const removeItem = (id: string) => {
    setInvoice(prev => {
      const updatedItems = prev.items.filter(item => item.id !== id);
      const subtotal = updatedItems.reduce((sum, item) => sum + item.amount, 0);
      const total = subtotal + prev.tax;

      return {
        ...prev,
        items: updatedItems,
        subtotal,
        total
      };
    });
  };

  const generateInvoice = () => {
    const invoiceHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice - ${invoice.invoiceNumber}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background: #f9fafb;
            color: #374151;
        }
        .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
            border-radius: 12px;
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            color: white;
            padding: 40px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .logo-section {
            display: flex;
            align-items: center;
            gap: 20px;
        }
        .logo {
            width: 80px;
            height: 80px;
            background: white;
            border-radius: 16px;
            padding: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .company-info {
            flex: 1;
        }
        .company-name {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
        }
        .company-tagline {
            font-size: 16px;
            opacity: 0.9;
        }
        .invoice-title {
            font-size: 48px;
            font-weight: 800;
            letter-spacing: 2px;
        }
        .content {
            padding: 40px;
        }
        .invoice-meta {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-bottom: 40px;
        }
        .section-title {
            font-size: 18px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 15px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .patient-name {
            font-size: 20px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 5px;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
        }
        .detail-label {
            font-weight: 500;
            color: #6b7280;
        }
        .detail-value {
            font-weight: 600;
            color: #111827;
        }
        .company-info {
            font-size: 14px;
            color: #6b7280;
            line-height: 1.6;
        }
        .payment-info {
            background: #dbeafe;
            border: 1px solid #bfdbfe;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
        }
        .payment-title {
            font-weight: 600;
            color: #1e40af;
            margin-bottom: 10px;
        }
        @media print {
            body { background: white; padding: 0; }
            .invoice-container { box-shadow: none; border-radius: 0; }
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <div class="header">
            <div class="logo-section">
                <div class="logo">
                    <img src="/cura-logo.svg" alt="Cura Logo" style="width: 80px; height: 80px; object-fit: contain;" />
                </div>
                <div class="company-info">
                    <div class="company-name">Cura Medical Practice</div>
                    <div class="company-tagline">Excellence in Healthcare • Powered by Halo Group</div>
                </div>
            </div>
            <div class="invoice-title">INVOICE</div>
        </div>
        
        <div class="content">
            <div class="invoice-meta">
                <div class="bill-to">
                    <div class="section-title">Bill To</div>
                    <div class="patient-name">${invoice.patientName}</div>
                    <div style="color: #6b7280; font-size: 14px;">Patient ID: PAT-${Math.floor(Math.random() * 10000)}</div>
                </div>
                
                <div class="invoice-details">
                    <div class="section-title">Invoice Details</div>
                    <div class="detail-row">
                        <span class="detail-label">Invoice Number:</span>
                        <span class="detail-value">${invoice.invoiceNumber}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Invoice Date:</span>
                        <span class="detail-value">${invoice.date}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Due Date:</span>
                        <span class="detail-value">${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Payment Terms:</span>
                        <span class="detail-value">Net 30</span>
                    </div>
                </div>
            </div>

            <div class="payment-info">
                <div class="payment-title">Payment Information</div>
                <div>Multiple payment options available: Credit Card, Bank Transfer, PayPal, or Cash</div>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);">
                <thead>
                    <tr style="background: #4f46e5; color: white;">
                        <th style="padding: 15px; text-align: left; font-weight: 600;">Service Description</th>
                        <th style="padding: 15px; text-align: center; font-weight: 600;">Quantity</th>
                        <th style="padding: 15px; text-align: right; font-weight: 600;">Rate</th>
                        <th style="padding: 15px; text-align: right; font-weight: 600;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${invoice.items.map((item, index) => `
                        <tr style="border-bottom: 1px solid #e5e7eb; ${index % 2 === 0 ? 'background: #f9fafb;' : 'background: white;'}">
                            <td style="padding: 15px;">
                                <div style="font-weight: 600; margin-bottom: 4px;">${item.description}</div>
                                <div style="font-size: 12px; color: #6b7280;">Professional medical consultation</div>
                            </td>
                            <td style="padding: 15px; text-align: center; font-weight: 500;">${item.quantity}</td>
                            <td style="padding: 15px; text-align: right; font-weight: 500;">$${item.rate.toFixed(2)}</td>
                            <td style="padding: 15px; text-align: right; font-weight: 600; color: #059669;">$${item.amount.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div style="display: flex; justify-content: flex-end;">
                <div style="width: 300px;">
                    <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                        <span style="font-weight: 500;">Subtotal:</span>
                        <span style="font-weight: 600;">$${invoice.subtotal.toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                        <span style="font-weight: 500;">Tax:</span>
                        <span style="font-weight: 600;">$${invoice.tax.toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 15px 0; background: #4f46e5; color: white; margin-top: 10px; padding-left: 20px; padding-right: 20px; border-radius: 8px;">
                        <span style="font-weight: 700; font-size: 18px;">Total:</span>
                        <span style="font-weight: 800; font-size: 20px;">$${invoice.total.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            <div style="margin-top: 40px; padding: 20px; background: #f9fafb; border-radius: 8px; border-left: 4px solid #4f46e5;">
                <h3 style="margin: 0 0 10px 0; color: #4f46e5;">Thank You for Choosing Cura Medical Practice</h3>
                <p style="margin: 0; color: #6b7280; font-size: 14px;">
                    Your health and well-being are our top priorities. If you have any questions about this invoice or need to schedule a follow-up appointment, please don't hesitate to contact our billing department at (555) 123-4567 or billing@curamedical.com.
                </p>
            </div>

            <div style="margin-top: 30px; text-align: center; color: #9ca3af; font-size: 12px;">
                <p>Cura Medical Practice | 123 Healthcare Ave, Medical City, MC 12345 | Phone: (555) 123-4567</p>
                <p>This invoice was generated electronically and is valid without signature.</p>
            </div>
        </div>
    </div>
</body>
</html>`;

    const blob = new Blob([invoiceHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `invoice-${invoice.invoiceNumber}.html`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Invoice Generated",
      description: "Your invoice has been downloaded successfully.",
    });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Invoice Generator</h1>
          <p className="text-gray-600 mt-2">Create and manage patient invoices</p>
        </div>
        <Button onClick={generateInvoice} className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          Generate Invoice
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Invoice Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invoiceNumber">Invoice Number</Label>
                <Input
                  id="invoiceNumber"
                  value={invoice.invoiceNumber}
                  onChange={(e) => setInvoice(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={invoice.date}
                  onChange={(e) => setInvoice(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="patientName">Patient Name</Label>
              <Input
                id="patientName"
                value={invoice.patientName}
                onChange={(e) => setInvoice(prev => ({ ...prev, patientName: e.target.value }))}
                placeholder="Enter patient name"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoice Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-semibold">${invoice.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax:</span>
                <span className="font-semibold">${invoice.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-3">
                <span>Total:</span>
                <span>${invoice.total.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Service Items</CardTitle>
            <Button onClick={addItem} variant="outline" size="sm" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {invoice.items.map((item) => (
              <div key={item.id} className="grid grid-cols-12 gap-4 items-end p-4 border rounded-lg">
                <div className="col-span-5">
                  <Label>Description</Label>
                  <Input
                    value={item.description}
                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                    placeholder="Service description"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                    min="1"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Rate ($)</Label>
                  <Input
                    type="number"
                    value={item.rate}
                    onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Amount</Label>
                  <div className="text-lg font-semibold p-2">
                    ${item.amount.toFixed(2)}
                  </div>
                </div>
                <div className="col-span-1">
                  {invoice.items.length > 1 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeItem(item.id)}
                    >
                      ×
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}