import { NextResponse } from "next/server";
import { activeGgufModelService } from "@/core/models/download/active-gguf-model-service";

export async function GET() {
  return NextResponse.json({
    success: true,
    models: activeGgufModelService.listInstalledGgufModels(),
    activeModel: activeGgufModelService.getActiveGgufModel(),
  });
}
