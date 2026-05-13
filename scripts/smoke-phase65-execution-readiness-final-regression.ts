import fs from 'fs';
import path from 'path';
import { evaluateWorkspaceAgentExecutionReadiness } from '../src/core/agent/execution-readiness/readiness-boundary';
import { mapReadinessResultToRenderData } from '../src/core/agent/execution-readiness/readiness-preview-presenter';
import { createInitialReadinessReviewState, updatePermissionReview } from '../src/core/agent/execution-readiness/readiness-review-state';
import { createReadinessReviewSummary, createReadinessReviewSummaryText } from '../src/core/agent/execution-readiness/readiness-review-summary';

async function runFinalRegression() {
  console.log('Running Phase 65: Workspace Agent Execution Readiness Final Regression Suite...');
  
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

  // Mock Request Data
  const mockRequest: any = {
    planId: 'test-plan-123',
    reviewedStepIds: ['1', '2'],
    approvedStepIds: ['1', '2'],
    requestedMode: 'readiness_only',
    userVisibleSummary: 'Analyzing project structure and write to test.ts',
    userConfirmationText: 'I confirm this readiness check'
  };

  // A. Readiness Boundary Checks
  const boundaryResult = await evaluateWorkspaceAgentExecutionReadiness(mockRequest);
  check('Boundary result is readiness_only', boundaryResult.planId === 'test-plan-123');
  check('Boundary status is ready_for_future_review', boundaryResult.status === 'ready_for_future_review');
  check('Boundary result isReadyForFuturePhase is true', boundaryResult.isReadyForFuturePhase === true);
  check('Boundary contains write risk', boundaryResult.risks.some(r => r.message.toLowerCase().includes('write')));
  
  // Non-readiness mode check (should return blocked status)
  const blockedResult = await evaluateWorkspaceAgentExecutionReadiness({ ...mockRequest, requestedMode: 'execute' } as any);
  check('Non-readiness mode should be blocked', blockedResult.status === 'blocked');

  // B. Permission Requirement Safety
  const futureReviewPerm = boundaryResult.permissions.find(p => p.type === 'future_manual_confirmation');
  if (futureReviewPerm) {
    check('Permission satisfied is false', futureReviewPerm.satisfied === false);
    check('Permission does not contain path', !(futureReviewPerm as any).fullPath && !(futureReviewPerm as any).canonicalPath);
  } else {
    check('Future review permission requirement not found', false);
  }

  // C. Preview Presenter Safety
  const renderData = mapReadinessResultToRenderData(boundaryResult);
  check('Render data is defined', !!renderData);
  check('Render data does not contain command payload', !JSON.stringify(renderData).includes('command'));
  check('Render data does not contain paths', !JSON.stringify(renderData).includes('C:\\') && !JSON.stringify(renderData).includes('/home/'));

  // D. Readiness Review State Safety
  let reviewState = createInitialReadinessReviewState(boundaryResult);
  check('Initial review state reviewedPermissionCount is 0', reviewState.reviewedPermissionCount === 0);
  
  // Update status (simulate review)
  if (futureReviewPerm) {
    reviewState = updatePermissionReview(reviewState, futureReviewPerm.requirementId, 'acknowledged_for_future', 'User note about path C:\\secrets');
    const updatedPerm = reviewState.permissionReviews.find(p => p.requirementId === futureReviewPerm.requirementId);
    check('Review note is sanitized (path masked)', updatedPerm?.note?.includes('[PATH_MASKED]') ?? false);
    check('Review note does not contain raw path', !updatedPerm?.note?.includes('C:\\secrets'));
  }

  // E. Readiness Review Summary Safety
  const summary = createReadinessReviewSummary(boundaryResult, reviewState);
  check('Summary stats: acknowledged is 1', summary.stats.acknowledgedPermissions === 1);
  check('Summary activeGrantCount is 0', summary.stats.activeGrantCount === 0);
  
  const summaryText = createReadinessReviewSummaryText(summary);
  check('Summary text contains no-grant warning', summaryText.includes('BU ÖZET İZİN VERMEZ'));
  check('Summary text contains active grant count 0', summaryText.includes('Active Grants: 0'));
  check('Summary text does not contain satisfied=true', !summaryText.includes('satisfied=true'));

  // F. Docs Integrity
  const docsDir = path.join(process.cwd(), 'docs');
  const readmePath = path.join(process.cwd(), 'README.md');
  const flowDoc = path.join(docsDir, 'workspace-agent-execution-readiness.md');
  const safetyDoc = path.join(docsDir, 'workspace-agent-execution-readiness-safety-checklist.md');
  const releaseDoc = path.join(docsDir, 'workspace-agent-execution-readiness-release-readiness.md');

  check('Flow doc exists', fs.existsSync(flowDoc));
  check('Safety doc exists', fs.existsSync(safetyDoc));
  check('Release doc exists', fs.existsSync(releaseDoc));
  
  const readmeContent = fs.readFileSync(readmePath, 'utf8');
  check('README contains readiness links', readmeContent.includes('docs/workspace-agent-execution-readiness.md'));

  // G. Leak and Forbidden Term Checks
  const forbiddenTerms = [
    'satisfied=true',
    'grant token',
    'execute payload',
    'write payload',
    'ActionExecutor enabled',
    'Command Registry enabled',
    'fullPath:',
    'canonicalPath:',
    'raw stdout',
    'raw stderr',
    'stack trace',
    'PID:'
  ];

  forbiddenTerms.forEach(term => {
    const leakedInSummary = summaryText.includes(term);
    const leakedInRender = JSON.stringify(renderData).includes(term);
    check(`Forbidden term leak check: ${term}`, !leakedInSummary && !leakedInRender);
  });

  // Aggregate Output
  console.log(`\nFinal Regression Summary:`);
  console.log(`- Checked modules: Boundary, Presenter, ReviewState, Summary, Docs`);
  console.log(`- Passed: ${passedCount}`);
  console.log(`- Failed: ${failedCount}`);

  if (failedCount > 0) {
    console.error(`- Failed checks: ${failedChecks.join(', ')}`);
    process.exit(1);
  } else {
    console.log('Final regression suite passed successfully.');
  }
}

runFinalRegression().catch(err => {
  console.error('Final regression failed with error:', err);
  process.exit(1);
});
