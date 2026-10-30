import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { parseStoryInput } from '@/lib/stories';
import { translateAfterSave } from '@/lib/translateContent';
import { notifyIndexNow } from '@/lib/indexNow';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

// The slug stays as first published, so shared links keep working.
export async function PUT(request: Request, context: Ctx) {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;
  const { id } = await context.params;
  const parsed = parseStoryInput(await request.json().catch(() => ({})));
  if ('error' in parsed) return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
  const before = await prisma.story.findUnique({ where: { id }, select: { published_at: true } });
  if (!before) return NextResponse.json({ success: false, error: 'Topilmadi' }, { status: 404 });
  const story = await prisma.story.update({
    where: { id },
    data: {
      ...parsed.data,
      published_at: parsed.data.published ? before.published_at || new Date() : before.published_at,
    },
  });
  translateAfterSave('story', story.id);
  if (story.published) notifyIndexNow([`/stories/${story.slug}`, '/stories']);
  return NextResponse.json({ success: true, story });
}

export async function DELETE(_request: Request, context: Ctx) {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;
  const { id } = await context.params;
  await prisma.story.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ success: true });
}
