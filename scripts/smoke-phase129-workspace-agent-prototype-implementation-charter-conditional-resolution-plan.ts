#!/usr/bin/env npx tsx
/**
 * Phase 129 - Workspace Agent Prototype Implementation Charter Conditional Resolution Plan
 * Smoke validation script (documentation-only)
 */

import * as fs from 'fs';

interface ValidationResult {
  testName: string;
  passed: boolean;
  errorMessage?: string;
}

const results: ValidationResult[] = [];
const PHASE129_DOC = 'docs/workspace-agent-prototype-implementation-charter-conditional-resolution-plan.md';
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

console.log('Phase 129 - Workspace Agent Prototype Implementation Charter Conditional Resolution Plan Smoke Tests');
console.log('====================================================================================================\n');

const phase129 = fs.readFileSync(PHASE129_DOC, 'utf-8');

console.log('1) Existence and status');
test('Phase 129 document exists', fs.existsSync(PHASE129_DOC));
test('Title present', phase129.includes('# Phase 129 - Workspace Agent Prototype Implementation Charter Conditional Resolution Plan'));
test('Prototype Implementation Charter Conditional Resolution Plan / No Implementation status present', phase129.includes('Prototype Implementation Charter Conditional Resolution Plan / No Implementation'));

console.log('\n2) References present');
test('Implementation Readiness Track referenced', phase129.includes('Workspace Agent Prototype Implementation Readiness Track'));
test('Phase 128 Charter Review Decision referenced', phase129.includes('Phase 128 [Prototype Implementation Charter Review Decision]'));
test('Phase 127 Charter Review Checklist referenced', phase129.includes('Phase 127 [Prototype Implementation Charter Review Checklist]'));
test('Phase 126 Charter Draft referenced', phase129.includes('Phase 126 [Prototype Implementation Charter Draft]'));
test('Phase 125 Go/No-Go Decision referenced', phase129.includes('Phase 125 [Prototype Implementation Track Go/No-Go Decision]'));
test('Phase 112 Readiness Gate referenced', phase129.includes('Phase 112 [Implementation Readiness Gate]'));
test('Phase 113-124 specification line referenced', phase129.includes('Phase 113') && phase129.includes('Phase 124'));
test('Planning line release tag present', phase129.includes(PLANNING_TAG));
test('Safety baseline release tag present', phase129.includes(SAFETY_TAG));
test('Specification release tag present', phase129.includes(SPEC_TAG));

console.log('\n3) Condition categories');
test('Condition categories section present', phase129.includes('## 3. Condition Categories'));
const categories = [
  'charter identity condition',
  'charter purpose condition',
  'implementation boundary condition',
  'prototype scope condition',
  'non-goals condition',
  'safety preconditions condition',
  'approval gates condition',
  'rollback gate condition',
  'audit gate condition',
  'sandbox gate condition',
  'permission gate condition',
  'diff-preview gate condition',
  'kill-switch gate condition',
  'human approval gate condition',
  'test isolation gate condition',
  'emergency stop gate condition',
  'governance gate condition',
  'exit criteria condition',
  'stop conditions condition',
  'sign-off condition',
];
categories.forEach(cat => {
  test(`${cat} present`, phase129.includes(cat));
});

console.log('\n4) Severity levels and evidence');
test('Severity levels S1, S2, S3, S4 present', ['S1', 'S2', 'S3', 'S4'].every(s => phase129.includes(s)));
test('Evidence requirements E1, E2, E3, E4, E5, E6 present', ['E1', 'E2', 'E3', 'E4', 'E5', 'E6'].every(e => phase129.includes(e)));

console.log('\n5) Review and unresolved condition sections');
test('Re-review requirements section present', phase129.includes('## 6. Re-review Requirements'));
test('Unresolved condition handling section present', phase129.includes('## 7. Unresolved Condition Handling'));

console.log('\n6) Implementation non-approval statements');
test('Resolving conditions does not approve implementation stated', phase129.includes('Resolving conditions does not approve implementation'));
test('Resolving conditions does not start prototype stated', phase129.includes('Resolving conditions does not start prototype'));
test('Resolving conditions does not enable execution stated', phase129.includes('Resolving conditions does not enable execution'));

console.log('\n7) Boundary checks');
test('Implementation approval vermediği stated', phase129.includes('It does not approve implementation'));
test('Prototype başlatmadığı stated', phase129.includes('It does not start prototype'));
test('Execution pathway açmadığı stated', phase129.includes('It does not enable execution pathways'));
test('No file write stated', phase129.includes('No file write'));
test('No shell command stated', phase129.includes('No shell command'));
test('No persistence stated', phase129.includes('No persistence'));
test('No permission grant stated', phase129.includes('No permission grant'));
test('No capability/token issuance stated', phase129.includes('No capability/token issuance'));
test('No ActionExecutor stated', phase129.includes('No ActionExecutor'));
test('No Command Registry stated', phase129.includes('No Command Registry'));

console.log('\n8) Preservation statements');
test('Safety Baseline archived/frozen/untouched stated', phase129.includes('Safety Baseline v1.0.0 remains archived, frozen, read-only, sealed, untouched, not reopened, not weakened'));
test('Planning line archived/release-tagged/untouched stated', phase129.includes('Prototype Planning Line v1.0.0-no-implementation remains archived, release-tagged, indexed, untouched'));
test('Prototype Specification archived/release-tagged/closed/untouched stated', phase129.includes('Prototype Specification v1.0.0-no-implementation remains archived, release-tagged, post-tag verified, indexed, closed, untouched'));

console.log('\n9) Required sentence and final result');
test(
  'Required key sentence present',
  phase129.includes('Phase 129 defines prototype implementation charter conditional resolution as documentation only and does not approve implementation, start a prototype, enable execution, write files, persist records, grant permissions, issue capabilities, create ActionExecutor behavior, or register commands.'),
);
test('Known issues section present', phase129.includes('Known Issues'));
test('Known issues none stated', phase129.includes('Known issues: none.'));
test('Final result phrase present', phase129.includes('prototype implementation charter conditional resolution plan ready as documentation only'));

console.log('\n10) No implementation snippets in doc');
test('No ActionExecutor class snippet present', !phase129.includes('class ActionExecutor'));
test('No Command Registry implementation snippet present', !phase129.includes('registerCommand('));
test('No token issuance code snippet present', !phase129.includes('issueToken('));

console.log('\n====================================================================================================');
console.log('Phase 129 Smoke Test Results\n');

const passed = results.filter(r => r.passed).length;
const total = results.length;
const failed = total - passed;
const remaining = 0;

console.log(`Total Tests: ${total}`);
console.log(`Passed: ${passed}`);
console.log(`Remaining: ${remaining}`);

if (failed === 0) {
  console.log('\nOK PHASE 129 SMOKE TEST PASSED');
  process.exit(0);
} else {
  console.log('\nFAIL PHASE 129 SMOKE TEST FAILED');
  for (const item of results.filter(r => !r.passed)) {
    console.log(`- ${item.testName}`);
    if (item.errorMessage) console.log(`  ${item.errorMessage}`);
  }
  process.exit(1);
}
