import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '../../models/auth-helper';
import { WorkflowEngine } from '@/services/workflow/workflow-engine.service';
import { BuildHardcodedQuestionPlanStep, AddPlaceholderImageAndConsistencyStep } from '@/services/workflow/test-workflow.steps';
import "@/services/schema/schemas/bademakademi-question.schema"; // Ensure registration

export async function POST(req: NextRequest) {
  const auth = await validateRequest(req);
  if (!auth.isValid) return auth.response!;

  try {
    const result = await WorkflowEngine.run({
      workflowName: "test.two_step_bademakademi_contract",
      input: {
        gradeLevel: 3,
        course: "Matematik",
        topic: "Geometri"
      },
      steps: [
        new BuildHardcodedQuestionPlanStep(),
        new AddPlaceholderImageAndConsistencyStep()
      ],
      finalSchemaId: "bademakademi-question"
    });

    return NextResponse.json({
      ok: result.status === 'success',
      workflow: result
    });
  } catch (error: any) {
    return NextResponse.json({
      ok: false,
      error: {
        code: 'WORKFLOW_INTERNAL_ERROR',
        message: error.message
      }
    }, { status: 500 });
  }
}
