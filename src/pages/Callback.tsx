import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

export default function Callback() {
  const navigate = useNavigate();

  useEffect(() => {
    // Get the auth code from URL
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const locationId = params.get("locationId");
    
    console.log("OAuth Callback received:", { code, locationId });
    
    if (code && locationId) {
      // Store the auth details
      localStorage.setItem("ghl_auth_code", code);
      localStorage.setItem("ghl_location_id", locationId);
      
      // Redirect to main app
      window.location.href = "/";
    } else {
      console.error("Missing auth code or locationId");
      navigate("/");
    }
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p>Authenticating with GoHighLevel...</p>
      </div>
    </div>
  );
}
