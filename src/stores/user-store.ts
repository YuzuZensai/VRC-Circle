import { ResourceStore, type ResourceStoreDebugScope } from './resource-store';
import { setActiveAccountId, subscribeActiveAccount } from './account-scope';
import { VRChatService } from '@/services/vrchat';
import type { LimitedUserFriend, User } from '@/types/bindings';
import { logger } from '@/utils/logger';
import { registerSingleton } from './singleton-registry';

type FriendListener = (value: LimitedUserFriend[] | null) => void;

interface FriendsState {
  cache: LimitedUserFriend[] | null;
  inflight: Promise<LimitedUserFriend[]> | null;
  updatedAt: number;
}

interface FriendsEnsureOptions {
  force?: boolean;
  scopeId?: string | null;
}

interface FriendsSetOptions {
  stale?: boolean;
  scopeId?: string | null;
}

const FRIEND_SCOPE_DEFAULT = '__no_active_account__';

function friendsScopeKey(scopeId: string | null): string {
  return scopeId ?? FRIEND_SCOPE_DEFAULT;
}

class UserStore extends ResourceStore<User> {
  private readonly friendsStaleTime = 30_000;
  private friendListeners = new Set<FriendListener>();
  private friendStates = new Map<string, FriendsState>();

  constructor(options: { staleTime?: number } = {}) {
    super({ ...options, storeName: 'user' });

    subscribeActiveAccount(() => {
      this.emitFriends(this.getFriendsSnapshot());
    });
  }

  protected async load(scopeId: string | null): Promise<User> {
    const user = await VRChatService.getCurrentUser();
    if (scopeId !== user.id) {
      setActiveAccountId(user.id);
    }
    return user;
  }

  set(value: User | null, options: { stale?: boolean; scopeId?: string | null } = {}): void {
    const scopeId =
      options.scopeId !== undefined
        ? options.scopeId
        : value
          ? value.id
          : this.getCurrentScopeId();

    // Only set active account ID if we're setting the current scope or if scopeId is explicitly provided
    if (options.scopeId === undefined && value && scopeId === this.getCurrentScopeId()) {
      setActiveAccountId(scopeId);
    }

    super.set(value, { ...options, scopeId });
  }

  // ===========================================================================
  // Friends Management
  // ===========================================================================

  getFriendsSnapshot(scopeId: string | null = this.getCurrentScopeId()): LimitedUserFriend[] | null {
    const state = this.friendStates.get(friendsScopeKey(scopeId));
    return state ? state.cache : null;
  }

  subscribeFriends(listener: FriendListener): () => void {
    this.friendListeners.add(listener);
    listener(this.getFriendsSnapshot());
    return () => {
      this.friendListeners.delete(listener);
    };
  }

  async ensureFriends(options: FriendsEnsureOptions = {}): Promise<LimitedUserFriend[]> {
    const hasExplicitScope = Object.prototype.hasOwnProperty.call(options, 'scopeId');
    const targetScopeId = hasExplicitScope ? options.scopeId ?? null : this.getCurrentScopeId();
    const state = this.getOrCreateFriendsState(targetScopeId);
    const force = options.force ?? false;

    if (!force && state.cache && !this.isFriendsStale(state)) {
      return state.cache;
    }

    if (state.inflight) {
      return state.inflight;
    }

    const inflight = VRChatService.getOnlineFriends()
      .then((friends) => {
        this.setFriends(friends, { scopeId: targetScopeId });
        return friends;
      })
      .finally(() => {
        state.inflight = null;
      });

    state.inflight = inflight;
    return inflight;
  }

  refreshFriends(options: FriendsEnsureOptions = {}): Promise<LimitedUserFriend[]> {
    return this.ensureFriends({ ...options, force: true });
  }

  setFriends(
    value: LimitedUserFriend[] | null,
    options: FriendsSetOptions = {},
  ): void {
    const scopeId = options.scopeId ?? this.getCurrentScopeId();
    const state = this.getOrCreateFriendsState(scopeId);

    state.cache = value;
    state.updatedAt = value && !options.stale ? Date.now() : 0;

    if (friendsScopeKey(scopeId) === friendsScopeKey(this.getCurrentScopeId())) {
      this.emitFriends(value);
    }
  }

  clearFriends(options: { scopeId?: string | null } = {}): void {
    const scopeId = options.scopeId ?? this.getCurrentScopeId();
    const key = friendsScopeKey(scopeId);
    const state = this.friendStates.get(key);

    if (state) {
      state.cache = null;
      state.updatedAt = 0;
      state.inflight = null;
    } else {
      this.friendStates.set(key, {
        cache: null,
        inflight: null,
        updatedAt: 0,
      });
    }

    if (key === friendsScopeKey(this.getCurrentScopeId())) {
      this.emitFriends(null);
    }
  }

  markFriendsStale(options: { scopeId?: string | null } = {}): void {
    const scopeId = options.scopeId ?? this.getCurrentScopeId();
    const state = this.friendStates.get(friendsScopeKey(scopeId));
    if (state && state.cache) {
      state.updatedAt = 0;
    }
  }

  debugFriendScopes(): ResourceStoreDebugScope<LimitedUserFriend[]>[] {
    const scopes: ResourceStoreDebugScope<LimitedUserFriend[]>[] = [];
    const activeKey = friendsScopeKey(this.getCurrentScopeId());

    for (const [key, state] of this.friendStates.entries()) {
      const scopeId = key === FRIEND_SCOPE_DEFAULT ? null : key;
      const ageMs = state.updatedAt === 0 ? null : Date.now() - state.updatedAt;
      scopes.push({
        scopeId,
        cache: state.cache,
        updatedAt: state.updatedAt,
        ageMs,
        stale: this.isFriendsStale(state),
        inflight: state.inflight !== null,
        isActiveScope: key === activeKey,
      });
    }

    if (!this.friendStates.has(activeKey)) {
      scopes.push({
        scopeId: this.getCurrentScopeId(),
        cache: null,
        updatedAt: 0,
        ageMs: null,
        stale: true,
        inflight: false,
        isActiveScope: true,
      });
    }

    scopes.sort((a, b) => {
      if (a.isActiveScope && !b.isActiveScope) return -1;
      if (!a.isActiveScope && b.isActiveScope) return 1;
      const nameA = a.scopeId ?? '';
      const nameB = b.scopeId ?? '';
      return nameA.localeCompare(nameB);
    });

    return scopes;
  }

  private getOrCreateFriendsState(scopeId: string | null): FriendsState {
    const key = friendsScopeKey(scopeId);
    const existing = this.friendStates.get(key);
    if (existing) {
      return existing;
    }

    const fresh: FriendsState = {
      cache: null,
      inflight: null,
      updatedAt: 0,
    };

    this.friendStates.set(key, fresh);
    return fresh;
  }

  private isFriendsStale(state: FriendsState): boolean {
    if (!state.cache) {
      return true;
    }
    return Date.now() - state.updatedAt > this.friendsStaleTime;
  }

  private emitFriends(value: LimitedUserFriend[] | null): void {
    for (const listener of this.friendListeners) {
      try {
        listener(value);
      } catch (error) {
        logger.error('UserStore', 'UserStore friends listener error', error);
      }
    }
  }

}

export const userStore = registerSingleton('user', () => new UserStore());

// NOTE: Store Studio attachment is handled by `singleton-registry`. Do not
// attempt to read from `window.opener` or create new instances here.
