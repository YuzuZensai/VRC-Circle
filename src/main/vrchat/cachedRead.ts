import type { VRChat } from "vrchat";
import type { CachePolicy } from "../cache/cache";
import { requireActiveClient } from "./client";
import { userCache } from "./userService";

export function cachedRead<T>(
  key: string,
  policy: CachePolicy,
  load: (vrc: VRChat) => Promise<T>,
): Promise<T> {
  const vrc = requireActiveClient();
  return userCache.get(key, policy, () => load(vrc));
}
