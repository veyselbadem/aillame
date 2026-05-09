import { detectUserIntent } from '../src/core/conversation/conversation-quality';
import { buildIntentAwareNanoAnswer, detectNanoResponseIntent } from '../src/core/nano-cognitive/nano-response-builder';
import { classifyTask } from '../src/core/nano-cognitive/service';

async function main() {
  console.log("Running Chat Response Quality Smoke Tests...\n");

  const results = [];

  const testCases = [
    { 
      prompt: "evren hakkında bilgi verir misin", 
      expectedIntent: "general_knowledge", 
      shouldClarify: false,
      requiredKeywords: ["evren", "galaksi", "patlama"] 
    },
    { 
      prompt: "güneş sistemi nedir", 
      expectedIntent: "general_knowledge", 
      shouldClarify: false,
      requiredKeywords: ["güneş", "gezegen", "yörünge"]
    },
    { 
      prompt: "yapay zeka nedir", 
      expectedIntent: "general_knowledge", 
      shouldClarify: false,
      requiredKeywords: ["zek", "öğrenme", "bilgisayar"]
    },
    { 
      prompt: "fotosentez nedir", 
      expectedIntent: "general_knowledge", 
      shouldClarify: false,
      requiredKeywords: ["ışık", "oksijen", "bitki"]
    },
    { 
      prompt: "bunu yapabilir misin", 
      expectedIntent: "default", 
      shouldClarify: true,
      requiredKeywords: []
    },
  ];

  const forbiddenPatterns = [
    "konuyu önce sadeleştireyim",
    "amacımız neyi anlamak",
    "hedefini tek cümleyle",
    "hazırlıyorum",
    "sağlayabilirim",
    "önerebilirim",
    "daraltabilirsin",
    "gerekiyorsa"
  ];

  for (const tc of testCases) {
    const intent = detectUserIntent(tc.prompt);
    const nanoIntent = detectNanoResponseIntent(tc.prompt);
    const cognitivePlan = classifyTask(tc.prompt);
    
    const response = buildIntentAwareNanoAnswer(tc.prompt);
    const responseLower = response.toLowerCase();
    const hasForbidden = forbiddenPatterns.some(p => responseLower.includes(p.toLowerCase()));
    const hasKeywords = tc.requiredKeywords.every(k => responseLower.includes(k.toLowerCase()));

    const intentOk = intent === tc.expectedIntent;
    const clarifyOk = tc.shouldClarify ? hasForbidden : !hasForbidden;
    const substantiveOk = tc.shouldClarify ? true : (hasKeywords && response.length > 100);

    results.push({
      prompt: tc.prompt,
      intent,
      ok: intentOk && clarifyOk && substantiveOk
    });

    console.log(`Prompt: "${tc.prompt}"`);
    console.log(` - Intent: ${intent} (Expected: ${tc.expectedIntent}) -> ${intentOk ? 'OK' : 'FAIL'}`);
    console.log(` - Has Forbidden Pattern: ${hasForbidden} (Expected: ${tc.shouldClarify}) -> ${clarifyOk ? 'OK' : 'FAIL'}`);
    console.log(` - Substantive Check: ${substantiveOk ? 'OK' : 'FAIL'} (Keywords: ${tc.requiredKeywords.join(', ')})`);
    if (!substantiveOk && !tc.shouldClarify) {
        console.log(`   [FAIL] Response was: "${response.substring(0, 100)}..."`);
    }
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
