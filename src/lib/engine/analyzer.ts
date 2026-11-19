import type {
  DDragonSnapshot,
  RiotMatchDto,
  RiotParticipant,
  RiotTimelineDto,
  RiotTimelineEvent,
} from '@/lib/riot/types';
import { buildPatchGlossary } from './glossary';
import type {
  DeterministicFlag,
  EngineReport,
  MinuteSnapshot,
  MinuteStatsSnapshot,
  ParticipantSummary,
  PlayerPosition,
  PurchaseEntry,
  TeamObjectivesSummary,
  TeamSide,
  TimelineEventSummary,
} from './types';

const MAP_MAX = 14800;

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function teamFromId(teamId: number): TeamSide {
  return teamId === 100 ? 'BLUE' : 'RED';
}

function normalizePosition(p: RiotParticipant): string {
  const raw = (p.teamPosition || p.individualPosition || '').toUpperCase();
  if (raw === 'MIDDLE' || raw === 'MID') return 'MID';
  if (raw === 'BOTTOM' || raw === 'BOT') return 'ADC';
  if (raw === 'UTILITY' || raw === 'SUPPORT') return 'SUPP';
  if (raw === 'TOP') return 'TOP';
  if (raw === 'JUNGLE') return 'JGL';
  return 'FLEX';
}

function isDeepInEnemyHalf(pos: { x: number; y: number }, team: TeamSide): boolean {
  // Diagonal split of Summoner's Rift: x + y = 14800 is the river midline
  const sum = pos.x + pos.y;
  if (team === 'BLUE') return sum > MAP_MAX + 800;
  return sum < MAP_MAX - 800;
}

function isOwnBaseSafeZone(pos: { x: number; y: number }, team: TeamSide): boolean {
  if (team === 'BLUE') return pos.x < 4200 && pos.y < 4200;
  return pos.x > 10600 && pos.y > 10600;
}

function inferLaneFromEarlyCoords(
  participantId: number,
  timeline: RiotTimelineDto
): 'TOP' | 'MID' | 'BOT' | 'JGL' {
  let top = 0;
  let mid = 0;
  let bot = 0;
  for (let m = 2; m <= Math.min(8, timeline.info.frames.length - 1); m++) {
    const f = timeline.info.frames[m]?.participantFrames?.[String(participantId)];
    if (!f?.position) continue;
    const { x, y } = f.position;
    if (x < 4500 && y > 9500) top++;
    else if (x > 9500 && y < 4500) bot++;
    else if (Math.abs(x - y) < 2200 && x > 4500 && x < 10300) mid++;
  }
  const best = Math.max(top, mid, bot);
  if (best === 0) return 'JGL';
  if (top === best) return 'TOP';
  if (mid === best) return 'MID';
  return 'BOT';
}

function buildParticipantSummary(
  p: RiotParticipant,
  teamKills: number,
  durationMinutes: number,
  ddragon: DDragonSnapshot
): ParticipantSummary {
  const cs = (p.totalMinionsKilled ?? 0) + (p.neutralMinionsKilled ?? 0);
  const kda = p.deaths === 0 ? p.kills + p.assists : Number(((p.kills + p.assists) / p.deaths).toFixed(2));
  const kp = teamKills > 0 ? Math.round(((p.kills + p.assists) * 100) / teamKills) : 0;

  const finalItemIds = [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5].filter((id) => id > 0);
  const finalItemNames = finalItemIds.map((id) => ddragon.itemsById[id]?.name ?? `Item #${id}`);
  const trinketId = p.item6 ?? 0;
  const trinketName = trinketId > 0 ? (ddragon.itemsById[trinketId]?.name ?? `Trinket #${trinketId}`) : 'None';

  const summonerSpellIds = [p.summoner1Id, p.summoner2Id].filter((id) => id > 0);
  const summonerSpellNames = summonerSpellIds.map(
    (id) => ddragon.summonersById[id]?.name ?? `Spell #${id}`
  );

  const primaryStyle = p.perks?.styles?.[0];
  const secondaryStyle = p.perks?.styles?.[1];
  const keystoneId = primaryStyle?.selections?.[0]?.perk ?? null;
  const keystoneName = keystoneId ? (ddragon.runesById[keystoneId]?.name ?? `Rune #${keystoneId}`) : 'Unknown';
  const primaryTreeName = primaryStyle ? (ddragon.runesById[primaryStyle.style]?.name ?? 'Primary') : 'Unknown';
  const secondaryTreeName = secondaryStyle ? (ddragon.runesById[secondaryStyle.style]?.name ?? 'Secondary') : 'Unknown';

  const runeIds: number[] = [];
  for (const st of p.perks?.styles ?? []) {
    for (const sel of st.selections ?? []) {
      if (sel.perk > 0) runeIds.push(sel.perk);
    }
  }
  const runeNames = runeIds.map((id) => ddragon.runesById[id]?.name ?? `Rune #${id}`);

  const riotId = p.riotIdGameName
    ? `${p.riotIdGameName}${p.riotIdTagline ? `#${p.riotIdTagline}` : ''}`
    : p.summonerName || p.championName;

  return {
    participantId: p.participantId,
    puuid: p.puuid,
    riotId,
    team: teamFromId(p.teamId),
    position: normalizePosition(p),
    championId: p.championId,
    championName: p.championName,
    win: p.win,
    kills: p.kills,
    deaths: p.deaths,
    assists: p.assists,
    kda,
    killParticipation: kp,
    cs,
    csPerMin: Number((cs / Math.max(durationMinutes, 1)).toFixed(1)),
    goldEarned: p.goldEarned,
    damageToChampions: p.totalDamageDealtToChampions,
    damageToTurrets: p.damageDealtToTurrets ?? 0,
    visionScore: p.visionScore,
    wardsPlaced: p.wardsPlaced,
    wardsKilled: p.wardsKilled,
    controlWardsBought: p.visionWardsBoughtInGame ?? 0,
    champLevel: p.champLevel,
    summonerSpellIds,
    summonerSpellNames,
    finalItemIds,
    finalItemNames,
    trinketId,
    trinketName,
    keystoneId,
    keystoneName,
    primaryTreeName,
    secondaryTreeName,
    runeIds,
    runeNames,
  };
}

function buildObjectives(match: RiotMatchDto, teamId: number): TeamObjectivesSummary {
  const team = match.info.teams.find((t) => t.teamId === teamId);
  const obj = team?.objectives;
  const killsFromPlayers = match.info.participants
    .filter((p) => p.teamId === teamId)
    .reduce((acc, p) => acc + p.kills, 0);

  return {
    kills: obj?.champion?.kills ?? killsFromPlayers,
    towers: obj?.tower?.kills ?? 0,
    dragons: obj?.dragon?.kills ?? 0,
    barons: obj?.baron?.kills ?? 0,
    riftHeralds: obj?.riftHerald?.kills ?? 0,
    voidGrubs: obj?.horde?.kills ?? 0,
    inhibitors: obj?.inhibitor?.kills ?? 0,
  };
}

/**
 * Reconciles ITEM_PURCHASED and ITEM_UNDO events for the target player so undone shop clicks
 * are excluded from the chronological build order.
 */
export function extractReconciledPurchases(
  timeline: RiotTimelineDto,
  targetParticipantId: number,
  ddragon: DDragonSnapshot
): PurchaseEntry[] {
  const stack: PurchaseEntry[] = [];

  for (const frame of timeline.info.frames) {
    for (const ev of frame.events) {
      if (ev.participantId !== targetParticipantId) continue;

      if (ev.type === 'ITEM_PURCHASED' && ev.itemId) {
        const meta = ddragon.itemsById[ev.itemId];
        const totalGold = meta?.totalGold ?? 0;
        const isBoots = meta?.tags?.includes('Boots') && totalGold >= 900;
        const isCompleted = Boolean(meta && ((!meta.into?.length && totalGold >= 2000) || isBoots));
        const timestampSec = Math.round(ev.timestamp / 1000);
        stack.push({
          minute: Math.max(1, Math.ceil(timestampSec / 60)),
          timestampSec,
          itemId: ev.itemId,
          itemName: meta?.name ?? `Item #${ev.itemId}`,
          totalGold,
          isCompleted,
        });
      } else if (ev.type === 'ITEM_UNDO' && ev.beforeId) {
        // Remove the most recent purchase matching beforeId
        for (let i = stack.length - 1; i >= 0; i--) {
          if (stack[i].itemId === ev.beforeId) {
            stack.splice(i, 1);
            break;
          }
        }
      }
    }
  }

  return stack;
}

function summarizeMonster(ev: RiotTimelineEvent): string {
  const sub = ev.monsterSubType?.replace('_DRAGON', '').replace('_', ' ');
  switch (ev.monsterType) {
    case 'DRAGON':
      return sub ? `${sub} Dragon` : 'Dragon';
    case 'BARON_NASHOR':
      return 'Baron Nashor';
    case 'RIFTHERALD':
      return 'Rift Herald';
    case 'HORDE':
      return 'Void Grubs';
    case 'ATAKHAN':
      return 'Atakhan';
    default:
      return ev.monsterType || 'Objective';
  }
}

function summarizeBuilding(ev: RiotTimelineEvent): string {
  const lane = ev.laneType?.replace('_LANE', '') || '';
  const type = ev.buildingType === 'INHIBITOR_BUILDING' ? 'Inhibitor' : 'Tower';
  return lane ? `${lane} ${type}` : type;
}

export function analyzeMatchTimeline(input: {
  match: RiotMatchDto;
  timeline: RiotTimelineDto;
  targetPuuid: string;
  region: string;
  ddragon: DDragonSnapshot;
  riotId?: string;
}): EngineReport {
  const { match, timeline, targetPuuid, region, ddragon, riotId } = input;
  const durationSec = match.info.gameDuration;
  const durationMinutes = Math.max(1, Math.round(durationSec / 60));
  const patchParts = match.info.gameVersion.split('.');
  const patch = patchParts.length >= 2 ? `${patchParts[0]}.${patchParts[1]}` : match.info.gameVersion;

  const blueObjectives = buildObjectives(match, 100);
  const redObjectives = buildObjectives(match, 200);

  const participantSummaries = match.info.participants.map((p) => {
    const teamKills = p.teamId === 100 ? blueObjectives.kills : redObjectives.kills;
    return buildParticipantSummary(p, teamKills, durationSec / 60, ddragon);
  });

  const byId = new Map<number, ParticipantSummary>();
  for (const ps of participantSummaries) byId.set(ps.participantId, ps);

  const target = participantSummaries.find((p) => p.puuid === targetPuuid);
  if (!target) {
    throw new Error(`Target player (${targetPuuid}) not found in match ${match.metadata.matchId}`);
  }

  const enemies = participantSummaries.filter((p) => p.team !== target.team);
  let laneOpponent =
    enemies.find((e) => e.position === target.position && target.position !== 'FLEX') ?? null;

  if (!laneOpponent) {
    const targetLane = inferLaneFromEarlyCoords(target.participantId, timeline);
    laneOpponent =
      enemies.find((e) => inferLaneFromEarlyCoords(e.participantId, timeline) === targetLane) ??
      enemies[0] ??
      null;
  }

  const purchaseTimeline = extractReconciledPurchases(timeline, target.participantId, ddragon);

  // Pre-track all friendly ward placements (timestamp + position) for vision checks on death
  const friendlyWards: Array<{ timestamp: number; pos: { x: number; y: number } }> = [];
  for (const frame of timeline.info.frames) {
    for (const ev of frame.events) {
      if (ev.type !== 'WARD_PLACED' || !ev.creatorId) continue;
      const creator = byId.get(ev.creatorId);
      if (!creator || creator.team !== target.team) continue;
      const creatorFrame = frame.participantFrames?.[String(ev.creatorId)];
      const pos = ev.position ?? creatorFrame?.position;
      if (pos) {
        friendlyWards.push({ timestamp: ev.timestamp, pos });
      }
    }
  }

  const minutes: MinuteSnapshot[] = [];
  let prevTargetCs = 0;
  let prevTargetGold = 500;

  // Frame 0 is 0:00 start; iterate frames 1..N (minute 1 to end)
  for (let m = 1; m < timeline.info.frames.length; m++) {
    const frame = timeline.info.frames[m];
    const pFrames = frame.participantFrames ?? {};

    const targetFrame = pFrames[String(target.participantId)];
    const oppFrame = laneOpponent ? pFrames[String(laneOpponent.participantId)] : undefined;

    const targetStats: MinuteStatsSnapshot = {
      totalGold: targetFrame?.totalGold ?? prevTargetGold,
      currentGold: targetFrame?.currentGold ?? 0,
      cs: (targetFrame?.minionsKilled ?? 0) + (targetFrame?.jungleMinionsKilled ?? 0),
      level: targetFrame?.level ?? 1,
      xp: targetFrame?.xp ?? 0,
      damageToChampions: targetFrame?.damageStats?.totalDamageDoneToChampions ?? 0,
    };

    const opponentStats: MinuteStatsSnapshot | null = oppFrame
      ? {
          totalGold: oppFrame.totalGold ?? 0,
          currentGold: oppFrame.currentGold ?? 0,
          cs: (oppFrame.minionsKilled ?? 0) + (oppFrame.jungleMinionsKilled ?? 0),
          level: oppFrame.level ?? 1,
          xp: oppFrame.xp ?? 0,
          damageToChampions: oppFrame.damageStats?.totalDamageDoneToChampions ?? 0,
        }
      : null;

    const csDeltaThisMin = Math.max(0, targetStats.cs - prevTargetCs);
    const goldDeltaThisMin = targetStats.totalGold - prevTargetGold;
    const prevUnspentGold =
      m > 1 ? (timeline.info.frames[m - 1]?.participantFrames?.[String(target.participantId)]?.currentGold ?? 0) : 0;

    prevTargetCs = targetStats.cs;
    prevTargetGold = targetStats.totalGold;

    const goldDiff = opponentStats ? targetStats.totalGold - opponentStats.totalGold : 0;
    const csDiff = opponentStats ? targetStats.cs - opponentStats.cs : 0;
    const xpDiff = opponentStats ? targetStats.xp - opponentStats.xp : 0;

    // Collect deaths in this minute to mark players who died near frame end
    const diedThisMin = new Set<number>();
    for (const ev of frame.events) {
      if (ev.type === 'CHAMPION_KILL' && ev.victimId) {
        diedThisMin.add(ev.victimId);
      }
    }

    const positions: PlayerPosition[] = participantSummaries.map((ps) => {
      const pf = pFrames[String(ps.participantId)];
      const defaultPos = ps.team === 'BLUE' ? { x: 800, y: 800 } : { x: 14000, y: 14000 };
      return {
        participantId: ps.participantId,
        championName: ps.championName,
        team: ps.team,
        x: pf?.position?.x ?? defaultPos.x,
        y: pf?.position?.y ?? defaultPos.y,
        alive: !diedThisMin.has(ps.participantId),
        isTarget: ps.participantId === target.participantId,
        isLaneOpponent: laneOpponent ? ps.participantId === laneOpponent.participantId : false,
      };
    });

    const events: TimelineEventSummary[] = [];
    const flags = new Set<DeterministicFlag>();
    let wardsPlaced = 0;
    let wardsKilled = 0;
    let targetDied = false;
    let targetParticipatedInKill = false;
    let targetTookStructure = false;
    let targetInObjective = false;

    for (const ev of frame.events) {
      const timestampSec = Math.round(ev.timestamp / 1000);

      if (ev.type === 'WARD_PLACED' && ev.creatorId === target.participantId) {
        wardsPlaced++;
        continue;
      }
      if (ev.type === 'WARD_KILL' && ev.killerId === target.participantId) {
        wardsKilled++;
        continue;
      }

      if (ev.type === 'CHAMPION_KILL') {
        const killer = ev.killerId ? byId.get(ev.killerId) : null;
        const victim = ev.victimId ? byId.get(ev.victimId) : null;
        const assists = ev.assistingParticipantIds ?? [];
        const isVictim = ev.victimId === target.participantId;
        const isKiller = ev.killerId === target.participantId;
        const isAssist = assists.includes(target.participantId);

        if (isVictim) {
          targetDied = true;
          const pos = ev.position ?? targetFrame?.position ?? { x: 7400, y: 7400 };
          const shutdown = ev.shutdownBounty ?? 0;
          const totalBounty = (ev.bounty ?? 300) + shutdown;

          const hadVision = friendlyWards.some(
            (w) =>
              w.timestamp <= ev.timestamp &&
              ev.timestamp - w.timestamp <= 90_000 &&
              dist(w.pos, pos) <= 2500
          );

          let nearbyAllies = 0;
          let nearbyEnemies = 0;
          for (const pp of positions) {
            if (pp.participantId === target.participantId) continue;
            if (dist(pp, pos) <= 2400) {
              if (pp.team === target.team) nearbyAllies++;
              else nearbyEnemies++;
            }
          }

          // Top damage sources from victimDamageReceived
          const dmgByChamp = new Map<string, number>();
          for (const d of ev.victimDamageReceived ?? []) {
            const total = (d.physicalDamage ?? 0) + (d.magicDamage ?? 0) + (d.trueDamage ?? 0);
            const src = d.name || (d.participantId ? byId.get(d.participantId)?.championName : '') || 'Minion/Tower';
            dmgByChamp.set(src, (dmgByChamp.get(src) ?? 0) + total);
          }
          const topDamageSources = [...dmgByChamp.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([name, dmg]) => `${name} (${Math.round(dmg)})`);

          if (!hadVision && !isOwnBaseSafeZone(pos, target.team) && (isDeepInEnemyHalf(pos, target.team) || nearbyEnemies >= 2)) {
            flags.add('DEATH_NO_VISION');
          }
          if (shutdown >= 150 || totalBounty >= 450) {
            flags.add('BOUNTY_THROWN');
          }
          if (prevUnspentGold >= 1800) {
            flags.add('HIGH_UNSPENT_GOLD');
          }

          events.push({
            timestampSec,
            minute: m,
            type: 'DEATH',
            team: killer?.team,
            label: `Died to ${killer?.championName ?? 'Execution'}${assists.length ? ` (+${assists.length} assist${assists.length > 1 ? 's' : ''})` : ''}${shutdown > 0 ? ` [Shutdown +${shutdown}g]` : ''}`,
            x: pos.x,
            y: pos.y,
            involvesTarget: true,
            bountyGold: totalBounty,
            hadVision,
            nearbyAllies,
            nearbyEnemies,
            topDamageSources,
          });
        } else if (isKiller || isAssist) {
          targetParticipatedInKill = true;
          events.push({
            timestampSec,
            minute: m,
            type: isKiller ? 'KILL' : 'ASSIST',
            team: target.team,
            label: isKiller
              ? `Killed ${victim?.championName ?? 'Enemy'}${assists.length === 0 ? ' (Solo)' : ''}`
              : `Assisted kill on ${victim?.championName ?? 'Enemy'}`,
            x: ev.position?.x,
            y: ev.position?.y,
            involvesTarget: true,
          });
        }
      } else if (ev.type === 'ELITE_MONSTER_KILL') {
        const killerTeam = ev.killerTeamId ? teamFromId(ev.killerTeamId) : undefined;
        const involves =
          ev.killerId === target.participantId ||
          (ev.assistingParticipantIds ?? []).includes(target.participantId);
        if (involves) targetInObjective = true;

        const monsterName = summarizeMonster(ev);
        events.push({
          timestampSec,
          minute: m,
          type: 'OBJECTIVE',
          team: killerTeam,
          label: `${killerTeam === target.team ? 'Ally' : 'Enemy'} secured ${monsterName}`,
          x: ev.position?.x,
          y: ev.position?.y,
          involvesTarget: involves,
        });

        // Flag missed major objective if enemy took Dragon/Baron/Herald while target was alive & far away
        if (
          killerTeam &&
          killerTeam !== target.team &&
          ev.monsterType !== 'HORDE' &&
          !targetDied &&
          ev.position &&
          targetFrame?.position &&
          dist(ev.position, targetFrame.position) > 4500
        ) {
          flags.add('OBJECTIVE_CONTEST_MISSED');
        }
      } else if (ev.type === 'BUILDING_KILL') {
        const destroyedTeam = ev.teamId ? teamFromId(ev.teamId) : undefined;
        const killerTeam: TeamSide | undefined = destroyedTeam
          ? destroyedTeam === 'BLUE'
            ? 'RED'
            : 'BLUE'
          : undefined;
        const involves =
          ev.killerId === target.participantId ||
          (ev.assistingParticipantIds ?? []).includes(target.participantId);
        if (involves) targetTookStructure = true;

        events.push({
          timestampSec,
          minute: m,
          type: 'BUILDING',
          team: killerTeam,
          label: `${killerTeam === target.team ? 'Ally' : 'Enemy'} destroyed ${summarizeBuilding(ev)}`,
          x: ev.position?.x,
          y: ev.position?.y,
          involvesTarget: involves,
        });
      } else if (ev.type === 'TURRET_PLATE_DESTROYED' && ev.killerId === target.participantId) {
        targetTookStructure = true;
        events.push({
          timestampSec,
          minute: m,
          type: 'PLATE',
          team: target.team,
          label: 'Took turret plate',
          x: ev.position?.x,
          y: ev.position?.y,
          involvesTarget: true,
        });
      }
    }

    // Cross-map trade check: if target took a tower/plate in the same minute an enemy took an objective, clear missed flag
    if (targetTookStructure && flags.has('OBJECTIVE_CONTEST_MISSED')) {
      flags.delete('OBJECTIVE_CONTEST_MISSED');
    }

    // CS drop detection (exclude support and minute 1 before minions arrive)
    if (
      m >= 3 &&
      target.position !== 'SUPP' &&
      !targetDied &&
      !targetParticipatedInKill &&
      !targetInObjective &&
      !targetTookStructure &&
      csDeltaThisMin <= 2
    ) {
      flags.add('CS_DROP');
    }

    if (
      (targetParticipatedInKill || targetTookStructure || targetInObjective) &&
      !targetDied &&
      goldDeltaThisMin >= 550
    ) {
      flags.add('STRONG_TEMPO_PLAY');
    }

    const purchasesThisMin = purchaseTimeline.filter((p) => p.minute === m);
    const hasCompletedSpike = purchasesThisMin.some((p) => p.isCompleted);

    const isKeyMoment =
      flags.size > 0 ||
      targetDied ||
      targetParticipatedInKill ||
      targetTookStructure ||
      events.some((e) => e.type === 'OBJECTIVE' || e.type === 'BUILDING') ||
      hasCompletedSpike;

    minutes.push({
      minute: m,
      positions,
      targetStats,
      opponentStats,
      goldDiff,
      csDiff,
      xpDiff,
      csDeltaThisMin,
      goldDeltaThisMin,
      wardsPlaced,
      wardsKilled,
      purchases: purchasesThisMin,
      events,
      flags: [...flags],
      isKeyMoment,
    });
  }

  const glossary = buildPatchGlossary({
    patch,
    ddragon,
    participants: participantSummaries,
    target,
    purchases: purchaseTimeline,
  });

  return {
    matchId: match.metadata.matchId,
    region,
    patch,
    ddragonVersion: ddragon.version,
    queueId: match.info.queueId,
    playedAt: match.info.gameCreation,
    durationSec,
    durationMinutes,
    result: target.win ? 'WIN' : 'LOSE',
    target,
    laneOpponent,
    teams: {
      blue: participantSummaries.filter((p) => p.team === 'BLUE'),
      red: participantSummaries.filter((p) => p.team === 'RED'),
    },
    objectives: {
      blue: blueObjectives,
      red: redObjectives,
    },
    purchaseTimeline,
    minutes,
    glossary,
  };
}
