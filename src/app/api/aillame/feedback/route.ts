import { NextRequest, NextResponse } from 'next/server';
import { listFeedback, saveFeedback } from '@core/feedback/service';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const saved = await saveFeedback(payload, 'aillame_feedback_api');

    return NextResponse.json({ success: true, feedback: saved }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Feedback kaydedilemedi.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const projectId = req.nextUrl.searchParams.get('projectId') ?? undefined;
    const feedback = await listFeedback({ projectId });

    return NextResponse.json({ success: true, feedback }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Feedback listesi alinamadi.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
