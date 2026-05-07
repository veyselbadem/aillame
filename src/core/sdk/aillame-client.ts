import type {
  AillameChatRequest,
  AillameChatResponse,
  AillameClientOptions,
  AillameMemoryWriteRequest,
  AillameStatusResponse,
  AillameTaskRequest,
} from "./types";
import { AillameSdkError } from "./types";

function trimSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export class AillameClient {
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly projectId: string;
  private readonly mode?: AillameClientOptions["mode"];
  private readonly sourceApp?: string;

  constructor(options: AillameClientOptions) {
    this.baseUrl = trimSlash(options.baseUrl);
    this.apiKey = options.apiKey;
    this.projectId = options.projectId;
    this.mode = options.mode;
    this.sourceApp = options.sourceApp;
  }

  private headers(): HeadersInit {
    return {
      "content-type": "application/json",
      ...(this.apiKey ? { "x-aillame-api-key": this.apiKey } : {}),
    };
  }

  private withDefaults<T extends Record<string, unknown>>(payload: T): T & {
    projectId: string;
    mode?: AillameClientOptions["mode"];
    sourceApp?: string;
  } {
    return {
      ...payload,
      projectId: typeof payload.projectId === "string" ? payload.projectId : this.projectId,
      mode: typeof payload.mode === "string" ? payload.mode as AillameClientOptions["mode"] : this.mode,
      sourceApp: typeof payload.sourceApp === "string" ? payload.sourceApp : this.sourceApp,
    };
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        ...this.headers(),
        ...(init?.headers ?? {}),
      },
    });
    const payload = await response.json().catch(() => undefined);
    if (!response.ok) {
      const error = payload && typeof payload === "object" ? (payload as { error?: { message?: string; code?: string } }).error : undefined;
      throw new AillameSdkError(error?.message ?? "Aillame request failed.", response.status, error?.code);
    }
    return payload as T;
  }

  chat(request: AillameChatRequest): Promise<AillameChatResponse> {
    return this.request("/api/external/v1/chat", {
      method: "POST",
      body: JSON.stringify(this.withDefaults({ ...request })),
    });
  }

  task(request: AillameTaskRequest): Promise<AillameStatusResponse> {
    return this.request("/api/external/v1/tasks", {
      method: "POST",
      body: JSON.stringify(this.withDefaults({ ...request })),
    });
  }

  status(): Promise<AillameStatusResponse> {
    return this.request("/api/external/v1/runtime/status", { method: "GET" });
  }

  listProjects(): Promise<AillameStatusResponse> {
    return this.request("/api/external/v1/projects", { method: "GET" });
  }

  readMemory(query?: string): Promise<AillameStatusResponse> {
    return this.chat({
      message: query || "Read project memory",
      responseFormat: "diagnostic",
      writeMemory: false,
    });
  }

  writeMemory(request: AillameMemoryWriteRequest): Promise<AillameChatResponse> {
    return this.chat({
      message: request.content,
      sessionId: request.sessionId,
      writeMemory: true,
      responseFormat: "diagnostic",
    });
  }
}
