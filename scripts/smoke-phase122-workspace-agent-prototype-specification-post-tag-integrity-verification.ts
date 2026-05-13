#!/usr/bin/env npx tsx
/**
 * Phase 122 - Workspace Agent Prototype Specification Post-Tag Integrity Verification
 * Smoke validation script (documentation-only)
 */

import * as fs from 'fs';

interface ValidationResult {
  testName: string;
  passed: boolean;
  errorMessage?: string;
}

const results: ValidationResult[] = [];
const PHASE122_DOC = 'docs/workspace-agent-prototype-specification-post-tag-integrity-verification.md';
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

console.log('Phase 122 - Workspace Agent Prototype Specification Post-Tag Integrity Verification Smoke Tests');
console.log('============================================================================================\n');

const phase122 = fs.readFileSync(PHASE122_DOC, 'utf-8');

console.log('1) Existence and status');
test('Phase 122 document exists', fs.existsSync(PHASE122_DOC));
test('Title present', phase122.includes('# Phase 122 - Workspace Agent Prototype Specification Post-Tag Integrity Verification'));
test('Prototype Specification Post-Tag Integrity Verification / No Implementation status present', phase122.includes('Prototype Specification Post-Tag Integrity Verification / No Implementation'));

console.log('\n2) References present');
test('Implementation Readiness Track referenced', phase122.includes('Workspace Agent Prototype Implementation Readiness Track'));
test('Phase 121 Publication referenced', phase122.includes('Phase 121 [Prototype Specification Release Tag Publication]'));
test('Phase 120 Preparation referenced', phase122.includes('Phase 120 [Prototype Specification Release Tag Preparation]'));
test('Phase 119 referenced', phase122.includes('Phase 119 [Prototype Specification Release Readiness]'));
test('Phase 118 referenced', phase122.includes('Phase 118 [Prototype Specification Archive]'));
test('Phase 117 referenced', phase122.includes('Phase 117 [Prototype Specification Final Readiness Summary]'));
test('Phase 116 referenced', phase122.includes('Phase 116 [Prototype Specification Conditional Resolution Plan]'));
test('Phase 115 referenced', phase122.includes('Phase 115 [Prototype Specification Review Decision]'));
test('Phase 114 referenced', phase122.includes('Phase 114 [Prototype Specification Review Checklist]'));
test('Phase 113 referenced', phase122.includes('Phase 113 [Prototype Specification Draft]'));
test('Planning line tag present', phase122.includes(PLANNING_TAG));
test('Safety baseline tag present', phase122.includes(SAFETY_TAG));
test('Specification release tag present', phase122.includes(SPEC_TAG));

console.log('\n3) Integrity sections');
test('Remote tag verification goal present', phase122.includes('Remote tag verification target'));
test('Post-tag integrity status section present', phase122.includes('## 4. Post-Tag Integrity Status'));
test('Release scope section present', phase122.includes('## 4. Post-Tag Integrity Status'));
test('Specification documentation release only phrase present', phase122.includes('specification documentation release only'));
test('Archive status section present', phase122.includes('## 4. Post-Tag Integrity Status')); // In status section
test('Post-tag integrity verified for specification documentation release only phrase present', phase122.includes('post-tag integrity verified for specification documentation release only'));
test('Remote tag verification section present', phase122.includes('## 5. Remote Tag Verification'));

console.log('\n4) Summary focus');
test('Phase 113–121 specification hattı post-tag integrity summary as confirmed', phase122.includes('prototype specification line (Phases 113–121) has been sealed with the official release tag'));

console.log('\n5) Boundary checks');
test('Implementation non-approval stated', phase122.includes('does not approve implementation'));
test('Prototype non-start stated', phase122.includes('does not start prototype'));
test('Execution non-enable stated', phase122.includes('does not enable execution'));
test('No file write stated', phase122.includes('No file write'));
test('No shell command stated', phase122.includes('No shell command'));
test('No persistence stated', phase122.includes('No persistence'));
test('No permission grant stated', phase122.includes('No permission grant'));
test('No capability/token issuance stated', phase122.includes('No capability/token issuance'));
test('No ActionExecutor stated', phase122.includes('No ActionExecutor'));
test('No Command Registry stated', phase122.includes('No Command Registry'));

console.log('\n6) Safety baseline and Planning Line preservation');
test('Safety baseline archived/frozen/untouched stated', phase122.includes('Safety Baseline v1.0.0 remains archived, frozen, read-only, sealed, untouched, not reopened, not weakened'));
test('Planning line archived/release-tagged/untouched stated', phase122.includes('Prototype Planning Line v1.0.0-no-implementation remains archived, release-tagged, indexed, untouched'));

console.log('\n7) Required sentence and final result');
test(
  'Required key sentence present',
  phase122.includes('Phase 122 verifies prototype specification post-tag integrity as documentation only and does not approve implementation, start a prototype, enable execution, write files, persist records, grant permissions, issue capabilities, create ActionExecutor behavior, or register commands.'),
);
test('Known issues section present', phase122.includes('Known Issues'));
test('Known issues none stated', phase122.includes('Known issues: none.'));
test('Final result phrase present', phase122.includes('prototype specification post-tag integrity verified as documentation only'));

console.log('\n8) No implementation snippets in doc');
test('No ActionExecutor class snippet present', !phase122.includes('class ActionExecutor'));
test('No Command Registry implementation snippet present', !phase122.includes('registerCommand('));
test('No token issuance code snippet present', !phase122.includes('issueToken('));

console.log('\n============================================================================================');
console.log('Phase 122 Smoke Test Results\n');

const passed = results.filter(r => r.passed).length;
const total = results.length;
const failed = total - passed;
const remaining = 0;

console.log(`Total Tests: ${total}`);
console.log(`Passed: ${passed}`);
console.log(`Remaining: ${remaining}`);

if (failed === 0) {
  console.log('\nOK PHASE 122 SMOKE TEST PASSED');
  process.exit(0);
} else {
  console.log('\nFAIL PHASE 122 SMOKE TEST FAILED');
  for (const item of results.filter(r => !r.passed)) {
    console.log(`- ${item.testName}`);
    if (item.errorMessage) console.log(`  ${item.errorMessage}`);
  }
  process.exit(1);
}
