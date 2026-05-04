import { NextRequest, NextResponse } from 'next/server';
import { listMemoryWriteQueueRecords, queueMemoryWriteRecordForPreview, updateMemoryWriteQueueRecordStatus } from '@core/memory-write-queue/service';
import type { MemoryWriteQueueStatus } from '@core/memory-write-queue/types';
import { validateAdminRequest, createAdminAuthErrorResponse } from '@core/admin-auth/auth';

const VALID_QUEUE_STATUSES: MemoryWriteQueueStatus[] = ['pending_write', 'ready_for_memory_write', 'written', 'rejected', 'archived'];

export async function GET(request: NextRequest) {
  if (!validateAdminRequest(request)) return createAdminAuthErrorResponse();
  try {
    const records = await listMemoryWriteQueueRecords();
    return NextResponse.json({ success: true, records });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Memory write kuyruğu verisi alınamadı.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!validateAdminRequest(req)) return createAdminAuthErrorResponse();
  try {
    const payload = await req.json();
    if (!payload?.previewId) {
      return NextResponse.json({ error: 'previewId gereklidir.' }, { status: 400 });
    }

    const record = await queueMemoryWriteRecordForPreview(payload.previewId);
    return NextResponse.json({ success: true, record });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Memory write kuyruğa alınamadı.';
    const status = message.includes('bulunamadı') ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: NextRequest) {
  if (!validateAdminRequest(req)) return createAdminAuthErrorResponse();
  try {
    const payload = await req.json();
    if (!payload?.id || !payload?.status) {
      return NextResponse.json({ error: 'Geçersiz memory write kuyruğu güncelleme verisi.' }, { status: 400 });
    }

    const status = payload.status as MemoryWriteQueueStatus;
    if (!VALID_QUEUE_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Geçersiz memory write kuyruğu status değeri.' }, { status: 400 });
    }

    const updated = await updateMemoryWriteQueueRecordStatus(payload.id, status);
    if (!updated) {
      return NextResponse.json({ error: 'Memory write kuyruğu kaydı bulunamadı.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, record: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Memory write kuyruğu güncellenemedi.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
