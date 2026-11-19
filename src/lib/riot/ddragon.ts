import type {
  DDragonChampionEntry,
  DDragonItemEntry,
  DDragonRuneEntry,
  DDragonSnapshot,
  DDragonSummonerSpellEntry,
} from './types';

const DDRAGON_BASE = 'https://ddragon.leagueoflegends.com';
const VERSIONS_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

let cachedVersions: { list: string[]; fetchedAt: number } | null = null;
const memorySnapshots = new Map<string, DDragonSnapshot>();
const resourceMemoryCache = new Map<string, unknown>();

/**
 * Strips Riot Data Dragon HTML markup (<mainText>, <stats>, <br>, etc.) into clean,
 * token-efficient plain text for the AI Patch Glossary.
 */
export function stripDDragonHtml(raw: string | undefined | null): string {
  if (!raw) return '';
  return raw
    .replace(/<br\s*\/?>/gi, '; ')
    .replace(/<\/li>/gi, '; ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .replace(/\s*;\s*/g, '; ')
    .replace(/(;\s*){2,}/g, '; ')
    .trim()
    .replace(/^;\s*|;\s*$/g, '');
}

/**
 * Matches a match `gameVersion` (e.g. "16.22.634.1234" or "16.22") to the closest
 * official Data Dragon version from Riot's versions.json list.
 */
export function matchPatchToDDragonVersion(gameVersion: string, versions: string[]): string {
  if (versions.length === 0) return '16.22.1';
  const parts = gameVersion.trim().split('.');
  if (parts.length >= 2) {
    const majorMinor = `${parts[0]}.${parts[1]}.`;
    const exactMatch = versions.find((v) => v.startsWith(majorMinor));
    if (exactMatch) return exactMatch;
  }
  return versions[0];
}

export async function getDDragonVersions(): Promise<string[]> {
  if (cachedVersions && Date.now() - cachedVersions.fetchedAt < VERSIONS_TTL_MS) {
    return cachedVersions.list;
  }
  const res = await fetch(`${DDRAGON_BASE}/api/versions.json`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Failed to fetch Data Dragon versions (${res.status})`);
  }
  const list = (await res.json()) as string[];
  cachedVersions = { list, fetchedAt: Date.now() };
  return list;
}

async function fetchOrCacheResource(
  version: string,
  resource: 'champions' | 'items' | 'runes' | 'summoners',
  url: string
): Promise<unknown> {
  const cacheKey = `${version}:${resource}`;
  const cached = resourceMemoryCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Failed to fetch Data Dragon ${resource} for ${version} (${res.status})`);
  }
  const json = (await res.json()) as unknown;
  resourceMemoryCache.set(cacheKey, json);
  return json;
}

interface RawChampionJson {
  data: Record<
    string,
    { id: string; key: string; name: string; title: string; tags: string[]; blurb: string }
  >;
}

interface RawItemJson {
  data: Record<
    string,
    {
      name: string;
      plaintext?: string;
      description?: string;
      gold?: { total?: number };
      tags?: string[];
      into?: string[];
      from?: string[];
    }
  >;
}

interface RawRuneTree {
  id: number;
  key: string;
  name: string;
  icon: string;
  slots: Array<{
    runes: Array<{ id: number; key: string; name: string; shortDesc: string; icon: string }>;
  }>;
}

interface RawSummonerJson {
  data: Record<
    string,
    { id: string; key: string; name: string; description: string; cooldown?: number[] }
  >;
}

export function buildDDragonSnapshotFromRaw(
  version: string,
  rawChamps: RawChampionJson,
  rawItems: RawItemJson,
  rawRunes: RawRuneTree[],
  rawSummoners: RawSummonerJson
): DDragonSnapshot {
  const championsById: Record<string, DDragonChampionEntry> = {};
  const championsByKey: Record<string, DDragonChampionEntry> = {};
  for (const c of Object.values(rawChamps.data)) {
    const entry: DDragonChampionEntry = {
      id: c.id,
      key: c.key,
      name: c.name,
      title: c.title,
      tags: c.tags ?? [],
      blurb: stripDDragonHtml(c.blurb),
    };
    championsById[c.id.toLowerCase()] = entry;
    championsByKey[c.key] = entry;
  }

  const itemsById: Record<number, DDragonItemEntry> = {};
  for (const [idStr, item] of Object.entries(rawItems.data)) {
    const id = Number(idStr);
    if (!Number.isFinite(id)) continue;
    itemsById[id] = {
      id,
      name: item.name,
      plaintext: stripDDragonHtml(item.plaintext),
      description: stripDDragonHtml(item.description),
      totalGold: item.gold?.total ?? 0,
      tags: item.tags ?? [],
      into: item.into,
      from: item.from,
    };
  }

  const runesById: Record<number, DDragonRuneEntry> = {};
  for (const tree of rawRunes) {
    runesById[tree.id] = {
      id: tree.id,
      key: tree.key,
      name: tree.name,
      treeName: tree.name,
      shortDesc: `${tree.name} rune path`,
      icon: tree.icon,
    };
    for (const slot of tree.slots) {
      for (const r of slot.runes) {
        runesById[r.id] = {
          id: r.id,
          key: r.key,
          name: r.name,
          treeName: tree.name,
          shortDesc: stripDDragonHtml(r.shortDesc),
          icon: r.icon,
        };
      }
    }
  }

  const summonersById: Record<number, DDragonSummonerSpellEntry> = {};
  for (const s of Object.values(rawSummoners.data)) {
    const id = Number(s.key);
    if (!Number.isFinite(id)) continue;
    summonersById[id] = {
      id,
      key: s.id,
      name: s.name,
      description: stripDDragonHtml(s.description),
      cooldown: s.cooldown?.[0] ?? 0,
    };
  }

  return {
    version,
    championsById,
    championsByKey,
    itemsById,
    runesById,
    summonersById,
  };
}

export async function loadDDragonForPatch(gameVersion: string): Promise<DDragonSnapshot> {
  const versions = await getDDragonVersions();
  const version = matchPatchToDDragonVersion(gameVersion, versions);

  const mem = memorySnapshots.get(version);
  if (mem) return mem;

  const base = `${DDRAGON_BASE}/cdn/${version}/data/en_US`;
  const [rawChamps, rawItems, rawRunes, rawSummoners] = await Promise.all([
    fetchOrCacheResource(version, 'champions', `${base}/champion.json`),
    fetchOrCacheResource(version, 'items', `${base}/item.json`),
    fetchOrCacheResource(version, 'runes', `${base}/runesReforged.json`),
    fetchOrCacheResource(version, 'summoners', `${base}/summoner.json`),
  ]);

  const snapshot = buildDDragonSnapshotFromRaw(
    version,
    rawChamps as RawChampionJson,
    rawItems as RawItemJson,
    rawRunes as RawRuneTree[],
    rawSummoners as RawSummonerJson
  );

  memorySnapshots.set(version, snapshot);
  return snapshot;
}

export function getChampionIconUrl(version: string, championName: string): string {
  const normalized = championName === 'FiddleSticks' ? 'Fiddlesticks' : championName;
  return `${DDRAGON_BASE}/cdn/${version}/img/champion/${normalized}.png`;
}

export function getItemIconUrl(version: string, itemId: number): string {
  return `${DDRAGON_BASE}/cdn/${version}/img/item/${itemId}.png`;
}

export function getMinimapImageUrl(version: string): string {
  return `${DDRAGON_BASE}/cdn/${version}/img/map/map11.png`;
}
