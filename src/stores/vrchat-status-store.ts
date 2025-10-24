import { commands } from "@/types/bindings";
import type {
  VRChatStatusResponse,
  SystemStatus,
  StatusIndicator,
} from "@/types/bindings";
import { logger } from "@/utils/logger";
import { alertStore } from "./alert-store";
import type { AlertVariant } from "./alert-store";
import { registerSingleton } from "./singleton-registry";

export interface VRChatStatusState {
  status: SystemStatus | null;
  statusPageUrl: string | null;
  lastUpdated: Date | null;
  isLoading: boolean;
  error: string | null;
}

type VRChatStatusListener = (state: VRChatStatusState) => void;

export class VRChatStatusStore {
  private listeners = new Set<VRChatStatusListener>();
  private cache: VRChatStatusState = {
    status: null,
    statusPageUrl: null,
    lastUpdated: null,
    isLoading: false,
    error: null,
  };
  private pollInterval: number | null = null;
  private pollIntervalMs: number = 300000; // 5 minutes
  private currentAlertId: string | null = null;

  getSnapshot(): VRChatStatusState {
    return { ...this.cache };
  }

  subscribe(listener: VRChatStatusListener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Start polling for VRChat status
   * @param intervalMs - Polling interval in milliseconds
   */
  startPolling(intervalMs: number = 300000): void {
    this.pollIntervalMs = intervalMs;

    this.fetchStatus();

    if (this.pollInterval !== null) {
      clearInterval(this.pollInterval);
    }

    this.pollInterval = window.setInterval(() => {
      this.fetchStatus();
    }, this.pollIntervalMs);

    logger.info("VRChatStatusStore", `Started polling every ${intervalMs}ms`);
  }

  /**
   * Stop polling for VRChat status
   */
  stopPolling(): void {
    if (this.pollInterval !== null) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
      logger.info("VRChatStatusStore", "Stopped polling");
    }
  }

  /**
   * Manually fetch VRChat status
   */
  async fetchStatus(): Promise<void> {
    this.updateState({ isLoading: true, error: null });

    try {
      logger.debug("VRChatStatusStore", "Fetching VRChat status...");
      const result = await commands.getVrchatStatus();

      if (result.status === "ok") {
        const response = result.data as VRChatStatusResponse;
        logger.debug("VRChatStatusStore", "Status received:", response.status);

        this.updateState({
          status: response.status,
          statusPageUrl: response.page.url,
          lastUpdated: new Date(),
          isLoading: false,
          error: null,
        });

        this.syncToAlertStore();
      } else {
        logger.error("VRChatStatusStore", "Error response:", result.error);
        this.updateState({
          isLoading: false,
          error: result.error || "Failed to fetch VRChat status",
        });
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      logger.error("VRChatStatusStore", "Exception:", err);
      this.updateState({
        isLoading: false,
        error: errorMessage,
      });
    }
  }

  /**
   * Check if VRChat services are experiencing issues
   */
  hasIssues(): boolean {
    return this.cache.status !== null && this.cache.status.indicator !== "none";
  }

  /**
   * Get the status indicator
   */
  getSeverityLevel(): StatusIndicator {
    return this.cache.status?.indicator ?? "none";
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.updateState({
      status: null,
      statusPageUrl: null,
      lastUpdated: null,
      isLoading: false,
      error: null,
    });

    // Remove alert from Alert Store
    if (this.currentAlertId) {
      alertStore.removeAlert(this.currentAlertId);
      this.currentAlertId = null;
    }
  }

  /**
   * Sync VRChat status to the Alert Store
   */
  private syncToAlertStore(): void {
    const { status, statusPageUrl, lastUpdated } = this.cache;

    // Remove existing alert if status is now healthy
    if (!status || status.indicator === "none") {
      if (this.currentAlertId) {
        alertStore.removeAlert(this.currentAlertId);
        this.currentAlertId = null;
      }
      return;
    }

    // Map status indicator to alert variant
    const variant: AlertVariant =
      status.indicator === "critical"
        ? "critical"
        : status.indicator === "major"
        ? "error"
        : status.indicator === "minor"
        ? "warning"
        : "info";

    const message = `VRChat Status: ${status.description}`;

    const onClick = statusPageUrl
      ? async () => {
          try {
            const opener = await import("@tauri-apps/plugin-opener");
            const anyOpener = opener as any;
            if (typeof anyOpener.openUrl === "function") {
              await anyOpener.openUrl(statusPageUrl);
            } else if (anyOpener && typeof anyOpener.default === "object") {
              const defaultOpener = anyOpener.default;
              if (typeof defaultOpener.openUrl === "function") {
                await defaultOpener.openUrl(statusPageUrl);
              }
            }
          } catch (error) {
            logger.error(
              "VRChatStatusStore",
              "Failed to open status page:",
              error
            );
          }
        }
      : undefined;

    // Update existing alert or create new one
    if (this.currentAlertId) {
      alertStore.updateAlert(this.currentAlertId, {
        variant,
        message,
        onClick,
        metadata: { status, statusPageUrl, lastUpdated },
      });
    } else {
      this.currentAlertId = alertStore.addAlert({
        variant,
        message,
        dismissable: false,
        onClick,
        metadata: { status, statusPageUrl, lastUpdated },
      });
    }
  }

  private updateState(partial: Partial<VRChatStatusState>): void {
    this.cache = { ...this.cache, ...partial };
    this.emit(this.getSnapshot());
  }

  private emit(state: VRChatStatusState): void {
    for (const listener of this.listeners) {
      try {
        listener(state);
      } catch (error) {
        logger.error("VRChatStatusStore", "Listener error", error);
      }
    }
  }
}

export const vrchatStatusStore = registerSingleton(
  "vrchatStatus",
  () => new VRChatStatusStore()
);
