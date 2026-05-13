import * as fs from 'fs';
import * as path from 'path';

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function checkFileExists(filePath: string): string {
  assert(fs.existsSync(filePath), `File not found: ${filePath}`);
  return fs.readFileSync(filePath, 'utf-8');
}

async function runSmokeTest() {
  console.log("Running Phase 54 Workspace Agent Plan/Review Docs Smoke tests...");

  const rootDir = path.resolve(__dirname, '..');
  const readmePath = path.join(rootDir, 'README.md');
  const flowDocPath = path.join(rootDir, 'docs', 'workspace-agent-plan-review.md');
  const checklistDocPath = path.join(rootDir, 'docs', 'workspace-agent-plan-review-safety-checklist.md');

  // 1. Existence check
  const readmeContent = checkFileExists(readmePath);
  const flowContent = checkFileExists(flowDocPath);
  const checklistContent = checkFileExists(checklistDocPath);
  console.log("- All documentation files exist.");

  // 2. Cross-link integrity
  assert(flowContent.includes('workspace-agent-plan-review-safety-checklist.md'), "Flow doc missing link to checklist.");
  assert(checklistContent.includes('workspace-agent-plan-review.md'), "Checklist doc missing link to flow doc.");
  assert(readmeContent.includes('docs/workspace-agent-plan-review.md'), "README missing link to flow doc.");
  assert(readmeContent.includes('docs/workspace-agent-plan-review-safety-checklist.md'), "README missing link to checklist.");
  console.log("- Cross-link integrity verified.");

  // 3. Mandatory Headings / Texts in Flow Doc
  const flowRequired = [
    "Workspace Agent Plan/Review Flow",
    "Bu Sistem Ne Değildir?",
    "Güvenlik Sınırları",
    "Plan-only Contract",
    "Preview UI Davranışı",
    "Review / Approval Skeleton Davranışı",
    "Review Summary Davranışı",
    "Test ve Smoke Scriptleri"
  ];
  flowRequired.forEach(text => {
    assert(flowContent.includes(text), `Flow doc missing required text: ${text}`);
  });
  console.log("- Flow doc mandatory content verified.");

  // 4. Mandatory Headings / Texts in Checklist Doc
  const checklistRequired = [
    "Workspace Agent Plan/Review Safety Checklist",
    "Plan-Only Sınırı",
    "UI / Preview Güvenliği",
    "Review / Approval Güvenliği",
    "Summary Export Güvenliği",
    "Execution / Tool Sınırları",
    "Kod Review Checklist'i",
    "Yasak Değişiklikler"
  ];
  checklistRequired.forEach(text => {
    assert(checklistContent.includes(text), `Checklist doc missing required text: ${text}`);
  });
  console.log("- Checklist doc mandatory content verified.");

  // 5. Security Boundary Keywords
  const securityKeywords = [
    "plan-only",
    "executable=false",
    "ActionExecutor",
    "Command Registry",
    "shell komut",
    "dosya yazma",
    "localStorage",
    "sessionStorage",
    "hidden prompt"
  ];
  const allContent = flowContent + checklistContent + readmeContent;
  securityKeywords.forEach(keyword => {
    assert(allContent.toLowerCase().includes(keyword.toLowerCase()), `Missing security keyword in documentation: ${keyword}`);
  });
  console.log("- Security boundary keywords verified.");

  // 6. Sensitive Content Negative Check
  const sensitivePatterns = [
    /[a-zA-Z]:\\Users\\[^\\]+/i,             // Real Windows user path
    /\/home\/[^\/]+/i,                       // Real Unix home path
    /AILLAME_[A-Z_]+=[^\s]+/i,               // raw .env style secret
    /fullPath\s*[:=]\s*["'][^"']+["']/i,     // fullPath value example
    /canonicalPath\s*[:=]\s*["'][^"']+["']/i // canonicalPath value example
  ];
  sensitivePatterns.forEach(pattern => {
    assert(!pattern.test(allContent), `Sensitive pattern detected in documentation: ${pattern.source}`);
  });
  console.log("- Negative check for sensitive content passed.");

  console.log("Phase 54 workspace agent plan/review docs smoke tests passed.");
}

runSmokeTest().catch((error) => {
  console.error("Phase 54 workspace agent plan/review docs smoke tests failed:", error.message);
  process.exit(1);
});
