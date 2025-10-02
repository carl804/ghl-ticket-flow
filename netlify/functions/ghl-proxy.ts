// netlify/functions/ghl-proxy.ts
import type { Handler } from "@netlify/functions";

const GHL_API_BASE = "https://services.leadconnectorhq.com";
const CLIENT_ID = process.env.VITE_GHL_CLIENT_ID;
const CLIENT_SECRET = process.env.VITE_GHL_CLIENT_SECRET;
const REDIRECT_URI = process.env.VITE_GHL_REDIRECT_URI;

export const handler: Handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, LocationId, Version",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    const { endpoint, method = "GET", body, queryParams, formEncoded, locationId } = JSON.parse(event.body || "{}");

    // Build URL
    let url = `${GHL_API_BASE}${endpoint}`;
    if (queryParams) {
      const params = new URLSearchParams(queryParams);
      url += `?${params.toString()}`;
    }

    // Build request headers
    const reqHeaders: Record<string, string> = {
      "Version": "2021-07-28",
      "Content-Type": "application/json",
    };

    // Handle OAuth token exchange specially
    if (endpoint === "/oauth/token") {
      const params = new URLSearchParams({
        client_id: CLIENT_ID || "",
        client_secret: CLIENT_SECRET || "",
        redirect_uri: REDIRECT_URI || "",
        ...body,
      });

      const response = await fetch(`${GHL_API_BASE}/oauth/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      const text = await response.text();
      return { 
        statusCode: response.status, 
        headers, 
        body: text 
      };
    }

    // For all other requests, use the OAuth Bearer token
    const authHeader = event.headers["authorization"];
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return { 
        statusCode: 401, 
        headers, 
        body: JSON.stringify({ error: "No authorization token provided" }) 
      };
    }

    // Extract the OAuth access token
    const accessToken = authHeader.replace("Bearer ", "");
    
    // Set authorization header with OAuth token
    reqHeaders["Authorization"] = `Bearer ${accessToken}`;
    
    // Add location ID if provided
    if (locationId) {
      reqHeaders["LocationId"] = locationId;
    }

    // Make the request to GHL API
    const response = await fetch(url, {
      method,
      headers: reqHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    const responseText = await response.text();
    
    // Log for debugging
    if (!response.ok) {
      console.error("GHL API Error:", {
        status: response.status,
        url,
        response: responseText.substring(0, 200)
      });
    }

    return { 
      statusCode: response.status, 
      headers, 
      body: responseText 
    };
    
  } catch (err: any) {
    console.error("Proxy error:", err);
    return { 
      statusCode: 500, 
      headers, 
      body: JSON.stringify({ 
        error: err.message,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined
      }) 
    };
  }
};