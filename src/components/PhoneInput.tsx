'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { getCountries, getCountryCallingCode, isValidPhoneNumber, type CountryCode } from 'libphonenumber-js';
import { useApp } from '@/context/AppContext';
import FilterSelect from '@/components/FilterSelect';
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
}

export default function PhoneInput({ value, onChange, onValidityChange, required = true }: PhoneInputProps) {
  const { t } = useApp();
  const countries = useMemo(() => getCountries().sort(), []);
  const initialIsWhatsApp = value.trim().endsWith(WHATSAPP_SUFFIX.trim());
  const [mode, setMode] = useState<'phone' | 'whatsapp'>(initialIsWhatsApp ? 'whatsapp' : 'phone');
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
      <div className="flex items-center gap-1 mb-1.5">
        <button
          type="button"
          onClick={() => {
            setMode('phone');
            emitChange('phone', country, localNumber);
          }}
          className={`text-[10.5px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
            mode === 'phone'
              ? 'bg-[#281C18] text-[#FAF4EC] border-[#281C18]'
              : 'bg-white text-[#554740] border-[#E7E0D8]'
          }`}
        >
          {t.phoneInput.phoneMode}
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('whatsapp');
            emitChange('whatsapp', country, localNumber);
          }}
          className={`text-[10.5px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
            mode === 'whatsapp'
              ? 'bg-[#281C18] text-[#FAF4EC] border-[#281C18]'
              : 'bg-white text-[#554740] border-[#E7E0D8]'
          }`}
        >
          {t.phoneInput.whatsappMode}
        </button>
      </div>

      <div className="flex items-center gap-1.5 bg-white border border-[#E7E0D8] rounded-[2px] focus-within:border-[#BA4E25]">
        <FilterSelect
          value={country}
          onChange={(v) => {
            const nextCountry = v as CountryCode;
            setCountry(nextCountry);
            emitChange(mode, nextCountry, localNumber);
          }}
          searchable
          searchPlaceholder={t.phoneInput.phoneMode}
          className="w-[92px] shrink-0"
          buttonClassName="!rounded-l-[2px] !rounded-r-none !border-0 !border-r !border-[#E7E0D8] !bg-[#FAF4EC] !py-2 !px-2 !text-xs !ring-0 focus:!ring-0"
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
          className="w-full text-xs px-2.5 py-2 focus:outline-none"
        />
      </div>
      {errorMessage && <p className="text-[10.5px] text-[#B91C1C] mt-1">{errorMessage}</p>}
    </div>
  );
}
