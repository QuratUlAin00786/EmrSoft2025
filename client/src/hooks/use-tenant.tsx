import { createContext, useContext, useEffect, useState } from "react";
import type { TenantInfo } from "@/types";

interface TenantContextType {
  tenant: TenantInfo | null;
  loading: boolean;
  error: string | null;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Extract tenant from subdomain
    const hostname = window.location.hostname;
    const subdomain = hostname.split('.')[0];
    
    // For development, we'll use a default tenant
    if (hostname === 'localhost' || hostname.includes('repl.co')) {
      setTenant({
        id: 1,
        name: "Demo Healthcare Clinic",
        subdomain: "demo",
        region: "UK",
        brandName: "MediCore EMR",
        settings: {
          theme: { primaryColor: "#1976D2" },
          compliance: { gdprEnabled: true, dataResidency: "EU" },
          features: { aiEnabled: true, billingEnabled: true }
        }
      });
      setLoading(false);
      return;
    }

    // In production, this would fetch tenant data from API
    // based on subdomain
    const fetchTenant = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // This would be a real API call
        const response = await fetch('/api/tenant/info', {
          headers: {
            'X-Tenant-Subdomain': subdomain
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to load tenant information');
        }
        
        const tenantData = await response.json();
        setTenant(tenantData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        console.error('Tenant loading error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTenant();
  }, []);

  return (
    <TenantContext.Provider value={{ tenant, loading, error }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
