// TODO: Localize all strings

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StoreStudioErrorProps {
  storeName?: string;
  onRetry?: () => void;
}

export function StoreStudioError({
  storeName,
  onRetry,
}: StoreStudioErrorProps) {
  return (
    <div className="flex items-center justify-center min-h-screen p-6 bg-background">
      <Card className="max-w-2xl w-full border-destructive">
        <CardHeader>
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <div>
              <CardTitle className="text-2xl">Connection error</CardTitle>
              <CardDescription className="mt-2">
                Can't attach to main window stores.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground">
            {storeName ? (
              <>
                Couldn't find <strong>{storeName}</strong> in the main window.
              </>
            ) : (
              <>Store Studio couldn't attach to the main window.</>
            )}
          </p>

          <p className="text-sm text-muted-foreground">
            Ensure the main app is open and logged in, then retry.
          </p>

          <div className="flex flex-wrap gap-3">
            {onRetry && (
              <Button onClick={onRetry} variant="default">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
