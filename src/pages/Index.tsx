import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getAuthUrl, isAuthenticated } from "@/integrations/ghl/oauth";
import { getSSOParams, exchangeSSOToken, isInGHLIframe } from "@/integrations/ghl/sso";
import { Shield, Loader2 } from "lucide-react";
import { logger } from "@/components/ErrorLog";

export default function Index() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Debug: Log all URL parameters and environment info
        const params = new URLSearchParams(window.location.search);
        console.log("=== SSO Debug Info ===");
        console.log("Full URL:", window.location.href);
        console.log("Search params:", window.location.search);
        console.log("Is in iframe:", window.self !== window.top);
        
        // Log all parameters
        if (params.toString()) {
          params.forEach((value, key) => {
            console.log(`Param: ${key} = ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`);
          });
        } else {
          console.log("No URL parameters found");
        }
        console.log("=====================");

        // Check if already authenticated (from previous OAuth)
        if (isAuthenticated()) {
          logger.info("Already authenticated, redirecting to tickets");
          navigate("/tickets");
          return;
        }

        // Check if we're in GHL iframe
        if (isInGHLIframe()) {
          // In iframe - check for SSO token
          const ssoParams = getSSOParams();
          
          if (ssoParams?.token) {
            logger.info("SSO token detected, exchanging for access token");
            await exchangeSSOToken(ssoParams.token);
            navigate("/tickets");
            return;
          }
          
          // In iframe but no token - this is expected for custom menu links
          // Try to use stored auth from previous OAuth
          const storedToken = localStorage.getItem("ghl_access_token");
          const storedLocation = localStorage.getItem("ghl_location_id");
          
          if (storedToken && storedLocation) {
            logger.info("Using stored authentication from previous session");
            navigate("/tickets");
            return;
          }
          
          // No stored auth - show instructions
          logger.warn("Running in iframe but no authentication found");
          setError("Please complete the app installation first, then access from your GoHighLevel dashboard");
        } else {
          // Not in iframe - standalone access
          // Check for stored auth first
          const storedToken = localStorage.getItem("ghl_access_token");
          const storedLocation = localStorage.getItem("ghl_location_id");
          
          if (storedToken && storedLocation) {
            logger.info("Using stored authentication");
            navigate("/tickets");
            return;
          }
        }

        setIsLoading(false);
      } catch (err) {
        logger.error("Authentication initialization failed", err);
        setError(err instanceof Error ? err.message : "Authentication failed");
        setIsLoading(false);
      }
    };

    initAuth();
  }, [navigate]);

  const handleConnect = () => {
    try {
      const authUrl = getAuthUrl();
      logger.info("Redirecting to GHL OAuth", { authUrl });
      window.location.href = authUrl;
    } catch (err) {
      logger.error("Failed to get auth URL", err);
      setError("Failed to initiate authentication");
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="text-center space-y-4 max-w-md">
          <Shield className="h-16 w-16 mx-auto text-destructive" />
          <h2 className="text-2xl font-bold">Authentication Required</h2>
          <p className="text-muted-foreground">{error}</p>
          {!isInGHLIframe() && (
            <Button onClick={handleConnect} size="lg">
              Install App via OAuth
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Show connect button (for standalone access)
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-secondary/20">
      <div className="text-center space-y-6 max-w-md p-8">
        <div className="space-y-4">
          <Shield className="h-16 w-16 mx-auto text-primary" />
          <h1 className="text-4xl font-bold">GoHighLevel Ticketing</h1>
          <p className="text-muted-foreground text-lg">
            {isInGHLIframe() 
              ? "Complete the app installation to continue"
              : "Connect your GoHighLevel account to manage support tickets"
            }
          </p>
        </div>

        {!isInGHLIframe() && (
          <div className="space-y-4 pt-4">
            <Button
              size="lg"
              className="w-full"
              onClick={handleConnect}
            >
              Connect GoHighLevel
            </Button>

            <p className="text-xs text-muted-foreground">
              You'll be redirected to GoHighLevel to authorize access
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
