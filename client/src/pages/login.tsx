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
      await login(email, password);
    } catch (err: any) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
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
              className="h-40 w-auto"
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

        {/* Login Form */}
        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to access the EMR system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@domain.com"
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