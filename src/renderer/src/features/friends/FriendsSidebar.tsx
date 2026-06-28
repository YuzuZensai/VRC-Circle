import { useMemo, useState, useCallback, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { isOnline, locationLabel, presenceOf } from "../../lib/vrchat";
import { Badge, PresenceAvatar, ContextMenu } from "../../components/ui";
import { useFriends, useSelf } from "../../store/social";
import { useWorldName } from "../../store/worlds";
import { parseLocation, type UserProfile } from "../../../../shared/types/user";
import { useT } from "../../lib/i18n";
import { useUserMenu } from "./useUserMenu";

interface InstanceSection {
  key: string;
  worldId: string;
  instanceId: string;
  members: UserProfile[];
}

interface ContextMenuState {
  x: number;
  y: number;
  friend: UserProfile;
}

export function FriendsSidebar({ onOpen }: { onOpen: (id: string) => void }) {
  const t = useT();
  const friends = useFriends();
  const self = useSelf();
  const selfId = self?.id;

  const sorted = useMemo(
    () =>
      [...friends].sort(
        (a, b) =>
          Number(isOnline(b)) - Number(isOnline(a)) || a.displayName.localeCompare(b.displayName),
      ),
    [friends],
  );

  const online = useMemo(() => sorted.filter(isOnline), [sorted]);
  const offline = useMemo(() => sorted.filter((f) => !isOnline(f)), [sorted]);

  const { instances, alone } = useMemo(() => {
    const byInstance = new Map<string, UserProfile[]>();
    const alone: UserProfile[] = [];
    const people = self && isOnline(self) ? [self, ...online] : online;
    for (const f of people) {
      const parsed = parseLocation(f.location);
      if (!parsed) {
        if (f.id !== selfId) alone.push(f);
        continue;
      }
      const key = `${parsed.worldId}:${parsed.instanceId}`;
      const list = byInstance.get(key);
      if (list) list.push(f);
      else byInstance.set(key, [f]);
    }
    const instances: InstanceSection[] = [];
    for (const [key, members] of byInstance) {
      if (members.length < 2) {
        if (members[0].id !== selfId) alone.push(members[0]);
        continue;
      }
      members.sort(
        (a, b) =>
          Number(b.id === selfId) - Number(a.id === selfId) ||
          a.displayName.localeCompare(b.displayName),
      );
      const [worldId, instanceId] = key.split(":");
      instances.push({ key, worldId, instanceId, members });
    }
    instances.sort(
      (a, b) =>
        Number(b.members.some((m) => m.id === selfId)) -
          Number(a.members.some((m) => m.id === selfId)) || b.members.length - a.members.length,
    );
    alone.sort((a, b) => a.displayName.localeCompare(b.displayName));
    return { instances, alone };
  }, [online, self, selfId]);

  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set(["offline"]));
  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const selfAlone =
    self && isOnline(self) && !instances.some((i) => i.members.some((m) => m.id === selfId));

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const { buildItems, modal } = useUserMenu();

  const openContextMenu = useCallback((e: React.MouseEvent, friend: UserProfile) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, friend });
  }, []);

  return (
    <aside className="friendsbar flex h-full flex-col overflow-hidden border-l border-border bg-surface">
      <header className="friendsbar__header flex items-baseline gap-2 border-b border-border px-4 py-3.5 text-[13px] font-bold">
        <span className="friendsbar__text">{t("nav:friends.title")}</span>
        <span className="friendsbar__text ml-auto text-[11.5px] font-semibold text-[var(--status-active)]">
          {online.length} {t("nav:friends.online")}
        </span>
      </header>

      <div className="flex-1 overflow-y-auto p-2">
        {selfAlone ? <FriendRow friend={self} onOpen={onOpen} isSelf selfChrome /> : null}

        {friends.length === 0 ? (
          <p className="p-3 text-[13px] text-faint">{t("nav:friends.noFriendsOnline")}</p>
        ) : (
          <>
            {instances.map((inst) => (
              <Section
                key={inst.key}
                title={<InstanceTitle worldId={inst.worldId} instanceId={inst.instanceId} />}
                count={inst.members.length}
                open={!collapsed.has(inst.key)}
                onToggle={() => toggle(inst.key)}
              >
                {inst.members.map((f) => (
                  <FriendRow
                    key={f.id}
                    friend={f}
                    onOpen={onOpen}
                    hideLocation
                    isSelf={f.id === selfId}
                    onContextMenu={f.id !== selfId ? openContextMenu : undefined}
                  />
                ))}
              </Section>
            ))}

            {alone.length ? (
              <Section
                title={<span className="truncate">{t("nav:friends.sectionOnline")}</span>}
                count={alone.length}
                open={!collapsed.has("online")}
                onToggle={() => toggle("online")}
              >
                {alone.map((f) => (
                  <FriendRow
                    key={f.id}
                    friend={f}
                    onOpen={onOpen}
                    onContextMenu={openContextMenu}
                  />
                ))}
              </Section>
            ) : null}

            {offline.length ? (
              <Section
                title={<span className="truncate">{t("nav:friends.sectionOffline")}</span>}
                count={offline.length}
                open={!collapsed.has("offline")}
                onToggle={() => toggle("offline")}
              >
                {offline.map((f) => (
                  <FriendRow
                    key={f.id}
                    friend={f}
                    onOpen={onOpen}
                    dim
                    onContextMenu={openContextMenu}
                  />
                ))}
              </Section>
            ) : null}
          </>
        )}
      </div>

      {contextMenu ? (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={buildItems(contextMenu.friend, { includeProfile: true, onOpen })}
          onClose={() => setContextMenu(null)}
        />
      ) : null}

      {modal}
    </aside>
  );
}

function SectionHeader({
  open,
  onToggle,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onToggle}
      className="friendsbar__text flex w-full items-center gap-1.5 px-2 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-faint transition-colors hover:text-muted"
    >
      <span className="shrink-0">
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </span>
      {children}
    </button>
  );
}

function Section({
  title,
  count,
  open,
  onToggle,
  children,
}: {
  title: ReactNode;
  count: number;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div>
      <SectionHeader open={open} onToggle={onToggle}>
        {title}
        <span className="ml-auto shrink-0 normal-case">{count}</span>
      </SectionHeader>
      {open ? <div>{children}</div> : null}
    </div>
  );
}

function InstanceTitle({ worldId, instanceId }: { worldId: string; instanceId: string }) {
  const t = useT();
  const worldName = useWorldName(worldId);
  return (
    <>
      <span className="truncate">{worldName ?? t("nav:friends.inAWorld")}</span>
      <span className="shrink-0 normal-case text-faint">(#{instanceId})</span>
    </>
  );
}

function FriendRow({
  friend,
  onOpen,
  dim,
  isSelf,
  selfChrome,
  hideLocation,
  onContextMenu,
}: {
  friend: UserProfile;
  onOpen: (id: string) => void;
  dim?: boolean;
  isSelf?: boolean;
  selfChrome?: boolean;
  hideLocation?: boolean;
  onContextMenu?: (e: React.MouseEvent, friend: UserProfile) => void;
}) {
  const t = useT();
  const presence = presenceOf({ ...friend, isSelf });
  const sub = friend.statusDescription || presence.effective.label;
  const parsed = parseLocation(friend.location);
  const worldName = useWorldName(parsed?.worldId);
  const location = parsed
    ? `${worldName ? `in ${worldName}` : t("nav:friends.inAWorld")} (#${parsed.instanceId})`
    : locationLabel(friend.location);
  return (
    <button
      onClick={() => onOpen(isSelf ? "me" : friend.id)}
      onContextMenu={onContextMenu ? (e) => onContextMenu(e, friend) : undefined}
      title={friend.displayName}
      className={[
        "friend-row flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-surface-2",
        dim ? "opacity-55 hover:opacity-100" : "",
        selfChrome
          ? "mb-2 rounded-b-none border-b border-border bg-surface-2 hover:bg-surface-hover"
          : "",
      ].join(" ")}
    >
      <PresenceAvatar user={friend} size={32} />

      <span className="friend-row__text flex min-w-0 flex-col">
        <span
          className={`flex min-w-0 items-center gap-1.5 text-[13.5px] ${isSelf ? "font-semibold" : "font-medium"}`}
        >
          <span className="truncate">{friend.displayName}</span>
          {isSelf ? <Badge tone="accent">You</Badge> : null}
        </span>
        <span className="truncate text-[12px] text-muted">{sub}</span>
        {!hideLocation && location ? (
          <span className="truncate text-[11px] text-faint">{location}</span>
        ) : null}
      </span>
    </button>
  );
}
