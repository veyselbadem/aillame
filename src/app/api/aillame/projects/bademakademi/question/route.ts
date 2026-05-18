import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '@/app/api/aillame/models/auth-helper';
import { BademakademiContractService } from '@/services/projects/bademakademi/bademakademi-contract.service';
import "@/services/schema/schemas/bademakademi-question.schema"; // Ensure registration

export async function POST(req: NextRequest) {
  const auth = await validateRequest(req);
  if (!auth.isValid) return auth.response!;

  try {
    const body = await req.json().catch(() => ({}));
    const result = await BademakademiContractService.generateQuestion(body);

    if (result.status === 'failed') {
      return NextResponse.json({
        ok: false,
        error: result.error || 'BADEMAKADEMI_CONTRACT_WORKFLOW_FAILED',
        workflow: result
      }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      project: "bademakademi",
      workflow: {
        workflowId: result.workflowId,
        workflowName: result.workflowName,
        status: result.status,
        steps: result.steps
      },
      question: result.output
    });
  } catch (error: any) {
    if (error.message === 'WORKFLOW_ALREADY_RUNNING') {
      return NextResponse.json({
        ok: false,
        error: 'WORKFLOW_ALREADY_RUNNING',
        message: 'A workflow is already in progress. Please wait.'
      }, { status: 409 });
    }

    return NextResponse.json({
      ok: false,
      error: 'INTERNAL_ERROR',
      message: error.message
    }, { status: 500 });
  }
}
