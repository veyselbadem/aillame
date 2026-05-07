import { NextRequest, NextResponse } from "next/server";
import { handleExternalProviderTask } from "@core/external-provider/handler";
import { externalApiAuthGuard } from "@core/security/external-api-auth";

export async function POST(request: NextRequest) {
  // 1. Auth & Permission Guard
  const auth = await externalApiAuthGuard(request, "task:create");
  if (!auth.allowed && auth.errorResponse) {
    return NextResponse.json(auth.errorResponse.body, { status: auth.errorResponse.status });
  }

  const result = handleExternalProviderTask({
    headers: Object.fromEntries(request.headers.entries()),
    body: await request.json().catch(() => undefined),
  });
  return NextResponse.json(result.body, { status: result.statusCode, headers: result.headers });
}
