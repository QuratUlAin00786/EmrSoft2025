import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { Crown, Users, Calendar, Zap, Check, X, Package, Heart, Brain, Shield, Stethoscope, Phone, FileText, Activity, Pill, UserCheck, TrendingUp, Download } from "lucide-react";
import { PaymentMethodDialog } from "@/components/payment-method-dialog";
import type { Subscription } from "@/types";
import type { SaaSPackage } from "@shared/schema";

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
  
  const { data: subscription, isLoading, error } = useQuery<Subscription>({
    queryKey: ["/api/subscription"],
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
      
      <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-50 to-blue-50/30 dark:from-gray-900 dark:to-blue-950/20 p-6">
        <div className="max-w-7xl mx-auto space-y-10">
          {/* Page Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 shadow-lg mb-4">
              <Crown className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
              Cura Packages
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Choose the perfect plan to power your medical practice
            </p>
          </div>

          {/* Current Subscription */}
          {subscription && (
            <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-blue-50/50 dark:from-gray-800 dark:to-blue-950/30 overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 dark:bg-blue-400/5 rounded-full blur-3xl -z-0"></div>
              <CardHeader className="relative z-10">
                <CardTitle className="flex items-center space-x-3 text-2xl">
                  <div className="p-2 bg-yellow-500/10 dark:bg-yellow-400/20 rounded-lg">
                    <Crown className="h-6 w-6 text-yellow-600 dark:text-yellow-500" />
                  </div>
                  <span className="bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
                    Current Subscription
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Zap className="h-4 w-4" />
                      <span className="font-medium">Active Plan</span>
                    </div>
                    <p className="text-3xl font-bold capitalize bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-400 dark:to-blue-600 bg-clip-text text-transparent">
                      {subscription.plan}
                    </p>
                    <Badge 
                      className={`${
                        subscription.status === 'active' 
                          ? "bg-gradient-to-r from-green-500 to-green-600 text-white border-0 shadow-md" 
                          : subscription.status === 'trial'
                          ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 shadow-md"
                          : "bg-gradient-to-r from-yellow-500 to-yellow-600 text-white border-0 shadow-md"
                      } px-3 py-1`}
                    >
                      {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                    </Badge>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Users className="h-4 w-4" />
                      <span className="font-medium">User Capacity</span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                      {subscription.currentUsers} <span className="text-xl text-gray-500 dark:text-gray-400">/ {subscription.userLimit}</span>
                    </p>
                    <div className="relative w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden shadow-inner">
                      <div 
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500 rounded-full transition-all duration-500 shadow-md" 
                        style={{ 
                          width: `${Math.min((subscription.currentUsers / subscription.userLimit) * 100, 100)}%` 
                        }}
                      >
                        <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Calendar className="h-4 w-4" />
                      <span className="font-medium">
                        {subscription.status === 'trial' ? 'Trial Period' : 'Billing Cycle'}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {subscription.status === 'trial' 
                        ? new Date(subscription.trialEndsAt!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : subscription.nextBillingAt 
                        ? new Date(subscription.nextBillingAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : "—"
                      }
                    </p>
                    {subscription.monthlyPrice && (
                      <p className="text-base text-gray-600 dark:text-gray-400 font-medium">
                        <span className="text-2xl text-blue-600 dark:text-blue-400">£{subscription.monthlyPrice}</span>/month
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Available Plans */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Available Plans</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Select a plan that fits your practice needs</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500 dark:text-blue-400" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {plans.map((plan) => (
                <Card 
                  key={plan.id} 
                  className={`relative transition-all duration-300 hover:scale-105 hover:shadow-2xl border-2 ${
                    plan.popular 
                      ? "border-blue-500 shadow-xl bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-blue-950/40" 
                      : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 bg-white dark:bg-gray-800"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 z-10">
                      <Badge className="bg-gradient-to-r from-blue-600 to-blue-700 text-white border-0 shadow-lg px-4 py-1.5 text-sm font-semibold">
                        ⭐ Most Popular
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader className="text-center pb-4 pt-8">
                    <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">{plan.name}</CardTitle>
                    <div className="space-y-2">
                      <div>
                        <span className="text-5xl font-extrabold bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-400 dark:to-blue-600 bg-clip-text text-transparent">
                          £{plan.price}
                        </span>
                        <span className="text-lg text-gray-600 dark:text-gray-400 ml-2">/month</span>
                      </div>
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-950/30 rounded-full">
                        <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Up to {plan.userLimit} users</span>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      {plan.features.map((feature, index) => (
                        <div key={index} className="flex items-start space-x-3 group">
                          <div className="mt-0.5 p-1 bg-green-50 dark:bg-green-950/30 rounded-full group-hover:scale-110 transition-transform">
                            <Check className="h-4 w-4 text-green-600 dark:text-green-500 flex-shrink-0" />
                          </div>
                          <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{feature}</span>
                        </div>
                      ))}
                      
                      {plan.notIncluded.map((feature, index) => (
                        <div key={index} className="flex items-start space-x-3 opacity-40">
                          <div className="mt-0.5 p-1 bg-red-50 dark:bg-red-950/30 rounded-full">
                            <X className="h-4 w-4 text-red-500 flex-shrink-0" />
                          </div>
                          <span className="text-sm text-gray-700 dark:text-gray-300 line-through leading-relaxed">{feature}</span>
                        </div>
                      ))}
                    </div>
                    
                    <Button 
                      className={`w-full h-12 font-semibold shadow-md hover:shadow-lg transition-all ${
                        plan.popular 
                          ? "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white" 
                          : "bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-500 text-gray-900 dark:text-gray-100"
                      }`}
                      disabled={subscription?.plan === plan.id}
                      onClick={() => {
                        if (subscription?.plan !== plan.id) {
                          setSelectedPlan(plan);
                          setShowPaymentDialog(true);
                        }
                      }}
                    >
                      {subscription?.plan === plan.id 
                        ? "✓ Current Plan" 
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
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Add-on Packages</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Extend your capabilities with specialized modules</p>
                </div>
                <Package className="h-8 w-8 text-blue-500 dark:text-blue-400" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {packages.map((pkg) => {
                  const IconComponent = pkg.icon;
                  return (
                    <Card key={pkg.id} className="relative hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] border-2 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 bg-white dark:bg-gray-800 overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 dark:bg-blue-400/10 rounded-full blur-2xl group-hover:bg-blue-500/10 dark:group-hover:bg-blue-400/20 transition-all"></div>
                      
                      <CardHeader className="pb-4 relative z-10">
                        <div className="flex items-start justify-between mb-4">
                          <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                            <IconComponent className="h-7 w-7 text-white" />
                          </div>
                          <div className="text-right">
                            <div className="flex items-baseline justify-end gap-1">
                              <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">£{pkg.price}</span>
                              <span className="text-sm text-gray-500 dark:text-gray-400">/mo</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h3 className="font-bold text-xl text-gray-900 dark:text-gray-100 mb-2">{pkg.name}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{pkg.description}</p>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="relative z-10">
                        <div className="space-y-3 mb-6">
                          {pkg.features.map((feature, index) => (
                            <div key={index} className="flex items-start space-x-2 group/feature">
                              <div className="mt-0.5 p-1 bg-green-50 dark:bg-green-950/30 rounded-full group-hover/feature:scale-110 transition-transform">
                                <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-500 flex-shrink-0" />
                              </div>
                              <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{feature}</span>
                            </div>
                          ))}
                        </div>
                        
                        <Button 
                          className="w-full h-11 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold shadow-md hover:shadow-lg transition-all"
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
          <Card className="border-0 shadow-xl bg-white dark:bg-gray-800">
            <CardHeader className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <CardTitle className="flex items-center gap-3 text-2xl">
                <div className="p-2 bg-blue-500/10 dark:bg-blue-400/20 rounded-lg">
                  <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
                  Billing History
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {billingLoading ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner />
                </div>
              ) : billingHistory.length === 0 ? (
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gray-100 dark:bg-gray-700 mb-6">
                    <Calendar className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                  </div>
                  <h4 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No billing history yet</h4>
                  <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                    Billing records will appear here once your subscription becomes active.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Invoice</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Method</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Period</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {billingHistory.map((payment: any) => (
                        <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-gray-400" />
                              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{payment.invoiceNumber}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                            {payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Pending'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                              {payment.currency} {parseFloat(payment.amount).toFixed(2)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge 
                              className={`${
                                payment.paymentStatus === 'completed' ? 'bg-gradient-to-r from-green-500 to-green-600 text-white border-0' :
                                payment.paymentStatus === 'pending' ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white border-0' :
                                payment.paymentStatus === 'failed' ? 'bg-gradient-to-r from-red-500 to-red-600 text-white border-0' :
                                'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                              } px-3 py-1 font-medium`}
                            >
                              {payment.paymentStatus}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 capitalize">
                            {payment.paymentMethod.replace('_', ' ')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                            {new Date(payment.periodStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(payment.periodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Invoice
                            </Button>
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
      
      {/* Payment Method Dialog */}
      {selectedPlan && (
        <PaymentMethodDialog
          open={showPaymentDialog}
          onOpenChange={setShowPaymentDialog}
          plan={selectedPlan}
        />
      )}
    </>
  );
}
