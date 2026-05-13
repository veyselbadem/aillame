#!/usr/bin/env npx tsx
/**
 * Phase 99 - Workspace Agent Prototype Track Preparation
 * Smoke validation script (planning-only)
 */

import * as fs from 'fs';

interface ValidationResult {
  testName: string;
  passed: boolean;
  errorMessage?: string;
}

const results: ValidationResult[] = [];
const PHASE99_DOC = 'docs/workspace-agent-prototype-track-preparation.md';
const PHASE98_DOC = 'docs/workspace-agent-security-approval-gate.md';

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

console.log('Phase 99 - Workspace Agent Prototype Track Preparation Smoke Tests');
console.log('==================================================================\n');

const phase99 = readFile(PHASE99_DOC);

// 1) existence and status
console.log('1) Existence and status');
test('Phase 99 document exists', fs.existsSync(PHASE99_DOC));
test('Title present', phase99.includes('# Phase 99 - Workspace Agent Prototype Track Preparation'));
test('Planning-only status present', phase99.includes('Planning Documentation Only'));
test('No prototype implementation status present', phase99.includes('No Prototype Implementation'));

// 2) phase 98 reference
console.log('\n2) Phase 98 reference');
test('Phase 98 dependency section present', phase99.includes('Dependency on Phase 98 Security Approval Gate'));
test('Phase 98 explicitly referenced', phase99.includes('Phase 98'));
test('No overrule statement present', phase99.includes('does not overrule Phase 98 decision authority'));

// 3) required charter contents
console.log('\n3) Required prototype charter contents');
test('Charter section present', phase99.includes('Required Prototype Charter Contents'));
test('Charter identity required', phase99.includes('Charter Identity'));
test('Scope boundaries required', phase99.includes('Scope Boundaries'));
test('Threat and risk traceability required', phase99.includes('Threat and Risk Traceability'));
test('Control mapping required', phase99.includes('Control Mapping'));
test('Governance and accountability required', phase99.includes('Governance and Accountability'));
test('Exit and termination conditions required', phase99.includes('Exit and Termination Conditions'));
test('Evidence requirements required', phase99.includes('Evidence Requirements'));

// 4) minimum controls
console.log('\n4) Minimum prototype safety controls');
test('Minimum controls section present', phase99.includes('Minimum Prototype Safety Controls'));
test('C1 default deny present', phase99.includes('C1. Default-Deny Control'));
test('C2 least privilege present', phase99.includes('C2. Least-Privilege Planning Control'));
test('C3 bounded scope present', phase99.includes('C3. Bounded Scope Control'));
test('C4 no execution by default present', phase99.includes('C4. No-Execution-By-Default Control'));
test('C5 audit-first present', phase99.includes('C5. Audit-First Control'));
test('C6 rollback-first present', phase99.includes('C6. Rollback-First Control'));
test('C7 safety review present', phase99.includes('C7. Safety Review Control'));
test('C8 baseline integrity present', phase99.includes('C8. Baseline Integrity Control'));

// 5) required gates
console.log('\n5) Required gates');
test('Required gates section present', phase99.includes('Required Gates for Any Future Prototype Plan'));
test('Kill-switch gate present', phase99.includes('G1. Kill-Switch Gate'));
test('Rollback gate present', phase99.includes('G2. Rollback Gate'));
test('Audit gate present', phase99.includes('G3. Audit Gate'));
test('Permission gate present', phase99.includes('G4. Permission Gate'));
test('Sandbox gate present', phase99.includes('G5. Sandbox Gate'));
test('Diff-preview gate present', phase99.includes('G6. Diff-Preview Gate'));
test('Gate policy planning-only stated', phase99.includes('planning requirements only'));

// 6) explicit non-goals
console.log('\n6) Explicit non-goals');
test('Non-goals section present', phase99.includes('Phase 99 Explicit Non-Goals'));
test('No implementation non-goal present', phase99.includes('Implement prototype code'));
test('No execution non-goal present', phase99.includes('Start prototype execution'));
test('No ActionExecutor non-goal present', phase99.includes('Introduce ActionExecutor'));
test('No Command Registry non-goal present', phase99.includes('Introduce Command Registry'));

// 7) no-approval and no-start declarations
console.log('\n7) No-approval / no-start declarations');
test('No-approval section present', phase99.includes('No-Approval and No-Start Declaration'));
test('No implementation approval declaration present', phase99.includes('does not approve prototype implementation'));
test('No implementation start declaration present', phase99.includes('does not start prototype implementation'));
test('No execution pathway declaration present', phase99.includes('does not authorize execution pathway activation'));

// 8) baseline integrity
console.log('\n8) Baseline integrity');
test('Baseline reconfirmation section present', phase99.includes('Safety Baseline v1.0.0 Integrity Reconfirmation'));
test('Baseline frozen stated', phase99.includes('frozen'));
test('Baseline read-only stated', phase99.includes('read-only'));
test('Baseline archived stated', phase99.includes('archived'));
test('Baseline sealed stated', phase99.includes('sealed'));
test('Baseline untouched stated', phase99.includes('untouched'));
test('Baseline not reopened stated', phase99.includes('not reopened'));
test('Baseline not weakened stated', phase99.includes('not weakened'));

// 9) planning checklist and decision fields
console.log('\n9) Checklist and planning record fields');
test('Planning readiness checklist present', phase99.includes('Prototype Planning Readiness Checklist'));
test('Decision record fields section present', phase99.includes('Phase 99 Decision Record Fields'));
test('Planning status field present', phase99.includes('Final planning status'));
test('Required control statements listed', phase99.includes('This record does not approve implementation.'));

// 10) phase boundaries
console.log('\n10) Scope boundaries and prohibitions');
test('No runtime behavior changes restriction stated', phase99.includes('No runtime behavior changes'));
test('No execution pathway restriction stated', phase99.includes('No execution pathway enablement'));
test('No file write restriction stated', phase99.includes('No file write'));
test('No shell command restriction stated', phase99.includes('No shell command'));
test('No persistence restriction stated', phase99.includes('No persistence'));
test('No permission grant restriction stated', phase99.includes('No permission grant'));
test('No capability/token issuance restriction stated', phase99.includes('No capability/token issuance'));

// 11) related document exists
console.log('\n11) Related document existence');
test('Phase 98 document exists', fs.existsSync(PHASE98_DOC));

// 12) guard against implementation snippets
console.log('\n12) Guard against implementation snippets');
test('No ActionExecutor class code snippet present', !phase99.includes('class ActionExecutor'));
test('No command registry code snippet present', !phase99.includes('registerCommand('));
test('No token issuance snippet present', !phase99.includes('issueToken('));

// Summary
console.log('\n==================================================================');
console.log('Phase 99 Smoke Test Results\n');

const passed = results.filter(r => r.passed).length;
const total = results.length;
const failed = total - passed;
const rate = Math.round((passed / total) * 100);

console.log(`Total Tests: ${total}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Success Rate: ${rate}%\n`);

if (failed === 0) {
  console.log('OK PHASE 99 SMOKE TEST PASSED');
  console.log('Phase 99 planning document is complete and non-implementation boundaries are preserved.');
  process.exit(0);
} else {
  console.log('FAIL PHASE 99 SMOKE TEST FAILED');
  for (const item of results.filter(r => !r.passed)) {
    console.log(`- ${item.testName}`);
    if (item.errorMessage) console.log(`  ${item.errorMessage}`);
  }
  process.exit(1);
}
