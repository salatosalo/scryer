import type { EngineReport } from './types';

export type TierName =
  | 'IRON'
  | 'BRONZE'
  | 'SILVER'
  | 'GOLD'
  | 'PLATINUM'
  | 'EMERALD'
  | 'DIAMOND'
  | 'MASTER';

export interface TierThresholds {
  name: TierName;
  label: string;
  color: string;
  csAt10: number;
  csAt15: number;
  csPerMin: number;
  goldAt15: number;
  deathsPre15: number;
}

export const RANK_TIERS: TierThresholds[] = [
  {
    name: 'IRON',
    label: 'Iron',
    color: '#6B7280',
    csAt10: 45,
    csAt15: 68,
    csPerMin: 4.5,
    goldAt15: 4200,
    deathsPre15: 3.2,
  },
  {
    name: 'BRONZE',
    label: 'Bronze',
    color: '#92400E',
    csAt10: 54,
    csAt15: 82,
    csPerMin: 5.2,
    goldAt15: 4700,
    deathsPre15: 2.6,
  },
  {
    name: 'SILVER',
    label: 'Silver',
    color: '#94A3B8',
    csAt10: 62,
    csAt15: 95,
    csPerMin: 5.9,
    goldAt15: 5200,
    deathsPre15: 2.0,
  },
  {
    name: 'GOLD',
    label: 'Gold',
    color: '#EAB308',
    csAt10: 69,
    csAt15: 107,
    csPerMin: 6.6,
    goldAt15: 5750,
    deathsPre15: 1.5,
  },
  {
    name: 'PLATINUM',
    label: 'Platinum',
    color: '#2DD4BF',
    csAt10: 75,
    csAt15: 118,
    csPerMin: 7.2,
    goldAt15: 6300,
    deathsPre15: 1.1,
  },
  {
    name: 'EMERALD',
    label: 'Emerald',
    color: '#10B981',
    csAt10: 80,
    csAt15: 127,
    csPerMin: 7.8,
    goldAt15: 6850,
    deathsPre15: 0.8,
  },
  {
    name: 'DIAMOND',
    label: 'Diamond',
    color: '#38BDF8',
    csAt10: 85,
    csAt15: 136,
    csPerMin: 8.4,
    goldAt15: 7400,
    deathsPre15: 0.6,
  },
  {
    name: 'MASTER',
    label: 'Master+',
    color: '#A855F7',
    csAt10: 91,
    csAt15: 146,
    csPerMin: 9.0,
    goldAt15: 8000,
    deathsPre15: 0.3,
  },
];

export interface MetricComparison {
  metricKey: 'csAt10' | 'csAt15' | 'csPerMin' | 'goldAt15' | 'deathsPre15';
  titleRu: string;
  titleEn: string;
  playerValue: number;
  matchedTier: TierThresholds;
  goldTierValue: number;
  masterTierValue: number;
  deltaVsGold: number;
  deltaVsMaster: number;
  unit: string;
  isLowerBetter?: boolean;
}

export interface MatchBenchmarksReport {
  overallTier: TierThresholds;
  metrics: MetricComparison[];
  csAt10: number;
  csAt15: number;
  csPerMin: number;
  goldAt15: number;
  deathsPre15: number;
}

function findTierForValue(
  val: number,
  key: 'csAt10' | 'csAt15' | 'csPerMin' | 'goldAt15' | 'deathsPre15',
  isLowerBetter = false
): TierThresholds {
  if (isLowerBetter) {
    // For deaths: lower is better!
    for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
      if (val <= RANK_TIERS[i][key]) {
        return RANK_TIERS[i];
      }
    }
    return RANK_TIERS[0];
  }

  // Higher is better
  for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
    if (val >= RANK_TIERS[i][key]) {
      return RANK_TIERS[i];
    }
  }
  return RANK_TIERS[0];
}

export function extractMatchBenchmarks(engine: EngineReport): MatchBenchmarksReport {
  const m10 = engine.minutes.find((m) => m.minute === 10);
  const m15 = engine.minutes.find((m) => m.minute === 15);

  const csAt10 = m10 ? m10.targetStats.cs : Math.round(engine.target.csPerMin * 10);
  const csAt15 = m15 ? m15.targetStats.cs : Math.round(engine.target.csPerMin * 15);
  const goldAt15 = m15 ? m15.targetStats.totalGold : Math.round(engine.target.goldEarned * 0.55);
  const csPerMin = engine.target.csPerMin;

  let deathsPre15 = 0;
  for (const m of engine.minutes) {
    if (m.minute <= 15) {
      deathsPre15 += m.events.filter((e) => e.type === 'DEATH').length;
    }
  }

  const goldRef = RANK_TIERS.find((t) => t.name === 'GOLD')!;
  const masterRef = RANK_TIERS.find((t) => t.name === 'MASTER')!;

  const csAt10Tier = findTierForValue(csAt10, 'csAt10');
  const csAt15Tier = findTierForValue(csAt15, 'csAt15');
  const csPerMinTier = findTierForValue(csPerMin, 'csPerMin');
  const goldAt15Tier = findTierForValue(goldAt15, 'goldAt15');
  const deathsPre15Tier = findTierForValue(deathsPre15, 'deathsPre15', true);

  const metrics: MetricComparison[] = [
    {
      metricKey: 'csAt10',
      titleRu: 'Фарм на 10:00 (CS@10)',
      titleEn: 'CS at 10:00 (CS@10)',
      playerValue: csAt10,
      matchedTier: csAt10Tier,
      goldTierValue: goldRef.csAt10,
      masterTierValue: masterRef.csAt10,
      deltaVsGold: csAt10 - goldRef.csAt10,
      deltaVsMaster: csAt10 - masterRef.csAt10,
      unit: 'CS',
    },
    {
      metricKey: 'csAt15',
      titleRu: 'Фарм на 15:00 (CS@15)',
      titleEn: 'CS at 15:00 (CS@15)',
      playerValue: csAt15,
      matchedTier: csAt15Tier,
      goldTierValue: goldRef.csAt15,
      masterTierValue: masterRef.csAt15,
      deltaVsGold: csAt15 - goldRef.csAt15,
      deltaVsMaster: csAt15 - masterRef.csAt15,
      unit: 'CS',
    },
    {
      metricKey: 'csPerMin',
      titleRu: 'Темп фарма в минуту (CS/m)',
      titleEn: 'CS per minute (CS/m)',
      playerValue: csPerMin,
      matchedTier: csPerMinTier,
      goldTierValue: goldRef.csPerMin,
      masterTierValue: masterRef.csPerMin,
      deltaVsGold: Number((csPerMin - goldRef.csPerMin).toFixed(1)),
      deltaVsMaster: Number((csPerMin - masterRef.csPerMin).toFixed(1)),
      unit: 'CS/m',
    },
    {
      metricKey: 'goldAt15',
      titleRu: 'Золото на 15:00 (Gold@15)',
      titleEn: 'Gold at 15:00 (Gold@15)',
      playerValue: goldAt15,
      matchedTier: goldAt15Tier,
      goldTierValue: goldRef.goldAt15,
      masterTierValue: masterRef.goldAt15,
      deltaVsGold: goldAt15 - goldRef.goldAt15,
      deltaVsMaster: goldAt15 - masterRef.goldAt15,
      unit: 'g',
    },
    {
      metricKey: 'deathsPre15',
      titleRu: 'Смертей до 15:00',
      titleEn: 'Deaths before 15:00',
      playerValue: deathsPre15,
      matchedTier: deathsPre15Tier,
      goldTierValue: goldRef.deathsPre15,
      masterTierValue: masterRef.deathsPre15,
      deltaVsGold: Number((deathsPre15 - goldRef.deathsPre15).toFixed(1)),
      deltaVsMaster: Number((deathsPre15 - masterRef.deathsPre15).toFixed(1)),
      unit: 'смертей',
      isLowerBetter: true,
    },
  ];

  // Average tier calculation
  const tierIndices = [
    RANK_TIERS.indexOf(csAt10Tier),
    RANK_TIERS.indexOf(csAt15Tier),
    RANK_TIERS.indexOf(csPerMinTier),
    RANK_TIERS.indexOf(goldAt15Tier),
    RANK_TIERS.indexOf(deathsPre15Tier),
  ];
  const avgIndex = Math.round(
    tierIndices.reduce((a, b) => a + b, 0) / tierIndices.length
  );
  const overallTier = RANK_TIERS[Math.max(0, Math.min(RANK_TIERS.length - 1, avgIndex))];

  return {
    overallTier,
    metrics,
    csAt10,
    csAt15,
    csPerMin,
    goldAt15,
    deathsPre15,
  };
}
