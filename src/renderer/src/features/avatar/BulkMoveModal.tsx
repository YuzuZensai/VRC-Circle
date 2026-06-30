import { useState } from "react";
import { FolderInput, Star } from "lucide-react";
import { Modal } from "../../components/ui";
import { api, errorMessage, isRetryableApiError } from "../../lib/api";
import { useT } from "../../lib/i18n";
import { useAvatars, useFolderSlots } from "../../store/avatars";

export function BulkMoveModal({
  ids,
  onClose,
  onMoved,
}: {
  ids: string[];
  onClose: () => void;
  onMoved: () => void;
}) {
  const t = useT();
  const slots = useFolderSlots();
  const favorites = useAvatars((s) => s.favorites);
  const maxPerGroup = useAvatars((s) => s.favoriteLimits.maxPerGroup);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [moved, setMoved] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const [confirm, setConfirm] = useState<{ folder: string; fits: number } | null>(null);

  const fittingIds = (folder: string): string[] => {
    const slot = slots.find((s) => s.name === folder);
    const present = new Set(favorites.find((f) => f.name === folder)?.avatarIds ?? []);
    const room = slot ? maxPerGroup - slot.count : ids.length;
    const incoming = ids.filter((id) => !present.has(id));
    const already = ids.filter((id) => present.has(id));
    return [...already, ...incoming.slice(0, Math.max(room, 0))];
  };

  const onPick = (folder: string) => {
    const fit = fittingIds(folder);
    if (fit.length < ids.length) {
      setConfirm({ folder, fits: fit.length });
      return;
    }
    void move(folder);
  };

  const move = async (folder: string) => {
    setConfirm(null);
    setBusy(folder);
    setError(null);
    setMoved(0);
    setSkipped(0);
    const fit = new Set(fittingIds(folder));
    try {
      let movedCount = 0;
      let skippedCount = ids.length - fit.size;
      setSkipped(skippedCount);
      for (const id of fit) {
        try {
          const result = await api.avatar.moveFavorite(id, folder, false);
          movedCount += result.moved;
          skippedCount += result.skipped.length;
        } catch (err) {
          if (!isRetryableApiError(err)) throw err;
          skippedCount++;
        }
        setMoved(movedCount);
        setSkipped(skippedCount);
      }
      await api.avatar.reloadFavorites();
      if (!skippedCount) onMoved();
    } catch (err) {
      await api.avatar.reloadFavorites();
      setError(errorMessage(err, t("avatar:actions.failed")));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      dismissible={busy === null}
      title={t("avatar:bulk.moveTitle", { count: ids.length })}
      icon={<FolderInput size={16} />}
    >
      <div className="flex flex-col gap-1.5 text-left">
        {busy ? (
          <div className="mb-2 flex flex-col gap-1.5">
            <span className="text-[12px] text-muted">
              {t("avatar:bulk.movingProgress", { done: moved + skipped, total: ids.length })}
            </span>
            <div className="h-1 overflow-hidden rounded-full bg-surface-hover">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-200 ease-fluid"
                style={{ width: `${Math.round(((moved + skipped) / ids.length) * 100)}%` }}
              />
            </div>
          </div>
        ) : null}
        {confirm ? (
          <div className="mb-1 flex flex-col gap-2 rounded-lg border border-border bg-surface-2 p-3">
            <p className="text-[12px] text-muted">
              {t("avatar:bulk.partialConfirm", { fits: confirm.fits, total: ids.length })}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirm(null)}
                className="rounded-md px-2.5 py-1 text-[12px] text-faint transition-colors hover:bg-surface-hover hover:text-text"
              >
                {t("common:cancel")}
              </button>
              <button
                onClick={() => void move(confirm.folder)}
                className="rounded-md bg-accent px-2.5 py-1 text-[12px] font-medium text-on-accent"
              >
                {t("avatar:bulk.move")}
              </button>
            </div>
          </div>
        ) : null}
        {slots.map((slot) => {
          const full = fittingIds(slot.name).length === 0;
          return (
            <button
              key={slot.name}
              onClick={() => onPick(slot.name)}
              disabled={busy !== null || full}
              className="flex items-center gap-2.5 rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-left transition-colors hover:not-disabled:border-accent disabled:opacity-50"
            >
              <span className="text-faint">
                <Star size={15} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">{slot.displayName}</span>
                <span className="text-[11px] tabular-nums text-faint">
                  {full
                    ? t("avatar:actions.folderFull")
                    : t("avatar:actions.folderCount", { count: slot.count })}
                </span>
              </span>
            </button>
          );
        })}
        {!busy && moved ? (
          <p className="text-[12px] font-medium text-muted">
            {t("avatar:bulk.moved", { count: moved })}
          </p>
        ) : null}
        {!busy && skipped ? (
          <p className="text-[12px] font-medium text-danger">
            {t("avatar:bulk.skipped", { count: skipped })}
          </p>
        ) : null}
        {error ? <p className="text-[12px] text-danger">{error}</p> : null}
      </div>
    </Modal>
  );
}
