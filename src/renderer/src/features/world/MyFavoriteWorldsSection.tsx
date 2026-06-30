import { useEffect, useState } from "react";
import { CheckSquare, Eye, FolderInput, Pencil, Star, Trash2, X } from "lucide-react";
import type { World } from "../../../../shared/types/world";
import {
  Button,
  CardGrid,
  CheckBox,
  CollapsibleCard,
  ContextMenu,
  IconButton,
  Modal,
  SelectionBar,
  SelectionBarButton,
  SkeletonGrid,
  Tag,
  type ContextMenuEntry,
} from "../../components/ui";
import { api } from "../../lib/api";
import { useT } from "../../lib/i18n";
import {
  useFavoriteWorldFolders,
  useWorldFavorites,
  useWorldFavoriteLimits,
  useWorldFavoritesLoaded,
  type FavoriteFolder,
} from "../../store/worldFavorites";
import { useSocial } from "../../store/social";
import { useNav } from "../navigation/NavContext";
import { WorldCard } from "./WorldCard";
import { WorldFavoriteModal } from "./WorldFavoriteModal";
import { WorldFolderEditModal } from "./WorldFolderEditModal";
import { WorldBulkMoveModal } from "./WorldBulkMoveModal";

type WorldFilter = (world: World) => boolean;

export function MyFavoriteWorldsSection({ filter }: { filter?: WorldFilter }) {
  const t = useT();
  const nav = useNav();
  const selfId = useSocial((s) => s.selfId);
  const folders = useFavoriteWorldFolders();
  const { maxPerGroup } = useWorldFavoriteLimits();
  const loaded = useWorldFavoritesLoaded();
  const searching = Boolean(filter);

  const [editFolder, setEditFolder] = useState<FavoriteFolder | null>(null);
  const [favoriteMenu, setFavoriteMenu] = useState<{ world: World; folder: string } | null>(null);
  const [removeWorld, setRemoveWorld] = useState<World | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    world: World;
    folder: string;
  } | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    useWorldFavorites.getState().markStale();
    void api.world.loadFavorites();
  }, [selfId]);

  if (!loaded && !folders.length) return <SkeletonGrid count={3} />;

  const filtered = filter
    ? folders.map((f) => ({ ...f, worlds: f.worlds.filter(filter) }))
    : folders;
  const shown = searching ? filtered.filter((f) => f.worlds.length) : filtered;

  if (!shown.length) return <p className="text-[13px] text-faint">{t("profile:worlds.empty")}</p>;

  const hasDeleted = shown.some((f) => f.worlds.some((w) => w.deleted));

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selectOne = (id: string) => {
    setSelected(new Set([id]));
    setSelecting(true);
  };

  const selectWhere = (match: (world: World) => boolean) => {
    setSelected(
      new Set(shown.flatMap((folder) => folder.worlds.filter(match).map((world) => world.id))),
    );
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
      for (const id of ids) {
        if (all) next.delete(id);
        else next.add(id);
      }
      return next;
    });

  const exitSelect = () => {
    setSelecting(false);
    setSelected(new Set());
  };

  const removeFavorite = async () => {
    if (!removeWorld) return;
    await api.world.unfavorite(removeWorld.id);
    setRemoveWorld(null);
  };

  const menuItems = (world: World, folder: string): ContextMenuEntry[] => [
    {
      label: t("world:context.open"),
      icon: <Eye size={14} />,
      onClick: () => nav.openWorld(world.id),
    },
    {
      label: t("world:context.select"),
      icon: <CheckSquare size={14} />,
      onClick: () => selectOne(world.id),
    },
    { separator: true },
    {
      label: t("world:favorite.manage"),
      icon: <Star size={14} />,
      onClick: () => setFavoriteMenu({ world, folder }),
    },
    {
      label: t("world:favorite.unfavorite"),
      icon: <Trash2 size={14} />,
      danger: true,
      onClick: () => setRemoveWorld(world),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-end">
        <div className="flex flex-wrap justify-end gap-2">
          {selecting ? (
            <>
              <Button
                variant="ghost"
                onClick={() => selectWhere((w) => w.releaseStatus === "private")}
              >
                {t("world:bulk.selectPrivate")}
              </Button>
              {hasDeleted ? (
                <Button variant="ghost" onClick={() => selectWhere((w) => Boolean(w.deleted))}>
                  {t("world:bulk.selectDeleted")}
                </Button>
              ) : null}
            </>
          ) : null}
          <Button variant="ghost" onClick={() => (selecting ? exitSelect() : setSelecting(true))}>
            <CheckSquare size={15} />
            {selecting ? t("world:bulk.done") : t("world:bulk.select")}
          </Button>
        </div>
      </div>

      {shown.map((folder) => (
        <CollapsibleCard
          key={folder.name}
          persistKey={`fav-worlds:${folder.name}`}
          title={folder.displayName}
          count={`${folder.count} / ${maxPerGroup}`}
          action={
            <div className="flex items-center gap-2">
              {selecting && folder.worlds.length ? (
                <CheckBox
                  {...folderState(folder.worlds.map((w) => w.id))}
                  onChange={() => toggleFolder(folder.worlds.map((w) => w.id))}
                  aria-label={t("world:bulk.selectFolder", { name: folder.displayName })}
                />
              ) : null}
              {folder.vrcPlus ? <Tag color="var(--accent)">{t("world:folder.vrcPlus")}</Tag> : null}
              <IconButton
                title={t("world:folder.edit")}
                onClick={() => setEditFolder(folder)}
                aria-label={t("world:folder.edit")}
              >
                <Pencil size={14} />
              </IconButton>
            </div>
          }
        >
          {folder.worlds.length ? (
            <CardGrid>
              {folder.worlds.map((w) => (
                <WorldCard
                  key={w.id}
                  world={w}
                  showAuthor
                  selectable={selecting}
                  selected={selected.has(w.id)}
                  onToggleSelect={() => toggle(w.id)}
                  onContextMenu={
                    selecting
                      ? undefined
                      : (e) => {
                          e.preventDefault();
                          setContextMenu({
                            x: e.clientX,
                            y: e.clientY,
                            world: w,
                            folder: folder.name,
                          });
                        }
                  }
                />
              ))}
            </CardGrid>
          ) : (
            <p className="text-[13px] text-faint">{t("world:folder.empty")}</p>
          )}
        </CollapsibleCard>
      ))}

      {editFolder ? (
        <WorldFolderEditModal folder={editFolder} onClose={() => setEditFolder(null)} />
      ) : null}

      {favoriteMenu ? (
        <WorldFavoriteModal
          world={favoriteMenu.world}
          currentFolder={favoriteMenu.folder}
          onClose={() => setFavoriteMenu(null)}
        />
      ) : null}

      {removeWorld ? (
        <Modal
          open
          onClose={() => setRemoveWorld(null)}
          title={t("world:bulk.unfavoriteTitle")}
          icon={<Trash2 size={16} />}
          danger
          confirmLabel={t("world:favorite.unfavorite")}
          onConfirm={removeFavorite}
        >
          <p className="text-[13px] text-muted">
            {t("world:context.unfavoriteConfirm", { name: removeWorld.name })}
          </p>
        </Modal>
      ) : null}

      {contextMenu ? (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={menuItems(contextMenu.world, contextMenu.folder)}
          onClose={() => setContextMenu(null)}
        />
      ) : null}

      {selecting && selected.size > 0 ? (
        <WorldBulkBar ids={[...selected]} onDone={exitSelect} />
      ) : null}
    </div>
  );
}

function WorldBulkBar({ ids, onDone }: { ids: string[]; onDone: () => void }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const unfavorite = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await api.world.unfavoriteMany(ids);
      onDone();
    } finally {
      setBusy(false);
    }
  };

  return (
    <SelectionBar label={t("world:bulk.selected", { count: ids.length })}>
      <SelectionBarButton onClick={onDone} disabled={busy}>
        <X size={15} /> {t("world:bulk.done")}
      </SelectionBarButton>
      <SelectionBarButton onClick={() => setMoveOpen(true)} disabled={busy}>
        <FolderInput size={15} /> {t("world:bulk.move")}
      </SelectionBarButton>
      <SelectionBarButton danger onClick={() => setConfirmDelete(true)} disabled={busy}>
        <Trash2 size={15} /> {t("world:favorite.unfavorite")}
      </SelectionBarButton>
      {confirmDelete ? (
        <Modal
          open
          onClose={() => {
            if (!busy) setConfirmDelete(false);
          }}
          title={t("world:bulk.unfavoriteTitle")}
          icon={<Trash2 size={16} />}
          danger
          confirmLabel={t("world:favorite.unfavorite")}
          confirmLoading={busy}
          onConfirm={unfavorite}
        >
          <p className="text-[13px] text-muted">
            {t("world:bulk.unfavoriteConfirm", { count: ids.length })}
          </p>
        </Modal>
      ) : null}
      {moveOpen ? (
        <WorldBulkMoveModal
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
