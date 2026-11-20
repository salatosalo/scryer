import { describe, expect, it } from 'vitest';
import { extractMatchBenchmarks, RANK_TIERS } from './benchmarks';
import type { EngineReport } from './types';

describe('benchmarks engine', () => {
  it('correctly maps CS and gold values to respective tiers', () => {
    const mockReport: Partial<EngineReport> = {
      target: {
        participantId: 1,
        championName: 'Ahri',
        team: 'BLUE',
        position: 'MIDDLE',
        kills: 8,
        deaths: 1,
        assists: 6,
        kda: 14.0,
        cs: 220,
        csPerMin: 8.5,
        goldEarned: 14200,
        goldDiffAt15: 800,
        csDiffAt15: 15,
        damageToChampions: 24000,
        killParticipation: 70,
        visionScore: 28,
        visionScorePerMin: 1.1,
        items: [],
        spells: [],
        primaryRuneTreeId: 8100,
        secondaryRuneTreeId: 8200,
        runes: [],
        riotId: 'Test#EUW',
      },
      minutes: [
        {
          minute: 10,
          positions: [],
          targetStats: { totalGold: 4100, currentGold: 800, cs: 86, level: 9, xp: 5200, damageToChampions: 4000 },
          opponentStats: null,
          goldDiff: 400,
          csDiff: 8,
          xpDiff: 200,
          csDeltaThisMin: 9,
          goldDeltaThisMin: 450,
          wardsPlaced: 1,
          wardsKilled: 0,
          purchases: [],
          events: [],
          flags: [],
          isKeyMoment: false,
        },
        {
          minute: 15,
          positions: [],
          targetStats: { totalGold: 7600, currentGold: 1200, cs: 138, level: 12, xp: 8900, damageToChampions: 7800 },
          opponentStats: null,
          goldDiff: 800,
          csDiff: 15,
          xpDiff: 400,
          csDeltaThisMin: 10,
          goldDeltaThisMin: 550,
          wardsPlaced: 1,
          wardsKilled: 1,
          purchases: [],
          events: [],
          flags: [],
          isKeyMoment: false,
        },
      ],
    };

    const res = extractMatchBenchmarks(mockReport as EngineReport);
    expect(res.csAt10).toBe(86);
    expect(res.csAt15).toBe(138);
    expect(res.goldAt15).toBe(7600);
    expect(res.deathsPre15).toBe(0);

    const cs10Metric = res.metrics.find((m) => m.metricKey === 'csAt10');
    expect(cs10Metric?.matchedTier.name).toBe('DIAMOND');

    // Overall tier should be high Diamond or Master level
    expect(['DIAMOND', 'MASTER']).toContain(res.overallTier.name);
  });
});
