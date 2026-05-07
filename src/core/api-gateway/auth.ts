import type { AillameApiHeaders } from "./types";

export type AillameAuthResult =
  | { ok: true; mode: "disabled" | "api-key"; projectId?: string }
  | { ok: false; statusCode: number; code: string; message: string };

function getHeader(headers: AillameApiHeaders | undefined, name: string): string | undefined {
  if (!headers) return undefined;
  const wanted = name.toLocaleLowerCase("en-US");
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLocaleLowerCase("en-US") !== wanted) continue;
    if (Array.isArray(value)) return value[0];
    return value;
  }
  return undefined;
}

function getConfiguredApiKeys(): string[] {
  return (process.env.AILLAME_API_KEYS ?? "")
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);
}

export function authorizeAillameRequest(headers?: AillameApiHeaders): AillameAuthResult {
  const configuredKeys = getConfiguredApiKeys();
  const projectId = getHeader(headers, "x-aillame-project-id");

  if (configuredKeys.length === 0) {
    return { ok: true, mode: "disabled", projectId };
  }

  const rawAuth = getHeader(headers, "authorization");
  const explicitKey = getHeader(headers, "x-aillame-api-key");
  const bearerKey = rawAuth?.startsWith("Bearer ") ? rawAuth.slice("Bearer ".length).trim() : undefined;
  const providedKey = explicitKey ?? bearerKey;

  if (!providedKey) {
    return {
      ok: false,
      statusCode: 401,
      code: "AILLAME_API_KEY_REQUIRED",
      message: "Aillame API key is required.",
    };
  }

  if (!configuredKeys.includes(providedKey)) {
    return {
      ok: false,
      statusCode: 403,
      code: "AILLAME_API_KEY_INVALID",
      message: "Aillame API key is invalid.",
    };
  }

  return { ok: true, mode: "api-key", projectId };
}
