// netlify/functions/oauth-callback.ts
import type { Handler } from "@netlify/functions";

export const handler: Handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  const code = event.queryStringParameters?.code;
  const locationId = event.queryStringParameters?.locationId;

  if (!code) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Missing OAuth code" }),
    };
  }

  try {
    const params = new URLSearchParams({
      client_id: process.env.VITE_GHL_CLIENT_ID!,
      client_secret: process.env.VITE_GHL_CLIENT_SECRET!,
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.VITE_GHL_REDIRECT_URI!,
    });

    const tokenResponse = await fetch("https://services.leadconnectorhq.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const tokens = await tokenResponse.json();

    if (tokens.error) {
      console.error("OAuth token exchange error:", tokens);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify(tokens),
      };
    }

    console.log("🔑 Access Token:", tokens.access_token);
    console.log("🔄 Refresh Token:", tokens.refresh_token);
    console.log("📍 Location ID:", locationId);

    // ✅ Redirect user back to frontend with success flag
    return {
      statusCode: 302,
      headers: {
        Location: `/oauth/success?locationId=${locationId || ""}`,
      },
      body: "",
    };

  } catch (error) {
    console.error("OAuth callback error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "OAuth failed", details: String(error) }),
    };
  }
};
