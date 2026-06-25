import type { WsEvent } from "../../shared/types/debug";

const MAX = 300;
const buffer: WsEvent[] = [];
const listeners = new Set<(e: WsEvent) => void>();
let nextId = 1;

export function recordWsEvent(type: string, content: unknown, handled: boolean): void {
  const entry: WsEvent = { id: nextId++, ts: Date.now(), type, handled, content };
  buffer.push(entry);
  if (buffer.length > MAX) buffer.shift();
  for (const fn of listeners) fn(entry);
}

export function getWsEvents(): WsEvent[] {
  return [...buffer];
}

export function onWsEvent(fn: (e: WsEvent) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
