import type { ButtonHTMLAttributes, ReactNode } from "react";
import { createPortal } from "react-dom";

export function SelectionBar({ label, children }: { label: ReactNode; children: ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="selection-bar" role="toolbar">
      <span className="selection-bar__count">{label}</span>
      {children}
    </div>,
    document.body,
  );
}

export function SelectionBarButton({
  danger,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { danger?: boolean }) {
  return (
    <button
      {...props}
      className={`selection-bar__button${danger ? " is-danger" : ""}${className ? ` ${className}` : ""}`}
    />
  );
}
