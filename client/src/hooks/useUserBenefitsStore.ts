import { useSyncExternalStore } from 'react';
import type { UserBenefitsData } from '@shared/types';

const STORAGE_KEY = 'use-your-benefits';

// Module-level cache and listener management
let cachedData: UserBenefitsData | null = null;
const listeners = new Set<() => void>();

function getDefaultData(): UserBenefitsData {
  return { benefits: {}, importNotes: {} };
}

function parseStoredData(stored: string | null): UserBenefitsData {
  if (!stored) return getDefaultData();
  try {
    const parsed = JSON.parse(stored) as UserBenefitsData;
    return {
      benefits: parsed.benefits ?? {},
      importNotes: parsed.importNotes ?? {},
    };
  } catch {
    return getDefaultData();
  }
}

function getSnapshot(): UserBenefitsData {
  if (cachedData === null) {
    cachedData = parseStoredData(localStorage.getItem(STORAGE_KEY));
  }
  return cachedData;
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);

  // Listen for storage events from other tabs/windows
  const handleStorageEvent = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      cachedData = null; // Invalidate cache
      callback();
    }
  };

  window.addEventListener('storage', handleStorageEvent);

  return () => {
    listeners.delete(callback);
    window.removeEventListener('storage', handleStorageEvent);
  };
}

/**
 * Notify all subscribers that the store has changed.
 * Call this after saving to localStorage.
 */
export function emitChange(): void {
  cachedData = null; // Invalidate cache
  for (const listener of listeners) {
    listener();
  }
}

/**
 * React hook that subscribes to localStorage changes using useSyncExternalStore.
 * Automatically updates when localStorage is modified (including from other tabs).
 */
export function useUserBenefitsStore(): UserBenefitsData {
  return useSyncExternalStore(subscribe, getSnapshot);
}

/**
 * Save data to localStorage and notify all subscribers.
 */
export function saveUserBenefitsData(data: UserBenefitsData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  emitChange();
}

/**
 * Get the current data from the store (non-reactive).
 * Prefer useUserBenefitsStore() for reactive access in components.
 */
export function getUserBenefitsData(): UserBenefitsData {
  return getSnapshot();
}
