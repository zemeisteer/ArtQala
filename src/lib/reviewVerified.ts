// Reviews before REVIEWS_OPENED_AT could only come from people with an
// inquiry for that work, so they all count as verified. Since then anyone
// can write one, and only a reviewer whose account has an inquiry for the
// painting is linked to it (user_id) — see POST /api/reviews.
const REVIEWS_OPENED_AT = Date.parse('2026-10-26T00:00:00Z');

export function isVerifiedReview(review: { user_id?: string | null; created_at: string | Date }): boolean {
  return !!review.user_id || new Date(review.created_at).getTime() < REVIEWS_OPENED_AT;
}
