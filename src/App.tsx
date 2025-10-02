import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ErrorLog } from "@/components/ErrorLog";
import { isAuthenticated } from "@/integrations/ghl/oauth";
import Index from "./pages/Index";
import Tickets from "./pages/Tickets";
import TicketDetail from "./pages/TicketDetail";
import OAuthCallback from "./pages/OAuthCallback";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  try {
    return isAuthenticated() ? <>{children}</> : <Navigate to="/" replace />;
  } catch (error) {
    console.error("Auth check failed:", error);
    return <Navigate to="/" replace />;
  }
}

const App = () => {
  try {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <ErrorLog />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/oauth/callback" element={<OAuthCallback />} />
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