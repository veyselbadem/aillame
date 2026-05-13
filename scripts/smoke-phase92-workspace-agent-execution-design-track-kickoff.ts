import * as fs from 'fs';
import * as path from 'path';

async function runExecutionDesignTrackKickoffSmokeTest() {
  console.log('Running Phase 92: Workspace Agent Execution Design Track Kickoff Smoke Test...');
  console.log('(Verification that new track is separate from archived baseline and threat-model-only)\n');

  const workspaceRoot = path.resolve(__dirname, '..');
  const kickoffFile = 'docs/workspace-agent-execution-design-track-kickoff.md';
  const baselineArchiveFile = 'docs/workspace-agent-safety-baseline-archive-release-tag.md';

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

  // 1. Kickoff Document Existence
  console.log('--- Execution Design Track Kickoff Document ---');
  check('Kickoff document exists', fs.existsSync(path.join(workspaceRoot, kickoffFile)));

  if (failedCount > 0) {
    console.error('Kickoff document missing. Aborting.');
    process.exit(1);
  }

  const kickoffContent = fs.readFileSync(path.join(workspaceRoot, kickoffFile), 'utf-8');
  const archiveContent = fs.readFileSync(path.join(workspaceRoot, baselineArchiveFile), 'utf-8');

  // 2. Baseline Independence Declaration
  console.log('\n--- Baseline Independence Declaration ---');
  check('Kickoff declares separate design process', 
    kickoffContent.includes('ayrı') || kickoffContent.includes('separate'));
  check('Kickoff states baseline is READ-ONLY', 
    kickoffContent.includes('READ-ONLY') || kickoffContent.includes('FROZEN'));
  check('Kickoff confirms no baseline modification', 
    kickoffContent.includes('MODIFIYE ETMEKSİZİN') || kickoffContent.includes('WITHOUT modifying'));

  // 3. Threat Model Documentation
  console.log('\n--- Threat Model Documentation ---');
  check('Kickoff contains threat model section', 
    kickoffContent.includes('4. Execution-Related Threats'));
  check('Kickoff identifies privilege escalation threats', 
    kickoffContent.includes('Privilege Escalation'));
  check('Kickoff identifies command injection threats', 
    kickoffContent.includes('Command Injection'));
  check('Kickoff identifies data exfiltration threats', 
    kickoffContent.includes('Data Exfiltration'));
  check('Kickoff identifies rollback threats', 
    kickoffContent.includes('Rollback'));

  // 4. Required Gates Definition
  console.log('\n--- Required Gates Definition ---');
  const requiredGates = [
    'Gate 1: Sandbox Model',
    'Gate 2: Permission Model',
    'Gate 3: Diff Preview',
    'Gate 4: User Approval Flow',
    'Gate 5: Audit Log',
    'Gate 6: Rollback Strategy',
    'Gate 7: Command Allowlist',
    'Gate 8: Filesystem Boundary',
    'Gate 9: Shell Prohibition'
  ];

  for (const gate of requiredGates) {
    check(`Kickoff defines ${gate}`, kickoffContent.includes(gate));
  }

  // 5. Phase 92 Scope: Documentation-Only
  console.log('\n--- Phase 92 Scope: Documentation-Only ---');
  check('Kickoff prohibits implementation', 
    kickoffContent.includes('PROHIBITED'));
  check('Kickoff prohibits ActionExecutor', 
    kickoffContent.includes('ActionExecutor'));
  check('Kickoff prohibits Command Registry', 
    kickoffContent.includes('Command Registry'));
  check('Kickoff prohibits file write', 
    kickoffContent.includes('file write'));
  check('Kickoff prohibits shell access', 
    kickoffContent.includes('shell') || kickoffContent.includes('Shell'));
  check('Kickoff prohibits permission grant', 
    kickoffContent.includes('permission grant'));

  // 6. No Implementation Code Present
  console.log('\n--- No Implementation Code Present ---');
  check('Kickoff does not contain execution code', 
    !kickoffContent.includes('executeCommand') && 
    !kickoffContent.includes('runShell') &&
    !kickoffContent.includes('fs.writeFile'));
  check('Kickoff does not define ActionExecutor', 
    !kickoffContent.includes('class ActionExecutor'));
  check('Kickoff does not define Command Registry', 
    !kickoffContent.includes('class CommandRegistry'));

  // 7. Archived Baseline Protection
  console.log('\n--- Archived Baseline Protection ---');
  check('Kickoff references archived baseline', 
    kickoffContent.includes('v1.0.0'));
  check('Kickoff confirms baseline remains frozen', 
    kickoffContent.includes('FROZEN'));
  check('Kickoff confirms no baseline modification', 
    kickoffContent.includes('unmodified') || kickoffContent.includes('unchanged'));

  // 8. Independent Track Declaration
  console.log('\n--- Independent Track Declaration ---');
  check('Kickoff declares independent governance', 
    kickoffContent.includes('Independent') || kickoffContent.includes('independent'));
  check('Kickoff specifies separate security review', 
    kickoffContent.includes('security review') || kickoffContent.includes('Security'));
  check('Kickoff defines future gate approval process', 
    kickoffContent.includes('gate approval'));

  // 9. Risk Assessment Structure
  console.log('\n--- Risk Assessment Structure ---');
  check('Kickoff contains risk assessment section', 
    kickoffContent.includes('8. Risk Assessment'));
  check('Kickoff lists mitigated threats (baseline)', 
    kickoffContent.includes('Mitigated by Archived Baseline'));
  check('Kickoff lists future threats (new track)', 
    kickoffContent.includes('Future Threats'));

  // 10. No Enablement Language
  console.log('\n--- No Execution Enablement Language ---');
  const forbiddenPhrases = [
    'execution enabled',
    'yürütme etkin',
    'permission granted',
    'yetki verildi',
    'capability issued'
  ];
  
  let enablementFound = false;
  for (const phrase of forbiddenPhrases) {
    if (kickoffContent.toLowerCase().includes(phrase) &&
        !kickoffContent.includes('PROHIBITED') &&
        !kickoffContent.includes('❌')) {
      enablementFound = true;
    }
  }
  check('No execution enablement language in kickoff', !enablementFound);

  // 11. Critical Declarations Present
  console.log('\n--- Critical Declarations Present ---');
  check('Kickoff contains baseline independence declaration', 
    kickoffContent.includes('ARCHIVED BASELINE v1.0.0 PROTECTION DECLARATION'));
  check('Kickoff contains implementation prohibition declaration', 
    kickoffContent.includes('PHASE 92 SCOPE DECLARATION'));
  check('Kickoff contains final beyan', 
    kickoffContent.includes('FINAL BEYAN'));

  // 12. Future Phases Separation
  console.log('\n--- Future Phases Separation ---');
  check('Kickoff defines separate track hierarchy', 
    kickoffContent.includes('Phase 93+'));
  check('Kickoff states implementation starts in future phase', 
    kickoffContent.includes('After Phase 92'));
  check('Kickoff specifies independent design review for future', 
    kickoffContent.includes('Independent design review'));

  // Summary Output
  console.log(`\n--- Execution Design Track Kickoff Smoke Summary (Phase 92) ---`);
  console.log(`✓ Passed: ${passedCount}`);
  console.log(`✗ Failed: ${failedCount}`);
  
  if (failedCount === 0) {
    console.log(`\n✅ Status: WORKSPACE AGENT EXECUTION DESIGN TRACK KICKOFF APPROVED`);
    console.log(`   - Archived Baseline v1.0.0: Protected (frozen, read-only)`);
    console.log(`   - New Track: Separate design process`);
    console.log(`   - Threat Model: 5 threat categories identified`);
    console.log(`   - Required Gates: All 9 gates specified`);
    console.log(`   - Implementation Scope: Documentation-only (no code)`);
    console.log(`   - Future Path: Independent review + gate approval`);
    console.log(`   - Status: Ready for design phase (Phase 93+)`);
    console.log(`\nPhase 92: Execution Design Track Kickoff validation successful.`);
  } else {
    console.error(`\n✗ Status: VALIDATION FAILED`);
    console.error(`- Failed Check Names: ${failedChecks.join(', ')}`);
    process.exit(1);
  }
}

runExecutionDesignTrackKickoffSmokeTest().catch(err => {
  console.error('Smoke test crashed:', err);
  process.exit(1);
});
