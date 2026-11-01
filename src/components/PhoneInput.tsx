'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { getCountries, getCountryCallingCode, isValidPhoneNumber, type CountryCode } from 'libphonenumber-js';
import { useApp } from '@/context/AppContext';
import FilterSelect from '@/components/FilterSelect';
import { Check, MessageCircle, Phone } from 'lucide-react';
import { getVisitorCountry } from '@/lib/visitorCountry';

// A contact number can be marked as WhatsApp — most customers from abroad
// don't use Telegram, and WhatsApp works off the same phone number. The
// emitted value is then "+<number> (WhatsApp)"; validatePhoneOrTelegram()
// on the server accepts that suffix (and still accepts old "@telegram"
// handles already stored on earlier inquiries).
export const WHATSAPP_SUFFIX = ' (WhatsApp)';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  onValidityChange?: (isValid: boolean) => void;
  required?: boolean;
  // The Services page's dark card.
  dark?: boolean;
}

export default function PhoneInput({ value, onChange, onValidityChange, required = true, dark = false }: PhoneInputProps) {
  const { t } = useApp();
  const countries = useMemo(() => getCountries().sort(), []);
  // WhatsApp by default — it's how the gallery reaches most customers; an
  // existing plain number (no "(WhatsApp)" suffix) opens as a phone.
  const [mode, setMode] = useState<'phone' | 'whatsapp'>(
    !value.trim() || value.trim().endsWith(WHATSAPP_SUFFIX.trim()) ? 'whatsapp' : 'phone'
  );
  // Uzbekistan until mounted (same on server and client), then the
  // visitor's own country from their IP — see src/lib/visitorCountry.ts.
  const [country, setCountry] = useState<CountryCode>('UZ' as CountryCode);
  const [localNumber, setLocalNumber] = useState(() =>
    value ? value.replace(WHATSAPP_SUFFIX, '').replace(/^\+\d+\s*/, '') : ''
  );
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (value) return; // editing an existing number: keep what's there
    const detected = getVisitorCountry();
    if (detected && countries.includes(detected as CountryCode)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCountry(detected as CountryCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fullPhoneValue = `+${getCountryCallingCode(country)}${localNumber.replace(/[^0-9]/g, '')}`;
  const isValid = localNumber.trim().length > 0 && isValidPhoneNumber(fullPhoneValue, country);

  const emitChange = (nextMode: 'phone' | 'whatsapp', nextCountry: CountryCode, nextLocal: string) => {
    if (nextLocal.trim() === '') {
      onChange('');
      return;
    }
    const number = `+${getCountryCallingCode(nextCountry)}${nextLocal.replace(/[^0-9]/g, '')}`;
    onChange(nextMode === 'whatsapp' ? `${number}${WHATSAPP_SUFFIX}` : number);
  };

  React.useEffect(() => {
    onValidityChange?.(!required || isValid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isValid, required]);

  const errorMessage = touched && !isValid ? t.phoneInput.invalidPhone : '';

  return (
    <div>
      {/* WhatsApp or plain phone: one two-part switch, the chosen half
          filled orange with a tick, so it reads the same on light and dark
          cards (two separate pills looked alike on the dark one). */}
      <div
        role="radiogroup"
        className={`inline-flex mb-1.5 rounded-full border p-0.5 ${dark ? 'border-[#4D3932] bg-[#2E201B]' : 'border-[#E7E0D8] bg-white'}`}
      >
        {(['whatsapp', 'phone'] as const).map((m) => {
          const on = mode === m;
          const Icon = m === 'whatsapp' ? MessageCircle : Phone;
          return (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => {
                setMode(m);
                emitChange(m, country, localNumber);
              }}
              className={`flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full transition-colors ${
                on
                  ? 'bg-[#BA4E25] text-white shadow-sm'
                  : dark
                    ? 'text-[#A8988E] hover:text-[#FAF4EC]'
                    : 'text-[#6B5E55] hover:text-[#281C18]'
              }`}
            >
              {on ? <Check className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
              {m === 'whatsapp' ? t.phoneInput.whatsappMode : t.phoneInput.phoneMode}
            </button>
          );
        })}
      </div>

      <div
        className={`flex items-center gap-1.5 border focus-within:border-[#BA4E25] ${
          dark ? 'bg-[#362722] border-[#4D3932] rounded-[3px]' : 'bg-white border-[#E7E0D8] rounded-[2px]'
        }`}
      >
        <FilterSelect
          value={country}
          onChange={(v) => {
            const nextCountry = v as CountryCode;
            setCountry(nextCountry);
            emitChange(mode, nextCountry, localNumber);
          }}
          searchable
          searchPlaceholder={t.phoneInput.phoneMode}
          dark={dark}
          className={`${dark ? 'w-[112px]' : 'w-[92px]'} shrink-0`}
          buttonClassName={`!rounded-l-[2px] !rounded-r-none !border-0 !border-r !px-2 !ring-0 focus:!ring-0 ${
            dark ? '!border-[#4D3932] !bg-[#2E201B] !py-2.5 !text-sm' : '!border-[#E7E0D8] !bg-[#FAF4EC] !py-2 !text-xs'
          }`}
          options={countries.map((c) => ({ value: c, label: `${c} +${getCountryCallingCode(c)}` }))}
        />
        <input
          type="tel"
          required={required}
          value={localNumber}
          onChange={(e) => {
            setLocalNumber(e.target.value);
            emitChange(mode, country, e.target.value);
          }}
          onBlur={() => setTouched(true)}
          placeholder={t.phoneInput.phonePlaceholder}
          className={`w-full bg-transparent px-2.5 focus:outline-none ${
            dark ? 'text-sm py-2.5 text-[#FAF4EC] placeholder:text-[#8A7B72]' : 'text-xs py-2'
          }`}
        />
      </div>
      {errorMessage && <p className={`text-[10.5px] mt-1 ${dark ? 'text-[#F2A488]' : 'text-[#B91C1C]'}`}>{errorMessage}</p>}
    </div>
  );
}
