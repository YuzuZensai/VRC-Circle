import type { InstanceRegion } from "./instance";

export type PreferredRegion = InstanceRegion | "auto";

export interface AppConfig {
  version: string;
  gamePath: string | null;
  detectedGamePath: string | null;
  preferredRegion: PreferredRegion;
}

export interface RegionPing {
  region: InstanceRegion;
  ms: number | null;
}
