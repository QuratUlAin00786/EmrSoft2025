import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/use-auth";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import haloLogoPath from "@assets/Screenshot 2025-06-25 at 12.40.02_1750837361778.png";

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

  const demoCredentials = [
    { role: "Admin", email: "admin@demo.medicoreemr.com", password: "password123" },
    { role: "Doctor", email: "doctor@demo.medicoreemr.com", password: "password123" },
    { role: "Nurse", email: "nurse@demo.medicoreemr.com", password: "password123" },
    { role: "Receptionist", email: "receptionist@demo.medicoreemr.com", password: "password123" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo and Branding */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <img 
              src={haloLogoPath} 
              alt="Averox" 
              className="h-16 w-16 rounded-lg shadow-lg"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Averox EMR</h1>
          <p className="text-gray-600 mt-2">Comprehensive Healthcare Management</p>
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

        {/* Demo Credentials */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Demo Credentials</CardTitle>
            <CardDescription className="text-xs">
              Use these credentials to test the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {demoCredentials.map((cred, index) => (
                <div key={index} className="text-xs p-2 bg-gray-50 rounded border">
                  <div className="font-medium text-gray-700">{cred.role}</div>
                  <div className="text-gray-600">{cred.email}</div>
                  <div className="text-gray-500">Password: {cred.password}</div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-1 h-6 text-xs"
                    onClick={() => {
                      setEmail(cred.email);
                      setPassword(cred.password);
                    }}
                  >
                    Use Credentials
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500">
          <p>Averox Ltd Healthcare Solutions</p>
          <p>Secure • Compliant • Comprehensive</p>
        </div>
      </div>
    </div>
  );
}