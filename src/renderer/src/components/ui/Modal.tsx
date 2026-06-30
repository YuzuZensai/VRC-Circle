import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "./Button";
import { useT } from "../../lib/i18n";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  icon?: ReactNode;
  children?: ReactNode;
  danger?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  confirmLoading?: boolean;
  confirmDisabled?: boolean;
  dismissible?: boolean;
};

export function Modal({
  open,
  onClose,
  title,
  icon,
  children,
  danger,
  confirmLabel,
  cancelLabel,
  onConfirm,
  confirmLoading,
  confirmDisabled,
  dismissible = true,
}: ModalProps) {
  const t = useT();
  const close = dismissible ? onClose : () => {};
  useEffect(() => {
    if (!open || !dismissible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, dismissible, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        aria-hidden
        tabIndex={-1}
        onClick={close}
        className="absolute inset-0 animate-[fade-in_var(--dur)_var(--ease-out)_both] bg-[color-mix(in_srgb,var(--surface)_30%,#000_55%)] backdrop-blur-[2px]"
      />
      <div className="animate-[pop-in_var(--dur)_var(--ease-out)_both] relative w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.5)]">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2
            className={`flex items-center gap-2 text-[15px] font-semibold ${
              danger ? "text-danger" : "text-text"
            }`}
          >
            {icon}
            {title}
          </h2>
          {dismissible ? (
            <button
              onClick={onClose}
              aria-label="Close"
              className="grid size-7 shrink-0 place-items-center rounded-md text-faint transition-colors hover:bg-surface-hover hover:text-text"
            >
              <X size={16} />
            </button>
          ) : null}
        </div>

        <div className="text-[13px] text-muted">{children}</div>

        {onConfirm ? (
          <div className="mt-5 flex justify-end gap-2.5">
            <Button variant="ghost" onClick={onClose} disabled={confirmLoading || !dismissible}>
              {cancelLabel ?? t("common:cancel")}
            </Button>
            <Button
              variant={danger ? "danger" : "primary"}
              onClick={onConfirm}
              loading={confirmLoading}
              disabled={confirmDisabled}
            >
              {confirmLabel}
            </Button>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
