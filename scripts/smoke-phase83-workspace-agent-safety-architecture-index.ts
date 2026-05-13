import * as fs from 'fs';
import * as path from 'path';

async function runIndexIntegritySmokeTest() {
  console.log('Running Phase 83: Workspace Agent Safety Architecture Index Integrity Smoke Test...');

  const workspaceRoot = path.resolve(__dirname, '..');
  const filesToCheck = [
    'README.md',
    'docs/workspace-agent-safety-architecture-index.md',
    'docs/manual-workspace-context.md',
    'docs/manual-workspace-context-safety-checklist.md',
    'docs/manual-workspace-context-release-readiness.md',
    'docs/workspace-agent-plan-review.md',
    'docs/workspace-agent-plan-review-safety-checklist.md',
    'docs/workspace-agent-plan-review-release-readiness.md',
    'docs/workspace-agent-execution-readiness.md',
    'docs/workspace-agent-execution-readiness-safety-checklist.md',
    'docs/workspace-agent-execution-readiness-release-readiness.md',
    'docs/workspace-agent-execution-readiness-final-closure.md',
    'docs/workspace-agent-execution-gate.md',
    'docs/workspace-agent-execution-gate-safety-checklist.md',
    'docs/workspace-agent-execution-gate-release-readiness.md',
    'docs/workspace-agent-execution-gate-final-closure.md'
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

  const indexContent = fs.readFileSync(path.join(workspaceRoot, 'docs/workspace-agent-safety-architecture-index.md'), 'utf-8');
  const readmeContent = fs.readFileSync(path.join(workspaceRoot, 'README.md'), 'utf-8');

  // 2. README Navigation Check
  check('README contains Index link', readmeContent.includes('docs/workspace-agent-safety-architecture-index.md'));

  // 3. Index Heading/Section Check (Fixed Casing)
  const indexHeadings = [
    'Workspace Agent Safety Architecture Index',
    'Güvenlik Mimarisi Katmanları',
    'Manual Workspace Context',
    'Workspace Agent Plan/Review',
    'Execution Readiness',
    'Execution Gate',
    'Ortak Güvenlik Sınırları',
    'Release / Closure Durumu',
    'Smoke ve Regression Komutları',
    'Gerçek Execution Fazlarına Geçmeden Önce Kırmızı Çizgiler',
    'Dokümantasyon Linkleri'
  ];
  for (const heading of indexHeadings) {
    check(`Index contains heading/section: ${heading}`, indexContent.includes(heading));
  }

  // 4. Link Integrity in Index
  const requiredLinks = [
    'manual-workspace-context.md',
    'manual-workspace-context-safety-checklist.md',
    'manual-workspace-context-release-readiness.md',
    'workspace-agent-plan-review.md',
    'workspace-agent-plan-review-safety-checklist.md',
    'workspace-agent-plan-review-release-readiness.md',
    'workspace-agent-execution-readiness.md',
    'workspace-agent-execution-readiness-safety-checklist.md',
    'workspace-agent-execution-readiness-release-readiness.md',
    'workspace-agent-execution-readiness-final-closure.md',
    'workspace-agent-execution-gate.md',
    'workspace-agent-execution-gate-safety-checklist.md',
    'workspace-agent-execution-gate-release-readiness.md',
    'workspace-agent-execution-gate-final-closure.md'
  ];
  for (const link of requiredLinks) {
    check(`Index links to: ${link}`, indexContent.includes(link));
  }

  // 5. Common Security Boundaries Keywords in Index (Fixed Phrases)
  const securityKeywords = [
    'no-execution',
    'no-grant',
    'no-persistence',
    'ActionExecutor',
    'Command Registry',
    'gizli prompt',
    'localStorage',
    'sessionStorage',
    'Pano kopyalama otomatik bir akış başlatmaz'
  ];
  for (const keyword of securityKeywords) {
    check(`Index contains safety keyword: ${keyword}`, indexContent.includes(keyword));
  }

  // 6. Smoke/Regression Commands in Index
  const requiredCommands = [
    'npm run smoke:phase41-manual-context-flow-regression',
    'npm run smoke:phase45-manual-context-docs',
    'npm run smoke:phase47-workspace-agent-planning-boundary',
    'npm run smoke:phase48-workspace-agent-plan-preview-ui',
    'npm run smoke:phase49-workspace-agent-plan-review-skeleton',
    'npm run smoke:phase50-workspace-agent-review-summary',
    'npm run smoke:phase54-workspace-agent-plan-review-docs',
    'npm run smoke:phase56-workspace-agent-execution-readiness-boundary',
    'npm run smoke:phase57-workspace-agent-execution-readiness-preview-ui',
    'npm run smoke:phase58-workspace-agent-readiness-review-state',
    'npm run smoke:phase59-workspace-agent-readiness-review-summary',
    'npm run smoke:phase63-workspace-agent-execution-readiness-docs',
    'npm run smoke:phase65-execution-readiness-final-regression',
    'npm run smoke:phase69-workspace-agent-execution-gate-contract',
    'npm run smoke:phase70-workspace-agent-execution-gate-preview-ui',
    'npm run smoke:phase71-workspace-agent-gate-review-state',
    'npm run smoke:phase72-workspace-agent-gate-review-summary',
    'npm run smoke:phase76-workspace-agent-execution-gate-docs',
    'npm run smoke:phase78-execution-gate-final-regression',
    'npm run typecheck',
    'npm run build'
  ];
  for (const command of requiredCommands) {
    check(`Index contains command: ${command}`, indexContent.includes(command));
  }

  // 7. Negative Checks (Sensitive Patterns) across all docs
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

  let allDocContentCombined = '';
  for (const file of filesToCheck) {
    allDocContentCombined += fs.readFileSync(path.join(workspaceRoot, file), 'utf-8') + '\n';
  }

  for (const pattern of sensitivePatterns) {
    const match = allDocContentCombined.match(pattern);
    check(`Negative check for pattern ${pattern.source}: NO LEAK`, match === null);
  }

  // Summary Output
  console.log(`\nIndex Integrity Smoke Summary (Phase 83):`);
  console.log(`- Passed: ${passedCount}`);
  console.log(`- Failed: ${failedCount}`);
  console.log(`- Checked Docs: README.md, Index, and 14 Child Docs`);

  if (failedCount > 0) {
    console.error(`- Failed Check Names: ${failedChecks.join(', ')}`);
    process.exit(1);
  } else {
    console.log('Workspace Agent Safety Architecture Index integrity (Phase 83) successful.');
  }
}

runIndexIntegritySmokeTest().catch(err => {
  console.error('Smoke test crashed:', err);
  process.exit(1);
});
