import { NextRequest, NextResponse } from 'next/server';
import { patchWorkflowService } from '@core/agent/code-agent/patch-workflow-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workflowId: string; action: string }> }
) {
  const { workflowId, action } = await params;
  
  try {
    const body = await request.json();
    const { token, mode } = body;

    const workflow = patchWorkflowService.getWorkflow(workflowId);
    if (!workflow) {
      return NextResponse.json({ success: false, error: "Workflow not found" }, { status: 404 });
    }

    if (action === 'approve') {
      const success = await patchWorkflowService.approveWorkflow(workflowId, token);
      return NextResponse.json({ success, workflow: patchWorkflowService.getWorkflow(workflowId) });
    }

    if (action === 'apply' || action === 'dry-run') {
      const result = await patchWorkflowService.applyWorkflow({
        workflowId,
        approvalToken: token,
        mode: action === 'dry-run' ? 'dry-run' : (mode || 'apply')
      });
      return NextResponse.json(result);
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : String(err)
    }, { status: 400 });
  }
}
