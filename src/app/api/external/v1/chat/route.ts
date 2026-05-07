import { NextRequest, NextResponse } from "next/server";
import { handleExternalProviderChat } from "@core/external-provider/handler";
import { externalApiAuthGuard } from "@core/security/external-api-auth";
import { rateLimitService } from "@core/security/rate-limit-service";

export async function POST(request: NextRequest) {
  // 1. Auth & Permission Guard
  const auth = await externalApiAuthGuard(request, "chat:write");
  if (!auth.allowed && auth.errorResponse) {
    return NextResponse.json(auth.errorResponse.body, { status: auth.errorResponse.status });
  }

  // 2. Rate Limit
  const identifier = auth.apiKey?.id || request.headers.get('x-forwarded-for') || "anonymous";
  const limit = rateLimitService.checkLimit(identifier);
  if (!limit.allowed) {
    return NextResponse.json({
      success: false,
      error: { code: "rate_limit_exceeded", message: "Too many requests." }
    }, { status: 429 });
  }

  // 3. Handle Request
  const result = await handleExternalProviderChat({
    headers: Object.fromEntries(request.headers.entries()),
    body: await request.json().catch(() => undefined),
  });
  return NextResponse.json(result.body, { status: result.statusCode, headers: result.headers });
}
