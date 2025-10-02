// netlify/functions/ghl-proxy.ts
import type { Handler } from "@netlify/functions";
import jwt from "jsonwebtoken";

const GHL_API_BASE = "https://services.leadconnectorhq.com";

const CLIENT_ID = process.env.VITE_GHL_CLIENT_ID;
const CLIENT_SECRET = process.env.VITE_GHL_CLIENT_SECRET;
const REDIRECT_URI = process.env.VITE_GHL_REDIRECT_URI;
const STATIC_API_TOKEN = process.env.VITE_GHL_API_TOKEN; // fallback if testing outside iframe
const STATIC_LOCATION_ID = process.env.VITE_GHL_LOCATION_ID;

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

    // --- 🔑 Step 1: Check for JWT (iframe installs)
    const jwtToken =
      event.queryStringParameters?.jwt ||
      event.headers["authorization"]?.replace("Bearer ", "");

    let useToken = STATIC_API_TOKEN;
    let useLocation = STATIC_LOCATION_ID;

    if (jwtToken) {
      try {
        const decoded: any = jwt.verify(jwtToken, CLIENT_SECRET || "");
        if (!decoded.locationId) {
          return { statusCode: 401, headers, body: JSON.stringify({ error: "JWT missing locationId" }) };
        }
        useToken = jwtToken; // reuse the same JWT as API bearer
        useLocation = decoded.locationId;
      } catch (err: any) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: "Invalid JWT", details: err.message }) };
      }
    }

    // --- 🔑 Step 2: Build request headers
    const reqHeaders: Record<string, string> = { Version: "2021-07-28" };

    if (!endpoint.startsWith("/oauth")) {
      if (!useToken || !useLocation) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: "Missing API credentials" }) };
      }
      reqHeaders["Authorization"] = `Bearer ${useToken}`;
      reqHeaders["LocationId"] = useLocation;
      reqHeaders["Content-Type"] = "application/json";
    } else {
      reqHeaders["Content-Type"] = formEncoded ? "application/x-www-form-urlencoded" : "application/json";
    }

    // --- 🔑 Step 3: Handle OAuth special case
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

    // --- 🔑 Step 4: Call GHL API
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
