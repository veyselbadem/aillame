import { NextRequest, NextResponse } from "next/server";
import { AgentMemoryService } from "@/core/agent/memory/service";
import { errorMessage, professionalErrorResponse } from "@/core/error/formatter";

export async function POST(req: NextRequest) {
  const adminToken = req.headers.get("x-aillame-admin-token");
  if (!adminToken || adminToken !== process.env.AILLAME_ADMIN_TOKEN) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { audit, userTask, safeRootName } = await req.json();
    if (!audit || !userTask || !safeRootName) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const success = await AgentMemoryService.learnFromAudit(audit, userTask, safeRootName);
    return NextResponse.json({ success });
  } catch (error) {
    return NextResponse.json(
      professionalErrorResponse("FILE_OPERATION_FAILED", errorMessage(error, "Memory learning update failed.")),
      { status: 500 }
    );
  }
}
