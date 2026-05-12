#!/usr/bin/env npx tsx
/**
 * Phase 102 - Workspace Agent Prototype Charter Review Checklist
 * Smoke validation script (review checklist documentation only)
 */

import * as fs from 'fs';

interface ValidationResult {
  testName: string;
  passed: boolean;
  errorMessage?: string;
}

const results: ValidationResult[] = [];
const PHASE102_DOC = 'docs/workspace-agent-prototype-charter-review-checklist.md';
const PHASE101_DOC = 'docs/workspace-agent-prototype-charter-draft.md';
const PHASE100_DOC = 'docs/workspace-agent-prototype-go-no-go-decision-record.md';

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

console.log('Phase 102 - Workspace Agent Prototype Charter Review Checklist Smoke Tests');
console.log('=======================================================================\n');

const phase102 = readFile(PHASE102_DOC);

console.log('1) Existence and status');
test('Phase 102 document exists', fs.existsSync(PHASE102_DOC));
test('Title present', phase102.includes('# Phase 102 - Workspace Agent Prototype Charter Review Checklist'));
test('Checklist-only status present', phase102.includes('Review Checklist Documentation Only'));

console.log('\n2) Required references');
test('Required references section present', phase102.includes('Required References'));
test('Phase 101 reference present', phase102.includes('Phase 101 prototype charter draft'));
test('Phase 100 reference present', phase102.includes('Phase 100 prototype go/no-go decision record'));
test('Reference rule present', phase102.includes('Missing either reference blocks checklist completion'));

console.log('\n3) Checklist sections');
test('Section A charter completeness present', phase102.includes('Checklist Section A - Charter Completeness'));
test('Section B scope boundaries present', phase102.includes('Checklist Section B - Scope Boundaries'));
test('Section C safety controls present', phase102.includes('Checklist Section C - Safety Controls'));
test('Section D governance readiness present', phase102.includes('Checklist Section D - Governance Readiness'));
test('Section E exit criteria present', phase102.includes('Checklist Section E - Exit Criteria'));
test('Section F non-implementation guarantees present', phase102.includes('Checklist Section F - Non-Implementation Guarantees'));
test('Section G baseline integrity present', phase102.includes('Checklist Section G - Baseline Integrity'));

console.log('\n4) Safety controls coverage');
test('C1 kill-switch check present', phase102.includes('C1. Kill-switch control defined'));
test('C2 rollback check present', phase102.includes('C2. Rollback control defined'));
test('C3 audit check present', phase102.includes('C3. Audit control defined'));
test('C4 permission check present', phase102.includes('C4. Permission control defined'));
test('C5 sandbox check present', phase102.includes('C5. Sandbox control defined'));
test('C6 diff-preview check present', phase102.includes('C6. Diff-preview control defined'));

console.log('\n5) Non-implementation guarantees');
test('Passing checklist does not approve implementation stated', phase102.includes('Passing this checklist does not approve implementation'));
test('Passing checklist does not start prototype stated', phase102.includes('Passing this checklist does not start prototype'));
test('Passing checklist does not enable execution pathways stated', phase102.includes('Passing this checklist does not enable execution pathways'));

console.log('\n6) Baseline integrity');
test('Baseline integrity checks include frozen', phase102.includes('Safety Baseline v1.0.0 remains frozen'));
test('Baseline integrity checks include read-only', phase102.includes('Safety Baseline v1.0.0 remains read-only'));
test('Baseline integrity checks include archived', phase102.includes('Safety Baseline v1.0.0 remains archived'));
test('Baseline integrity checks include sealed', phase102.includes('Safety Baseline v1.0.0 remains sealed'));
test('Baseline integrity checks include untouched', phase102.includes('Safety Baseline v1.0.0 remains untouched'));

console.log('\n7) Outcome model and template');
test('Checklist outcome model present', phase102.includes('Checklist Outcome Model'));
test('CHECKLIST-PASS present', phase102.includes('CHECKLIST-PASS'));
test('CHECKLIST-INCOMPLETE present', phase102.includes('CHECKLIST-INCOMPLETE'));
test('CHECKLIST-BLOCKED present', phase102.includes('CHECKLIST-BLOCKED'));
test('Review record template present', phase102.includes('Review Record Template'));

console.log('\n8) Scope restrictions');
test('No prototype implementation stated', phase102.includes('No prototype implementation'));
test('No runtime behavior changes stated', phase102.includes('No runtime behavior changes'));
test('No execution pathway stated', phase102.includes('No execution pathway'));
test('No file write stated', phase102.includes('No file write'));
test('No shell command stated', phase102.includes('No shell command'));
test('No persistence stated', phase102.includes('No persistence'));
test('No permission grant stated', phase102.includes('No permission grant'));
test('No capability/token issuance stated', phase102.includes('No capability/token issuance'));
test('No ActionExecutor stated', phase102.includes('No ActionExecutor'));
test('No Command Registry stated', phase102.includes('No Command Registry'));

console.log('\n9) Related docs and implementation guard');
test('Phase 101 doc exists', fs.existsSync(PHASE101_DOC));
test('Phase 100 doc exists', fs.existsSync(PHASE100_DOC));
test('No ActionExecutor class snippet present', !phase102.includes('class ActionExecutor'));
test('No command registry snippet present', !phase102.includes('registerCommand('));

console.log('\n=======================================================================');
console.log('Phase 102 Smoke Test Results\n');

const passed = results.filter(r => r.passed).length;
const total = results.length;
const failed = total - passed;
const rate = Math.round((passed / total) * 100);

console.log(`Total Tests: ${total}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Success Rate: ${rate}%\n`);

if (failed === 0) {
  console.log('OK PHASE 102 SMOKE TEST PASSED');
  console.log('Phase 102 checklist documentation is complete and non-implementation boundaries are preserved.');
  process.exit(0);
} else {
  console.log('FAIL PHASE 102 SMOKE TEST FAILED');
  for (const item of results.filter(r => !r.passed)) {
    console.log(`- ${item.testName}`);
    if (item.errorMessage) console.log(`  ${item.errorMessage}`);
  }
  process.exit(1);
}
