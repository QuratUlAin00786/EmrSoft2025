import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Helper function to get the correct API base URL for both dev and production
function getApiBaseUrl(): string {
  // For production, we need to ensure requests go to the same origin
  // Check if we're in a deployed environment vs development
  if (window.location.hostname !== 'localhost' && !window.location.hostname.includes('replit.dev')) {
    // Production environment - use absolute URL to ensure correct routing
    return window.location.origin;
  }
  // Development environment - use relative URLs
  return '';
}

function buildApiUrl(path: string): string {
  const baseUrl = getApiBaseUrl();
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // Special handling for production - ensure full path is included
  if (baseUrl) {
    return `${baseUrl}${normalizedPath}`;
  }
  
  // Development fallback
  return normalizedPath;
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
  
  const res = await fetch(apiUrl, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  await throwIfResNotOk(res);
  return res;
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