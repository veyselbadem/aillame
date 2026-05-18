import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import { AUDIT_DIR, appendLine } from "@/utils/fs-helpers";
import { WorkflowResult } from "../workflow/workflow.types";

export class AuditLogService {
  private static readonly WORKFLOW_LOG_PATH = path.join(AUDIT_DIR, 'workflows.jsonl');

  static async appendWorkflowResult(result: WorkflowResult): Promise<void> {
    try {
      const line = JSON.stringify(result);
      await appendLine(this.WORKFLOW_LOG_PATH, line);
    } catch (error) {
      console.error('[AuditLogService] Failed to write audit log:', error);
      // We don't throw here to avoid breaking the workflow if only auditing fails
    }
  }

  static async readRecentWorkflowResults(limit: number = 50): Promise<WorkflowResult[]> {
    try {
      if (!fsSync.existsSync(this.WORKFLOW_LOG_PATH)) {
        return [];
      }

      const content = await fs.readFile(this.WORKFLOW_LOG_PATH, 'utf-8');
      const lines = content.trim().split('\n').filter(line => line.length > 0);
      
      return lines
        .slice(-limit)
        .reverse()
        .map(line => JSON.parse(line) as WorkflowResult);
    } catch (error) {
      console.error('[AuditLogService] Failed to read audit log:', error);
      return [];
    }
  }
}
