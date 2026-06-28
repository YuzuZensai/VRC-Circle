import type {
  Instance,
  CreateInstanceInput,
  CreateInstanceType,
} from "../../shared/types/instance";
import { toInstance } from "./mappers";
import { cachedRead } from "./cachedRead";
import { requireActiveClient } from "./client";
import { currentUser } from "./userService";
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

type SdkType = "public" | "friends" | "hidden" | "private";

function mapCreateType(type: CreateInstanceType): { type: SdkType; canRequestInvite?: boolean } {
  switch (type) {
    case "public":
      return { type: "public" };
    case "friends+":
      return { type: "hidden" };
    case "friends":
      return { type: "friends" };
    case "invite":
      return { type: "private" };
    case "invite+":
      return { type: "private", canRequestInvite: true };
  }
}

export async function createInstance(input: CreateInstanceInput): Promise<Instance> {
  const vrc = requireActiveClient();
  const sdk = mapCreateType(input.type);
  const ownerId = sdk.type === "public" ? undefined : (await currentUser()).id;
  const { data } = await vrc.createInstance({
    body: {
      worldId: input.worldId,
      region: input.region,
      type: sdk.type,
      ...(ownerId ? { ownerId } : {}),
      ...(sdk.canRequestInvite ? { canRequestInvite: true } : {}),
    },
    throwOnError: true,
  });
  return toInstance(data);
}

export async function inviteSelf(worldId: string, instanceId: string): Promise<void> {
  const vrc = requireActiveClient();
  await vrc.inviteMyselfTo({ path: { worldId, instanceId }, throwOnError: true });
}
