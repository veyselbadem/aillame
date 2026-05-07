export type AuditSeverity = "info" | "warning" | "critical";

export type AuditAction = 
  | "external.chat.request"
  | "external.task.create"
  | "memory.read"
  | "memory.write"
  | "code-agent.plan"
  | "code-agent.patch-proposal"
  | "runtime.status.read"
  | "image.job.create"
  | "document.ingest"
  | "security.auth.failed";

export interface AuditActor {
  type: "system" | "user" | "api-key" | "agent";
  id: string;
}

export interface AuditResource {
  type: "project" | "memory" | "task" | "file" | "system";
  id?: string;
  projectId?: string;
}

export interface AuditEvent {
  id: string;
  timestamp: number;
  actor: AuditActor;
  action: AuditAction;
  resource: AuditResource;
  severity: AuditSeverity;
  details?: Record<string, any>;
  sanitized: boolean;
}

export interface AuditDiagnostics {
  enabled: boolean;
  storeType: "in-memory" | "file" | "database";
  totalEventsLogged: number;
}
