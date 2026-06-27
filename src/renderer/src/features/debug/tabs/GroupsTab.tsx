import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Users } from "lucide-react";
import type { Group } from "../../../../../shared/types/group";
import { Avatar, Badge, CodeBlock, Panel } from "../../../components/ui";
import { useAllGroups, useGroups } from "../../../store/groups";
import { Empty, SearchInput } from "../ui";

export function GroupStorePanel() {
  const groups = useAllGroups();
  const byUser = useGroups((s) => s.byUser);
  const userCount = Object.keys(byUser).length;
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...groups]
      .filter((g) => (q ? g.name.toLowerCase().includes(q) || g.id.includes(q) : true))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [groups, query]);

  return (
    <Panel
      title="Group store"
      meta={`${shown.length}/${groups.length} groups · ${userCount} users`}
      className="min-h-0 flex-1"
    >
      <div className="shrink-0 border-b border-border px-4 py-2.5">
        <SearchInput value={query} onChange={setQuery} placeholder="Filter by name or id…" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-auto">
        {shown.length === 0 ? (
          <Empty>
            {groups.length === 0
              ? "No groups yet — open a profile to seed it."
              : "No groups match."}
          </Empty>
        ) : (
          shown.map((g) => <GroupStoreRow key={g.id} group={g} />)
        )}
      </div>
    </Panel>
  );
}

function GroupStoreRow({ group }: { group: Group }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        className="flex w-full items-center gap-2.5 px-4 py-2 text-left hover:bg-surface-2"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex w-3 shrink-0 justify-center text-faint">
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </span>
        <Avatar src={group.iconUrl} name={group.name} size={32} className="!rounded" />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[13px] font-medium">{group.name}</span>
          <code className="truncate font-mono text-[10px] text-faint">{group.id}</code>
        </div>
        {group.detailed ? null : <Badge tone="warn">list</Badge>}
        <span className="flex shrink-0 items-center gap-1 text-[11px] tabular-nums text-faint">
          <Users size={11} /> {group.memberCount ?? "—"}
        </span>
      </button>
      {open ? (
        <div className="px-4 pb-3 pl-[2.4rem]">
          <CodeBlock value={JSON.stringify(group, null, 2)} />
        </div>
      ) : null}
    </div>
  );
}
