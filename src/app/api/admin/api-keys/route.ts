import { NextRequest, NextResponse } from "next/server";
import { ApiKeyService } from "@core/security/api-key-service";

const apiKeyService = new ApiKeyService();

export async function GET() {
  // TODO: Add admin auth check
  const keys = apiKeyService.listApiKeys();
  return NextResponse.json({ success: true, keys });
}

export async function POST(request: NextRequest) {
  // TODO: Add admin auth check
  const body = await request.json().catch(() => ({}));
  
  const result = apiKeyService.createApiKey({
    label: body.label || "Unnamed Key",
    projectIds: body.projectIds,
    permissions: body.permissions,
    expiresInDays: body.expiresInDays
  });

  return NextResponse.json(result);
}
