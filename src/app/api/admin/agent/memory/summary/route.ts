import { NextRequest, NextResponse } from "next/server";
import { AgentMemoryService } from "@/core/agent/memory/service";
import { errorMessage, professionalErrorResponse } from "@/core/error/formatter";

export async function GET(req: NextRequest) {
  const adminToken = req.headers.get("x-aillame-admin-token");
  if (!adminToken || adminToken !== process.env.AILLAME_ADMIN_TOKEN) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await AgentMemoryService.getSummary();
    return NextResponse.json({ success: true, summary });
  } catch (error) {
    return NextResponse.json(
      professionalErrorResponse("FILE_OPERATION_FAILED", errorMessage(error, "Memory summary retrieval failed.")),
      { status: 500 }
    );
  }
}
