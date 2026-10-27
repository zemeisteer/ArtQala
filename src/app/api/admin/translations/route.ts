import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { pendingTranslations, translatePending } from '@/lib/translateContent';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Admin → Settings → "Tarjimalar": how many catalogue records still lack
// DE/FR/KO/JA/ZH translations (GET), and translate the next batch (POST).
export async function GET() {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;
  const pending = await pendingTranslations();
  return NextResponse.json({ success: true, pending: pending.length, configured: !!process.env.GEMINI_API_KEY });
}

export async function POST() {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ success: false, error: "GEMINI_API_KEY Vercel sozlamalarida yo'q" }, { status: 400 });
  }
  const result = await translatePending(6, 35_000);
  return NextResponse.json({ success: result.failed === 0 || result.done > 0, ...result });
}
