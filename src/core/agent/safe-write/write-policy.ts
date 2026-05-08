import { PatchPolicy } from "../patch-proposal/patch-policy";

export class WritePolicy {
  private patchPolicy = new PatchPolicy();

  private static MAX_FILE_SIZE = 262144; // 256 KB

  isAllowed(relativePath: string, fileSize: number): { allowed: boolean; reason?: string } {
    // 1. Basic patch policy check
    const policyResult = this.patchPolicy.isAllowed(relativePath);
    if (!policyResult.allowed) return policyResult;

    // 2. Size check
    if (fileSize > WritePolicy.MAX_FILE_SIZE) {
      return { allowed: false, reason: `File is too large for agent writing (${fileSize} bytes).` };
    }

    // 3. Sensitive file double-check (Write specific)
    const lower = relativePath.toLowerCase();
    if (lower.includes("prisma/schema.prisma")) {
      return { allowed: false, reason: "Prisma schema modification is blocked for safety." };
    }

    return { allowed: true };
  }
}
