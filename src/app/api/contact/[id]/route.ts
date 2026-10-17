import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { replyToContactMessage } from '@/lib/threads';

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user = await getServerSession();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.contactMessage.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete message error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete message' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user = await getServerSession();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();

    // Sending a reply is the one action that also mutates status/email —
    // everything else (marking read/unread, admin manually setting status)
    // is a plain field update.
    if (typeof body.admin_reply === 'string' && body.admin_reply.trim()) {
      const result = await replyToContactMessage(id, body.admin_reply);
      if (!result.ok) {
        return NextResponse.json({ success: false, error: result.error }, { status: result.status });
      }
      return NextResponse.json({ success: true, message: result.updated, emailSent: result.emailSent });
    }

    const updated = await prisma.contactMessage.update({
      where: { id },
      data: {
        ...(body.is_read !== undefined ? { is_read: Boolean(body.is_read) } : {}),
        ...(body.status ? { status: body.status } : {}),
      },
    });

    return NextResponse.json({ success: true, message: updated });
  } catch (error) {
    console.error('Update message error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update message' },
      { status: 500 }
    );
  }
}
