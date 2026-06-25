import { Star, Users } from "lucide-react";
import type { Group } from "../../../../shared/types/group";
import { Avatar, CollapsibleCard, SkeletonGrid } from "../../components/ui";
import { useUserGroups } from "./useUserGroups";

export function GroupsSection({ userId }: { userId: string }) {
  const { status, groups, represented } = useUserGroups(userId);

  if (status === "loading") {
    return (
      <Wrap count="…">
        <SkeletonGrid
          count={2}
          grid="grid grid-cols-1 gap-2.5 sm:grid-cols-2"
          item="sk h-[60px] rounded-lg"
        />
      </Wrap>
    );
  }

  if (status === "error" || (!groups.length && !represented)) return null;

  const featuredId = represented?.id;
  const rest = groups.filter((g) => g.id !== featuredId);

  return (
    <Wrap count={groups.length || (represented ? 1 : 0)}>
      <div className="flex flex-col gap-3">
        {represented ? <FeaturedGroup group={represented} /> : null}
        {rest.length ? (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {rest.map((g) => (
              <GroupRow key={g.id} group={g} />
            ))}
          </div>
        ) : null}
      </div>
    </Wrap>
  );
}

function FeaturedGroup({ group }: { group: Group }) {
  return (
    <div
      className="relative overflow-hidden rounded-lg border border-accent/40 bg-surface p-3.5"
      style={{ "--ring": "var(--accent)" } as React.CSSProperties}
    >
      {group.bannerUrl ? (
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage: `url(${group.bannerUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      ) : null}
      <div className="relative flex items-center gap-3.5">
        <Avatar src={group.iconUrl} name={group.name} size={52} className="!rounded-xl" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-accent">
            <Star size={12} fill="currentColor" /> Featured group
          </div>
          <div className="mt-0.5 truncate text-[15px] font-semibold" title={group.name}>
            {group.name}
          </div>
          <GroupMeta group={group} />
        </div>
      </div>
    </div>
  );
}

function GroupRow({ group }: { group: Group }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-2.5">
      <Avatar src={group.iconUrl} name={group.name} size={40} className="!rounded-lg" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-semibold" title={group.name}>
          {group.name}
        </div>
        <GroupMeta group={group} />
      </div>
    </div>
  );
}

function GroupMeta({ group }: { group: Group }) {
  return (
    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11.5px] text-faint">
      {group.shortCode ? <span className="font-mono">{group.shortCode}</span> : null}
      {typeof group.memberCount === "number" ? (
        <span className="inline-flex items-center gap-1 tabular-nums">
          <Users size={11} /> {group.memberCount.toLocaleString()}
        </span>
      ) : null}
    </div>
  );
}

function Wrap({ count, children }: { count: number | string; children: React.ReactNode }) {
  return (
    <CollapsibleCard title="Groups" count={count}>
      {children}
    </CollapsibleCard>
  );
}
