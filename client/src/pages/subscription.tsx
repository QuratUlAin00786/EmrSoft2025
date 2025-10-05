import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { Crown, Users, Calendar, Zap, Check, X, Package, Heart, Brain, Shield, Stethoscope, Phone, FileText, Activity, Pill, UserCheck } from "lucide-react";
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

  const { data: dbPackages, isLoading: packagesLoading, error: packagesError } = useQuery<SaaSPackage[]>({
    queryKey: ["/api/website/packages"],
    staleTime: 30000, // Cache for 30 seconds
    refetchOnMount: true, // Always refetch when component mounts
  });

  // Fetch billing history
  const { data: billingHistory = [], isLoading: billingLoading } = useQuery<any[]>({
    queryKey: ["/api/billing-history"],
  });

  // Split packages into subscription plans (have maxUsers) and add-ons (don't have maxUsers)
  const dbPlans = (dbPackages || []).filter(pkg => pkg.features?.maxUsers);
  const dbAddons = (dbPackages || []).filter(pkg => !pkg.features?.maxUsers);

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
      
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Current Subscription */}
          {subscription && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Crown className="h-5 w-5 text-yellow-500" />
                  <span>Current Subscription</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-gray-400">Plan</p>
                    <p className="text-xl font-semibold capitalize text-gray-900 dark:text-gray-100">
                      {subscription.plan}
                    </p>
                    <Badge 
                      variant="secondary"
                      className={
                        subscription.status === 'active' 
                          ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300" 
                          : subscription.status === 'trial'
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
                          : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300"
                      }
                    >
                      {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                    </Badge>
                  </div>
                  
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-gray-400">Users</p>
                    <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                      {subscription.currentUsers} / {subscription.userLimit}
                    </p>
                    <div className="w-full bg-neutral-200 dark:bg-slate-700 rounded-full h-2 mt-2">
                      <div 
                        className="bg-medical-blue h-2 rounded-full" 
                        style={{ 
                          width: `${(subscription.currentUsers / subscription.userLimit) * 100}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-gray-400">
                      {subscription.status === 'trial' ? 'Trial Ends' : 'Next Billing'}
                    </p>
                    <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                      {subscription.status === 'trial' 
                        ? new Date(subscription.trialEndsAt!).toLocaleDateString()
                        : subscription.nextBillingAt 
                        ? new Date(subscription.nextBillingAt).toLocaleDateString()
                        : "—"
                      }
                    </p>
                    {subscription.monthlyPrice && (
                      <p className="text-sm text-neutral-600 dark:text-gray-400">
                        £{subscription.monthlyPrice}/month
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Available Plans */}
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">Available Plans</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <Card 
                  key={plan.id} 
                  className={`relative ${
                    plan.popular 
                      ? "ring-2 ring-medical-blue border-medical-blue" 
                      : ""
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-medical-blue text-white">
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader className="text-center">
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <div className="mt-4">
                      <span className="text-4xl font-bold text-gray-900 dark:text-gray-100">£{plan.price}</span>
                      <span className="text-neutral-600 dark:text-gray-400">/month</span>
                    </div>
                    <p className="text-sm text-neutral-600 dark:text-gray-400 flex items-center justify-center space-x-1">
                      <Users className="h-4 w-4" />
                      <span>Up to {plan.userLimit} users</span>
                    </p>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-3">
                      {plan.features.map((feature, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                        </div>
                      ))}
                      
                      {plan.notIncluded.map((feature, index) => (
                        <div key={index} className="flex items-center space-x-2 opacity-50">
                          <X className="h-4 w-4 text-red-500 flex-shrink-0" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                        </div>
                      ))}
                    </div>
                    
                    <Button 
                      className={`w-full mt-6 ${
                        plan.popular 
                          ? "bg-medical-blue hover:bg-blue-700" 
                          : ""
                      }`}
                      variant={plan.popular ? "default" : "outline"}
                      disabled={subscription?.plan === plan.id}
                      onClick={() => {
                        if (subscription?.plan !== plan.id) {
                          setSelectedPlan(plan);
                          setShowPaymentDialog(true);
                        }
                      }}
                    >
                      {subscription?.plan === plan.id 
                        ? "Current Plan" 
                        : subscription?.status === 'trial' 
                        ? "Start Free Trial"
                        : "Upgrade"
                      }
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Add-on Packages */}
          <div>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-gray-100">Add-on Packages</h2>
              <p className="text-neutral-600 dark:text-gray-400 max-w-2xl mx-auto">
                Enhance your EMR system with specialized packages designed for modern healthcare practices.
                Mix and match to create the perfect solution for your organization.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {packages.map((pkg) => {
                const IconComponent = pkg.icon;
                return (
                  <Card key={pkg.id} className="relative hover:shadow-lg transition-shadow border border-neutral-200 dark:border-slate-600">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-medical-blue/10 dark:bg-medical-blue/20 rounded-lg">
                            <IconComponent className="h-6 w-6 text-medical-blue" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">{pkg.name}</h3>
                            <div className="flex items-center space-x-2">
                              <span className="text-2xl font-bold text-medical-blue">£{pkg.price}</span>
                              <span className="text-sm text-neutral-500 dark:text-gray-400">/month</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-neutral-600 dark:text-gray-400">{pkg.description}</p>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="space-y-3 mb-6">
                        {pkg.features.map((feature, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                          </div>
                        ))}
                      </div>
                      
                      <Button 
                        className="w-full bg-medical-blue hover:bg-blue-700"
                        onClick={() => {
                          // Handle package selection
                          console.log('Selected package:', pkg.id);
                        }}
                      >
                        <Package className="h-4 w-4 mr-2" />
                        Add Package
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Package Bundles */}
            <div className="mt-12">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Popular Package Bundles</h3>
                <p className="text-neutral-600 dark:text-gray-400 max-w-2xl mx-auto">
                  Save money with our curated package bundles designed for specific healthcare scenarios.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-2 border-medical-blue/20 bg-medical-blue/5 dark:bg-medical-blue/10">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">Primary Care Bundle</h4>
                        <p className="text-sm text-neutral-600 dark:text-gray-400 mt-1">Perfect for family practices and general medicine</p>
                      </div>
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">Save 25%</Badge>
                    </div>
                    <div className="flex items-center space-x-2 mt-3">
                      <span className="text-3xl font-bold text-medical-blue">£65</span>
                      <span className="text-lg text-neutral-500 dark:text-gray-400 line-through">£87</span>
                      <span className="text-sm text-neutral-500 dark:text-gray-400">/month</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center space-x-2 text-sm">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-gray-700 dark:text-gray-300">Telehealth Pro (£15)</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-gray-700 dark:text-gray-300">AI Clinical Assistant (£25)</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-gray-700 dark:text-gray-300">Pharmacy Connect (£20)</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-gray-700 dark:text-gray-300">Analytics Pro (£18)</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-gray-700 dark:text-gray-300">Patient Portal Plus (£12)</span>
                      </div>
                    </div>
                    <Button className="w-full bg-medical-blue hover:bg-blue-700">
                      <Package className="h-4 w-4 mr-2" />
                      Add Bundle
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-2 border-purple-200 dark:border-purple-500/30 bg-purple-50 dark:bg-purple-900/10">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">Specialty Care Bundle</h4>
                        <p className="text-sm text-neutral-600 dark:text-gray-400 mt-1">Advanced tools for specialized medical practices</p>
                      </div>
                      <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300">Save 30%</Badge>
                    </div>
                    <div className="flex items-center space-x-2 mt-3">
                      <span className="text-3xl font-bold text-purple-600">£91</span>
                      <span className="text-lg text-neutral-500 dark:text-gray-400 line-through">£130</span>
                      <span className="text-sm text-neutral-500 dark:text-gray-400">/month</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center space-x-2 text-sm">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-gray-700 dark:text-gray-300">Cardiology Suite (£40)</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-gray-700 dark:text-gray-300">Remote Monitoring (£35)</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-gray-700 dark:text-gray-300">Multi-Specialty Tools (£30)</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-gray-700 dark:text-gray-300">HIPAA Security Plus (£22)</span>
                      </div>
                    </div>
                    <Button className="w-full bg-purple-600 hover:bg-purple-700">
                      <Package className="h-4 w-4 mr-2" />
                      Add Bundle
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Billing History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Billing History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {billingLoading ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : billingHistory.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-neutral-400 dark:text-gray-500 mx-auto mb-4" />
                  <p className="text-neutral-600 dark:text-gray-400">No billing history available.</p>
                  <p className="text-sm text-neutral-500 dark:text-gray-500 mt-2">
                    Billing records will appear here once your subscription becomes active.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-neutral-200 dark:border-gray-700">
                        <th className="px-4 py-3 text-left text-sm font-medium text-neutral-600 dark:text-gray-400">Invoice</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-neutral-600 dark:text-gray-400">Date</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-neutral-600 dark:text-gray-400">Amount</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-neutral-600 dark:text-gray-400">Status</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-neutral-600 dark:text-gray-400">Method</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-neutral-600 dark:text-gray-400">Period</th>
                      </tr>
                    </thead>
                    <tbody>
                      {billingHistory.map((payment: any) => (
                        <tr key={payment.id} className="border-b border-neutral-100 dark:border-gray-800">
                          <td className="px-4 py-3 text-sm text-neutral-900 dark:text-gray-100">{payment.invoiceNumber}</td>
                          <td className="px-4 py-3 text-sm text-neutral-700 dark:text-gray-300">
                            {payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : 'Pending'}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-neutral-900 dark:text-gray-100">
                            {payment.currency} {parseFloat(payment.amount).toFixed(2)}
                          </td>
                          <td className="px-4 py-3">
                            <Badge 
                              className={
                                payment.paymentStatus === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                payment.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                payment.paymentStatus === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                              }
                            >
                              {payment.paymentStatus}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm text-neutral-700 dark:text-gray-300 capitalize">
                            {payment.paymentMethod.replace('_', ' ')}
                          </td>
                          <td className="px-4 py-3 text-sm text-neutral-700 dark:text-gray-300">
                            {new Date(payment.periodStart).toLocaleDateString()} - {new Date(payment.periodEnd).toLocaleDateString()}
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
