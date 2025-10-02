// src/integrations/ghl/oauth.ts
export interface OAuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

const API_URL = "https://services.leadconnectorhq.com/oauth/token";

/**
 * Exchange authorization code for access + refresh tokens
 */
export async function exchangeCodeForToken(code: string): Promise<OAuthTokens> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: import.meta.env.VITE_GHL_CLIENT_ID,
      client_secret: import.meta.env.VITE_GHL_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: import.meta.env.VITE_GHL_REDIRECT_URI,
    }),
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(data.error_description || data.error || "OAuth token exchange failed");
  }

  saveTokens(data);
  return data;
}

/**
 * Refresh tokens when access token expires
 */
export async function refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: import.meta.env.VITE_GHL_CLIENT_ID,
      client_secret: import.meta.env.VITE_GHL_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      redirect_uri: import.meta.env.VITE_GHL_REDIRECT_URI,
    }),
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(data.error_description || data.error || "OAuth token refresh failed");
  }

  saveTokens(data);
  return data;
}

/**
 * Save tokens to localStorage
 */
function saveTokens(tokens: OAuthTokens) {
  localStorage.setItem("ghl_tokens", JSON.stringify({
    ...tokens,
    obtained_at: Date.now(),
  }));
}

/**
 * Get saved tokens
 */
export function getSavedTokens(): OAuthTokens | null {
  const raw = localStorage.getItem("ghl_tokens");
  return raw ? JSON.parse(raw) : null;
}

/**
 * Clear saved tokens (logout)
 */
export function clearTokens() {
  localStorage.removeItem("ghl_tokens");
}
