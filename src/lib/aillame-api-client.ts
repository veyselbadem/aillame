/**
 * Aillame API Client Utilities
 */

export const AILLAME_API_KEY = process.env.NEXT_PUBLIC_AILLAME_API_KEY || "default_admin_key";

export function aillameApiHeaders(extra?: HeadersInit): HeadersInit {
  const headers: Record<string, string> = {
    "x-aillame-api-key": AILLAME_API_KEY,
  };

  if (extra) {
    if (extra instanceof Headers) {
      extra.forEach((value, key) => {
        headers[key] = value;
      });
    } else if (Array.isArray(extra)) {
      extra.forEach(([key, value]) => {
        headers[key] = value;
      });
    } else {
      Object.assign(headers, extra);
    }
  }

  return headers;
}

/**
 * Enhanced fetch with Aillame API authentication and standardized response handling
 */
export async function aillameFetch(url: string, options: RequestInit = {}): Promise<any> {
  const headers = aillameApiHeaders(options.headers);
  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok && !data.degraded) {
    throw {
      status: response.status,
      code: data.error?.code || 'UNKNOWN_ERROR',
      message: data.error?.message || 'Bir hata oluştu.',
      data
    };
  }

  return data;
}
