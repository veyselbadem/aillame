import fs from 'fs';
import path from 'path';
import { ImageAssetRecord, ImageAssetQuery } from './image-asset-types';

export class ImageAssetFileStore {
  private filePath: string;
  private assetsDir: string;

  constructor(dataDir: string = '.aillame-data') {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.filePath = path.join(dataDir, 'image-assets.jsonl');
    this.assetsDir = path.join(dataDir, 'assets', 'images');
    
    if (!fs.existsSync(this.assetsDir)) {
      fs.mkdirSync(this.assetsDir, { recursive: true });
    }
  }

  async addAsset(asset: ImageAssetRecord): Promise<void> {
    const line = JSON.stringify(asset) + '\n';
    await fs.promises.appendFile(this.filePath, line);
  }

  async listAssets(query: ImageAssetQuery = {}): Promise<ImageAssetRecord[]> {
    if (!fs.existsSync(this.filePath)) return [];

    const content = await fs.promises.readFile(this.filePath, 'utf8');
    const lines = content.split('\n').filter(l => l.trim());
    const assets: ImageAssetRecord[] = [];

    for (const line of lines) {
      try {
        const asset = JSON.parse(line) as ImageAssetRecord;
        if (query.projectId && asset.projectId !== query.projectId) continue;
        if (query.jobId && asset.jobId !== query.jobId) continue;
        if (query.status && asset.status !== query.status) continue;
        assets.push(asset);
      } catch (err) {
        console.warn('Corrupt line in image asset store:', err);
      }
    }

    assets.sort((a, b) => b.createdAt - a.createdAt);
    if (query.limit) return assets.slice(0, query.limit);
    return assets;
  }

  async getAsset(assetId: string): Promise<ImageAssetRecord | null> {
    const assets = await this.listAssets();
    return assets.find(a => a.assetId === assetId) || null;
  }

  getAssetsDirectory(): string {
    return this.assetsDir;
  }
}

export const imageAssetStore = new ImageAssetFileStore();
