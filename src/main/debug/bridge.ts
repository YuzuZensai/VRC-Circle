import { userCache } from "../vrchat/userService";
import { logger, onLog } from "./logger";
import { onWsEvent } from "./wsLog";
import { broadcast } from "../windows";

export function startDebugBridge(): void {
  onLog((entry) => broadcast("debug:log", entry));
  onWsEvent((entry) => broadcast("ws:event", entry));

  let timer: NodeJS.Timeout | null = null;
  const push = (): void => {
    timer = null;
    broadcast("debug:cache", { cache: userCache.entries(), stats: userCache.stats() });
  };

  userCache.onChange((ev) => {
    if (ev.type !== "hit") logger.debug("cache", ev.key ? `${ev.type} ${ev.key}` : ev.type);
    if (timer) return;
    timer = setTimeout(push, 120);
    timer.unref?.();
  });
}
