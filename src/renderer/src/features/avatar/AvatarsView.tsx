import { useEffect, useMemo, useState } from "react";
import type { Avatar } from "../../../../shared/types/avatar";
import { CheckSquare, Eye, FolderInput, Pencil, Shirt, Star, Trash2, X } from "lucide-react";
import {
  Button,
  CardGrid,
  CheckBox,
  CollapsibleCard,
  ContextMenu,
  Field,
  IconButton,
  LABEL_HEADING,
  Modal,
  PAGE_TITLE,
  SelectionBar,
  SelectionBarButton,
  SkeletonGrid,
  Tabs,
  type ContextMenuEntry,
} from "../../components/ui";
import { api } from "../../lib/api";
import { useT } from "../../lib/i18n";
import {
  useAvatar,
  useAvatarFolder,
  useFavoriteAvatars,
  useFavoriteLimits,
  useMyAvatars,
  type FavoriteFolder,
} from "../../store/avatars";
import { useSelf, useSocial } from "../../store/social";
import { useNav, useViewState } from "../navigation/NavContext";
import { DeleteAvatarModal, EditAvatarModal } from "./AvatarActions";
import { AvatarCard } from "./AvatarCard";
import { BulkMoveModal } from "./BulkMoveModal";
import { FavoriteModal } from "./FavoriteModal";
import { FolderEditModal } from "./FolderEditModal";

const SHELL = "mx-auto flex w-full max-w-[1100px] flex-col gap-5 px-12 pb-16 pt-10";

type Tab = "uploaded" | "favorites";
type AvatarFilter = (a: Avatar) => boolean;

function matchAvatar(query: string): AvatarFilter {
  const q = query.trim().toLowerCase();
  if (!q) return () => true;
  const terms = q.split(/\s+/);
  return (a) => {
    const haystack = `${a.name} ${a.authorName} ${a.description} ${a.tags.join(" ")}`.toLowerCase();
    return terms.every((term) => haystack.includes(term));
  };
}

export function AvatarsView() {
  const t = useT();
  const [tab, setTab] = useViewState<Tab>("avatars:tab", "uploaded");
  const [query, setQuery] = useViewState("avatars:query", "");
  const filter = useMemo(() => matchAvatar(query), [query]);
  const selfId = useSocial((s) => s.selfId);

  useEffect(() => {
    void api.avatar.loadMine();
    void api.avatar.loadFavorites();
  }, [selfId]);

  return (
    <div className={SHELL}>
      <header>
        <h1 className={PAGE_TITLE}>{t("nav:avatars")}</h1>
      </header>

      <CurrentAvatarSection />

      <Tabs
        tabs={[
          { id: "uploaded", label: t("avatar:tabs.uploaded") },
          { id: "favorites", label: t("avatar:tabs.favorites") },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div className="flex flex-col gap-5">
        <Field
          label={t("avatar:search.label")}
          placeholder={t("avatar:search.placeholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="rise-in" key={tab}>
          {tab === "uploaded" ? (
            <UploadedTab filter={filter} />
          ) : (
            <FavoritesTab filter={filter} searching={query.trim().length > 0} />
          )}
        </div>
      </div>
    </div>
  );
}

function BulkBar({ ids, onDone }: { ids: string[]; onDone: () => void }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState(0);

  const unfavorite = async () => {
    if (busy) return;
    setBusy(true);
    setDeleteProgress(0);
    try {
      for (const id of ids) {
        await api.avatar.unfavorite(id);
        setDeleteProgress((n) => n + 1);
      }
      onDone();
    } finally {
      setBusy(false);
    }
  };

  const deletePercent = ids.length ? Math.round((deleteProgress / ids.length) * 100) : 0;

  return (
    <SelectionBar label={t("avatar:bulk.selected", { count: ids.length })}>
      {busy ? (
        <div className="selection-bar__progress" aria-label={t("avatar:bulk.unfavoritingProgress", { done: deleteProgress, total: ids.length })}>
          <span className="selection-bar__progress-label">
            {t("avatar:bulk.unfavoritingProgress", { done: deleteProgress, total: ids.length })}
          </span>
          <span className="selection-bar__progress-track">
            <span className="selection-bar__progress-fill" style={{ width: `${deletePercent}%` }} />
          </span>
        </div>
      ) : null}
      <SelectionBarButton onClick={onDone} disabled={busy}>
        <X size={15} /> {t("avatar:bulk.done")}
      </SelectionBarButton>
      <SelectionBarButton onClick={() => setMoveOpen(true)} disabled={busy}>
        <FolderInput size={15} /> {t("avatar:bulk.move")}
      </SelectionBarButton>
      <SelectionBarButton danger onClick={() => setConfirmDelete(true)} disabled={busy}>
        <Trash2 size={15} /> {t("avatar:actions.unfavorite")}
      </SelectionBarButton>
      {confirmDelete ? (
        <Modal
          open
          onClose={() => {
            if (!busy) setConfirmDelete(false);
          }}
          title={t("avatar:bulk.unfavoriteTitle")}
          icon={<Trash2 size={16} />}
          danger
          confirmLabel={t("avatar:actions.unfavorite")}
          confirmLoading={busy}
          onConfirm={unfavorite}
        >
          <div className="flex flex-col gap-3">
            <p className="text-[13px] text-muted">
              {t("avatar:bulk.unfavoriteConfirm", { count: ids.length })}
            </p>
            {busy ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-[12px] text-muted">
                  {t("avatar:bulk.unfavoritingProgress", { done: deleteProgress, total: ids.length })}
                </span>
                <div className="h-1 overflow-hidden rounded-full bg-surface-hover">
                  <div
                    className="h-full rounded-full bg-danger transition-[width] duration-200 ease-fluid"
                    style={{ width: `${deletePercent}%` }}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </Modal>
      ) : null}
      {moveOpen ? (
        <BulkMoveModal
          ids={ids}
          onClose={() => setMoveOpen(false)}
          onMoved={() => {
            setMoveOpen(false);
            onDone();
          }}
        />
      ) : null}
    </SelectionBar>
  );
}

function CurrentAvatarSection() {
  const t = useT();
  const nav = useNav();
  const self = useSelf();
  const { avatar } = useAvatar(self?.currentAvatarId);
  const folder = useAvatarFolder(avatar?.id ?? "");
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [favoriteOpen, setFavoriteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  if (!avatar) return null;

  const isOwner = avatar.authorId === self?.id;
  const menuItems: ContextMenuEntry[] = [
    { label: t("avatar:context.open"), icon: <Eye size={14} />, onClick: () => nav.openAvatar(avatar.id) },
    { label: t("avatar:actions.wearing"), icon: <Shirt size={14} />, disabled: true, onClick: () => {} },
    { separator: true },
    {
      label: folder ? t("avatar:actions.manageFavorite") : t("avatar:actions.favorite"),
      icon: <Star size={14} />,
      onClick: () => setFavoriteOpen(true),
    },
    ...(isOwner
      ? [
          { label: t("avatar:actions.edit"), icon: <Pencil size={14} />, onClick: () => setEditOpen(true) },
          {
            label: t("avatar:actions.delete"),
            icon: <Trash2 size={14} />,
            danger: true,
            onClick: () => setDeleteOpen(true),
          },
        ] satisfies ContextMenuEntry[]
      : []),
  ];

  return (
    <section className="flex flex-col gap-2.5">
      <h2 className={LABEL_HEADING}>{t("avatar:current")}</h2>
      <div className="w-1/2 sm:w-1/3">
        <AvatarCard
          avatar={avatar}
          showAuthor
          current
          onContextMenu={(e) => {
            e.preventDefault();
            setContextMenu({ x: e.clientX, y: e.clientY });
          }}
        />
      </div>
      {favoriteOpen ? (
        <FavoriteModal avatar={avatar} currentFolder={folder} onClose={() => setFavoriteOpen(false)} />
      ) : null}
      {editOpen ? <EditAvatarModal avatar={avatar} onClose={() => setEditOpen(false)} /> : null}
      <DeleteAvatarModal
        avatar={avatar}
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onDeleted={() => setDeleteOpen(false)}
      />
      {contextMenu ? (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={menuItems}
          onClose={() => setContextMenu(null)}
        />
      ) : null}
    </section>
  );
}

function UploadedTab({ filter }: { filter: AvatarFilter }) {
  const t = useT();
  const nav = useNav();
  const mine = useMyAvatars();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; avatar: Avatar } | null>(null);
  const [editAvatar, setEditAvatar] = useState<Avatar | null>(null);
  const [deleteAvatar, setDeleteAvatar] = useState<Avatar | null>(null);

  if (!mine.length) return <SkeletonGrid count={6} />;

  const shown = mine.filter(filter);
  if (!shown.length) return <p className="text-[13px] text-faint">{t("avatar:empty")}</p>;

  const menuItems = (avatar: Avatar): ContextMenuEntry[] => [
    { label: t("avatar:context.open"), icon: <Eye size={14} />, onClick: () => nav.openAvatar(avatar.id) },
    { label: t("avatar:actions.wear"), icon: <Shirt size={14} />, onClick: () => void api.avatar.select(avatar.id) },
    { label: t("avatar:actions.edit"), icon: <Pencil size={14} />, onClick: () => setEditAvatar(avatar) },
    { separator: true },
    {
      label: t("avatar:actions.delete"),
      icon: <Trash2 size={14} />,
      danger: true,
      onClick: () => setDeleteAvatar(avatar),
    },
  ];

  return (
    <>
      <CardGrid>
        {shown.map((a) => (
          <AvatarCard
            key={a.id}
            avatar={a}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu({ x: e.clientX, y: e.clientY, avatar: a });
            }}
          />
        ))}
      </CardGrid>

      {editAvatar ? (
        <EditAvatarModal avatar={editAvatar} onClose={() => setEditAvatar(null)} />
      ) : null}

      {deleteAvatar ? (
        <DeleteAvatarModal
          avatar={deleteAvatar}
          open
          onClose={() => setDeleteAvatar(null)}
          onDeleted={() => setDeleteAvatar(null)}
        />
      ) : null}

      {contextMenu ? (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={menuItems(contextMenu.avatar)}
          onClose={() => setContextMenu(null)}
        />
      ) : null}
    </>
  );
}

function FavoritesTab({ filter, searching }: { filter: AvatarFilter; searching: boolean }) {
  const t = useT();
  const nav = useNav();
  const folders = useFavoriteAvatars();
  const { maxPerGroup } = useFavoriteLimits();
  const [editFolder, setEditFolder] = useState<FavoriteFolder | null>(null);
  const [favoriteMenu, setFavoriteMenu] = useState<{ avatar: Avatar; folder: string } | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState<Avatar | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    avatar: Avatar;
    folder: string;
  } | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  if (!folders.length) return <SkeletonGrid count={6} />;

  const filtered = folders.map((f) => ({ ...f, avatars: f.avatars.filter(filter) }));
  const shown = searching ? filtered.filter((f) => f.avatars.length) : filtered;

  if (!shown.length) return <p className="text-[13px] text-faint">{t("avatar:empty")}</p>;

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const selectReleaseStatus = (status: string) => {
    setSelected(
      new Set(
        shown.flatMap((folder) =>
          folder.avatars.filter((avatar) => avatar.releaseStatus === status).map((avatar) => avatar.id),
        ),
      ),
    );
    setSelecting(true);
  };

  const selectOne = (id: string) => {
    setSelected(new Set([id]));
    setSelecting(true);
  };

  const folderState = (ids: string[]) => {
    const picked = ids.filter((id) => selected.has(id)).length;
    return {
      checked: picked > 0 && picked === ids.length,
      indeterminate: picked > 0 && picked < ids.length,
    };
  };

  const toggleFolder = (ids: string[]) =>
    setSelected((s) => {
      const next = new Set(s);
      const all = ids.every((id) => next.has(id));
      for (const id of ids) (all ? next.delete(id) : next.add(id));
      return next;
    });

  const removeFavorite = async () => {
    if (!removeAvatar) return;
    await api.avatar.unfavorite(removeAvatar.id);
    setRemoveAvatar(null);
  };

  const menuItems = (avatar: Avatar, folder: string): ContextMenuEntry[] => [
    { label: t("avatar:context.open"), icon: <Eye size={14} />, onClick: () => nav.openAvatar(avatar.id) },
    { label: t("avatar:context.select"), icon: <CheckSquare size={14} />, onClick: () => selectOne(avatar.id) },
    { label: t("avatar:actions.wear"), icon: <Shirt size={14} />, onClick: () => void api.avatar.select(avatar.id) },
    { separator: true },
    {
      label: t("avatar:actions.manageFavorite"),
      icon: <Star size={14} />,
      onClick: () => setFavoriteMenu({ avatar, folder }),
    },
    {
      label: t("avatar:actions.unfavorite"),
      icon: <Trash2 size={14} />,
      danger: true,
      onClick: () => setRemoveAvatar(avatar),
    },
  ];

  const exitSelect = () => {
    setSelecting(false);
    setSelected(new Set());
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-end">
        <div className="flex flex-wrap justify-end gap-2">
          {selecting ? (
            <>
              <Button variant="ghost" onClick={() => selectReleaseStatus("private")}>
                {t("avatar:bulk.selectPrivate")}
              </Button>
              <Button variant="ghost" onClick={() => selectReleaseStatus("hidden")}>
                {t("avatar:bulk.selectHidden")}
              </Button>
            </>
          ) : null}
          <Button variant="ghost" onClick={() => (selecting ? exitSelect() : setSelecting(true))}>
            <CheckSquare size={15} />
            {selecting ? t("avatar:bulk.done") : t("avatar:bulk.select")}
          </Button>
        </div>
      </div>

      {shown.map((folder) => (
        <CollapsibleCard
          key={folder.name}
          title={folder.displayName}
          count={`${folder.count} / ${maxPerGroup}`}
          action={
            <div className="flex items-center gap-2">
              {selecting && folder.avatars.length ? (
                <CheckBox
                  {...folderState(folder.avatars.map((a) => a.id))}
                  onChange={() => toggleFolder(folder.avatars.map((a) => a.id))}
                  aria-label={t("avatar:bulk.selectFolder", { name: folder.displayName })}
                />
              ) : null}
              <IconButton
                title={t("avatar:folder.edit")}
                onClick={() => setEditFolder(folder)}
                aria-label={t("avatar:folder.edit")}
              >
                <Pencil size={14} />
              </IconButton>
            </div>
          }
        >
          {folder.avatars.length ? (
            <CardGrid>
              {folder.avatars.map((a) => (
                <AvatarCard
                  key={a.id}
                  avatar={a}
                  showAuthor
                  selectable={selecting}
                  selected={selected.has(a.id)}
                  onToggleSelect={() => toggle(a.id)}
                  onContextMenu={
                    selecting
                      ? undefined
                      : (e) => {
                          e.preventDefault();
                          setContextMenu({ x: e.clientX, y: e.clientY, avatar: a, folder: folder.name });
                        }
                  }
                />
              ))}
            </CardGrid>
          ) : (
            <p className="text-[13px] text-faint">{t("avatar:folder.empty")}</p>
          )}
        </CollapsibleCard>
      ))}

      {editFolder ? (
        <FolderEditModal folder={editFolder} onClose={() => setEditFolder(null)} />
      ) : null}

      {favoriteMenu ? (
        <FavoriteModal
          avatar={favoriteMenu.avatar}
          currentFolder={favoriteMenu.folder}
          onClose={() => setFavoriteMenu(null)}
        />
      ) : null}

      {removeAvatar ? (
        <Modal
          open
          onClose={() => setRemoveAvatar(null)}
          title={t("avatar:bulk.unfavoriteTitle")}
          icon={<Trash2 size={16} />}
          danger
          confirmLabel={t("avatar:actions.unfavorite")}
          onConfirm={removeFavorite}
        >
          <p className="text-[13px] text-muted">
            {t("avatar:context.unfavoriteConfirm", { name: removeAvatar.name })}
          </p>
        </Modal>
      ) : null}

      {contextMenu ? (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={menuItems(contextMenu.avatar, contextMenu.folder)}
          onClose={() => setContextMenu(null)}
        />
      ) : null}

      {selecting && selected.size > 0 ? (
        <BulkBar ids={[...selected]} onDone={exitSelect} />
      ) : null}
    </div>
  );
}
