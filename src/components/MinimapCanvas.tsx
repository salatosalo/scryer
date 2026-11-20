'use client';

import { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Crosshair,
  MapPin,
  Pause,
  Play,
  RotateCcw,
  Skull,
  Swords,
  Trophy,
} from 'lucide-react';
import type { MinuteSnapshot, PlayerPosition, TimelineEventSummary } from '@/lib/engine/types';
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

function getInterpolatedPositions(
  currentMinute: MinuteSnapshot,
  nextMinute: MinuteSnapshot | undefined,
  secondInMinute: number,
  selectedEvent: TimelineEventSummary | null
): PlayerPosition[] {
  const t = Math.max(0, Math.min(1, secondInMinute / 60));

  return currentMinute.positions.map((p1) => {
    // If a kill/death event is selected, place the target or victim exactly on the event coordinates
    if (selectedEvent && selectedEvent.x != null && selectedEvent.y != null) {
      if (selectedEvent.type === 'DEATH' && p1.isTarget) {
        return { ...p1, x: selectedEvent.x, y: selectedEvent.y };
      }
      if (selectedEvent.victimChampionName && selectedEvent.victimChampionName === p1.championName) {
        return { ...p1, x: selectedEvent.x, y: selectedEvent.y };
      }
    }

    if (t === 0 || !nextMinute) {
      return p1;
    }

    const p2 = nextMinute.positions.find((x) => x.participantId === p1.participantId);
    if (!p2) return p1;

    // Linear interpolation between the two minute snapshots
    const interpX = Math.round(p1.x + (p2.x - p1.x) * t);
    const interpY = Math.round(p1.y + (p2.y - p1.y) * t);

    return {
      ...p1,
      x: interpX,
      y: interpY,
      alive: t > 0.5 ? p2.alive : p1.alive,
    };
  });
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
  const nextMinute = minutes.find((m) => m.minute === activeMinute + 1);

  const [selectedEvent, setSelectedEvent] = useState<TimelineEventSummary | null>(null);

  // If activeMinute changed, ensure selectedEvent matches current minute
  const activeEvent = selectedEvent && selectedEvent.minute === activeMinute ? selectedEvent : null;
  const activeSecond = activeEvent ? activeEvent.timestampSec % 60 : 0;

  const currentPositions = useMemo(() => {
    if (!current) return [];
    return getInterpolatedPositions(current, nextMinute, activeSecond, activeEvent);
  }, [current, nextMinute, activeSecond, activeEvent]);

  if (!current) return null;

  const deathEvents = current.events.filter((e) => e.type === 'DEATH' && e.x != null && e.y != null);
  const killEvents = current.events.filter(
    (e) => (e.type === 'KILL' || e.type === 'ASSIST') && e.x != null && e.y != null
  );
  const objEvents = current.events.filter((e) => e.type === 'OBJECTIVE' && e.x != null && e.y != null);

  const minStr = String(current.minute).padStart(2, '0');
  const secStr = String(activeSecond).padStart(2, '0');
  const displayTime = `${minStr}:${secStr}`;

  return (
    <div className="ios-sheet rounded-[22px] p-4">
      {/* Header bar with minute + second accuracy */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-semibold text-white">{t.minimapTitle}</span>
          {activeEvent && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-medium text-emerald-300 ring-1 ring-emerald-500/30">
              <Crosshair className="h-3 w-3" />
              {displayTime}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-[13px] tabular-nums">
          <span
            className={`rounded-full px-2.5 py-0.5 font-semibold ring-1 transition-all ${
              activeEvent
                ? 'bg-emerald-500/20 text-emerald-300 ring-emerald-500/40'
                : 'bg-purple-500/20 text-purple-300 ring-purple-500/30'
            }`}
          >
            {displayTime}
          </span>
          <span className="text-[#98989D]">/ {String(maxMinute).padStart(2, '0')}:00</span>

          {activeEvent && (
            <button
              type="button"
              onClick={() => setSelectedEvent(null)}
              title={t.resetEventFocus}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-white/80 transition-all hover:bg-white/20 hover:text-white"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Interactive Summoner's Rift Map Plane */}
      <div className="relative mx-auto aspect-square w-full max-w-[360px] overflow-hidden rounded-[18px] bg-[#0B1218] ring-1 ring-white/[0.12]">
        <img
          src={getMinimapImageUrl(ddragonVersion)}
          alt="Summoner's Rift minimap"
          className="h-full w-full object-cover opacity-85 select-none"
          draggable={false}
        />

        {/* Subtle vignette */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/20" />

        {/* Active Combat Focus Spotlight (when an exact-second event is selected) */}
        {activeEvent && activeEvent.x != null && activeEvent.y != null && (
          <div
            style={{
              left: `${toPercent(activeEvent.x, activeEvent.y).left}%`,
              top: `${toPercent(activeEvent.x, activeEvent.y).top}%`,
            }}
            className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2"
          >
            <span className="absolute -inset-4 animate-ping rounded-full border-2 border-emerald-400 opacity-60" />
            <span className="absolute -inset-2 animate-pulse rounded-full border border-yellow-300/80 bg-yellow-400/20" />
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-black shadow-lg ring-2 ring-white">
              <Crosshair className="h-3 w-3 stroke-[3]" />
            </div>
          </div>
        )}

        {/* Objective markers */}
        {objEvents.map((ev, i) => {
          const pos = toPercent(ev.x!, ev.y!);
          const isSelected = activeEvent === ev;
          return (
            <button
              type="button"
              key={`obj-${i}`}
              onClick={() => setSelectedEvent(isSelected ? null : ev)}
              title={ev.label}
              style={{ left: `${pos.left}%`, top: `${pos.top}%` }}
              className={`absolute z-10 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-[#FFD60A] text-black shadow-lg ring-2 transition-transform hover:scale-125 active:scale-95 ${
                isSelected ? 'ring-white scale-125' : 'ring-black/60'
              }`}
            >
              <Trophy className="h-3.5 w-3.5" />
            </button>
          );
        })}

        {/* Death markers */}
        {deathEvents.map((ev, i) => {
          const pos = toPercent(ev.x!, ev.y!);
          const isSelected = activeEvent === ev;
          return (
            <button
              type="button"
              key={`death-${i}`}
              onClick={() => setSelectedEvent(isSelected ? null : ev)}
              title={ev.label}
              style={{ left: `${pos.left}%`, top: `${pos.top}%` }}
              className={`absolute z-20 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-[#FF453A] text-white shadow-lg ring-2 transition-transform hover:scale-125 active:scale-95 ${
                isSelected ? 'ring-yellow-300 scale-125 shadow-[0_0_14px_rgba(255,69,58,0.9)]' : 'ring-white'
              }`}
            >
              <Skull className="h-3.5 w-3.5" />
            </button>
          );
        })}

        {/* Kill & Assist Combat markers */}
        {killEvents.map((ev, i) => {
          const pos = toPercent(ev.x!, ev.y!);
          const min = Math.floor(ev.timestampSec / 60);
          const sec = ev.timestampSec % 60;
          const timeStr = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
          const isSelected = activeEvent === ev;
          return (
            <button
              type="button"
              key={`kill-${i}`}
              onClick={() => setSelectedEvent(isSelected ? null : ev)}
              title={`${ev.label} (${timeStr})`}
              style={{ left: `${pos.left}%`, top: `${pos.top}%` }}
              className={`absolute z-20 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-slate-950 shadow-lg ring-2 transition-transform hover:scale-125 active:scale-95 ${
                isSelected ? 'ring-yellow-300 scale-125 shadow-[0_0_14px_rgba(52,211,153,0.9)]' : 'ring-white'
              }`}
            >
              <Swords className="h-3.5 w-3.5" />
            </button>
          );
        })}

        {/* Gliding 10-champion portrait pins */}
        {currentPositions.map((p) => {
          const pos = toPercent(p.x, p.y);
          const ringClass = p.isTarget
            ? 'ring-[2.5px] ring-[#FFD60A] shadow-[0_0_16px_rgba(255,214,10,0.7)] z-30 scale-110'
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
                transition: 'left 250ms ease-out, top 250ms ease-out',
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

      {/* Tactile Scrubber & Transport Controls */}
      <div className="mt-4 space-y-3">
        <input
          type="range"
          min={1}
          max={maxMinute}
          value={activeMinute}
          onChange={(e) => {
            setSelectedEvent(null);
            onSelectMinute(Number(e.target.value));
          }}
          aria-label="Match minute"
          className="ios-slider w-full"
        />

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setSelectedEvent(null);
                onSelectMinute(Math.max(1, activeMinute - 1));
              }}
              disabled={activeMinute <= 1}
              aria-label="Previous minute"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2C2C2E] text-white transition-all hover:bg-[#3A3A3C] active:scale-[0.94] disabled:opacity-35"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedEvent(null);
                onTogglePlay();
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-gradient-to-r from-purple-600 to-rose-700 px-4 text-[13px] font-semibold text-white transition-all hover:opacity-90 active:scale-[0.96]"
            >
              {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {isPlaying ? t.pause : t.play}
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedEvent(null);
                onSelectMinute(Math.min(maxMinute, activeMinute + 1));
              }}
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
              <span className="h-2.5 w-2.5 rounded-full bg-[#0A84FF]" />
              Blue
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-[#FF453A]" />
              Red
            </span>
          </div>
        </div>

        {/* Interactive Exact-second Events of this minute */}
        <div className="space-y-2 border-t border-white/[0.08] pt-3">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold uppercase tracking-wider text-purple-300">
              {t.minuteEventsTitle}
            </span>
            <span className="text-[10px] text-[#8E8E93]">{t.eventFocusHint}</span>
          </div>

          {current.events.length === 0 ? (
            <p className="text-[12px] italic text-[#8E8E93]">{t.noMinuteEvents}</p>
          ) : (
            <div className="max-h-36 space-y-1.5 overflow-y-auto pr-1">
              {current.events.map((ev, idx) => {
                const min = Math.floor(ev.timestampSec / 60);
                const sec = ev.timestampSec % 60;
                const timeStr = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
                const isKill = ev.type === 'KILL' || ev.type === 'ASSIST';
                const isDeath = ev.type === 'DEATH';
                const isSelected = activeEvent === ev;

                return (
                  <button
                    type="button"
                    key={`ev-list-${idx}`}
                    onClick={() => setSelectedEvent(isSelected ? null : ev)}
                    className={`flex w-full items-center justify-between gap-2.5 rounded-xl px-3 py-1.5 text-left text-[12px] tabular-nums transition-all ${
                      isSelected
                        ? isDeath
                          ? 'bg-rose-900/50 ring-2 ring-rose-500 text-rose-100 shadow-md'
                          : isKill
                            ? 'bg-emerald-900/50 ring-2 ring-emerald-500 text-emerald-100 shadow-md'
                            : 'bg-yellow-900/50 ring-2 ring-yellow-400 text-yellow-100 shadow-md'
                        : isDeath
                          ? 'bg-rose-950/30 border border-rose-800/30 text-rose-200/90 hover:bg-rose-900/40'
                          : isKill
                            ? 'bg-emerald-950/30 border border-emerald-800/30 text-emerald-200/90 hover:bg-emerald-900/40'
                            : 'bg-purple-950/30 border border-purple-800/30 text-purple-200/90 hover:bg-purple-900/40'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="font-bold shrink-0 rounded bg-black/40 px-1.5 py-0.5 text-[11px]">
                        {timeStr}
                      </span>

                      {/* Optional killer & victim portraits */}
                      {ev.killerChampionName && (
                        <img
                          src={getChampionIconUrl(ddragonVersion, ev.killerChampionName)}
                          alt={ev.killerChampionName}
                          className="h-4 w-4 shrink-0 rounded-full object-cover ring-1 ring-white/20"
                        />
                      )}
                      {ev.victimChampionName && (
                        <span className="flex items-center gap-1 shrink-0">
                          <span className="text-[10px] text-white/50">vs</span>
                          <img
                            src={getChampionIconUrl(ddragonVersion, ev.victimChampionName)}
                            alt={ev.victimChampionName}
                            className="h-4 w-4 shrink-0 rounded-full object-cover ring-1 ring-white/20"
                          />
                        </span>
                      )}

                      <span className="truncate">{ev.label}</span>
                    </div>

                    <span className="shrink-0 text-[11px]">
                      {isSelected ? (
                        <span className="font-bold text-yellow-300">● Фокус</span>
                      ) : (
                        <MapPin className="h-3 w-3 text-white/40" />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <p className="text-[11px] text-[#636366]">{t.keyboardHint}</p>
        </div>
      </div>
    </div>
  );
}
