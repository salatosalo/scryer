import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { LanguageProvider } from '@/lib/i18n/context';
import { TopNav } from '@/components/TopNav';
import './globals.css';

export const metadata: Metadata = {
  title: 'SCRYER',
  description: 'Поминутный тактический разбор матчей League of Legends на данных Riot Timeline.',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen antialiased selection:bg-[#0A84FF]/30 selection:text-white">
        <LanguageProvider>
          <TopNav />
          <main className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6">{children}</main>
        </LanguageProvider>
        <Analytics />
      </body>
    </html>
  );
}
