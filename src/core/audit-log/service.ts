import fs from 'fs';
import path from 'path';
import type { AuditLogEntry, CreateAuditLogInput } from './types';

const LOG_FILE = path.join(process.cwd(), 'data', 'audit_logs.json');

function ensureDir() {
  const dir = path.dirname(LOG_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export async function createAuditLog(input: CreateAuditLogInput): Promise<AuditLogEntry> {
  ensureDir();
  
  const entry: AuditLogEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: Date.now(),
    ...input,
  };

  // Minimal persistence
  let logs: AuditLogEntry[] = [];
  if (fs.existsSync(LOG_FILE)) {
    try {
      logs = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
    } catch (e) {
      logs = [];
    }
  }

  logs.push(entry);
  
  // Keep last 1000 logs
  if (logs.length > 1000) {
    logs = logs.slice(-1000);
  }

  fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
  
  console.log(`[AUDIT] ${entry.type} by ${entry.actor}: ${entry.action}`);
  return entry;
}

export async function listAuditLogs(): Promise<AuditLogEntry[]> {
  if (!fs.existsSync(LOG_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
  } catch (e) {
    return [];
  }
}
