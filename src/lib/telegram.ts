import { prisma } from './prisma';
import { SITE_URL } from './siteUrl';
import { signValue } from './auth';

// Admin notifications and quick actions on Telegram.
//
// - The bot is created by the gallery in @BotFather; its token lives in the
//   TELEGRAM_BOT_TOKEN env var (never in the database).
// - Linking is SECURE: Admin → Settings → Telegram creates a signed link
//   (t.me/<bot>?start=<code>, valid 15 minutes). Only a chat that opens the
//   bot through such a link is linked; anyone else who writes to the bot is
//   ignored. (The old "link whoever wrote to the bot" approach is gone.)
// - Telegram talks back through a webhook (src/app/api/telegram/webhook),
//   authenticated by a secret header derived from NEXTAUTH_SECRET.
// - Everything is best-effort: a Telegram problem never fails a customer's
//   request.

// Overridable only for local testing against a mock server.
const API = process.env.TELEGRAM_API_URL || 'https://api.telegram.org';
const TIMEOUT_MS = 8000;
const LINK_TTL_SECONDS = 15 * 60;

export const isTelegramConfigured = () => Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim());

interface TgResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

export async function tg<T = unknown>(method: string, body?: Record<string, unknown>): Promise<TgResponse<T>> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) return { ok: false, description: 'TELEGRAM_BOT_TOKEN is not set' };
  try {
    const res = await fetch(`${API}/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return (await res.json()) as TgResponse<T>;
  } catch (error) {
    return { ok: false, description: error instanceof Error ? error.message : String(error) };
  }
}

export const tgEscape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export async function getBotInfo(): Promise<{ username: string } | null> {
  const r = await tg<{ username: string }>('getMe');
  return r.ok && r.result ? { username: r.result.username } : null;
}

// --- secure linking -------------------------------------------------------

// "<expiry, base36>_<signature>" — only [a-z0-9_], fits Telegram's 64-char
// /start parameter, and can't be forged without NEXTAUTH_SECRET.
export function createLinkCode(): string {
  const exp = (Math.floor(Date.now() / 1000) + LINK_TTL_SECONDS).toString(36);
  return `${exp}_${signValue(`tg-link:${exp}`).slice(0, 24)}`;
}

export function isValidLinkCode(code: string | undefined | null): boolean {
  const m = (code || '').match(/^([0-9a-z]+)_([0-9a-f]{24})$/);
  if (!m) return false;
  const exp = parseInt(m[1], 36);
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return false;
  return signValue(`tg-link:${m[1]}`).slice(0, 24) === m[2];
}

// Telegram sends this header with every webhook call (set via setWebhook).
export const webhookSecret = () => signValue('tg-webhook');
export const webhookUrl = () => `${SITE_URL}/api/telegram/webhook`;

export async function ensureWebhook(): Promise<{ ok: boolean; error?: string }> {
  const r = await tg('setWebhook', {
    url: webhookUrl(),
    secret_token: webhookSecret(),
    allowed_updates: ['message', 'callback_query'],
  });
  return r.ok ? { ok: true } : { ok: false, error: r.description };
}

export async function getWebhookStatus(): Promise<{ active: boolean; lastError: string | null }> {
  const r = await tg<{ url: string; last_error_message?: string }>('getWebhookInfo');
  return {
    active: Boolean(r.ok && r.result?.url === webhookUrl()),
    lastError: r.result?.last_error_message || null,
  };
}

export async function isLinkedChat(chatId: number | string): Promise<boolean> {
  return Boolean(await prisma.telegramChat.findUnique({ where: { chat_id: String(chatId) }, select: { chat_id: true } }));
}

export async function linkChat(chat: { id: number; title?: string; first_name?: string; last_name?: string; username?: string }) {
  const title =
    chat.title || [chat.first_name, chat.last_name].filter(Boolean).join(' ') || (chat.username ? `@${chat.username}` : String(chat.id));
  await prisma.telegramChat.upsert({
    where: { chat_id: String(chat.id) },
    create: { chat_id: String(chat.id), title },
    update: { title },
  });
  return title;
}

// --- messages -------------------------------------------------------------

export type NoticeKind = 'inquiry' | 'service' | 'contact';
export interface NoticeRef {
  kind: NoticeKind;
  id: string;
  status?: string;
}

const ADMIN_PATH: Record<NoticeKind, string> = {
  inquiry: '/admin/inquiries',
  service: '/admin/services',
  contact: '/admin/messages',
};
const KIND_CODE: Record<NoticeKind, string> = { inquiry: 'i', service: 's', contact: 'c' };
const CODE_KIND: Record<string, NoticeKind> = { i: 'inquiry', s: 'service', c: 'contact' };

// The notification's "open in admin" link carries the record's id
// (…/admin/inquiries?open=<id>), which is how a curator's Telegram reply to
// that notification finds the thread it belongs to — no extra table.
export function adminLink(ref: NoticeRef): string {
  return `${SITE_URL}${ADMIN_PATH[ref.kind]}?open=${encodeURIComponent(ref.id)}`;
}

export function refFromAdminLink(url: string): NoticeRef | null {
  try {
    const u = new URL(url);
    const kind = (Object.keys(ADMIN_PATH) as NoticeKind[]).find((k) => ADMIN_PATH[k] === u.pathname);
    const id = u.searchParams.get('open');
    return kind && id ? { kind, id } : null;
  } catch {
    return null;
  }
}

// Status buttons under an inquiry / service-request notification. The
// current status is marked; callback data = "st|<i|s>|<id>|<STATUS>".
const STATUS_BUTTONS: Record<'inquiry' | 'service', [string, string][]> = {
  inquiry: [
    ['IN_PROGRESS', '⏳ Jarayonda'],
    ['ANSWERED', '✅ Javob berildi'],
    ['COMPLETED', '🏁 Yakunlandi'],
  ],
  service: [
    ['IN_PROGRESS', '⏳ Jarayonda'],
    ['COMPLETED', '🏁 Yakunlandi'],
  ],
};

export function statusKeyboard(ref: NoticeRef) {
  if (ref.kind === 'contact') return undefined;
  return {
    inline_keyboard: [
      STATUS_BUTTONS[ref.kind].map(([status, label]) => ({
        text: ref.status === status ? `• ${label}` : label,
        callback_data: `st|${KIND_CODE[ref.kind]}|${ref.id}|${status}`,
      })),
    ],
  };
}

export function parseStatusCallback(data: string | undefined): (NoticeRef & { status: string }) | null {
  const m = (data || '').match(/^st\|([isc])\|([A-Za-z0-9_-]+)\|([A-Z_]+)$/);
  return m ? { kind: CODE_KIND[m[1]], id: m[2], status: m[3] } : null;
}

export async function sendTelegramToAdmins(
  html: string,
  replyMarkup?: Record<string, unknown>
): Promise<{ sent: number; failed: number }> {
  if (!isTelegramConfigured()) return { sent: 0, failed: 0 };
  const chats = await prisma.telegramChat.findMany({ select: { chat_id: true } });
  let sent = 0;
  let failed = 0;
  await Promise.all(
    chats.map(async ({ chat_id }) => {
      const r = await sendTelegramMessage(chat_id, html, replyMarkup);
      if (r.ok) sent++;
      else {
        failed++;
        console.error(`Telegram send to ${chat_id} failed:`, r.description);
      }
    })
  );
  return { sent, failed };
}

export function sendTelegramMessage(chatId: string | number, html: string, replyMarkup?: Record<string, unknown>) {
  return tg('sendMessage', {
    chat_id: chatId,
    text: html.length > 4000 ? `${html.slice(0, 3990)}…` : html,
    parse_mode: 'HTML',
    link_preview_options: { is_disabled: true },
    ...(replyMarkup && { reply_markup: replyMarkup }),
  });
}

// The same content as the admin notification email, as a Telegram message.
export function formatAdminTelegram(params: {
  heading: string;
  summary: string;
  details: [string, string | null | undefined][];
  message?: string;
  adminPath: string;
  ref?: NoticeRef;
}): string {
  const lines = [`🔔 <b>${tgEscape(params.heading)}</b>`, tgEscape(params.summary), ''];
  for (const [label, value] of params.details) {
    if (value && String(value).trim()) lines.push(`<b>${tgEscape(label)}:</b> ${tgEscape(String(value))}`);
  }
  const message = (params.message || '').trim();
  if (message) {
    const short = message.length > 1200 ? `${message.slice(0, 1200)}…` : message;
    lines.push('', `💬 <i>${tgEscape(short)}</i>`);
  }
  const href = params.ref ? adminLink(params.ref) : `${SITE_URL}${params.adminPath}`;
  lines.push('', `<a href="${href}">Admin panelda ochish →</a>`);
  if (params.ref) lines.push('<i>Mijozga javob yozish uchun shu xabarga Reply qiling.</i>');
  return lines.join('\n');
}
