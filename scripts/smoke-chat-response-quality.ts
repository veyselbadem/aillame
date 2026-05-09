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
      prompt: "yıldız nedir", 
      expectedIntent: "general_knowledge", 
      shouldClarify: false,
      requiredKeywords: ["yıldız", "plazma", "enerji"] 
    },
    { 
      prompt: "javascript nedir", 
      expectedIntent: "general_knowledge", 
      shouldClarify: false,
      requiredKeywords: ["programlama", "web", "etkileşim"]
    },
    { 
      prompt: "html nedir", 
      expectedIntent: "general_knowledge", 
      shouldClarify: false,
      requiredKeywords: ["markup", "yapı", "etiket"]
    },
    { 
      prompt: "css nedir", 
      expectedIntent: "general_knowledge", 
      shouldClarify: false,
      requiredKeywords: ["stil", "tasarım", "görsel"]
    },
    { 
      prompt: "fotosentez nedir", 
      expectedIntent: "general_knowledge", 
      shouldClarify: false,
      requiredKeywords: ["ışık", "oksijen", "bitki"]
    },
    { 
      prompt: "hukuk nedir", 
      expectedIntent: "general_knowledge", 
      shouldClarify: false,
      requiredKeywords: ["adalet", "kural", "toplum"]
    },
    { 
      prompt: "psikoloji nedir", 
      expectedIntent: "general_knowledge", 
      shouldClarify: false,
      requiredKeywords: ["zihin", "davranış", "bilim"]
    },
    { 
      prompt: "bunu yapabilir misin", 
      expectedIntent: "default", 
      shouldClarify: true,
      requiredKeywords: []
    },
    { 
      prompt: "javascript ile toplama fonksiyonu yaz", 
      expectedIntent: "coding_help", 
      shouldClarify: false,
      requiredKeywords: ["kod", "algoritma", "fonksiyon"]
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
    "gerekiyorsa",
    "kod mantığıyla düşünelim",
    "somut bir kod parçası",
    "ne yapmak istediğini belirle"
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
