import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { useToast } from "@/components/ui/use-toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ErrorLog from "@/components/ErrorLog";
import { AppLayout } from "@/components/layout/AppLayout";
import { ThemeProvider } from "@/components/ThemeProvider";
import { getAccessToken } from "@/integrations/ghl/oauth";

import Index from "./pages/Index";
import Tickets from "./pages/Tickets";
import TicketDetail from "./pages/TicketDetail";
import AnalyticsView from './components/analytics/AnalyticsView';
import OAuthCallback from "./pages/OAuthCallback";
import OAuthSuccess from "./pages/OAuthSuccess";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"checking" | "ok" | "unauth">("checking");
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const token = await getAccessToken();
        if (!mounted) return;

        if (token) {
          setStatus("ok");
        } else {
          toast({
            title: "Session expired",
            description: "Please sign in again.",
            variant: "destructive",
          });
          setStatus("unauth");
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        if (mounted) {
          toast({
            title: "Authentication error",
            description: "Your session could not be verified. Please log in again.",
            variant: "destructive",
          });
          setStatus("unauth");
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [toast]);

  if (status === "checking") {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Checking authentication…</p>
      </div>
    );
  }

  return status === "ok" ? <>{children}</> : <Navigate to="/" replace />;
}

const App = () => {
  try {
    return (
      <ThemeProvider defaultTheme="light" storageKey="hp-ticketing-theme">
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            {/* Toast systems */}
            <Toaster />
            <Sonner />
            <ErrorLog />
            <BrowserRouter>
              <Routes>
                {/* Public routes - no sidebar */}
                <Route path="/" element={<Index />} />
                <Route path="/callback" element={<OAuthCallback />} />
                <Route path="/oauth/callback" element={<OAuthCallback />} />
                <Route path="/oauth/success" element={<OAuthSuccess />} />
                
                {/* Protected routes - with sidebar */}
                <Route
                  path="/tickets"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <Tickets />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/tickets/:id"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <TicketDetail />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/analytics"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <AnalyticsView />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
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