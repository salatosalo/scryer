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

export type ChampionArchetype = 'SCALING' | 'EARLY_BULLY' | 'STANDARD';

export interface TierThresholds {
  name: TierName;
  label: string;
  color: string;
}

export const RANK_TIERS: TierThresholds[] = [
  { name: 'IRON', label: 'Iron', color: '#6B7280' },
  { name: 'BRONZE', label: 'Bronze', color: '#92400E' },
  { name: 'SILVER', label: 'Silver', color: '#94A3B8' },
  { name: 'GOLD', label: 'Gold', color: '#EAB308' },
  { name: 'PLATINUM', label: 'Platinum', color: '#2DD4BF' },
  { name: 'EMERALD', label: 'Emerald', color: '#10B981' },
  { name: 'DIAMOND', label: 'Diamond', color: '#38BDF8' },
  { name: 'MASTER', label: 'Master+', color: '#A855F7' },
];

const SCALING_CHAMPIONS = new Set([
  'Kayle', 'Kassadin', 'Smolder', 'AurelionSol', 'Nasus', 'Vladimir',
  'Vayne', 'Senna', 'Veigar', 'KogMaw', 'Jinx', 'Gangplank', 'Viktor',
  'Ryze', 'Sivir', 'Belveth', 'MasterYi', 'Gwen', 'Jax',
]);

const EARLY_BULLY_CHAMPIONS = new Set([
  'Draven', 'Renekton', 'Lucian', 'Caitlyn', 'Jayce', 'Pantheon',
  'Darius', 'Kalista', 'Leblanc', 'Olaf', 'Tristana', 'LeeSin',
  'Elise', 'Nidalee', 'XinZhao', 'Quinn', 'Teemo',
]);

export function getChampionArchetype(championName: string): ChampionArchetype {
  const norm = championName.replace(/[^a-zA-Z]/g, '');
  if (SCALING_CHAMPIONS.has(norm)) return 'SCALING';
  if (EARLY_BULLY_CHAMPIONS.has(norm)) return 'EARLY_BULLY';
  return 'STANDARD';
}

export interface MetricComparison {
  metricKey: string;
  titleRu: string;
  titleEn: string;
  playerValue: number;
  matchedTier: TierThresholds;
  tierValues: Record<TierName, number>;
  goldTierValue: number;
  masterTierValue: number;
  deltaVsGold: number;
  deltaVsMaster: number;
  unit: string;
  isLowerBetter?: boolean;
}

export interface MatchBenchmarksReport {
  role: 'LANER' | 'JUNGLE' | 'SUPPORT';
  roleNameRu: string;
  roleNameEn: string;
  archetype: ChampionArchetype;
  archetypeMultiplier: number;
  overallTier: TierThresholds;
  metrics: MetricComparison[];
  summaryNoteRu: string;
  summaryNoteEn: string;
}

// 1. Laner Standards (TOP, MID, ADC)
const LANER_BASE_TIERS: Record<TierName, { cs10: number; cs15: number; csMin: number; gold15: number; deaths15: number }> = {
  IRON: { cs10: 45, cs15: 68, csMin: 4.5, gold15: 4200, deaths15: 3.2 },
  BRONZE: { cs10: 54, cs15: 82, csMin: 5.2, gold15: 4700, deaths15: 2.6 },
  SILVER: { cs10: 62, cs15: 95, csMin: 5.9, gold15: 5200, deaths15: 2.0 },
  GOLD: { cs10: 69, cs15: 107, csMin: 6.6, gold15: 5750, deaths15: 1.5 },
  PLATINUM: { cs10: 75, cs15: 118, csMin: 7.2, gold15: 6300, deaths15: 1.1 },
  EMERALD: { cs10: 80, cs15: 127, csMin: 7.8, gold15: 6850, deaths15: 0.8 },
  DIAMOND: { cs10: 85, cs15: 136, csMin: 8.4, gold15: 7400, deaths15: 0.6 },
  MASTER: { cs10: 91, cs15: 146, csMin: 9.0, gold15: 8000, deaths15: 0.3 },
};

// 2. Jungle Standards
const JUNGLE_BASE_TIERS: Record<TierName, { cs10: number; cs15: number; obj15: number; gold15: number; deaths15: number }> = {
  IRON: { cs10: 42, cs15: 64, obj15: 0.4, gold15: 4100, deaths15: 3.0 },
  BRONZE: { cs10: 48, cs15: 74, obj15: 0.8, gold15: 4600, deaths15: 2.4 },
  SILVER: { cs10: 55, cs15: 85, obj15: 1.2, gold15: 5100, deaths15: 1.8 },
  GOLD: { cs10: 62, cs15: 98, obj15: 1.7, gold15: 5700, deaths15: 1.3 },
  PLATINUM: { cs10: 68, cs15: 108, obj15: 2.2, gold15: 6250, deaths15: 0.9 },
  EMERALD: { cs10: 74, cs15: 118, obj15: 2.7, gold15: 6750, deaths15: 0.6 },
  DIAMOND: { cs10: 79, cs15: 126, obj15: 3.1, gold15: 7350, deaths15: 0.4 },
  MASTER: { cs10: 85, cs15: 135, obj15: 3.6, gold15: 7950, deaths15: 0.2 },
};

// 3. Support Standards
const SUPPORT_BASE_TIERS: Record<TierName, { vision15: number; wards15: number; controlWards: number; kp: number; deaths15: number }> = {
  IRON: { vision15: 14, wards15: 8, controlWards: 0.4, kp: 35, deaths15: 3.4 },
  BRONZE: { vision15: 19, wards15: 11, controlWards: 0.9, kp: 42, deaths15: 2.7 },
  SILVER: { vision15: 25, wards15: 14, controlWards: 1.5, kp: 48, deaths15: 2.1 },
  GOLD: { vision15: 31, wards15: 18, controlWards: 2.2, kp: 54, deaths15: 1.6 },
  PLATINUM: { vision15: 38, wards15: 22, controlWards: 3.0, kp: 60, deaths15: 1.2 },
  EMERALD: { vision15: 45, wards15: 26, controlWards: 3.8, kp: 66, deaths15: 0.8 },
  DIAMOND: { vision15: 53, wards15: 30, controlWards: 4.8, kp: 72, deaths15: 0.5 },
  MASTER: { vision15: 62, wards15: 35, controlWards: 6.0, kp: 78, deaths15: 0.3 },
};

function matchTierByThresholds(
  value: number,
  tierValues: Record<TierName, number>,
  isLowerBetter = false
): TierThresholds {
  if (isLowerBetter) {
    for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
      const tier = RANK_TIERS[i];
      if (value <= tierValues[tier.name]) {
        return tier;
      }
    }
    return RANK_TIERS[0];
  }

  for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
    const tier = RANK_TIERS[i];
    if (value >= tierValues[tier.name]) {
      return tier;
    }
  }
  return RANK_TIERS[0];
}

export function extractMatchBenchmarks(engine: EngineReport): MatchBenchmarksReport {
  const pos = engine.target.position;
  const isJungle = pos === 'JGL';
  const isSupport = pos === 'SUPP';
  const role: 'LANER' | 'JUNGLE' | 'SUPPORT' = isJungle ? 'JUNGLE' : isSupport ? 'SUPPORT' : 'LANER';

  const archetype = getChampionArchetype(engine.target.championName);
  // Scaling champions have 8% lower early CS threshold, early bullies expected 5% higher
  const archetypeMultiplier = archetype === 'SCALING' ? 0.92 : archetype === 'EARLY_BULLY' ? 1.05 : 1.0;

  const m10 = engine.minutes.find((m) => m.minute === 10);
  const m15 = engine.minutes.find((m) => m.minute === 15);

  let deathsPre15 = 0;
  let wardsPlacedPre15 = 0;
  let objectivesPre15 = 0;

  for (const m of engine.minutes) {
    if (m.minute <= 15) {
      deathsPre15 += m.events.filter((e) => e.type === 'DEATH').length;
      wardsPlacedPre15 += m.wardsPlaced;
      objectivesPre15 += m.events.filter((e) => e.type === 'OBJECTIVE' && (e.involvesTarget || e.team === engine.target.team)).length;
    }
  }

  const csAt10 = m10 ? m10.targetStats.cs : Math.round(engine.target.csPerMin * 10);
  const csAt15 = m15 ? m15.targetStats.cs : Math.round(engine.target.csPerMin * 15);
  const goldAt15 = m15 ? m15.targetStats.totalGold : Math.round(engine.target.goldEarned * 0.55);
  const visionAt15 = Math.round(engine.target.visionScore * (15 / Math.max(15, engine.durationMinutes)));

  let metrics: MetricComparison[] = [];
  let summaryNoteRu = '';
  let summaryNoteEn = '';

  if (role === 'SUPPORT') {
    // Support Metrics: Vision, Wards, Control Wards, KP, Deaths
    const visionTiers = Object.fromEntries(
      RANK_TIERS.map((t) => [t.name, SUPPORT_BASE_TIERS[t.name].vision15])
    ) as Record<TierName, number>;
    const wardsTiers = Object.fromEntries(
      RANK_TIERS.map((t) => [t.name, SUPPORT_BASE_TIERS[t.name].wards15])
    ) as Record<TierName, number>;
    const ctrlTiers = Object.fromEntries(
      RANK_TIERS.map((t) => [t.name, SUPPORT_BASE_TIERS[t.name].controlWards])
    ) as Record<TierName, number>;
    const kpTiers = Object.fromEntries(
      RANK_TIERS.map((t) => [t.name, SUPPORT_BASE_TIERS[t.name].kp])
    ) as Record<TierName, number>;
    const deathsTiers = Object.fromEntries(
      RANK_TIERS.map((t) => [t.name, SUPPORT_BASE_TIERS[t.name].deaths15])
    ) as Record<TierName, number>;

    metrics = [
      {
        metricKey: 'vision15',
        titleRu: 'Счёт обзора на 15:00 (Vision@15)',
        titleEn: 'Vision Score at 15:00',
        playerValue: visionAt15,
        matchedTier: matchTierByThresholds(visionAt15, visionTiers),
        tierValues: visionTiers,
        goldTierValue: visionTiers.GOLD,
        masterTierValue: visionTiers.MASTER,
        deltaVsGold: visionAt15 - visionTiers.GOLD,
        deltaVsMaster: visionAt15 - visionTiers.MASTER,
        unit: 'pts',
      },
      {
        metricKey: 'wards15',
        titleRu: 'Вардов установлено к 15:00',
        titleEn: 'Wards Placed by 15:00',
        playerValue: wardsPlacedPre15,
        matchedTier: matchTierByThresholds(wardsPlacedPre15, wardsTiers),
        tierValues: wardsTiers,
        goldTierValue: wardsTiers.GOLD,
        masterTierValue: wardsTiers.MASTER,
        deltaVsGold: wardsPlacedPre15 - wardsTiers.GOLD,
        deltaVsMaster: wardsPlacedPre15 - wardsTiers.MASTER,
        unit: 'вардов',
      },
      {
        metricKey: 'controlWards',
        titleRu: 'Контрол-варды (тотемы контроля)',
        titleEn: 'Control Wards Purchased',
        playerValue: engine.target.controlWardsBought,
        matchedTier: matchTierByThresholds(engine.target.controlWardsBought, ctrlTiers),
        tierValues: ctrlTiers,
        goldTierValue: ctrlTiers.GOLD,
        masterTierValue: ctrlTiers.MASTER,
        deltaVsGold: Number((engine.target.controlWardsBought - ctrlTiers.GOLD).toFixed(1)),
        deltaVsMaster: Number((engine.target.controlWardsBought - ctrlTiers.MASTER).toFixed(1)),
        unit: 'шт',
      },
      {
        metricKey: 'kp',
        titleRu: 'Участие в убийствах (Kill Participation)',
        titleEn: 'Kill Participation (KP%)',
        playerValue: engine.target.killParticipation,
        matchedTier: matchTierByThresholds(engine.target.killParticipation, kpTiers),
        tierValues: kpTiers,
        goldTierValue: kpTiers.GOLD,
        masterTierValue: kpTiers.MASTER,
        deltaVsGold: engine.target.killParticipation - kpTiers.GOLD,
        deltaVsMaster: engine.target.killParticipation - kpTiers.MASTER,
        unit: '%',
      },
      {
        metricKey: 'deaths15',
        titleRu: 'Смертей до 15:00 (дисциплина вижна)',
        titleEn: 'Deaths before 15:00',
        playerValue: deathsPre15,
        matchedTier: matchTierByThresholds(deathsPre15, deathsTiers, true),
        tierValues: deathsTiers,
        goldTierValue: deathsTiers.GOLD,
        masterTierValue: deathsTiers.MASTER,
        deltaVsGold: Number((deathsPre15 - deathsTiers.GOLD).toFixed(1)),
        deltaVsMaster: Number((deathsPre15 - deathsTiers.MASTER).toFixed(1)),
        unit: 'смертей',
        isLowerBetter: true,
      },
    ];

    summaryNoteRu = 'Для роли поддержки эталоны сфокусированы на контроле карты (Vision Score, глубокие варды и тотемы контроля) и участии в командных драках, а не личном фарме.';
    summaryNoteEn = 'For Support, benchmarks focus on map control (Vision score, ward density, pink wards) and team participation rather than personal CS.';
  } else if (role === 'JUNGLE') {
    // Jungle Metrics: CS@10, CS@15, Objectives@15, Gold@15, Deaths@15
    const cs10Tiers = Object.fromEntries(
      RANK_TIERS.map((t) => [t.name, Math.round(JUNGLE_BASE_TIERS[t.name].cs10 * archetypeMultiplier)])
    ) as Record<TierName, number>;
    const cs15Tiers = Object.fromEntries(
      RANK_TIERS.map((t) => [t.name, Math.round(JUNGLE_BASE_TIERS[t.name].cs15 * archetypeMultiplier)])
    ) as Record<TierName, number>;
    const objTiers = Object.fromEntries(
      RANK_TIERS.map((t) => [t.name, JUNGLE_BASE_TIERS[t.name].obj15])
    ) as Record<TierName, number>;
    const goldTiers = Object.fromEntries(
      RANK_TIERS.map((t) => [t.name, JUNGLE_BASE_TIERS[t.name].gold15])
    ) as Record<TierName, number>;
    const deathsTiers = Object.fromEntries(
      RANK_TIERS.map((t) => [t.name, JUNGLE_BASE_TIERS[t.name].deaths15])
    ) as Record<TierName, number>;

    metrics = [
      {
        metricKey: 'cs10',
        titleRu: 'Зачистка леса к 10:00 (Jungle CS@10)',
        titleEn: 'Jungle Clear at 10:00 (CS@10)',
        playerValue: csAt10,
        matchedTier: matchTierByThresholds(csAt10, cs10Tiers),
        tierValues: cs10Tiers,
        goldTierValue: cs10Tiers.GOLD,
        masterTierValue: cs10Tiers.MASTER,
        deltaVsGold: csAt10 - cs10Tiers.GOLD,
        deltaVsMaster: csAt10 - cs10Tiers.MASTER,
        unit: 'CS',
      },
      {
        metricKey: 'cs15',
        titleRu: 'Темп зачистки к 15:00 (CS@15)',
        titleEn: 'Jungle Clear at 15:00 (CS@15)',
        playerValue: csAt15,
        matchedTier: matchTierByThresholds(csAt15, cs15Tiers),
        tierValues: cs15Tiers,
        goldTierValue: cs15Tiers.GOLD,
        masterTierValue: cs15Tiers.MASTER,
        deltaVsGold: csAt15 - cs15Tiers.GOLD,
        deltaVsMaster: csAt15 - cs15Tiers.MASTER,
        unit: 'CS',
      },
      {
        metricKey: 'objectives15',
        titleRu: 'Ранние объекты к 15:00 (Войдграбы / Драконы)',
        titleEn: 'Early Objectives (Grubs / Drakes)',
        playerValue: objectivesPre15,
        matchedTier: matchTierByThresholds(objectivesPre15, objTiers),
        tierValues: objTiers,
        goldTierValue: objTiers.GOLD,
        masterTierValue: objTiers.MASTER,
        deltaVsGold: Number((objectivesPre15 - objTiers.GOLD).toFixed(1)),
        deltaVsMaster: Number((objectivesPre15 - objTiers.MASTER).toFixed(1)),
        unit: 'объектов',
      },
      {
        metricKey: 'gold15',
        titleRu: 'Золото лесника на 15:00 (Gold@15)',
        titleEn: 'Jungle Gold at 15:00',
        playerValue: goldAt15,
        matchedTier: matchTierByThresholds(goldAt15, goldTiers),
        tierValues: goldTiers,
        goldTierValue: goldTiers.GOLD,
        masterTierValue: goldTiers.MASTER,
        deltaVsGold: goldAt15 - goldTiers.GOLD,
        deltaVsMaster: goldAt15 - goldTiers.MASTER,
        unit: 'g',
      },
      {
        metricKey: 'deaths15',
        titleRu: 'Смертей до 15:00 (безопасность инвейдов)',
        titleEn: 'Deaths before 15:00',
        playerValue: deathsPre15,
        matchedTier: matchTierByThresholds(deathsPre15, deathsTiers, true),
        tierValues: deathsTiers,
        goldTierValue: deathsTiers.GOLD,
        masterTierValue: deathsTiers.MASTER,
        deltaVsGold: Number((deathsPre15 - deathsTiers.GOLD).toFixed(1)),
        deltaVsMaster: Number((deathsPre15 - deathsTiers.MASTER).toFixed(1)),
        unit: 'смертей',
        isLowerBetter: true,
      },
    ];

    summaryNoteRu = 'Для роли лесника эталоны учитывают скорость чистки лесных лагерей, контроль Войдграбов и Драконов к 15:00 и дисциплину без смертей на инвейдах.';
    summaryNoteEn = 'For Junglers, benchmarks evaluate camp clear tempo, control over early Voidgrubs and Dragons, and avoiding death on invade routes.';
  } else {
    // Laner Metrics (MID, TOP, ADC)
    const cs10Tiers = Object.fromEntries(
      RANK_TIERS.map((t) => [t.name, Math.round(LANER_BASE_TIERS[t.name].cs10 * archetypeMultiplier)])
    ) as Record<TierName, number>;
    const cs15Tiers = Object.fromEntries(
      RANK_TIERS.map((t) => [t.name, Math.round(LANER_BASE_TIERS[t.name].cs15 * archetypeMultiplier)])
    ) as Record<TierName, number>;
    const csMinTiers = Object.fromEntries(
      RANK_TIERS.map((t) => [t.name, Number((LANER_BASE_TIERS[t.name].csMin * archetypeMultiplier).toFixed(1))])
    ) as Record<TierName, number>;
    const goldTiers = Object.fromEntries(
      RANK_TIERS.map((t) => [t.name, LANER_BASE_TIERS[t.name].gold15])
    ) as Record<TierName, number>;
    const deathsTiers = Object.fromEntries(
      RANK_TIERS.map((t) => [t.name, LANER_BASE_TIERS[t.name].deaths15])
    ) as Record<TierName, number>;

    metrics = [
      {
        metricKey: 'csAt10',
        titleRu: 'Фарм на 10:00 (CS@10)',
        titleEn: 'CS at 10:00 (CS@10)',
        playerValue: csAt10,
        matchedTier: matchTierByThresholds(csAt10, cs10Tiers),
        tierValues: cs10Tiers,
        goldTierValue: cs10Tiers.GOLD,
        masterTierValue: cs10Tiers.MASTER,
        deltaVsGold: csAt10 - cs10Tiers.GOLD,
        deltaVsMaster: csAt10 - cs10Tiers.MASTER,
        unit: 'CS',
      },
      {
        metricKey: 'csAt15',
        titleRu: 'Фарм на 15:00 (CS@15)',
        titleEn: 'CS at 15:00 (CS@15)',
        playerValue: csAt15,
        matchedTier: matchTierByThresholds(csAt15, cs15Tiers),
        tierValues: cs15Tiers,
        goldTierValue: cs15Tiers.GOLD,
        masterTierValue: cs15Tiers.MASTER,
        deltaVsGold: csAt15 - cs15Tiers.GOLD,
        deltaVsMaster: csAt15 - cs15Tiers.MASTER,
        unit: 'CS',
      },
      {
        metricKey: 'csPerMin',
        titleRu: 'Темп фарма в минуту (CS/m)',
        titleEn: 'CS per minute (CS/m)',
        playerValue: engine.target.csPerMin,
        matchedTier: matchTierByThresholds(engine.target.csPerMin, csMinTiers),
        tierValues: csMinTiers,
        goldTierValue: csMinTiers.GOLD,
        masterTierValue: csMinTiers.MASTER,
        deltaVsGold: Number((engine.target.csPerMin - csMinTiers.GOLD).toFixed(1)),
        deltaVsMaster: Number((engine.target.csPerMin - csMinTiers.MASTER).toFixed(1)),
        unit: 'CS/m',
      },
      {
        metricKey: 'goldAt15',
        titleRu: 'Золото на 15:00 (Gold@15)',
        titleEn: 'Gold at 15:00 (Gold@15)',
        playerValue: goldAt15,
        matchedTier: matchTierByThresholds(goldAt15, goldTiers),
        tierValues: goldTiers,
        goldTierValue: goldTiers.GOLD,
        masterTierValue: goldTiers.MASTER,
        deltaVsGold: goldAt15 - goldTiers.GOLD,
        deltaVsMaster: goldAt15 - goldTiers.MASTER,
        unit: 'g',
      },
      {
        metricKey: 'deathsPre15',
        titleRu: 'Смертей до 15:00 (лейнинг-дисциплина)',
        titleEn: 'Deaths before 15:00',
        playerValue: deathsPre15,
        matchedTier: matchTierByThresholds(deathsPre15, deathsTiers, true),
        tierValues: deathsTiers,
        goldTierValue: deathsTiers.GOLD,
        masterTierValue: deathsTiers.MASTER,
        deltaVsGold: Number((deathsPre15 - deathsTiers.GOLD).toFixed(1)),
        deltaVsMaster: Number((deathsPre15 - deathsTiers.MASTER).toFixed(1)),
        unit: 'смертей',
        isLowerBetter: true,
      },
    ];

    if (archetype === 'SCALING') {
      summaryNoteRu = `Для чемпиона ${engine.target.championName} учтён архетип «Поздний гиперкерри» — порог CS в ранней игре откалиброван с поправкой на пассивный старт линии (-8%).`;
      summaryNoteEn = `For ${engine.target.championName}, the «Late Game Hyper-carry» archetype is active — early CS expectations are calibrated with an early survival allowance (-8%).`;
    } else if (archetype === 'EARLY_BULLY') {
      summaryNoteRu = `Для чемпиона ${engine.target.championName} учтён архетип «Доминатор линии» — требования к CS и золоту на ранних уровнях выше (+5%), так как чемпион обязан создавать давление.`;
      summaryNoteEn = `For ${engine.target.championName}, the «Early Lane Bully» archetype is active — early CS and gold expectations are stricter (+5%) to reward lane dominance.`;
    } else {
      summaryNoteRu = `Стандартная соревновательная калибровка для роли ${pos} на Summoner's Rift.`;
      summaryNoteEn = `Standard competitive benchmark calibration for ${pos} role on Summoner's Rift.`;
    }
  }

  // Calculate overall tier
  const tierIndices = metrics.map((m) => RANK_TIERS.findIndex((t) => t.name === m.matchedTier.name));
  const avgIndex = Math.round(tierIndices.reduce((a, b) => a + b, 0) / tierIndices.length);
  const overallTier = RANK_TIERS[Math.max(0, Math.min(RANK_TIERS.length - 1, avgIndex))];

  return {
    role,
    roleNameRu: role === 'SUPPORT' ? 'Поддержка' : role === 'JUNGLE' ? 'Лесник' : 'Одиночная линия / Керри',
    roleNameEn: role === 'SUPPORT' ? 'Support' : role === 'JUNGLE' ? 'Jungle' : 'Laner / Carry',
    archetype,
    archetypeMultiplier,
    overallTier,
    metrics,
    summaryNoteRu,
    summaryNoteEn,
  };
}
