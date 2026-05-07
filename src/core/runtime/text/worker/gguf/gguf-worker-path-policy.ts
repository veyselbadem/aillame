import * as path from "path";
import { getDefaultModelDir } from "./gguf-worker-config";

export type AillameGgufPathPolicyResult = {
  allowed: boolean;
  reason?: string;
  isExternal: boolean;
  normalizedPath: string;
};

export function validateGgufModelPath(
  modelPath: string | undefined,
  options: { allowExternalModels?: boolean } = {}
): AillameGgufPathPolicyResult {
  if (!modelPath) {
    return { allowed: false, reason: "No path provided", isExternal: false, normalizedPath: "" };
  }

  const normalized = path.resolve(modelPath);
  const defaultDir = path.resolve(getDefaultModelDir());
  const projectRoot = path.resolve(process.cwd());

  const isInside = (candidate: string, parent: string): boolean => {
    const relative = path.relative(parent, candidate);
    return relative === "" || Boolean(relative) && !relative.startsWith("..") && !path.isAbsolute(relative);
  };
  
  // Rule 1: Models should ideally be in the project's models/gguf folder
  const isInsideDefault = isInside(normalized, defaultDir);
  
  // Rule 2: Prevent relative path traversal outside root (basic check via resolve)
  const isInsideProject = isInside(normalized, projectRoot);

  if (isInsideDefault || isInsideProject) {
    return {
      allowed: true,
      isExternal: !isInsideDefault,
      normalizedPath: normalized,
    };
  }

  if (options.allowExternalModels) {
    return {
      allowed: true,
      isExternal: true,
      normalizedPath: normalized,
    };
  }

  return {
    allowed: false,
    reason: "Model path is outside the allowed project workspace. Move GGUF models to models/gguf/ or set AILLAME_GGUF_ALLOW_EXTERNAL=true for an explicit local model path.",
    isExternal: true,
    normalizedPath: normalized,
  };
}
