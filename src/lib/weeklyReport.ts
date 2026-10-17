import { prisma } from './prisma';
import { getSalePriceByPainting } from './salePrices';
import { tgEscape } from './telegram';
import { SITE_URL } from './siteUrl';

const DAY_MS = 24 * 60 * 60 * 1000;
const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
const day = (d: Date) => d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', timeZone: 'Asia/Tashkent' });

// The last 7 days at a glance, for Telegram: new inquiries / service
// requests / contact messages, what is still waiting for an answer,
// paintings sold and what they brought in, visitors and the most viewed
// painting. Sent every Monday (daily cron) and on demand (/hisobot, or the
// button in Admin → Settings → Telegram).
export async function buildWeeklyReport(now = new Date()): Promise<string> {
  const since = new Date(now.getTime() - 7 * DAY_MS);
  const range = { gte: since, lte: now };

  const [inquiries, services, contacts, waitingInquiries, waitingServices, sold, visits, visitors, topViews] =
    await Promise.all([
      prisma.inquiry.count({ where: { created_at: range } }),
      prisma.serviceRequest.count({ where: { created_at: range } }),
      prisma.contactMessage.count({ where: { created_at: range } }),
      prisma.inquiry.count({ where: { status: 'NEW' } }),
      prisma.serviceRequest.count({ where: { status: 'NEW' } }),
      prisma.painting.findMany({
        where: { is_sold: true, sold_at: range },
        select: { id: true, title_uz: true, title_en: true, price: true, discount_price: true },
      }),
      prisma.siteVisit.count({ where: { created_at: range } }),
      prisma.siteVisit.findMany({ where: { created_at: range, visitor: { not: null } }, distinct: ['visitor'], select: { visitor: true } }),
      prisma.paintingView.groupBy({
        by: ['painting_id'],
        where: { created_at: range },
        _count: { painting_id: true },
        orderBy: { _count: { painting_id: 'desc' } },
        take: 1,
      }),
    ]);

  const salePrices = await getSalePriceByPainting(sold.map((p) => p.id));
  const revenue = sold.reduce((sum, p) => sum + (salePrices.get(p.id) ?? (p.discount_price || p.price)), 0);
  const top = topViews[0]
    ? await prisma.painting.findUnique({ where: { id: topViews[0].painting_id }, select: { title_uz: true, title_en: true } })
    : null;

  const lines = [
    `📊 <b>Haftalik hisobot</b> (${day(since)} – ${day(now)})`,
    '',
    `📨 Yangi so'rovlar: <b>${inquiries}</b>`,
    `🎨 Xizmat so'rovlari: <b>${services}</b>`,
    `✉️ Aloqa xabarlari: <b>${contacts}</b>`,
  ];
  if (waitingInquiries + waitingServices > 0) {
    lines.push(`⏰ Javob kutayotganlar (barchasi): <b>${waitingInquiries + waitingServices}</b>`);
  }
  lines.push('', `🏷 Sotilgan kartinalar: <b>${sold.length}</b> — <b>${money(revenue)}</b>`);
  for (const p of sold.slice(0, 10)) {
    lines.push(`   • ${tgEscape(p.title_uz || p.title_en)} — ${money(salePrices.get(p.id) ?? (p.discount_price || p.price))}`);
  }
  lines.push('', `👥 Saytga kirganlar: <b>${visitors.length || visits}</b> (${visits} ta tashrif)`);
  if (top && topViews[0]) {
    lines.push(`👁 Eng ko'p ko'rilgan: ${tgEscape(top.title_uz || top.title_en)} (${topViews[0]._count.painting_id} marta)`);
  }
  lines.push('', `<a href="${SITE_URL}/admin">Admin panel →</a>`);
  return lines.join('\n');
}

// Monday in Tashkent — the daily cron sends the report on that day only.
export function isReportDay(now = new Date()): boolean {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'Asia/Tashkent' }).format(now) === 'Mon';
}
