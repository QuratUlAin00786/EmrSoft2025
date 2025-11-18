import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Crown, Users, Calendar, Zap, Check, X, Package, Heart, Brain, Shield, Stethoscope, Phone, FileText, Activity, Pill, UserCheck, TrendingUp, Download, CreditCard, CheckCircle2, Eye } from "lucide-react";
import { PaymentMethodDialog } from "@/components/payment-method-dialog";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/context/currency-context";
import { formatCurrency } from "@/utils/currency";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Subscription } from "@/types";
import type { SaaSPackage } from "@shared/schema";
import jsPDF from "jspdf";

// Plans are now fetched from database - see dbPackages query below

// Helper function to map package names to icons
const getPackageIcon = (name: string) => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('telehealth') || lowerName.includes('video') || lowerName.includes('phone')) return Phone;
  if (lowerName.includes('ai') || lowerName.includes('brain') || lowerName.includes('clinical')) return Brain;
  if (lowerName.includes('cardio') || lowerName.includes('heart')) return Heart;
  if (lowerName.includes('pharmacy') || lowerName.includes('drug') || lowerName.includes('medication')) return Pill;
  if (lowerName.includes('analytics') || lowerName.includes('reporting') || lowerName.includes('activity')) return Activity;
  if (lowerName.includes('patient') || lowerName.includes('portal')) return UserCheck;
  if (lowerName.includes('security') || lowerName.includes('hipaa') || lowerName.includes('compliance')) return Shield;
  if (lowerName.includes('specialty') || lowerName.includes('stethoscope')) return Stethoscope;
  if (lowerName.includes('document') || lowerName.includes('file')) return FileText;
  return Package; // Default icon
};

// Helper function to convert database features to array of strings
const formatPackageFeatures = (features: any): string[] => {
  if (!features) return [];
  
  const featureList: string[] = [];
  
  if (features.maxUsers) featureList.push(`Up to ${features.maxUsers} users`);
  if (features.maxPatients) featureList.push(`Up to ${features.maxPatients} patients`);
  if (features.aiEnabled) featureList.push('AI-powered insights');
  if (features.telemedicineEnabled) featureList.push('Telemedicine support');
  if (features.billingEnabled) featureList.push('Advanced billing');
  if (features.analyticsEnabled) featureList.push('Analytics & reporting');
  if (features.customBranding) featureList.push('Custom branding');
  if (features.prioritySupport) featureList.push('Priority support');
  if (features.storageGB) featureList.push(`${features.storageGB}GB storage`);
  if (features.apiCallsPerMonth) featureList.push(`${features.apiCallsPerMonth.toLocaleString()} API calls/month`);
  
  return featureList;
};

export default function Subscription() {
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showCurrentPlanDialog, setShowCurrentPlanDialog] = useState(false);
  const [currentPlanData, setCurrentPlanData] = useState<any>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'ryft' | 'paypal' | 'stripe'>('ryft');
  const [showBillingPaymentDialog, setShowBillingPaymentDialog] = useState(false);
  const [selectedBillingPayment, setSelectedBillingPayment] = useState<any>(null);
  const [paymentCardType, setPaymentCardType] = useState<'debit' | 'credit' | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successPaymentDetails, setSuccessPaymentDetails] = useState<{
    amount: string;
    currency: string;
    transactionId: string;
  } | null>(null);
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: ''
  });
  const { toast } = useToast();
  const { currency, symbol } = useCurrency();
  
  const { data: subscription, isLoading, error } = useQuery<Subscription>({
    queryKey: ["/api/subscription"],
  });

  // Fetch current user's organization data
  const { data: organizationData } = useQuery<any>({
    queryKey: ["/api/organization/current"],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const subdomain = localStorage.getItem('user_subdomain') || 'demo';
      const headers: Record<string, string> = {
        'X-Tenant-Subdomain': subdomain
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch("/api/organization/current", {
        credentials: "include",
        headers
      });
      if (!res.ok) throw new Error('Failed to fetch organization');
      return res.json();
    }
  });

  const { data: dbPackages = [], isLoading: packagesLoading } = useQuery<SaaSPackage[]>({
    queryKey: ["/api/website/packages"],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const subdomain = localStorage.getItem('user_subdomain') || 'demo';
      const headers: Record<string, string> = {
        'X-Tenant-Subdomain': subdomain
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch("/api/website/packages", {
        credentials: "include",
        headers
      });
      if (!res.ok) throw new Error('Failed to fetch packages');
      return res.json();
    }
  });

  // Fetch billing history
  const { data: billingHistory = [], isLoading: billingLoading } = useQuery<any[]>({
    queryKey: ["/api/billing-history"],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const subdomain = localStorage.getItem('user_subdomain') || 'demo';
      const headers: Record<string, string> = {
        'X-Tenant-Subdomain': subdomain
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch("/api/billing-history", {
        credentials: "include",
        headers
      });
      if (!res.ok) throw new Error('Failed to fetch billing history');
      return res.json();
    }
  });

  // Handle payment processing
  const handleProcessPayment = async () => {
    if (!selectedBillingPayment) return;

    // Validate card details
    if (!cardDetails.cardNumber || !cardDetails.expiryDate || !cardDetails.cvv || !cardDetails.cardholderName) {
      toast({
        title: "Validation Error",
        description: "Please fill in all card details.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessingPayment(true);

    try {
      // Simulate Stripe payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generate a transaction ID (in real implementation, this would come from Stripe)
      const providerTransactionId = `stripe_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

      // Update payment status in database
      await apiRequest(
        'POST',
        `/api/billing-history/${selectedBillingPayment.id}/mark-paid`,
        { providerTransactionId }
      );

      // Store payment details for success modal
      setSuccessPaymentDetails({
        amount: parseFloat(selectedBillingPayment.amount).toFixed(2),
        currency: selectedBillingPayment.currency,
        transactionId: providerTransactionId
      });

      // Invalidate billing history to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/billing-history"] });

      // Close payment dialog and show success modal
      setShowBillingPaymentDialog(false);
      setPaymentCardType(null);
      setCardDetails({
        cardNumber: '',
        expiryDate: '',
        cvv: '',
        cardholderName: ''
      });
      
      // Show success modal
      setShowSuccessModal(true);
    } catch (error: any) {
      toast({
        title: "Payment Failed",
        description: error.message || "An error occurred during payment processing.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Generate invoice PDF matching SaaS billing format
  const generateInvoicePDF = (payment: any, viewOnly: boolean = false) => {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const marginLeft = 15;
    const marginRight = 15;
    let yPosition = 20;

    // Company header with logo placeholder and name
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('EMRSoft Software Limited', marginLeft, yPosition);
    yPosition += 6;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Healthcare Management Solutions', marginLeft, yPosition);

    // Invoice title (top right)
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text('INVOICE', pageWidth - marginRight, 20, { align: 'right' });
    
    // Invoice details (top right)
    yPosition = 28;
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Invoice #${payment.invoiceNumber}`, pageWidth - marginRight, yPosition, { align: 'right' });
    yPosition += 5;
    const invoiceDate = payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    pdf.text(`Date: ${invoiceDate}`, pageWidth - marginRight, yPosition, { align: 'right' });
    yPosition += 5;
    const dueDate = new Date(payment.periodEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    pdf.text(`Due: ${dueDate}`, pageWidth - marginRight, yPosition, { align: 'right' });

    yPosition = 45;

    // From section
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('From:', marginLeft, yPosition);
    yPosition += 6;
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('EMRSoft Software Limited', marginLeft, yPosition);
    yPosition += 5;
    pdf.setFont('helvetica', 'normal');
    pdf.text('Company Registration: 16556912', marginLeft, yPosition);
    yPosition += 5;
    pdf.text('45 Blue Area, G-6/3, Islamabad, Pakistan', marginLeft, yPosition);
    yPosition += 7;
    pdf.text('Email: billing@emrsoft.ai', marginLeft, yPosition);
    yPosition += 5;
    pdf.text('Phone: +92 51 2345 6789', marginLeft, yPosition);

    // Bill To section (right side)
    const billToX = pageWidth / 2 + 5;
    yPosition = 45;
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Bill To:', billToX, yPosition);
    yPosition += 6;
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    const orgName = organizationData?.name || 'Healthcare Organization';
    pdf.text(orgName, billToX, yPosition);
    yPosition += 5;
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${orgName}`, billToX, yPosition);
    yPosition += 5;
    pdf.text('Healthcare Organization', billToX, yPosition);
    yPosition += 5;
    pdf.text('United Kingdom', billToX, yPosition);

    // Payment Status and Method box
    yPosition += 7;
    pdf.setFillColor(249, 250, 251);
    pdf.rect(billToX - 2, yPosition - 3, pageWidth - billToX - marginRight + 2, 18, 'F');
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Payment Status:', billToX, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(payment.paymentStatus.charAt(0).toUpperCase() + payment.paymentStatus.slice(1), billToX + 35, yPosition);
    yPosition += 6;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Payment Method:', billToX, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(payment.paymentMethod.replace('_', ' ').charAt(0).toUpperCase() + payment.paymentMethod.replace('_', ' ').slice(1), billToX + 35, yPosition);

    // Line separator
    yPosition = 110;
    pdf.setDrawColor(229, 231, 235);
    pdf.line(marginLeft, yPosition, pageWidth - marginRight, yPosition);

    // Invoice items table
    yPosition += 10;
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Description', marginLeft, yPosition);
    pdf.text('Qty', pageWidth - 110, yPosition, { align: 'right' });
    pdf.text('Unit Price', pageWidth - 70, yPosition, { align: 'right' });
    pdf.text('Total', pageWidth - marginRight, yPosition, { align: 'right' });
    
    yPosition += 2;
    pdf.setDrawColor(229, 231, 235);
    pdf.line(marginLeft, yPosition, pageWidth - marginRight, yPosition);
    
    yPosition += 7;
    pdf.setFont('helvetica', 'normal');
    pdf.text('Payment for EMRSoft Services', marginLeft, yPosition);
    pdf.text('1', pageWidth - 110, yPosition, { align: 'right' });
    const subtotal = parseFloat(payment.amount);
    pdf.text(formatCurrency(subtotal, currency), pageWidth - 70, yPosition, { align: 'right' });
    pdf.text(formatCurrency(subtotal, currency), pageWidth - marginRight, yPosition, { align: 'right' });

    yPosition += 3;
    pdf.setDrawColor(243, 244, 246);
    pdf.line(marginLeft, yPosition, pageWidth - marginRight, yPosition);

    // Totals section with grey background
    yPosition += 10;
    const totalsX = pageWidth - 95;
    const totalsBoxHeight = 35;
    pdf.setFillColor(249, 250, 251);
    pdf.rect(totalsX - 5, yPosition - 5, 80, totalsBoxHeight, 'F');
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Subtotal:', totalsX, yPosition);
    pdf.text(formatCurrency(subtotal, currency), pageWidth - marginRight, yPosition, { align: 'right' });
    
    yPosition += 6;
    const vatAmount = subtotal * 0.20;
    pdf.text('VAT (20%):', totalsX, yPosition);
    pdf.text(formatCurrency(vatAmount, currency), pageWidth - marginRight, yPosition, { align: 'right' });
    
    yPosition += 3;
    pdf.setDrawColor(229, 231, 235);
    pdf.line(totalsX, yPosition, pageWidth - marginRight, yPosition);
    
    yPosition += 7;
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    const totalAmount = subtotal + vatAmount;
    pdf.text('Total Amount:', totalsX, yPosition);
    pdf.text(formatCurrency(totalAmount, currency), pageWidth - marginRight, yPosition, { align: 'right' });

    // Payment Information section
    yPosition += 15;
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Payment Information', marginLeft, yPosition);
    yPosition += 6;
    
    pdf.setFillColor(239, 246, 255);
    pdf.rect(marginLeft - 2, yPosition - 3, 85, 28, 'F');
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Bank Transfer Details:', marginLeft, yPosition);
    yPosition += 5;
    pdf.setFont('helvetica', 'normal');
    pdf.text('Account Name: EMRSoft Software Limited', marginLeft, yPosition);
    yPosition += 5;
    pdf.text('Sort Code: 12-34-56', marginLeft, yPosition);
    yPosition += 5;
    pdf.text('Account Number: 12345678', marginLeft, yPosition);
    yPosition += 5;
    pdf.text(`Reference: ${payment.invoiceNumber}`, marginLeft, yPosition);

    // Payment Terms section (right side)
    const termsX = billToX;
    yPosition -= 20;
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Payment Terms', termsX, yPosition);
    yPosition += 6;
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text('• Payment is due within 30 days of invoice date', termsX, yPosition);
    yPosition += 5;
    pdf.text('• Late payment charges may apply', termsX, yPosition);
    yPosition += 5;
    pdf.text('• For questions, contact billing@emrsoft.ai', termsX, yPosition);
    yPosition += 5;
    pdf.text('• Online payments available via customer portal', termsX, yPosition);

    // Line separator before footer
    yPosition = pageHeight - 35;
    pdf.setDrawColor(229, 231, 235);
    pdf.line(marginLeft, yPosition, pageWidth - marginRight, yPosition);

    // Footer
    yPosition += 7;
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text('EMRSoft Software Limited • Company Registration: 16556912', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 5;
    pdf.text('VAT Registration Number: GB123 4567 89 • www.emrsoft.ai', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 7;
    pdf.text('Thank you for choosing EMRSoft for your healthcare management needs.', pageWidth / 2, yPosition, { align: 'center' });

    if (viewOnly) {
      // Open PDF in new window for viewing
      const pdfBlob = pdf.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, '_blank');
    } else {
      // Download PDF
      pdf.save(`invoice-${payment.invoiceNumber}.pdf`);
    }
  };

  // Split packages into subscription plans (have maxUsers) and add-ons (don't have maxUsers)
  const dbPlans = dbPackages.filter(pkg => pkg.features?.maxUsers);
  const dbAddons = dbPackages.filter(pkg => !pkg.features?.maxUsers);

  // Transform database plans to component format for "Available Plans" section
  const plans = dbPlans.map(pkg => ({
    id: pkg.id.toString(),
    name: pkg.name,
    price: parseFloat(pkg.price),
    userLimit: pkg.features?.maxUsers || 0,
    popular: pkg.name.toLowerCase().includes('professional') || pkg.name.toLowerCase().includes('pro'),
    features: formatPackageFeatures(pkg.features),
    notIncluded: [] as string[] // Database doesn't store not-included features
  }));

  // Transform database add-ons to component format for "Add-on Packages" section
  const packages = dbAddons.map(pkg => ({
    id: pkg.id.toString(),
    name: pkg.name,
    price: parseFloat(pkg.price),
    icon: getPackageIcon(pkg.name),
    description: pkg.description || '',
    features: formatPackageFeatures(pkg.features)
  }));

  if (isLoading || packagesLoading) {
    return (
      <>
        <Header 
          title="Subscription" 
          subtitle="Manage your subscription and billing."
        />
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </>
    );
  }

  return (
    <>
      <Header 
        title="Subscription" 
        subtitle="Manage your subscription and billing."
      />
      
      <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Current Subscription */}
          {subscription && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Crown className="h-5 w-5 text-primary" />
                  <span>Current Subscription</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Zap className="h-4 w-4" />
                      <span>Active Plan</span>
                    </div>
                    <p className="text-2xl font-bold capitalize">
                      {subscription.plan}
                    </p>
                    <Badge 
                      variant={
                        subscription.status === 'active' 
                          ? "default" 
                          : subscription.status === 'trial'
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>User Capacity</span>
                    </div>
                    <p className="text-2xl font-bold">
                      {subscription.currentUsers} <span className="text-lg text-muted-foreground">/ {subscription.userLimit}</span>
                    </p>
                    <div className="relative w-full bg-secondary rounded-full h-2">
                      <div 
                        className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all duration-500" 
                        style={{ 
                          width: `${Math.min((subscription.currentUsers / subscription.userLimit) * 100, 100)}%` 
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {subscription.status === 'trial' ? 'Trial Period' : 'Billing Cycle'}
                      </span>
                    </div>
                    <p className="text-xl font-bold">
                      {subscription.status === 'trial' 
                        ? new Date(subscription.trialEndsAt!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : subscription.nextBillingAt 
                        ? new Date(subscription.nextBillingAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : "—"
                      }
                    </p>
                    {subscription.monthlyPrice && (
                      <p className="text-sm text-muted-foreground">
                        <span className="text-xl font-bold text-primary">{formatCurrency(subscription.monthlyPrice, currency)}</span>/month
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Available Plans */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">Available Plans</h3>
                <p className="text-sm text-muted-foreground mt-1">Select a plan that fits your practice needs</p>
              </div>
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <Card 
                  key={plan.id} 
                  className={plan.popular ? "border-primary" : ""}
                >
                  {plan.popular && (
                    <div className="px-4 py-2 bg-primary/10 border-b">
                      <Badge variant="default">
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader className="text-center">
                    <CardTitle className="text-xl mb-2">{plan.name}</CardTitle>
                    <div className="space-y-2">
                      <div>
                        <span className="text-4xl font-bold text-primary">
                          {formatCurrency(plan.price, currency)}
                        </span>
                        <span className="text-sm text-muted-foreground ml-2">/month</span>
                      </div>
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-secondary rounded-full">
                        <Users className="h-3 w-3" />
                        <span className="text-xs font-medium">Up to {plan.userLimit} users</span>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      {plan.features.map((feature, index) => (
                        <div key={index} className="flex items-start space-x-2">
                          <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="text-sm">{feature}</span>
                        </div>
                      ))}
                      
                      {plan.notIncluded.map((feature, index) => (
                        <div key={index} className="flex items-start space-x-2 opacity-50">
                          <X className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                          <span className="text-sm line-through">{feature}</span>
                        </div>
                      ))}
                    </div>
                    
                    <Button 
                      className="w-full"
                      variant={plan.popular ? "default" : "outline"}
                      onClick={() => {
                        if (subscription?.plan === plan.id) {
                          setCurrentPlanData(plan);
                          setShowCurrentPlanDialog(true);
                        } else {
                          setSelectedPlan(plan);
                          setShowPaymentDialog(true);
                        }
                      }}
                      data-testid={`button-plan-${plan.id}`}
                    >
                      {subscription?.plan === plan.id 
                        ? "Current Plan" 
                        : subscription?.status === 'trial' 
                        ? "Start Free Trial"
                        : "Upgrade Now"
                      }
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Add-on Packages */}
          {packages.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">Add-on Packages</h3>
                  <p className="text-sm text-muted-foreground mt-1">Extend your capabilities with specialized modules</p>
                </div>
                <Package className="h-5 w-5 text-primary" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {packages.map((pkg) => {
                  const IconComponent = pkg.icon;
                  return (
                    <Card key={pkg.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between mb-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <IconComponent className="h-5 w-5 text-primary" />
                          </div>
                          <div className="text-right">
                            <div className="flex items-baseline justify-end gap-1">
                              <span className="text-2xl font-bold text-primary">{formatCurrency(pkg.price, currency)}</span>
                              <span className="text-xs text-muted-foreground">/mo</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h3 className="font-bold text-lg mb-1">{pkg.name}</h3>
                          <p className="text-sm text-muted-foreground">{pkg.description}</p>
                        </div>
                      </CardHeader>
                      
                      <CardContent>
                        <div className="space-y-2 mb-4">
                          {pkg.features.map((feature, index) => (
                            <div key={index} className="flex items-start space-x-2">
                              <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                              <span className="text-sm">{feature}</span>
                            </div>
                          ))}
                        </div>
                        
                        <Button 
                          className="w-full"
                          onClick={() => {
                            console.log('Selected package:', pkg.id);
                          }}
                        >
                          <Package className="h-4 w-4 mr-2" />
                          Add to Plan
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Billing History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <span>Billing History</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {billingLoading ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : billingHistory.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h4 className="text-lg font-semibold mb-2">No billing history yet</h4>
                  <p className="text-sm text-muted-foreground">
                    Billing records will appear here once your subscription becomes active.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Invoice</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Method</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Period</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {billingHistory.map((payment: any) => (
                        <tr key={payment.id} className="hover:bg-muted/50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">{payment.invoiceNumber}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Pending'}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-semibold">
                              {payment.currency} {parseFloat(payment.amount).toFixed(2)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Badge 
                              variant={
                                payment.paymentStatus === 'completed' ? 'default' :
                                payment.paymentStatus === 'pending' ? 'secondary' :
                                payment.paymentStatus === 'failed' ? 'destructive' :
                                'outline'
                              }
                            >
                              {payment.paymentStatus}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm capitalize">
                            {payment.paymentMethod.replace('_', ' ')}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {new Date(payment.periodStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(payment.periodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => generateInvoicePDF(payment, true)}
                                data-testid={`button-view-invoice-${payment.id}`}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => generateInvoicePDF(payment, false)}
                                data-testid={`button-download-invoice-${payment.id}`}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Invoice
                              </Button>
                              {payment.paymentStatus === 'pending' && (
                                <Button 
                                  variant="default" 
                                  size="sm"
                                  onClick={() => {
                                    setSelectedBillingPayment(payment);
                                    setShowBillingPaymentDialog(true);
                                    setPaymentCardType(null);
                                  }}
                                  data-testid="button-pay-now"
                                >
                                  <CreditCard className="h-4 w-4 mr-1" />
                                  Pay Now
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Current Plan Payment Dialog */}
      <Dialog open={showCurrentPlanDialog} onOpenChange={setShowCurrentPlanDialog}>
        <DialogContent className="sm:max-w-[580px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <CreditCard className="h-5 w-5" />
              Manage {currentPlanData?.name}
            </DialogTitle>
          </DialogHeader>
          
          {currentPlanData && (
            <div className="space-y-6">
              {/* Plan Details */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{currentPlanData.name}</h3>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(currentPlanData.price, currency)}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">/month</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Users className="h-4 w-4" />
                  <span>Up to {currentPlanData.userLimit} users</span>
                </div>
                
                <div className="flex items-center gap-2 text-green-600 dark:text-green-500">
                  <Check className="h-4 w-4" />
                  <span className="text-sm font-medium">30-day money-back guarantee</span>
                </div>
              </div>

              {/* Payment Method Tabs */}
              <Tabs value={selectedPaymentMethod} onValueChange={(value) => setSelectedPaymentMethod(value as 'ryft' | 'paypal' | 'stripe')} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="ryft">Ryft</TabsTrigger>
                  <TabsTrigger value="paypal">PayPal</TabsTrigger>
                  <TabsTrigger value="stripe">Stripe</TabsTrigger>
                </TabsList>
                
                <TabsContent value="ryft" className="space-y-4">
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400 py-2">
                    <Shield className="h-4 w-4" />
                    <span>Secured by Ryft</span>
                  </div>
                  
                  <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 space-y-3">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100">Secure Payment with Ryft</h4>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      PCI DSS Level 1 certified payment processing with advanced fraud protection and real-time transaction monitoring.
                    </p>
                    <div className="flex items-center gap-4 text-xs text-blue-700 dark:text-blue-300">
                      <div className="flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        <span>256-bit SSL encryption</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        <span>FCA regulated</span>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold"
                    data-testid="button-pay-ryft"
                  >
                    Pay {formatCurrency(currentPlanData.price, currency)}/month with Ryft
                  </Button>
                </TabsContent>
                
                <TabsContent value="paypal" className="space-y-4">
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400 py-2">
                    <Shield className="h-4 w-4" />
                    <span>Secured by PayPal</span>
                  </div>
                  
                  <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 space-y-3">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100">Secure Payment with PayPal</h4>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      Industry-leading security with buyer protection and fraud monitoring for safe online transactions.
                    </p>
                    <div className="flex items-center gap-4 text-xs text-blue-700 dark:text-blue-300">
                      <div className="flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        <span>Buyer protection</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        <span>Secure checkout</span>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold"
                    data-testid="button-pay-paypal"
                  >
                    Pay {formatCurrency(currentPlanData.price, currency)}/month with PayPal
                  </Button>
                </TabsContent>
                
                <TabsContent value="stripe" className="space-y-4">
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400 py-2">
                    <Shield className="h-4 w-4" />
                    <span>Secured by Stripe</span>
                  </div>
                  
                  <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 space-y-3">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100">Secure Payment with Stripe</h4>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      PCI-certified payment platform with advanced security features and real-time fraud detection.
                    </p>
                    <div className="flex items-center gap-4 text-xs text-blue-700 dark:text-blue-300">
                      <div className="flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        <span>PCI DSS compliant</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        <span>3D Secure</span>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold"
                    data-testid="button-pay-stripe"
                  >
                    Pay {formatCurrency(currentPlanData.price, currency)}/month with Stripe
                  </Button>
                </TabsContent>
              </Tabs>

              {/* Terms */}
              <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                By proceeding, you agree to our Terms of Service and Privacy Policy. You can cancel your subscription at any time.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Payment Method Dialog */}
      {selectedPlan && (
        <PaymentMethodDialog
          open={showPaymentDialog}
          onOpenChange={setShowPaymentDialog}
          plan={selectedPlan}
        />
      )}

      {/* Billing Payment Dialog */}
      <Dialog open={showBillingPaymentDialog} onOpenChange={setShowBillingPaymentDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <CreditCard className="h-5 w-5" />
              Pay Invoice
            </DialogTitle>
          </DialogHeader>
          
          {selectedBillingPayment && (
            <div className="space-y-6">
              {/* Invoice Details */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Invoice Number</span>
                  <span className="font-medium">{selectedBillingPayment.invoiceNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Amount Due</span>
                  <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {selectedBillingPayment.currency} {parseFloat(selectedBillingPayment.amount).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Period</span>
                  <span className="text-sm">
                    {new Date(selectedBillingPayment.periodStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(selectedBillingPayment.periodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              </div>

              {!paymentCardType ? (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Select Payment Method</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-primary/10 hover:border-primary"
                      onClick={() => setPaymentCardType('debit')}
                      data-testid="button-select-debit"
                    >
                      <CreditCard className="h-8 w-8 text-primary" />
                      <span className="font-medium">Debit Card</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-primary/10 hover:border-primary"
                      onClick={() => setPaymentCardType('credit')}
                      data-testid="button-select-credit"
                    >
                      <CreditCard className="h-8 w-8 text-primary" />
                      <span className="font-medium">Credit Card</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {paymentCardType === 'debit' ? 'Debit Card' : 'Credit Card'} Payment
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPaymentCardType(null)}
                      data-testid="button-back-to-selection"
                    >
                      Change
                    </Button>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400 py-2">
                    <Shield className="h-4 w-4" />
                    <span>Secured by Stripe</span>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 space-y-3">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100">Secure Payment with Stripe</h4>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      PCI-certified payment platform with advanced security features and real-time fraud detection.
                    </p>
                    <div className="flex items-center gap-4 text-xs text-blue-700 dark:text-blue-300">
                      <div className="flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        <span>PCI DSS compliant</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        <span>3D Secure</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Card Number</label>
                      <input
                        type="text"
                        placeholder="1234 5678 9012 3456"
                        value={cardDetails.cardNumber}
                        onChange={(e) => setCardDetails({ ...cardDetails, cardNumber: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
                        maxLength={19}
                        data-testid="input-card-number"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expiry Date</label>
                        <input
                          type="text"
                          placeholder="MM/YY"
                          value={cardDetails.expiryDate}
                          onChange={(e) => setCardDetails({ ...cardDetails, expiryDate: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
                          maxLength={5}
                          data-testid="input-expiry"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CVV</label>
                        <input
                          type="text"
                          placeholder="123"
                          value={cardDetails.cvv}
                          onChange={(e) => setCardDetails({ ...cardDetails, cvv: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
                          maxLength={4}
                          data-testid="input-cvv"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cardholder Name</label>
                      <input
                        type="text"
                        placeholder="John Doe"
                        value={cardDetails.cardholderName}
                        onChange={(e) => setCardDetails({ ...cardDetails, cardholderName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
                        data-testid="input-cardholder-name"
                      />
                    </div>
                  </div>

                  <Button 
                    onClick={handleProcessPayment}
                    disabled={isProcessingPayment}
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold"
                    data-testid="button-process-payment"
                  >
                    {isProcessingPayment ? 'Processing...' : `Pay ${selectedBillingPayment.currency} ${parseFloat(selectedBillingPayment.amount).toFixed(2)}`}
                  </Button>

                  <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                    Your payment information is encrypted and secure. We never store your card details.
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center space-y-6 py-8">
            {/* Green Success Checkmark */}
            <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-500" />
            </div>

            {/* Success Message */}
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Payment Successful!
              </h3>
              {successPaymentDetails && (
                <div className="space-y-3 mt-4">
                  <p className="text-base text-gray-700 dark:text-gray-300">
                    Your payment of <span className="font-semibold">{successPaymentDetails.currency} {successPaymentDetails.amount}</span> is deducted.
                  </p>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Transaction ID</p>
                    <p className="text-sm font-mono text-gray-900 dark:text-gray-100 break-all">
                      {successPaymentDetails.transactionId}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Close Button */}
            <Button
              onClick={() => setShowSuccessModal(false)}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              data-testid="button-close-success"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
