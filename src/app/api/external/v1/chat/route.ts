import { NextRequest, NextResponse } from "next/server";
import { handleExternalProviderChat } from "@core/external-provider/handler";

export async function POST(request: NextRequest) {
  const result = await handleExternalProviderChat({
    headers: Object.fromEntries(request.headers.entries()),
    body: await request.json().catch(() => undefined),
  });
  return NextResponse.json(result.body, { status: result.statusCode, headers: result.headers });
}
