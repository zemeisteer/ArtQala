import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { translateAfterSave } from '@/lib/translateContent';
import { parseWorkshopInput } from '@/lib/workshops';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: Ctx) {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;
  const { id } = await context.params;
  const parsed = parseWorkshopInput(await request.json().catch(() => ({})));
  if ('error' in parsed) return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
  // Edited texts get fresh machine translations for the extra languages.
  const workshop = await prisma.workshop.update({ where: { id }, data: { ...parsed.data, translations: null } });
  translateAfterSave('workshop', workshop.id);
  return NextResponse.json({ success: true, workshop });
}

export async function DELETE(_request: Request, context: Ctx) {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;
  const { id } = await context.params;
  await prisma.workshop.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ success: true });
}
