import { getChampionRuName } from './champion-names-ru';

const DDRAGON_BASE = 'https://ddragon.leagueoflegends.com';

export function getChampionDisplayName(name: string, lang: string = 'en'): string {
  if (lang === 'ru') return getChampionRuName(name);
  return name;
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
