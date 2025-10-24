import { LucideIcon, Menu, ChevronLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavigationItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
}

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  mainItems: NavigationItem[];
  bottomItems: NavigationItem[];
  isActive: (path: string) => boolean;
  onNavigate: (path: string) => void;
}

export function Sidebar({
  isOpen,
  onToggle,
  mainItems,
  bottomItems,
  isActive,
  onNavigate,
}: SidebarProps) {
  const { t } = useTranslation();

  return (
    <aside
      className={cn(
        "h-full bg-card border-r border-border transition-[width] duration-300 ease-in-out flex flex-col flex-shrink-0 overflow-hidden",
        isOpen ? "w-56" : "w-16"
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "flex items-center h-16 border-b border-border px-4 w-full",
          isOpen ? "justify-between gap-2" : "justify-center"
        )}
      >
        {isOpen && (
          <span className="font-bold text-lg whitespace-nowrap overflow-hidden text-ellipsis transition-opacity duration-200 ease-in-out">
            {t("layout.sidebar.appName")}
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="shrink-0 transition-transform duration-300 ease-in-out"
        >
          {isOpen ? (
            <ChevronLeft className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Main Navigation Items */}
      <nav className="flex-1 flex flex-col gap-2 p-3">
        {mainItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <Button
              key={item.id}
              variant={active ? "default" : "ghost"}
              className={cn(
                "transition-colors h-10",
                !isOpen && "w-10 px-0 flex items-center justify-center",
                isOpen && "w-full justify-start px-3",
                active && "bg-primary text-primary-foreground"
              )}
              onClick={() => onNavigate(item.path)}
              title={!isOpen ? item.label : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {isOpen && (
                <span className="ml-3 truncate text-sm">{item.label}</span>
              )}
            </Button>
          );
        })}
      </nav>

      {/* Bottom Navigation Items */}
      {bottomItems.length > 0 && (
        <div className="border-t border-border p-3">
          <nav className="flex flex-col gap-2">
            {bottomItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              return (
                <Button
                  key={item.id}
                  variant={active ? "default" : "ghost"}
                  className={cn(
                    "transition-colors h-10",
                    !isOpen && "w-10 px-0 flex items-center justify-center",
                    isOpen && "w-full justify-start px-3",
                    active && "bg-primary text-primary-foreground"
                  )}
                  onClick={() => onNavigate(item.path)}
                  title={!isOpen ? item.label : undefined}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {isOpen && (
                    <span className="ml-3 truncate text-sm">{item.label}</span>
                  )}
                </Button>
              );
            })}
          </nav>
        </div>
      )}
    </aside>
  );
}
