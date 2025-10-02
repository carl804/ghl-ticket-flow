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
      const tokens = {
        accessToken,
        refreshToken,
        expiresAt: Date.now() + (Number(expiresIn || "0") - 300) * 1000, // 5 min buffer
        locationId: locationId || undefined,
      };

      localStorage.setItem("ghl_tokens", JSON.stringify(tokens));

      // Immediately redirect to tickets
      navigate("/tickets", { replace: true });
    } else {
      // If something went wrong, send back to home
      navigate("/", { replace: true });
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
