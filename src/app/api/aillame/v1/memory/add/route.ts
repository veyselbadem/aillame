import { NextRequest, NextResponse } from "next/server";
import { VectorStoreService } from "@/services/rag/vector-store.service";
import { ApiResponseHelper } from "@/utils/api-response";
import { randomUUID } from "crypto";

/**
 * Faz 2.2: Memory Add API
 * POST /api/aillame/v1/memory/add
 */
export async function POST(req: NextRequest) {
  try {
    // Auth Check (Basic for now)
    const apiKey = req.headers.get("x-api-key");
    if (apiKey !== "default_admin_key") {
       return NextResponse.json(ApiResponseHelper.error("UNAUTHORIZED", "Geçersiz API anahtarı."), { status: 401 });
    }

    const { text, metadata } = await req.json();

    if (!text) {
      return NextResponse.json(ApiResponseHelper.error("MISSING_FIELD", "text alanı zorunludur."), { status: 400 });
    }

    const id = metadata?.id || `mem_${Date.now()}_${randomUUID().substring(0, 8)}`;
    
    await VectorStoreService.upsertDocument(id, text, metadata || {});

    return NextResponse.json(ApiResponseHelper.success({
      id,
      text: text.substring(0, 50) + "...",
      status: "indexed"
    }, "Hafıza başarıyla eklendi."));

  } catch (error: any) {
    console.error("[MemoryAddAPI] Error:", error);
    return NextResponse.json(ApiResponseHelper.error("INTERNAL_ERROR", error.message), { status: 500 });
  }
}
