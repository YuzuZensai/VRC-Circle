import { logger } from '@/utils/logger';
import { registerSingleton } from './singleton-registry';

export type AlertVariant = 'info' | 'warning' | 'error' | 'critical';

export interface Alert {
  id: string;
  variant: AlertVariant;
  message: React.ReactNode;
  dismissable: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  onClick?: () => void | Promise<void>;
}

export interface AlertStoreState {
  alerts: Alert[];
  currentIndex: number;
}

type AlertStoreListener = (state: AlertStoreState) => void;

export class AlertStore {
  private listeners = new Set<AlertStoreListener>();
  private cache: AlertStoreState = {
    alerts: [],
    currentIndex: 0,
  };

  getSnapshot(): AlertStoreState {
    return { ...this.cache, alerts: [...this.cache.alerts] };
  }

  subscribe(listener: AlertStoreListener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Add a new alert to the store
   * @param alert - Alert object (without id and createdAt)
   * @returns The ID of the created alert
   */
  addAlert(alert: Omit<Alert, 'id' | 'createdAt'>): string {
    const id = `alert-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newAlert: Alert = {
      ...alert,
      id,
      createdAt: new Date(),
    };

    this.cache.alerts.push(newAlert);
    logger.info('AlertStore', `Alert added: ${id}`, newAlert);
    this.emit(this.getSnapshot());

    return id;
  }

  /**
   * Update an existing alert
   */
  updateAlert(id: string, updates: Partial<Omit<Alert, 'id' | 'createdAt'>>): boolean {
    const index = this.cache.alerts.findIndex((a) => a.id === id);
    if (index === -1) {
      logger.warn('AlertStore', `Alert not found: ${id}`);
      return false;
    }

    this.cache.alerts[index] = {
      ...this.cache.alerts[index],
      ...updates,
    };

    logger.info('AlertStore', `Alert updated: ${id}`, updates);
    this.emit(this.getSnapshot());
    return true;
  }

  /**
   * Remove an alert by ID
   */
  removeAlert(id: string): boolean {
    const initialLength = this.cache.alerts.length;
    this.cache.alerts = this.cache.alerts.filter((a) => a.id !== id);

    if (this.cache.alerts.length < initialLength) {
      
      // Adjust current index if needed
      if (this.cache.currentIndex >= this.cache.alerts.length && this.cache.alerts.length > 0) {
        this.cache.currentIndex = this.cache.alerts.length - 1;
      } else if (this.cache.alerts.length === 0) {
        this.cache.currentIndex = 0;
      }

      logger.info('AlertStore', `Alert removed: ${id}`);
      this.emit(this.getSnapshot());
      return true;
    }

    return false;
  }

  /**
   * Clear all alerts
   */
  clearAll(): void {
    this.cache.alerts = [];
    this.cache.currentIndex = 0;
    logger.info('AlertStore', 'All alerts cleared');
    this.emit(this.getSnapshot());
  }

  /**
   * Clear all dismissable alerts
   */
  clearDismissable(): void {
    const initialLength = this.cache.alerts.length;
    this.cache.alerts = this.cache.alerts.filter((a) => !a.dismissable);

    if (this.cache.alerts.length < initialLength) {
      if (this.cache.currentIndex >= this.cache.alerts.length && this.cache.alerts.length > 0) {
        this.cache.currentIndex = this.cache.alerts.length - 1;
      } else if (this.cache.alerts.length === 0) {
        this.cache.currentIndex = 0;
      }

      logger.info('AlertStore', 'Dismissable alerts cleared');
      this.emit(this.getSnapshot());
    }
  }

  /**
   * Navigate to the next alert
   */
  nextAlert(): void {
    if (this.cache.alerts.length === 0) return;

    this.cache.currentIndex = (this.cache.currentIndex + 1) % this.cache.alerts.length;
    this.emit(this.getSnapshot());
  }

  /**
   * Navigate to the previous alert
   */
  previousAlert(): void {
    if (this.cache.alerts.length === 0) return;

    this.cache.currentIndex =
      this.cache.currentIndex === 0
        ? this.cache.alerts.length - 1
        : this.cache.currentIndex - 1;
    this.emit(this.getSnapshot());
  }

  /**
   * Set the current alert index
   */
  setCurrentIndex(index: number): void {
    if (index < 0 || index >= this.cache.alerts.length) {
      logger.warn('AlertStore', `Invalid index: ${index}`);
      return;
    }

    this.cache.currentIndex = index;
    this.emit(this.getSnapshot());
  }

  /**
   * Get the currently displayed alert
   */
  getCurrentAlert(): Alert | null {
    if (this.cache.alerts.length === 0) return null;
    return this.cache.alerts[this.cache.currentIndex] || null;
  }

  /**
   * Check if there are any alerts
   */
  hasAlerts(): boolean {
    return this.cache.alerts.length > 0;
  }

  /**
   * Get the count of alerts
   */
  getAlertCount(): number {
    return this.cache.alerts.length;
  }

  private emit(state: AlertStoreState): void {
    for (const listener of this.listeners) {
      try {
        listener(state);
      } catch (error) {
        logger.error('AlertStore', 'Listener error', error);
      }
    }
  }
}

export const alertStore = registerSingleton('alert', () => new AlertStore());
