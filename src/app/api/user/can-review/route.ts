import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const painting_id = searchParams.get('painting_id');

    if (!painting_id) {
      return NextResponse.json({ can_review: false, error: 'painting_id required' });
    }

    const session = await getServerSession();

    if (!session) {
      return NextResponse.json({ can_review: false, reason: 'unauthenticated' });
    }

    // Check if user has an inquiry for this painting
    const inquiry = await prisma.inquiry.findFirst({
      where: {
        // The painting may also be one line of a multi-painting inquiry.
        AND: [
          { OR: [{ painting_id }, { items: { some: { painting_id } } }] },
          {
            OR: [
              { user_id: session.id },
              { guest_email: session.email.toLowerCase() },
            ],
          },
        ],
      },
    });

    if (!inquiry) {
      return NextResponse.json({ can_review: false, reason: 'no_inquiry' });
    }

    // Check if user already submitted a review
    const existingReview = await prisma.review.findFirst({
      where: {
        user_id: session.id,
        painting_id,
      },
    });

    return NextResponse.json({
      can_review: true,
      has_reviewed: !!existingReview,
      review: existingReview || null,
    });
  } catch (error) {
    console.error('Error checking review eligibility:', error);
    return NextResponse.json({ can_review: false, error: 'server_error' }, { status: 500 });
  }
}
