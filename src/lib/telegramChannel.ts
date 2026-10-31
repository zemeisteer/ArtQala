import { prisma } from './prisma';
import { SITE_URL } from './siteUrl';
import { tg, tgEscape, isTelegramConfigured } from './telegram';
import { mainImage, PLACEHOLDER_IMAGE } from './paintingImages';
import { localizePath } from './i18n/routing';
import { parseSizeCm } from './paintingSize';

// The gallery's public Telegram channel: a new work added in the admin is
// posted there in English (photo, title, artist, size, "View on site"
// button — the owner wants nothing more), and any work can
// be (re)posted from its edit page. Saving a work that was never posted
// (Painting.channel_posted_at) posts it once, so older works reach the
// channel as they get edited. The bot must be an admin of the channel
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

// "90 × 70 cm" whatever unit the admin typed ("sm", "dyum"…).
function englishSize(size: string | null): string {
  const s = parseSizeCm(size);
  if (!s) return size || '';
  const n = (v: number) => String(Math.round(v * 10) / 10);
  return `${[s.width, s.height, s.depth].filter((v): v is number => !!v).map(n).join(' × ')} cm`;
}
const absolute = (url: string) => (url.startsWith('http') ? url : `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`);

export async function postPaintingToChannel(
  paintingId: string,
  channelOverride?: string
): Promise<{ ok: boolean; error?: string }> {
  const channel = channelOverride || (await getChannel());
  if (!channel || !isTelegramConfigured()) return { ok: false, error: 'Telegram kanal ulanmagan' };
  const p = await prisma.painting.findUnique({ where: { id: paintingId }, include: { artist: true } });
  if (!p) return { ok: false, error: 'Asar topilmadi' };

  const url = `${SITE_URL}${localizePath(`/gallery/${p.id}`, 'en')}`;
  const size = englishSize(p.size);
  const caption = [
    `<b>${tgEscape(p.title_en || p.title_uz)}</b>`,
    ...(p.artist?.name ? [`Artist: ${tgEscape(p.artist.name)}`] : []),
    ...(size ? [`Size: ${tgEscape(size)}`] : []),
  ].join('\n');
  const reply_markup = { inline_keyboard: [[{ text: 'View on site', url }]] };

  const photo = mainImage(p.images);
  const res =
    photo && photo !== PLACEHOLDER_IMAGE
      ? await tg('sendPhoto', { chat_id: channel, photo: absolute(photo), caption, parse_mode: 'HTML', reply_markup })
      : await tg('sendMessage', { chat_id: channel, text: caption, parse_mode: 'HTML', reply_markup });
  let ok = res.ok;
  if (!ok && photo !== PLACEHOLDER_IMAGE) {
    // A photo Telegram can't fetch (format/size) — still post the text.
    ok = (await tg('sendMessage', { chat_id: channel, text: caption, parse_mode: 'HTML', reply_markup })).ok;
  }
  if (!ok) return { ok: false, error: res.description || 'Telegram xatosi' };
  await prisma.painting
    .update({ where: { id: p.id }, data: { channel_posted_at: new Date() } })
    .catch((error) => console.error('Channel post not recorded:', error));
  return { ok: true };
}

// After an admin save (create or edit): post an unsold work that has never
// been posted. Does nothing when no channel is connected.
export async function postToChannelIfNew(paintingId: string): Promise<void> {
  const p = await prisma.painting.findUnique({
    where: { id: paintingId },
    select: { is_sold: true, channel_posted_at: true },
  });
  if (!p || p.is_sold || p.channel_posted_at) return;
  const channel = await getChannel();
  if (!channel || !isTelegramConfigured()) return;
  const result = await postPaintingToChannel(paintingId, channel);
  if (!result.ok) console.error('Channel post failed:', result.error);
}
