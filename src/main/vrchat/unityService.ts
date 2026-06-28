import type { UnityStatus } from "../../shared/types/unity";
import { cachedRead } from "./cachedRead";
import { cacheKeys, policies } from "../cache/policies";
import { getActiveClient } from "./client";
import { userCache } from "./userService";
import { hubInstalled, editorRoot, installedVersions } from "../game/unity";

async function requiredUnityVersion(): Promise<string | null> {
  if (!getActiveClient()) return null;
  try {
    return await cachedRead(cacheKeys.apiConfig(), policies.apiConfig, async (vrc) => {
      const { data } = await vrc.getConfig({ throwOnError: true });
      return data.sdkUnityVersion ?? null;
    });
  } catch {
    return null;
  }
}

async function installUrl(version: string): Promise<string | null> {
  try {
    return await userCache.get(
      cacheKeys.unityChangeset(version),
      policies.unityChangeset,
      async () => {
        const res = await fetch(
          `https://services.api.unity.com/unity/editor/release/v1/releases?version=${version}`,
        );
        if (!res.ok) return null;
        const body = (await res.json()) as { results?: { unityHubDeepLink?: string }[] };
        return body.results?.[0]?.unityHubDeepLink ?? null;
      },
    );
  } catch {
    return null;
  }
}

export async function unityStatus(): Promise<UnityStatus> {
  const installed = installedVersions();
  const required = await requiredUnityVersion();

  let match: UnityStatus["match"];
  if (!required) match = "unknown";
  else if (installed.length === 0) match = "no-editor";
  else if (installed.includes(required)) match = "ok";
  else match = "missing";

  const url = required && match !== "ok" ? await installUrl(required) : null;

  return {
    hubInstalled: hubInstalled(),
    editorRoot: editorRoot(),
    installedVersions: installed,
    requiredVersion: required,
    installUrl: url,
    match,
  };
}
