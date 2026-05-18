import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '../../../models/auth-helper';
import { DoomsgameReadonlyPlanService } from '@/services/projects/doomsgame/doomsgame-readonly-plan.service';
import "@/services/schema/schemas/doomsgame-plan.schema"; // Ensure registration

export async function POST(req: NextRequest) {
  const auth = await validateRequest(req);
  if (!auth.isValid) return auth.response!;

  try {
    const body = await req.json().catch(() => ({}));
    const result = await DoomsgameReadonlyPlanService.plan(body);

    if (result.status === 'failed') {
      return NextResponse.json({
        ok: false,
        error: result.error || { code: 'DOOMSGAME_PLAN_FAILED', message: 'Planning failed.' },
        workflow: result
      }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      project: "doomsgame",
      workflow: {
        workflowId: result.workflowId,
        workflowName: result.workflowName,
        status: result.status,
        steps: result.steps
      },
      plan: result.output
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
