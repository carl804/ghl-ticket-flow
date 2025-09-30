import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GHL_API_BASE = "https://services.leadconnectorhq.com";
const GHL_API_TOKEN = Deno.env.get("VITE_GHL_API_TOKEN");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { endpoint, method = "GET", body } = await req.json();

    if (!GHL_API_TOKEN) {
      throw new Error("GHL API token not configured");
    }

    const response = await fetch(`${GHL_API_BASE}${endpoint}`, {
      method,
      headers: {
        "Authorization": `Bearer ${GHL_API_TOKEN}`,
        "Content-Type": "application/json",
        "Version": "2021-07-28",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`GHL API Error: ${JSON.stringify(data)}`);
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
