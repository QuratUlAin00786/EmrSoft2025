import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Simplified URL building that works in all environments
function buildApiUrl(path: string): string {
  // Always use relative URLs - this works in both dev and production
  // The browser will automatically resolve to the correct domain
  return path.startsWith('/') ? path : `/${path}`;
}

export async function saasApiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const token = localStorage.getItem('saasToken');
  const headers: Record<string, string> = {};
  
  if (data) {
    headers['Content-Type'] = 'application/json';
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Build the correct URL for both dev and production environments
  const apiUrl = buildApiUrl(url);
  
  // Add logging to debug production issues
  console.log('🔍 SaaS API Call:', {
    method,
    originalUrl: url,
    finalUrl: apiUrl,
    location: window.location.href,
    hostname: window.location.hostname
  });

  try {
    const res = await fetch(apiUrl, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    console.log('📡 SaaS API Response:', {
      status: res.status,
      statusText: res.statusText,
      ok: res.ok,
      url: res.url,
      headers: Object.fromEntries(res.headers.entries())
    });

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    // If token is invalid, clear it and force re-login
    if (error.message.includes('401')) {
      localStorage.removeItem('saasToken');
      window.location.reload();
      return;
    }
    console.error('❌ SaaS API Error:', {
      error: error.message,
      stack: error.stack,
      finalUrl: apiUrl
    });
    throw error;
  }
}

export const getSaaSQueryFn: QueryFunction = async ({ queryKey }) => {
  const token = localStorage.getItem('saasToken');
  const headers: Record<string, string> = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Build the correct URL for both dev and production environments
  const apiUrl = buildApiUrl(queryKey[0] as string);
  
  const res = await fetch(apiUrl, {
    headers
  });

  if (!res.ok) {
    // If token is invalid, clear it and force re-login
    if (res.status === 401) {
      localStorage.removeItem('saasToken');
      // Reload page to trigger re-authentication
      window.location.reload();
      return;
    }
    const errorText = await res.text();
    throw new Error(`${res.status}: ${errorText}`);
  }

  return res.json();
};

export const saasQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getSaaSQueryFn,
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});