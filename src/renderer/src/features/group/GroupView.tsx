import { BadgeCheck, Globe, Users, UserCheck } from "lucide-react";
import type { Group } from "../../../../shared/types/group";
import { Avatar, Banner, Fact, Section, Skeleton, StatTile, Tag } from "../../components/ui";
import { api } from "../../lib/api";
import { useAsync } from "../../lib/useAsync";
import { compactNumber, formatDate, prettyTag, tagsWithPrefix } from "../../lib/format";
import { useT } from "../../lib/i18n";
import { useNav } from "../navigation/NavContext";
import { useGroups } from "../../store/groups";
import { useSocial } from "../../store/social";
import { COL_WIDE } from "../../lib/layout";
import { HeroHeader } from "../shared/HeroHeader";
import "../profile/profile.css";

export function GroupView({ groupId }: { groupId: string }) {
  const cached = useGroups((s) => s.groups[groupId]);
  const load = useAsync(() => api.group.get(groupId), [groupId], "This group is unavailable.");

  if (load.status === "error" && !cached?.detailed) {
    return <Banner className="m-10 max-w-[420px]">{load.message}</Banner>;
  }
  if (!cached?.detailed) return <GroupSkeleton />;
  return <GroupCard group={cached} />;
}

function GroupCard({ group }: { group: Group }) {
  const t = useT();
  const { openUser } = useNav();
  const ownerName = useSocial((s) =>
    group.ownerId ? s.users[group.ownerId]?.displayName : undefined,
  );
  const authorTags = tagsWithPrefix(group.tags ?? [], "group_tag_");

  return (
    <HeroHeader
      banner={group.bannerUrl}
      media={<Avatar src={group.iconUrl} name={group.name} size={112} className="!rounded-2xl" />}
      body={
        <div className="min-w-0 pb-1">
          <h2 className="flex items-center gap-2 text-[30px] font-bold leading-tight tracking-[-0.6px]">
            {group.name}
            {group.isVerified ? <BadgeCheck size={22} className="text-accent" /> : null}
          </h2>
          {group.ownerId ? (
            <p className="mt-1 text-[14px] text-muted">
              {t("group:ownedByPrefix")}{" "}
              <button
                onClick={() => openUser(group.ownerId!)}
                className="font-semibold text-text transition-colors hover:text-accent"
              >
                {ownerName ?? t("group:ownerUnknown")}
              </button>
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {group.shortCode ? <Tag>{group.shortCode}</Tag> : null}
            {group.privacy && group.privacy !== "default" ? (
              <Tag color="var(--status-ask)">{group.privacy}</Tag>
            ) : null}
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile
          icon={<Users size={15} />}
          label={t("group:stats.members")}
          value={typeof group.memberCount === "number" ? compactNumber(group.memberCount) : "—"}
        />
        <StatTile
          icon={<UserCheck size={15} />}
          label={t("group:stats.online")}
          value={
            typeof group.onlineMemberCount === "number"
              ? compactNumber(group.onlineMemberCount)
              : "—"
          }
          live={(group.onlineMemberCount ?? 0) > 0}
        />
        <StatTile
          icon={<Globe size={15} />}
          label={t("group:stats.languages")}
          value={group.languages?.length ? group.languages.join(", ").toUpperCase() : "—"}
        />
      </div>

      {group.description ? (
        <Section title={t("group:sections.about")}>
          <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-muted">
            {group.description}
          </p>
        </Section>
      ) : null}

      {group.rules ? (
        <Section title={t("group:sections.rules")}>
          <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-muted">
            {group.rules}
          </p>
        </Section>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <Section title={t("group:sections.details")}>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
            {group.joinState ? (
              <Fact label={t("group:facts.joining")} value={group.joinState} />
            ) : null}
            {group.createdAt ? (
              <Fact label={t("group:facts.created")} value={formatDate(group.createdAt)} />
            ) : null}
            <Fact label={t("group:facts.groupId")} value={group.id} mono />
          </dl>
        </Section>

        {authorTags.length ? (
          <Section title={t("group:sections.tags")}>
            <div className="flex flex-wrap gap-1.5">
              {authorTags.map((tag) => (
                <Tag key={tag}>{prettyTag(tag, "group_tag_")}</Tag>
              ))}
            </div>
          </Section>
        ) : null}
      </div>
    </HeroHeader>
  );
}

function GroupSkeleton() {
  return (
    <div
      className="profile profile--skeleton flex min-h-full w-full flex-col bg-surface pb-12"
      aria-busy
    >
      <div className="profile__banner" />
      <div className={`${COL_WIDE} relative flex items-end gap-5`} style={{ marginTop: -64 }}>
        <Skeleton className="size-[112px] rounded-2xl" />
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
