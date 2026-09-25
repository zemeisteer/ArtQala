'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Palette,
  Users,
  Layers,
  Percent,
  Gem,
  MessageSquare,
  Wrench,
  Users2,
  Star,
  UserCog,
  Settings,
  ArrowUpRight,
  LogOut,
  Loader2,
  Mail,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import ChangePasswordModal from './ChangePasswordModal';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, authLoading, signOut, t, lang, setLang } = useApp();

  const isLoginPage = pathname === '/admin/login';

  // 1. Guard: redirect non-admin users to /admin/login (called unconditionally)
  useEffect(() => {
    if (!isLoginPage && !authLoading) {
      if (!user || user.role !== 'ADMIN') {
        router.push('/admin/login');
      }
    }
  }, [isLoginPage, user, authLoading, router]);

  // 2. If on /admin/login, bypass the sidebar layout completely
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#1D100B] flex flex-col items-center justify-center text-[#FAF4EC]">
        <Loader2 className="w-8 h-8 animate-spin text-[#DAA932] mb-3" />
        <p className="text-xs uppercase tracking-widest text-[#B5A599]">
          Kurator kirishi tekshirilmoqda...
        </p>
      </div>
    );
  }

  // If not logged in as admin yet, prevent flashing admin layout
  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-[#1D100B] flex flex-col items-center justify-center text-[#FAF4EC]">
        <p className="text-xs text-[#B5A599]">Yo'naltirilmoqda...</p>
      </div>
    );
  }

  const navItems = [
    { href: '/admin', label: t.admin.dashboard, icon: LayoutDashboard },
    { href: '/admin/paintings', label: t.admin.paintings, icon: Palette },
    { href: '/admin/artists', label: t.admin.artists, icon: Users },
    { href: '/admin/categories', label: t.admin.categories, icon: Layers },
    { href: '/admin/discounts', label: t.admin.discounts, icon: Percent },
    { href: '/admin/accessories', label: t.admin.accessories, icon: Gem },
    { href: '/admin/inquiries', label: t.admin.inquiries, icon: MessageSquare },
    { href: '/admin/services', label: t.admin.services, icon: Wrench },
    { href: '/admin/messages', label: t.admin.messages, icon: Mail },
    { href: '/admin/customers', label: t.admin.customers, icon: Users2 },
    { href: '/admin/reviews', label: t.admin.reviews, icon: Star },
    { href: '/admin/staff', label: t.admin.staff, icon: UserCog },
    { href: '/admin/settings', label: t.admin.settings, icon: Settings },
  ];

  const getActiveTitle = () => {
    if (pathname === '/admin') return t.admin.dashboard;
    if (pathname.startsWith('/admin/paintings')) return t.admin.paintings;
    if (pathname.startsWith('/admin/artists')) return t.admin.artists;
    if (pathname.startsWith('/admin/categories')) return t.admin.categories;
    if (pathname.startsWith('/admin/discounts')) return t.admin.discounts;
    if (pathname.startsWith('/admin/accessories')) return t.admin.accessories;
    if (pathname.startsWith('/admin/inquiries')) return t.admin.inquiries;
    if (pathname.startsWith('/admin/services')) return t.admin.services;
    if (pathname.startsWith('/admin/messages')) return t.admin.messages;
    if (pathname.startsWith('/admin/customers')) return t.admin.customers;
    if (pathname.startsWith('/admin/reviews')) return t.admin.reviews;
    if (pathname.startsWith('/admin/staff')) return t.admin.staff;
    if (pathname.startsWith('/admin/settings')) return t.admin.settings;
    return 'Admin';
  };

  const handleAdminSignOut = async () => {
    await signOut();
    router.push('/admin/login');
  };

  return (
    <div className="flex min-h-screen bg-[#FAF4EC] text-[#281C18]">
      {/* Sidebar matching AdminDashboard.dc.html */}
      <aside className="w-[236px] bg-[#1D100B] text-[#D8CDC4] flex flex-col shrink-0 border-r border-[#382620]">
        {/* Admin Logo */}
        <div className="p-6 border-b border-[#382620]">
          <Link href="/admin" className="font-serif text-xl font-bold tracking-wide text-[#FAF4EC] flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Art Qala"
              width={26}
              height={26}
              className="w-6 h-6 object-contain brightness-110"
            />
            <div className="flex items-center gap-1">
              <span>Art</span>
              <span className="text-[#DAA932]">Qala</span>
              <span className="text-[10px] font-sans tracking-normal uppercase text-[#429599] ml-1 px-1.5 py-0.5 bg-[#429599]/15 rounded">
                Admin
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-6 py-2.5 text-xs font-semibold tracking-wide transition-all border-l-[3px] ${
                  isActive
                    ? 'bg-[#281C18] text-[#FAF4EC] border-[#BA4E25]'
                    : 'border-transparent text-[#B5A599] hover:bg-[#281C18]/50 hover:text-[#FAF4EC]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#BA4E25]' : 'text-[#8F7E73]'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Back to Client Site & Sign Out */}
        <div className="p-4 border-t border-[#382620] space-y-1">
          <Link
            href="/"
            className="flex items-center justify-between text-xs text-[#5AB3B7] hover:underline p-2 rounded hover:bg-[#281C18]"
          >
            <span>{t.admin.visitSite}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>

          <button
            onClick={handleAdminSignOut}
            className="w-full flex items-center justify-between text-xs text-[#B5A599] hover:text-[#E86D48] p-2 rounded hover:bg-[#281C18] transition-colors cursor-pointer"
          >
            <span>{t.admin.signOut}</span>
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 bg-[#FDFBF9] border-b border-[#E7E0D8] px-8 flex items-center justify-between shrink-0">
          <h1 className="font-serif text-2xl font-semibold text-[#281C18]">
            {getActiveTitle()}
          </h1>

          <div className="flex items-center gap-4">
            {/* Language Switcher for Admin */}
            <div className="flex items-center bg-[#FAF4EC] border border-[#E7E0D8] rounded-[3px] p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setLang('uz')}
                className={`px-2.5 py-1 rounded-[2px] transition-all cursor-pointer ${
                  lang === 'uz'
                    ? 'bg-[#BA4E25] text-white shadow-xs'
                    : 'text-[#6B5E55] hover:text-[#281C18]'
                }`}
              >
                UZ
              </button>
              <button
                type="button"
                onClick={() => setLang('ru')}
                className={`px-2.5 py-1 rounded-[2px] transition-all cursor-pointer ${
                  lang === 'ru'
                    ? 'bg-[#BA4E25] text-white shadow-xs'
                    : 'text-[#6B5E55] hover:text-[#281C18]'
                }`}
              >
                RU
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-2.5 py-1 rounded-[2px] transition-all cursor-pointer ${
                  lang === 'en'
                    ? 'bg-[#BA4E25] text-white shadow-xs'
                    : 'text-[#6B5E55] hover:text-[#281C18]'
                }`}
              >
                EN
              </button>
            </div>

            <Link
              href="/"
              className="text-xs font-medium text-[#726861] hover:text-[#BA4E25] hidden sm:inline"
            >
              {t.admin.liveSite}
            </Link>

            {/* Admin User Profile */}
            <div className="flex items-center gap-2.5 pl-4 border-l border-[#E7E0D8]">
              <div className="w-8 h-8 rounded-full bg-[#BA4E25] text-white font-serif font-bold text-xs flex items-center justify-center shadow-xs uppercase">
                {user.name.slice(0, 2)}
              </div>
              <div className="hidden sm:block leading-tight text-left">
                <div className="text-xs font-bold text-[#281C18]">{user.name}</div>
                {/* The signed-in account's email, so it's always obvious which
                    account this admin session belongs to. */}
                <div className="text-[10px] text-[#8F8178]">{user.email}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-6 sm:p-8 overflow-y-auto">{children}</main>
      </div>

      {/* Force Password Change on First Login */}
      {user?.must_change_password && <ChangePasswordModal />}
    </div>
  );
}
