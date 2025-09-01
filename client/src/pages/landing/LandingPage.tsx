import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Calendar, 
  Users, 
  FileText, 
  Shield, 
  Smartphone, 
  Brain,
  MessageSquare,
  Video,
  Clock,
  Award,
  CheckCircle,
  ArrowRight
} from "lucide-react";
import curaLogoPath from "@assets/Cura Logo Main_1751893631982.png";
import dashboardScreenshot from "@assets/Screenshot 2025-08-19 at 12.12.03_1755587692183.png";
import { WebsiteChatbot } from "@/components/WebsiteChatbot";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:from-gray-900 dark:to-gray-800">
      {/* Navigation */}
      <nav className="border-b bg-white dark:bg-gray-900 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-3">
              <img 
                src={curaLogoPath} 
                alt="Cura EMR - Electronic Medical Records" 
                className="h-14 w-auto"
              />
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/" className="text-gray-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 font-medium transition-colors">
                Home
              </Link>
              <Link href="/landing/features" className="text-gray-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 font-medium transition-colors">
                Features
              </Link>
              <Link href="/landing/pricing" className="text-gray-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 font-medium transition-colors">
                Pricing
              </Link>
              <Link href="/landing/about" className="text-gray-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 font-medium transition-colors">
                About Us
              </Link>
              <Link href="/auth/login">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm px-6 py-2 rounded-lg font-medium">
                  Client Portal
                </Button>
              </Link>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Link href="/auth/login">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  Portal
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-8">
            <div className="inline-flex items-center bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Award className="w-4 h-4 mr-2" />
              Trusted by Healthcare Professionals Across the UK
            </div>
            <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
              Advanced Electronic Medical Records
              <span className="block text-blue-600 mt-2">Built for Modern Healthcare</span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-10 max-w-4xl mx-auto leading-relaxed">
              Cura EMR delivers comprehensive patient management, AI-powered clinical insights, and seamless practice automation. 
              Designed for healthcare professionals who demand excellence, security, and efficiency.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link href="/auth/login">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white text-lg px-10 py-4 rounded-lg shadow-lg">
                Start Your Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/landing/features">
              <Button size="lg" variant="outline" className="text-lg px-10 py-4 rounded-lg border-2 border-blue-600 text-blue-600 hover:bg-blue-50">
                View Demonstration
              </Button>
            </Link>
          </div>

          {/* Trust Indicators */}
          <div className="grid md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <div className="text-center">
              <Shield className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <div className="text-sm font-medium text-gray-900">GDPR Compliant</div>
              <div className="text-xs text-gray-600">UK Data Protection</div>
            </div>
            <div className="text-center">
              <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <div className="text-sm font-medium text-gray-900">99.9% Uptime</div>
              <div className="text-xs text-gray-600">Reliable Service</div>
            </div>
            <div className="text-center">
              <Award className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <div className="text-sm font-medium text-gray-900">NHS Trusted</div>
              <div className="text-xs text-gray-600">Healthcare Standard</div>
            </div>
            <div className="text-center">
              <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <div className="text-sm font-medium text-gray-900">24/7 Support</div>
              <div className="text-xs text-gray-600">Expert Assistance</div>
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              See Cura EMR in Action
            </h2>
            <p className="text-lg text-gray-600">
              Experience the power of intelligent healthcare management
            </p>
          </div>
          
          <div className="relative bg-white rounded-2xl shadow-2xl p-2">
            <img 
              src={dashboardScreenshot} 
              alt="Cura EMR Dashboard - Complete Patient Management Interface"
              className="w-full h-auto rounded-xl"
            />
            <div className="absolute -top-3 -right-3 bg-green-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
              Live Demo Available
            </div>
          </div>
        </div>
      </section>

      {/* Core Services */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Comprehensive Healthcare Management Solutions
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Everything your healthcare practice needs to deliver exceptional patient care, streamline operations, and ensure regulatory compliance.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border border-gray-200 shadow-md hover:shadow-lg transition-all duration-300 hover:border-blue-300">
              <CardContent className="p-8 text-center">
                <div className="mb-6">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Brain className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-gray-900">Clinical Intelligence</h3>
                  <p className="text-gray-600 leading-relaxed">
                    AI-powered risk assessment, drug interaction alerts, and evidence-based treatment recommendations. 
                    Powered by GPT-4 for intelligent clinical decision support.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 shadow-md hover:shadow-lg transition-all duration-300 hover:border-blue-300">
              <CardContent className="p-8 text-center">
                <div className="mb-6">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-gray-900">Appointment Management</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Intelligent scheduling with automated reminders, conflict detection, 
                    and multi-provider coordination. Reduce no-shows by up to 40%.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 shadow-md hover:shadow-lg transition-all duration-300 hover:border-blue-300">
              <CardContent className="p-8 text-center">
                <div className="mb-6">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-gray-900">Electronic Health Records</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Complete patient record management with secure document storage, 
                    medical history tracking, and instant access to critical patient data.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 shadow-md hover:shadow-lg transition-all duration-300 hover:border-blue-300">
              <CardContent className="p-8 text-center">
                <div className="mb-6">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Video className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-gray-900">Telemedicine Platform</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Integrated video consultations with secure patient communication, 
                    remote monitoring capabilities, and virtual care delivery.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 shadow-md hover:shadow-lg transition-all duration-300 hover:border-blue-300">
              <CardContent className="p-8 text-center">
                <div className="mb-6">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Shield className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-gray-900">Security & Compliance</h3>
                  <p className="text-gray-600 leading-relaxed">
                    GDPR compliant with advanced encryption, comprehensive audit trails, 
                    and multi-tenant architecture ensuring complete data isolation.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 shadow-md hover:shadow-lg transition-all duration-300 hover:border-blue-300">
              <CardContent className="p-8 text-center">
                <div className="mb-6">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Smartphone className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-gray-900">Mobile Applications</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Native iOS and Android apps for patients and healthcare providers. 
                    Offline synchronization, push notifications, and voice documentation.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Why Choose Cura */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Trusted by Healthcare Professionals
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Join thousands of healthcare providers who rely on Cura EMR for exceptional patient care and practice efficiency.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h4 className="font-bold text-xl mb-3 text-gray-900">Streamlined Clinical Workflows</h4>
                  <p className="text-gray-600 leading-relaxed">
                    Reduce administrative time by up to 3 hours daily with intelligent automation, 
                    AI-assisted documentation, and streamlined patient management processes.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h4 className="font-bold text-xl mb-3 text-gray-900">Enhanced Patient Safety</h4>
                  <p className="text-gray-600 leading-relaxed">
                    AI-powered clinical decision support identifies potential risks, drug interactions, 
                    and provides evidence-based treatment recommendations for better patient outcomes.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h4 className="font-bold text-xl mb-3 text-gray-900">Complete Practice Integration</h4>
                  <p className="text-gray-600 leading-relaxed">
                    Seamlessly integrates with existing healthcare systems while providing 
                    comprehensive mobile access for healthcare delivery anywhere, anytime.
                  </p>
                </div>
              </div>
              
              <div className="pt-6">
                <Link href="/auth/login">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium shadow-md">
                    Request a Demonstration
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
              <h3 className="text-2xl font-bold mb-8 text-center text-gray-900">Proven Results</h3>
              <div className="grid grid-cols-2 gap-8">
                <div className="text-center">
                  <div className="text-4xl font-bold text-blue-600 mb-2">89%</div>
                  <div className="text-sm font-medium text-gray-900 mb-1">Time Reduction</div>
                  <div className="text-xs text-gray-600">Administrative Tasks</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-blue-600 mb-2">95%</div>
                  <div className="text-sm font-medium text-gray-900 mb-1">Client Satisfaction</div>
                  <div className="text-xs text-gray-600">Healthcare Providers</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-blue-600 mb-2">99.9%</div>
                  <div className="text-sm font-medium text-gray-900 mb-1">System Uptime</div>
                  <div className="text-xs text-gray-600">Guaranteed SLA</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-blue-600 mb-2">24/7</div>
                  <div className="text-sm font-medium text-gray-900 mb-1">Expert Support</div>
                  <div className="text-xs text-gray-600">Always Available</div>
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Shield className="w-4 h-4 mr-1 text-blue-600" />
                    GDPR Compliant
                  </div>
                  <div className="flex items-center">
                    <Award className="w-4 h-4 mr-1 text-blue-600" />
                    NHS Approved
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Professional Testimonials */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              What Healthcare Professionals Say
            </h2>
            <p className="text-lg text-gray-600">
              Real feedback from medical professionals using Cura EMR
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border border-gray-200 shadow-md">
              <CardContent className="p-8">
                <div className="text-center">
                  <div className="flex justify-center mb-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="w-5 h-5 text-yellow-400">★</div>
                    ))}
                  </div>
                  <p className="text-gray-600 mb-6 italic leading-relaxed">
                    "Cura EMR has transformed our practice efficiency. The AI insights help us identify patient risks early, 
                    and the automated scheduling has reduced our administrative workload significantly."
                  </p>
                  <div className="border-t border-gray-200 pt-4">
                    <div className="font-semibold text-gray-900">Dr. Sarah Mitchell</div>
                    <div className="text-sm text-gray-600">General Practice, London</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 shadow-md">
              <CardContent className="p-8">
                <div className="text-center">
                  <div className="flex justify-center mb-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="w-5 h-5 text-yellow-400">★</div>
                    ))}
                  </div>
                  <p className="text-gray-600 mb-6 italic leading-relaxed">
                    "The security and compliance features give us complete confidence. GDPR compliance is seamless, 
                    and our patients appreciate the secure communication channels."
                  </p>
                  <div className="border-t border-gray-200 pt-4">
                    <div className="font-semibold text-gray-900">Dr. James Harrison</div>
                    <div className="text-sm text-gray-600">Specialist Clinic, Manchester</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 shadow-md">
              <CardContent className="p-8">
                <div className="text-center">
                  <div className="flex justify-center mb-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="w-5 h-5 text-yellow-400">★</div>
                    ))}
                  </div>
                  <p className="text-gray-600 mb-6 italic leading-relaxed">
                    "Implementation was smooth and the support team is exceptional. The mobile apps allow us to access 
                    patient records securely from anywhere, improving our responsiveness."
                  </p>
                  <div className="border-t border-gray-200 pt-4">
                    <div className="font-semibold text-gray-900">Dr. Priya Patel</div>
                    <div className="text-sm text-gray-600">Multi-Site Practice, Birmingham</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Implementation & Support */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-white mb-6">
                Professional Implementation & Ongoing Support
              </h2>
              <p className="text-xl text-blue-100 mb-8 leading-relaxed">
                Our dedicated implementation team ensures a smooth transition with comprehensive training, 
                data migration, and ongoing technical support to maximize your success.
              </p>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-center text-white">
                  <CheckCircle className="w-5 h-5 mr-3 text-blue-200" />
                  <span>Dedicated implementation specialist assigned</span>
                </div>
                <div className="flex items-center text-white">
                  <CheckCircle className="w-5 h-5 mr-3 text-blue-200" />
                  <span>Complete staff training and certification</span>
                </div>
                <div className="flex items-center text-white">
                  <CheckCircle className="w-5 h-5 mr-3 text-blue-200" />
                  <span>Secure data migration from existing systems</span>
                </div>
                <div className="flex items-center text-white">
                  <CheckCircle className="w-5 h-5 mr-3 text-blue-200" />
                  <span>24/7 technical support and maintenance</span>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/auth/login">
                  <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 text-lg px-8 py-3 rounded-lg shadow-lg">
                    Start Your Free Trial
                  </Button>
                </Link>
                <Link href="/landing/features">
                  <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-blue-600 text-lg px-8 py-3 bg-transparent rounded-lg">
                    Schedule Consultation
                  </Button>
                </Link>
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur rounded-2xl p-8">
              <h3 className="text-xl font-bold text-white mb-6 text-center">Implementation Timeline</h3>
              <div className="space-y-6">
                <div className="flex items-center text-white">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold mr-4">1</div>
                  <div>
                    <div className="font-medium">Discovery & Planning</div>
                    <div className="text-sm text-blue-100">Week 1-2: System assessment and customization</div>
                  </div>
                </div>
                <div className="flex items-center text-white">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold mr-4">2</div>
                  <div>
                    <div className="font-medium">Installation & Configuration</div>
                    <div className="text-sm text-blue-100">Week 3-4: System setup and data migration</div>
                  </div>
                </div>
                <div className="flex items-center text-white">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold mr-4">3</div>
                  <div>
                    <div className="font-medium">Training & Go-Live</div>
                    <div className="text-sm text-blue-100">Week 5-6: Staff training and system launch</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-3 mb-6">
                <img 
                  src={curaLogoPath} 
                  alt="Cura EMR - Electronic Medical Records" 
                  className="h-10 w-auto"
                />
              </div>
              <p className="text-gray-300 mb-6 text-lg leading-relaxed max-w-md">
                Advanced Electronic Medical Records platform designed for modern healthcare professionals. 
                Trusted, secure, and intelligent healthcare management.
              </p>
              <div className="bg-gray-800 rounded-lg p-4 text-sm text-gray-400">
                <div className="font-semibold text-white mb-2">Cura Software Limited</div>
                <div>Ground Floor Unit 2, Drayton Court</div>
                <div>Drayton Road, Solihull, England B90 4NG</div>
                <div className="mt-2">Company Registration: 16556912</div>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-lg mb-6 text-white">Healthcare Solutions</h4>
              <ul className="space-y-3 text-gray-300">
                <li><Link href="/landing/features" className="hover:text-blue-400 transition-colors">EMR Platform</Link></li>
                <li><Link href="/auth/login" className="hover:text-blue-400 transition-colors">Client Portal</Link></li>
                <li><Link href="/landing/pricing" className="hover:text-blue-400 transition-colors">Pricing Plans</Link></li>
                <li><Link href="/landing/features#integrations" className="hover:text-blue-400 transition-colors">API Integration</Link></li>
                <li><a href="mailto:demo@curaemr.ai" className="hover:text-blue-400 transition-colors">Request Demo</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-lg mb-6 text-white">Professional Support</h4>
              <ul className="space-y-3 text-gray-300">
                <li><Link href="/landing/about" className="hover:text-blue-400 transition-colors">About Cura</Link></li>
                <li><a href="mailto:support@curaemr.ai" className="hover:text-blue-400 transition-colors">Technical Support</a></li>
                <li><a href="mailto:info@curaemr.ai" className="hover:text-blue-400 transition-colors">Contact Us</a></li>
                <li><Link href="/legal/press" className="hover:text-blue-400 transition-colors">Press & Media</Link></li>
                <li><a href="mailto:careers@curaemr.ai" className="hover:text-blue-400 transition-colors">Careers</a></li>
              </ul>
              
              <div className="mt-6 pt-6 border-t border-gray-700">
                <h5 className="font-medium text-white mb-3">Legal & Compliance</h5>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li><Link href="/legal/privacy" className="hover:text-blue-400 transition-colors">Privacy Policy</Link></li>
                  <li><Link href="/legal/terms" className="hover:text-blue-400 transition-colors">Terms of Service</Link></li>
                  <li><Link href="/legal/gdpr" className="hover:text-blue-400 transition-colors">GDPR Compliance</Link></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-700 mt-12 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="text-gray-400 text-sm mb-4 md:mb-0">
                &copy; 2025 Cura Software Limited. All rights reserved. 
                <span className="ml-2">Company No: 16556912</span>
              </div>
              <div className="flex items-center space-x-6 text-sm">
                <div className="flex items-center text-gray-400">
                  <Shield className="w-4 h-4 mr-2 text-blue-400" />
                  GDPR Compliant
                </div>
                <div className="flex items-center text-gray-400">
                  <Award className="w-4 h-4 mr-2 text-blue-400" />
                  NHS Trusted
                </div>
                <div className="flex items-center text-gray-400">
                  <Clock className="w-4 h-4 mr-2 text-blue-400" />
                  99.9% Uptime SLA
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
      
      {/* Website Chatbot */}
      <WebsiteChatbot />
    </div>
  );
}