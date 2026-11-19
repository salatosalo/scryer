import { describe, expect, it } from 'vitest';
import { analyzeMatchTimeline } from './analyzer';
import { packEngineReportForPrompt } from './prompt-packer';
import type { DDragonSnapshot, RiotMatchDto, RiotTimelineDto } from '@/lib/riot/types';

function makeMockDDragon(): DDragonSnapshot {
  return {
    version: '16.22.1',
    championsById: {
      fiora: { id: 'Fiora', key: '114', name: 'Fiora', title: 'The Grand Duelist', tags: ['Fighter', 'Assassin'], blurb: '' },
      kayle: { id: 'Kayle', key: '10', name: 'Kayle', title: 'The Righteous', tags: ['Fighter', 'Support'], blurb: '' },
      chogath: { id: 'Chogath', key: '31', name: "Cho'Gath", title: 'The Terror of the Void', tags: ['Tank', 'Mage'], blurb: '' },
    },
    championsByKey: {},
    itemsById: {
      3074: { id: 3074, name: 'Ravenous Hydra', plaintext: 'Cleave & Lifesteal', description: '65 AD, 12% Lifesteal, Cleave passive.', totalGold: 3300, tags: ['Damage', 'LifeSteal'] },
      3181: { id: 3181, name: 'Hullbreaker', plaintext: 'Splitpush', description: '40 AD, 500 HP, bonus tower damage.', totalGold: 3000, tags: ['Damage', 'Health'] },
      3033: { id: 3033, name: 'Mortal Reminder', plaintext: 'Anti-heal', description: '35 AD, 35% Armor Penetration, applies Grievous Wounds.', totalGold: 3200, tags: ['Damage', 'ArmorPenetration'] },
      3340: { id: 3340, name: 'Stealth Ward', plaintext: 'Ward', description: 'Places a Stealth Ward.', totalGold: 0, tags: ['Trinket'] },
      3363: { id: 3363, name: 'Farsight Alteration', plaintext: 'Blue Ward', description: 'Long-range vision trinket.', totalGold: 0, tags: ['Trinket'] },
    },
    runesById: {
      9923: { id: 9923, key: 'HailOfBlades', name: 'Hail of Blades', treeName: 'Domination', shortDesc: 'Fast 3 attacks', icon: '' },
      8100: { id: 8100, key: 'Domination', name: 'Domination', treeName: 'Domination', shortDesc: 'Domination tree', icon: '' },
      8200: { id: 8200, key: 'Sorcery', name: 'Sorcery', treeName: 'Sorcery', shortDesc: 'Sorcery tree', icon: '' },
    },
    summonersById: {
      4: { id: 4, key: 'SummonerFlash', name: 'Flash', description: 'Short teleport', cooldown: 300 },
      12: { id: 12, key: 'SummonerTeleport', name: 'Teleport', description: 'Channel to turret/ward', cooldown: 360 },
    },
  };
}

function makeFixture(): { match: RiotMatchDto; timeline: RiotTimelineDto } {
  const match: RiotMatchDto = {
    metadata: { dataVersion: '2', matchId: 'EUW1_TEST_1', participants: ['p1', 'p2', 'p3'] },
    info: {
      gameCreation: 1794966570000,
      gameDuration: 240,
      gameMode: 'CLASSIC',
      gameVersion: '16.22.634.1234',
      mapId: 11,
      platformId: 'EUW1',
      queueId: 400,
      teams: [
        { teamId: 100, win: false, objectives: { champion: { first: true, kills: 2 }, dragon: { first: false, kills: 0 }, tower: { first: false, kills: 0 } } },
        { teamId: 200, win: true, objectives: { champion: { first: false, kills: 1 }, dragon: { first: true, kills: 1 }, tower: { first: true, kills: 1 } } },
      ],
      participants: [
        {
          puuid: 'p1', participantId: 1, teamId: 100, championId: 114, championName: 'Fiora',
          riotIdGameName: 'chovyloh', riotIdTagline: '228', teamPosition: 'TOP', win: false,
          kills: 2, deaths: 1, assists: 0, totalMinionsKilled: 30, neutralMinionsKilled: 0,
          goldEarned: 4500, totalDamageDealtToChampions: 6000, totalDamageTaken: 4000,
          visionScore: 6, wardsPlaced: 2, wardsKilled: 0, champLevel: 6,
          summoner1Id: 4, summoner2Id: 12,
          item0: 3074, item1: 0, item2: 0, item3: 0, item4: 0, item5: 0, item6: 3340,
          perks: { styles: [{ description: 'primaryStyle', style: 8100, selections: [{ perk: 9923, var1: 0, var2: 0, var3: 0 }] }, { description: 'subStyle', style: 8200, selections: [] }] },
        },
        {
          puuid: 'p2', participantId: 2, teamId: 200, championId: 10, championName: 'Kayle',
          riotIdGameName: 'OppKayle', riotIdTagline: 'EUW', teamPosition: 'TOP', win: true,
          kills: 0, deaths: 2, assists: 1, totalMinionsKilled: 20, neutralMinionsKilled: 0,
          goldEarned: 3200, totalDamageDealtToChampions: 2000, totalDamageTaken: 5000,
          visionScore: 3, wardsPlaced: 1, wardsKilled: 0, champLevel: 5,
          summoner1Id: 4, summoner2Id: 12,
          item0: 0, item1: 0, item2: 0, item3: 0, item4: 0, item5: 0, item6: 3340,
        },
        {
          puuid: 'p3', participantId: 3, teamId: 200, championId: 31, championName: 'Chogath',
          riotIdGameName: 'EnemyJgl', riotIdTagline: 'EUW', teamPosition: 'JUNGLE', win: true,
          kills: 1, deaths: 0, assists: 0, totalMinionsKilled: 0, neutralMinionsKilled: 25,
          goldEarned: 3800, totalDamageDealtToChampions: 3100, totalDamageTaken: 4000,
          visionScore: 5, wardsPlaced: 1, wardsKilled: 0, champLevel: 6,
          summoner1Id: 4, summoner2Id: 11,
          item0: 0, item1: 0, item2: 0, item3: 0, item4: 0, item5: 0, item6: 3340,
        },
      ],
    },
  };

  const timeline: RiotTimelineDto = {
    metadata: { dataVersion: '2', matchId: 'EUW1_TEST_1', participants: ['p1', 'p2', 'p3'] },
    info: {
      frameInterval: 60000,
      frames: [
        { timestamp: 0, participantFrames: {}, events: [] },
        {
          timestamp: 60000,
          participantFrames: {
            '1': { participantId: 1, position: { x: 2000, y: 12000 }, currentGold: 500, totalGold: 500, level: 1, xp: 0, minionsKilled: 0, jungleMinionsKilled: 0 },
            '2': { participantId: 2, position: { x: 2600, y: 12400 }, currentGold: 500, totalGold: 500, level: 1, xp: 0, minionsKilled: 0, jungleMinionsKilled: 0 },
            '3': { participantId: 3, position: { x: 7000, y: 7000 }, currentGold: 500, totalGold: 500, level: 1, xp: 0, minionsKilled: 0, jungleMinionsKilled: 0 },
          },
          events: [
            // Purchase + undo should cancel out
            { type: 'ITEM_PURCHASED', timestamp: 15000, participantId: 1, itemId: 3181 },
            { type: 'ITEM_UNDO', timestamp: 18000, participantId: 1, beforeId: 3181 },
          ],
        },
        {
          timestamp: 120000,
          participantFrames: {
            '1': { participantId: 1, position: { x: 2500, y: 12200 }, currentGold: 1200, totalGold: 1600, level: 3, xp: 900, minionsKilled: 12, jungleMinionsKilled: 0 },
            '2': { participantId: 2, position: { x: 2800, y: 12600 }, currentGold: 700, totalGold: 1000, level: 2, xp: 500, minionsKilled: 8, jungleMinionsKilled: 0 },
            '3': { participantId: 3, position: { x: 6000, y: 9000 }, currentGold: 800, totalGold: 1200, level: 3, xp: 800, minionsKilled: 0, jungleMinionsKilled: 8 },
          },
          events: [
            { type: 'CHAMPION_KILL', timestamp: 110000, killerId: 1, victimId: 2, assistingParticipantIds: [], position: { x: 2500, y: 12200 } },
          ],
        },
        {
          timestamp: 180000,
          participantFrames: {
            '1': { participantId: 1, position: { x: 10500, y: 13200 }, currentGold: 2100, totalGold: 2800, level: 5, xp: 1800, minionsKilled: 20, jungleMinionsKilled: 0 },
            '2': { participantId: 2, position: { x: 10200, y: 13000 }, currentGold: 900, totalGold: 1700, level: 4, xp: 1200, minionsKilled: 14, jungleMinionsKilled: 0 },
            '3': { participantId: 3, position: { x: 10400, y: 13100 }, currentGold: 1200, totalGold: 2200, level: 5, xp: 1600, minionsKilled: 0, jungleMinionsKilled: 16 },
          },
          events: [
            {
              type: 'CHAMPION_KILL',
              timestamp: 170000,
              killerId: 3,
              victimId: 1,
              assistingParticipantIds: [2],
              bounty: 300,
              shutdownBounty: 300,
              position: { x: 10500, y: 13200 },
              victimDamageReceived: [
                { name: 'Chogath', participantId: 3, physicalDamage: 200, magicDamage: 500, trueDamage: 300 },
              ],
            },
          ],
        },
        {
          timestamp: 240000,
          participantFrames: {
            '1': { participantId: 1, position: { x: 2200, y: 12100 }, currentGold: 300, totalGold: 4500, level: 6, xp: 2600, minionsKilled: 21, jungleMinionsKilled: 0 },
            '2': { participantId: 2, position: { x: 9800, y: 4500 }, currentGold: 1200, totalGold: 3200, level: 5, xp: 2100, minionsKilled: 20, jungleMinionsKilled: 0 },
            '3': { participantId: 3, position: { x: 9866, y: 4414 }, currentGold: 1500, totalGold: 3800, level: 6, xp: 2400, minionsKilled: 0, jungleMinionsKilled: 25 },
          },
          events: [
            { type: 'ITEM_PURCHASED', timestamp: 195000, participantId: 1, itemId: 3074 },
            {
              type: 'ELITE_MONSTER_KILL',
              timestamp: 220000,
              killerId: 3,
              killerTeamId: 200,
              monsterType: 'DRAGON',
              monsterSubType: 'FIRE_DRAGON',
              position: { x: 9866, y: 4414 },
            },
          ],
        },
      ],
    },
  };

  return { match, timeline };
}

describe('analyzeMatchTimeline', () => {
  it('computes per-minute diffs, reconciles undone purchases, and flags deaths/objectives/CS drops', () => {
    const { match, timeline } = makeFixture();
    const report = analyzeMatchTimeline({
      match,
      timeline,
      targetPuuid: 'p1',
      region: 'euw',
      ddragon: makeMockDDragon(),
    });

    expect(report.target.championName).toBe('Fiora');
    expect(report.laneOpponent?.championName).toBe('Kayle');
    expect(report.minutes).toHaveLength(4);

    // Undone Hullbreaker in minute 1 must be excluded; Ravenous Hydra in minute 4 must be kept
    expect(report.purchaseTimeline.map((p) => p.itemName)).toEqual(['Ravenous Hydra']);

    // Minute 2: solo kill + gold swing -> STRONG_TEMPO_PLAY
    expect(report.minutes[1].goldDiff).toBe(600);
    expect(report.minutes[1].flags).toContain('STRONG_TEMPO_PLAY');

    // Minute 3: deep death with no ward and 300g shutdown -> DEATH_NO_VISION + BOUNTY_THROWN
    expect(report.minutes[2].flags).toContain('DEATH_NO_VISION');
    expect(report.minutes[2].flags).toContain('BOUNTY_THROWN');
    expect(report.minutes[2].events[0].topDamageSources?.[0]).toContain('Chogath');

    // Minute 4: enemy dragon while Fiora is far top + CS delta 1 -> OBJECTIVE_CONTEST_MISSED + CS_DROP
    expect(report.minutes[3].flags).toContain('OBJECTIVE_CONTEST_MISSED');
    expect(report.minutes[3].flags).toContain('CS_DROP');

    // Glossary includes patch counter-items dynamically
    expect(report.glossary.counterItems.some((c) => c.name === 'Mortal Reminder')).toBe(true);
    expect(report.glossary.counterItems.some((c) => c.name === 'Farsight Alteration')).toBe(true);

    // Packed prompt contains key facts and glossary
    const packed = packEngineReportForPrompt(report);
    expect(packed).toContain('PATCH GLOSSARY');
    expect(packed).toContain('DEATH_NO_VISION');
    expect(packed).toContain('Mortal Reminder');
  });
});
