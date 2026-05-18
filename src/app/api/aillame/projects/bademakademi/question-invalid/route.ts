import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '@/app/api/aillame/models/auth-helper';
import { BademakademiContractService } from '@/services/projects/bademakademi/bademakademi-contract.service';
import "@/services/schema/schemas/bademakademi-question.schema"; // Ensure registration

export async function POST(req: NextRequest) {
  const auth = await validateRequest(req);
  if (!auth.isValid) return auth.response!;

  try {
    const result = await BademakademiContractService.generateInvalidQuestion();

    return NextResponse.json({
      ok: result.status === 'success',
      error: result.status === 'failed' ? result.error : undefined,
      workflow: result
    }, { status: result.status === 'failed' ? 400 : 200 });
  } catch (error: any) {
    return NextResponse.json({
      ok: false,
      error: 'INTERNAL_ERROR',
      message: error.message
    }, { status: 500 });
  }
}
