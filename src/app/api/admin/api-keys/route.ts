import { NextRequest, NextResponse } from "next/server";
import { ApiKeyService } from "@core/security/api-key-service";
import { createAdminAuthErrorResponse, validateAdminRequest } from "@core/admin-auth/auth";

const apiKeyService = new ApiKeyService();

export async function GET(request: NextRequest) {
  if (!validateAdminRequest(request)) return createAdminAuthErrorResponse();
  const keys = apiKeyService.listApiKeys();
  return NextResponse.json({ success: true, keys });
}

export async function POST(request: NextRequest) {
  if (!validateAdminRequest(request)) return createAdminAuthErrorResponse();
  const body = await request.json().catch(() => ({}));
  
  const result = apiKeyService.createApiKey({
    label: body.label || "Unnamed Key",
    projectIds: body.projectIds,
    permissions: body.permissions,
    expiresInDays: body.expiresInDays
  });

  return NextResponse.json(result);
}
