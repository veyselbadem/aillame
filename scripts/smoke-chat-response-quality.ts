import { detectUserIntent } from '../src/core/conversation/conversation-quality';
import { buildIntentAwareNanoAnswer, detectNanoResponseIntent } from '../src/core/nano-cognitive/nano-response-builder';
import { classifyTask } from '../src/core/nano-cognitive/service';

async function main() {
  console.log("Running Chat Response Quality Smoke Tests...\n");

  const results = [];

  const testCases = [
    { prompt: "evren hakkında bilgi verir misin", expectedIntent: "general_knowledge", shouldClarify: false },
    { prompt: "güneş sistemi nedir", expectedIntent: "general_knowledge", shouldClarify: false },
    { prompt: "yapay zeka nedir", expectedIntent: "general_knowledge", shouldClarify: false },
    { prompt: "fotosentez nedir", expectedIntent: "general_knowledge", shouldClarify: false },
    { prompt: "bunu yapabilir misin", expectedIntent: "default", shouldClarify: true },
  ];

  const forbiddenPatterns = [
    "konuyu önce sadeleştireyim",
    "amacımız neyi anlamak",
    "hedefini tek cümleyle",
    "Makul varsayımla devam"
  ];

  for (const tc of testCases) {
    const intent = detectUserIntent(tc.prompt);
    const nanoIntent = detectNanoResponseIntent(tc.prompt);
    const cognitivePlan = classifyTask(tc.prompt);
    
    const response = buildIntentAwareNanoAnswer(tc.prompt);
    const hasForbidden = forbiddenPatterns.some(p => response.toLowerCase().includes(p.toLowerCase()));

    const intentOk = intent === tc.expectedIntent;
    const nanoIntentOk = nanoIntent === tc.expectedIntent;
    const cognitiveOk = cognitivePlan.taskType === tc.expectedIntent || (tc.expectedIntent === 'default' && cognitivePlan.taskType === 'unknown');
    
    // For general_knowledge, we should NOT have forbidden patterns (clarification templates)
    // For default, we SHOULD (or at least it's allowed)
    const clarifyOk = tc.shouldClarify ? hasForbidden : !hasForbidden;

    results.push({
      prompt: tc.prompt,
      intent,
      cognitiveType: cognitivePlan.taskType,
      hasForbidden,
      ok: intentOk && clarifyOk
    });

    console.log(`Prompt: "${tc.prompt}"`);
    console.log(` - Intent: ${intent} (Expected: ${tc.expectedIntent}) -> ${intentOk ? 'OK' : 'FAIL'}`);
    console.log(` - Cognitive Type: ${cognitivePlan.taskType}`);
    console.log(` - Has Forbidden Pattern: ${hasForbidden} (Expected: ${tc.shouldClarify}) -> ${clarifyOk ? 'OK' : 'FAIL'}`);
    console.log("");
  }

  const allOk = results.every(r => r.ok);
  console.log("Final Result:", allOk ? "PASS" : "FAIL");
  
  if (!allOk) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
