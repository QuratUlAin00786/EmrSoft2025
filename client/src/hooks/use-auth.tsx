import { createContext, useContext, useEffect, useState } from "react";
import type { AuthUser } from "@/types";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Helper function to get the correct tenant subdomain
function getTenantSubdomain(): string {
  // Check for subdomain query parameter first (for development)
  const urlParams = new URLSearchParams(window.location.search);
  const subdomainParam = urlParams.get('subdomain');
  if (subdomainParam) {
    return subdomainParam;
  }
  
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
}

interface AuthContextType {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      validateToken(token);
    } else {
      setLoading(false);
    }
  }, []);

  const validateToken = async (token: string) => {
    try {
      const response = await fetch('/api/auth/validate', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': getTenantSubdomain()
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData.user);
        
        // Fetch and store user's organization subdomain if not already stored
        if (userData.user && userData.user.organizationId && !localStorage.getItem('user_subdomain')) {
          try {
            const orgResponse = await fetch(`/api/organizations/${userData.user.organizationId}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'X-Tenant-Subdomain': 'demo' // Use demo to fetch org info
              }
            });
            
            if (orgResponse.ok) {
              const orgData = await orgResponse.json();
              if (orgData.subdomain) {
                localStorage.setItem('user_subdomain', orgData.subdomain);
                console.log('🔐 SUBDOMAIN: Stored user subdomain on validation:', orgData.subdomain);
              }
            }
          } catch (orgError) {
            console.error('Failed to fetch organization subdomain:', orgError);
          }
        }
      } else {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_subdomain');
      }
    } catch (error) {
      console.error('Token validation error:', error);
      localStorage.removeItem('auth_token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      // First clear any existing token and cache
      localStorage.removeItem('auth_token');
      queryClient.clear();
      setUser(null);
      
      const response = await apiRequest('POST', '/api/auth/login', {
        email,
        password
      });

      const data = await response.json();
      
      // Set new token and user
      localStorage.setItem('auth_token', data.token);
      setUser(data.user);
      
      // Fetch and store user's organization subdomain
      if (data.user && data.user.organizationId) {
        try {
          const orgResponse = await fetch(`/api/organizations/${data.user.organizationId}`, {
            headers: {
              'Authorization': `Bearer ${data.token}`,
              'X-Tenant-Subdomain': 'demo' // Use demo to fetch org info
            }
          });
          
          if (orgResponse.ok) {
            const orgData = await orgResponse.json();
            if (orgData.subdomain) {
              localStorage.setItem('user_subdomain', orgData.subdomain);
              console.log('🔐 SUBDOMAIN: Stored user subdomain:', orgData.subdomain);
            }
          }
        } catch (orgError) {
          console.error('Failed to fetch organization subdomain:', orgError);
        }
      }
      
      // Clear React Query cache again to force fresh API calls with new token
      queryClient.clear();
      
      console.log('🔐 LOGIN: Successfully logged in as', data.user.email, 'with role', data.user.role);
    } catch (error) {
      throw new Error('Login failed. Please check your credentials.');
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_subdomain');
    setUser(null);
    // Clear React Query cache when logging out
    queryClient.clear();
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      loading,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
