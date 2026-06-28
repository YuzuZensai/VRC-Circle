import { useMemo } from "react";
import { parseLocation, type UserProfile } from "../../../../shared/types/user";
import { isOnline } from "../../lib/vrchat";

export interface InstanceSection {
  key: string;
  worldId: string;
  instanceId: string;
  members: UserProfile[];
}

export interface FriendsGrouped {
  online: UserProfile[];
  offline: UserProfile[];
  instances: InstanceSection[];
  alone: UserProfile[];
}

// groups online friends (plus self) by shared instance; everyone in an instance
// of one stays in `alone`. self is pinned first within each instance.
export function useFriendsGrouped(
  friends: UserProfile[],
  self: UserProfile | undefined,
): FriendsGrouped {
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

  return { online, offline, instances, alone };
}
