import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

export default function OAuthSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const expiresIn = params.get("expires_in");
    const locationId = params.get("locationId");

    if (accessToken && refreshToken) {
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
    }
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">Finishing login…</h1>
          <p className="text-muted-foreground mt-2">Please wait while we complete authentication.</p>
        </div>
      </div>
    </div>
  );
}
