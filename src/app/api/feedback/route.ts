import { NextRequest, NextResponse } from 'next/server';
import { saveFeedback, listFeedback } from '@core/feedback/service';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    if (!payload?.messageId || !payload?.conversationId || !payload?.selectedFeedback) {
      return NextResponse.json({ error: 'Geçersiz geri bildirim verisi.' }, { status: 400 });
    }

    const saved = await saveFeedback(payload);
    return NextResponse.json({ success: true, feedback: saved });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Geri bildirim kaydedilemedi.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const feedback = await listFeedback();
    return NextResponse.json({ success: true, feedback });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Geri bildirimler alınamadı.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
