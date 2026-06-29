import { readFileSync } from "node:fs";
import { writeFileAtomicSync } from "./atomicFile";

export function jsonFile<T>(
  path: () => string,
  fallback: () => T,
  parse: (raw: unknown) => T = (raw) => raw as T,
) {
  return {
    read(): T {
      try {
        return parse(JSON.parse(readFileSync(path(), "utf8")));
      } catch {
        return fallback();
      }
    },
    write(value: T): void {
      writeFileAtomicSync(path(), JSON.stringify(value, null, 2));
    },
  };
}
