import { useState, useEffect, useRef } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StoreStudio } from "@/pages/StoreStudio";
import { DatabaseStudio } from "@/pages/DatabaseStudio";
import { Logs } from "@/pages/Logs";
import { cn } from "@/lib/utils";
import { developerModeStore } from "@/stores/developer-mode-store";
import { useTranslation } from "react-i18next";

export function DevTools() {
  const { t } = useTranslation();
  const [isDeveloperMode, setIsDeveloperMode] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [height, setHeight] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const [shouldRenderContent, setShouldRenderContent] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(48);

  // TODO: Refactor this animation duration to a shared constant or something
  // Keep this in sync with the tailwind duration used in classes below
  const ANIMATION_DURATION = 300;

  useEffect(() => {
    const unsubscribe = developerModeStore.subscribe(setIsDeveloperMode);
    developerModeStore.ensure();
    return unsubscribe;
  }, []);

  // Handle expanded content rendering with animation delay
  useEffect(() => {
    if (isExpanded) {
      setShouldRenderContent(true);
    } else {
      // Delay unmounting to allow exit animation + height transition to finish
      const timeout = setTimeout(
        () => setShouldRenderContent(false),
        ANIMATION_DURATION + 20
      );
      return () => clearTimeout(timeout);
    }
  }, [isExpanded]);

  // Measure the header height so we can animate between header-only (collapsed)
  // and the expanded panel height. Use ResizeObserver to update if styles change.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const update = () => setHeaderHeight(el.offsetHeight || 48);
    update();

    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(update);
      ro.observe(el);
    } else {
      // Fallback if ResizeObserver somehow isn't supported
      window.addEventListener("resize", update);
    }

    return () => {
      if (ro) ro.disconnect();
      else window.removeEventListener("resize", update);
    };
  }, []);

  // Handle resize
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newHeight = window.innerHeight - e.clientY;
      const minHeight = 100;
      const maxHeight = window.innerHeight - 100;
      setHeight(Math.max(minHeight, Math.min(maxHeight, newHeight)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  // Don't render if developer mode is disabled
  if (!isDeveloperMode) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 overflow-hidden",
        !isResizing && "transition-all duration-300 ease-in-out",
        isResizing && "select-none"
      )}
      style={{
        // We set explicit height so the drag feels immediate for now
        height: isResizing ? `${height}px` : undefined,
        maxHeight: `${isExpanded ? height : headerHeight}px`,
      }}
    >
      <div
        className={cn(
          "h-full flex flex-col",
          isExpanded && "bg-background/95 backdrop-blur-md border-t shadow-2xl"
        )}
      >
        {/* Resize handle (only visible when expanded) */}
        {isExpanded && (
          <div
            className="h-1 cursor-ns-resize hover:bg-primary/20 active:bg-primary/40 transition-colors"
            onMouseDown={() => setIsResizing(true)}
          />
        )}

        {/* Toggle bar (The pull up tab) */}
        <div
          ref={headerRef}
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "cursor-pointer hover:bg-accent/50 transition-colors flex items-center justify-center",
            isExpanded
              ? "px-4 py-2 border-b"
              : "mx-auto w-64 px-4 py-1.5 rounded-t-lg bg-background/80 backdrop-blur-sm border border-b-0 shadow-lg"
          )}
          style={{ userSelect: "none" }}
        >
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 transition-transform duration-300" />
            ) : (
              <ChevronUp className="h-4 w-4 transition-transform duration-300" />
            )}
            <span className="text-sm font-medium">
              {t("layout.sidebar.developerTools")}
            </span>
          </div>
        </div>

        {/* Expanded content */}
        {shouldRenderContent && (
          <div
            className={cn(
              "flex-1 flex flex-col overflow-hidden",
              isExpanded ? "animate-fade-in" : "animate-fade-out"
            )}
          >
            <Tabs
              defaultValue="logger"
              className="flex-1 flex flex-col overflow-hidden"
            >
              <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-4">
                <TabsTrigger value="logger">
                  {t("layout.developerTools.tabs.logger")}
                </TabsTrigger>
                <TabsTrigger value="database-studio">
                  {t("layout.developerTools.tabs.databaseStudio")}
                </TabsTrigger>
                <TabsTrigger value="store-studio">
                  {t("layout.developerTools.tabs.storeStudio")}
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-auto">
                <TabsContent value="logger" className="m-0 h-full">
                  <Logs />
                </TabsContent>

                <TabsContent value="database-studio" className="m-0 h-full">
                  <DatabaseStudio />
                </TabsContent>

                <TabsContent value="store-studio" className="m-0 h-full">
                  <StoreStudio heading={false} />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}
