'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { translations, Language } from '@/lib/i18n/translations';
import { trackEvent } from '@/lib/analytics';

export type Currency = 'USD' | 'UZS' | 'RUB' | 'EUR';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  country?: string | null;
  role: string;
  email_verified: boolean;
  must_change_password?: boolean;
}

export interface SiteSettingsData {
  id?: string;
  gallery_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  location_map?: string;
  locations?: string;
  working_hours?: string;
  telegram?: string;
  instagram?: string;
  social_links?: string;
  about_en?: string;
  about_ru?: string;
  about_uz?: string;
  rate_usd?: number;
  rate_eur?: number;
  rate_rub?: number;
  manual_rates?: boolean;
}

interface AppContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  formatPrice: (priceUSD: number) => string;
  // Units of the selected currency per 1 USD — for converting user-typed
  // amounts (e.g. the gallery's price filter) back to USD.
  currencyRate: number;
  wishlist: string[];
  toggleWishlist: (paintingId: string) => void;
  isInWishlist: (paintingId: string) => boolean;
  t: (typeof translations)['en'];
  user: UserSession | null;
  authLoading: boolean;
  refreshUser: () => Promise<void>;
  signOut: () => Promise<void>;
  settings: SiteSettingsData | null;
  refreshSettings: () => Promise<void>;
}

const DEFAULT_RATES: Record<Currency, number> = {
  USD: 1,
  UZS: 12850,
  RUB: 92.5,
  EUR: 0.92,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>('en');
  const [currency, setCurrencyState] = useState<Currency>('USD');
  const [user, setUser] = useState<UserSession | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [rates, setRates] = useState<Record<Currency, number>>(DEFAULT_RATES);
  const [settings, setSettings] = useState<SiteSettingsData | null>(null);
  const [, setMounted] = useState(false);

  const refreshSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (data && data.settings) {
          setSettings(data.settings);
        }
      }
    } catch (e) {
      console.warn('Could not fetch site settings:', e);
    }
  };

  const refreshUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  };

  const fetchRates = async () => {
    try {
      const res = await fetch('/api/rates');
      if (res.ok) {
        const data = await res.json();
        if (data.rates) {
          setRates((prev) => ({
            ...prev,
            ...data.rates,
          }));
        }
      }
    } catch (e) {
      console.warn('Could not fetch dynamic exchange rates:', e);
    }
  };

  const signOut = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
      setUser(null);
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    setMounted(true);
    refreshUser();
    fetchRates();
    refreshSettings();

    const savedLang = localStorage.getItem('artqala_lang') as Language;
    if (savedLang && ['en', 'ru', 'uz'].includes(savedLang)) {
      setLangState(savedLang);
    }

    const savedCurrency = localStorage.getItem('artqala_currency') as Currency;
    if (savedCurrency && ['USD', 'UZS', 'RUB', 'EUR'].includes(savedCurrency)) {
      setCurrencyState(savedCurrency);
    }

    try {
      const savedWishlist = JSON.parse(localStorage.getItem('artqala_wishlist') || '[]');
      if (Array.isArray(savedWishlist)) {
        setWishlist(savedWishlist);
      }
    } catch {
      // ignore
    }
  }, []);

  const setLang = (l: Language) => {
    setLangState(l);
    if (typeof window !== 'undefined') {
      localStorage.setItem('artqala_lang', l);
      // Also a cookie, so the middleware can send this visitor's plain
      // (English) page URLs to their language's /ru/... or /uz/... version.
      document.cookie = `artqala_lang=${l}; path=/; max-age=${365 * 24 * 60 * 60}; samesite=lax`;
    }
  };

  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    if (typeof window !== 'undefined') {
      localStorage.setItem('artqala_currency', c);
    }
  };

  const toggleWishlist = (id: string) => {
    trackEvent(wishlist.includes(id) ? 'remove_from_wishlist' : 'add_to_wishlist', { item_id: id });
    setWishlist((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      if (typeof window !== 'undefined') {
        localStorage.setItem('artqala_wishlist', JSON.stringify(next));
      }
      return next;
    });
  };

  const isInWishlist = (id: string) => wishlist.includes(id);

  const formatPrice = (priceUSD: number): string => {
    const rate = rates[currency] || 1;
    const converted = priceUSD * rate;

    // Converted prices are rounded *up* to a clean figure (so'm to the next
    // thousand, rubles to the next ten) — 47,323,480 so'm reads as a
    // calculation artifact, 47,324,000 so'm as a price.
    switch (currency) {
      case 'USD':
        return `$${Math.round(converted).toLocaleString()}`;
      case 'UZS':
        return `${(Math.ceil(converted / 1000) * 1000).toLocaleString('uz-UZ')} so'm`;
      case 'RUB':
        return `${(Math.ceil(converted / 10) * 10).toLocaleString('ru-RU')} ₽`;
      case 'EUR':
        return `${Math.round(converted).toLocaleString()} €`;
      default:
        return `$${priceUSD}`;
    }
  };

  const t = translations[lang] || translations.en;

  return (
    <AppContext.Provider
      value={{
        lang,
        setLang,
        currency,
        setCurrency,
        formatPrice,
        currencyRate: rates[currency] || 1,
        wishlist,
        toggleWishlist,
        isInWishlist,
        t,
        user,
        authLoading,
        refreshUser,
        signOut,
        settings,
        refreshSettings,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

// Set by the public site's app/[lang] layout: on those pages the language
// comes from the URL (/ru/..., /uz/..., or English), not from what the
// visitor last picked — that's what lets the server render each language
// version correctly. `setLang` there navigates to the other language's URL.
export interface RouteLangValue {
  lang: Language;
  setLang: (lang: Language) => void;
}
export const RouteLangContext = createContext<RouteLangValue | null>(null);

export function useApp() {
  const context = useContext(AppContext);
  const routeLang = useContext(RouteLangContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  if (routeLang) {
    return {
      ...context,
      lang: routeLang.lang,
      setLang: routeLang.setLang,
      t: translations[routeLang.lang] || translations.en,
    };
  }
  return context;
}
