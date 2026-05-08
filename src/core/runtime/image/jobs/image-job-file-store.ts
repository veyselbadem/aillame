import fs from 'fs';
import path from 'path';

export type ImageJobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'degraded' | 'not-configured';

export interface ImageJobRecord {
  jobId: string;
  projectId: string;
  sourceApp?: string;
  mode: string;
  prompt: string;
  negativePrompt?: string;
  status: ImageJobStatus;
  progress: number;
  modelId?: string;
  runtimeId?: string;
  workflowId?: string;
  outputAssetIds: string[];
  device?: string;
  deviceDetails?: string;
  deviceReason?: string;
  errorSummary?: string;
  createdAt: number;
  updatedAt: number;
}

export class ImageJobFileStore {
  private filePath: string;

  constructor(dataDir: string = '.aillame-data') {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.filePath = path.join(dataDir, 'image-jobs.jsonl');
  }

  async addJob(job: ImageJobRecord): Promise<void> {
    const line = JSON.stringify(job) + '\n';
    await fs.promises.appendFile(this.filePath, line);
  }

  async listJobs(projectId?: string): Promise<ImageJobRecord[]> {
    if (!fs.existsSync(this.filePath)) return [];

    const content = await fs.promises.readFile(this.filePath, 'utf8');
    const lines = content.split('\n').filter(l => l.trim());
    const jobs: ImageJobRecord[] = [];

    for (const line of lines) {
      try {
        const job = JSON.parse(line) as ImageJobRecord;
        if (!projectId || job.projectId === projectId) {
          jobs.push(job);
        }
      } catch (err) {
        console.warn('Corrupt line in image job history:', err);
      }
    }

    return jobs.sort((a, b) => b.createdAt - a.createdAt);
  }

  async updateJob(jobId: string, updates: Partial<ImageJobRecord>): Promise<boolean> {
    const jobs = await this.listJobs();
    let found = false;
    const updated = jobs.map(j => {
      if (j.jobId === jobId) {
        found = true;
        return { ...j, ...updates, updatedAt: Date.now() };
      }
      return j;
    });

    if (found) {
      await fs.promises.writeFile(this.filePath, updated.map(j => JSON.stringify(j)).join('\n') + '\n');
    }
    return found;
  }
}

export const imageJobStore = new ImageJobFileStore();
