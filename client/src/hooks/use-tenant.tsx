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
    // Get subdomain from localStorage (set during login) instead of hostname
    // This ensures we use the user's actual organization subdomain, not the Replit subdomain
    const subdomain = localStorage.getItem('user_subdomain') || 'demo';
    
    // Fetch tenant data from API based on subdomain
    const fetchTenant = async () => {
      try {
        setLoading(true);
        setError(null);
        
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
