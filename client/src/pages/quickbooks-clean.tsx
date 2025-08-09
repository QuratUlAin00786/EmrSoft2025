import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function QuickBooksClean() {
  const [invoiceData] = useState({
    patientName: "John Doe",
    invoiceNumber: `INV-${Date.now()}`,
    date: new Date().toLocaleDateString(),
    services: [
      { description: "General Consultation", quantity: 1, rate: 150.00, amount: 150.00 },
      { description: "Blood Test", quantity: 1, rate: 75.00, amount: 75.00 }
    ],
    total: 225.00
  });

  const generateInvoiceHTML = () => {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Invoice - ${invoiceData.invoiceNumber}</title>
    <style>
        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f8fafc;
            color: #1f2937;
        }
        .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            border-radius: 12px;
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            color: white;
            padding: 30px;
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
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 10px;
        }
        .logo img {
            width: 60px;
            height: 60px;
            object-fit: contain;
        }
        .company-info .company-name {
            font-size: 28px;
            font-weight: bold;
            margin: 0;
        }
        .company-info .company-tagline {
            font-size: 14px;
            opacity: 0.9;
            margin: 5px 0 0 0;
        }
        .invoice-title {
            font-size: 36px;
            font-weight: bold;
            text-align: right;
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
            font-size: 16px;
            font-weight: 600;
            color: #374151;
            margin-bottom: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .patient-name {
            font-size: 18px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 8px;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
        }
        .detail-label {
            color: #6b7280;
            font-weight: 500;
        }
        .detail-value {
            color: #111827;
            font-weight: 600;
        }
        .services-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            border-radius: 8px;
            overflow: hidden;
        }
        .services-table th {
            background: #3b82f6;
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: 600;
        }
        .services-table td {
            padding: 15px;
            border-bottom: 1px solid #e5e7eb;
        }
        .services-table tr:nth-child(even) {
            background: #f9fafb;
        }
        .total-row {
            text-align: right;
            padding: 20px 0;
            border-top: 2px solid #3b82f6;
        }
        .total-amount {
            font-size: 24px;
            font-weight: bold;
            color: #3b82f6;
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
                    <img src="/cura-logo.svg" alt="Cura Logo" />
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
                    <div class="patient-name">${invoiceData.patientName}</div>
                    <div style="color: #6b7280; font-size: 14px;">Patient ID: PAT-${Math.floor(Math.random() * 10000)}</div>
                </div>
                
                <div class="invoice-details">
                    <div class="section-title">Invoice Details</div>
                    <div class="detail-row">
                        <span class="detail-label">Invoice Number:</span>
                        <span class="detail-value">${invoiceData.invoiceNumber}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Invoice Date:</span>
                        <span class="detail-value">${invoiceData.date}</span>
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

            <table class="services-table">
                <thead>
                    <tr>
                        <th style="width: 50%;">Service Description</th>
                        <th style="width: 15%; text-align: center;">Quantity</th>
                        <th style="width: 17.5%; text-align: right;">Rate</th>
                        <th style="width: 17.5%; text-align: right;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${invoiceData.services.map(service => `
                        <tr>
                            <td>
                                <strong>${service.description}</strong>
                                <div style="color: #6b7280; font-size: 14px;">Professional medical consultation</div>
                            </td>
                            <td style="text-align: center;">${service.quantity}</td>
                            <td style="text-align: right;">$${service.rate.toFixed(2)}</td>
                            <td style="text-align: right;">$${service.amount.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="total-row">
                <div style="font-size: 18px; margin-bottom: 10px;">
                    <span>Subtotal: $${invoiceData.total.toFixed(2)}</span>
                </div>
                <div style="font-size: 18px; margin-bottom: 10px;">
                    <span>Tax (0%): $0.00</span>
                </div>
                <div class="total-amount">
                    Total: $${invoiceData.total.toFixed(2)}
                </div>
            </div>

            <div style="margin-top: 40px; padding: 20px; background: #f3f4f6; border-radius: 8px;">
                <h3 style="margin: 0 0 10px 0; color: #374151;">Thank you for choosing Cura Medical Practice!</h3>
                <p style="margin: 0; color: #6b7280;">For questions about this invoice, please contact our billing department at billing@cura.com or call (555) 123-4567.</p>
            </div>
        </div>
    </div>
</body>
</html>
    `;
  };

  const handleDownloadInvoice = () => {
    const htmlContent = generateInvoiceHTML();
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${invoiceData.invoiceNumber}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrintInvoice = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(generateInvoiceHTML());
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">QuickBooks Invoice Generator</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="font-semibold text-lg mb-4">Invoice Preview</h3>
              <div className="space-y-2">
                <p><span className="font-medium">Patient:</span> {invoiceData.patientName}</p>
                <p><span className="font-medium">Invoice Number:</span> {invoiceData.invoiceNumber}</p>
                <p><span className="font-medium">Date:</span> {invoiceData.date}</p>
                <p><span className="font-medium">Total:</span> ${invoiceData.total.toFixed(2)}</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Services</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 p-3 text-left">Description</th>
                      <th className="border border-gray-300 p-3 text-center">Qty</th>
                      <th className="border border-gray-300 p-3 text-right">Rate</th>
                      <th className="border border-gray-300 p-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceData.services.map((service, index) => (
                      <tr key={index}>
                        <td className="border border-gray-300 p-3">{service.description}</td>
                        <td className="border border-gray-300 p-3 text-center">{service.quantity}</td>
                        <td className="border border-gray-300 p-3 text-right">${service.rate.toFixed(2)}</td>
                        <td className="border border-gray-300 p-3 text-right">${service.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-4 justify-center pt-6">
              <Button onClick={handlePrintInvoice} className="bg-blue-600 hover:bg-blue-700">
                Print Invoice
              </Button>
              <Button onClick={handleDownloadInvoice} variant="outline">
                Download HTML
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}