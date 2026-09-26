'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';
import { parsePhones, formatWorkingHours, parseSocialLinks, normalizeSocialUrl, parseLocations } from '@/lib/settingsUtils';
import { MapPin, Phone, MessageSquare, Clock, CheckCircle2, Send, ExternalLink } from 'lucide-react';
import Breadcrumbs from '@/components/Breadcrumbs';
import { trackLead } from '@/lib/analytics';

export default function ContactClient() {
  const { t, lang, settings } = useApp();
  const phones = parsePhones(settings?.phone);
  const workingHoursText = formatWorkingHours(settings?.working_hours, lang);
  const locations = parseLocations(settings?.locations, settings?.address, settings?.location_map);
  const primaryMapLink = locations[0]?.url || 'https://maps.app.goo.gl/FvSvu2kJ3Mqdwhzg8';
  const socialLinks = parseSocialLinks(settings?.social_links, settings?.telegram, settings?.instagram);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSubmitted(true);
        trackLead('contact_message');
        setName('');
        setEmail('');
        setSubject('');
        setMessage('');
      } else {
        setError(data.error || t.contact.genericError);
      }
    } catch {
      setError(t.contact.networkError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="py-14 sm:py-16">
      <Breadcrumbs items={[{ label: t.nav.contact }]} />
      <div className="max-w-[1240px] mx-auto px-6 sm:px-10 lg:px-14">
        {/* Page Head */}
        <div className="max-w-2xl mb-12 space-y-2">
          <span className="text-xs font-semibold tracking-[3px] text-[#429599] uppercase">
            {t.contact.eyebrow}
          </span>
          <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-[#281C18]">
            {t.contact.title}
          </h1>
          <p className="text-sm sm:text-base text-[#6E6057] leading-relaxed">
            {t.contact.subtitle}
          </p>
        </div>

        {/* 2-Column Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
          {/* Left: Contact Form */}
          <div className="lg:col-span-7 bg-[#FDFBF9] border border-[#E7E0D8] rounded-[3px] p-7 sm:p-9 shadow-xs">
            {submitted ? (
              <div className="p-8 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-[#2E7D32] mx-auto" />
                <h3 className="font-serif text-2xl font-semibold text-[#281C18]">
                  {t.contact.messageReceivedTitle}
                </h3>
                <p className="text-sm text-[#6E6057] max-w-md mx-auto">
                  {t.contact.messageSuccess}
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-4 text-xs font-bold text-[#BA4E25] hover:underline"
                >
                  {t.contact.sendAnother}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1">
                    {t.contact.formName} *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t.contact.namePlaceholder}
                    className="w-full text-sm px-3.5 py-2.5 bg-white border border-[#E7E0D8] rounded-[2px] focus:outline-none focus:border-[#BA4E25] text-[#281C18]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1">
                    {t.contact.formEmail} *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="michael@example.com"
                    className="w-full text-sm px-3.5 py-2.5 bg-white border border-[#E7E0D8] rounded-[2px] focus:outline-none focus:border-[#BA4E25] text-[#281C18]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1">
                    {t.contact.formSubject} *
                  </label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder={t.contact.subjectPlaceholder}
                    className="w-full text-sm px-3.5 py-2.5 bg-white border border-[#E7E0D8] rounded-[2px] focus:outline-none focus:border-[#BA4E25] text-[#281C18]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1">
                    {t.contact.formMessage} *
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={t.contact.messagePlaceholder}
                    className="w-full text-sm px-3.5 py-2.5 bg-white border border-[#E7E0D8] rounded-[2px] focus:outline-none focus:border-[#BA4E25] text-[#281C18] resize-none"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#BA4E25] hover:bg-[#9C3E1B] text-white font-semibold text-sm py-3 rounded-[3px] transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? (
                    <span>{t.contact.submitting}</span>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>{t.contact.formBtn}</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Right Column: Visit, Reach Directly, Map Card */}
          <div className="lg:col-span-5 space-y-6">
            {/* Visit Card */}
            <div className="bg-[#281C18] text-[#FAF4EC] rounded-[3px] p-6 space-y-4">
              <div className="flex items-center gap-2 text-[11px] font-bold tracking-[2px] text-[#5AB3B7] uppercase">
                <MapPin className="w-4 h-4" />
                <span>{t.contact.visitTitle}</span>
              </div>
              <div className="space-y-3 divide-y divide-white/10">
                {locations.map((loc, idx) => (
                  <div key={idx} className={idx > 0 ? 'pt-3 space-y-1' : 'space-y-1'}>
                    <p className="text-sm font-medium">{loc.address}</p>
                    {loc.url && (
                      <a
                        href={loc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#5AB3B7] hover:underline text-xs inline-flex items-center gap-1"
                      >
                        <span>{t.contact.viewOnMap} →</span>
                      </a>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-start gap-2 text-xs text-[#C8B9AF] pt-1 border-t border-white/10">
                <Clock className="w-3.5 h-3.5 text-[#5AB3B7] mt-0.5 shrink-0" />
                <span>{workingHoursText}</span>
              </div>
            </div>

            {/* Direct Contact Card */}
            <div className="bg-[#281C18] text-[#FAF4EC] rounded-[3px] p-6 space-y-3">
              <div className="text-[11px] font-bold tracking-[2px] text-[#5AB3B7] uppercase">
                {t.contact.directTitle}
              </div>
              <div className="space-y-2 text-sm">
                {phones.map((p, idx) => (
                  <div key={idx} className="flex items-center gap-2.5">
                    <Phone className="w-4 h-4 text-[#BA4E25] shrink-0" />
                    <a href={`tel:${p.replace(/[^\d+]/g, '')}`} className="hover:text-[#5AB3B7] transition-colors">
                      {p}
                    </a>
                  </div>
                ))}
                {socialLinks.map((link, idx) => (
                  <div key={idx} className="flex items-center gap-2.5">
                    <MessageSquare className="w-4 h-4 text-[#BA4E25] shrink-0" />
                    <a
                      href={normalizeSocialUrl(link.url)}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-[#5AB3B7] transition-colors"
                    >
                      {link.label}
                    </a>
                  </div>
                ))}
              </div>
            </div>

            {/* Interactive Map Pin Illustration (Clickable link to Google Maps) */}
            <a
              href={primaryMapLink}
              target="_blank"
              rel="noreferrer"
              className="relative aspect-[16/10] w-full rounded-[3px] overflow-hidden border border-[#E7E0D8] bg-[#F4ECE1] block group cursor-pointer"
            >
              <Image
                src="/assets/p-courtyard.svg"
                alt="Gallery location preview"
                fill
                className="object-cover brightness-95 group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-[#1D100B]/20 pointer-events-none" />

              {/* Pulsing Pin */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                <div className="relative flex items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-10 w-10 rounded-full bg-[#BA4E25] opacity-75"></span>
                  <div className="relative bg-[#BA4E25] text-white p-2.5 rounded-full shadow-lg">
                    <MapPin className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-2 bg-[#FAF4EC]/95 backdrop-blur-xs text-[#281C18] text-[10.5px] font-bold px-2.5 py-1 rounded-sm shadow-sm border border-[#E7E0D8] group-hover:bg-white transition-colors flex items-center gap-1">
                  <span>{settings?.gallery_name || 'Art Qala'}</span>
                  <ExternalLink className="w-3 h-3 text-[#BA4E25]" />
                </div>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
