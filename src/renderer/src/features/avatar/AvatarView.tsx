import { Cpu, Heart, Tag as TagIcon } from "lucide-react";
import type { Avatar } from "../../../../shared/types/avatar";
import { Banner, Fact, Section, Skeleton, StatTile, Tag } from "../../components/ui";
import { compactNumber, formatDate, prettyTag, tagsWithPrefix } from "../../lib/format";
import { useNav } from "../navigation/NavContext";
import { performanceLabel } from "../../lib/vrchat";
import { useT } from "../../lib/i18n";
import { useAvatar } from "../../store/avatars";
import { useSelf } from "../../store/social";
import { COL_WIDE } from "../../lib/layout";
import { HeroHeader } from "../shared/HeroHeader";
import { AvatarActions } from "./AvatarActions";
import "../profile/profile.css";

export function AvatarView({ avatarId }: { avatarId: string }) {
  const t = useT();
  const { avatar, failed } = useAvatar(avatarId);

  if (avatar) return <AvatarDetail avatar={avatar} />;
  if (failed) return <Banner className="m-10 max-w-[420px]">{t("avatar:detail.unavailable")}</Banner>;
  return <AvatarSkeleton />;
}

function AvatarDetail({ avatar }: { avatar: Avatar }) {
  const { openUser } = useNav();
  const t = useT();
  const isCurrent = useSelf()?.currentAvatarId === avatar.id;
  const banner = avatar.imageUrl || avatar.thumbnailImageUrl;
  const authorTags = tagsWithPrefix(avatar.tags, "author_tag_");

  return (
    <HeroHeader
      banner={banner}
      media={
        <div className="world__thumb">
          {avatar.thumbnailImageUrl || avatar.imageUrl ? (
            <img src={avatar.thumbnailImageUrl || avatar.imageUrl} alt="" />
          ) : null}
        </div>
      }
      body={
        <div className="min-w-0 pb-1">
          <h2 className="text-[30px] font-bold leading-tight tracking-[-0.6px]">{avatar.name}</h2>
          <p className="mt-1 text-[14px] text-muted">
            {t("avatar:detail.byPrefix")}{" "}
            <button
              onClick={() => openUser(avatar.authorId)}
              className="font-semibold text-text transition-colors hover:text-accent"
            >
              {avatar.authorName}
            </button>
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {isCurrent ? <Tag color="var(--accent)">{t("avatar:current")}</Tag> : null}
            {avatar.releaseStatus !== "public" ? (
              <Tag color="var(--status-ask)">{avatar.releaseStatus}</Tag>
            ) : null}
            {avatar.featured ? <Tag color="var(--accent)">{t("avatar:detail.featured")}</Tag> : null}
            {avatar.platforms?.pc ? <Tag>PC</Tag> : null}
            {avatar.platforms?.android ? <Tag color="var(--status-join)">Quest</Tag> : null}
          </div>
        </div>
      }
      actions={<AvatarActions avatar={avatar} />}
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile
          icon={<Heart size={15} />}
          label={t("avatar:detail.stats.favorites")}
          value={compactNumber(avatar.favorites)}
        />
        {avatar.performance?.pc ? (
          <StatTile
            icon={<Cpu size={15} />}
            label={t("avatar:detail.stats.performancePc")}
            value={performanceLabel(t, avatar.performance.pc)!}
          />
        ) : null}
        {avatar.performance?.android ? (
          <StatTile
            icon={<Cpu size={15} />}
            label={t("avatar:detail.stats.performanceQuest")}
            value={performanceLabel(t, avatar.performance.android)!}
          />
        ) : null}
      </div>

      {avatar.description ? (
        <Section title={t("avatar:detail.sections.description")}>
          <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-muted">
            {avatar.description}
          </p>
        </Section>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <Section title={t("avatar:detail.sections.details")}>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
            <Fact label={t("avatar:detail.facts.releaseStatus")} value={avatar.releaseStatus} />
            {avatar.createdAt ? (
              <Fact label={t("avatar:detail.facts.created")} value={formatDate(avatar.createdAt)} />
            ) : null}
            {avatar.updatedAt ? (
              <Fact label={t("avatar:detail.facts.updated")} value={formatDate(avatar.updatedAt)} />
            ) : null}
            <Fact label={t("avatar:detail.facts.avatarId")} value={avatar.id} mono />
          </dl>
        </Section>

        {avatar.tags.length ? (
          <Section title={t("avatar:detail.sections.tags")}>
            <div className="flex flex-wrap gap-1.5">
              {authorTags.length ? (
                authorTags.map((tag) => <Tag key={tag}>{prettyTag(tag, "author_tag_")}</Tag>)
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[13px] text-faint">
                  <TagIcon size={13} /> {t("avatar:detail.noAuthorTags")}
                </span>
              )}
            </div>
          </Section>
        ) : null}
      </div>
    </HeroHeader>
  );
}

function AvatarSkeleton() {
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
      <div className={`${COL_WIDE} mt-6 grid grid-cols-3 gap-3`}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[72px] rounded-xl" />
        ))}
      </div>
    </div>
  );
}
