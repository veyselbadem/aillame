import type { AillameApiHeaders } from "@core/api-gateway/types";

function header(headers: AillameApiHeaders | undefined, name: string): string | undefined {
  if (!headers) return undefined;
  const wanted = name.toLocaleLowerCase("en-US");
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLocaleLowerCase("en-US") !== wanted) continue;
    return Array.isArray(value) ? value[0] : value;
  }
  return undefined;
}

function configuredKeys(): string[] {
  return (process.env.AILLAME_EXTERNAL_API_KEYS ?? process.env.AILLAME_API_KEYS ?? "")
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);
}

export function authorizeExternalProviderRequest(headers?: AillameApiHeaders):
  | { ok: true; mode: "disabled" | "api-key" }
  | { ok: false; statusCode: number; code: string; message: string } {
  const keys = configuredKeys();
  if (keys.length === 0) return { ok: true, mode: "disabled" };

  const explicit = header(headers, "x-aillame-api-key");
  const auth = header(headers, "authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : undefined;
  const provided = explicit ?? bearer;

  if (!provided) {
    return { ok: false, statusCode: 401, code: "EXTERNAL_API_KEY_REQUIRED", message: "Aillame external API key is required." };
  }

  if (!keys.includes(provided)) {
    return { ok: false, statusCode: 403, code: "EXTERNAL_API_KEY_INVALID", message: "Aillame external API key is invalid." };
  }

  return { ok: true, mode: "api-key" };
}
