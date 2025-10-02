// src/pages/OAuthCallback.tsx
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { exchangeCodeForToken } from "@/integrations/ghl/oauth";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [hasAttempted, setHasAttempted] = useState(false);

  useEffect(() => {
    // Prevent duplicate attempts in strict mode or re-renders
    if (hasAttempted) return;

    const handleCallback = async () => {
      const code = searchParams.get("code");
      const errorParam = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");

      // Handle OAuth provider errors
      if (errorParam) {
        setIsProcessing(false);
        setError(
          errorDescription 
            ? `${errorParam}: ${errorDescription}` 
            : `OAuth error: ${errorParam}`
        );
        return;
      }

      // Validate authorization code
      if (!code) {
        setIsProcessing(false);
        setError("No authorization code received. Please try authenticating again.");
        return;
      }

      try {
        setHasAttempted(true);
        await exchangeCodeForToken(code);
        
        // Show success state briefly before redirecting
        setIsSuccess(true);
        setIsProcessing(false);
        
        setTimeout(() => {
          navigate("/tickets", { replace: true });
        }, 1000);
      } catch (err) {
        setIsProcessing(false);
        
        // Provide more specific error messages
        let errorMessage = "Failed to authenticate";
        
        if (err instanceof Error) {
          errorMessage = err.message;
        }
        
        // Check for common error patterns
        if (errorMessage.includes("expired")) {
          errorMessage = "Authorization code has expired. Please try authenticating again.";
        } else if (errorMessage.includes("network")) {
          errorMessage = "Network error occurred. Please check your connection and try again.";
        } else if (errorMessage.includes("invalid")) {
          errorMessage = "Invalid authorization code. Please try authenticating again.";
        }
        
        setError(errorMessage);
      }
    };

    handleCallback();
  }, [searchParams, navigate, hasAttempted]);

  // Success state
  if (isSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <CheckCircle2 className="h-12 w-12 mx-auto text-green-500" />
          <div>
            <h2 className="text-2xl font-semibold">Authentication Successful!</h2>
            <p className="text-muted-foreground mt-2">Redirecting you now...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Authentication Failed</AlertTitle>
            <AlertDescription className="mt-2">
              {error}
            </AlertDescription>
          </Alert>
          <div className="flex gap-2">
            <Button 
              onClick={() => navigate("/", { replace: true })} 
              className="flex-1"
              variant="outline"
            >
              Return Home
            </Button>
            <Button 
              onClick={() => window.location.reload()} 
              className="flex-1"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
        <div>
          <h2 className="text-2xl font-semibold">Completing authentication...</h2>
          <p className="text-muted-foreground mt-2">
            Please wait while we verify your credentials
          </p>
        </div>
      </div>
    </div>
  );
};

export default OAuthCallback;