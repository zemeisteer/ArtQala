import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { parseWorkshopInput } from '@/lib/workshops';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;
  const workshops = await prisma.workshop.findMany({ orderBy: [{ sort: 'asc' }, { created_at: 'asc' }] });
  return NextResponse.json({ success: true, workshops });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;
  const parsed = parseWorkshopInput(await request.json().catch(() => ({})));
  if ('error' in parsed) return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
  const workshop = await prisma.workshop.create({ data: parsed.data });
  return NextResponse.json({ success: true, workshop });
}
