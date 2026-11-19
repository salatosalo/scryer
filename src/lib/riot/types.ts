export interface RiotAccount {
  puuid: string;
  gameName: string;
  tagLine: string;
}

export interface RiotPerksSelection {
  perk: number;
  var1: number;
  var2: number;
  var3: number;
}

export interface RiotPerksStyle {
  description: string;
  style: number;
  selections: RiotPerksSelection[];
}

export interface RiotParticipant {
  puuid: string;
  participantId: number;
  teamId: number; // 100 = BLUE, 200 = RED
  championId: number;
  championName: string;
  riotIdGameName?: string;
  riotIdTagline?: string;
  summonerName?: string;
  teamPosition: string; // TOP, JUNGLE, MIDDLE, BOTTOM, UTILITY, or ""
  individualPosition?: string;
  lane?: string;
  role?: string;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
  goldEarned: number;
  totalDamageDealtToChampions: number;
  totalDamageTaken: number;
  damageDealtToTurrets?: number;
  visionScore: number;
  wardsPlaced: number;
  wardsKilled: number;
  visionWardsBoughtInGame?: number;
  champLevel: number;
  summoner1Id: number;
  summoner2Id: number;
  item0: number;
  item1: number;
  item2: number;
  item3: number;
  item4: number;
  item5: number;
  item6: number;
  perks?: {
    statPerks?: { defense: number; flex: number; offense: number };
    styles: RiotPerksStyle[];
  };
}

export interface RiotTeam {
  teamId: number;
  win: boolean;
  objectives?: {
    baron?: { first: boolean; kills: number };
    champion?: { first: boolean; kills: number };
    dragon?: { first: boolean; kills: number };
    horde?: { first: boolean; kills: number };
    inhibitor?: { first: boolean; kills: number };
    riftHerald?: { first: boolean; kills: number };
    tower?: { first: boolean; kills: number };
  };
}

export interface RiotMatchDto {
  metadata: {
    dataVersion: string;
    matchId: string;
    participants: string[];
  };
  info: {
    gameCreation: number;
    gameDuration: number;
    gameEndTimestamp?: number;
    gameMode: string;
    gameName?: string;
    gameStartTimestamp?: number;
    gameType?: string;
    gameVersion: string;
    mapId: number;
    platformId: string;
    queueId: number;
    participants: RiotParticipant[];
    teams: RiotTeam[];
  };
}

export interface RiotParticipantFrame {
  participantId: number;
  position?: { x: number; y: number };
  currentGold: number;
  totalGold: number;
  level: number;
  xp: number;
  minionsKilled: number;
  jungleMinionsKilled: number;
  damageStats?: {
    totalDamageDoneToChampions?: number;
    totalDamageTaken?: number;
  };
}

export interface RiotDamageEntry {
  basic?: boolean;
  magicDamage: number;
  physicalDamage: number;
  trueDamage: number;
  name?: string;
  participantId?: number;
  spellName?: string;
  spellSlot?: number;
  type?: string;
}

export interface RiotTimelineEvent {
  type: string;
  timestamp: number;
  participantId?: number;
  killerId?: number;
  victimId?: number;
  creatorId?: number;
  assistingParticipantIds?: number[];
  position?: { x: number; y: number };
  itemId?: number;
  afterId?: number;
  beforeId?: number;
  goldGain?: number;
  bounty?: number;
  shutdownBounty?: number;
  wardType?: string;
  buildingType?: string;
  laneType?: string;
  towerType?: string;
  teamId?: number;
  monsterType?: string;
  monsterSubType?: string;
  killerTeamId?: number;
  skillSlot?: number;
  levelUpType?: string;
  victimDamageReceived?: RiotDamageEntry[];
  victimDamageDealt?: RiotDamageEntry[];
}

export interface RiotTimelineFrame {
  timestamp: number;
  participantFrames: Record<string, RiotParticipantFrame>;
  events: RiotTimelineEvent[];
}

export interface RiotTimelineDto {
  metadata: {
    dataVersion: string;
    matchId: string;
    participants: string[];
  };
  info: {
    frameInterval: number;
    frames: RiotTimelineFrame[];
  };
}

export interface DDragonChampionEntry {
  id: string;
  key: string;
  name: string;
  title: string;
  tags: string[];
  blurb: string;
}

export interface DDragonItemEntry {
  id: number;
  name: string;
  plaintext: string;
  description: string;
  totalGold: number;
  tags: string[];
  into?: string[];
  from?: string[];
}

export interface DDragonRuneEntry {
  id: number;
  key: string;
  name: string;
  treeName: string;
  shortDesc: string;
  icon: string;
}

export interface DDragonSummonerSpellEntry {
  id: number;
  key: string;
  name: string;
  description: string;
  cooldown: number;
}

export interface DDragonSnapshot {
  version: string;
  championsById: Record<string, DDragonChampionEntry>;
  championsByKey: Record<string, DDragonChampionEntry>;
  itemsById: Record<number, DDragonItemEntry>;
  runesById: Record<number, DDragonRuneEntry>;
  summonersById: Record<number, DDragonSummonerSpellEntry>;
}
