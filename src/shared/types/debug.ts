import type { RepoStats } from "./repository";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  id: number;
  ts: number;
  level: LogLevel;
  scope: string;
  message: string;
  data?: unknown;
}

export type CacheStatus = "fresh" | "stale" | "expired";

export interface CacheEntryInfo {
  key: string;
  createdAt: number;
  expiresAt: number;
  hardExpiresAt: number;
  hits: number;
  lastAccess: number;
  size: number;
  value: unknown;
}

export interface CacheStats {
  entries: number;
  inflight: number;
  totalSize: number;
  fresh: number;
  stale: number;
  expired: number;
  hits: number;
  misses: number;
  sets: number;
  patches: number;
  revalidations: number;
  invalidations: number;
  clears: number;
  persisted: boolean;
  persistFile: string | null;
}

export interface WsEvent {
  id: number;
  ts: number;
  type: string;
  handled: boolean;
  content: unknown;
}

export interface DebugSnapshot {
  cache: CacheEntryInfo[];
  stats: CacheStats;
  logs: LogEntry[];
  ws: WsEvent[];
  repos: RepoStats[];
}
