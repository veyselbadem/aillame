import { buildConversationAnswer, detectUserIntent } from '../src/core/conversation/conversation-quality';
import { buildIntentAwareNanoAnswer, detectNanoResponseIntent } from '../src/core/nano-cognitive/nano-response-builder';
import { classifyTask } from '../src/core/nano-cognitive/service';

type Case = {
  prompt: string;
  expectedIntent: ReturnType<typeof detectUserIntent>;
  expectedTaskType?: string;
  minSentences?: number;
  requiredKeywords: string[];
  forbidden?: string[];
};

const metaEscapes = [
  'yanıtı tamamlayamadı',
  'konuyu önce sadeleştireyim',
  'amacımız neyi anlamak',
  'hedefini tek cümleyle',
  'hazırlıyorum',
  'sağlayabilirim',
  'önerebilirim',
  'daraltabilirsin',
  'kod mantığıyla düşünelim',
  'somut bir kod parçası',
  'ne yapmak istediğini belirle',
];

const cases: Case[] = [
  { prompt: 'evren hakkında bilgi verir misin', expectedIntent: 'general_knowledge', expectedTaskType: 'general_knowledge', minSentences: 3, requiredKeywords: ['evren', 'galaksi', 'patlama'] },
  { prompt: 'yıldız nedir', expectedIntent: 'general_knowledge', expectedTaskType: 'general_knowledge', minSentences: 3, requiredKeywords: ['yıldız', 'plazma', 'enerji'] },
  { prompt: 'rust nedir', expectedIntent: 'general_knowledge', expectedTaskType: 'general_knowledge', minSentences: 3, requiredKeywords: ['rust', 'performans', 'güvenli'] },
  { prompt: 'javascript nedir', expectedIntent: 'general_knowledge', expectedTaskType: 'general_knowledge', minSentences: 3, requiredKeywords: ['javascript', 'programlama', 'web'] },
  { prompt: 'html nedir', expectedIntent: 'general_knowledge', expectedTaskType: 'general_knowledge', minSentences: 3, requiredKeywords: ['html', 'yapı', 'etiket'] },
  { prompt: 'css nedir', expectedIntent: 'general_knowledge', expectedTaskType: 'general_knowledge', minSentences: 3, requiredKeywords: ['css', 'stil', 'tasarım'] },
  { prompt: 'fotosentez nedir', expectedIntent: 'general_knowledge', expectedTaskType: 'general_knowledge', minSentences: 3, requiredKeywords: ['fotosentez', 'oksijen', 'bitki'] },
  { prompt: 'hukuk nedir', expectedIntent: 'general_knowledge', expectedTaskType: 'general_knowledge', minSentences: 3, requiredKeywords: ['hukuk', 'adalet', 'toplum'] },
  { prompt: 'psikoloji nedir', expectedIntent: 'general_knowledge', expectedTaskType: 'general_knowledge', minSentences: 3, requiredKeywords: ['psikoloji', 'davranış', 'bilim'] },
  { prompt: 'javascript ile iki sayıyı toplayan fonksiyon yaz', expectedIntent: 'coding_help', expectedTaskType: 'code_help', minSentences: 2, requiredKeywords: ['function', 'topla', 'return'] },
  { prompt: 'html css javascript ile basit sayaç yap', expectedIntent: 'coding_help', expectedTaskType: 'code_help', minSentences: 2, requiredKeywords: ['html', 'sayac', 'onclick'] },
  { prompt: 'bu hata ne anlama gelir: TypeError cannot read property map', expectedIntent: 'coding_help', expectedTaskType: 'code_help', minSentences: 3, requiredKeywords: ['map', 'undefined', 'Array.isArray'] },
  { prompt: 'React component nedir', expectedIntent: 'general_knowledge', expectedTaskType: 'general_knowledge', minSentences: 3, requiredKeywords: ['react', 'component'] },
  { prompt: 'bunu yap', expectedIntent: 'default', minSentences: 1, requiredKeywords: ['detay'] },
  { prompt: 'yardım eder misin', expectedIntent: 'default', minSentences: 1, requiredKeywords: [] },
  { prompt: 'şunu düzelt', expectedIntent: 'default', minSentences: 1, requiredKeywords: ['detay'] },
  { prompt: 'devam et', expectedIntent: 'default', expectedTaskType: 'social_chat', minSentences: 1, requiredKeywords: ['devam'] },
  { prompt: 'bana papatya görseli oluşturur musun', expectedIntent: 'image_generation', expectedTaskType: 'image_generation', minSentences: 2, requiredKeywords: ['görsel', 'sdxl', 'modül'] },
];

function sentenceCount(value: string) {
  return (value.match(/[.!?…](\s|$)/g) || []).length;
}

function includesAll(value: string, keywords: string[]) {
  const lower = value.toLocaleLowerCase('tr-TR');
  return keywords.every((keyword) => lower.includes(keyword.toLocaleLowerCase('tr-TR')));
}

async function main() {
  console.log('Running Chat Response Quality Smoke Tests...\n');
  const failures: string[] = [];

  for (const tc of cases) {
    const intent = detectUserIntent(tc.prompt);
    const nanoIntent = detectNanoResponseIntent(tc.prompt);
    const cognitivePlan = classifyTask(tc.prompt);
    const response = buildConversationAnswer(tc.prompt) || buildIntentAwareNanoAnswer(tc.prompt);
    const lower = response.toLocaleLowerCase('tr-TR');
    const forbidden = [...metaEscapes, ...(tc.forbidden || [])].filter((pattern) => lower.includes(pattern.toLocaleLowerCase('tr-TR')));
    const sentOk = sentenceCount(response) >= (tc.minSentences || 1);
    const keywordsOk = includesAll(response, tc.requiredKeywords);
    const intentOk = intent === tc.expectedIntent;
    const taskOk = tc.expectedTaskType ? cognitivePlan.taskType === tc.expectedTaskType : true;
    const noMetaEscape = tc.expectedIntent === 'default' ? true : forbidden.length === 0;
    const ok = intentOk && taskOk && sentOk && keywordsOk && noMetaEscape;

    console.log(`Prompt: "${tc.prompt}"`);
    console.log(` - Intent: ${intent} / Nano: ${nanoIntent} / Task: ${cognitivePlan.taskType}`);
    console.log(` - Sentences: ${sentenceCount(response)}; keywords: ${keywordsOk ? 'OK' : 'FAIL'}; meta escape: ${forbidden.join(', ') || 'none'}`);
    console.log(` - Result: ${ok ? 'PASS' : 'FAIL'}\n`);

    if (!ok) {
      failures.push(`${tc.prompt} -> intentOk=${intentOk}, taskOk=${taskOk}, sentOk=${sentOk}, keywordsOk=${keywordsOk}, forbidden=${forbidden.join('|')}`);
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
