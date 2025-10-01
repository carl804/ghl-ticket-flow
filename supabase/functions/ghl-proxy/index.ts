// Deno Deploy / Supabase Edge Function
// Path: supabase/functions/ghl-proxy/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GHL_API_BASE = "https://services.leadconnectorhq.com"; // v2 base
const GHL_API_TOKEN = Deno.env.get("VITE_GHL_API_TOKEN");     // set in Lovable Cloud Secrets
const GHL_LOCATION_ID = Deno.env.get("VITE_GHL_LOCATION_ID"); // set in Lovable Cloud Secrets

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { endpoint, method = "GET", body, queryParams } = await req.json();

    if (!GHL_API_TOKEN || !GHL_LOCATION_ID) {
      return new Response(
        JSON.stringify({ error: "Missing API credentials: VITE_GHL_API_TOKEN or VITE_GHL_LOCATION_ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build request URL
    const url = new URL(`${GHL_API_BASE}${endpoint}`);
    // Always pass location in query (many endpoints require it), but keep any provided params.
    const qp = new URLSearchParams(queryParams || {});
    if (!qp.has("location_id") && !qp.has("locationId")) {
      qp.set("location_id", GHL_LOCATION_ID);
    }
    qp.forEach((v, k) => url.searchParams.set(k, v));

    const headers: Record<string, string> = {
      "Authorization": `Bearer ${GHL_API_TOKEN}`,
      "Content-Type": "application/json",
      // Also include LocationId header (some endpoints accept header form)
      "LocationId": GHL_LOCATION_ID,
    };

    const upstream = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await upstream.text();
    const contentType = upstream.headers.get("content-type") || "";

    // Forward upstream status (don’t collapse everything to 500 — helps you debug in UI)
    if (!upstream.ok) {
      return new Response(
        JSON.stringify({
          error: `Upstream ${upstream.status}`,
          details: contentType.includes("application/json") ? safeParse(text) : text.slice(0, 500),
        }),
        { status: upstream.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const json = contentType.includes("application/json") ? safeParse(text) : { raw: text };
    return new Response(JSON.stringify(json), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function safeParse(s: string) {
  try { return s ? JSON.parse(s) : {}; } catch { return { raw: s }; }
}
