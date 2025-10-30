// api/ghl-proxy.js
const GHL_API_BASE = "https://services.leadconnectorhq.com";
const CLIENT_ID = process.env.VITE_GHL_CLIENT_ID;
const CLIENT_SECRET = process.env.VITE_GHL_CLIENT_SECRET;
const REDIRECT_URI = process.env.VITE_GHL_REDIRECT_URI;
const GHL_ACCESS_TOKEN = process.env.GHL_ACCESS_TOKEN || process.env.GHL_ACCESS_TOKEN_TEMP; // ✅ ADD THIS

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, LocationId, Version");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const { endpoint, method = "GET", body, queryParams, locationId } = req.body || {};

    // Build URL with query parameters
    let url = `${GHL_API_BASE}${endpoint}`;
    const urlParams = new URLSearchParams(queryParams || {});
    
    // Add locationId to query params if provided
    if (locationId) {
      urlParams.set('locationId', locationId);
    }
    
    if (urlParams.toString()) {
      url += `?${urlParams.toString()}`;
    }

    // Build request headers
    const reqHeaders = {
      "Version": "2021-07-28",
      "Content-Type": "application/json",
    };

    // Handle OAuth token exchange specially
    if (endpoint === "/oauth/token") {
      const params = new URLSearchParams({
        client_id: CLIENT_ID || "",
        client_secret: CLIENT_SECRET || "",
        redirect_uri: REDIRECT_URI || "",
        ...body,
      });

      const response = await fetch(`${GHL_API_BASE}/oauth/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      const text = await response.text();
      return res.status(response.status).send(text);
    }

    // ✅ MODIFIED: Use client token OR server-side token
    const authHeader = req.headers["authorization"];
    let accessToken;
    
    if (authHeader && authHeader.startsWith("Bearer ")) {
      // Use client-provided token (for OAuth flow)
      accessToken = authHeader.replace("Bearer ", "");
    } else if (GHL_ACCESS_TOKEN) {
      // Fallback to server-side token
      accessToken = GHL_ACCESS_TOKEN;
    } else {
      return res.status(401).json({ error: "No authorization token provided" });
    }

    // Set authorization header with token
    reqHeaders["Authorization"] = `Bearer ${accessToken}`;

    // Make the request to GHL API
    const response = await fetch(url, {
      method,
      headers: reqHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    const responseText = await response.text();
    
    // Log for debugging
    if (!response.ok) {
      console.error("GHL API Error:", {
        status: response.status,
        url,
        response: responseText.substring(0, 200)
      });
    }

    return res.status(response.status).send(responseText);
    
  } catch (err) {
    console.error("Proxy error:", err);
    return res.status(500).json({ 
      error: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined
    });
  }
}