import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '../../../models/auth-helper';
import { BossSourceBoundedService } from '@/services/projects/boss/boss-source-bounded.service';
import "@/services/schema/schemas/boss-analysis.schema"; // Ensure registration

export async function POST(req: NextRequest) {
  const auth = await validateRequest(req);
  if (!auth.isValid) return auth.response!;

  try {
    const body = await req.json().catch(() => ({}));
    const result = await BossSourceBoundedService.analyze(body);

    if (result.status === 'failed') {
      return NextResponse.json({
        ok: false,
        error: result.error || { code: 'BOSS_ANALYSIS_FAILED', message: 'Analysis failed.' },
        workflow: result
      }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      project: "boss",
      workflow: {
        workflowId: result.workflowId,
        workflowName: result.workflowName,
        status: result.status,
        steps: result.steps
      },
      analysis: result.output
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
