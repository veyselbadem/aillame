import { SENSITIVE_PATTERNS } from "../nano/memory/memory-sanitizer";

export function generateSafeFileId(path: string): string {
  // Simple hash or b64 to hide the real path
  const buffer = Buffer.from(path);
  return buffer.toString('hex').substring(0, 16);
}

export function generateSafeDisplayName(path: string): string {
  // Only the last part of the path
  const parts = path.split(/[\\/]/);
  return parts[parts.length - 1];
}

export function containsSensitiveContent(content: string): boolean {
  // Reuse Nano's sensitive patterns
  for (const pattern of Object.values(SENSITIVE_PATTERNS)) {
    if (pattern.test(content)) return true;
  }
  return false;
}

export function sanitizePathForDisplay(path: string): string {
  // Redact home directory or absolute paths
  return path.replace(/([a-zA-Z]:\\[^\\/]+|^\/[^\\/]+)/, "[ROOT]");
}
