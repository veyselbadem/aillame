import fs from 'fs';
import path from 'path';
import { resolveProjectRelative } from '../project-root';

/**
 * Standardized runtime logger for Aillame.
 * Ensures logs are written to .aillame-data/logs with UTF-8 encoding.
 */
export class RuntimeLogger {
  private logDir: string;

  constructor(dataDir: string = '.aillame-data') {
    this.logDir = resolveProjectRelative(path.join(dataDir, 'logs'));
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * Appends a message to a log file.
   * @param filename - Name of the log file (e.g., 'training.log')
   * @param message - The message to log
   */
  public log(filename: string, message: string): void {
    const filePath = path.join(this.logDir, filename);
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ${message}\n`;
    
    // Always use UTF-8 explicitly to prevent encoding pollution (like Mojibake/UTF-16)
    fs.appendFileSync(filePath, line, 'utf-8');
  }

  /**
   * Specifically for training logs with standardized formatting.
   */
  public logTraining(message: string): void {
    this.log('training.log', message);
  }

  /**
   * For system errors and worker failures.
   */
  public logError(message: string): void {
    this.log('system-errors.log', message);
  }
}

export const runtimeLogger = new RuntimeLogger();
