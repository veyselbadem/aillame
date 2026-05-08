import { NextRequest, NextResponse } from "next/server";
import { PatchApplyEngine } from "@/core/agent/safe-write/patch-apply-engine";
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

  const { workspacePath, proposal, approval, options } = body;

  if (!workspacePath || !proposal || !approval) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_PARAMS", message: "workspacePath, proposal ve approval zorunludur." } },
      { status: 400 }
    );
  }

  try {
    // 3. Apply Patch
    const engine = new PatchApplyEngine();
    const result = await engine.apply({
      workspacePath,
      proposal,
      approval,
      options
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = errorMessage(error, "Patch apply failed.");
    const code = message.includes("DRY_RUN_REQUIRED")
      ? "DRY_RUN_REQUIRED"
      : message.includes("APPROVAL_REQUIRED")
      ? "INVALID_PARAMS"
      : "FILE_OPERATION_FAILED";
    return NextResponse.json(
      professionalErrorResponse(code, message),
      { status: 400 }
    );
  }
}
