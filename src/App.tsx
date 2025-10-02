import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

import ErrorLog from "@/components/ErrorLog";
import { getAccessToken } from "@/integrations/ghl/oauth";

import Index from "./pages/Index";
import Tickets from "./pages/Tickets";
import TicketDetail from "./pages/TicketDetail";
import OAuthCallback from "./pages/OAuthCallback";
import OAuthSuccess from "./pages/OAuthSuccess";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

/**
 * ProtectedRoute:
 * - Checks if tokens exist
 * - Refreshes silently if expired
 * - Redirects to "/" if no valid token
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"loading" | "ok" | "unauthenticated">("loading");

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const token = await getAccessToken();
        if (mounted) {
          setStatus(token ? "ok" : "unauthenticated");
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        if (mounted) setStatus("unauthenticated");
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  if (status === "loading") {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

const App = () => {
  try {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          {/* Toast systems */}
          <Toaster />
          <Sonner />
          <ErrorLog />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/callback" element={<OAuthCallback />} />
              <Route path="/oauth/callback" element={<OAuthCallback />} />
              <Route path="/oauth/success" element={<OAuthSuccess />} />
              <Route
                path="/tickets"
                element={
                  <ProtectedRoute>
                    <Tickets />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tickets/:id"
                element={
                  <ProtectedRoute>
                    <TicketDetail />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    );
  } catch (error) {
    console.error("App render error:", error);
    return (
      <div style={{ padding: "20px", color: "red" }}>
        <h1>Application Error</h1>
        <pre>{String(error)}</pre>
      </div>
    );
  }
};

export default App;
