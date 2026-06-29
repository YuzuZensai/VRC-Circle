import { useState } from "react";
import { Pencil } from "lucide-react";
import type { FavoriteVisibility } from "../../../../shared/types/avatar";
import { Field, INPUT_CLASS, Modal } from "../../components/ui";
import { api, errorMessage } from "../../lib/api";
import { useT } from "../../lib/i18n";
import type { FavoriteFolder } from "../../store/avatars";

const VISIBILITIES: FavoriteVisibility[] = ["private", "friends", "public"];

export function FolderEditModal({
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
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.avatar.updateFavoriteFolder(folder.name, { displayName, visibility });
      onClose();
    } catch (err) {
      setError(errorMessage(err, t("avatar:actions.failed")));
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t("avatar:folder.editTitle")}
      icon={<Pencil size={16} />}
      confirmLabel={t("avatar:actions.save")}
      onConfirm={save}
      confirmLoading={busy}
      confirmDisabled={!displayName.trim()}
    >
      <div className="flex flex-col gap-3 text-left">
        <Field
          label={t("avatar:folder.name")}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-muted">{t("avatar:folder.visibility")}</span>
          <select
            className={INPUT_CLASS}
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as FavoriteVisibility)}
          >
            {VISIBILITIES.map((v) => (
              <option key={v} value={v}>
                {t(`avatar:visibility.${v}`)}
              </option>
            ))}
          </select>
        </label>
        {error ? <p className="text-[12px] text-danger">{error}</p> : null}
      </div>
    </Modal>
  );
}
