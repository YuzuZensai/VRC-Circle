import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AlertBar } from "./ui/alert-bar";
import { alertStore } from "@/stores";
import type { AlertStoreState } from "@/stores/alert-store";
import { cn } from "@/lib/utils";

export function AlertBarContainer() {
  // Force re-render every 30 seconds
  // TODO: Remove this, no longer needed
  const [, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);
  const [alertState, setAlertState] = useState<AlertStoreState>(
    alertStore.getSnapshot()
  );

  useEffect(() => {
    const unsubscribe = alertStore.subscribe((state) => {
      setAlertState(state);
    });

    return unsubscribe;
  }, []);

  const { alerts, currentIndex } = alertState;
  const currentAlert = alerts[currentIndex];

  if (!currentAlert) return null;

  const hasMultipleAlerts = alerts.length > 1;

  const handleDismiss = () => {
    if (currentAlert.dismissable) {
      alertStore.removeAlert(currentAlert.id);
    }
  };

  const handleClick = async () => {
    if (currentAlert.onClick) {
      try {
        await currentAlert.onClick();
      } catch (error) {
        console.error("Alert onClick error:", error);
      }
    }
  };

  return (
    <div className="w-full flex-shrink-0 animate-slide-in-from-top">
      <AlertBar
        variant={currentAlert.variant}
        dismissable={currentAlert.dismissable}
        onDismiss={handleDismiss}
        className={cn(
          "w-full rounded-none border-0 border-b transition-opacity",
          currentAlert.onClick && "cursor-pointer hover:opacity-90"
        )}
        onClick={currentAlert.onClick ? handleClick : undefined}
      >
        <div className="flex items-center flex-1 min-w-0 gap-2">
          {/* Alert Message */}
          <div className="flex-1 min-w-0">{currentAlert.message}</div>

          {/* Navigation Controls (Only show if there are multiple alerts) */}
          {hasMultipleAlerts && (
            <div className="flex items-center gap-2 flex-shrink-0 ml-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  alertStore.previousAlert();
                }}
                className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                aria-label="Previous alert"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <span className="text-xs font-mono px-2">
                {currentIndex + 1}/{alerts.length}
              </span>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  alertStore.nextAlert();
                }}
                className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                aria-label="Next alert"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </AlertBar>
    </div>
  );
}
