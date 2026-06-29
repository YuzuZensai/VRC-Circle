import { useEffect, useMemo, useState } from "react";
import type { Avatar } from "../../../../shared/types/avatar";
import { CheckSquare, Pencil } from "lucide-react";
import {
  Button,
  CardGrid,
  CollapsibleCard,
  Field,
  IconButton,
  LABEL_HEADING,
  PAGE_TITLE,
  SkeletonGrid,
  Tabs,
} from "../../components/ui";
import { api } from "../../lib/api";
import { useT } from "../../lib/i18n";
import {
  useAvatar,
  useFavoriteAvatars,
  useFavoriteLimits,
  useMyAvatars,
  type FavoriteFolder,
} from "../../store/avatars";
import { useSelf, useSocial } from "../../store/social";
import { useViewState } from "../navigation/NavContext";
import { AvatarCard } from "./AvatarCard";
import { BulkMoveModal } from "./BulkMoveModal";
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
  const [busy, setBusy] = useState<null | "move" | "unfavorite">(null);
  const [moveOpen, setMoveOpen] = useState(false);

  const unfavorite = async () => {
    setBusy("unfavorite");
    try {
      await api.avatar.unfavoriteMany(ids);
      onDone();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="sticky bottom-4 z-10 mx-auto flex items-center gap-3 rounded-xl border border-border bg-surface-2/95 px-4 py-2.5 shadow-lg backdrop-blur">
      <span className="text-[13px] font-medium tabular-nums">
        {t("avatar:bulk.selected", { count: ids.length })}
      </span>
      <Button onClick={() => setMoveOpen(true)} loading={busy === "move"}>
        {t("avatar:bulk.move")}
      </Button>
      <Button variant="ghost" onClick={unfavorite} loading={busy === "unfavorite"}>
        {t("avatar:actions.unfavorite")}
      </Button>
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
    </div>
  );
}

function CurrentAvatarSection() {
  const t = useT();
  const self = useSelf();
  const { avatar } = useAvatar(self?.currentAvatarId);
  if (!avatar) return null;
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className={LABEL_HEADING}>{t("avatar:current")}</h2>
      <div className="w-1/2 sm:w-1/3">
        <AvatarCard avatar={avatar} showAuthor current />
      </div>
    </section>
  );
}

function UploadedTab({ filter }: { filter: AvatarFilter }) {
  const t = useT();
  const mine = useMyAvatars();

  if (!mine.length) return <SkeletonGrid count={6} />;

  const shown = mine.filter(filter);
  if (!shown.length) return <p className="text-[13px] text-faint">{t("avatar:empty")}</p>;
  return (
    <CardGrid>
      {shown.map((a) => (
        <AvatarCard key={a.id} avatar={a} />
      ))}
    </CardGrid>
  );
}

function FavoritesTab({ filter, searching }: { filter: AvatarFilter; searching: boolean }) {
  const t = useT();
  const folders = useFavoriteAvatars();
  const { maxPerGroup } = useFavoriteLimits();
  const [editFolder, setEditFolder] = useState<FavoriteFolder | null>(null);
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

  const exitSelect = () => {
    setSelecting(false);
    setSelected(new Set());
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-end">
        <Button variant="ghost" onClick={() => (selecting ? exitSelect() : setSelecting(true))}>
          <CheckSquare size={15} />
          {selecting ? t("avatar:bulk.done") : t("avatar:bulk.select")}
        </Button>
      </div>

      {shown.map((folder) => (
        <CollapsibleCard
          key={folder.name}
          title={folder.displayName}
          count={`${folder.count} / ${maxPerGroup}`}
          action={
            <IconButton
              title={t("avatar:folder.edit")}
              onClick={() => setEditFolder(folder)}
              aria-label={t("avatar:folder.edit")}
            >
              <Pencil size={14} />
            </IconButton>
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

      {selecting && selected.size > 0 ? (
        <BulkBar ids={[...selected]} onDone={exitSelect} />
      ) : null}
    </div>
  );
}
