'use client';

import { Compass, ShieldAlert, Swords, Users } from 'lucide-react';
import type { AiCoachingReport } from '@/lib/ai/schema';
import type { EngineReport, ParticipantSummary } from '@/lib/engine/types';
import { useLanguage } from '@/lib/i18n/context';
import { getChampionDisplayName, getChampionIconUrl } from '@/lib/riot/assets';

interface DraftEvaluationProps {
  engine: EngineReport;
  ai: AiCoachingReport | null;
}

function TeamRoster({
  title,
  sideColor,
  players,
  ddragonVersion,
  targetPuuid,
  lang,
}: {
  title: string;
  sideColor: string;
  players: ParticipantSummary[];
  ddragonVersion: string;
  targetPuuid: string;
  lang: 'ru' | 'en';
}) {
  return (
    <div className="ios-sheet rounded-[20px] p-4">
      <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold" style={{ color: sideColor }}>
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: sideColor }} />
        {title}
      </div>
      <div className="divide-y divide-white/[0.06]">
        {players.map((p) => {
          const isTarget = p.puuid === targetPuuid;
          return (
            <div
              key={p.participantId}
              className={`flex items-center justify-between gap-3 py-2.5 ${
                isTarget ? 'rounded-[12px] bg-purple-900/30 px-2.5 -mx-2.5 border border-purple-500/30' : ''
              }`}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <img
                  src={getChampionIconUrl(ddragonVersion, p.championName)}
                  alt={p.championName}
                  className="h-9 w-9 rounded-[10px] object-cover ring-1 ring-white/10"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[13px] font-semibold text-white">
                    <span className="truncate">{getChampionDisplayName(p.championName, lang)}</span>
                    <span className="rounded bg-white/[0.08] px-1.5 py-0.5 text-[10px] text-[#98989D]">
                      {p.position}
                    </span>
                  </div>
                  <div className="truncate text-[11px] text-[#98989D]">{p.riotId}</div>
                </div>
              </div>

              <div className="text-right text-[12px] tabular-nums">
                <div className="font-medium text-white">
                  {p.kills}/{p.deaths}/{p.assists}
                </div>
                <div className="text-[11px] text-[#98989D]">
                  {p.csPerMin} CS/m · {(p.damageToChampions / 1000).toFixed(1)}k
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DraftEvaluation({ engine, ai }: DraftEvaluationProps) {
  const { t, lang } = useLanguage();
  const draft = ai?.draftEvaluation;

  const verdictColor =
    draft?.verdict === 'great'
      ? '#30D158'
      : draft?.verdict === 'good'
        ? '#0A84FF'
        : draft?.verdict === 'risky'
          ? '#FF9F0A'
          : '#FF453A';

  return (
    <div className="space-y-4">
      {draft && (
        <div className="ios-glass rounded-[22px] p-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.07] pb-4">
            <div>
              <div className="text-[13px] text-[#98989D]">{t.draftScoreLabel}</div>
              <div className="mt-0.5 flex items-baseline gap-2.5">
                <span className="text-[32px] font-bold tabular-nums text-white">
                  {draft.score}
                  <span className="text-[16px] font-normal text-[#98989D]">/10</span>
                </span>
                <span
                  className="rounded-full px-3 py-1 text-[12px] font-semibold"
                  style={{
                    backgroundColor: `${verdictColor}22`,
                    color: verdictColor,
                  }}
                >
                  {t.draftVerdicts[draft.verdict]}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-[16px] bg-black/30 px-4 py-2.5 ring-1 ring-white/[0.06]">
              <img
                src={getChampionIconUrl(engine.ddragonVersion, engine.target.championName)}
                alt={engine.target.championName}
                className="h-10 w-10 rounded-[10px]"
              />
              <span className="text-[12px] font-semibold text-[#98989D]">vs</span>
              {engine.laneOpponent && (
                <img
                  src={getChampionIconUrl(engine.ddragonVersion, engine.laneOpponent.championName)}
                  alt={engine.laneOpponent.championName}
                  className="h-10 w-10 rounded-[10px]"
                />
              )}
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="ios-inset rounded-[16px] p-4">
              <div className="mb-1.5 flex items-center gap-2 text-[13px] font-semibold text-[#0A84FF]">
                <Swords className="h-4 w-4" />
                {t.laneMatchupLabel}
              </div>
              <p className="text-[13.5px] leading-relaxed text-[#E5E5EA]">{draft.laneMatchup}</p>
            </div>

            <div className="ios-inset rounded-[16px] p-4">
              <div className="mb-1.5 flex items-center gap-2 text-[13px] font-semibold text-[#30D158]">
                <Users className="h-4 w-4" />
                {t.teamSynergyLabel}
              </div>
              <p className="text-[13.5px] leading-relaxed text-[#E5E5EA]">{draft.teamSynergy}</p>
            </div>

            <div className="ios-inset rounded-[16px] p-4">
              <div className="mb-1.5 flex items-center gap-2 text-[13px] font-semibold text-[#FF453A]">
                <ShieldAlert className="h-4 w-4" />
                {t.enemyThreatsLabel}
              </div>
              <p className="text-[13.5px] leading-relaxed text-[#E5E5EA]">{draft.enemyThreats}</p>
            </div>

            <div className="rounded-[16px] bg-[#0A84FF]/10 p-4 ring-1 ring-[#0A84FF]/25">
              <div className="mb-1.5 flex items-center gap-2 text-[13px] font-semibold text-[#64B5FF]">
                <Compass className="h-4 w-4" />
                {t.winConditionLabel}
              </div>
              <p className="text-[13.5px] leading-relaxed text-white">{draft.winCondition}</p>
            </div>
          </div>
        </div>
      )}

      {/* 5v5 Team Compositions */}
      <div className="grid gap-4 md:grid-cols-2">
        <TeamRoster
          title={t.blueTeamLabel}
          sideColor="#8B5CF6"
          players={engine.teams.blue}
          ddragonVersion={engine.ddragonVersion}
          targetPuuid={engine.target.puuid}
          lang={lang}
        />
        <TeamRoster
          title={t.redTeamLabel}
          sideColor="#E11D48"
          players={engine.teams.red}
          ddragonVersion={engine.ddragonVersion}
          targetPuuid={engine.target.puuid}
          lang={lang}
        />
      </div>
    </div>
  );
}
