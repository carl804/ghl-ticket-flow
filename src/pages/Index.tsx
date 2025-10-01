import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getAuthUrl, isAuthenticated } from "@/integrations/ghl/oauth";
import { Shield } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to tickets if already authenticated
    if (isAuthenticated()) {
      navigate("/tickets");
    }
  }, [navigate]);

  const handleConnect = () => {
    try {
      const authUrl = getAuthUrl();
      window.location.href = authUrl;
    } catch (error) {
      console.error("Failed to generate auth URL:", error);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-6 max-w-md px-4">
        <div className="flex justify-center">
          <Shield className="h-16 w-16 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-bold">GoHighLevel Ticketing</h1>
          <p className="text-xl text-muted-foreground">
            Connect your GoHighLevel account to manage support tickets
          </p>
        </div>
        <Button onClick={handleConnect} size="lg" className="w-full max-w-xs">
          Connect GoHighLevel
        </Button>
      </div>
    </div>
  );
};

export default Index;
