'use client';

import React, { useState, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { CheckCircle2, Send, Sparkles } from 'lucide-react';
import AccessoryCheckboxes, { SelectedAccessory } from '@/components/AccessoryCheckboxes';
import ServiceImageCarousel from '@/components/ServiceImageCarousel';
import Breadcrumbs from '@/components/Breadcrumbs';
import FilterSelect from '@/components/FilterSelect';
import PhoneInput from '@/components/PhoneInput';
import { trackLead } from '@/lib/analytics';

interface ServicesClientProps {
  muralImages: string[];
  ceramicsImages: string[];
  customImages: string[];
}

export default function ServicesClient({ muralImages, ceramicsImages, customImages }: ServicesClientProps) {
  const { t } = useApp();
  const formRef = useRef<HTMLDivElement>(null);

  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [phoneValid, setPhoneValid] = useState(false);
  const [error, setError] = useState('');
  const [serviceType, setServiceType] = useState('MURAL');
  const [description, setDescription] = useState('');
  const [selectedAccessories, setSelectedAccessories] = useState<SelectedAccessory[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const scrollToForm = (type: string) => {
    setServiceType(type);
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!phoneValid) {
      setError(t.phoneInput.invalidPhone);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest_name: guestName,
          guest_email: guestEmail,
          guest_phone: guestPhone,
          service_type: serviceType,
          description,
          selected_accessories: selectedAccessories,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || t.services.requestError);
        return;
      }
      if (data.success) {
        setSubmitted(true);
        trackLead('service_request', { service_type: serviceType });
        setDescription('');
        setSelectedAccessories([]);
      }
    } catch (error) {
      console.error('Error submitting service request:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="py-14 sm:py-16">
        <Breadcrumbs items={[{ label: t.nav.services }]} />
        <div className="max-w-[1240px] mx-auto px-6 sm:px-10 lg:px-14">
          {/* Page Head */}
          <div className="max-w-2xl mb-12 space-y-2">
            <span className="text-xs font-semibold tracking-[3px] text-[#429599] uppercase">
              {t.services.eyebrow}
            </span>
            <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-[#281C18]">
              {t.services.title}
            </h1>
            <p className="text-sm sm:text-base text-[#6E6057] leading-relaxed">
              {t.services.subtitle}
            </p>
          </div>

          {/* Service Row 1: Mural */}
          <div className="py-12 border-t border-[#E7E0D8] flex flex-col md:flex-row items-center gap-10 lg:gap-14">
            <div className="w-full md:w-1/2 aspect-[4/3] rounded-[4px] overflow-hidden relative border border-[#E7E0D8] bg-[#F4ECE1] group">
              <ServiceImageCarousel images={muralImages} fallbackSrc="/assets/p-courtyard.svg" alt="Mural Painting" />
            </div>
            <div className="w-full md:w-1/2 space-y-4">
              <h2 className="font-serif text-3xl font-semibold text-[#281C18]">
                {t.services.muralTitle}
              </h2>
              <p className="text-sm sm:text-base text-[#5F534C] leading-relaxed">
                {t.services.muralDesc}
              </p>
              <button
                onClick={() => scrollToForm('MURAL')}
                className="inline-block bg-[#BA4E25] hover:bg-[#9C3E1B] text-white text-xs font-semibold px-6 py-3 rounded-[3px] transition-all shadow-xs"
              >
                {t.services.muralBtn}
              </button>
            </div>
          </div>

          {/* Service Row 2: Ceramics */}
          <div className="py-12 border-t border-[#E7E0D8] flex flex-col-reverse md:flex-row items-center gap-10 lg:gap-14">
            <div className="w-full md:w-1/2 space-y-4">
              <h2 className="font-serif text-3xl font-semibold text-[#281C18]">
                {t.services.ceramicsTitle}
              </h2>
              <p className="text-sm sm:text-base text-[#5F534C] leading-relaxed">
                {t.services.ceramicsDesc}
              </p>
              <button
                onClick={() => scrollToForm('CERAMICS')}
                className="inline-block bg-[#BA4E25] hover:bg-[#9C3E1B] text-white text-xs font-semibold px-6 py-3 rounded-[3px] transition-all shadow-xs"
              >
                {t.services.ceramicsBtn}
              </button>
            </div>
            <div className="w-full md:w-1/2 aspect-[4/3] rounded-[4px] overflow-hidden relative border border-[#E7E0D8] bg-[#F4ECE1] group">
              <ServiceImageCarousel images={ceramicsImages} fallbackSrc="/assets/p-handicraft.svg" alt="Ceramics Workshop" />
            </div>
          </div>

          {/* Service Row 3: Custom Painting */}
          <div className="py-12 border-t border-b border-[#E7E0D8] flex flex-col md:flex-row items-center gap-10 lg:gap-14">
            <div className="w-full md:w-1/2 aspect-[4/3] rounded-[4px] overflow-hidden relative border border-[#E7E0D8] bg-[#F4ECE1] group">
              <ServiceImageCarousel images={customImages} fallbackSrc="/assets/p-diamond.svg" alt="Custom Painting" />
            </div>
            <div className="w-full md:w-1/2 space-y-4">
              <h2 className="font-serif text-3xl font-semibold text-[#281C18]">
                {t.services.customTitle}
              </h2>
              <p className="text-sm sm:text-base text-[#5F534C] leading-relaxed">
                {t.services.customDesc}
              </p>
              <button
                onClick={() => scrollToForm('CUSTOM')}
                className="inline-block bg-[#BA4E25] hover:bg-[#9C3E1B] text-white text-xs font-semibold px-6 py-3 rounded-[3px] transition-all shadow-xs"
              >
                {t.services.customBtn}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quote Request Form Section */}
      <div ref={formRef} className="bg-[#281C18] text-[#FAF4EC] py-16 sm:py-20">
        <div className="max-w-[720px] mx-auto px-6 sm:px-10">
          <div className="space-y-2 mb-8 text-center sm:text-left">
            <h2 className="font-serif text-3xl font-semibold text-[#FAF4EC]">
              {t.services.formTitle}
            </h2>
            <p className="text-sm text-[#C8B9AF]">
              {t.services.formSubtitle}
            </p>
          </div>

          {submitted ? (
            <div className="p-6 bg-[#FAF4EC]/10 border border-[#429599] rounded-[4px] text-sm text-[#FAF4EC] flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-[#5AB3B7] shrink-0" />
              <div>
                <h4 className="font-serif text-lg font-semibold text-[#FAF4EC]">
                  {t.services.requestReceived}
                </h4>
                <p className="text-xs text-[#D8CCC4] mt-1">
                  {t.services.requestSuccess}
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <p className="text-xs text-[#F2A488] bg-[#BA4E25]/15 border border-[#BA4E25]/30 rounded-[3px] px-3 py-2">
                  {error}
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold tracking-wider text-[#A8988E] uppercase mb-1">
                    {t.services.nameLabel} *
                  </label>
                  <input
                    type="text"
                    required
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder={t.services.namePlaceholder}
                    className="w-full px-3.5 py-2.5 bg-[#362722] border border-[#4D3932] rounded-[3px] text-sm text-[#FAF4EC] focus:outline-none focus:border-[#BA4E25]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold tracking-wider text-[#A8988E] uppercase mb-1">
                    {t.services.emailLabel} *
                  </label>
                  <input
                    type="email"
                    required
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full px-3.5 py-2.5 bg-[#362722] border border-[#4D3932] rounded-[3px] text-sm text-[#FAF4EC] focus:outline-none focus:border-[#BA4E25]"
                  />
                </div>
              </div>

              {/* Phone or WhatsApp — many visitors from abroad can't be
                  reached by email alone, and don't use Telegram. */}
              <div>
                <label className="block text-[11px] font-bold tracking-wider text-[#A8988E] uppercase mb-1">
                  {t.services.phoneLabel} *
                </label>
                <PhoneInput value={guestPhone} onChange={setGuestPhone} onValidityChange={setPhoneValid} />
              </div>

              <div>
                <label className="block text-[11px] font-bold tracking-wider text-[#A8988E] uppercase mb-1">
                  {t.services.serviceLabel} *
                </label>
                <FilterSelect
                  value={serviceType}
                  onChange={setServiceType}
                  dark
                  buttonClassName="!rounded-[3px] !py-2.5 !text-sm"
                  options={[
                    { value: 'MURAL', label: t.services.optionMural },
                    { value: 'CERAMICS', label: t.services.optionCeramics },
                    { value: 'CUSTOM', label: t.services.optionCustom },
                  ]}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold tracking-wider text-[#A8988E] uppercase mb-1">
                  {t.services.projectLabel} *
                </label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t.services.projectPlaceholder}
                  className="w-full px-3.5 py-2.5 bg-[#362722] border border-[#4D3932] rounded-[3px] text-sm text-[#FAF4EC] focus:outline-none focus:border-[#BA4E25] resize-none"
                />
              </div>

              <AccessoryCheckboxes
                productTypes={[serviceType]}
                onChange={setSelectedAccessories}
                dark
              />

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#BA4E25] hover:bg-[#9C3E1B] text-white font-semibold text-sm py-3 rounded-[3px] transition-all flex items-center justify-center gap-2 shadow-md"
              >
                <Send className="w-4 h-4" />
                <span>{submitting ? t.services.submitting : t.services.submitRequest}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
