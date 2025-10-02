import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Shield } from "lucide-react";
import { getAccessToken, getAuthUrl, clearTokens } from "@/integrations/ghl/oauth";
import { Button } from "@/components/ui/button";
import { logger } from "@/components/ErrorLog";

export default function Index() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"checking" | "unauthenticated" | "iframe-no-auth">("checking");
  const isInIframe = window.self !== window.top;

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // Debug logging for SSO/JWT params
        const params = new URLSearchParams(window.location.search);
        console.log("=== SSO Debug Info ===");
        console.log("Full URL:", window.location.href);
        console.log("Search params:", window.location.search);
        console.log("Is in iframe:", isInIframe);
        
        // Log all parameters (including empty jwt)
        if (params.toString()) {
          params.forEach((value, key) => {
            console.log(`Param: ${key} = ${value || '(empty)'}`);
          });
        } else {
          console.log("No URL parameters found");
        }
        console.log("=====================");
        
        logger.info("Checking authentication", { 
          isInIframe,
          hasStoredTokens: !!localStorage.getItem("ghl_tokens"),
          hasJwtParam: params.has('jwt'),
          jwtValue: params.get('jwt') || 'empty'
        });

        const token = await getAccessToken();
        
        if (mounted) {
          if (token) {
            logger.success("Valid token found, redirecting to tickets");
            navigate("/tickets", { replace: true });
          } else {
            // Different handling for iframe vs standalone
            if (isInIframe) {
              const storedTokens = localStorage.getItem("ghl_tokens");
              
              // GHL passes empty jwt param, but we check for stored OAuth tokens
              if (storedTokens) {
                // Had tokens but they're expired/invalid
                logger.warn("Tokens expired while in iframe");
                setStatus("iframe-no-auth");
              } else {
                // Never authenticated before
                logger.info("First time access from iframe - OAuth required");
                setStatus("iframe-no-auth");
              }
            } else {
              setStatus("unauthenticated");
            }
          }
        }
      } catch (error) {
        logger.error("Auth check failed", error);
        if (mounted) {
          setStatus(isInIframe ? "iframe-no-auth" : "unauthenticated");
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [navigate, isInIframe]);

  if (status === "checking") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Special handling for iframe context (GHL custom menu)
  if (status === "iframe-no-auth") {
    const hasExpiredTokens = !!localStorage.getItem("ghl_tokens");
    
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="space-y-6 text-center max-w-md">
          <Shield className="h-16 w-16 mx-auto text-primary" />
          <h1 className="text-2xl font-bold">Authentication Required</h1>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              {hasExpiredTokens 
                ? "Your session has expired. Please re-authenticate to continue."
                : "To use this app, you need to complete the OAuth setup first."}
            </p>
            
            <div className="space-y-3">
              <Button
                size="lg"
                className="w-full"
                onClick={() => {
                  // Clear any stale tokens
                  clearTokens();
                  // Open OAuth in new window/tab to escape iframe
                  const authWindow = window.open(getAuthUrl(), '_blank');
                  
                  // Listen for the window to close
                  const checkInterval = setInterval(() => {
                    if (authWindow?.closed) {
                      clearInterval(checkInterval);
                      // Reload the page to check for new tokens
                      window.location.reload();
                    }
                  }, 1000);
                }}
              >
                {hasExpiredTokens ? "Re-authenticate with GHL" : "Complete OAuth Setup"}
              </Button>
              
              <p className="text-xs text-muted-foreground">
                A new window will open for authentication. 
                This page will refresh automatically when done.
              </p>
            </div>
            
            {!hasExpiredTokens && (
              <div className="mt-6 p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">
                  <strong>First time setup:</strong> After completing OAuth, 
                  you won't need to do this again unless your session expires.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Standard standalone view (direct browser access)
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="space-y-6 text-center">
        <Shield className="h-16 w-16 mx-auto text-primary" />
        <h1 className="text-3xl font-bold">Welcome to Hot Prospector Ticketing</h1>
        <p className="text-muted-foreground">Sign in with your GHL account to continue</p>
        <Button
          size="lg"
          onClick={() => {
            clearTokens();
            window.location.href = getAuthUrl();
          }}
        >
          Connect with GHL
        </Button>
      </div>
    </div>
  );
}