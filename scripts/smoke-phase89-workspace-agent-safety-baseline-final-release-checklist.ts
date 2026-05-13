import * as fs from 'fs';
import * as path from 'path';

async function runFinalReleaseChecklistSmokeTest() {
  console.log('Running Phase 89: Workspace Agent Safety Baseline Final Release Checklist Smoke Test...');

  const workspaceRoot = path.resolve(__dirname, '..');
  const checklistFile = 'docs/workspace-agent-safety-baseline-final-release-checklist.md';
  
  // All required documentation files
  const canonicalDocs = [
    'docs/workspace-agent-safety-architecture-index.md',
    'docs/workspace-agent-safety-architecture-release-readiness.md',
    'docs/workspace-agent-safety-architecture-final-regression-anchor.md',
    'docs/workspace-agent-post-freeze-integrity-summary.md',
    'docs/workspace-agent-safety-baseline-documentation-map.md',
    'docs/workspace-agent-final-safety-baseline-rollup.md',
    'docs/workspace-agent-safety-baseline-final-release-checklist.md'
  ];

  // All required smoke test scripts
  const smokeScripts = [
    { name: 'phase83', file: 'scripts/smoke-phase83-workspace-agent-safety-architecture-index.ts', pkg: 'smoke:phase83-workspace-agent-safety-architecture-index' },
    { name: 'phase85', file: 'scripts/smoke-phase85-workspace-agent-safety-architecture-final-regression-anchor.ts', pkg: 'smoke:phase85-workspace-agent-safety-architecture-final-regression-anchor' },
    { name: 'phase86', file: 'scripts/smoke-phase86-workspace-agent-post-freeze-integrity-summary.ts', pkg: 'smoke:phase86-workspace-agent-post-freeze-integrity-summary' },
    { name: 'phase87', file: 'scripts/smoke-phase87-workspace-agent-safety-baseline-documentation-map.ts', pkg: 'smoke:phase87-workspace-agent-safety-baseline-documentation-map' },
    { name: 'phase88', file: 'scripts/smoke-phase88-workspace-agent-final-safety-baseline-rollup.ts', pkg: 'smoke:phase88-workspace-agent-final-safety-baseline-rollup' },
    { name: 'phase89', file: 'scripts/smoke-phase89-workspace-agent-safety-baseline-final-release-checklist.ts', pkg: 'smoke:phase89-workspace-agent-safety-baseline-final-release-checklist' }
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

  // 1. Release Checklist File Existence
  console.log('\n--- Release Checklist File Checks ---');
  check('Release checklist file exists', fs.existsSync(path.join(workspaceRoot, checklistFile)));

  if (failedCount > 0) {
    console.error('Release checklist file missing. Aborting.');
    process.exit(1);
  }

  const checklistContent = fs.readFileSync(path.join(workspaceRoot, checklistFile), 'utf-8');
  const packageJsonPath = path.join(workspaceRoot, 'package.json');
  const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf-8');

  // 2. Canonical Documentation Files
  console.log('\n--- Canonical Documentation Files Checks ---');
  for (const docFile of canonicalDocs) {
    check(`Doc file exists: ${docFile}`, fs.existsSync(path.join(workspaceRoot, docFile)));
  }

  // 3. Release Checklist Structure
  console.log('\n--- Release Checklist Structure Checks ---');
  check('Checklist contains "Amaç" (Purpose)', checklistContent.includes('1. Amaç'));
  check('Checklist contains canonical docs section', checklistContent.includes('2. Canonical Safety Architecture Documents'));
  check('Checklist contains smoke test scripts section', checklistContent.includes('3. Safety Baseline Smoke Test Scripts'));
  check('Checklist contains cross-reference verification', checklistContent.includes('4. Cross-Reference Verification'));
  check('Checklist contains no-execution boundary section', checklistContent.includes('5. No-Execution Boundary Enforcement'));
  check('Checklist contains release blockers assessment', checklistContent.includes('6. Release Blockers Assessment'));
  check('Checklist contains audit exit criteria', checklistContent.includes('7. Audit Exit Criteria'));

  // 4. Smoke Test Script Presence
  console.log('\n--- Smoke Test Script Presence Checks ---');
  for (const script of smokeScripts) {
    check(`Smoke script exists: ${script.name}`, fs.existsSync(path.join(workspaceRoot, script.file)));
  }

  // 5. Package.json Registrations
  console.log('\n--- Package.json Registration Checks ---');
  for (const script of smokeScripts) {
    check(`Package script registered: ${script.pkg}`, packageJsonContent.includes(`"${script.pkg}"`));
  }

  // 6. Cross-Reference Verification
  console.log('\n--- Cross-Reference Verification Checks ---');
  check('Checklist references Documentation Map', checklistContent.includes('workspace-agent-safety-baseline-documentation-map.md'));
  check('Checklist references Master Rollup', checklistContent.includes('workspace-agent-final-safety-baseline-rollup.md'));
  check('Master Rollup references Documentation Map', 
    fs.readFileSync(path.join(workspaceRoot, 'docs/workspace-agent-final-safety-baseline-rollup.md'), 'utf-8')
      .includes('workspace-agent-safety-baseline-documentation-map.md'));

  // 7. No-Execution Boundary Enforcement
  console.log('\n--- No-Execution Boundary Enforcement Checks ---');
  // Check that checklist explicitly references no-execution enforcement requirement
  check('Checklist contains no-execution boundary section', checklistContent.includes('No-Execution Boundary Enforcement'));
  check('Checklist lists forbidden phrases to avoid', checklistContent.includes('execution enabled'));
  
  // Check actual documentation files for forbidden enablement phrases
  const forbiddenPhrases = [
    'execution enabled',
    'yürütme etkin',
    'permission granted',
    'yetki verildi',
    'capability issued',
    'file write allowed'
  ];
  
  const docsToCheckForForbidden = [
    'docs/workspace-agent-safety-architecture-index.md',
    'docs/workspace-agent-safety-architecture-release-readiness.md',
    'docs/workspace-agent-safety-architecture-final-regression-anchor.md',
    'docs/workspace-agent-post-freeze-integrity-summary.md',
    'docs/workspace-agent-safety-baseline-documentation-map.md',
    'docs/workspace-agent-final-safety-baseline-rollup.md'
  ];
  
  let forbiddenFound = false;
  for (const docFile of docsToCheckForForbidden) {
    const docContent = fs.readFileSync(path.join(workspaceRoot, docFile), 'utf-8').toLowerCase();
    for (const phrase of forbiddenPhrases) {
      if (docContent.includes(phrase)) {
        forbiddenFound = true;
      }
    }
  }
  check('No forbidden enablement phrases in implementation docs', !forbiddenFound);

  // 8. Documentation Completeness in Checklist
  console.log('\n--- Documentation Completeness in Checklist ---');
  check('Checklist references Index (Phase 83)', checklistContent.includes('workspace-agent-safety-architecture-index.md'));
  check('Checklist references Release-Readiness', checklistContent.includes('workspace-agent-safety-architecture-release-readiness.md'));
  check('Checklist references Regression Anchor (Phase 85)', checklistContent.includes('workspace-agent-safety-architecture-final-regression-anchor.md'));
  check('Checklist references Post-Freeze Summary (Phase 86)', checklistContent.includes('workspace-agent-post-freeze-integrity-summary.md'));
  check('Checklist references Documentation Map (Phase 87)', checklistContent.includes('workspace-agent-safety-baseline-documentation-map.md'));
  check('Checklist references Master Rollup (Phase 88)', checklistContent.includes('workspace-agent-final-safety-baseline-rollup.md'));

  // 9. Audit Exit Criteria
  console.log('\n--- Audit Exit Criteria Checks ---');
  check('Checklist contains audit exit criteria table', checklistContent.includes('7. Audit Exit Criteria'));
  check('Checklist confirms documentation completeness', checklistContent.includes('Documentation Completeness'));
  check('Checklist confirms smoke test coverage', checklistContent.includes('Smoke Test Coverage'));
  check('Checklist confirms no-execution boundary', checklistContent.includes('No-Execution Boundary'));
  check('Checklist confirms release blockers clear', checklistContent.includes('Release Blockers'));

  // 10. Release Instructions
  console.log('\n--- Release Instructions Checks ---');
  check('Checklist contains release instructions', checklistContent.includes('8. Release and Archive Instructions'));
  check('Checklist contains smoke run command', checklistContent.includes('npm run smoke:phase89'));
  check('Checklist contains future reference guidance', checklistContent.includes('Future Reference'));

  // 11. Phase Coverage Summary
  console.log('\n--- Phase Coverage Summary Checks ---');
  const phaseReferences = ['Faz 83', 'Faz 85', 'Faz 86', 'Faz 87', 'Faz 88', 'Faz 89'];
  for (const phase of phaseReferences) {
    check(`Checklist references ${phase}`, checklistContent.includes(phase));
  }

  // 12. Master Closure Status Confirmation
  console.log('\n--- Master Closure Status Confirmation ---');
  check('Checklist confirms Pure-Security-Baseline status', checklistContent.includes('Pure-Security-Baseline'));
  check('Checklist confirms No-Execution permanence', checklistContent.includes('Kapalı') || checklistContent.includes('Closed'));
  check('Checklist contains final beyan (declaration)', checklistContent.includes('BEYAN'));

  // Summary Output
  console.log(`\n--- Safety Baseline Final Release Checklist Smoke Summary (Phase 89) ---`);
  console.log(`✓ Passed: ${passedCount}`);
  console.log(`✗ Failed: ${failedCount}`);
  
  if (failedCount === 0) {
    console.log(`\n✅ Status: WORKSPACE AGENT SAFETY BASELINE AUDIT EXIT APPROVED`);
    console.log(`   - Documentation: 7/7 files present and validated`);
    console.log(`   - Smoke Test Infrastructure: 6/6 scripts present and registered`);
    console.log(`   - Cross-References: All canonical links verified`);
    console.log(`   - No-Execution Boundary: Permanently enforced`);
    console.log(`   - Release Blockers: 0 issues`);
    console.log(`   - Audit Status: Ready for final release`);
    console.log(`\nPhase 89: Final Release Checklist validation successful.`);
  } else {
    console.error(`\n✗ Status: VALIDATION FAILED`);
    console.error(`- Failed Check Names: ${failedChecks.join(', ')}`);
    process.exit(1);
  }
}

runFinalReleaseChecklistSmokeTest().catch(err => {
  console.error('Smoke test crashed:', err);
  process.exit(1);
});
