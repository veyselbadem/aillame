import { NextRequest, NextResponse } from "next/server";
import { handleExternalProviderProjects } from "@core/external-provider/handler";

export function GET(request: NextRequest) {
  const result = handleExternalProviderProjects(Object.fromEntries(request.headers.entries()));
  return NextResponse.json(result.body, { status: result.statusCode, headers: result.headers });
}
