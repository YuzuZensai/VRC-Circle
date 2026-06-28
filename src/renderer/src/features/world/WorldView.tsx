import { useState } from "react";
import { Globe, Heart, Plus, Tag as TagIcon, Users } from "lucide-react";
import type { World } from "../../../../shared/types/world";
import { Banner, Button, Fact, Section, Skeleton, StatTile, Tag } from "../../components/ui";
import { api } from "../../lib/api";
import { useAsync } from "../../lib/useAsync";
import { compactNumber, formatDate, prettyTag, tagsWithPrefix } from "../../lib/format";
import { useWorlds } from "../../store/worlds";
import { useNav } from "../navigation/NavContext";
import { useT } from "../../lib/i18n";
import { COL_WIDE } from "../../lib/layout";
import { HeroHeader } from "../shared/HeroHeader";
import { CreateInstanceModal } from "./CreateInstanceModal";
import "../profile/profile.css";

export function WorldView({ worldId }: { worldId: string }) {
  const cached = useWorlds((s) => s.worlds[worldId]);
  const load = useAsync(() => api.world.get(worldId), [worldId], "This world is unavailable.");

  if (load.status === "error" && !cached?.detailed) {
    return <Banner className="m-10 max-w-[420px]">{load.message}</Banner>;
  }
  if (!cached?.detailed) return <WorldSkeleton />;
  return <WorldCard world={cached} />;
}

function WorldCard({ world }: { world: World }) {
  const { openUser } = useNav();
  const t = useT();
  const [createOpen, setCreateOpen] = useState(false);
  const banner = world.imageUrl || world.thumbnailImageUrl;
  const players = world.occupants;

  return (
    <HeroHeader
      banner={banner}
      media={
        <div className="world__thumb">
          {world.thumbnailImageUrl || world.imageUrl ? (
            <img src={world.thumbnailImageUrl || world.imageUrl} alt="" />
          ) : null}
        </div>
      }
      body={
        <div className="min-w-0 pb-1">
          <h2 className="text-[30px] font-bold leading-tight tracking-[-0.6px]">{world.name}</h2>
          <p className="mt-1 text-[14px] text-muted">
            {t("world:detail.byPrefix")}{" "}
            <button
              onClick={() => openUser(world.authorId)}
              className="font-semibold text-text transition-colors hover:text-accent"
            >
              {world.authorName}
            </button>
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {world.releaseStatus !== "public" ? (
              <Tag color="var(--status-ask)">{world.releaseStatus}</Tag>
            ) : null}
            {world.platforms?.pc ? <Tag>PC</Tag> : null}
            {world.platforms?.android ? <Tag color="var(--status-join)">Quest</Tag> : null}
          </div>
        </div>
      }
      actions={
        <Button className="mb-1 ml-auto shrink-0" onClick={() => setCreateOpen(true)}>
          <Plus size={15} />
          {t("world:createInstance")}
        </Button>
      }
    >
      <CreateInstanceModal worldId={world.id} open={createOpen} onClose={() => setCreateOpen(false)} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile
            icon={<Users size={15} />}
            label={t("world:detail.stats.playersNow")}
            value={compactNumber(players)}
            live={players > 0}
          />
          <StatTile
            icon={<Heart size={15} />}
            label={t("world:detail.stats.favorites")}
            value={compactNumber(world.favorites)}
          />
          <StatTile
            icon={<Globe size={15} />}
            label={t("world:detail.stats.visits")}
            value={world.visits ? compactNumber(world.visits) : "—"}
          />
          <StatTile
            icon={<Users size={15} />}
            label={t("world:detail.stats.capacity")}
            value={`${world.capacity}`}
          />
        </div>

        {world.description ? (
          <Section title={t("world:detail.sections.description")}>
            <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-muted">
              {world.description}
            </p>
          </Section>
        ) : null}

        {world.previewYoutubeId ? (
          <Section title={t("world:detail.sections.trailer")}>
            <div className="aspect-video overflow-hidden rounded-lg border border-border">
              <iframe
                className="size-full"
                src={`https://www.youtube.com/embed/${world.previewYoutubeId}`}
                title={t("world:detail.sections.trailer")}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </Section>
        ) : null}

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
          <Section title={t("world:detail.sections.details")}>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
              {world.recommendedCapacity ? (
                <Fact
                  label={t("world:detail.facts.recommended")}
                  value={t("world:detail.recommendedValue", { count: world.recommendedCapacity })}
                />
              ) : null}
              {typeof world.popularity === "number" ? (
                <Fact label={t("world:detail.facts.popularity")} value={`${world.popularity} / 6`} />
              ) : null}
              {typeof world.heat === "number" ? (
                <Fact label={t("world:detail.facts.heat")} value={`${world.heat} / 6`} />
              ) : null}
              {world.version ? (
                <Fact label={t("world:detail.facts.version")} value={`${world.version}`} />
              ) : null}
              {world.publishedAt ? (
                <Fact label={t("world:detail.facts.published")} value={formatDate(world.publishedAt)} />
              ) : null}
              {world.labsPublishedAt ? (
                <Fact
                  label={t("world:detail.facts.communityLabs")}
                  value={formatDate(world.labsPublishedAt)}
                />
              ) : null}
              {world.createdAt ? (
                <Fact label={t("world:detail.facts.created")} value={formatDate(world.createdAt)} />
              ) : null}
              {world.updatedAt ? (
                <Fact label={t("world:detail.facts.updated")} value={formatDate(world.updatedAt)} />
              ) : null}
              <Fact label={t("world:detail.facts.worldId")} value={world.id} mono />
            </dl>
          </Section>

          {world.tags.length ? (
            <Section title={t("world:detail.sections.tags")}>
              <div className="flex flex-wrap gap-1.5">
                {tagsWithPrefix(world.tags, "author_tag_").length ? (
                  tagsWithPrefix(world.tags, "author_tag_").map((tag) => (
                    <Tag key={tag}>{prettyTag(tag, "author_tag_")}</Tag>
                  ))
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[13px] text-faint">
                    <TagIcon size={13} /> {t("world:detail.noAuthorTags")}
                  </span>
                )}
              </div>
            </Section>
          ) : null}
        </div>
    </HeroHeader>
  );
}

function WorldSkeleton() {
  return (
    <div
      className="profile profile--skeleton flex min-h-full w-full flex-col bg-surface pb-12"
      aria-busy
    >
      <div className="profile__banner" />
      <div className={`${COL_WIDE} relative flex items-end gap-5`} style={{ marginTop: -64 }}>
        <Skeleton className="world__thumb" />
        <div className="flex-1 pb-1">
          <Skeleton className="h-[22px] w-2/5 rounded-lg" />
          <Skeleton className="mt-3 h-3 w-1/4 rounded-lg" />
        </div>
      </div>
      <div className={`${COL_WIDE} mt-6 grid grid-cols-4 gap-3`}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[72px] rounded-xl" />
        ))}
      </div>
    </div>
  );
}
