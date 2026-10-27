import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import {
  createLinkCode,
  ensureWebhook,
  getBotInfo,
  getWebhookStatus,
  isTelegramConfigured,
  sendTelegramToAdmins,
} from '@/lib/telegram';
import { buildWeeklyReport } from '@/lib/weeklyReport';
import { getChannel, normalizeChannel, verifyChannel } from '@/lib/telegramChannel';

export const dynamic = 'force-dynamic';

// Admin → Settings → Telegram: status, secure link, test, weekly report now.

export async function GET() {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;
  const configured = isTelegramConfigured();
  const [bot, chats, webhook, channel] = await Promise.all([
    configured ? getBotInfo() : Promise.resolve(null),
    prisma.telegramChat.findMany({ orderBy: { created_at: 'asc' } }),
    configured ? getWebhookStatus() : Promise.resolve(null),
    getChannel(),
  ]);
  return NextResponse.json({
    success: true,
    configured,
    tokenValid: configured ? Boolean(bot) : false,
    botUsername: bot?.username || null,
    webhookActive: webhook?.active ?? false,
    webhookError: webhook?.lastError ?? null,
    chats,
    channel,
  });
}

// { action: 'link' }   — (re)register the webhook and return a signed,
//                        15-minute link that links whoever opens it;
// { action: 'test' }   — send a test message to every linked chat;
// { action: 'report' } — send the weekly report now.
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;
  if (!isTelegramConfigured()) {
    return NextResponse.json({ success: false, error: "TELEGRAM_BOT_TOKEN Vercel sozlamalarida yo'q" }, { status: 400 });
  }
  const body = await request.json().catch(() => ({}));

  if (body?.action === 'link') {
    const [bot, webhook] = await Promise.all([getBotInfo(), ensureWebhook()]);
    if (!bot) return NextResponse.json({ success: false, error: "Bot token noto'g'ri" }, { status: 502 });
    if (!webhook.ok) {
      return NextResponse.json({ success: false, error: `Webhook o'rnatilmadi: ${webhook.error}` }, { status: 502 });
    }
    return NextResponse.json({ success: true, url: `https://t.me/${bot.username}?start=${createLinkCode()}` });
  }

  if (body?.action === 'test') {
    const result = await sendTelegramToAdmins(
      "✅ <b>Art Qala</b>\nSinov xabari: yangi so'rovlar va xabarlar shu yerga keladi."
    );
    return NextResponse.json({ success: result.sent > 0, ...result });
  }

  // { action: 'channel', channel } — connect the public channel new works
  // are posted to (checked first); an empty channel turns it off.
  if (body?.action === 'channel') {
    const raw = typeof body.channel === 'string' ? body.channel : '';
    if (!raw.trim()) {
      await prisma.siteSettings.update({ where: { id: 'default' }, data: { telegram_channel: null } });
      return NextResponse.json({ success: true, channel: null });
    }
    const channel = normalizeChannel(raw);
    if (!channel) return NextResponse.json({ success: false, error: "Kanal manzili noto'g'ri (masalan: @artqala)" }, { status: 400 });
    const check = await verifyChannel(channel);
    if (!check.ok) return NextResponse.json({ success: false, error: check.error }, { status: 400 });
    await prisma.siteSettings.update({ where: { id: 'default' }, data: { telegram_channel: channel } });
    return NextResponse.json({ success: true, channel, title: check.title });
  }

  if (body?.action === 'report') {
    const result = await sendTelegramToAdmins(await buildWeeklyReport());
    return NextResponse.json({ success: result.sent > 0, ...result });
  }

  return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
}

// ?chat_id=… — stop sending to that chat.
export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;
  const chatId = new URL(request.url).searchParams.get('chat_id') || '';
  await prisma.telegramChat.deleteMany({ where: { chat_id: chatId } });
  return NextResponse.json({ success: true });
}
