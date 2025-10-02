// netlify/functions/ghl-proxy.ts
import type { Handler } from "@netlify/functions";
import jwt from "jsonwebtoken";

const GHL_API_BASE = "https://services.leadconnectorhq.com";
const CLIENT_ID = process.env.VITE_GHL_CLIENT_ID;
const CLIENT_SECRET = process.env.VITE_GHL_CLIENT_SECRET;
const REDIRECT_URI = process.env.VITE_GHL_REDIRECT_URI;
const STATIC_API_TOKEN = process.env.VITE_GHL_API_TOKEN; // fallback if testing outside iframe

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

    // 🔑 Build request headers
    const reqHeaders: Record<string, string> = {
      Version: "2021-07-28",
    };

    let authToken: string | null = null;
    let locationId: string | null = null;

    // --- 1. Try to get JWT from request ---
    const authHeader = event.headers["authorization"];
    const qsJwt = event.queryStringParameters?.jwt;

    const jwtToken = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : qsJwt;

    if (jwtToken) {
      try {
        const decoded = jwt.verify(jwtToken, CLIENT_SECRET || "") as any;
        authToken = jwtToken; // use the same JWT as Bearer
        locationId = decoded.locationId || decoded.location_id || null;
      } catch (err: any) {
        console.error("JWT verification failed:", err.message);
        return { statusCode: 401, headers, body: JSON.stringify({ error: "Invalid JWT" }) };
      }
    }

    // --- 2. If OAuth token exchange ---
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
          "Content-Type": formEncoded ? "application/x-www-form-urlencoded" : "application/json",
        },
        body: formEncoded ? params.toString() : JSON.stringify(Object.fromEntries(params)),
      });

      const text = await response.text();
      return { statusCode: response.status, headers, body: text };
    }

    // --- 3. If not OAuth, use JWT or static fallback ---
    if (authToken) {
      reqHeaders["Authorization"] = `Bearer ${authToken}`;
      if (locationId) reqHeaders["LocationId"] = locationId;
    } else if (STATIC_API_TOKEN) {
      reqHeaders["Authorization"] = `Bearer ${STATIC_API_TOKEN}`;
      if (process.env.VITE_GHL_LOCATION_ID) {
        reqHeaders["LocationId"] = process.env.VITE_GHL_LOCATION_ID;
      }
    } else {
      return { statusCode: 401, headers, body: JSON.stringify({ error: "No valid auth found" }) };
    }

    reqHeaders["Content-Type"] = "application/json";

    // --- 4. Make the request to GHL API ---
    const response = await fetch(url, {
      method,
      headers: reqHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await response.text();
    return { statusCode: response.status, headers, body: text };
  } catch (err: any) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
