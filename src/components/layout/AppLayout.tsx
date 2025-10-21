import { ReactNode, useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    return saved ? JSON.parse(saved) : false;
  });

  // Listen for sidebar changes
  useEffect(() => {
    const handleStorage = () => {
      const saved = localStorage.getItem("sidebar-collapsed");
      if (saved) {
        setSidebarCollapsed(JSON.parse(saved));
      }
    };

    window.addEventListener("storage", handleStorage);
    
    // Poll localStorage for changes (since storage event doesn't fire in same tab)
    const interval = setInterval(() => {
      const saved = localStorage.getItem("sidebar-collapsed");
      if (saved) {
        const collapsed = JSON.parse(saved);
        if (collapsed !== sidebarCollapsed) {
          setSidebarCollapsed(collapsed);
        }
      }
    }, 100);

    return () => {
      window.removeEventListener("storage", handleStorage);
      clearInterval(interval);
    };
  }, [sidebarCollapsed]);

  return (
    <div className="relative min-h-screen">
      {/* Theme Toggle - Fixed position top-right */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Main Content - Adjusted for sidebar */}
      <div
        className={cn(
          "transition-all duration-300 ease-in-out",
          sidebarCollapsed ? "mr-16" : "mr-60"
        )}
      >
        {children}
      </div>

      {/* Sidebar */}
      <Sidebar />
    </div>
  );
}