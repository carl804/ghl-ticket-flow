// src/pages/Index.tsx
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
        // Check if already authenticated
        if (isAuthenticated()) {
          logger.info("Already authenticated, redirecting to tickets");
          navigate("/tickets");
          return;
        }

        // Check if we're in GHL iframe with SSO token
        const ssoParams = getSSOParams();
        
        if (ssoParams?.token) {
          logger.info("SSO token detected, exchanging for access token");
          await exchangeSSOToken(ssoParams.token);
          navigate("/tickets");
          return;
        }

        // Check if we're in iframe but no token (error state)
        if (isInGHLIframe()) {
          logger.warn("Running in iframe but no SSO token provided");
          setError("Please open this app from your GoHighLevel dashboard");
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
          <p className="text-muted-foreground">Authenticating...</p>
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
          <h2 className="text-2xl font-bold">Authentication Error</h2>
          <p className="text-muted-foreground">{error}</p>
          {!isInGHLIframe() && (
            <Button onClick={handleConnect} variant="outline">
              Try OAuth Instead
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
              ? "Please open this app from your GoHighLevel dashboard"
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
