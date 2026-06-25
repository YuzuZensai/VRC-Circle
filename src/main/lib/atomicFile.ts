import { mkdir, open, rename } from "node:fs/promises";
import { mkdirSync, renameSync, writeFileSync, openSync, fsyncSync, closeSync } from "node:fs";
import { dirname } from "node:path";

function tmpName(file: string): string {
  return `${file}.${process.pid}.${Date.now()}.tmp`;
}

export async function writeFileAtomic(file: string, data: string): Promise<void> {
  await mkdir(dirname(file), { recursive: true });
  const tmp = tmpName(file);
  const handle = await open(tmp, "w");
  try {
    await handle.writeFile(data);
    await handle.sync();
  } finally {
    await handle.close();
  }
  await rename(tmp, file);
}

export function writeFileAtomicSync(file: string, data: string): void {
  mkdirSync(dirname(file), { recursive: true });
  const tmp = tmpName(file);
  const fd = openSync(tmp, "w");
  try {
    writeFileSync(fd, data);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  renameSync(tmp, file);
}
