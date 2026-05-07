import { NextRequest, NextResponse } from 'next/server';
import { patchWorkflowService } from '@core/agent/code-agent/patch-workflow-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const workflow = patchWorkflowService.createWorkflow(body);
    
    return NextResponse.json({
      success: true,
      workflow
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : String(err)
    }, { status: 400 });
  }
}
