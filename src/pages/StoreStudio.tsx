// TODO: Localize strings

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Database, ListTree, User } from "lucide-react";
import { StoreViewer } from "@/components/store-studio/StoreViewer";
import { StoreStudioError } from "@/components/store-studio/StoreStudioError";
import { StoreRegistry } from "@/services/storeRegistry";
import { useAuth } from "@/context/AuthContext";
import { getActiveAccountId } from "@/stores/account-scope";

interface StoreStudioProps {
  heading?: boolean;
}

export function StoreStudio({ heading = false }: StoreStudioProps) {
  console.log("[StoreStudio] Component rendering");
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const { user } = useAuth();

  // Manage stores in state so we can retry loading without relying on globals
  const [allStores, setAllStores] = useState(() =>
    StoreRegistry.getAllStores()
  );
  const [selectedStoreId, setSelectedStoreId] = useState<string>(
    allStores[0]?.id || "user"
  );
  const selectedStore = allStores.find((store) => store.id === selectedStoreId);
  const activeAccountId = getActiveAccountId();

  // Try to load stores and catch any errors that may have been thrown during module init
  useEffect(() => {
    let mounted = true;

    async function loadStores() {
      try {
        const stores = await Promise.resolve(StoreRegistry.getAllStores());
        if (mounted) {
          setAllStores(stores);
          // Ensure selectedStoreId stays valid
          setSelectedStoreId(
            (prev) =>
              stores.find((s) => s.id === prev)?.id || stores[0]?.id || "user"
          );
          setConnectionError(null);
        }
      } catch (err: any) {
        if (mounted) {
          setConnectionError(
            err?.message || String(err) || "Unknown error loading stores"
          );
        }
      }
    }

    loadStores();
    return () => {
      mounted = false;
    };
  }, []);

  if (connectionError) {
    return (
      <StoreStudioError
        onRetry={() => {
          setConnectionError(null);
          try {
            const stores = StoreRegistry.getAllStores();
            setAllStores(stores);
            setSelectedStoreId(stores[0]?.id || "user");
          } catch (err: any) {
            setConnectionError(
              err?.message || String(err) || "Unknown error loading stores"
            );
          }
        }}
      />
    );
  }

  console.log(
    "[StoreStudio] Selected store:",
    selectedStore?.label,
    "Active account:",
    activeAccountId,
    "User:",
    user?.displayName
  );

  return (
    <div className="p-6 space-y-6">
      {heading ? (
        <div>
          <h2 className="text-2xl font-semibold">Store Studio</h2>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Inspect and manage front-end store caches in real-time. Use this to
            debug stale data, verify cache scopes, and trigger manual refreshes.
            Debug mode allows editing store content directly.
          </p>
        </div>
      ) : null}

      {/* Current Scope Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-5 w-5" />
                Current Scope
              </CardTitle>
              <CardDescription className="mt-2">
                Resource stores (User, Worlds, Avatars) cache data per account
                scope
              </CardDescription>
            </div>
            <div className="flex flex-col items-end gap-2">
              {user && (
                <>
                  <Badge variant="default" className="font-mono text-xs">
                    {user.displayName}
                  </Badge>
                  <Badge variant="outline" className="font-mono text-xs">
                    {activeAccountId || "No scope"}
                  </Badge>
                </>
              )}
              {!user && <Badge variant="outline">Not logged in</Badge>}
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        {/* Sidebar */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4" />
              All Stores
            </CardTitle>
            <CardDescription>
              Select a store to inspect and manage its data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[70vh]">
              <div className="space-y-2 pr-4">
                {allStores.map((store) => (
                  <Button
                    key={store.id}
                    variant={
                      store.id === selectedStoreId ? "default" : "outline"
                    }
                    className="w-full justify-start"
                    onClick={() => setSelectedStoreId(store.id)}
                  >
                    <ListTree className="h-4 w-4 mr-2" />
                    {store.label}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="space-y-4">
          {selectedStore ? (
            <StoreViewer store={selectedStore} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No store selected</CardTitle>
                <CardDescription>
                  Select a store from the sidebar to view its contents
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
