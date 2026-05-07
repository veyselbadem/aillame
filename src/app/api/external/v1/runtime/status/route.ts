import { NextRequest, NextResponse } from "next/server";
import { handleExternalProviderRuntimeStatus } from "@core/external-provider/handler";

export function GET(request: NextRequest) {
  const result = handleExternalProviderRuntimeStatus(Object.fromEntries(request.headers.entries()));
  return NextResponse.json(result.body, { status: result.statusCode, headers: result.headers });
}
