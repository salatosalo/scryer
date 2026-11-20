import { describe, expect, it } from 'vitest';
import { extractMatchBenchmarks, getChampionArchetype, RANK_TIERS } from './benchmarks';
import type { EngineReport } from './types';

describe('benchmarks engine', () => {
  it('correctly maps CS and gold values to respective tiers for laners', () => {
    const mockReport: Partial<EngineReport> = {
      durationMinutes: 28,
      target: {
        participantId: 1,
        championName: 'Ahri',
        team: 'BLUE',
        position: 'MID',
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
        damageToTurrets: 4500,
        killParticipation: 70,
        visionScore: 28,
        wardsPlaced: 8,
        wardsKilled: 3,
        controlWardsBought: 2,
        champLevel: 15,
        summonerSpellIds: [],
        summonerSpellNames: [],
        finalItemIds: [],
        finalItemNames: [],
        trinketId: 3340,
        trinketName: 'Stealth Ward',
        keystoneId: 8112,
        keystoneName: 'Electrocute',
        primaryTreeName: 'Domination',
        secondaryTreeName: 'Sorcery',
        runeIds: [],
        runeNames: [],
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
    expect(res.role).toBe('LANER');

    const cs10Metric = res.metrics.find((m) => m.metricKey === 'csAt10');
    expect(cs10Metric?.playerValue).toBe(86);
    expect(cs10Metric?.matchedTier.name).toBe('DIAMOND');
    expect(['DIAMOND', 'MASTER']).toContain(res.overallTier.name);
  });

  it('correctly adapts metrics for Support role', () => {
    const mockSupport: Partial<EngineReport> = {
      durationMinutes: 30,
      target: {
        participantId: 5,
        championName: 'Thresh',
        team: 'BLUE',
        position: 'SUPP',
        kills: 1,
        deaths: 2,
        assists: 18,
        kda: 9.5,
        cs: 25,
        csPerMin: 0.8,
        goldEarned: 8900,
        goldDiffAt15: 200,
        csDiffAt15: 0,
        damageToChampions: 6500,
        damageToTurrets: 1000,
        killParticipation: 75,
        visionScore: 68,
        wardsPlaced: 32,
        wardsKilled: 12,
        controlWardsBought: 5,
        champLevel: 13,
        summonerSpellIds: [],
        summonerSpellNames: [],
        finalItemIds: [],
        finalItemNames: [],
        trinketId: 3364,
        trinketName: 'Oracle Lens',
        keystoneId: 8439,
        keystoneName: 'Aftershock',
        primaryTreeName: 'Resolve',
        secondaryTreeName: 'Inspiration',
        runeIds: [],
        runeNames: [],
        riotId: 'SupportGod#EUW',
      },
      minutes: [
        {
          minute: 10,
          positions: [],
          targetStats: { totalGold: 2600, currentGold: 400, cs: 15, level: 7, xp: 3800, damageToChampions: 1500 },
          opponentStats: null,
          goldDiff: 100,
          csDiff: 0,
          xpDiff: 50,
          csDeltaThisMin: 1,
          goldDeltaThisMin: 220,
          wardsPlaced: 3,
          wardsKilled: 1,
          purchases: [],
          events: [],
          flags: [],
          isKeyMoment: false,
        },
        {
          minute: 15,
          positions: [],
          targetStats: { totalGold: 4200, currentGold: 600, cs: 22, level: 9, xp: 5500, damageToChampions: 2800 },
          opponentStats: null,
          goldDiff: 200,
          csDiff: 0,
          xpDiff: 100,
          csDeltaThisMin: 1,
          goldDeltaThisMin: 240,
          wardsPlaced: 4,
          wardsKilled: 2,
          purchases: [],
          events: [],
          flags: [],
          isKeyMoment: false,
        },
      ],
    };

    const res = extractMatchBenchmarks(mockSupport as EngineReport);
    expect(res.role).toBe('SUPPORT');
    expect(res.roleNameRu).toBe('Поддержка');

    const visionMetric = res.metrics.find((m) => m.metricKey === 'vision15');
    expect(visionMetric).toBeDefined();
    expect(visionMetric?.unit).toBe('pts');
    expect(visionMetric?.playerValue).toBeGreaterThan(30);

    const controlMetric = res.metrics.find((m) => m.metricKey === 'controlWards');
    expect(controlMetric?.playerValue).toBe(5);
    expect(controlMetric?.matchedTier.name).toBe('DIAMOND');
  });

  it('accurately identifies champion archetypes', () => {
    expect(getChampionArchetype('Kayle')).toBe('SCALING');
    expect(getChampionArchetype('Kassadin')).toBe('SCALING');
    expect(getChampionArchetype('Smolder')).toBe('SCALING');
    expect(getChampionArchetype('Draven')).toBe('EARLY_BULLY');
    expect(getChampionArchetype('Renekton')).toBe('EARLY_BULLY');
    expect(getChampionArchetype('Ahri')).toBe('STANDARD');
  });
});
