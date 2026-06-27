import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { UserProfile } from "../../../../../shared/types/user";
import { Badge, CodeBlock, Panel, PresenceAvatar, Tag } from "../../../components/ui";
import { statusMeta, trustMeta } from "../../../lib/vrchat";
import { useSocial } from "../../../store/social";
import { Chip, Empty, Meta, SearchInput } from "../ui";

type SocialFilter = "all" | "self" | "friends" | "other";

export function SocialTab() {
  const selfId = useSocial((s) => s.selfId);
  const users = useSocial((s) => s.users);
  const [query, setQuery] = useState("");

  const [role, setRole] = useState<SocialFilter>("all");

  const list = useMemo(() => Object.values(users), [users]);
  const friends = list.filter((u) => u.isFriend);
  const online = friends.filter((f) => f.status !== "offline").length;

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...list]
      .filter((u) =>
        role === "self"
          ? u.id === selfId
          : role === "friends"
            ? u.isFriend
            : role === "other"
              ? !u.isFriend && u.id !== selfId
              : true,
      )
      .filter((u) => (q ? u.displayName.toLowerCase().includes(q) || u.id.includes(q) : true))
      .sort(
        (a, b) =>
          Number(b.id === selfId) - Number(a.id === selfId) ||
          Number(b.isFriend) - Number(a.isFriend) ||
          a.displayName.localeCompare(b.displayName),
      );
  }, [list, query, role, selfId]);

  return (
    <Panel
      title="Social store"
      meta={`${list.length} records · ${friends.length} friends · ${online} online`}
      className="min-h-0 flex-1"
    >
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
        <SearchInput value={query} onChange={setQuery} placeholder="Filter by name or id…" />
        <div className="flex gap-1">
          {(["all", "self", "friends", "other"] as SocialFilter[]).map((r) => (
            <Chip key={r} active={role === r} onClick={() => setRole(r)}>
              {r}
            </Chip>
          ))}
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-auto">
        {shown.length === 0 ? (
          <Empty>
            {list.length === 0 ? "Store is empty — sign in to seed it." : "No users match."}
          </Empty>
        ) : (
          shown.map((u) => <UserRow key={u.id} user={u} isSelf={u.id === selfId} />)
        )}
      </div>
    </Panel>
  );
}

function UserRow({ user, isSelf }: { user: UserProfile; isSelf: boolean }) {
  const [open, setOpen] = useState(false);
  const status = statusMeta[user.status];
  const trust = trustMeta[user.trustRank];

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        className="flex w-full items-center gap-2.5 px-4 py-2 text-left hover:bg-surface-2"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex w-3 shrink-0 justify-center text-faint">
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </span>
        <PresenceAvatar user={user} size={28} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[13px] font-medium">{user.displayName}</span>
          <code className="truncate font-mono text-[10px] text-faint">{user.id}</code>
        </div>
        {isSelf ? <Badge tone="accent">self</Badge> : null}
        {user.isFriend ? <Badge tone="success">friend</Badge> : null}
        <Tag color={trust.color}>{trust.label}</Tag>
        <span className="hidden shrink-0 text-[11px] sm:inline" style={{ color: status.color }}>
          {status.label}
        </span>
      </button>

      {open ? (
        <div className="px-4 pb-3 pl-[2.4rem]">
          <dl className="mb-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] sm:grid-cols-3">
            <Meta label="Status" value={`${status.label} (${user.status})`} />
            <Meta label="State" value={user.state ?? "—"} />
            <Meta label="Platform" value={user.lastPlatform ?? user.platform ?? "—"} />
            <Meta label="Location" value={user.location || "—"} />
            <Meta label="Pronouns" value={user.pronouns || "—"} />
            <Meta label="Joined" value={user.dateJoined ?? "—"} />
          </dl>
          {user.statusDescription ? (
            <p className="mb-2 text-[12px] italic text-muted">“{user.statusDescription}”</p>
          ) : null}
          <CodeBlock value={JSON.stringify(user, null, 2)} />
        </div>
      ) : null}
    </div>
  );
}
