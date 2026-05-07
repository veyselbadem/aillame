import { NextResponse } from "next/server";
import { modelDownloadService } from "@/core/models/download/model-download-service";

export async function POST(_request: Request, context: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await context.params;
    return NextResponse.json(modelDownloadService.approveDownloadJob(jobId));
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Download approval failed.",
    }, { status: 400 });
  }
}
