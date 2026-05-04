import { NextRequest, NextResponse } from 'next/server';
import { createAdminAuthErrorResponse, validateAdminRequest } from '@core/admin-auth/auth';
import { listFeedback } from '@core/feedback/service';
import {
  findFeedbackMemoryWriteQueueRecordByFeedbackId,
  queueMemoryWriteRecordFromFeedback,
} from '@core/memory-write-queue/service';

type MemoryQueueBridgeBody = {
  feedbackId?: unknown;
  proposedMemory?: unknown;
  reason?: unknown;
  includeSensitive?: unknown;
};

function parseBody(payload: unknown): MemoryQueueBridgeBody {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {};
  }

  return payload as MemoryQueueBridgeBody;
}

export async function POST(req: NextRequest) {
  if (!validateAdminRequest(req)) {
    return createAdminAuthErrorResponse();
  }

  let body: MemoryQueueBridgeBody;
  try {
    body = parseBody(await req.json());
  } catch {
    return NextResponse.json({ success: false, error: 'Geçersiz JSON payload.' }, { status: 400 });
  }

  const feedbackId = typeof body.feedbackId === 'string' ? body.feedbackId.trim() : '';
  if (!feedbackId) {
    return NextResponse.json({ success: false, error: 'feedbackId gereklidir.' }, { status: 400 });
  }

  const proposedMemory = typeof body.proposedMemory === 'string' ? body.proposedMemory.trim() : '';
  if (!proposedMemory) {
    return NextResponse.json({ success: false, error: 'proposedMemory gereklidir.' }, { status: 400 });
  }

  const includeSensitive = body.includeSensitive === true;
  const reason = typeof body.reason === 'string' && body.reason.trim().length > 0 ? body.reason.trim() : undefined;

  try {
    const feedbackList = await listFeedback();
    const feedback = feedbackList.find((item) => item.id === feedbackId);

    if (!feedback) {
      return NextResponse.json({ success: false, error: 'Feedback kaydı bulunamadı.' }, { status: 404 });
    }

    if (feedback.sensitive && !includeSensitive) {
      return NextResponse.json(
        { success: false, error: 'Hassas feedback includeSensitive=true olmadan memory queue’ya eklenemez.' },
        { status: 400 }
      );
    }

    const existing = await findFeedbackMemoryWriteQueueRecordByFeedbackId(feedback.id);
    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: 'Bu feedback için memory queue kaydı zaten var.',
          queueId: existing.id,
          status: existing.status,
        },
        { status: 409 }
      );
    }

    const record = await queueMemoryWriteRecordFromFeedback({
      feedback,
      proposedMemory,
      reason,
      includeSensitive,
    });

    return NextResponse.json(
      {
        success: true,
        queueId: record.id,
        status: record.status,
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Memory queue kaydı oluşturulamadı.';

    if (message.includes('zaten var')) {
      return NextResponse.json({ success: false, error: message }, { status: 409 });
    }

    if (message.includes('proposedMemory') || message.includes('Hassas feedback')) {
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }

    return NextResponse.json({ success: false, error: 'Memory queue kaydı oluşturulamadı.' }, { status: 500 });
  }
}