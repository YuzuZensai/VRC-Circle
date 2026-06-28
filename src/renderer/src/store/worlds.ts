import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { World, WorldSnapshot } from "../../../shared/types/world";
import { api, events } from "../lib/api";

interface WorldState {
  worlds: Record<string, World>;
  byAuthor: Record<string, string[]>;
  seed: (s: WorldSnapshot) => void;
  upsert: (w: World) => void;
}

export const useWorlds = create<WorldState>((set) => ({
  worlds: {},
  byAuthor: {},
  seed: (s) =>
    set({
      worlds: Object.fromEntries(s.worlds.map((w) => [w.id, w])),
      byAuthor: s.byAuthor,
    }),
  upsert: (w) => set((st) => ({ worlds: { ...st.worlds, [w.id]: w } })),
}));


let pending: World[] = [];
let flushScheduled = false;

function flushUpserts(): void {
  flushScheduled = false;
  if (pending.length === 0) return;
  const batch = pending;
  pending = [];
  useWorlds.setState((st) => {
    const worlds = { ...st.worlds };
    for (const w of batch) worlds[w.id] = w;
    return { worlds };
  });
}

function queueUpsert(w: World): void {
  pending.push(w);
  if (!flushScheduled) {
    flushScheduled = true;
    requestAnimationFrame(flushUpserts);
  }
}

events.on("world:seed", (s) => useWorlds.getState().seed(s));
events.on("world:upsert", queueUpsert);
api.world
  .snapshot()
  .then((s) => useWorlds.getState().seed(s))
  .catch(() => {});

const fetching = new Set<string>();
const failed = new Set<string>();

export function useWorld(worldId?: string): World | undefined {
  const world = useWorlds((s) => (worldId ? s.worlds[worldId] : undefined));
  if (worldId && !world && !fetching.has(worldId) && !failed.has(worldId)) {
    fetching.add(worldId);
    api.world
      .get(worldId)
      .catch(() => failed.add(worldId))
      .finally(() => fetching.delete(worldId));
  }
  return world;
}

export function useWorldName(worldId?: string): string | undefined {
  return useWorld(worldId)?.name;
}

export const useAuthorWorlds = (userId: string): World[] =>
  useWorlds(
    useShallow((s) => (s.byAuthor[userId] ?? []).map((id) => s.worlds[id]).filter(Boolean)),
  );

export const useAllWorlds = (): World[] => useWorlds(useShallow((s) => Object.values(s.worlds)));
