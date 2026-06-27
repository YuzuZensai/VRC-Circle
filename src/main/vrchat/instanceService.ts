import type { Instance } from "../../shared/types/instance";
import { toInstance } from "./mappers";
import { cachedRead } from "./cachedRead";
import { cacheKeys, policies } from "../cache/policies";

export async function getInstance(worldId: string, instanceId: string): Promise<Instance> {
  return cachedRead(
    cacheKeys.instance(`${worldId}:${instanceId}`),
    policies.instance,
    async (vrc) => {
      const { data } = await vrc.getInstance({ path: { worldId, instanceId }, throwOnError: true });
      return toInstance(data);
    },
  );
}
