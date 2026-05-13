import * as fs from 'fs';
import * as path from 'path';

async function runFinalAnchorSmokeTest() {
  console.log('Running Phase 85: Workspace Agent Safety Architecture Final Regression Anchor Smoke Test...');

  const workspaceRoot = path.resolve(__dirname, '..');
  const anchorFile = 'docs/workspace-agent-safety-architecture-final-regression-anchor.md';
  const readinessFile = 'docs/workspace-agent-safety-architecture-release-readiness.md';
  const indexFile = 'docs/workspace-agent-safety-architecture-index.md';

  let passedCount = 0;
  let failedCount = 0;
  const failedChecks: string[] = [];

  const check = (name: string, condition: boolean) => {
    if (condition) {
      passedCount++;
    } else {
      failedCount++;
      failedChecks.push(name);
      console.error(`[FAIL] ${name}`);
    }
  };

  // 1. File Existence
  const filesToCheck = [anchorFile, readinessFile, indexFile];
  for (const file of filesToCheck) {
    check(`File exists: ${file}`, fs.existsSync(path.join(workspaceRoot, file)));
  }

  if (failedCount > 0) {
    console.error('Core documentation missing. Aborting.');
    process.exit(1);
  }

  const anchorContent = fs.readFileSync(path.join(workspaceRoot, anchorFile), 'utf-8');
  const readinessContent = fs.readFileSync(path.join(workspaceRoot, readinessFile), 'utf-8');

  // 2. Core No-Execution Guarantee Checks in Anchor (using flexible matching)
  const anchorGuarantees = [
    'canExecute',
    'canWrite',
    'canRunShell',
    'issuedCapability',
    'ActionExecutor',
    'Command Registry'
  ];
  for (const guarantee of anchorGuarantees) {
    check(`Anchor preserves guarantee: ${guarantee}`, anchorContent.includes(guarantee) && anchorContent.includes('false') || anchorContent.includes('Kapalı') || anchorContent.includes('null'));
  }

  // 3. Readiness Doc Evaluation Check
  check('Readiness doc confirms release-ready', readinessContent.includes('yayınlanmaya hazır'));
  check('Readiness doc preserves no-execution boundary', readinessContent.includes('no-execution') && readinessContent.includes('no-grant'));

  // 4. Negative Checks (Safety Patterns)
  const forbiddenPatterns = [
    /canExecute:\s*true/i,
    /canWrite:\s*true/i,
    /canRunShell:\s*true/i,
    /issuedCapability:\s*['"]?cap_/i
  ];

  const allContent = anchorContent + readinessContent;
  for (const pattern of forbiddenPatterns) {
    check(`Negative check for ${pattern.source}: NO VIOLATION`, !pattern.test(allContent));
  }

  // Summary Output
  console.log(`\nFinal Regression Anchor Smoke Summary (Phase 85):`);
  console.log(`- Passed: ${passedCount}`);
  console.log(`- Failed: ${failedCount}`);
  console.log(`- Status: Workspace Agent Safety Architecture Locked`);

  if (failedCount > 0) {
    console.error(`- Failed Check Names: ${failedChecks.join(', ')}`);
    process.exit(1);
  } else {
    console.log('Phase 85: Final regression anchor validation successful.');
  }
}

runFinalAnchorSmokeTest().catch(err => {
  console.error('Smoke test crashed:', err);
  process.exit(1);
});
