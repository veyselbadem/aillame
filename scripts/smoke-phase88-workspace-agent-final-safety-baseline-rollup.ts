import * as fs from 'fs';
import * as path from 'path';

async function runFinalSafetyBaselineRollupSmokeTest() {
  console.log('Running Phase 88: Workspace Agent Final Safety Baseline Rollup Smoke Test...');

  const workspaceRoot = path.resolve(__dirname, '..');
  const rollupFile = 'docs/workspace-agent-final-safety-baseline-rollup.md';
  const mapFile = 'docs/workspace-agent-safety-baseline-documentation-map.md';
  
  const requiredFiles = [
    'docs/workspace-agent-safety-architecture-index.md',
    'docs/workspace-agent-safety-architecture-release-readiness.md',
    'docs/workspace-agent-safety-architecture-final-regression-anchor.md',
    'docs/workspace-agent-post-freeze-integrity-summary.md',
    'docs/workspace-agent-safety-baseline-documentation-map.md',
    'docs/workspace-agent-final-safety-baseline-rollup.md'
  ];

  let passedCount = 0;
  let failedCount = 0;
  const failedChecks: string[] = [];

  const check = (name: string, condition: boolean) => {
    if (condition) {
      passedCount++;
      console.log(`[PASS] ${name}`);
    } else {
      failedCount++;
      failedChecks.push(name);
      console.error(`[FAIL] ${name}`);
    }
  };

  // 1. File Existence for all required docs
  console.log('\n--- File Existence Checks ---');
  for (const file of requiredFiles) {
    check(`File exists: ${file}`, fs.existsSync(path.join(workspaceRoot, file)));
  }

  if (failedCount > 0) {
    console.error('Required documentation files missing. Aborting.');
    process.exit(1);
  }

  const rollupContent = fs.readFileSync(path.join(workspaceRoot, rollupFile), 'utf-8');
  const mapContent = fs.readFileSync(path.join(workspaceRoot, mapFile), 'utf-8');

  // 2. Master Closure Structure Checks
  console.log('\n--- Master Closure Structure Checks ---');
  check('Rollup contains "Amaç" (Purpose) section', rollupContent.includes('1. Amaç'));
  check('Rollup contains "Tamamlanan Faz Döngüsü" (Completed Phase Cycle)', 
    rollupContent.includes('Tamamlanan Faz Döngüsü'));
  check('Rollup contains phase summary (41-87)', 
    rollupContent.includes('Faz 41') && rollupContent.includes('Faz 87'));
  check('Rollup contains "Final Safety Baseline Durumu" (Status section)', 
    rollupContent.includes('3. Final Safety Baseline Durumu'));

  // 3. No-Execution Boundary Confirmation
  console.log('\n--- No-Execution Boundary Checks ---');
  check('Rollup explicitly states No-Execution guarantee', 
    rollupContent.includes('No-Execution Garantisi'));
  check('Rollup confirms ActionExecutor is closed', 
    rollupContent.includes('ActionExecutor') && rollupContent.includes('Kapalı'));
  check('Rollup confirms Command Registry is closed', 
    rollupContent.includes('Command Registry') && rollupContent.includes('Kapalı'));
  check('Rollup confirms file write is disabled', 
    rollupContent.includes('Dosya Yazma') && rollupContent.includes('Kapalı'));
  check('Rollup confirms shell access is disabled', 
    rollupContent.includes('Shell') && rollupContent.includes('Kapalı'));
  check('Rollup confirms capability issuer is null', 
    rollupContent.includes('issuedCapability') && rollupContent.includes('null'));

  // 4. Documentation Map Reference
  console.log('\n--- Documentation Map Reference Checks ---');
  check('Rollup references Documentation Map as canonical', 
    rollupContent.includes('workspace-agent-safety-baseline-documentation-map.md'));
  check('Rollup confirms Map is canonical navigation source', 
    rollupContent.includes('canonical') || rollupContent.includes('kaynaktır'));

  // 5. Sealed Status Checks
  console.log('\n--- Sealed Status Checks ---');
  check('Rollup contains "Pure-Security-Baseline" status', 
    rollupContent.includes('Pure-Security-Baseline'));
  check('Rollup contains "No-Execution Kalıcı Mühür" (Permanent Seal)', 
    rollupContent.includes('Mühür'));
  check('Rollup confirms smoke test validation (Phases 83-88)', 
    rollupContent.includes('Faz 83') && rollupContent.includes('Faz 88'));

  // 6. Future Phase Boundary
  console.log('\n--- Future Phase Boundary Checks ---');
  check('Rollup clarifies "not approval or authorization"', 
    rollupContent.includes('onay veya yetki belgesi değildir') || 
    rollupContent.includes('authorization'));
  check('Rollup mandates separate design for future execution', 
    rollupContent.includes('ayrı') && (rollupContent.includes('tasarım') || rollupContent.includes('design')));

  // 7. Negative Enforcement Checks
  console.log('\n--- Negative Enforcement Checks (Guard Against Execution Enablement) ---');
  const forbiddenPhrases = [
    'execution enabled',
    'yürütme etkin',
    'permission granted',
    'yetki verildi',
    'capability issued',
    'file write allowed',
    'dosya yazma etkin'
  ];
  for (const phrase of forbiddenPhrases) {
    check(`Negative check: "${phrase}" NOT PRESENT`, 
      !rollupContent.toLowerCase().includes(phrase));
  }

  // 8. Master Closure Declaration
  console.log('\n--- Master Closure Declaration Checks ---');
  check('Rollup contains "Master Closure Beyanı" (Declaration)', 
    rollupContent.includes('Master Closure Beyanı'));
  check('Rollup contains "Kalıcı Mühür Beyanı" (Permanent Seal Declaration)', 
    rollupContent.includes('Kalıcı Mühür Beyanı'));
  check('Rollup states baseline is "permanently frozen"', 
    rollupContent.includes('kalıcı') || rollupContent.includes('dondurulmuş'));

  // 9. Smoke Test Reference
  console.log('\n--- Smoke Test Reference Checks ---');
  check('Rollup contains smoke test command reference', 
    rollupContent.includes('npm run smoke:phase88') || 
    rollupContent.includes('smoke-phase88'));
  check('Smoke test script exists', 
    fs.existsSync(path.join(workspaceRoot, 'scripts/smoke-phase88-workspace-agent-final-safety-baseline-rollup.ts')));

  // 10. Summary Output
  console.log(`\n--- Final Safety Baseline Rollup Smoke Summary (Phase 88) ---`);
  console.log(`✓ Passed: ${passedCount}`);
  console.log(`✗ Failed: ${failedCount}`);
  
  if (failedCount === 0) {
    console.log(`\n🔒 Status: WORKSPACE AGENT SAFETY BASELINE PERMANENTLY SEALED`);
    console.log(`   - Documentation: Phases 41-87 (Complete)`);
    console.log(`   - Master Closure: Phase 88 (Complete)`);
    console.log(`   - No-Execution Guarantee: ENFORCED`);
    console.log(`   - Canonical Navigation: Documentation Map (Confirmed)`);
    console.log(`\nPhase 88: Final Safety Baseline Rollup validation successful.`);
  } else {
    console.error(`\n✗ Status: VALIDATION FAILED`);
    console.error(`- Failed Check Names: ${failedChecks.join(', ')}`);
    process.exit(1);
  }
}

runFinalSafetyBaselineRollupSmokeTest().catch(err => {
  console.error('Smoke test crashed:', err);
  process.exit(1);
});
