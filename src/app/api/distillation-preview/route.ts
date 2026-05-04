import { NextRequest, NextResponse } from 'next/server';
import { createOrUpdateDistillationPreview, listDistillationPreviews, updateDistillationPreviewStatus } from '@core/distillation-preview/service';
import { getLearningCandidateById } from '@core/learning-candidates/service';
import type { DistillationPreviewStatus } from '@core/distillation-preview/types';
import { validateAdminRequest, createAdminAuthErrorResponse } from '@core/admin-auth/auth';

const VALID_PREVIEW_STATUSES: DistillationPreviewStatus[] = [
  'draft',
  'approved_for_memory',
  'rejected',
  'archived',
];

export async function GET(request: NextRequest) {
  if (!validateAdminRequest(request)) return createAdminAuthErrorResponse();
  try {
    const previews = await listDistillationPreviews();
    return NextResponse.json({ success: true, previews });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Distillation preview verisi alınamadı.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!validateAdminRequest(req)) return createAdminAuthErrorResponse();
  try {
    const payload = await req.json();
    if (!payload?.id || payload?.status !== 'approved') {
      return NextResponse.json({ error: 'Yalnızca onaylı learning candidate için preview oluşturulabilir.' }, { status: 400 });
    }

    const candidate = await getLearningCandidateById(payload.id);
    if (!candidate) {
      return NextResponse.json({ error: 'Learning candidate bulunamadı.' }, { status: 404 });
    }

    if (candidate.status !== 'approved') {
      return NextResponse.json({ error: 'Sadece onaylı candidate için preview oluşturulabilir.' }, { status: 400 });
    }

    const preview = await createOrUpdateDistillationPreview(candidate);
    return NextResponse.json({ success: true, preview });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Distillation preview oluşturulamadı.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!validateAdminRequest(req)) return createAdminAuthErrorResponse();
  try {
    const payload = await req.json();
    if (!payload?.id || !payload?.status) {
      return NextResponse.json({ error: 'Geçersiz distillation preview güncelleme verisi.' }, { status: 400 });
    }

    const status = payload.status as DistillationPreviewStatus;
    if (!VALID_PREVIEW_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Geçersiz distillation preview status değeri.' }, { status: 400 });
    }

    const updated = await updateDistillationPreviewStatus(payload.id, status);
    if (!updated) {
      return NextResponse.json({ error: 'Distillation preview bulunamadı.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, preview: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Distillation preview güncellenemedi.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
