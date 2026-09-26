/**
 * Comprehensive and secure email validation utility for Art Qala
 */
import { isValidPhoneNumber } from 'libphonenumber-js';

const TELEGRAM_USERNAME_REGEX = /^@[a-zA-Z0-9_]{5,32}$/;

// RFC 5322 standard compliant regular expression
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * Checks if the provided value is a syntactically valid email address.
 */
export function isValidEmail(email: unknown): boolean {
  if (typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (!trimmed || trimmed.length > 254) return false;

  // Must match standard email pattern
  if (!EMAIL_REGEX.test(trimmed)) return false;

  // Domain must have at least one dot and a valid TLD of at least 2 letters
  const parts = trimmed.split('@');
  if (parts.length !== 2) return false;
  const domain = parts[1];
  const domainParts = domain.split('.');
  if (domainParts.length < 2) return false;

  const tld = domainParts[domainParts.length - 1];
  if (!tld || tld.length < 2 || !/^[a-zA-Z]+$/.test(tld)) {
    return false;
  }

  return true;
}

/**
 * Validates email and returns a descriptive, localized error message in Uzbek.
 */
export function validateEmail(email: unknown): { isValid: boolean; error?: string } {
  if (!email || typeof email !== 'string' || !email.trim()) {
    return { isValid: false, error: 'Email manzili kiritilishi shart' };
  }

  const trimmed = email.trim();
  if (trimmed.length > 254) {
    return { isValid: false, error: 'Email manzili juda uzun (maksimal 254 belgi)' };
  }

  if (!isValidEmail(trimmed)) {
    return { isValid: false, error: "Noto'g'ri email formati. Masalan: ism@gmail.com" };
  }

  return { isValid: true };
}

/**
 * Validates a contact value that is either an international phone number
 * (must include a country calling code, e.g. +998901234567) or a Telegram
 * username (e.g. @artlover). Mirrors the client-side PhoneInput component.
 */
export function validatePhoneOrTelegram(value: unknown): { isValid: boolean; error?: string } {
  if (!value || typeof value !== 'string' || !value.trim()) {
    return { isValid: false, error: 'Telefon raqami kiritilishi shart' };
  }

  const trimmed = value.trim();

  if (trimmed.startsWith('@')) {
    if (!TELEGRAM_USERNAME_REGEX.test(trimmed)) {
      return { isValid: false, error: "Telegram foydalanuvchi nomi noto'g'ri (masalan: @artlover)" };
    }
    return { isValid: true };
  }

  // "+998901234567 (WhatsApp)" — a number the customer marked as WhatsApp.
  const number = trimmed.replace(/\s*\(WhatsApp\)$/i, '');
  if (!isValidPhoneNumber(number)) {
    return {
      isValid: false,
      error: "Telefon raqami noto'g'ri. Davlat kodi bilan kiriting (masalan: +998901234567)",
    };
  }

  return { isValid: true };
}
