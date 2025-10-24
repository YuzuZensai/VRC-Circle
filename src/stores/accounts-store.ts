import type { StoredAccount, User } from '@/types/bindings';
import { AccountService } from '@/services/account';
import { logger } from '@/utils/logger';
import { registerSingleton } from './singleton-registry';

type AccountsListener = (value: StoredAccount[] | null) => void;

interface EnsureOptions {
  force?: boolean;
}

interface SetOptions {
  stale?: boolean;
}

export class AccountsStore {
  private listeners = new Set<AccountsListener>();
  private cache: StoredAccount[] | null = null;
  private inflight: Promise<StoredAccount[]> | null = null;
  private updatedAt = 0;
  private readonly staleTime: number;

  constructor(options: { staleTime?: number } = {}) {
    this.staleTime = options.staleTime ?? 60_000;
  }

  getSnapshot(): StoredAccount[] | null {
    return this.cache;
  }

  subscribe(listener: AccountsListener): () => void {
    this.listeners.add(listener);
    listener(this.cache);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async ensure(options: EnsureOptions = {}): Promise<StoredAccount[]> {
    const force = options.force ?? false;
    if (!force && this.cache && !this.isStale()) {
      return this.cache;
    }

    if (this.inflight) {
      return this.inflight;
    }

    this.inflight = AccountService.getAllAccounts()
      .then((accounts) => {
        this.set(accounts);
        return accounts;
      })
      .finally(() => {
        this.inflight = null;
      });

    return this.inflight;
  }

  refresh(): Promise<StoredAccount[]> {
    return this.ensure({ force: true });
  }

  set(value: StoredAccount[] | null, options: SetOptions = {}): void {
    this.cache = value;
    this.updatedAt = value && !options.stale ? Date.now() : 0;
    this.emit(value);
  }

  clear(): void {
    this.set(null);
  }

  async saveFromUser(user: User): Promise<void> {
    await AccountService.saveCurrentAccount(user);
    await this.refresh();
  }

  async removeAccount(userId: string): Promise<void> {
    await AccountService.removeAccount(userId);
    if (this.cache) {
      this.set(this.cache.filter((account) => account.user_id !== userId));
    }
  }

  async clearAll(): Promise<void> {
    await AccountService.clearAllAccounts();
    this.clear();
  }

  private isStale(): boolean {
    if (!this.cache) {
      return true;
    }
    return Date.now() - this.updatedAt > this.staleTime;
  }

  private emit(value: StoredAccount[] | null): void {
    for (const listener of this.listeners) {
      try {
        listener(value);
      } catch (error) {
        logger.error('AccountsStore', 'AccountsStore listener error', error);
      }
    }
  }
}

export const accountsStore = registerSingleton('accounts', () => new AccountsStore());
