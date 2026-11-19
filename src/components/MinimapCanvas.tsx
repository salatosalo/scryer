'use client';

import { ChevronLeft, ChevronRight, Pause, Play, Skull, Swords, Trophy } from 'lucide-react';
import type { MinuteSnapshot } from '@/lib/engine/types';
import { useLanguage } from '@/lib/i18n/context';
import { getChampionIconUrl, getMinimapImageUrl } from '@/lib/riot/assets';

interface MinimapCanvasProps {
  ddragonVersion: string;
  minutes: MinuteSnapshot[];
  activeMinute: number;
  isPlaying: boolean;
  onSelectMinute: (minute: number) => void;
  onTogglePlay: () => void;
}

const MAP_MAX = 14800;

function toPercent(x: number, y: number): { left: number; top: number } {
  const clampedX = Math.max(0, Math.min(MAP_MAX, x));
  const clampedY = Math.max(0, Math.min(MAP_MAX, y));
  return {
    left: (clampedX / MAP_MAX) * 100,
    // Summoner's Rift y=0 is bottom-left; CSS top=0 is top-left
    top: (1 - clampedY / MAP_MAX) * 100,
  };
}

export function MinimapCanvas({
  ddragonVersion,
  minutes,
  activeMinute,
  isPlaying,
  onSelectMinute,
  onTogglePlay,
}: MinimapCanvasProps) {
  const { t } = useLanguage();
  const maxMinute = minutes.length;
  const current = minutes.find((m) => m.minute === activeMinute) ?? minutes[0];

  if (!current) return null;

  const deathEvents = current.events.filter((e) => e.type === 'DEATH' && e.x != null && e.y != null);
  const killEvents = current.events.filter(
    (e) => (e.type === 'KILL' || e.type === 'ASSIST') && e.x != null && e.y != null
  );
  const objEvents = current.events.filter((e) => e.type === 'OBJECTIVE' && e.x != null && e.y != null);

  return (
    <div className="ios-sheet rounded-[22px] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[14px] font-semibold text-white">{t.minimapTitle}</div>
        <div className="flex items-center gap-2 text-[13px] tabular-nums">
          <span className="rounded-full bg-purple-500/20 px-2.5 py-0.5 font-semibold text-purple-300 ring-1 ring-purple-500/30">
            {String(current.minute).padStart(2, '0')}:00
          </span>
          <span className="text-[#98989D]">/ {String(maxMinute).padStart(2, '0')}:00</span>
        </div>
      </div>

      {/* Interactive Summoner's Rift Plane */}
      <div className="relative mx-auto aspect-square w-full max-w-[360px] overflow-hidden rounded-[18px] bg-[#0B1218] ring-1 ring-white/[0.12]">
        <img
          src={getMinimapImageUrl(ddragonVersion)}
          alt="Summoner's Rift minimap"
          className="h-full w-full object-cover opacity-85 select-none"
          draggable={false}
        />

        {/* Subtle vignette */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/20" />

        {/* Objective markers */}
        {objEvents.map((ev, i) => {
          const pos = toPercent(ev.x!, ev.y!);
          return (
            <div
              key={`obj-${i}`}
              title={ev.label}
              style={{ left: `${pos.left}%`, top: `${pos.top}%` }}
              className="absolute z-10 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#FFD60A] text-black shadow-lg ring-2 ring-black/60"
            >
              <Trophy className="h-3.5 w-3.5" />
            </div>
          );
        })}

        {/* Death markers */}
        {deathEvents.map((ev, i) => {
          const pos = toPercent(ev.x!, ev.y!);
          return (
            <div
              key={`death-${i}`}
              title={ev.label}
              style={{ left: `${pos.left}%`, top: `${pos.top}%` }}
              className="absolute z-20 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#FF453A] text-white shadow-lg ring-2 ring-white"
            >
              <Skull className="h-3.5 w-3.5" />
            </div>
          );
        })}

        {/* Kill & Assist Combat markers (Exact battle location in jungle/river/lane) */}
        {killEvents.map((ev, i) => {
          const pos = toPercent(ev.x!, ev.y!);
          const min = Math.floor(ev.timestampSec / 60);
          const sec = ev.timestampSec % 60;
          const timeStr = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
          return (
            <div
              key={`kill-${i}`}
              title={`${ev.label} (${timeStr})`}
              style={{ left: `${pos.left}%`, top: `${pos.top}%` }}
              className="absolute z-20 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-slate-950 shadow-lg ring-2 ring-white"
            >
              <Swords className="h-3.5 w-3.5" />
            </div>
          );
        })}

        {/* Smoothly gliding 10-champion portrait pins */}
        {current.positions.map((p) => {
          const pos = toPercent(p.x, p.y);
          const ringClass = p.isTarget
            ? 'ring-[2.5px] ring-[#FFD60A] shadow-[0_0_16px_rgba(255,214,10,0.65)] z-30 scale-115'
            : p.team === 'BLUE'
              ? 'ring-2 ring-[#0A84FF] z-10'
              : 'ring-2 ring-[#FF453A] z-10';

          return (
            <div
              key={p.participantId}
              title={`${p.championName} (${p.team})${p.isTarget ? ' ★' : ''}`}
              style={{
                left: `${pos.left}%`,
                top: `${pos.top}%`,
                transition: 'left 280ms cubic-bezier(0.22, 1, 0.36, 1), top 280ms cubic-bezier(0.22, 1, 0.36, 1)',
              }}
              className={`absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full bg-black ${ringClass} ${
                p.alive ? 'opacity-100' : 'opacity-40 grayscale'
              }`}
            >
              <img
                src={getChampionIconUrl(ddragonVersion, p.championName)}
                alt={p.championName}
                className="h-full w-full object-cover"
              />
            </div>
          );
        })}
      </div>

      {/* Tactile iOS Scrubber & Transport Controls */}
      <div className="mt-4 space-y-3">
        <input
          type="range"
          min={1}
          max={maxMinute}
          value={activeMinute}
          onChange={(e) => onSelectMinute(Number(e.target.value))}
          aria-label="Match minute"
          className="ios-slider w-full"
        />

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onSelectMinute(Math.max(1, activeMinute - 1))}
              disabled={activeMinute <= 1}
              aria-label="Previous minute"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2C2C2E] text-white transition-all hover:bg-[#3A3A3C] active:scale-[0.94] disabled:opacity-35"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onTogglePlay}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-gradient-to-r from-purple-600 to-rose-700 px-4 text-[13px] font-semibold text-white transition-all hover:opacity-90 active:scale-[0.96]"
            >
              {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {isPlaying ? t.pause : t.play}
            </button>
            <button
              type="button"
              onClick={() => onSelectMinute(Math.min(maxMinute, activeMinute + 1))}
              disabled={activeMinute >= maxMinute}
              aria-label="Next minute"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2C2C2E] text-white transition-all hover:bg-[#3A3A3C] active:scale-[0.94] disabled:opacity-35"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-[#98989D]">
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-[#FFD60A]" />
              You
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-[#8B5CF6]" />
              Blue
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-[#E11D48]" />
              Red
            </span>
          </div>
        </div>

        {/* Exact-second Events of this minute */}
        {current.events.length > 0 && (
          <div className="space-y-1.5 border-t border-purple-950/40 pt-2.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-purple-300">
              События минуты (по секундам):
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
              {current.events.map((ev, idx) => {
                const min = Math.floor(ev.timestampSec / 60);
                const sec = ev.timestampSec % 60;
                const timeStr = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
                const isKill = ev.type === 'KILL' || ev.type === 'ASSIST';
                const isDeath = ev.type === 'DEATH';
                return (
                  <div
                    key={`ev-list-${idx}`}
                    className={`flex items-center gap-2 rounded-lg px-2.5 py-1 text-[12px] tabular-nums ${
                      isDeath
                        ? 'bg-rose-950/40 border border-rose-800/40 text-rose-200'
                        : isKill
                          ? 'bg-emerald-950/40 border border-emerald-800/40 text-emerald-200'
                          : 'bg-purple-950/40 border border-purple-800/30 text-purple-200'
                    }`}
                  >
                    <span className="font-bold shrink-0">{timeStr}</span>
                    <span className="shrink-0">{isDeath ? '💀' : isKill ? '⚔️' : '🏆'}</span>
                    <span className="truncate">{ev.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <p className="text-[11px] text-[#636366]">{t.keyboardHint}</p>
      </div>
    </div>
  );
}
