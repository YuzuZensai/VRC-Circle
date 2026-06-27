import { app } from "electron";
import { readFileSync } from "node:fs";
import { KeyvFile } from "keyv-file";
import { VRChat } from "vrchat";
import { activeId, pendingFile, sessionFile } from "../accounts/store";

const APP_META = {
  name: "VRC-Circle",
  version: app.getVersion(),
  contact: "contact@kirameki.cafe",
} as const;

const clients = new Map<string, VRChat>();
let loginClient: VRChat | null = null;

function build(filename: string): VRChat {
  const store = new KeyvFile({ filename });
  return new VRChat({
    application: APP_META,
    keyv: store as unknown as ConstructorParameters<typeof VRChat>[0]["keyv"],
    authentication: { optimistic: false },
  });
}

export function getClient(id: string): VRChat {
  let c = clients.get(id);
  if (!c) {
    c = build(sessionFile(id));
    clients.set(id, c);
  }
  return c;
}

export function getActiveClient(): VRChat | null {
  const id = activeId();
  return id ? getClient(id) : null;
}

export function requireActiveClient(): VRChat {
  const vrc = getActiveClient();
  if (!vrc) throw { status: 401, message: "No active account" };
  return vrc;
}

export function createLoginClient(): VRChat {
  loginClient = build(pendingFile());
  return loginClient;
}

export function clearLoginClient(): void {
  loginClient = null;
}

export function dropClient(id: string): void {
  clients.delete(id);
}

export function closeClients(): void {
  for (const client of clients.values()) client.pipeline.close();
  loginClient?.pipeline.close();
}

interface SessionCookie {
  name: string;
  value: string;
}

function readAuthCookieFromSession(filename: string): string | null {
  try {
    const raw = JSON.parse(readFileSync(filename, "utf8")) as {
      cache?: [string, { value?: string }][];
    };
    const entry = raw.cache?.find(([k]) => k === "keyv:cookies")?.[1];
    if (!entry?.value) return null;
    const outer = JSON.parse(entry.value) as { value?: SessionCookie[] };
    const auth = outer.value?.find((c) => c.name === "auth");
    return auth?.value ?? null;
  } catch {
    return null;
  }
}

export async function getPipelineAuthToken(vrc: VRChat): Promise<string | null> {
  const id = activeId();
  if (id) {
    const fromDisk = readAuthCookieFromSession(sessionFile(id));
    if (fromDisk) return fromDisk;
  }
  const getCookies = (vrc as unknown as { getCookies?: () => Promise<SessionCookie[]> }).getCookies;
  const cookies = (await getCookies?.()) ?? [];
  return cookies.find((c) => c.name === "auth")?.value ?? null;
}
