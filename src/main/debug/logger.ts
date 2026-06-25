import type { LogEntry, LogLevel } from "../../shared/types/debug";

const MAX = 500;
const buffer: LogEntry[] = [];
const listeners = new Set<(e: LogEntry) => void>();
let nextId = 1;

export function log(level: LogLevel, scope: string, message: string, data?: unknown): void {
  const entry: LogEntry = { id: nextId++, ts: Date.now(), level, scope, message, data };
  buffer.push(entry);
  if (buffer.length > MAX) buffer.shift();
  // eslint-disable-next-line no-console
  console[level === "debug" ? "log" : level](`[${scope}] ${message}`, data ?? "");
  for (const fn of listeners) fn(entry);
}

export const logger = {
  debug: (s: string, m: string, d?: unknown) => log("debug", s, m, d),
  info: (s: string, m: string, d?: unknown) => log("info", s, m, d),
  warn: (s: string, m: string, d?: unknown) => log("warn", s, m, d),
  error: (s: string, m: string, d?: unknown) => log("error", s, m, d),
};

export function getLogs(): LogEntry[] {
  return [...buffer];
}

export function onLog(fn: (e: LogEntry) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
