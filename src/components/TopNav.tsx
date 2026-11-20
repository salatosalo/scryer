'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Star } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';
import { ScryerLogo } from '@/components/ScryerLogo';
import { getFavoriteProfile, type FavoriteProfile } from '@/lib/storage/favorite-profile';

export function TopNav() {
  const { lang, setLang, t } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const [favorite, setFavorite] = useState<FavoriteProfile | null>(null);

  useEffect(() => {
    const updateFav = () => setFavorite(getFavoriteProfile());
    updateFav();
    window.addEventListener('scryer-favorite-updated', updateFav);
    return () => window.removeEventListener('scryer-favorite-updated', updateFav);
  }, []);

  const handleOpenFavorite = () => {
    if (!favorite) return;
    router.push(`/?summoner=${encodeURIComponent(favorite.riotId)}&region=${encodeURIComponent(favorite.region)}`);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-purple-950/40 bg-[#07080E]/80 backdrop-blur-2xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-5">
          <Link
            href="/"
            className="flex items-center gap-2.5 transition-opacity active:opacity-75"
          >
            <ScryerLogo size={26} />
          </Link>

          <nav className="hidden items-center gap-1 sm:flex">
            <Link
              href="/"
              className={`rounded-full px-3 py-1.5 text-[13px] font-medium transition-all active:scale-[0.97] ${
                pathname === '/'
                  ? 'bg-purple-900/30 text-white border border-purple-500/30'
                  : 'text-[#98989D] hover:text-white'
              }`}
            >
              {t.navHome}
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          {favorite && (
            <button
              type="button"
              onClick={handleOpenFavorite}
              title={`${t.pinnedProfile}: ${favorite.riotId} (${favorite.region.toUpperCase()})`}
              className="inline-flex items-center gap-1.5 rounded-full bg-purple-900/30 px-3 py-1 text-[12px] font-medium text-purple-200 ring-1 ring-purple-500/30 transition-all hover:bg-purple-900/50 active:scale-[0.97]"
            >
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span className="max-w-[110px] truncate sm:max-w-[160px]">{favorite.riotId}</span>
              <span className="text-[10px] text-purple-300/70 font-semibold uppercase">{favorite.region}</span>
            </button>
          )}

          {/* Native iOS Segmented Control for RU / EN */}
          <div
            role="group"
            aria-label="Language"
            className="inline-flex rounded-[10px] bg-[#1C1C1E] p-[3px] ring-1 ring-white/[0.08]"
          >
            {(['ru', 'en'] as const).map((code) => {
              const active = lang === code;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLang(code)}
                  className={`min-w-[40px] rounded-[7px] px-2.5 py-1 text-[12px] font-semibold transition-all duration-150 active:scale-[0.96] ${
                    active
                      ? 'bg-[#3A3A3C] text-white shadow-sm'
                      : 'text-[#98989D] hover:text-white'
                  }`}
                >
                  {code.toUpperCase()}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
}
