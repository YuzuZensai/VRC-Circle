import { contextBridge, ipcRenderer } from "electron";
import type { IpcRequests, IpcEvents } from "../shared/ipc";

type InvokeFn = <C extends keyof IpcRequests>(
  channel: C,
  ...args: Parameters<IpcRequests[C]>
) => ReturnType<IpcRequests[C]>;

export interface EventApi {
  on<C extends keyof IpcEvents>(channel: C, listener: (payload: IpcEvents[C]) => void): () => void;
}

const invoke = ((channel: string, ...args: unknown[]) =>
  ipcRenderer.invoke(channel, ...args)) as InvokeFn;

const events: EventApi = {
  on(channel, listener) {
    const wrapped = (_e: unknown, payload: unknown) => listener(payload as never);
    ipcRenderer.on(channel as string, wrapped);
    return () => ipcRenderer.removeListener(channel as string, wrapped);
  },
};

export interface VrcCircleApi {
  invoke: InvokeFn;
  events: EventApi;
  platform: NodeJS.Platform;
}

const api: VrcCircleApi = { invoke, events, platform: process.platform };

contextBridge.exposeInMainWorld("api", api);
