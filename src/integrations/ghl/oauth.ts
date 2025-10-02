import type { Handler } from "@netlify/functions";

const GHL_API_BASE = "https://services.leadconnectorhq.com";
const GHL_API_TOKEN = process.env.VITE_GHL_API_TOKEN;
const GHL_LOCATION_ID = process.env.VITE_GHL_LOCATION_ID;

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
    const { endpoint, method = "GET", body, queryParams } = JSON.parse(event.body || "{}");

    if (!GHL_API_TOKEN || !GHL_LOCATION_ID) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: "Missing API credentials" }) };
    }

    let url = `${GHL_API_BASE}${endpoint}`;
    if (queryParams) {
      const params = new URLSearchParams(queryParams);
      url += `?${params.toString()}`;
    }

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${GHL_API_TOKEN}`,
        Version: "2021-07-28",
        "Content-Type": "application/json",
        LocationId: GHL_LOCATION_ID,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await response.text();
    return { statusCode: response.status, headers, body: text };
  } catch (err: any) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
