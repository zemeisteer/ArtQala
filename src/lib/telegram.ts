import { prisma } from './prisma';
import { SITE_URL } from './siteUrl';

// Admin notifications on Telegram. The bot is created by the gallery in
// @BotFather; its token lives in the TELEGRAM_BOT_TOKEN env var (never in
// the database). Which chats receive messages is linked from Admin →
// Settings → Telegram (TelegramChat rows). Everything here is best-effort:
// a Telegram problem never fails the customer's request.

// Overridable only for local testing against a mock server.
const API = process.env.TELEGRAM_API_URL || 'https://api.telegram.org';
const TIMEOUT_MS = 8000;

export const isTelegramConfigured = () => Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim());

interface TgResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

async function tg<T>(method: string, body?: Record<string, unknown>): Promise<TgResponse<T>> {
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

// Everyone who wrote to the bot (or added it to a group) recently becomes a
// recipient. Telegram keeps these updates for ~24 hours.
export async function linkChatsFromUpdates(): Promise<{ linked: { chat_id: string; title: string }[]; error?: string }> {
  type Chat = { id: number; type: string; title?: string; first_name?: string; last_name?: string; username?: string };
  type Update = { message?: { chat: Chat }; my_chat_member?: { chat: Chat }; channel_post?: { chat: Chat } };
  const r = await tg<Update[]>('getUpdates', { allowed_updates: ['message', 'my_chat_member'] });
  if (!r.ok || !r.result) return { linked: [], error: r.description || 'getUpdates failed' };

  const chats = new Map<string, string>();
  for (const u of r.result) {
    const chat = u.message?.chat || u.my_chat_member?.chat;
    if (!chat) continue;
    const title =
      chat.title || [chat.first_name, chat.last_name].filter(Boolean).join(' ') || (chat.username ? `@${chat.username}` : String(chat.id));
    chats.set(String(chat.id), title);
  }
  const linked: { chat_id: string; title: string }[] = [];
  for (const [chat_id, title] of chats) {
    await prisma.telegramChat.upsert({ where: { chat_id }, create: { chat_id, title }, update: { title } });
    linked.push({ chat_id, title });
  }
  return { linked };
}

export async function sendTelegramToAdmins(html: string): Promise<{ sent: number; failed: number }> {
  if (!isTelegramConfigured()) return { sent: 0, failed: 0 };
  const chats = await prisma.telegramChat.findMany({ select: { chat_id: true } });
  let sent = 0;
  let failed = 0;
  await Promise.all(
    chats.map(async ({ chat_id }) => {
      const r = await tg('sendMessage', {
        chat_id,
        text: html.length > 4000 ? `${html.slice(0, 3990)}…` : html,
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
      });
      if (r.ok) sent++;
      else {
        failed++;
        console.error(`Telegram send to ${chat_id} failed:`, r.description);
      }
    })
  );
  return { sent, failed };
}

// The same content as the admin notification email, as a Telegram message.
export function formatAdminTelegram(params: {
  heading: string;
  summary: string;
  details: [string, string | null | undefined][];
  message?: string;
  adminPath: string;
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
  lines.push('', `<a href="${SITE_URL}${params.adminPath}">Admin panelda ochish →</a>`);
  return lines.join('\n');
}
