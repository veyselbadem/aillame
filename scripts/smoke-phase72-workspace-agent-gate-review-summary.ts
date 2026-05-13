import { evaluateWorkspaceAgentExecutionGate } from '../src/core/agent/execution-gate/gate-boundary';
import { createInitialGateReviewState, updateGateDecisionReview } from '../src/core/agent/execution-gate/gate-review-state';
import { createGateReviewSummary } from '../src/core/agent/execution-gate/gate-review-summary';
import { WorkspaceAgentExecutionGateRequest } from '../src/core/agent/execution-gate/gate-types';

async function runGateSummarySmokeTest() {
  console.log('Running Phase 72: Workspace Agent Gate Review Summary Smoke Test...');
  
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
  const mockRequest: WorkspaceAgentExecutionGateRequest = {
    requestId: 'req-sum-123',
    planId: 'plan-sum-123',
    reviewedStepIds: ['1'],
    approvedStepIds: ['1'],
    readinessStatus: 'ready_for_future_review',
    requestedMode: 'gate_check_only',
    userVisibleSummary: 'Writing to test.ts',
    userConfirmationText: 'Approved'
  };

  // 1. Result and Review State
  const result = await evaluateWorkspaceAgentExecutionGate(mockRequest);
  let reviewState = createInitialGateReviewState(result);
  reviewState = updateGateDecisionReview(reviewState, 'acknowledged', 'Review note with C:\\secrets');

  // 2. Summary Generation
  const summary = createGateReviewSummary(result, reviewState);
  check('Summary is defined', !!summary);
  check('Summary requestId matches', summary.requestId === 'req-sum-123');
  check('Acknowledged count is at least 1 (decision)', summary.stats.acknowledgedCount >= 1);
  check('Active capability count is 0', summary.stats.activeCapabilityCount === 0);

  // 3. Text Preview Content
  const text = summary.safeTextPreview;
  check('Text contains WORKSPACE AGENT', text.includes('WORKSPACE AGENT'));
  check('Text contains canExecute: FALSE', text.includes('canExecute: FALSE'));
  check('Text contains issuedCapability: NULL', text.includes('issuedCapability: NULL'));
  check('Text contains NO CAPABILITY token placeholder', !text.includes('token-abc-123'));
  check('Text masks raw path', !text.includes('C:\\secrets'));
  check('Text contains [PATH_MASKED]', text.includes('[PATH_MASKED]'));

  // 4. Decision item in summary
  check('Decision item status is blocked', summary.decisionItem.status === 'blocked');
  check('Decision item reviewStatus is acknowledged', summary.decisionItem.reviewStatus === 'acknowledged');

  // 5. Security check
  check('No execution payload in summary', !JSON.stringify(summary).includes('command payload'));

  // 6. Summary check
  console.log(`\nGate Summary Smoke Test Summary:`);
  console.log(`- Passed: ${passedCount}`);
  console.log(`- Failed: ${failedCount}`);

  if (failedCount > 0) {
    console.error(`- Failed Checks: ${failedChecks.join(', ')}`);
    process.exit(1);
  } else {
    console.log('Execution Gate Review Summary verification successful.');
  }
}

runGateSummarySmokeTest();
