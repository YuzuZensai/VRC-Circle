import type { DebugSnapshot } from "../../shared/types/debug";
import type { RepoStats, StoredEntity } from "../../shared/types/repository";
import type { CacheUpdate } from "../../shared/ipc";
import { userCache } from "../vrchat/userService";
import { repos } from "../store/repository/manager";
import { getLogs } from "./logger";
import { getWsEvents } from "./wsLog";

function update(): CacheUpdate {
  return { cache: userCache.entries(), stats: userCache.stats() };
}

export function snapshot(): DebugSnapshot {
  return {
    cache: userCache.entries(),
    stats: userCache.stats(),
    logs: getLogs(),
    ws: getWsEvents(),
    repos: repos.stats(),
  };
}

export function repoStats(): RepoStats[] {
  return repos.stats();
}

export function repoInspect(name: string): StoredEntity<{ id: string }>[] {
  return repos.inspect(name);
}

export function repoClear(name: string): RepoStats[] {
  repos.clearType(name);
  return repos.stats();
}

export function repoFlush(name: string): RepoStats[] {
  repos.flushType(name);
  return repos.stats();
}

export function cacheInvalidate(key: string): CacheUpdate {
  userCache.invalidate(key);
  return update();
}

export function cacheClear(): CacheUpdate {
  userCache.clear();
  return update();
}
