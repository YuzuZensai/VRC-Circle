import { Check } from "lucide-react";

export function Toggle({
  checked,
  onChange,
  disabled,
  icon,
  className = "",
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  icon?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-10 shrink-0 rounded-full border-0 p-0 transition-colors ${
        checked ? "bg-accent" : "bg-surface-hover"
      } ${disabled ? "cursor-not-allowed opacity-50" : ""} ${className}`}
    >
      <span
        className="absolute left-0.5 top-0.5 flex size-5 items-center justify-center rounded-full shadow transition-transform"
        style={{
          background: "var(--on-accent)",
          transform: checked ? "translateX(16px)" : "translateX(0)",
        }}
      >
        {icon && checked ? <Check size={12} className="text-accent" /> : null}
      </span>
    </button>
  );
}
