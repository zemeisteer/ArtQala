// Both emailed codes (signup and password reset) are short-lived on purpose.
// Kept in its own module so email.ts (which prints it) and otp.ts (which
// issues codes) can share it without importing each other.
export const OTP_TTL_MINUTES = 3;
export const OTP_TTL_MS = OTP_TTL_MINUTES * 60 * 1000;
