import { protocol, net } from "electron";
import { pathToFileURL } from "node:url";
import { sep } from "node:path";
import { realpathSync } from "node:fs";
import { galleryRoots } from "./paths";
import { getThumbnail } from "./thumbnails";
import { logger } from "../debug/logger";

export const GALLERY_SCHEME = "vrcgallery";

export function registerGalleryScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: GALLERY_SCHEME,
      privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
    },
  ]);
}

export function photoUrl(absPath: string): string {
  return `${GALLERY_SCHEME}://photo/${encodeURIComponent(absPath)}`;
}

export function thumbUrl(absPath: string): string {
  return `${GALLERY_SCHEME}://thumb/${encodeURIComponent(absPath)}`;
}

function isUnderRoot(target: string): boolean {
  let real: string;
  try {
    real = realpathSync(target);
  } catch {
    return false;
  }
  return galleryRoots().some((root) => {
    let rootReal: string;
    try {
      rootReal = realpathSync(root);
    } catch {
      return false;
    }
    return real === rootReal || real.startsWith(rootReal + sep);
  });
}

export function registerGalleryProtocol(): void {
  protocol.handle(GALLERY_SCHEME, async (request) => {
    const url = new URL(request.url);
    const kind = url.host;
    const encoded = url.pathname.replace(/^\/+/, "");
    const filePath = decodeURIComponent(encoded);

    if (!isUnderRoot(filePath)) {
      logger.warn("gallery", "blocked out-of-root file request", { filePath });
      return new Response("Forbidden", { status: 403 });
    }

    if (kind === "thumb") {
      const jpeg = await getThumbnail(filePath);
      if (jpeg) {
        return new Response(new Uint8Array(jpeg), {
          headers: { "content-type": "image/jpeg", "cache-control": "max-age=31536000" },
        });
      }
    }

    return net.fetch(pathToFileURL(filePath).toString());
  });
}
