import { getRegionalBaseUrl, type RegionCode } from './regions';
import type { RiotAccount, RiotMatchDto, RiotTimelineDto } from './types';

export type RiotErrorCode =
  | 'RIOT_KEY_MISSING'
  | 'RIOT_KEY_EXPIRED'
  | 'RIOT_RATE_LIMIT'
  | 'SUMMONER_NOT_FOUND'
  | 'MATCH_NOT_FOUND'
  | 'RIOT_API_ERROR';

export class RiotApiError extends Error {
  readonly code: RiotErrorCode;
  readonly status: number;

  constructor(code: RiotErrorCode, message: string, status = 500) {
    super(message);
    this.name = 'RiotApiError';
    this.code = code;
    this.status = status;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class RiotApiClient {
  private readonly apiKey: string;

  constructor(apiKey?: string) {
    const key = (apiKey ?? process.env.RIOT_API_KEY ?? '').trim();
    if (!key || key === 'RGAPI-your-key-here') {
      throw new RiotApiError(
        'RIOT_KEY_MISSING',
        'RIOT_API_KEY is not configured in .env.local',
        503
      );
    }
    this.apiKey = key;
  }

  private async requestJson<T>(url: string, notFoundCode: RiotErrorCode): Promise<T> {
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      let res: Response;
      try {
        res = await fetch(url, {
          headers: {
            'X-Riot-Token': this.apiKey,
            Accept: 'application/json',
          },
          cache: 'no-store',
        });
      } catch (err) {
        if (attempt === maxAttempts) {
          throw new RiotApiError(
            'RIOT_API_ERROR',
            `Network error calling Riot API: ${err instanceof Error ? err.message : String(err)}`,
            502
          );
        }
        await sleep(400 * attempt);
        continue;
      }

      if (res.ok) {
        return (await res.json()) as T;
      }

      if (res.status === 401 || res.status === 403) {
        throw new RiotApiError(
          'RIOT_KEY_EXPIRED',
          'Riot API key is invalid or expired (Dev keys expire every 24 hours).',
          res.status
        );
      }

      if (res.status === 404) {
        throw new RiotApiError(notFoundCode, 'Requested Riot resource was not found.', 404);
      }

      if (res.status === 429 && attempt < maxAttempts) {
        const retryAfterSec = Number(res.headers.get('Retry-After') ?? '2');
        const waitMs = Math.min(Math.max(retryAfterSec * 1000, 1000), 8000);
        await sleep(waitMs);
        continue;
      }

      if (res.status === 429) {
        throw new RiotApiError(
          'RIOT_RATE_LIMIT',
          'Riot API rate limit exceeded. Please wait a few seconds and retry.',
          429
        );
      }

      const body = await res.text().catch(() => '');
      throw new RiotApiError(
        'RIOT_API_ERROR',
        `Riot API error (${res.status}): ${body.slice(0, 200)}`,
        res.status
      );
    }

    throw new RiotApiError('RIOT_API_ERROR', 'Riot API request failed after retries.', 502);
  }

  async getAccountByRiotId(
    region: RegionCode | string,
    gameName: string,
    tagLine: string
  ): Promise<RiotAccount> {
    const base = getRegionalBaseUrl(region);
    const url = `${base}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName.trim())}/${encodeURIComponent(tagLine.trim())}`;
    return this.requestJson<RiotAccount>(url, 'SUMMONER_NOT_FOUND');
  }

  async getRecentMatchIds(
    region: RegionCode | string,
    puuid: string,
    count = 15
  ): Promise<string[]> {
    const base = getRegionalBaseUrl(region);
    const safeCount = Math.min(Math.max(count, 1), 25);
    const url = `${base}/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids?start=0&count=${safeCount}`;
    return this.requestJson<string[]>(url, 'MATCH_NOT_FOUND');
  }

  async getMatch(region: RegionCode | string, matchId: string): Promise<RiotMatchDto> {
    const base = getRegionalBaseUrl(region);
    const url = `${base}/lol/match/v5/matches/${encodeURIComponent(matchId)}`;
    return this.requestJson<RiotMatchDto>(url, 'MATCH_NOT_FOUND');
  }

  async getMatchTimeline(region: RegionCode | string, matchId: string): Promise<RiotTimelineDto> {
    const base = getRegionalBaseUrl(region);
    const url = `${base}/lol/match/v5/matches/${encodeURIComponent(matchId)}/timeline`;
    return this.requestJson<RiotTimelineDto>(url, 'MATCH_NOT_FOUND');
  }
}
