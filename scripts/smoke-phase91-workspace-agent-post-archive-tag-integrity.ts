import * as fs from 'fs';
import * as path from 'path';

async function runPostArchiveTagIntegritySmokeTest() {
  console.log('Running Phase 91: Workspace Agent Post-Archive Tag Integrity Smoke Test...');
  console.log('(Verification that archive remains intact after Phase 90 tag preparation)\n');

  const workspaceRoot = path.resolve(__dirname, '..');
  
  // All archived documentation files from Phase 90
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

  // All smoke test scripts from Phases 83-90
  const smokeScripts = [
    'scripts/smoke-phase83-workspace-agent-safety-architecture-index.ts',
    'scripts/smoke-phase85-workspace-agent-safety-architecture-final-regression-anchor.ts',
    'scripts/smoke-phase86-workspace-agent-post-freeze-integrity-summary.ts',
    'scripts/smoke-phase87-workspace-agent-safety-baseline-documentation-map.ts',
    'scripts/smoke-phase88-workspace-agent-final-safety-baseline-rollup.ts',
    'scripts/smoke-phase89-workspace-agent-safety-baseline-final-release-checklist.ts',
    'scripts/smoke-phase90-workspace-agent-safety-baseline-archive-release-tag.ts',
    'scripts/smoke-phase91-workspace-agent-post-archive-tag-integrity.ts'
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

  // 1. Phase 90 Archive Document Verification
  console.log('--- Phase 90 Archive Document Integrity Checks ---');
  const archiveFile = 'docs/workspace-agent-safety-baseline-archive-release-tag.md';
  check('Phase 90 archive document exists', fs.existsSync(path.join(workspaceRoot, archiveFile)));

  if (failedCount > 0) {
    console.error('Phase 90 archive missing. Aborting.');
    process.exit(1);
  }

  const archiveContent = fs.readFileSync(path.join(workspaceRoot, archiveFile), 'utf-8');

  // 2. Release Tag String Verification
  console.log('\n--- Release Tag String Verification ---');
  check('Archive contains release tag recommendation', 
    archiveContent.includes('workspace-agent-safety-baseline-v1.0.0'));
  check('Archive contains git tag creation command', 
    archiveContent.includes('git tag -a workspace-agent-safety-baseline'));
  check('Archive specifies immutable archive state', 
    archiveContent.includes('ARCHIVED AND SEALED'));

  // 3. Phase 89 Audit Exit Authority Verification
  console.log('\n--- Phase 89 Audit Exit Authority Verification ---');
  check('Archive references Phase 89 as final authority', 
    archiveContent.includes('Phase 89'));
  check('Archive confirms audit exit is not re-tested', 
    archiveContent.includes('does not modify'));
  check('Archive accepts Phase 89 results as-is', 
    archiveContent.includes('Accepts Phase 89 audit status'));

  // 4. All Archived Documentation Integrity
  console.log('\n--- All Archived Documentation Integrity ---');
  for (const docFile of archivedDocs) {
    check(`Archive integrity: ${path.basename(docFile)} exists`, 
      fs.existsSync(path.join(workspaceRoot, docFile)));
  }

  // 5. All Smoke Test Scripts Integrity
  console.log('\n--- All Smoke Test Scripts Integrity ---');
  for (const script of smokeScripts) {
    check(`Smoke script intact: ${path.basename(script)} exists`, 
      fs.existsSync(path.join(workspaceRoot, script)));
  }

  // 6. Package.json Registration Integrity
  console.log('\n--- Package.json Registration Integrity ---');
  const packageJsonPath = path.join(workspaceRoot, 'package.json');
  const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf-8');
  
  const requiredScripts = [
    'smoke:phase83-workspace-agent-safety-architecture-index',
    'smoke:phase85-workspace-agent-safety-architecture-final-regression-anchor',
    'smoke:phase86-workspace-agent-post-freeze-integrity-summary',
    'smoke:phase87-workspace-agent-safety-baseline-documentation-map',
    'smoke:phase88-workspace-agent-final-safety-baseline-rollup',
    'smoke:phase89-workspace-agent-safety-baseline-final-release-checklist',
    'smoke:phase90-workspace-agent-safety-baseline-archive-release-tag',
    'smoke:phase91-workspace-agent-post-archive-tag-integrity'
  ];

  for (const scriptName of requiredScripts) {
    check(`Package.json has ${scriptName}`, packageJsonContent.includes(`"${scriptName}"`));
  }

  // 7. No-Execution Boundary Preservation
  console.log('\n--- No-Execution Boundary Preservation ---');
  const forbiddenPhrases = [
    'execution enabled',
    'yürütme etkin',
    'permission granted',
    'yetki verildi',
    'capability issued',
    'file write allowed',
    'dosya yazma etkin'
  ];
  
  let forbiddenFound = false;
  for (const phrase of forbiddenPhrases) {
    if (archiveContent.toLowerCase().includes(phrase) && 
        !archiveContent.includes('NOT') && 
        !archiveContent.includes('❌') &&
        !archiveContent.includes('Forbidden')) {
      forbiddenFound = true;
    }
  }
  check('Archive preserves no-execution boundary', !forbiddenFound);

  // 8. Archive Governance Preservation
  console.log('\n--- Archive Governance Preservation ---');
  check('Archive preserves read-only lock status', 
    archiveContent.includes('Read-Only'));
  check('Archive preserves governance escalation rules', 
    archiveContent.includes('Governance Escalation'));
  check('Archive enforces no modifications without governance', 
    archiveContent.includes('no modifications without'));
  check('Archive mandates separate design for execution', 
    archiveContent.includes('SEPARATE design'));

  // 9. Archive Manifest Preservation
  console.log('\n--- Archive Manifest Preservation ---');
  check('Archive preserves documentation tier structure', 
    archiveContent.includes('Tier 1:'));
  check('Archive contains smoke test infrastructure manifest', 
    archiveContent.includes('Smoke Test Infrastructure Manifest'));
  check('Archive lists all phase references', 
    archiveContent.includes('Phase 83') && 
    archiveContent.includes('Phase 90'));

  // 10. Archive Exit Verification
  console.log('\n--- Archive Exit Verification ---');
  check('Archive contains exit verification checklist', 
    archiveContent.includes('9. Archive Exit Verification Checklist'));
  check('Archive confirms all exit criteria present', 
    archiveContent.includes('✅'));

  // 11. Permanent Seal Status
  console.log('\n--- Permanent Seal Status ---');
  check('Archive confirms permanent seal status', 
    archiveContent.includes('🔒') || archiveContent.includes('SEALED'));
  check('Archive contains final beyan (declaration)', 
    archiveContent.includes('FINAL BEYAN'));

  // 12. Cross-Archive References
  console.log('\n--- Cross-Archive References ---');
  const checklistContent = fs.readFileSync(
    path.join(workspaceRoot, 'docs/workspace-agent-safety-baseline-final-release-checklist.md'), 
    'utf-8'
  );
  check('Phase 89 checklist still references Phase 90', 
    checklistContent.includes('Archive') || checklistContent.includes('Faz 90'));

  // 13. Release Tag Readiness
  console.log('\n--- Release Tag Readiness ---');
  check('Archive confirms tag format workspace-agent-safety-baseline-v1.0.0', 
    archiveContent.includes('workspace-agent-safety-baseline-v1.0.0'));
  check('Archive specifies tag as READY status', 
    archiveContent.includes('Ready for'));
  check('Archive documents immutable state upon tag', 
    archiveContent.includes('immutable'));

  // Summary Output
  console.log(`\n--- Post-Archive Tag Integrity Smoke Summary (Phase 91) ---`);
  console.log(`✓ Passed: ${passedCount}`);
  console.log(`✗ Failed: ${failedCount}`);
  
  if (failedCount === 0) {
    console.log(`\n✅ Status: WORKSPACE AGENT SAFETY BASELINE — ARCHIVE INTEGRITY VERIFIED`);
    console.log(`   - Phase 90 Archive Document: Intact`);
    console.log(`   - All Archived Documentation: 8/8 files present`);
    console.log(`   - All Smoke Test Scripts: 8/8 scripts intact`);
    console.log(`   - All Package.json Registrations: 8/8 present`);
    console.log(`   - Release Tag: workspace-agent-safety-baseline-v1.0.0 (Ready)`);
    console.log(`   - Phase 89 Authority: Confirmed as final audit-exit`);
    console.log(`   - No-Execution Boundary: Preserved and enforced`);
    console.log(`   - Archive Governance: Read-only + escalation intact`);
    console.log(`   - Status: Ready for release tag creation`);
    console.log(`\nPhase 91: Post-archive tag integrity verification successful.`);
  } else {
    console.error(`\n✗ Status: ARCHIVE INTEGRITY FAILED`);
    console.error(`- Failed Check Names: ${failedChecks.join(', ')}`);
    process.exit(1);
  }
}

runPostArchiveTagIntegritySmokeTest().catch(err => {
  console.error('Smoke test crashed:', err);
  process.exit(1);
});
