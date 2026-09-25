'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Settings, Save, CheckCircle2, Loader2, Globe, MapPin, Phone, Mail, Clock, Send, Plus, Trash2, AlertCircle, Languages, MessageSquare } from 'lucide-react';
import TimePicker from '@/components/TimePicker';
import { parseSocialLinks, SocialLink, parseLocations, GalleryLocation } from '@/lib/settingsUtils';

export default function AdminSettingsPage() {
  const { refreshSettings } = useApp();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Fields
  const [galleryName, setGalleryName] = useState('Art Qala');
  const [phones, setPhones] = useState<string[]>(['+998 66 233 44 55']);
  const [email, setEmail] = useState('');

  // Physical gallery addresses — an open-ended list (like phones/social
  // links) instead of a single fixed address/map pair.
  const [locations, setLocations] = useState<GalleryLocation[]>([
    { address: 'Barakhon Madrasah, Tashkent, Uzbekistan', url: 'https://maps.app.goo.gl/FvSvu2kJ3Mqdwhzg8' },
  ]);

  // Weekly working hours schedule
  interface DaySchedule {
    dayKey: string;
    dayLabelUz: string;
    dayLabelRu: string;
    dayLabelEn: string;
    open: string;
    close: string;
    isDayOff: boolean;
  }

  const defaultSchedule: DaySchedule[] = [
    { dayKey: 'mon', dayLabelUz: 'Dushanba', dayLabelRu: 'Понедельник', dayLabelEn: 'Monday', open: '09:00', close: '19:00', isDayOff: false },
    { dayKey: 'tue', dayLabelUz: 'Seshanba', dayLabelRu: 'Вторник', dayLabelEn: 'Tuesday', open: '09:00', close: '19:00', isDayOff: false },
    { dayKey: 'wed', dayLabelUz: 'Chorshanba', dayLabelRu: 'Среда', dayLabelEn: 'Wednesday', open: '09:00', close: '19:00', isDayOff: false },
    { dayKey: 'thu', dayLabelUz: 'Payshanba', dayLabelRu: 'Четверг', dayLabelEn: 'Thursday', open: '09:00', close: '19:00', isDayOff: false },
    { dayKey: 'fri', dayLabelUz: 'Juma', dayLabelRu: 'Пятница', dayLabelEn: 'Friday', open: '09:00', close: '19:00', isDayOff: false },
    { dayKey: 'sat', dayLabelUz: 'Shanba', dayLabelRu: 'Суббота', dayLabelEn: 'Saturday', open: '09:00', close: '19:00', isDayOff: false },
    { dayKey: 'sun', dayLabelUz: 'Yakshanba', dayLabelRu: 'Воскресенье', dayLabelEn: 'Sunday', open: '09:00', close: '19:00', isDayOff: false },
  ];

  const [schedule, setSchedule] = useState<DaySchedule[]>(defaultSchedule);

  // Social/messenger links (Telegram, Instagram, WhatsApp, ...) — an
  // open-ended list instead of two fixed fields.
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([
    { label: 'Telegram', url: 'https://t.me/artqala' },
    { label: 'Instagram', url: 'https://instagram.com/artqala' },
  ]);

  // About texts — only Uzbek is entered by hand; EN/RU are auto-translated
  // on blur (same pattern as Paintings/Categories/Artists/Accessories).
  const [aboutUz, setAboutUz] = useState('');
  const [aboutEn, setAboutEn] = useState('');
  const [aboutRu, setAboutRu] = useState('');
  const [translatingAbout, setTranslatingAbout] = useState(false);

  // Currency
  const [manualRates, setManualRates] = useState(false);
  const [rateUsd, setRateUsd] = useState('12850');
  const [rateEur, setRateEur] = useState('13900');
  const [rateRub, setRateRub] = useState('140');

  // Uzbekistan phone validator (+998 XX XXX XX XX)
  const isValidUzPhone = (num: string): boolean => {
    if (!num) return false;
    const cleaned = num.replace(/[^\d+]/g, '');
    // Must start with +998 or 998, followed by valid 9 digits
    const digits = cleaned.startsWith('+') ? cleaned.slice(1) : cleaned;
    return /^998\d{9}$/.test(digits);
  };

  const handlePhoneChange = (idx: number, val: string) => {
    const updated = [...phones];
    updated[idx] = val;
    setPhones(updated);
  };

  const handleAddPhone = () => {
    setPhones([...phones, '+998 ']);
  };

  const handleRemovePhone = (idx: number) => {
    if (phones.length <= 1) return;
    setPhones(phones.filter((_, i) => i !== idx));
  };

  const handleScheduleChange = (idx: number, field: keyof DaySchedule, value: any) => {
    const updated = [...schedule];
    updated[idx] = { ...updated[idx], [field]: value };
    setSchedule(updated);
  };

  const applyMonToAll = () => {
    const mon = schedule[0];
    const updated = schedule.map((day, idx) => {
      if (idx === 6) return day; // keep Sunday as is or copy
      return { ...day, open: mon.open, close: mon.close, isDayOff: mon.isDayOff };
    });
    setSchedule(updated);
  };

  const handleLocationChange = (idx: number, field: keyof GalleryLocation, value: string) => {
    const updated = [...locations];
    updated[idx] = { ...updated[idx], [field]: value };
    setLocations(updated);
  };

  const handleAddLocation = () => {
    setLocations([...locations, { address: '', url: '' }]);
  };

  const handleRemoveLocation = (idx: number) => {
    if (locations.length <= 1) return;
    setLocations(locations.filter((_, i) => i !== idx));
  };

  const handleSocialLinkChange = (idx: number, field: keyof SocialLink, value: string) => {
    const updated = [...socialLinks];
    updated[idx] = { ...updated[idx], [field]: value };
    setSocialLinks(updated);
  };

  const handleAddSocialLink = () => {
    setSocialLinks([...socialLinks, { label: '', url: '' }]);
  };

  const handleRemoveSocialLink = (idx: number) => {
    setSocialLinks(socialLinks.filter((_, i) => i !== idx));
  };

  // Typing the Uzbek "about us" text and blurring auto-fills EN/RU via
  // Gemini — same pattern as the Paintings/Categories/Artists forms.
  const autoTranslateAbout = async (text: string) => {
    if (!text.trim()) return;
    setTranslatingAbout(true);
    try {
      const res = await fetch('/api/admin/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, sourceLang: 'uz' }),
      });
      const data = await res.json();
      if (data.success && data.translations) {
        setAboutEn(data.translations.en || '');
        setAboutRu(data.translations.ru || '');
      }
    } catch {
      // Silent failure — auto-translation is a convenience, not required to save.
    } finally {
      setTranslatingAbout(false);
    }
  };

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.settings) {
          const s = data.settings;
          setGalleryName(s.gallery_name || 'Art Qala');

          // Parse multiple phones
          if (s.phone) {
            try {
              const parsed = JSON.parse(s.phone);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setPhones(parsed);
              } else {
                setPhones(s.phone.split(',').map((p: string) => p.trim()).filter(Boolean));
              }
            } catch {
              const parts = s.phone.split(',').map((p: string) => p.trim()).filter(Boolean);
              setPhones(parts.length > 0 ? parts : ['+998 66 233 44 55']);
            }
          }

          setEmail(s.email || '');
          setLocations(
            parseLocations(s.locations, s.address, s.location_map).map((l) => ({ ...l }))
          );

          // Parse schedule
          if (s.working_hours) {
            try {
              const parsed = JSON.parse(s.working_hours);
              if (Array.isArray(parsed) && parsed.length === 7) {
                setSchedule(parsed);
              }
            } catch {
              // Leave default schedule
            }
          }

          setSocialLinks(parseSocialLinks(s.social_links, s.telegram, s.instagram));
          setAboutUz(s.about_uz || '');
          setAboutEn(s.about_en || '');
          setAboutRu(s.about_ru || '');
          setManualRates(Boolean(s.manual_rates));
          setRateUsd(String(s.rate_usd || 12850));
          setRateEur(String(s.rate_eur || 13900));
          setRateRub(String(s.rate_rub || 140));
        }
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check phone validation
    const invalidPhone = phones.find((p) => !isValidUzPhone(p));
    if (invalidPhone) {
      setError(`"${invalidPhone}" telefon raqami O'zbekiston formatiga (+998 XX XXX XX XX) mos emas.`);
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gallery_name: galleryName,
          phone: JSON.stringify(phones),
          email,
          locations: JSON.stringify(locations.filter((l) => l.address.trim())),
          working_hours: JSON.stringify(schedule),
          social_links: JSON.stringify(socialLinks.filter((l) => l.label.trim() && l.url.trim())),
          about_uz: aboutUz,
          about_en: aboutEn,
          about_ru: aboutRu,
          manual_rates: manualRates,
          rate_usd: rateUsd,
          rate_eur: rateEur,
          rate_rub: rateRub,
        }),
      });

      if (res.ok) {
        setSaved(true);
        await refreshSettings();
        setTimeout(() => setSaved(false), 3000);
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error || 'Sozlamalarni saqlashda xatolik yuz berdi.');
      }
    } catch {
      setError('Serverga bog\'lanishda xatolik.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-[#8F7E73]">
        <Loader2 className="w-6 h-6 animate-spin mr-2 text-[#BA4E25]" />
        <span className="text-xs">Sozlamalar yuklanmoqda...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-3xl font-semibold text-[#281C18]">
            Galereya Sozlamalari
          </h2>
          <p className="text-xs text-[#726861] mt-0.5">
            Aloqa ma'lumotlari, valyuta kurslari va "Biz haqimizda" matni
          </p>
        </div>

        {saved && (
          <div className="px-4 py-2 bg-[#E8F5E9] border border-[#A5D6A7] rounded text-xs text-[#1B5E20] flex items-center gap-1.5 shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-[#2E7D32]" />
            <span>Muvaffaqiyatli saqlandi!</span>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. Galereya Asosiy Ma'lumotlari */}
        <div className="bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] p-6 space-y-4 shadow-xs">
          <h3 className="font-serif text-lg font-semibold text-[#281C18] border-b pb-2 border-[#E7E0D8] flex items-center gap-2">
            <Settings className="w-4 h-4 text-[#BA4E25]" />
            <span>Asosiy va Aloqa Ma'lumotlari</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1">
                GALEREYA NOMI
              </label>
              <input
                type="text"
                required
                value={galleryName}
                onChange={(e) => setGalleryName(e.target.value)}
                className="w-full text-xs px-3.5 py-2 bg-white border border-[#E7E0D8] rounded-[3px] focus:outline-none focus:border-[#BA4E25]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1">
                EMAIL MANZILI
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs px-3.5 py-2 bg-white border border-[#E7E0D8] rounded-[3px] focus:outline-none focus:border-[#BA4E25]"
              />
            </div>

            {/* Dinamik Telefon Raqamlari (Multiple Phones) */}
            <div className="md:col-span-2 space-y-2 bg-[#FAF4EC]/50 p-3.5 rounded border border-[#E7E0D8]">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase">
                  TELEFON RAQAMLARI (+998 XX XXX XX XX)
                </label>
                <button
                  type="button"
                  onClick={handleAddPhone}
                  className="text-xs font-semibold text-[#BA4E25] hover:text-[#9C3E1B] flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Yana raqam qo'shish</span>
                </button>
              </div>

              <div className="space-y-2">
                {phones.map((p, idx) => {
                  const valid = isValidUzPhone(p);
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            required
                            value={p}
                            onChange={(e) => handlePhoneChange(idx, e.target.value)}
                            placeholder="+998 90 123 45 67"
                            className={`w-full text-xs px-3.5 py-2 bg-white border rounded-[3px] focus:outline-none ${
                              valid
                                ? 'border-[#E7E0D8] focus:border-[#BA4E25]'
                                : 'border-red-300 focus:border-red-500'
                            }`}
                          />
                          {valid && (
                            <span className="absolute right-3 top-2.5 text-[#2E7D32] text-xs flex items-center gap-1 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>

                        {phones.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemovePhone(idx)}
                            className="p-2 text-[#8F7E73] hover:text-red-600 hover:bg-white rounded transition-colors cursor-pointer"
                            title="Raqamni o'chirish"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {!valid && p.trim() !== '' && (
                        <p className="text-[11px] text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          <span>O'zbekiston raqam formatiga mos kelmadi (+998 XX XXX XX XX). Misol: +998 90 123 45 67</span>
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Haftalik Ish Vaqti (Structured Time Pickers) */}
            <div className="md:col-span-2 space-y-3 bg-[#FAF4EC]/50 p-3.5 rounded border border-[#E7E0D8]">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase">
                    ISH VAQTI VA DAM OLISH KUNLARI (HAFTALIK REJA)
                  </label>
                  <span className="text-[10.5px] text-[#8F7E73]">
                    Har bir kun uchun vaqt tanlagich yoki dam olish kuni belgisi
                  </span>
                </div>
                <button
                  type="button"
                  onClick={applyMonToAll}
                  className="text-xs font-semibold text-[#429599] hover:underline cursor-pointer"
                >
                  Dushanba vaqtini boshqa kunlarga nusxalash
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2 pt-1">
                {schedule.map((day, idx) => (
                  <div
                    key={day.dayKey}
                    className={`p-2.5 rounded-[3px] border transition-all ${
                      day.isDayOff
                        ? 'bg-[#F5EFEB] border-[#D9CECE] opacity-80'
                        : 'bg-white border-[#E7E0D8]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-[#F0EAE1]">
                      <span className="text-xs font-bold text-[#281C18]">
                        {day.dayLabelUz}
                      </span>
                    </div>

                    <label className="flex items-center gap-1.5 cursor-pointer text-[10.5px] font-semibold text-[#8F7E73] mb-2">
                      <input
                        type="checkbox"
                        checked={day.isDayOff}
                        onChange={(e) =>
                          handleScheduleChange(idx, 'isDayOff', e.target.checked)
                        }
                        className="w-3.5 h-3.5 accent-[#BA4E25]"
                      />
                      <span>Dam olish kuni</span>
                    </label>

                    {!day.isDayOff ? (
                      <div className="space-y-1.5">
                        <div>
                          <span className="text-[9.5px] uppercase font-bold text-[#8F8178] block">
                            Ochilish
                          </span>
                          <TimePicker
                            value={day.open}
                            onChange={(v) => handleScheduleChange(idx, 'open', v)}
                            buttonClassName="!px-1.5 !py-1 !bg-[#FAF4EC]/60"
                          />
                        </div>
                        <div>
                          <span className="text-[9.5px] uppercase font-bold text-[#8F8178] block">
                            Yopilish
                          </span>
                          <TimePicker
                            value={day.close}
                            onChange={(v) => handleScheduleChange(idx, 'close', v)}
                            buttonClassName="!px-1.5 !py-1 !bg-[#FAF4EC]/60"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="py-4 text-center">
                        <span className="text-[10.5px] font-bold text-[#BA4E25] bg-[#BA4E25]/10 px-2 py-1 rounded">
                          Dam olish
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Manzillar (bir nechta joylashuv, har biri o'z xarita havolasi bilan) */}
            <div className="md:col-span-2 space-y-2 bg-[#FAF4EC]/50 p-3.5 rounded border border-[#E7E0D8]">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase">
                  MANZILLAR (GALEREYA / FILIALLAR)
                </label>
                <button
                  type="button"
                  onClick={handleAddLocation}
                  className="text-xs font-semibold text-[#BA4E25] hover:text-[#9C3E1B] flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Yana manzil qo'shish</span>
                </button>
              </div>

              <div className="space-y-2">
                {locations.map((loc, idx) => (
                  <div key={idx} className="flex items-start gap-2 bg-white p-2.5 rounded border border-[#E7E0D8]">
                    <MapPin className="w-4 h-4 text-[#8F7E73] shrink-0 mt-2" />
                    <div className="flex-1 space-y-1.5">
                      <input
                        type="text"
                        value={loc.address}
                        onChange={(e) => handleLocationChange(idx, 'address', e.target.value)}
                        placeholder="Barakhon Madrasah, Tashkent, Uzbekistan"
                        className="w-full text-xs px-3 py-2 border border-[#E7E0D8] rounded-[3px] focus:outline-none focus:border-[#BA4E25]"
                      />
                      <input
                        type="text"
                        value={loc.url}
                        onChange={(e) => handleLocationChange(idx, 'url', e.target.value)}
                        placeholder="https://maps.google.com/?q=..."
                        className="w-full text-xs px-3 py-2 border border-[#E7E0D8] rounded-[3px] focus:outline-none focus:border-[#BA4E25]"
                      />
                    </div>
                    {locations.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveLocation(idx)}
                        className="p-2 text-[#8F7E73] hover:text-red-600 hover:bg-[#FAF4EC] rounded transition-colors cursor-pointer"
                        title="O'chirish"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Ijtimoiy tarmoqlar / messenjerlar (Telegram, Instagram, WhatsApp, ...) */}
            <div className="md:col-span-2 space-y-2 bg-[#FAF4EC]/50 p-3.5 rounded border border-[#E7E0D8]">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase">
                  IJTIMOIY TARMOQLAR / MESSENJERLAR
                </label>
                <button
                  type="button"
                  onClick={handleAddSocialLink}
                  className="text-xs font-semibold text-[#BA4E25] hover:text-[#9C3E1B] flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Yana havola qo'shish</span>
                </button>
              </div>

              <div className="space-y-2">
                {socialLinks.map((link, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-[#8F7E73] shrink-0" />
                    <input
                      type="text"
                      value={link.label}
                      onChange={(e) => handleSocialLinkChange(idx, 'label', e.target.value)}
                      placeholder="Telegram"
                      className="w-32 shrink-0 text-xs px-3 py-2 bg-white border border-[#E7E0D8] rounded-[3px] focus:outline-none focus:border-[#BA4E25]"
                    />
                    <input
                      type="text"
                      value={link.url}
                      onChange={(e) => handleSocialLinkChange(idx, 'url', e.target.value)}
                      placeholder="https://t.me/artqala"
                      className="flex-1 text-xs px-3.5 py-2 bg-white border border-[#E7E0D8] rounded-[3px] focus:outline-none focus:border-[#BA4E25]"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveSocialLink(idx)}
                      className="p-2 text-[#8F7E73] hover:text-red-600 hover:bg-white rounded transition-colors cursor-pointer"
                      title="O'chirish"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {socialLinks.length === 0 && (
                  <p className="text-[10.5px] text-[#8F7E73]">Hali havola qo'shilmagan.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 2. "Biz Haqimizda" Matni (faqat UZ, EN/RU avtomatik tarjima qilinadi) */}
        <div className="bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] p-6 space-y-4 shadow-xs">
          <h3 className="font-serif text-lg font-semibold text-[#281C18] border-b pb-2 border-[#E7E0D8] flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#429599]" />
            <span>"Biz Haqimizda" Matni (About Us)</span>
          </h3>

          <div>
            <label className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1">
              O'ZBEKCHA MATN (BOSHQA TILLARGA AVTOMATIK TARJIMA QILINADI)
              {translatingAbout && <Languages className="w-3 h-3 text-[#BA4E25] animate-pulse" />}
            </label>
            <textarea
              rows={4}
              value={aboutUz}
              onChange={(e) => setAboutUz(e.target.value)}
              onBlur={(e) => autoTranslateAbout(e.target.value)}
              className="w-full text-xs px-3.5 py-2 bg-white border border-[#E7E0D8] rounded-[3px] focus:outline-none focus:border-[#BA4E25] resize-none"
            />
          </div>
        </div>

        {/* 3. Valyuta Kurslari Boshqaruvi (cbu.uz vs Manual) */}
        <div className="bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b pb-2 border-[#E7E0D8]">
            <h3 className="font-serif text-lg font-semibold text-[#281C18]">
              Valyuta Kurslari Sozlamasi (Markaziy Bank / Qo'lda)
            </h3>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#BA4E25]">
              <input
                type="checkbox"
                checked={manualRates}
                onChange={(e) => setManualRates(e.target.checked)}
                className="w-4 h-4 accent-[#BA4E25]"
              />
              <span>Kurslarni qo'lda belgilash</span>
            </label>
          </div>

          <p className="text-xs text-[#726861]">
            {manualRates
              ? 'Hozirda qo\'lda kiritilgan kurslar qo\'llanilmoqda. Quyidagi qiymatlarni kiritishingiz mumkin:'
              : 'Hozirda O\'zbekiston Respublikasi Markaziy Banki (cbu.uz) rasmiy kursi avtomatik yangilanmoqda.'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1">
                1 USD = UZS (SO'M)
              </label>
              <input
                type="number"
                disabled={!manualRates}
                value={rateUsd}
                onChange={(e) => setRateUsd(e.target.value)}
                className="w-full text-xs px-3.5 py-2 bg-white border border-[#E7E0D8] rounded-[3px] focus:outline-none focus:border-[#BA4E25] disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1">
                1 EUR = UZS (SO'M)
              </label>
              <input
                type="number"
                disabled={!manualRates}
                value={rateEur}
                onChange={(e) => setRateEur(e.target.value)}
                className="w-full text-xs px-3.5 py-2 bg-white border border-[#E7E0D8] rounded-[3px] focus:outline-none focus:border-[#BA4E25] disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1">
                1 RUB = UZS (SO'M)
              </label>
              <input
                type="number"
                disabled={!manualRates}
                value={rateRub}
                onChange={(e) => setRateRub(e.target.value)}
                className="w-full text-xs px-3.5 py-2 bg-white border border-[#E7E0D8] rounded-[3px] focus:outline-none focus:border-[#BA4E25] disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="bg-[#BA4E25] hover:bg-[#9C3E1B] text-white font-semibold text-xs px-6 py-3 rounded-[3px] transition-all flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saqlanmoqda...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Barcha Sozlamalarni Saqlash</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
