import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '../../models/auth-helper';
import { NanoDecisionEngine } from '@/services/nano/nano-decision-engine.service';
import "@/services/schema/schemas/nano-decision.schema"; // Ensure registration

export async function POST(req: NextRequest) {
  const auth = await validateRequest(req);
  if (!auth.isValid) return auth.response!;

  try {
    const body = await req.json().catch(() => ({}));
    const result = await NanoDecisionEngine.decide(body);

    if (!result.ok) {
      return NextResponse.json(result, { status: result.error?.code === 'NANO_PROMPT_REQUIRED' ? 400 : 500 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({
      ok: false,
      error: {
        code: 'NANO_INTERNAL_ERROR',
        message: error.message
      }
    }, { status: 500 });
  }
}
