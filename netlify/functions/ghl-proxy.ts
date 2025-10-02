// netlify/functions/proxy.ts
import type { Handler } from "@netlify/functions";

const GHL_API_BASE = "https://services.leadconnectorhq.com";
const GHL_API_TOKEN = process.env.VITE_GHL_API_TOKEN;
const GHL_LOCATION_ID = process.env.VITE_GHL_LOCATION_ID;
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
    const { endpoint, method = "GET", body, queryParams, formEncoded } = JSON.parse(event.body || "{}");

    let url = `${GHL_API_BASE}${endpoint}`;
    if (queryParams) {
      const params = new URLSearchParams(queryParams);
      url += `?${params.toString()}`;
    }

    // Build headers
    const reqHeaders: Record<string, string> = {
      Version: "2021-07-28",
    };

    // If OAuth, no static API token required
    if (!endpoint.startsWith("/oauth")) {
      if (!GHL_API_TOKEN || !GHL_LOCATION_ID) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: "Missing API credentials" }) };
      }
      reqHeaders["Authorization"] = `Bearer ${GHL_API_TOKEN}`;
      reqHeaders["LocationId"] = GHL_LOCATION_ID;
      reqHeaders["Content-Type"] = "application/json";
    } else {
      reqHeaders["Content-Type"] = formEncoded ? "application/x-www-form-urlencoded" : "application/json";
    }

    // Handle OAuth special case
    let requestBody: any = undefined;
    if (endpoint === "/oauth/token") {
      const params = new URLSearchParams({
        client_id: CLIENT_ID || "",
        client_secret: CLIENT_SECRET || "",
        redirect_uri: REDIRECT_URI || "",
        ...body,
      });
      requestBody = formEncoded ? params.toString() : JSON.stringify(params);
    } else if (body) {
      requestBody = JSON.stringify(body);
    }

    const response = await fetch(url, {
      method,
      headers: reqHeaders,
      body: requestBody,
    });

    const text = await response.text();
    return { statusCode: response.status, headers, body: text };
  } catch (err: any) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
