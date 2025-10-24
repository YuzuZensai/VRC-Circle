import { invoke } from '@tauri-apps/api/core';
import type { AppSettings } from '../types/bindings';
import { parseVRCError } from '../types/errors';

export class SettingsService {
  static async getSettings(): Promise<AppSettings> {
    try {
      return await invoke<AppSettings>('get_settings');
    } catch (error) {
      throw parseVRCError(error);
    }
  }

  static async saveSettings(settings: AppSettings): Promise<void> {
    try {
      return await invoke<void>('save_settings', { settings });
    } catch (error) {
      throw parseVRCError(error);
    }
  }

  static async getDeveloperMode(): Promise<boolean> {
    try {
      return await invoke<boolean>('get_developer_mode');
    } catch (error) {
      throw parseVRCError(error);
    }
  }

  static async setDeveloperMode(enabled: boolean): Promise<void> {
    try {
      return await invoke<void>('set_developer_mode', { enabled });
    } catch (error) {
      throw parseVRCError(error);
    }
  }
}
