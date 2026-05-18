import fs from 'fs';
import path from 'path';
import { resolveProjectRelative } from '../../../project-root';
import { ImageAssetRecord, ImageAssetQuery } from './image-asset-types';

export class ImageAssetFileStore {
  public filePath: string;
  private assetsDir: string;
  private cache: ImageAssetRecord[] | null = null;
  private lastMtime: number = 0;

  constructor(dataDir: string = '.aillame-data') {
    const absoluteDataDir = resolveProjectRelative(dataDir);
    if (!fs.existsSync(absoluteDataDir)) {
      fs.mkdirSync(absoluteDataDir, { recursive: true });
    }
    this.filePath = path.join(absoluteDataDir, 'image-assets.jsonl');
    this.assetsDir = path.join(absoluteDataDir, 'assets', 'images');
    
    if (!fs.existsSync(this.assetsDir)) {
      fs.mkdirSync(this.assetsDir, { recursive: true });
    }
    console.log(`[ImageAssetFileStore] Initialized with canonical path: ${this.filePath}`);
  }

  async addAsset(asset: ImageAssetRecord): Promise<void> {
    const line = JSON.stringify(asset) + '\n';
    await fs.promises.appendFile(this.filePath, line);
    if (this.cache) {
      this.cache = [asset, ...this.cache].sort((a, b) => b.createdAt - a.createdAt);
    }
  }

  async listAssets(query: ImageAssetQuery = {}): Promise<ImageAssetRecord[]> {
    this.checkFileFreshness();
    if (this.cache) {
      return this.applyQuery(this.cache, query);
    }

    if (!fs.existsSync(this.filePath)) return [];

    const content = await fs.promises.readFile(this.filePath, 'utf8');
    const lines = content.split('\n').filter(l => l.trim());
    const assets: ImageAssetRecord[] = [];

    for (const line of lines) {
      try {
        const asset = JSON.parse(line) as ImageAssetRecord;
        assets.push(asset);
      } catch (err) {
        console.warn('Corrupt line in image asset store:', err);
      }
    }
    this.cache = assets.sort((a, b) => b.createdAt - a.createdAt);
    return this.applyQuery(this.cache, query);
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

  private applyQuery(assets: ImageAssetRecord[], query: ImageAssetQuery): ImageAssetRecord[] {
    let filtered = assets;
    if (query.projectId) filtered = filtered.filter(a => a.projectId === query.projectId);
    if (query.jobId) filtered = filtered.filter(a => a.jobId === query.jobId);
    if (query.status) filtered = filtered.filter(a => a.status === query.status);
    
    if (query.limit) return filtered.slice(0, query.limit);
    return filtered;
  }

  async getAsset(assetId: string): Promise<ImageAssetRecord | null> {
    const assets = await this.listAssets();
    return assets.find(a => a.assetId === assetId) || null;
  }

  getAssetsDirectory(): string {
    return this.assetsDir;
  }
  
  async registerLocalFile(params: {
    jobId: string;
    projectId: string;
    filePath: string;
    mimeType: string;
    modelId: string;
    promptPreview: string;
  }): Promise<ImageAssetRecord> {
    const fileName = path.basename(params.filePath);
    const assetId = `ast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    
    const record: ImageAssetRecord = {
      assetId,
      jobId: params.jobId,
      projectId: params.projectId,
      prompt: params.promptPreview,
      fileName,
      relativePath: fileName, 
      mimeType: params.mimeType,
      status: 'available',
      modelId: params.modelId,
      metadata: {},
      createdAt: Date.now()
    };
    
    await this.addAsset(record);
    return record;
  }
  async deleteAsset(assetId: string): Promise<boolean> {
    if (!fs.existsSync(this.filePath)) return false;

    const assets = await this.listAssets();
    const asset = assets.find(a => a.assetId === assetId);
    
    if (!asset) {
      console.log(`[ImageAssetFileStore] deleteAsset failed: Asset ${assetId} not found.`);
      console.log(`[ImageAssetFileStore] Available IDs:`, assets.map(a => a.assetId));
      return false;
    }

    // Delete physical file
    const fullPath = path.join(this.assetsDir, asset.fileName);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    // Rewrite the store file without the deleted asset
    const newAssets = assets.filter(a => a.assetId !== assetId);
    this.cache = newAssets;
    const content = newAssets.map(a => JSON.stringify(a)).join('\n') + (newAssets.length > 0 ? '\n' : '');
    await fs.promises.writeFile(this.filePath, content, 'utf8');
    this.lastMtime = fs.statSync(this.filePath).mtimeMs;

    return true;
  }
}

export const imageAssetStore = new ImageAssetFileStore();
