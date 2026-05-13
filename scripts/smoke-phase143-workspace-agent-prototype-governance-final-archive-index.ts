import * as fs from 'fs';
import * as path from 'path';

/**
 * Smoke Test: Phase 143 — Workspace Agent Prototype Governance Final Archive Index
 * 
 * Verifies that the documentation exists and contains all required indexing markers
 * while ensuring no implementation code has been introduced.
 */

const DOC_PATH = path.join(process.cwd(), 'docs', 'workspace-agent-prototype-governance-final-archive-index.md');

function runTest() {
    console.log('Starting Smoke Test: Phase 143 - Workspace Agent Prototype Governance Final Archive Index...');
    
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
    assert(fs.existsSync(DOC_PATH), 'Phase 143 documentation file exists');

    if (!fs.existsSync(DOC_PATH)) {
        console.error('Required document not found. Aborting test.');
        process.exit(1);
    }

    const content = fs.readFileSync(DOC_PATH, 'utf-8');

    // 2. Content Assertions
    assert(content.includes('# Phase 143'), 'Contains Phase 143 title');
    assert(content.includes('Prototype Governance Final Archive Index / No Implementation'), 'Contains correct status');
    assert(content.includes('Phase 142') && content.includes('Governance Post-Tag Integrity Verification'), 'Contains Phase 142 reference');
    assert(content.includes('Phase 141') && content.includes('Governance Release Tag Publication'), 'Contains Phase 141 reference');
    assert(content.includes('Phase 140') && content.includes('Governance Release Tag Preparation'), 'Contains Phase 140 reference');
    assert(content.includes('Phase 139') && content.includes('Governance Release Readiness'), 'Contains Phase 139 reference');
    assert(content.includes('Phase 138') && content.includes('Governance Master Index'), 'Contains Phase 138 reference');
    assert(content.includes('Governance Final Archive Index Amacı'), 'Contains Governance Final Archive Index Amacı section');
    assert(content.includes('Governance Archive Scope'), 'Contains Governance Archive Scope section');
    assert(content.includes('Documentation-Only Status'), 'Contains Documentation-Only Status section');
    assert(content.includes('Release Tag Registry'), 'Contains Release Tag Registry section');
    assert(content.includes('Canonical Governance Reading Order'), 'Contains Canonical Governance Reading Order section');
    assert(content.includes('Track Archive Map'), 'Contains Track Archive Map section');
    assert(content.includes('Cross-Track Boundary Summary'), 'Contains Cross-Track Boundary Summary section');
    assert(content.includes('Final Archive Status'), 'Contains Final Archive Status section');
    assert(content.includes('No-Implementation Boundary'), 'Contains No-Implementation Boundary section');
    assert(content.includes('Baseline Integrity'), 'Contains Baseline Integrity section');

    // 3. Tag Registries
    assert(content.includes('workspace-agent-prototype-governance-v1.0.0-no-implementation'), 'Contains governance tag');
    assert(content.includes('workspace-agent-safety-baseline-v1.0.0'), 'Contains safety baseline tag');
    assert(content.includes('workspace-agent-prototype-planning-line-v1.0.0-no-implementation'), 'Contains planning line tag');
    assert(content.includes('workspace-agent-prototype-specification-v1.0.0-no-implementation'), 'Contains specification tag');
    assert(content.includes('workspace-agent-prototype-implementation-charter-v1.0.0-no-implementation'), 'Contains charter tag');

    // 4. Reading Order
    assert(content.includes('Phase 138 governance master index'), 'Contains Phase 138 in reading order');
    assert(content.includes('Phase 139 governance release readiness'), 'Contains Phase 139 in reading order');
    assert(content.includes('Phase 140 governance release tag preparation'), 'Contains Phase 140 in reading order');
    assert(content.includes('Phase 141 governance release tag publication'), 'Contains Phase 141 in reading order');
    assert(content.includes('Phase 142 governance post-tag integrity verification'), 'Contains Phase 142 in reading order');
    assert(content.includes('Phase 143 governance final archive index'), 'Contains Phase 143 in reading order');

    // 5. Track Archive Map
    assert(content.includes('Safety Baseline: archived, sealed, no-execution'), 'Safety Baseline map is correct');
    assert(content.includes('Prototype Planning Line: archived, release-tagged, no-implementation'), 'Planning Line map is correct');
    assert(content.includes('Prototype Specification Line: archived, release-tagged, post-tag verified, indexed, closed'), 'Specification Line map is correct');
    assert(content.includes('Prototype Implementation Charter Line: archived, release-tagged, post-tag verified, indexed, closed'), 'Charter Line map is correct');
    assert(content.includes('Prototype Governance Bundle: archived, release-tagged, post-tag verified, indexed, documentation-only'), 'Governance Bundle map is correct');

    // 6. Final Status
    assert(content.includes('- archived'), 'Status includes archived');
    assert(content.includes('- release-tagged'), 'Status includes release-tagged');
    assert(content.includes('- post-tag verified'), 'Status includes post-tag verified');
    assert(content.includes('- indexed'), 'Status includes indexed');
    assert(content.includes('- documentation-only'), 'Status includes documentation-only');

    // 7. Explicit Results
    assert(content.includes('Governance final archive index is complete as documentation only'), 'Explicitly states index complete');
    assert(content.includes('implementation approval değildir'), 'States not an implementation approval');
    assert(content.includes('prototype start değildir'), 'States not a prototype start');
    assert(content.includes('execution enablement değildir'), 'States not an execution enablement');
    assert(content.includes('ayrıca implementation approval gerekir'), 'States separate approval required');

    assert(content.includes('NOT GRANTED') || content.includes('Implementation Approval: NOT GRANTED'), 'Implementation approval not granted');
    assert(content.includes('NOT STARTED') || content.includes('Prototype Start: NOT STARTED'), 'Prototype not started');
    assert(content.includes('NOT ENABLED') || content.includes('Execution Pathway: NOT ENABLED'), 'Execution pathway not enabled');

    // 8. No implementation markers
    assert(content.includes('NOT ENABLED') && content.includes('File Write'), 'No file write');
    assert(content.includes('NOT ENABLED') && content.includes('Shell Command'), 'No shell command');
    assert(content.includes('NOT ENABLED') && content.includes('Persistence'), 'No persistence');
    assert(content.includes('NOT ENABLED') && content.includes('Permission Grant'), 'No permission grant');
    assert(content.includes('NOT ENABLED') && content.includes('Capability/Token Issuance'), 'No capability/token issuance');
    assert(content.includes('NOT CREATED') && content.includes('ActionExecutor'), 'No ActionExecutor');
    assert(content.includes('NOT CREATED') && content.includes('Command Registry'), 'No Command Registry');

    // 9. Baseline States
    assert(content.includes('Safety Baseline v1.0.0 archived, frozen, read-only, sealed, untouched, not reopened, not weakened'), 'Safety Baseline status is correct');
    assert(content.includes('Prototype Planning Line v1.0.0-no-implementation archived, release-tagged, indexed, untouched'), 'Planning Line status is correct');
    assert(content.includes('Prototype Specification v1.0.0-no-implementation archived, release-tagged, post-tag verified, indexed, closed, untouched'), 'Specification status is correct');
    assert(content.includes('Prototype Implementation Charter v1.0.0-no-implementation archived, release-tagged, post-tag verified, indexed, closed, untouched'), 'Charter status is correct');
    assert(content.includes('Prototype Governance v1.0.0-no-implementation release-tagged, post-tag verified, indexed, documentation-only, untouched'), 'Governance status is correct');

    // 10. Known issues and final result
    assert(content.includes('Known Issues') && content.includes('None'), 'Contains Known Issues section with None');
    assert(content.includes('workspace agent prototype governance final archive index complete as documentation only'), 'Final result string matches');

    // 11. Critical Sentence
    const criticalSentence = "Phase 143 creates the Workspace Agent prototype governance final archive index as documentation only and does not approve implementation, start a prototype, enable execution, write files, persist records, grant permissions, issue capabilities, create ActionExecutor behavior, or register commands.";
    assert(content.includes(criticalSentence), 'Contains the critical sentence exactly');

    // 12. No implementation code in script
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
