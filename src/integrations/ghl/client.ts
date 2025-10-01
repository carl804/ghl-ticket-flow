import { logger } from "@/components/ErrorLog";

const GHL_API_BASE = "https://rest.gohighlevel.com/v1";
const GHL_API_TOKEN = import.meta.env.VITE_GHL_API_TOKEN;
const GHL_LOCATION_ID = import.meta.env.VITE_GHL_LOCATION_ID;

export async function ghlRequest<T>(
  endpoint: string,
  options?: {
    method?: string;
    body?: any;
    queryParams?: Record<string, string>;
  }
): Promise<T> {
  if (!GHL_API_TOKEN || !GHL_LOCATION_ID) {
    const error = "Missing GoHighLevel credentials";
    logger.error(error, {
      hasToken: !!GHL_API_TOKEN,
      hasLocationId: !!GHL_LOCATION_ID,
    });
    throw new Error(error);
  }

  let url = `${GHL_API_BASE}${endpoint}`;
  
  if (options?.queryParams) {
    const params = new URLSearchParams(options.queryParams);
    url += `?${params.toString()}`;
  }

  const headers = {
    Authorization: `Bearer ${GHL_API_TOKEN}`,
    Version: "2021-07-28",
    "Content-Type": "application/json",
  };

  logger.info(`API Request: ${options?.method || "GET"} ${endpoint}`, {
    url,
    method: options?.method || "GET",
    authPrefix: GHL_API_TOKEN.substring(0, 15) + "...",
    locationId: GHL_LOCATION_ID,
  });

  const response = await fetch(url, {
    method: options?.method || "GET",
    headers,
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();

  if (!text) {
    logger.error(`Empty response from GHL API`, {
      status: response.status,
      statusText: response.statusText,
      url,
    });
    throw new Error(`Empty response (Status: ${response.status})`);
  }

  const data = JSON.parse(text);

  if (!response.ok) {
    logger.error(`GHL API Error: ${response.status}`, {
      status: response.status,
      statusText: response.statusText,
      url,
      response: data,
      headers: Object.fromEntries(response.headers.entries()),
    });
    throw new Error(data?.message || data?.error || `API Error: ${response.status}`);
  }

  logger.success(`API Success: ${endpoint}`, {
    status: response.status,
    dataPreview: JSON.stringify(data).substring(0, 200),
  });

  return data as T;
}