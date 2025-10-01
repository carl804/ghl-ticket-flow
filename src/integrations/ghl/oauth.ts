import { logger } from "@/components/ErrorLog";

const TOKEN_STORAGE_KEY = "ghl_access_token";
const REFRESH_TOKEN_STORAGE_KEY = "ghl_refresh_token";
const TOKEN_EXPIRY_KEY = "ghl_token_expiry";

const GHL_CLIENT_ID = import.meta.env.VITE_GHL_CLIENT_ID;
const GHL_CLIENT_SECRET = import.meta.env.VITE_GHL_CLIENT_SECRET;
const GHL_REDIRECT_URI = import.meta.env.VITE_GHL_REDIRECT_URI;

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
  if (!GHL_CLIENT_ID || !GHL_REDIRECT_URI) {
    logger.error("Missing OAuth configuration", {
      hasClientId: !!GHL_CLIENT_ID,
      hasRedirectUri: !!GHL_REDIRECT_URI,
    });
    throw new Error("OAuth configuration is incomplete");
  }

  const params = new URLSearchParams({
    client_id: GHL_CLIENT_ID,
    redirect_uri: GHL_REDIRECT_URI,
    response_type: "code",
    scope: "conversations.readonly conversations.write contacts.readonly contacts.write opportunities.readonly opportunities.write users.readonly",
  });

  const authUrl = `https://marketplace.gohighlevel.com/oauth/chooselocation?${params.toString()}`;
  logger.info("Generated OAuth URL", { authUrl });
  
  return authUrl;
}

export async function exchangeCodeForToken(code: string): Promise<void> {
  if (!GHL_CLIENT_ID || !GHL_CLIENT_SECRET || !GHL_REDIRECT_URI) {
    throw new Error("OAuth configuration is incomplete");
  }

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
        redirect_uri: GHL_REDIRECT_URI,
      }),
    });

    const data: TokenResponse = await response.json();

    if (!response.ok || data.error) {
      logger.error("Token exchange failed", data);
      throw new Error(data.error || "Failed to exchange code for token");
    }

    // Store tokens
    localStorage.setItem(TOKEN_STORAGE_KEY, data.access_token);
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, data.refresh_token);
    
    // Calculate expiry time (current time + expires_in - 5 min buffer)
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

  if (!GHL_CLIENT_ID || !GHL_CLIENT_SECRET) {
    throw new Error("OAuth configuration is incomplete");
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
      }),
    });

    const data: TokenResponse = await response.json();

    if (!response.ok || data.error) {
      logger.error("Token refresh failed", data);
      // Clear invalid tokens
      clearTokens();
      throw new Error(data.error || "Failed to refresh token");
    }

    // Store new tokens
    localStorage.setItem(TOKEN_STORAGE_KEY, data.access_token);
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, data.refresh_token);
    
    const expiryTime = Date.now() + (data.expires_in - 300) * 1000;
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());

    logger.success("Access token refreshed successfully");
    
    return data.access_token;
  } catch (error) {
    logger.error("Failed to refresh access token", error);
    throw error;
  }
}

export async function getAccessToken(): Promise<string | null> {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  const expiryTime = localStorage.getItem(TOKEN_EXPIRY_KEY);

  if (!token) {
    return null;
  }

  // Check if token is expired
  if (expiryTime && Date.now() >= parseInt(expiryTime)) {
    logger.info("Token expired, attempting refresh");
    try {
      return await refreshAccessToken();
    } catch (error) {
      logger.error("Auto-refresh failed", error);
      return null;
    }
  }

  return token;
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function clearTokens(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
  logger.info("OAuth tokens cleared");
}

export function logout(): void {
  clearTokens();
  window.location.href = "/";
}
