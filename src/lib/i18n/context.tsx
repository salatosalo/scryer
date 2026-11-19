'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { en } from './en';
import { ru } from './ru';
import type { Dictionary, SupportedLang } from './types';

interface LanguageContextValue {
  lang: SupportedLang;
  setLang: (next: SupportedLang) => void;
  t: Dictionary;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'ru',
  setLang: () => {},
  t: ru,
});

const STORAGE_KEY = 'scryer_lang';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<SupportedLang>('ru');

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === 'ru' || saved === 'en') {
        setLangState(saved);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const setLang = (next: SupportedLang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  };

  const t = lang === 'ru' ? ru : en;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}
