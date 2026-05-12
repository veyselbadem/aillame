#!/usr/bin/env npx tsx
/**
 * Phase 114 - Workspace Agent Prototype Specification Review Checklist
 * Smoke validation script (documentation-only)
 */

import * as fs from 'fs';

interface ValidationResult {
  testName: string;
  passed: boolean;
  errorMessage?: string;
}

const results: ValidationResult[] = [];
const PHASE114_DOC = 'docs/workspace-agent-prototype-specification-review-checklist.md';
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

console.log('Phase 114 - Workspace Agent Prototype Specification Review Checklist Smoke Tests');
console.log('==================================================================================\n');

const phase114 = fs.readFileSync(PHASE114_DOC, 'utf-8');

console.log('1) Existence and status');
test('Phase 114 document exists', fs.existsSync(PHASE114_DOC));
test('Title present', phase114.includes('# Phase 114 - Workspace Agent Prototype Specification Review Checklist'));
test('Prototype Specification Review Checklist / No Implementation status present', phase114.includes('Prototype Specification Review Checklist / No Implementation'));

console.log('\n2) References present');
test('Implementation Readiness Track referenced', phase114.includes('Workspace Agent Prototype Implementation Readiness Track'));
test('Phase 112 Readiness Gate referenced', phase114.includes('Phase 112 [Implementation Readiness Gate]'));
test('Phase 113 Specification Draft referenced', phase114.includes('Phase 113 [Prototype Specification Draft]'));
test('Planning line tag present', phase114.includes(PLANNING_TAG));
test('Safety baseline tag present', phase114.includes(SAFETY_TAG));

console.log('\n3) Checklist Completeness (10 areas)');
const areas = [
  'sandbox', 'permission model', 'rollback', 'audit', 'diff-preview',
  'kill-switch', 'emergency stop', 'human approval', 'test isolation', 'governance'
];
areas.forEach(area => {
  test(`Checklist completeness area '${area}' present`, phase114.toLowerCase().includes(area));
});

console.log('\n4) Key Sections present');
test('Non-goals checklist section present', phase114.includes('Non-goals checklist section'));
test('Unresolved questions checklist section present', phase114.includes('Unresolved questions checklist section'));
test('Required future review checklist section present', phase114.includes('Required future review checklist section'));
test('Reviewer fields section present', phase114.includes('Reviewer Fields'));
test('Outcomes section present', phase114.includes('Review Outcome'));
test('Outcome PASS present', phase114.includes('PASS:'));
test('Outcome PASS WITH CONDITIONS present', phase114.includes('PASS WITH CONDITIONS:'));
test('Outcome FAIL present', phase114.includes('FAIL:'));

console.log('\n5) Readiness status check');
test('PASS is not implementation approval stated', phase114.includes('PASS outcome from this checklist is a documentation milestone only and does not authorize implementation or prototype start.'));

console.log('\n6) Boundary checks');
test('Implementation non-approval stated', phase114.includes('does not approve implementation'));
test('Prototype non-start stated', phase114.includes('does not start prototype'));
test('Execution non-enable stated', phase114.includes('does not enable execution'));
test('No file write stated', phase114.includes('No file write'));
test('No shell command stated', phase114.includes('No shell command'));
test('No persistence stated', phase114.includes('No persistence'));
test('No permission grant stated', phase114.includes('No permission grant'));
test('No capability/token issuance stated', phase114.includes('No capability/token issuance'));
test('No ActionExecutor stated', phase114.includes('No ActionExecutor'));
test('No Command Registry stated', phase114.includes('No Command Registry'));

console.log('\n7) Safety baseline and Planning Line preservation');
test('Safety baseline archived/frozen/untouched stated', phase114.includes('Safety Baseline v1.0.0 remains archived, frozen, read-only, sealed, untouched, not reopened, not weakened'));
test('Planning line archived/release-tagged/untouched stated', phase114.includes('Prototype Planning Line v1.0.0-no-implementation remains archived, release-tagged, indexed, untouched'));

console.log('\n8) Required sentence and final result');
test(
  'Required key sentence present',
  phase114.includes('Phase 114 reviews the prototype specification draft as documentation only and does not approve implementation, start a prototype, enable execution, write files, persist records, grant permissions, issue capabilities, create ActionExecutor behavior, or register commands.'),
);
test('Known issues section present', phase114.includes('Known Issues'));
test('Known issues none stated', phase114.includes('Known issues: none.'));
test('Final result phrase present', phase114.includes('prototype specification review checklist ready as documentation only'));

console.log('\n9) No implementation snippets in doc');
test('No ActionExecutor class snippet present', !phase114.includes('class ActionExecutor'));
test('No Command Registry implementation snippet present', !phase114.includes('registerCommand('));
test('No token issuance code snippet present', !phase114.includes('issueToken('));

console.log('\n==================================================================================');
console.log('Phase 114 Smoke Test Results\n');

const passed = results.filter(r => r.passed).length;
const total = results.length;
const failed = total - passed;
const remaining = 0;

console.log(`Total Tests: ${total}`);
console.log(`Passed: ${passed}`);
console.log(`Remaining: ${remaining}`);

if (failed === 0) {
  console.log('\nOK PHASE 114 SMOKE TEST PASSED');
  process.exit(0);
} else {
  console.log('\nFAIL PHASE 114 SMOKE TEST FAILED');
  for (const item of results.filter(r => !r.passed)) {
    console.log(`- ${item.testName}`);
    if (item.errorMessage) console.log(`  ${item.errorMessage}`);
  }
  process.exit(1);
}
