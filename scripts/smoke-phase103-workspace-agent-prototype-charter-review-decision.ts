#!/usr/bin/env npx tsx
/**
 * Phase 103 - Workspace Agent Prototype Charter Review Decision
 * Smoke validation script (review decision documentation only)
 */

import * as fs from 'fs';

interface ValidationResult {
  testName: string;
  passed: boolean;
  errorMessage?: string;
}

const results: ValidationResult[] = [];
const PHASE103_DOC = 'docs/workspace-agent-prototype-charter-review-decision.md';
const PHASE101_DOC = 'docs/workspace-agent-prototype-charter-draft.md';
const PHASE102_DOC = 'docs/workspace-agent-prototype-charter-review-checklist.md';

function test(testName: string, condition: boolean, errorMessage?: string): void {
  results.push({ testName, passed: condition, errorMessage });
  const icon = condition ? 'OK' : 'FAIL';
  console.log(`[${icon}] ${testName}`);
  if (!condition && errorMessage) {
    console.log(`  Error: ${errorMessage}`);
  }
}

function readFile(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to read ${filePath}: ${error}`);
  }
}

console.log('Phase 103 - Workspace Agent Prototype Charter Review Decision Smoke Tests');
console.log('======================================================================\n');

const phase103 = readFile(PHASE103_DOC);

console.log('1) Existence and status');
test('Phase 103 document exists', fs.existsSync(PHASE103_DOC));
test('Title present', phase103.includes('# Phase 103 - Workspace Agent Prototype Charter Review Decision'));
test('Decision-only status present', phase103.includes('Review Decision Documentation Only'));

console.log('\n2) Required references');
test('Required input section present', phase103.includes('Required Inputs and References'));
test('Phase 101 reference present', phase103.includes('Phase 101 prototype charter draft'));
test('Phase 102 reference present', phase103.includes('Phase 102 prototype charter review checklist'));
test('Reference rule present', phase103.includes('Missing any required reference blocks decision finalization'));

console.log('\n3) Allowed review outcomes');
test('Outcomes section present', phase103.includes('Allowed Review Outcomes'));
test('REVIEW-PASS defined', phase103.includes('REVIEW-PASS'));
test('REVIEW-PASS-WITH-CONDITIONS defined', phase103.includes('REVIEW-PASS-WITH-CONDITIONS'));
test('REVIEW-FAIL defined', phase103.includes('REVIEW-FAIL'));
test('Outcome rule present', phase103.includes('No outcome in this phase authorizes implementation or execution'));

console.log('\n4) Required reviewer fields');
test('Reviewer fields section present', phase103.includes('Required Reviewer Fields'));
test('Decision metadata fields present', phase103.includes('A. Decision Metadata'));
test('Reviewer identity fields present', phase103.includes('B. Reviewer Identity and Accountability'));
test('Input traceability fields present', phase103.includes('C. Input Traceability'));
test('Outcome/rationale fields present', phase103.includes('D. Outcome and Rationale'));
test('Conditions/blockers fields present', phase103.includes('E. Conditions and Blockers'));
test('Non-implementation statements required', phase103.includes('F. Required Non-Implementation Statements'));
test('Baseline integrity statement required', phase103.includes('G. Required Baseline Integrity Statement'));
test('Sign-off fields present', phase103.includes('H. Sign-Off'));

console.log('\n5) Condition/blocker handling');
test('Condition/blocker section present', phase103.includes('Condition and Blocker Handling Model'));
test('Rule C1 present', phase103.includes('Rule C1'));
test('Rule C2 present', phase103.includes('Rule C2'));
test('Rule C3 present', phase103.includes('Rule C3'));
test('Rule C4 present', phase103.includes('Rule C4'));
test('Rule C5 present', phase103.includes('Rule C5'));
test('Rule C6 present', phase103.includes('Rule C6'));

console.log('\n6) REVIEW-PASS non-implementation guarantee');
test('Boundary clarification section present', phase103.includes('REVIEW-PASS Boundary Clarification'));
test('REVIEW-PASS does not approve implementation stated', phase103.includes('implementation is approved'));
test('REVIEW-PASS does not start prototype stated', phase103.includes('prototype is started'));
test('REVIEW-PASS does not enable execution stated', phase103.includes('execution pathways are enabled'));

console.log('\n7) Scope restrictions');
test('No prototype implementation stated', phase103.includes('No prototype implementation'));
test('No runtime behavior changes stated', phase103.includes('No runtime behavior changes'));
test('No execution pathway stated', phase103.includes('No execution pathway'));
test('No file write stated', phase103.includes('No file write'));
test('No shell command stated', phase103.includes('No shell command'));
test('No persistence stated', phase103.includes('No persistence'));
test('No permission grant stated', phase103.includes('No permission grant'));
test('No capability/token issuance stated', phase103.includes('No capability/token issuance'));
test('No ActionExecutor stated', phase103.includes('No ActionExecutor'));
test('No Command Registry stated', phase103.includes('No Command Registry'));

console.log('\n8) Baseline integrity');
test('Baseline section present', phase103.includes('Safety Baseline v1.0.0 Reconfirmation'));
test('Baseline frozen stated', phase103.includes('frozen'));
test('Baseline read-only stated', phase103.includes('read-only'));
test('Baseline archived stated', phase103.includes('archived'));
test('Baseline sealed stated', phase103.includes('sealed'));
test('Baseline untouched stated', phase103.includes('untouched'));
test('Baseline not reopened stated', phase103.includes('not reopened'));
test('Baseline not weakened stated', phase103.includes('not weakened'));

console.log('\n9) Template and final declaration');
test('Template section present', phase103.includes('Review Decision Template'));
test('Template has outcome enum', phase103.includes('[REVIEW-PASS / REVIEW-PASS-WITH-CONDITIONS / REVIEW-FAIL]'));
test('Template required statements present', phase103.includes('This review decision does not approve implementation.'));
test('Final declaration section present', phase103.includes('Final Declaration'));
test('Final declaration no implementation statement present', phase103.includes('does not approve implementation'));

console.log('\n10) Related docs and implementation guard');
test('Phase 101 document exists', fs.existsSync(PHASE101_DOC));
test('Phase 102 document exists', fs.existsSync(PHASE102_DOC));
test('No ActionExecutor class snippet present', !phase103.includes('class ActionExecutor'));
test('No command registry snippet present', !phase103.includes('registerCommand('));
test('No token issuance snippet present', !phase103.includes('issueToken('));

console.log('\n======================================================================');
console.log('Phase 103 Smoke Test Results\n');

const passed = results.filter(r => r.passed).length;
const total = results.length;
const failed = total - passed;
const rate = Math.round((passed / total) * 100);

console.log(`Total Tests: ${total}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Success Rate: ${rate}%\n`);

if (failed === 0) {
  console.log('OK PHASE 103 SMOKE TEST PASSED');
  console.log('Phase 103 review decision documentation is complete and non-implementation boundaries are preserved.');
  process.exit(0);
} else {
  console.log('FAIL PHASE 103 SMOKE TEST FAILED');
  for (const item of results.filter(r => !r.passed)) {
    console.log(`- ${item.testName}`);
    if (item.errorMessage) console.log(`  ${item.errorMessage}`);
  }
  process.exit(1);
}
