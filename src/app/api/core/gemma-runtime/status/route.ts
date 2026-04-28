import { NextResponse } from 'next/server';
import { getGemmaRuntimeStatus } from '@/core/local-runtime/gemma-runtime-manager';

export const runtime = 'nodejs';

export async function GET() {
  const status = await getGemmaRuntimeStatus();
  return NextResponse.json(status);
}
