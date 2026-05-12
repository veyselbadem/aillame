#!/usr/bin/env npx tsx
/**
 * Phase 118 - Workspace Agent Prototype Specification Archive
 * Smoke validation script (documentation-only)
 */

import * as fs from 'fs';

interface ValidationResult {
  testName: string;
  passed: boolean;
  errorMessage?: string;
}

const results: ValidationResult[] = [];
const PHASE118_DOC = 'docs/workspace-agent-prototype-specification-archive.md';
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

console.log('Phase 118 - Workspace Agent Prototype Specification Archive Smoke Tests');
console.log('========================================================================\n');

const phase118 = fs.readFileSync(PHASE118_DOC, 'utf-8');

console.log('1) Existence and status');
test('Phase 118 document exists', fs.existsSync(PHASE118_DOC));
test('Title present', phase118.includes('# Phase 118 - Workspace Agent Prototype Specification Archive'));
test('Prototype Specification Archive / No Implementation status present', phase118.includes('Prototype Specification Archive / No Implementation'));

console.log('\n2) References present');
test('Implementation Readiness Track referenced', phase118.includes('Workspace Agent Prototype Implementation Readiness Track'));
test('Phase 112 Readiness Gate referenced', phase118.includes('Phase 112 [Implementation Readiness Gate]'));
test('Phase 113 Specification Draft referenced', phase118.includes('Phase 113 [Prototype Specification Draft]'));
test('Phase 114 Review Checklist referenced', phase118.includes('Phase 114 [Prototype Specification Review Checklist]'));
test('Phase 115 Review Decision referenced', phase118.includes('Phase 115 [Prototype Specification Review Decision]'));
test('Phase 116 Conditional Resolution Plan referenced', phase118.includes('Phase 116 [Prototype Specification Conditional Resolution Plan]'));
test('Phase 117 Final Readiness Summary referenced', phase118.includes('Phase 117 [Prototype Specification Final Readiness Summary]'));
test('Planning line tag present', phase118.includes(PLANNING_TAG));
test('Safety baseline tag present', phase118.includes(SAFETY_TAG));

console.log('\n3) Archive sections');
test('Archive status section present', phase118.includes('## 4. Archive Status'));
test('Archive status value present', phase118.includes('Archived as specification documentation only'));
test('Canonical reading order section present', phase118.includes('## 5. Canonical Reading Order'));
test('Archive summary (Phases 113–117) section present', phase118.includes('## 3. Archive Summary (Phases 113–117)'));

console.log('\n4) Boundary checks');
test('Implementation non-approval stated', phase118.includes('does not approve implementation'));
test('Prototype non-start stated', phase118.includes('does not start prototype'));
test('Execution non-enable stated', phase118.includes('does not enable execution'));
test('No file write stated', phase118.includes('No file write'));
test('No shell command stated', phase118.includes('No shell command'));
test('No persistence stated', phase118.includes('No persistence'));
test('No permission grant stated', phase118.includes('No permission grant'));
test('No capability/token issuance stated', phase118.includes('No capability/token issuance'));
test('No ActionExecutor stated', phase118.includes('No ActionExecutor'));
test('No Command Registry stated', phase118.includes('No Command Registry'));

console.log('\n5) Safety baseline and Planning Line preservation');
test('Safety baseline archived/frozen/untouched stated', phase118.includes('Safety Baseline v1.0.0 remains archived, frozen, read-only, sealed, untouched, not reopened, not weakened'));
test('Planning line archived/release-tagged/untouched stated', phase118.includes('Prototype Planning Line v1.0.0-no-implementation remains archived, release-tagged, indexed, untouched'));

console.log('\n6) Required sentence and final result');
test(
  'Required key sentence present',
  phase118.includes('Phase 118 archives the prototype specification line as documentation only and does not approve implementation, start a prototype, enable execution, write files, persist records, grant permissions, issue capabilities, create ActionExecutor behavior, or register commands.'),
);
test('Known issues section present', phase118.includes('Known Issues'));
test('Known issues none stated', phase118.includes('Known issues: none.'));
test('Final result phrase present', phase118.includes('prototype specification archive complete as documentation only'));

console.log('\n7) No implementation snippets in doc');
test('No ActionExecutor class snippet present', !phase118.includes('class ActionExecutor'));
test('No Command Registry implementation snippet present', !phase118.includes('registerCommand('));
test('No token issuance code snippet present', !phase118.includes('issueToken('));

console.log('\n========================================================================');
console.log('Phase 118 Smoke Test Results\n');

const passed = results.filter(r => r.passed).length;
const total = results.length;
const failed = total - passed;
const remaining = 0;

console.log(`Total Tests: ${total}`);
console.log(`Passed: ${passed}`);
console.log(`Remaining: ${remaining}`);

if (failed === 0) {
  console.log('\nOK PHASE 118 SMOKE TEST PASSED');
  process.exit(0);
} else {
  console.log('\nFAIL PHASE 118 SMOKE TEST FAILED');
  for (const item of results.filter(r => !r.passed)) {
    console.log(`- ${item.testName}`);
    if (item.errorMessage) console.log(`  ${item.errorMessage}`);
  }
  process.exit(1);
}
