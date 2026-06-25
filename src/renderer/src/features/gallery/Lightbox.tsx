import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FolderOpen,
  Globe,
  Trash2,
  User,
  X,
} from "lucide-react";
import type { Photo } from "../../../../shared/types/gallery";
import { api } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import { useNav } from "../navigation/NavContext";
import { formatBytes } from "./format";
import { formatDateTime } from "../../lib/format";

interface Props {
  photos: Photo[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
  onDelete: () => void | Promise<void>;
}

export function Lightbox({ photos, index, onClose, onNavigate, onDelete }: Props) {
  const { t, locale } = useI18n();
  const nav = useNav();
  const photo = photos[index];

  const prev = () => onNavigate((index - 1 + photos.length) % photos.length);
  const next = () => onNavigate((index + 1) % photos.length);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    if (photos.length < 2) return;
    const n = photos.length;
    const seen = new Set<string>([photos[index]?.id]);
    const imgs: HTMLImageElement[] = [];
    for (const o of [1, -1, 2, -2]) {
      const p = photos[(((index + o) % n) + n) % n];
      if (!p || seen.has(p.id)) continue;
      seen.add(p.id);
      const img = new Image();
      img.src = p.src;
      imgs.push(img);
    }
    return () => imgs.forEach((img) => (img.src = ""));
  }, [index, photos]);

  if (!photo) return null;
  const m = photo.metadata;

  return createPortal(
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={photo.fileName}>
      <button aria-hidden tabIndex={-1} className="lightbox__scrim" onClick={onClose} />

      <button
        className="lightbox__close"
        onClick={onClose}
        aria-label={t("gallery:lightbox.close")}
      >
        <X size={20} />
      </button>

      {photos.length > 1 ? (
        <>
          <button
            className="lightbox__arrow lightbox__arrow--left"
            onClick={prev}
            aria-label={t("gallery:lightbox.previous")}
          >
            <ChevronLeft size={26} />
          </button>
          <button
            className="lightbox__arrow lightbox__arrow--right"
            onClick={next}
            aria-label={t("gallery:lightbox.next")}
          >
            <ChevronRight size={26} />
          </button>
        </>
      ) : null}

      <div className="lightbox__body">
        <LightboxImage key={photo.id} photo={photo} />

        <aside className="lightbox__meta">
          <h3 className="lightbox__title" title={photo.fileName}>
            {photo.fileName}
          </h3>

          <dl className="lightbox__facts">
            <Fact label={t("gallery:lightbox.taken")}>
              {formatDateTime(m.takenAt ?? photo.modifiedAt, locale)}
            </Fact>
            {m.width && m.height ? (
              <Fact label={t("gallery:lightbox.resolution")}>
                {m.width} × {m.height}
              </Fact>
            ) : null}
            <Fact label={t("gallery:lightbox.size")}>{formatBytes(photo.sizeBytes)}</Fact>
            {m.author ? (
              <Fact label={t("gallery:lightbox.photographer")}>
                <button
                  className="lightbox__worldlink"
                  disabled={!m.authorId}
                  onClick={() => m.authorId && (onClose(), nav.openUser(m.authorId))}
                >
                  <User size={13} />
                  <span className="truncate">{m.author}</span>
                </button>
              </Fact>
            ) : null}
            {m.worldName ? (
              <Fact label={t("gallery:lightbox.world")}>
                <button
                  className="lightbox__worldlink"
                  disabled={!m.worldId}
                  onClick={() => m.worldId && (onClose(), nav.openWorld(m.worldId))}
                >
                  <Globe size={13} />
                  <span className="truncate">{m.worldName}</span>
                </button>
              </Fact>
            ) : null}
          </dl>

          <div className="lightbox__actions">
            <button onClick={() => void api.gallery.openExternal(photo.id)}>
              <ExternalLink size={14} /> {t("gallery:lightbox.open")}
            </button>
            <button onClick={() => void api.gallery.reveal(photo.id)}>
              <FolderOpen size={14} /> {t("gallery:lightbox.reveal")}
            </button>
            <button className="is-danger" onClick={() => void onDelete()}>
              <Trash2 size={14} /> {t("gallery:lightbox.delete")}
            </button>
          </div>

          <p className="lightbox__counter">
            {t("gallery:lightbox.counter", { current: index + 1, total: photos.length })}
          </p>
        </aside>
      </div>
    </div>,
    document.body,
  );
}

function LightboxImage({ photo }: { photo: Photo }) {
  const [loaded, setLoaded] = useState(false);
  const { width, height } = photo.metadata;
  if (!width || !height) {
    return (
      <div className="lightbox__stage">
        <img src={photo.src} alt={photo.fileName} className="lightbox__img" />
      </div>
    );
  }
  return (
    <div className="lightbox__stage">
      <div className="lightbox__frame" style={{ aspectRatio: `${width} / ${height}` }}>
        <img
          src={photo.thumb}
          alt=""
          aria-hidden
          className="lightbox__layer lightbox__layer--thumb"
        />
        <img
          src={photo.src}
          alt={photo.fileName}
          decoding="async"
          className={`lightbox__layer lightbox__layer--full ${loaded ? "is-loaded" : ""}`}
          onLoad={() => setLoaded(true)}
        />
      </div>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="lightbox__fact">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
