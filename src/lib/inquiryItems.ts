// Shared shape of an inquiry's "lines" — one per painting — so the admin
// panel, the customer's account page and the emails all read a grouped
// (multi-painting) inquiry and an old single-painting one the same way.
//
// - Grouped inquiry: Inquiry.items[] (one InquiryItem per painting, each
//   with its own accessories snapshot and price snapshot).
// - Single inquiry (and every inquiry saved before grouping existed):
//   no items; the painting is Inquiry.painting and its accessories are
//   Inquiry.selected_accessories.
// Inquiry.selected_accessories on a grouped inquiry holds add-ons shared by
// the whole order (only sent by older cached clients) — counted once.

export interface AccessorySnapshot {
  id: string;
  name_en: string;
  name_ru: string;
  name_uz: string;
  price: number;
}

export function parseAccessories(json?: string | null): AccessorySnapshot[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed)
      ? parsed.filter((a) => a && typeof a.id === 'string' && typeof a.price === 'number')
      : [];
  } catch {
    return [];
  }
}

export function sumAccessories(list: AccessorySnapshot[]): number {
  return list.reduce((sum, a) => sum + (Number.isFinite(a.price) ? a.price : 0), 0);
}

interface PaintingLike {
  id: string;
  title_en?: string | null;
  title_ru?: string | null;
  title_uz?: string | null;
  price?: number | null;
  discount_price?: number | null;
  images?: string | null;
  is_sold?: boolean | null;
  artist?: { name: string } | null;
}

interface InquiryItemLike {
  id: string;
  painting_id: string | null;
  painting?: PaintingLike | null;
  title_en: string;
  title_ru?: string | null;
  title_uz?: string | null;
  price: number;
  selected_accessories?: string | null;
  position?: number;
  final_price?: number | null;
}

export interface InquiryLike {
  painting_id: string;
  painting?: PaintingLike | null;
  selected_accessories?: string | null;
  final_price?: number | null;
  items?: InquiryItemLike[] | null;
}

export interface InquiryLine {
  // InquiryItem id, or null for a single-painting inquiry's only line.
  itemId: string | null;
  paintingId: string | null;
  painting: PaintingLike | null;
  title_en: string;
  title_ru: string;
  title_uz: string;
  price: number;
  accessories: AccessorySnapshot[];
  accessoriesTotal: number;
  lineTotal: number;
  // What this painting actually sold for (curator-entered), if agreed.
  finalPrice: number | null;
}

export function isGroupedInquiry(inq: InquiryLike): boolean {
  return Array.isArray(inq.items) && inq.items.length > 0;
}

export function inquiryLines(inq: InquiryLike): InquiryLine[] {
  if (isGroupedInquiry(inq)) {
    return [...(inq.items as InquiryItemLike[])]
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((it) => {
        const accessories = parseAccessories(it.selected_accessories);
        const accessoriesTotal = sumAccessories(accessories);
        return {
          itemId: it.id,
          paintingId: it.painting_id,
          painting: it.painting ?? null,
          title_en: it.painting?.title_en || it.title_en,
          title_ru: it.painting?.title_ru || it.title_ru || it.title_en,
          title_uz: it.painting?.title_uz || it.title_uz || it.title_en,
          price: it.price,
          accessories,
          accessoriesTotal,
          lineTotal: it.price + accessoriesTotal,
          finalPrice: it.final_price ?? null,
        };
      });
  }
  const p = inq.painting ?? null;
  const accessories = parseAccessories(inq.selected_accessories);
  const accessoriesTotal = sumAccessories(accessories);
  const price = p?.discount_price || p?.price || 0;
  return [
    {
      itemId: null,
      paintingId: inq.painting_id,
      painting: p,
      title_en: p?.title_en || 'Artwork',
      title_ru: p?.title_ru || p?.title_en || 'Artwork',
      title_uz: p?.title_uz || p?.title_en || 'Artwork',
      price,
      accessories,
      accessoriesTotal,
      lineTotal: price + accessoriesTotal,
      finalPrice: inq.final_price ?? null,
    },
  ];
}

// Add-ons attached to the whole grouped inquiry (legacy shared selection).
export function sharedAccessories(inq: InquiryLike): AccessorySnapshot[] {
  return isGroupedInquiry(inq) ? parseAccessories(inq.selected_accessories) : [];
}

export function inquiryTotal(inq: InquiryLike): number {
  const lines = inquiryLines(inq).reduce((sum, l) => sum + l.lineTotal, 0);
  return Math.round((lines + sumAccessories(sharedAccessories(inq))) * 100) / 100;
}

// Sum of the per-painting agreed prices of a multi-painting inquiry (null
// until at least one is entered).
export function agreedTotal(inq: InquiryLike): number | null {
  const prices = inquiryLines(inq)
    .map((l) => l.finalPrice)
    .filter((p): p is number => p != null);
  return prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) * 100) / 100 : null;
}

// Server-side: attach the computed lines/total to inquiries before sending
// them to a client, so every screen shows the same server-calculated total.
export function withInquiryTotals<T extends InquiryLike>(inq: T) {
  return {
    ...inq,
    lines: inquiryLines(inq),
    shared_accessories: sharedAccessories(inq),
    total: inquiryTotal(inq),
    agreed_total: agreedTotal(inq),
  };
}

// "Sunset over Khiva" or "Sunset over Khiva + 3 ta kartina" — for email
// subjects and list rows.
export function inquiryTitleUz(inq: InquiryLike): string {
  const lines = inquiryLines(inq);
  const first = lines[0]?.title_uz || lines[0]?.title_en || 'kartina';
  return lines.length > 1 ? `${first} va yana ${lines.length - 1} ta kartina` : first;
}

export function inquiryTitleEn(inq: InquiryLike): string {
  const lines = inquiryLines(inq);
  const first = lines[0]?.title_en || 'Artwork';
  return lines.length > 1 ? `${first} + ${lines.length - 1} more` : first;
}

// Prisma include for everything the helpers above need.
export const inquiryItemsInclude = {
  orderBy: { position: 'asc' as const },
  include: {
    painting: {
      select: {
        id: true,
        title_en: true,
        title_ru: true,
        title_uz: true,
        price: true,
        discount_price: true,
        images: true,
        is_sold: true,
        artist: { select: { name: true } },
      },
    },
  },
};
