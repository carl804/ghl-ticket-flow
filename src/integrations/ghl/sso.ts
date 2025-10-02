// src/integrations/ghl/sso.ts
import { logger } from "@/components/ErrorLog";

const GHL_API_BASE = "https://services.leadconnectorhq.com";
const CLIENT_ID = import.meta.env.VITE_GHL_CLIENT_ID || "68dda331ac14797343e4d453-mg8ksgjb";
const CLIENT_SECRET = import.meta.env.VITE_GHL_CLIENT_SECRET || "c8eb75c1-21ce-41ca-a33c-a22f739cf07f";

interface SSOTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  locationId?: string;
  companyId?: string;
  userId?: string;
}

/**
 * Exchange SSO token for access token
 * This is called when the app is loaded from within GHL
 */
export async function exchangeSSOToken(ssoToken: string): Promise<void> {
  logger.info("Exchanging SSO token for access token");

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: ssoToken,
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

    const data: SSOTokenResponse = await response.json();

    if (!response.ok) {
      logger.error("SSO token exchange failed", { 
        status: response.status,
        error: data 
      });
      throw new Error("Failed to exchange SSO token");
    }

    // Store tokens
    localStorage.setItem("ghl_access_token", data.access_token);
    localStorage.setItem("ghl_refresh_token", data.refresh_token);
    
    const expiryTime = Date.now() + (data.expires_in - 300) * 1000;
    localStorage.setItem("ghl_token_expiry", expiryTime.toString());

    if (data.locationId) {
      localStorage.setItem("ghl_location_id", data.locationId);
    }
    if (data.companyId) {
      localStorage.setItem("ghl_company_id", data.companyId);
    }
    if (data.userId) {
      localStorage.setItem("ghl_user_id", data.userId);
    }

    logger.success("SSO authentication successful", {
      locationId: data.locationId,
      companyId: data.companyId,
    });
  } catch (error) {
    logger.error("Failed to exchange SSO token", error);
    throw error;
  }
}

/**
 * Get SSO parameters from URL
 * GHL passes these when opening the app in iframe
 */
export function getSSOParams(): { token: string; locationId?: string; companyId?: string } | null {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  
  if (!token) {
    return null;
  }

  return {
    token,
    locationId: params.get("locationId") || undefined,
    companyId: params.get("companyId") || undefined,
  };
}

/**
 * Check if app is running inside GHL iframe
 */
export function isInGHLIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
}
