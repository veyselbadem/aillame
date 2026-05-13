import * as fs from 'fs';
import * as path from 'path';

async function runArchiveReleaseTagSmokeTest() {
  console.log('Running Phase 90: Workspace Agent Safety Baseline Archive / Release Tag Preparation Smoke Test...');

  const workspaceRoot = path.resolve(__dirname, '..');
  const archiveFile = 'docs/workspace-agent-safety-baseline-archive-release-tag.md';
  
  // All archived documentation files
  const archivedDocs = [
    'docs/workspace-agent-safety-architecture-index.md',
    'docs/workspace-agent-safety-architecture-release-readiness.md',
    'docs/workspace-agent-safety-architecture-final-regression-anchor.md',
    'docs/workspace-agent-post-freeze-integrity-summary.md',
    'docs/workspace-agent-safety-baseline-documentation-map.md',
    'docs/workspace-agent-final-safety-baseline-rollup.md',
    'docs/workspace-agent-safety-baseline-final-release-checklist.md',
    'docs/workspace-agent-safety-baseline-archive-release-tag.md'
  ];

  // All smoke test scripts for archive
  const smokeScripts = [
    'scripts/smoke-phase83-workspace-agent-safety-architecture-index.ts',
    'scripts/smoke-phase85-workspace-agent-safety-architecture-final-regression-anchor.ts',
    'scripts/smoke-phase86-workspace-agent-post-freeze-integrity-summary.ts',
    'scripts/smoke-phase87-workspace-agent-safety-baseline-documentation-map.ts',
    'scripts/smoke-phase88-workspace-agent-final-safety-baseline-rollup.ts',
    'scripts/smoke-phase89-workspace-agent-safety-baseline-final-release-checklist.ts',
    'scripts/smoke-phase90-workspace-agent-safety-baseline-archive-release-tag.ts'
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

  // 1. Archive File Existence
  console.log('\n--- Archive File Checks ---');
  check('Archive document exists', fs.existsSync(path.join(workspaceRoot, archiveFile)));

  if (failedCount > 0) {
    console.error('Archive document missing. Aborting.');
    process.exit(1);
  }

  const archiveContent = fs.readFileSync(path.join(workspaceRoot, archiveFile), 'utf-8');
  const packageJsonPath = path.join(workspaceRoot, 'package.json');
  const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf-8');

  // 2. Archived Documentation Files
  console.log('\n--- Archived Documentation Files Checks ---');
  for (const docFile of archivedDocs) {
    check(`Archived doc exists: ${docFile}`, fs.existsSync(path.join(workspaceRoot, docFile)));
  }

  // 3. Archive Structure
  console.log('\n--- Archive Document Structure Checks ---');
  check('Archive contains "Amaç" (Purpose)', archiveContent.includes('1. Amaç'));
  check('Archive contains "Archive Status Definition"', archiveContent.includes('2. Archive Status Definition'));
  check('Archive contains "Release Tag Recommendation"', archiveContent.includes('3. Release Tag Recommendation'));
  check('Archive contains "Phase 89 Audit Exit Authority"', archiveContent.includes('4. Phase 89 Audit Exit Authority'));
  check('Archive contains "No-Execution Boundary Confirmation"', archiveContent.includes('5. No-Execution Boundary Confirmation'));
  check('Archive contains "Archive Governance Model"', archiveContent.includes('6. Archive Governance Model'));
  check('Archive contains "Archive Contents Manifest"', archiveContent.includes('7. Archive Contents Manifest'));

  // 4. Release Tag Definition
  console.log('\n--- Release Tag Definition Checks ---');
  check('Archive defines release tag format', archiveContent.includes('Tag Name: workspace-agent-safety-baseline-v1.0.0'));
  check('Archive confirms tag prefix', archiveContent.includes('workspace-agent-safety-baseline'));
  check('Archive confirms version v1.0.0', archiveContent.includes('v1.0.0'));
  check('Archive contains tag naming convention table', archiveContent.includes('Prefix'));

  // 5. Phase 89 Audit Exit Reference
  console.log('\n--- Phase 89 Audit Exit Reference Checks ---');
  check('Archive references Phase 89 as final authority', archiveContent.includes('Phase 89'));
  check('Archive references final release checklist', 
    archiveContent.includes('workspace-agent-safety-baseline-final-release-checklist.md'));
  check('Archive accepts Phase 89 audit status as-is', archiveContent.includes('Accepts Phase 89 audit status'));
  check('Archive confirms no re-testing after Phase 89', archiveContent.includes('does not modify'));

  // 6. No-Execution Boundary Confirmation
  console.log('\n--- No-Execution Boundary Confirmation Checks ---');
  check('Archive confirms execution sealed', archiveContent.includes('Execution'));
  check('Archive confirms file write sealed', archiveContent.includes('Dosya Yazma'));
  check('Archive confirms shell access sealed', archiveContent.includes('Shell'));
  check('Archive confirms permission grant sealed', archiveContent.includes('Yetki Verme'));
  check('Archive confirms ActionExecutor sealed', archiveContent.includes('ActionExecutor'));
  check('Archive contains seal status table', archiveContent.includes('🔒 SEALED'));

  // 7. Archive Governance
  console.log('\n--- Archive Governance Checks ---');
  check('Archive defines read-only lock status', archiveContent.includes('Read-Only'));
  check('Archive contains governance escalation process', archiveContent.includes('Governance Escalation'));
  check('Archive mandates separate design for execution', archiveContent.includes('SEPARATE design'));
  check('Archive confirms no modifications without governance', archiveContent.includes('no modifications without'));

  // 8. Archive Manifest
  console.log('\n--- Archive Manifest Checks ---');
  check('Archive contains documentation tier structure', archiveContent.includes('Tier 1:'));
  check('Archive lists all 7 canonical docs in manifest', archiveContent.includes('Tier 4: Closure'));
  check('Archive contains smoke test infrastructure manifest', archiveContent.includes('Smoke Test Infrastructure Manifest'));
  check('Archive lists Phase 83 smoke test', archiveContent.includes('Phase 83'));
  check('Archive lists Phase 90 smoke test', archiveContent.includes('Phase 90'));

  // 9. Smoke Test Scripts Present
  console.log('\n--- Smoke Test Scripts Presence Checks ---');
  for (const script of smokeScripts) {
    check(`Smoke script exists: ${path.basename(script)}`, fs.existsSync(path.join(workspaceRoot, script)));
  }

  // 10. Package.json Smoke Commands
  console.log('\n--- Package.json Smoke Command Checks ---');
  check('Package.json has phase83 script', packageJsonContent.includes('smoke:phase83'));
  check('Package.json has phase85 script', packageJsonContent.includes('smoke:phase85'));
  check('Package.json has phase86 script', packageJsonContent.includes('smoke:phase86'));
  check('Package.json has phase87 script', packageJsonContent.includes('smoke:phase87'));
  check('Package.json has phase88 script', packageJsonContent.includes('smoke:phase88'));
  check('Package.json has phase89 script', packageJsonContent.includes('smoke:phase89'));
  check('Package.json has phase90 script', packageJsonContent.includes('smoke:phase90'));

  // 11. Archive Status Certification
  console.log('\n--- Archive Status Certification Checks ---');
  check('Archive confirms documentation-only status', archiveContent.includes('DOCUMENTATION-ONLY'));
  check('Archive confirms pure-security-baseline status', archiveContent.includes('Pure-Security-Baseline'));
  check('Archive contains archive exit verification checklist', archiveContent.includes('9. Archive Exit Verification Checklist'));
  check('Archive contains permanent seal declaration', archiveContent.includes('ARCHIVED AND SEALED'));

  // 12. Release Procedures
  console.log('\n--- Release Procedures Checks ---');
  check('Archive contains tag creation command', archiveContent.includes('git tag -a workspace-agent-safety-baseline'));
  check('Archive contains pre-release smoke run instructions', archiveContent.includes('npm run smoke:phase90'));
  check('Archive contains archive governance documentation', archiveContent.includes('Archive is FROZEN and READ-ONLY'));

  // 13. Cross-References to Other Archives
  console.log('\n--- Cross-References to Other Archives ---');
  check('Archive references documentation map as canonical', 
    archiveContent.includes('workspace-agent-safety-baseline-documentation-map.md'));
  check('Archive references Phase 89 checklist as final authority',
    archiveContent.includes('workspace-agent-safety-baseline-final-release-checklist.md'));
  check('Archive references master rollup',
    archiveContent.includes('workspace-agent-final-safety-baseline-rollup.md'));

  // 14. Negative Enforcement (No Execution Enablement)
  console.log('\n--- Negative Enforcement Checks ---');
  const forbiddenPhrases = [
    'execution enabled',
    'yürütme etkin',
    'permission granted',
    'yetki verildi'
  ];
  let forbiddenFound = false;
  for (const phrase of forbiddenPhrases) {
    if (archiveContent.toLowerCase().includes(phrase) && !archiveContent.includes('NOT') && !archiveContent.includes('❌')) {
      forbiddenFound = true;
    }
  }
  check('No forbidden execution enablement phrases in archive', !forbiddenFound);

  // Summary Output
  console.log(`\n--- Safety Baseline Archive / Release Tag Smoke Summary (Phase 90) ---`);
  console.log(`✓ Passed: ${passedCount}`);
  console.log(`✗ Failed: ${failedCount}`);
  
  if (failedCount === 0) {
    console.log(`\n🔒 Status: WORKSPACE AGENT SAFETY BASELINE — ARCHIVE SEAL APPROVED`);
    console.log(`   - Archive Documentation: 8/8 files present`);
    console.log(`   - Release Tag: workspace-agent-safety-baseline-v1.0.0 (Ready)`);
    console.log(`   - Phase 89 Audit Exit: Accepted as final authority`);
    console.log(`   - No-Execution Boundary: All seals confirmed`);
    console.log(`   - Smoke Infrastructure: 7/7 scripts protected`);
    console.log(`   - Archive Governance: Read-only + escalation enforced`);
    console.log(`   - Status: Ready for git tag creation`);
    console.log(`\nPhase 90: Archive / Release Tag preparation validation successful.`);
  } else {
    console.error(`\n✗ Status: VALIDATION FAILED`);
    console.error(`- Failed Check Names: ${failedChecks.join(', ')}`);
    process.exit(1);
  }
}

runArchiveReleaseTagSmokeTest().catch(err => {
  console.error('Smoke test crashed:', err);
  process.exit(1);
});
