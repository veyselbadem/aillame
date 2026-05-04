import { NextResponse } from 'next/server';
import { getGemmaRuntimeStatus } from '@/core/local-runtime/gemma-runtime-manager';
import { getGemmaWarmupSnapshot } from '@/core/local-runtime/gemma-startup';
import { getTextRuntimeRouterStatus } from '@/core/inference/text-runtime-router';

export const runtime = 'nodejs';

export async function GET() {
  const status = await getGemmaRuntimeStatus();
  const warmup = getGemmaWarmupSnapshot();
  const internalTextRuntime = await getTextRuntimeRouterStatus();

  return NextResponse.json({
    ...status,
    startOnAppBoot: warmup.startOnAppBoot,
    warmupStatus: warmup.warmupStatus,
    lastWarmupError: warmup.lastWarmupError,
    starting: status.starting || warmup.starting,
    internalTextRuntime,
  });
}
