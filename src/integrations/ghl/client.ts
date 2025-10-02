import { logger } from "@/components/ErrorLog";

// Point to the Netlify proxy function
const GHL_API_PROXY = "/.netlify/functions/ghl-proxy";

export async function ghlRequest<T>(
  endpoint: string,
  options?: {
    method?: string;
    body?: any;
    queryParams?: Record<string, string>;
  }
): Promise<T> {
  const response = await fetch(GHL_API_PROXY, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint,
      method: options?.method || "GET",
      body: options?.body,
      queryParams: options?.queryParams,
    }),
  });

  const text = await response.text();
  if (!text) throw new Error(`Empty response from proxy (${endpoint})`);

  const data = JSON.parse(text);
  if (!response.ok) {
    logger.error(`Proxy API Error: ${response.status}`, { endpoint, data });
    throw new Error(data?.error || `Proxy error ${response.status}`);
  }

  return data as T;
}
