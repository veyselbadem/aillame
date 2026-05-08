import crypto from "crypto";
import { PatchApplyRequest } from "./types";

type DryRunProof = {
  token: string;
  fingerprint: string;
  createdAt: number;
};

const proofs = new Map<string, DryRunProof>();
const TTL_MS = 15 * 60 * 1000;

function stableStringify(value: any): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export class DryRunProofStore {
  static fingerprint(request: PatchApplyRequest): string {
    const approvedChangeIds = [...(request.approval.approvedChangeIds ?? [])].sort();
    const payload = {
      workspacePath: request.workspacePath,
      proposal: request.proposal,
      approvedChangeIds,
    };
    return crypto.createHash("sha256").update(stableStringify(payload)).digest("hex");
  }

  static issue(request: PatchApplyRequest): { token: string; fingerprint: string } {
    const fingerprint = this.fingerprint(request);
    const token = crypto.randomBytes(18).toString("base64url");
    proofs.set(token, { token, fingerprint, createdAt: Date.now() });
    this.prune();
    return { token, fingerprint };
  }

  static validate(request: PatchApplyRequest): boolean {
    const token = request.approval.dryRunToken;
    if (!token) return false;
    const proof = proofs.get(token);
    if (!proof) return false;
    if (Date.now() - proof.createdAt > TTL_MS) {
      proofs.delete(token);
      return false;
    }
    const matches = proof.fingerprint === this.fingerprint(request);
    if (matches) proofs.delete(token);
    return matches;
  }

  private static prune() {
    const now = Date.now();
    for (const [token, proof] of proofs.entries()) {
      if (now - proof.createdAt > TTL_MS) proofs.delete(token);
    }
  }
}
