#!/usr/bin/env npx tsx
/**
 * Phase 104 - Workspace Agent Prototype Charter Conditional Resolution Plan
 * Smoke validation script (documentation-only)
 */

import * as fs from 'fs';

interface ValidationResult {
  testName: string;
  passed: boolean;
  errorMessage?: string;
}

const results: ValidationResult[] = [];
const PHASE104_DOC = 'docs/workspace-agent-prototype-charter-conditional-resolution-plan.md';
const PHASE103_DOC = 'docs/workspace-agent-prototype-charter-review-decision.md';
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

console.log('Phase 104 - Workspace Agent Prototype Charter Conditional Resolution Plan Smoke Tests');
console.log('===============================================================================\n');

const phase104 = readFile(PHASE104_DOC);

console.log('1) Existence and status');
test('Phase 104 document exists', fs.existsSync(PHASE104_DOC));
test('Title present', phase104.includes('# Phase 104 - Workspace Agent Prototype Charter Conditional Resolution Plan'));
test('Documentation-only status present', phase104.includes('Documentation-Only'));

console.log('\n2) Required references');
test('Required references section present', phase104.includes('Required References'));
test('Phase 103 reference present', phase104.includes('Phase 103 prototype charter review decision'));
test('Phase 102 reference present', phase104.includes('Phase 102 prototype charter review checklist'));
test('Reference rule present', phase104.includes('Missing either reference blocks plan acceptance'));

console.log('\n3) Condition categories');
test('Condition categories section present', phase104.includes('Condition Categories'));
test('CC1 present', phase104.includes('CC1. Charter Completeness Conditions'));
test('CC2 present', phase104.includes('CC2. Scope Boundary Conditions'));
test('CC3 present', phase104.includes('CC3. Safety Control Conditions'));
test('CC4 present', phase104.includes('CC4. Governance Readiness Conditions'));
test('CC5 present', phase104.includes('CC5. Exit Criteria Conditions'));
test('CC6 present', phase104.includes('CC6. Baseline Integrity Conditions'));

console.log('\n4) Blocker severity levels');
test('Severity section present', phase104.includes('Blocker Severity Levels'));
test('S1 critical present', phase104.includes('S1. Critical'));
test('S2 high present', phase104.includes('S2. High'));
test('S3 medium present', phase104.includes('S3. Medium'));
test('S4 low present', phase104.includes('S4. Low'));
test('Escalation rule present', phase104.includes('Escalation rule'));

console.log('\n5) Required evidence');
test('Evidence section present', phase104.includes('Required Evidence for Resolving Conditions'));
test('E1 present', phase104.includes('E1. Resolution statement'));
test('E2 present', phase104.includes('E2. Traceability link'));
test('E3 present', phase104.includes('E3. Owner attestation'));
test('E4 present', phase104.includes('E4. Reviewer verification'));
test('E5 present', phase104.includes('E5. Boundary confirmation'));
test('E6 present', phase104.includes('E6. Baseline confirmation'));

console.log('\n6) Re-review requirements');
test('Re-review section present', phase104.includes('Re-Review Requirements'));
test('Re-review triggers listed', phase104.includes('Re-review is mandatory when'));
test('Re-review packet listed', phase104.includes('Re-review packet must include'));
test('Re-review outcome rule present', phase104.includes('Re-review outcome rule'));

console.log('\n7) Unresolved-condition handling');
test('Unresolved-condition section present', phase104.includes('Unresolved-Condition Handling'));
test('Rule U1 present', phase104.includes('Rule U1'));
test('Rule U2 present', phase104.includes('Rule U2'));
test('Rule U3 present', phase104.includes('Rule U3'));
test('Rule U4 present', phase104.includes('Rule U4'));
test('Rule U5 present', phase104.includes('Rule U5'));

console.log('\n8) Non-implementation boundary');
test('Boundary confirmation section present', phase104.includes('Non-Implementation Boundary Confirmation'));
test('Resolving conditions does not approve implementation', phase104.includes('does not\n- approve implementation') || phase104.includes('does not approve implementation'));
test('Resolving conditions does not start prototype', phase104.includes('does not\n- start prototype') || phase104.includes('does not start prototype'));
test('Resolving conditions does not enable execution pathways', phase104.includes('does not\n- enable execution pathways') || phase104.includes('does not enable execution pathways'));

console.log('\n9) Baseline integrity');
test('Baseline section present', phase104.includes('Safety Baseline v1.0.0 Reconfirmation'));
test('Baseline frozen stated', phase104.includes('frozen'));
test('Baseline read-only stated', phase104.includes('read-only'));
test('Baseline archived stated', phase104.includes('archived'));
test('Baseline sealed stated', phase104.includes('sealed'));
test('Baseline untouched stated', phase104.includes('untouched'));

console.log('\n10) Scope restrictions');
test('No prototype implementation stated', phase104.includes('No prototype implementation'));
test('No runtime behavior changes stated', phase104.includes('No runtime behavior changes'));
test('No execution pathway stated', phase104.includes('No execution pathway'));
test('No file write stated', phase104.includes('No file write'));
test('No shell command stated', phase104.includes('No shell command'));
test('No persistence stated', phase104.includes('No persistence'));
test('No permission grant stated', phase104.includes('No permission grant'));
test('No capability/token issuance stated', phase104.includes('No capability/token issuance'));
test('No ActionExecutor stated', phase104.includes('No ActionExecutor'));
test('No Command Registry stated', phase104.includes('No Command Registry'));

console.log('\n11) Template and final declaration');
test('Template section present', phase104.includes('Resolution Plan Template'));
test('Template includes E1-E6 fields', phase104.includes('Evidence Package (E1-E6)'));
test('Template includes required statements', phase104.includes('Resolving conditions does not approve implementation.'));
test('Final declaration present', phase104.includes('Final Declaration'));

console.log('\n12) Related docs and implementation guard');
test('Phase 103 document exists', fs.existsSync(PHASE103_DOC));
test('Phase 102 document exists', fs.existsSync(PHASE102_DOC));
test('No ActionExecutor class snippet present', !phase104.includes('class ActionExecutor'));
test('No command registry snippet present', !phase104.includes('registerCommand('));
test('No token issuance snippet present', !phase104.includes('issueToken('));

console.log('\n===============================================================================');
console.log('Phase 104 Smoke Test Results\n');

const passed = results.filter(r => r.passed).length;
const total = results.length;
const failed = total - passed;
const rate = Math.round((passed / total) * 100);

console.log(`Total Tests: ${total}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Success Rate: ${rate}%\n`);

if (failed === 0) {
  console.log('OK PHASE 104 SMOKE TEST PASSED');
  console.log('Phase 104 conditional resolution plan documentation is complete and non-implementation boundaries are preserved.');
  process.exit(0);
} else {
  console.log('FAIL PHASE 104 SMOKE TEST FAILED');
  for (const item of results.filter(r => !r.passed)) {
    console.log(`- ${item.testName}`);
    if (item.errorMessage) console.log(`  ${item.errorMessage}`);
  }
  process.exit(1);
}
