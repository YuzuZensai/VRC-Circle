// TODO: Localize all strings

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Save, X, AlertTriangle } from "lucide-react";

interface StoreEditorProps {
  storeName: string;
  initialValue: unknown;
  onSave: (value: unknown) => void | Promise<void>;
  onCancel: () => void;
  scopeLabel?: string;
}

export function StoreEditor({
  storeName,
  initialValue,
  onSave,
  onCancel,
  scopeLabel,
}: StoreEditorProps) {
  const [jsonText, setJsonText] = useState(() =>
    JSON.stringify(initialValue, null, 2)
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      const parsed = JSON.parse(jsonText);
      setError(null);
      setSaving(true);

      await onSave(parsed);
      toast.success(`${storeName} saved successfully`);

      onCancel();
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError(`Invalid JSON: ${err.message}`);
        toast.error("Invalid JSON");
      } else {
        setError(
          `Failed to save: ${
            err instanceof Error ? err.message : "Unknown error"
          }`
        );
        toast.error("Save failed");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleValidate = () => {
    try {
      JSON.parse(jsonText);
      setError(null);
      toast.success("Valid JSON");
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError(`Invalid JSON: ${err.message}`);
        toast.error("Invalid JSON");
      }
    }
  };

  return (
    <Card className="border-yellow-400 dark:border-yellow-600">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              {`${storeName} Editor`} {scopeLabel ? `(${scopeLabel})` : ""}
            </CardTitle>
            <CardDescription className="mt-2">
              Edit the JSON for this store and save your changes.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            className="font-mono text-xs min-h-[300px] max-h-[60vh]"
            placeholder={"Paste JSON here..."}
          />
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded border border-destructive/30">
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving || !!error} size="sm">
            {saving ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save
              </>
            )}
          </Button>
          <Button onClick={handleValidate} variant="outline" size="sm">
            Validate
          </Button>
          <Button onClick={onCancel} variant="ghost" size="sm">
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded p-3 text-xs text-yellow-900 dark:text-yellow-200">
          <strong>Warning:</strong> Editing store data can break the app if you
          save invalid JSON. Proceed with caution.
        </div>
      </CardContent>
    </Card>
  );
}
