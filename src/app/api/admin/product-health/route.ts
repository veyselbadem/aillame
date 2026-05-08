import { NextRequest, NextResponse } from "next/server";
import { ProductHealthService } from "@/core/product-health/service";

export async function GET(req: NextRequest) {
  const adminToken = req.headers.get("x-aillame-admin-token");
  if (!adminToken || adminToken !== process.env.AILLAME_ADMIN_TOKEN) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const health = await ProductHealthService.getHealth();
    return NextResponse.json({ success: true, health });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
