import { useCallback, useEffect, useState } from "react";
import { api, errorMessage, events } from "../../lib/api";
import type { GallerySnapshot, Photo } from "../../../../shared/types/gallery";

interface GalleryData {
  snap: GallerySnapshot | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
  remove: (ids: string[]) => Promise<void>;
  recent: ReadonlySet<string>;
}

const sortKey = (p: Photo): string => p.metadata.takenAt ?? p.modifiedAt;

export function useGallery(): GalleryData {
  const [snap, setSnap] = useState<GallerySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<ReadonlySet<string>>(() => new Set());

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    api.gallery
      .snapshot()
      .then(setSnap)
      .catch((e) => setError(errorMessage(e, "Could not load your gallery.")))
      .finally(() => setLoading(false));
  }, []);

  const remove = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;
      const drop = new Set(ids);
      try {
        await api.gallery.delete(ids);
        setSnap((s) => (s ? { ...s, photos: s.photos.filter((p) => !drop.has(p.id)) } : s));
      } catch (e) {
        reload();
        throw e;
      }
    },
    [reload],
  );

  useEffect(reload, [reload]);

  useEffect(() => {
    return events.on("gallery:added", (photo) => {
      setSnap((s) => {
        if (!s || s.photos.some((p) => p.id === photo.id)) return s;
        const photos = [...s.photos, photo].sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
        return { ...s, empty: false, photos };
      });
      setRecent((r) => new Set(r).add(photo.id));
      window.setTimeout(() => {
        setRecent((r) => {
          if (!r.has(photo.id)) return r;
          const n = new Set(r);
          n.delete(photo.id);
          return n;
        });
      }, 1400);
    });
  }, []);

  return { snap, loading, error, reload, remove, recent };
}
