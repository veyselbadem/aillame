import { NextRequest, NextResponse } from 'next/server';
import { listLearningCandidates, updateLearningCandidateStatus } from '@core/learning-candidates/service';
import type { LearningCandidateStatus } from '@core/learning-candidates/types';
import { validateAdminRequest, createAdminAuthErrorResponse } from '@core/admin-auth/auth';

const VALID_LEARNING_CANDIDATE_STATUSES: LearningCandidateStatus[] = [
  'pending',
  'approved',
  'rejected',
  'archived',
];

export async function GET(request: NextRequest) {
  if (!validateAdminRequest(request)) return createAdminAuthErrorResponse();
  try {
    const candidates = await listLearningCandidates();
    return NextResponse.json({ success: true, candidates });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Learning candidate verisi alınamadı.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!validateAdminRequest(req)) return createAdminAuthErrorResponse();
  try {
    const payload = await req.json();
    if (!payload?.id || !payload?.status) {
      return NextResponse.json({ error: 'Geçersiz learning candidate güncelleme verisi.' }, { status: 400 });
    }

    const status = payload.status as LearningCandidateStatus;
    if (!VALID_LEARNING_CANDIDATE_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Geçersiz learning candidate status değeri.' }, { status: 400 });
    }

    const updated = await updateLearningCandidateStatus(payload.id, status);
    if (!updated) {
      return NextResponse.json({ error: 'Learning candidate bulunamadı.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, candidate: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Learning candidate güncellenemedi.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
