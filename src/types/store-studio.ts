import type { ReactNode } from "react";

export interface StoreDebugInfo {
  id: string;
  label: string;
  description?: string;
  type: "resource" | "simple";
  category?: string;
}

/**
 * Base interface for store entries in Store Studio
 */
export interface BaseStoreEntry {
  id: string;
  label: string;
  description?: string;
}

/**
 * Store entry with real-time data
 */
export interface StoreEntry<T = unknown> extends BaseStoreEntry {
  getData: () => T;
  subscribe: (listener: (value: T) => void) => () => void;
  actions?: StoreAction[];
  debugInfo?: () => StoreDebugData;
  canEdit?: boolean;
  setData?: (value: T) => void | Promise<void>;
}

/**
 * Action that can be performed on a store
 */
export interface StoreAction {
  id: string;
  label: string;
  icon?: ReactNode;
  variant?: "default" | "outline" | "destructive" | "secondary";
  onClick: (scopeId?: string | null) => void | Promise<void>;
  disabled?: boolean;
}

/**
 * Debug data for a store
 */
export interface StoreDebugData {
  updatedAt?: number | null;
  ageMs?: number | null;
  stale?: boolean;
  inflight?: boolean;
  metadata?: Record<string, unknown>;
  scopes?: StoreScopeDebugData[];
}

/**
 * Debug data for a specific scope within a store
 */
export interface StoreScopeDebugData {
  scopeId: string | null;
  label: string;
  cache: unknown;
  updatedAt: number;
  ageMs: number | null;
  stale: boolean;
  inflight: boolean;
  isActiveScope: boolean;
  actions?: StoreAction[];
}
