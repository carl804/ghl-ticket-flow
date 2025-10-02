// src/integrations/ghl/client.ts
import { logger } from "@/components/ErrorLog";

/**
 * All frontend API calls go through our Netlify proxy
 * /netlify/functions/ghl-proxy.ts
 */
const PROXY_URL = "/.netlify/functions/ghl-proxy";

export async function ghlRequest<T>(
  endpoint: string,
  options?: {
    method?: string;
    body?: any;
    queryParams?: Record<string, string>;
  }
): Promise<T> {
  let url = endpoint;

  if (options?.queryParams) {
    const params = new URLSearchParams(options.queryParams);
    url += `?${params.toString()}`;
  }

  logger.info(`Proxy API Request: ${options?.method || "GET"} ${url}`, {
    endpoint,
    method: options?.method || "GET",
  });

  const response = await fetch(PROXY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      endpoint,
      method: options?.method || "GET",
      body: options?.body,
      queryParams: options?.queryParams,
    }),
  });

  const text = await response.text();

  if (!text) {
    logger.error("Empty response from proxy", { endpoint, status: response.status });
    throw new Error(`Empty response (Status: ${response.status})`);
  }

  const data = JSON.parse(text);

  if (!response.ok) {
    logger.error("Proxy API Error", { status: response.status, endpoint, response: data });
    throw new Error(data?.error || `Proxy Error: ${response.status}`);
  }

  logger.success(`Proxy API Success: ${endpoint}`);
  return data as T;
}
