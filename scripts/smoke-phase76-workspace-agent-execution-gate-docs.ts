import * as fs from 'fs';
import * as path from 'path';

async function runGateDocsSmokeTest() {
  console.log('Running Phase 80: Workspace Agent Execution Gate Docs Smoke Update...');

  const workspaceRoot = path.resolve(__dirname, '..');
  const filesToCheck = [
    'README.md',
    'docs/workspace-agent-execution-gate.md',
    'docs/workspace-agent-execution-gate-safety-checklist.md',
    'docs/workspace-agent-execution-gate-release-readiness.md'
  ];

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
  for (const file of filesToCheck) {
    const filePath = path.join(workspaceRoot, file);
    check(`File exists: ${file}`, fs.existsSync(filePath));
  }

  if (failedCount > 0) {
    console.error('Critical files missing. Aborting further checks.');
    process.exit(1);
  }

  const readmeContent = fs.readFileSync(path.join(workspaceRoot, 'README.md'), 'utf-8');
  const gateFlowContent = fs.readFileSync(path.join(workspaceRoot, 'docs/workspace-agent-execution-gate.md'), 'utf-8');
  const checklistContent = fs.readFileSync(path.join(workspaceRoot, 'docs/workspace-agent-execution-gate-safety-checklist.md'), 'utf-8');
  const readinessContent = fs.readFileSync(path.join(workspaceRoot, 'docs/workspace-agent-execution-gate-release-readiness.md'), 'utf-8');

  // 2. Cross-link Checks
  check('README contains Gate Flow link', readmeContent.includes('docs/workspace-agent-execution-gate.md'));
  check('README contains Safety Checklist link', readmeContent.includes('docs/workspace-agent-execution-gate-safety-checklist.md'));
  check('README contains Release Readiness link', readmeContent.includes('docs/workspace-agent-execution-gate-release-readiness.md'));
  check('Gate Flow contains Safety Checklist link', gateFlowContent.includes('workspace-agent-execution-gate-safety-checklist.md'));
  check('Safety Checklist contains Gate Flow link', checklistContent.includes('workspace-agent-execution-gate.md'));

  // 3. Final Regression Reference Check (Phase 78)
  const regressionCommand = 'npm run smoke:phase78-execution-gate-final-regression';
  check('README contains Final Regression ref', readmeContent.includes(regressionCommand));
  check('Gate Flow contains Final Regression ref', gateFlowContent.includes(regressionCommand));
  check('Safety Checklist contains Final Regression ref', checklistContent.includes(regressionCommand));
  check('Release Readiness contains Final Regression ref', readinessContent.includes(regressionCommand));

  // 4. Mandatory Headings/Content - Release Readiness
  const readinessRequired = [
    'Workspace Agent Execution Gate Release Readiness Summary',
    'Tamamlanan Ana Yetenekler',
    'Güvenlik Sınırları',
    'Bilinçli Olarak Yapılmayanlar',
    'Test ve Smoke Durumu',
    'Release Readiness Değerlendirmesi',
    'Kalan Riskler / Dikkat Noktaları'
  ];
  for (const text of readinessRequired) {
    check(`Release Readiness contains: ${text}`, readinessContent.includes(text));
  }

  // 5. Security Keywords (Expanded)
  const securityKeywords = [
    'gate_check_only',
    'canExecute=false',
    'canWrite=false',
    'canRunShell=false',
    'issuedCapability=null',
    'active capability count 0',
    'no-execution',
    'no-grant',
    'no-capability',
    'no-persistence',
    'gate-only',
    'ActionExecutor',
    'Command Registry',
    'shell command',
    'file write',
    'localStorage',
    'sessionStorage',
    'hidden prompt',
    'için geçerli değildir'
  ];
  for (const keyword of securityKeywords) {
    const foundInAny = gateFlowContent.includes(keyword) || 
                       checklistContent.includes(keyword) || 
                       readmeContent.includes(keyword) ||
                       readinessContent.includes(keyword);
    check(`Security keyword found in docs: ${keyword}`, foundInAny);
  }

  // 6. Negative Checks (Sensitive Patterns)
  const sensitivePatterns = [
    /[a-zA-Z]:\\Users\\[\w.-]+/i, // Windows user path
    /\/home\/[\w.-]+/i,           // Unix home path
    /API_KEY\s*=\s*['"]?[\w-]{10,}['"]?/i, // API Key pattern
    /PASSWORD\s*=\s*['"]?[\w-]{5,}['"]?/i, // Password pattern
    /at\s+[\w.-]+\s+\([\w.-]+:\d+:\d+\)/,   // Stack trace pattern
    /PID\s*[:=]?\s*\d+/i,         // PID pattern
    /fullPath\s*[:=]\s*['"]?\/[^'"]+['"]?/i, // fullPath leak
    /canonicalPath\s*[:=]\s*['"]?\/[^'"]+['"]?/i // canonicalPath leak
  ];

  const allDocContent = readmeContent + gateFlowContent + checklistContent + readinessContent;
  for (const pattern of sensitivePatterns) {
    const match = allDocContent.match(pattern);
    check(`Negative check for pattern ${pattern.source}: NO LEAK`, match === null);
  }

  // Summary
  console.log(`\nDocs Smoke Test Summary (Phase 80):`);
  console.log(`- Passed: ${passedCount}`);
  console.log(`- Failed: ${failedCount}`);
  console.log(`- Checked Docs: ${filesToCheck.join(', ')}`);

  if (failedCount > 0) {
    console.error(`- Failed Check Names: ${failedChecks.join(', ')}`);
    process.exit(1);
  } else {
    console.log('Workspace Agent Execution Gate documentation verification (Phase 80) successful.');
  }
}

runGateDocsSmokeTest().catch(err => {
  console.error('Smoke test crashed:', err);
  process.exit(1);
});
