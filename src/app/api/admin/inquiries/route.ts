import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { inquiryItemsInclude, withInquiryTotals } from '@/lib/inquiryItems';

export const dynamic = 'force-dynamic';

// GET /api/admin/inquiries — used by the admin panel to poll for new
// inquiries/messages without requiring a manual page reload.
export async function GET() {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const inquiries = await prisma.inquiry.findMany({
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
          },
        },
        messages: {
          orderBy: { created_at: 'asc' },
        },
        items: inquiryItemsInclude,
      },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json({ success: true, inquiries: inquiries.map(withInquiryTotals) });
  } catch (error) {
    console.error('Error fetching admin inquiries:', error);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
