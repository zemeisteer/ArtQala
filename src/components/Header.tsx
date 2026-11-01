'use client';

import React, { useState } from 'react';
import Link from '@/components/LocalizedLink';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useApp, Currency } from '@/context/AppContext';
import { Language } from '@/lib/i18n/translations';
import { splitLangPath } from '@/lib/i18n/routing';
import { Heart, Menu, X, Shield, UserCircle, ChevronDown } from 'lucide-react';
import AnimatedChorgul from '@/components/patterns/AnimatedChorgul';
import { LANGS, LANG_NAMES } from '@/lib/i18n/routing';
import FilterSelect from '@/components/FilterSelect';

const CURRENCY_OPTIONS = [
  { value: 'USD', label: '$ USD' },
  { value: 'UZS', label: "so'm UZS" },
  { value: 'RUB', label: '₽ RUB' },
  { value: 'KRW', label: '₩ KRW' },
  { value: 'JPY', label: '¥ JPY' },
  { value: 'CNY', label: '元 CNY' },
  { value: 'EUR', label: '€ EUR' },
];

// Every site language under its own name (the picker no longer fits as pills).
const LANG_OPTIONS = LANGS.map((l) => ({ value: l, label: LANG_NAMES[l] }));

export default function Header() {
  const pathname = usePathname();
  const { lang, setLang, currency, setCurrency, wishlist, t, user } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // The admin panel has its own sidebar/topbar (including its own language
  // switcher) — rendering the public site's header on top of it was the
  // second, redundant "EN RU UZ" switcher, and it only translated its own
  // nav labels, not the admin content underneath it.
  if (pathname.startsWith('/admin')) return null;

  // Compare without the /ru or /uz prefix, so "Gallery" is highlighted on
  // /ru/gallery too.
  const currentPath = splitLangPath(pathname).path;
  const isActive = (path: string) => {
    if (path === '/' && currentPath === '/') return true;
    if (path !== '/' && currentPath.startsWith(path)) return true;
    return false;
  };

  // Every public section is in the menu. On desktop the first ones sit in
  // the bar and the rest open from "More" — all of them in one row pushed
  // the logo out of the header. The phone menu lists them all.
  const mainItems = [
    { href: '/', label: t.nav.home },
    { href: '/gallery', label: t.nav.gallery },
    { href: '/artists', label: t.nav.artists },
    { href: '/services', label: t.nav.services },
    { href: '/experiences', label: t.workshops.navLabel },
    { href: '/contact', label: t.nav.contact },
  ];
  const moreItems = [
    { href: '/delivery', label: t.nav.delivery },
    { href: '/reviews', label: t.nav.reviews },
    { href: '/gift-card', label: t.gift.navLabel },
    { href: '/stories', label: t.stories.navLabel },
  ];
  const navItems = [...mainItems, ...moreItems];
  const moreActive = moreItems.some((item) => isActive(item.href));

  return (
    <header className="sticky top-0 z-50 bg-[#FAF4EC]/95 backdrop-blur-md border-b border-[#E7E0D8] transition-all">
      <div className="max-w-[1240px] mx-auto px-6 sm:px-10 lg:px-14 h-[76px] flex items-center justify-between gap-6">
        {/* Brand with Original Logo */}
        <Link href="/" className="shrink-0 flex items-center gap-3 group text-decoration-none">
          {/* /logo-full.png: the owner-approved copy of the logo (Q completed,
              white made transparent). /assets/logo.png itself stays untouched. */}
          <div className="relative">
            <Image
              src="/logo-full.png"
              alt="Art Qala Gallery"
              width={54}
              height={46}
              priority
              className="brand-mark h-[46px] w-auto object-contain transition-transform duration-500 group-hover:scale-105 group-hover:-rotate-1"
            />
          </div>
          {/* Only while the menu is folded into the button — next to the full
              menu it squeezed the logo itself out of the header. */}
          <div className="hidden sm:flex xl:hidden flex-col leading-none">
            <span className="text-[9.5px] tracking-[3px] text-[#BA4E25] font-semibold mt-1 whitespace-nowrap">
              {t.nav.tagline}
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        {/* The full nav needs ~1150px (more with the longer Uzbek labels) —
            below xl it used to wrap "Sign In" and the tagline onto several
            lines on tablets/small laptops, so those get the menu button. */}
        <nav className="hidden xl:flex items-center gap-5 2xl:gap-7">
          {mainItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                className={`nav-link whitespace-nowrap ${active ? 'active text-[#BA4E25]' : 'text-[#3E332E]'}`}
              >
                {item.label}
              </Link>
            );
          })}

          {/* The other sections — opens on hover, on tap and on keyboard focus. */}
          <div className="relative group">
            <button
              type="button"
              aria-haspopup="true"
              className={`nav-link whitespace-nowrap flex items-center gap-1 ${moreActive ? 'active text-[#BA4E25]' : 'text-[#3E332E]'}`}
            >
              {t.nav.more}
              <ChevronDown className="w-3.5 h-3.5 transition-transform group-hover:rotate-180 group-focus-within:rotate-180" />
            </button>
            <div className="invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 transition-opacity absolute left-1/2 -translate-x-1/2 top-full pt-3 z-50">
              <div className="min-w-[200px] bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] shadow-lg py-2">
                {moreItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={true}
                    className={`block px-4 py-2 text-sm whitespace-nowrap hover:bg-[#FAF4EC] hover:text-[#BA4E25] transition-colors ${
                      isActive(item.href) ? 'text-[#BA4E25] font-semibold' : 'text-[#3E332E]'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Wishlist Link */}
          <Link
            href="/gallery?wishlist=true"
            className="relative p-1.5 text-[#3E332E] hover:text-[#BA4E25] transition-colors"
            title={t.nav.wishlist}
          >
            <Heart className="w-5 h-5" />
            {wishlist.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#BA4E25] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {wishlist.length}
              </span>
            )}
          </Link>

          {/* User Account / Sign In */}
          {user ? (
            <div className="flex items-center gap-2">
              {user.role === 'ADMIN' && (
                <Link
                  href="/admin"
                  className="whitespace-nowrap text-[10px] font-bold px-2 py-1 rounded-[3px] bg-[#281C18] hover:bg-[#BA4E25] text-[#DAA932] hover:text-white transition-all uppercase tracking-wider border border-[#DAA932]/40"
                  title={t.nav.admin}
                >
                  {t.nav.admin}
                </Link>
              )}
              <Link
                href="/account"
                className="text-xs font-semibold px-2.5 py-1 rounded-full border border-[#BA4E25] text-[#BA4E25] hover:bg-[#BA4E25] hover:text-white transition-all flex items-center gap-1.5"
              >
                <span className="w-4 h-4 rounded-full bg-[#BA4E25] text-white text-[9px] flex items-center justify-center font-bold">
                  {user.name.slice(0, 1).toUpperCase()}
                </span>
                <span>{user.name.split(' ')[0]}</span>
              </Link>
            </div>
          ) : (
            <Link
              href="/signin"
              className="text-xs font-semibold text-[#554740] hover:text-[#BA4E25] transition-colors"
            >
              {t.nav.signIn}
            </Link>
          )}

          {/* Language and Currency Switchers */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-[#E7E0D8]">
            <FilterSelect
              value={lang}
              onChange={(v) => setLang(v as Language)}
              options={LANG_OPTIONS}
              ariaLabel="Language"
              className="w-[112px]"
              buttonClassName="!rounded-full !py-1 !px-2.5 !text-[11px] !font-semibold !border-[#E7E0D8] hover:!border-[#BA4E25] hover:!text-[#BA4E25]"
            />

            <FilterSelect
              value={currency}
              onChange={(v) => setCurrency(v as Currency)}
              options={CURRENCY_OPTIONS}
              ariaLabel="Currency"
              className="w-[84px] ml-1"
              buttonClassName="!rounded-full !py-1 !px-2.5 !text-[11px] !font-semibold !border-[#E7E0D8] hover:!border-[#429599] hover:!text-[#347578]"
            />
            <span className="hidden 2xl:inline-flex">
              <AnimatedChorgul />
            </span>
          </div>
        </nav>

        {/* Mobile menu trigger */}
        <div className="flex items-center gap-3 xl:hidden">
          <Link
            href="/gallery?wishlist=true"
            className="relative p-1.5 text-[#3E332E]"
            aria-label="Wishlist"
          >
            <Heart className="w-5 h-5 text-[#BA4E25]" />
            {wishlist.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#BA4E25] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {wishlist.length}
              </span>
            )}
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-[#281C18] focus:outline-none"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-[#FAF4EC] border-b border-[#E7E0D8] px-6 py-6 space-y-4 shadow-lg">
          <div className="flex flex-col space-y-3">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                onClick={() => setMobileMenuOpen(false)}
                className={`text-base font-medium py-1 transition-colors ${
                  isActive(item.href) ? 'text-[#BA4E25] font-semibold' : 'text-[#3E332E]'
                }`}
              >
                {item.label}
              </Link>
            ))}
            {user && user.role === 'ADMIN' && (
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="text-base font-semibold text-[#347578] flex items-center gap-2 pt-2 border-t border-[#E7E0D8]"
              >
                <Shield className="w-4 h-4" />
                {t.nav.admin}
              </Link>
            )}

            {/* Account / Sign In (mirrors desktop nav) */}
            {user ? (
              <Link
                href="/account"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 text-base font-semibold text-[#BA4E25] pt-3 border-t border-[#E7E0D8]"
              >
                <span className="w-5 h-5 rounded-full bg-[#BA4E25] text-white text-[10px] flex items-center justify-center font-bold shrink-0">
                  {user.name.slice(0, 1).toUpperCase()}
                </span>
                <span>{user.name.split(' ')[0]}</span>
              </Link>
            ) : (
              <Link
                href="/signin"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 text-base font-semibold text-[#BA4E25] pt-3 border-t border-[#E7E0D8]"
              >
                <UserCircle className="w-5 h-5" />
                {t.nav.signIn}
              </Link>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[#E7E0D8]">
            <FilterSelect
              value={lang}
              onChange={(v) => setLang(v as Language)}
              options={LANG_OPTIONS}
              ariaLabel="Language"
              className="w-[140px]"
              buttonClassName="!rounded-full !py-1.5 !px-3 !text-xs !font-semibold"
            />

            <FilterSelect
              value={currency}
              onChange={(v) => setCurrency(v as Currency)}
              options={CURRENCY_OPTIONS}
              ariaLabel="Currency"
              className="w-[88px]"
              buttonClassName="!rounded-full !py-1 !px-2.5 !text-xs !font-semibold !border-[#E7E0D8]"
            />
          </div>
        </div>
      )}
    </header>
  );
}
