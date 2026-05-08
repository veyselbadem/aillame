import { NextRequest, NextResponse } from "next/server";
import { WorkspaceScanner } from "@/core/agent/workspace-scanner/workspace-scanner";
import { WorkspaceContextBuilder } from "@/core/agent/planner/workspace-context-builder";
import { TaskIntentDetector } from "@/core/agent/planner/task-intent-detector";
import { AgentPlanBuilder } from "@/core/agent/planner/agent-plan-builder";
import { errorMessage, professionalErrorResponse } from "@/core/error/formatter";

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

  const { workspacePath, userTask, maxDepth, maxFiles } = body;

  if (!workspacePath || !userTask) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_PARAMS", message: "workspacePath ve userTask zorunludur." } },
      { status: 400 }
    );
  }

  // 3. Orchestrate Planning
  try {
    // A. Scan Workspace
    const scanner = new WorkspaceScanner();
    const scanSummary = await scanner.scan({
      workspacePath,
      maxDepth: maxDepth || 4,
      maxFiles: maxFiles || 1000
    });

    // B. Build Context
    const contextBuilder = new WorkspaceContextBuilder();
    const context = contextBuilder.build(scanSummary);

    // C. Detect Intent
    const intentDetector = new TaskIntentDetector();
    const intent = intentDetector.detect(userTask);

    // D. Build Plan
    const planBuilder = new AgentPlanBuilder();
    const plan = planBuilder.build(userTask, intent, context);

    return NextResponse.json(plan);
  } catch (error) {
    const message = errorMessage(error, "Agent planning failed.");
    const code = message.startsWith("UNSAFE_PATH") ? "UNSAFE_PATH" : "FILE_OPERATION_FAILED";
    return NextResponse.json(
      professionalErrorResponse(code, message),
      { status: 400 }
    );
  }
}
