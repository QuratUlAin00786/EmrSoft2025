import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { apiRequest } from "@/lib/queryClient";
import { useTenant } from "@/hooks/use-tenant";
import { Settings as SettingsIcon, Globe, Shield, Palette, Save } from "lucide-react";
import type { Organization } from "@/types";

const regions = [
  { value: "UK", label: "United Kingdom" },
  { value: "EU", label: "European Union" },
  { value: "ME", label: "Middle East" },
  { value: "SA", label: "Saudi Arabia" },
  { value: "US", label: "United States" }
];

const themes = [
  { value: "default", label: "Medical Blue" },
  { value: "green", label: "Medical Green" },
  { value: "purple", label: "Professional Purple" },
  { value: "dark", label: "Dark Mode" }
];

export default function Settings() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();
  const [hasChanges, setHasChanges] = useState(false);

  const { data: organization, isLoading, error } = useQuery<Organization>({
    queryKey: ["/api/tenant/info"],
  });



  const [settings, setSettings] = useState({
    name: "",
    brandName: "",
    region: "UK",
    theme: "default",
    gdprEnabled: true,
    aiEnabled: true,
    billingEnabled: true
  });

  // Update settings when organization data is loaded
  useEffect(() => {
    if (organization) {
      setSettings({
        name: organization.name || "",
        brandName: organization.brandName || "",
        region: organization.region || "UK",
        theme: organization.settings?.theme?.primaryColor || "default",
        gdprEnabled: organization.settings?.compliance?.gdprEnabled || true,
        aiEnabled: organization.settings?.features?.aiEnabled || true,
        billingEnabled: organization.settings?.features?.billingEnabled || true
      });
    }
  }, [organization]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (updatedSettings: any) => {
      return apiRequest('PATCH', '/api/organization/settings', updatedSettings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenant/info"] });
      setHasChanges(false);
    }
  });

  const handleInputChange = (field: string, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    const updatedSettings = {
      name: settings.name,
      brandName: settings.brandName,
      region: settings.region,
      settings: {
        theme: { primaryColor: settings.theme },
        compliance: { gdprEnabled: settings.gdprEnabled },
        features: { 
          aiEnabled: settings.aiEnabled, 
          billingEnabled: settings.billingEnabled 
        }
      }
    };
    
    updateSettingsMutation.mutate(updatedSettings);
  };

  if (isLoading) {
    return (
      <>
        <Header 
          title="Settings" 
          subtitle="Configure your organization settings and preferences."
        />
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header 
          title="Settings" 
          subtitle="Configure your organization settings and preferences."
        />
        <div className="flex-1 p-6">
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-neutral-600 mb-4">
                Settings require administrator access.
              </p>
              <p className="text-sm text-neutral-500 mb-4">
                Please log in with admin credentials to access organization settings.
              </p>
              <div className="bg-blue-50 p-4 rounded-lg text-left">
                <p className="font-medium text-blue-900 mb-2">Admin Login:</p>
                <p className="text-sm text-blue-800">Email: admin@demo.medicoreemr.com</p>
                <p className="text-sm text-blue-800">Password: password123</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Header 
        title="Settings" 
        subtitle="Configure your organization settings and preferences."
      />
      
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Organization Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <SettingsIcon className="h-5 w-5" />
                <span>Organization Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="organizationName">Organization Name</Label>
                  <Input
                    id="organizationName"
                    value={settings.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="brandName">Brand Name</Label>
                  <Input
                    id="brandName"
                    value={settings.brandName}
                    onChange={(e) => handleInputChange('brandName', e.target.value)}
                    placeholder="e.g., MediCore EMR"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Regional Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="h-5 w-5" />
                <span>Regional Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="region">Operating Region</Label>
                <Select 
                  value={settings.region} 
                  onValueChange={(value) => handleInputChange('region', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    {regions.map((region) => (
                      <SelectItem key={region.value} value={region.value}>
                        {region.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-neutral-600">
                  This determines compliance requirements and data residency rules.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Compliance Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Compliance & Security</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>GDPR Compliance</Label>
                  <p className="text-sm text-neutral-600">
                    Enable enhanced data protection features required for EU/UK operations.
                  </p>
                </div>
                <Switch
                  checked={settings.gdprEnabled}
                  onCheckedChange={(checked) => handleInputChange('gdprEnabled', checked)}
                />
              </div>
              
              {settings.gdprEnabled && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">GDPR Features Enabled</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Enhanced audit logging</li>
                    <li>• Data encryption at rest and in transit</li>
                    <li>• Right to be forgotten implementation</li>
                    <li>• Data portability features</li>
                    <li>• Consent management</li>
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Feature Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Feature Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>AI Insights</Label>
                  <p className="text-sm text-neutral-600">
                    Enable AI-powered medical insights and recommendations.
                  </p>
                </div>
                <Switch
                  checked={settings.aiEnabled}
                  onCheckedChange={(checked) => handleInputChange('aiEnabled', checked)}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Billing Module</Label>
                  <p className="text-sm text-neutral-600">
                    Enable billing and payment processing features.
                  </p>
                </div>
                <Switch
                  checked={settings.billingEnabled}
                  onCheckedChange={(checked) => handleInputChange('billingEnabled', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Theme Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Palette className="h-5 w-5" />
                <span>Theme & Appearance</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="theme">Color Theme</Label>
                <Select 
                  value={settings.theme} 
                  onValueChange={(value) => handleInputChange('theme', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent>
                    {themes.map((theme) => (
                      <SelectItem key={theme.value} value={theme.value}>
                        {theme.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-neutral-600">
                  Customize the color scheme for your organization's branding.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          {hasChanges && (
            <div className="sticky bottom-6 flex justify-end">
              <Button 
                onClick={handleSave}
                disabled={updateSettingsMutation.isPending}
                className="bg-medical-blue hover:bg-blue-700 shadow-lg"
              >
                <Save className="h-4 w-4 mr-2" />
                {updateSettingsMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
