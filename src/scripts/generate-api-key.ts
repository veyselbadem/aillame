import { ApiKeyService } from '../services/api-key.service';

const prefix = process.argv[2] || 'doomsgame';
const name = process.argv[3] || 'Doomsgame Engine Dev Key';
const projectId = process.argv[4] || 'doomsgame-engine';

const rawKey = ApiKeyService.generateApiKey(prefix);
const hash = ApiKeyService.hashApiKey(rawKey);

console.log('\n=== AILLAME API KEY GENERATOR ===');
console.log(`\nRaw API Key (SHOW ONLY ONCE!):`);
console.log(`\x1b[32m${rawKey}\x1b[0m`);

console.log(`\nSHA-256 Hash:`);
console.log(`\x1b[33m${hash}\x1b[0m`);

console.log(`\nConfig Record for src/config/api-keys.config.ts:`);
console.log(JSON.stringify({
  id: `key_${prefix}_${Date.now()}`,
  name: name,
  keyHash: hash,
  projectId: projectId,
  allowedModes: ["code", "general", "image_generation"],
  isActive: true,
  createdAt: new Date().toISOString()
}, null, 2));

console.log('\n=================================\n');
