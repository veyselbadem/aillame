import * as fs from 'fs';
import * as path from 'path';
import { evaluateWorkspaceAgentExecutionGate } from '../src/core/agent/execution-gate/gate-boundary';
import { mapGateResultToRenderData } from '../src/core/agent/execution-gate/gate-preview-presenter';
import { createInitialGateReviewState } from '../src/core/agent/execution-gate/gate-review-state';
import { createGateReviewSummary, createGateReviewSummaryText } from '../src/core/agent/execution-gate/gate-review-summary';
import { 
  updateGateDecisionReview, 
  updateGateCheckReview, 
  updateGateRiskReview 
} from '../src/core/agent/execution-gate/gate-review-state';

async function runFinalRegressionSuite() {
  console.log('Running Phase 78: Workspace Agent Execution Gate Final Regression Suite...');

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

  const workspaceRoot = path.resolve(__dirname, '..');

  // --- A. Gate Boundary & Decision Safety ---
  const safeRequest = {
    requestId: 'req_123',
    planId: 'plan_456',
    requestedMode: 'gate_check_only' as any,
    userVisibleSummary: 'Read some files to understand the project structure',
    userConfirmationText: 'I agree to read files only.'
  };

  const gateResult = await evaluateWorkspaceAgentExecutionGate(safeRequest as any);
  
  check('Gate result produced for gate_check_only', !!gateResult);
  check('Decision is NOT allowed', gateResult.decision !== 'allowed' as any);
  check('Decision is NOT granted', gateResult.decision !== 'granted' as any);
  check('canExecute is false', gateResult.canExecute === false);
  check('canWrite is false', gateResult.canWrite === false);
  check('canRunShell is false', gateResult.canRunShell === false);
  check('issuedCapability is null', gateResult.issuedCapability === null);

  // Intent detection (mock-like check)
  const riskyRequest = {
    requestId: 'req_risky',
    planId: 'plan_risky',
    requestedMode: 'gate_check_only' as any,
    userVisibleSummary: 'rm -rf / && write to config.json',
    userConfirmationText: 'Delete everything and write password to file'
  };
  const riskyResult = await evaluateWorkspaceAgentExecutionGate(riskyRequest as any);
  check('Risky intent produces warnings', (riskyResult.warnings?.length || 0) > 0);
  check('Risky intent produces risks', (riskyResult.risks?.length || 0) > 0);

  // --- B. Preview Presenter Safety ---
  const renderData = mapGateResultToRenderData(gateResult);
  check('Render data has decision', !!renderData.decision);
  check('Render data has NO command payload', !JSON.stringify(renderData).includes('rm -rf'));

  // --- C. Gate Review State Safety ---
  let reviewState = createInitialGateReviewState(gateResult);
  check('Initial review state created', !!reviewState);
  check('Initial status is pending', reviewState.decisionReview.reviewStatus === 'pending');

  reviewState = updateGateDecisionReview(reviewState, 'acknowledged', 'Looks safe enough for review');
  check('Decision acknowledged but NOT allowed', reviewState.decisionReview.reviewStatus === 'acknowledged');
  
  if (reviewState.checkReviews.length > 0) {
    reviewState = updateGateCheckReview(reviewState, reviewState.checkReviews[0].checkId, 'acknowledged', 'Checked');
    check('Check acknowledged', reviewState.checkReviews[0].reviewStatus === 'acknowledged');
  }

  if (reviewState.riskReviews.length > 0) {
    reviewState = updateGateRiskReview(reviewState, reviewState.riskReviews[0].riskId, 'rejected', 'Too risky');
    check('Risk rejected', reviewState.riskReviews[0].reviewStatus === 'rejected');
  }

  // --- D. Gate Review Summary Safety ---
  const summary = createGateReviewSummary(gateResult, reviewState);
  const summaryText = createGateReviewSummaryText(summary);
  
  check('Summary text produced', !!summaryText);
  check('Summary contains security notice', summaryText.includes('cannot be executed') || summaryText.includes('NO EXECUTION'));
  check('Summary contains NO capability tokens', !summaryText.includes('cap_'));
  check('Active capability count remains 0 in summary stats', summary.stats.activeCapabilityCount === 0);

  // --- E. Docs & Navigation Bütünlüğü ---
  const filesToCheck = [
    'README.md',
    'docs/workspace-agent-execution-gate.md',
    'docs/workspace-agent-execution-gate-safety-checklist.md',
    'docs/workspace-agent-execution-gate-release-readiness.md'
  ];
  for (const file of filesToCheck) {
    check(`Doc exists: ${file}`, fs.existsSync(path.join(workspaceRoot, file)));
  }

  const readmeContent = fs.readFileSync(path.join(workspaceRoot, 'README.md'), 'utf-8');
  check('README contains Execution Gate links', readmeContent.includes('docs/workspace-agent-execution-gate.md'));

  const allDocContent = filesToCheck.map(f => fs.readFileSync(path.join(workspaceRoot, f), 'utf-8')).join('\n');
  const requiredKeywords = [
    'gate-only', 'no-execution', 'no-capability', 'canExecute=false', 'issuedCapability=null', 'ActionExecutor', 'Command Registry'
  ];
  for (const keyword of requiredKeywords) {
    check(`Docs contain keyword: ${keyword}`, allDocContent.toLowerCase().includes(keyword.toLowerCase()));
  }

  // --- F. Yasak İfade ve Leak Kontrolü ---
  const forbiddenPatterns = [
    { pattern: /decision:\s*['"]?allowed['"]?/i, name: 'decision: allowed' },
    { pattern: /decision:\s*['"]?granted['"]?/i, name: 'decision: granted' },
    { pattern: /canExecute:\s*true/i, name: 'canExecute: true' },
    { pattern: /canWrite:\s*true/i, name: 'canWrite: true' },
    { pattern: /canRunShell:\s*true/i, name: 'canRunShell: true' },
    { pattern: /issuedCapability:\s*['"]?cap_[\w-]+['"]?/i, name: 'issuedCapability: <token>' },
    { pattern: /grant token/i, name: 'grant token' },
    { pattern: /execute payload/i, name: 'execute payload' },
    { pattern: /ActionExecutor enabled/i, name: 'ActionExecutor enabled' },
    { pattern: /[a-zA-Z]:\\Users\\[\w.-]+/i, name: 'Windows user path' },
    { pattern: /\/home\/[\w.-]+/i, name: 'Unix home path' },
    { pattern: /PID:\s*\d+/i, name: 'PID leak' }
  ];

  const runtimeOutputs = summaryText + JSON.stringify(renderData) + JSON.stringify(gateResult);
  for (const item of forbiddenPatterns) {
    check(`Negative check for ${item.name}: NO LEAK`, !item.pattern.test(runtimeOutputs));
  }

  // Final Summary Output (Safe)
  console.log(`\nFinal Regression Smoke Summary:`);
  console.log(`- Passed: ${passedCount}`);
  console.log(`- Failed: ${failedCount}`);
  console.log(`- Checked Modules: Gate Boundary, Preview Presenter, Review State, Summary, Documentation`);

  if (failedCount > 0) {
    console.error(`- Failed Check Names: ${failedChecks.join(', ')}`);
    process.exit(1);
  } else {
    console.log('Workspace Agent Execution Gate final regression suite successful.');
  }
}

runFinalRegressionSuite().catch(err => {
  console.error('Regression suite crashed:', err);
  process.exit(1);
});
