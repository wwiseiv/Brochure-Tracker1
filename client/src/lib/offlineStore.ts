const DB_NAME = 'brochuredrop-offline';
const DB_VERSION = 1;
const DROPS_STORE = 'offline-drops';
const CACHE_STORE = 'api-cache';

export interface OfflineDrop {
  id: string;
  brochureId?: string;
  businessName: string;
  businessType: string;
  contactName?: string;
  businessPhone?: string;
  textNotes?: string;
  followUpDays: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  voiceNoteUrl?: string;
  pickupScheduledFor?: string;
  createdAt: string;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[OfflineStore] Failed to open IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains(DROPS_STORE)) {
        db.createObjectStore(DROPS_STORE, { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        db.createObjectStore(CACHE_STORE, { keyPath: 'url' });
      }
    };
  });

  return dbPromise;
}

function generateId(): string {
  return `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export async function saveOfflineDrop(drop: Omit<OfflineDrop, 'id' | 'createdAt'>): Promise<OfflineDrop> {
  const offlineDrop: OfflineDrop = {
    ...drop,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(DROPS_STORE, 'readwrite');
      const store = transaction.objectStore(DROPS_STORE);
      const request = store.add(offlineDrop);

      request.onsuccess = () => resolve(offlineDrop);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn('[OfflineStore] IndexedDB failed, using localStorage fallback');
    const drops = getLocalStorageDrops();
    drops.push(offlineDrop);
    localStorage.setItem('offline-drops', JSON.stringify(drops));
    return offlineDrop;
  }
}

export async function getOfflineDrops(): Promise<OfflineDrop[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(DROPS_STORE, 'readonly');
      const store = transaction.objectStore(DROPS_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn('[OfflineStore] IndexedDB failed, using localStorage fallback');
    return getLocalStorageDrops();
  }
}

export async function removeOfflineDrop(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(DROPS_STORE, 'readwrite');
      const store = transaction.objectStore(DROPS_STORE);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn('[OfflineStore] IndexedDB failed, using localStorage fallback');
    const drops = getLocalStorageDrops().filter(d => d.id !== id);
    localStorage.setItem('offline-drops', JSON.stringify(drops));
  }
}

export async function clearOfflineDrops(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(DROPS_STORE, 'readwrite');
      const store = transaction.objectStore(DROPS_STORE);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn('[OfflineStore] IndexedDB failed, using localStorage fallback');
    localStorage.removeItem('offline-drops');
  }
}

function getLocalStorageDrops(): OfflineDrop[] {
  try {
    const stored = localStorage.getItem('offline-drops');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export async function cacheApiResponse(url: string, data: unknown): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(CACHE_STORE, 'readwrite');
      const store = transaction.objectStore(CACHE_STORE);
      const request = store.put({
        url,
        data,
        cachedAt: new Date().toISOString(),
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn('[OfflineStore] Failed to cache API response');
  }
}

export async function getCachedApiResponse<T>(url: string): Promise<T | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(CACHE_STORE, 'readonly');
      const store = transaction.objectStore(CACHE_STORE);
      const request = store.get(url);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.data : null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn('[OfflineStore] Failed to get cached API response');
    return null;
  }
}

export function isOnline(): boolean {
  return navigator.onLine;
}
