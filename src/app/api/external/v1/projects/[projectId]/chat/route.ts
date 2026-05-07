import { NextRequest, NextResponse } from "next/server";
import { handleExternalProviderChat } from "@core/external-provider/handler";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  const params = await context.params;
  const result = await handleExternalProviderChat({
    headers: Object.fromEntries(request.headers.entries()),
    body: await request.json().catch(() => undefined),
    projectIdOverride: params.projectId,
  });
  return NextResponse.json(result.body, { status: result.statusCode, headers: result.headers });
}
