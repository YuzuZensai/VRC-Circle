import { useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import type { FavoriteWorldFolder, World } from "../../../../shared/types/world";
import { api, events } from "../../lib/api";
import { useAsync } from "../../lib/useAsync";
import { useWorlds } from "../../store/worlds";

type Status = "loading" | "ready" | "error";

export interface FavoriteFolder {
  name: string;
  displayName: string;
  worlds: World[];
}

export function useFavoriteWorlds(userId: string): {
  status: Status;
  folders: FavoriteFolder[];
  message?: string;
} {
  const [streamed, setStreamed] = useState<{
    userId: string;
    folders: FavoriteWorldFolder[];
  } | null>(null);
  const fetched = useAsync(
    () => api.world.favorites(userId),
    [userId],
    "Failed to load favorite worlds.",
  );

  useEffect(
    () =>
      events.on("world:favoriteFolders", (p) => {
        if (p.userId === userId) setStreamed({ userId, folders: p.folders });
      }),
    [userId],
  );

  const fallbackFolders = useMemo<FavoriteWorldFolder[]>(() => [], []);
  const streamedFolders = streamed?.userId === userId ? streamed.folders : fallbackFolders;
  const folders: FavoriteWorldFolder[] =
    fetched.status === "ready" ? fetched.data : streamedFolders;

  const ids = useMemo(() => folders.flatMap((f) => f.worldIds), [folders]);
  const worlds = useWorlds(useShallow((s) => ids.map((id) => s.worlds[id]).filter(Boolean)));

  const assembled = useMemo<FavoriteFolder[]>(() => {
    const byId = new Map(worlds.map((w) => [w.id, w]));
    return folders.map((f) => ({
      name: f.name,
      displayName: f.displayName,
      worlds: f.worldIds.map((id) => byId.get(id)).filter((w): w is World => Boolean(w)),
    }));
  }, [folders, worlds]);

  return {
    status: fetched.status,
    folders: assembled,
    message: fetched.status === "error" ? fetched.message : undefined,
  };
}
