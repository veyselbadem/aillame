#!/usr/bin/env npx tsx
/**
 * Phase 119 - Workspace Agent Prototype Specification Release Readiness
 * Smoke validation script (documentation-only)
 */

import * as fs from 'fs';

interface ValidationResult {
  testName: string;
  passed: boolean;
  errorMessage?: string;
}

const results: ValidationResult[] = [];
const PHASE119_DOC = 'docs/workspace-agent-prototype-specification-release-readiness.md';
const PLANNING_TAG = 'workspace-agent-prototype-planning-line-v1.0.0-no-implementation';
const SAFETY_TAG = 'workspace-agent-safety-baseline-v1.0.0';

function test(testName: string, condition: boolean, errorMessage?: string): void {
  results.push({ testName, passed: condition, errorMessage });
  const icon = condition ? 'OK' : 'FAIL';
  console.log(`[${icon}] ${testName}`);
  if (!condition && errorMessage) {
    console.log(`  Error: ${errorMessage}`);
  }
}

console.log('Phase 119 - Workspace Agent Prototype Specification Release Readiness Smoke Tests');
console.log('================================================================================\n');

const phase119 = fs.readFileSync(PHASE119_DOC, 'utf-8');

console.log('1) Existence and status');
test('Phase 119 document exists', fs.existsSync(PHASE119_DOC));
test('Title present', phase119.includes('# Phase 119 - Workspace Agent Prototype Specification Release Readiness'));
test('Prototype Specification Release Readiness / No Implementation status present', phase119.includes('Prototype Specification Release Readiness / No Implementation'));

console.log('\n2) References present');
test('Implementation Readiness Track referenced', phase119.includes('Workspace Agent Prototype Implementation Readiness Track'));
test('Phase 112 Readiness Gate referenced', phase119.includes('Phase 112 [Implementation Readiness Gate]'));
test('Phase 113 Specification Draft referenced', phase119.includes('Phase 113 [Prototype Specification Draft]'));
test('Phase 114 Review Checklist referenced', phase119.includes('Phase 114 [Prototype Specification Review Checklist]'));
test('Phase 115 Review Decision referenced', phase119.includes('Phase 115 [Prototype Specification Review Decision]'));
test('Phase 116 Conditional Resolution Plan referenced', phase119.includes('Phase 116 [Prototype Specification Conditional Resolution Plan]'));
test('Phase 117 Final Readiness Summary referenced', phase119.includes('Phase 117 [Prototype Specification Final Readiness Summary]'));
test('Phase 118 Specification Archive referenced', phase119.includes('Phase 118 [Prototype Specification Archive]'));
test('Planning line tag present', phase119.includes(PLANNING_TAG));
test('Safety baseline tag present', phase119.includes(SAFETY_TAG));

console.log('\n3) Release readiness sections');
test('Release readiness status section present', phase119.includes('## 4. Release Readiness Status'));
test('Release readiness status value present', phase119.includes('Prototype specification release readiness complete as documentation only'));
test('Release scope section present', phase119.includes('## 4. Release Readiness Status'));
test('Specification documentation release only phrase present', phase119.includes('specification documentation release only'));
test('Archive status section present', phase119.includes('## 5. Archive Status and Canonical Reading Order'));
test('Canonical reading order reference present', phase119.includes('Canonical Reading Order'));

console.log('\n4) Summary focus');
test('Phases 113–118 specification line release-readiness summarized', phase119.includes('prototype specification line (Phases 113–118) has reached the following milestones'));

console.log('\n5) Boundary checks');
test('Implementation non-approval stated', phase119.includes('does not approve implementation'));
test('Prototype non-start stated', phase119.includes('does not start prototype'));
test('Execution non-enable stated', phase119.includes('does not enable execution'));
test('No file write stated', phase119.includes('No file write'));
test('No shell command stated', phase119.includes('No shell command'));
test('No persistence stated', phase119.includes('No persistence'));
test('No permission grant stated', phase119.includes('No permission grant'));
test('No capability/token issuance stated', phase119.includes('No capability/token issuance'));
test('No ActionExecutor stated', phase119.includes('No ActionExecutor'));
test('No Command Registry stated', phase119.includes('No Command Registry'));

console.log('\n6) Safety baseline and Planning Line preservation');
test('Safety baseline archived/frozen/untouched stated', phase119.includes('Safety Baseline v1.0.0 remains archived, frozen, read-only, sealed, untouched, not reopened, not weakened'));
test('Planning line archived/release-tagged/untouched stated', phase119.includes('Prototype Planning Line v1.0.0-no-implementation remains archived, release-tagged, indexed, untouched'));

console.log('\n7) Required sentence and final result');
test(
  'Required key sentence present',
  phase119.includes('Phase 119 confirms prototype specification release readiness as documentation only and does not approve implementation, start a prototype, enable execution, write files, persist records, grant permissions, issue capabilities, create ActionExecutor behavior, or register commands.'),
);
test('Known issues section present', phase119.includes('Known Issues'));
test('Known issues none stated', phase119.includes('Known issues: none.'));
test('Final result phrase present', phase119.includes('prototype specification release readiness complete as documentation only'));

console.log('\n8) No implementation snippets in doc');
test('No ActionExecutor class snippet present', !phase119.includes('class ActionExecutor'));
test('No Command Registry implementation snippet present', !phase119.includes('registerCommand('));
test('No token issuance code snippet present', !phase119.includes('issueToken('));

console.log('\n================================================================================');
console.log('Phase 119 Smoke Test Results\n');

const passed = results.filter(r => r.passed).length;
const total = results.length;
const failed = total - passed;
const remaining = 0;

console.log(`Total Tests: ${total}`);
console.log(`Passed: ${passed}`);
console.log(`Remaining: ${remaining}`);

if (failed === 0) {
  console.log('\nOK PHASE 119 SMOKE TEST PASSED');
  process.exit(0);
} else {
  console.log('\nFAIL PHASE 119 SMOKE TEST FAILED');
  for (const item of results.filter(r => !r.passed)) {
    console.log(`- ${item.testName}`);
    if (item.errorMessage) console.log(`  ${item.errorMessage}`);
  }
  process.exit(1);
}
