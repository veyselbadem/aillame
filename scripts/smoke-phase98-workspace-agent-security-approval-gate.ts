#!/usr/bin/env npx tsx
/**
 * Phase 98 - Workspace Agent Security Approval Gate
 * Smoke validation script (documentation-only gate)
 */

import * as fs from 'fs';

interface ValidationResult {
  testName: string;
  passed: boolean;
  errorMessage?: string;
}

const results: ValidationResult[] = [];
const PHASE98_DOC = 'docs/workspace-agent-security-approval-gate.md';
const PHASE97_DOC = 'docs/workspace-agent-independent-design-review.md';
const PHASE92_DOC = 'docs/workspace-agent-execution-design-track-kickoff.md';
const PHASE93_DOC = 'docs/workspace-agent-sandbox-boundary-design.md';
const PHASE94_DOC = 'docs/workspace-agent-permission-model-design.md';
const PHASE95_DOC = 'docs/workspace-agent-rollback-strategy-design.md';
const PHASE96_DOC = 'docs/workspace-agent-audit-log-contract-design.md';

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

console.log('Phase 98 - Workspace Agent Security Approval Gate Smoke Tests');
console.log('============================================================\n');

const phase98Content = readFile(PHASE98_DOC);

// 1) Existence and header
console.log('1) Document existence and header');
test('Phase 98 document exists', fs.existsSync(PHASE98_DOC));
test('Title present', phase98Content.includes('# Phase 98 - Workspace Agent Security Approval Gate'));
test('Status line present', phase98Content.includes('Security Gate Documentation Only'));
test('Phase marker present', phase98Content.includes('Phase: 98'));

// 2) Scope restrictions
console.log('\n2) Scope restrictions');
test('No implementation approval stated', phase98Content.includes('No Implementation Approval'));
test('No execution authorization stated', phase98Content.includes('No Execution Authorization'));
test('No runtime change stated', phase98Content.includes('No Runtime Change'));
test('No file write restriction stated', phase98Content.includes('No file write'));
test('No shell command restriction stated', phase98Content.includes('No shell command'));
test('No persistence restriction stated', phase98Content.includes('No persistence'));
test('No permission grant restriction stated', phase98Content.includes('No permission grant'));
test('No capability/token issuance restriction stated', phase98Content.includes('No capability/token issuance'));
test('No ActionExecutor restriction stated', phase98Content.includes('No ActionExecutor'));
test('No Command Registry restriction stated', phase98Content.includes('No Command Registry'));

// 3) Baseline integrity
console.log('\n3) Baseline integrity');
test('Baseline section present', phase98Content.includes('Baseline Separation and Integrity Declaration'));
test('Baseline v1.0.0 referenced', phase98Content.includes('Safety Baseline v1.0.0'));
test('Baseline FROZEN stated', phase98Content.includes('FROZEN'));
test('Baseline ARCHIVED stated', phase98Content.includes('ARCHIVED'));
test('Baseline READ-ONLY stated', phase98Content.includes('READ-ONLY'));
test('Baseline untouched stated', phase98Content.includes('UNTOUCHED'));

// 4) Inputs and references
console.log('\n4) Inputs and references');
test('Required inputs section present', phase98Content.includes('Required Inputs for the Security Gate'));
test('Phase 92 input referenced', phase98Content.includes('Phase 92'));
test('Phase 93 input referenced', phase98Content.includes('Phase 93'));
test('Phase 94 input referenced', phase98Content.includes('Phase 94'));
test('Phase 95 input referenced', phase98Content.includes('Phase 95'));
test('Phase 96 input referenced', phase98Content.includes('Phase 96'));
test('Phase 97 input referenced', phase98Content.includes('Phase 97'));
test('Design inputs only policy stated', phase98Content.includes('design inputs only'));

// 5) Phase 97 dependency
console.log('\n5) Phase 97 dependency');
test('Phase 97 reference section present', phase98Content.includes('Reference to Phase 97 Independent Review'));
test('Threat coverage confirmation included', phase98Content.includes('threat coverage confirmed'));
test('Cross-phase consistency mention included', phase98Content.includes('Cross-phase integration consistency confirmed'));
test('Open questions mention included', phase98Content.includes('Open questions documented'));

// 6) Approval criteria
console.log('\n6) Approval criteria');
test('Approval criteria section present', phase98Content.includes('Security Approval Criteria for a Future Prototype Track'));
test('Threat model sufficiency criterion present', phase98Content.includes('Threat Model Sufficiency'));
test('Design coherence criterion present', phase98Content.includes('Design Coherence'));
test('Fail-safe defaults criterion present', phase98Content.includes('Fail-Safe Defaults'));
test('Auditability criterion present', phase98Content.includes('Auditability Requirements'));
test('Rollback safety criterion present', phase98Content.includes('Rollback Safety Expectations'));
test('Governance readiness criterion present', phase98Content.includes('Governance Readiness'));
test('Platform feasibility criterion present', phase98Content.includes('Platform Feasibility Statement'));

// 7) Explicit blockers
console.log('\n7) Explicit blockers');
test('Explicit blockers section present', phase98Content.includes('Explicit Implementation Blockers'));
test('B1 blocker present', phase98Content.includes('B1. Missing Security Sign-Off'));
test('B2 blocker present', phase98Content.includes('B2. Unresolved Critical Threat Coverage Gap'));
test('B3 blocker present', phase98Content.includes('B3. Unresolved Cross-Phase Contract Conflict'));
test('B4 blocker present', phase98Content.includes('B4. Missing Fail-Safe Enforcement Definition'));
test('B5 blocker present', phase98Content.includes('B5. Audit Non-Guarantee'));
test('B6 blocker present', phase98Content.includes('B6. Undefined Governance Ownership'));
test('B7 blocker present', phase98Content.includes('B7. Prototype Scope Overreach'));
test('B8 blocker present', phase98Content.includes('B8. Baseline Integrity Risk'));
test('B9 blocker present', phase98Content.includes('B9. Missing Decision Record Fields'));
test('B10 blocker present', phase98Content.includes('B10. Unresolved High-Severity Risks from Phase 97'));
test('Automatic NO-GO rule present', phase98Content.includes('automatic NO-GO'));

// 8) Go/No-Go decision fields
console.log('\n8) Go/No-Go decision fields');
test('Go/no-go fields section present', phase98Content.includes('Mandatory Go/No-Go Decision Record Fields'));
test('Decision metadata fields included', phase98Content.includes('Decision Metadata'));
test('Authority fields included', phase98Content.includes('Authority and Accountability'));
test('Input coverage fields included', phase98Content.includes('Input Coverage Confirmation'));
test('Risk disposition fields included', phase98Content.includes('Risk and Assumption Disposition'));
test('Blocker evaluation fields included', phase98Content.includes('Blocker Evaluation'));
test('Decision output fields included', phase98Content.includes('Decision Output'));
test('Sign-off fields included', phase98Content.includes('Sign-Off'));

// 9) Required control statements
console.log('\n9) Required control statements');
test('Required control statements block present', phase98Content.includes('Control Statements (Required Verbatim)'));
test('Control statement: no implementation approval', phase98Content.includes('This decision does not approve implementation.'));
test('Control statement: no execution pathways', phase98Content.includes('This decision does not enable execution pathways.'));
test('Control statement: no permissions/tokens/capabilities', phase98Content.includes('This decision does not grant permissions, tokens, or capabilities.'));
test('Control statement: baseline untouched', phase98Content.includes('Safety Baseline v1.0.0 remains archived and untouched.'));

// 10) Outcome semantics
console.log('\n10) Outcome semantics');
test('Gate outcomes section present', phase98Content.includes('Gate Outcomes and Their Meaning'));
test('GO meaning documented', phase98Content.includes('GO means'));
test('NO-GO meaning documented', phase98Content.includes('NO-GO means'));
test('GO does not authorize implementation explicitly stated', phase98Content.includes('No direct implementation authorization is granted'));

// 11) Prototype preconditions
console.log('\n11) Prototype preconditions');
test('Prototype preconditions section present', phase98Content.includes('Prototype Track Preconditions'));
test('Prototype charter precondition present', phase98Content.includes('Explicit prototype charter exists'));
test('Production execution exclusion present', phase98Content.includes('excludes production execution enablement'));
test('Revocable boundaries precondition present', phase98Content.includes('time-bounded and revocable'));

// 12) Non-approval declarations
console.log('\n12) Non-approval declarations');
test('Non-approval section present', phase98Content.includes('Non-Approval Declarations'));
test('No runtime integration approval stated', phase98Content.includes('No runtime integration approval'));
test('No ActionExecutor approval stated', phase98Content.includes('No ActionExecutor approval'));
test('No Command Registry approval stated', phase98Content.includes('No Command Registry approval'));

// 13) Checklist and status model
console.log('\n13) Checklist and status model');
test('Checklist section present', phase98Content.includes('Verification Checklist for Gate Completeness'));
test('Status model section present', phase98Content.includes('Phase 98 Status Model'));
test('Draft status defined', phase98Content.includes('Draft:'));
test('Review Ready status defined', phase98Content.includes('Review Ready:'));
test('Decision Ready status defined', phase98Content.includes('Decision Ready:'));
test('Closed status defined', phase98Content.includes('Closed:'));

// 14) Decision template completeness
console.log('\n14) Decision template completeness');
test('Decision template section present', phase98Content.includes('Gate Decision Template'));
test('Template has Decision ID', phase98Content.includes('Decision ID:'));
test('Template has Decision Type', phase98Content.includes('Decision Type: [GO/NO-GO]'));
test('Template has blockers map B1-B10', phase98Content.includes('B10: [pass/fail] - rationale'));
test('Template has signatures', phase98Content.includes('Signatures:'));

// 15) Final declaration
console.log('\n15) Final declaration and summary');
test('Final declaration section present', phase98Content.includes('Final Declaration'));
test('Final declaration repeats non-approval', phase98Content.includes('does not approve implementation'));
test('Turkish summary present', phase98Content.includes('Turkce Ozet'));

// 16) Related docs must exist
console.log('\n16) Related documents existence');
test('Phase 97 doc exists', fs.existsSync(PHASE97_DOC));
test('Phase 92 doc exists', fs.existsSync(PHASE92_DOC));
test('Phase 93 doc exists', fs.existsSync(PHASE93_DOC));
test('Phase 94 doc exists', fs.existsSync(PHASE94_DOC));
test('Phase 95 doc exists', fs.existsSync(PHASE95_DOC));
test('Phase 96 doc exists', fs.existsSync(PHASE96_DOC));

// 17) Design-only constraints sanity checks
console.log('\n17) Design-only constraints sanity checks');
test('No implementation code snippets (executor) present', !phase98Content.includes('class ActionExecutor'));
test('No command registry implementation snippet present', !phase98Content.includes('registerCommand('));
test('No permission issuance snippet present', !phase98Content.includes('issueToken('));
test('No runtime hook snippet present', !phase98Content.includes('onOperationStart('));

// Summary
console.log('\n============================================================');
console.log('Phase 98 Smoke Test Results\n');

const passed = results.filter(r => r.passed).length;
const total = results.length;
const failed = total - passed;
const rate = Math.round((passed / total) * 100);

console.log(`Total Tests: ${total}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Success Rate: ${rate}%\n`);

if (failed === 0) {
  console.log('OK PHASE 98 SMOKE TEST PASSED');
  console.log('Phase 98 gate document is complete and design-only constraints are preserved.');
  process.exit(0);
} else {
  console.log('FAIL PHASE 98 SMOKE TEST FAILED');
  const failedItems = results.filter(r => !r.passed);
  for (const item of failedItems) {
    console.log(`- ${item.testName}`);
    if (item.errorMessage) console.log(`  ${item.errorMessage}`);
  }
  process.exit(1);
}
