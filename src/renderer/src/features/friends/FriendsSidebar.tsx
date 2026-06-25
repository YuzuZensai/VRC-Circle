import { useMemo } from "react";
import { isOnline, locationLabel, statusMeta } from "../../lib/vrchat";
import { Badge, PresenceAvatar } from "../../components/ui";
import { useFriends, useSelf } from "../../store/social";
import { useWorldName } from "../../store/worlds";
import { parseLocation, type UserProfile } from "../../../../shared/types/user";

export function FriendsSidebar({ onOpen }: { onOpen: (id: string) => void }) {
  const friends = useFriends();
  const self = useSelf();

  const sorted = useMemo(
    () =>
      [...friends].sort(
        (a, b) =>
          Number(isOnline(b)) - Number(isOnline(a)) || a.displayName.localeCompare(b.displayName),
      ),
    [friends],
  );

  const online = sorted.filter(isOnline);
  const offline = sorted.filter((f) => !isOnline(f));

  return (
    <aside className="friendsbar flex h-full flex-col overflow-hidden border-l border-border bg-surface">
      <header className="friendsbar__header flex items-baseline gap-2 border-b border-border px-4 py-3.5 text-[13px] font-bold">
        <span className="friendsbar__text">Friends</span>
        <span className="friendsbar__text ml-auto text-[11.5px] font-semibold text-[var(--status-active)]">
          {online.length} online
        </span>
      </header>

      <div className="flex-1 overflow-y-auto p-2">
        {self ? <FriendRow friend={self} onOpen={() => onOpen("me")} isSelf /> : null}
        {friends.length === 0 ? (
          <p className="p-3 text-[13px] text-faint">No friends online yet.</p>
        ) : (
          <>
            {online.map((f) => (
              <FriendRow key={f.id} friend={f} onOpen={onOpen} />
            ))}
            {offline.length ? (
              <div className="friendsbar__text px-2 pb-1.5 pt-3 text-[11px] font-semibold uppercase tracking-wide text-faint">
                Offline · {offline.length}
              </div>
            ) : null}
            {offline.map((f) => (
              <FriendRow key={f.id} friend={f} onOpen={onOpen} dim />
            ))}
          </>
        )}
      </div>
    </aside>
  );
}

function FriendRow({
  friend,
  onOpen,
  dim,
  isSelf,
}: {
  friend: UserProfile;
  onOpen: (id: string) => void;
  dim?: boolean;
  isSelf?: boolean;
}) {
  const status = statusMeta[isOnline(friend) || isSelf ? friend.status : "offline"];
  const sub = friend.statusDescription || status.label;
  const parsed = parseLocation(friend.location);
  const worldName = useWorldName(parsed?.worldId);
  const location = parsed
    ? worldName
      ? `in ${worldName}`
      : "In a world"
    : locationLabel(friend.location);
  return (
    <button
      onClick={() => onOpen(friend.id)}
      title={friend.displayName}
      className={[
        "friend-row flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-surface-2",
        dim ? "opacity-55 hover:opacity-100" : "",
        isSelf
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
        {location ? <span className="truncate text-[11px] text-faint">{location}</span> : null}
      </span>
    </button>
  );
}
