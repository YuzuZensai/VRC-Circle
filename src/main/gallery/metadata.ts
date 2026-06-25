import { open } from "node:fs/promises";
import type { PhotoMetadata } from "../../shared/types/gallery";

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const HEAD_BYTES = 64 * 1024;

function tag(xml: string, name: string): string | undefined {
  const m = xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return m ? decodeEntities(m[1].trim()) : undefined;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function parseXmp(xml: string): PhotoMetadata {
  const created = tag(xml, "xmp:CreateDate");
  return {
    author: tag(xml, "xmp:Author"),
    authorId: tag(xml, "vrc:AuthorID"),
    worldId: tag(xml, "vrc:WorldID"),
    worldName: tag(xml, "vrc:WorldDisplayName"),
    takenAt: created ? new Date(created).toISOString() : undefined,
  };
}

export async function readPngMetadata(path: string): Promise<PhotoMetadata> {
  const fh = await open(path, "r");
  try {
    const buf = Buffer.alloc(HEAD_BYTES);
    const { bytesRead } = await fh.read(buf, 0, HEAD_BYTES, 0);
    const head = buf.subarray(0, bytesRead);
    if (!head.subarray(0, 8).equals(PNG_SIG)) return {};

    let meta: PhotoMetadata = {};
    let off = 8;
    while (off + 8 <= head.length) {
      const len = head.readUInt32BE(off);
      const type = head.toString("latin1", off + 4, off + 8);
      const dataStart = off + 8;

      if (type === "IHDR" && dataStart + 8 <= head.length) {
        meta.width = head.readUInt32BE(dataStart);
        meta.height = head.readUInt32BE(dataStart + 4);
      } else if (type === "iTXt") {
        const data = head.subarray(dataStart, dataStart + len);
        const text = data.toString("utf8");
        if (text.includes("x:xmpmeta")) {
          const xml = text.slice(text.indexOf("<x:xmpmeta"));
          meta = { ...meta, ...parseXmp(xml) };
        }
      }

      if (type === "IDAT" || type === "IEND") break;
      off = dataStart + len + 4;
    }
    return meta;
  } catch {
    return {};
  } finally {
    await fh.close();
  }
}
