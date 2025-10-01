import { Handler } from "@netlify/functions";

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
    const tokenResponse = await fetch("https://services.leadconnectorhq.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.VITE_GHL_CLIENT_ID,
        client_secret: process.env.VITE_GHL_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.VITE_GHL_REDIRECT_URI,
      }),
    });

    const tokens = await tokenResponse.json();

    if (tokens.error) {
      console.error("OAuth token exchange error:", tokens);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify(tokens),
      };
    }

    // TODO: Save tokens (and locationId) to DB for later use
    console.log("🔑 Access Token:", tokens.access_token);
    console.log("🔄 Refresh Token:", tokens.refresh_token);
    console.log("📍 Location ID:", locationId);

    return {
      statusCode: 200,
      headers: {
        ...headers,
        "Content-Type": "text/html",
      },
      body: `
        <!DOCTYPE html>
        <html>
          <head>
            <title>OAuth Success</title>
            <style>
              body { font-family: system-ui; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
              .message { text-align: center; }
            </style>
          </head>
          <body>
            <div class="message">
              <h1>✅ OAuth Success!</h1>
              <p>You can close this window.</p>
            </div>
          </body>
        </html>
      `,
    };
  } catch (error) {
    console.error("OAuth callback error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "OAuth failed", details: String(error) }),
    };
  }
};
