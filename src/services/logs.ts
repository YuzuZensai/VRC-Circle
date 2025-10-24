import { invoke } from '@tauri-apps/api/core';
import { parseVRCError } from '../types/errors';
import type { LogEntry as BackendLogEntry } from '../types/bindings';
import type { LogEntry as FrontendLogEntry } from '../utils/logger';

export type CombinedLogEntry = BackendLogEntry | FrontendLogEntry;

export class LogsService {
  static async getBackendLogs(): Promise<BackendLogEntry[]> {
    try {
      return await invoke<BackendLogEntry[]>('get_backend_logs');
    } catch (error) {
      throw parseVRCError(error);
    }
  }

  static async clearBackendLogs(): Promise<void> {
    try {
      return await invoke<void>('clear_backend_logs');
    } catch (error) {
      throw parseVRCError(error);
    }
  }

  static async exportBackendLogs(): Promise<string> {
    try {
      return await invoke<string>('export_backend_logs');
    } catch (error) {
      throw parseVRCError(error);
    }
  }
}
