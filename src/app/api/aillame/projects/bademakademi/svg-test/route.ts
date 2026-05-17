import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '../../../models/auth-helper';
import { BademakademiSvgImageRuntimeAdapter } from '@/services/projects/bademakademi/svg/bademakademi-svg-image-runtime-adapter';

export async function POST(req: NextRequest) {
  const auth = await validateRequest(req);
  if (!auth.isValid) return auth.response!;

  try {
    const body = await req.json().catch(() => ({}));
    const visualSpec = body.visualSpec;

    if (!visualSpec) {
      return NextResponse.json({
        ok: false,
        error: { code: 'SVG_VISUAL_SPEC_REQUIRED', message: 'visualSpec is required.' }
      }, { status: 400 });
    }

    const result = await BademakademiSvgImageRuntimeAdapter.generate(visualSpec);

    return NextResponse.json({
      ok: true,
      imageResult: result
    });
  } catch (error: any) {
    return NextResponse.json({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: error.message }
    }, { status: 500 });
  }
}
