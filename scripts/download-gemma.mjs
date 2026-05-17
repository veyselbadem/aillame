import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Aillame Gemma 4 26B Model Downloader
 * Optimized for large file streams to prevent memory bloat.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const MODELS_DIR = path.join(PROJECT_ROOT, '.aillame-data', 'models');

const DEFAULT_MODEL_NAME = 'gemma-4-26b-it-Q4_K_M.gguf';
const DEFAULT_URL = `https://huggingface.co/bartowski/google_gemma-4-26B-A4B-it-GGUF/resolve/main/google_gemma-4-26B-A4B-it-Q4_K_M.gguf`;

function download(url, dest, modelName) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      // Handle Redirects (HF uses redirects for LFS files)
      if (response.statusCode === 302 || response.statusCode === 301) {
        console.log(`Redirecting to: ${response.headers.location.split('?')[0]}...`);
        download(response.headers.location, dest, modelName).then(resolve).catch(reject);
        return;
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Server responded with ${response.statusCode}: ${response.statusMessage}`));
        return;
      }

      const file = fs.createWriteStream(dest);
      const totalSize = parseInt(response.headers['content-length'], 10);
      let downloadedSize = 0;
      let lastReported = 0;

      response.on('data', (chunk) => {
        downloadedSize += chunk.length;
        
        // Report progress every 0.1% or at least some update
        const now = Date.now();
        if (now - lastReported > 500) { // Every 500ms
          if (totalSize) {
            const progress = ((downloadedSize / totalSize) * 100).toFixed(2);
            const downloadedGB = (downloadedSize / 1024 / 1024 / 1024).toFixed(2);
            const totalGB = (totalSize / 1024 / 1024 / 1024).toFixed(2);
            process.stdout.write(`\r[PROGRESS] ${modelName}: ${progress}% (${downloadedGB} GB / ${totalGB} GB)`);
          } else {
            process.stdout.write(`\r[PROGRESS] ${modelName}: ${(downloadedSize / 1024 / 1024).toFixed(2)} MB downloaded`);
          }
          lastReported = now;
        }
      });

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log('\n\n[SUCCESS] Download completed successfully!');
        console.log(`[PATH] ${dest}`);
        resolve();
      });
    }).on('error', (err) => {
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(err);
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const url = args[0] || DEFAULT_URL;
  const modelName = args[1] || DEFAULT_MODEL_NAME;

  if (!fs.existsSync(MODELS_DIR)) {
    console.log(`[INFO] Creating models directory: ${MODELS_DIR}`);
    fs.mkdirSync(MODELS_DIR, { recursive: true });
  }

  const dest = path.join(MODELS_DIR, modelName);

  console.log(`\n=========================================`);
  console.log(`   AILLAME GEMMA 4 BEYIN NAKLI SCRIPT   `);
  console.log(`=========================================`);
  console.log(`Model:    ${modelName}`);
  console.log(`Source:   ${url}`);
  console.log(`Target:   ${dest}`);
  console.log(`-----------------------------------------\n`);

  try {
    await download(url, dest, modelName);
  } catch (error) {
    console.error(`\n[ERROR] ${error.message}`);
    if (error.message.includes('404')) {
      console.log('\n[TIP] Gemma 4 URL might have changed. Try providing a direct link:');
      console.log('node scripts/download-gemma.mjs <DIRECT_URL> <FILENAME>');
    }
    process.exit(1);
  }
}

main();
