import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

export default function OAuthSuccess() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const expiresIn = params.get("expires_in");
    const locationId = params.get("locationId");

    if (accessToken && refreshToken) {
      try {
        // Save tokens in localStorage
        localStorage.setItem("ghl_access_token", accessToken);
        localStorage.setItem("ghl_refresh_token", refreshToken);

        if (expiresIn) {
          const expiryTime = Date.now() + (Number(expiresIn) - 300) * 1000; // minus 5 minutes
          localStorage.setItem("ghl_token_expiry", expiryTime.toString());
        }

        if (locationId) {
          localStorage.setItem("ghl_location_id", locationId);
        }

        // Redirect to tickets dashboard
        navigate("/tickets");
      } catch (err) {
        console.error("Error saving tokens:", err);
        setError("Something went wrong while saving tokens.");
      }
    } else {
      setError("Missing tokens. Please try logging in again.");
    }
  }, [navigate]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-semibold text-red-600">OAuth Failed</h1>
          <p className="text-muted-foreground mt-2">{error}</p>
          <a
            href="/"
            className="mt-4 inline-block px-4 py-2 rounded bg-primary text-white"
          >
            Go Back
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">Finishing login…</h1>
          <p className="text-muted-foreground mt-2">
            Please wait while we complete authentication.
          </p>
        </div>
      </div>
    </div>
  );
}
