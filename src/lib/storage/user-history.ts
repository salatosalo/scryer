export interface SavedUserAnalysis {
  matchId: string;
  region: string;
  puuid: string;
  riotId: string;
  championName: string;
  result: 'WIN' | 'LOSE';
  grade?: string;
  score?: number;
  durationSec: number;
  patch: string;
  analyzedAt: number;
}

const STORAGE_KEY = 'scryer_user_analyses';

export function getUserHistory(): SavedUserAnalysis[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveUserAnalysis(item: SavedUserAnalysis): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getUserHistory();
    // Deduplicate by matchId + puuid
    const filtered = current.filter(
      (m) => !(m.matchId === item.matchId && m.puuid === item.puuid)
    );
    filtered.unshift(item); // Most recent first
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered.slice(0, 50)));
  } catch {
    // LocalStorage quota or privacy mode error
  }
}

export function clearUserHistory(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
