import fs from 'fs';
import path from 'path';
import { LabSession } from './types';

const STORE_FILE = path.join(process.cwd(), 'data', 'ai_lab_sessions.json');

function ensureDir() {
  const dir = path.dirname(STORE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export async function saveSessions(sessions: LabSession[]): Promise<void> {
  ensureDir();
  fs.writeFileSync(STORE_FILE, JSON.stringify(sessions, null, 2));
}

export async function loadSessions(): Promise<LabSession[]> {
  if (!fs.existsSync(STORE_FILE)) return [];
  try {
    const data = fs.readFileSync(STORE_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    console.error('AI Lab Load Error:', e);
    return [];
  }
}
