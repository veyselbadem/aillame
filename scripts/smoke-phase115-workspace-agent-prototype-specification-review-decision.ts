#!/usr/bin/env npx tsx
/**
 * Phase 115 - Workspace Agent Prototype Specification Review Decision
 * Smoke validation script (documentation-only)
 */

import * as fs from 'fs';

interface ValidationResult {
  testName: string;
  passed: boolean;
  errorMessage?: string;
}

const results: ValidationResult[] = [];
const PHASE115_DOC = 'docs/workspace-agent-prototype-specification-review-decision.md';
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

console.log('Phase 115 - Workspace Agent Prototype Specification Review Decision Smoke Tests');
console.log('==================================================================================\n');

const phase115 = fs.readFileSync(PHASE115_DOC, 'utf-8');

console.log('1) Existence and status');
test('Phase 115 document exists', fs.existsSync(PHASE115_DOC));
test('Title present', phase115.includes('# Phase 115 - Workspace Agent Prototype Specification Review Decision'));
test('Prototype Specification Review Decision / No Implementation status present', phase115.includes('Prototype Specification Review Decision / No Implementation'));

console.log('\n2) References present');
test('Implementation Readiness Track referenced', phase115.includes('Workspace Agent Prototype Implementation Readiness Track'));
test('Phase 112 Readiness Gate referenced', phase115.includes('Phase 112 [Implementation Readiness Gate]'));
test('Phase 113 Specification Draft referenced', phase115.includes('Phase 113 [Prototype Specification Draft]'));
test('Phase 114 Review Checklist referenced', phase115.includes('Phase 114 [Prototype Specification Review Checklist]'));
test('Planning line tag present', phase115.includes(PLANNING_TAG));
test('Safety baseline tag present', phase115.includes(SAFETY_TAG));

console.log('\n3) Outcome options present');
test('Outcome SPEC-REVIEW-PASS present', phase115.includes('SPEC-REVIEW-PASS'));
test('Outcome SPEC-REVIEW-PASS-WITH-CONDITIONS present', phase115.includes('SPEC-REVIEW-PASS-WITH-CONDITIONS'));
test('Outcome SPEC-REVIEW-FAIL present', phase115.includes('SPEC-REVIEW-FAIL'));

console.log('\n4) Decision Fields present');
test('Decision fields section present', phase115.includes('Decision Fields'));
const fields = [
  'decision id', 'reviewer identity', 'reviewed inputs', 'checklist result',
  'outcome', 'rationale', 'conditions', 'blockers', 'required follow-up', 'sign-off'
];
fields.forEach(field => {
  test(`Decision field '${field}' present`, phase115.toLowerCase().includes(field));
});

console.log('\n5) Condition/Blocker handling');
test('Condition/blocker handling section present', phase115.includes('Condition/Blocker Handling'));
test('SPEC-REVIEW-FAIL blocks progression stated', phase115.includes('blocks specification progression'));

console.log('\n6) Boundary checks');
test('SPEC-REVIEW-PASS is not implementation approval stated', phase115.includes('SPEC-REVIEW-PASS does not approve implementation'));
test('SPEC-REVIEW-PASS-WITH-CONDITIONS is not implementation approval stated', phase115.includes('SPEC-REVIEW-PASS-WITH-CONDITIONS does not approve implementation'));
test('Implementation non-approval stated', phase115.includes('does not approve implementation'));
test('Prototype non-start stated', phase115.includes('does not start prototype'));
test('Execution non-enable stated', phase115.includes('does not enable execution'));
test('No file write stated', phase115.includes('No file write'));
test('No shell command stated', phase115.includes('No shell command'));
test('No persistence stated', phase115.includes('No persistence'));
test('No permission grant stated', phase115.includes('No permission grant'));
test('No capability/token issuance stated', phase115.includes('No capability/token issuance'));
test('No ActionExecutor stated', phase115.includes('No ActionExecutor'));
test('No Command Registry stated', phase115.includes('No Command Registry'));

console.log('\n7) Safety baseline and Planning Line preservation');
test('Safety baseline archived/frozen/untouched stated', phase115.includes('Safety Baseline v1.0.0 remains archived, frozen, read-only, sealed, untouched, not reopened, not weakened'));
test('Planning line archived/release-tagged/untouched stated', phase115.includes('Prototype Planning Line v1.0.0-no-implementation remains archived, release-tagged, indexed, untouched'));

console.log('\n8) Required sentence and final result');
test(
  'Required key sentence present',
  phase115.includes('Phase 115 records the prototype specification review decision as documentation only and does not approve implementation, start a prototype, enable execution, write files, persist records, grant permissions, issue capabilities, create ActionExecutor behavior, or register commands.'),
);
test('Known issues section present', phase115.includes('Known Issues'));
test('Known issues none stated', phase115.includes('Known issues: none.'));
test('Final result phrase present', phase115.includes('prototype specification review decision ready as documentation only'));

console.log('\n9) No implementation snippets in doc');
test('No ActionExecutor class snippet present', !phase115.includes('class ActionExecutor'));
test('No Command Registry implementation snippet present', !phase115.includes('registerCommand('));
test('No token issuance code snippet present', !phase115.includes('issueToken('));

console.log('\n==================================================================================');
console.log('Phase 115 Smoke Test Results\n');

const passed = results.filter(r => r.passed).length;
const total = results.length;
const failed = total - passed;
const remaining = 0;

console.log(`Total Tests: ${total}`);
console.log(`Passed: ${passed}`);
console.log(`Remaining: ${remaining}`);

if (failed === 0) {
  console.log('\nOK PHASE 115 SMOKE TEST PASSED');
  process.exit(0);
} else {
  console.log('\nFAIL PHASE 115 SMOKE TEST FAILED');
  for (const item of results.filter(r => !r.passed)) {
    console.log(`- ${item.testName}`);
    if (item.errorMessage) console.log(`  ${item.errorMessage}`);
  }
  process.exit(1);
}
