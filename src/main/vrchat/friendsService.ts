import type { UserProfile } from "../../shared/types/user";
import { requireActiveClient } from "./client";
import { toUserProfile } from "./mappers";
import { currentUser, userCache } from "./userService";
import { cacheKeys, policies } from "../cache/policies";
import { entityStore } from "../store/entityStore";

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

export async function unfriend(userId: string): Promise<void> {
  const vrc = requireActiveClient();
  await vrc.unfriend({ path: { userId }, throwOnError: true });
  entityStore.removeFriend(userId);
}

export async function inviteUser(userId: string, instanceLocation: string): Promise<void> {
  const vrc = requireActiveClient();
  await vrc.inviteUser({
    path: { userId },
    body: { instanceId: instanceLocation },
    throwOnError: true,
  });
}

export async function requestInvite(userId: string): Promise<void> {
  const vrc = requireActiveClient();
  await vrc.requestInvite({ path: { userId }, throwOnError: true });
}
