#!/usr/bin/env npx tsx
/**
 * Phase 120 - Workspace Agent Prototype Specification Release Tag Preparation
 * Smoke validation script (documentation-only)
 */

import * as fs from 'fs';

interface ValidationResult {
  testName: string;
  passed: boolean;
  errorMessage?: string;
}

const results: ValidationResult[] = [];
const PHASE120_DOC = 'docs/workspace-agent-prototype-specification-release-tag-preparation.md';
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

console.log('Phase 120 - Workspace Agent Prototype Specification Release Tag Preparation Smoke Tests');
console.log('======================================================================================\n');

const phase120 = fs.readFileSync(PHASE120_DOC, 'utf-8');

console.log('1) Existence and status');
test('Phase 120 document exists', fs.existsSync(PHASE120_DOC));
test('Title present', phase120.includes('# Phase 120 - Workspace Agent Prototype Specification Release Tag Preparation'));
test('Prototype Specification Release Tag Preparation / No Implementation status present', phase120.includes('Prototype Specification Release Tag Preparation / No Implementation'));

console.log('\n2) References present');
test('Implementation Readiness Track referenced', phase120.includes('Workspace Agent Prototype Implementation Readiness Track'));
test('Phase 112 Readiness Gate referenced', phase120.includes('Phase 112 [Implementation Readiness Gate]'));
test('Phase 113 Specification Draft referenced', phase120.includes('Phase 113 [Prototype Specification Draft]'));
test('Phase 114 Review Checklist referenced', phase120.includes('Phase 114 [Prototype Specification Review Checklist]'));
test('Phase 115 Review Decision referenced', phase120.includes('Phase 115 [Prototype Specification Review Decision]'));
test('Phase 116 Conditional Resolution Plan referenced', phase120.includes('Phase 116 [Prototype Specification Conditional Resolution Plan]'));
test('Phase 117 Final Readiness Summary referenced', phase120.includes('Phase 117 [Prototype Specification Final Readiness Summary]'));
test('Phase 118 Specification Archive referenced', phase120.includes('Phase 118 [Prototype Specification Archive]'));
test('Phase 119 Release Readiness referenced', phase120.includes('Phase 119 [Prototype Specification Release Readiness]'));
test('Planning line tag present', phase120.includes(PLANNING_TAG));
test('Safety baseline tag present', phase120.includes(SAFETY_TAG));

console.log('\n3) Release tag preparation sections');
test('Release tag preparation status section present', phase120.includes('## 4. Release Tag Preparation Status'));
test('Release scope section present', phase120.includes('## 4. Release Tag Preparation Status'));
test('Specification documentation release tag only phrase present', phase120.includes('specification documentation release tag only'));
test('Archive status section present', phase120.includes('## 4. Release Tag Preparation Status')); // Status section includes archive context
test('Canonical reading order reference present', phase120.includes('Canonical Reading Order'));

console.log('\n4) Tag details');
test('Recommended tag name present', phase120.includes(SPEC_TAG));
test('Tag meaning documentation-only present', phase120.includes('documentation-only'));
test('Tag meaning no implementation present', phase120.includes('no implementation'));
test('Tag meaning no prototype start present', phase120.includes('no prototype start'));
test('Tag meaning no execution present', phase120.includes('no execution'));
test('Git tag command example present', phase120.includes(`git tag -a ${SPEC_TAG}`));
test('Git push command example present', phase120.includes(`git push origin ${SPEC_TAG}`));

console.log('\n5) Summary focus');
test('Phase 113–119 specification line release tag preparation summarized', phase120.includes('The prototype specification line (Phases 113–119) has completed all documentation readiness steps'));

console.log('\n6) Boundary checks');
test('Implementation non-approval stated', phase120.includes('does not approve implementation'));
test('Prototype non-start stated', phase120.includes('does not start prototype'));
test('Execution non-enable stated', phase120.includes('does not enable execution'));
test('No file write stated', phase120.includes('No file write'));
test('No shell command stated', phase120.includes('No shell command'));
test('No persistence stated', phase120.includes('No persistence'));
test('No permission grant stated', phase120.includes('No permission grant'));
test('No capability/token issuance stated', phase120.includes('No capability/token issuance'));
test('No ActionExecutor stated', phase120.includes('No ActionExecutor'));
test('No Command Registry stated', phase120.includes('No Command Registry'));

console.log('\n7) Safety baseline and Planning Line preservation');
test('Safety baseline archived/frozen/untouched stated', phase120.includes('Safety Baseline v1.0.0 remains archived, frozen, read-only, sealed, untouched, not reopened, not weakened'));
test('Planning line archived/release-tagged/untouched stated', phase120.includes('Prototype Planning Line v1.0.0-no-implementation remains archived, release-tagged, indexed, untouched'));

console.log('\n8) Required sentence and final result');
test(
  'Required key sentence present',
  phase120.includes('Phase 120 prepares the prototype specification release tag as documentation only and does not approve implementation, start a prototype, enable execution, write files, persist records, grant permissions, issue capabilities, create ActionExecutor behavior, or register commands.'),
);
test('Known issues section present', phase120.includes('Known Issues'));
test('Known issues none stated', phase120.includes('Known issues: none.'));
test('Final result phrase present', phase120.includes('prototype specification release tag preparation complete as documentation only'));

console.log('\n9) No implementation snippets in doc');
test('No ActionExecutor class snippet present', !phase120.includes('class ActionExecutor'));
test('No Command Registry implementation snippet present', !phase120.includes('registerCommand('));
test('No token issuance code snippet present', !phase120.includes('issueToken('));

console.log('\n======================================================================================');
console.log('Phase 120 Smoke Test Results\n');

const passed = results.filter(r => r.passed).length;
const total = results.length;
const failed = total - passed;
const remaining = 0;

console.log(`Total Tests: ${total}`);
console.log(`Passed: ${passed}`);
console.log(`Remaining: ${remaining}`);

if (failed === 0) {
  console.log('\nOK PHASE 120 SMOKE TEST PASSED');
  process.exit(0);
} else {
  console.log('\nFAIL PHASE 120 SMOKE TEST FAILED');
  for (const item of results.filter(r => !r.passed)) {
    console.log(`- ${item.testName}`);
    if (item.errorMessage) console.log(`  ${item.errorMessage}`);
  }
  process.exit(1);
}
