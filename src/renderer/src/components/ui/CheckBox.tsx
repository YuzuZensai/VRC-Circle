import { Check, Minus } from "lucide-react";

export function CheckBox({
  checked,
  indeterminate,
  onChange,
  "aria-label": ariaLabel,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  "aria-label"?: string;
}) {
  const on = checked || indeterminate;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      aria-label={ariaLabel}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className={`flex size-5 items-center justify-center rounded-md border transition-colors ${
        on ? "border-accent bg-accent text-on-accent" : "border-border bg-surface-2/80 hover:border-accent"
      }`}
    >
      {indeterminate ? <Minus size={13} /> : checked ? <Check size={13} /> : null}
    </button>
  );
}
