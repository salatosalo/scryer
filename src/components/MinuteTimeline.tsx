'use client';

import { useEffect, useRef } from 'react';
import { Lightbulb, ShoppingBag, Eye } from 'lucide-react';
import type { AiCoachingReport, MinuteRating } from '@/lib/ai/schema';
import type { DeterministicFlag, MinuteSnapshot } from '@/lib/engine/types';
import { useLanguage } from '@/lib/i18n/context';

interface MinuteTimelineProps {
  minutes: MinuteSnapshot[];
  aiMinutes: AiCoachingReport['minutes'] | null;
  activeMinute: number;
  filter: 'all' | 'key';
  onFilterChange: (next: 'all' | 'key') => void;
  onSelectMinute: (minute: number) => void;
}

function ratingStyles(rating: MinuteRating): { pill: string; border: string } {
  switch (rating) {
    case 'great':
      return {
        pill: 'bg-[#30D158]/15 text-[#30D158] ring-1 ring-[#30D158]/30',
        border: 'border-l-[#30D158]',
      };
    case 'missed':
      return {
        pill: 'bg-[#FF9F0A]/15 text-[#FF9F0A] ring-1 ring-[#FF9F0A]/30',
        border: 'border-l-[#FF9F0A]',
      };
    case 'mistake':
      return {
        pill: 'bg-[#FF453A]/15 text-[#FF453A] ring-1 ring-[#FF453A]/30',
        border: 'border-l-[#FF453A]',
      };
    case 'critical':
      return {
        pill: 'bg-[#FF453A] text-white',
        border: 'border-l-[#FF453A]',
      };
    default:
      return {
        pill: 'bg-white/[0.08] text-[#98989D]',
        border: 'border-l-white/15',
      };
  }
}

function inferEngineRating(m: MinuteSnapshot): MinuteRating {
  if (m.flags.includes('DEATH_NO_VISION') || m.flags.includes('BOUNTY_THROWN')) return 'critical';
  if (m.flags.includes('OBJECTIVE_CONTEST_MISSED') || m.flags.includes('HIGH_UNSPENT_GOLD')) return 'mistake';
  if (m.flags.includes('CS_DROP')) return 'missed';
  if (m.flags.includes('STRONG_TEMPO_PLAY')) return 'great';
  return 'ok';
}

function flagStyle(flag: DeterministicFlag): string {
  if (flag === 'STRONG_TEMPO_PLAY') return 'bg-[#30D158]/15 text-[#30D158]';
  if (flag === 'DEATH_NO_VISION' || flag === 'BOUNTY_THROWN') return 'bg-[#FF453A]/15 text-[#FF453A]';
  return 'bg-[#FF9F0A]/15 text-[#FF9F0A]';
}

export function MinuteTimeline({
  minutes,
  aiMinutes,
  activeMinute,
  filter,
  onFilterChange,
  onSelectMinute,
}: MinuteTimelineProps) {
  const { t } = useLanguage();
  const rowRefs = useRef<Record<number, HTMLButtonElement | null>>({});

  const aiMap = new Map<number, AiCoachingReport['minutes'][number]>();
  for (const item of aiMinutes ?? []) {
    aiMap.set(item.minute, item);
  }

  const visible = minutes.filter((m) => {
    if (filter === 'all') return true;
    const ai = aiMap.get(m.minute);
    return Boolean(m.isKeyMoment || ai?.isKeyMoment || (ai && ai.rating !== 'ok'));
  });

  useEffect(() => {
    const el = rowRefs.current[activeMinute];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeMinute]);

  return (
    <div className="space-y-3">
      {/* Sticky iOS Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-[11px] bg-[#1C1C1E] p-[3px] ring-1 ring-white/[0.08]">
          {(
            [
              { id: 'key', label: t.filterKey },
              { id: 'all', label: t.filterAll },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onFilterChange(opt.id)}
              className={`rounded-[8px] px-3.5 py-1.5 text-[13px] font-medium transition-all active:scale-[0.97] ${
                filter === opt.id
                  ? 'bg-[#3A3A3C] text-white shadow-sm'
                  : 'text-[#98989D] hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <span className="text-[12px] tabular-nums text-[#98989D]">
          {visible.length} / {minutes.length} {t.minuteShort}
        </span>
      </div>

      {/* Grouped Minute Feed */}
      <div className="space-y-2.5">
        {visible.map((m) => {
          const ai = aiMap.get(m.minute);
          const rating = ai?.rating ?? inferEngineRating(m);
          const styles = ratingStyles(rating);
          const isSelected = m.minute === activeMinute;
          const completedBuys = m.purchases.filter((p) => p.totalGold >= 450);

          return (
            <button
              key={m.minute}
              ref={(node) => {
                rowRefs.current[m.minute] = node;
              }}
              type="button"
              onClick={() => onSelectMinute(m.minute)}
              className={`w-full rounded-[18px] border-l-[3px] p-4 text-left transition-all duration-150 active:scale-[0.995] ${
                styles.border
              } ${
                isSelected
                  ? 'bg-[#1C1832] ring-1 ring-purple-500/60 shadow-[0_8px_28px_rgba(139,92,246,0.25)]'
                  : 'bg-[#121020]/90 ring-1 ring-purple-950/40 hover:bg-[#18152C]'
              }`}
            >
              {/* Top line: Minute + Headline + Rating Pill */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`rounded-[8px] px-2 py-0.5 text-[12px] font-semibold tabular-nums ${
                      isSelected ? 'bg-gradient-to-r from-purple-600 to-rose-700 text-white shadow' : 'bg-white/[0.08] text-[#E5E5EA]'
                    }`}
                  >
                    {String(m.minute).padStart(2, '0')}:00
                  </span>
                  <span className="text-[14px] font-semibold text-white">
                    {ai?.headline ??
                      (m.events[0]?.label || `Lv ${m.targetStats.level} · ${m.targetStats.cs} CS`)}
                  </span>
                </div>

                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${styles.pill}`}>
                  {t.ratings[rating]}
                </span>
              </div>

              {/* Deterministic Metrics & Flags Strip */}
              <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[12px] tabular-nums">
                <span
                  className={`rounded-md bg-black/35 px-2 py-0.5 font-medium ${
                    m.goldDiff >= 0 ? 'text-[#30D158]' : 'text-[#FF453A]'
                  }`}
                >
                  Gold {m.goldDiff >= 0 ? `+${m.goldDiff}` : m.goldDiff}
                </span>
                <span
                  className={`rounded-md bg-black/35 px-2 py-0.5 font-medium ${
                    m.csDiff >= 0 ? 'text-[#30D158]' : 'text-[#FF453A]'
                  }`}
                >
                  CS {m.targetStats.cs} ({m.csDiff >= 0 ? `+${m.csDiff}` : m.csDiff})
                </span>
                {m.wardsPlaced > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-black/35 px-2 py-0.5 text-[#98989D]">
                    <Eye className="h-3 w-3" /> +{m.wardsPlaced}
                  </span>
                )}
                {completedBuys.map((b, i) => (
                  <span
                    key={`${b.itemId}-${i}`}
                    className="inline-flex items-center gap-1 rounded-md bg-[#FFD60A]/12 px-2 py-0.5 text-[#FFD60A]"
                  >
                    <ShoppingBag className="h-3 w-3" /> {b.itemName}
                  </span>
                ))}
                {m.flags.map((flag) => (
                  <span
                    key={flag}
                    className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${flagStyle(flag)}`}
                  >
                    {t.flags[flag]}
                  </span>
                ))}
              </div>

              {/* Verified Events from Engine (With exact seconds) */}
              {m.events.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5 text-[12px] text-[#C7C7CC]">
                  {m.events.map((ev, i) => {
                    const min = Math.floor(ev.timestampSec / 60);
                    const sec = ev.timestampSec % 60;
                    const timeStr = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
                    return (
                      <span
                        key={i}
                        className="rounded-lg bg-purple-950/40 border border-purple-900/30 px-2 py-0.5 text-[11px] tabular-nums text-slate-200"
                      >
                        <strong className="text-purple-300 mr-1.5">{timeStr}</strong>
                        {ev.label}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* AI Explanation */}
              {ai && (
                <p className="mt-2.5 text-[13.5px] leading-relaxed text-[#D1D1D6]">
                  {ai.analysis}
                </p>
              )}

              {/* Actionable Alternative */}
              {ai?.betterPlay && (
                <div className="mt-3 flex items-start gap-2 rounded-[12px] bg-[#0A84FF]/12 px-3 py-2.5 text-[13px] text-[#D7ECFF] ring-1 ring-[#0A84FF]/25">
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[#0A84FF]" />
                  <div>
                    <span className="font-semibold text-[#64B5FF]">{t.betterPlayLabel}: </span>
                    {ai.betterPlay}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
