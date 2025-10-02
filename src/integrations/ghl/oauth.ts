// src/integrations/ghl/oauth.ts
import { logger } from "@/components/ErrorLog";

const GHL_API_BASE = "https://services.leadconnectorhq.com";
const CLIENT_ID = import.meta.env.VITE_GHL_CLIENT_ID || "68dda331ac14797343e4d453-mg8ksgjb";
const CLIENT_SECRET = import.meta.env.VITE_GHL_CLIENT_SECRET || "c8eb75c1-21ce-41ca-a33c-a22f739cf07f";
const REDIRECT_URI = import.meta.env.VITE_GHL_REDIRECT_URI || "https://778488dc-df0f-4268-a6a9-814145836889.lovableproject.com/oauth/callback";

const TOKEN_STORAGE_KEY = "ghl_access_token";
const REFRESH_TOKEN_STORAGE_KEY = "ghl_refresh_token";
const TOKEN_EXPIRY_KEY = "ghl_token_expiry";

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  userType: string;
  locationId?: string;
  companyId?: string;
}

export async function exchangeCodeForToken(code: string): Promise<void> {
  logger.info("Exchanging code for token", { redirectUri: REDIRECT_URI });

  // Use URLSearchParams for proper form encoding
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: "authorization_code",
    code: code,
    redirect_uri: REDIRECT_URI, // Must match exactly with initial auth request
  });

  try {
    const response = await fetch(`${GHL_API_BASE}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded", // Critical: NOT application/json
        Accept: "application/json",
      },
      body: params.toString(), // Send as URL-encoded string
    });

    const data: TokenResponse = await response.json();

    if (!response.ok || data.error) {
      logger.error("Token exchange failed", { 
        status: response.status, 
        error: data.error,
        redirectUri: REDIRECT_URI 
      });
      
      // Provide helpful error messages
      if (data.error === "invalid_request") {
        throw new Error("Invalid authorization code. Please try authenticating again.");
      } else if (data.error === "invalid_grant") {
        throw new Error("Authorization code has expired or been used. Please try authenticating again.");
      } else if (data.error === "invalid_client") {
        throw new Error("Invalid client credentials. Check your GHL app configuration.");
      }
      
      throw new Error(data.error || "Failed to exchange code for token");
    }

    // Store tokens
    localStorage.setItem(TOKEN_STORAGE_KEY, data.access_token);
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, data.refresh_token);
    
    const expiryTime = Date.now() + (data.expires_in - 300) * 1000;
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());

    if (data.locationId) {
      localStorage.setItem("ghl_location_id", data.locationId);
    }

    logger.success("OAuth tokens stored successfully", {
      expiresIn: data.expires_in,
      locationId: data.locationId,
    });
  } catch (error) {
    logger.error("Failed to exchange code for token", error);
    throw error;
  }
}

// Helper function to get the authorization URL
export function getAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI, // Same redirect URI used in token exchange
    response_type: "code",
    scope: "conversations.readonly conversations.write contacts.readonly contacts.write opportunities.readonly opportunities.write users.readonly",
  });

  const authUrl = `https://marketplace.gohighlevel.com/oauth/chooselocation?${params.toString()}`;
  logger.info("Generated OAuth URL", { authUrl, redirectUri: REDIRECT_URI });
  
  return authUrl;
}

export async function refreshAccessToken(): Promise<string> {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);

  if (!refreshToken) {
    throw new Error("No refresh token available");
  }

  logger.info("Refreshing access token");

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  try {
    const response = await fetch(`${GHL_API_BASE}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: params.toString(),
    });

    const data: TokenResponse = await response.json();

    if (!response.ok || data.error) {
      logger.error("Token refresh failed", data);
      clearTokens();
      throw new Error(data.error || "Failed to refresh token");
    }

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
  localStorage.removeItem("ghl_location_id");
  logger.info("OAuth tokens cleared");
}

export function logout(): void {
  clearTokens();
  window.location.href = "/";
}