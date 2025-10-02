import { logger } from "@/components/ErrorLog";

const TOKEN_STORAGE_KEY = "ghl_access_token";
const REFRESH_TOKEN_STORAGE_KEY = "ghl_refresh_token";
const TOKEN_EXPIRY_KEY = "ghl_token_expiry";

// Hardcoded since Lovable env vars aren't loading properly
const GHL_CLIENT_ID = "68dda331ac147343e4d453";
const GHL_CLIENT_SECRET = "c8eb75c1-21ce-41ca-a33c-a22f739cf07f";
const GHL_REDIRECT_URI = "https://778488dc-df0f-4268-a6a9-814145836889.lovableproject.com/oauth/callback";

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  locationId?: string;
  error?: string;
}

export function getAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: GHL_CLIENT_ID,
    redirect_uri: GHL_REDIRECT_URI,
    response_type: "code",
    scope: "conversations.readonly conversations.write contacts.readonly contacts.write opportunities.readonly opportunities.write users.readonly",
  });

  // Correct endpoint according to GHL API docs
  const authUrl = `https://services.leadconnectorhq.com/oauth/chooselocation?${params.toString()}`;
  logger.info("Generated OAuth URL", { authUrl });
  
  return authUrl;
}

export async function exchangeCodeForToken(code: string): Promise<void> {
  logger.info("Exchanging code for token");

  try {
    const response = await fetch("https://services.leadconnectorhq.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: GHL_CLIENT_ID,
        client_secret: GHL_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        user_type: "Location",
        redirect_uri: GHL_REDIRECT_URI,
      }),
    });

    const data: TokenResponse = await response.json();

    if (!response.ok || data.error) {
      logger.error("Token exchange failed", data);
      throw new Error(data.error || "Failed to exchange code for token");
    }

    localStorage.setItem(TOKEN_STORAGE_KEY, data.access_token);
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, data.refresh_token);
    
    const expiryTime = Date.now() + (data.expires_in - 300) * 1000;
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());

    logger.success("OAuth tokens stored successfully", {
      expiresIn: data.expires_in,
      locationId: data.locationId,
    });
  } catch (error) {
    logger.error("Failed to exchange code for token", error);
    throw error;
  }
}

export async function refreshAccessToken(): Promise<string> {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);

  if (!refreshToken) {
    throw new Error("No refresh token available");
  }

  logger.info("Refreshing access token");

  try {
    const response = await fetch("https://services.leadconnectorhq.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: GHL_CLIENT_ID,
        client_secret: GHL_CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        user_type: "Location",
        redirect_uri: GHL_REDIRECT_URI,
      }),
    });

    const data: TokenResponse = await response.json();

    if (!response.ok || data.error) {
      logger.error("Token refresh failed", data);
      clearTokens();
      throw new Error(data.error || "Failed to refresh token");
    }

    lo