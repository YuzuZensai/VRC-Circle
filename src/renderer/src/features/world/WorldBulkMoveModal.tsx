import { useState } from "react";
import { FolderInput, Star } from "lucide-react";
import { Modal } from "../../components/ui";
import { api, errorMessage } from "../../lib/api";
import { useT } from "../../lib/i18n";
import { useWorldFolderSlots } from "../../store/worldFavorites";

export function WorldBulkMoveModal({
  ids,
  onClose,
  onMoved,
}: {
  ids: string[];
  onClose: () => void;
  onMoved: () => void;
}) {
  const t = useT();
  const slots = useWorldFolderSlots();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(0);
  const [skipped, setSkipped] = useState(0);

  const move = async (folder: string) => {
    setBusy(folder);
    setError(null);
    setDone(0);
    setSkipped(0);
    try {
      let skippedCount = 0;
      for (const id of ids) {
        const result = await api.world.moveFavorite(id, folder);
        if (result.skipped.length) skippedCount += result.skipped.length;
        setSkipped(skippedCount);
        setDone((n) => n + 1);
      }
      if (!skippedCount) {
        onMoved();
      }
    } catch (err) {
      setError(errorMessage(err, t("world:favorite.failed")));
    } finally {
      setBusy(null);
    }
  };

  const progress = ids.length ? Math.round((done / ids.length) * 100) : 0;

  return (
    <Modal
      open
      onClose={onClose}
      title={t("world:bulk.moveTitle", { count: ids.length })}
      icon={<FolderInput size={16} />}
    >
      <div className="flex flex-col gap-1.5 text-left">
        {busy ? (
          <div className="mb-2 flex flex-col gap-1.5">
            <span className="text-[12px] text-muted">
              {t("world:bulk.movingProgress", { done, total: ids.length })}
            </span>
            {skipped ? (
              <p className="text-[12px] font-medium text-danger">
                {t("world:bulk.skipped", { count: skipped })}
              </p>
            ) : null}
            <div className="h-1 overflow-hidden rounded-full bg-surface-hover">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-200 ease-fluid"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : null}
        {slots.map((slot) => (
          <button
            key={slot.name}
            onClick={() => move(slot.name)}
            disabled={busy !== null}
            className="flex items-center gap-2.5 rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-left transition-colors hover:not-disabled:border-accent disabled:opacity-50"
          >
            <span className="text-faint">
              <Star size={15} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium">{slot.displayName}</span>
              <span className="text-[11px] tabular-nums text-faint">
                {t("world:favorite.folderCount", { count: slot.count })}
              </span>
            </span>
          </button>
        ))}
        {!busy && skipped ? (
          <p className="text-[12px] font-medium text-danger">
            {t("world:bulk.skipped", { count: skipped })}
          </p>
        ) : null}
        {error ? <p className="text-[12px] text-danger">{error}</p> : null}
      </div>
    </Modal>
  );
}
