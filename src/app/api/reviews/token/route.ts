import { NextResponse } from 'next/server';
import { makeFormToken } from '@/lib/reviewGuard';

export const dynamic = 'force-dynamic';

// GET /api/reviews/token — the signed "form opened at" token a review form
// sends back with its POST (see src/lib/reviewGuard.ts).
export async function GET() {
  return NextResponse.json({ token: makeFormToken() }, { headers: { 'Cache-Control': 'no-store' } });
}
