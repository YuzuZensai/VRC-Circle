import { BadgeCheck, Globe, Users, UserCheck } from "lucide-react";
import type { Group } from "../../../../shared/types/group";
import { Avatar, Banner, Fact, Section, StatTile, Tag } from "../../components/ui";
import { api } from "../../lib/api";
import { useAsync } from "../../lib/useAsync";
import { compactNumber, formatDate, prettyTag } from "../../lib/format";
import { useNav } from "../navigation/NavContext";
import { useGroups } from "../../store/groups";
import { COL_WIDE } from "../../lib/layout";
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
  const { openUser } = useNav();
  const authorTags = (group.tags ?? []).filter((t) => t.startsWith("group_tag_"));

  return (
    <article className="profile flex min-h-full w-full flex-col bg-surface pb-12">
      <div
        className="profile__banner"
        style={{ backgroundImage: group.bannerUrl ? `url(${group.bannerUrl})` : undefined }}
      />

      <div className={`${COL_WIDE} relative flex items-end gap-5`} style={{ marginTop: -64 }}>
        <Avatar src={group.iconUrl} name={group.name} size={112} className="!rounded-2xl" />
        <div className="min-w-0 pb-1">
          <h2 className="flex items-center gap-2 text-[30px] font-bold leading-tight tracking-[-0.6px]">
            {group.name}
            {group.isVerified ? <BadgeCheck size={22} className="text-accent" /> : null}
          </h2>
          {group.ownerId ? (
            <p className="mt-1 text-[14px] text-muted">
              owned by{" "}
              <button
                onClick={() => openUser(group.ownerId!)}
                className="font-semibold text-text transition-colors hover:text-accent"
              >
                View owner
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
      </div>

      <div className={`${COL_WIDE} mt-6 flex flex-col gap-5`}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatTile
            icon={<Users size={15} />}
            label="Members"
            value={typeof group.memberCount === "number" ? compactNumber(group.memberCount) : "—"}
          />
          <StatTile
            icon={<UserCheck size={15} />}
            label="Online"
            value={
              typeof group.onlineMemberCount === "number"
                ? compactNumber(group.onlineMemberCount)
                : "—"
            }
            live={(group.onlineMemberCount ?? 0) > 0}
          />
          <StatTile
            icon={<Globe size={15} />}
            label="Languages"
            value={group.languages?.length ? group.languages.join(", ").toUpperCase() : "—"}
          />
        </div>

        {group.description ? (
          <Section title="About">
            <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-muted">
              {group.description}
            </p>
          </Section>
        ) : null}

        {group.rules ? (
          <Section title="Rules">
            <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-muted">
              {group.rules}
            </p>
          </Section>
        ) : null}

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
          <Section title="Details">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
              {group.joinState ? <Fact label="Joining" value={group.joinState} /> : null}
              {group.createdAt ? (
                <Fact label="Created" value={formatDate(group.createdAt)} />
              ) : null}
              <Fact label="Group ID" value={group.id} mono />
            </dl>
          </Section>

          {authorTags.length ? (
            <Section title="Tags">
              <div className="flex flex-wrap gap-1.5">
                {authorTags.map((t) => (
                  <Tag key={t}>{prettyTag(t, "group_tag_")}</Tag>
                ))}
              </div>
            </Section>
          ) : null}
        </div>
      </div>
    </article>
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
        <div className="sk size-[112px] rounded-2xl" />
        <div className="flex-1 pb-1">
          <div className="sk h-[22px] w-2/5 rounded-lg" />
          <div className="sk mt-3 h-3 w-1/4 rounded-lg" />
        </div>
      </div>
      <div className={`${COL_WIDE} mt-6 grid grid-cols-3 gap-3`}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="sk h-[72px] rounded-xl" />
        ))}
      </div>
    </div>
  );
}
