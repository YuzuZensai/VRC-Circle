export interface Instance {
  id: string;
  location: string;
  worldId: string;
  instanceId: string;
  type: string;
  region?: string;
  ownerId?: string;
  userCount: number;
  capacity: number;
  recommendedCapacity?: number;
  full: boolean;
  queueEnabled: boolean;
  queueSize: number;
  secureName?: string;
  shortName?: string | null;
}

export type CreateInstanceType = "public" | "friends+" | "friends" | "invite" | "invite+";
export type InstanceRegion = "us" | "use" | "eu" | "jp";

export interface CreateInstanceInput {
  worldId: string;
  type: CreateInstanceType;
  region: InstanceRegion;
}
