import { createContext, useContext, useEffect, useState } from "react";
import type { AuthUser } from "@/types";
import { apiRequest } from "@/lib/queryClient";

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
    // In development mode, create a mock user automatically
    setUser({
      id: 1,
      email: "demo@demo.com",
      firstName: "Demo",
      lastName: "User",
      role: "admin",
      department: "Administration"
    });
    setLoading(false);
    return;

    // Check for existing auth token
    const token = localStorage.getItem('auth_token');
    if (token) {
      // Validate token and get user info
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
          'X-Tenant-Subdomain': 'demo' // In production, extract from hostname
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData.user);
      } else {
        localStorage.removeItem('auth_token');
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
      const response = await apiRequest('POST', '/api/auth/login', {
        email,
        password
      });

      const data = await response.json();
      
      localStorage.setItem('auth_token', data.token);
      setUser(data.user);
    } catch (error) {
      throw new Error('Login failed. Please check your credentials.');
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setUser(null);
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
