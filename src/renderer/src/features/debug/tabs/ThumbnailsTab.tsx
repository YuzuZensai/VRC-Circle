import { useEffect, useState } from "react";
import { Images, Trash2 } from "lucide-react";
import type { ThumbCacheStats } from "../../../../../shared/types/gallery";
import { Button, Panel, Stat } from "../../../components/ui";
import { api } from "../../../lib/api";
import { formatBytes } from "../ui";

export function ThumbnailsTab() {
  const [stats, setStats] = useState<ThumbCacheStats | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.gallery
      .thumbStats()
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  async function clear() {
    setBusy(true);
    try {
      setStats(await api.gallery.thumbClear());
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      title="Gallery thumbnails"
      meta={stats ? stats.dir : "loading…"}
      action={
        <Button
          variant="ghost"
          onClick={clear}
          loading={busy}
          disabled={!stats || stats.count === 0}
        >
          <Trash2 size={14} /> Clear cache
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3">
        <Stat label="Thumbnails" value={stats?.count ?? "—"} />
        <Stat
          label="Disk usage"
          value={stats ? formatBytes(stats.totalBytes) : "—"}
          tone="var(--accent)"
        />
      </div>
      <div className="flex items-center gap-2 border-t border-border px-4 py-3 text-[12px] text-muted">
        <Images size={14} className="shrink-0 text-faint" />
        Downscaled JPEGs generated from your VRChat screenshots. Clearing them just frees disk; they
        rebuild on next view.
      </div>
    </Panel>
  );
}
