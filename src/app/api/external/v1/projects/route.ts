import { NextRequest, NextResponse } from "next/server";
import { handleExternalProviderProjects } from "@core/external-provider/handler";
import { externalApiAuthGuard } from "@core/security/external-api-auth";

export async function GET(request: NextRequest) {
  // 1. Auth & Permission Guard
  const auth = await externalApiAuthGuard(request, "project:read");
  if (!auth.allowed && auth.errorResponse) {
    return NextResponse.json(auth.errorResponse.body, { status: auth.errorResponse.status });
  }

  const result = handleExternalProviderProjects(Object.fromEntries(request.headers.entries()));
  return NextResponse.json(result.body, { status: result.statusCode, headers: result.headers });
}
