import {
  RefreshCw,
  Trash2,
  TimerReset,
  Database,
  ListTree,
} from "lucide-react";
import type { StoreEntry } from "@/types/store-studio";
import { userStore } from "@/stores/user-store";
import { avatarsStore } from "@/stores/avatars-store";
import { worldsStore } from "@/stores/worlds-store";
import { accountsStore } from "@/stores/accounts-store";
import { developerModeStore } from "@/stores/developer-mode-store";
import { vrchatStatusStore } from "@/stores/vrchat-status-store";
import { alertStore } from "@/stores/alert-store";
import { toast } from "sonner";

export class StoreRegistry {
  /**
   * Get all resource stores (stores that extend ResourceStore)
   */
  static getResourceStores(): StoreEntry[] {
    return [
      {
        id: "user",
        label: "User Store",
        description: "Cached current user data fetched from VRChat API",
        getData: () => userStore.getSnapshot(),
        subscribe: (listener) => userStore.subscribe(listener),
        actions: [
          {
            id: "ensure",
            label: "Ensure",
            icon: <RefreshCw className="h-4 w-4 mr-2" />,
            onClick: async () => {
              await userStore.ensure();
              toast.success("User store ensured");
            },
          },
          {
            id: "refresh",
            label: "Force Refresh",
            icon: <RefreshCw className="h-4 w-4 mr-2" />,
            onClick: async () => {
              await userStore.refresh();
              toast.success("User store refreshed");
            },
          },
          {
            id: "mark-stale",
            label: "Mark Stale",
            icon: <TimerReset className="h-4 w-4 mr-2" />,
            onClick: () => {
              userStore.markStale();
              toast.success("User store marked as stale");
            },
          },
          {
            id: "clear",
            label: "Clear",
            icon: <Trash2 className="h-4 w-4 mr-2" />,
            variant: "destructive" as const,
            onClick: () => {
              userStore.clear();
              toast.success("User store cleared");
            },
          },
        ],
        debugInfo: () => {
          const scopes = userStore.debugScopes();
          const activeScope = scopes.find((s) => s.isActiveScope);
          return {
            updatedAt: activeScope?.updatedAt || null,
            ageMs: activeScope?.ageMs || null,
            stale: activeScope?.stale || false,
            inflight: activeScope?.inflight || false,
            scopes: scopes.map((scope) => ({
              ...scope,
              label: scope.scopeId || "Global / No Scope",
              actions: [],
            })),
          };
        },
        canEdit: true,
        setData: (value) => {
          if (value && typeof value === "object") {
            userStore.set(value as any); // Type assertion for dynamic store editing
          } else if (value === null) {
            userStore.clear();
          } else {
            throw new Error("Invalid user data");
          }
        },
      },
      {
        id: "worlds",
        label: "Worlds Store",
        description: "Cached uploaded world metadata from VRChat API",
        getData: () => worldsStore.getSnapshot(),
        subscribe: (listener) => worldsStore.subscribe(listener),
        actions: [
          {
            id: "ensure",
            label: "Ensure",
            icon: <RefreshCw className="h-4 w-4 mr-2" />,
            onClick: async () => {
              await worldsStore.ensure();
              toast.success("Worlds store ensured");
            },
          },
          {
            id: "refresh",
            label: "Force Refresh",
            icon: <RefreshCw className="h-4 w-4 mr-2" />,
            onClick: async () => {
              await worldsStore.refresh();
              toast.success("Worlds store refreshed");
            },
          },
          {
            id: "mark-stale",
            label: "Mark Stale",
            icon: <TimerReset className="h-4 w-4 mr-2" />,
            onClick: () => {
              worldsStore.markStale();
              toast.success("Worlds store marked as stale");
            },
          },
          {
            id: "clear",
            label: "Clear",
            icon: <Trash2 className="h-4 w-4 mr-2" />,
            variant: "destructive" as const,
            onClick: () => {
              worldsStore.clear();
              toast.success("Worlds store cleared");
            },
          },
        ],
        debugInfo: () => {
          const scopes = worldsStore.debugScopes();
          const activeScope = scopes.find((s) => s.isActiveScope);
          return {
            updatedAt: activeScope?.updatedAt || null,
            ageMs: activeScope?.ageMs || null,
            stale: activeScope?.stale || false,
            inflight: activeScope?.inflight || false,
            scopes: scopes.map((scope) => ({
              ...scope,
              label: scope.scopeId || "Global / No Scope",
              actions: [],
            })),
          };
        },
        canEdit: true,
        setData: (value) => {
          if (Array.isArray(value)) {
            worldsStore.set(value);
          } else if (value === null) {
            worldsStore.clear();
          } else {
            throw new Error("Worlds data must be an array");
          }
        },
      },
      {
        id: "avatars",
        label: "Avatars Store",
        description: "Cached uploaded avatar metadata from VRChat API",
        getData: () => avatarsStore.getSnapshot(),
        subscribe: (listener) => avatarsStore.subscribe(listener),
        actions: [
          {
            id: "ensure",
            label: "Ensure",
            icon: <RefreshCw className="h-4 w-4 mr-2" />,
            onClick: async () => {
              await avatarsStore.ensure();
              toast.success("Avatars store ensured");
            },
          },
          {
            id: "refresh",
            label: "Force Refresh",
            icon: <RefreshCw className="h-4 w-4 mr-2" />,
            onClick: async () => {
              await avatarsStore.refresh();
              toast.success("Avatars store refreshed");
            },
          },
          {
            id: "mark-stale",
            label: "Mark Stale",
            icon: <TimerReset className="h-4 w-4 mr-2" />,
            onClick: () => {
              avatarsStore.markStale();
              toast.success("Avatars store marked as stale");
            },
          },
          {
            id: "clear",
            label: "Clear",
            icon: <Trash2 className="h-4 w-4 mr-2" />,
            variant: "destructive" as const,
            onClick: () => {
              avatarsStore.clear();
              toast.success("Avatars store cleared");
            },
          },
        ],
        debugInfo: () => {
          const scopes = avatarsStore.debugScopes();
          const activeScope = scopes.find((s) => s.isActiveScope);
          return {
            updatedAt: activeScope?.updatedAt || null,
            ageMs: activeScope?.ageMs || null,
            stale: activeScope?.stale || false,
            inflight: activeScope?.inflight || false,
            scopes: scopes.map((scope) => ({
              ...scope,
              label: scope.scopeId || "Global / No Scope",
              actions: [],
            })),
          };
        },
        canEdit: true,
        setData: (value) => {
          if (Array.isArray(value)) {
            avatarsStore.set(value);
          } else if (value === null) {
            avatarsStore.clear();
          } else {
            throw new Error("Avatars data must be an array");
          }
        },
      },
    ];
  }

  /**
   * Get all simple stores (non-resource stores)
   */
  static getSimpleStores(): StoreEntry[] {
    return [
      {
        id: "accounts",
        label: "Accounts Store",
        description:
          "Cached VRChat account credentials for quick account switching",
        getData: () => accountsStore.getSnapshot(),
        subscribe: (listener) => accountsStore.subscribe(listener),
        actions: [
          {
            id: "ensure",
            label: "Ensure",
            icon: <RefreshCw className="h-4 w-4 mr-2" />,
            onClick: async () => {
              await accountsStore.ensure();
              toast.success("Accounts cache validated");
            },
          },
          {
            id: "refresh",
            label: "Force Refresh",
            icon: <RefreshCw className="h-4 w-4 mr-2" />,
            onClick: async () => {
              await accountsStore.refresh();
              toast.success("Accounts cache refreshed");
            },
          },
          {
            id: "clear",
            label: "Clear",
            icon: <Trash2 className="h-4 w-4 mr-2" />,
            variant: "destructive" as const,
            onClick: () => {
              accountsStore.clear();
              toast.success("Accounts cache cleared");
            },
          },
        ],
        canEdit: true,
        setData: (value) => {
          if (Array.isArray(value)) {
            // Clear and re-add accounts
            accountsStore.set(value);
          } else if (value === null) {
            accountsStore.clear();
          } else {
            throw new Error("Accounts data must be an array");
          }
        },
      },
      {
        id: "developer-mode",
        label: "Developer Mode Store",
        description:
          "Tracks developer mode state, persisted to settings backend",
        getData: () => developerModeStore.getSnapshot(),
        subscribe: (listener) => developerModeStore.subscribe(listener),
        actions: [
          {
            id: "ensure",
            label: "Ensure",
            icon: <RefreshCw className="h-4 w-4 mr-2" />,
            onClick: async () => {
              await developerModeStore.ensure();
              toast.success("Developer mode cache ensured");
            },
          },
          {
            id: "refresh",
            label: "Force Refresh",
            icon: <RefreshCw className="h-4 w-4 mr-2" />,
            onClick: async () => {
              await developerModeStore.refresh();
              toast.success("Developer mode refreshed");
            },
          },
          {
            id: "toggle",
            label: "Toggle",
            icon: <ListTree className="h-4 w-4 mr-2" />,
            variant: "secondary" as const,
            onClick: async () => {
              const newValue = await developerModeStore.toggle();
              toast.success(
                `Developer mode ${newValue ? "enabled" : "disabled"}`
              );
            },
          },
        ],
        canEdit: true,
        setData: (value) => {
          if (typeof value === "boolean") {
            developerModeStore.set(value);
          } else {
            throw new Error("Developer mode value must be a boolean");
          }
        },
      },
      {
        id: "vrchat-status",
        label: "VRChat Status Store",
        description:
          "Monitors VRChat service status via polling the status API",
        getData: () => vrchatStatusStore.getSnapshot(),
        subscribe: (listener) => vrchatStatusStore.subscribe(listener),
        actions: [
          {
            id: "fetch",
            label: "Refresh Now",
            icon: <RefreshCw className="h-4 w-4 mr-2" />,
            onClick: async () => {
              await vrchatStatusStore.fetchStatus();
              toast.success("VRChat status refreshed");
            },
          },
          {
            id: "start-polling",
            label: "Start Polling",
            icon: <Database className="h-4 w-4 mr-2" />,
            onClick: () => {
              vrchatStatusStore.startPolling(300000);
              toast.success("Polling started (5 min interval)");
            },
          },
          {
            id: "stop-polling",
            label: "Stop Polling",
            icon: <Database className="h-4 w-4 mr-2" />,
            onClick: () => {
              vrchatStatusStore.stopPolling();
              toast.success("Polling stopped");
            },
          },
          {
            id: "clear",
            label: "Clear",
            icon: <Trash2 className="h-4 w-4 mr-2" />,
            variant: "destructive" as const,
            onClick: () => {
              vrchatStatusStore.clear();
              toast.success("VRChat status cache cleared");
            },
          },
        ],
        canEdit: false,
      },
      {
        id: "alert",
        label: "Alert Store",
        description:
          "Manages application-wide alerts with navigation and dismissal",
        getData: () => alertStore.getSnapshot(),
        subscribe: (listener) => alertStore.subscribe(listener),
        actions: [
          {
            id: "add-test",
            label: "Add Test Alert",
            icon: <Database className="h-4 w-4 mr-2" />,
            onClick: () => {
              alertStore.addAlert({
                variant: "info",
                message: `Test alert ${Date.now()}`,
                dismissable: true,
              });
              toast.success("Test alert added");
            },
          },
          {
            id: "next",
            label: "Next Alert",
            icon: <RefreshCw className="h-4 w-4 mr-2" />,
            onClick: () => {
              alertStore.nextAlert();
              toast.success("Navigated to next alert");
            },
          },
          {
            id: "previous",
            label: "Previous Alert",
            icon: <RefreshCw className="h-4 w-4 mr-2" />,
            onClick: () => {
              alertStore.previousAlert();
              toast.success("Navigated to previous alert");
            },
          },
          {
            id: "clear-dismissable",
            label: "Clear Dismissable",
            icon: <Trash2 className="h-4 w-4 mr-2" />,
            onClick: () => {
              alertStore.clearDismissable();
              toast.success("Dismissable alerts cleared");
            },
          },
          {
            id: "clear-all",
            label: "Clear All",
            icon: <Trash2 className="h-4 w-4 mr-2" />,
            variant: "destructive" as const,
            onClick: () => {
              alertStore.clearAll();
              toast.success("All alerts cleared");
            },
          },
        ],
        canEdit: true,
        setData: (value) => {
          // This is a more complex store
          // good idea to validate the structure
          if (
            value &&
            typeof value === "object" &&
            "alerts" in value &&
            "currentIndex" in value &&
            Array.isArray((value as { alerts: unknown[] }).alerts)
          ) {
            // For now, we'll just clear and re-add alerts
            alertStore.clearAll();
            const state = value as {
              alerts: Array<{
                variant: "info" | "warning" | "error" | "critical";
                message: string;
                dismissable: boolean;
              }>;
              currentIndex: number;
            };
            state.alerts.forEach((alert) => {
              alertStore.addAlert({
                variant: alert.variant,
                message: alert.message,
                dismissable: alert.dismissable,
              });
            });
            if (
              state.currentIndex >= 0 &&
              state.currentIndex < state.alerts.length
            ) {
              alertStore.setCurrentIndex(state.currentIndex);
            }
          } else {
            throw new Error("Invalid alert store structure");
          }
        },
      },
    ];
  }

  /**
   * Get all stores (both resource and simple)
   */
  static getAllStores(): StoreEntry[] {
    return [...this.getResourceStores(), ...this.getSimpleStores()];
  }

  /**
   * Get a store by ID
   */
  static getStoreById(id: string): StoreEntry | undefined {
    return this.getAllStores().find((store) => store.id === id);
  }
}
