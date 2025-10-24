import { SettingsService } from '@/services/settings';
import { logger } from '@/utils/logger';
import { registerSingleton } from './singleton-registry';

type DeveloperModeListener = (value: boolean) => void;

export class DeveloperModeStore {
  private listeners = new Set<DeveloperModeListener>();
  private cache: boolean | null = null;
  private inflight: Promise<boolean> | null = null;

  getSnapshot(): boolean | null {
    return this.cache;
  }

  subscribe(listener: DeveloperModeListener): () => void {
    this.listeners.add(listener);
    listener(this.cache ?? false);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async ensure(): Promise<boolean> {
    if (this.cache !== null) {
      return this.cache;
    }

    if (this.inflight) {
      return this.inflight;
    }

    this.inflight = SettingsService.getDeveloperMode()
      .then((value) => {
        this.set(value);
        return value;
      })
      .finally(() => {
        this.inflight = null;
      });

    return this.inflight;
  }

  async refresh(): Promise<boolean> {
    this.cache = null;
    return this.ensure();
  }

  set(value: boolean): void {
    this.cache = value;
    this.emit(value);
  }

  async toggle(): Promise<boolean> {
    const newValue = !this.cache;
    await SettingsService.setDeveloperMode(newValue);
    this.set(newValue);
    return newValue;
  }

  private emit(value: boolean): void {
    for (const listener of this.listeners) {
      try {
        listener(value);
      } catch (error) {
        logger.error('DeveloperModeStore', 'DeveloperModeStore listener error', error);
      }
    }
  }
}

export const developerModeStore = registerSingleton('developerMode', () => new DeveloperModeStore());
