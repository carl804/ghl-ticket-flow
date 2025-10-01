// src/integrations/ghl/client.ts
const GHL_PROXY_URL = import.meta.env.VITE_GHL_PROXY_URL || "/.netlify/functions/ghl-proxy";

export async function ghlRequest<T>(
  endpoint: string,
  options?: {
    method?: string;
    body?: any;
    queryParams?: Record<string, string>;
  }
): Promise<T> {
  console.log("[ghlRequest] Calling:", endpoint, options);
  
  try {
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

    console.log("[ghlRequest] Response status:", response.status);
    
    const text = await response.text();
    console.log("[ghlRequest] Raw response:", text);

    if (!text) {
      throw new Error("Empty response from proxy");
    }

    const data = JSON.parse(text);

    if (!response.ok) {
      throw new Error(data?.error || `HTTP ${response.status}`);
    }

    if (data?.error) {
      throw new Error(`GHL API Error: ${data.error}`);
    }

    return data as T;
  } catch (error) {
    console.error("[ghlRequest] Error:", error);
    throw error;
  }
}