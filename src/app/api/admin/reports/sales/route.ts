import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { getSaleDetailsByPainting } from '@/lib/salePrices';
import { buildXlsx, type Cell } from '@/lib/xlsx';

export const dynamic = 'force-dynamic';

const DAY_MS = 24 * 60 * 60 * 1000;
const isDay = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

// GET /api/admin/reports/sales?from=YYYY-MM-DD&to=YYYY-MM-DD (both optional,
// inclusive) → an Excel file of every sold painting in the period: date,
// painting, artist, listed price, the price it actually sold for (agreed in
// an inquiry, or typed in the Paintings form) and the buyer when known —
// plus a per-artist summary sheet.
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const fromDate = isDay(from) ? new Date(`${from}T00:00:00Z`) : null;
  const toDate = isDay(to) ? new Date(new Date(`${to}T00:00:00Z`).getTime() + DAY_MS) : null;

  try {
    const sold = await prisma.painting.findMany({
      where: { is_sold: true },
      select: {
        id: true,
        title_uz: true,
        title_en: true,
        price: true,
        discount_price: true,
        sold_at: true,
        updated_at: true,
        artist: { select: { name: true } },
        category: { select: { name_uz: true, parent: { select: { name_uz: true } } } },
      },
    });
    // Older sales have no sold_at — their last update is the best guess.
    const soldDate = (p: (typeof sold)[number]) => p.sold_at || p.updated_at;
    const inRange = sold
      .filter((p) => (!fromDate || soldDate(p) >= fromDate) && (!toDate || soldDate(p) < toDate))
      .sort((a, b) => soldDate(a).getTime() - soldDate(b).getTime());

    const details = await getSaleDetailsByPainting(inRange.map((p) => p.id));
    const sourceLabel = { inquiry: "So'rov orqali", manual: "Qo'lda yozilgan" } as const;

    const header: Cell[] = [
      'Sotilgan sana',
      'Kartina',
      'Rassom',
      'Turi',
      'Saytdagi narx ($)',
      'Sotilgan narx ($)',
      'Narx manbasi',
      'Xaridor',
    ];
    let listedTotal = 0;
    let soldTotal = 0;
    const byArtist = new Map<string, { count: number; total: number }>();
    const rows: Cell[][] = inRange.map((p) => {
      const listed = p.discount_price || p.price;
      const detail = details.get(p.id);
      const salePrice = detail?.price ?? listed;
      listedTotal += listed;
      soldTotal += salePrice;
      const artist = p.artist?.name || '—';
      const agg = byArtist.get(artist) || { count: 0, total: 0 };
      byArtist.set(artist, { count: agg.count + 1, total: agg.total + salePrice });
      return [
        soldDate(p).toISOString().slice(0, 10),
        p.title_uz || p.title_en,
        artist,
        p.category?.parent?.name_uz || p.category?.name_uz || '',
        listed,
        salePrice,
        detail ? sourceLabel[detail.source] : 'Narx yozilmagan (saytdagi narx olindi)',
        detail?.customer || '',
      ];
    });
    rows.push([], ['JAMI', `${inRange.length} ta kartina`, '', '', listedTotal, soldTotal, '', '']);

    const artistRows: Cell[][] = [
      ['Rassom', 'Sotilgan kartinalar', 'Jami ($)'],
      ...Array.from(byArtist.entries())
        .sort((a, b) => b[1].total - a[1].total)
        .map(([name, a]): Cell[] => [name, a.count, a.total]),
      [],
      ['JAMI', inRange.length, soldTotal],
    ];

    const file = buildXlsx([
      { name: 'Sotuvlar', rows: [header, ...rows], widths: [14, 34, 24, 18, 16, 16, 30, 24], moneyCols: [4, 5] },
      { name: "Rassomlar bo'yicha", rows: artistRows, widths: [28, 20, 14], moneyCols: [2] },
    ]);

    const period = `${isDay(from) ? from : 'boshidan'}_${isDay(to) ? to : new Date().toISOString().slice(0, 10)}`;
    return new NextResponse(new Uint8Array(file), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="artqala-savdo-${period}.xlsx"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Sales report error:', error);
    return NextResponse.json({ success: false, error: 'Hisobotni tayyorlab bo\'lmadi' }, { status: 500 });
  }
}
