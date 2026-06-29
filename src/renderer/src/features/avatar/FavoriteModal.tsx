import { useState } from "react";
import { Check, Star } from "lucide-react";
import type { Avatar } from "../../../../shared/types/avatar";
import { Button, Modal } from "../../components/ui";
import { api, errorMessage } from "../../lib/api";
import { useT } from "../../lib/i18n";
import { useFolderSlots } from "../../store/avatars";

export function FavoriteModal({
  avatar,
  currentFolder,
  onClose,
}: {
  avatar: Avatar;
  currentFolder?: string;
  onClose: () => void;
}) {
  const t = useT();
  const slots = useFolderSlots();
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
      setError(errorMessage(err, t("avatar:actions.failed")));
      setBusy(null);
    }
  };

  const pick = (folder: string) => {
    if (folder === currentFolder) return onClose();
    if (currentFolder) {
      setBusy(folder);
      setError(null);
      setSkipped(false);
      return api.avatar
        .moveFavorite(avatar.id, folder)
        .then((result) => {
          if (result.skipped.length) {
            setSkipped(true);
            return;
          }
          onClose();
        })
        .catch((err) => setError(errorMessage(err, t("avatar:actions.failed"))))
        .finally(() => setBusy(null));
    }
    return run(folder, () => api.avatar.favorite(avatar.id, folder));
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={currentFolder ? t("avatar:actions.manageFavorite") : t("avatar:actions.favorite")}
      icon={<Star size={16} />}
    >
      <div className="flex flex-col gap-1.5 text-left">
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
                  {t("avatar:actions.folderCount", { count: slot.count })}
                  {slot.full ? ` · ${t("avatar:actions.folderFull")}` : ""}
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
            onClick={() => run("unfavorite", () => api.avatar.unfavorite(avatar.id))}
          >
            {t("avatar:actions.unfavorite")}
          </Button>
        ) : null}

        {skipped ? <p className="text-[12px] text-muted">{t("avatar:bulk.skipped", { count: 1 })}</p> : null}
        {error ? <p className="text-[12px] text-danger">{error}</p> : null}
      </div>
    </Modal>
  );
}
