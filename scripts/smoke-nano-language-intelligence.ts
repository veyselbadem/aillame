import { buildConversationAnswer, classifyIntentWithConfidence, detectUserIntent } from '../src/core/conversation/conversation-quality';
import { classifyTask } from '../src/core/nano-cognitive/service';
import { buildIntentAwareNanoAnswer } from '../src/core/nano-cognitive/nano-response-builder';
import { routeRequest } from '../src/core/model-orchestration/router';

type Case = {
  prompt: string;
  expectedIntent: 'general_knowledge' | 'image_generation' | 'coding_help' | 'default';
  expectedTaskType?: 'general_knowledge' | 'image_generation' | 'code_help' | 'social_chat' | 'unknown';
  expectedRouteTarget?: 'text' | 'igm' | 'code' | 'clarification';
  allowClarification?: boolean;
  noWeakFallback?: boolean;
};

const WEAK_PATTERNS = [
  'yanıtı tamamlayamadı',
  'daha kısa bir mesajla tekrar deneyin',
  'konuyu önce sadeleştireyim',
  'amacımız neyi anlamak',
  'hazırlıyorum',
  'sağlayabilirim',
  'daraltabilirsin',
];

const cases: Case[] = [
  { prompt: 'evren hakkında bilgi verir misin', expectedIntent: 'general_knowledge', expectedTaskType: 'general_knowledge', expectedRouteTarget: 'text', noWeakFallback: true },
  { prompt: 'yıldız nedir', expectedIntent: 'general_knowledge', expectedTaskType: 'general_knowledge', expectedRouteTarget: 'text', noWeakFallback: true },
  { prompt: 'rust nedir', expectedIntent: 'general_knowledge', expectedTaskType: 'general_knowledge', expectedRouteTarget: 'text', noWeakFallback: true },
  { prompt: 'javascript nedir', expectedIntent: 'general_knowledge', expectedTaskType: 'general_knowledge', expectedRouteTarget: 'text', noWeakFallback: true },
  { prompt: 'html nedir', expectedIntent: 'general_knowledge', expectedTaskType: 'general_knowledge', expectedRouteTarget: 'text', noWeakFallback: true },
  { prompt: 'css nedir', expectedIntent: 'general_knowledge', expectedTaskType: 'general_knowledge', expectedRouteTarget: 'text', noWeakFallback: true },
  { prompt: 'hukuk nedir', expectedIntent: 'general_knowledge', expectedTaskType: 'general_knowledge', expectedRouteTarget: 'text', noWeakFallback: true },
  { prompt: 'psikoloji nedir', expectedIntent: 'general_knowledge', expectedTaskType: 'general_knowledge', expectedRouteTarget: 'text', noWeakFallback: true },
  { prompt: 'fotoğrafçılık nedir', expectedIntent: 'general_knowledge', expectedTaskType: 'general_knowledge', expectedRouteTarget: 'text', noWeakFallback: true },
  { prompt: 'görsel nedir', expectedIntent: 'general_knowledge', expectedTaskType: 'general_knowledge', expectedRouteTarget: 'text', noWeakFallback: true },

  { prompt: 'bana papatya görseli oluşturur musun', expectedIntent: 'image_generation', expectedTaskType: 'image_generation', expectedRouteTarget: 'igm', noWeakFallback: true },
  { prompt: 'bana papatya görseli oluştutrur musun', expectedIntent: 'image_generation', expectedTaskType: 'image_generation', expectedRouteTarget: 'igm', noWeakFallback: true },
  { prompt: 'modern ai logosu olustur', expectedIntent: 'image_generation', expectedTaskType: 'image_generation', expectedRouteTarget: 'igm', noWeakFallback: true },
  { prompt: 'bir kedi resmi yapar mısın', expectedIntent: 'image_generation', expectedTaskType: 'image_generation', expectedRouteTarget: 'igm', noWeakFallback: true },
  { prompt: 'doğada gün batımı görseli üret', expectedIntent: 'image_generation', expectedTaskType: 'image_generation', expectedRouteTarget: 'igm', noWeakFallback: true },
  { prompt: 'uzay gemisi çiz', expectedIntent: 'image_generation', expectedTaskType: 'image_generation', expectedRouteTarget: 'igm', noWeakFallback: true },

  { prompt: 'javascript ile toplama fonksiyonu yaz', expectedIntent: 'coding_help', expectedTaskType: 'code_help', expectedRouteTarget: 'code', noWeakFallback: true },
  { prompt: 'html css javascript ile sayaç yap', expectedIntent: 'coding_help', expectedTaskType: 'code_help', expectedRouteTarget: 'code', noWeakFallback: true },
  { prompt: 'TypeError cannot read property map ne demek', expectedIntent: 'coding_help', expectedTaskType: 'code_help', expectedRouteTarget: 'code', noWeakFallback: true },
  { prompt: 'react component nedir', expectedIntent: 'general_knowledge', expectedTaskType: 'general_knowledge', expectedRouteTarget: 'text', noWeakFallback: true },
  { prompt: 'react component oluştur', expectedIntent: 'coding_help', expectedTaskType: 'code_help', expectedRouteTarget: 'code', noWeakFallback: true },

  { prompt: 'bunu yap', expectedIntent: 'default', allowClarification: true, expectedRouteTarget: 'clarification' },
  { prompt: 'devam et', expectedIntent: 'default', allowClarification: true },
  { prompt: 'yardım eder misin', expectedIntent: 'default', allowClarification: true, expectedRouteTarget: 'clarification' },
];

function hasWeakFallback(text: string): boolean {
  const lower = text.toLocaleLowerCase('tr-TR');
  return WEAK_PATTERNS.some((pattern) => lower.includes(pattern));
}

async function main() {
  console.log('Running Nano Language Intelligence Smoke Tests...\n');
  const failures: string[] = [];

  for (const tc of cases) {
    const intent = detectUserIntent(tc.prompt);
    const confidenceMeta = classifyIntentWithConfidence(tc.prompt);
    const task = classifyTask(tc.prompt);
    const route = routeRequest(tc.prompt);
    const response = buildConversationAnswer(tc.prompt) || buildIntentAwareNanoAnswer(tc.prompt);

    const responseHasWeakFallback = hasWeakFallback(response);
    const intentOk = intent === tc.expectedIntent;
    const taskOk = tc.expectedTaskType ? task.taskType === tc.expectedTaskType : true;
    const routeTargetOk = tc.expectedRouteTarget ? confidenceMeta.routeTarget === tc.expectedRouteTarget : true;
    const noWeakFallbackOk = tc.noWeakFallback ? !responseHasWeakFallback : true;
    const ambiguousOk = tc.allowClarification ? (intent === 'default' || confidenceMeta.routeTarget === 'clarification') : true;

    const ok = intentOk && taskOk && routeTargetOk && noWeakFallbackOk && ambiguousOk;

    console.log(`Prompt: "${tc.prompt}"`);
    console.log(` - intent=${intent} task=${task.taskType} route=${route.intent}/${route.selectedTarget}`);
    console.log(` - confidence=${confidenceMeta.confidence} matched=[${confidenceMeta.matchedSignals.join(', ')}]`);
    console.log(` - fallbackPhrase=${responseHasWeakFallback ? 'YES' : 'NO'} result=${ok ? 'PASS' : 'FAIL'}\n`);

    if (!ok) {
      failures.push(`${tc.prompt} -> ${JSON.stringify({
        intent,
        expectedIntent: tc.expectedIntent,
        taskType: task.taskType,
        expectedTaskType: tc.expectedTaskType,
        routeTarget: confidenceMeta.routeTarget,
        expectedRouteTarget: tc.expectedRouteTarget,
        confidence: confidenceMeta.confidence,
        matchedSignals: confidenceMeta.matchedSignals,
        responseHasWeakFallback,
      })}`);
    }
  }

  if (failures.length > 0) {
    console.error('Final Result: FAIL');
    failures.forEach((failure) => console.error(` - ${failure}`));
    process.exit(1);
  }

  console.log('Final Result: PASS');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
