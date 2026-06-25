import type { UserProfile } from "../../shared/types/user";
import { requireActiveClient } from "./client";
import { toUserProfile } from "./mappers";
import { currentUser, userCache } from "./userService";
import { cacheKeys, policies } from "../cache/policies";

const order: Record<string, number> = {
  "join me": 0,
  active: 1,
  "ask me": 2,
  busy: 3,
  offline: 4,
};

export async function listFriends(): Promise<UserProfile[]> {
  const vrc = requireActiveClient();
  const self = (await currentUser()).id;

  return userCache.get(cacheKeys.friends(), policies.friends, async () => {
    const [online, offline] = await Promise.all([
      vrc.getFriends({ query: { offline: false, n: 100 }, throwOnError: true }),
      vrc.getFriends({ query: { offline: true, n: 100 }, throwOnError: true }),
    ]);
    const friends = [
      ...(online.data ?? []).map((u) => ({ ...toUserProfile(u, self), state: "online" as const })),
      ...(offline.data ?? []).map((u) => ({
        ...toUserProfile(u, self),
        state: "offline" as const,
      })),
    ];
    return friends.sort(
      (a, b) =>
        (order[a.status] ?? 5) - (order[b.status] ?? 5) ||
        a.displayName.localeCompare(b.displayName),
    );
  });
}
