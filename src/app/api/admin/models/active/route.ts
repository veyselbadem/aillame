import { NextResponse } from "next/server";
import { activeGgufModelService } from "@/core/models/download/active-gguf-model-service";

export async function GET() {
  return NextResponse.json({ success: true, activeModel: activeGgufModelService.getActiveGgufModel() });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const modelId = typeof body.modelId === "string" ? body.modelId : "";
    const filePath = typeof body.filePath === "string" ? body.filePath : "";
    const approved = body.approved === true;
    if (!modelId || !filePath) {
      return NextResponse.json({ success: false, error: "modelId and filePath are required." }, { status: 400 });
    }
    const activeModel = activeGgufModelService.selectActiveGgufModel({ modelId, filePath, approved });
    return NextResponse.json({ success: true, activeModel });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Active model selection failed.",
    }, { status: 400 });
  }
}
