import type { VRChat, FavoritedWorld } from "vrchat";

// VRChat web routes that are missing from the SDK.

interface FavoriteGroupItem {
  favoriteId: string;
  id: string;
  tags: string[];
  type: string;
  world: FavoritedWorld;
}

interface FavoriteGroupItems {
  favorites: FavoriteGroupItem[];
  totalCount: number;
}

export type WorldFavoriteGroupType = "world" | "vrcPlusWorld";

export async function getFavoriteGroupWorlds(
  vrc: VRChat,
  groupType: WorldFavoriteGroupType,
  groupName: string,
  ownerId: string,
): Promise<FavoritedWorld[]> {
  const worlds: FavoritedWorld[] = [];
  const pageSize = 100;
  for (let offset = 0; ; offset += pageSize) {
    const { data } = await vrc.client.get<FavoriteGroupItems, unknown, true>({
      url: `/favorites/groups/${groupType}/${encodeURIComponent(groupName)}`,
      query: { ownerId, n: pageSize, offset },
      throwOnError: true,
    });
    const page = data.favorites ?? [];
    for (const f of page) worlds.push(f.world);
    if (page.length < pageSize || worlds.length >= (data.totalCount ?? worlds.length)) break;
  }
  return worlds;
}
