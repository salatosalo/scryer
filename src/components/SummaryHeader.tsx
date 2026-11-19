'use client';

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Flame,
  RefreshCw,
  Sparkles,
  Target,
} from 'lucide-react';
import Link from 'next/link';
import type { AiCoachingReport } from '@/lib/ai/schema';
import type { EngineReport } from '@/lib/engine/types';
import { useLanguage } from '@/lib/i18n/context';
import { getChampionDisplayName, getChampionIconUrl } from '@/lib/riot/assets';
import { getQueueLabel } from '@/lib/riot/regions';

interface SummaryHeaderProps {
  engine: EngineReport;
  ai: AiCoachingReport | null;
  aiError: string | null;
  meta: { cached: boolean; provider: string; model: string; isDemo: boolean };
  loading: boolean;
  onJumpToMinute: (minute: number) => void;
  onReanalyze: () => void;
}

function gradeColor(grade: string | undefined): string {
  switch (grade) {
    case 'S':
      return '#FFD60A';
    case 'A':
      return '#34D399';
    case 'B':
      return '#A78BFA';
    case 'C':
      return '#FB923C';
    case 'D':
      return '#F43F5E';
    default:
      return '#94A3B8';
  }
}

export function SummaryHeader({
  engine,
  ai,
  aiError,
  meta,
  loading,
  onJumpToMinute,
  onReanalyze,
}: SummaryHeaderProps) {
  const { lang, t } = useLanguage();
  const { target, laneOpponent, objectives } = engine;
  const allyObj = target.team === 'BLUE' ? objectives.blue : objectives.red;
  const enemyObj = target.team === 'BLUE' ? objectives.red : objectives.blue;

  const isWin = engine.result === 'WIN';
  const grade = ai?.summary.grade;
  const rawScore = ai?.summary.score;
  const score = rawScore != null && rawScore <= 10 ? rawScore * 10 : rawScore;
  const ringColor = gradeColor(grade);
  const ringOffset = score != null ? 176 - (176 * Math.max(0, Math.min(100, score))) / 100 : 176;

  return (
    <section className="space-y-4">
      {/* Top action row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-full bg-purple-950/40 px-3.5 py-1.5 text-[13px] font-medium text-purple-300 ring-1 ring-purple-800/40 transition-all hover:bg-purple-900/60 active:scale-[0.97]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t.backToSearch}
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#141226] px-3 py-1 text-[12px] font-medium text-purple-300/80 ring-1 ring-purple-900/30">
            Patch {engine.patch}
          </span>
          <span className="rounded-full bg-[#141226] px-3 py-1 text-[12px] font-medium text-purple-300/80 ring-1 ring-purple-900/30">
            {meta.isDemo ? t.demoLabel : meta.cached ? t.cachedLabel : t.liveLabel}
            {!meta.isDemo && meta.provider !== 'engine-only' ? ` · ${meta.provider}` : ''}
          </span>
          {!meta.isDemo && (
            <button
              type="button"
              disabled={loading}
              onClick={onReanalyze}
              className="inline-flex items-center gap-1.5 rounded-full bg-purple-600/20 px-3.5 py-1 text-[12px] font-semibold text-purple-300 ring-1 ring-purple-500/40 transition-all hover:bg-purple-600/30 active:scale-[0.97] disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              {ai ? t.reanalyze : t.retryAi}
            </button>
          )}
        </div>
      </div>

      {/* AI graceful fallback notice */}
      {!ai && (
        <div className="flex items-start gap-3 rounded-[18px] bg-[#FF9F0A]/12 px-4 py-3 text-[13px] text-[#FFD18C] ring-1 ring-[#FF9F0A]/25">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#FF9F0A]" />
          <p>{aiError === 'AI_KEY_MISSING' ? t.aiKeyMissingBanner : t.aiUnavailableBanner}</p>
        </div>
      )}

      {/* Main iOS Glass Summary Card */}
      <div className="ios-glass rounded-[24px] p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          {/* Player & Match identity */}
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <img
                src={getChampionIconUrl(engine.ddragonVersion, target.championName)}
                alt={target.championName}
                className="h-16 w-16 rounded-[18px] object-cover ring-1 ring-white/15 sm:h-[72px] sm:w-[72px]"
              />
              <span
                className={`absolute -bottom-1.5 -right-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold shadow-md ${
                  isWin ? 'bg-[#30D158] text-black' : 'bg-[#FF453A] text-white'
                }`}
              >
                {isWin ? t.win : t.lose}
              </span>
            </div>

            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-[22px] font-semibold tracking-tight text-white sm:text-[26px]">
                  {getChampionDisplayName(target.championName, lang)}
                </h1>
                <span className="rounded-full bg-white/[0.09] px-2.5 py-0.5 text-[12px] font-medium text-[#E5E5EA]">
                  {target.position}
                </span>
                {laneOpponent && (
                  <span className="text-[13px] text-[#98989D]">
                    vs {getChampionDisplayName(laneOpponent.championName, lang)}
                  </span>
                )}
              </div>
              <p className="text-[13px] text-[#98989D]">
                {target.riotId} · {engine.region.toUpperCase()} · {getQueueLabel(engine.queueId, lang)} ·{' '}
                <span className="tabular-nums">
                  {Math.floor(engine.durationSec / 60)}:{String(engine.durationSec % 60).padStart(2, '0')}
                </span>
              </p>

              {/* Core Stat Strip */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-[13px] tabular-nums">
                <span className="font-semibold text-white">
                  {target.kills} / <span className="text-[#FF453A]">{target.deaths}</span> / {target.assists}
                  <span className="ml-1.5 font-normal text-[#98989D]">({target.kda} KDA)</span>
                </span>
                <span className="text-[#E5E5EA]">
                  {target.cs} CS <span className="text-[#98989D]">({target.csPerMin}/m)</span>
                </span>
                <span className="text-[#E5E5EA]">KP {target.killParticipation}%</span>
                <span className="text-[#E5E5EA]">DMG {(target.damageToChampions / 1000).toFixed(1)}k</span>
                <span className="text-[#E5E5EA]">Vision {target.visionScore}</span>
              </div>
            </div>
          </div>

          {/* Apple Fitness style Grade Ring */}
          {ai && (
            <div className="flex items-center gap-4 self-start rounded-[20px] bg-black/35 px-4 py-3 ring-1 ring-white/[0.07] lg:self-center">
              <div className="relative flex h-16 w-16 items-center justify-center">
                <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="5"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    fill="none"
                    stroke={ringColor}
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray="176"
                    strokeDashoffset={ringOffset}
                    style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(0.22, 1, 0.36, 1)' }}
                  />
                </svg>
                <span className="absolute text-[22px] font-bold" style={{ color: ringColor }}>
                  {grade}
                </span>
              </div>
              <div className="tabular-nums">
                <div className="text-[22px] font-semibold leading-tight text-white">
                  {score}
                  <span className="text-[13px] font-normal text-[#98989D]">/100</span>
                </div>
                <div className="mt-1 flex gap-2.5 text-[12px] text-[#98989D]">
                  <span>
                    {t.draftScoreLabel.split(' ')[0]} <strong className="text-white">{ai.draftEvaluation.score}/10</strong>
                  </span>
                  <span>
                    {t.buildScoreLabel.split(' ')[0]} <strong className="text-white">{ai.buildEvaluation.score}/10</strong>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Team Objective Strip */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/[0.07] pt-3.5 text-[12px] tabular-nums text-[#98989D]">
          <span className="rounded-full bg-white/[0.06] px-2.5 py-1">
            Kills <strong className="text-white">{allyObj.kills}–{enemyObj.kills}</strong>
          </span>
          <span className="rounded-full bg-white/[0.06] px-2.5 py-1">
            Towers <strong className="text-white">{allyObj.towers}–{enemyObj.towers}</strong>
          </span>
          <span className="rounded-full bg-white/[0.06] px-2.5 py-1">
            Dragons <strong className="text-white">{allyObj.dragons}–{enemyObj.dragons}</strong>
          </span>
          <span className="rounded-full bg-white/[0.06] px-2.5 py-1">
            Barons <strong className="text-white">{allyObj.barons}–{enemyObj.barons}</strong>
          </span>
          <span className="rounded-full bg-white/[0.06] px-2.5 py-1">
            Inhibs <strong className="text-white">{allyObj.inhibitors}–{enemyObj.inhibitors}</strong>
          </span>
        </div>

        {/* AI Verdict & Clickable Highlights */}
        {ai && (
          <div className="mt-4 space-y-4">
            <p className="max-w-4xl text-[15px] leading-relaxed text-[#E5E5EA]">
              {ai.summary.verdict}
            </p>

            <div className="grid gap-3 md:grid-cols-2">
              {/* Strengths */}
              <div className="ios-inset rounded-[18px] p-4">
                <div className="mb-2.5 flex items-center gap-2 text-[13px] font-semibold text-[#30D158]">
                  <CheckCircle2 className="h-4 w-4" />
                  {t.strengthsTitle}
                </div>
                <div className="space-y-2">
                  {ai.summary.strengths.map((s, idx) => (
                    <button
                      key={`${s.minute}-${idx}`}
                      type="button"
                      onClick={() => onJumpToMinute(s.minute)}
                      className="group flex w-full items-start gap-2.5 rounded-[12px] p-2 text-left transition-colors hover:bg-white/[0.06] active:scale-[0.99]"
                    >
                      <span className="mt-0.5 shrink-0 rounded-full bg-[#30D158]/15 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-[#30D158]">
                        {s.minute}:00
                      </span>
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium text-white group-hover:text-[#0A84FF]">
                          {s.title}
                        </div>
                        <div className="text-[12px] leading-snug text-[#98989D]">{s.detail}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Mistakes */}
              <div className="ios-inset rounded-[18px] p-4">
                <div className="mb-2.5 flex items-center gap-2 text-[13px] font-semibold text-[#FF453A]">
                  <Flame className="h-4 w-4" />
                  {t.mistakesTitle}
                </div>
                <div className="space-y-2">
                  {ai.summary.mistakes.map((m, idx) => (
                    <button
                      key={`${m.minute}-${idx}`}
                      type="button"
                      onClick={() => onJumpToMinute(m.minute)}
                      className="group flex w-full items-start gap-2.5 rounded-[12px] p-2 text-left transition-colors hover:bg-white/[0.06] active:scale-[0.99]"
                    >
                      <span className="mt-0.5 shrink-0 rounded-full bg-[#FF453A]/15 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-[#FF453A]">
                        {m.minute}:00
                      </span>
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium text-white group-hover:text-[#0A84FF]">
                          {m.title}
                        </div>
                        <div className="text-[12px] leading-snug text-[#98989D]">{m.detail}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Next game focus rules */}
            <div className="flex flex-col gap-2 rounded-[16px] bg-[#0A84FF]/10 p-4 ring-1 ring-[#0A84FF]/25 sm:flex-row sm:items-start sm:gap-3">
              <div className="flex shrink-0 items-center gap-2 text-[13px] font-semibold text-[#0A84FF]">
                <Target className="h-4 w-4" />
                {t.nextGameRulesTitle}
              </div>
              <ul className="space-y-1 text-[13px] leading-snug text-[#E5E5EA]">
                {ai.summary.nextGameRules.map((rule, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0A84FF]" />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
