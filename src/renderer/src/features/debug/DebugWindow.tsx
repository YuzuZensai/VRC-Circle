import { DebugPanel } from "./DebugPanel";

export function DebugWindow() {
  return (
    <div className="h-screen overflow-hidden bg-bg p-5 text-text">
      <DebugPanel />
    </div>
  );
}
