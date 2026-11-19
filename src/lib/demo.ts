import type { AiCoachingReport } from '@/lib/ai/schema';
import type { SupportedLang } from '@/lib/i18n/types';
import type { EngineReport, MinuteSnapshot, ParticipantSummary, PlayerPosition } from '@/lib/engine/types';

const DEMO_VERSION = '16.22.1';

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

function buildDemoPositions(minute: number): PlayerPosition[] {
  // Realistic macro movement across 39 minutes on Summoner's Rift (0..14800)
  const clamp = (v: number) => Math.max(600, Math.min(14200, v));
  const wave = Math.sin(minute * 0.7) * 900;
  const isLane = minute <= 14;
  const isDragonFight = minute === 18 || minute === 24 || minute === 30 || minute === 35;
  const isBaronFight = minute === 33;

  const fioraPos = isLane
    ? { x: clamp(2300 + minute * 110), y: clamp(12200 + Math.sin(minute) * 500) }
    : minute === 24
      ? { x: 10900, y: 13200 } // deep top push death without vision
      : minute === 35
        ? { x: 9600, y: 4900 } // late dragon teamfight
        : { x: clamp(minute % 2 === 0 ? 11200 + wave * 0.5 : 3400 + wave * 0.5), y: clamp(minute % 2 === 0 ? 2900 : 12600) };

  const kaylePos = isLane
    ? { x: clamp(3200 + minute * 80), y: clamp(12600 + Math.cos(minute) * 400) }
    : isDragonFight
      ? { x: 10200, y: 4600 }
      : { x: clamp(10600 + wave * 0.4), y: clamp(11900) };

  const choPos = isDragonFight
    ? { x: 9850, y: 4450 }
    : isBaronFight
      ? { x: 4950, y: 10400 }
      : { x: clamp(7400 + Math.cos(minute * 0.9) * 3200), y: clamp(7400 + Math.sin(minute * 0.8) * 3200) };

  const zedPos = isLane
    ? { x: clamp(7600 + wave * 0.5), y: clamp(7600 + wave * 0.5) }
    : isDragonFight
      ? { x: 9400, y: 5200 }
      : { x: clamp(8200 + Math.sin(minute) * 2400), y: clamp(7000 + Math.cos(minute) * 2400) };

  const hecPos = isDragonFight
    ? { x: 9000, y: 4800 }
    : { x: clamp(6400 + Math.sin(minute * 1.1) * 2900), y: clamp(6900 + Math.cos(minute * 0.7) * 2900) };

  const akaliPos = isLane
    ? { x: clamp(7000 + wave * 0.4), y: clamp(7000 + wave * 0.4) }
    : { x: clamp(6800 + Math.cos(minute) * 2200), y: clamp(6600 + Math.sin(minute) * 2200) };

  const varusPos = isLane
    ? { x: clamp(11400 + wave * 0.4), y: clamp(2300 + wave * 0.3) }
    : isDragonFight
      ? { x: 8700, y: 4100 }
      : { x: clamp(7100 + wave * 0.8), y: clamp(6400 + wave * 0.6) };

  const dianaPos = { x: clamp(varusPos.x + 550), y: clamp(varusPos.y - 350) };
  const renataPos = isLane
    ? { x: clamp(12200 + wave * 0.3), y: clamp(2900 + wave * 0.3) }
    : isDragonFight
      ? { x: 10400, y: 4900 }
      : { x: clamp(8800 + wave * 0.6), y: clamp(7800 + wave * 0.5) };
  const velkozPos = { x: clamp(renataPos.x + 480), y: clamp(renataPos.y + 420) };

  return [
    { participantId: 1, championName: 'Fiora', team: 'BLUE', x: fioraPos.x, y: fioraPos.y, alive: minute !== 24 && minute !== 35, isTarget: true, isLaneOpponent: false },
    { participantId: 2, championName: 'Hecarim', team: 'BLUE', x: hecPos.x, y: hecPos.y, alive: true, isTarget: false, isLaneOpponent: false },
    { participantId: 3, championName: 'Akali', team: 'BLUE', x: akaliPos.x, y: akaliPos.y, alive: minute !== 15 && minute !== 28, isTarget: false, isLaneOpponent: false },
    { participantId: 4, championName: 'Varus', team: 'BLUE', x: varusPos.x, y: varusPos.y, alive: minute !== 35, isTarget: false, isLaneOpponent: false },
    { participantId: 5, championName: 'Diana', team: 'BLUE', x: dianaPos.x, y: dianaPos.y, alive: minute !== 18 && minute !== 30, isTarget: false, isLaneOpponent: false },
    { participantId: 6, championName: 'Kayle', team: 'RED', x: kaylePos.x, y: kaylePos.y, alive: minute !== 6 && minute !== 11 && minute !== 16, isTarget: false, isLaneOpponent: true },
    { participantId: 7, championName: 'Chogath', team: 'RED', x: choPos.x, y: choPos.y, alive: true, isTarget: false, isLaneOpponent: false },
    { participantId: 8, championName: 'Zed', team: 'RED', x: zedPos.x, y: zedPos.y, alive: true, isTarget: false, isLaneOpponent: false },
    { participantId: 9, championName: 'Renata', team: 'RED', x: renataPos.x, y: renataPos.y, alive: true, isTarget: false, isLaneOpponent: false },
    { participantId: 10, championName: 'Velkoz', team: 'RED', x: velkozPos.x, y: velkozPos.y, alive: true, isTarget: false, isLaneOpponent: false },
  ];
}

export function buildDemoMatch(lang: SupportedLang): {
  engineReport: EngineReport;
  aiReport: AiCoachingReport;
  meta: { cached: boolean; provider: string; model: string; isDemo: boolean };
} {
  const durationMinutes = 39;

  const target: ParticipantSummary = {
    participantId: 1,
    puuid: 'DEMO_PUUID',
    riotId: 'chovyloh#228',
    team: 'BLUE',
    position: 'TOP',
    championId: 114,
    championName: 'Fiora',
    win: false,
    kills: 17,
    deaths: 6,
    assists: 5,
    kda: 3.67,
    killParticipation: 54,
    cs: 295,
    csPerMin: 7.5,
    goldEarned: 21379,
    damageToChampions: 55563,
    damageToTurrets: 11420,
    visionScore: 41,
    wardsPlaced: 14,
    wardsKilled: 4,
    controlWardsBought: 1,
    champLevel: 18,
    summonerSpellIds: [4, 12],
    summonerSpellNames: ['Flash', 'Teleport'],
    finalItemIds: [3074, 6333, 3156, 6692, 3181, 3071],
    finalItemNames: [
      'Ravenous Hydra',
      "Death's Dance",
      'Maw of Malmortius',
      'Eclipse',
      'Hullbreaker',
      'Endless Hunger',
    ],
    trinketId: 3340,
    trinketName: 'Stealth Ward',
    keystoneId: 9923,
    keystoneName: 'Hail of Blades',
    primaryTreeName: 'Domination',
    secondaryTreeName: 'Sorcery',
    runeIds: [9923],
    runeNames: ['Hail of Blades', 'Sudden Impact', 'Grisly Mementos', 'Treasure Hunter', 'Transcendence', 'Gathering Storm'],
  };

  const laneOpponent: ParticipantSummary = {
    participantId: 6,
    puuid: 'DEMO_OPP',
    riotId: 'MarshM4ll0w#2303',
    team: 'RED',
    position: 'TOP',
    championId: 10,
    championName: 'Kayle',
    win: true,
    kills: 2,
    deaths: 11,
    assists: 2,
    kda: 0.36,
    killParticipation: 8,
    cs: 245,
    csPerMin: 6.3,
    goldEarned: 12785,
    damageToChampions: 11887,
    damageToTurrets: 1200,
    visionScore: 21,
    wardsPlaced: 9,
    wardsKilled: 1,
    controlWardsBought: 0,
    champLevel: 16,
    summonerSpellIds: [4, 12],
    summonerSpellNames: ['Flash', 'Teleport'],
    finalItemIds: [3115, 3089, 3006],
    finalItemNames: ["Nashor's Tooth", "Rabadon's Deathcap", "Berserker's Greaves"],
    trinketId: 3340,
    trinketName: 'Stealth Ward',
    keystoneId: 8005,
    keystoneName: 'Press the Attack',
    primaryTreeName: 'Precision',
    secondaryTreeName: 'Resolve',
    runeIds: [8005],
    runeNames: ['Press the Attack'],
  };

  const blueTeam: ParticipantSummary[] = [
    target,
    { ...target, participantId: 2, puuid: 'b2', riotId: 'Velicko#8688', position: 'JGL', championId: 120, championName: 'Hecarim', kills: 5, deaths: 9, assists: 14, kda: 2.11, killParticipation: 46, cs: 209, csPerMin: 5.3, goldEarned: 14114, damageToChampions: 21496, visionScore: 34, finalItemIds: [3078, 6333], finalItemNames: ['Trinity Force', "Death's Dance"] },
    { ...target, participantId: 3, puuid: 'b3', riotId: 'Denča Brate#1312', position: 'MID', championId: 84, championName: 'Akali', kills: 1, deaths: 9, assists: 6, kda: 0.78, killParticipation: 17, cs: 117, csPerMin: 3.0, goldEarned: 8417, damageToChampions: 16763, visionScore: 9, finalItemIds: [3152], finalItemNames: ['Hextech Rocketbelt'] },
    { ...target, participantId: 4, puuid: 'b4', riotId: 'TvojCale69#6969', position: 'ADC', championId: 110, championName: 'Varus', kills: 12, deaths: 12, assists: 10, kda: 1.83, killParticipation: 54, cs: 212, csPerMin: 5.4, goldEarned: 17209, damageToChampions: 47744, visionScore: 41, finalItemIds: [3153, 3124], finalItemNames: ['Blade of the Ruined King', "Guinsoo's Rageblade"] },
    { ...target, participantId: 5, puuid: 'b5', riotId: 'Enrico Pucci#riri', position: 'SUPP', championId: 131, championName: 'Diana', kills: 6, deaths: 16, assists: 10, kda: 1.0, killParticipation: 39, cs: 40, csPerMin: 1.0, goldEarned: 13233, damageToChampions: 29143, visionScore: 104, finalItemIds: [3157], finalItemNames: ["Zhonya's Hourglass"] },
  ];

  const redTeam: ParticipantSummary[] = [
    laneOpponent,
    { ...laneOpponent, participantId: 7, puuid: 'r2', riotId: 'thegingergiant9#miku', position: 'JGL', championId: 31, championName: 'Chogath', kills: 18, deaths: 7, assists: 13, kda: 4.43, killParticipation: 60, cs: 240, csPerMin: 6.1, goldEarned: 20355, damageToChampions: 59405, visionScore: 22, finalItemIds: [3084, 3068], finalItemNames: ['Heartsteel', 'Sunfire Aegis'] },
    { ...laneOpponent, participantId: 8, puuid: 'r3', riotId: 'Nizzem#EUW', position: 'MID', championId: 238, championName: 'Zed', kills: 16, deaths: 4, assists: 8, kda: 6.0, killParticipation: 46, cs: 208, csPerMin: 5.3, goldEarned: 16653, damageToChampions: 33068, visionScore: 29, finalItemIds: [6692, 6694], finalItemNames: ['Eclipse', "Serylda's Grudge"] },
    { ...laneOpponent, participantId: 9, puuid: 'r4', riotId: 'Affeking#EUW', position: 'ADC', championId: 888, championName: 'Renata', kills: 5, deaths: 11, assists: 12, kda: 1.55, killParticipation: 33, cs: 215, csPerMin: 5.5, goldEarned: 14974, damageToChampions: 21757, visionScore: 5, finalItemIds: [3115], finalItemNames: ["Nashor's Tooth"] },
    { ...laneOpponent, participantId: 10, puuid: 'r5', riotId: 'unbannableZaggar#EUW', position: 'SUPP', championId: 161, championName: 'Velkoz', kills: 11, deaths: 9, assists: 13, kda: 2.67, killParticipation: 46, cs: 85, csPerMin: 2.2, goldEarned: 15892, damageToChampions: 40587, visionScore: 61, finalItemIds: [6655, 3157], finalItemNames: ["Luden's Companion", "Zhonya's Hourglass"] },
  ];

  const purchaseTimeline = [
    { minute: 1, timestampSec: 15, itemId: 1055, itemName: "Doran's Blade", totalGold: 450, isCompleted: false },
    { minute: 10, timestampSec: 590, itemId: 3074, itemName: 'Ravenous Hydra', totalGold: 3300, isCompleted: true },
    { minute: 16, timestampSec: 940, itemId: 6692, itemName: 'Eclipse', totalGold: 2900, isCompleted: true },
    { minute: 22, timestampSec: 1310, itemId: 3181, itemName: 'Hullbreaker', totalGold: 3000, isCompleted: true },
    { minute: 27, timestampSec: 1610, itemId: 6333, itemName: "Death's Dance", totalGold: 3300, isCompleted: true },
    { minute: 32, timestampSec: 1900, itemId: 3156, itemName: 'Maw of Malmortius', totalGold: 3100, isCompleted: true },
    { minute: 36, timestampSec: 2150, itemId: 3071, itemName: 'Endless Hunger', totalGold: 3000, isCompleted: true },
  ];

  const minutes: MinuteSnapshot[] = [];
  let prevCs = 0;
  let prevGold = 500;

  for (let m = 1; m <= durationMinutes; m++) {
    const progress = m / durationMinutes;
    const totalGold = Math.round(500 + progress * 20879 + (m >= 11 ? 700 : 0) - (m >= 24 ? 200 : 0));
    const oppGold = Math.round(500 + progress * 12285);
    const cs = Math.round(progress * 295);
    const oppCs = Math.round(progress * 245);
    const csDelta = Math.max(0, cs - prevCs);
    const goldDelta = totalGold - prevGold;
    prevCs = cs;
    prevGold = totalGold;

    const events: MinuteSnapshot['events'] = [];
    const flags: MinuteSnapshot['flags'] = [];

    if (m === 6) {
      events.push({ timestampSec: 342, minute: m, type: 'KILL', team: 'BLUE', label: 'Killed Kayle (Solo)', x: 2900, y: 12500, involvesTarget: true });
      flags.push('STRONG_TEMPO_PLAY');
    } else if (m === 11) {
      events.push({ timestampSec: 635, minute: m, type: 'KILL', team: 'BLUE', label: 'Killed Kayle (Solo)', x: 3100, y: 12700, involvesTarget: true });
      events.push({ timestampSec: 650, minute: m, type: 'PLATE', team: 'BLUE', label: 'Took turret plate', x: 4300, y: 13800, involvesTarget: true });
      flags.push('STRONG_TEMPO_PLAY');
    } else if (m === 13) {
      events.push({ timestampSec: 760, minute: m, type: 'BUILDING', team: 'BLUE', label: 'Ally destroyed TOP Tower', x: 4318, y: 13875, involvesTarget: true });
      flags.push('STRONG_TEMPO_PLAY');
    } else if (m === 18) {
      events.push({ timestampSec: 1065, minute: m, type: 'OBJECTIVE', team: 'RED', label: 'Enemy secured Mountain Dragon', x: 9866, y: 4414, involvesTarget: false });
      flags.push('OBJECTIVE_CONTEST_MISSED');
    } else if (m === 24) {
      events.push({
        timestampSec: 1418,
        minute: m,
        type: 'DEATH',
        team: 'RED',
        label: 'Died to Chogath (+1 assist) [Shutdown +450g]',
        x: 10900,
        y: 13200,
        involvesTarget: true,
        bountyGold: 750,
        hadVision: false,
        nearbyAllies: 0,
        nearbyEnemies: 2,
        topDamageSources: ['Chogath (1640)', 'Zed (1120)'],
      });
      events.push({ timestampSec: 1435, minute: m, type: 'OBJECTIVE', team: 'RED', label: 'Enemy secured Infernal Dragon', x: 9866, y: 4414, involvesTarget: false });
      flags.push('DEATH_NO_VISION', 'BOUNTY_THROWN');
    } else if (m === 28) {
      events.push({ timestampSec: 1650, minute: m, type: 'KILL', team: 'BLUE', label: 'Killed Renata', x: 11200, y: 3100, involvesTarget: true });
      flags.push('STRONG_TEMPO_PLAY');
    } else if (m === 30) {
      events.push({ timestampSec: 1790, minute: m, type: 'OBJECTIVE', team: 'RED', label: 'Enemy secured Soul Dragon', x: 9866, y: 4414, involvesTarget: false });
      flags.push('OBJECTIVE_CONTEST_MISSED');
    } else if (m === 33) {
      events.push({ timestampSec: 1960, minute: m, type: 'OBJECTIVE', team: 'RED', label: 'Enemy secured Baron Nashor', x: 4950, y: 10400, involvesTarget: false });
      flags.push('OBJECTIVE_CONTEST_MISSED', 'HIGH_UNSPENT_GOLD');
    } else if (m === 35) {
      events.push({
        timestampSec: 2088,
        minute: m,
        type: 'DEATH',
        team: 'RED',
        label: 'Died to Chogath (+2 assists) [Shutdown +300g]',
        x: 9600,
        y: 4900,
        involvesTarget: true,
        bountyGold: 600,
        hadVision: true,
        nearbyAllies: 2,
        nearbyEnemies: 4,
        topDamageSources: ['Chogath (1890)', 'Velkoz (1340)', 'Zed (780)'],
      });
      flags.push('BOUNTY_THROWN');
    }

    const buys = purchaseTimeline.filter((p) => p.minute === m);
    const isKeyMoment = flags.length > 0 || events.length > 0 || buys.some((b) => b.isCompleted);

    minutes.push({
      minute: m,
      positions: buildDemoPositions(m),
      targetStats: {
        totalGold,
        currentGold: m === 33 ? 2350 : (m * 310) % 1400,
        cs,
        level: Math.min(18, Math.max(1, Math.round(1 + progress * 17))),
        xp: Math.round(progress * 19500),
        damageToChampions: Math.round(progress * 55563),
      },
      opponentStats: {
        totalGold: oppGold,
        currentGold: 600,
        cs: oppCs,
        level: Math.min(16, Math.max(1, Math.round(1 + progress * 15))),
        xp: Math.round(progress * 15500),
        damageToChampions: Math.round(progress * 11887),
      },
      goldDiff: totalGold - oppGold,
      csDiff: cs - oppCs,
      xpDiff: lerp(0, 4000, progress),
      csDeltaThisMin: csDelta,
      goldDeltaThisMin: goldDelta,
      wardsPlaced: m % 3 === 0 ? 1 : 0,
      wardsKilled: m % 10 === 0 ? 1 : 0,
      purchases: buys,
      events,
      flags,
      isKeyMoment,
    });
  }

  const engineReport: EngineReport = {
    matchId: 'DEMO_EUW1_FIORA_39M',
    region: 'euw',
    patch: '16.22',
    ddragonVersion: DEMO_VERSION,
    queueId: 400,
    playedAt: Date.now() - 15 * 60 * 1000,
    durationSec: 2350,
    durationMinutes,
    result: 'LOSE',
    target,
    laneOpponent,
    teams: { blue: blueTeam, red: redTeam },
    objectives: {
      blue: { kills: 41, towers: 6, dragons: 1, barons: 0, riftHeralds: 1, voidGrubs: 1, inhibitors: 0 },
      red: { kills: 52, towers: 9, dragons: 5, barons: 1, riftHeralds: 0, voidGrubs: 2, inhibitors: 2 },
    },
    purchaseTimeline,
    minutes,
    glossary: {
      patch: '16.22',
      ddragonVersion: DEMO_VERSION,
      champions: [...blueTeam, ...redTeam].map((p) => ({ name: p.championName, team: p.team, position: p.position, tags: ['Fighter'] })),
      items: [],
      runes: [],
      spells: [],
      counterItems: [],
    },
  };

  const aiReport: AiCoachingReport =
    lang === 'ru' ? buildDemoAiRu(durationMinutes) : buildDemoAiEn(durationMinutes);

  return {
    engineReport,
    aiReport,
    meta: {
      cached: true,
      provider: 'demo',
      model: 'demo-showcase',
      isDemo: true,
    },
  };
}

function buildDemoAiRu(durationMinutes: number): AiCoachingReport {
  const keyNotes: Record<number, { rating: 'great' | 'ok' | 'missed' | 'mistake' | 'critical'; headline: string; analysis: string; betterPlay: string | null }> = {
    6: {
      rating: 'great',
      headline: 'Соло-килл по Kayle и контроль топа',
      analysis: 'Отличное окно реализации силы Фиоры до 6-го уровня Kayle: забрал килл 1v1 и вышел вперёд по золоту и опыту.',
      betterPlay: null,
    },
    10: {
      rating: 'great',
      headline: 'Ранний спайк Ravenous Hydra',
      analysis: 'Покупка Ravenous Hydra на 10-й минуте даёт бесконечный сустейн и мгновенный пуш волны — теперь ты диктуешь темп всей верхней половины карты.',
      betterPlay: null,
    },
    11: {
      rating: 'great',
      headline: 'Доминация и снятие пластины',
      analysis: 'Повторный соло-килл по Kayle сразу конвертирован в пластину вышки. Разрыв по золоту превысил +1800.',
      betterPlay: null,
    },
    13: {
      rating: 'great',
      headline: 'Снесена Т1 на топе',
      analysis: 'Отличный тайминг сноса первой вышки — линия открыта, можно переносить давление на тир-2 и вражеский лес.',
      betterPlay: null,
    },
    18: {
      rating: 'missed',
      headline: 'Упущенный размен на дракона',
      analysis: 'Враги забрали Mountain Dragon, пока ты находился на противоположной части карты без взятия вышки в ответ.',
      betterPlay: 'При таком счёте на Фиоре нужно либо заранее пушить бот до Т2 под спавн дракона, либо забирать башню на топе в момент драки за дракона.',
    },
    22: {
      rating: 'great',
      headline: 'Покупка Hullbreaker под сплит',
      analysis: 'Hullbreaker третьим слотом усиливает твоё давление по башням — 1 на 1 на карте тебя уже никто не остановит.',
      betterPlay: null,
    },
    24: {
      rating: 'critical',
      headline: 'Смерть глубоко без вижна и отдача баунти',
      analysis: 'Ты зашёл за линию Т2 без союзных вардов рядом и попал в 1v2 против Cho\'Gath и Zed, отдав 750g баунти ровно перед Infernal Dragon.',
      betterPlay: 'Замени Stealth Ward на Farsight Alteration и не переходи реку с баунти, пока не видишь Cho\'Gath и Zed на карте.',
    },
    28: {
      rating: 'great',
      headline: 'Пик на боте и давление сайдлейна',
      analysis: 'Успешно поймал Renata на сайдлейне и сохранил высокий темп фарма (7.5 CS/мин).',
      betterPlay: null,
    },
    30: {
      rating: 'mistake',
      headline: 'Отдача души дракона без размена на ингибитор',
      analysis: 'Красная команда взяла четвёртого (душевого) дракона, при этом на противоположной линии ингибитор так и остался стоять.',
      betterPlay: 'За 45 секунд до душевого дракона нужно было уже толкать волну в топ Т3/ингибитор с Hullbreaker, вынуждая двоих врагов возвращаться на базу.',
    },
    33: {
      rating: 'mistake',
      headline: 'Вражеский Барон при 2350g в кармане',
      analysis: 'Враги забрали Baron Nashor, пока ты держал в кармане 2350 неиспользованного золота и находился далеко от ямы.',
      betterPlay: 'Сделай быстрый бэк за 45 секунд до тайминга Барона, потрать золото и займи позицию на боте с готовым Телепортом.',
    },
    35: {
      rating: 'critical',
      headline: 'Принятый 5v5 тимфайт в контроль Cho\'Gath и Vel\'Koz',
      analysis: 'Без сапог ты зашёл во фронтальную драку 3v5, словил урон от Cho\'Gath (1890) и Vel\'Koz (1340) и отдал ещё 600g баунти.',
      betterPlay: 'На Фиоре в этом драфте нельзя начинать фронтальный тимфайт — заходи только с фланга после того, как Cho\'Gath и Vel\'Koz отдадут контроль, либо ломай ингибитор.',
    },
  };

  const minutes = Array.from({ length: durationMinutes }, (_, idx) => {
    const m = idx + 1;
    const special = keyNotes[m];
    if (special) {
      return { minute: m, isKeyMoment: true, ...special };
    }
    return {
      minute: m,
      rating: 'ok' as const,
      isKeyMoment: false,
      headline: m <= 14 ? 'Стабильный лайнинг и фарм' : 'Набор фарма и позиционирование',
      analysis:
        m <= 14
          ? 'Ровная минута на линии без критических ошибок, темп CS выше оппонента.'
          : 'Спокойный сбор волн на сайдлейне и удержание преимущества по золоту.',
      betterPlay: null,
    };
  });

  return {
    summary: {
      grade: 'B',
      score: 74,
      verdict:
        'Ты разгромил Kayle на линии и стал самым сильным игроком матча (21.4k золота, 55.6k урона, 7.5 CS/мин), но команда отдала 5 драконов и Барона. Главная причина поражения — отсутствие снесённых ингибиторов при Hullbreaker, смерть с баунти на 24-й минуте без вижна и неоптимальная руна Hail of Blades в лейте против Cho\'Gath.',
      strengths: [
        { minute: 6, title: 'Разгром Kayle с ранней линии', detail: 'Соло-киллы на 6-й и 11-й минутах вывели тебя вперёд на +2000 золота уже к мидгейму.' },
        { minute: 10, title: 'Темповый фарм 7.5 CS/мин', detail: 'Лучший CS в матче (295) и быстрая Ravenous Hydra позволили держать давление всю игру.' },
        { minute: 13, title: 'Быстрый снос Т1 на топе', detail: 'Рано открыл верхнюю часть карты, создав пространство для сплита.' },
      ],
      mistakes: [
        { minute: 24, title: 'Отдача 750g баунти без вижна', detail: 'Зашёл глубоко без вардов против Cho\'Gath + Zed, сразу после чего враги бесплатно забрали дракона.' },
        { minute: 30, title: '0 сломанных ингибиторов с Hullbreaker', detail: 'Пока враги брали душу дракона, сплитпуш не был доведён до базы противника.' },
        { minute: 35, title: 'Фронтальный тимфайт без сапог', detail: 'Без скорости передвижения и с Hail of Blades в 5v5 ты не пережил контроль Cho\'Gath и Vel\'Koz.' },
      ],
      nextGameRules: [
        'На Фиоре бери Conqueror + Resolve вместо Hail of Blades — в затяжных дуэлях против танков разница огромная.',
        'Когда покупаешь Hullbreaker, сразу меняй жёлтый вард на Farsight Alteration и всегда пушь противоположную от дракона/Барона сторону.',
      ],
    },
    draftEvaluation: {
      score: 8,
      verdict: 'great',
      laneMatchup: 'Отличный матчап: Фиора жёстко наказывает Kayle с 1-го по 11-й уровень и забирает полный контроль волн и башен.',
      teamSynergy: 'Средняя: у команды не хватает надёжного фронтлайна (Akali + Diana supp + Varus), поэтому 5v5 драки изначально невыгодны.',
      enemyThreats: 'Главная угроза — расфиженный Cho\'Gath (истинный урон R и подбросы Q) в связке с поуком Vel\'Koz и бёрстом Zed.',
      winCondition: 'Жёсткий сплитпуш 1-3-1 через противоположную от объектов линию: заставлять минимум двоих врагов бежать тебя останавливать.',
    },
    buildEvaluation: {
      score: 6,
      runesVerdict: 'Hail of Blades + Sorcery сильно просаживают Фиору после 15-й минуты. Conqueror + Resolve дали бы больше AD (истинный урон меток) и живучести против Cho\'Gath.',
      spellsVerdict: 'Flash + Teleport — оптимальный выбор для топлейна и сплитпуша.',
      bootsAndTrinketVerdict: 'Критичный минус: к 39-й минуте ты остался без сапог (тяжело обходить метки ульты и доджить Q Cho\'Gath/Vel\'Koz) и с жёлтым Stealth Ward вместо Farsight Alteration.',
      itemOrderVerdict: 'Ravenous Hydra (10м) и Hullbreaker (22м) куплены по делу и в хороший тайминг, но слоты в лейте перегружены щитами без мобильности.',
      goodChoices: [
        'Ravenous Hydra первым слотом на 10-й минуте — идеальный спайк.',
        'Hullbreaker на 22-й минуте — правильная ставка на сайдлейн.',
        'Death\'s Dance против физического бёрста Zed.',
      ],
      recommendations: [
        {
          insteadOf: 'Hail of Blades',
          suggested: 'Conqueror',
          reason: 'Даёт стакающийся AD для чистого урона от пассивки/ульты и отхил в дуэлях против жирного Cho\'Gath.',
        },
        {
          insteadOf: 'Stealth Ward',
          suggested: 'Farsight Alteration',
          reason: 'На сплитпушере с баунти позволяет безопасно светить вражеский лес издалека и не ловить 1v2.',
        },
        {
          insteadOf: 'Eclipse (6-й слот вместо сапог)',
          suggested: "Mercury's Treads",
          reason: 'Скорость передвижения + MR + Tenacity критичны против контроля Cho\'Gath, Vel\'Koz и Renata.',
        },
      ],
    },
    minutes,
  };
}

function buildDemoAiEn(durationMinutes: number): AiCoachingReport {
  const ru = buildDemoAiRu(durationMinutes);
  const keyEn: Record<number, { rating: 'great' | 'ok' | 'missed' | 'mistake' | 'critical'; headline: string; analysis: string; betterPlay: string | null }> = {
    6: { rating: 'great', headline: 'Solo kill on Kayle', analysis: 'Punished Kayle pre-6 to take early gold and XP control of top lane.', betterPlay: null },
    10: { rating: 'great', headline: 'Fast Ravenous Hydra spike', analysis: 'Completed Hydra at 10m for waveclear and unlimited lane sustain.', betterPlay: null },
    11: { rating: 'great', headline: 'Second kill + turret plate', analysis: 'Extended the lane lead beyond +1800g with a clean plate punish.', betterPlay: null },
    13: { rating: 'great', headline: 'Top T1 turret destroyed', analysis: 'Opened top map early to unlock sidelane splitpush pressure.', betterPlay: null },
    18: { rating: 'missed', headline: 'Unanswered Mountain Dragon', analysis: 'Enemy secured Dragon while no cross-map tower trade happened.', betterPlay: 'Sync sidelane waves to crash T2 right as Dragon spawns.' },
    22: { rating: 'great', headline: 'Hullbreaker splitpush spike', analysis: 'Hullbreaker makes you unbeatable 1v1 on sidelanes.', betterPlay: null },
    24: { rating: 'critical', headline: 'No-vision death & 750g shutdown', analysis: 'Overextended past T2 with no friendly ward nearby into Cho\'Gath + Zed right before Infernal Drake.', betterPlay: 'Swap to Farsight Alteration and hold river line until enemy jungle/mid show.' },
    28: { rating: 'great', headline: 'Bot sidelane pick', analysis: 'Punished Renata solo while keeping 7.5 CS/min tempo.', betterPlay: null },
    30: { rating: 'mistake', headline: 'Dragon Soul conceded without inhib', analysis: 'Enemy secured Soul while top T3/inhibitor remained standing.', betterPlay: 'Force top T3 45 seconds before Soul spawn to pull two defenders.' },
    33: { rating: 'mistake', headline: 'Enemy Baron with 2350g unspent', analysis: 'Sat on 2350 unspent gold while enemy secured Baron Nashor.', betterPlay: 'Reset 45s prior to Baron spawn, spend gold, and hold TP pressure on bot.' },
    35: { rating: 'critical', headline: 'Front-to-back teamfight without boots', analysis: 'Took a 3v5 fight into Cho\'Gath + Vel\'Koz CC with zero boots and dropped a 600g bounty.', betterPlay: 'Never frontline 5v5 on Fiora here — flank after CC is used or crack an inhibitor.' },
  };

  return {
    summary: {
      grade: 'B',
      score: 74,
      verdict:
        'You crushed Kayle in lane and led the lobby in gold (21.4k), CS (7.5/min), and damage (55.6k), but your team gave up 5 dragons and Baron. Converting Hullbreaker into an inhibitor, avoiding the 24m blind shutdown death, and running Conqueror over Hail of Blades would have closed this game.',
      strengths: [
        { minute: 6, title: 'Dominant early lane vs Kayle', detail: 'Solo kills at 6m and 11m built a massive +2000g lead.' },
        { minute: 10, title: 'Strong 7.5 CS/min economy', detail: 'Best farm in the match paired with an early 10m Hydra spike.' },
        { minute: 13, title: 'Early Top T1 take', detail: 'Opened top side quickly to enable cross-map pressure.' },
      ],
      mistakes: [
        { minute: 24, title: '750g shutdown without vision', detail: 'Caught 1v2 deep in top without wards right before Infernal Dragon.' },
        { minute: 30, title: 'Zero inhibitors taken with Hullbreaker', detail: 'Failed to trade Dragon Soul for enemy base structures.' },
        { minute: 35, title: 'Bootless 5v5 fight into heavy CC', detail: 'Fought head-on into Cho\'Gath and Vel\'Koz without boots.' },
      ],
      nextGameRules: [
        'Run Conqueror + Resolve on Fiora instead of Hail of Blades for real tank-shred scaling.',
        'Swap to Farsight Alteration as soon as you buy Hullbreaker and always pressure opposite to Dragon/Baron.',
      ],
    },
    draftEvaluation: {
      score: 8,
      verdict: 'great',
      laneMatchup: 'Heavily Fiora-favored lane: complete control over Kayle before level 11.',
      teamSynergy: 'Low frontline synergy (Akali, Varus, Diana support), making standard 5v5 fights unfavorable.',
      enemyThreats: 'Fed Cho\'Gath true damage + knockups paired with Vel\'Koz poke and Zed burst.',
      winCondition: 'Relentless 1-3-1 sidelane splitpush opposite every neutral objective.',
    },
    buildEvaluation: {
      score: 6,
      runesVerdict: 'Hail of Blades falls off sharply against Cho\'Gath; Conqueror scales Fiora\'s passive true damage far better.',
      spellsVerdict: 'Flash + Teleport is ideal for top sidelane pressure.',
      bootsAndTrinketVerdict: 'Selling/skipping boots hurt vital spacing and CC dodging; Stealth Ward stayed too late.',
      itemOrderVerdict: 'Hydra (10m) and Hullbreaker (22m) timings were strong, but late slots lacked mobility.',
      goodChoices: ['10m Ravenous Hydra first spike', '22m Hullbreaker for splitpush', "Death's Dance into Zed burst"],
      recommendations: [
        { insteadOf: 'Hail of Blades', suggested: 'Conqueror', reason: 'Scales vital true damage and sustain against Cho\'Gath.' },
        { insteadOf: 'Stealth Ward', suggested: 'Farsight Alteration', reason: 'Safely scouts jungle collapses before deep sidelane pushes.' },
        { insteadOf: 'Eclipse (no boots)', suggested: "Mercury's Treads", reason: 'Movespeed, MR, and Tenacity are essential vs Cho\'Gath + Vel\'Koz.' },
      ],
    },
    minutes: ru.minutes.map((item) => {
      const k = keyEn[item.minute];
      if (k) return { minute: item.minute, isKeyMoment: true, ...k };
      return {
        minute: item.minute,
        rating: 'ok' as const,
        isKeyMoment: false,
        headline: item.minute <= 14 ? 'Steady lane & CS lead' : 'Sidelane farm & tempo',
        analysis:
          item.minute <= 14
            ? 'Clean laning minute maintaining CS and gold pressure over Kayle.'
            : 'Collected sidelane waves and preserved gold advantage.',
        betterPlay: null,
      };
    }),
  };
}
