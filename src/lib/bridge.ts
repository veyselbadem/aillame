/**
 * Aillame Hibrit Köprüsü (Tauri + Web)
 * Bu modül, uygulamanın çalıştığı ortamı algılar ve 
 * istekleri doğru katmana (Rust veya HTTP API) yönlendirir.
 */

export const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined;

export interface BridgeRequest {
  path: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  tauriCommand?: string; // Eğer masaüstündeyse çağrılacak Rust komutu
}

/**
 * Merkezi istek yöneticisi
 */
export async function request<T>(req: BridgeRequest): Promise<T> {
  // 1. Masaüstü (Tauri) Yolu
  if (isTauri && req.tauriCommand) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      console.log(`[Bridge] Native Invoke: ${req.tauriCommand}`, req.body);
      return await invoke<T>(req.tauriCommand, req.body || {});
    } catch (err) {
      console.log(`[Bridge] Native Invoke (${req.tauriCommand}) için fallback yapılıyor:`, err);
      // Eğer Rust komutu henüz hazır değilse veya hata verirse API'ye fallback yap
    }
  }

  // 2. Web / API Fallback Yolu
  console.log(`[Bridge] API Fetch: ${req.method || 'GET'} ${req.path}`);
  const response = await fetch(req.path, {
    method: req.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    body: (req.method && req.method !== 'GET') && req.body ? JSON.stringify(req.body) : undefined,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP Hata: ${response.status}`);
  }

  return await response.json();
}
