import { evaluateWorkspaceAgentExecutionGate } from '../src/core/agent/execution-gate/gate-boundary';
import { mapGateResultToRenderData } from '../src/core/agent/execution-gate/gate-preview-presenter';
import { WorkspaceAgentExecutionGateRequest } from '../src/core/agent/execution-gate/gate-types';

async function runGateUISmokeTest() {
  console.log('Running Phase 70: Workspace Agent Execution Gate Preview UI Smoke Test...');
  
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
    requestId: 'req-ui-123',
    planId: 'plan-ui-123',
    reviewedStepIds: ['1'],
    approvedStepIds: ['1'],
    readinessStatus: 'ready_for_future_review',
    requestedMode: 'gate_check_only',
    userVisibleSummary: 'Writing file to C:\\secrets\\token.txt',
    userConfirmationText: 'I approve this gate check'
  };

  // 1. Evaluator Result
  const result = await evaluateWorkspaceAgentExecutionGate(mockRequest);
  check('Evaluator produced result', !!result);

  // 2. Presenter Mapping
  const renderData = mapGateResultToRenderData(result);
  check('Presenter produced render data', !!renderData);
  check('Render data decision is blocked', renderData.decision === 'blocked');
  check('Render data decisionLabel is defined', !!renderData.decisionLabel);

  // 3. Security Boundaries in Render Data
  check('canExecute is false in render data', renderData.canExecute === false);
  check('canWrite is false in render data', renderData.canWrite === false);
  check('canRunShell is false in render data', renderData.canRunShell === false);
  check('issuedCapability is null in render data', renderData.issuedCapability === null);

  // 4. Leak Prevention in Render Data
  const rawDataStr = JSON.stringify(renderData);
  check('No raw path in render data', !rawDataStr.includes('C:\\secrets'));
  check('Masked path exists in render data', rawDataStr.includes('[PATH_MASKED]'));
  check('No command payload in render data', !rawDataStr.includes('command payload'));
  check('No token in render data', !rawDataStr.includes('token.txt'));

  // 5. Notice existence
  check('Notice is present', renderData.notice.includes('GATE PREVIEW'));

  // 6. Summary check
  console.log(`\nGate UI Smoke Test Summary:`);
  console.log(`- Passed: ${passedCount}`);
  console.log(`- Failed: ${failedCount}`);

  if (failedCount > 0) {
    console.error(`- Failed Checks: ${failedChecks.join(', ')}`);
    process.exit(1);
  } else {
    console.log('Execution Gate Preview UI presenter verification successful.');
  }
}

runGateUISmokeTest();
