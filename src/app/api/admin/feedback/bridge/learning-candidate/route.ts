import { NextRequest, NextResponse } from 'next/server';
import { createAdminAuthErrorResponse, validateAdminRequest } from '@core/admin-auth/auth';
import { listFeedback } from '@core/feedback/service';
import {
  createLearningCandidateFromFeedbackBridge,
  findLearningCandidateBySourceFeedbackId,
} from '@core/learning-candidates/service';
import { getFeedbackLearningCandidateEligibility } from '@core/feedback/bridge-rules';

type LearningBridgeBody = {
  feedbackId?: unknown;
  includeSensitive?: unknown;
  reason?: unknown;
};

function parseBody(payload: unknown): LearningBridgeBody {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {};
  }
  return payload as LearningBridgeBody;
}

export async function POST(req: NextRequest) {
  if (!validateAdminRequest(req)) {
    return createAdminAuthErrorResponse();
  }

  let body: LearningBridgeBody;
  try {
    body = parseBody(await req.json());
  } catch {
    return NextResponse.json({ success: false, error: 'Geçersiz JSON payload.' }, { status: 400 });
  }

  const feedbackId = typeof body.feedbackId === 'string' ? body.feedbackId.trim() : '';
  if (!feedbackId) {
    return NextResponse.json({ success: false, error: 'feedbackId gereklidir.' }, { status: 400 });
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
        { success: false, error: 'Sensitive feedback includeSensitive=true olmadan dönüştürülemez.' },
        { status: 400 }
      );
    }

    const eligibility = getFeedbackLearningCandidateEligibility(feedback, { includeSensitive });
    if (!eligibility.eligible) {
      return NextResponse.json(
        { success: false, error: 'Feedback kaydı learning candidate için uygun değil.' },
        { status: 400 }
      );
    }

    const existing = await findLearningCandidateBySourceFeedbackId(feedback.id);
    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: 'Zaten candidate oluşturulmuş.',
          candidateId: existing.id,
          status: existing.status,
        },
        { status: 409 }
      );
    }

    const candidate = await createLearningCandidateFromFeedbackBridge(feedback, {
      includeSensitive,
      reason,
    });

    return NextResponse.json(
      {
        success: true,
        candidateId: candidate.id,
        status: candidate.status,
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Learning candidate oluşturulamadı.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
