import { useEffect, useMemo, useState } from "react";
import type { Avatar } from "../../../../shared/types/avatar";
import { Pencil } from "lucide-react";
import {
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
          {tab === "uploaded" ? <UploadedTab filter={filter} /> : <FavoritesTab filter={filter} />}
        </div>
      </div>
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

function FavoritesTab({ filter }: { filter: AvatarFilter }) {
  const t = useT();
  const folders = useFavoriteAvatars();
  const { maxPerGroup } = useFavoriteLimits();
  const [editFolder, setEditFolder] = useState<FavoriteFolder | null>(null);

  if (!folders.length) return <SkeletonGrid count={6} />;

  const shown = folders
    .map((f) => ({ ...f, avatars: f.avatars.filter(filter) }))
    .filter((f) => f.avatars.length);

  if (!shown.length) return <p className="text-[13px] text-faint">{t("avatar:empty")}</p>;
  return (
    <div className="flex flex-col gap-5">
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
          <CardGrid>
            {folder.avatars.map((a) => (
              <AvatarCard key={a.id} avatar={a} showAuthor />
            ))}
          </CardGrid>
        </CollapsibleCard>
      ))}

      {editFolder ? (
        <FolderEditModal folder={editFolder} onClose={() => setEditFolder(null)} />
      ) : null}
    </div>
  );
}
