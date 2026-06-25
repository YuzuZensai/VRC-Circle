import { useEffect, useState } from "react";
import type { Photo } from "../../../../shared/types/gallery";

interface Section {
  bucket: string;
  items: Photo[];
}

interface Props {
  sections: Section[];
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onJump: (bucket: string) => void;
}

export function Timeline({ sections, scrollRef, onJump }: Props) {
  const [activeBucket, setActiveBucket] = useState<string | null>(null);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const update = () => {
      const mid = root.scrollTop + root.clientHeight * 0.25;
      let current = sections[0]?.bucket ?? null;
      for (const s of sections) {
        const el = document.getElementById(`bucket-${s.bucket}`);
        if (el && el.offsetTop <= mid) current = s.bucket;
      }
      setActiveBucket(current);
    };
    update();
    root.addEventListener("scroll", update, { passive: true });
    return () => root.removeEventListener("scroll", update);
  }, [sections, scrollRef]);

  return (
    <nav className="timeline" aria-label="Jump to date">
      <div className="timeline__rail">
        {sections.map((s, i) => {
          const year = s.bucket.slice(0, 4);
          const firstOfYear = i === 0 || sections[i - 1].bucket.slice(0, 4) !== year;
          const active = s.bucket === activeBucket;
          return (
            <button
              key={s.bucket}
              className={`timeline__tick ${active ? "is-active" : ""}`}
              onClick={() => onJump(s.bucket)}
              title={`${formatMonth(s.bucket)} · ${s.items.length}`}
            >
              {firstOfYear ? <span className="timeline__year">{year}</span> : null}
              <span className="timeline__dot" />
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function formatMonth(bucket: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(bucket);
  if (!m) return bucket;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, 1);
  return Number.isNaN(d.getTime())
    ? bucket
    : d.toLocaleDateString(undefined, { year: "numeric", month: "long" });
}
