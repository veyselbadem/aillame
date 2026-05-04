import { NextRequest, NextResponse } from 'next/server';
import { createMemoryCardFromQueueRecord, listMemoryCards, updateMemoryCardStatus } from '@core/memory-cards/service';
import { createMemoryWriteLog } from '@core/memory-write-log/service';
import { validateAdminRequest, createAdminAuthErrorResponse } from '@core/admin-auth/auth';
import {
  getMemoryWriteQueueRecordById,
  updateMemoryWriteQueueRecordStatus,
} from '@core/memory-write-queue/service';

export async function GET(request: NextRequest) {
  if (!validateAdminRequest(request)) return createAdminAuthErrorResponse();
  try {
    const cards = await listMemoryCards();
    return NextResponse.json({ success: true, cards });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Unable to read memory cards' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!validateAdminRequest(req)) return createAdminAuthErrorResponse();
  let queueId = 'unknown';

  try {
    const payload = await req.json();
    queueId = payload?.queueId ?? 'unknown';
    if (!payload?.queueId) {
      return NextResponse.json({ error: 'queueId gereklidir.' }, { status: 400 });
    }

    const queueRecord = await getMemoryWriteQueueRecordById(queueId);
    if (!queueRecord) {
      await createMemoryWriteLog({
        queueId,
        action: 'error',
        result: 'failed',
        error: 'Memory write kuyruğu kaydı bulunamadı.',
      });
      return NextResponse.json({ error: 'Memory write kuyruğu kaydı bulunamadı.' }, { status: 404 });
    }

    if (queueRecord.status !== 'ready_for_memory_write') {
      await createMemoryWriteLog({
        queueId: queueRecord.id,
        action: 'error',
        result: 'failed',
        error: 'Queue kaydı ready_for_memory_write statüsünde olmalıdır.',
      });
      return NextResponse.json(
        { error: 'Queue kaydı ready_for_memory_write statüsünde olmalıdır.' },
        { status: 400 }
      );
    }

    if (queueRecord.riskLevel === 'high') {
      await createMemoryWriteLog({
        queueId,
        action: 'error',
        result: 'failed',
        error: 'Yüksek riskli kayıtlar ekstra inceleme gerektirir.',
      });
      return NextResponse.json(
        { error: 'Yüksek riskli kayıtlar ekstra inceleme gerektirir.' },
        { status: 400 }
      );
    }

    const economySafetyNote = queueRecord.targetMode === 'economy' ? 'success (economy safety note)' : 'success';
    const card = await createMemoryCardFromQueueRecord(queueRecord);
    const queued = await updateMemoryWriteQueueRecordStatus(queueRecord.id, 'written');

    await createMemoryWriteLog({
      queueId: queueRecord.id,
      memoryCardId: card.id,
      action: 'written',
      result: economySafetyNote,
    });

    return NextResponse.json({ success: true, card, queueRecord: queued });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'MemoryCard oluşturulamadı.';
    const failureQueueId = 'unknown';

    await createMemoryWriteLog({
      queueId: queueId ?? failureQueueId,
      action: 'error',
      result: 'failed',
      error: message,
    });

    if (message.includes('Aynı preview kaydı') || message.includes('ready_for_memory_write') || message.includes('Yüksek riskli')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ error: 'MemoryCard oluşturulurken beklenmeyen bir hata oluştu.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!validateAdminRequest(req)) return createAdminAuthErrorResponse();
  try {
    const payload = await req.json();
    const { id, status } = payload ?? {};

    if (!id) {
      return NextResponse.json({ error: 'id gereklidir.' }, { status: 400 });
    }
    if (!status) {
      return NextResponse.json({ error: 'status gereklidir.' }, { status: 400 });
    }

    if (status !== 'active' && status !== 'archived') {
      return NextResponse.json({ error: 'Geçersiz status değeri.' }, { status: 400 });
    }

    const updated = await updateMemoryCardStatus(id, status);
    if (!updated) {
      return NextResponse.json({ error: 'MemoryCard kaydı bulunamadı.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, card: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'MemoryCard güncellenirken hata oluştu.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
