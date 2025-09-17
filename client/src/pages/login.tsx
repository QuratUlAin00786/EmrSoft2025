import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/use-auth";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import curaLogoPath from "@assets/Cura Logo Main_1751893631982.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      console.log("🔐 Login attempt starting...");
      console.log("📧 Email/Username:", email);
      console.log("🌐 Current hostname:", window.location.hostname);
      console.log("🏢 Detected tenant:", getTenantSubdomain());
      
      await login(email, password);
      console.log("✅ Login successful");
    } catch (err: any) {
      console.error("❌ Login failed:", err);
      console.error("📋 Full error details:", {
        message: err.message,
        stack: err.stack,
        name: err.name,
        cause: err.cause
      });
      
      // Provide more specific error messages
      let errorMessage = "Login failed. Please check your credentials.";
      
      if (err.message) {
        if (err.message.includes("401")) {
          errorMessage = "Invalid email/username or password. Please check your credentials.";
        } else if (err.message.includes("500")) {
          errorMessage = "Server error. Please try again in a moment.";
        } else if (err.message.includes("404")) {
          errorMessage = "Login service not found. Please contact support.";
        } else if (err.message.includes("Network")) {
          errorMessage = "Network error. Please check your internet connection and try again.";
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to get tenant subdomain (same as in other files)
  const getTenantSubdomain = (): string => {
    const hostname = window.location.hostname;
    
    // For development/replit environments, use 'demo'
    if (hostname.includes('.replit.app') || hostname.includes('localhost') || hostname.includes('replit.dev') || hostname.includes('127.0.0.1')) {
      return 'demo';
    }
    
    // For production environments, extract subdomain from hostname
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      return parts[0] || 'demo';
    }
    
    // Fallback to 'demo'
    return 'demo';
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-4">
        {/* Logo and Branding */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <img 
              src={curaLogoPath} 
              alt="Cura by halo group" 
              className="h-32 w-auto"
            />
          </div>
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-[hsl(235,45%,25%)] mb-3">Welcome to Cura</h1>
            <div className="space-y-2 text-sm text-[hsl(225,16%,65%)] max-w-sm mx-auto">
              <p className="font-medium text-base">AI-Powered Healthcare Platform</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center justify-center bg-[hsl(235,50%,92%)] rounded-lg py-2 px-3">
                  <span>🏥 Patient Management</span>
                </div>
                <div className="flex items-center justify-center bg-[hsl(235,50%,92%)] rounded-lg py-2 px-3">
                  <span>🤖 AI Clinical Insights</span>
                </div>
                <div className="flex items-center justify-center bg-[hsl(235,50%,92%)] rounded-lg py-2 px-3">
                  <span>📅 Smart Scheduling</span>
                </div>
                <div className="flex items-center justify-center bg-[hsl(235,50%,92%)] rounded-lg py-2 px-3">
                  <span>💳 Billing & Payments</span>
                </div>
              </div>
              <p className="text-xs text-[hsl(225,16%,65%)] mt-3">
                Streamline workflows • Enhance patient care • Ensure compliance
              </p>
            </div>
          </div>
        </div>

        {/* Demo Credentials */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-blue-800">Demo Credentials</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <div className="font-medium text-blue-700">Admin:</div>
                <div className="text-blue-600">admin@cura.com</div>
                <div className="text-blue-600">admin123</div>
              </div>
              <div className="space-y-1">
                <div className="font-medium text-blue-700">Doctor:</div>
                <div className="text-blue-600">doctor@cura.com</div>
                <div className="text-blue-600">doctor123</div>
              </div>
              <div className="space-y-1">
                <div className="font-medium text-blue-700">Patient:</div>
                <div className="text-blue-600">patient@cura.com</div>
                <div className="text-blue-600">patient123</div>
              </div>
              <div className="space-y-1">
                <div className="font-medium text-blue-700">Nurse:</div>
                <div className="text-blue-600">nurse@cura.com</div>
                <div className="text-blue-600">nurse123</div>
              </div>
            </div>
            <div className="mt-2 text-xs text-blue-600">
              Use email OR username (e.g., "admin" instead of "admin@cura.com")
            </div>
          </CardContent>
        </Card>

        {/* Login Form */}
        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Enter your email or username to access the EMR system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Email or Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@cura.com or admin"
                  required
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  disabled={isLoading}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner className="mr-2 h-4 w-4" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>



        {/* Footer */}
        <div className="text-center text-xs text-[hsl(225,16%,65%)]">
          <p>Cura by halo group</p>
          <p>Secure • Compliant • AI-Powered</p>
        </div>
      </div>
    </div>
  );
}