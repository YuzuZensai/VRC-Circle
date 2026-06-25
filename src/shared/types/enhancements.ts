export type EnhancementId = "linux-screenshot-symlink";

export type OsPlatform = "linux" | "win32" | "darwin";

export interface EnhancementDetail {
  key: string;
  path?: string;
}

export interface EnhancementState {
  id: EnhancementId;
  enabled: boolean;
  detail?: EnhancementDetail;
  resolvedPath?: string;
}

export interface EnhancementsSnapshot {
  platform: OsPlatform;
  states: EnhancementState[];
}
