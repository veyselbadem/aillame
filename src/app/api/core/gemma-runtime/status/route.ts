import { NextResponse } from 'next/server';
import { getGemmaRuntimeStatus } from '@/core/local-runtime/gemma-runtime-manager';
import { getGemmaWarmupSnapshot } from '@/core/local-runtime/gemma-startup';

export const runtime = 'nodejs';

export async function GET() {
  const status = await getGemmaRuntimeStatus();
  const warmup = getGemmaWarmupSnapshot();

  return NextResponse.json({
    ...status,
    startOnAppBoot: warmup.startOnAppBoot,
    warmupStatus: warmup.warmupStatus,
    lastWarmupError: warmup.lastWarmupError,
    starting: status.starting || warmup.starting,
  });
}
