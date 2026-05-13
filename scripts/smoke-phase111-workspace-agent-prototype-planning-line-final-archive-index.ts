#!/usr/bin/env npx tsx
/**
 * Phase 111 - Workspace Agent Prototype Planning Line Final Archive Index
 * Smoke validation script (documentation-only)
 */

import * as fs from 'fs';

interface ValidationResult {
  testName: string;
  passed: boolean;
  errorMessage?: string;
}

const results: ValidationResult[] = [];
const PHASE111_DOC = 'docs/workspace-agent-prototype-planning-line-final-archive-index.md';
const PHASE109_TAG = 'workspace-agent-prototype-planning-line-v1.0.0-no-implementation';

const REQUIRED_PHASES = [
  'Phase 100', 'Phase 101', 'Phase 102', 'Phase 103', 'Phase 104',
  'Phase 105', 'Phase 106', 'Phase 107', 'Phase 108', 'Phase 109', 'Phase 110'
];

const REQUIRED_FILES = [
  'docs/workspace-agent-prototype-go-no-go-decision-record.md',
  'docs/workspace-agent-prototype-charter-draft.md',
  'docs/workspace-agent-prototype-charter-review-checklist.md',
  'docs/workspace-agent-prototype-charter-review-decision.md',
  'docs/workspace-agent-prototype-charter-conditional-resolution-plan.md',
  'docs/workspace-agent-prototype-charter-final-readiness-summary.md',
  'docs/workspace-agent-prototype-planning-line-archive.md',
  'docs/workspace-agent-prototype-planning-line-release-readiness.md',
  'docs/workspace-agent-prototype-planning-line-release-tag-preparation.md',
  'docs/workspace-agent-prototype-planning-line-post-tag-integrity-verification.md'
];

function test(testName: string, condition: boolean, errorMessage?: string): void {
  results.push({ testName, passed: condition, errorMessage });
  const icon = condition ? 'OK' : 'FAIL';
  console.log(`[${icon}] ${testName}`);
  if (!condition && errorMessage) {
    console.log(`  Error: ${errorMessage}`);
  }
}

console.log('Phase 111 - Workspace Agent Prototype Planning Line Final Archive Index Smoke Tests');
console.log('====================================================================================\n');

const phase111 = fs.readFileSync(PHASE111_DOC, 'utf-8');

console.log('1) Existence and status');
test('Phase 111 document exists', fs.existsSync(PHASE111_DOC));
test('Title present', phase111.includes('# Phase 111 - Workspace Agent Prototype Planning Line Final Archive Index'));
test('Final Archive Index / No Implementation status present', phase111.includes('Final Archive Index / No Implementation'));

console.log('\n2) Required references present in doc');
REQUIRED_PHASES.forEach(phase => {
    test(`${phase} reference present`, phase111.includes(phase));
});

console.log('\n3) Related files exist');
REQUIRED_FILES.forEach(file => {
    test(`${file} exists`, fs.existsSync(file));
});

console.log('\n4) Archive sections checks');
test('Canonical reading order section present', phase111.includes('Canonical Reading Order'));
test('Archive status section present', phase111.includes('Archive Status'));
test('Release tag section present', phase111.includes('Release Tag'));
test('Tag name present', phase111.includes(PHASE109_TAG));
test('Archived status present', phase111.includes('archived'));
test('Release-tagged status present', phase111.includes('release-tagged'));
test('Post-tag verified status present', phase111.includes('post-tag verified'));
test('Documentation-only status present', phase111.includes('documentation-only'));

console.log('\n5) Boundary checks');
test('Implementation non-approval stated', phase111.includes('does not approve implementation'));
test('Prototype non-start stated', phase111.includes('does not start prototype'));
test('Execution non-enable stated', phase111.includes('does not enable execution'));
test('No file write stated', phase111.includes('No file write'));
test('No shell command stated', phase111.includes('No shell command'));
test('No persistence stated', phase111.includes('No persistence'));
test('No permission grant stated', phase111.includes('No permission grant'));
test('No capability/token issuance stated', phase111.includes('No capability/token issuance'));
test('No ActionExecutor stated', phase111.includes('No ActionExecutor'));
test('No Command Registry stated', phase111.includes('No Command Registry'));

console.log('\n6) Safety baseline checks');
test('Safety baseline section present', phase111.includes('Safety Baseline v1.0.0 Reconfirmation'));
test('Baseline archived stated', phase111.includes('archived'));
test('Baseline frozen stated', phase111.includes('frozen'));
test('Baseline read-only stated', phase111.includes('read-only'));
test('Baseline sealed stated', phase111.includes('sealed'));
test('Baseline untouched stated', phase111.includes('untouched'));
test('Baseline not reopened stated', phase111.includes('not reopened'));
test('Baseline not weakened stated', phase111.includes('not weakened'));

console.log('\n7) Required sentence and final result');
test(
  'Required key sentence present',
  phase111.includes('Phase 111 creates the final archive index for the prototype planning line as documentation only and does not approve implementation, start a prototype, enable execution, write files, persist records, grant permissions, issue capabilities, create ActionExecutor behavior, or register commands.'),
);
test('Known issues section present', phase111.includes('Known Issues'));
test('Known issues none stated', phase111.includes('Known issues: none.'));
test('Final result phrase present', phase111.includes('final archive index complete for planning-line documentation release only'));

console.log('\n8) No implementation snippets in doc');
test('No ActionExecutor class snippet present', !phase111.includes('class ActionExecutor'));
test('No Command Registry implementation snippet present', !phase111.includes('registerCommand('));
test('No token issuance code snippet present', !phase111.includes('issueToken('));

console.log('\n====================================================================================');
console.log('Phase 111 Smoke Test Results\n');

const passed = results.filter(r => r.passed).length;
const total = results.length;
const failed = total - passed;
const remaining = 0;

console.log(`Total Tests: ${total}`);
console.log(`Passed: ${passed}`);
console.log(`Remaining: ${remaining}`);

if (failed === 0) {
  console.log('\nOK PHASE 111 SMOKE TEST PASSED');
  process.exit(0);
} else {
  console.log('\nFAIL PHASE 111 SMOKE TEST FAILED');
  for (const item of results.filter(r => !r.passed)) {
    console.log(`- ${item.testName}`);
    if (item.errorMessage) console.log(`  ${item.errorMessage}`);
  }
  process.exit(1);
}
