import { NextRequest, NextResponse } from 'next/server';
import { RiotApiClient, RiotApiError } from '@/lib/riot/client';
import { getDDragonVersions, matchPatchToDDragonVersion } from '@/lib/riot/ddragon';
import { resolveRegion } from '@/lib/riot/regions';
import type { RiotMatchDto } from '@/lib/riot/types';

// Fast in-memory cache to stay well within Riot rate limits without needing a database
const matchMemoryCache = new Map<string, RiotMatchDto>();

export interface MatchListItemDto {
  matchId: string;
  region: string;
  puuid: string;
  championName: string;
  position: string;
  result: 'WIN' | 'LOSE';
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  csPerMin: number;
  durationSec: number;
  playedAt: number;
  queueId: number;
  mapId: number;
  patch: string;
  ddragonVersion: string;
  isSupported: boolean;
  unsupportedReason: 'REMAKE' | 'NON_SR' | null;
  isAnalyzed: boolean;
  cachedGrade: string | null;
  cachedScore: number | null;
}

function summarizeMatchForPlayer(
  match: RiotMatchDto,
  account: { puuid: string; gameName: string; tagLine: string },
  region: string,
  ddragonVersions: string[],
  analyzedInfo?: { grade: string | null; score: number | null }
): MatchListItemDto | null {
  const p = match.info.participants.find(
    (x) =>
      x.puuid === account.puuid ||
      (x.riotIdGameName &&
        x.riotIdTagline &&
        x.riotIdGameName.toLowerCase() === account.gameName.toLowerCase() &&
        x.riotIdTagline.toLowerCase() === account.tagLine.toLowerCase()) ||
      (x.summonerName && x.summonerName.toLowerCase() === account.gameName.toLowerCase())
  );
  if (!p) return null;

  const cs = (p.totalMinionsKilled ?? 0) + (p.neutralMinionsKilled ?? 0);
  const mins = Math.max(1, match.info.gameDuration / 60);
  const patchParts = match.info.gameVersion.split('.');
  const patch = patchParts.length >= 2 ? `${patchParts[0]}.${patchParts[1]}` : match.info.gameVersion;
  const ddragonVersion = matchPatchToDDragonVersion(match.info.gameVersion, ddragonVersions);

  let isSupported = true;
  let unsupportedReason: 'REMAKE' | 'NON_SR' | null = null;
  if (match.info.mapId !== 11) {
    isSupported = false;
    unsupportedReason = 'NON_SR';
  } else if (match.info.gameDuration < 300) {
    isSupported = false;
    unsupportedReason = 'REMAKE';
  }

  return {
    matchId: match.metadata.matchId,
    region,
    puuid: p.puuid,
    championName: p.championName,
    position: p.teamPosition || p.individualPosition || 'FLEX',
    result: p.win ? 'WIN' : 'LOSE',
    kills: p.kills,
    deaths: p.deaths,
    assists: p.assists,
    cs,
    csPerMin: Number((cs / mins).toFixed(1)),
    durationSec: match.info.gameDuration,
    playedAt: match.info.gameCreation,
    queueId: match.info.queueId,
    mapId: match.info.mapId,
    patch,
    ddragonVersion,
    isSupported,
    unsupportedReason,
    isAnalyzed: Boolean(analyzedInfo),
    cachedGrade: analyzedInfo?.grade ?? null,
    cachedScore: analyzedInfo?.score ?? null,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const gameName = (searchParams.get('gameName') || '').trim();
  const tagLine = (searchParams.get('tagLine') || '').trim().replace(/^#/, '');
  const regionInput = (searchParams.get('region') || 'euw').trim();

  if (!gameName || !tagLine) {
    return NextResponse.json(
      { code: 'INVALID_RIOT_ID', error: 'Provide both gameName and tagLine (e.g. chovyloh#228).' },
      { status: 400 }
    );
  }

  try {
    const region = resolveRegion(regionInput);
    const riot = new RiotApiClient();

    const account = await riot.getAccountByRiotId(region.code, gameName, tagLine);
    const [matchIds, ddragonVersions] = await Promise.all([
      riot.getRecentMatchIds(region.code, account.puuid, 12),
      getDDragonVersions().catch(() => ['16.22.1']),
    ]);

    // Fetch missing match metadata in small batches of 4 to stay well within Riot rate limits
    const rawMatches: RiotMatchDto[] = [];
    const batchSize = 4;
    for (let i = 0; i < matchIds.length; i += batchSize) {
      const slice = matchIds.slice(i, i + batchSize);
      const batch = await Promise.all(
        slice.map(async (id) => {
          const cached = matchMemoryCache.get(id);
          if (cached) {
            return cached;
          }
          const fetched = await riot.getMatch(region.code, id);
          matchMemoryCache.set(id, fetched);
          return fetched;
        })
      );
      rawMatches.push(...batch);
    }

    const matches = rawMatches
      .map((m) => summarizeMatchForPlayer(m, account, region.code, ddragonVersions))
      .filter((x): x is MatchListItemDto => x !== null);

    return NextResponse.json({
      account: {
        puuid: account.puuid,
        gameName: account.gameName,
        tagLine: account.tagLine,
        riotId: `${account.gameName}#${account.tagLine}`,
        region: region.code,
      },
      matches,
    });
  } catch (err) {
    if (err instanceof RiotApiError) {
      return NextResponse.json({ code: err.code, error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', error: err instanceof Error ? err.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}
