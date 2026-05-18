import { NextRequest, NextResponse } from 'next/server';
import { getModelPathHealth } from '@core/models/model-path-health';
import { validateRequest } from '../auth-helper';

export async function GET(req: NextRequest) {
  const auth = await validateRequest(req);
  if (!auth.isValid) return auth.response!;

  try {
    return NextResponse.json(getModelPathHealth());
  } catch (error) {
    return NextResponse.json({
      ok: false,
      readOnly: true,
      error: error instanceof Error ? error.message : 'Model yolu doğrulama sırasında beklenmeyen hata oluştu.',
    }, { status: 500 });
  }
}

