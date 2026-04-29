import { NextResponse } from 'next/server';
import { warmUpGemmaRuntime } from '@/core/local-runtime/gemma-startup';

export const runtime = 'nodejs';

export async function POST() {
  const result = await warmUpGemmaRuntime({ wait: true });
  const status = result.success ? 200 : result.code === 'runtime_not_configured' ? 400 : 200;
  return NextResponse.json(result, { status });
}
