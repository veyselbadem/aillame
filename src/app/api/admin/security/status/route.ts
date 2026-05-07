import { NextResponse } from "next/server";
import { ApiKeyService } from "@core/security/api-key-service";
import { PermissionService } from "@core/security/permission-service";
import { RateLimitService } from "@core/security/rate-limit-service";
import { AuditFileStore } from "@core/security/audit-file-store";

const apiKeyService = new ApiKeyService();
const permissionService = new PermissionService();
const rateLimitService = new RateLimitService();
const auditStore = new AuditFileStore();

export async function GET() {
  // TODO: Add admin auth check
  return NextResponse.json({
    success: true,
    status: {
      authEnabled: permissionService.shouldEnforceAuth(),
      apiKeyStore: apiKeyService.getDiagnostics(),
      rateLimit: rateLimitService.getDiagnostics(),
      audit: auditStore.getAuditDiagnostics()
    }
  });
}
