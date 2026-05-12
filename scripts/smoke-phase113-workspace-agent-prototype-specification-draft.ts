#!/usr/bin/env npx tsx
/**
 * Phase 113 - Workspace Agent Prototype Specification Draft
 * Smoke validation script (documentation-only)
 */

import * as fs from 'fs';

interface ValidationResult {
  testName: string;
  passed: boolean;
  errorMessage?: string;
}

const results: ValidationResult[] = [];
const PHASE113_DOC = 'docs/workspace-agent-prototype-specification-draft.md';
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

console.log('Phase 113 - Workspace Agent Prototype Specification Draft Smoke Tests');
console.log('========================================================================\n');

const phase113 = fs.readFileSync(PHASE113_DOC, 'utf-8');

console.log('1) Existence and status');
test('Phase 113 document exists', fs.existsSync(PHASE113_DOC));
test('Title present', phase113.includes('# Phase 113 - Workspace Agent Prototype Specification Draft'));
test('Prototype Specification Draft / No Implementation status present', phase113.includes('Prototype Specification Draft / No Implementation'));

console.log('\n2) References present');
test('Implementation Readiness Track referenced', phase113.includes('Workspace Agent Prototype Implementation Readiness Track'));
test('Phase 112 Readiness Gate referenced', phase113.includes('Phase 112 [Implementation Readiness Gate]'));
test('Planning line tag present', phase113.includes(PLANNING_TAG));
test('Safety baseline tag present', phase113.includes(SAFETY_TAG));

console.log('\n3) Specification Placeholders (10 areas)');
const areas = [
  'sandbox', 'permission model', 'rollback', 'audit', 'diff-preview',
  'kill-switch', 'emergency stop', 'human approval', 'test isolation', 'governance'
];
areas.forEach(area => {
  test(`Specification placeholder for '${area}' present`, phase113.toLowerCase().includes(area));
});

console.log('\n4) Key Sections present');
test('Explicit non-goals section present', phase113.includes('Prototype Non-Goals (Explicit)'));
test('Unresolved questions section present', phase113.includes('Unresolved Questions'));
test('Required future review section present', phase113.includes('Required Future Review'));

console.log('\n5) Readiness status check');
test('READINESS-GO-TO-PROTOTYPE-SPEC is not implementation approval stated', phase113.includes('READINESS-GO-TO-PROTOTYPE-SPEC status from Phase 112 is a documentation authorization only and is not an implementation approval.'));

console.log('\n6) Boundary checks');
test('Implementation non-approval stated', phase113.includes('does not approve implementation'));
test('Prototype non-start stated', phase113.includes('does not start prototype'));
test('Execution non-enable stated', phase113.includes('does not enable execution'));
test('No file write stated', phase113.includes('No file write'));
test('No shell command stated', phase113.includes('No shell command'));
test('No persistence stated', phase113.includes('No persistence'));
test('No permission grant stated', phase113.includes('No permission grant'));
test('No capability/token issuance stated', phase113.includes('No capability/token issuance'));
test('No ActionExecutor stated', phase113.includes('No ActionExecutor'));
test('No Command Registry stated', phase113.includes('No Command Registry'));

console.log('\n7) Safety baseline and Planning Line preservation');
test('Safety baseline archived/frozen/untouched stated', phase113.includes('Safety Baseline v1.0.0 remains archived, frozen, read-only, sealed, untouched, not reopened, not weakened'));
test('Planning line archived/release-tagged/untouched stated', phase113.includes('Prototype Planning Line v1.0.0-no-implementation remains archived, release-tagged, indexed, untouched'));

console.log('\n8) Required sentence and final result');
test(
  'Required key sentence present',
  phase113.includes('Phase 113 drafts the prototype specification as documentation only and does not approve implementation, start a prototype, enable execution, write files, persist records, grant permissions, issue capabilities, create ActionExecutor behavior, or register commands.'),
);
test('Known issues section present', phase113.includes('Known Issues'));
test('Known issues none stated', phase113.includes('Known issues: none.'));
test('Final result phrase present', phase113.includes('prototype specification draft ready as documentation only'));

console.log('\n9) No implementation snippets in doc');
test('No ActionExecutor class snippet present', !phase113.includes('class ActionExecutor'));
test('No Command Registry implementation snippet present', !phase113.includes('registerCommand('));
test('No token issuance code snippet present', !phase113.includes('issueToken('));

console.log('\n========================================================================');
console.log('Phase 113 Smoke Test Results\n');

const passed = results.filter(r => r.passed).length;
const total = results.length;
const failed = total - passed;
const remaining = 0;

console.log(`Total Tests: ${total}`);
console.log(`Passed: ${passed}`);
console.log(`Remaining: ${remaining}`);

if (failed === 0) {
  console.log('\nOK PHASE 113 SMOKE TEST PASSED');
  process.exit(0);
} else {
  console.log('\nFAIL PHASE 113 SMOKE TEST FAILED');
  for (const item of results.filter(r => !r.passed)) {
    console.log(`- ${item.testName}`);
    if (item.errorMessage) console.log(`  ${item.errorMessage}`);
  }
  process.exit(1);
}
