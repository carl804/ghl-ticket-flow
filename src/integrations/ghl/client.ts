import { logger } from "@/components/ErrorLog";
import { getAccessToken, refreshAccessToken, logout } from "./oauth";

const GHL_API_BASE = "https://services.leadconnectorhq.com";  // v2 API
const GHL_LOCATION_ID = import.meta.env.VITE_GHL_LOCATION_ID;

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

  if (!GHL_LOCATION_ID) {
    const error = "Missing GoHighLevel Location ID";
    logger.error(error);
    throw new Error(error);
  }

  let url = `${GHL_API_BASE}${endpoint}`;
  
  if (options?.queryParams) {
    const params = new URLSearchParams(options.queryParams);
    url += `?${params.toString()}`;
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    Version: "2021-07-28",
    "Content-Type": "application/json",
  };

  logger.info(`API Request: ${options?.method || "GET"} ${endpoint}`, {
    url,
    method: options?.method || "GET",
    authPrefix: token.substring(0, 15) + "...",
  });

  const response = await fetch(url, {
    method: options?.method || "GET",
    headers,
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  // Handle 401 with token refresh retry
  if (response.status === 401 && retryCount === 0) {
    logger.info("Received 401, attempting token refresh");
    try {
      await refreshAccessToken();
      // Retry the request once with new token
      return await ghlRequest<T>(endpoint, options, retryCount + 1);
    } catch (error) {
      logger.error("Token refresh failed, logging out", error);
      logout();
      throw new Error("Authentication failed");
    }
  }

  const text = await response.text();

  if (!text) {
    logger.error(`Empty response from GHL API`, {
      status: response.status,
      url,
    });
    throw new Error(`Empty response (Status: ${response.status})`);
  }

  const data = JSON.parse(text);

  if (!response.ok) {
    logger.error(`GHL API Error: ${response.status}`, {
      status: response.status,
      url,
      response: data,
    });
    throw new Error(data?.message || data?.error || `API Error: ${response.status}`);
  }

  logger.success(`API Success: ${endpoint}`, {
    status: response.status,
  });

  return data as T;
}