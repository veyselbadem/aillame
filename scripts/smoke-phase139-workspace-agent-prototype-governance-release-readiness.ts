#!/usr/bin/env npx tsx
/**
 * Phase 139 - Workspace Agent Prototype Governance Release Readiness
 * Smoke validation script (documentation-only)
 */

import * as fs from 'fs';

interface ValidationResult {
  testName: string;
  passed: boolean;
  errorMessage?: string;
}

const results: ValidationResult[] = [];
const PHASE139_DOC = 'docs/workspace-agent-prototype-governance-release-readiness.md';
const SAFETY_TAG = 'workspace-agent-safety-baseline-v1.0.0';
const PLANNING_TAG = 'workspace-agent-prototype-planning-line-v1.0.0-no-implementation';
const SPEC_TAG = 'workspace-agent-prototype-specification-v1.0.0-no-implementation';
const CHARTER_TAG = 'workspace-agent-prototype-implementation-charter-v1.0.0-no-implementation';

function test(testName: string, condition: boolean, errorMessage?: string): void {
  results.push({ testName, passed: condition, errorMessage });
  const icon = condition ? 'OK' : 'FAIL';
  console.log(`[${icon}] ${testName}`);
  if (!condition && errorMessage) {
    console.log(`  Error: ${errorMessage}`);
  }
}

console.log('Phase 139 - Workspace Agent Prototype Governance Release Readiness Smoke Tests');
console.log('============================================================================\n');

const phase139 = fs.readFileSync(PHASE139_DOC, 'utf-8');

console.log('1) Existence and status');
test('Phase 139 document exists', fs.existsSync(PHASE139_DOC));
test('Title present', phase139.includes('# Phase 139 - Workspace Agent Prototype Governance Release Readiness'));
test('Prototype Governance Release Readiness / No Implementation status present', phase139.includes('Prototype Governance Release Readiness / No Implementation'));
test('Phase 138 governance master index referenced', phase139.includes('Phase 138 [Governance Master Index]'));

console.log('\n2) Sections');
test('Governance release readiness purpose section present', phase139.includes('## 1. Governance Release Readiness Purpose'));
test('Governance release scope section present', phase139.includes('## 2. Governance Release Scope'));
test('Documentation-only status section present', phase139.includes('## 3. Documentation-Only Status'));
test('Release tag registry section present', phase139.includes('## 4. Release Tag Registry'));
test('Track readiness summary section present', phase139.includes('## 5. Track Readiness Summary'));
test('Cross-track boundary summary section present', phase139.includes('## 6. Cross-Track Boundary Summary'));
test('Release readiness decision section present', phase139.includes('## 7. Release Readiness Decision'));
test('No-implementation boundary section present', phase139.includes('## 8. No-Implementation Boundary'));
test('Baseline integrity section present', phase139.includes('## 9. Baseline Integrity'));

console.log('\n3) Tags and track readiness');
test('Safety baseline tag present', phase139.includes(SAFETY_TAG));
test('Planning line tag present', phase139.includes(PLANNING_TAG));
test('Specification tag present', phase139.includes(SPEC_TAG));
test('Charter tag present', phase139.includes(CHARTER_TAG));

test('Safety Baseline readiness stated', phase139.includes('Safety Baseline') && phase139.includes('release-ready, archived, sealed, no-execution baseline'));
test('Planning Line readiness stated', phase139.includes('Prototype Planning Line') && phase139.includes('release-ready, archived, release-tagged, no-implementation planning line'));
test('Specification Line readiness stated', phase139.includes('Prototype Specification Line') && phase139.includes('release-ready, archived, release-tagged, post-tag verified, indexed, closed'));
test('Charter Line readiness stated', phase139.includes('Prototype Implementation Charter Line') && phase139.includes('release-ready, archived, release-tagged, post-tag verified, indexed, closed'));
test('Governance Master Index readiness stated', phase139.includes('Governance Master Index') && phase139.includes('release-ready, documentation-only, cross-track index'));

console.log('\n4) Verification statements');
test('Governance documentation bundle is release-ready as documentation only stated', phase139.includes('Governance documentation bundle is release-ready as documentation only'));
test('Governance release readiness implementation approval değildir stated', phase139.includes('Bu governance release readiness implementation approval değildir'));
test('Governance release readiness prototype start değildir stated', phase139.includes('Bu governance release readiness prototype start değildir'));
test('Governance release readiness execution enablement değildir stated', phase139.includes('Bu governance release readiness execution enablement değildir'));
test('Governance release readiness tamamlansa bile ayrıca implementation approval gerekir stated', phase139.includes('Governance release readiness tamamlansa bile ayrıca implementation approval gerekir'));

console.log('\n5) Boundary checks');
test('Implementation approval vermediği stated', phase139.includes('Implementation approval verilmedi'));
test('Prototype başlatmadığı stated', phase139.includes('Prototype başlatılmadı'));
test('Execution pathway açmadığı stated', phase139.includes('Execution pathway açılmadı'));
test('No file write stated', phase139.includes('No file write'));
test('No shell command stated', phase139.includes('No shell command'));
test('No persistence stated', phase139.includes('No persistence'));
test('No permission grant stated', phase139.includes('No permission grant'));
test('No capability/token issuance stated', phase139.includes('No capability/token issuance'));
test('No ActionExecutor stated', phase139.includes('No ActionExecutor'));
test('No Command Registry stated', phase139.includes('No Command Registry'));

console.log('\n6) Preservation statements');
test('Safety Baseline archived/frozen/untouched stated', phase139.includes('Safety Baseline v1.0.0') && phase139.includes('archived, frozen, read-only, sealed, untouched, not reopened, not weakened'));
test('Planning Line archived/release-tagged/indexed/untouched stated', phase139.includes('Prototype Planning Line v1.0.0-no-implementation') && phase139.includes('archived, release-tagged, indexed, untouched'));
test('Specification Line archived/release-tagged/post-tag verified/indexed/closed/untouched stated', phase139.includes('Prototype Specification v1.0.0-no-implementation') && phase139.includes('archived, release-tagged, post-tag verified, indexed, closed, untouched'));
test('Charter Line archived/release-tagged/post-tag verified/indexed/closed/untouched stated', phase139.includes('Prototype Implementation Charter v1.0.0-no-implementation') && phase139.includes('archived, release-tagged, post-tag verified, indexed, closed, untouched'));

console.log('\n7) Required sentence and final result');
test(
  'Required key sentence present',
  phase139.includes('Phase 139 confirms Workspace Agent prototype governance release readiness as documentation only and does not approve implementation, start a prototype, enable execution, write files, persist records, grant permissions, issue capabilities, create ActionExecutor behavior, or register commands.'),
);
test('Known issues section present', phase139.includes('Known Issues'));
test('Known issues none stated', phase139.includes('Known issues: none.'));
test('Final result phrase present', phase139.includes('workspace agent prototype governance release readiness complete as documentation only'));

console.log('\n8) No implementation snippets in doc');
test('No ActionExecutor class snippet present', !phase139.includes('class ActionExecutor'));
test('No Command Registry implementation snippet present', !phase139.includes('registerCommand('));
test('No token issuance code snippet present', !phase139.includes('issueToken('));

console.log('\n============================================================================');
console.log('Phase 139 Smoke Test Results\n');

const passed = results.filter(r => r.passed).length;
const total = results.length;
const failed = total - passed;
const remaining = 0;

console.log(`Total Tests: ${total}`);
console.log(`Passed: ${passed}`);
console.log(`Remaining: ${remaining}`);

if (failed === 0) {
  console.log('\nOK PHASE 139 SMOKE TEST PASSED');
  process.exit(0);
} else {
  console.log('\nFAIL PHASE 139 SMOKE TEST FAILED');
  for (const item of results.filter(r => !r.passed)) {
    console.log(`- ${item.testName}`);
    if (item.errorMessage) console.log(`  ${item.errorMessage}`);
  }
  process.exit(1);
}
