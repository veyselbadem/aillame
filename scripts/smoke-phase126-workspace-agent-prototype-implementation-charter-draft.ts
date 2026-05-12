#!/usr/bin/env npx tsx
/**
 * Phase 126 - Workspace Agent Prototype Implementation Charter Draft
 * Smoke validation script (documentation-only)
 */

import * as fs from 'fs';

interface ValidationResult {
  testName: string;
  passed: boolean;
  errorMessage?: string;
}

const results: ValidationResult[] = [];
const PHASE126_DOC = 'docs/workspace-agent-prototype-implementation-charter-draft.md';
const PLANNING_TAG = 'workspace-agent-prototype-planning-line-v1.0.0-no-implementation';
const SAFETY_TAG = 'workspace-agent-safety-baseline-v1.0.0';
const SPEC_TAG = 'workspace-agent-prototype-specification-v1.0.0-no-implementation';

function test(testName: string, condition: boolean, errorMessage?: string): void {
  results.push({ testName, passed: condition, errorMessage });
  const icon = condition ? 'OK' : 'FAIL';
  console.log(`[${icon}] ${testName}`);
  if (!condition && errorMessage) {
    console.log(`  Error: ${errorMessage}`);
  }
}

console.log('Phase 126 - Workspace Agent Prototype Implementation Charter Draft Smoke Tests');
console.log('==================================================================================\n');

const phase126 = fs.readFileSync(PHASE126_DOC, 'utf-8');

console.log('1) Existence and status');
test('Phase 126 document exists', fs.existsSync(PHASE126_DOC));
test('Title present', phase126.includes('# Phase 126 - Workspace Agent Prototype Implementation Charter Draft'));
test('Prototype Implementation Charter Draft / No Implementation status present', phase126.includes('Prototype Implementation Charter Draft / No Implementation'));

console.log('\n2) References present');
test('Implementation Readiness Track referenced', phase126.includes('Workspace Agent Prototype Implementation Readiness Track'));
test('Phase 125 Go/No-Go Decision referenced', phase126.includes('Phase 125 [Prototype Implementation Track Go/No-Go Decision]'));
test('Phase 112 Readiness Gate referenced', phase126.includes('Phase 112 [Implementation Readiness Gate]'));
test('Phase 113-124 specification line referenced', phase126.includes('Phase 113') && phase126.includes('Phase 124'));
test('Planning line release tag present', phase126.includes(PLANNING_TAG));
test('Safety baseline release tag present', phase126.includes(SAFETY_TAG));
test('Specification release tag present', phase126.includes(SPEC_TAG));

console.log('\n3) Charter sections');
test('Charter identity section present', phase126.includes('## 3. Charter Identity'));
test('Charter purpose section present', phase126.includes('## 4. Charter Purpose'));
test('Implementation boundary statement section present', phase126.includes('## 5. Implementation Boundary Statement'));
test('Prototype scope proposal section present', phase126.includes('## 6. Prototype Scope Proposal'));
test('Explicit non-goals section present', phase126.includes('## 7. Explicit Non-Goals'));
test('Required safety preconditions section present', phase126.includes('## 8. Required Safety Preconditions'));
test('Required approval gates section present', phase126.includes('## 9. Required Approval Gates'));
test('Required exit criteria section present', phase126.includes('## 10. Required Exit Criteria'));
test('Required stop conditions section present', phase126.includes('## 11. Required Stop Conditions'));
test('Required sign-off fields section present', phase126.includes('## 12. Required Sign-off Fields'));

console.log('\n4) Approval gate keywords');
const gates = [
  'Rollback Gate',
  'Audit Gate',
  'Sandbox Gate',
  'Permission Gate',
  'Diff-Preview Gate',
  'Kill-Switch Gate',
  'Human Approval Gate',
  'Test Isolation Gate',
  'Emergency Stop Gate',
  'Governance Gate',
];
gates.forEach(gate => {
  test(`${gate} present`, phase126.includes(gate));
});

console.log('\n5) Implementation non-approval statements');
test('Charter draft is NOT an implementation approval stated', phase126.includes('This charter draft is NOT an implementation approval'));
test('Charter draft is NOT a prototype start stated', phase126.includes('This charter draft is NOT a prototype start'));
test('Charter draft is NOT an execution enablement stated', phase126.includes('This charter draft is NOT an execution enablement'));
test('Formal implementation approval phase is required stated', phase126.includes('formal implementation approval phase is required'));

console.log('\n6) Boundary checks');
test('Implementation approval vermediği stated', phase126.includes('It does not approve implementation'));
test('Prototype başlatmadığı stated', phase126.includes('It does not start prototype'));
test('Execution pathway açmadığı stated', phase126.includes('It does not enable execution pathways'));
test('No file write stated', phase126.includes('No file write'));
test('No shell command stated', phase126.includes('No shell command'));
test('No persistence stated', phase126.includes('No persistence'));
test('No permission grant stated', phase126.includes('No permission grant'));
test('No capability/token issuance stated', phase126.includes('No capability/token issuance'));
test('No ActionExecutor stated', phase126.includes('No ActionExecutor'));
test('No Command Registry stated', phase126.includes('No Command Registry'));

console.log('\n7) Preservation statements');
test('Safety Baseline archived/frozen/untouched stated', phase126.includes('Safety Baseline v1.0.0 remains archived, frozen, read-only, sealed, untouched, not reopened, not weakened'));
test('Planning line archived/release-tagged/untouched stated', phase126.includes('Prototype Planning Line v1.0.0-no-implementation remains archived, release-tagged, indexed, untouched'));
test('Prototype Specification archived/release-tagged/closed/untouched stated', phase126.includes('Prototype Specification v1.0.0-no-implementation remains archived, release-tagged, post-tag verified, indexed, closed, untouched'));

console.log('\n8) Required sentence and final result');
test(
  'Required key sentence present',
  phase126.includes('Phase 126 drafts the prototype implementation charter as documentation only and does not approve implementation, start a prototype, enable execution, write files, persist records, grant permissions, issue capabilities, create ActionExecutor behavior, or register commands.'),
);
test('Known issues section present', phase126.includes('Known Issues'));
test('Known issues none stated', phase126.includes('Known issues: none.'));
test('Final result phrase present', phase126.includes('prototype implementation charter draft ready as documentation only'));

console.log('\n9) No implementation snippets in doc');
test('No ActionExecutor class snippet present', !phase126.includes('class ActionExecutor'));
test('No Command Registry implementation snippet present', !phase126.includes('registerCommand('));
test('No token issuance code snippet present', !phase126.includes('issueToken('));

console.log('\n==================================================================================');
console.log('Phase 126 Smoke Test Results\n');

const passed = results.filter(r => r.passed).length;
const total = results.length;
const failed = total - passed;
const remaining = 0;

console.log(`Total Tests: ${total}`);
console.log(`Passed: ${passed}`);
console.log(`Remaining: ${remaining}`);

if (failed === 0) {
  console.log('\nOK PHASE 126 SMOKE TEST PASSED');
  process.exit(0);
} else {
  console.log('\nFAIL PHASE 126 SMOKE TEST FAILED');
  for (const item of results.filter(r => !r.passed)) {
    console.log(`- ${item.testName}`);
    if (item.errorMessage) console.log(`  ${item.errorMessage}`);
  }
  process.exit(1);
}
