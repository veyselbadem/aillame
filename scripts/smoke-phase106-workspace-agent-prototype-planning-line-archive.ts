#!/usr/bin/env npx tsx
/**
 * Phase 106 - Workspace Agent Prototype Planning Line Archive
 * Smoke validation script (documentation-only)
 */

import * as fs from 'fs';

interface ValidationResult {
  testName: string;
  passed: boolean;
  errorMessage?: string;
}

const results: ValidationResult[] = [];
const PHASE106_DOC = 'docs/workspace-agent-prototype-planning-line-archive.md';
const PHASE100_DOC = 'docs/workspace-agent-prototype-go-no-go-decision-record.md';
const PHASE101_DOC = 'docs/workspace-agent-prototype-charter-draft.md';
const PHASE102_DOC = 'docs/workspace-agent-prototype-charter-review-checklist.md';
const PHASE103_DOC = 'docs/workspace-agent-prototype-charter-review-decision.md';
const PHASE104_DOC = 'docs/workspace-agent-prototype-charter-conditional-resolution-plan.md';
const PHASE105_DOC = 'docs/workspace-agent-prototype-charter-final-readiness-summary.md';

function test(testName: string, condition: boolean, errorMessage?: string): void {
  results.push({ testName, passed: condition, errorMessage });
  const icon = condition ? 'OK' : 'FAIL';
  console.log(`[${icon}] ${testName}`);
  if (!condition && errorMessage) {
    console.log(`  Error: ${errorMessage}`);
  }
}

console.log('Phase 106 - Workspace Agent Prototype Planning Line Archive Smoke Tests');
console.log('======================================================================\n');

const phase106 = fs.readFileSync(PHASE106_DOC, 'utf-8');

console.log('1) Existence and status');
test('Phase 106 document exists', fs.existsSync(PHASE106_DOC));
test('Title present', phase106.includes('# Phase 106 - Workspace Agent Prototype Planning Line Archive'));
test('Archive documentation only status present', phase106.includes('Archive Documentation Only'));

console.log('\n2) Required references');
test('References section present', phase106.includes('Archived Planning-Line References'));
test('Phase 100 reference present', phase106.includes('Phase 100 go/no-go decision record'));
test('Phase 101 reference present', phase106.includes('Phase 101 prototype charter draft'));
test('Phase 102 reference present', phase106.includes('Phase 102 prototype charter review checklist'));
test('Phase 103 reference present', phase106.includes('Phase 103 prototype charter review decision'));
test('Phase 104 reference present', phase106.includes('Phase 104 prototype charter conditional resolution plan'));
test('Phase 105 reference present', phase106.includes('Phase 105 prototype charter final readiness summary'));

console.log('\n3) Archive summary and boundary');
test('Archive readiness summary section present', phase106.includes('Archive Readiness Summary (Phases 100-105)'));
test('Archive integrity section present', phase106.includes('Archive Integrity and Boundary Confirmation'));
test('Traceability statement present', phase106.includes('traceability remains complete'));
test('Archive is not implementation approval statement present', phase106.includes('Archive state is not implementation approval'));

console.log('\n4) Explicit non-approval checks');
test('Explicit non-approval section present', phase106.includes('Explicit Non-Approval Statement'));
test('Does not approve implementation statement present', phase106.includes('It does not approve implementation.'));
test('Does not start prototype statement present', phase106.includes('It does not start prototype.'));
test('Does not enable execution pathways statement present', phase106.includes('It does not enable execution pathways.'));

console.log('\n5) Scope restriction checks');
test('No prototype implementation stated', phase106.includes('No prototype implementation'));
test('No runtime behavior changes stated', phase106.includes('No runtime behavior changes'));
test('No execution pathway stated', phase106.includes('No execution pathway'));
test('No file write stated', phase106.includes('No file write'));
test('No shell command stated', phase106.includes('No shell command'));
test('No persistence stated', phase106.includes('No persistence'));
test('No permission grant stated', phase106.includes('No permission grant'));
test('No capability/token issuance stated', phase106.includes('No capability/token issuance'));
test('No ActionExecutor stated', phase106.includes('No ActionExecutor'));
test('No Command Registry stated', phase106.includes('No Command Registry'));

console.log('\n6) Baseline integrity checks');
test('Baseline section present', phase106.includes('Safety Baseline v1.0.0 Reconfirmation'));
test('Baseline frozen stated', phase106.includes('frozen'));
test('Baseline read-only stated', phase106.includes('read-only'));
test('Baseline archived stated', phase106.includes('archived'));
test('Baseline sealed stated', phase106.includes('sealed'));
test('Baseline untouched stated', phase106.includes('untouched'));

console.log('\n7) Template and final declaration');
test('Archive template section present', phase106.includes('Archive Record Template'));
test('Template includes phase 105 reference', phase106.includes('Phase 105 Reference:'));
test('Final declaration present', phase106.includes('Final Declaration'));

console.log('\n8) Related docs and guard checks');
test('Phase 100 doc exists', fs.existsSync(PHASE100_DOC));
test('Phase 101 doc exists', fs.existsSync(PHASE101_DOC));
test('Phase 102 doc exists', fs.existsSync(PHASE102_DOC));
test('Phase 103 doc exists', fs.existsSync(PHASE103_DOC));
test('Phase 104 doc exists', fs.existsSync(PHASE104_DOC));
test('Phase 105 doc exists', fs.existsSync(PHASE105_DOC));
test('No ActionExecutor class snippet present', !phase106.includes('class ActionExecutor'));
test('No command registry snippet present', !phase106.includes('registerCommand('));

console.log('\n======================================================================');
console.log('Phase 106 Smoke Test Results\n');

const passed = results.filter(r => r.passed).length;
const total = results.length;
const failed = total - passed;
const rate = Math.round((passed / total) * 100);

console.log(`Total Tests: ${total}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Success Rate: ${rate}%\n`);

if (failed === 0) {
  console.log('OK PHASE 106 SMOKE TEST PASSED');
  console.log('Phase 106 planning-line archive documentation is complete and non-implementation boundaries are preserved.');
  process.exit(0);
} else {
  console.log('FAIL PHASE 106 SMOKE TEST FAILED');
  for (const item of results.filter(r => !r.passed)) {
    console.log(`- ${item.testName}`);
    if (item.errorMessage) console.log(`  ${item.errorMessage}`);
  }
  process.exit(1);
}
