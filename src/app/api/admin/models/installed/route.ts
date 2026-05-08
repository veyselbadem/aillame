import { NextRequest, NextResponse } from "next/server";
import { activeGgufModelService } from "@/core/models/download/active-gguf-model-service";
import { createAdminAuthErrorResponse, validateAdminRequest } from "@core/admin-auth/auth";

export async function GET(request: NextRequest) {
  if (!validateAdminRequest(request)) return createAdminAuthErrorResponse();
  return NextResponse.json({
    success: true,
    models: activeGgufModelService.listInstalledGgufModels(),
    activeModel: activeGgufModelService.getActiveGgufModel(),
  });
}
