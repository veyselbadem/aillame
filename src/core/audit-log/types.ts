export type AuditEventType = 
  | 'admin_login_success'
  | 'admin_login_fail'
  | 'api_client_created'
  | 'api_client_revoked'
  | 'provider_auth_fail'
  | 'training_export_requested'
  | 'unsafe_training_record_blocked'
  | 'system_startup';

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  type: AuditEventType;
  actor: string; // 'system' | adminUsername | clientId
  action: string;
  metadata?: Record<string, unknown>;
  ip?: string;
}

export interface CreateAuditLogInput {
  type: AuditEventType;
  actor: string;
  action: string;
  metadata?: Record<string, unknown>;
  ip?: string;
}
