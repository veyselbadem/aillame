#!/usr/bin/env npx tsx
/**
 * Phase 116 - Workspace Agent Prototype Specification Conditional Resolution Plan
 * Smoke validation script (documentation-only)
 */

import * as fs from 'fs';

interface ValidationResult {
  testName: string;
  passed: boolean;
  errorMessage?: string;
}

const results: ValidationResult[] = [];
const PHASE116_DOC = 'docs/workspace-agent-prototype-specification-conditional-resolution-plan.md';
const PLANNING_TAG = 'workspace-agent-prototype-planning-line-v1.0.0-no-implementation';
const SAFETY_TAG = 'workspace-agent-safety-baseline-v1.0.0';

function test(testName: string, condition: boolean, errorMessage?: string): void {
  results.push({ testName, passed: condition, errorMessage });
  const icon = condition ? 'OK' : 'FAIL';
  console.log(`[${icon}] ${testName}`);
  if (!condition && errorMessage) {
    console.log(`  Error: ${errorMessage}`);
  }
}

console.log('Phase 116 - Workspace Agent Prototype Specification Conditional Resolution Plan Smoke Tests');
console.log('==========================================================================================\n');

const phase116 = fs.readFileSync(PHASE116_DOC, 'utf-8');

console.log('1) Existence and status');
test('Phase 116 document exists', fs.existsSync(PHASE116_DOC));
test('Title present', phase116.includes('# Phase 116 - Workspace Agent Prototype Specification Conditional Resolution Plan'));
test('Prototype Specification Conditional Resolution Plan / No Implementation status present', phase116.includes('Prototype Specification Conditional Resolution Plan / No Implementation'));

console.log('\n2) References present');
test('Implementation Readiness Track referenced', phase116.includes('Workspace Agent Prototype Implementation Readiness Track'));
test('Phase 112 Readiness Gate referenced', phase116.includes('Phase 112 [Implementation Readiness Gate]'));
test('Phase 113 Specification Draft referenced', phase116.includes('Phase 113 [Prototype Specification Draft]'));
test('Phase 114 Review Checklist referenced', phase116.includes('Phase 114 [Prototype Specification Review Checklist]'));
test('Phase 115 Review Decision referenced', phase116.includes('Phase 115 [Prototype Specification Review Decision]'));
test('Planning line tag present', phase116.includes(PLANNING_TAG));
test('Safety baseline tag present', phase116.includes(SAFETY_TAG));

console.log('\n3) Decision Outcome reference');
test('SPEC-REVIEW-PASS-WITH-CONDITIONS referenced', phase116.includes('SPEC-REVIEW-PASS-WITH-CONDITIONS'));

console.log('\n4) Condition Categories (10 areas)');
const categories = [
  'sandbox', 'permission model', 'rollback', 'audit', 'diff-preview',
  'kill-switch', 'emergency stop', 'human approval', 'test isolation', 'governance'
];
categories.forEach(cat => {
  test(`Condition category '${cat}' present`, phase116.toLowerCase().includes(cat));
});

console.log('\n5) Severity Levels (S1-S4)');
const severities = ['S1', 'S2', 'S3', 'S4'];
severities.forEach(s => {
  test(`Severity level '${s}' present`, phase116.includes(s));
});

console.log('\n6) Evidence Requirements (E1-E6)');
const evidences = ['E1', 'E2', 'E3', 'E4', 'E5', 'E6'];
evidences.forEach(e => {
  test(`Evidence requirement '${e}' present`, phase116.includes(e));
});

console.log('\n7) Re-review and Unresolved sections');
test('Re-review requirements section present', phase116.includes('Re-Review and Unresolved Conditions'));
test('Unresolved condition handling section present', phase116.includes('Unresolved condition handling'));

console.log('\n8) Boundary checks');
test('Resolving conditions does not approve implementation stated', phase116.includes('Resolving conditions does not approve implementation'));
test('Resolving conditions does not start prototype stated', phase116.includes('Resolving conditions does not start prototype'));
test('Resolving conditions does not enable execution stated', phase116.includes('Resolving conditions does not enable execution'));
test('Implementation non-approval stated', phase116.includes('does not approve implementation'));
test('Prototype non-start stated', phase116.includes('does not start prototype'));
test('Execution non-enable stated', phase116.includes('does not enable execution'));
test('No file write stated', phase116.includes('No file write'));
test('No shell command stated', phase116.includes('No shell command'));
test('No persistence stated', phase116.includes('No persistence'));
test('No permission grant stated', phase116.includes('No permission grant'));
test('No capability/token issuance stated', phase116.includes('No capability/token issuance'));
test('No ActionExecutor stated', phase116.includes('No ActionExecutor'));
test('No Command Registry stated', phase116.includes('No Command Registry'));

console.log('\n9) Safety baseline and Planning Line preservation');
test('Safety baseline archived/frozen/untouched stated', phase116.includes('Safety Baseline v1.0.0 remains archived, frozen, read-only, sealed, untouched, not reopened, not weakened'));
test('Planning line archived/release-tagged/untouched stated', phase116.includes('Prototype Planning Line v1.0.0-no-implementation remains archived, release-tagged, indexed, untouched'));

console.log('\n10) Required sentence and final result');
test(
  'Required key sentence present',
  phase116.includes('Phase 116 defines prototype specification conditional resolution as documentation only and does not approve implementation, start a prototype, enable execution, write files, persist records, grant permissions, issue capabilities, create ActionExecutor behavior, or register commands.'),
);
test('Known issues section present', phase116.includes('Known Issues'));
test('Known issues none stated', phase116.includes('Known issues: none.'));
test('Final result phrase present', phase116.includes('prototype specification conditional resolution plan ready as documentation only'));

console.log('\n11) No implementation snippets in doc');
test('No ActionExecutor class snippet present', !phase116.includes('class ActionExecutor'));
test('No Command Registry implementation snippet present', !phase116.includes('registerCommand('));
test('No token issuance code snippet present', !phase116.includes('issueToken('));

console.log('\n==========================================================================================');
console.log('Phase 116 Smoke Test Results\n');

const passed = results.filter(r => r.passed).length;
const total = results.length;
const failed = total - passed;
const remaining = 0;

console.log(`Total Tests: ${total}`);
console.log(`Passed: ${passed}`);
console.log(`Remaining: ${remaining}`);

if (failed === 0) {
  console.log('\nOK PHASE 116 SMOKE TEST PASSED');
  process.exit(0);
} else {
  console.log('\nFAIL PHASE 116 SMOKE TEST FAILED');
  for (const item of results.filter(r => !r.passed)) {
    console.log(`- ${item.testName}`);
    if (item.errorMessage) console.log(`  ${item.errorMessage}`);
  }
  process.exit(1);
}
