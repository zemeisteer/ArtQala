import { prisma } from './prisma';

// The price each sold painting actually went for, as agreed with the buyer
// and entered by the curator in Admin → Inquiries:
// - one painting of a multi-painting inquiry: InquiryItem.final_price;
// - a single-painting inquiry: Inquiry.final_price.
// (A multi-painting inquiry's own final_price is the whole order's total,
// so it is never attributed to its first painting.) The most recently
// updated agreement wins. Paintings without one fall back to their price.
export async function getAgreedPriceByPainting(paintingIds: string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (paintingIds.length === 0) return result;

  const [items, singles] = await Promise.all([
    prisma.inquiryItem.findMany({
      where: { painting_id: { in: paintingIds }, final_price: { not: null } },
      select: { painting_id: true, final_price: true, inquiry: { select: { updated_at: true } } },
    }),
    prisma.inquiry.findMany({
      where: { painting_id: { in: paintingIds }, final_price: { not: null }, items: { none: {} } },
      select: { painting_id: true, final_price: true, updated_at: true },
    }),
  ]);

  const candidates = [
    ...items.map((it) => ({ paintingId: it.painting_id as string, price: it.final_price as number, at: it.inquiry.updated_at })),
    ...singles.map((inq) => ({ paintingId: inq.painting_id, price: inq.final_price as number, at: inq.updated_at })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  for (const c of candidates) {
    if (!result.has(c.paintingId)) result.set(c.paintingId, c.price);
  }
  return result;
}

// What each sold painting actually brought in, for revenue stats and the
// Paintings list:
// 1. the price agreed in an inquiry (getAgreedPriceByPainting) — a sale made
//    through the website keeps working exactly as before;
// 2. otherwise Painting.sold_price, typed in the Paintings form when it was
//    marked sold (the "Asl narxi" button fills the listed price; a sale made
//    outside the website gets its real amount).
// Paintings with neither are left out — callers fall back to the price.
export async function getSalePriceByPainting(paintingIds: string[]): Promise<Map<string, number>> {
  if (paintingIds.length === 0) return new Map();
  const [own, agreed] = await Promise.all([
    prisma.painting.findMany({
      where: { id: { in: paintingIds }, sold_price: { not: null } },
      select: { id: true, sold_price: true },
    }),
    getAgreedPriceByPainting(paintingIds),
  ]);
  const result = new Map<string, number>();
  for (const p of own) if (p.sold_price != null) result.set(p.id, p.sold_price);
  for (const [id, price] of agreed) result.set(id, price);
  return result;
}
