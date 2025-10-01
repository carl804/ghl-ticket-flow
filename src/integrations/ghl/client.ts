const GHL_API_TOKEN = import.meta.env.VITE_GHL_API_TOKEN;
const GHL_LOCATION_ID = import.meta.env.VITE_GHL_LOCATION_ID;
const GHL_PROXY_URL = import.meta.env.VITE_GHL_PROXY_URL || "/.netlify/functions/ghl-proxy";

export async function ghlRequest<T>(
  endpoint: string,
  options?: {
    method?: string;
    body?: any;
    queryParams?: Record<string, string>;
  }
): Promise<T> {
  const response = await fetch(GHL_PROXY_URL, {
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

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  if (data?.error) {
    throw new Error(`GHL API Error: ${data.error}`);
  }

  return data as T;
}
