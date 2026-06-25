import { CircleDot } from "lucide-react";

export function Loader({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <div className={`boot ${className}`}>
      <span className="boot__mark" aria-hidden>
        <CircleDot size={size} />
      </span>
    </div>
  );
}
