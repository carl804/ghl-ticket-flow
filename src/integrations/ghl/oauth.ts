// src/integrations/ghl/oauth.ts
import { logger } from "@/components/ErrorLog";
import { toast } from "@/components/ui/use-toast";

const TOKEN_STORAGE_KEY = "ghl_tokens";
const AUTH_URL = "https://marketplace.gohighlevel.com/oauth/chooselocation";
const TOKEN_URL = "https://services.leadconnectorhq.com/oauth/token";

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  userType: string;
  locationId?: string;
  error?: string;
}

interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  locationId?: string;
}

/**
 * Build the OAuth login URL
 */
export function getAuthUrl(): string {
  const clientId = import.meta.env.VITE_GHL_CLIENT_ID;
  const redirectUri = import.meta.env.VITE_GHL_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new Error("Missing GHL OAuth configuration");
  }

  const params = new URLSearchParams({
    response_type: "code",
    redirect_uri: redirectUri,
    client_id: clientId,
    scope: "opportunities.readonly opportunities.write contacts.readonly contacts.write users.readonly locations/customFields.readonly locations/customFields.write conversations.readonly locations.readonly conversations.write locations/tags.readonly locations/tags.write",
    version_id: clientId.split("-")[0],
  });

  return `${AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for access + refresh tokens
 */
export async function exchangeCodeForToken(code: string): Promise<void> {
  const clientId = import.meta.env.VITE_GHL_CLIENT_ID;
  const clientSecret = import.meta.env.VITE_GHL_CLIENT_SECRET;
  const redirectUri = import.meta.env.VITE_GHL_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Missing GHL OAuth configuration");
  }

  logger.info("Exchanging OAuth code for tokens");

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  const data: TokenResponse = await response.json();

  if (data.error || !response.ok) {
    logger.error("OAuth token exchange failed", data);
    throw new Error(data.error || "Failed to exchange code for token");
  }

  const tokens: StoredTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    locationId: data.locationId,
  };

  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
  logger.success("OAuth tokens stored successfully");
}

/**
 * Refresh the access token if expired
 */
export async function refreshAccessToken(): Promise<string> {
  const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!stored) {
    throw new Error("No refresh token available");
  }

  const tokens: StoredTokens = JSON.parse(stored);
  const clientId = import.meta.env.VITE_GHL_CLIENT_ID;
  const clientSecret = import.meta.env.VITE_GHL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing GHL OAuth configuration");
  }

  logger.info("Refreshing access token");

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: tokens.refreshToken,
    }),
  });

  const data: TokenResponse = await response.json();

  if (data.error || !response.ok) {
    logger.error("Token refresh failed", data);
    clearTokens();
    toast({
      title: "Session expired",
      description: "Please log in again to continue.",
      variant: "destructive",
    });
    throw new Error(data.error || "Failed to refresh token");
  }

  const newTokens: StoredTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    locationId: tokens.locationId || data.locationId,
  };

  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(newTokens));
  logger.success("Access token refreshed");

  return newTokens.accessToken;
}

/**
 * Get a valid access token (refreshes if expired)
 */
export async function getAccessToken(): Promise<string | null> {
  const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!stored) return null;

  try {
    const tokens: StoredTokens = JSON.parse(stored);

    // Check expiry with 5-minute buffer
    if (Date.now() >= tokens.expiresAt - 5 * 60 * 1000) {
      try {
        return await refreshAccessToken();
      } catch (error) {
        clearTokens();
        return null;
      }
    }

    return tokens.accessToken;
  } catch (err) {
    logger.error("Corrupted token storage", err);
    clearTokens();
    return null;
  }
}

/**
 * Check if user is authenticated (valid token + not expired)
 */
export function isAuthenticated(): boolean {
  const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!stored) return false;

  try {
    const tokens: StoredTokens = JSON.parse(stored);
    return Date.now() < tokens.expiresAt - 5 * 60 * 1000;
  } catch {
    return false;
  }
}

/**
 * Clear tokens from storage
 */
export function clearTokens(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

/**
 * Logout and redirect to home
 */
export function logout(): void {
  clearTokens();
  logger.info("User logged out");
  window.location.href = "/";
}
