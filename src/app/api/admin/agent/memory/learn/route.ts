import { NextRequest, NextResponse } from "next/server";
import { AgentMemoryService } from "@/core/agent/memory/service";

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
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
