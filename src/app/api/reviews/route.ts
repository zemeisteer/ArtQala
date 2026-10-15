import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/reviews?painting_id=...
// Returns only approved reviews (is_approved: true) along with average rating
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const painting_id = searchParams.get('painting_id');

    const whereClause: any = { is_approved: true };
    if (painting_id) {
      whereClause.painting_id = painting_id;
    }

    const reviews = await prisma.review.findMany({
      where: whereClause,
      include: {
        painting: {
          select: {
            id: true,
            title_en: true,
            title_ru: true,
            title_uz: true,
            images: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const total_reviews = reviews.length;
    const sum_ratings = reviews.reduce((acc, r) => acc + r.rating, 0);
    const average_rating = total_reviews > 0 ? +(sum_ratings / total_reviews).toFixed(1) : 0;

    return NextResponse.json({
      success: true,
      reviews,
      total_reviews,
      average_rating,
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json(
      { success: false, error: 'Database error' },
      { status: 500 }
    );
  }
}

// POST /api/reviews
// Submits a new review. Only allowed for authenticated users who have an inquiry for this artwork.
// New reviews are saved with is_approved: false (pending admin moderation).
export async function POST(request: Request) {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required. Please sign in to leave a review.',
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { painting_id, rating, text, author_name } = body;

    if (!text || !text.trim()) {
      return NextResponse.json(
        { success: false, error: 'Review text is required' },
        { status: 400 }
      );
    }

    if (!painting_id) {
      return NextResponse.json(
        { success: false, error: 'Painting ID is required' },
        { status: 400 }
      );
    }

    // Verify that the user has a valid inquiry for this specific artwork
    const existingInquiry = await prisma.inquiry.findFirst({
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

    if (!existingInquiry) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Only verified collectors who have inquired about or acquired this artwork can leave a review.',
        },
        { status: 403 }
      );
    }

    const numericRating = Math.min(5, Math.max(1, parseInt(rating) || 5));
    const name = author_name || session.name || 'Verified Collector';

    const review = await prisma.review.create({
      data: {
        user_id: session.id,
        painting_id,
        author_name: name,
        rating: numericRating,
        text: text.trim(),
        is_approved: false, // Moderatsiya talab qilinadi (TZ 8.12)
      },
      include: {
        painting: {
          select: {
            id: true,
            title_en: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      review,
      message:
        'Thank you! Your review has been submitted and will be visible after admin approval.',
    });
  } catch (error) {
    console.error('Review submission error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit review' },
      { status: 500 }
    );
  }
}
