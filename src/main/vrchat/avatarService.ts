import type { Avatar } from "../../shared/types/avatar";
import { toAvatar } from "./mappers";
import { cachedRead } from "./cachedRead";
import { repos } from "../store/repository/manager";
import { cacheKeys, policies } from "../cache/policies";

export async function getAvatar(avatarId: string): Promise<Avatar> {
  const avatar = await cachedRead(cacheKeys.avatar(avatarId), policies.avatar, async (vrc) => {
    const { data } = await vrc.getAvatar({ path: { avatarId }, throwOnError: true });
    return toAvatar(data);
  });
  repos.active.avatars.upsert(avatar, "rest:detail");
  return avatar;
}

export async function getFavoritedAvatars(): Promise<Avatar[]> {
  const avatars = await cachedRead(
    cacheKeys.avatarFavorites(),
    policies.avatarFavorites,
    async (vrc) => {
      const { data } = await vrc.getFavoritedAvatars({ query: { n: 100 }, throwOnError: true });
      return data.map(toAvatar);
    },
  );
  repos.active.avatars.upsertMany(avatars, "rest:list");
  return avatars;
}
