import { ResourceStore } from './resource-store';
import { VRChatService } from '@/services/vrchat';
import type { LimitedWorld } from '@/types/bindings';
import { registerSingleton } from './singleton-registry';

class WorldsStore extends ResourceStore<LimitedWorld[]> {
  constructor() {
    super({ staleTime: 5 * 60_000, storeName: 'worlds' });
  }
  protected async load(_scopeId: string | null): Promise<LimitedWorld[]> {
    return VRChatService.getUploadedWorlds();
  }
}

export const worldsStore = registerSingleton('worlds', () => new WorldsStore());
