import { useState, useEffect, useCallback, useRef } from "react";
import { commands } from "@/types/bindings";
import type { SystemStatus } from "@/types/bindings";

interface UseVRChatStatusOptions {
  /** Polling interval in milliseconds */
  pollInterval?: number;
  /** Whether to start polling immediately (default: true) */
  enabled?: boolean;
}

interface UseVRChatStatusReturn {
  status: SystemStatus | null;
  statusPageUrl: string | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
}

export function useVRChatStatus(
  options: UseVRChatStatusOptions = {}
): UseVRChatStatusReturn {
  const { pollInterval = 60000, enabled = true } = options;

  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [statusPageUrl, setStatusPageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const intervalRef = useRef<number | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log("[VRChatStatus] Fetching status...");
      const result = await commands.getVrchatStatus();

      if (result.status === "ok") {
        const response = result.data;
        console.log("[VRChatStatus] Status received:", response.status);
        setStatus(response.status);
        setStatusPageUrl(response.page.url);
        setLastUpdated(new Date());
      } else {
        console.error("[VRChatStatus] Error response:", result.error);
        setError(result.error || "Failed to fetch VRChat status");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      console.error("[VRChatStatus] Exception:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    fetchStatus();

    if (pollInterval > 0) {
      intervalRef.current = window.setInterval(fetchStatus, pollInterval);
    }

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, pollInterval, fetchStatus]);

  return {
    status,
    statusPageUrl,
    isLoading,
    error,
    lastUpdated,
    refresh: fetchStatus,
  };
}
