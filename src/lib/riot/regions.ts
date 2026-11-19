export type RegionCode =
  | 'euw'
  | 'ru'
  | 'eune'
  | 'na'
  | 'kr'
  | 'tr'
  | 'br'
  | 'jp'
  | 'oce'
  | 'lan'
  | 'las';

export type RegionalCluster = 'europe' | 'americas' | 'asia' | 'sea';

export interface RegionInfo {
  code: RegionCode;
  label: string;
  platform: string;
  cluster: RegionalCluster;
}

export const REGIONS: Record<RegionCode, RegionInfo> = {
  euw: { code: 'euw', label: 'EUW', platform: 'euw1', cluster: 'europe' },
  ru: { code: 'ru', label: 'RU', platform: 'ru', cluster: 'europe' },
  eune: { code: 'eune', label: 'EUNE', platform: 'eun1', cluster: 'europe' },
  tr: { code: 'tr', label: 'TR', platform: 'tr1', cluster: 'europe' },
  na: { code: 'na', label: 'NA', platform: 'na1', cluster: 'americas' },
  br: { code: 'br', label: 'BR', platform: 'br1', cluster: 'americas' },
  lan: { code: 'lan', label: 'LAN', platform: 'la1', cluster: 'americas' },
  las: { code: 'las', label: 'LAS', platform: 'la2', cluster: 'americas' },
  kr: { code: 'kr', label: 'KR', platform: 'kr', cluster: 'asia' },
  jp: { code: 'jp', label: 'JP', platform: 'jp1', cluster: 'asia' },
  oce: { code: 'oce', label: 'OCE', platform: 'oc1', cluster: 'americas' },
};

export const REGION_LIST: RegionInfo[] = [
  REGIONS.euw,
  REGIONS.ru,
  REGIONS.eune,
  REGIONS.na,
  REGIONS.kr,
  REGIONS.tr,
  REGIONS.br,
  REGIONS.jp,
  REGIONS.oce,
];

export function resolveRegion(input: string): RegionInfo {
  const normalized = input.trim().toLowerCase();
  if (normalized in REGIONS) {
    return REGIONS[normalized as RegionCode];
  }
  const byPlatform = Object.values(REGIONS).find((r) => r.platform === normalized);
  if (byPlatform) return byPlatform;
  throw new Error(`Unsupported region: ${input}`);
}

export function getRegionalBaseUrl(region: RegionCode | string): string {
  const info = resolveRegion(region);
  return `https://${info.cluster}.api.riotgames.com`;
}

export function getPlatformBaseUrl(region: RegionCode | string): string {
  const info = resolveRegion(region);
  return `https://${info.platform}.api.riotgames.com`;
}

export function getQueueLabel(queueId: number, lang: 'ru' | 'en'): string {
  const map: Record<number, { ru: string; en: string }> = {
    420: { ru: 'Ранкед Solo/Duo', en: 'Ranked Solo/Duo' },
    440: { ru: 'Ранкед Flex', en: 'Ranked Flex' },
    400: { ru: 'Обычная (Драфт)', en: 'Normal Draft' },
    430: { ru: 'Обычная', en: 'Normal Blind' },
    480: { ru: 'Быстрая игра', en: 'Swiftplay' },
    490: { ru: 'Быстрая игра', en: 'Quickplay' },
    450: { ru: 'ARAM', en: 'ARAM' },
    1700: { ru: 'Арена', en: 'Arena' },
    1900: { ru: 'URF', en: 'URF' },
  };
  const found = map[queueId];
  if (found) return found[lang];
  return lang === 'ru' ? `Режим #${queueId}` : `Queue #${queueId}`;
}
