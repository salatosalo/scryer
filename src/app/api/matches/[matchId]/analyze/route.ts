import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { analyzeMatchWithAi, translateCoachingReportWithAi } from '@/lib/ai';
import type { AiCoachingReport } from '@/lib/ai/schema';
import { buildDemoMatch } from '@/lib/demo';
import { analyzeMatchTimeline } from '@/lib/engine/analyzer';
import type { EngineReport } from '@/lib/engine/types';
import type { SupportedLang } from '@/lib/i18n/types';
import { RiotApiClient, RiotApiError } from '@/lib/riot/client';
import { loadDDragonForPatch } from '@/lib/riot/ddragon';
import { resolveRegion } from '@/lib/riot/regions';
import type { RiotMatchDto, RiotTimelineDto } from '@/lib/riot/types';

const AnalyzeBodySchema = z.object({
  region: z.string().min(2),
  puuid: z.string().min(1),
  lang: z.enum(['ru', 'en']).default('ru'),
  forceRefresh: z.boolean().optional().default(false),
  sourceReport: z.any().optional(),
  sourceLang: z.enum(['ru', 'en']).optional(),
  engineReport: z.any().optional(),
});

// Fast in-memory cache for raw timeline payloads to avoid redundant Riot requests on warm instances
const rawMatchMemoryCache = new Map<string, { match: RiotMatchDto; timeline: RiotTimelineDto }>();

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await context.params;
  let body: z.infer<typeof AnalyzeBodySchema>;
  try {
    const raw = await req.json();
    body = AnalyzeBodySchema.parse(raw);
  } catch {
    return NextResponse.json({ code: 'INVALID_BODY', error: 'Invalid request body' }, { status: 400 });
  }

  // Built-in demo match shortcut
  if (matchId === 'DEMO_EUW1_FIORA_39M') {
    const demo = buildDemoMatch(body.lang);
    return NextResponse.json({
      engineReport: demo.engineReport,
      aiReport: demo.aiReport,
      aiError: null,
      meta: demo.meta,
    });
  }

  try {
    const region = resolveRegion(body.region);
    const lang: SupportedLang = body.lang;

    console.log(`[Analyze] Starting analysis for match ${matchId} (lang: ${lang}, forceRefresh: ${Boolean(body.forceRefresh)})`);

    // 1. Client-requested translation pass (e.g. user toggles RU <-> EN)
    // If the client already holds an existing report in another language, translate it directly
    if (body.sourceReport && body.sourceLang && body.sourceLang !== lang) {
      console.log(`[Analyze] Translating report from ${body.sourceLang} to ${lang}...`);
      const translatedOutcome = await translateCoachingReportWithAi(
        body.sourceReport as AiCoachingReport,
        body.sourceLang,
        lang
      );

      return NextResponse.json({
        engineReport: (body.engineReport || null) as EngineReport,
        aiReport: translatedOutcome.report,
        aiError: translatedOutcome.error,
        meta: {
          cached: false,
          provider: translatedOutcome.provider,
          model: translatedOutcome.model,
          isDemo: false,
        },
      });
    }

    // 2. Load raw match + timeline from in-memory cache or Riot API
    let matchDto: RiotMatchDto;
    let timelineDto: RiotTimelineDto;

    const cachedRaw = !body.forceRefresh ? rawMatchMemoryCache.get(matchId) : null;
    if (cachedRaw) {
      console.log(`[Analyze] Match ${matchId} loaded from memory cache.`);
      matchDto = cachedRaw.match;
      timelineDto = cachedRaw.timeline;
    } else {
      console.log(`[Analyze] Fetching match ${matchId} & timeline from Riot API...`);
      const riot = new RiotApiClient();
      const [m, t] = await Promise.all([
        riot.getMatch(region.code, matchId),
        riot.getMatchTimeline(region.code, matchId),
      ]);
      matchDto = m;
      timelineDto = t;
      rawMatchMemoryCache.set(matchId, { match: m, timeline: t });
      console.log(`[Analyze] Riot API fetched match ${matchId} (${m.info.gameDuration}s, patch ${m.info.gameVersion}).`);
    }

    if (matchDto.info.mapId !== 11 || matchDto.info.gameDuration < 300) {
      return NextResponse.json(
        {
          code: 'UNSUPPORTED_MATCH',
          error: 'Minute-by-minute coaching is supported only for non-remake Summoner’s Rift matches.',
        },
        { status: 422 }
      );
    }

    // 3. Patch-proof Data Dragon resolution for this exact match patch
    const ddragon = await loadDDragonForPatch(matchDto.info.gameVersion);

    // 4. Deterministic timeline engine
    const engineReport = analyzeMatchTimeline({
      match: matchDto,
      timeline: timelineDto,
      targetPuuid: body.puuid,
      region: region.code,
      ddragon,
    });
    console.log(`[Analyze] Engine parsed ${engineReport.minutes.length} minutes for ${engineReport.target.championName}. Starting AI coaching...`);

    // 5. AI coaching pass (gracefully degrades to engine-only on error/missing key)
    const aiOutcome = await analyzeMatchWithAi(engineReport, lang);
    console.log(`[Analyze] AI pass complete: provider=${aiOutcome.provider}, model=${aiOutcome.model}, hasReport=${Boolean(aiOutcome.report)}, error=${aiOutcome.error}`);

    return NextResponse.json({
      engineReport,
      aiReport: aiOutcome.report,
      aiError: aiOutcome.error,
      meta: {
        cached: false,
        provider: aiOutcome.provider,
        model: aiOutcome.model,
        isDemo: false,
      },
    });
  } catch (err) {
    if (err instanceof RiotApiError) {
      return NextResponse.json(
        { code: err.code, error: err.message, status: err.status },
        { status: err.status }
      );
    }
    return NextResponse.json(
      { code: 'ANALYSIS_ERROR', error: err instanceof Error ? err.message : 'Failed to analyze match' },
      { status: 500 }
    );
  }
}
