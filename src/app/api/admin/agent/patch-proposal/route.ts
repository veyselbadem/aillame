import { NextRequest, NextResponse } from "next/server";
import { WorkspaceScanner } from "@/core/agent/workspace-scanner/workspace-scanner";
import { WorkspaceContextBuilder } from "@/core/agent/planner/workspace-context-builder";
import { TaskIntentDetector } from "@/core/agent/planner/task-intent-detector";
import { AgentPlanBuilder } from "@/core/agent/planner/agent-plan-builder";
import { DeepContextBuilder } from "@/core/agent/file-reader/deep-context-builder";
import { PatchProposalBuilder } from "@/core/agent/patch-proposal/patch-proposal-builder";

export async function POST(req: NextRequest) {
  // 1. Admin Auth Check
  const adminToken = req.headers.get("x-aillame-admin-token");
  const serverToken = process.env.AILLAME_ADMIN_TOKEN;

  if (!adminToken || adminToken !== serverToken) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Admin yetkisi gerekli." } },
      { status: 401 }
    );
  }

  // 2. Parse Body
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_REQUEST", message: "Geçersiz JSON." } },
      { status: 400 }
    );
  }

  const { workspacePath, userTask, relativePaths } = body;

  if (!workspacePath || !userTask) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_PARAMS", message: "workspacePath ve userTask zorunludur." } },
      { status: 400 }
    );
  }

  try {
    // 3. Orchestrate Full Chain
    const scanner = new WorkspaceScanner();
    const scanSummary = await scanner.scan({ workspacePath });

    const contextBuilder = new WorkspaceContextBuilder();
    const context = contextBuilder.build(scanSummary);

    const intentDetector = new TaskIntentDetector();
    const intent = intentDetector.detect(userTask);

    const planBuilder = new AgentPlanBuilder();
    const plan = planBuilder.build(userTask, intent, context);

    const deepBuilder = new DeepContextBuilder();
    const deepContext = await deepBuilder.build(plan, workspacePath, relativePaths);

    // 4. Build Patch Proposal
    const proposalBuilder = new PatchProposalBuilder();
    const proposal = proposalBuilder.build(deepContext);

    return NextResponse.json(proposal);
  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: error.message.startsWith("UNSAFE_PATH") ? "UNSAFE_PATH" : "PATCH_PROPOSAL_FAILED", 
          message: error.message 
        } 
      },
      { status: 400 }
    );
  }
}
