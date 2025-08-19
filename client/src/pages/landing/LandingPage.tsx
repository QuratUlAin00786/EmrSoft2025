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

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <img 
                src={curaLogoPath} 
                alt="Cura EMR" 
                className="h-8 w-auto"
              />
              <span className="text-xl font-bold text-gray-900 dark:text-white">Cura EMR</span>
              <span className="text-sm text-gray-500">by Halo Group</span>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/landing/features" className="text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400">
                Features
              </Link>
              <Link href="/landing/about" className="text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400">
                About Us
              </Link>
              <Link href="/auth/login">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  Login to Portal
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
                Transform Healthcare with
                <span className="text-blue-600"> Intelligent EMR</span>
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
                Cura EMR revolutionizes healthcare management with AI-powered insights, 
                seamless patient care, and comprehensive practice management tools designed 
                for the modern healthcare professional.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/auth/login">
                  <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-3">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/landing/features">
                  <Button size="lg" variant="outline" className="text-lg px-8 py-3">
                    View Features
                  </Button>
                </Link>
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6">
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Dashboard Overview</h3>
                    <div className="flex space-x-2">
                      <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                      <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                      <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                      <div className="flex items-center space-x-3">
                        <Calendar className="h-5 w-5 text-blue-600" />
                        <span className="text-sm">Today's Appointments</span>
                      </div>
                      <span className="font-semibold text-blue-600">12</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded">
                      <div className="flex items-center space-x-3">
                        <Users className="h-5 w-5 text-green-600" />
                        <span className="text-sm">Active Patients</span>
                      </div>
                      <span className="font-semibold text-green-600">1,247</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded">
                      <div className="flex items-center space-x-3">
                        <Brain className="h-5 w-5 text-purple-600" />
                        <span className="text-sm">AI Insights</span>
                      </div>
                      <span className="font-semibold text-purple-600">8 New</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features Grid */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Everything You Need for Modern Healthcare
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Comprehensive tools designed to streamline your practice and improve patient outcomes
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="mb-4">
                  <Brain className="h-12 w-12 text-blue-600 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">AI-Powered Insights</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Advanced AI analysis for patient risk assessment, drug interactions, 
                    and treatment recommendations powered by OpenAI GPT-4.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="mb-4">
                  <Calendar className="h-12 w-12 text-green-600 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Smart Scheduling</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Intelligent appointment management with automated reminders, 
                    conflict detection, and multi-provider coordination.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="mb-4">
                  <Video className="h-12 w-12 text-purple-600 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Telemedicine</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Integrated video consultations with BigBlueButton, 
                    secure patient communication, and remote monitoring.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="mb-4">
                  <Smartphone className="h-12 w-12 text-indigo-600 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Mobile Apps</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Native Flutter apps for patients and doctors with offline sync, 
                    push notifications, and voice documentation.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="mb-4">
                  <Shield className="h-12 w-12 text-red-600 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Security & Compliance</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    GDPR compliant with advanced encryption, audit trails, 
                    and multi-tenant architecture for data isolation.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="mb-4">
                  <MessageSquare className="h-12 w-12 text-orange-600 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Smart Communications</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    AI chatbot with natural language processing, 
                    SMS/WhatsApp integration via Twilio, and automated workflows.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
                Why Healthcare Professionals Choose Cura
              </h2>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <CheckCircle className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-lg mb-2">Reduce Administrative Burden</h4>
                    <p className="text-gray-600 dark:text-gray-300">
                      Automate routine tasks with AI assistance, saving up to 3 hours per day on documentation and scheduling.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <CheckCircle className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-lg mb-2">Improve Patient Outcomes</h4>
                    <p className="text-gray-600 dark:text-gray-300">
                      AI-powered clinical insights help identify risks early and suggest optimal treatment pathways.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <CheckCircle className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-lg mb-2">Seamless Integration</h4>
                    <p className="text-gray-600 dark:text-gray-300">
                      Works with existing systems and provides comprehensive mobile access for on-the-go healthcare delivery.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
              <h3 className="text-2xl font-bold mb-6 text-center">Practice Management Stats</h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">89%</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">Time Savings</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">95%</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">User Satisfaction</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-2">24/7</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">Support Available</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600 mb-2">99.9%</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">Uptime SLA</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Transform Your Practice?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of healthcare professionals who trust Cura EMR 
            to streamline their workflow and improve patient care.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/login">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-3">
                Start Your Free Trial
              </Button>
            </Link>
            <Link href="/landing/features">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600 text-lg px-8 py-3">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <img 
                  src={curaLogoPath} 
                  alt="Cura EMR" 
                  className="h-8 w-auto"
                />
                <span className="text-xl font-bold">Cura EMR</span>
              </div>
              <p className="text-gray-400 mb-4">
                Transforming healthcare with intelligent EMR solutions.
              </p>
              <div className="text-sm text-gray-400">
                <div>Halo Group Ltd</div>
                <div>123 Healthcare Street</div>
                <div>Manchester, M1 2AB</div>
                <div>United Kingdom</div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/landing/features" className="hover:text-white">Features</Link></li>
                <li><Link href="/auth/login" className="hover:text-white">Login</Link></li>
                <li><a href="#" className="hover:text-white">Pricing</a></li>
                <li><a href="#" className="hover:text-white">API Documentation</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/landing/about" className="hover:text-white">About Us</Link></li>
                <li><a href="#" className="hover:text-white">Careers</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
                <li><a href="#" className="hover:text-white">Press</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Help Center</a></li>
                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white">GDPR Compliance</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2025 Halo Group Ltd. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}