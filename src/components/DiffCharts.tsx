'use client';

import { useState } from 'react';
import type { MinuteSnapshot } from '@/lib/engine/types';
import { useLanguage } from '@/lib/i18n/context';

interface DiffChartsProps {
  minutes: MinuteSnapshot[];
  activeMinute: number;
  opponentName: string | null;
  onSelectMinute: (minute: number) => void;
}

export function DiffCharts({
  minutes,
  activeMinute,
  opponentName,
  onSelectMinute,
}: DiffChartsProps) {
  const { t } = useLanguage();
  const [metric, setMetric] = useState<'gold' | 'cs'>('gold');

  if (minutes.length < 2) return null;

  const values = minutes.map((m) => (metric === 'gold' ? m.goldDiff : m.csDiff));
  const maxAbs = Math.max(metric === 'gold' ? 1200 : 15, ...values.map((v) => Math.abs(v)));

  const width = 340;
  const height = 116;
  const padX = 8;
  const padY = 12;
  const usableW = width - padX * 2;
  const usableH = height - padY * 2;
  const zeroY = padY + usableH / 2;

  const points = minutes.map((m, idx) => {
    const val = metric === 'gold' ? m.goldDiff : m.csDiff;
    const x = padX + (idx / Math.max(1, minutes.length - 1)) * usableW;
    const y = zeroY - (val / maxAbs) * (usableH / 2);
    return { x, y, val, minute: m.minute };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${zeroY.toFixed(1)} L ${points[0].x.toFixed(1)} ${zeroY.toFixed(1)} Z`;

  const activePoint = points.find((p) => p.minute === activeMinute) ?? points[0];
  const isPositive = activePoint.val >= 0;
  const strokeColor = isPositive ? '#A78BFA' : '#F43F5E';

  return (
    <div className="ios-sheet rounded-[22px] p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <div className="text-[13px] font-semibold text-white">
            {metric === 'gold' ? t.goldDiffTitle : t.csDiffTitle}
          </div>
          <div className="text-[11px] text-[#98989D]">
            {opponentName ? `vs ${opponentName}` : t.vsOpponent}
          </div>
        </div>

        {/* iOS Segmented Switch */}
        <div className="inline-flex rounded-[9px] bg-[#2C2C2E] p-[2px]">
          {(['gold', 'cs'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setMetric(key)}
              className={`rounded-[7px] px-2.5 py-1 text-[11px] font-semibold transition-all ${
                metric === key ? 'bg-[#48484A] text-white' : 'text-[#98989D] hover:text-white'
              }`}
            >
              {key === 'gold' ? 'Gold' : 'CS'}
            </button>
          ))}
        </div>
      </div>

      {/* Live readout for active minute */}
      <div className="mb-2 flex items-baseline justify-between tabular-nums">
        <span
          className="text-[22px] font-semibold tracking-tight"
          style={{ color: strokeColor }}
        >
          {activePoint.val >= 0 ? `+${activePoint.val}` : activePoint.val}
          {metric === 'gold' ? 'g' : ' CS'}
        </span>
        <span className="text-[12px] text-[#98989D]">
          {String(activePoint.minute).padStart(2, '0')}:00
        </span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full cursor-pointer select-none overflow-visible"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const relX = ((e.clientX - rect.left) / rect.width) * width;
          let closest = points[0];
          let minD = Infinity;
          for (const p of points) {
            const d = Math.abs(p.x - relX);
            if (d < minD) {
              minD = d;
              closest = p;
            }
          }
          onSelectMinute(closest.minute);
        }}
      >
        <defs>
          <linearGradient id="diffAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.28" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Zero reference hairline */}
        <line
          x1={padX}
          y1={zeroY}
          x2={width - padX}
          y2={zeroY}
          stroke="rgba(255,255,255,0.14)"
          strokeDasharray="3 3"
          strokeWidth="1"
        />

        <path d={areaPath} fill="url(#diffAreaGrad)" />
        <path
          d={linePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Active minute indicator */}
        <line
          x1={activePoint.x}
          y1={padY}
          x2={activePoint.x}
          y2={height - padY}
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="1"
        />
        <circle
          cx={activePoint.x}
          cy={activePoint.y}
          r="4.5"
          fill={strokeColor}
          stroke="#000"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
}
