'use client';

import { ArrowRight, CheckCircle2, Shield, Sparkles, Wrench } from 'lucide-react';
import type { AiCoachingReport } from '@/lib/ai/schema';
import type { EngineReport } from '@/lib/engine/types';
import { useLanguage } from '@/lib/i18n/context';
import { getItemIconUrl } from '@/lib/riot/assets';

interface BuildEvaluationProps {
  engine: EngineReport;
  ai: AiCoachingReport | null;
}

export function BuildEvaluation({ engine, ai }: BuildEvaluationProps) {
  const { t } = useLanguage();
  const { target, purchaseTimeline } = engine;
  const build = ai?.buildEvaluation;
  const completedPurchases = purchaseTimeline.filter((p) => p.isCompleted || p.totalGold >= 900);

  return (
    <div className="space-y-4">
      {/* Header with Final Build + Score */}
      <div className="ios-glass rounded-[22px] p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            {build && (
              <div className="mb-2 flex items-baseline gap-2.5">
                <span className="text-[13px] text-[#98989D]">{t.buildScoreLabel}</span>
                <span className="text-[28px] font-bold tabular-nums text-white">
                  {build.score}
                  <span className="text-[15px] font-normal text-[#98989D]">/10</span>
                </span>
              </div>
            )}

            {/* Final items icons */}
            <div className="flex flex-wrap items-center gap-2">
              {target.finalItemIds.map((id, idx) => (
                <div
                  key={`${id}-${idx}`}
                  title={target.finalItemNames[idx]}
                  className="overflow-hidden rounded-[12px] bg-black/50 ring-1 ring-white/15"
                >
                  <img
                    src={getItemIconUrl(engine.ddragonVersion, id)}
                    alt={target.finalItemNames[idx] || String(id)}
                    className="h-11 w-11 object-cover"
                  />
                </div>
              ))}
              {target.trinketId > 0 && (
                <div
                  title={target.trinketName}
                  className="ml-1 overflow-hidden rounded-full bg-black/50 ring-2 ring-[#FFD60A]/50"
                >
                  <img
                    src={getItemIconUrl(engine.ddragonVersion, target.trinketId)}
                    alt={target.trinketName}
                    className="h-10 w-10 object-cover"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Runes & Spells summary pills */}
          <div className="space-y-2 text-[12px]">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-[#0A84FF]/15 px-3 py-1 font-semibold text-[#64B5FF]">
                {target.keystoneName}
              </span>
              <span className="rounded-full bg-white/[0.08] px-3 py-1 text-[#E5E5EA]">
                {target.primaryTreeName} / {target.secondaryTreeName}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {target.summonerSpellNames.map((sp) => (
                <span
                  key={sp}
                  className="rounded-full bg-white/[0.07] px-3 py-1 font-medium text-[#D1D1D6]"
                >
                  {sp}
                </span>
              ))}
              <span className="rounded-full bg-[#FFD60A]/12 px-3 py-1 text-[#FFD60A]">
                {target.trinketName}
              </span>
            </div>
          </div>
        </div>

        {/* Chronological Purchase Timeline */}
        {completedPurchases.length > 0 && (
          <div className="mt-5 border-t border-white/[0.07] pt-4">
            <div className="mb-2.5 text-[12px] font-medium text-[#98989D]">
              {t.purchaseTimelineLabel}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {completedPurchases.map((p, idx) => (
                <div key={`${p.itemId}-${idx}`} className="flex items-center gap-2">
                  <div className="flex items-center gap-2 rounded-[12px] bg-[#2C2C2E]/80 px-2.5 py-1.5 ring-1 ring-white/[0.06]">
                    <img
                      src={getItemIconUrl(engine.ddragonVersion, p.itemId)}
                      alt={p.itemName}
                      className="h-7 w-7 rounded-[7px]"
                    />
                    <div className="leading-tight">
                      <div className="text-[12px] font-medium text-white">{p.itemName}</div>
                      <div className="text-[11px] tabular-nums text-[#98989D]">{p.minute}:00</div>
                    </div>
                  </div>
                  {idx < completedPurchases.length - 1 && (
                    <ArrowRight className="h-3.5 w-3.5 text-[#636366]" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* AI Build & Rune Analysis */}
      {build && (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="ios-sheet rounded-[18px] p-4">
              <div className="mb-1.5 flex items-center gap-2 text-[13px] font-semibold text-[#0A84FF]">
                <Sparkles className="h-4 w-4" />
                {t.runesLabel}
              </div>
              <p className="text-[13.5px] leading-relaxed text-[#E5E5EA]">{build.runesVerdict}</p>
            </div>

            <div className="ios-sheet rounded-[18px] p-4">
              <div className="mb-1.5 flex items-center gap-2 text-[13px] font-semibold text-[#30D158]">
                <Shield className="h-4 w-4" />
                {t.spellsLabel}
              </div>
              <p className="text-[13.5px] leading-relaxed text-[#E5E5EA]">{build.spellsVerdict}</p>
            </div>

            <div className="ios-sheet rounded-[18px] p-4">
              <div className="mb-1.5 flex items-center gap-2 text-[13px] font-semibold text-[#FF9F0A]">
                <Wrench className="h-4 w-4" />
                {t.bootsTrinketLabel}
              </div>
              <p className="text-[13.5px] leading-relaxed text-[#E5E5EA]">
                {build.bootsAndTrinketVerdict}
              </p>
            </div>

            <div className="ios-sheet rounded-[18px] p-4">
              <div className="mb-1.5 flex items-center gap-2 text-[13px] font-semibold text-white">
                <CheckCircle2 className="h-4 w-4 text-[#0A84FF]" />
                {t.itemOrderLabel}
              </div>
              <p className="text-[13.5px] leading-relaxed text-[#E5E5EA]">
                {build.itemOrderVerdict}
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-5">
            {/* Good Choices */}
            <div className="ios-sheet rounded-[20px] p-4 lg:col-span-2">
              <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-[#30D158]">
                <CheckCircle2 className="h-4 w-4" />
                {t.goodChoicesLabel}
              </div>
              <ul className="space-y-2 text-[13.5px] text-[#E5E5EA]">
                {build.goodChoices.map((g, i) => (
                  <li key={i} className="rounded-[12px] bg-[#30D158]/10 px-3 py-2 ring-1 ring-[#30D158]/20">
                    {g}
                  </li>
                ))}
              </ul>
            </div>

            {/* Specific Replacement Recommendations */}
            <div className="ios-sheet rounded-[20px] p-4 lg:col-span-3">
              <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-[#FF9F0A]">
                <Wrench className="h-4 w-4" />
                {t.recommendationsLabel}
              </div>
              <div className="space-y-2.5">
                {build.recommendations.map((rec, i) => (
                  <div
                    key={i}
                    className="rounded-[14px] bg-[#2C2C2E]/70 p-3.5 ring-1 ring-white/[0.06]"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-[13px]">
                      <span className="rounded-md bg-[#FF453A]/15 px-2 py-0.5 font-medium text-[#FF6961]">
                        {t.insteadOfLabel}: {rec.insteadOf}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-[#98989D]" />
                      <span className="rounded-md bg-[#30D158]/15 px-2 py-0.5 font-semibold text-[#30D158]">
                        {t.suggestedLabel}: {rec.suggested}
                      </span>
                    </div>
                    <p className="mt-2 text-[13px] leading-relaxed text-[#D1D1D6]">{rec.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
