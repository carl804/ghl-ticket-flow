// src/integrations/ghl/client.ts
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
    throw new Error("Missing GoHighLevel credentials in environment variables");
  }

  let url = `${GHL_API_BASE}${endpoint}`;
  
  if (options?.queryParams) {
    const params = new URLSearchParams(options.queryParams);
    url += `?${params.toString()}`;
  }

  console.log(`[GHL] ${options?.method || "GET"} ${url}`);

  const response = await fetch(url, {
    method: options?.method || "GET",
    headers: {
      Authorization: `Bearer ${GHL_API_TOKEN}`,
      Version: "2021-07-28",
      "Content-Type": "application/json",
      LocationId: GHL_LOCATION_ID,
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  console.log(`[GHL] Response:`, text.substring(0, 300));

  if (!text) {
    throw new Error(`Empty response (Status: ${response.status})`);
  }

  const data = JSON.parse(text);

  if (!response.ok) {
    throw new Error(data?.message || data?.error || `API Error: ${response.status}`);
  }

  return data as T;
}