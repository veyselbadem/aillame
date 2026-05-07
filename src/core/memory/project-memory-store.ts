import * as fs from "fs";
import * as path from "path";
import type {
  MemoryScope,
  ProjectMemoryAttribution,
  ProjectMemoryEntry,
  ProjectMemoryQuery,
  ProjectMemoryReadResult,
  ProjectMemoryWriteRequest,
  ProjectMemoryWriteResult,
} from "./project-memory-types";

const SENSITIVE_PATTERNS = [
  /\.env(?:\.|$)/i,
  /\b(api[_-]?key|secret|token|password|private[_-]?key)\b/i,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
];

function now(): string {
  return new Date().toISOString();
}

function makeId(projectId: string): string {
  return `pm_${projectId}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function scoreEntry(entry: ProjectMemoryEntry, query: string | undefined): number {
  if (!query?.trim()) return 1;
  const normalized = query.toLocaleLowerCase("tr-TR");
  const haystack = `${entry.topic ?? ""} ${entry.content} ${entry.tags.join(" ")}`.toLocaleLowerCase("tr-TR");
  return normalized.split(/\s+/).filter((part) => part && haystack.includes(part)).length;
}

function safeScope(value: unknown): MemoryScope {
  return value === "global" || value === "session" || value === "project" ? value : "project";
}

function attribution(input: ProjectMemoryWriteRequest | ProjectMemoryQuery, scope: MemoryScope): ProjectMemoryAttribution {
  return {
    projectId: input.identity.projectId,
    scope,
    sessionId: input.identity.sessionId,
    sourceApp: input.identity.sourceApp,
    requestId: input.identity.requestId,
  };
}

function containsSensitiveContent(content: string): boolean {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(content));
}

export class ProjectMemoryStore {
  private readonly entries: ProjectMemoryEntry[] = [];
  private readonly storagePath?: string;

  constructor(storagePath?: string) {
    this.storagePath = storagePath;
    this.load();
  }

  private load(): void {
    if (!this.storagePath || !fs.existsSync(this.storagePath)) return;
    try {
      const lines = fs.readFileSync(this.storagePath, "utf8").split(/\r?\n/).filter(Boolean);
      for (const line of lines) {
        const parsed = JSON.parse(line);
        if (parsed && typeof parsed === "object") this.entries.push(parsed as ProjectMemoryEntry);
      }
    } catch {
      this.entries.length = 0;
    }
  }

  private save(): void {
    if (!this.storagePath) return;
    const dir = path.dirname(this.storagePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.storagePath, this.entries.map((entry) => JSON.stringify(entry)).join("\n"), "utf8");
  }

  write(input: ProjectMemoryWriteRequest): ProjectMemoryWriteResult {
    const scope = safeScope(input.scope ?? input.identity.memoryScope);
    const baseAttribution = attribution(input, scope);
    const warnings: string[] = [];

    if (scope === "project" && !input.identity.projectId) {
      return {
        success: false,
        warnings: ["projectId is required for project memory writes."],
        diagnostics: { projectId: input.identity.projectId, scope, blocked: true, reasonCode: "PROJECT_ID_REQUIRED" },
        attribution: baseAttribution,
      };
    }

    if (input.identity.memoryScope === "none") {
      return {
        success: false,
        warnings: ["Memory writes are disabled for this request."],
        diagnostics: { projectId: input.identity.projectId, scope, blocked: true, reasonCode: "MEMORY_DISABLED" },
        attribution: baseAttribution,
      };
    }

    if (containsSensitiveContent(`${input.topic ?? ""}\n${input.content}\n${input.tags?.join(" ") ?? ""}`)) {
      return {
        success: false,
        warnings: ["Sensitive-looking content was blocked from project memory."],
        diagnostics: { projectId: input.identity.projectId, scope, blocked: true, reasonCode: "SENSITIVE_CONTENT_BLOCKED" },
        attribution: baseAttribution,
      };
    }

    const timestamp = now();
    const entry: ProjectMemoryEntry = {
      id: makeId(input.identity.projectId),
      projectId: scope === "global" ? "global" : input.identity.projectId,
      scope,
      sessionId: input.identity.sessionId,
      topic: input.topic,
      content: input.content,
      tags: input.tags ?? [],
      createdAt: timestamp,
      updatedAt: timestamp,
      attribution: baseAttribution,
    };

    this.entries.push(entry);
    this.save();

    return {
      success: true,
      entry,
      warnings,
      diagnostics: { projectId: input.identity.projectId, scope, blocked: false },
      attribution: baseAttribution,
    };
  }

  read(input: ProjectMemoryQuery): ProjectMemoryReadResult {
    const scope = safeScope(input.scope ?? input.identity.memoryScope);
    const includeGlobal = input.includeGlobal === true;
    const baseAttribution = attribution(input, scope);
    const limit = Math.max(1, Math.min(input.limit ?? 8, 50));

    const entries = this.entries
      .filter((entry) => {
        if (entry.scope === "global") return includeGlobal;
        if (scope === "session") return entry.projectId === input.identity.projectId && entry.sessionId === input.identity.sessionId;
        if (scope === "project") return entry.projectId === input.identity.projectId;
        return false;
      })
      .map((entry) => ({ entry, score: scoreEntry(entry, input.query) }))
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((row) => row.entry);

    return {
      success: true,
      entries,
      warnings: includeGlobal ? ["Global memory was explicitly included."] : [],
      diagnostics: {
        projectId: input.identity.projectId,
        scope,
        includeGlobal,
        isolationApplied: true,
      },
      attribution: baseAttribution,
    };
  }

  clear(): void {
    this.entries.length = 0;
    this.save();
  }
}

let defaultProjectMemoryStore: ProjectMemoryStore | undefined;

export function createProjectMemoryStore(storagePath?: string): ProjectMemoryStore {
  return new ProjectMemoryStore(storagePath);
}

export function getDefaultProjectMemoryStore(): ProjectMemoryStore {
  if (!defaultProjectMemoryStore) defaultProjectMemoryStore = createProjectMemoryStore();
  return defaultProjectMemoryStore;
}
