import { NextRequest, NextResponse } from "next/server";
import { ResultVerifier } from "@/core/agent/execution-audit/result-verifier";

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

  const { workspacePath, applyResult, originalProposal, userTask } = body;

  if (!workspacePath || !applyResult) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_PARAMS", message: "workspacePath ve applyResult zorunludur." } },
      { status: 400 }
    );
  }

  try {
    // 3. Perform Audit
    const verifier = new ResultVerifier();
    const auditResult = verifier.verify({
      workspacePath,
      applyResult,
      originalProposal,
      userTask
    });

    return NextResponse.json(auditResult);
  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: "AUDIT_FAILED", 
          message: error.message 
        } 
      },
      { status: 400 }
    );
  }
}
