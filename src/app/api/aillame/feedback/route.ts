import { NextRequest, NextResponse } from 'next/server';
import { listFeedback, saveFeedback } from '@core/feedback/service';
import { FEEDBACK_RATINGS } from '@core/feedback/schema-v2';
import { createAdminAuthErrorResponse, validateAdminRequest } from '@core/admin-auth/auth';

const FEEDBACK_RATING_SET = new Set(FEEDBACK_RATINGS);

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    if (payload && typeof payload === 'object' && 'rating' in payload) {
      const rawRating = (payload as { rating?: unknown }).rating;
      const normalizedRating = typeof rawRating === 'string' ? rawRating.trim().toLowerCase() : '';

      if (!FEEDBACK_RATING_SET.has(normalizedRating as (typeof FEEDBACK_RATINGS)[number])) {
        return NextResponse.json(
          { success: false, error: 'Geçersiz rating değeri. Sadece positive veya negative kabul edilir.' },
          { status: 400 }
        );
      }
    }

    const saved = await saveFeedback(payload, 'aillame_feedback_api');

    return NextResponse.json({ success: true, feedback: saved }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Feedback kaydedilemedi.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  if (!validateAdminRequest(req)) {
    return createAdminAuthErrorResponse();
  }

  try {
    const projectId = req.nextUrl.searchParams.get('projectId') ?? undefined;
    const feedback = await listFeedback({ projectId });

    return NextResponse.json({ success: true, feedback }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Feedback listesi alinamadi.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
