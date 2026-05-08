import { NextRequest, NextResponse } from "next/server";
import { ApiKeyService } from "@core/security/api-key-service";
import { createAdminAuthErrorResponse, validateAdminRequest } from "@core/admin-auth/auth";

const apiKeyService = new ApiKeyService();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ keyId: string }> }
) {
  if (!validateAdminRequest(request)) return createAdminAuthErrorResponse();
  const { keyId } = await params;
  const success = apiKeyService.revokeApiKey(keyId);
  
  if (!success) {
    return NextResponse.json({ success: false, error: "Key not found or already revoked." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
