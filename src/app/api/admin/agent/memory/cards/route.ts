import { NextRequest, NextResponse } from "next/server";
import { AgentMemoryService } from "@/core/agent/memory/service";

export async function GET(req: NextRequest) {
  const adminToken = req.headers.get("x-aillame-admin-token");
  if (!adminToken || adminToken !== process.env.AILLAME_ADMIN_TOKEN) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "20");
    const cards = await AgentMemoryService.getRecentCards(limit);
    return NextResponse.json({ success: true, cards });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
