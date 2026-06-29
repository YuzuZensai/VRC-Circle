import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Trans } from "react-i18next";
import { Check, Globe, Images, RefreshCw, Search, Trash2, X } from "lucide-react";
import type { Photo } from "../../../../shared/types/gallery";
import { Banner, Loader, SelectionBar, SelectionBarButton } from "../../components/ui";
import { useI18n } from "../../lib/i18n";
import { useGallery } from "./useGallery";
import { Lightbox } from "./Lightbox";
import { Timeline } from "./Timeline";
import { justify } from "./justify";
import { formatBucket } from "./format";
import "./gallery.css";

const ROW_HEIGHT = 200;
const GAP = 8;
const DRAG_THRESHOLD = 6;

interface Section {
  bucket: string;
  items: Photo[];
}

function sameSet(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

export function GalleryView() {
  const { t } = useI18n();
  const { snap, loading, error, reload, remove, recent } = useGallery();
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const scrollRef = useRef<HTMLDivElement>(null);
  const bandRef = useRef<HTMLDivElement>(null);
  const [width, gridRef] = useWidth();

  const photos = snap?.photos ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return photos;
    return photos.filter((p) =>
      [p.fileName, p.metadata.worldName, p.metadata.author].some((v) =>
        v?.toLowerCase().includes(q),
      ),
    );
  }, [photos, query]);

  const sections = useMemo<Section[]>(() => {
    const map = new Map<string, Photo[]>();
    for (const p of filtered) {
      const list = map.get(p.bucket);
      if (list) list.push(p);
      else map.set(p.bucket, [p]);
    }
    return [...map.entries()].map(([bucket, items]) => ({ bucket, items }));
  }, [filtered]);

  const activeIndex = activeId ? filtered.findIndex((p) => p.id === activeId) : -1;

  useEffect(() => {
    if (activeId && !filtered.some((p) => p.id === activeId)) setActiveId(null);
  }, [activeId, filtered]);

  useEffect(() => {
    setSelected((s) => {
      if (s.size === 0) return s;
      const live = new Set(photos.map((p) => p.id));
      const next = new Set<string>();
      for (const id of s) if (live.has(id)) next.add(id);
      return next.size === s.size ? s : next;
    });
  }, [photos]);

  const selecting = selected.size > 0;
  const toggle = useCallback((id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);
  const setMany = useCallback((ids: string[], on: boolean) => {
    setSelected((s) => {
      const n = new Set(s);
      for (const id of ids) {
        if (on) n.add(id);
        else n.delete(id);
      }
      return n;
    });
  }, []);
  const clearSel = useCallback(() => setSelected((s) => (s.size ? new Set() : s)), []);
  const open = useCallback((p: Photo) => setActiveId(p.id), []);

  const jumpTo = useCallback((bucket: string) => {
    document
      .getElementById(`bucket-${bucket}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const deleteIds = useCallback(
    async (ids: string[]) => {
      try {
        await remove(ids);
      } catch {}
    },
    [remove],
  );

  const deleteSelected = useCallback(async () => {
    const ids = [...selected];
    clearSel();
    await deleteIds(ids);
  }, [selected, clearSel, deleteIds]);

  const deleteActive = useCallback(async () => {
    if (activeIndex < 0) return;
    const photo = filtered[activeIndex];
    if (!photo) return;
    const neighbour = filtered[activeIndex + 1] ?? filtered[activeIndex - 1] ?? null;
    setActiveId(neighbour && neighbour.id !== photo.id ? neighbour.id : null);
    await deleteIds([photo.id]);
  }, [activeIndex, filtered, deleteIds]);

  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const baseRef = useRef<Set<string>>(new Set());
  const rectsRef = useRef<{ id: string; r: DOMRect }[]>([]);
  const lastPtRef = useRef<{ x: number; y: number } | null>(null);
  const appliedRef = useRef<Set<string>>(new Set());
  const rafRef = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const suppressClickRef = useRef(false);

  const flushDrag = useCallback(() => {
    rafRef.current = null;
    const el = scrollRef.current;
    const start = startRef.current;
    const pt = lastPtRef.current;
    if (!el || !start || !pt) return;
    const left = Math.min(start.x, pt.x);
    const top = Math.min(start.y, pt.y);
    const right = Math.max(start.x, pt.x);
    const bottom = Math.max(start.y, pt.y);

    const next = new Set(baseRef.current);
    for (const { id, r } of rectsRef.current) {
      if (r.left < right && r.right > left && r.top < bottom && r.bottom > top) next.add(id);
    }
    if (!sameSet(next, appliedRef.current)) {
      appliedRef.current = next;
      setSelected(next);
    }

    const sr = el.getBoundingClientRect();
    const band = bandRef.current;
    if (band) {
      band.style.left = `${left - sr.left + el.scrollLeft}px`;
      band.style.top = `${top - sr.top + el.scrollTop}px`;
      band.style.width = `${right - left}px`;
      band.style.height = `${bottom - top}px`;
      band.hidden = false;
    }
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    startRef.current = { x: e.clientX, y: e.clientY };
    baseRef.current = new Set(selectedRef.current);
    appliedRef.current = selectedRef.current;
    draggingRef.current = false;
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const start = startRef.current;
      const el = scrollRef.current;
      if (!start || !el) return;
      if (!draggingRef.current) {
        if (Math.hypot(e.clientX - start.x, e.clientY - start.y) < DRAG_THRESHOLD) return;
        draggingRef.current = true;
        el.setPointerCapture?.(e.pointerId);
        el.classList.add("is-dragging");
        rectsRef.current = [...el.querySelectorAll<HTMLElement>("[data-pid]")].map((node) => ({
          id: node.dataset.pid!,
          r: node.getBoundingClientRect(),
        }));
      }
      lastPtRef.current = { x: e.clientX, y: e.clientY };
      if (rafRef.current === null) rafRef.current = requestAnimationFrame(flushDrag);
    },
    [flushDrag],
  );

  const endDrag = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (draggingRef.current) suppressClickRef.current = true;
    draggingRef.current = false;
    startRef.current = null;
    scrollRef.current?.classList.remove("is-dragging");
    if (bandRef.current) bandRef.current.hidden = true;
  }, []);

  const onClickCapture = useCallback((e: React.MouseEvent) => {
    if (!suppressClickRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    suppressClickRef.current = false;
  }, []);

  if (loading && !snap) return <Loader className="absolute inset-0" />;

  return (
    <div className={`gallery ${selecting ? "is-selecting" : ""}`}>
      <header className="gallery__head">
        <div className="gallery__heading">
          <h1>{t("gallery:title")}</h1>
          <p>
            {photos.length > 0
              ? t("gallery:photoCount", { count: photos.length })
              : t("gallery:subtitle")}
          </p>
        </div>
        <div className="gallery__tools">
          <label className="gallery__search">
            <Search size={15} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("gallery:searchPlaceholder")}
              spellCheck={false}
            />
          </label>
          <button
            className="gallery__refresh"
            onClick={reload}
            disabled={loading}
            title={t("gallery:rescan")}
            aria-label={t("gallery:rescan")}
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </header>

      {error ? <Banner>{error}</Banner> : null}

      {!error && photos.length === 0 ? <EmptyState roots={snap?.roots ?? []} /> : null}

      {!error && photos.length > 0 && filtered.length === 0 ? (
        <p className="gallery__none">{t("gallery:noMatch", { query })}</p>
      ) : null}

      {sections.length > 0 ? (
        <div className="gallery__main">
          <div
            className="gallery__scroll"
            ref={scrollRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onClickCapture={onClickCapture}
          >
            <div className="gallery__grid" ref={gridRef}>
              {sections.map((section) => (
                <SectionBlock
                  key={section.bucket}
                  section={section}
                  width={width}
                  selected={selected}
                  selecting={selecting}
                  recent={recent}
                  onToggle={toggle}
                  onToggleBucket={setMany}
                  onOpen={open}
                />
              ))}
            </div>
            <div ref={bandRef} className="gallery__band" hidden />
          </div>
          <Timeline sections={sections} scrollRef={scrollRef} onJump={jumpTo} />
        </div>
      ) : null}

      {selecting ? (
        <SelectionBar label={t("gallery:selectedCount", { count: selected.size })}>
          <SelectionBarButton onClick={clearSel}>
            <X size={15} /> {t("gallery:deselect")}
          </SelectionBarButton>
          <SelectionBarButton danger onClick={deleteSelected}>
            <Trash2 size={15} /> {t("gallery:delete")}
          </SelectionBarButton>
        </SelectionBar>
      ) : null}

      {activeIndex >= 0 ? (
        <Lightbox
          photos={filtered}
          index={activeIndex}
          onClose={() => setActiveId(null)}
          onNavigate={(i) => setActiveId(filtered[i]?.id ?? null)}
          onDelete={deleteActive}
        />
      ) : null}
    </div>
  );
}

function SectionBlock({
  section,
  width,
  selected,
  selecting,
  recent,
  onToggle,
  onToggleBucket,
  onOpen,
}: {
  section: Section;
  width: number;
  selected: Set<string>;
  selecting: boolean;
  recent: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onToggleBucket: (ids: string[], on: boolean) => void;
  onOpen: (p: Photo) => void;
}) {
  const { t, locale } = useI18n();
  const rows = useMemo(
    () => (width > 0 ? justify(section.items, width, ROW_HEIGHT, GAP) : []),
    [section.items, width],
  );

  const ids = useMemo(() => section.items.map((p) => p.id), [section.items]);
  const selCount = ids.reduce((n, id) => n + (selected.has(id) ? 1 : 0), 0);
  const allSel = selCount > 0 && selCount === ids.length;
  const someSel = selCount > 0 && !allSel;
  const month = formatBucket(section.bucket, locale);

  return (
    <section className="gallery__section" id={`bucket-${section.bucket}`}>
      <h2 className="gallery__month">
        <span
          role="checkbox"
          aria-checked={someSel ? "mixed" : allSel}
          aria-label={t("gallery:selectMonth", { month })}
          tabIndex={0}
          className={`gallery__check ${allSel ? "is-on" : ""} ${someSel ? "is-mixed" : ""}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onToggleBucket(ids, !allSel)}
        >
          <Check size={12} strokeWidth={3} />
        </span>
        {month}
      </h2>
      <div className="gallery__rows">
        {rows.map((row, i) => (
          <div className="gallery__row" key={i} style={{ gap: GAP }}>
            {row.map((tile) => (
              <PhotoTile
                key={tile.photo.id}
                photo={tile.photo}
                width={tile.width}
                height={tile.height}
                selected={selected.has(tile.photo.id)}
                selecting={selecting}
                isNew={recent.has(tile.photo.id)}
                onToggle={onToggle}
                onOpen={onOpen}
              />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

const PhotoTile = memo(function PhotoTile({
  photo,
  width,
  height,
  selected,
  selecting,
  isNew,
  onToggle,
  onOpen,
}: {
  photo: Photo;
  width: number;
  height: number;
  selected: boolean;
  selecting: boolean;
  isNew: boolean;
  onToggle: (id: string) => void;
  onOpen: (p: Photo) => void;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLButtonElement>(null);
  const visible = useInView(ref);
  const [loaded, setLoaded] = useState(false);
  return (
    <button
      ref={ref}
      data-pid={photo.id}
      className={`tile ${selected ? "is-selected" : ""} ${isNew ? "is-new" : ""}`}
      onClick={() => (selecting ? onToggle(photo.id) : onOpen(photo))}
      style={{ width, height }}
      title={photo.metadata.worldName ?? photo.fileName}
    >
      {visible ? (
        <img
          src={photo.thumb}
          alt={photo.fileName}
          decoding="async"
          className={loaded ? "is-loaded" : ""}
          onLoad={() => setLoaded(true)}
        />
      ) : null}
      <span
        role="checkbox"
        aria-checked={selected}
        aria-label={t("gallery:selectPhoto")}
        className={`tile__check ${selected ? "is-on" : ""}`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onToggle(photo.id);
        }}
      >
        <Check size={13} strokeWidth={3} />
      </span>
      {photo.metadata.worldName ? (
        <span className="tile__world">
          <Globe size={11} />
          <span className="truncate">{photo.metadata.worldName}</span>
        </span>
      ) : null}
    </button>
  );
});

function useInView(ref: React.RefObject<HTMLElement | null>): boolean {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (seen || !ref.current) return;
    const el = ref.current;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, seen]);
  return seen;
}

function useWidth(): [number, (el: HTMLElement | null) => void] {
  const [w, setW] = useState(0);
  const ro = useRef<ResizeObserver | null>(null);
  const ref = useCallback((el: HTMLElement | null) => {
    ro.current?.disconnect();
    if (!el) return;
    ro.current = new ResizeObserver((entries) => setW(entries[0].contentRect.width));
    ro.current.observe(el);
    setW(el.clientWidth);
  }, []);
  return [w, ref];
}

function EmptyState({ roots }: { roots: string[] }) {
  const { t } = useI18n();
  return (
    <div className="gallery__empty">
      <Images size={40} strokeWidth={1.4} />
      <h2>{t("gallery:empty.title")}</h2>
      <p>
        <Trans i18nKey="gallery:empty.body" components={{ code: <code /> }} />
      </p>
      {roots.length > 0 ? (
        <p className="gallery__roots">
          {t("gallery:empty.scanning")}{" "}
          {roots.map((r) => (
            <code key={r}>{r}</code>
          ))}
        </p>
      ) : null}
    </div>
  );
}
