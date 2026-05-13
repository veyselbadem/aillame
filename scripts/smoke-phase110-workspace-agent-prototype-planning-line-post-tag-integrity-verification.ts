#!/usr/bin/env npx tsx
/**
 * Phase 110 - Workspace Agent Prototype Planning Line Post-Tag Integrity Verification
 * Smoke validation script (documentation-only)
 */

import * as fs from 'fs';

interface ValidationResult {
  testName: string;
  passed: boolean;
  errorMessage?: string;
}

const results: ValidationResult[] = [];
const PHASE110_DOC = 'docs/workspace-agent-prototype-planning-line-post-tag-integrity-verification.md';
const PHASE109_TAG = 'workspace-agent-prototype-planning-line-v1.0.0-no-implementation';

const REQUIRED_DOCS = [
  'docs/workspace-agent-prototype-go-no-go-decision-record.md',
  'docs/workspace-agent-prototype-charter-draft.md',
  'docs/workspace-agent-prototype-charter-review-checklist.md',
  'docs/workspace-agent-prototype-charter-review-decision.md',
  'docs/workspace-agent-prototype-charter-conditional-resolution-plan.md',
  'docs/workspace-agent-prototype-charter-final-readiness-summary.md',
  'docs/workspace-agent-prototype-planning-line-archive.md',
  'docs/workspace-agent-prototype-planning-line-release-readiness.md',
  'docs/workspace-agent-prototype-planning-line-release-tag-preparation.md'
];

function test(testName: string, condition: boolean, errorMessage?: string): void {
  results.push({ testName, passed: condition, errorMessage });
  const icon = condition ? 'OK' : 'FAIL';
  console.log(`[${icon}] ${testName}`);
  if (!condition && errorMessage) {
    console.log(`  Error: ${errorMessage}`);
  }
}

console.log('Phase 110 - Workspace Agent Prototype Planning Line Post-Tag Integrity Verification Smoke Tests');
console.log('==============================================================================================\n');

const phase110 = fs.readFileSync(PHASE110_DOC, 'utf-8');

console.log('1) Existence and status');
test('Phase 110 document exists', fs.existsSync(PHASE110_DOC));
test('Title present', phase110.includes('# Phase 110 - Workspace Agent Prototype Planning Line Post-Tag Integrity Verification'));
test('Post-Tag Integrity Verification / No Implementation status present', phase110.includes('Post-Tag Integrity Verification / No Implementation'));

console.log('\n2) Required references present in doc');
test('Phase 109 reference present', phase110.includes('Phase 109 release tag publication'));
test('Phase 108 reference present', phase110.includes('Phase 108 release tag preparation'));
test('Phase 100-107 references present', phase110.includes('Phase 100-107 planning line references'));

console.log('\n3) Related files exist (Phases 100-109)');
REQUIRED_DOCS.forEach(doc => {
    test(`${doc} exists`, fs.existsSync(doc));
});

console.log('\n4) Tag information checks');
test('Tag name present', phase110.includes(PHASE109_TAG));
test('Remote tag verification mentioned', phase110.includes('Remote verification status'));
test('Post-tag integrity verified mentioned', phase110.includes('Post-Tag Integrity Summary'));
test('Planning-line documentation release only mentioned', phase110.includes('planning-line documentation release only'));

console.log('\n5) Boundary checks');
test('Implementation non-approval stated', phase110.includes('does not approve implementation'));
test('Prototype non-start stated', phase110.includes('does not start prototype'));
test('Execution non-enable stated', phase110.includes('does not enable execution'));
test('No file write stated', phase110.includes('No file write'));
test('No shell command stated', phase110.includes('No shell command'));
test('No persistence stated', phase110.includes('No persistence'));
test('No permission grant stated', phase110.includes('No permission grant'));
test('No capability/token issuance stated', phase110.includes('No capability/token issuance'));
test('No ActionExecutor stated', phase110.includes('No ActionExecutor'));
test('No Command Registry stated', phase110.includes('No Command Registry'));

console.log('\n6) Safety baseline checks');
test('Safety baseline section present', phase110.includes('Safety Baseline v1.0.0 Reconfirmation'));
test('Baseline archived stated', phase110.includes('archived'));
test('Baseline frozen stated', phase110.includes('frozen'));
test('Baseline read-only stated', phase110.includes('read-only'));
test('Baseline sealed stated', phase110.includes('sealed'));
test('Baseline untouched stated', phase110.includes('untouched'));
test('Baseline not reopened stated', phase110.includes('not reopened'));
test('Baseline not weakened stated', phase110.includes('not weakened'));

console.log('\n7) Required sentence and final result');
test(
  'Required key sentence present',
  phase110.includes('Phase 110 verifies post-tag integrity for the prototype planning line as documentation only and does not approve implementation, start a prototype, enable execution, write files, persist records, grant permissions, issue capabilities, create ActionExecutor behavior, or register commands.'),
);
test('Known issues section present', phase110.includes('Known Issues'));
test('Known issues none stated', phase110.includes('Known issues: none.'));
test('Final result phrase present', phase110.includes('post-tag integrity verified for planning-line documentation release only'));

console.log('\n8) No implementation snippets in doc');
test('No ActionExecutor class snippet present', !phase110.includes('class ActionExecutor'));
test('No Command Registry implementation snippet present', !phase110.includes('registerCommand('));
test('No token issuance code snippet present', !phase110.includes('issueToken('));

console.log('\n==============================================================================================');
console.log('Phase 110 Smoke Test Results\n');

const passed = results.filter(r => r.passed).length;
const total = results.length;
const failed = total - passed;
const remaining = 0;

console.log(`Total Tests: ${total}`);
console.log(`Passed: ${passed}`);
console.log(`Remaining: ${remaining}`);

if (failed === 0) {
  console.log('\nOK PHASE 110 SMOKE TEST PASSED');
  process.exit(0);
} else {
  console.log('\nFAIL PHASE 110 SMOKE TEST FAILED');
  for (const item of results.filter(r => !r.passed)) {
    console.log(`- ${item.testName}`);
    if (item.errorMessage) console.log(`  ${item.errorMessage}`);
  }
  process.exit(1);
}
