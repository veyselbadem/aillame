import { FileReadPolicy } from "../file-reader/file-read-policy";

export class PatchPolicy {
  private readPolicy = new FileReadPolicy();

  isAllowed(relativePath: string): { allowed: boolean; reason?: string } {
    const result = this.readPolicy.isAllowed(relativePath);
    if (!result.allowed) {
      return { allowed: false, reason: `Patching blocked: ${result.reason}` };
    }

    // Additional patch-specific blocks
    const lowerPath = relativePath.toLowerCase();
    if (lowerPath.includes("package.json") || lowerPath.includes("package-lock.json")) {
      return { allowed: false, reason: "Manual update required for core project configuration files." };
    }

    return { allowed: true };
  }
}
