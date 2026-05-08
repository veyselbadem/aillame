import { NextRequest, NextResponse } from "next/server";
import { modelDownloadService } from "@/core/models/download/model-download-service";
import { createAdminAuthErrorResponse, validateAdminRequest } from "@core/admin-auth/auth";

export async function POST(request: NextRequest, context: { params: Promise<{ jobId: string }> }) {
  if (!validateAdminRequest(request)) return createAdminAuthErrorResponse();
  try {
    const { jobId } = await context.params;
    return NextResponse.json(modelDownloadService.cancelDownloadJob(jobId));
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Download cancel failed.",
    }, { status: 400 });
  }
}
