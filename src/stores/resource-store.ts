import type { Dispatch, SetStateAction } from 'react';
import { logger } from '@/utils/logger';
import { getActiveAccountId, subscribeActiveAccount } from './account-scope';

type Listener<T> = (value: T | null) => void;

export interface ResourceStoreOptions {
  staleTime?: number;
  storeName?: string;
}

interface StoreState<T> {
  cache: T | null;
  inflight: Promise<T> | null;
  updatedAt: number;
}

interface EnsureOptions {
  force?: boolean;
  scopeId?: string | null;
}

interface SetOptions {
  stale?: boolean;
  scopeId?: string | null;
}

interface ClearOptions {
  scopeId?: string | null;
}

interface MarkStaleOptions {
  scopeId?: string | null;
}

const DEFAULT_SCOPE_KEY = '__no_active_account__';

export interface ResourceStoreDebugScope<T> {
  scopeId: string | null;
  cache: T | null;
  updatedAt: number;
  ageMs: number | null;
  stale: boolean;
  inflight: boolean;
  isActiveScope: boolean;
}

function scopeKey(scopeId: string | null): string {
  return scopeId ?? DEFAULT_SCOPE_KEY;
}

export abstract class ResourceStore<T> {
  private listeners = new Set<Listener<T>>();
  private states = new Map<string, StoreState<T>>();
  private activeAccountId: string | null = getActiveAccountId();
  protected staleTime: number;
  private instanceId = Math.random().toString(36).substring(2, 11);
  private storeName: string;

  constructor(options: ResourceStoreOptions = {}) {
    this.staleTime = options.staleTime ?? 60_000;
    this.storeName = options.storeName ?? this.constructor.name;

    logger.info('ResourceStore', `Created instance: ${this.instanceId} (${this.storeName})`);

    subscribeActiveAccount((accountId) => {
      this.activeAccountId = accountId;
      this.emit(this.getSnapshot());
    });
  }

  protected abstract load(scopeId: string | null): Promise<T>;

  /**
   * Return the cached value without triggering a fetch.
   */
  getSnapshot(scopeId: string | null = this.activeAccountId): T | null {
    const cache = this.getState(scopeId).cache;
    logger.debug('ResourceStore.getSnapshot', this.storeName, {
      instanceId: this.instanceId,
      scopeId,
      activeAccountId: this.activeAccountId,
      hasCache: cache !== null,
      allStates: Array.from(this.states.keys()),
    });
    return cache;
  }

  protected getCurrentScopeId(): string | null {
    return this.activeAccountId;
  }

  /**
   * Subscribe to changes. The listener is invoked immediately with the current snapshot.
   */
  subscribe(listener: Listener<T>): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Bind this store to a React state setter
   */
  bind(setter: Dispatch<SetStateAction<T | null>>): () => void {
    return this.subscribe((value) => setter(value));
  }

  /**
   * Ensure a fresh value exists, respecting the configured stale time unless forced.
   */
  async ensure(options: EnsureOptions = {}): Promise<T> {
    const hasExplicitScope = Object.prototype.hasOwnProperty.call(options, 'scopeId');
    const targetScopeId = hasExplicitScope ? options.scopeId ?? null : this.activeAccountId;
    const state = this.getState(targetScopeId);
    const force = options.force ?? false;

    if (!force && state.cache && !this.isStale(state)) {
      return state.cache;
    }

    if (state.inflight) {
      return state.inflight;
    }

    const inflight = this.load(targetScopeId)
      .then((value) => {
        this.set(value, { scopeId: targetScopeId });
        return value;
      })
      .finally(() => {
        state.inflight = null;
      });

    state.inflight = inflight;
    return inflight;
  }

  /**
   * Force a refresh regardless of stale time.
   */
  refresh(): Promise<T> {
    return this.ensure({ force: true });
  }

  /**
   * Write a new value into the cache and notify listeners.
   */
  set(value: T | null, options: SetOptions = {}): void {
    const scopeId = options.scopeId ?? this.activeAccountId;
    const state = this.getState(scopeId);

    logger.debug('ResourceStore.set', this.storeName, {
      instanceId: this.instanceId,
      value: value !== null ? '(data)' : 'null',
      scopeId,
      activeAccountId: this.activeAccountId,
      willEmit: scopeId === this.activeAccountId,
    });

    state.cache = value;
    state.updatedAt = value && !options.stale ? Date.now() : 0;

    // Emit to local listeners if this is the active scope
    if (scopeId === this.activeAccountId) {
      this.emit(value);
    }
  }

  /**
   * Clear the cache and notify listeners.
   */
  clear(options: ClearOptions = {}): void {
    const scopeId = options.scopeId ?? this.activeAccountId;
    this.set(null, { scopeId });
  }

  /**
   * Mark the current cached value as stale without clearing it.
   */
  markStale(options: MarkStaleOptions = {}): void {
    const scopeId = options.scopeId ?? this.activeAccountId;
    const state = this.getState(scopeId);
    if (state.cache) {
      state.updatedAt = 0;
    }
  }

  /**
   * Internal debug helper
   */
  debugScopes(): ResourceStoreDebugScope<T>[] {
    const scopes: ResourceStoreDebugScope<T>[] = [];

    for (const [rawKey, state] of this.states.entries()) {
      const scopeId = rawKey === DEFAULT_SCOPE_KEY ? null : rawKey;
      const isActiveScope =
        scopeId === this.activeAccountId ||
        (scopeId === null && this.activeAccountId === null);
      const updatedAt = state.updatedAt;
      const ageMs = updatedAt === 0 ? null : Date.now() - updatedAt;

      scopes.push({
        scopeId,
        cache: state.cache,
        updatedAt,
        ageMs,
        stale: this.isStale(state),
        inflight: state.inflight !== null,
        isActiveScope,
      });
    }

    const activeKey = scopeKey(this.activeAccountId);
    if (!this.states.has(activeKey)) {
      scopes.push({
        scopeId: this.activeAccountId ?? null,
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

  private isStale(state: StoreState<T>): boolean {
    if (!state.cache) {
      return true;
    }
    return Date.now() - state.updatedAt > this.staleTime;
  }

  private emit(value: T | null): void {
    logger.debug('ResourceStore.emit', this.storeName, {
      value: value !== null ? '(data)' : 'null',
      listenerCount: this.listeners.size,
    });
    for (const listener of this.listeners) {
      try {
        listener(value);
      } catch (error) {
        logger.error('ResourceStore', 'ResourceStore listener error', error);
      }
    }
  }

  private getState(scopeId: string | null): StoreState<T> {
    const key = scopeKey(scopeId);
    const existing = this.states.get(key);
    if (existing) {
      return existing;
    }

    const fresh: StoreState<T> = {
      cache: null,
      inflight: null,
      updatedAt: 0,
    };

    this.states.set(key, fresh);
    return fresh;
  }
}
