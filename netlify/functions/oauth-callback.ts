// netlify/functions/oauth-callback.ts
import type { Handler } from "@netlify/functions";

const TOKEN_URL = "https://services.leadconnectorhq.com/oauth/token";

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
    // ✅ Form-encoded params (OAuth spec requirement)
    const params = new URLSearchParams({
      client_id: process.env.VITE_GHL_CLIENT_ID || "",
      client_secret: process.env.VITE_GHL_CLIENT_SECRET || "",
      grant_type: "authorization_code",
      code,
      redirect_uri:
        process.env.VITE_GHL_REDIRECT_URI ||
        "https://hotprospectorticketing.netlify.app/callback",
    });

    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: params.toString(),
    });

    const tokens = await response.json();

    if (!response.ok || tokens.error) {
      console.error("OAuth token exchange error:", tokens);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify(tokens),
      };
    }

    // ✅ Redirect to frontend with tokens
    const redirectUrl = new URL(
      `${process.env.VITE_FRONTEND_URL || "https://778488dc-df0f-4268-a6a9-814145836889.lovableproject.com"}/oauth/success`
    );
    redirectUrl.searchParams.set("access_token", tokens.access_token);
    redirectUrl.searchParams.set("refresh_token", tokens.refresh_token);
    redirectUrl.searchParams.set("expires_in", tokens.expires_in?.toString() || "0");
    if (locationId) redirectUrl.searchParams.set("locationId", locationId);

    return {
      statusCode: 302,
      headers: {
        ...headers,
        Location: redirectUrl.toString(),
      },
      body: "",
    };
  } catch (error: any) {
    console.error("OAuth callback error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "OAuth failed",
        details: String(error.message || error),
      }),
    };
  }
};
