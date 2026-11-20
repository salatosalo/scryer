'use client';

import { useMemo, useState } from 'react';
import {
  Award,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Info,
  ShieldCheck,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import type { EngineReport } from '@/lib/engine/types';
import {
  extractMatchBenchmarks,
  RANK_TIERS,
  type MetricComparison,
  type TierThresholds,
} from '@/lib/engine/benchmarks';
import { useLanguage } from '@/lib/i18n/context';

interface RankBenchmarksProps {
  engine: EngineReport;
}

export function RankBenchmarks({ engine }: RankBenchmarksProps) {
  const { lang, t } = useLanguage();
  const benchmarks = useMemo(() => extractMatchBenchmarks(engine), [engine]);
  const [selectedMetric, setSelectedMetric] = useState<string>('csAt10');

  const activeMetric =
    benchmarks.metrics.find((m) => m.metricKey === selectedMetric) ?? benchmarks.metrics[0];

  const overallTier = benchmarks.overallTier;

  return (
    <div className="space-y-6">
      {/* Top Banner: Overall Macro Tier Assessment */}
      <div className="ios-glass relative overflow-hidden rounded-[24px] p-6">
        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-semibold uppercase tracking-wider text-purple-300">
                {t.overallMacroTier}
              </span>
            </div>
            <h2 className="text-[26px] font-bold tracking-tight text-white sm:text-[30px]">
              <span style={{ color: overallTier.color }}>{overallTier.label}</span>{' '}
              {lang === 'ru' ? 'уровень макро-темпа' : 'Macro Pacing Level'}
            </h2>
            <p className="max-w-xl text-[14px] text-[#A1A1AA]">
              {lang === 'ru'
                ? `Показатели фарма, золота и контроля смертей до 15-й минуты в этом матче соответствуют средним значениям ранга ${overallTier.label}.`
                : `Your early CS pace, gold accumulation, and death discipline in this match align with ${overallTier.label} tier averages.`}
            </p>
          </div>

          <div
            className="flex shrink-0 flex-col items-center justify-center rounded-[20px] bg-black/40 px-6 py-4 ring-1 ring-white/10"
            style={{ borderColor: overallTier.color }}
          >
            <span className="text-[11px] font-medium text-[#98989D] uppercase tracking-wider">
              {t.yourResult}
            </span>
            <span className="text-[28px] font-extrabold tracking-tight" style={{ color: overallTier.color }}>
              {overallTier.label}
            </span>
            <span className="text-[11px] text-[#98989D]">
              {engine.target.csPerMin} CS/min · {engine.target.cs} CS
            </span>
          </div>
        </div>

        {/* Visual Rank Spectrum Bar */}
        <div className="mt-6 border-t border-white/[0.08] pt-5">
          <div className="flex items-center justify-between text-[11px] text-[#98989D] mb-2 font-medium">
            <span>Iron (Базовый)</span>
            <span>Gold (Средний)</span>
            <span>Master+ (Хай-эло)</span>
          </div>

          <div className="grid grid-cols-8 gap-1.5 rounded-full bg-black/40 p-1.5 ring-1 ring-white/[0.08]">
            {RANK_TIERS.map((tier) => {
              const isCurrent = tier.name === overallTier.name;
              return (
                <div
                  key={tier.name}
                  className={`flex flex-col items-center justify-center rounded-full py-1.5 text-[11px] font-semibold transition-all ${
                    isCurrent
                      ? 'shadow-lg ring-2 ring-white scale-105 font-bold text-white'
                      : 'text-[#71717A] opacity-75'
                  }`}
                  style={{
                    backgroundColor: isCurrent ? tier.color : `${tier.color}18`,
                    color: isCurrent ? '#000000' : tier.color,
                  }}
                >
                  <span className="truncate px-1 text-[10px] sm:text-[11px]">{tier.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Metric Breakdown Grid */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[16px] font-semibold text-white">{t.benchmarksTitle}</h3>
          <span className="text-[12px] text-[#98989D]">{t.benchmarksSubtitle}</span>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {benchmarks.metrics.map((m) => {
            const isSelected = m.metricKey === activeMetric.metricKey;
            const isPositiveGold = m.isLowerBetter ? m.deltaVsGold <= 0 : m.deltaVsGold >= 0;
            const isPositiveMaster = m.isLowerBetter ? m.deltaVsMaster <= 0 : m.deltaVsMaster >= 0;

            return (
              <button
                type="button"
                key={m.metricKey}
                onClick={() => setSelectedMetric(m.metricKey)}
                className={`ios-sheet flex flex-col justify-between rounded-[20px] p-4 text-left transition-all hover:bg-white/[0.04] active:scale-[0.98] ${
                  isSelected ? 'ring-2 ring-purple-500 bg-white/[0.05]' : 'ring-1 ring-white/[0.08]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-medium text-[#D4D4D8]">
                      {lang === 'ru' ? m.titleRu : m.titleEn}
                    </span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[11px] font-bold"
                      style={{
                        backgroundColor: `${m.matchedTier.color}25`,
                        color: m.matchedTier.color,
                      }}
                    >
                      {m.matchedTier.label}
                    </span>
                  </div>

                  <div className="mt-2.5 flex items-baseline gap-1.5 tabular-nums">
                    <span className="text-[26px] font-bold tracking-tight text-white">
                      {m.playerValue}
                    </span>
                    <span className="text-[13px] font-medium text-[#71717A]">{m.unit}</span>
                  </div>
                </div>

                {/* Deltas vs Gold and Master */}
                <div className="mt-4 space-y-1.5 border-t border-white/[0.06] pt-3 text-[11.5px] tabular-nums">
                  <div className="flex items-center justify-between">
                    <span className="text-[#98989D]">{t.vsAverageGold}</span>
                    <span
                      className={`font-semibold flex items-center gap-0.5 ${
                        isPositiveGold ? 'text-[#30D158]' : 'text-[#FF453A]'
                      }`}
                    >
                      {isPositiveGold ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {m.deltaVsGold > 0 ? `+${m.deltaVsGold}` : m.deltaVsGold} {m.unit}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#98989D]">{t.vsChallengerMaster}</span>
                    <span
                      className={`font-semibold flex items-center gap-0.5 ${
                        isPositiveMaster ? 'text-[#30D158]' : 'text-[#A1A1AA]'
                      }`}
                    >
                      {m.deltaVsMaster > 0 ? `+${m.deltaVsMaster}` : m.deltaVsMaster} {m.unit}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Metric Deep Dive Card */}
      <div className="ios-sheet rounded-[22px] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
          <div>
            <h4 className="text-[15px] font-semibold text-white">
              {lang === 'ru' ? activeMetric.titleRu : activeMetric.titleEn} —{' '}
              {lang === 'ru' ? 'Сравнение по всей лестнице рангов' : 'Full Ladder Comparison'}
            </h4>
            <p className="text-[12px] text-[#98989D]">
              {lang === 'ru'
                ? `Ваш показатель: ${activeMetric.playerValue} ${activeMetric.unit} (уровень ${activeMetric.matchedTier.label})`
                : `Your value: ${activeMetric.playerValue} ${activeMetric.unit} (${activeMetric.matchedTier.label} tier)`}
            </p>
          </div>

          <span
            className="rounded-full px-3 py-1 text-[12px] font-bold"
            style={{
              backgroundColor: `${activeMetric.matchedTier.color}25`,
              color: activeMetric.matchedTier.color,
            }}
          >
            {activeMetric.matchedTier.label}
          </span>
        </div>

        {/* Ladder Rows */}
        <div className="mt-4 space-y-2">
          {RANK_TIERS.map((tier) => {
            const isMatched = tier.name === activeMetric.matchedTier.name;
            const tierVal = tier[activeMetric.metricKey];
            const maxVal = RANK_TIERS[RANK_TIERS.length - 1][activeMetric.metricKey];
            const pct = Math.min(100, Math.max(10, (tierVal / (maxVal || 1)) * 100));

            return (
              <div
                key={tier.name}
                className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-[12.5px] tabular-nums transition-all ${
                  isMatched ? 'bg-white/[0.09] ring-1 ring-white/20' : 'bg-black/20'
                }`}
              >
                <div className="flex items-center gap-2.5 w-32 shrink-0">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: tier.color }}
                  />
                  <span
                    className={`font-semibold ${isMatched ? 'text-white' : 'text-[#A1A1AA]'}`}
                  >
                    {tier.label}
                  </span>
                  {isMatched && (
                    <span className="rounded bg-white/20 px-1.5 py-0.2 text-[10px] font-bold text-white">
                      Ты
                    </span>
                  )}
                </div>

                {/* Progress track */}
                <div className="hidden sm:block flex-1 mx-3 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: tier.color,
                      opacity: isMatched ? 1 : 0.6,
                    }}
                  />
                </div>

                <div className="text-right w-24 shrink-0 font-medium text-white">
                  {tierVal} <span className="text-[11px] text-[#71717A]">{activeMetric.unit}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
