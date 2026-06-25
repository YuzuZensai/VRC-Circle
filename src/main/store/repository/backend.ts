import { existsSync, readFileSync, appendFileSync, rmSync, statSync } from "node:fs";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";
import { writeFileAtomicSync } from "../../lib/atomicFile";
import type { StoredEntity } from "../../../shared/types/repository";

export interface StorageBackend<T> {
  load(): Map<string, StoredEntity<T>>;
  put(id: string, entity: StoredEntity<T>): void;
  remove(id: string): void;
  flush(map: Map<string, StoredEntity<T>>): void;
  clear(): void;
  file: string | null;
}

type LogLine<T> = { op: "put"; id: string; e: StoredEntity<T> } | { op: "del"; id: string };

export class JsonlBackend<T> implements StorageBackend<T> {
  private readonly base: string;
  private readonly log: string;
  private appendCount = 0;

  constructor(file: string) {
    this.base = `${file}.json`;
    this.log = `${file}.log`;
    mkdirSync(dirname(file), { recursive: true });
  }

  get file(): string {
    return this.base;
  }

  load(): Map<string, StoredEntity<T>> {
    const map = new Map<string, StoredEntity<T>>();
    if (existsSync(this.base)) {
      try {
        const raw = JSON.parse(readFileSync(this.base, "utf8")) as Record<string, StoredEntity<T>>;
        for (const [id, e] of Object.entries(raw)) map.set(id, e);
      } catch {
        map.clear();
      }
    }
    if (existsSync(this.log)) {
      const text = readFileSync(this.log, "utf8");
      for (const line of text.split("\n")) {
        if (!line) continue;
        try {
          const entry = JSON.parse(line) as LogLine<T>;
          if (entry.op === "put") map.set(entry.id, entry.e);
          else map.delete(entry.id);
        } catch {
          continue;
        }
      }
    }
    this.appendCount = 0;
    if (this.logIsLarge()) this.compact(map);
    return map;
  }

  put(id: string, entity: StoredEntity<T>): void {
    this.appendLine({ op: "put", id, e: entity });
  }

  remove(id: string): void {
    this.appendLine({ op: "del", id });
  }

  private appendLine(entry: LogLine<T>): void {
    try {
      appendFileSync(this.log, JSON.stringify(entry) + "\n");
      this.appendCount++;
    } catch {
      return;
    }
  }

  private logIsLarge(): boolean {
    try {
      if (!existsSync(this.log)) return false;
      const logBytes = statSync(this.log).size;
      const baseBytes = existsSync(this.base) ? statSync(this.base).size : 0;
      return logBytes > 256 * 1024 && logBytes >= baseBytes;
    } catch {
      return false;
    }
  }

  flush(map: Map<string, StoredEntity<T>>): void {
    if (this.appendCount === 0) return;
    this.compact(map);
  }

  clear(): void {
    rmSync(this.base, { force: true });
    rmSync(this.log, { force: true });
    this.appendCount = 0;
  }

  private compact(map: Map<string, StoredEntity<T>>): void {
    try {
      writeFileAtomicSync(this.base, JSON.stringify(Object.fromEntries(map)));
      rmSync(this.log, { force: true });
      this.appendCount = 0;
    } catch {
      return;
    }
  }

  destroy(): void {
    this.clear();
  }
}
