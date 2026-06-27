import { useCopied } from "../../lib/useCopied";

export function CodeBlock({
  value,
  copyValue,
  className = "",
}: {
  value: string;
  copyValue?: string;
  className?: string;
}) {
  const [copied, copy] = useCopied();
  return (
    <div className={`relative ${className}`}>
      <button
        className="absolute right-2 top-2 rounded border border-border bg-surface px-2 py-0.5 text-[10.5px] font-semibold text-muted transition-colors hover:text-accent"
        onClick={() => copy(copyValue ?? value)}
      >
        {copied ? "Copied!" : "Copy"}
      </button>
      <pre className="max-h-72 overflow-auto rounded-md border border-border bg-surface-2 p-3 font-mono text-[11px] leading-relaxed text-muted">
        {value}
      </pre>
    </div>
  );
}
