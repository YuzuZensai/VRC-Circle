import type { UserProfile } from "../../shared/types/user";
import { getActiveClient, getPipelineAuthToken } from "../vrchat/client";
import type { VRChat } from "vrchat";
import { currentUser, getUser } from "../vrchat/userService";
import { listFriends } from "../vrchat/friendsService";
import { trustRankFromTags } from "../vrchat/mappers";
import { WS_STRING_FIELDS } from "./repository/fieldPolicy";
import { activeId } from "../accounts/store";
import { entityStore, type SocialSnapshot } from "./entityStore";
import { worldStore } from "./worldStore";
import { groupStore } from "./groupStore";
import { avatarStore } from "./avatarStore";
import { worldFavoritesStore } from "./worldFavoritesStore";
import { repos } from "./repository/manager";
import { broadcast } from "../windows";
import { logger } from "../debug/logger";
import { recordWsEvent } from "../debug/wsLog";

interface Pipeline {
  on: (event: string, handler: (data: unknown) => void) => void;
  pipeline?: { authenticate: (token: string) => Promise<void>; connected: boolean };
}

const subscribed = new WeakSet<object>();

async function connectPipeline(vrc: VRChat): Promise<void> {
  if (!vrc.pipeline || vrc.pipeline.connected) return;
  try {
    const auth = await getPipelineAuthToken(vrc);
    if (!auth) {
      logger.warn("ws", "no auth cookie; pipeline not connected");
      return;
    }
    await vrc.pipeline.authenticate(auth);
    logger.info("ws", "pipeline connected");
  } catch (err) {
    logger.warn("ws", "pipeline connect failed", String((err as Error)?.message ?? err));
  }
}

function patchFromUser(
  u: Record<string, unknown>,
  profile = false,
): (Partial<UserProfile> & { id: string }) | null {
  const id = (u.id ?? u.userId) as string | undefined;
  if (!id) return null;
  const p: Partial<UserProfile> & { id: string } = { id };

  for (const field of WS_STRING_FIELDS) {
    if (u[field] !== undefined) p[field] = u[field] as string;
  }

  if (u.status !== undefined) p.status = u.status as UserProfile["status"];
  if (typeof u.statusDescription === "string" && (profile || u.statusDescription !== ""))
    p.statusDescription = u.statusDescription;
  if (Array.isArray(u.tags)) {
    p.tags = u.tags as string[];
    p.trustRank = trustRankFromTags(u.tags as string[]);
  }
  return p;
}

function asRecord(data: unknown): Record<string, unknown> {
  return (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
}

function userOf(data: unknown): Record<string, unknown> {
  const d = asRecord(data);
  return asRecord(d.user ?? d);
}

const WS_EVENTS = [
  "friend-add",
  "friend-delete",
  "friend-online",
  "friend-active",
  "friend-offline",
  "friend-update",
  "friend-location",
  "user-update",
  "user-location",
  "user-badge-assigned",
  "user-badge-unassigned",
  "content-refresh",
  "economy-update",
  "modified-image-update",
  "instance-queue-joined",
  "instance-queue-ready",
  "notification",
  "response-notification",
  "see-notification",
  "hide-notification",
  "clear-notification",
  "notification-v2",
  "notification-v2-update",
  "notification-v2-delete",
  "group-joined",
  "group-left",
  "group-member-updated",
  "group-role-updated",
];
const HANDLED = new Set([
  "friend-update",
  "friend-online",
  "friend-active",
  "user-update",
  "friend-location",
  "user-location",
  "friend-offline",
  "friend-add",
  "friend-delete",
]);

function subscribe(vrc: VRChat & Pipeline): void {
  if (subscribed.has(vrc)) return;
  subscribed.add(vrc);

  const active = () => getActiveClient() === vrc;

  for (const ev of WS_EVENTS) {
    vrc.on(ev, (data: unknown) => recordWsEvent(ev, data, HANDLED.has(ev)));
  }

  void connectPipeline(vrc);

  const patch = (data: unknown, state?: UserProfile["state"], profile = false) => {
    if (!active()) return;
    const p = patchFromUser(userOf(data), profile);
    if (p) entityStore.upsert(state ? { ...p, state } : p);
  };

  vrc.on("friend-update", (d: unknown) => patch(d, undefined, true));
  vrc.on("user-update", (d: unknown) => patch(d, undefined, true));
  vrc.on("friend-online", (d: unknown) => patch(d, "online"));
  vrc.on("friend-active", (d: unknown) => patch(d, "active"));

  const location = (data: unknown) => {
    if (!active()) return;
    const d = asRecord(data);
    const id = (d.userId ?? userOf(data).id) as string | undefined;
    if (!id) return;
    const fromUser = patchFromUser(userOf(data)) ?? { id };
    entityStore.upsert({ ...fromUser, id, location: d.location as string, state: "online" });
  };
  vrc.on("friend-location", location);
  vrc.on("user-location", location);

  vrc.on("friend-offline", (data: unknown) => {
    if (!active()) return;
    const id = (asRecord(data).userId ?? userOf(data).id) as string | undefined;
    if (id) entityStore.upsert({ id, state: "offline", location: "offline" });
  });

  vrc.on("friend-add", async (data: unknown) => {
    if (!active()) return;
    const id = (asRecord(data).userId ?? userOf(data).id) as string | undefined;
    if (!id) return;
    try {
      entityStore.addFriend(await getUser(id));
    } catch {}
  });

  vrc.on("friend-delete", (data: unknown) => {
    if (!active()) return;
    const id = (asRecord(data).userId ?? userOf(data).id) as string | undefined;
    if (id) entityStore.removeFriend(id);
  });
}

export async function seedActiveAccount(force = false): Promise<void> {
  const id = activeId();
  const alreadyActive = entityStore.snapshot().selfId === id;
  repos.setActive(id);
  if (!id) {
    worldStore.reset();
    worldFavoritesStore.reset();
    groupStore.reset();
    avatarStore.reset();
    entityStore.reset();
    return;
  }
  if (!force && alreadyActive) return;

  worldStore.reset();
  worldFavoritesStore.reset();
  groupStore.reset();
  entityStore.reset();

  const vrc = getActiveClient();
  if (!vrc) return;
  try {
    const [self, friends] = await Promise.all([currentUser(), listFriends()]);
    entityStore.seed(self, friends);
    logger.info("social", `seeded ${friends.length} friends`);
    subscribe(vrc as VRChat & Pipeline);
  } catch (err) {
    logger.warn("social", "seed failed", String((err as Error)?.message ?? err));
  }
}

export function socialSnapshot(): SocialSnapshot {
  return entityStore.snapshot();
}

export function startSocialBridge(): void {
  entityStore.onChange((c) => {
    if (c.type === "seed") broadcast("social:seed", c.snapshot);
    else broadcast("social:upsert", c.user);
  });

  worldStore.onChange((c) => {
    if (c.type === "seed") broadcast("world:seed", c.snapshot);
    else broadcast("world:upsert", c.world);
  });

  groupStore.onChange((c) => {
    if (c.type === "seed") broadcast("group:seed", c.snapshot);
    else broadcast("group:upsert", c.group);
  });

  avatarStore.onChange((c) => {
    if (c.type === "seed") broadcast("avatar:seed", c.snapshot);
    else broadcast("avatar:upsert", c.avatar);
  });

  worldFavoritesStore.onChange((snap) => broadcast("world:favorites:seed", snap));
}
