'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ChevronRight,
  Clock,
  Database,
  Search,
  Sparkles,
} from 'lucide-react';
import type { MatchListItemDto } from '@/app/api/summoner/route';
import { useLanguage } from '@/lib/i18n/context';
import { getChampionIconUrl } from '@/lib/riot/assets';
import { getQueueLabel, REGION_LIST, type RegionCode } from '@/lib/riot/regions';
import {
  clearUserHistory,
  getUserHistory,
  type SavedUserAnalysis,
} from '@/lib/storage/user-history';

interface ConfigStatus {
  riotConfigured: boolean;
  aiConfigured: boolean;
  aiProvider: string;
  aiModel: string;
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function HomePage() {
  const router = useRouter();
  const { lang, t } = useLanguage();

  const [riotIdInput, setRiotIdInput] = useState('');
  const [region, setRegion] = useState<RegionCode>('euw');
  const [searching, setSearching] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [account, setAccount] = useState<{
    puuid: string;
    riotId: string;
    region: string;
  } | null>(null);
  const [matches, setMatches] = useState<MatchListItemDto[]>([]);
  const [history, setHistory] = useState<SavedUserAnalysis[]>([]);
  const [config, setConfig] = useState<ConfigStatus | null>(null);

  useEffect(() => {
    fetch('/api/config-status')
      .then((r) => r.json())
      .then((d: ConfigStatus) => setConfig(d))
      .catch(() => {});

    setHistory(getUserHistory());
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setErrorCode(null);
    setErrorMsg(null);

    const trimmed = riotIdInput.trim();
    const hashIdx = trimmed.lastIndexOf('#');
    if (hashIdx <= 0 || hashIdx === trimmed.length - 1) {
      setErrorCode('INVALID_RIOT_ID');
      setErrorMsg(t.invalidRiotId);
      return;
    }

    const gameName = trimmed.slice(0, hashIdx).trim();
    const tagLine = trimmed.slice(hashIdx + 1).trim();

    setSearching(true);
    try {
      const qs = new URLSearchParams({ gameName, tagLine, region });
      const res = await fetch(`/api/summoner?${qs.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setErrorCode(data.code || 'ERROR');
        if (data.code === 'SUMMONER_NOT_FOUND') {
          setErrorMsg(t.summonerNotFound);
        } else if (data.code === 'RIOT_KEY_EXPIRED' || data.code === 'RIOT_KEY_MISSING') {
          setErrorMsg(t.riotKeyExpiredBody);
        } else {
          setErrorMsg(data.error || 'Failed to load summoner');
        }
        setMatches([]);
        setAccount(null);
        return;
      }

      setAccount(data.account);
      setMatches(data.matches || []);
    } catch {
      setErrorCode('NETWORK');
      setErrorMsg('Network error');
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Hero + iOS Frosted Search Sheet */}
      <section className="mx-auto max-w-3xl pt-4 text-center sm:pt-8">
        <h1 className="text-[32px] font-bold tracking-tight text-white sm:text-[42px]">
          {t.appName}
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-[15px] leading-relaxed text-[#98989D] sm:text-[16px]">
          {t.tagline}
        </p>

        <form
          onSubmit={handleSearch}
          className="ios-glass mt-6 rounded-[24px] p-4 text-left shadow-[0_20px_50px_rgba(0,0,0,0.55)] sm:p-5"
        >
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98989D]" />
              <input
                type="text"
                value={riotIdInput}
                onChange={(e) => setRiotIdInput(e.target.value)}
                placeholder={t.searchPlaceholder}
                autoComplete="off"
                className="h-12 w-full rounded-[14px] bg-[#2C2C2E]/85 pl-10 pr-4 text-[15px] text-white placeholder-[#8E8E93] ring-1 ring-white/[0.08] transition-all focus:bg-[#2C2C2E] focus:outline-none focus:ring-2 focus:ring-[#0A84FF]"
              />
            </div>

            <button
              type="submit"
              disabled={searching}
              className="inline-flex h-12 shrink-0 items-center justify-center rounded-[14px] bg-[#0A84FF] px-6 text-[15px] font-semibold text-white transition-all hover:bg-[#1E90FF] active:scale-[0.97] disabled:opacity-55"
            >
              {searching ? t.searching : t.searchButton}
            </button>
          </div>

          {/* iOS Region Pill Selector */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[12px] font-medium text-[#8E8E93]">{t.regionLabel}:</span>
            {REGION_LIST.map((r) => {
              const active = region === r.code;
              return (
                <button
                  key={r.code}
                  type="button"
                  onClick={() => setRegion(r.code)}
                  className={`rounded-full px-3 py-1 text-[12px] font-semibold transition-all active:scale-[0.95] ${
                    active
                      ? 'bg-white text-black'
                      : 'bg-white/[0.07] text-[#AEAEB2] hover:bg-white/[0.12] hover:text-white'
                  }`}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        </form>

        {/* Inline Error Card */}
        {errorMsg && (
          <div className="mt-4 flex items-start gap-3 rounded-[18px] bg-[#FF453A]/12 p-4 text-left text-[13.5px] text-[#FFB3AE] ring-1 ring-[#FF453A]/30">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#FF453A]" />
            <div>
              {(errorCode === 'RIOT_KEY_EXPIRED' || errorCode === 'RIOT_KEY_MISSING') && (
                <div className="mb-0.5 font-semibold text-white">{t.riotKeyExpiredTitle}</div>
              )}
              <p>{errorMsg}</p>
            </div>
          </div>
        )}
      </section>

      {/* Setup notice (only if keys missing) */}
      {config && (!config.riotConfigured || !config.aiConfigured) && (
        <section className="mx-auto max-w-3xl rounded-[20px] bg-[#1C1C1E]/90 p-4 text-[13px] ring-1 ring-white/[0.08]">
          <div className="font-semibold text-[#FFD60A]">{t.setupNoticeTitle}</div>
          <ul className="mt-1.5 space-y-1 text-[#C7C7CC]">
            {!config.riotConfigured && <li>• {t.setupNoticeRiotMissing}</li>}
            {!config.aiConfigured && <li>• {t.setupNoticeAiMissing}</li>}
          </ul>
        </section>
      )}



      {/* Search Results: Recent Matches (iOS Grouped Inset List) */}
      {account && matches.length > 0 && (
        <section className="mx-auto max-w-3xl space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[17px] font-semibold text-white">
              {t.recentMatchesTitle} — {account.riotId}
            </h2>
            <span className="text-[12px] font-medium text-[#98989D]">
              {account.region.toUpperCase()}
            </span>
          </div>

          <div className="ios-sheet overflow-hidden rounded-[22px] divide-y divide-white/[0.06]">
            {matches.map((m) => {
              const isWin = m.result === 'WIN';
              const href = `/match/${m.region}/${encodeURIComponent(m.matchId)}?puuid=${encodeURIComponent(m.puuid)}`;

              return (
                <div
                  key={m.matchId}
                  onClick={() => {
                    if (m.isSupported) router.push(href);
                  }}
                  className={`flex items-center justify-between gap-3 px-4 py-3.5 transition-colors ${
                    m.isSupported
                      ? 'cursor-pointer hover:bg-white/[0.05] active:bg-white/[0.08]'
                      : 'opacity-55'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`h-11 w-1 rounded-full ${
                        !m.isSupported
                          ? 'bg-[#636366]'
                          : isWin
                            ? 'bg-[#30D158]'
                            : 'bg-[#FF453A]'
                      }`}
                    />
                    <img
                      src={getChampionIconUrl(m.ddragonVersion, m.championName)}
                      alt={m.championName}
                      className="h-11 w-11 rounded-[12px] object-cover ring-1 ring-white/10"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[15px] font-semibold text-white">
                          {m.championName}
                        </span>
                        <span className="rounded bg-white/[0.08] px-1.5 py-0.5 text-[11px] text-[#AEAEB2]">
                          {m.position}
                        </span>
                        <span
                          className={`text-[12px] font-semibold ${
                            isWin ? 'text-[#30D158]' : 'text-[#FF453A]'
                          }`}
                        >
                          {isWin ? t.win : t.lose}
                        </span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 text-[12px] tabular-nums text-[#98989D]">
                        <span className="font-medium text-[#E5E5EA]">
                          {m.kills}/{m.deaths}/{m.assists}
                        </span>
                        <span>{m.cs} CS ({m.csPerMin}/m)</span>
                        <span>{getQueueLabel(m.queueId, lang)}</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {formatDuration(m.durationSec)}
                        </span>
                        <span>v{m.patch}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {!m.isSupported ? (
                      <span className="rounded-full bg-white/[0.07] px-2.5 py-1 text-[11px] font-medium text-[#98989D]">
                        {m.unsupportedReason === 'REMAKE' ? t.remakeLabel : t.nonSrLabel}
                      </span>
                    ) : (m.isAnalyzed || history.some((h) => h.matchId === m.matchId)) ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#30D158]/15 px-3 py-1 text-[12px] font-semibold text-[#30D158]">
                        {(m.cachedGrade || history.find((h) => h.matchId === m.matchId)?.grade)
                          ? `${m.cachedGrade || history.find((h) => h.matchId === m.matchId)?.grade} · `
                          : ''}
                        {t.analyzedBadge}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#0A84FF]/15 px-3 py-1 text-[12px] font-semibold text-[#0A84FF]">
                        {t.analyzeButton}
                        <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Personal Analyses (Saved on this device) */}
      <section className="mx-auto max-w-3xl space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-purple-400" />
            <h2 className="text-[17px] font-semibold text-white">
              {lang === 'ru' ? 'Мои сохранённые разборы' : 'My Saved Analyses'}
            </h2>
            {history.length > 0 && (
              <span className="rounded-full bg-purple-950/60 border border-purple-800/40 px-2 py-0.5 text-[11px] font-semibold text-purple-300">
                {history.length}
              </span>
            )}
          </div>
          {history.length > 0 && (
            <button
              type="button"
              onClick={() => {
                clearUserHistory();
                setHistory([]);
              }}
              className="text-[12px] font-medium text-[#98989D] hover:text-[#FF453A] transition-colors"
            >
              {lang === 'ru' ? 'Очистить историю' : 'Clear history'}
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="ios-sheet rounded-[20px] p-6 text-center text-[13.5px] text-[#98989D]">
            {lang === 'ru'
              ? 'Вы пока не сохраняли разборы на этом устройстве. Найдите свой Riot ID выше, чтобы разобрать матч.'
              : 'No saved analyses on this device yet. Search your Riot ID above to analyze a match.'}
          </div>
        ) : (
          <div className="ios-sheet overflow-hidden rounded-[22px] divide-y divide-white/[0.06]">
            {history.map((item) => (
              <Link
                key={`${item.matchId}-${item.puuid}`}
                href={`/match/${item.region}/${encodeURIComponent(item.matchId)}?puuid=${encodeURIComponent(item.puuid)}`}
                className="flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.05] active:bg-white/[0.08]"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`h-9 w-1 rounded-full ${
                      item.result === 'WIN' ? 'bg-[#30D158]' : 'bg-[#FF453A]'
                    }`}
                  />
                  <div>
                    <div className="flex items-center gap-2 text-[14px] font-semibold text-white">
                      <span>{item.championName}</span>
                      <span className="text-[12px] font-normal text-[#98989D]">{item.riotId}</span>
                      <span className="rounded bg-purple-950/60 border border-purple-800/40 px-1.5 py-0.5 text-[10px] font-bold uppercase text-purple-300">
                        {item.region.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-[12px] text-[#98989D]">
                      {item.result === 'WIN' ? t.win : t.lose} · Patch {item.patch}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {item.grade && (
                    <span className="rounded-full bg-purple-600/20 border border-purple-500/30 px-3 py-1 text-[12px] font-bold tabular-nums text-purple-200 shadow-sm">
                      Ранг {item.grade} {item.score != null ? `(${item.score > 10 ? item.score : item.score * 10}/100)` : ''}
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 text-[#636366]" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
