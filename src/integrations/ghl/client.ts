// src/integrations/ghl/client.ts
import { logger } from "@/components/ErrorLog";
import { getAccessToken, refreshAccessToken, logout } from "./oauth";

const PROXY_URL = "/api/ghl-proxy";

export async function ghlRequest<T>(
  endpoint: string,
  options?: {
    method?: string;
    body?: any;
    queryParams?: Record<string, string>;
  },
  retryCount = 0
): Promise<T> {
  const token = await getAccessToken();
  
  if (!token) {
    const error = "Not authenticated with GoHighLevel";
    logger.error(error);
    logout();
    throw new Error(error);
  }
  
  // Get location ID from stored tokens
  const tokens = JSON.parse(localStorage.getItem('ghl_tokens') || '{}');
  const locationId = tokens.locationId;
  
  // Prepare request payload for Netlify proxy
  const proxyBody = {
    endpoint,
    method: options?.method || "GET",
    body: options?.body,
    queryParams: options?.queryParams,
    locationId, // Add location ID to proxy body
  };
  
  logger.info(`API Request → Proxy: ${options?.method || "GET"} ${endpoint}`, proxyBody);
  
  const response = await fetch(PROXY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`, // ← THIS WAS MISSING!
    },
    body: JSON.stringify(proxyBody),
  });
  
  const text = await response.text();
  
  if (!text) {
    logger.error(`Empty response from GHL proxy`, {
      status: response.status,
      endpoint,
    });
    throw new Error(`Empty response (Status: ${response.status})`);
  }
  
  let data: any;
  try {
    data = JSON.parse(text);
  } catch (err) {
    logger.error("Failed to parse JSON response from proxy", text);
    throw new Error("Invalid response from proxy");
  }
  
  if (!response.ok) {
    // Handle 401 specifically - token might be expired
    if (response.status === 401 && retryCount === 0) {
      logger.info("Token expired, attempting refresh...");
      const newToken = await refreshAccessToken();
      if (newToken) {
        // Retry with new token
        return ghlRequest(endpoint, options, retryCount + 1);
      }
    }
    
    logger.error(`GHL Proxy Error: ${response.status}`, {
      status: response.status,
      endpoint,
      response: data,
    });
    
    throw new Error(data?.error || `API Error: ${response.status}`);
  }
  
  logger.success(`API Success via proxy: ${endpoint}`);
  return data as T;
}
