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
