import { prisma } from './prisma';
import { SITE_URL } from './siteUrl';
import { tg, tgEscape, isTelegramConfigured } from './telegram';
import { mainImage, PLACEHOLDER_IMAGE } from './paintingImages';
import { localizePath } from './i18n/routing';

// The gallery's public Telegram channel: a new work added in the admin is
// posted there (photo, title, artist, size, price, link), and any work can
// be (re)posted from its edit page. The bot must be an admin of the channel
// with "Post messages". Set in Admin → Settings → Telegram
// (SiteSettings.telegram_channel; empty = off).

// "@name", "name", "t.me/name", "https://t.me/name" or a numeric -100… id.
export function normalizeChannel(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  if (/^-100\d{5,}$/.test(s)) return s;
  const m = s.match(/^(?:https?:\/\/)?(?:t\.me\/|telegram\.me\/)?@?([A-Za-z][A-Za-z0-9_]{3,31})\/?$/);
  return m ? `@${m[1]}` : null;
}

export async function getChannel(): Promise<string | null> {
  const s = await prisma.siteSettings
    .findUnique({ where: { id: 'default' }, select: { telegram_channel: true } })
    .catch(() => null);
  return s?.telegram_channel || null;
}

// Checks the bot can post there; returns the channel's title.
export async function verifyChannel(channel: string): Promise<{ ok: true; title: string } | { ok: false; error: string }> {
  if (!isTelegramConfigured()) return { ok: false, error: "TELEGRAM_BOT_TOKEN Vercel sozlamalarida yo'q" };
  const chat = await tg<{ id: number; title?: string; type: string }>('getChat', { chat_id: channel });
  if (!chat.ok || !chat.result) {
    return { ok: false, error: "Kanal topilmadi. Manzilni tekshiring va botni kanalga admin qiling." };
  }
  if (chat.result.type !== 'channel') return { ok: false, error: 'Bu kanal emas (guruh yoki shaxsiy chat).' };
  const me = await tg<{ id: number }>('getMe');
  const member = me.result
    ? await tg<{ status: string; can_post_messages?: boolean }>('getChatMember', { chat_id: channel, user_id: me.result.id })
    : null;
  const st = member?.result;
  if (!st || (st.status !== 'creator' && !(st.status === 'administrator' && st.can_post_messages))) {
    return { ok: false, error: "Bot kanalda admin emas yoki unga \"Xabar joylash\" ruxsati berilmagan." };
  }
  return { ok: true, title: chat.result.title || channel };
}

const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
const absolute = (url: string) => (url.startsWith('http') ? url : `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`);

export async function postPaintingToChannel(
  paintingId: string,
  channelOverride?: string
): Promise<{ ok: boolean; error?: string }> {
  const channel = channelOverride || (await getChannel());
  if (!channel || !isTelegramConfigured()) return { ok: false, error: 'Telegram kanal ulanmagan' };
  const p = await prisma.painting.findUnique({ where: { id: paintingId }, include: { artist: true } });
  if (!p) return { ok: false, error: 'Asar topilmadi' };

  const url = `${SITE_URL}${localizePath(`/gallery/${p.id}`, 'uz')}`;
  const price = p.is_sold
    ? '🔴 Sotilgan — o\'xshashini buyurtma qilish mumkin'
    : p.discount_price && p.discount_price < p.price
      ? `💰 <b>${usd(p.discount_price)}</b> <s>${usd(p.price)}</s>`
      : `💰 <b>${usd(p.price)}</b>`;
  const facts = [p.technique_uz || p.technique_en, p.size, p.year ? String(p.year) : ''].filter(Boolean).join(' · ');
  const caption = [
    `🖼 <b>${tgEscape(p.title_uz || p.title_en)}</b>${p.title_en && p.title_en !== p.title_uz ? ` / ${tgEscape(p.title_en)}` : ''}`,
    ...(p.artist?.name ? [`👤 ${tgEscape(p.artist.name)}`] : []),
    ...(facts ? [tgEscape(facts)] : []),
    price,
    '',
    `🔗 <a href="${url}">artqala.com</a> — narx o'z valyutangizda, butun dunyoga yetkazib berish`,
  ].join('\n');
  const reply_markup = { inline_keyboard: [[{ text: "Saytda ko'rish", url }]] };

  const photo = mainImage(p.images);
  const res =
    photo && photo !== PLACEHOLDER_IMAGE
      ? await tg('sendPhoto', { chat_id: channel, photo: absolute(photo), caption, parse_mode: 'HTML', reply_markup })
      : await tg('sendMessage', { chat_id: channel, text: caption, parse_mode: 'HTML', reply_markup });
  if (!res.ok) {
    // A photo Telegram can't fetch (format/size) — still post the text.
    if (photo !== PLACEHOLDER_IMAGE) {
      const text = await tg('sendMessage', { chat_id: channel, text: caption, parse_mode: 'HTML', reply_markup });
      if (text.ok) return { ok: true };
    }
    return { ok: false, error: res.description || 'Telegram xatosi' };
  }
  return { ok: true };
}
