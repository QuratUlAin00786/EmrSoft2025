import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Helper function to get the correct tenant subdomain
export function getTenantSubdomain(): string {
  // PRIORITY 1: Check for subdomain in URL path (e.g., /aaa/auth/login)
  const pathname = window.location.pathname;
  const pathParts = pathname.split('/').filter(Boolean);
  if (pathParts.length >= 2 && pathParts[1] === 'auth' && pathParts[2] === 'login') {
    const subdomainFromPath = pathParts[0];
    if (subdomainFromPath) {
      return subdomainFromPath;
    }
  }
  
  // PRIORITY 2: Check for subdomain query parameter (for backward compatibility)
  const urlParams = new URLSearchParams(window.location.search);
  const subdomainParam = urlParams.get('subdomain');
  if (subdomainParam) {
    return subdomainParam;
  }
  
  // PRIORITY 3: Check localStorage for user's organization subdomain (set during login)
  const userSubdomain = localStorage.getItem('user_subdomain');
  if (userSubdomain) {
    return userSubdomain;
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

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = {
    'X-Tenant-Subdomain': getTenantSubdomain()
  };
  
  if (data) {
    headers['Content-Type'] = 'application/json';
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const token = localStorage.getItem('auth_token');
    const headers: Record<string, string> = {
      'X-Tenant-Subdomain': getTenantSubdomain()
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log("Making request to:", queryKey[0], "with auth token:", !!token);
    console.log("Request headers:", headers);
    
    // Debug for patients specifically
    if (queryKey[0] === "/api/patients") {
      console.log("Patients request - token exists:", !!token);
      console.log("Patients request - headers:", headers);
    }
    
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
      headers
    });

    console.log("Query response status:", res.status);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error("Query failed:", res.status, errorText);
      
      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }
      
      await throwIfResNotOk(res);
      return null;
    }
    const data = await res.json();
    console.log("Query response data:", data);
    return data;
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 0,
      retry: 1,
    },
    mutations: {
      retry: false,
    },
  },
});
