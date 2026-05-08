import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export class BackupStore {
  private backupDir: string;

  constructor(workspacePath: string) {
    this.backupDir = path.join(workspacePath, ".aillame-data", "agent-backups");
  }

  async createBackup(workspacePath: string, relativePath: string): Promise<string> {
    const fullPath = path.join(workspacePath, relativePath);
    const content = await fs.readFile(fullPath);
    
    await fs.mkdir(this.backupDir, { recursive: true });

    const timestamp = Date.now();
    const backupId = crypto.createHash("md5").update(`${relativePath}-${timestamp}`).digest("hex").slice(0, 8);
    const safeName = relativePath.replace(/[\\/]/g, "_");
    const backupFileName = `${timestamp}_${backupId}_${safeName}.bak`;
    
    const backupPath = path.join(this.backupDir, backupFileName);
    await fs.writeFile(backupPath, content);

    return backupId;
  }
}
