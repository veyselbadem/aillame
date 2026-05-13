import { handleExternalProviderChat } from "../handler";
import { DoomsgameResponseSchema } from "../../integrations/doomsgame/schemas";

// Auth bypass
process.env.AILLAME_EXTERNAL_API_KEYS = "";

const SMOKE_CASES = [
  {
    name: "Game Design Smoke",
    projectId: "doomsgame-engine",
    prompt: "Yeni bir oyun tasarim planı hazırla.",
    expectedIntent: "game_design",
    expectedResponseType: "game_plan",
  },
  {
    name: "Game Scene Smoke",
    projectId: "doomsgame-engine",
    prompt: "Yeni bir oyun sahne planı hazırla.",
    expectedIntent: "game_scene",
    expectedResponseType: "scene_plan",
  },
  {
    name: "Game Asset Smoke",
    projectId: "doomsgame-engine",
    prompt: "Yeni bir game asset sprite promptu üret.",
    expectedIntent: "game_asset",
    expectedResponseType: "asset_plan",
  },
  {
    name: "Game Script Smoke",
    projectId: "doomsgame-engine",
    prompt: "Yeni bir oyun script yaz.",
    expectedIntent: "game_script",
    expectedResponseType: "script_plan",
    securityCheck: (data: any) => data.structured.requiresApproval === true,
  },
  {
    name: "Game Error Fix Smoke",
    projectId: "doomsgame-engine",
    prompt: "Engine hata düzeltmesi yap.",
    expectedIntent: "game_error_fix",
    expectedResponseType: "error_fix",
    securityCheck: (data: any) => data.structured.needsApproval === true,
  },
  {
    name: "Engine Query Smoke",
    projectId: "doomsgame-engine",
    prompt: "Doomsgame engine api nedir?",
    expectedIntent: "engine_query",
    expectedResponseType: "engine_query",
  },
  {
    name: "Non-Doomsgame Smoke",
    projectId: "general",
    prompt: "Merhaba nasılsın?",
    expectedIntent: "text",
    expectedResponseType: null,
  }
];

async function runSmokeTest() {
  console.log("Doomsgame External Provider Smoke Test");
  console.log("---------------------------------------");

  let pass = 0;
  let fail = 0;

  for (const testCase of SMOKE_CASES) {
    try {
      const response = await handleExternalProviderChat({
        body: {
          projectId: testCase.projectId,
          prompt: testCase.prompt,
        }
      });

      if (!response.body.success) {
        console.error(`[FAIL] ${testCase.name}: Request failed.`, response.body);
        fail++;
        continue;
      }

      const data = (response.body as any).data;
      const meta = data.meta;
      const structured = data.structured;

      let casePassed = true;

      // Intent & Metadata Checks
      if (meta.intent !== testCase.expectedIntent) {
        console.error(`[FAIL] ${testCase.name}: Intent mismatch. Expected ${testCase.expectedIntent}, got ${meta.intent}`);
        casePassed = false;
      }

      if (testCase.expectedResponseType) {
        if (!structured) {
          console.error(`[FAIL] ${testCase.name}: Missing structured response.`);
          casePassed = false;
        } else if (structured.type !== testCase.expectedResponseType) {
          console.error(`[FAIL] ${testCase.name}: Response type mismatch. Expected ${testCase.expectedResponseType}, got ${structured.type}`);
          casePassed = false;
        } else if (meta.responseType !== testCase.expectedResponseType) {
          console.error(`[FAIL] ${testCase.name}: Meta responseType mismatch. Expected ${testCase.expectedResponseType}, got ${meta.responseType}`);
          casePassed = false;
        }

        // Schema validation
        const schemaResult = DoomsgameResponseSchema.safeParse(structured);
        if (!schemaResult.success) {
          console.error(`[FAIL] ${testCase.name}: Structured response failed Zod validation.`);
          casePassed = false;
        }

        // Security checks
        if (casePassed && testCase.securityCheck && !testCase.securityCheck(data)) {
          console.error(`[FAIL] ${testCase.name}: Security override check failed.`);
          casePassed = false;
        }

        // Global safety check
        if (casePassed && structured.safety && structured.safety.canAutoApply !== false) {
          console.error(`[FAIL] ${testCase.name}: canAutoApply must be false.`);
          casePassed = false;
        }
      } else {
        // Should NOT have structured response for non-doomsgame
        if (structured) {
          console.error(`[FAIL] ${testCase.name}: Expected no structured response for non-doomsgame project.`);
          casePassed = false;
        }
      }

      if (casePassed) {
        console.log(`[PASS] ${testCase.name}`);
        pass++;
      } else {
        fail++;
      }

    } catch (error) {
      console.error(`[ERROR] ${testCase.name}: Exception.`, error);
      fail++;
    }
  }

  const total = pass + fail;
  const accuracy = (pass / total) * 100;

  console.log("---------------------------------------");
  console.log(`PASS: ${pass}`);
  console.log(`FAIL: ${fail}`);
  console.log(`Accuracy: ${accuracy.toFixed(2)}%`);

  if (fail > 0) {
    process.exit(1);
  }
}

runSmokeTest().catch(err => {
  console.error("Smoke test fatal error:", err);
  process.exit(1);
});
