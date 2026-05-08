import { NextRequest, NextResponse } from "next/server";
import { WorkspaceScanner } from "@/core/agent/workspace-scanner/workspace-scanner";

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

  const { workspacePath, maxDepth, maxFiles } = body;

  if (!workspacePath) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_WORKSPACE_PATH", message: "workspacePath zorunludur." } },
      { status: 400 }
    );
  }

  // 3. Scan
  try {
    const scanner = new WorkspaceScanner();
    const summary = await scanner.scan({
      workspacePath,
      maxDepth: maxDepth || 4,
      maxFiles: maxFiles || 1000
    });

    return NextResponse.json({
      success: true,
      summary
    });
  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: error.message.startsWith("UNSAFE_PATH") ? "UNSAFE_PATH" : "SCAN_FAILED", 
          message: error.message 
        } 
      },
      { status: 400 }
    );
  }
}
