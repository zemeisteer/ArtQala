import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Lightweight per-section row counts for the admin sidebar badges and the
// dashboard's content-inventory cards — kept as one small endpoint (instead
// of each page computing its own count) so both stay in sync.
export async function GET() {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const [
      paintings,
      artists,
      categories,
      discounts,
      accessories,
      inquiries,
      services,
      messages,
      customers,
      reviews,
      staff,
    ] = await Promise.all([
      prisma.painting.count(),
      prisma.artist.count(),
      prisma.category.count(),
      prisma.discount.count(),
      prisma.accessory.count(),
      prisma.inquiry.count(),
      prisma.serviceRequest.count(),
      prisma.contactMessage.count(),
      // Matches /admin/customers, which lists every registered account
      // (not just role === 'USER') without filtering.
      prisma.user.count(),
      prisma.review.count(),
      prisma.user.count({ where: { role: 'ADMIN' } }),
    ]);

    return NextResponse.json({
      success: true,
      counts: {
        paintings,
        artists,
        categories,
        discounts,
        accessories,
        inquiries,
        services,
        messages,
        customers,
        reviews,
        staff,
      },
    });
  } catch (error) {
    console.error('Fetch nav counts error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch counts' }, { status: 500 });
  }
}
