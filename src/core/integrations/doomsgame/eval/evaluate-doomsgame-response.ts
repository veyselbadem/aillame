import { handleDoomsgameModelResponse, isDoomsgameIntent } from "../handler";

interface DoomsgameEvalCase {
  id: string;
  intent: string;
  rawContent: string;
  projectId: string;
  expectedType: string;
  check?: (response: any) => boolean;
}

const EVAL_CASES: DoomsgameEvalCase[] = [
  // 1. Game Design - Success (Markdown)
  {
    id: "dg-design-success",
    intent: "game_design",
    rawContent: "İşte oyun planın:\n```json\n{\"title\": \"Space Shooter\", \"genre\": \"Action\"}\n```",
    projectId: "doomsgame-engine",
    expectedType: "game_plan",
    check: (res) => res.title === "Space Shooter" && res.genre === "Action",
  },
  // 2. Game Design - Broken JSON (Fallback)
  {
    id: "dg-design-fallback",
    intent: "game_design",
    rawContent: "JSON bozuk: {title: Space Shooter}",
    projectId: "doomsgame-engine",
    expectedType: "game_plan",
    check: (res) => res.title === "Untitled Game Plan", // Default value
  },
  // 3. Game Scene - Success (Direct)
  {
    id: "dg-scene-success",
    intent: "game_scene",
    rawContent: "{\"sceneName\": \"Forest\", \"environment\": \"Greenery\"}",
    projectId: "doomsgame-engine",
    expectedType: "scene_plan",
    check: (res) => res.sceneName === "Forest",
  },
  // 4. Game Asset - Success (Markdown No Language)
  {
    id: "dg-asset-success",
    intent: "game_asset",
    rawContent: "Asset:\n```\n{\"assetType\": \"sprite\", \"prompt\": \"A dragon\"}\n```",
    projectId: "doomsgame-engine",
    expectedType: "asset_plan",
    check: (res) => res.assetType === "sprite" && res.prompt === "A dragon",
  },
  // 5. Game Script - Security Check (Force Approval)
  {
    id: "dg-script-security",
    intent: "game_script",
    rawContent: "{\"filename\": \"Player.js\", \"codeSnippet\": \"move()\", \"requiresApproval\": false}",
    projectId: "doomsgame-engine",
    expectedType: "script_plan",
    check: (res) => res.requiresApproval === true, // Should be OVERRIDDEN to true
  },
  // 6. Game Error Fix - Security Check (Force Approval)
  {
    id: "dg-fix-security",
    intent: "game_error_fix",
    rawContent: "{\"errorSummary\": \"Crash\", \"needsApproval\": false}",
    projectId: "doomsgame-engine",
    expectedType: "error_fix",
    check: (res) => res.needsApproval === true, // Should be OVERRIDDEN to true
  },
  // 7. Engine Query - Success (Embedded)
  {
    id: "dg-query-embedded",
    intent: "engine_query",
    rawContent: "Sorgu sonucu budur: {\"explanation\": \"API usage info\"} Umarım yardımcı olur.",
    projectId: "doomsgame-engine",
    expectedType: "engine_query",
    check: (res) => res.explanation === "API usage info",
  },
  // 8. General Safety Check (canAutoApply should be false)
  {
    id: "dg-safety-check",
    intent: "game_design",
    rawContent: "{\"title\": \"Test\", \"safety\": {\"canAutoApply\": true}}",
    projectId: "doomsgame-engine",
    expectedType: "game_plan",
    check: (res) => res.safety?.canAutoApply === false, // Should be OVERRIDDEN to false
  },
  // 9. All Intents - Mapping Check
  {
    id: "dg-map-design",
    intent: "game_design",
    rawContent: "{}",
    projectId: "doomsgame-engine",
    expectedType: "game_plan",
  },
  {
    id: "dg-map-scene",
    intent: "game_scene",
    rawContent: "{}",
    projectId: "doomsgame-engine",
    expectedType: "scene_plan",
  },
  {
    id: "dg-map-asset",
    intent: "game_asset",
    rawContent: "{}",
    projectId: "doomsgame-engine",
    expectedType: "asset_plan",
  },
  {
    id: "dg-map-script",
    intent: "game_script",
    rawContent: "{}",
    projectId: "doomsgame-engine",
    expectedType: "script_plan",
  },
  {
    id: "dg-map-fix",
    intent: "game_error_fix",
    rawContent: "{}",
    projectId: "doomsgame-engine",
    expectedType: "error_fix",
  },
  {
    id: "dg-map-query",
    intent: "engine_query",
    rawContent: "{}",
    projectId: "doomsgame-engine",
    expectedType: "engine_query",
  }
];

async function runEval() {
  console.log("Doomsgame Structured Response Eval");
  console.log("----------------------------------");

  let pass = 0;
  let fail = 0;

  for (const testCase of EVAL_CASES) {
    try {
      const response = handleDoomsgameModelResponse({
        intent: testCase.intent,
        rawContent: testCase.rawContent,
        projectId: testCase.projectId,
      });

      let casePassed = true;

      // Type check
      if (response.type !== testCase.expectedType) {
        console.error(`[FAIL] ${testCase.id}: Type mismatch. Expected ${testCase.expectedType}, got ${response.type}`);
        casePassed = false;
      }

      // Custom check
      if (casePassed && testCase.check && !testCase.check(response)) {
        console.error(`[FAIL] ${testCase.id}: Custom check failed.`);
        casePassed = false;
      }

      if (casePassed) {
        console.log(`[PASS] ${testCase.id}`);
        pass++;
      } else {
        fail++;
      }
    } catch (error) {
      console.error(`[ERROR] ${testCase.id}: Exception during execution.`, error);
      fail++;
    }
  }

  const total = pass + fail;
  const accuracy = (pass / total) * 100;

  console.log("----------------------------------");
  console.log(`PASS: ${pass}`);
  console.log(`FAIL: ${fail}`);
  console.log(`Accuracy: ${accuracy.toFixed(2)}%`);

  if (fail > 0) {
    process.exit(1);
  }
}

runEval().catch(err => {
  console.error("Eval failed fataly:", err);
  process.exit(1);
});
