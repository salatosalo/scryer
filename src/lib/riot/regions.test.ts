import { describe, expect, it } from 'vitest';
import { getPlatformBaseUrl, getRegionalBaseUrl, resolveRegion } from './regions';

describe('Riot region routing', () => {
  it('maps EUW and RU to europe regional cluster', () => {
    expect(resolveRegion('euw').cluster).toBe('europe');
    expect(resolveRegion('ru').cluster).toBe('europe');
    expect(getRegionalBaseUrl('euw1')).toBe('https://europe.api.riotgames.com');
    expect(getPlatformBaseUrl('ru')).toBe('https://ru.api.riotgames.com');
  });

  it('maps NA and KR to americas and asia', () => {
    expect(getRegionalBaseUrl('na')).toBe('https://americas.api.riotgames.com');
    expect(getRegionalBaseUrl('kr')).toBe('https://asia.api.riotgames.com');
    expect(getRegionalBaseUrl('oce')).toBe('https://americas.api.riotgames.com');
  });

  it('throws on unknown region', () => {
    expect(() => resolveRegion('mars')).toThrow('Unsupported region');
  });
});
