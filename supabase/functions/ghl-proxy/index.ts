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
      throw new Error("Missing API Key or LocationId — check environment variables");
    }

    // Build URL with query parameters
    let url = `${GHL_API_BASE}${endpoint}`;
    if (queryParams) {
      const params = new URLSearchParams(queryParams);
      url += `?${params.toString()}`;
    }

    // Prepare headers
    const headers: Record<string, string> = {
      "Authorization": `Bearer ${GHL_API_TOKEN}`,
      "Version": "2021-07-28",
      "Content-Type": "application/json",
      "LocationId": GHL_LOCATION_ID,
    };

    console.log(`➡️ GHL API Request:
      Method: ${method}
      URL: ${url}
      Headers: ${JSON.stringify({ ...headers, Authorization: "****MASKED****" })}
      Body: ${body ? JSON.stringify(body) : "none"}
    `);

    // Call GHL
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    console.log(`⬅️ GHL API Response: status ${response.status}`);

    const text = await response.text();
    console.log(`Response raw: ${text.substring(0, 500)}`);

    let data: any = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch (parseError) {
      console.error("❌ JSON Parse Error:", parseError);
      throw new Error(`Invalid JSON response from GHL API: ${text.substring(0, 200)}`);
    }

    if (!response.ok) {
      console.error("❌ GHL API Error Response:", data);
      const errorMsg = data?.message || data?.msg || JSON.stringify(data);
      return new Response(
        JSON.stringify({ error: `GHL API Error (${response.status}): ${errorMsg}` }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`❌ Edge Function Error: ${message}`);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
