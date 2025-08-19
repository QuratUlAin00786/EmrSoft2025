import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Check, X, Star, Shield, Users, Zap } from "lucide-react";
import curaLogoPath from "@assets/Cura Logo Main AI_1751893631983.png";

export default function PricingPage() {
  const plans = [
    {
      name: "Free Trial",
      price: "£0",
      period: "14 days",
      description: "Perfect for trying out Cura EMR",
      icon: Star,
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-900/20",
      borderColor: "border-green-200 dark:border-green-800",
      buttonStyle: "bg-green-600 hover:bg-green-700",
      popular: false,
      features: [
        "Up to 10 patients",
        "Basic appointment scheduling",
        "Electronic health records",
        "Basic reporting",
        "Email support",
        "Mobile app access",
        "Patient portal",
        "Basic AI insights"
      ],
      limitations: [
        "Limited to 10 patients",
        "Basic features only",
        "No advanced AI",
        "No telemedicine"
      ]
    },
    {
      name: "Starter",
      price: "£49",
      period: "per month",
      description: "Ideal for small practices",
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      borderColor: "border-blue-200 dark:border-blue-800",
      buttonStyle: "bg-blue-600 hover:bg-blue-700",
      popular: false,
      features: [
        "Up to 100 patients",
        "Advanced appointment scheduling",
        "Electronic health records",
        "Prescription management",
        "Basic telemedicine",
        "Standard reporting",
        "Email & chat support",
        "Mobile app access",
        "Patient portal",
        "Basic AI insights",
        "SMS notifications"
      ],
      limitations: []
    },
    {
      name: "Professional",
      price: "£99",
      period: "per month",
      description: "Most popular for growing practices",
      icon: Zap,
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-900/20",
      borderColor: "border-purple-200 dark:border-purple-800",
      buttonStyle: "bg-purple-600 hover:bg-purple-700",
      popular: true,
      features: [
        "Up to 500 patients",
        "Advanced appointment scheduling",
        "Electronic health records",
        "Prescription management",
        "Full telemedicine suite",
        "Advanced reporting & analytics",
        "Priority support",
        "Mobile app access",
        "Patient portal",
        "Advanced AI insights",
        "SMS & WhatsApp notifications",
        "Inventory management",
        "Lab integration",
        "Custom workflows"
      ],
      limitations: []
    },
    {
      name: "Enterprise",
      price: "£199",
      period: "per month",
      description: "For large practices and hospitals",
      icon: Shield,
      color: "text-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-900/20",
      borderColor: "border-orange-200 dark:border-orange-800",
      buttonStyle: "bg-orange-600 hover:bg-orange-700",
      popular: false,
      features: [
        "Unlimited patients",
        "Advanced appointment scheduling",
        "Electronic health records",
        "Prescription management",
        "Full telemedicine suite",
        "Advanced reporting & analytics",
        "24/7 phone support",
        "Mobile app access",
        "Patient portal",
        "Premium AI insights",
        "SMS & WhatsApp notifications",
        "Advanced inventory management",
        "Full lab integration",
        "Custom workflows",
        "Multi-location support",
        "Advanced user roles",
        "Custom integrations",
        "Dedicated account manager"
      ],
      limitations: []
    }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Link href="/" className="flex items-center space-x-3">
              <img 
                src={curaLogoPath} 
                alt="Cura EMR" 
                className="h-12 w-auto"
              />
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">Cura EMR</span>
                <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">by Halo Group</span>
              </div>
            </Link>
            
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/" className="text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 font-medium transition-colors">
                Home
              </Link>
              <Link href="/landing/features" className="text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 font-medium transition-colors">
                Features
              </Link>
              <Link href="/landing/about" className="text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 font-medium transition-colors">
                About Us
              </Link>
              <span className="text-blue-600 dark:text-blue-400 font-medium">
                Pricing
              </span>
              <Link href="/auth/login">
                <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md px-6 py-2">
                  Login to Portal
                </Button>
              </Link>
            </div>

            <div className="md:hidden">
              <Link href="/auth/login">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  Login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Choose Your Perfect
            <span className="text-blue-600"> Healthcare Plan</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-12">
            Start with our free trial and upgrade as your practice grows. 
            All plans include our core EMR features with no setup fees.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-8">
            {plans.map((plan, index) => {
              const IconComponent = plan.icon;
              return (
                <div 
                  key={plan.name}
                  className={`relative rounded-2xl border-2 ${plan.borderColor} ${plan.bgColor} p-8 ${
                    plan.popular ? 'transform scale-105 shadow-2xl' : 'shadow-lg'
                  } transition-all duration-300 hover:shadow-xl`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <span className="bg-purple-600 text-white px-4 py-2 rounded-full text-sm font-semibold">
                        Most Popular
                      </span>
                    </div>
                  )}
                  
                  <div className="text-center mb-8">
                    <div className={`inline-flex items-center justify-center w-16 h-16 ${plan.bgColor} rounded-full mb-4`}>
                      <IconComponent className={`h-8 w-8 ${plan.color}`} />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      {plan.name}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">
                      {plan.description}
                    </p>
                    <div className="mb-6">
                      <span className="text-4xl font-bold text-gray-900 dark:text-white">
                        {plan.price}
                      </span>
                      <span className="text-gray-600 dark:text-gray-300 ml-2">
                        {plan.period}
                      </span>
                    </div>
                    <Link href="/auth/login">
                      <Button className={`w-full ${plan.buttonStyle} text-white py-3`}>
                        {plan.name === "Free Trial" ? "Start Free Trial" : "Get Started"}
                      </Button>
                    </Link>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      Features included:
                    </h4>
                    <ul className="space-y-3">
                      {plan.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-start space-x-3">
                          <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-600 dark:text-gray-300 text-sm">
                            {feature}
                          </span>
                        </li>
                      ))}
                      {plan.limitations.map((limitation, limitIndex) => (
                        <li key={limitIndex} className="flex items-start space-x-3">
                          <X className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-500 dark:text-gray-400 text-sm line-through">
                            {limitation}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Everything you need to know about our pricing and plans
            </p>
          </div>

          <div className="space-y-8">
            <div className="bg-white dark:bg-gray-900 rounded-lg p-6 shadow-md">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                Can I switch plans anytime?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, 
                and we'll prorate any billing differences.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg p-6 shadow-md">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                What happens to my data if I cancel?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Your data remains accessible for 30 days after cancellation. You can export all your data 
                during this period. We ensure complete GDPR compliance with data deletion.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg p-6 shadow-md">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                Is there a setup fee?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                No setup fees for any plan. We include free onboarding and training to help you 
                get started quickly with Cura EMR.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg p-6 shadow-md">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                Do you offer custom enterprise solutions?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Yes, we offer custom solutions for large healthcare organizations. Contact our sales team 
                for tailored pricing and features specific to your needs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Start your free trial today and experience the future of healthcare management.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/login">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-3">
                Start Free Trial Now
              </Button>
            </Link>
            <Link href="/landing/features">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600 text-lg px-8 py-3 bg-transparent">
                View All Features
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <img 
                  src={curaLogoPath} 
                  alt="Cura EMR" 
                  className="h-8 w-auto"
                />
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Transforming healthcare with intelligent EMR solutions.
              </p>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <div>Halo Group Ltd</div>
                <div>123 Healthcare Street</div>
                <div>Manchester, M1 2AB</div>
                <div>United Kingdom</div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                <li><Link href="/landing/features" className="hover:text-blue-600 dark:hover:text-white">Features</Link></li>
                <li><Link href="/landing/pricing" className="hover:text-blue-600 dark:hover:text-white">Pricing</Link></li>
                <li><Link href="/auth/login" className="hover:text-blue-600 dark:hover:text-white">Login</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                <li><Link href="/landing/about" className="hover:text-blue-600 dark:hover:text-white">About Us</Link></li>
                <li><a href="#" className="hover:text-blue-600 dark:hover:text-white">Contact</a></li>
                <li><a href="#" className="hover:text-blue-600 dark:hover:text-white">Support</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                <li><a href="#" className="hover:text-blue-600 dark:hover:text-white">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-blue-600 dark:hover:text-white">Terms of Service</a></li>
                <li><a href="#" className="hover:text-blue-600 dark:hover:text-white">GDPR Compliance</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-300 dark:border-gray-600 mt-8 pt-8 text-center text-gray-600 dark:text-gray-400">
            <p>&copy; 2025 Halo Group Ltd. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}