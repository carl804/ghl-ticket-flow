import { Button } from "@/components/ui/button";
import { LogOut, RefreshCw, Shield } from "lucide-react";
import { logger } from "@/components/ErrorLog";
import { getAuthUrl } from "@/integrations/ghl/oauth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AuthControls() {
  const locationId = localStorage.getItem("ghl_location_id");
  
  const handleLogout = () => {
    logger.info("Logging out user");
    
    // Clear all auth-related data
    const keysToRemove = [
      "ghl_access_token",
      "ghl_refresh_token",
      "ghl_auth_code",
      "ghl_location_id",
      "ghl_auth_timestamp",
      "ghl_user_id",
      "ghl_company_id"
    ];
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    logger.success("Logout successful");
    
    // Redirect to home
    window.location.href = "/";
  };
  
  const handleReauthenticate = () => {
    logger.info("Re-authenticating user");
    
    // Clear only tokens, keep location info
    localStorage.removeItem("ghl_access_token");
    localStorage.removeItem("ghl_refresh_token");
    localStorage.removeItem("ghl_auth_code");
    localStorage.removeItem("ghl_auth_timestamp");
    
    // Redirect to OAuth
    try {
      const authUrl = getAuthUrl();
      window.location.href = authUrl;
    } catch (err) {
      logger.error("Failed to get auth URL", err);
      // Fallback to home
      window.location.href = "/";
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Shield className="h-4 w-4 mr-2" />
          Account
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">GoHighLevel</p>
            {locationId && (
              <p className="text-xs text-muted-foreground">
                Location: {locationId.substring(0, 8)}...
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleReauthenticate}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Re-authenticate
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleLogout} className="text-destructive">
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
