import type { Group } from "../../shared/types/group";
import { toGroup } from "./mappers";
import { cachedRead } from "./cachedRead";
import { cacheKeys, policies } from "../cache/policies";

export function getUserGroups(userId: string): Promise<Group[]> {
  return cachedRead(cacheKeys.userGroups(userId), policies.userGroups, async (vrc) => {
    const { data } = await vrc.getUserGroups({ path: { userId }, throwOnError: true });
    return data.map(toGroup).filter((g) => g.id);
  });
}

export function getRepresentedGroup(userId: string): Promise<Group | null> {
  return cachedRead(cacheKeys.representedGroup(userId), policies.representedGroup, async (vrc) => {
    const { data } = await vrc.getUserRepresentedGroup({ path: { userId }, throwOnError: true });
    return data?.groupId ? toGroup(data) : null;
  });
}
