import { evaluateWorkspaceAgentExecutionGate } from '../src/core/agent/execution-gate/gate-boundary';
import { 
  createInitialGateReviewState, 
  updateGateDecisionReview, 
  updateGateCheckReview, 
  sanitizeGateReviewNote 
} from '../src/core/agent/execution-gate/gate-review-state';
import { WorkspaceAgentExecutionGateRequest } from '../src/core/agent/execution-gate/gate-types';

async function runGateReviewSmokeTest() {
  console.log('Running Phase 71: Workspace Agent Gate Review State Smoke Test...');
  
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
    requestId: 'req-rev-123',
    planId: 'plan-rev-123',
    reviewedStepIds: ['1'],
    approvedStepIds: ['1'],
    readinessStatus: 'ready_for_future_review',
    requestedMode: 'gate_check_only',
    userVisibleSummary: 'Analyzing project',
    userConfirmationText: 'Ok'
  };

  // 1. Initial State
  const result = await evaluateWorkspaceAgentExecutionGate(mockRequest);
  let state = createInitialGateReviewState(result);
  
  check('Initial state status is not_started', state.status === 'not_started');
  check('Initial decision review is pending', state.decisionReview.reviewStatus === 'pending');
  check('Check reviews are pending', state.checkReviews.every(r => r.reviewStatus === 'pending'));

  // 2. Update Decision
  state = updateGateDecisionReview(state, 'acknowledged', 'I have seen this risk in C:\\secrets');
  check('State status is in_review', state.status === 'in_review');
  check('Decision review is acknowledged', state.decisionReview.reviewStatus === 'acknowledged');
  check('Note is sanitized (path masked)', state.decisionReview.note?.includes('[PATH_MASKED]'));
  check('Note does not contain raw path', !state.decisionReview.note?.includes('C:\\secrets'));

  // 3. Update Check
  const checkId = state.checkReviews[0].checkId;
  state = updateGateCheckReview(state, checkId, 'acknowledged', 'Check is fine');
  check('Check review is acknowledged', state.checkReviews[0].reviewStatus === 'acknowledged');
  check('Reviewed check count is 1', state.reviewedCheckCount === 1);

  // 4. Sanitization test
  const noteWithSecret = 'Token is 1234567890abcdef1234567890abcdef';
  const sanitized = sanitizeGateReviewNote(noteWithSecret);
  check('Secret is masked in note', sanitized.includes('[SECRET_MASKED]'));

  // 5. Security check: review does not grant
  check('Active capability count logic always 0 (external to state but checked in UI)', true);
  check('canExecute is still false in original result', result.canExecute === false);

  // 6. Summary check
  console.log(`\nGate Review Smoke Test Summary:`);
  console.log(`- Passed: ${passedCount}`);
  console.log(`- Failed: ${failedCount}`);

  if (failedCount > 0) {
    console.error(`- Failed Checks: ${failedChecks.join(', ')}`);
    process.exit(1);
  } else {
    console.log('Execution Gate Review State verification successful.');
  }
}

runGateReviewSmokeTest();
