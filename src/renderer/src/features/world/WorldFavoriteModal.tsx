import { useState } from "react";
import { Check, Star } from "lucide-react";
import type { World } from "../../../../shared/types/world";
import { Button, Modal } from "../../components/ui";
import { api, errorMessage } from "../../lib/api";
import { useT } from "../../lib/i18n";
import { useWorldFolderSlots } from "../../store/worldFavorites";

export function WorldFavoriteModal({
  world,
  currentFolder,
  onClose,
}: {
  world: World;
  currentFolder?: string;
  onClose: () => void;
}) {
  const t = useT();
  const slots = useWorldFolderSlots();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [skipped, setSkipped] = useState(false);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    setError(null);
    try {
      await fn();
      onClose();
    } catch (err) {
      setError(errorMessage(err, t("world:favorite.failed")));
      setBusy(null);
    }
  };

  const pick = (folder: string) => {
    if (folder === currentFolder) return onClose();
    if (currentFolder) {
      setBusy(folder);
      setError(null);
      setSkipped(false);
      return api.world
        .moveFavorite(world.id, folder)
        .then((result) => {
          if (result.skipped.length) {
            setSkipped(true);
            return;
          }
          onClose();
        })
        .catch((err) => setError(errorMessage(err, t("world:favorite.failed"))))
        .finally(() => setBusy(null));
    }
    return run(folder, () => api.world.favorite(world.id, folder));
  };

  return (
    <Modal
      open
      onClose={onClose}
      dismissible={busy === null}
      title={currentFolder ? t("world:favorite.manage") : t("world:favorite.add")}
      icon={<Star size={16} />}
    >
      <div className="flex flex-col gap-1.5 text-left">
        {skipped ? (
          <p className="mb-1 text-[12px] font-medium text-danger">
            {t("world:bulk.skipped", { count: 1 })}
          </p>
        ) : null}
        {busy ? (
          <div className="mb-2 flex flex-col gap-1.5">
            <span className="text-[12px] text-muted">{t("world:bulk.moving")}</span>
            <div className="h-1 overflow-hidden rounded-full bg-surface-hover">
              <div className="h-full w-full rounded-full bg-accent" />
            </div>
          </div>
        ) : null}
        {slots.map((slot) => {
          const isCurrent = slot.name === currentFolder;
          const disabled = busy !== null || (slot.full && !isCurrent);
          return (
            <button
              key={slot.name}
              onClick={() => pick(slot.name)}
              disabled={disabled}
              className="flex items-center gap-2.5 rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-left transition-colors hover:not-disabled:border-accent disabled:opacity-50"
            >
              <span className="text-faint">
                <Star size={15} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">{slot.displayName}</span>
                <span className="text-[11px] tabular-nums text-faint">
                  {t("world:favorite.folderCount", { count: slot.count })}
                  {slot.full ? ` · ${t("world:favorite.folderFull")}` : ""}
                </span>
              </span>
              {isCurrent ? <Check size={15} className="text-accent" /> : null}
            </button>
          );
        })}

        {currentFolder ? (
          <Button
            variant="ghost"
            className="mt-1 justify-center"
            block
            loading={busy === "unfavorite"}
            disabled={busy !== null}
            onClick={() => run("unfavorite", () => api.world.unfavorite(world.id))}
          >
            {t("world:favorite.unfavorite")}
          </Button>
        ) : null}

        {error ? <p className="text-[12px] text-danger">{error}</p> : null}
      </div>
    </Modal>
  );
}
