import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getAuthUrl, isAuthenticated } from "@/integrations/ghl/oauth";
import { Shield } from "lucide-react";

export default function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    // Auto-redirect if already authenticated
    if (isAuthenticated()) {
      navigate("/tickets");
    }
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-6 max-w-md">
        <Shield className="h-16 w-16 mx-auto text-primary" />
        <h1 className="text-3xl font-bold">GoHighLevel Ticketing</h1>
        <p className="text-muted-foreground">
          Connect your GoHighLevel account to manage support tickets
        </p>
        <Button
          size="lg"
          onClick={() => {
            window.location.href = getAuthUrl();
          }}
        >
          Connect GoHighLevel
        </Button>
      </div>
    </div>
  );
}