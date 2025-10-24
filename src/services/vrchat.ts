import { invoke } from '@tauri-apps/api/core';
import type { User, LoginResult, LimitedUserFriend, UserStatus } from '../types/bindings';
import type { LimitedAvatar } from '../types/bindings';
import type { LimitedWorld } from '../types/bindings';
import { parseVRCError } from '../types/errors';

export class VRChatService {
  static async login(email: string, password: string): Promise<LoginResult> {
    try {
      return await invoke<LoginResult>('vrchat_login', { email, password });
    } catch (error) {
      throw parseVRCError(error);
    }
  }

  static async verify2FA(code: string, method: string): Promise<boolean> {
    try {
      return await invoke<boolean>('vrchat_verify_2fa', { code, method });
    } catch (error) {
      throw parseVRCError(error);
    }
  }

  static async getCurrentUser(): Promise<User> {
    try {
      return await invoke<User>('vrchat_get_current_user');
    } catch (error) {
      throw parseVRCError(error);
    }
  }

  static async updateStatus(status: UserStatus | string, statusDescription: string): Promise<User> {
    try {
      return await invoke<User>('vrchat_update_status', { status, statusDescription });
    } catch (error) {
      throw parseVRCError(error);
    }
  }

  static async logout(): Promise<void> {
    try {
      return await invoke<void>('vrchat_logout');
    } catch (error) {
      throw parseVRCError(error);
    }
  }

  static async checkSession(): Promise<boolean> {
    try {
      return await invoke<boolean>('vrchat_check_session');
    } catch (error) {
      throw parseVRCError(error);
    }
  }

  static async clearSession(): Promise<void> {
    try {
      return await invoke<void>('vrchat_clear_session');
    } catch (error) {
      throw parseVRCError(error);
    }
  }

  static async getOnlineFriends(): Promise<LimitedUserFriend[]> {
    try {
      return await invoke<LimitedUserFriend[]>('vrchat_get_online_friends');
    } catch (error) {
      throw parseVRCError(error);
    }
  }

  static async getUploadedWorlds(): Promise<LimitedWorld[]> {
    try {
      return await invoke<LimitedWorld[]>('vrchat_get_uploaded_worlds');
    } catch (error) {
      throw parseVRCError(error);
    }
  }

  static async getUploadedAvatars(): Promise<LimitedAvatar[]> {
    try {
      return await invoke<LimitedAvatar[]>('vrchat_get_uploaded_avatars');
    } catch (error) {
      throw parseVRCError(error);
    }
  }

  static async getUserById(userId: string): Promise<User> {
    try {
      return await invoke<User>('get_user_by_id', { userId });
    } catch (error) {
      throw parseVRCError(error);
    }
  }
}
