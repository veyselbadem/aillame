#!/usr/bin/env npx tsx
/**
 * Phase 123 - Workspace Agent Prototype Specification Final Archive Index
 * Smoke validation script (documentation-only)
 */

import * as fs from 'fs';

interface ValidationResult {
  testName: string;
  passed: boolean;
  errorMessage?: string;
}

const results: ValidationResult[] = [];
const PHASE123_DOC = 'docs/workspace-agent-prototype-specification-final-archive-index.md';
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

console.log('Phase 123 - Workspace Agent Prototype Specification Final Archive Index Smoke Tests');
console.log('==================================================================================\n');

const phase123 = fs.readFileSync(PHASE123_DOC, 'utf-8');

console.log('1) Existence and status');
test('Phase 123 document exists', fs.existsSync(PHASE123_DOC));
test('Title present', phase123.includes('# Phase 123 - Workspace Agent Prototype Specification Final Archive Index'));
test('Prototype Specification Final Archive Index / No Implementation status present', phase123.includes('Prototype Specification Final Archive Index / No Implementation'));

console.log('\n2) References present');
test('Implementation Readiness Track referenced', phase123.includes('Workspace Agent Prototype Implementation Readiness Track'));
test('Phase 112 Readiness Gate referenced', phase123.includes('Phase 112 [Implementation Readiness Gate]'));
test('Phase 113 referenced', phase123.includes('Phase 113 [Prototype Specification Draft]'));
test('Phase 114 referenced', phase123.includes('Phase 114 [Prototype Specification Review Checklist]'));
test('Phase 115 referenced', phase123.includes('Phase 115 [Prototype Specification Review Decision]'));
test('Phase 116 referenced', phase123.includes('Phase 116 [Prototype Specification Conditional Resolution Plan]'));
test('Phase 117 referenced', phase123.includes('Phase 117 [Prototype Specification Final Readiness Summary]'));
test('Phase 118 referenced', phase123.includes('Phase 118 [Prototype Specification Archive]'));
test('Phase 119 referenced', phase123.includes('Phase 119 [Prototype Specification Release Readiness]'));
test('Phase 120 referenced', phase123.includes('Phase 120 [Prototype Specification Release Tag Preparation]'));
test('Phase 121 referenced', phase123.includes('Phase 121 [Prototype Specification Release Tag Publication]'));
test('Phase 122 referenced', phase123.includes('Phase 122 [Prototype Specification Post-Tag Integrity Verification]'));
test('Planning line tag present', phase123.includes(PLANNING_TAG));
test('Safety baseline tag present', phase123.includes(SAFETY_TAG));
test('Specification release tag present', phase123.includes(SPEC_TAG));

console.log('\n3) Indexing sections');
test('Canonical reading order section present', phase123.includes('## 4. Canonical Reading Order'));
test('Archive status section present', phase123.includes('## 5. Archive Status'));
test('Release tag section present', phase123.includes('## 6. Release Tag'));
test('Final status archived present', phase123.includes('archived'));
test('Final status release-tagged present', phase123.includes('release-tagged'));
test('Final status post-tag verified present', phase123.includes('post-tag verified'));
test('Final status indexed present', phase123.includes('indexed'));
test('Final status documentation-only present', phase123.includes('documentation-only'));

console.log('\n4) Summary focus');
test('Phase 113–122 specification line final archive index summary present', phase123.includes('prototype specification line (Phases 113–122) is now fully documented, archived, and sealed'));

console.log('\n5) Boundary checks');
test('Implementation non-approval stated', phase123.includes('does not approve implementation'));
test('Prototype non-start stated', phase123.includes('does not start prototype'));
test('Execution non-enable stated', phase123.includes('does not enable execution'));
test('No file write stated', phase123.includes('No file write'));
test('No shell command stated', phase123.includes('No shell command'));
test('No persistence stated', phase123.includes('No persistence'));
test('No permission grant stated', phase123.includes('No permission grant'));
test('No capability/token issuance stated', phase123.includes('No capability/token issuance'));
test('No ActionExecutor stated', phase123.includes('No ActionExecutor'));
test('No Command Registry stated', phase123.includes('No Command Registry'));

console.log('\n6) Safety baseline and Planning Line preservation');
test('Safety baseline archived/frozen/untouched stated', phase123.includes('Safety Baseline v1.0.0 remains archived, frozen, read-only, sealed, untouched, not reopened, not weakened'));
test('Planning line archived/release-tagged/untouched stated', phase123.includes('Prototype Planning Line v1.0.0-no-implementation remains archived, release-tagged, indexed, untouched'));

console.log('\n7) Required sentence and final result');
test(
  'Required key sentence present',
  phase123.includes('Phase 123 creates the final archive index for the prototype specification line as documentation only and does not approve implementation, start a prototype, enable execution, write files, persist records, grant permissions, issue capabilities, create ActionExecutor behavior, or register commands.'),
);
test('Known issues section present', phase123.includes('Known Issues'));
test('Known issues none stated', phase123.includes('Known issues: none.'));
test('Final result phrase present', phase123.includes('prototype specification final archive index complete as documentation only'));

console.log('\n8) No implementation snippets in doc');
test('No ActionExecutor class snippet present', !phase123.includes('class ActionExecutor'));
test('No Command Registry implementation snippet present', !phase123.includes('registerCommand('));
test('No token issuance code snippet present', !phase123.includes('issueToken('));

console.log('\n==================================================================================');
console.log('Phase 123 Smoke Test Results\n');

const passed = results.filter(r => r.passed).length;
const total = results.length;
const failed = total - passed;
const remaining = 0;

console.log(`Total Tests: ${total}`);
console.log(`Passed: ${passed}`);
console.log(`Remaining: ${remaining}`);

if (failed === 0) {
  console.log('\nOK PHASE 123 SMOKE TEST PASSED');
  process.exit(0);
} else {
  console.log('\nFAIL PHASE 123 SMOKE TEST FAILED');
  for (const item of results.filter(r => !r.passed)) {
    console.log(`- ${item.testName}`);
    if (item.errorMessage) console.log(`  ${item.errorMessage}`);
  }
  process.exit(1);
}
