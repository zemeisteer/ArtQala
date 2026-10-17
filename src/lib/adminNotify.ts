import { prisma } from './prisma';
import { sendAdminActivityNotification } from './email';
import { formatAdminTelegram, sendTelegramToAdmins } from './telegram';

type NotifyParams = Omit<Parameters<typeof sendAdminActivityNotification>[0], 'adminEmail'>;

// Tells the gallery about new customer activity: an email to its inbox (the
// Email field in Admin → Settings, skipped when empty) and a Telegram
// message to every linked chat (when TELEGRAM_BOT_TOKEN is set). Never
// throws — a failed notification must not fail the customer's request,
// which is already saved and visible in the admin panel. Callers should
// await it: a Vercel function can be frozen as soon as the response is sent.
export async function notifyAdmin(params: NotifyParams): Promise<void> {
  await Promise.all([
    (async () => {
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
    })(),
    sendTelegramToAdmins(formatAdminTelegram(params)).catch((error) => {
      console.error('Telegram notification error:', error);
    }),
  ]);
}

// The first email address inside a contact string — service requests
// store "email · phone" (older ones: an email, a phone or a @telegram
// handle), and only a real address can be used for Reply-To / reply mails.
export function extractEmail(value?: string | null): string | null {
  const match = (value || '').match(/[^\s@·,;<>()]+@[^\s@·,;<>()]+\.[^\s@·,;<>()]+/);
  return match ? match[0].toLowerCase() : null;
}

// Kept for existing callers.
export const emailOrNull = extractEmail;
