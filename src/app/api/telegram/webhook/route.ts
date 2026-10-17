import { NextResponse } from 'next/server';
import {
  isLinkedChat,
  isValidLinkCode,
  linkChat,
  parseStatusCallback,
  refFromAdminLink,
  sendTelegramMessage,
  statusKeyboard,
  tg,
  webhookSecret,
  type NoticeRef,
} from '@/lib/telegram';
import {
  addInquiryMessage,
  addServiceRequestMessage,
  replyToContactMessage,
  setInquiryStatus,
  setServiceRequestStatus,
} from '@/lib/threads';
import { buildWeeklyReport } from '@/lib/weeklyReport';

export const dynamic = 'force-dynamic';

type Chat = { id: number; type: string; title?: string; first_name?: string; last_name?: string; username?: string };
type Entity = { type: string; url?: string };
type Message = {
  message_id: number;
  chat: Chat;
  text?: string;
  entities?: Entity[];
  reply_to_message?: { text?: string; entities?: Entity[] };
};
type Update = {
  message?: Message;
  callback_query?: { id: string; data?: string; message?: { message_id: number; chat: Chat } };
};

const NOT_LINKED =
  "Bu Art Qala galereyasining ichki boti. Ulanish faqat admin panel → Sozlamalar → Telegram'dagi havola orqali bo'ladi.";
const HELP =
  "Yangi so'rovlar shu yerga keladi.\n\n" +
  "• Mijozga javob: so'rov xabariga <b>Reply</b> qilib yozing — javob saytdagi suhbatga tushadi va mijozga email ketadi.\n" +
  "• Holat: xabar ostidagi tugmalar.\n" +
  '• /hisobot — oxirgi 7 kunlik hisobot.';
const STATUS_UZ: Record<string, string> = {
  NEW: 'Yangi',
  IN_PROGRESS: 'Jarayonda',
  ANSWERED: 'Javob berildi',
  COMPLETED: 'Yakunlandi',
};

// Telegram → site. Every call must carry the secret header we registered
// with setWebhook; anything else is rejected. Always answers 200 to
// Telegram for accepted calls (otherwise it retries the same update).
export async function POST(request: Request) {
  if (request.headers.get('x-telegram-bot-api-secret-token') !== webhookSecret()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const update = (await request.json().catch(() => null)) as Update | null;
  try {
    if (update?.callback_query) await handleCallback(update.callback_query);
    else if (update?.message) await handleMessage(update.message);
  } catch (error) {
    console.error('Telegram webhook error:', error);
  }
  return NextResponse.json({ ok: true });
}

async function handleMessage(msg: Message) {
  const chatId = msg.chat.id;
  const text = (msg.text || '').trim();

  // /start <code> — the only way to link a chat (code from Admin → Settings).
  if (text.startsWith('/start')) {
    const code = text.split(/\s+/)[1];
    if (isValidLinkCode(code)) {
      await linkChat(msg.chat);
      await sendTelegramMessage(chatId, `✅ <b>Ulandingiz!</b>\n\n${HELP}`);
    } else if (await isLinkedChat(chatId)) {
      await sendTelegramMessage(chatId, `Siz allaqachon ulangansiz.\n\n${HELP}`);
    } else {
      await sendTelegramMessage(
        chatId,
        code
          ? "Bu ulanish havolasi eskirgan yoki noto'g'ri. Admin panel → Sozlamalar → Telegram'dan yangisini oling."
          : NOT_LINKED
      );
    }
    return;
  }

  // Everything below is for linked chats only.
  if (!(await isLinkedChat(chatId))) {
    if (msg.chat.type === 'private') await sendTelegramMessage(chatId, NOT_LINKED);
    return;
  }

  if (/^\/(hisobot|report)\b/.test(text)) {
    await sendTelegramMessage(chatId, await buildWeeklyReport());
    return;
  }

  const ref = msg.reply_to_message ? refFromMessage(msg.reply_to_message) : null;
  if (!ref) {
    await sendTelegramMessage(chatId, HELP);
    return;
  }
  if (!text) {
    await sendTelegramMessage(chatId, 'Faqat matnli javob yuborish mumkin.');
    return;
  }

  // A curator's reply to a notification → the customer's thread (+ email).
  const result =
    ref.kind === 'inquiry'
      ? await addInquiryMessage({ id: ref.id, sender: 'ADMIN', message: text })
      : ref.kind === 'service'
      ? await addServiceRequestMessage({ id: ref.id, sender: 'ADMIN', message: text })
      : await replyToContactMessage(ref.id, text);
  await sendTelegramMessage(
    chatId,
    result.ok
      ? ref.kind === 'contact'
        ? '✅ Javob mijozga email orqali yuborildi.'
        : "✅ Javob saytdagi suhbatga qo'shildi va mijozga email yuborildi."
      : `⚠️ Javob saqlanmadi: ${result.error}`
  );
}

// The notification's "Admin panelda ochish" link (…?open=<id>) identifies
// the record a reply belongs to.
function refFromMessage(m: { entities?: Entity[] }): NoticeRef | null {
  for (const e of m.entities || []) {
    if (e.type === 'text_link' && e.url) {
      const ref = refFromAdminLink(e.url);
      if (ref) return ref;
    }
  }
  return null;
}

async function handleCallback(cb: NonNullable<Update['callback_query']>) {
  const chat = cb.message?.chat;
  if (!chat || !(await isLinkedChat(chat.id))) {
    await tg('answerCallbackQuery', { callback_query_id: cb.id, text: 'Ruxsat yo‘q' });
    return;
  }
  const parsed = parseStatusCallback(cb.data);
  if (!parsed || parsed.kind === 'contact') {
    await tg('answerCallbackQuery', { callback_query_id: cb.id });
    return;
  }
  const result =
    parsed.kind === 'inquiry'
      ? await setInquiryStatus(parsed.id, parsed.status)
      : await setServiceRequestStatus(parsed.id, parsed.status);
  await tg('answerCallbackQuery', {
    callback_query_id: cb.id,
    text: result.ok ? `Holat: ${STATUS_UZ[parsed.status] || parsed.status}` : `Xatolik: ${result.error}`,
  });
  if (result.ok && cb.message) {
    await tg('editMessageReplyMarkup', {
      chat_id: chat.id,
      message_id: cb.message.message_id,
      reply_markup: statusKeyboard(parsed),
    });
  }
}
