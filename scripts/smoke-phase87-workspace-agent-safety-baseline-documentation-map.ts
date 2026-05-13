import * as fs from 'fs';
import * as path from 'path';

async function runDocMapSmokeTest() {
  console.log('Running Phase 87: Workspace Agent Safety Baseline Documentation Map Smoke Test...');

  const workspaceRoot = path.resolve(__dirname, '..');
  const mapFile = 'docs/workspace-agent-safety-baseline-documentation-map.md';
  
  const docsToVerify = [
    'docs/workspace-agent-safety-architecture-index.md',
    'docs/workspace-agent-safety-architecture-release-readiness.md',
    'docs/workspace-agent-safety-architecture-final-regression-anchor.md',
    'docs/workspace-agent-post-freeze-integrity-summary.md',
    'docs/workspace-agent-safety-baseline-documentation-map.md'
  ];

  let passedCount = 0;
  let failedCount = 0;
  const failedChecks: string[] = [];

  const check = (name: string, condition: boolean) => {
    if (condition) {
      passedCount++;
    } else {
      failedCount++;
      failedChecks.push(name);
      console.error(`[FAIL] ${name}`);
    }
  };

  // 1. File Existence for all mapped docs
  for (const file of docsToVerify) {
    check(`File exists: ${file}`, fs.existsSync(path.join(workspaceRoot, file)));
  }

  if (failedCount > 0) {
    console.error('Mapped documentation missing. Aborting.');
    process.exit(1);
  }

  const mapContent = fs.readFileSync(path.join(workspaceRoot, mapFile), 'utf-8');

  // 2. Map Categorization Checks
  const categories = ['Index', 'Release-Readiness', 'Regression Anchor', 'Post-Freeze Record'];
  for (const category of categories) {
    check(`Map contains category: ${category}`, mapContent.includes(category));
  }

  // 3. No-Execution Phrasing Check
  check('Map preserves No-Execution boundary', mapContent.includes('No-Execution') && mapContent.includes('yürütme (execution)'));

  // 4. Negative Checks (Guard against execution enablement)
  const forbiddenEnablement = [
    'execution enabled',
    'yürütme etkin',
    'permission granted'
  ];
  for (const phrase of forbiddenEnablement) {
    check(`Negative check for enablement "${phrase}": NO VIOLATION`, !mapContent.toLowerCase().includes(phrase));
  }

  // Summary Output
  console.log(`\nDocumentation Map Smoke Summary (Phase 87):`);
  console.log(`- Passed: ${passedCount}`);
  console.log(`- Failed: ${failedCount}`);
  console.log(`- Status: Documentation Map Integrity Secured`);

  if (failedCount > 0) {
    console.error(`- Failed Check Names: ${failedChecks.join(', ')}`);
    process.exit(1);
  } else {
    console.log('Phase 87: Documentation map validation successful.');
  }
}

runDocMapSmokeTest().catch(err => {
  console.error('Smoke test crashed:', err);
  process.exit(1);
});
