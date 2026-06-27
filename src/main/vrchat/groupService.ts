import type { Group } from "../../shared/types/group";
import { toGroup, toGroupDetail } from "./mappers";
import { cachedRead } from "./cachedRead";
import { groupStore } from "../store/groupStore";
import { cacheKeys, policies } from "../cache/policies";

export async function getGroup(groupId: string): Promise<Group> {
  const group = await cachedRead(cacheKeys.group(groupId), policies.group, async (vrc) => {
    const { data } = await vrc.getGroup({ path: { groupId }, throwOnError: true });
    return toGroupDetail(data);
  });
  groupStore.addGroup(group);
  return group;
}

export async function getUserGroups(userId: string): Promise<Group[]> {
  const groups = await cachedRead(
    cacheKeys.userGroups(userId),
    policies.userGroups,
    async (vrc) => {
      const { data } = await vrc.getUserGroups({ path: { userId }, throwOnError: true });
      return data.map(toGroup).filter((g) => g.id);
    },
  );
  groupStore.setUserGroups(userId, groups);
  return groups;
}

export async function getRepresentedGroup(userId: string): Promise<Group | null> {
  const group = await cachedRead(
    cacheKeys.representedGroup(userId),
    policies.representedGroup,
    async (vrc) => {
      const { data } = await vrc.getUserRepresentedGroup({ path: { userId }, throwOnError: true });
      return data?.groupId ? toGroup(data) : null;
    },
  );
  groupStore.setRepresented(userId, group);
  return group;
}
