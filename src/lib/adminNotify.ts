import { prisma } from './prisma';
import { sendAdminActivityNotification } from './email';

type NotifyParams = Omit<Parameters<typeof sendAdminActivityNotification>[0], 'adminEmail'>;

// Emails the gallery's inbox (the Email field in Admin → Settings) about new
// customer activity. Skipped when no email is set, and never throws — a
// failed notification must not fail the customer's request, which is
// already saved and visible in the admin panel. Callers should await it:
// a Vercel function can be frozen as soon as the response is sent.
export async function notifyAdmin(params: NotifyParams): Promise<void> {
  try {
    const settings = await prisma.siteSettings.findUnique({
      where: { id: 'default' },
      select: { email: true },
    });
    const adminEmail = settings?.email?.trim();
    if (!adminEmail) return;

    const result = await sendAdminActivityNotification({ ...params, adminEmail });
    if (!result.success) console.error('Admin notification failed:', result.error);
  } catch (error) {
    console.error('Admin notification error:', error);
  }
}

// guest_contact on service requests may be a phone number or Telegram
// handle — only a real email address can be used as Reply-To.
export function emailOrNull(value?: string | null): string | null {
  const v = value?.trim() || '';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v : null;
}
