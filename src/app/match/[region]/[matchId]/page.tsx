'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import type { AiCoachingReport } from '@/lib/ai/schema';
import type { EngineReport } from '@/lib/engine/types';
import { useLanguage } from '@/lib/i18n/context';
import { BuildEvaluation } from '@/components/BuildEvaluation';
import { DiffCharts } from '@/components/DiffCharts';
import { DraftEvaluation } from '@/components/DraftEvaluation';
import { MinimapCanvas } from '@/components/MinimapCanvas';
import { MinuteTimeline } from '@/components/MinuteTimeline';
import { SummaryHeader } from '@/components/SummaryHeader';
import {
  deleteCachedAnalyses,
  getAnyCachedAnalysis,
  getCachedAnalysis,
  saveCachedAnalysis,
} from '@/lib/storage/client-db';
import { saveUserAnalysis } from '@/lib/storage/user-history';

export interface AnalysisResponse {
  engineReport: EngineReport;
  aiReport: AiCoachingReport | null;
  aiError: string | null;
  meta: {
    cached: boolean;
    provider: string;
    model: string;
    isDemo: boolean;
  };
}

export default function MatchDashboardPage({
  params,
}: {
  params: Promise<{ region: string; matchId: string }>;
}) {
  const { region, matchId } = use(params);
  const searchParams = useSearchParams();
  const puuid = searchParams.get('puuid') || 'DEMO_PUUID';
  const { lang, t } = useLanguage();

  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'timeline' | 'draft' | 'build'>('timeline');
  const [activeMinute, setActiveMinute] = useState(1);
  const [filter, setFilter] = useState<'all' | 'key'>('key');
  const [isPlaying, setIsPlaying] = useState(false);

  const runAnalysis = useCallback(
    async (forceRefresh = false) => {
      setLoading(true);
      setError(null);
      try {
        // 1. If not forcing refresh, check client-side IndexedDB cache first
        if (!forceRefresh) {
          const cached = await getCachedAnalysis(matchId, puuid, lang);
          if (cached) {
            setData(cached);
            const firstKey = cached.engineReport.minutes.find((m) => m.isKeyMoment)?.minute ?? 1;
            setActiveMinute((prev) =>
              prev >= 1 && prev <= cached.engineReport.minutes.length ? prev : firstKey
            );
            setLoading(false);
            return;
          }

          // 2. If current lang is not cached, check if report in another language exists in IndexedDB
          const otherCached = await getAnyCachedAnalysis(matchId, puuid);
          if (otherCached && otherCached.data.aiReport && otherCached.lang !== lang) {
            const res = await fetch(`/api/matches/${encodeURIComponent(matchId)}/analyze`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                region,
                puuid,
                lang,
                sourceReport: otherCached.data.aiReport,
                sourceLang: otherCached.lang,
                engineReport: otherCached.data.engineReport,
              }),
            });
            const json = await res.json();
            if (res.ok) {
              const resp = json as AnalysisResponse;
              setData(resp);
              await saveCachedAnalysis(matchId, puuid, lang, resp);
              const firstKey = resp.engineReport.minutes.find((m) => m.isKeyMoment)?.minute ?? 1;
              setActiveMinute((prev) =>
                prev >= 1 && prev <= resp.engineReport.minutes.length ? prev : firstKey
              );
              setLoading(false);
              return;
            }
          }
        }

        // 3. If forcing refresh, clear previous client-side cached entries for this match
        if (forceRefresh) {
          await deleteCachedAnalyses(matchId, puuid);
        }

        // 4. Request full analysis from server
        const res = await fetch(`/api/matches/${encodeURIComponent(matchId)}/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ region, puuid, lang, forceRefresh }),
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error || 'Failed to analyze match');
          return;
        }
        const resp = json as AnalysisResponse;
        setData(resp);
        await saveCachedAnalysis(matchId, puuid, lang, resp);
        saveUserAnalysis({
          matchId,
          region,
          puuid,
          riotId: resp.engineReport.target.riotId,
          championName: resp.engineReport.target.championName,
          result: resp.engineReport.result,
          grade: resp.aiReport?.summary.grade,
          score: resp.aiReport?.summary.score,
          durationSec: resp.engineReport.durationSec,
          patch: resp.engineReport.patch,
          analyzedAt: Date.now(),
        });
        const firstKey = resp.engineReport.minutes.find((m) => m.isKeyMoment)?.minute ?? 1;
        setActiveMinute((prev) =>
          prev >= 1 && prev <= resp.engineReport.minutes.length ? prev : firstKey
        );
      } catch {
        setError('Network error while analyzing match');
      } finally {
        setLoading(false);
      }
    },
    [matchId, region, puuid, lang]
  );

  useEffect(() => {
    runAnalysis(false);
  }, [runAnalysis]);

  // Smooth minute playback loop
  useEffect(() => {
    if (!isPlaying || !data) return;
    const maxM = data.engineReport.minutes.length;
    const timer = window.setInterval(() => {
      setActiveMinute((prev) => {
        if (prev >= maxM) {
          setIsPlaying(false);
          return maxM;
        }
        return prev + 1;
      });
    }, 950);
    return () => window.clearInterval(timer);
  }, [isPlaying, data]);

  // Keyboard shortcuts: Left/Right arrows step minutes, Space toggles playback
  useEffect(() => {
    if (!data || activeTab !== 'timeline') return;
    const maxM = data.engineReport.minutes.length;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setIsPlaying(false);
        setActiveMinute((m) => Math.max(1, m - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setIsPlaying(false);
        setActiveMinute((m) => Math.min(maxM, m + 1));
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [data, activeTab]);

  const handleJumpToMinute = (minute: number) => {
    setActiveTab('timeline');
    setIsPlaying(false);
    setActiveMinute(minute);
  };

  if (loading && !data) {
    return (
      <div className="mx-auto max-w-xl py-16">
        <div className="ios-glass rounded-[26px] p-8 text-center">
          <Loader2 className="mx-auto h-9 w-9 animate-spin text-[#0A84FF]" />
          <h2 className="mt-4 text-[19px] font-semibold text-white">{t.loadingMatchTitle}</h2>
          <ul className="mt-4 space-y-2 text-left text-[13px] text-[#98989D]">
            {t.loadingMatchSteps.map((step, i) => (
              <li key={i} className="flex items-center gap-2.5 rounded-[12px] bg-white/[0.04] px-3.5 py-2">
                <span className="h-2 w-2 rounded-full bg-[#0A84FF]" />
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-xl py-14">
        <div className="ios-sheet rounded-[24px] p-6 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-[#FF453A]" />
          <p className="mt-3 text-[15px] text-white">{error || 'Match not available'}</p>
          <Link
            href="/"
            className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-purple-600 to-rose-700 px-5 py-2 text-[14px] font-semibold text-white transition-all hover:opacity-90 active:scale-[0.97]"
          >
            <ArrowLeft className="h-4 w-4" />
            {t.backToSearch}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SummaryHeader
        engine={data.engineReport}
        ai={data.aiReport}
        aiError={data.aiError}
        meta={data.meta}
        loading={loading}
        onJumpToMinute={handleJumpToMinute}
        onReanalyze={() => runAnalysis(true)}
      />

      {/* Native iOS Segmented Tab Bar */}
      <div className="flex justify-center sm:justify-start">
        <div
          role="tablist"
          className="inline-flex w-full rounded-[14px] bg-[#1C1C1E] p-1 ring-1 ring-white/[0.08] sm:w-auto"
        >
          {(
            [
              { id: 'timeline', label: t.tabTimeline },
              { id: 'draft', label: t.tabDraft },
              { id: 'build', label: t.tabBuild },
            ] as const
          ).map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={active}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 rounded-[10px] px-5 py-2 text-[13.5px] font-semibold transition-all duration-150 active:scale-[0.97] sm:flex-none ${
                  active
                    ? 'bg-[#3A3A3C] text-white shadow-sm'
                    : 'text-[#98989D] hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'timeline' && (
        <div className="grid gap-5 lg:grid-cols-12 lg:items-start">
          {/* Left Sticky Interactive Minimap + Apple Stocks Diff Chart */}
          <div className="space-y-4 lg:sticky lg:top-20 lg:col-span-5">
            <MinimapCanvas
              ddragonVersion={data.engineReport.ddragonVersion}
              minutes={data.engineReport.minutes}
              activeMinute={activeMinute}
              isPlaying={isPlaying}
              onSelectMinute={(m) => {
                setIsPlaying(false);
                setActiveMinute(m);
              }}
              onTogglePlay={() => setIsPlaying((p) => !p)}
            />
            <DiffCharts
              minutes={data.engineReport.minutes}
              activeMinute={activeMinute}
              opponentName={data.engineReport.laneOpponent?.championName ?? null}
              onSelectMinute={(m) => {
                setIsPlaying(false);
                setActiveMinute(m);
              }}
            />
          </div>

          {/* Right Minute-by-Minute Coaching Feed */}
          <div className="lg:col-span-7">
            <MinuteTimeline
              minutes={data.engineReport.minutes}
              aiMinutes={data.aiReport?.minutes ?? null}
              activeMinute={activeMinute}
              filter={filter}
              onFilterChange={setFilter}
              onSelectMinute={(m) => {
                setIsPlaying(false);
                setActiveMinute(m);
              }}
            />
          </div>
        </div>
      )}

      {activeTab === 'draft' && (
        <DraftEvaluation engine={data.engineReport} ai={data.aiReport} />
      )}

      {activeTab === 'build' && (
        <BuildEvaluation engine={data.engineReport} ai={data.aiReport} />
      )}
    </div>
  );
}
