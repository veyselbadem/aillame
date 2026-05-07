import fs from "fs";
import path from "path";
import crypto from "crypto";
import { GgufDetector } from "../discovery/gguf-detector";

export interface VerifiedGgufModel {
  verified: boolean;
  activeModelCandidate: boolean;
  fileName: string;
  filePath: string;
  sizeBytes: number;
  quantization?: string;
  parameterSize?: string;
  checksum?: string;
  warnings: string[];
  errors: string[];
}

function checksumSha256(filePath: string): string {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

export function verifyLocalGgufModel(filePath: string, expectedChecksum?: string): VerifiedGgufModel {
  const errors: string[] = [];
  const warnings: string[] = [];
  const resolved = path.resolve(filePath);
  const fileName = path.basename(resolved);

  if (!fileName.toLowerCase().endsWith(".gguf")) {
    errors.push("Model file must use .gguf extension.");
  }
  if (!fs.existsSync(resolved)) {
    errors.push("Model file does not exist.");
    return {
      verified: false,
      activeModelCandidate: false,
      fileName,
      filePath: resolved,
      sizeBytes: 0,
      warnings,
      errors,
    };
  }

  let sizeBytes = 0;
  try {
    const stat = fs.statSync(resolved);
    sizeBytes = stat.size;
    fs.accessSync(resolved, fs.constants.R_OK);
  } catch {
    errors.push("Model file is not readable.");
  }

  if (sizeBytes < 1024) {
    errors.push("Model file is too small to be a real GGUF model.");
  }

  const detected = GgufDetector.detectGgufFile(fileName);
  if (!detected) {
    errors.push("GGUF metadata could not be parsed from file name.");
  }

  let checksum: string | undefined;
  if (expectedChecksum) {
    checksum = checksumSha256(resolved);
    if (checksum !== expectedChecksum) {
      errors.push("Checksum mismatch.");
    }
  }

  const verified = errors.length === 0;
  if (!expectedChecksum) warnings.push("No checksum provided; verification is file/metadata only.");

  return {
    verified,
    activeModelCandidate: verified,
    fileName,
    filePath: resolved,
    sizeBytes,
    quantization: detected?.quantization,
    parameterSize: detected?.parameterSize,
    checksum,
    warnings,
    errors,
  };
}

export const verifyDownloadedModel = verifyLocalGgufModel;
