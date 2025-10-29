import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link } from "wouter";
import { storeSubdomain } from "@/lib/subdomain-utils";
import { ArrowLeft, Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";

const curaLogoPath = "/cura-logo-chatbot.png";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      console.log("🔐 UNIVERSAL LOGIN: Attempting login for:", email);

      // Use universal login API that determines subdomain from user's organization
      const response = await fetch("/api/auth/universal-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Login failed");
      }

      const data = await response.json();

      // Store token in localStorage (same key as auth context uses)
      localStorage.setItem("auth_token", data.token);

      // Store subdomain for tenant context
      const subdomain = data.organization.subdomain;
      storeSubdomain(subdomain);

      console.log("🔐 UNIVERSAL LOGIN SUCCESS:", {
        user: data.user.email,
        organization: data.organization.name,
        subdomain: subdomain,
      });

      // Redirect to dashboard with organization's subdomain
      // Force reload to trigger AuthContext validation
      window.location.href = `/${subdomain}/dashboard`;
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link
            href="/landing"
            className="inline-flex items-center text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Landing Page
          </Link>

          <div className="flex items-center justify-center space-x-2 mb-4">
            <img src={curaLogoPath} alt="Cura EMR" className="h-10 w-auto" />
            <span className="text-2xl font-bold text-gray-900 dark:text-white"></span>
          </div>
          <p className="text-gray-600 dark:text-gray-300">
            Sign in to access your healthcare dashboard
          </p>
        </div>

        {/* Login Form */}
        <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="text-center text-2xl">Welcome Back</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            {/* Demo Credentials */}
            <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-3">
                Demo Credentials
              </h4>
              <div className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
                <div className="flex justify-between">
                  <span>Admin:</span>
                  <span>james@curaemr.ai / 467fe887</span>
                </div>
                <div className="flex justify-between">
                  <span>Doctor:</span>
                  <span>paul@curaemr.ai / doctor123</span>
                </div>
                <div className="flex justify-between">
                  <span>Patient:</span>
                  <span>john@curaemr.ai / patient123</span>
                </div>
                <div className="flex justify-between">
                  <span>Nurse:</span>
                  <span>emma@curaemr.ai / nurse123</span>
                </div>
                <div className="flex justify-between">
                  <span>Lab Tech:</span>
                  <span>amelia@curaemr.ai / lab123</span>
                </div>
                <div className="flex justify-between">
                  <span>Sample Taker:</span>
                  <span>sampletaker@cura.com / sample123</span>
                </div>
              </div>
            </div>

            {/* Quick Access Buttons */}
            <div className="mt-6 grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setEmail("james@curaemr.ai");
                  setPassword("467fe887");
                }}
                className="text-xs"
                data-testid="button-login-admin"
              >
                Admin
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setEmail("paul@curaemr.ai");
                  setPassword("doctor123");
                }}
                className="text-xs"
                data-testid="button-login-doctor"
              >
                Doctor
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setEmail("john@curaemr.ai");
                  setPassword("patient123");
                }}
                className="text-xs"
                data-testid="button-login-patient"
              >
                Patient
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setEmail("emma@curaemr.ai");
                  setPassword("nurse123");
                }}
                className="text-xs"
                data-testid="button-login-labtech"
              >
                Nurse
              </Button>
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setEmail("amelia@curaemr.ai");
                  setPassword("lab123");
                }}
                className="text-xs"
                data-testid="button-login-labtech"
              >
                Lab Tech
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setEmail("sampletaker@cura.com");
                  setPassword("sample123");
                }}
                className="text-xs"
                data-testid="button-login-sampletaker"
              >
                Sample Taker
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-600 dark:text-gray-300">
          <p>&copy; 2025 Halo Group Ltd. All rights reserved.</p>
          <div className="mt-2 space-x-4">
            <Link
              href="/landing/about"
              className="hover:text-blue-600 dark:hover:text-blue-400"
            >
              About Us
            </Link>
            <Link
              href="/landing/features"
              className="hover:text-blue-600 dark:hover:text-blue-400"
            >
              Features
            </Link>
            <a
              href="#"
              className="hover:text-blue-600 dark:hover:text-blue-400"
            >
              Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
