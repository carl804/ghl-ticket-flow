import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LayoutGrid, BarChart3, ChevronLeft, ChevronRight, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import NotificationSounds from "@/components/NotificationSounds";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    return saved ? JSON.parse(saved) : false;
  });
  const [showSettings, setShowSettings] = useState(false);
  
  // Notification settings - kept for backward compatibility and external access
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem("notification-sound-enabled");
    return saved ? JSON.parse(saved) : true;
  });
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem("notification-volume");
    return saved ? parseInt(saved) : 50;
  });

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", JSON.stringify(collapsed));
  }, [collapsed]);

  useEffect(() => {
    localStorage.setItem("notification-sound-enabled", JSON.stringify(soundEnabled));
  }, [soundEnabled]);

  useEffect(() => {
    localStorage.setItem("notification-volume", volume.toString());
  }, [volume]);

  const menuItems = [
    {
      icon: LayoutGrid,
      label: "Tickets",
      path: "/tickets",
    },
    {
      icon: BarChart3,
      label: "Analytics",
      path: "/analytics",
    },
    {
      icon: Settings,
      label: "Settings",
      path: "#settings",
      onClick: () => setShowSettings(true),
    },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <div
        className={cn(
          "fixed right-0 top-0 h-screen bg-card border-l border-border transition-all duration-300 ease-in-out z-40 flex flex-col",
          collapsed ? "w-16" : "w-60",
          className
        )}
      >
        {/* Toggle Button */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          {!collapsed && (
            <h2 className="font-semibold text-sm text-muted-foreground">NAVIGATION</h2>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className={cn("h-8 w-8", collapsed && "mx-auto")}
          >
            {collapsed ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-2 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <button
                key={item.path}
                onClick={() => item.onClick ? item.onClick() : navigate(item.path)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                  "hover:bg-accent hover:text-accent-foreground",
                  active && "bg-primary text-primary-foreground hover:bg-primary/90",
                  collapsed && "justify-center"
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={cn("h-5 w-5 shrink-0", active && "stroke-[2.5]")} />
                {!collapsed && (
                  <span className="font-medium text-sm">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        {!collapsed && (
          <div className="p-4 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              HP Ticket Flow
            </p>
          </div>
        )}
      </div>

      {/* Settings Dialog with Notification Sounds */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-6xl h-[85vh] p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Notification Settings</DialogTitle>
            <DialogDescription>
              Configure sound notifications for new messages
            </DialogDescription>
          </DialogHeader>
          
          <NotificationSounds />
        </DialogContent>
      </Dialog>
    </>
  );
}