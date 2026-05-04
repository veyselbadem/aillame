import { NextRequest, NextResponse } from 'next/server';
import { saveFeedback, listFeedback } from '@core/feedback/service';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    if (!payload?.selectedFeedback && !payload?.rating) {
      return NextResponse.json({ error: 'Geçersiz geri bildirim verisi.' }, { status: 400 });
    }

    const saved = await saveFeedback(payload, 'legacy_feedback_api');
    return NextResponse.json({ success: true, feedback: saved });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Geri bildirim kaydedilemedi.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const projectId = req.nextUrl.searchParams.get('projectId') ?? undefined;
    const feedback = await listFeedback({ projectId });
    return NextResponse.json({ success: true, feedback });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Geri bildirimler alınamadı.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
