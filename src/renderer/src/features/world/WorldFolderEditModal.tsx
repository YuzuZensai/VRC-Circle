import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { FavoriteVisibility } from "../../../../shared/types/world";
import { Button, Field, INPUT_CLASS, Modal } from "../../components/ui";
import { api, errorMessage } from "../../lib/api";
import { useT } from "../../lib/i18n";
import type { FavoriteFolder } from "../../store/worldFavorites";

const VISIBILITIES: FavoriteVisibility[] = ["private", "friends", "public"];

export function WorldFolderEditModal({
  folder,
  onClose,
}: {
  folder: FavoriteFolder;
  onClose: () => void;
}) {
  const t = useT();
  const [displayName, setDisplayName] = useState(folder.displayName);
  const [visibility, setVisibility] = useState<FavoriteVisibility>(folder.visibility);
  const [busy, setBusy] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.world.updateFavoriteFolder(folder.name, { displayName, visibility });
      onClose();
    } catch (err) {
      setError(errorMessage(err, t("world:favorite.failed")));
      setBusy(false);
    }
  };

  const clear = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.world.clearFavoriteFolder(folder.name);
      onClose();
    } catch (err) {
      setError(errorMessage(err, t("world:favorite.failed")));
      setBusy(false);
      setConfirmClear(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t("world:folder.editTitle")}
      icon={<Pencil size={16} />}
      confirmLabel={t("world:favorite.save")}
      onConfirm={save}
      confirmLoading={busy}
      confirmDisabled={!displayName.trim()}
    >
      <div className="flex flex-col gap-3 text-left">
        <Field
          label={t("world:folder.name")}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-muted">{t("world:folder.visibility")}</span>
          <select
            className={INPUT_CLASS}
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as FavoriteVisibility)}
          >
            {VISIBILITIES.map((v) => (
              <option key={v} value={v}>
                {t(`world:visibility.${v}`)}
              </option>
            ))}
          </select>
        </label>

        {folder.count > 0 ? (
          <div className="mt-1 border-t border-border pt-3">
            {confirmClear ? (
              <div className="flex items-center justify-between gap-3">
                <span className="text-[12px] text-muted">
                  {t("world:folder.clearConfirm", { count: folder.count })}
                </span>
                <Button variant="danger" onClick={clear} loading={busy}>
                  {t("world:folder.clear")}
                </Button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmClear(true)}
                className="flex items-center gap-1.5 text-[12px] font-medium text-danger transition-opacity hover:opacity-80"
              >
                <Trash2 size={13} /> {t("world:folder.clear")}
              </button>
            )}
          </div>
        ) : null}

        {error ? <p className="text-[12px] text-danger">{error}</p> : null}
      </div>
    </Modal>
  );
}
