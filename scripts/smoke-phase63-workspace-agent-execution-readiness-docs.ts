import fs from 'fs';
import path from 'path';

const DOCS_DIR = path.join(process.cwd(), 'docs');
const README_PATH = path.join(process.cwd(), 'README.md');
const FLOW_DOC_PATH = path.join(DOCS_DIR, 'workspace-agent-execution-readiness.md');
const SAFETY_DOC_PATH = path.join(DOCS_DIR, 'workspace-agent-execution-readiness-safety-checklist.md');
const RELEASE_DOC_PATH = path.join(DOCS_DIR, 'workspace-agent-execution-readiness-release-readiness.md');

function runDocsSmokeTest() {
  console.log('Running Phase 67: Workspace Agent Execution Readiness Docs Smoke Test Update...');
  
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

  // 1. File existence checks
  check('README.md exists', fs.existsSync(README_PATH));
  check('Flow doc exists', fs.existsSync(FLOW_DOC_PATH));
  check('Safety checklist doc exists', fs.existsSync(SAFETY_DOC_PATH));
  check('Release readiness doc exists', fs.existsSync(RELEASE_DOC_PATH));

  if (failedCount > 0) {
    console.error(`Basic file existence checks failed. Aborting further checks.`);
    process.exit(1);
  }

  const readmeContent = fs.readFileSync(README_PATH, 'utf8');
  const flowContent = fs.readFileSync(FLOW_DOC_PATH, 'utf8');
  const safetyContent = fs.readFileSync(SAFETY_DOC_PATH, 'utf8');
  const releaseContent = fs.readFileSync(RELEASE_DOC_PATH, 'utf8');

  // 2. Cross-link and README link checks
  check('Flow doc links to Safety Checklist', flowContent.includes('workspace-agent-execution-readiness-safety-checklist.md'));
  check('Safety Checklist links to Flow doc', safetyContent.includes('workspace-agent-execution-readiness.md'));
  
  const readmeLinks = [
    'docs/workspace-agent-execution-readiness.md',
    'docs/workspace-agent-execution-readiness-safety-checklist.md',
    'docs/workspace-agent-execution-readiness-release-readiness.md'
  ];
  readmeLinks.forEach(link => check(`README links to doc: ${link}`, readmeContent.includes(link)));

  // 3. Final Regression Reference Check (Phase 65)
  const regressionCommand = 'npm run smoke:phase65-execution-readiness-final-regression';
  const docsToSearch = [readmeContent, flowContent, safetyContent, releaseContent];
  docsToSearch.forEach((content, i) => {
    check(`Final regression reference found in doc ${i}`, content.includes(regressionCommand));
  });

  // 4. Mandatory header/content checks (Flow Doc)
  const flowMandatory = [
    'Workspace Agent Execution Readiness Flow',
    'Bu sistem ne değildir?',
    'Güvenlik Sınırları',
    'Readiness-Only Contract',
    'Permission Requirement Davranışı',
    'Preflight Check Davranışı',
    'Preview UI Davranışı',
    'Review State Davranışı',
    'Review Summary Davranışı',
    'Test ve smoke scriptleri'
  ];
  flowMandatory.forEach(h => check(`Flow doc contains mandatory text: ${h}`, flowContent.toLowerCase().includes(h.toLowerCase())));

  // 5. Mandatory header/content checks (Safety Doc)
  const safetyMandatory = [
    'Workspace Agent Execution Readiness Safety Checklist',
    'Readiness-Only Sınırı',
    'Permission Requirement Güvenliği',
    'Preflight Check Güvenliği',
    'UI / Preview Güvenliği',
    'Review State Güvenliği',
    'Review Summary Güvenliği',
    'Execution / Tool Sınırları',
    'Kod Review Checklist\'i',
    'Yasak Değişiklikler'
  ];
  safetyMandatory.forEach(h => check(`Safety doc contains mandatory text: ${h}`, safetyContent.toLowerCase().includes(h.toLowerCase())));

  // 6. Mandatory header/content checks (Release Doc)
  const releaseMandatory = [
    'Workspace Agent Execution Readiness Release Readiness Summary',
    'Tamamlanan ana yetenekler',
    'Güvenlik sınırları',
    'Bilinçli olarak yapılmayanlar',
    'Test ve smoke durumu',
    'Release readiness değerlendirmesi',
    'Kalan riskler / dikkat noktaları'
  ];
  releaseMandatory.forEach(h => check(`Release doc contains mandatory text: ${h}`, releaseContent.toLowerCase().includes(h.toLowerCase())));

  // 7. Security keywords checks
  const securityKeywords = [
    'readiness_only',
    'satisfied=false',
    'active grant count 0',
    'no execution',
    'no grant',
    'ActionExecutor',
    'Command Registry',
    'shell command',
    'file write',
    'localStorage',
    'sessionStorage',
    'hidden/system prompt'
  ];
  securityKeywords.forEach(kw => {
    const found = docsToSearch.some(content => content.toLowerCase().includes(kw.toLowerCase()));
    check(`Security keyword found in docs: ${kw}`, found);
  });

  // Release-specific keywords
  const releaseKeywords = [
    'readiness-only',
    'no-grant',
    'no-execution',
    'no-persistence',
    'gerçek execution için geçerli değildir'
  ];
  releaseKeywords.forEach(kw => check(`Release doc contains security keyword: ${kw}`, releaseContent.toLowerCase().includes(kw.toLowerCase())));

  // 8. Sensitive content negative checks
  const sensitivePatterns = [
    /[A-Z]:\\Users\\[a-zA-Z0-9._-]+/i, // Windows user path
    /\/home\/[a-zA-Z0-9._-]+/i, // Unix home path
    /AILLAME_[A-Z_]+=[^\s]+/i, // .env pattern
    /(secret|token|password|key)\s*[:=]\s*["']?[a-zA-Z0-9]{10,}/i, // Secret/token pattern
    /at\s+[a-zA-Z0-9._-]+\s+\(file:.*\.ts:\d+:\d+\)/i, // Stack trace pattern
    /PID:\s*\d+/i // PID pattern
  ];

  const allContent = docsToSearch.join('\n');
  sensitivePatterns.forEach((pattern, i) => {
    const match = allContent.match(pattern);
    const isMatched = match && !match[0].includes('[REDACTED]') && !match[0].includes('example.ts') && !match[0].includes('README.md');
    check(`Sensitive pattern check ${i} (must not exist)`, !isMatched);
  });

  // 9. Output summary
  console.log(`\nDocs Smoke Test Summary (Updated Phase 67):`);
  console.log(`- Checked docs: README.md, flow-doc, safety-doc, release-doc`);
  console.log(`- Passed: ${passedCount}`);
  console.log(`- Failed: ${failedCount}`);

  if (failedCount > 0) {
    console.error(`- Failed Checks: ${failedChecks.join(', ')}`);
    process.exit(1);
  } else {
    console.log('All documentation integrity checks passed.');
  }
}

runDocsSmokeTest();
