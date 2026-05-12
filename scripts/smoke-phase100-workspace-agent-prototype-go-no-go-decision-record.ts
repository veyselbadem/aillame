#!/usr/bin/env npx tsx
/**
 * Phase 100 - Workspace Agent Prototype Go/No-Go Decision Record
 * Smoke validation script (decision documentation only)
 */

import * as fs from 'fs';

interface ValidationResult {
  testName: string;
  passed: boolean;
  errorMessage?: string;
}

const results: ValidationResult[] = [];
const PHASE100_DOC = 'docs/workspace-agent-prototype-go-no-go-decision-record.md';
const PHASE98_DOC = 'docs/workspace-agent-security-approval-gate.md';
const PHASE99_DOC = 'docs/workspace-agent-prototype-track-preparation.md';

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

console.log('Phase 100 - Workspace Agent Prototype Go/No-Go Decision Record Smoke Tests');
console.log('========================================================================\n');

const phase100 = readFile(PHASE100_DOC);

// 1) existence and status
console.log('1) Existence and status');
test('Phase 100 document exists', fs.existsSync(PHASE100_DOC));
test('Title present', phase100.includes('# Phase 100 - Workspace Agent Prototype Go/No-Go Decision Record'));
test('Decision-only status present', phase100.includes('Decision Documentation Only'));
test('No prototype implementation status present', phase100.includes('No Prototype Implementation'));

// 2) references to phase 98 and 99
console.log('\n2) Input references');
test('Inputs section present', phase100.includes('Inputs and Traceability Requirements'));
test('Phase 98 reference present', phase100.includes('Phase 98 security approval gate'));
test('Phase 99 reference present', phase100.includes('Phase 99 prototype track preparation'));
test('Traceability rule present', phase100.includes('Traceability rule'));

// 3) decision outcomes
console.log('\n3) Decision outcomes');
test('Outcome section present', phase100.includes('Decision Outcomes (Allowed Values)'));
test('GO TO PROTOTYPE CHARTER DRAFT defined', phase100.includes('GO TO PROTOTYPE CHARTER DRAFT'));
test('NO-GO defined', phase100.includes('NO-GO'));
test('CONDITIONAL-GO defined', phase100.includes('CONDITIONAL-GO'));
test('Outcome rule present', phase100.includes('Outcome rule'));

// 4) mandatory fields
console.log('\n4) Mandatory decision fields');
test('Mandatory fields section present', phase100.includes('Mandatory Decision Fields'));
test('Metadata fields present', phase100.includes('A. Metadata'));
test('Input fields present', phase100.includes('B. Input References'));
test('Outcome fields present', phase100.includes('C. Outcome'));
test('Blocker fields present', phase100.includes('D. Blocker Status'));
test('Conditional fields present', phase100.includes('E. Condition Set'));
test('Safety boundary statements required', phase100.includes('F. Safety Boundary Statements'));
test('Baseline integrity statement required', phase100.includes('G. Baseline Integrity Statement'));
test('Sign-off fields present', phase100.includes('H. Sign-Off'));

// 5) unresolved blocker handling
console.log('\n5) Unresolved blocker handling');
test('Blocker handling section present', phase100.includes('Unresolved Blocker Handling Model'));
test('Rule B1 present', phase100.includes('Rule B1'));
test('Rule B2 present', phase100.includes('Rule B2'));
test('Rule B3 present', phase100.includes('Rule B3'));
test('Rule B4 present', phase100.includes('Rule B4'));
test('Rule B5 present', phase100.includes('Rule B5'));

// 6) GO does not approve implementation
console.log('\n6) Non-implementation guarantee');
test('GO boundary section present', phase100.includes('Outcome Semantics and Boundaries'));
test('GO does not allow implementation stated', phase100.includes('Does not allow implementation work'));
test('GO does not allow runtime activation stated', phase100.includes('Does not allow runtime activation'));
test('Final declaration repeats non-implementation boundary', phase100.includes('does not approve or start implementation'));

// 7) scope restrictions
console.log('\n7) Scope restrictions');
test('No runtime behavior changes stated', phase100.includes('No runtime behavior changes'));
test('No execution pathway stated', phase100.includes('No execution pathway'));
test('No file write stated', phase100.includes('No file write'));
test('No shell command stated', phase100.includes('No shell command'));
test('No persistence stated', phase100.includes('No persistence'));
test('No permission grant stated', phase100.includes('No permission grant'));
test('No capability/token issuance stated', phase100.includes('No capability/token issuance'));
test('No ActionExecutor stated', phase100.includes('No ActionExecutor'));
test('No Command Registry stated', phase100.includes('No Command Registry'));

// 8) baseline integrity
console.log('\n8) Baseline integrity');
test('Baseline reconfirmation section present', phase100.includes('Safety Baseline v1.0.0 Reconfirmation'));
test('Baseline frozen stated', phase100.includes('frozen'));
test('Baseline read-only stated', phase100.includes('read-only'));
test('Baseline archived stated', phase100.includes('archived'));
test('Baseline sealed stated', phase100.includes('sealed'));
test('Baseline untouched stated', phase100.includes('untouched'));
test('Baseline not reopened stated', phase100.includes('not reopened'));
test('Baseline not weakened stated', phase100.includes('not weakened'));

// 9) template checks
console.log('\n9) Decision template checks');
test('Decision template section present', phase100.includes('Decision Record Template'));
test('Outcome enum in template present', phase100.includes('Decision Outcome: [GO TO PROTOTYPE CHARTER DRAFT / NO-GO / CONDITIONAL-GO]'));
test('Conditional set in template present', phase100.includes('Conditional Set (required for CONDITIONAL-GO)'));
test('Required safety statements in template present', phase100.includes('Required Safety Boundary Statements'));
test('Required baseline statement in template present', phase100.includes('Required Baseline Statement'));

// 10) non-goals
console.log('\n10) Explicit non-goals');
test('Explicit non-goals section present', phase100.includes('Explicit Non-Goals for Phase 100'));
test('No implementation non-goal present', phase100.includes('Implement prototype code'));
test('No execution enablement non-goal present', phase100.includes('Enable execution pathways'));
test('No ActionExecutor non-goal present', phase100.includes('Introduce ActionExecutor'));
test('No Command Registry non-goal present', phase100.includes('Introduce Command Registry'));

// 11) related documents existence
console.log('\n11) Related document existence');
test('Phase 98 doc exists', fs.existsSync(PHASE98_DOC));
test('Phase 99 doc exists', fs.existsSync(PHASE99_DOC));

// 12) guard against implementation snippets
console.log('\n12) Guard against implementation snippets');
test('No ActionExecutor class snippet present', !phase100.includes('class ActionExecutor'));
test('No command registry code snippet present', !phase100.includes('registerCommand('));
test('No token issuance snippet present', !phase100.includes('issueToken('));

// summary
console.log('\n========================================================================');
console.log('Phase 100 Smoke Test Results\n');

const passed = results.filter(r => r.passed).length;
const total = results.length;
const failed = total - passed;
const rate = Math.round((passed / total) * 100);

console.log(`Total Tests: ${total}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Success Rate: ${rate}%\n`);

if (failed === 0) {
  console.log('OK PHASE 100 SMOKE TEST PASSED');
  console.log('Phase 100 decision record is complete and non-implementation boundaries are preserved.');
  process.exit(0);
} else {
  console.log('FAIL PHASE 100 SMOKE TEST FAILED');
  for (const item of results.filter(r => !r.passed)) {
    console.log(`- ${item.testName}`);
    if (item.errorMessage) console.log(`  ${item.errorMessage}`);
  }
  process.exit(1);
}
