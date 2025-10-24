import { useEffect, useState } from "react";
import { convertFileSrc, isTauri } from "@tauri-apps/api/core";
import { ImageCacheService } from "@/services/image-cache";
import { logger, LogLevel } from "@/utils/logger";

// In-memory cache to prevent redundant cache checks across component re-renders
const imageCache = new Map<string, string | null>();
const pendingChecks = new Map<string, Promise<string | null>>();

export function useCachedImage(url?: string | null): string | null {
  const [cached, setCached] = useState<string | null>(() => {
    if (!url || url.trim().length === 0 || url.startsWith("data:")) {
      return null;
    }

    return imageCache.get(url) ?? null;
  });

  useEffect(() => {
    let cancelled = false;

    if (!url || url.trim().length === 0 || url.startsWith("data:")) {
      setCached(null);
      return () => {
        cancelled = true;
      };
    }

    if (imageCache.has(url)) {
      const cachedValue = imageCache.get(url);
      if (!cancelled && cachedValue !== undefined) {
        setCached(cachedValue);
      }
      return () => {
        cancelled = true;
      };
    }

    const isInTauri = isTauri();

    if (!isInTauri) {
      imageCache.set(url, url);
      setCached(url);
      return () => {
        cancelled = true;
      };
    }

    const existingCheck = pendingChecks.get(url);
    if (existingCheck) {
      existingCheck.then((result) => {
        if (!cancelled) {
          setCached(result);
        }
      });
      return () => {
        cancelled = true;
      };
    }

    // Create new cache check promise
    const checkPromise = (async () => {
      try {
        const cachedPath = await ImageCacheService.checkCached(url);

        if (cachedPath) {
          const convertedPath = convertFileSrc(cachedPath);
          imageCache.set(url, convertedPath);
          return convertedPath;
        } else {
          logger.log(
            "ImageCache",
            LogLevel.DEBUG,
            `Cache MISS: ${url}, using original URL`
          );
          imageCache.set(url, url);

          try {
            const path = await ImageCacheService.cache(url);
            const convertedPath = convertFileSrc(path);

            logger.debug("ImageCache", `Cached: ${url} -> ${convertedPath}`, {
              path,
            });
            imageCache.set(url, convertedPath);

            if (!cancelled) {
              setCached(convertedPath);
            }
          } catch (err) {
            logger.warn("ImageCache", `Failed to cache: ${url}`, err);
          }
          return url;
        }
      } catch (err) {
        logger.warn("ImageCache", `Cache check failed: ${url}`, err);
        imageCache.set(url, url);
        return url;
      } finally {
        pendingChecks.delete(url);
      }
    })();

    pendingChecks.set(url, checkPromise);

    checkPromise.then((result) => {
      if (!cancelled) {
        setCached(result);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [url]);

  return cached;
}
