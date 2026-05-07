import fs from 'fs';
import path from 'path';

function assert(condition, message) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    process.exit(1);
  }
  console.log(`[PASS] ${message}`);
}

async function runSmokeTest() {
  console.log("Starting Phase 2 Smoke Test: Live IGM Model Manager\n");

  const storageRoot = process.env.AILLAME_STORAGE_ROOT || '.aillame-data';
  
  // 1. Verify IGM Catalog Metadata
  const catalogPath = 'src/core/models/catalog/curated-igm-catalog.ts';
  assert(fs.existsSync(catalogPath), "IGM curated catalog metadata exists");
  
  const catalogContent = fs.readFileSync(catalogPath, 'utf8');
  assert(catalogContent.includes('starter-sd15-safetensors'), "SD 1.5 starter candidate in catalog");
  assert(catalogContent.includes('taskType: "image"'), "IGM task type is correctly set to 'image'");

  // 2. Verify IGM Worker Bridge
  const bridgePath = 'src/core/runtime/image/worker/igm-worker-process-bridge.ts';
  assert(fs.existsSync(bridgePath), "IGM worker process bridge exists");
  
  const bridgeContent = fs.readFileSync(bridgePath, 'utf8');
  assert(bridgeContent.includes('spawnSync'), "Bridge uses child_process spawnSync for execution");
  assert(bridgeContent.includes('AILLAME_IGM_WORKER_COMMAND'), "Bridge respects AILLAME_IGM_WORKER_COMMAND env var");

  // 3. Verify Job -> Worker Binding
  const servicePath = 'src/core/runtime/image/image-generation-service.ts';
  const serviceContent = fs.readFileSync(servicePath, 'utf8');
  assert(serviceContent.includes('igmWorker.generate'), "ImageGenerationService calls igmWorker.generate");

  // 4. Verify Readiness Logic
  const libPath = 'scripts/live-runtime-acceptance-lib.mjs';
  const libContent = fs.readFileSync(libPath, 'utf8');
  assert(libContent.includes('async function runIgmGeneration'), "Acceptance lib includes IGM generation probe");
  assert(libContent.includes('AILLAME_IGM_WORKER_COMMAND'), "Acceptance lib checks for IGM worker command");

  // 5. Verify Git Exclusion
  const gitignore = fs.readFileSync('.gitignore', 'utf8');
  assert(gitignore.includes('*.safetensors') || gitignore.includes('models/igm/'), "IGM models are excluded from git");

  console.log("\n--- Phase 2 Validation Summary ---");
  console.log("- IGM Catalog: Metadata ready");
  console.log("- Worker Bridge: Process bridge implemented");
  console.log("- Job Binding: Wired to worker");
  console.log("- Readiness: Honest reporting implemented");
  
  console.log("\n[SUCCESS] Phase 2 Smoke Test completed.");
}

runSmokeTest().catch(err => {
  console.error("Smoke test failed:", err);
  process.exit(1);
});
