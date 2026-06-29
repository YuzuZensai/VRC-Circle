import { useState } from "react";
import { Pencil, Shirt, Star, Trash2 } from "lucide-react";
import type { Avatar } from "../../../../shared/types/avatar";
import { Button, Field, INPUT_CLASS, Modal } from "../../components/ui";
import { api, errorMessage } from "../../lib/api";
import { useT } from "../../lib/i18n";
import { useSocial } from "../../store/social";
import { useFavoriteAvatars } from "../../store/avatars";
import { useNav } from "../navigation/NavContext";

const RELEASE_STATUSES = ["public", "private"] as const;

export function AvatarActions({ avatar }: { avatar: Avatar }) {
  const t = useT();
  const { back } = useNav();
  const self = useSocial((s) => (s.selfId ? s.users[s.selfId] : undefined));
  const folders = useFavoriteAvatars();
  const isOwner = avatar.authorId === self?.id;
  const isCurrent = self?.currentAvatarId === avatar.id;
  const isFavorited = folders.some((f) => f.avatars.some((a) => a.id === avatar.id));

  const [busy, setBusy] = useState<null | "select" | "favorite">(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (kind: "select" | "favorite", fn: () => Promise<void>) => {
    setBusy(kind);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(errorMessage(err, t("avatar:actions.failed")));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mb-1 ml-auto flex shrink-0 flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        <Button
          onClick={() => run("select", () => api.avatar.select(avatar.id))}
          loading={busy === "select"}
          disabled={isCurrent}
        >
          <Shirt size={15} />
          {isCurrent ? t("avatar:actions.wearing") : t("avatar:actions.wear")}
        </Button>
        <Button
          variant="ghost"
          onClick={() =>
            run("favorite", () => api.avatar.setFavorited(avatar.id, !isFavorited))
          }
          loading={busy === "favorite"}
          title={isFavorited ? t("avatar:actions.unfavorite") : t("avatar:actions.favorite")}
        >
          <Star size={15} fill={isFavorited ? "currentColor" : "none"} />
        </Button>
        {isOwner ? (
          <>
            <Button variant="ghost" onClick={() => setEditOpen(true)} title={t("avatar:actions.edit")}>
              <Pencil size={15} />
            </Button>
            <Button
              variant="ghost"
              onClick={() => setDeleteOpen(true)}
              title={t("avatar:actions.delete")}
            >
              <Trash2 size={15} />
            </Button>
          </>
        ) : null}
      </div>
      {error ? <p className="text-[12px] text-danger">{error}</p> : null}

      {editOpen ? (
        <EditModal avatar={avatar} onClose={() => setEditOpen(false)} />
      ) : null}

      <DeleteModal
        avatar={avatar}
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onDeleted={back}
      />
    </div>
  );
}

function EditModal({ avatar, onClose }: { avatar: Avatar; onClose: () => void }) {
  const t = useT();
  const [name, setName] = useState(avatar.name);
  const [description, setDescription] = useState(avatar.description);
  const [releaseStatus, setReleaseStatus] = useState(avatar.releaseStatus);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.avatar.update(avatar.id, { name, description, releaseStatus });
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
      title={t("avatar:actions.editTitle")}
      icon={<Pencil size={16} />}
      confirmLabel={t("avatar:actions.save")}
      onConfirm={save}
      confirmLoading={busy}
      confirmDisabled={!name.trim()}
    >
      <div className="flex flex-col gap-3 text-left">
        <Field
          label={t("avatar:actions.name")}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-muted">
            {t("avatar:actions.description")}
          </span>
          <textarea
            className={`${INPUT_CLASS} min-h-[88px] resize-y`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-muted">
            {t("avatar:actions.releaseStatus")}
          </span>
          <select
            className={INPUT_CLASS}
            value={releaseStatus}
            onChange={(e) => setReleaseStatus(e.target.value)}
          >
            {RELEASE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`avatar:releaseStatus.${s}`)}
              </option>
            ))}
          </select>
        </label>
        {error ? <p className="text-[12px] text-danger">{error}</p> : null}
      </div>
    </Modal>
  );
}

function DeleteModal({
  avatar,
  open,
  onClose,
  onDeleted,
}: {
  avatar: Avatar;
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.avatar.delete(avatar.id);
      onClose();
      onDeleted();
    } catch (err) {
      setError(errorMessage(err, t("avatar:actions.failed")));
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("avatar:actions.deleteTitle")}
      icon={<Trash2 size={16} />}
      danger
      confirmLabel={t("avatar:actions.delete")}
      onConfirm={remove}
      confirmLoading={busy}
    >
      <p className="text-[14px] text-muted">
        {t("avatar:actions.deleteBody", { name: avatar.name })}
      </p>
      {error ? <p className="mt-2 text-[12px] text-danger">{error}</p> : null}
    </Modal>
  );
}
