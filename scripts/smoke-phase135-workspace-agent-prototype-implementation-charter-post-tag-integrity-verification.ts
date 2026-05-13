#!/usr/bin/env npx tsx
/**
 * Phase 135 - Workspace Agent Prototype Implementation Charter Post-Tag Integrity Verification
 * Smoke validation script (documentation-only)
 */

import * as fs from 'fs';

interface ValidationResult {
  testName: string;
  passed: boolean;
  errorMessage?: string;
}

const results: ValidationResult[] = [];
const PHASE135_DOC = 'docs/workspace-agent-prototype-implementation-charter-post-tag-integrity-verification.md';
const CHARTER_TAG = 'workspace-agent-prototype-implementation-charter-v1.0.0-no-implementation';
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

console.log('Phase 135 - Workspace Agent Prototype Implementation Charter Post-Tag Integrity Smoke Tests');
console.log('========================================================================================\n');

const phase135 = fs.readFileSync(PHASE135_DOC, 'utf-8');

console.log('1) Existence and status');
test('Phase 135 document exists', fs.existsSync(PHASE135_DOC));
test('Title present', phase135.includes('# Phase 135 - Workspace Agent Prototype Implementation Charter Post-Tag Integrity Verification'));
test('Prototype Implementation Charter Post-Tag Integrity Verification / No Implementation status present', phase135.includes('Prototype Implementation Charter Post-Tag Integrity Verification / No Implementation'));

console.log('\n2) References present');
test('Implementation Readiness Track referenced', phase135.includes('Workspace Agent Prototype Implementation Readiness Track'));
test('Phase 134 Charter Release Tag Publication referenced', phase135.includes('Phase 134 [Prototype Implementation Charter Release Tag Publication]'));
test('Phase 133 Charter Release Tag Preparation referenced', phase135.includes('Phase 133 [Prototype Implementation Charter Release Tag Preparation]'));
test('Phase 126-132 charter line referenced', phase135.includes('Phase 126') && phase135.includes('132'));
test('Charter release tag present', phase135.includes(CHARTER_TAG));
test('Planning line release tag present', phase135.includes(PLANNING_TAG));
test('Safety baseline release tag present', phase135.includes(SAFETY_TAG));
test('Specification release tag present', phase135.includes(SPEC_TAG));
test('Remote tag verification mentioned', phase135.includes('Remote tag verification'));

console.log('\n3) Post-tag integrity sections');
test('Post-tag integrity status section present', phase135.includes('## 2. Post-Tag Integrity Status'));
test('Release scope section present', phase135.includes('Release scope: charter documentation release only'));
test('Archive status section present', phase135.includes('## 4. Archive Status'));
test('No-implementation boundary section present', phase135.includes('## 7. No-Implementation Boundary'));
test('Baseline integrity section present', phase135.includes('## 8. Baseline Integrity'));

console.log('\n4) Verification statements');
test('Post-tag integrity verified for charter documentation release only stated', phase135.includes('post-tag integrity verified for charter documentation release only'));
test('Charter documentation release only stated in scope', phase135.includes('charter documentation release only'));
test('Phase 126-134 charter hattı post-tag integrity summary stated', phase135.includes('Phase 126–134 charter hattının post-tag integrity özeti'));

console.log('\n5) Boundary checks');
test('Implementation approval vermediği stated', phase135.includes('It does not approve implementation'));
test('Prototype başlatmadığı stated', phase135.includes('It does not start prototype'));
test('Execution pathway açmadığı stated', phase135.includes('It does not enable execution pathways'));
test('No file write stated', phase135.includes('No file write'));
test('No shell command stated', phase135.includes('No shell command'));
test('No persistence stated', phase135.includes('No persistence'));
test('No permission grant stated', phase135.includes('No permission grant'));
test('No capability/token issuance stated', phase135.includes('No capability/token issuance'));
test('No ActionExecutor stated', phase135.includes('No ActionExecutor'));
test('No Command Registry stated', phase135.includes('No Command Registry'));

console.log('\n6) Preservation statements');
test('Safety Baseline archived/frozen/untouched stated', phase135.includes('Safety Baseline v1.0.0 remains archived, frozen, read-only, sealed, untouched, not reopened, not weakened'));
test('Planning line archived/release-tagged/untouched stated', phase135.includes('Prototype Planning Line v1.0.0-no-implementation remains archived, release-tagged, indexed, untouched'));
test('Prototype Specification archived/release-tagged/closed/untouched stated', phase135.includes('Prototype Specification v1.0.0-no-implementation remains archived, release-tagged, post-tag verified, indexed, closed, untouched'));

console.log('\n7) Required sentence and final result');
test(
  'Required key sentence present',
  phase135.includes('Phase 135 verifies prototype implementation charter post-tag integrity as documentation only and does not approve implementation, start a prototype, enable execution, write files, persist records, grant permissions, issue capabilities, create ActionExecutor behavior, or register commands.'),
);
test('Known issues section present', phase135.includes('Known Issues'));
test('Known issues none stated', phase135.includes('Known issues: none.'));
test('Final result phrase present', phase135.includes('prototype implementation charter post-tag integrity verified as documentation only'));

console.log('\n8) No implementation snippets in doc');
test('No ActionExecutor class snippet present', !phase135.includes('class ActionExecutor'));
test('No Command Registry implementation snippet present', !phase135.includes('registerCommand('));
test('No token issuance code snippet present', !phase135.includes('issueToken('));

console.log('\n========================================================================================');
console.log('Phase 135 Smoke Test Results\n');

const passed = results.filter(r => r.passed).length;
const total = results.length;
const failed = total - passed;
const remaining = 0;

console.log(`Total Tests: ${total}`);
console.log(`Passed: ${passed}`);
console.log(`Remaining: ${remaining}`);

if (failed === 0) {
  console.log('\nOK PHASE 135 SMOKE TEST PASSED');
  process.exit(0);
} else {
  console.log('\nFAIL PHASE 135 SMOKE TEST FAILED');
  for (const item of results.filter(r => !r.passed)) {
    console.log(`- ${item.testName}`);
    if (item.errorMessage) console.log(`  ${item.errorMessage}`);
  }
  process.exit(1);
}
