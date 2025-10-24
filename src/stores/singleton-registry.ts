import type { ResourceStore } from './resource-store';
import type { AccountsStore } from './accounts-store';
import type { DeveloperModeStore } from './developer-mode-store';
import type { VRChatStatusStore } from './vrchat-status-store';
import type { AlertStore } from './alert-store';
import { logger } from '@/utils/logger';

/**
 * Global singleton registry to force single instances across all imports
 * This prevents Vite/bundler from creating duplicate instances due to different import paths
 * Also ensures singletons survive HMR
 */

// Use globalThis to ensure singleton survives HMR
declare global {
  var __STORE_SINGLETONS__: {
    user?: ResourceStore<any>;
    worlds?: ResourceStore<any>;
    avatars?: ResourceStore<any>;
    accounts?: AccountsStore;
    developerMode?: DeveloperModeStore;
    vrchatStatus?: VRChatStatusStore;
    alert?: AlertStore;
  } | undefined;
}

if (!globalThis.__STORE_SINGLETONS__) {
  globalThis.__STORE_SINGLETONS__ = {};
}

/**
 * Register a singleton store instance
 * If the store already exists, returns the existing instance
 * Otherwise, creates a new instance using the factory function
 */
export function registerSingleton<T>(key: string, factory: () => T): T {
  const registry = globalThis.__STORE_SINGLETONS__ as any;

  if (!registry[key]) {
    logger.info('SingletonRegistry', `Creating singleton: ${key}`);
    registry[key] = factory();
  } else {
    logger.debug('SingletonRegistry', `Reusing existing singleton: ${key}`);
  }

  return registry[key];
}

/**
 * Get an existing singleton by key
 * Returns undefined if the singleton doesn't exist
 */
export function getSingleton<T>(key: string): T | undefined {
  const registry = globalThis.__STORE_SINGLETONS__ as any;
  return registry[key];
}
