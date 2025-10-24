import { ResourceStore } from './resource-store';
import { VRChatService } from '@/services/vrchat';
import type { LimitedAvatar } from '@/types/bindings';
import { registerSingleton } from './singleton-registry';

class AvatarsStore extends ResourceStore<LimitedAvatar[]> {
  constructor() {
    super({ staleTime: 5 * 60_000, storeName: 'avatars' });
  }
  protected async load(_scopeId: string | null): Promise<LimitedAvatar[]> {
    return VRChatService.getUploadedAvatars();
  }
}

export const avatarsStore = registerSingleton('avatars', () => new AvatarsStore());

