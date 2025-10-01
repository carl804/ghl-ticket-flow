import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GHL_API_BASE = "https://rest.gohighlevel.com/v1";
const GHL_API_TOKEN = Deno.env.get("VITE_GHL_API_TOKEN");
const GHL_LOCATION_ID = Deno.env.get("VITE_GHL_LOCATION_ID");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { endpoint, method = "GET", body, queryParams } = await req.json();

    if (!GHL_API_TOKEN || !GHL_LOCATION_ID) {
      throw new Error("Missing API Key or LocationId");
    }

    let url = `${GHL_API_BASE}${endpoint}`;
    if (queryParams) {
      const params = new URLSearchParams(queryParams);
      url += `?${params.toString()}`;
    }

    console.log(`[ghl-proxy] Request → ${method} ${url}`);
    console.log("[ghl-proxy] Headers →", {
      Authorization: `Bearer ${GHL_API_TOKEN?.slice(0,6)}...`, // hide full key
      LocationId: GHL_LOCATION_ID,
      "Content-Type": "application/json",
    });
    if (body) console.log("[ghl-proxy] Body →", body);

    const headers: Record<string, string> = {
      "Authorization": `Bearer ${GHL_API_TOKEN}`,
      "Version": "2021-07-28",
      "Content-Type": "application/json",
      "LocationId": GHL_LOCATION_ID,
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    console.log(`[ghl-proxy] Response status: ${response.status}`);
    const text = await response.text();
    console.log(`[ghl-proxy] Response body: ${text.substring(0,200)}...`);

    let data: any = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch (parseError) {
      console.error("[ghl-proxy] JSON parse error:", parseError);
      throw new Error(`Invalid JSON from GHL: ${text.substring(0,100)}`);
    }

    if (!response.ok) {
      console.error("[ghl-proxy] Error response:", data);
      throw new Error(`GHL API Error (${response.status}): ${data?.message || JSON.stringify(data)}`);
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[ghl-proxy] Fatal error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
