import * as fs from 'fs';
import * as path from 'path';

async function runPostFreezeIntegritySmokeTest() {
  console.log('Running Phase 86: Workspace Agent Post-Freeze Integrity Summary Smoke Test...');

  const workspaceRoot = path.resolve(__dirname, '..');
  const summaryFile = 'docs/workspace-agent-post-freeze-integrity-summary.md';
  const anchorFile = 'docs/workspace-agent-safety-architecture-final-regression-anchor.md';

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
  const filesToCheck = [summaryFile, anchorFile];
  for (const file of filesToCheck) {
    check(`File exists: ${file}`, fs.existsSync(path.join(workspaceRoot, file)));
  }

  if (failedCount > 0) {
    console.error('Core documentation missing. Aborting.');
    process.exit(1);
  }

  const summaryContent = fs.readFileSync(path.join(workspaceRoot, summaryFile), 'utf-8');

  // 2. Integrity Principle Checks
  check('Summary clarifies NOT an execution roadmap', summaryContent.includes('yürütme yol haritası') && summaryContent.includes('olmadığını tescil eder'));
  check('Summary requires separate design track for execution', summaryContent.includes('ayrı bir tasarım') && summaryContent.includes('kulvarından başlamalıdır'));
  check('Summary preserves Pure-Security-Baseline status', summaryContent.includes('Pure-Security-Baseline'));

  // 3. Negative Checks (Guard against execution enablement wording)
  const forbiddenEnablementPhrases = [
    'execution is now enabled',
    'yürütme artık etkindir',
    'permission is granted',
    'yetki verilmiştir',
    'system is ready to run commands',
    'komutları çalıştırmaya hazırdır',
    'this roadmap enables execution',
    'bu yol haritası yürütmeyi etkinleştirir'
  ];

  for (const phrase of forbiddenEnablementPhrases) {
    check(`Negative check for enablement phrase "${phrase}": NO VIOLATION`, !summaryContent.toLowerCase().includes(phrase.toLowerCase()));
  }

  // Summary Output
  console.log(`\nPost-Freeze Integrity Smoke Summary (Phase 86):`);
  console.log(`- Passed: ${passedCount}`);
  console.log(`- Failed: ${failedCount}`);
  console.log(`- Status: Execution Roadmap Boundary Secured`);

  if (failedCount > 0) {
    console.error(`- Failed Check Names: ${failedChecks.join(', ')}`);
    process.exit(1);
  } else {
    console.log('Phase 86: Post-freeze integrity validation successful.');
  }
}

runPostFreezeIntegritySmokeTest().catch(err => {
  console.error('Smoke test crashed:', err);
  process.exit(1);
});
