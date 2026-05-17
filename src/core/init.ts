import path from 'path';
import fs from 'fs/promises';
import { ensureAillameDirs, CATALOG_DIR, writeJsonAtomic } from '../utils/fs-helpers';
import { LOCAL_MODEL_CONFIGS } from '../config/models.config';

/**
 * Initializes Aillame backend state and catalogs.
 */
export async function initializeAillame() {
  console.log('[Init] Initializing Aillame core directories...');
  await ensureAillameDirs();

  console.log('[Init] Syncing seed catalog...');
  const seedFile = path.join(CATALOG_DIR, 'seed-catalog.json');
  
  // Convert old config to new catalog format
  const catalog = {
    version: "1.0",
    models: LOCAL_MODEL_CONFIGS.map(m => ({
      id: m.id,
      name: m.name,
      type: m.type === 'text-generation' ? 'text' : (m.type === 'code-generation' ? 'code' : 'text'),
      format: 'gguf',
      description: m.description,
      contextWindow: m.contextWindow,
      maxOutputTokens: m.maxOutputTokens,
      temperature: m.temperature,
      compatibleProjects: ["bademakademi", "boss"] // Default for MVP
    }))
  };

  await writeJsonAtomic(seedFile, catalog);
  console.log('[Init] Aillame initialized successfully.');
}
