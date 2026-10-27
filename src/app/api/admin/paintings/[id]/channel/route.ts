import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { postPaintingToChannel } from '@/lib/telegramChannel';

export const dynamic = 'force-dynamic';

// POST — (re)post this work to the gallery's Telegram channel.
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;
  const { id } = await context.params;
  const result = await postPaintingToChannel(id);
  return NextResponse.json({ success: result.ok, error: result.error }, { status: result.ok ? 200 : 400 });
}
