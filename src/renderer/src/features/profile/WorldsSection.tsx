import { useMemo, useState } from "react";
import type { World } from "../../../../shared/types/world";
import { CardGrid, CollapsibleCard, Field, SkeletonGrid } from "../../components/ui";
import { useT } from "../../lib/i18n";
import { WorldCard } from "../world/WorldCard";
import { useUserWorlds } from "./useUserWorlds";
import { useFavoriteWorlds } from "./useFavoriteWorlds";

type WorldFilter = (world: World) => boolean;

function matchWorld(query: string): WorldFilter | undefined {
  const q = query.trim().toLowerCase();
  if (!q) return undefined;
  const terms = q.split(/\s+/);
  return (w) => {
    const haystack = `${w.name} ${w.authorName} ${w.description} ${w.tags.join(" ")}`.toLowerCase();
    return terms.every((term) => haystack.includes(term));
  };
}

export function WorldSearch({
  children,
}: {
  children: (filter: WorldFilter | undefined) => React.ReactNode;
}) {
  const t = useT();
  const [query, setQuery] = useState("");
  const filter = useMemo(() => matchWorld(query), [query]);
  return (
    <div className="flex flex-col gap-5">
      <Field
        label={t("profile:worlds.search.label")}
        placeholder={t("profile:worlds.search.placeholder")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {children(filter)}
    </div>
  );
}

export function WorldsSection({ userId, filter }: { userId: string; filter?: WorldFilter }) {
  const t = useT();
  const { status, worlds, message } = useUserWorlds(userId);
  const shown = filter ? worlds.filter(filter) : worlds;
  return (
    <WorldGrid title={t("profile:worlds.title")} status={status} worlds={shown} message={message} />
  );
}

export function FavoriteWorldsSection({
  userId,
  filter,
}: {
  userId: string;
  filter?: WorldFilter;
}) {
  const t = useT();
  const { status, folders } = useFavoriteWorlds(userId);
  const loading = status === "loading";

  if (loading && !folders.length) {
    return (
      <CollapsibleCard title={t("profile:worlds.favorites")} count="…">
        <SkeletonGrid count={3} />
      </CollapsibleCard>
    );
  }

  const shown = filter
    ? folders.map((f) => ({ ...f, worlds: f.worlds.filter(filter) })).filter((f) => f.worlds.length)
    : folders;

  if (!shown.length) return null;

  return (
    <div className="flex flex-col gap-5">
      {shown.map((folder) => (
        <CollapsibleCard key={folder.name} title={folder.displayName} count={folder.worlds.length}>
          {folder.worlds.length ? (
            <CardGrid>
              {folder.worlds.map((w) => (
                <WorldCard key={w.id} world={w} />
              ))}
            </CardGrid>
          ) : (
            <p className="text-[13px] text-faint">{t("world:folder.empty")}</p>
          )}
        </CollapsibleCard>
      ))}
      {loading ? <SkeletonGrid count={3} /> : null}
    </div>
  );
}

function WorldGrid({
  title,
  status,
  worlds,
  message,
}: {
  title: string;
  status: "loading" | "ready" | "error";
  worlds: World[];
  message?: string;
}) {
  if (worlds.length) {
    return (
      <CollapsibleCard title={title} count={worlds.length}>
        <CardGrid>
          {worlds.map((w) => (
            <WorldCard key={w.id} world={w} />
          ))}
        </CardGrid>
      </CollapsibleCard>
    );
  }

  if (status === "loading") {
    return (
      <CollapsibleCard title={title} count="…">
        <SkeletonGrid count={3} />
      </CollapsibleCard>
    );
  }

  if (status === "error") {
    return (
      <CollapsibleCard title={title} count="!">
        <p className="text-[13px] text-faint">{message}</p>
      </CollapsibleCard>
    );
  }

  return null;
}
