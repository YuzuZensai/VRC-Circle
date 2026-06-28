import type { UserProfile } from "../../shared/types/user";
import { requireActiveClient } from "./client";
import { toUserProfile } from "./mappers";
import { TtlCache } from "../cache/cache";
import { cacheKeys, policies } from "../cache/policies";
import { entityStore } from "../store/entityStore";

export const userCache = new TtlCache();

async function selfId(): Promise<string> {
  return (await currentUser()).id;
}

function dropPresence(p: UserProfile): Partial<UserProfile> & { id: string } {
  const { state: _s, location: _l, status: _st, ...rest } = p;
  return rest;
}

function refreshStore(p: UserProfile, key: string): void {
  const known = !p.isSelf && entityStore.get(p.id)?.isFriend;
  const stamped = p.isSelf || known ? dropPresence(p) : p;
  entityStore.upsertFrom(stamped, "rest:detail", userCache.createdAt(key) ?? Date.now());
}

export async function currentUser(): Promise<UserProfile> {
  const vrc = requireActiveClient();
  const key = cacheKeys.currentUser();
  const profile = await userCache.get(key, policies.currentUser, async () => {
    const { data } = await vrc.getCurrentUser({ throwOnError: true });
    if (!("id" in data)) throw { status: 401, message: "Not authenticated" };
    return toUserProfile(data, data.id);
  });
  refreshStore(profile, key);
  return profile;
}

export async function getUser(userId: string): Promise<UserProfile> {
  const vrc = requireActiveClient();
  const self = await selfId();
  const key = cacheKeys.user(userId);
  const profile = await userCache.get(key, policies.user, async () => {
    const { data } = await vrc.getUser({ path: { userId }, throwOnError: true });
    return toUserProfile(data, self);
  });
  refreshStore(profile, key);
  return profile;
}

export async function getUserByName(username: string): Promise<UserProfile> {
  const vrc = requireActiveClient();
  const self = await selfId();
  const key = cacheKeys.userByName(username);
  const profile = await userCache.get(key, policies.user, async () => {
    const { data } = await vrc.getUserByName({ path: { username }, throwOnError: true });
    return toUserProfile(data, self);
  });
  refreshStore(profile, key);
  return profile;
}

export async function searchUsers(query: string): Promise<UserProfile[]> {
  const vrc = requireActiveClient();
  const self = await selfId();
  return userCache.get(cacheKeys.userSearch(query), policies.userSearch, async () => {
    const { data } = await vrc.searchUsers({ query: { search: query, n: 25 }, throwOnError: true });
    return data.map((u) => toUserProfile(u, self));
  });
}
