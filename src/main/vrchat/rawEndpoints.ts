import type { VRChat, FavoritedWorld, LimitedWorld } from "vrchat";

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

interface InfoPushContentList {
  name: string | { fallback?: string };
  shortName?: string | null;
  tag?: string | null;
  sortHeading?: string;
  sortOrder?: string;
  sortOwnership?: string;
  platform?: string;
}

interface InfoPushEntry {
  id: string;
  priority?: number;
  startDate?: string;
  endDate?: string;
  data?: { contentList?: InfoPushContentList };
}

export interface WorldCategory {
  id: string;
  name: string;
  tag?: string;
  sort?: string;
  order?: string;
  platform?: string;
}

export async function getWorldCategories(vrc: VRChat): Promise<WorldCategory[]> {
  const { data } = await vrc.client.get<InfoPushEntry[], unknown, true>({
    url: "/infoPush",
    query: { include: "user-all", require: "world-category" },
    throwOnError: true,
  });

  // vrchat gives events the lowest priority number, but we want them first
  return data
    .filter((e) => e.data?.contentList)
    .sort((a, b) => {
      const ev = Number(isEvent(b)) - Number(isEvent(a));
      if (ev !== 0) return ev;
      return (a.priority ?? 0) - (b.priority ?? 0);
    })
    .map((e) => {
      const cl = e.data!.contentList!;
      return {
        id: e.id,
        name: categoryName(cl),
        tag: cl.tag || undefined,
        sort: cl.sortHeading,
        order: cl.sortOrder,
        platform: cl.platform === "ThisPlatformSupported" ? undefined : cl.platform,
      };
    });
}

function isEvent(e: InfoPushEntry): boolean {
  const tag = e.data?.contentList?.tag ?? "";
  return tag.startsWith("admin_") || Boolean(e.startDate) || Boolean(e.endDate);
}

function categoryName(cl: InfoPushContentList): string {
  if (typeof cl.name === "string") return cl.name;
  return cl.name.fallback ?? cl.shortName ?? "Worlds";
}

export async function getCategoryWorlds(
  vrc: VRChat,
  category: WorldCategory,
  n: number,
): Promise<LimitedWorld[]> {
  const tags = ["system_approved", category.tag].filter(Boolean).join(",");
  const { data } = await vrc.client.get<LimitedWorld[], unknown, true>({
    url: "/worlds",
    query: {
      releaseStatus: "public",
      sort: category.sort,
      order: category.order ?? "descending",
      tag: tags || undefined,
      featured: false,
      n,
      offset: 0,
    },
    throwOnError: true,
  });
  return data;
}
