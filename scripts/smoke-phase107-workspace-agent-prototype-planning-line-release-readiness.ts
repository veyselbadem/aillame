#!/usr/bin/env npx tsx
/**
 * Phase 107 - Workspace Agent Prototype Planning Line Release Readiness
 * Smoke validation script (documentation-only)
 */

import * as fs from 'fs';

interface ValidationResult {
  testName: string;
  passed: boolean;
  errorMessage?: string;
}

const results: ValidationResult[] = [];
const PHASE107_DOC = 'docs/workspace-agent-prototype-planning-line-release-readiness.md';
const PHASE100_DOC = 'docs/workspace-agent-prototype-go-no-go-decision-record.md';
const PHASE101_DOC = 'docs/workspace-agent-prototype-charter-draft.md';
const PHASE102_DOC = 'docs/workspace-agent-prototype-charter-review-checklist.md';
const PHASE103_DOC = 'docs/workspace-agent-prototype-charter-review-decision.md';
const PHASE104_DOC = 'docs/workspace-agent-prototype-charter-conditional-resolution-plan.md';
const PHASE105_DOC = 'docs/workspace-agent-prototype-charter-final-readiness-summary.md';
const PHASE106_DOC = 'docs/workspace-agent-prototype-planning-line-archive.md';

function test(testName: string, condition: boolean, errorMessage?: string): void {
  results.push({ testName, passed: condition, errorMessage });
  const icon = condition ? 'OK' : 'FAIL';
  console.log(`[${icon}] ${testName}`);
  if (!condition && errorMessage) {
    console.log(`  Error: ${errorMessage}`);
  }
}

console.log('Phase 107 - Workspace Agent Prototype Planning Line Release Readiness Smoke Tests');
console.log('===============================================================================\n');

const phase107 = fs.readFileSync(PHASE107_DOC, 'utf-8');

console.log('1) Existence and status');
test('Phase 107 document exists', fs.existsSync(PHASE107_DOC));
test('Title present', phase107.includes('# Phase 107 - Workspace Agent Prototype Planning Line Release Readiness'));
test('Release Readiness / No Implementation status present', phase107.includes('Release Readiness / No Implementation'));

console.log('\n2) Required references present in doc');
test('Phase 100 reference present', phase107.includes('Phase 100 go/no-go decision record'));
test('Phase 101 reference present', phase107.includes('Phase 101 prototype charter draft'));
test('Phase 102 reference present', phase107.includes('Phase 102 prototype charter review checklist'));
test('Phase 103 reference present', phase107.includes('Phase 103 prototype charter review decision'));
test('Phase 104 reference present', phase107.includes('Phase 104 prototype charter conditional resolution plan'));
test('Phase 105 reference present', phase107.includes('Phase 105 prototype charter final readiness summary'));
test('Phase 106 reference present', phase107.includes('Phase 106 prototype planning line archive'));

console.log('\n3) Related files exist');
test('Phase 100 doc exists', fs.existsSync(PHASE100_DOC));
test('Phase 101 doc exists', fs.existsSync(PHASE101_DOC));
test('Phase 102 doc exists', fs.existsSync(PHASE102_DOC));
test('Phase 103 doc exists', fs.existsSync(PHASE103_DOC));
test('Phase 104 doc exists', fs.existsSync(PHASE104_DOC));
test('Phase 105 doc exists', fs.existsSync(PHASE105_DOC));
test('Phase 106 doc exists', fs.existsSync(PHASE106_DOC));

console.log('\n4) Release-readiness boundaries');
test('Planning documentation release only stated', phase107.includes('planning-line documentation release only'));
test('Implementation non-approval stated', phase107.includes('does not approve implementation'));
test('Prototype non-start stated', phase107.includes('does not start prototype'));
test('Execution non-enable stated', phase107.includes('does not enable execution'));
test('No file write stated', phase107.includes('No file write'));
test('No shell command stated', phase107.includes('No shell command'));
test('No persistence stated', phase107.includes('No persistence'));
test('No permission grant stated', phase107.includes('No permission grant'));
test('No capability/token issuance stated', phase107.includes('No capability/token issuance'));
test('No ActionExecutor stated', phase107.includes('No ActionExecutor'));
test('No Command Registry stated', phase107.includes('No Command Registry'));

console.log('\n5) Baseline integrity statement');
test('Safety baseline section present', phase107.includes('Safety Baseline v1.0.0 Reconfirmation'));
test('Baseline archived stated', phase107.includes('archived'));
test('Baseline frozen stated', phase107.includes('frozen'));
test('Baseline read-only stated', phase107.includes('read-only'));
test('Baseline sealed stated', phase107.includes('sealed'));
test('Baseline untouched stated', phase107.includes('untouched'));
test('Baseline not reopened stated', phase107.includes('not reopened'));
test('Baseline not weakened stated', phase107.includes('not weakened'));

console.log('\n6) Required sentence and known issues');
test(
  'Required key sentence present',
  phase107.includes('Phase 107 confirms prototype planning line release readiness as documentation only and does not approve implementation, start a prototype, enable execution, write files, persist records, grant permissions, issue capabilities, create ActionExecutor behavior, or register commands.'),
);
test('Known issues section present', phase107.includes('Known Issues'));
test('Known issues none stated', phase107.includes('Known issues: none.'));
test('Final result phrase present', phase107.includes('ready for planning-line documentation release only'));

console.log('\n7) No implementation snippets in doc');
test('No ActionExecutor class snippet present', !phase107.includes('class ActionExecutor'));
test('No Command Registry implementation snippet present', !phase107.includes('registerCommand('));
test('No token issuance code snippet present', !phase107.includes('issueToken('));

console.log('\n===============================================================================');
console.log('Phase 107 Smoke Test Results\n');

const passed = results.filter(r => r.passed).length;
const total = results.length;
const failed = total - passed;

console.log(`Total Tests: ${total}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed === 0) {
  console.log('\nOK PHASE 107 SMOKE TEST PASSED');
  process.exit(0);
} else {
  console.log('\nFAIL PHASE 107 SMOKE TEST FAILED');
  for (const item of results.filter(r => !r.passed)) {
    console.log(`- ${item.testName}`);
    if (item.errorMessage) console.log(`  ${item.errorMessage}`);
  }
  process.exit(1);
}
