import { invoke } from '@tauri-apps/api/core';
import type { User, StoredAccount } from '../types/bindings';
import { parseVRCError } from '../types/errors';

export class AccountService {
  static async saveCurrentAccount(user: User): Promise<void> {
    try {
      return await invoke<void>('save_current_account', { user });
    } catch (error) {
      throw parseVRCError(error);
    }
  }

  static async getAllAccounts(): Promise<StoredAccount[]> {
    try {
      return await invoke<StoredAccount[]>('get_all_accounts');
    } catch (error) {
      throw parseVRCError(error);
    }
  }

  static async switchAccount(userId: string): Promise<User> {
    try {
      return await invoke<User>('switch_account', { userId });
    } catch (error) {
      throw parseVRCError(error);
    }
  }

  static async removeAccount(userId: string): Promise<void> {
    try {
      return await invoke<void>('remove_account', { userId });
    } catch (error) {
      throw parseVRCError(error);
    }
  }

  static async clearAllAccounts(): Promise<void> {
    try {
      return await invoke<void>('clear_all_accounts');
    } catch (error) {
      throw parseVRCError(error);
    }
  }

  static async loadLastAccount(): Promise<User | null> {
    try {
      return await invoke<User | null>('load_last_account');
    } catch (error) {
      throw parseVRCError(error);
    }
  }
}
