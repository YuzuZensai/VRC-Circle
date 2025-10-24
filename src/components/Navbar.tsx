import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Menu } from "lucide-react";
import { AccountMenu } from "@/components/AccountMenu";

interface NavbarProps {
  onMenuToggle: () => void;
}

export function Navbar({ onMenuToggle }: NavbarProps) {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <nav className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
      {/* Left */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onMenuToggle}
        className="lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Center */}
      <div className="flex-1 flex justify-center"></div>

      {/* Right */}
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <AccountMenu />
      </div>
    </nav>
  );
}
