import { NextRequest, NextResponse } from 'next/server';
import { UnifiedRouter, UnifiedRequest } from '../../../../../core/orchestrator/unified-router';
import { validateRequest } from '../../models/auth-helper';
import { ApiResponseHelper } from '../../../../../utils/api-response';

/**
 * Faz 10: Aillame Unified API Execute Endpoint
 * Akıllı yönlendirme ve workflow tetikleme noktası.
 */
export async function POST(req: NextRequest) {
  // 1. Auth Validation
  const auth = await validateRequest(req);
  if (!auth.isValid) return auth.response!;

  try {
    const body = await req.json();

    // 2. Validate input
    if (!body.prompt) {
      return NextResponse.json(ApiResponseHelper.error("PROMPT_REQUIRED", "İşlem için prompt zorunludur."), { status: 400 });
    }

    const unifiedRequest: UnifiedRequest = {
      prompt: body.prompt,
      context: body.context,
      sourceApp: body.sourceApp,
      metadata: body.metadata
    };

    // 3. Execute via Unified Router
    const result = await UnifiedRouter.execute(unifiedRequest);

    // 4. Return standardized response
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });

  } catch (error: any) {
    console.error("[Unified API Error]:", error);
    return NextResponse.json(ApiResponseHelper.error("EXECUTION_ERROR", error.message || "İşlem sırasında beklenmedik hata."), { status: 500 });
  }
}
