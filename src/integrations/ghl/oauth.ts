import { logger } from "@/components/ErrorLog";

const TOKEN_STORAGE_KEY = "ghl_tokens";

// Hardcoded since Lovable env vars aren't loading properly
const GHL_CLIENT_ID = "68dda331ac147343e4d453";
const GHL_CLIENT_SECRET = "c8eb75c1-21ce-41ca-a33c-a22f739cf07f";
const GHL_REDIRECT_URI = "https://778488dc-df0f-4268-a6a9-814145836889.lovableproject.com/oauth/callback";

export interface OAuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  obtained_at?: number;
  locationId?: string;
}

const TOKEN_API_URL = "https://services.leadconnectorhq.com/oauth/token";

export function getAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: GHL_CLIENT_ID,
    redirect_uri: GHL_REDIRECT_URI,
    response_type: "code",
    scope: "conversations.readonly conversations.write contacts.readonly contacts.write opportunities.readonly opportunities.write users.readonly",
  });

  // Correct authorization endpoint from GHL OAuth docs
  const authUrl = `https://marketplace.gohighlevel.com/oauth/chooselocation?${params.toString()}`;
  logger.info("Generated OAuth URL", { authUrl });
  
  return authUrl;
}

export async function exchangeCodeForToken(code: string): Promise<void> {
  logger.info("Exchanging code for token");

  try {
    const res = await fetch(TOKEN_API_URL, {
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

    const data = await res.json();

    if (!res.ok || data.error) {
      logger.error("Token exchange failed", data);
      throw new Error(data.error_description || data.error || "OAuth token exchange failed");
    }

    saveTokens(data);
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
  const tokens = getSavedTokens();
  
  if (!tokens?.refresh_token) {
    throw new Error("No refresh token available");
  }

  logger.info("Refreshing access token");

  try {
    const res = await fetch(TOKEN_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: GHL_CLIENT_ID,
        client_secret: GHL_CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: tokens.refresh_token,
        user_type: "Location",
        redirect_uri: GHL_REDIRECT_URI,
      }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      logger.error("Token refresh failed", data);
      clearTokens();
      throw new Error(data.error_description || data.error || "OAuth token refresh failed");
    }

    saveTokens(data);
    logger.success("Access token refreshed successfully");
    
    return data.access_token;
  } catch (error) {
    logger.error("Failed to refresh access token", error);
    throw error;
  }
}

export async function getAccessToken(): Promise<string | null> {
  const tokens = getSavedTokens();

  if (!tokens) {
    return null;
  }

  // Check if token is expired (with 5 min buffer)
  const expiresAt = (tokens.obtained_at || 0) + (tokens.expires_in - 300) * 1000;
  if (Date.now() >= expiresAt) {
    logger.info("Token expired, attempting refresh");
    try {
      return await refreshAccessToken();
    } catch (error) {
      logger.error("Auto-refresh failed", error);
      return null;
    }
  }

  return tokens.access_token;
}

function saveTokens(tokens: OAuthTokens): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify({
    ...tokens,
    obtained_at: Date.now(),
  }));
}

export function getSavedTokens(): OAuthTokens | null {
  const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function isAuthenticated(): boolean {
  return !!getSavedTokens();
}

export function clearTokens(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  logger.info("OAuth tokens cleared");
}

export function logout(): void {
  clearTokens();
  window.location.href = "/";
}