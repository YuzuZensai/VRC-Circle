import { Circle, Star, Users } from "lucide-react";
import type { World } from "../../../../shared/types/world";
import { Card, CollapsibleCard, HoverImage, SkeletonGrid, Tag } from "../../components/ui";
import { compactNumber } from "../../lib/format";
import { useT } from "../../lib/i18n";
import { useNav } from "../navigation/NavContext";
import { useUserWorlds } from "./useUserWorlds";
import { useFavoriteWorlds } from "./useFavoriteWorlds";

export function WorldsSection({ userId }: { userId: string }) {
  const t = useT();
  const { status, worlds, message } = useUserWorlds(userId);
  return (
    <WorldGrid
      title={t("profile:worlds.title")}
      status={status}
      worlds={worlds}
      message={message}
    />
  );
}

export function FavoriteWorldsSection({ userId }: { userId: string }) {
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

  if (!folders.length) return null;

  return (
    <div className="flex flex-col gap-5">
      {folders.map((folder) => (
        <CollapsibleCard key={folder.name} title={folder.displayName} count={folder.worlds.length}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {folder.worlds.map((w) => (
              <WorldCard key={w.id} world={w} />
            ))}
          </div>
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
      <Wrap title={title} count={worlds.length}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {worlds.map((w) => (
            <WorldCard key={w.id} world={w} />
          ))}
        </div>
      </Wrap>
    );
  }

  if (status === "loading") {
    return (
      <Wrap title={title} count="…">
        <SkeletonGrid count={3} />
      </Wrap>
    );
  }

  if (status === "error") {
    return (
      <Wrap title={title} count="!">
        <p className="text-[13px] text-faint">{message}</p>
      </Wrap>
    );
  }

  return null;
}

function Wrap({
  title,
  count,
  children,
}: {
  title: string;
  count: number | string;
  children: React.ReactNode;
}) {
  return (
    <CollapsibleCard title={title} count={count}>
      {children}
    </CollapsibleCard>
  );
}

function WorldCard({ world }: { world: World }) {
  const t = useT();
  const { openWorld } = useNav();
  const img = world.thumbnailImageUrl || world.imageUrl;
  return (
    <Card onClick={() => openWorld(world.id)}>
      <div className="relative aspect-video bg-surface-hover">
        {img ? <HoverImage src={img} loading="lazy" /> : null}
        {world.releaseStatus !== "public" ? (
          <span className="absolute right-1.5 top-1.5">
            <Tag color="var(--status-ask)">{world.releaseStatus}</Tag>
          </span>
        ) : null}
      </div>
      <div className="p-2.5">
        <div className="truncate text-[13px] font-semibold" title={world.name}>
          {world.name}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] tabular-nums text-faint">
          <span
            className="inline-flex items-center gap-1"
            title={t("profile:worlds.tip.favorites")}
          >
            <Star size={12} /> {compactNumber(world.favorites)}
          </span>
          {world.occupants > 0 ? (
            <span
              className="inline-flex items-center gap-1"
              title={t("profile:worlds.tip.online")}
              style={{ color: "var(--status-active)" }}
            >
              <Circle size={9} fill="currentColor" /> {compactNumber(world.occupants)}
            </span>
          ) : null}
          {world.visits > 0 ? (
            <span title={t("profile:worlds.tip.visits")}>
              {t("profile:worlds.visitsCount", { formattedCount: compactNumber(world.visits) })}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1" title={t("profile:worlds.tip.capacity")}>
            <Users size={12} /> {world.capacity}
          </span>
        </div>
      </div>
    </Card>
  );
}
