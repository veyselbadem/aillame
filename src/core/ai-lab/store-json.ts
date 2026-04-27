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
  try {
    ensureDir();
    const data = JSON.stringify(sessions, null, 2);
    // Atomic-like write: write to temp first then rename if possible, but for simple MVP:
    fs.writeFileSync(STORE_FILE, data, 'utf8');
  } catch (e) {
    console.error('AI Lab Save Error:', e);
    throw new Error('Failed to save laboratory data.');
  }
}

export async function loadSessions(): Promise<LabSession[]> {
  if (!fs.existsSync(STORE_FILE)) {
    ensureDir();
    return [];
  }
  
  try {
    const data = fs.readFileSync(STORE_FILE, 'utf8');
    if (!data.trim()) return [];
    
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('AI Lab Load Error (Corrupt JSON):', e);
    // Return empty array to prevent crash, but log it
    return [];
  }
}
