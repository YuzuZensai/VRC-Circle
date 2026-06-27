import type { CachePolicy } from "./cache";

export const policies = {
  currentUser: { ttl: 5 * 60_000, staleWhileRevalidate: 10 * 60_000 },
  user: { ttl: 5 * 60_000, staleWhileRevalidate: 10 * 60_000 },
  userSearch: { ttl: 5 * 60_000 },
  worldSearch: { ttl: 5 * 60_000 },
  friends: { ttl: 5 * 60_000, staleWhileRevalidate: 60_000 },
  userWorlds: { ttl: 15 * 60_000, staleWhileRevalidate: 60 * 60_000 },
  favoriteWorlds: { ttl: 15 * 60_000, staleWhileRevalidate: 60 * 60_000 },
  world: { ttl: 30 * 60_000, staleWhileRevalidate: 2 * 60 * 60_000 },
  avatar: { ttl: 30 * 60_000, staleWhileRevalidate: 2 * 60 * 60_000 },
  avatarFavorites: { ttl: 15 * 60_000, staleWhileRevalidate: 60 * 60_000 },
  userGroups: { ttl: 15 * 60_000, staleWhileRevalidate: 60 * 60_000 },
  representedGroup: { ttl: 15 * 60_000, staleWhileRevalidate: 60 * 60_000 },
  group: { ttl: 30 * 60_000, staleWhileRevalidate: 2 * 60 * 60_000 },
  instance: { ttl: 30_000, staleWhileRevalidate: 60_000 },
} satisfies Record<string, CachePolicy>;

export const cacheKeys = {
  currentUser: () => "user:me",
  user: (id: string) => `user:${id}`,
  userByName: (name: string) => `user:name:${name.toLowerCase()}`,
  userSearch: (q: string) => `user:search:${q.trim().toLowerCase()}`,
  worldSearch: (q: string) => `world:search:${q.trim().toLowerCase()}`,
  friends: () => "friends",
  userWorlds: (id: string) => `user:worlds:${id}`,
  favoriteWorlds: (id: string) => `worlds:favorites:${id}`,
  world: (id: string) => `world:${id}`,
  avatar: (id: string) => `avatar:${id}`,
  avatarFavorites: () => "avatar:favorites",
  userGroups: (id: string) => `user:groups:${id}`,
  representedGroup: (id: string) => `user:group:represented:${id}`,
  group: (id: string) => `group:${id}`,
  instance: (location: string) => `instance:${location}`,
};
