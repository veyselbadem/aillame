/**
 * Aillame SDK v1.0
 * Minimal TypeScript client for external integration (BOSS, Doomsgame, etc.)
 */
export interface AillameConfig {
  baseUrl: string;
  apiKey: string;
}

export interface GenerateRequest {
  projectId: string;
  task: string;
  input: string;
  mode?: string;
  context?: Record<string, unknown>;
}

export interface GenerateResponse {
  success: boolean;
  content?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

export class AillameClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(config: AillameConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
  }

  private async request<T>(path: string, method: string = 'GET', body?: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-aillame-api-key': this.apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async health() {
    return this.request<{ status: string; provider: string }>('/api/v1/health');
  }

  async capabilities() {
    return this.request<{ modes: string[]; tasks: string[] }>('/api/v1/capabilities');
  }

  async generate(req: GenerateRequest): Promise<GenerateResponse> {
    return this.request<GenerateResponse>('/api/v1/generate', 'POST', req);
  }
}
