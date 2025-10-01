import { Handler } from "@netlify/functions";

const GHL_API_BASE = "https://rest.gohighlevel.com/v1";
const GHL_API_TOKEN = process.env.VITE_GHL_API_TOKEN;
const GHL_LOCATION_ID = process.env.VITE_GHL_LOCATION_ID;

export const handler: Handler = async (event) => {
  // CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const { endpoint, method = "GET", body, queryParams } = JSON.parse(event.body || "{}");

    if (!GHL_API_TOKEN || !GHL_LOCATION_ID) {
      throw new Error("Missing API credentials");
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

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: data?.message || "GHL API Error" }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: String(error) }),
    };
  }
};
