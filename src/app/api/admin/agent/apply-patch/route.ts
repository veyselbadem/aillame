import { NextRequest, NextResponse } from "next/server";
import { PatchApplyEngine } from "@/core/agent/safe-write/patch-apply-engine";

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
  } catch (error: any) {
    const code = error.message.includes("APPROVAL_REQUIRED") ? "APPROVAL_REQUIRED" : "PATCH_APPLY_FAILED";
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code, 
          message: error.message 
        } 
      },
      { status: 400 }
    );
  }
}
