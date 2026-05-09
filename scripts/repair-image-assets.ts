import fs from 'fs';
import path from 'path';

/**
 * Aillame Image Asset Repair Script
 * Repairs image-assets.jsonl by cross-referencing image-jobs.jsonl and physical files.
 */

const DATA_DIR = path.join(process.cwd(), '.aillame-data');
const JOBS_FILE = path.join(DATA_DIR, 'image-jobs.jsonl');
const ASSETS_FILE = path.join(DATA_DIR, 'image-assets.jsonl');
const IMAGES_DIR = path.join(DATA_DIR, 'assets', 'images');

async function repair() {
  console.log('--- Aillame Image Asset Repair Started ---');
  
  if (!fs.existsSync(JOBS_FILE)) {
    console.error('Error: image-jobs.jsonl not found at', JOBS_FILE);
    return;
  }

  if (!fs.existsSync(IMAGES_DIR)) {
    console.error('Error: Images directory not found at', IMAGES_DIR);
    return;
  }

  // 1. Load existing assets to avoid duplicates
  const existingAssetIds = new Set<string>();
  if (fs.existsSync(ASSETS_FILE)) {
    const assetsContent = fs.readFileSync(ASSETS_FILE, 'utf8');
    assetsContent.split('\n').forEach(line => {
      if (!line.trim()) return;
      try {
        const asset = JSON.parse(line);
        if (asset.assetId) existingAssetIds.add(asset.assetId);
      } catch (e) {
        console.warn('Skipping corrupt line in assets file');
      }
    });
  }

  // 2. Load jobs
  const jobsContent = fs.readFileSync(JOBS_FILE, 'utf8');
  const jobs = jobsContent.split('\n')
    .filter(line => line.trim())
    .map(line => {
      try {
        return JSON.parse(line);
      } catch (e) {
        return null;
      }
    })
    .filter(job => job !== null);

  // 3. List physical files
  const files = fs.readdirSync(IMAGES_DIR).filter(f => f.toLowerCase().endsWith('.png'));
  const fileStats = files.map(f => ({
    name: f,
    mtime: fs.statSync(path.join(IMAGES_DIR, f)).mtimeMs,
    timestamp: parseInt(f.match(/\d{10,}/)?.[0] || '0')
  }));

  console.log(`Found ${jobs.length} jobs and ${files.length} physical images.`);

  let repairedCount = 0;
  let alreadyPresentCount = 0;
  let skippedCount = 0;

  const newAssets: any[] = [];

  for (const job of jobs) {
    if (job.status !== 'completed' && job.status !== 'succeeded') {
      continue;
    }

    const assetId = job.outputAssetIds?.[0];
    if (!assetId) {
      skippedCount++;
      continue;
    }

    if (existingAssetIds.has(assetId)) {
      alreadyPresentCount++;
      continue;
    }

    // Try to find the matching file
    const jobTime = job.updatedAt || job.createdAt;
    
    // Look for a file whose timestamp is close to job completion (within 60 seconds)
    let matchingFile = fileStats.find(fs => {
      // Strategy A: Filename contains the assetId's timestamp or the assetId itself
      if (fs.name.includes(assetId)) return true;
      const assetTimestamp = assetId.split('_')[1];
      if (assetTimestamp && fs.name.includes(assetTimestamp)) return true;
      
      // Strategy B: Proximity in time (60s tolerance for CPU lag)
      const diffTimestamp = Math.abs(fs.timestamp - jobTime);
      const diffMtime = Math.abs(fs.mtime - jobTime);
      
      return diffTimestamp < 60000 || diffMtime < 60000;
    });

    if (matchingFile) {
      const assetRecord = {
        assetId: assetId,
        jobId: job.jobId,
        projectId: job.projectId || 'default-chat',
        prompt: job.prompt || 'Recovered Image',
        fileName: matchingFile.name,
        relativePath: matchingFile.name,
        mimeType: 'image/png',
        status: 'available',
        modelId: job.modelId,
        metadata: { recovered: true, repairDate: Date.now() },
        createdAt: jobTime
      };

      newAssets.push(assetRecord);
      repairedCount++;
      console.log(`[REPAIRED] Job ${job.jobId} -> File ${matchingFile.name}`);
    } else {
      console.warn(`[MISSING] Could not find physical file for completed job ${job.jobId} (Asset: ${assetId})`);
      skippedCount++;
    }
  }

  // 4. Append new assets to the file
  if (newAssets.length > 0) {
    const lines = newAssets.map(a => JSON.stringify(a)).join('\n') + '\n';
    fs.appendFileSync(ASSETS_FILE, lines);
  }

  console.log('\n--- Repair Summary ---');
  console.log(`Total Jobs Processed: ${jobs.length}`);
  console.log(`Assets Already Present: ${alreadyPresentCount}`);
  console.log(`Assets Repaired/Restored: ${repairedCount}`);
  console.log(`Jobs Skipped (No file/No assetId): ${skippedCount}`);
  console.log(`Target File: ${ASSETS_FILE}`);
}

repair().catch(err => {
  console.error('Fatal repair error:', err);
  process.exit(1);
});
