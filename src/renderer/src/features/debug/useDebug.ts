import { useEffect, useState } from "react";
import type { CacheEntryInfo, CacheStats, LogEntry, WsEvent } from "../../../../shared/types/debug";
import type { RepoStats } from "../../../../shared/types/repository";
import { api, events } from "../../lib/api";

export { useCopied } from "../../lib/useCopied";

const MAX_LOGS = 500;

export function useNow(ms = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

export function useDebug() {
  const [cache, setCache] = useState<CacheEntryInfo[]>([]);
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [ws, setWs] = useState<WsEvent[]>([]);
  const [repoStats, setRepoStats] = useState<RepoStats[]>([]);

  useEffect(() => {
    let active = true;
    api.debug.snapshot().then((s) => {
      if (!active) return;
      setCache(s.cache);
      setStats(s.stats);
      setLogs(s.logs);
      setWs(s.ws);
      setRepoStats(s.repos);
    });

    const pollRepos = () => api.debug.repoStats().then((r) => active && setRepoStats(r));
    const repoTimer = setInterval(pollRepos, 2000);

    const offCache = events.on("debug:cache", (u) => {
      setCache(u.cache);
      setStats(u.stats);
    });
    const offLog = events.on("debug:log", (e) => setLogs((prev) => [...prev, e].slice(-MAX_LOGS)));
    const offWs = events.on("ws:event", (e) => setWs((prev) => [...prev, e].slice(-MAX_LOGS)));
    return () => {
      active = false;
      clearInterval(repoTimer);
      offCache();
      offLog();
      offWs();
    };
  }, []);

  return {
    cache,
    stats,
    logs,
    ws,
    repoStats,
    clearLogs: () => setLogs([]),
    clearWs: () => setWs([]),
    invalidate: (key: string) =>
      api.debug.cacheInvalidate(key).then((u) => {
        setCache(u.cache);
        setStats(u.stats);
      }),
    clear: () =>
      api.debug.cacheClear().then((u) => {
        setCache(u.cache);
        setStats(u.stats);
      }),
  };
}
