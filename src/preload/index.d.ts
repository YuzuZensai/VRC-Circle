import type { VrcCircleApi } from "./index";

declare global {
  interface Window {
    api: VrcCircleApi;
  }
}

export {};
