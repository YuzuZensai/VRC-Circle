import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { DiscoverCategory } from "../../../../shared/types/world";
import { Banner, SkeletonGrid } from "../../components/ui";
import { useT } from "../../lib/i18n";
import { api } from "../../lib/api";
import { useAsync } from "../../lib/useAsync";
import { WorldCard } from "./WorldsSection";
import "./profile.css";

export function DiscoverSection() {
  const t = useT();
  const state = useAsync(() => api.world.discover(), [], "Failed to load worlds.");

  if (state.status === "loading") {
    return (
      <div className="flex flex-col gap-7">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex flex-col gap-3">
            <div className="h-4 w-40 rounded-md bg-surface-hover" />
            <SkeletonGrid count={4} />
          </div>
        ))}
      </div>
    );
  }

  if (state.status === "error") return <Banner>{state.message}</Banner>;
  if (!state.data.length)
    return <p className="text-[13.5px] text-faint">{t("profile:worlds.empty")}</p>;

  return (
    <div className="flex flex-col gap-7">
      {state.data.map((cat) => (
        <Row key={cat.id} category={cat} />
      ))}
    </div>
  );
}

function Row({ category }: { category: DiscoverCategory }) {
  const ref = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const sync = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft >= max - 1);
  }, []);

  useEffect(() => {
    sync();
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [sync]);

  const page = useCallback((dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  }, []);

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-[15px] font-semibold tracking-[-0.2px]">{category.name}</h3>

      <div className="discover-rail relative" data-at-start={atStart} data-at-end={atEnd}>
        <Arrow dir={-1} disabled={atStart} onClick={() => page(-1)} />
        <Arrow dir={1} disabled={atEnd} onClick={() => page(1)} />

        <div
          ref={ref}
          onScroll={sync}
          className="discover-row -mx-1 flex snap-x scroll-smooth gap-3 overflow-x-auto px-1 pb-1"
        >
          {category.worlds.map((w) => (
            <div key={w.id} className="w-[200px] shrink-0 snap-start">
              <WorldCard world={w} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Arrow({
  dir,
  disabled,
  onClick,
}: {
  dir: 1 | -1;
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = dir === 1 ? ChevronRight : ChevronLeft;
  return (
    <button
      type="button"
      aria-label={dir === 1 ? "Scroll right" : "Scroll left"}
      tabIndex={-1}
      disabled={disabled}
      onClick={onClick}
      className={`discover-arrow absolute top-1/2 z-10 grid size-9 place-items-center rounded-full border border-border bg-surface/90 text-text shadow-md backdrop-blur hover:bg-surface ${
        dir === 1 ? "right-1" : "left-1"
      }`}
    >
      <Icon size={18} />
    </button>
  );
}
