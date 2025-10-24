// TODO: Localize all strings

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
import { Loader2, Edit, Clock, Database } from "lucide-react";
import type {
  StoreEntry,
  StoreAction,
  StoreDebugData,
} from "@/types/store-studio";
import { StoreEditor } from "./StoreEditor";

interface StoreViewerProps<T = unknown> {
  store: StoreEntry<T>;
}

function formatAge(ageMs: number | null): string {
  if (ageMs === null) {
    return "never";
  }
  const seconds = Math.floor(ageMs / 1000);
  if (seconds < 1) return "<1s";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

export function StoreViewer<T = unknown>({ store }: StoreViewerProps<T>) {
  console.log("[StoreViewer] Component rendering for store:", store.label);

  const [data, setData] = useState<T | null>(null);
  const [debugInfo, setDebugInfo] = useState<StoreDebugData | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Subscribe to store changes
  useEffect(() => {
    console.log(`[StoreViewer] ${store.label} setting up subscription`);

    const unsubscribe = store.subscribe((value) => {
      console.log(
        `[StoreViewer] ${store.label} received update via subscription:`,
        value !== null ? "(data)" : "null"
      );
      setData(value);
      if (store.debugInfo) {
        setDebugInfo(store.debugInfo());
      }
    });

    return () => {
      console.log(`[StoreViewer] ${store.label} cleaning up subscription`);
      unsubscribe();
    };
  }, [store]);

  // Refresh debug info every second to update age display
  useEffect(() => {
    const interval = setInterval(() => {
      if (store.debugInfo) {
        setDebugInfo(store.debugInfo());
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [store]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async (newValue: unknown) => {
    if (store.setData) {
      await store.setData(newValue as T);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  if (isEditing && store.canEdit && store.setData) {
    return (
      <StoreEditor
        storeName={store.label}
        initialValue={data}
        onSave={handleSave}
        onCancel={handleCancelEdit}
      />
    );
  }

  const showEditButton = store.canEdit && store.setData;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-xl flex items-center gap-2">
                <Database className="h-5 w-5" />
                {store.label}
              </CardTitle>
              {store.description && (
                <CardDescription className="mt-2">
                  {store.description}
                </CardDescription>
              )}
            </div>
            {showEditButton && (
              <Button onClick={handleEdit} variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>

          {debugInfo && (
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              {debugInfo.updatedAt !== undefined &&
                debugInfo.updatedAt !== null && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>
                      Updated:{" "}
                      {debugInfo.updatedAt
                        ? new Date(debugInfo.updatedAt).toLocaleString()
                        : "Never"}
                    </span>
                  </div>
                )}
              {debugInfo.ageMs !== undefined && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>Age: {formatAge(debugInfo.ageMs)}</span>
                </div>
              )}
              {debugInfo.stale !== undefined && (
                <Badge variant={debugInfo.stale ? "destructive" : "secondary"}>
                  {debugInfo.stale ? "Stale" : "Fresh"}
                </Badge>
              )}
              {debugInfo.inflight && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading
                </Badge>
              )}
            </div>
          )}
        </CardHeader>

        {store.actions && store.actions.length > 0 && (
          <CardContent className="border-t pt-4">
            <div className="flex flex-wrap gap-2">
              {store.actions.map((action) => (
                <ActionButton key={action.id} action={action} />
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data</CardTitle>
          <CardDescription>
            Real-time view of store content (updates instantly via
            subscriptions)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[60vh] rounded border bg-muted/40">
            <pre className="p-4 text-xs font-mono whitespace-pre-wrap break-all">
              {(() => {
                if (data === null) {
                  return "<null>";
                }
                if (data === undefined) {
                  return "<undefined>";
                }
                if (Array.isArray(data) && data.length === 0) {
                  return "[]  (empty array)";
                }
                return JSON.stringify(data, null, 2);
              })()}
            </pre>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

interface ActionButtonProps {
  action: StoreAction;
}

function ActionButton({ action }: ActionButtonProps) {
  const [pending, setPending] = useState(false);

  const handleClick = async () => {
    setPending(true);
    try {
      await action.onClick();
    } finally {
      setPending(false);
    }
  };

  return (
    <Button
      onClick={handleClick}
      variant={action.variant || "outline"}
      size="sm"
      disabled={action.disabled || pending}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        action.icon
      )}
      {action.label}
    </Button>
  );
}
