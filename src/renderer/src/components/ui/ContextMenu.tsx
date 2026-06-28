import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export interface ContextMenuItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

export interface ContextMenuSeparator {
  separator: true;
}

export type ContextMenuEntry = ContextMenuItem | ContextMenuSeparator;

function isSeparator(entry: ContextMenuEntry): entry is ContextMenuSeparator {
  return "separator" in entry;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuEntry[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });

  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    setPos({
      left: Math.min(x, window.innerWidth - width - 8),
      top: Math.min(y, window.innerHeight - height - 8),
    });
  }, [x, y]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={menuRef}
      style={{ position: "fixed", left: pos.left, top: pos.top }}
      className="animate-rise z-[200] min-w-[180px] origin-top-left rounded-DEFAULT border border-border bg-surface p-1.5 shadow-[var(--shadow-2)]"
    >
      <div className="flex flex-col gap-px">
        {items.map((entry, i) =>
          isSeparator(entry) ? (
            <div key={i} className="mx-0.5 my-1 h-px bg-border" />
          ) : (
            <button
              key={i}
              onClick={() => {
                entry.onClick();
                onClose();
              }}
              disabled={entry.disabled}
              className={[
                "flex w-full items-center gap-2.5 rounded-sm px-2.5 py-[7px] text-left text-[12.5px] font-semibold transition-[background,color] duration-[var(--dur)] ease-[var(--ease)] disabled:cursor-default disabled:opacity-40",
                entry.danger
                  ? "text-danger hover:bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] hover:text-danger"
                  : "text-muted hover:bg-surface-2 hover:text-text",
              ].join(" ")}
            >
              {entry.icon ? <span className="shrink-0">{entry.icon}</span> : null}
              {entry.label}
            </button>
          ),
        )}
      </div>
    </div>,
    document.body,
  );
}
