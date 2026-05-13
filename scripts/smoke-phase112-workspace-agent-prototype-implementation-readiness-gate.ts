#!/usr/bin/env npx tsx
/**
 * Phase 112 - Workspace Agent Prototype Implementation Readiness Gate
 * Smoke validation script (documentation-only)
 */

import * as fs from 'fs';

interface ValidationResult {
  testName: string;
  passed: boolean;
  errorMessage?: string;
}

const results: ValidationResult[] = [];
const PHASE112_DOC = 'docs/workspace-agent-prototype-implementation-readiness-gate.md';
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

console.log('Phase 112 - Workspace Agent Prototype Implementation Readiness Gate Smoke Tests');
console.log('==================================================================================\n');

const phase112 = fs.readFileSync(PHASE112_DOC, 'utf-8');

console.log('1) Existence and status');
test('Phase 112 document exists', fs.existsSync(PHASE112_DOC));
test('Title present', phase112.includes('# Phase 112 - Workspace Agent Prototype Implementation Readiness Gate'));
test('Prototype Implementation Readiness Gate / No Implementation status present', phase112.includes('Prototype Implementation Readiness Gate / No Implementation'));

console.log('\n2) Track and Lineage present');
test('New track name present', phase112.includes('Workspace Agent Prototype Implementation Readiness Track'));
test('Previous track name present', phase112.includes('Workspace Agent Prototype Planning Line'));
test('Planning line tag present', phase112.includes(PLANNING_TAG));
test('Safety baseline tag present', phase112.includes(SAFETY_TAG));

console.log('\n3) Planning Line Status checks');
test('Planning line closed/archived/indexed stated', phase112.includes('Closed, Archived, Indexed, Release-Tagged, Post-Tag Verified, Documentation-Only'));
test('Planning line not reopened stated', phase112.includes('does not reopen the Workspace Agent Prototype Planning Line'));
test('Safety baseline not reopened stated', phase112.includes('does not reopen the Safety Baseline v1.0.0'));

console.log('\n4) Readiness Areas present');
const areas = [
  'sandbox', 'permission model', 'rollback', 'audit', 'diff-preview',
  'kill-switch', 'governance', 'test isolation', 'emergency stop', 'human approval'
];
areas.forEach(area => {
  test(`Readiness area '${area}' present`, phase112.toLowerCase().includes(area));
});

console.log('\n5) Blocker set checks');
for (let i = 1; i <= 10; i++) {
  test(`Blocker B${i} present`, phase112.includes(`B${i}:`));
}

console.log('\n6) Outcome checks');
test('Outcome READINESS-GO-TO-PROTOTYPE-SPEC present', phase112.includes('READINESS-GO-TO-PROTOTYPE-SPEC'));
test('Outcome READINESS-CONDITIONAL present', phase112.includes('READINESS-CONDITIONAL'));
test('Outcome READINESS-NO-GO present', phase112.includes('READINESS-NO-GO'));
test('GO-TO-PROTOTYPE-SPEC is not implementation approval stated', phase112.includes('This does not approve implementation'));

console.log('\n7) Boundary checks');
test('Implementation non-approval stated', phase112.includes('does not approve implementation'));
test('Prototype non-start stated', phase112.includes('does not start prototype'));
test('Execution non-enable stated', phase112.includes('does not enable execution'));
test('No file write stated', phase112.includes('No file write'));
test('No shell command stated', phase112.includes('No shell command'));
test('No persistence stated', phase112.includes('No persistence'));
test('No permission grant stated', phase112.includes('No permission grant'));
test('No capability/token issuance stated', phase112.includes('No capability/token issuance'));
test('No ActionExecutor stated', phase112.includes('No ActionExecutor'));
test('No Command Registry stated', phase112.includes('No Command Registry'));

console.log('\n8) Safety baseline and Planning Line preservation');
test('Safety baseline archived/frozen/untouched stated', phase112.includes('Safety Baseline v1.0.0 remains archived, frozen, read-only, sealed, untouched, not reopened, not weakened'));
test('Planning line archived/release-tagged/untouched stated', phase112.includes('Prototype Planning Line v1.0.0-no-implementation remains archived, release-tagged, indexed, untouched'));

console.log('\n9) Required sentence and final result');
test(
  'Required key sentence present',
  phase112.includes('Phase 112 opens the Prototype Implementation Readiness Track as documentation only and does not approve implementation, start a prototype, enable execution, write files, persist records, grant permissions, issue capabilities, create ActionExecutor behavior, or register commands.'),
);
test('Known issues section present', phase112.includes('Known Issues'));
test('Known issues none stated', phase112.includes('Known issues: none.'));
test('Final result phrase present', phase112.includes('ready as implementation-readiness gate documentation only'));

console.log('\n10) No implementation snippets in doc');
test('No ActionExecutor class snippet present', !phase112.includes('class ActionExecutor'));
test('No Command Registry implementation snippet present', !phase112.includes('registerCommand('));
test('No token issuance code snippet present', !phase112.includes('issueToken('));

console.log('\n==================================================================================');
console.log('Phase 112 Smoke Test Results\n');

const passed = results.filter(r => r.passed).length;
const total = results.length;
const failed = total - passed;
const remaining = 0;

console.log(`Total Tests: ${total}`);
console.log(`Passed: ${passed}`);
console.log(`Remaining: ${remaining}`);

if (failed === 0) {
  console.log('\nOK PHASE 112 SMOKE TEST PASSED');
  process.exit(0);
} else {
  console.log('\nFAIL PHASE 112 SMOKE TEST FAILED');
  for (const item of results.filter(r => !r.passed)) {
    console.log(`- ${item.testName}`);
    if (item.errorMessage) console.log(`  ${item.errorMessage}`);
  }
  process.exit(1);
}
