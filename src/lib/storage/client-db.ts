import type { AnalysisResponse } from '@/app/match/[region]/[matchId]/page';
import type { SupportedLang } from '@/lib/i18n/types';

const DB_NAME = 'scryer_cache_v1';
const STORE_NAME = 'analyses';
const DB_VERSION = 1;

interface CachedAnalysisRecord {
  key: string; // `${matchId}:${puuid}:${lang}`
  matchId: string;
  puuid: string;
  lang: SupportedLang;
  data: AnalysisResponse;
  savedAt: number;
}

// In-memory fallback if IndexedDB is not available (e.g. strict private mode or SSR)
const memoryCache = new Map<string, CachedAnalysisRecord>();

function isIndexedDbSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDbSupported()) {
      return reject(new Error('IndexedDB not supported'));
    }

    const req = window.indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        store.createIndex('match_puuid', ['matchId', 'puuid'], { unique: false });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Failed to open IndexedDB'));
  });
}

function makeKey(matchId: string, puuid: string, lang: SupportedLang): string {
  return `${matchId}:${puuid}:${lang}`;
}

export async function getCachedAnalysis(
  matchId: string,
  puuid: string,
  lang: SupportedLang
): Promise<AnalysisResponse | null> {
  const key = makeKey(matchId, puuid, lang);

  if (!isIndexedDbSupported()) {
    const mem = memoryCache.get(key);
    return mem ? mem.data : null;
  }

  try {
    const db = await openDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);

      req.onsuccess = () => {
        const rec = req.result as CachedAnalysisRecord | undefined;
        resolve(rec ? rec.data : null);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    const mem = memoryCache.get(key);
    return mem ? mem.data : null;
  }
}

export async function getAnyCachedAnalysis(
  matchId: string,
  puuid: string
): Promise<{ data: AnalysisResponse; lang: SupportedLang } | null> {
  if (!isIndexedDbSupported()) {
    for (const rec of memoryCache.values()) {
      if (rec.matchId === matchId && rec.puuid === puuid && rec.data.aiReport) {
        return { data: rec.data, lang: rec.lang };
      }
    }
    return null;
  }

  try {
    const db = await openDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('match_puuid');
      const req = index.getAll([matchId, puuid]);

      req.onsuccess = () => {
        const records = (req.result || []) as CachedAnalysisRecord[];
        const withAi = records.find((r) => r.data.aiReport);
        if (withAi) {
          resolve({ data: withAi.data, lang: withAi.lang });
        } else if (records.length > 0) {
          resolve({ data: records[0].data, lang: records[0].lang });
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function saveCachedAnalysis(
  matchId: string,
  puuid: string,
  lang: SupportedLang,
  data: AnalysisResponse
): Promise<void> {
  const key = makeKey(matchId, puuid, lang);
  const record: CachedAnalysisRecord = {
    key,
    matchId,
    puuid,
    lang,
    data,
    savedAt: Date.now(),
  };

  memoryCache.set(key, record);

  if (!isIndexedDbSupported()) return;

  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // silently keep in memory cache
  }
}

export async function deleteCachedAnalyses(matchId: string, puuid: string): Promise<void> {
  for (const k of Array.from(memoryCache.keys())) {
    if (k.startsWith(`${matchId}:${puuid}:`)) {
      memoryCache.delete(k);
    }
  }

  if (!isIndexedDbSupported()) return;

  try {
    const db = await openDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('match_puuid');
      const req = index.getAllKeys([matchId, puuid]);

      req.onsuccess = () => {
        const keys = (req.result || []) as IDBValidKey[];
        for (const k of keys) {
          store.delete(k);
        }
        resolve();
      };
      req.onerror = () => resolve();
    });
  } catch {
    // ignore
  }
}
