export interface FavoriteProfile {
  puuid: string;
  riotId: string;
  region: string;
  savedAt: number;
}

export interface RecentSearchItem {
  riotId: string;
  region: string;
  timestamp: number;
}

const FAVORITE_KEY = 'scryer_favorite_profile';
const RECENT_SEARCHES_KEY = 'scryer_recent_searches';

export function getFavoriteProfile(): FavoriteProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(FAVORITE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveFavoriteProfile(profile: FavoriteProfile): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(FAVORITE_KEY, JSON.stringify(profile));
    window.dispatchEvent(new Event('scryer-favorite-updated'));
  } catch {}
}

export function removeFavoriteProfile(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(FAVORITE_KEY);
    window.dispatchEvent(new Event('scryer-favorite-updated'));
  } catch {}
}

export function getRecentSearches(): RecentSearchItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(riotId: string, region: string): void {
  if (typeof window === 'undefined') return;
  try {
    const items = getRecentSearches().filter(
      (item) => !(item.riotId.toLowerCase() === riotId.toLowerCase() && item.region === region)
    );
    items.unshift({ riotId, region, timestamp: Date.now() });
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(items.slice(0, 6)));
  } catch {}
}

export function clearRecentSearches(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {}
}
