import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { getAccessToken, getAuthUrl, clearTokens } from "@/integrations/ghl/oauth";
import { Button } from "@/components/ui/button";

export default function Index() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"checking" | "unauthenticated">("checking");

  useEffect(() => {
    let mounted = true;

    (async () => {
      const token = await getAccessToken();
      if (mounted) {
        if (token) {
          navigate("/tickets", { replace: true });
        } else {
          setStatus("unauthenticated");
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  if (status === "checking") {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="space-y-6 text-center">
        <h1 className="text-3xl font-bold">Welcome to Hot Prospector Ticketing</h1>
        <p className="text-muted-foreground">Sign in with your GHL account to continue</p>
        <Button
          onClick={() => {
            // 🚀 Always clear stale session before new login
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
