import { NextResponse } from 'next/server';
import { runPriceAlerts } from '@/lib/priceAlerts';

export const dynamic = 'force-dynamic';

// Manual/extra trigger for the wishlist price-drop emails. The daily run
// happens inside /api/cron/review-reminders (one cron job for both, so the
// Vercel plan's cron limit isn't an issue). Same CRON_SECRET protection.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const result = await runPriceAlerts();
  return NextResponse.json({ success: true, ...result });
}
