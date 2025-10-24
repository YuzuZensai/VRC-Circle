import { invoke } from '@tauri-apps/api/core';
import { parseVRCError } from '../types/errors';

export class WebSocketService {
  static async start(): Promise<void> {
    try {
      return await invoke<void>('websocket_start');
    } catch (error) {
      throw parseVRCError(error);
    }
  }

  static async stop(): Promise<void> {
    try {
      return await invoke<void>('websocket_stop');
    } catch (error) {
      throw parseVRCError(error);
    }
  }
}
