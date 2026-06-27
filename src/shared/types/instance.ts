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
}
