import fs from 'fs';
import path from 'path';
import { resolveProjectRelative } from '@/core/project-root';

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
  private cache: ImageJobRecord[] | null = null;
  private lastMtime: number = 0;

  constructor(dataDir: string = '.aillame-data') {
    const absoluteDataDir = resolveProjectRelative(dataDir);
    if (!fs.existsSync(absoluteDataDir)) {
      fs.mkdirSync(absoluteDataDir, { recursive: true });
    }
    this.filePath = path.join(absoluteDataDir, 'image-jobs.jsonl');
  }

  async addJob(job: ImageJobRecord): Promise<void> {
    const line = JSON.stringify(job) + '\n';
    await fs.promises.appendFile(this.filePath, line);
    if (this.cache) {
      this.cache = [job, ...this.cache].sort((a, b) => b.createdAt - a.createdAt);
    }
  }

  async listJobs(projectId?: string): Promise<ImageJobRecord[]> {
    this.checkFileFreshness();
    if (this.cache) {
      return projectId ? this.cache.filter(j => j.projectId === projectId) : this.cache;
    }

    if (!fs.existsSync(this.filePath)) return [];

    const content = await fs.promises.readFile(this.filePath, 'utf8');
    const lines = content.split('\n').filter(l => l.trim());
    const jobs: ImageJobRecord[] = [];

    const STALE_TIMEOUT_MS = 15 * 60 * 1000; // 15 dakika
    const now = Date.now();

    for (const line of lines) {
      try {
        let job = JSON.parse(line) as ImageJobRecord;
        
        // [ANALİZ VE DÜZELTME] Stale Job tespiti
        if (job.status === 'running' && (now - job.createdAt) > STALE_TIMEOUT_MS) {
          job.status = 'failed';
          job.errorSummary = 'İşlem zaman aşımına uğradı (stale). Python işçisi çökmüş olabilir.';
          job.updatedAt = now;
        }
        
        jobs.push(job);
      } catch (err) {
        console.warn('Corrupt line in image job history:', err);
      }
    }

    this.cache = jobs.sort((a, b) => b.createdAt - a.createdAt);
    return projectId ? this.cache.filter(j => j.projectId === projectId) : this.cache;
  }

  private checkFileFreshness(): void {
    if (!fs.existsSync(this.filePath)) {
      this.cache = null;
      this.lastMtime = 0;
      return;
    }
    const mtime = fs.statSync(this.filePath).mtimeMs;
    if (mtime > this.lastMtime) {
      this.cache = null;
      this.lastMtime = mtime;
    }
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
      this.cache = updated;
      await fs.promises.writeFile(this.filePath, updated.map(j => JSON.stringify(j)).join('\n') + '\n', 'utf8');
      this.lastMtime = fs.statSync(this.filePath).mtimeMs;
    }
    return found;
  }

  async removeAssetIdFromJobs(assetId: string): Promise<void> {
    const jobs = await this.listJobs();
    let modified = false;
    const updated = jobs.map(j => {
      if (j.outputAssetIds?.includes(assetId)) {
        modified = true;
        return {
          ...j,
          outputAssetIds: j.outputAssetIds.filter(id => id !== assetId),
          updatedAt: Date.now()
        };
      }
      return j;
    });

    if (modified) {
      this.cache = updated;
      await fs.promises.writeFile(this.filePath, updated.map(j => JSON.stringify(j)).join('\n') + '\n', 'utf8');
      this.lastMtime = fs.statSync(this.filePath).mtimeMs;
    }
  }

  async deleteJob(jobId: string): Promise<boolean> {
    if (!fs.existsSync(this.filePath)) return false;

    const jobs = await this.listJobs();
    const exists = jobs.some(j => j.jobId === jobId);

    if (!exists) {
      console.warn(`[ImageJobFileStore] deleteJob: Job ${jobId} bulunamadı.`);
      return false;
    }

    const remaining = jobs.filter(j => j.jobId !== jobId);
    this.cache = remaining;
    const content = remaining.length > 0
      ? remaining.map(j => JSON.stringify(j)).join('\n') + '\n'
      : '';
    await fs.promises.writeFile(this.filePath, content, 'utf8');
    this.lastMtime = fs.statSync(this.filePath).mtimeMs;
    return true;
  }
}

export const imageJobStore = new ImageJobFileStore();
