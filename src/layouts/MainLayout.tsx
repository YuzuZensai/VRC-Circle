import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { FriendsSidebar } from "@/components/FriendsSidebar";
import { AlertBarContainer } from "@/components/AlertBarContainer";
import { DevTools } from "@/components/DevTools";
import { Home, Globe, Palette, Menu } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { AccountMenu } from "@/components/AccountMenu";
import { Button } from "@/components/ui/button";
import { vrchatStatusStore } from "@/stores";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [friendsSidebarOpen, setFriendsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Start VRChat status polling
  // TODO: Move this too somewhere else?
  useEffect(() => {
    vrchatStatusStore.startPolling(5 * 60 * 1000);

    return () => {
      vrchatStatusStore.stopPolling();
    };
  }, []);

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const mainItems = [
    { id: "home", label: t("layout.sidebar.home"), icon: Home, path: "/" },
    {
      id: "worlds",
      label: t("layout.sidebar.worlds"),
      icon: Globe,
      path: "/worlds",
    },
    {
      id: "avatars",
      label: t("layout.sidebar.avatars"),
      icon: Palette,
      path: "/avatars",
    },
  ];

  const bottomItems: typeof mainItems = [];

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Alert Bar */}
      <AlertBarContainer />

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          mainItems={mainItems}
          bottomItems={bottomItems}
          isActive={isActive}
          onNavigate={handleNavigation}
        />

        {/* Main Content Area */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Navbar */}
          {user ? (
            <Navbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
          ) : (
            <nav className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>

              <div className="flex-1" />

              <div className="flex items-center gap-2">
                <ThemeToggle />
                <AccountMenu />
              </div>
            </nav>
          )}

          {/* Page Content */}
          <main className="flex-1 overflow-auto">{children}</main>
        </div>

        {/* Right Friends Sidebar */}
        {user && (
          <FriendsSidebar
            isOpen={friendsSidebarOpen}
            onToggle={() => setFriendsSidebarOpen(!friendsSidebarOpen)}
          />
        )}
      </div>

      {/* DevTools Overlay */}
      <DevTools />
    </div>
  );
}
