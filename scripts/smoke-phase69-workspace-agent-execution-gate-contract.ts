import { evaluateWorkspaceAgentExecutionGate } from '../src/core/agent/execution-gate/gate-boundary';
import { WorkspaceAgentExecutionGateRequest } from '../src/core/agent/execution-gate/gate-types';

async function runGateSmokeTest() {
  console.log('Running Phase 69: Workspace Agent Execution Gate Contract Smoke Test...');
  
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
    requestId: 'req-123',
    planId: 'plan-123',
    reviewedStepIds: ['1', '2'],
    approvedStepIds: ['1', '2'],
    readinessStatus: 'ready_for_future_review',
    requestedMode: 'gate_check_only',
    userVisibleSummary: 'Analyzing project structure and write to test.ts',
    userConfirmationText: 'I confirm this execution gate check for path C:\\secrets'
  };

  // 1. Basic Evaluation
  const result = await evaluateWorkspaceAgentExecutionGate(mockRequest);
  check('Result is defined', !!result);
  check('Decision is blocked or requires_more_review', result.decision === 'blocked' || result.decision === 'requires_more_review');
  check('canExecute is false', result.canExecute === false);
  check('canWrite is false', result.canWrite === false);
  check('canRunShell is false', result.canRunShell === false);
  check('issuedCapability is null', result.issuedCapability === null);
  check('blocking is true', result.blocking === true);

  // 2. Non-gate mode check
  const invalidRequest = { ...mockRequest, requestedMode: 'execute' } as any;
  const invalidResult = await evaluateWorkspaceAgentExecutionGate(invalidRequest);
  check('Invalid mode is blocked', invalidResult.decision === 'blocked');
  check('Invalid mode reason is INVALID_MODE', invalidResult.reasonCode === 'INVALID_MODE');

  // 3. Intent Detection
  check('Write intent detected in warnings', result.warnings.some(w => w.code === 'WRITE_INTENT_DETECTED'));
  check('Write risk detected', result.risks.some(r => r.code === 'WRITE_RISK'));

  // 4. Sanitization
  const containsRawPath = JSON.stringify(result).includes('C:\\secrets');
  const containsMaskedPath = JSON.stringify(result).includes('[PATH_MASKED]');
  check('Result does not contain raw path', !containsRawPath);
  check('Result contains masked path', containsMaskedPath);

  // 5. Logic: Approved steps do not mean allow
  check('Approved steps present but decision still blocked', mockRequest.approvedStepIds.length > 0 && result.decision === 'blocked');

  // 6. Security Boundaries
  check('ActionExecutor check is blocked', result.checks.find(c => c.type === 'action_executor_not_available')?.status === 'blocked');
  check('Permission check is blocked', result.checks.find(c => c.type === 'permission_not_granted')?.status === 'blocked');

  // 7. Output summary
  console.log(`\nGate Smoke Test Summary:`);
  console.log(`- Passed: ${passedCount}`);
  console.log(`- Failed: ${failedCount}`);

  if (failedCount > 0) {
    console.error(`- Failed Checks: ${failedChecks.join(', ')}`);
    process.exit(1);
  } else {
    console.log('Execution Gate contract verification successful.');
  }
}

runGateSmokeTest();
