// api/oauth-callback.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

const TOKEN_URL = "https://services.leadconnectorhq.com/oauth/token";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { code, locationId } = req.query;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: "Missing OAuth code" });
  }

  try {
    // Use Vercel callback URL
    const redirectUri = process.env.VITE_GHL_REDIRECT_URI || "https://hp-ticket-flow.vercel.app/oauth/callback";

    const params = new URLSearchParams({
      client_id: process.env.VITE_GHL_CLIENT_ID || "",
      client_secret: process.env.VITE_GHL_CLIENT_SECRET || "",
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
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
      return res.status(400).json(tokens);
    }

    // Redirect to frontend with tokens
    const frontendUrl = process.env.VITE_FRONTEND_URL || "https://hp-ticket-flow.vercel.app";
    const successUrl = new URL(`${frontendUrl}/oauth/success`);
    successUrl.searchParams.set("access_token", tokens.access_token);
    successUrl.searchParams.set("refresh_token", tokens.refresh_token);
    successUrl.searchParams.set("expires_in", tokens.expires_in?.toString() || "0");
    if (locationId && typeof locationId === 'string') {
      successUrl.searchParams.set("locationId", locationId);
    }

    return res.redirect(302, successUrl.toString());
  } catch (error: any) {
    console.error("OAuth callback error:", error);
    return res.status(500).json({
      error: "OAuth failed",
      details: String(error.message || error),
    });
  }
}