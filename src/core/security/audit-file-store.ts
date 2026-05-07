import { AuditEvent, AuditDiagnostics, AuditAction, AuditSeverity } from './audit';
import { appendJsonl, readJsonl, getFileDiagnostics } from '../storage/file-store';

const SENSITIVE_PATTERNS = [
  /api[-_]?key/i,
  /secret/i,
  /token/i,
  /password/i,
  /credential/i,
];

function sanitizeRecord(data: any): any {
  if (typeof data !== 'object' || data === null) return data;
  if (Array.isArray(data)) return data.map(sanitizeRecord);
  
  const sanitized: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_PATTERNS.some(p => p.test(key))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'string') {
      let safeStr = value;
      SENSITIVE_PATTERNS.forEach(p => {
        safeStr = safeStr.replace(new RegExp(p, 'gi'), '[REDACTED]');
      });
      sanitized[key] = safeStr;
    } else {
      sanitized[key] = sanitizeRecord(value);
    }
  }
  return sanitized;
}

export class AuditFileStore {
  private readonly filename = 'audit-log.jsonl';

  appendAuditEvent(event: AuditEvent): void {
    const sanitizedEvent: AuditEvent = {
      ...event,
      details: event.details ? sanitizeRecord(event.details) : undefined,
      sanitized: true
    };
    appendJsonl(this.filename, sanitizedEvent);
  }

  listAuditEvents(): AuditEvent[] {
    const { lines } = readJsonl<AuditEvent>(this.filename);
    return lines;
  }

  queryAuditEvents(query: { projectId?: string; action?: AuditAction; severity?: AuditSeverity; limit?: number }): AuditEvent[] {
    const { lines } = readJsonl<AuditEvent>(this.filename);
    let results = lines;
    
    if (query.projectId) {
      results = results.filter(e => e.resource.projectId === query.projectId);
    }
    if (query.action) {
      results = results.filter(e => e.action === query.action);
    }
    if (query.severity) {
      results = results.filter(e => e.severity === query.severity);
    }
    
    results.sort((a, b) => b.timestamp - a.timestamp);
    if (query.limit) {
      results = results.slice(0, query.limit);
    }
    return results;
  }

  getAuditDiagnostics(): AuditDiagnostics {
    const diag = getFileDiagnostics(this.filename);
    return {
      enabled: true,
      storeType: 'file',
      totalEventsLogged: diag.lines
    };
  }
}
