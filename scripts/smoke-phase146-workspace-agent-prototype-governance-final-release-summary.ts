import * as fs from 'fs';
import * as path from 'path';

/**
 * Smoke Test: Phase 146 — Workspace Agent Prototype Governance Final Release Summary
 * 
 * Verifies that the documentation exists and contains all required summary markers
 * while ensuring no implementation code has been introduced.
 */

const DOC_PATH = path.join(process.cwd(), 'docs', 'workspace-agent-prototype-governance-final-release-summary.md');

function runTest() {
    console.log('Starting Smoke Test: Phase 146 - Workspace Agent Prototype Governance Final Release Summary...');
    
    let passed = 0;
    let total = 0;

    const assert = (condition: boolean, message: string) => {
        total++;
        if (condition) {
            passed++;
            console.log(`[PASS] ${message}`);
        } else {
            console.error(`[FAIL] ${message}`);
        }
    };

    // 1. Check if file exists
    assert(fs.existsSync(DOC_PATH), 'Phase 146 documentation file exists');

    if (!fs.existsSync(DOC_PATH)) {
        console.error('Required document not found. Aborting test.');
        process.exit(1);
    }

    const content = fs.readFileSync(DOC_PATH, 'utf-8');

    // 2. Content Assertions
    assert(content.includes('# Phase 146'), 'Contains Phase 146 title');
    assert(content.includes('Prototype Governance Final Release Summary / No Implementation'), 'Contains correct status');
    assert(content.includes('Phase 145') && content.includes('Governance Final Audit Anchor'), 'Contains Phase 145 reference');
    assert(content.includes('Phase 144') && content.includes('Governance Final Release Closure'), 'Contains Phase 144 reference');
    assert(content.includes('Phase 143') && content.includes('Governance Final Archive Index'), 'Contains Phase 143 reference');
    assert(content.includes('Phase 142') && content.includes('Governance Post-Tag Integrity Verification'), 'Contains Phase 142 reference');
    assert(content.includes('Phase 141') && content.includes('Governance Release Tag Publication'), 'Contains Phase 141 reference');
    assert(content.includes('Phase 140') && content.includes('Governance Release Tag Preparation'), 'Contains Phase 140 reference');
    assert(content.includes('Phase 139') && content.includes('Governance Release Readiness'), 'Contains Phase 139 reference');
    assert(content.includes('Phase 138') && content.includes('Governance Master Index'), 'Contains Phase 138 reference');
    assert(content.includes('Final release summary amacı'), 'Contains Final release summary amacı section');
    assert(content.includes('Governance release summary scope'), 'Contains Governance release summary scope section');
    assert(content.includes('Documentation-only status'), 'Contains Documentation-only status section');
    assert(content.includes('Release tag registry'), 'Contains Release tag registry section');
    assert(content.includes('Track summary'), 'Contains Track summary section');
    assert(content.includes('Governance closure summary'), 'Contains Governance closure summary section');
    assert(content.includes('Audit anchor summary'), 'Contains Audit anchor summary section');
    assert(content.includes('No-implementation boundary'), 'Contains No-implementation boundary section');
    assert(content.includes('Baseline integrity'), 'Contains Baseline integrity section');

    // 3. Tag Registries
    assert(content.includes('workspace-agent-prototype-governance-v1.0.0-no-implementation'), 'Contains governance tag');
    assert(content.includes('workspace-agent-safety-baseline-v1.0.0'), 'Contains safety baseline tag');
    assert(content.includes('workspace-agent-prototype-planning-line-v1.0.0-no-implementation'), 'Contains planning line tag');
    assert(content.includes('workspace-agent-prototype-specification-v1.0.0-no-implementation'), 'Contains specification tag');
    assert(content.includes('workspace-agent-prototype-implementation-charter-v1.0.0-no-implementation'), 'Contains charter tag');

    // 4. Track Summary
    assert(content.includes('Safety Baseline: archived, sealed, no-execution'), 'Safety Baseline summary is correct');
    assert(content.includes('Prototype Planning Line: archived, release-tagged, no-implementation'), 'Planning Line summary is correct');
    assert(content.includes('Prototype Specification Line: archived, release-tagged, post-tag verified, indexed, closed'), 'Specification Line summary is correct');
    assert(content.includes('Prototype Implementation Charter Line: archived, release-tagged, post-tag verified, indexed, closed'), 'Charter Line summary is correct');
    assert(content.includes('Prototype Governance Bundle: archived, release-tagged, post-tag verified, indexed, closed, audit anchored, documentation-only'), 'Governance Bundle summary is correct');

    // 5. Final Status
    const finalStatusKeywords = ['archived', 'release-tagged', 'post-tag verified', 'indexed', 'closed', 'audit anchored', 'documentation-only'];
    let allStatusFound = true;
    finalStatusKeywords.forEach(kw => {
        if (!content.includes(kw)) allStatusFound = false;
    });
    assert(allStatusFound, 'Final status keywords are present');

    // 6. Explicit Results
    assert(content.includes('Governance final release summary is complete as documentation only'), 'Explicitly states summary complete');
    assert(content.includes('implementation approval değildir'), 'States not an implementation approval');
    assert(content.includes('prototype start değildir'), 'States not a prototype start');
    assert(content.includes('execution enablement değildir'), 'States not an execution enablement');
    assert(content.includes('ayrıca implementation approval gerekir'), 'States separate approval required');

    assert(content.includes('NOT GRANTED') || content.includes('Implementation Approval: NOT GRANTED'), 'Implementation approval not granted');
    assert(content.includes('NOT STARTED') || content.includes('Prototype Start: NOT STARTED'), 'Prototype not started');
    assert(content.includes('NOT ENABLED') || content.includes('Execution Pathway: NOT ENABLED'), 'Execution pathway not enabled');

    // 7. No implementation markers
    assert(content.includes('NOT ENABLED') && content.includes('File Write'), 'No file write');
    assert(content.includes('NOT ENABLED') && content.includes('Shell Command'), 'No shell command');
    assert(content.includes('NOT ENABLED') && content.includes('Persistence'), 'No persistence');
    assert(content.includes('NOT ENABLED') && content.includes('Permission Grant'), 'No permission grant');
    assert(content.includes('NOT ENABLED') && content.includes('Capability/Token Issuance'), 'No capability/token issuance');
    assert(content.includes('NOT CREATED') && content.includes('ActionExecutor'), 'No ActionExecutor');
    assert(content.includes('NOT CREATED') && content.includes('Command Registry'), 'No Command Registry');

    // 8. Baseline States
    assert(content.includes('Safety Baseline v1.0.0 archived, frozen, read-only, sealed, untouched, not reopened, not weakened'), 'Safety Baseline status is correct');
    assert(content.includes('Prototype Planning Line v1.0.0-no-implementation archived, release-tagged, indexed, untouched'), 'Planning Line status is correct');
    assert(content.includes('Prototype Specification v1.0.0-no-implementation archived, release-tagged, post-tag verified, indexed, closed, untouched'), 'Specification status is correct');
    assert(content.includes('Prototype Implementation Charter v1.0.0-no-implementation archived, release-tagged, post-tag verified, indexed, closed, untouched'), 'Charter status is correct');
    assert(content.includes('Prototype Governance v1.0.0-no-implementation archived, release-tagged, post-tag verified, indexed, closed, audit anchored, documentation-only, untouched'), 'Governance status is correct');

    // 9. Known issues and final result
    assert(content.includes('Known Issues') && content.includes('None'), 'Contains Known Issues section with None');
    assert(content.includes('workspace agent prototype governance final release summary complete as documentation only'), 'Final result string matches');

    // 10. Critical Sentence
    const criticalSentence = "Phase 146 summarizes the Workspace Agent prototype governance final release as documentation only and does not approve implementation, start a prototype, enable execution, write files, persist records, grant permissions, issue capabilities, create ActionExecutor behavior, or register commands.";
    assert(content.includes(criticalSentence), 'Contains the critical sentence exactly');

    // 11. No implementation code in script
    const forbiddenPatterns = [/class\s+ActionExecutor/, /class\s+CommandRegistry/, /token\s*=\s*.*issuance/i, /fs\.writeFileSync/];
    let codeLeak = false;
    forbiddenPatterns.forEach(pattern => {
        if (pattern.test(content)) {
            codeLeak = true;
        }
    });
    assert(!codeLeak, 'No implementation code patterns found in documentation');

    console.log('\n--- Result Summary ---');
    console.log(`Total: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${total - passed}`);

    if (passed === total) {
        console.log('Smoke Test PASSED');
        process.exit(0);
    } else {
        console.error('Smoke Test FAILED');
        process.exit(1);
    }
}

runTest();
