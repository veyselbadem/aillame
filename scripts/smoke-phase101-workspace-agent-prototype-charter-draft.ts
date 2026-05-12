#!/usr/bin/env npx tsx
/**
 * Phase 101 - Workspace Agent Prototype Charter Draft
 * Smoke validation script (charter documentation only)
 */

import * as fs from 'fs';

interface ValidationResult {
  testName: string;
  passed: boolean;
  errorMessage?: string;
}

const results: ValidationResult[] = [];
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

console.log('Phase 101 - Workspace Agent Prototype Charter Draft Smoke Tests');
console.log('==============================================================\n');

const phase101 = readFile(PHASE101_DOC);

// 1) existence and status
console.log('1) Existence and status');
test('Phase 101 document exists', fs.existsSync(PHASE101_DOC));
test('Title present', phase101.includes('# Phase 101 - Workspace Agent Prototype Charter Draft'));
test('Charter-only status present', phase101.includes('Charter Documentation Only'));
test('No prototype implementation status present', phase101.includes('No Prototype Implementation'));

// 2) phase 100 reference
console.log('\n2) Phase 100 reference');
test('Phase 100 reference section present', phase101.includes('Phase 100 Decision Reference'));
test('Phase 100 go/no-go reference mentioned', phase101.includes('Phase 100 go/no-go decision record'));
test('GO does not approve implementation statement present', phase101.includes('still does not approve implementation'));

// 3) purpose and boundaries
console.log('\n3) Purpose and boundaries');
test('Prototype purpose section present', phase101.includes('Prototype Purpose Statement'));
test('Prototype boundaries section present', phase101.includes('Prototype Boundaries'));
test('Governance boundary present', phase101.includes('Boundary B1: Governance Boundary'));
test('Execution boundary present', phase101.includes('Boundary B4: Execution Boundary'));
test('Baseline boundary present', phase101.includes('Boundary B5: Baseline Boundary'));

// 4) allowed planning scope
console.log('\n4) Allowed planning scope');
test('Allowed planning scope section present', phase101.includes('Allowed Prototype Planning Scope'));
test('Allowed planning bullets include charter structure', phase101.includes('Drafting charter structure and sections'));
test('Not allowed planning includes execution capability', phase101.includes('Enabling any execution capability'));

// 5) explicit non-goals
console.log('\n5) Explicit non-goals');
test('Explicit non-goals section present', phase101.includes('Explicit Non-Goals'));
test('No implementation non-goal present', phase101.includes('Implement prototype code'));
test('No ActionExecutor non-goal present', phase101.includes('Introduce ActionExecutor'));
test('No Command Registry non-goal present', phase101.includes('Introduce Command Registry'));
test('No shell command behavior non-goal present', phase101.includes('shell command execution behavior'));

// 6) required safety controls before implementation
console.log('\n6) Required safety controls before implementation');
test('Safety controls section present', phase101.includes('Required Safety Controls Before Any Implementation Consideration'));
test('C1 kill-switch present', phase101.includes('C1. Kill-Switch Control'));
test('C2 rollback present', phase101.includes('C2. Rollback Control'));
test('C3 audit present', phase101.includes('C3. Audit Control'));
test('C4 permission present', phase101.includes('C4. Permission Control'));
test('C5 sandbox present', phase101.includes('C5. Sandbox Control'));
test('C6 diff-preview present', phase101.includes('C6. Diff-Preview Control'));
test('C7 governance present', phase101.includes('C7. Governance Control'));
test('C8 baseline integrity present', phase101.includes('C8. Baseline Integrity Control'));
test('Missing control blocks implementation stated', phase101.includes('Missing any control blocks implementation consideration'));

// 7) exit criteria
console.log('\n7) Exit criteria');
test('Exit criteria section present', phase101.includes('Exit Criteria for Phase 101 Charter Phase'));
test('Exit criteria include purpose and boundaries', phase101.includes('Charter purpose and boundaries are documented'));
test('Exit criteria include C1-C8 documentation', phase101.includes('Required safety controls C1-C8 are documented'));
test('Exit criteria do not imply implementation', phase101.includes('does not indicate implementation approval'));

// 8) no-approval declaration
console.log('\n8) No-approval declaration');
test('No-approval declaration section present', phase101.includes('Non-Approval Declaration'));
test('Does not approve implementation declared', phase101.includes('It does not approve implementation.'));
test('Does not start implementation declared', phase101.includes('It does not start implementation.'));
test('Does not enable execution pathways declared', phase101.includes('It does not enable execution pathways.'));
test('Does not grant permissions/tokens/capabilities declared', phase101.includes('It does not grant permissions, tokens, or capabilities.'));

// 9) baseline reconfirmation
console.log('\n9) Baseline reconfirmation');
test('Baseline reconfirmation section present', phase101.includes('Safety Baseline v1.0.0 Reconfirmation'));
test('Baseline frozen stated', phase101.includes('frozen'));
test('Baseline read-only stated', phase101.includes('read-only'));
test('Baseline archived stated', phase101.includes('archived'));
test('Baseline sealed stated', phase101.includes('sealed'));
test('Baseline untouched stated', phase101.includes('untouched'));
test('Baseline not reopened stated', phase101.includes('not reopened'));
test('Baseline not weakened stated', phase101.includes('not weakened'));

// 10) scope restrictions
console.log('\n10) Scope restrictions');
test('No runtime behavior changes stated', phase101.includes('No runtime behavior changes'));
test('No execution pathway enablement stated', phase101.includes('No execution pathway enablement'));
test('No file write stated', phase101.includes('No file write'));
test('No shell command stated', phase101.includes('No shell command'));
test('No persistence stated', phase101.includes('No persistence'));
test('No permission grant stated', phase101.includes('No permission grant'));
test('No capability/token issuance stated', phase101.includes('No capability/token issuance'));
test('No ActionExecutor stated', phase101.includes('No ActionExecutor'));
test('No Command Registry stated', phase101.includes('No Command Registry'));

// 11) template and final declaration
console.log('\n11) Template and final declaration');
test('Charter draft template section present', phase101.includes('Charter Draft Template'));
test('Template includes required declarations', phase101.includes('This charter draft does not approve implementation.'));
test('Final declaration section present', phase101.includes('Final Declaration'));
test('Final declaration confirms no implementation start', phase101.includes('does not approve or start implementation'));

// 12) related docs and implementation-snippet guard
console.log('\n12) Related docs and implementation-snippet guard');
test('Phase 100 doc exists', fs.existsSync(PHASE100_DOC));
test('No ActionExecutor class snippet present', !phase101.includes('class ActionExecutor'));
test('No command registry snippet present', !phase101.includes('registerCommand('));
test('No token issuance snippet present', !phase101.includes('issueToken('));

// summary
console.log('\n==============================================================');
console.log('Phase 101 Smoke Test Results\n');

const passed = results.filter(r => r.passed).length;
const total = results.length;
const failed = total - passed;
const rate = Math.round((passed / total) * 100);

console.log(`Total Tests: ${total}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Success Rate: ${rate}%\n`);

if (failed === 0) {
  console.log('OK PHASE 101 SMOKE TEST PASSED');
  console.log('Phase 101 charter draft is complete and non-implementation boundaries are preserved.');
  process.exit(0);
} else {
  console.log('FAIL PHASE 101 SMOKE TEST FAILED');
  for (const item of results.filter(r => !r.passed)) {
    console.log(`- ${item.testName}`);
    if (item.errorMessage) console.log(`  ${item.errorMessage}`);
  }
  process.exit(1);
}
