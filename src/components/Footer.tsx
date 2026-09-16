'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { parsePhones, formatWorkingHours, getAboutText, parseSocialLinks, normalizeSocialUrl, parseLocations } from '@/lib/settingsUtils';

export default function Footer() {
  const pathname = usePathname();
  const { t, lang, settings } = useApp();

  // The admin panel has its own layout — the public site footer never
  // belongs underneath it.
  if (pathname.startsWith('/admin')) return null;

  const phones = parsePhones(settings?.phone);
  const workingHoursText = formatWorkingHours(settings?.working_hours, lang);
  const aboutText = getAboutText(settings, lang, t.footer.about);
  const locations = parseLocations(settings?.locations, settings?.address, settings?.location_map);
  const socialLinks = parseSocialLinks(settings?.social_links, settings?.telegram, settings?.instagram);
  const countryText = locations[0]?.address
    ? locations[0].address.split(',').pop()?.trim() || 'Uzbekistan'
    : 'Uzbekistan';

  return (
    <footer className="bg-[#281C18] text-[#E8DFD8] pt-14 pb-8 border-t border-[#3D2C26]">
      <div className="max-w-[1240px] mx-auto px-6 sm:px-10 lg:px-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-10 border-b border-[#3D2C26]">
          {/* Brand & Mission */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="inline-block">
              {/* Original logo from /assets/logo.png preserved without modification */}
              <div className="p-1 rounded inline-block bg-[#FAF4EC]/5">
                <Image
                  src="/logo.png"
                  alt="Art Qala Gallery"
                  width={150}
                  height={52}
                  className="h-[52px] w-auto object-contain brightness-105"
                />
              </div>
            </Link>
            <p className="text-[13.5px] leading-relaxed text-[#B3A49B] max-w-sm">
              {aboutText}
            </p>
          </div>

          {/* Visit */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold tracking-[2px] text-[#429599] uppercase">
              {t.footer.visit}
            </h4>
            <div className="flex flex-col space-y-2 text-[13.5px] text-[#D8CDC5]">
              {locations.map((loc, idx) => (
                <div key={idx} className={idx > 0 ? 'pt-2 border-t border-[#3D2C26]' : ''}>
                  <span>{loc.address}</span>
                  {loc.url && (
                    <a
                      href={loc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#429599] hover:underline text-xs pt-1 flex items-center gap-1"
                    >
                      <span>{t.contact.viewOnMap} →</span>
                    </a>
                  )}
                </div>
              ))}
              <span className="text-[#A89990]">{workingHoursText}</span>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold tracking-[2px] text-[#429599] uppercase">
              {t.footer.contact}
            </h4>
            <div className="flex flex-col space-y-2 text-[13.5px] text-[#D8CDC5]">
              {phones.map((p, idx) => (
                <a
                  key={idx}
                  href={`tel:${p.replace(/[^\d+]/g, '')}`}
                  className="hover:text-[#429599] transition-colors"
                >
                  {p}
                </a>
              ))}
              {socialLinks.map((link, idx) => (
                <a
                  key={idx}
                  href={normalizeSocialUrl(link.url)}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[#429599] transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          {/* Explore */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold tracking-[2px] text-[#429599] uppercase">
              {t.footer.explore}
            </h4>
            <div className="flex flex-col space-y-2 text-[13.5px] text-[#D8CDC5]">
              <Link href="/gallery" className="hover:text-[#429599] transition-colors">
                {t.nav.gallery}
              </Link>
              <Link href="/artists" className="hover:text-[#429599] transition-colors">
                {t.nav.artists}
              </Link>
              <Link href="/services" className="hover:text-[#429599] transition-colors">
                {t.nav.services}
              </Link>
              <Link href="/contact" className="hover:text-[#429599] transition-colors">
                {t.nav.contact}
              </Link>
              <Link href="/reviews" className="hover:text-[#429599] transition-colors">
                {t.footer.reviews}
              </Link>
            </div>
          </div>
        </div>

        {/* Footer bottom */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#8A7C73]">
          <div className="flex items-center gap-3">
            <span>{t.footer.rights}</span>
            <span>·</span>
            <Link href="/privacy" className="hover:underline">{t.footer.privacy}</Link>
            <span>·</span>
            <Link href="/terms" className="hover:underline">{t.footer.terms}</Link>
          </div>
          <div className="flex items-center gap-4">
            <span>EN · RU · UZ (Lotin)</span>
            <span>•</span>
            <span>{countryText}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
