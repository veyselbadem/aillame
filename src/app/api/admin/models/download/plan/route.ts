import { NextResponse } from "next/server";
import { modelDownloadService } from "@/core/models/download/model-download-service";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const modelId = typeof body.modelId === "string" ? body.modelId : "";
    const fileName = typeof body.fileName === "string" ? body.fileName : "";
    if (!modelId || !fileName) {
      return NextResponse.json({ success: false, error: "modelId and fileName are required." }, { status: 400 });
    }
    const plan = modelDownloadService.createPlanFromCatalog(modelId, fileName);
    return NextResponse.json({ success: true, plan });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Download plan failed.",
    }, { status: 400 });
  }
}
