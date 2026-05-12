#!/usr/bin/env npx tsx
/**
 * Phase 127 - Workspace Agent Prototype Implementation Charter Review Checklist
 * Smoke validation script (documentation-only)
 */

import * as fs from 'fs';

interface ValidationResult {
  testName: string;
  passed: boolean;
  errorMessage?: string;
}

const results: ValidationResult[] = [];
const PHASE127_DOC = 'docs/workspace-agent-prototype-implementation-charter-review-checklist.md';
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

console.log('Phase 127 - Workspace Agent Prototype Implementation Charter Review Checklist Smoke Tests');
console.log('========================================================================================\n');

const phase127 = fs.readFileSync(PHASE127_DOC, 'utf-8');

console.log('1) Existence and status');
test('Phase 127 document exists', fs.existsSync(PHASE127_DOC));
test('Title present', phase127.includes('# Phase 127 - Workspace Agent Prototype Implementation Charter Review Checklist'));
test('Prototype Implementation Charter Review Checklist / No Implementation status present', phase127.includes('Prototype Implementation Charter Review Checklist / No Implementation'));

console.log('\n2) References present');
test('Implementation Readiness Track referenced', phase127.includes('Workspace Agent Prototype Implementation Readiness Track'));
test('Phase 126 Implementation Charter Draft referenced', phase127.includes('Phase 126 [Prototype Implementation Charter Draft]'));
test('Phase 125 Go/No-Go Decision referenced', phase127.includes('Phase 125 [Prototype Implementation Track Go/No-Go Decision]'));
test('Phase 112 Readiness Gate referenced', phase127.includes('Phase 112 [Implementation Readiness Gate]'));
test('Phase 113-124 specification line referenced', phase127.includes('Phase 113') && phase127.includes('Phase 124'));
test('Planning line release tag present', phase127.includes(PLANNING_TAG));
test('Safety baseline release tag present', phase127.includes(SAFETY_TAG));
test('Specification release tag present', phase127.includes(SPEC_TAG));

console.log('\n3) Checklist sections');
test('charter identity completeness present', phase127.includes('charter identity completeness'));
test('charter purpose completeness present', phase127.includes('charter purpose completeness'));
test('implementation boundary statement completeness present', phase127.includes('implementation boundary statement completeness'));
test('prototype scope proposal completeness present', phase127.includes('prototype scope proposal completeness'));
test('explicit non-goals completeness present', phase127.includes('explicit non-goals completeness'));
test('required safety preconditions completeness present', phase127.includes('required safety preconditions completeness'));
test('required approval gates completeness present', phase127.includes('required approval gates completeness'));
test('rollback gate completeness present', phase127.includes('rollback gate completeness'));
test('audit gate completeness present', phase127.includes('audit gate completeness'));
test('sandbox gate completeness present', phase127.includes('sandbox gate completeness'));
test('permission gate completeness present', phase127.includes('permission gate completeness'));
test('diff-preview gate completeness present', phase127.includes('diff-preview gate completeness'));
test('kill-switch gate completeness present', phase127.includes('kill-switch gate completeness'));
test('human approval gate completeness present', phase127.includes('human approval gate completeness'));
test('test isolation gate completeness present', phase127.includes('test isolation gate completeness'));
test('emergency stop gate completeness present', phase127.includes('emergency stop gate completeness'));
test('governance gate completeness present', phase127.includes('governance gate completeness'));
test('exit criteria completeness present', phase127.includes('exit criteria completeness'));
test('stop conditions completeness present', phase127.includes('stop conditions completeness'));
test('sign-off fields completeness present', phase127.includes('sign-off fields completeness'));

console.log('\n4) Review outcome options');
test('CHARTER-REVIEW-PASS present', phase127.includes('CHARTER-REVIEW-PASS'));
test('CHARTER-REVIEW-PASS-WITH-CONDITIONS present', phase127.includes('CHARTER-REVIEW-PASS-WITH-CONDITIONS'));
test('CHARTER-REVIEW-FAIL present', phase127.includes('CHARTER-REVIEW-FAIL'));
test('CHARTER-REVIEW-PASS implementation approval değildir stated', phase127.includes('CHARTER-REVIEW-PASS is NOT an implementation approval'));
test('CHARTER-REVIEW-PASS prototype start değildir stated', phase127.includes('CHARTER-REVIEW-PASS is NOT a prototype start'));
test('CHARTER-REVIEW-PASS execution enablement değildir stated', phase127.includes('CHARTER-REVIEW-PASS is NOT an execution enablement'));
test('Checklist geçse bile ayrıca implementation approval gerekir stated', phase127.includes('formal implementation approval phase is required even if the checklist passes'));

console.log('\n5) Boundary checks');
test('Implementation approval vermediği stated', phase127.includes('It does not approve implementation'));
test('Prototype başlatmadığı stated', phase127.includes('It does not start prototype'));
test('Execution pathway açmadığı stated', phase127.includes('It does not enable execution pathways'));
test('No file write stated', phase127.includes('No file write'));
test('No shell command stated', phase127.includes('No shell command'));
test('No persistence stated', phase127.includes('No persistence'));
test('No permission grant stated', phase127.includes('No permission grant'));
test('No capability/token issuance stated', phase127.includes('No capability/token issuance'));
test('No ActionExecutor stated', phase127.includes('No ActionExecutor'));
test('No Command Registry stated', phase127.includes('No Command Registry'));

console.log('\n6) Preservation statements');
test('Safety Baseline archived/frozen/untouched stated', phase127.includes('Safety Baseline v1.0.0 remains archived, frozen, read-only, sealed, untouched, not reopened, not weakened'));
test('Planning line archived/release-tagged/untouched stated', phase127.includes('Prototype Planning Line v1.0.0-no-implementation remains archived, release-tagged, indexed, untouched'));
test('Prototype Specification archived/release-tagged/closed/untouched stated', phase127.includes('Prototype Specification v1.0.0-no-implementation remains archived, release-tagged, post-tag verified, indexed, closed, untouched'));

console.log('\n7) Required sentence and final result');
test(
  'Required key sentence present',
  phase127.includes('Phase 127 reviews the prototype implementation charter draft as documentation only and does not approve implementation, start a prototype, enable execution, write files, persist records, grant permissions, issue capabilities, create ActionExecutor behavior, or register commands.'),
);
test('Known issues section present', phase127.includes('Known Issues'));
test('Known issues none stated', phase127.includes('Known issues: none.'));
test('Final result phrase present', phase127.includes('prototype implementation charter review checklist ready as documentation only'));

console.log('\n8) No implementation snippets in doc');
test('No ActionExecutor class snippet present', !phase127.includes('class ActionExecutor'));
test('No Command Registry implementation snippet present', !phase127.includes('registerCommand('));
test('No token issuance code snippet present', !phase127.includes('issueToken('));

console.log('\n========================================================================================');
console.log('Phase 127 Smoke Test Results\n');

const passed = results.filter(r => r.passed).length;
const total = results.length;
const failed = total - passed;
const remaining = 0;

console.log(`Total Tests: ${total}`);
console.log(`Passed: ${passed}`);
console.log(`Remaining: ${remaining}`);

if (failed === 0) {
  console.log('\nOK PHASE 127 SMOKE TEST PASSED');
  process.exit(0);
} else {
  console.log('\nFAIL PHASE 127 SMOKE TEST FAILED');
  for (const item of results.filter(r => !r.passed)) {
    console.log(`- ${item.testName}`);
    if (item.errorMessage) console.log(`  ${item.errorMessage}`);
  }
  process.exit(1);
}
