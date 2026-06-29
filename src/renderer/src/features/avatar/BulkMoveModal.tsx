import { useState } from "react";
import { FolderInput, Star } from "lucide-react";
import { Modal } from "../../components/ui";
import { api, errorMessage } from "../../lib/api";
import { useT } from "../../lib/i18n";
import { useFolderSlots } from "../../store/avatars";

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
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<number | null>(null);

  const move = async (folder: string) => {
    setBusy(folder);
    setError(null);
    setSkipped(null);
    try {
      const result = await api.avatar.moveFavoriteMany(ids, folder);
      if (result.skipped.length) {
        setSkipped(result.skipped.length);
        setBusy(null);
      } else {
        onMoved();
      }
    } catch (err) {
      setError(errorMessage(err, t("avatar:actions.failed")));
      setBusy(null);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t("avatar:bulk.moveTitle", { count: ids.length })}
      icon={<FolderInput size={16} />}
    >
      <div className="flex flex-col gap-1.5 text-left">
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
                {t("avatar:actions.folderCount", { count: slot.count })}
              </span>
            </span>
          </button>
        ))}
        {skipped ? (
          <p className="text-[12px] text-muted">{t("avatar:bulk.skipped", { count: skipped })}</p>
        ) : null}
        {error ? <p className="text-[12px] text-danger">{error}</p> : null}
      </div>
    </Modal>
  );
}
