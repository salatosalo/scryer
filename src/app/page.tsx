'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  ChevronRight,
  Clock,
  Database,
  Search,
  Sparkles,
  Star,
  X,
} from 'lucide-react';
import type { MatchListItemDto } from '@/app/api/summoner/route';
import { useLanguage } from '@/lib/i18n/context';
import { getChampionIconUrl } from '@/lib/riot/assets';
import { getQueueLabel, REGION_LIST, type RegionCode } from '@/lib/riot/regions';
import {
  addRecentSearch,
  clearRecentSearches,
  getFavoriteProfile,
  getRecentSearches,
  removeFavoriteProfile,
  saveFavoriteProfile,
  type FavoriteProfile,
  type RecentSearchItem,
} from '@/lib/storage/favorite-profile';
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

function HomePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [favorite, setFavorite] = useState<FavoriteProfile | null>(null);
  const [recentSearches, setRecentSearches] = useState<RecentSearchItem[]>([]);

  useEffect(() => {
    fetch('/api/config-status')
      .then((r) => r.json())
      .then((d: ConfigStatus) => setConfig(d))
      .catch(() => {});

    setHistory(getUserHistory());
    setFavorite(getFavoriteProfile());
    setRecentSearches(getRecentSearches());

    const onFavUpdate = () => {
      setFavorite(getFavoriteProfile());
      setRecentSearches(getRecentSearches());
    };
    window.addEventListener('scryer-favorite-updated', onFavUpdate);
    return () => window.removeEventListener('scryer-favorite-updated', onFavUpdate);
  }, []);

  // Handle URL query parameters (e.g. from top nav favorite click)
  useEffect(() => {
    const qSummoner = searchParams.get('summoner');
    const qRegion = searchParams.get('region') as RegionCode | null;
    if (qSummoner) {
      setRiotIdInput(qSummoner);
      const reg = qRegion && REGION_LIST.some((r) => r.code === qRegion) ? qRegion : 'euw';
      setRegion(reg);
      performSearch(qSummoner, reg);
    }
  }, [searchParams]);

  async function performSearch(rawInput: string, selectedRegion: RegionCode) {
    setErrorCode(null);
    setErrorMsg(null);

    const trimmed = rawInput.trim();
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
      const qs = new URLSearchParams({ gameName, tagLine, region: selectedRegion });
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
      addRecentSearch(trimmed, selectedRegion);
      setRecentSearches(getRecentSearches());
    } catch {
      setErrorCode('NETWORK');
      setErrorMsg('Network error');
    } finally {
      setSearching(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    performSearch(riotIdInput, region);
  }

  function handleQuickSearch(targetRiotId: string, targetRegion: RegionCode) {
    setRiotIdInput(targetRiotId);
    setRegion(targetRegion);
    performSearch(targetRiotId, targetRegion);
  }

  function handleToggleFavorite() {
    if (!account) return;
    const isCurrentlyFav =
      favorite &&
      favorite.riotId.toLowerCase() === account.riotId.toLowerCase() &&
      favorite.region.toLowerCase() === account.region.toLowerCase();

    if (isCurrentlyFav) {
      removeFavoriteProfile();
      setFavorite(null);
    } else {
      const newFav: FavoriteProfile = {
        puuid: account.puuid,
        riotId: account.riotId,
        region: account.region,
        savedAt: Date.now(),
      };
      saveFavoriteProfile(newFav);
      setFavorite(newFav);
    }
  }

  const isAccountFavorite =
    Boolean(
      account &&
        favorite &&
        favorite.riotId.toLowerCase() === account.riotId.toLowerCase() &&
        favorite.region.toLowerCase() === account.region.toLowerCase()
    );

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

          {/* Quick Access: Favorite Profile & Recent Searches */}
          {(favorite || recentSearches.length > 0) && (
            <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-3 text-[12px]">
              {favorite && (
                <button
                  type="button"
                  onClick={() => handleQuickSearch(favorite.riotId, favorite.region as RegionCode)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-yellow-500/15 px-3 py-1 font-semibold text-yellow-300 ring-1 ring-yellow-500/30 transition-all hover:bg-yellow-500/25 active:scale-95"
                >
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span>{favorite.riotId}</span>
                  <span className="text-[10px] text-yellow-400/70 uppercase">({favorite.region})</span>
                </button>
              )}

              {recentSearches.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[#8E8E93] text-[11px] mr-0.5">{t.recentSearches}:</span>
                  {recentSearches.map((s, idx) => (
                    <button
                      key={`${s.riotId}-${idx}`}
                      type="button"
                      onClick={() => handleQuickSearch(s.riotId, s.region as RegionCode)}
                      className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[11.5px] text-[#C7C7CC] ring-1 ring-white/[0.08] transition-all hover:bg-white/[0.12] hover:text-white active:scale-95"
                    >
                      {s.riotId} <span className="text-[10px] text-[#8E8E93] uppercase">({s.region})</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      clearRecentSearches();
                      setRecentSearches([]);
                    }}
                    title={t.clearRecentSearches}
                    className="text-[11px] text-[#8E8E93] hover:text-white px-1 underline"
                  >
                    {t.clearRecentSearches}
                  </button>
                </div>
              )}
            </div>
          )}
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
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2.5">
              <h2 className="text-[17px] font-semibold text-white">
                {t.recentMatchesTitle} — {account.riotId}
              </h2>
              <button
                type="button"
                onClick={handleToggleFavorite}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold transition-all ${
                  isAccountFavorite
                    ? 'bg-yellow-500/20 text-yellow-300 ring-1 ring-yellow-500/40 hover:bg-yellow-500/30'
                    : 'bg-white/[0.08] text-[#D1D1D6] ring-1 ring-white/10 hover:bg-white/[0.14]'
                }`}
              >
                <Star
                  className={`h-3 w-3 ${
                    isAccountFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-white/60'
                  }`}
                />
                {isAccountFavorite ? t.pinnedProfile : t.pinAsFavorite}
              </button>
            </div>
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
                        <span>{m.cs} CS</span>
                        <span>{formatDuration(m.durationSec)}</span>
                        <span>{getQueueLabel(m.queueId, lang)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {m.isSupported ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.08] px-3 py-1 text-[12px] font-semibold text-white transition-all hover:bg-[#0A84FF] active:scale-[0.96]">
                        {t.analyzeButton}
                        <ChevronRight className="h-3.5 w-3.5 text-[#98989D]" />
                      </span>
                    ) : (
                      <span className="rounded-full bg-white/[0.05] px-2.5 py-0.5 text-[11px] text-[#636366]">
                        {lang === 'ru' ? 'Не поддерживается' : 'Unsupported'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Demo Match Banner */}
      <section className="mx-auto max-w-3xl">
        <div className="ios-sheet flex flex-col items-start justify-between gap-4 rounded-[22px] p-5 sm:flex-row sm:items-center">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-purple-300 ring-1 ring-purple-500/30">
              <Sparkles className="h-3 w-3" />
              {t.demoLabel}
            </div>
            <h3 className="text-[16px] font-semibold text-white">{t.demoBannerTitle}</h3>
            <p className="text-[13px] text-[#98989D]">{t.demoBannerSubtitle}</p>
          </div>
          <Link
            href="/match/euw/DEMO-MATCH-001?puuid=DEMO_PUUID"
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-[12px] bg-gradient-to-r from-purple-600 to-rose-700 px-5 text-[13px] font-semibold text-white shadow-lg transition-all hover:opacity-90 active:scale-[0.97]"
          >
            {t.openDemoButton}
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Local Cached History */}
      {history.length > 0 && (
        <section className="mx-auto max-w-3xl space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-[#98989D]" />
              <h2 className="text-[17px] font-semibold text-white">{t.savedHistoryTitle}</h2>
            </div>
            <button
              type="button"
              onClick={() => {
                clearUserHistory();
                setHistory([]);
              }}
              className="text-[12px] text-[#8E8E93] hover:text-[#FF453A]"
            >
              {t.clearHistory}
            </button>
          </div>

          <div className="ios-sheet divide-y divide-white/[0.06] overflow-hidden rounded-[22px]">
            {history.map((h) => {
              const isWin = h.result === 'WIN';
              return (
                <Link
                  key={`${h.matchId}-${h.puuid}`}
                  href={`/match/${h.region}/${encodeURIComponent(h.matchId)}?puuid=${encodeURIComponent(h.puuid)}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-white/[0.05] active:bg-white/[0.08]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <img
                      src={getChampionIconUrl(h.patch, h.championName)}
                      alt={h.championName}
                      className="h-10 w-10 rounded-[12px] object-cover ring-1 ring-white/10"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-semibold text-white">
                          {h.championName}
                        </span>
                        <span
                          className={`text-[11px] font-semibold ${
                            isWin ? 'text-[#30D158]' : 'text-[#FF453A]'
                          }`}
                        >
                          {isWin ? t.win : t.lose}
                        </span>
                        {h.grade && (
                          <span className="rounded bg-purple-500/20 px-1.5 py-0.2 text-[11px] font-bold text-purple-300">
                            {h.grade}
                          </span>
                        )}
                      </div>
                      <div className="text-[12px] text-[#98989D]">
                        {h.riotId} · {h.region.toUpperCase()} · Patch {h.patch}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-[12px] text-[#8E8E93]">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(h.analyzedAt).toLocaleDateString()}</span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-[50vh]" />}>
      <HomePageContent />
    </Suspense>
  );
}
