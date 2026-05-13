#!/usr/bin/env npx tsx
/**
 * Phase 138 - Workspace Agent Prototype Governance Master Index
 * Smoke validation script (documentation-only)
 */

import * as fs from 'fs';

interface ValidationResult {
  testName: string;
  passed: boolean;
  errorMessage?: string;
}

const results: ValidationResult[] = [];
const PHASE138_DOC = 'docs/workspace-agent-prototype-governance-master-index.md';
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

console.log('Phase 138 - Workspace Agent Prototype Governance Master Index Smoke Tests');
console.log('========================================================================\n');

const phase138 = fs.readFileSync(PHASE138_DOC, 'utf-8');

console.log('1) Existence and status');
test('Phase 138 document exists', fs.existsSync(PHASE138_DOC));
test('Title present', phase138.includes('# Phase 138 - Workspace Agent Prototype Governance Master Index'));
test('Prototype Governance Master Index / No Implementation status present', phase138.includes('Prototype Governance Master Index / No Implementation'));
test('Master index purpose mentioned', phase138.includes('Master Index Purpose'));

console.log('\n2) Sections and tracks');
test('Governance scope section present', phase138.includes('## 2. Governance Scope'));
test('Documentation-only status section present', phase138.includes('## 3. Documentation-Only Status'));
test('Release tag registry section present', phase138.includes('## 4. Release Tag Registry'));
test('Canonical track map section present', phase138.includes('## 5. Canonical Track Map'));
test('Cross-track boundary summary section present', phase138.includes('## 6. Cross-Track Boundary Summary'));
test('No-implementation boundary section present', phase138.includes('## 7. No-Implementation Boundary'));
test('Baseline integrity section present', phase138.includes('## 8. Baseline Integrity'));

console.log('\n3) Tags and track names');
test('Safety baseline tag present', phase138.includes(SAFETY_TAG));
test('Planning line tag present', phase138.includes(PLANNING_TAG));
test('Specification tag present', phase138.includes(SPEC_TAG));
test('Charter tag present', phase138.includes(CHARTER_TAG));
test('Safety Baseline track name present', phase138.includes('Safety Baseline'));
test('Prototype Planning Line track name present', phase138.includes('Prototype Planning Line'));
test('Prototype Specification Line track name present', phase138.includes('Prototype Specification Line'));
test('Prototype Implementation Charter Line track name present', phase138.includes('Prototype Implementation Charter Line'));

console.log('\n4) Track summaries');
test('Safety Baseline archived/sealed/no-execution stated', phase138.toLowerCase().includes('archived, sealed, no-execution baseline'));
test('Planning Line archived/release-tagged/no-implementation stated', phase138.toLowerCase().includes('archived, release-tagged, no-implementation planning line'));
test('Specification Line archived/release-tagged/post-tag verified/indexed/closed stated', phase138.toLowerCase().includes('archived, release-tagged, post-tag verified, indexed, closed'));
test('Charter Line archived/release-tagged/post-tag verified/indexed/closed stated', phase138.toLowerCase().includes('archived, release-tagged, post-tag verified, indexed, closed'));

console.log('\n5) Verification statements');
test('Governance master index is complete as documentation only stated', phase138.includes('Governance master index is complete as documentation only'));
test('Master index implementation approval değildir stated', phase138.includes('Bu master index implementation approval değildir'));
test('Master index prototype start değildir stated', phase138.includes('Bu master index prototype start değildir'));
test('Master index execution enablement değildir stated', phase138.includes('Bu master index execution enablement değildir'));
test('Master index tamamlansa bile ayrıca implementation approval gerekir stated', phase138.includes('Master index tamamlansa bile ayrıca implementation approval gerekir'));

console.log('\n6) Boundary checks');
test('Implementation approval vermediği stated', phase138.includes('Implementation approval verilmedi'));
test('Prototype başlatmadığı stated', phase138.includes('Prototype başlatılmadı'));
test('Execution pathway açmadığı stated', phase138.includes('Execution pathway açılmadı'));
test('No file write stated', phase138.includes('No file write'));
test('No shell command stated', phase138.includes('No shell command'));
test('No persistence stated', phase138.includes('No persistence'));
test('No permission grant stated', phase138.includes('No permission grant'));
test('No capability/token issuance stated', phase138.includes('No capability/token issuance'));
test('No ActionExecutor stated', phase138.includes('No ActionExecutor'));
test('No Command Registry stated', phase138.includes('No Command Registry'));

console.log('\n7) Preservation statements');
test('Safety Baseline archived/frozen/untouched stated', phase138.includes('Safety Baseline v1.0.0') && phase138.includes('archived, frozen, read-only, sealed, untouched, not reopened, not weakened'));
test('Planning Line archived/release-tagged/indexed/untouched stated', phase138.includes('Prototype Planning Line v1.0.0-no-implementation') && phase138.includes('archived, release-tagged, indexed, untouched'));
test('Specification Line archived/release-tagged/post-tag verified/indexed/closed/untouched stated', phase138.includes('Prototype Specification v1.0.0-no-implementation') && phase138.includes('archived, release-tagged, post-tag verified, indexed, closed, untouched'));
test('Charter Line archived/release-tagged/post-tag verified/indexed/closed/untouched stated', phase138.includes('Prototype Implementation Charter v1.0.0-no-implementation') && phase138.includes('archived, release-tagged, post-tag verified, indexed, closed, untouched'));

console.log('\n8) Required sentence and final result');
test(
  'Required key sentence present',
  phase138.includes('Phase 138 creates the Workspace Agent prototype governance master index as documentation only and does not approve implementation, start a prototype, enable execution, write files, persist records, grant permissions, issue capabilities, create ActionExecutor behavior, or register commands.'),
);
test('Known issues section present', phase138.includes('Known Issues'));
test('Known issues none stated', phase138.includes('Known issues: none.'));
test('Final result phrase present', phase138.includes('workspace agent prototype governance master index complete as documentation only'));

console.log('\n9) No implementation snippets in doc');
test('No ActionExecutor class snippet present', !phase138.includes('class ActionExecutor'));
test('No Command Registry implementation snippet present', !phase138.includes('registerCommand('));
test('No token issuance code snippet present', !phase138.includes('issueToken('));

console.log('\n========================================================================');
console.log('Phase 138 Smoke Test Results\n');

const passed = results.filter(r => r.passed).length;
const total = results.length;
const failed = total - passed;
const remaining = 0;

console.log(`Total Tests: ${total}`);
console.log(`Passed: ${passed}`);
console.log(`Remaining: ${remaining}`);

if (failed === 0) {
  console.log('\nOK PHASE 138 SMOKE TEST PASSED');
  process.exit(0);
} else {
  console.log('\nFAIL PHASE 138 SMOKE TEST FAILED');
  for (const item of results.filter(r => !r.passed)) {
    console.log(`- ${item.testName}`);
    if (item.errorMessage) console.log(`  ${item.errorMessage}`);
  }
  process.exit(1);
}
