import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { getBotInfo, isTelegramConfigured, linkChatsFromUpdates, sendTelegramToAdmins } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

// Admin → Settings → Telegram: status, linking chats, a test message.

export async function GET() {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;
  const configured = isTelegramConfigured();
  const [bot, chats] = await Promise.all([
    configured ? getBotInfo() : Promise.resolve(null),
    prisma.telegramChat.findMany({ orderBy: { created_at: 'asc' } }),
  ]);
  return NextResponse.json({
    success: true,
    configured,
    tokenValid: configured ? Boolean(bot) : false,
    botUsername: bot?.username || null,
    chats,
  });
}

// { action: 'link' } — add everyone who wrote to the bot recently;
// { action: 'test' } — send a test message to every linked chat.
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;
  if (!isTelegramConfigured()) {
    return NextResponse.json({ success: false, error: "TELEGRAM_BOT_TOKEN Vercel sozlamalarida yo'q" }, { status: 400 });
  }
  const body = await request.json().catch(() => ({}));

  if (body?.action === 'link') {
    const { linked, error } = await linkChatsFromUpdates();
    if (error) return NextResponse.json({ success: false, error }, { status: 502 });
    const chats = await prisma.telegramChat.findMany({ orderBy: { created_at: 'asc' } });
    return NextResponse.json({ success: true, found: linked.length, chats });
  }

  if (body?.action === 'test') {
    const result = await sendTelegramToAdmins(
      "✅ <b>Art Qala</b>\nSinov xabari: yangi so'rovlar va xabarlar shu yerga keladi."
    );
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
