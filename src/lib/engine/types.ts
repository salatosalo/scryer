export type TeamSide = 'BLUE' | 'RED';

export type DeterministicFlag =
  | 'DEATH_NO_VISION'
  | 'BOUNTY_THROWN'
  | 'OBJECTIVE_CONTEST_MISSED'
  | 'CS_DROP'
  | 'HIGH_UNSPENT_GOLD'
  | 'STRONG_TEMPO_PLAY';

export interface ParticipantSummary {
  participantId: number;
  puuid: string;
  riotId: string;
  team: TeamSide;
  position: string;
  championId: number;
  championName: string;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  kda: number;
  killParticipation: number;
  cs: number;
  csPerMin: number;
  goldEarned: number;
  damageToChampions: number;
  damageToTurrets: number;
  visionScore: number;
  wardsPlaced: number;
  wardsKilled: number;
  controlWardsBought: number;
  champLevel: number;
  summonerSpellIds: number[];
  summonerSpellNames: string[];
  finalItemIds: number[];
  finalItemNames: string[];
  trinketId: number;
  trinketName: string;
  keystoneId: number | null;
  keystoneName: string;
  primaryTreeName: string;
  secondaryTreeName: string;
  runeIds: number[];
  runeNames: string[];
}

export interface TeamObjectivesSummary {
  kills: number;
  towers: number;
  dragons: number;
  barons: number;
  riftHeralds: number;
  voidGrubs: number;
  inhibitors: number;
}

export interface PlayerPosition {
  participantId: number;
  championName: string;
  team: TeamSide;
  x: number;
  y: number;
  alive: boolean;
  isTarget: boolean;
  isLaneOpponent: boolean;
}

export interface TimelineEventSummary {
  timestampSec: number;
  minute: number;
  type:
    | 'KILL'
    | 'DEATH'
    | 'ASSIST'
    | 'OBJECTIVE'
    | 'BUILDING'
    | 'PLATE'
    | 'ITEM';
  team?: TeamSide;
  label: string;
  x?: number;
  y?: number;
  involvesTarget: boolean;
  bountyGold?: number;
  hadVision?: boolean;
  nearbyAllies?: number;
  nearbyEnemies?: number;
  topDamageSources?: string[];
  itemId?: number;
  itemName?: string;
  killerChampionName?: string;
  victimChampionName?: string;
}

export interface PurchaseEntry {
  minute: number;
  timestampSec: number;
  itemId: number;
  itemName: string;
  totalGold: number;
  isCompleted: boolean;
}

export interface MinuteStatsSnapshot {
  totalGold: number;
  currentGold: number;
  cs: number;
  level: number;
  xp: number;
  damageToChampions: number;
}

export interface MinuteSnapshot {
  minute: number;
  positions: PlayerPosition[];
  targetStats: MinuteStatsSnapshot;
  opponentStats: MinuteStatsSnapshot | null;
  goldDiff: number;
  csDiff: number;
  xpDiff: number;
  csDeltaThisMin: number;
  goldDeltaThisMin: number;
  wardsPlaced: number;
  wardsKilled: number;
  purchases: PurchaseEntry[];
  events: TimelineEventSummary[];
  flags: DeterministicFlag[];
  isKeyMoment: boolean;
}

export interface PatchGlossary {
  patch: string;
  ddragonVersion: string;
  champions: Array<{ name: string; team: TeamSide; position: string; tags: string[] }>;
  items: Array<{ id: number; name: string; gold: number; summary: string }>;
  runes: Array<{ id: number; name: string; tree: string; summary: string }>;
  spells: Array<{ id: number; name: string; summary: string }>;
  counterItems: Array<{ id: number; name: string; gold: number; category: string; summary: string }>;
}

export interface EngineReport {
  matchId: string;
  region: string;
  patch: string;
  ddragonVersion: string;
  queueId: number;
  playedAt: number;
  durationSec: number;
  durationMinutes: number;
  result: 'WIN' | 'LOSE';
  target: ParticipantSummary;
  laneOpponent: ParticipantSummary | null;
  teams: {
    blue: ParticipantSummary[];
    red: ParticipantSummary[];
  };
  objectives: {
    blue: TeamObjectivesSummary;
    red: TeamObjectivesSummary;
  };
  purchaseTimeline: PurchaseEntry[];
  minutes: MinuteSnapshot[];
  glossary: PatchGlossary;
}
